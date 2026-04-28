/**
 * monitors/evm.js
 * ---
 * Theo dõi giao dịch token trên Ethereum và BSC bằng Moralis API.
 * Khi phát hiện token mới gửi vào ví, kiểm tra TỔNG SỐ DƯ token đó trên ví.
 * Nếu tổng giá trị sở hữu >= ngưỡng thì gửi cảnh báo.
 */

require("dotenv").config();
const Moralis = require("moralis").default;
const { moralisCall } = require("../services/moralisRotator");
const { networks } = require("../config");
const { getTokenPriceUSD } = require("../services/price");
const { hasNotified, markNotified } = require("../services/storage");
const { sendAlert } = require("../services/telegram");

// Lưu timestamp lần check cuối (per wallet)
const lastCheckedAt = {};

/**
 * Lấy danh sách token transfers gửi VÀO wallet kể từ một thời điểm
 */
async function fetchIncomingTransfers(walletAddress, chain, fromDate) {
  const transfers = [];
  let cursor = null;
  const chainHex = networks[chain]?.chainHex;
  if (!chainHex) {
    console.warn(`[EVM] Chain "${chain}" chưa có trong networks config, bỏ qua.`);
    return transfers;
  }

  try {
    do {
      const params = {
        address: walletAddress,
        chain: chainHex,
        fromDate: fromDate.toISOString(),
        limit: 100,
      };
      if (cursor) params.cursor = cursor;

      const response = await moralisCall(() =>
        Moralis.EvmApi.token.getWalletTokenTransfers(params)
      );
      const result = response?.raw;

      if (!result?.result) break;

      for (const tx of result.result) {
        if (tx.to_address?.toLowerCase() === walletAddress.toLowerCase()) {
          transfers.push(tx);
        }
      }

      cursor = result.cursor ?? null;
    } while (cursor);
  } catch (err) {
    console.error(`[EVM] Lỗi fetch transfers cho ${walletAddress} (${chain}):`, err.message);
  }

  return transfers;
}

/**
 * Kiểm tra xem token này lần đầu tiên được chuyển đến ví có trong vòng 2 tháng không.
 * Nếu tìm thấy bất kỳ transfer nào của token này tới ví trước đây quá 2 tháng → trả về false.
 * @returns {boolean} true nếu lần đầu nhận nằm trong 2 tháng gần nhất
 */
async function isFirstReceiptWithin2Months(walletAddress, tokenAddress, chain) {
  const twoMonthsAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
  const chainHex = networks[chain]?.chainHex;
  if (!chainHex) return true;
  try {
    const response = await moralisCall(() =>
      Moralis.EvmApi.token.getWalletTokenTransfers({
        address: walletAddress,
        chain: chainHex,
        toDate: twoMonthsAgo.toISOString(),
        limit: 10,
      })
    );
    const result = response?.raw;
    const oldTransfers = (result?.result || []).filter(
      (tx) =>
        tx.token_address?.toLowerCase() === tokenAddress.toLowerCase() &&
        tx.to_address?.toLowerCase() === walletAddress.toLowerCase()
    );
    // Nếu có transfer cũ hơn 2 tháng → token đã ở trong ví quá lâu → bỏ qua
    return oldTransfers.length === 0;
  } catch (err) {
    console.error(`[EVM] Không kiểm tra được lịch sử ${tokenAddress}:`, err.message);
    // Nếu API lỗi, cho phép tiếp tục để không bỏ sót alert
    return true;
  }
}

/**
 * Lấy tổng số dư hiện tại của một token cụ thể trong ví
 * @returns {number} Số lượng token (đã chia decimals)
 */
async function getWalletTokenBalance(walletAddress, tokenAddress, chain) {
  const chainHex = networks[chain]?.chainHex;
  if (!chainHex) return 0;
  try {
    const response = await moralisCall(() =>
      Moralis.EvmApi.token.getWalletTokenBalances({
        address: walletAddress,
        chain: chainHex,
        tokenAddresses: [tokenAddress],
      })
    );
    const balances = response?.raw;
    if (!balances || balances.length === 0) return 0;
    const token = balances[0];
    const decimals = Number(token.decimals || 18);
    return Number(BigInt(token.balance || "0")) / Math.pow(10, decimals);
  } catch (err) {
    console.error(`[EVM] Lỗi lấy balance ${tokenAddress} của ${walletAddress}:`, err.message);
    return 0;
  }
}

