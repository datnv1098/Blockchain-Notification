/**
 * services/health.js
 * ---
 * Theo dõi sức khỏe hệ thống liên tục:
 *   - Kiểm tra kết nối Moralis, Helius, Telegram trước khi chạy
 *   - Đếm lỗi liên tiếp per wallet — nếu vượt ngưỡng thì alert Telegram
 *   - Báo cáo trạng thái tổng hợp mỗi N giờ (HEALTH_REPORT_INTERVAL_H)
 *   - Ghi log chi tiết ra console với timestamp
 */

require("dotenv").config();
const axios = require("axios");

// ── Cấu hình ──────────────────────────────────────────────────────────────
const MAX_CONSECUTIVE_ERRORS = Number(process.env.MAX_CONSECUTIVE_ERRORS) || 3;
const HEALTH_REPORT_INTERVAL_H = Number(process.env.HEALTH_REPORT_INTERVAL_H) || 6;

// ── State ──────────────────────────────────────────────────────────────────
const stats = {
  startedAt: new Date(),
  totalCycles: 0,
  totalAlertsSent: 0,
  totalErrors: 0,
  consecutiveErrors: {}, // key: "chain:walletAddress" -> số lỗi liên tiếp
  lastCycleAt: null,
  lastErrorAt: null,
  lastErrorMsg: null,
  apiStatus: {
    moralis: null,   // "ok" | "error" | "skip"
    helius: null,
    telegram: null,
  },
};

// ── Logging helpers ────────────────────────────────────────────────────────

function timestamp() {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}

function log(level, tag, msg) {
  const levels = { INFO: "ℹ️ ", WARN: "⚠️ ", ERROR: "❌", OK: "✅" };
  const prefix = levels[level] || "   ";
  console.log(`[${timestamp()}] ${prefix} [${tag}] ${msg}`);
}

// ── Kiểm tra kết nối API ───────────────────────────────────────────────────

/**
 * Kiểm tra Moralis API còn hoạt động không (lấy block number ETH)
 */
async function checkMoralis() {
  const key = process.env.MORALIS_API_KEY_1 || process.env.MORALIS_API_KEY_2 ||
    process.env.MORALIS_API_KEY_3 || process.env.MORALIS_API_KEY;
  if (!key) {
    stats.apiStatus.moralis = "skip";
    return { ok: true, msg: "Không cấu hình (skip)" };
  }
  const { getKeyStatus } = require("./moralisRotator");
  const keyStatus = getKeyStatus();
  try {
    const { data } = await axios.get(
      "https://deep-index.moralis.io/api/v2.2/dateToBlock?chain=eth&date=2024-01-01",
      {
        headers: { "X-API-Key": key },
        timeout: 8000,
      }
    );
    if (data?.block) {
      stats.apiStatus.moralis = "ok";
      return { ok: true, msg: `Key #${keyStatus.currentIndex}/${keyStatus.total} hoạt động` };
    }
    throw new Error("Phản hồi không hợp lệ");
  } catch (err) {
    stats.apiStatus.moralis = "error";
    return { ok: false, msg: err.response?.status === 401 ? `Key #${keyStatus.currentIndex} không hợp lệ` : err.message };
  }
}

/**
 * Kiểm tra Helius API còn hoạt động không
 */
async function checkHelius() {
  if (!process.env.HELIUS_API_KEY) {
    stats.apiStatus.helius = "skip";
    return { ok: true, msg: "Không cấu hình (skip)" };
  }
  try {
    const url = `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`;
    const { data } = await axios.post(
      url,
      { jsonrpc: "2.0", id: 1, method: "getHealth" },
      { timeout: 8000 }
    );
    if (data?.result === "ok") {
      stats.apiStatus.helius = "ok";
      return { ok: true, msg: "Kết nối bình thường" };
    }
    throw new Error("Phản hồi không hợp lệ");
  } catch (err) {
    stats.apiStatus.helius = "error";
    return { ok: false, msg: err.response?.status === 401 ? "API key không hợp lệ" : err.message };
  }
}

/**
 * Kiểm tra Telegram bot token có hợp lệ không (getMe)
 */
