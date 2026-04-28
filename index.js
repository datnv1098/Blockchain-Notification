/**
 * index.js
 * ---
 * Điểm khởi chạy chính của Blockchain Notification Bot.
 * Khởi tạo Moralis, load config ví, và bắt đầu vòng lặp polling.
 */

require("dotenv").config();
const { initMoralis } = require("./services/moralisRotator");
const { wallets } = require("./config");
const { processEVMWallet, processEVMWallets } = require("./monitors/evm");
const { startSolanaWebSocketMonitor, processSolanaWallet } = require("./monitors/solana");
const { sendStartupMessage, sendError, sendTelegramMessage } = require("./services/telegram");
const {
  runStartupHealthCheck,
  startPeriodicReport,
  startPeriodicApiCheck,
  recordSuccess,
  recordError,
  recordCycleStart,
} = require("./services/health");

const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS) || 30_000; // mặc định 30 giây

// ──────────────────────────────────────────────
// Khởi tạo Moralis SDK (chỉ gọi 1 lần)
// ──────────────────────────────────────────────
async function initMoralisSDK() {
  const hasEVM = wallets.some((w) => w.chain !== "solana");
  if (!hasEVM) return;
  await initMoralis();
}

// ──────────────────────────────────────────────
// Chạy một vòng poll cho tất cả ví
// ──────────────────────────────────────────────
async function runPollCycle() {
  if (!wallets || wallets.length === 0) {
    console.log("[INFO] Không có ví nào được cấu hình trong config.js.");
    return;
  }

  recordCycleStart();
  console.log(`\n[POLL] ── Bắt đầu chu kỳ lúc ${new Date().toISOString()} ──`);

  // Chạy tất cả EVM wallets song song
  const { networks } = require("./config");
  const evmChains = Object.keys(networks).filter((c) => c !== "solana");
  const evmWallets = wallets.filter((w) => evmChains.includes(w.chain));
  const evmPromise = evmWallets.length
    ? processEVMWallets(wallets).catch((err) => {
        console.error("[ERROR] EVM parallel poll lỗi:", err.message);
      })
    : Promise.resolve();

  // Solana poll là fallback bụ sung cho WebSocket
  const solWallets = wallets.filter((w) => w.chain === "solana");
  const solPromises = solWallets.map((wallet) =>
    processSolanaWallet(wallet).catch((err) => {
      console.error(`[ERROR] Solana poll lỗi [${wallet.label}]:`, err.message);
      const shouldAlert = recordError(wallet.chain, wallet.address, err.message);
      if (shouldAlert) {
        sendError(`Ví [${wallet.label}] (solana) lỗi liên tiếp: ${err.message}`).catch(() => {});
      }
    })
  );

  await Promise.all([evmPromise, ...solPromises]);
  console.log(`[POLL] ── Hoàn thành chu kỳ ──\n`);
}

// ──────────────────────────────────────────────
// Hàm tiện ích
// ──────────────────────────────────────────────
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function validateConfig() {
  const missing = [];
  const { networks } = require("./config");
  const evmChains = Object.keys(networks).filter((c) => c !== "solana");
  const hasEvmWallets = wallets.some((w) => evmChains.includes(w.chain));
  const hasMoralisKey = process.env.MORALIS_API_KEY_1 || process.env.MORALIS_API_KEY_2 ||
    process.env.MORALIS_API_KEY_3 || process.env.MORALIS_API_KEY;
  if (hasEvmWallets && !hasMoralisKey) {
    missing.push("MORALIS_API_KEY_1 (cần cho EVM chains: ETH, BSC, Polygon, Arbitrum...)");
  }
  if (!process.env.HELIUS_API_KEY && wallets.some((w) => w.chain === "solana")) {
    missing.push("HELIUS_API_KEY (cần cho Solana)");
  }
  if (!process.env.TELEGRAM_BOT_TOKEN) missing.push("TELEGRAM_BOT_TOKEN");
  if (!process.env.TELEGRAM_CHAT_ID) missing.push("TELEGRAM_CHAT_ID");

  if (missing.length) {
    console.error("[ERROR] Thiếu các biến môi trường sau trong .env:");
    missing.forEach((v) => console.error(`  ✗ ${v}`));
    process.exit(1);
  }
}

// ──────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────
async function main() {
  console.log("═══════════════════════════════════════════════");
  console.log("   Blockchain Notification Bot");
  console.log("═══════════════════════════════════════════════");

  // Validate .env
  validateConfig();

  // Kiểm tra kết nối tất cả API trước khi chạy
  const healthOk = await runStartupHealthCheck(wallets);
  if (!healthOk) {
    console.error("[FATAL] Một hoặc nhiều API quan trọng không hoạt động. Dừng bot.");
    process.exit(1);
  }

  // Khởi tạo Moralis
  await initMoralisSDK();

  // Bắt đầu WebSocket realtime cho tất cả ví Solana
  const solanaWallets = wallets.filter((w) => w.chain === "solana");
  if (solanaWallets.length > 0) {
    console.log(`[INFO] Bắt đầu WebSocket realtime cho ${solanaWallets.length} ví Solana...`);
    for (const wallet of solanaWallets) {
      startSolanaWebSocketMonitor(wallet); // không await — chạy nền liên tục
    }
  }

  // Gửi thông báo startup tới Telegram
  const walletSummaries = wallets.map((w) => `${w.label} (${w.chain}): ${w.address.slice(0, 8)}...`);
  await sendStartupMessage(walletSummaries);

  console.log(`[INFO] Theo dõi ${wallets.length} ví | Ngưỡng: $${Number(process.env.ALERT_THRESHOLD_USD || 50000).toLocaleString()} | EVM poll: ${POLL_INTERVAL_MS / 1000}s | Solana: WebSocket realtime`);
  console.log("[INFO] Bot đang chạy... (Ctrl+C để dừng)\n");

  // Bắt đầu báo cáo định kỳ & kiểm tra API liên tục
  startPeriodicReport(sendTelegramMessage, wallets);
  startPeriodicApiCheck(sendTelegramMessage);

  // Chạy ngay lập tức lần đầu
  await runPollCycle();

  // Lặp theo POLL_INTERVAL_MS
  setInterval(async () => {
    try {
      await runPollCycle();
    } catch (err) {
      console.error("[ERROR] Lỗi trong poll cycle:", err.message);
      await sendError(`Poll cycle crash: ${err.message}`);
    }
  }, POLL_INTERVAL_MS);
}

// Xử lý unhandled rejections để bot không crash
process.on("unhandledRejection", (reason) => {
  const msg = reason instanceof Error ? reason.message : String(reason);
  console.error("[ERROR] Unhandled rejection:", msg);
  sendError(`Unhandled error: ${msg}`).catch(() => {});
});

process.on("uncaughtException", (err) => {
  console.error("[FATAL] Uncaught exception:", err.message);
  sendError(`Uncaught exception: ${err.message}`).catch(() => {});
  // Cho thời gian gửi Telegram rồi thoát
  setTimeout(() => process.exit(1), 3000);
});

main().catch((err) => {
  console.error("[FATAL] Khởi động thất bại:", err.message);
  process.exit(1);
});
