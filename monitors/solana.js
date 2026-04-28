/**
 * monitors/solana.js
 * ---
 * Theo dõi ví Solana bằng 2 cơ chế:
 *   1. WebSocket realtime (onLogs) — phát hiện ngay lập tức khi có giao dịch mới
 *   2. Poll fallback — chạy khi WebSocket chưa kết nối hoặc bị ngắt
 *
 * Logic kiểm tra:
 *   - Token được nhận lần đầu trong vòng 2 tháng
 *   - Tổng số dư holdings × giá >= ngưỡng
 *   - Chưa từng notify token này cho ví này
 */

require("dotenv").config();
const axios = require("axios");
const { Connection, PublicKey } = require("@solana/web3.js");
const { getTokenPriceUSD } = require("../services/price");
const { hasNotified, markNotified } = require("../services/storage");
const { sendAlert } = require("../services/telegram");

const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const SOLSCAN_TX = "https://solscan.io/tx/";

// Map address -> { connection, subscriptionId }
const activeSubscriptions = {};
// Set signature đã xử lý qua WebSocket (tránh poll xử lý lại)
const processedSignatures = new Set();

// ── Helius REST helpers ────────────────────────────────────────────────────

/**
 * Lấy danh sách giao dịch gần nhất (dùng cho poll fallback)
 */
async function fetchSolanaTransactions(walletAddress, beforeSig = null) {
  try {
    const params = { "api-key": HELIUS_API_KEY, type: "TOKEN_TRANSFER", limit: 50 };
    if (beforeSig) params.before = beforeSig;

    const url = `https://api.helius.xyz/v0/addresses/${walletAddress}/transactions`;
    const { data } = await axios.get(url, { params, timeout: 15000 });
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error(`[SOL] Lỗi fetch transactions cho ${walletAddress}:`, err.message);
    return [];
  }
}

/**
 * Fetch 1 giao dịch đã parse từ Helius theo signature
 */
async function fetchTransactionBySignature(signature) {
  try {
    const url = `https://api.helius.xyz/v0/transactions?api-key=${HELIUS_API_KEY}`;
    const { data } = await axios.post(url, { transactions: [signature] }, { timeout: 15000 });
    return Array.isArray(data) && data.length > 0 ? data[0] : null;
  } catch (err) {
    console.error(`[SOL-WS] Không fetch được tx ${signature.slice(0, 8)}...:`, err.message);
    return null;
  }
}

/**
 * Kiểm tra token mint này lần đầu tiên được chuyển đến ví có trong vòng 2 tháng không.
 * Helius không có date filter nên ta phân trang ngược về quá khứ, tối đa 5 trang (500 tx).
 * Nếu tìm thấy tx nào của mint này trước 2 tháng → trả về false.
 * @returns {boolean} true nếu lần đầu nhận trong 2 tháng gần nhất
 */
async function isFirstReceiptWithin2Months(walletAddress, mint) {
  const twoMonthsAgo = Date.now() - 60 * 24 * 60 * 60 * 1000;
  let cursor = null;
  const MAX_PAGES = 5;

  for (let page = 0; page < MAX_PAGES; page++) {
    try {
      const params = { "api-key": HELIUS_API_KEY, type: "TOKEN_TRANSFER", limit: 100 };
      if (cursor) params.before = cursor;

      const url = `https://api.helius.xyz/v0/addresses/${walletAddress}/transactions`;
      const { data } = await axios.get(url, { params, timeout: 15000 });

      if (!Array.isArray(data) || data.length === 0) break;

      for (const tx of data) {
        const txTime = (tx.timestamp || 0) * 1000;
        const involvesMint = (tx.tokenTransfers || []).some(
          (t) =>
            t.mint === mint &&
            t.toUserAccount?.toLowerCase() === walletAddress.toLowerCase()
        );

        if (involvesMint && txTime < twoMonthsAgo) {
          // Tìm thấy transfer cũ hơn 2 tháng → token đã ở trong ví quá lâu
          return false;
        }
      }

      // Nếu toàn bộ trang này đã cũ hơn 2 tháng, không cần phân trang thêm
      const oldestInPage = (data[data.length - 1]?.timestamp || 0) * 1000;
      if (oldestInPage < twoMonthsAgo) break;

      cursor = data[data.length - 1]?.signature || null;
      if (!cursor) break;
    } catch (err) {
      console.error(`[SOL] Không kiểm tra được lịch sử ${mint}:`, err.message);
      return true; // Cho phép tiếp tục nếu API lỗi
    }
  }

  return true;
}

