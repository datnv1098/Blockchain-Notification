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
const { analyzeTokenFromTransfer, summarizeTransfers } = require("../services/tokenExtractor");
const { hasNotified, markNotified } = require("../services/storage");
const { sendAlert } = require("../services/telegram");
const { recordSuccess, recordError } = require("../services/health");

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
        // Moralis v2 mới: field token contract là "address", wallet nhận là "to_address"
        if (tx.to_address?.toLowerCase() === walletAddress.toLowerCase()) {
          transfers.push(tx);
        }
      }

      cursor = result.cursor ?? null;
    } while (cursor);
  } catch (err) {
    const isQuotaError = err?.response?.status === 401 && String(err.message).includes("plan");
    if (isQuotaError) {
      console.error(`[EVM] ⚠️  API QUOTA EXHAUSTED cho ${walletAddress} (${chain}). Polling sẽ tạm dừng.`);
    } else {
      console.error(`[EVM] Lỗi fetch transfers cho ${walletAddress} (${chain}):`, err.message);
    }
  }

  return transfers;
}

/**
 * Kiểm tra xem token này lần đầu tiên được chuyển đến ví có trong khoảng thời gian được cấu hình không.
 * Nếu tìm thấy transfer nào của token này tới ví trước đây quá khoảng thời gian → trả về false.
 * @returns {boolean} true nếu lần đầu nhận nằm trong khoảng thời gian được cấu hình
 */