async function checkTelegram() {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    stats.apiStatus.telegram = "skip";
    return { ok: false, msg: "Chưa cấu hình TELEGRAM_BOT_TOKEN" };
  }
  try {
    const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getMe`;
    const { data } = await axios.get(url, { timeout: 8000 });
    if (data?.ok) {
      stats.apiStatus.telegram = "ok";
      return { ok: true, msg: `Bot: @${data.result.username}` };
    }
    throw new Error("Phản hồi không hợp lệ");
  } catch (err) {
    stats.apiStatus.telegram = "error";
    return {
      ok: false,
      msg: err.response?.status === 401 ? "Bot token không hợp lệ" : err.message,
    };
  }
}

/**
 * Chạy kiểm tra toàn bộ hệ thống, in kết quả ra console.
 * @returns {boolean} true nếu tất cả API cần thiết đều OK
 */
async function runStartupHealthCheck(wallets) {
  log("INFO", "HEALTH", "Đang kiểm tra kết nối các API...");

  const hasEVM = wallets.some((w) => ["ethereum", "bsc"].includes(w.chain));
  const hasSolana = wallets.some((w) => w.chain === "solana");

  const [moralis, helius, telegram] = await Promise.all([
    checkMoralis(),
    checkHelius(),
    checkTelegram(),
  ]);

  const statusIcon = (r) => (r.ok ? "✅" : "❌");

  console.log("┌─────────────────────────────────────────────────┐");
  console.log("│           KIỂM TRA TRẠNG THÁI HỆ THỐNG          │");
  console.log("├─────────────────────────────────────────────────┤");
  console.log(`│ ${statusIcon(moralis)} Moralis API  : ${moralis.msg.padEnd(34)}│`);
  console.log(`│ ${statusIcon(helius)} Helius API   : ${helius.msg.padEnd(34)}│`);
  console.log(`│ ${statusIcon(telegram)} Telegram Bot : ${telegram.msg.padEnd(34)}│`);
  console.log("└─────────────────────────────────────────────────┘");

  let allOk = true;

  if (hasEVM && !moralis.ok) {
    log("ERROR", "HEALTH", `Moralis không hoạt động nhưng có ví EVM: ${moralis.msg}`);
    allOk = false;
  }
  if (hasSolana && !helius.ok) {
    log("ERROR", "HEALTH", `Helius không hoạt động nhưng có ví Solana: ${helius.msg}`);
    allOk = false;
  }
  if (!telegram.ok) {
    log("ERROR", "HEALTH", `Telegram không hoạt động: ${telegram.msg}`);
    allOk = false;
  }

  return allOk;
}

// ── Theo dõi lỗi per wallet ────────────────────────────────────────────────

/**
 * Gọi khi một wallet xử lý thành công — reset bộ đếm lỗi
 */
function recordSuccess(chain, address) {
  const key = `${chain}:${address}`;
  stats.consecutiveErrors[key] = 0;
  stats.lastCycleAt = new Date();
}

/**
 * Gọi khi một wallet gặp lỗi — trả về true nếu vượt ngưỡng cần alert
 */
function recordError(chain, address, errMsg) {
  const key = `${chain}:${address}`;
  stats.consecutiveErrors[key] = (stats.consecutiveErrors[key] || 0) + 1;
  stats.totalErrors += 1;
  stats.lastErrorAt = new Date();
  stats.lastErrorMsg = errMsg;

  log("ERROR", "HEALTH", `[${key}] Lỗi liên tiếp lần ${stats.consecutiveErrors[key]}: ${errMsg}`);

  return stats.consecutiveErrors[key] >= MAX_CONSECUTIVE_ERRORS;
}

/**
 * Gọi sau mỗi lần gửi alert thành công
 */
function recordAlertSent() {
  stats.totalAlertsSent += 1;
}

/**
 * Đánh dấu bắt đầu một poll cycle
 */
function recordCycleStart() {
  stats.totalCycles += 1;
}

// ── Báo cáo định kỳ ──────────────────────────────────────────────────────

/**
 * Tạo nội dung báo cáo trạng thái hệ thống
 */
function buildStatusReport(wallets) {
  const uptime = Math.round((Date.now() - stats.startedAt.getTime()) / 1000 / 60);
  const uptimeStr =
    uptime < 60
      ? `${uptime} phút`
      : `${Math.floor(uptime / 60)} giờ ${uptime % 60} phút`;

  const apiLine = (name, status) => {
    const icon = { ok: "✅", error: "❌", skip: "⏭️", null: "❓" }[status] || "❓";
    return `${icon} ${name}`;
  };

  const walletLines = wallets
    .map((w) => {
      const key = `${w.chain}:${w.address}`;
      const errs = stats.consecutiveErrors[key] || 0;
      const icon = errs >= MAX_CONSECUTIVE_ERRORS ? "🔴" : errs > 0 ? "🟡" : "🟢";
      return `  ${icon} ${w.label} (${w.chain})`;
    })
    .join("\n");

  return [
    `📊 *BÁO CÁO TRẠNG THÁI HỆ THỐNG*`,
    ``,
    `⏱ *Uptime:* ${uptimeStr}`,
    `🔄 *Số chu kỳ đã chạy:* ${stats.totalCycles}`,
    `🚨 *Cảnh báo đã gửi:* ${stats.totalAlertsSent}`,
    `❌ *Tổng lỗi:* ${stats.totalErrors}`,
    ``,
    `🔌 *Trạng thái API:*`,
    `  ${apiLine("Moralis", stats.apiStatus.moralis)}`,
    `  ${apiLine("Helius", stats.apiStatus.helius)}`,
    `  ${apiLine("Telegram", stats.apiStatus.telegram)}`,
    ``,
    `👛 *Ví đang theo dõi:*`,
    walletLines || `  (Chưa có ví)`,
    ``,
    stats.lastErrorMsg
      ? `⚠️ *Lỗi gần nhất:*\n  \`${stats.lastErrorMsg.slice(0, 200)}\``
      : `✅ *Không có lỗi gần đây*`,
  ].join("\n");
}