/**
 * Lấy tổng số dư của một token mint cụ thể trong ví Solana qua Helius RPC
 * @returns {number} Số lượng token (đã chia decimals)
 */
async function getSolanaTokenBalance(walletAddress, mint) {
  try {
    const url = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
    const { data } = await axios.post(url, {
      jsonrpc: "2.0",
      id: 1,
      method: "getTokenAccountsByOwner",
      params: [
        walletAddress,
        { mint },
        { encoding: "jsonParsed" },
      ],
    }, { timeout: 10000 });

    const accounts = data?.result?.value || [];
    let total = 0;
    for (const acc of accounts) {
      const info = acc.account?.data?.parsed?.info?.tokenAmount;
      if (info) total += Number(info.uiAmount || 0);
    }
    return total;
  } catch (err) {
    console.error(`[SOL] Lỗi lấy balance ${mint} của ${walletAddress}:`, err.message);
    return 0;
  }
}

/**
 * Lấy token transfers ĐẼN wallet từ 1 parsed transaction
 */
function extractIncomingTokenTransfers(tx, walletAddress) {
  return (tx.tokenTransfers || [])
    .filter((t) => t.toUserAccount?.toLowerCase() === walletAddress.toLowerCase() && t.mint)
    .map((t) => ({ mint: t.mint, symbol: t.tokenStandard || null }));
}

// ── Core xử lý 1 transaction ──────────────────────────────────────────────

/**
 * Kiểm tra và alert nếu đủ điều kiện cho một cặp (wallet, tx)
 */
async function evaluateTransaction(tx, wallet) {
  if (!tx || tx.transactionError) return;
  const { label, address } = wallet;

  const incomingTransfers = extractIncomingTokenTransfers(tx, address);

  for (const { mint, symbol } of incomingTransfers) {
    if (hasNotified("solana", address, mint)) {
      console.log(`[SOL] Skip (đã notify): ${mint.slice(0, 8)}... -> ${label}`);
      continue;
    }

    const withinWindow = await isFirstReceiptWithin2Months(address, mint);
    if (!withinWindow) {
      console.log(`[SOL] Skip (token cũ > 2 tháng): ${mint.slice(0, 8)}... -> ${label}`);
      continue;
    }

    const totalBalance = await getSolanaTokenBalance(address, mint);
    if (totalBalance <= 0) continue;

    const pricePerToken = await getTokenPriceUSD(mint, "solana");
    if (pricePerToken == null) {
      console.log(`[SOL] Không lấy được giá cho mint ${mint}`);
      continue;
    }

    const totalUsdValue = totalBalance * pricePerToken;
    const threshold = Number(process.env.ALERT_THRESHOLD_USD || 50000);
    const tokenSymbol = symbol || mint.slice(0, 8) + "...";

    console.log(`[SOL] ${tokenSymbol}: tổng ${totalBalance} = $${totalUsdValue.toFixed(2)}`);

    if (totalUsdValue >= threshold) {
      await sendAlert({
        chain: "Solana",
        walletLabel: label,
        walletAddress: address,
        tokenSymbol,
        tokenAddress: mint,
        amount: totalBalance,
        usdValue: totalUsdValue,
        txHash: tx.signature,
        txTime: tx.timestamp ? new Date(tx.timestamp * 1000).toISOString() : new Date().toISOString(),
        explorerUrl: `${SOLSCAN_TX}${tx.signature}`,
      });

      markNotified("solana", address, mint);
      console.log(`[SOL] ✅ Alert gửi: ${tokenSymbol} tổng $${totalUsdValue.toFixed(2)} -> ${label}`);
    }
  }
}

// ── WebSocket realtime monitor ────────────────────────────────────────────

/**
 * Bắt đầu WebSocket subscription (onLogs) cho một ví Solana.
 * Khi có giao dịch mới, fetch chi tiết qua Helius rồi evaluate ngay.
 * Tự động reconnect với exponential backoff nếu bị ngắt.
 */