async function isFirstReceiptWithin2Months(walletAddress, tokenAddress, chain) {
  const windowDays = Number(process.env.TOKEN_FIRST_RECEIPT_DAYS) || 60;
  const windowMs = windowDays * 24 * 60 * 60 * 1000;
  const thresholdDate = new Date(Date.now() - windowMs);
  const chainHex = networks[chain]?.chainHex;
  if (!chainHex) return true;
  try {
    const response = await moralisCall(() =>
      Moralis.EvmApi.token.getWalletTokenTransfers({
        address: walletAddress,
        chain: chainHex,
        toDate: thresholdDate.toISOString(),
        limit: 10,
      })
    );
    const result = response?.raw;
    const oldTransfers = (result?.result || []).filter(
      (tx) =>
        (tx.address || tx.token_address)?.toLowerCase() === tokenAddress.toLowerCase() &&
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
 * 
 * TỐI ƯU: Trích xuất token info từ transactions ngay (nhanh),
 * không đợi metadata, cache giá trong 1 tiếng.
 */
async function processEVMWallet(wallet) {
  const { label, chain } = wallet;
  // Normalize về lowercase để tránh Moralis C0005 (invalid checksum address)
  const address = typeof wallet.address === "string" ? wallet.address.toLowerCase() : null;

  // Guard: bỏ qua ví không có address hợp lệ
  if (!address) {
    console.warn(`[EVM] ⚠️  Ví "${label}" không có address hợp lệ, bỏ qua.`);
    return;
  }

  const walletKey = `${chain}:${address}`;

  if (!lastCheckedAt[walletKey]) {
    lastCheckedAt[walletKey] = new Date(Date.now() - 10 * 60 * 1000);
  }

  const fromDate = lastCheckedAt[walletKey];
  const checkStart = new Date();

  console.log(`[EVM] Đang check ${label} (${chain}) từ ${fromDate.toISOString()}`);

  const transfers = await fetchIncomingTransfers(address, chain, fromDate);
  
  if (transfers.length > 0) {
    console.log(`[EVM] 🔍 Phát hiện ${transfers.length} transfers, trích xuất token info...`);
  }

  for (const tx of transfers) {
    // Moralis v2: token contract address field đổi từ "token_address" → "address"
    const tokenAddress = tx.address || tx.token_address;
    const tokenSymbol = tx.token_symbol || "UNKNOWN";
    const txHash = tx.transaction_hash?.slice(0, 12) || "unknown";

    // ── Bước 1: Validate token address ──────────────────────────────────────
    if (!tokenAddress || typeof tokenAddress !== "string") {
      console.log(`[EVM] [${txHash}] Skip: không có token_address hợp lệ`);
      continue;
    }

    // ── Bước 2: Deduplication — đã notify chưa? ─────────────────────────────
    if (hasNotified(chain, address, tokenAddress)) {
      console.log(`[EVM] [${txHash}] Skip (đã notify): ${tokenSymbol} → ${label}`);
      continue;
    }

    // ── Bước 3: Time window — token có được nhận trong vòng N ngày không? ───
    console.log(`[EVM] [${txHash}] Kiểm tra time window cho ${tokenSymbol} (${tokenAddress.slice(0, 8)}...)...`);
    const withinWindow = await isFirstReceiptWithin2Months(address, tokenAddress, chain);
    if (!withinWindow) {
      const windowDays = Number(process.env.TOKEN_FIRST_RECEIPT_DAYS) || 60;
      console.log(`[EVM] [${txHash}] Skip (token nhận lần đầu > ${windowDays} ngày trước): ${tokenSymbol}`);
      continue;
    }
    console.log(`[EVM] [${txHash}] ✅ Time window OK: ${tokenSymbol}`);

    // ── Bước 4: Lấy TỔNG SỐ DƯ token trên ví (không phải số lượng tx) ──────
    console.log(`[EVM] [${txHash}] Lấy tổng balance ${tokenSymbol} của ${label}...`);
    const totalBalance = await getWalletTokenBalance(address, tokenAddress, chain);
    if (totalBalance <= 0) {
      console.log(`[EVM] [${txHash}] Skip (balance = 0): ${tokenSymbol}`);
      continue;
    }
    console.log(`[EVM] [${txHash}] ✅ Balance: ${totalBalance.toLocaleString()} ${tokenSymbol}`);

    // ── Bước 5: Lấy giá USD hiện tại ────────────────────────────────────────
    console.log(`[EVM] [${txHash}] Lấy giá USD cho ${tokenSymbol}...`);
    const pricePerToken = await getTokenPriceUSD(tokenAddress, chain);
    if (pricePerToken == null || pricePerToken <= 0) {
      console.log(`[EVM] [${txHash}] Skip (không lấy được giá): ${tokenSymbol}`);
      continue;
    }
    console.log(`[EVM] [${txHash}] ✅ Giá: $${pricePerToken.toFixed(6)}/token`);

    // ── Bước 6: So sánh với ngưỡng ──────────────────────────────────────────
    const totalUsdValue = totalBalance * pricePerToken;
    const threshold = Number(process.env.ALERT_THRESHOLD_USD || 50000);
    console.log(`[EVM] [${txHash}] 💰 ${tokenSymbol}: ${totalBalance.toLocaleString()} × $${pricePerToken.toFixed(6)} = $${totalUsdValue.toFixed(2)} (ngưỡng: $${threshold.toLocaleString()})`);

    if (totalUsdValue < threshold) {
      console.log(`[EVM] [${txHash}] Skip (dưới ngưỡng $${threshold.toLocaleString()}): $${totalUsdValue.toFixed(2)}`);
      continue;
    }

    // ── Bước 7: Gửi Telegram Alert ──────────────────────────────────────────
    const net = networks[chain] || {};
    const explorerUrl = `${net.explorerTx || ""}${tx.transaction_hash}`;

    try {
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

      // Bước 8: Đánh dấu đã notify — chỉ sau khi Telegram gửi THÀNH CÔNG
      markNotified(chain, address, tokenAddress);
      console.log(`[EVM] ✅ Alert gửi THÀNH CÔNG: ${tokenSymbol} $${totalUsdValue.toFixed(2)} → ${label}`);
      recordSuccess(label, chain);
    } catch (err) {
      console.error(`[EVM] ❌ LỖI GỬI ALERT cho ${tokenSymbol}:`, err.message);
      recordError(label, chain, `Telegram alert failed: ${err.message}`);
      // Không đánh dấu notified → retry lần sau
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