/**
 * Xử lý một wallet EVM — kiểm tra transfers mới,
 * nếu có token mới thì lấy TỔNG SỐ DƯ và so với ngưỡng.
 */
async function processEVMWallet(wallet) {
  const { label, address, chain } = wallet;
  const walletKey = `${chain}:${address}`;

  if (!lastCheckedAt[walletKey]) {
    lastCheckedAt[walletKey] = new Date(Date.now() - 10 * 60 * 1000);
  }

  const fromDate = lastCheckedAt[walletKey];
  const checkStart = new Date();

  console.log(`[EVM] Đang check ${label} (${chain}) từ ${fromDate.toISOString()}`);

  const transfers = await fetchIncomingTransfers(address, chain, fromDate);

  for (const tx of transfers) {
    const tokenAddress = tx.token_address;
    const tokenSymbol = tx.token_symbol || "UNKNOWN";

    // Kiểm tra đã thông báo token này cho ví này chưa
    if (hasNotified(chain, address, tokenAddress)) {
      console.log(`[EVM] Skip (đã notify): ${tokenSymbol} -> ${label}`);
      continue;
    }

    // Điều kiện: lần đầu nhận token này phải trong vòng 2 tháng gần nhất
    const withinWindow = await isFirstReceiptWithin2Months(address, tokenAddress, chain);
    if (!withinWindow) {
      console.log(`[EVM] Skip (token cũ > 2 tháng): ${tokenSymbol} -> ${label}`);
      continue;
    }

    // Lấy TỔNG SỐ DƯ token đó trên ví
    const totalBalance = await getWalletTokenBalance(address, tokenAddress, chain);
    if (totalBalance <= 0) {
      console.log(`[EVM] Balance = 0 cho ${tokenSymbol}, bỏ qua.`);
      continue;
    }

    // Lấy giá USD
    const pricePerToken = await getTokenPriceUSD(tokenAddress, chain);
    if (pricePerToken == null) {
      console.log(`[EVM] Không lấy được giá cho ${tokenSymbol} (${tokenAddress})`);
      continue;
    }

    const totalUsdValue = totalBalance * pricePerToken;
    const threshold = Number(process.env.ALERT_THRESHOLD_USD || 50000);

    console.log(`[EVM] ${tokenSymbol}: tổng ${totalBalance.toFixed(4)} tokens = $${totalUsdValue.toFixed(2)} (ngưỡng: $${threshold})`);

    if (totalUsdValue >= threshold) {
      const net = networks[chain] || {};
      const explorerUrl = `${net.explorerTx || ""}${tx.transaction_hash}`;

      await sendAlert({
        chain: net.name || chain,
        chainEmoji: net.emoji || "🔗",
        walletLabel: label,
        walletAddress: address,
        tokenSymbol,
        tokenAddress,
        amount: totalBalance,
        usdValue: totalUsdValue,
        txHash: tx.transaction_hash,
        txTime: tx.block_timestamp,
        explorerUrl,
      });

      markNotified(chain, address, tokenAddress);
      console.log(`[EVM] ✅ Alert gửi: ${tokenSymbol} tổng $${totalUsdValue.toFixed(2)} -> ${label}`);
    }
  }

  lastCheckedAt[walletKey] = checkStart;
}

/**
 * Xử lý NHIỀU wallet EVM song song (Promise.allSettled).
 * Hiệu quả hơn xử lý tuần tự khi có nhiều ví.
 * @param {Array} wallets - mảng ví có chain "ethereum" hoặc "bsc"
 */
async function processEVMWallets(wallets) {
  const { networks } = require("../config");
  const evmChains = Object.keys(networks).filter((c) => c !== "solana");
  const evmWallets = wallets.filter((w) => evmChains.includes(w.chain));
  if (!evmWallets.length) return;

  const results = await Promise.allSettled(
    evmWallets.map((wallet) => processEVMWallet(wallet))
  );

  results.forEach((result, i) => {
    if (result.status === "rejected") {
      console.error(`[EVM] Wallet ${evmWallets[i].label} lỗi:`, result.reason?.message);
    }
  });
}

module.exports = { processEVMWallet, processEVMWallets };