async function startSolanaWebSocketMonitor(wallet, reconnectAttempt = 0) {
  const { label, address } = wallet;
  const RECONNECT_DELAY_MS = Math.min(5000 * Math.pow(2, reconnectAttempt), 60000);

  if (!HELIUS_API_KEY) {
    console.warn(`[SOL-WS] HELIUS_API_KEY chưa cấu hình, bỏ qua WebSocket cho ${label}.`);
    return;
  }

  let pubkey;
  try {
    pubkey = new PublicKey(address);
  } catch {
    console.error(`[SOL-WS] Địa chỉ ví không hợp lệ: ${address}`);
    return;
  }

  const rpcUrl = `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
  const wsUrl = `wss://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
  const connection = new Connection(rpcUrl, { commitment: "confirmed", wsEndpoint: wsUrl });

  console.log(`[SOL-WS] Kết nối WebSocket: ${label}${reconnectAttempt > 0 ? ` [lần thử #${reconnectAttempt + 1}]` : ""}`);

  try {
    const subscriptionId = connection.onLogs(
      pubkey,
      async (logInfo) => {
        if (logInfo.err) return;
        const { signature } = logInfo;

        // Tránh xử lý lại signature đã qua WS
        if (processedSignatures.has(signature)) return;
        processedSignatures.add(signature);
        if (processedSignatures.size > 1000) {
          processedSignatures.delete(processedSignatures.values().next().value);
        }

        console.log(`[SOL-WS] Giao dịch mới: ${signature.slice(0, 12)}... -> ${label}`);
        const tx = await fetchTransactionBySignature(signature);
        await evaluateTransaction(tx, wallet);
      },
      "confirmed"
    );

    activeSubscriptions[address] = { connection, subscriptionId };
    console.log(`[SOL-WS] ✅ ${reconnectAttempt === 0 ? "Bắt đầu" : "Reconnect thành công"} theo dõi realtime: ${label}`);

    // Theo dõi WebSocket — tự reconnect khi bị đóng
    const ws = connection._rpcWebSocket;
    if (ws) {
      ws.on("close", () => {
        console.warn(`[SOL-WS] Kết nối đóng cho ${label}, reconnect sau ${RECONNECT_DELAY_MS / 1000}s...`);
        delete activeSubscriptions[address];
        setTimeout(() => startSolanaWebSocketMonitor(wallet, reconnectAttempt + 1), RECONNECT_DELAY_MS);
      });
      ws.on("error", (err) => {
        console.error(`[SOL-WS] Lỗi WebSocket ${label}: ${err.message}`);
      });
    }
  } catch (err) {
    console.error(`[SOL-WS] Không thể tạo subscription cho ${label}: ${err.message}`);
    setTimeout(() => startSolanaWebSocketMonitor(wallet, reconnectAttempt + 1), RECONNECT_DELAY_MS);
  }
}

/**
 * Dừng WebSocket của một ví
 */
async function stopSolanaWebSocketMonitor(address) {
  const sub = activeSubscriptions[address];
  if (sub) {
    try { await sub.connection.removeOnLogsListener(sub.subscriptionId); } catch { /* ignore */ }
    delete activeSubscriptions[address];
  }
}

// ── Poll fallback ─────────────────────────────────────────────────────────

const lastPollSignature = {};

/**
 * Poll fallback cho 1 ví Solana.
 * Nếu WebSocket đang hoạt động, chỉ bỵ sung các tx WS có thể bỏ sót.
 */
async function processSolanaWallet(wallet) {
  const { label, address } = wallet;

  if (!HELIUS_API_KEY) {
    console.warn("[SOL] HELIUS_API_KEY chưa cấu hình.");
    return;
  }

  const wsActive = !!activeSubscriptions[address];
  console.log(`[SOL] Poll ${label} (WS: ${wsActive ? "active" : "inactive"})`);

  const transactions = await fetchSolanaTransactions(address);
  if (!transactions.length) return;

  const newLastSig = transactions[0]?.signature;
  const prevLastSig = lastPollSignature[address];

  const newTxs = prevLastSig
    ? transactions.slice(0, transactions.findIndex((tx) => tx.signature === prevLastSig))
    : transactions;

  for (const tx of newTxs) {
    if (!tx || tx.transactionError) continue;
    // Bỏ qua nếu đã được WebSocket xử lý
    if (processedSignatures.has(tx.signature)) continue;
    processedSignatures.add(tx.signature);
    await evaluateTransaction(tx, wallet);
  }

  if (newLastSig) lastPollSignature[address] = newLastSig;
}

module.exports = {
  startSolanaWebSocketMonitor,
  stopSolanaWebSocketMonitor,
  processSolanaWallet,
};

// Lưu signature giao dịch cuối đã xử lý (per wallet) để tránh re-check
const lastSignature = {};

/**
 * Lấy danh sách giao dịch token transfers gần nhất cho một ví Solana
 * @param {string} walletAddress
 * @returns {Array} mảng parsed transactions từ Helius
 */
async function fetchSolanaTransactions(walletAddress) {
  try {
    const params = {
      "api-key": HELIUS_API_KEY,
      type: "TOKEN_TRANSFER",
      limit: 50,
    };

    // Nếu đã có checkpoint, chỉ lấy txs sau checkpoint đó
    if (lastSignature[walletAddress]) {
      params.before = undefined; // Helius pagination bằng "before" signature
      // Lấy tất cả gần nhất rồi filter theo signature
    }

    const url = `https://api.helius.xyz/v0/addresses/${walletAddress}/transactions`;
    const { data } = await axios.get(url, { params, timeout: 15000 });

    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error(`[SOL] Lỗi fetch transactions cho ${walletAddress}:`, err.message);
    return [];
  }
}

/**
 * Parse token transfers từ 1 Helius transaction, chỉ lấy transfers ĐẾN wallet
 * @param {Object} tx - parsed transaction từ Helius
 * @param {string} walletAddress
 * @returns {Array} mảng { mint, symbol, amount, decimals }
 */
function extractIncomingTokenTransfers(tx, walletAddress) {
  const incoming = [];
  const tokenTransfers = tx.tokenTransfers || [];

  for (const transfer of tokenTransfers) {
    if (transfer.toUserAccount?.toLowerCase() === walletAddress.toLowerCase()) {
      incoming.push({
        mint: transfer.mint,
        symbol: transfer.tokenStandard || "UNKNOWN",
        amount: transfer.tokenAmount || 0,
        decimals: 0, // Helius đã trả về tokenAmount đã scale
      });
    }
  }

  return incoming;
}

/**
 * Xử lý một wallet Solana — kiểm tra transfers mới và alert nếu đủ điều kiện
 * @param {{ label: string, address: string, chain: string }} wallet
 */
async function processSolanaWallet(wallet) {
  const { label, address } = wallet;

  if (!HELIUS_API_KEY) {
    console.warn("[SOL] HELIUS_API_KEY chưa cấu hình, bỏ qua Solana monitor.");
    return;
  }

  console.log(`[SOL] Đang check ${label} (solana)...`);

  const transactions = await fetchSolanaTransactions(address);
  if (!transactions.length) return;

  const newLastSig = transactions[0]?.signature;
  const prevLastSig = lastSignature[address];

  // Lọc chỉ giữ giao dịch MỚI (chưa xử lý lần trước)
  const newTxs = prevLastSig
    ? transactions.filter((tx) => tx.signature !== prevLastSig).slice(
        0,
        transactions.findIndex((tx) => tx.signature === prevLastSig)
      )
    : transactions;

  for (const tx of newTxs) {
    if (tx.transactionError) continue; // Bỏ qua giao dịch lỗi

    const incomingTransfers = extractIncomingTokenTransfers(tx, address);

    for (const transfer of incomingTransfers) {
      const { mint, amount } = transfer;

      if (!mint || amount <= 0) continue;

      // Kiểm tra đã thông báo token này cho ví này chưa
      if (hasNotified("solana", address, mint)) {
        console.log(`[SOL] Skip (đã notify): ${mint} -> ${label}`);
        continue;
      }

      // Lấy giá token
      const pricePerToken = await getTokenPriceUSD(mint, "solana");
      if (pricePerToken == null) {
        console.log(`[SOL] Không lấy được giá cho mint ${mint}`);
        continue;
      }

      const usdValue = amount * pricePerToken;
      const threshold = Number(process.env.ALERT_THRESHOLD_USD || 50000);

      // Lấy token symbol từ metadata nếu có
      const tokenSymbol = tx.tokenTransfers?.find((t) => t.mint === mint)?.tokenStandard || mint.slice(0, 8) + "...";

      console.log(`[SOL] Token ${mint.slice(0, 8)}...: ${amount} = $${usdValue.toFixed(2)}`);

      if (usdValue >= threshold) {
        const explorerUrl = `${SOLSCAN_TX}${tx.signature}`;

        await sendAlert({
          chain: "Solana",
          walletLabel: label,
          walletAddress: address,
          tokenSymbol,
          tokenAddress: mint,
          amount,
          usdValue,
          txHash: tx.signature,
          txTime: tx.timestamp ? new Date(tx.timestamp * 1000).toISOString() : new Date().toISOString(),
          explorerUrl,
        });

        markNotified("solana", address, mint);
        console.log(`[SOL] ✅ Alert gửi: ${mint.slice(0, 8)}... = $${usdValue.toFixed(2)} -> ${label}`);
      }
    }
  }

  // Cập nhật checkpoint
  if (newLastSig) {
    lastSignature[address] = newLastSig;
  }
}