/**
 * Bắt đầu vòng lặp báo cáo định kỳ lên Telegram
 * @param {Function} sendTelegramFn - hàm sendTelegramMessage từ services/telegram.js
 * @param {Array} wallets
 */
function startPeriodicReport(sendTelegramFn, wallets) {
  const intervalMs = HEALTH_REPORT_INTERVAL_H * 60 * 60 * 1000;
  log("INFO", "HEALTH", `Báo cáo định kỳ mỗi ${HEALTH_REPORT_INTERVAL_H} giờ`);

  setInterval(async () => {
    try {
      const report = buildStatusReport(wallets);
      await sendTelegramFn(report);
      log("OK", "HEALTH", "Đã gửi báo cáo định kỳ lên Telegram");
    } catch (err) {
      log("ERROR", "HEALTH", `Không gửi được báo cáo: ${err.message}`);
    }
  }, intervalMs);
}

/**
 * Kiểm tra API định kỳ trong khi bot đang chạy
 * Alert nếu có API chuyển từ OK → ERROR
 * @param {Function} sendTelegramFn
 */
function startPeriodicApiCheck(sendTelegramFn) {
  const CHECK_INTERVAL_MS = 10 * 60 * 1000; // mỗi 10 phút

  setInterval(async () => {
    const prevMoralis = stats.apiStatus.moralis;
    const prevHelius = stats.apiStatus.helius;

    const [moralis, helius] = await Promise.all([checkMoralis(), checkHelius()]);

    if (prevMoralis === "ok" && moralis.ok === false) {
      log("ERROR", "HEALTH", `Moralis API vừa ngắt kết nối: ${moralis.msg}`);
      await sendTelegramFn(`⚠️ *Cảnh báo hệ thống*\n❌ Moralis API không phản hồi: \`${moralis.msg}\`\nBot tạm thời không theo dõi được EVM chains.`).catch(() => {});
    }
    if (prevHelius === "ok" && helius.ok === false) {
      log("ERROR", "HEALTH", `Helius API vừa ngắt kết nối: ${helius.msg}`);
      await sendTelegramFn(`⚠️ *Cảnh báo hệ thống*\n❌ Helius API không phản hồi: \`${helius.msg}\`\nBot tạm thời không theo dõi được Solana.`).catch(() => {});
    }

    // Nếu API phục hồi, log lại
    if (prevMoralis === "error" && moralis.ok) {
      log("OK", "HEALTH", "Moralis API đã phục hồi");
    }
    if (prevHelius === "error" && helius.ok) {
      log("OK", "HEALTH", "Helius API đã phục hồi");
    }
  }, CHECK_INTERVAL_MS);
}

module.exports = {
  runStartupHealthCheck,
  startPeriodicReport,
  startPeriodicApiCheck,
  recordSuccess,
  recordError,
  recordAlertSent,
  recordCycleStart,
  buildStatusReport,
  stats,
};
