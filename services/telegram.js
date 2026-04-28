/**
 * services/telegram.js
 * ---
 * Gửi thông báo qua Telegram Bot API (trực tiếp qua axios, không cần SDK).
 */

require("dotenv").config();
const axios = require("axios");

/**
 * Gọi Telegram sendMessage API
 * @param {string} text - Nội dung tin nhắn (Markdown)
 */
async function sendTelegramMessage(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token) throw new Error("TELEGRAM_BOT_TOKEN chưa được cấu hình trong .env");
  if (!chatId) throw new Error("TELEGRAM_CHAT_ID chưa được cấu hình trong .env");

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  await axios.post(url, {
    chat_id: chatId,
    text,
    parse_mode: "Markdown",
    disable_web_page_preview: true,
  }, { timeout: 10000 });
}

/**
 * Gửi cảnh báo lớn khi phát hiện inflow >= ngưỡng
 *
 * @param {Object} params
 * @param {string} params.chain         - "Ethereum" | "BSC" | "Solana"
 * @param {string} params.walletLabel   - Tên gợi nhớ của ví
 * @param {string} params.walletAddress - Địa chỉ ví
 * @param {string} params.tokenSymbol   - Symbol token (VD: USDC)
 * @param {string} params.tokenAddress  - Địa chỉ / mint token
 * @param {number} params.amount        - Số lượng token nhận được
 * @param {number} params.usdValue      - Giá trị USD tương đương
 * @param {string} params.txHash        - Transaction hash
 * @param {string} params.txTime        - Thời gian giao dịch (ISO string)
 * @param {string} params.explorerUrl   - Link explorer (Etherscan / BSCScan / Solscan)
 */
async function sendAlert(params) {
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!chatId) {
    throw new Error("TELEGRAM_CHAT_ID chưa được cấu hình trong .env");
  }

  const {
    chain,
    walletLabel,
    walletAddress,
    tokenSymbol,
    tokenAddress,
    amount,
    usdValue,
    txHash,
    txTime,
    explorerUrl,
  } = params;

  const formattedAmount = Number(amount).toLocaleString("en-US", { maximumFractionDigits: 4 });
  const formattedUSD = Number(usdValue).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formattedTime = new Date(txTime).toUTCString();
  const shortTx = `${txHash.slice(0, 10)}...${txHash.slice(-6)}`;

  const chainEmoji = params.chainEmoji || { Ethereum: "🔷", BSC: "🟡", Solana: "◎", Polygon: "🟣", Arbitrum: "🔵", Optimism: "🔴", Base: "🟦", Avalanche: "🔺" }[chain] || "🔗";

  const message = [
    `🚨 *CẢNH BÁO: SỐ DƯ TOKEN TĂNG CAO* 🚨`,
    ``,
    `${chainEmoji} *Blockchain:* ${chain}`,
    `━━━━━━━━━━━━━━━━━━━━━━━`,
    `👛 *Tên ví theo dõi:* ${walletLabel}`,
    `📍 *Địa chỉ ví:* \`${walletAddress}\``,
    `━━━━━━━━━━━━━━━━━━━━━━━`,
    `🪙 *Tên token:* ${tokenSymbol}`,
    `📄 *Địa chỉ token:* \`${tokenAddress}\``,
    `━━━━━━━━━━━━━━━━━━━━━━━`,
    `💼 *Số lượng đang nắm giữ:* ${formattedAmount} ${tokenSymbol}`,
    `💵 *Giá trị thị trường:* $${formattedUSD} USD`,
    `━━━━━━━━━━━━━━━━━━━━━━━`,
    `🔗 *Giao dịch kích hoạt:* [${shortTx}](${explorerUrl})`,
    `⏰ *Thời gian:* ${formattedTime}`,
  ].join("\n");

  await sendTelegramMessage(message);
}

/**
 * Gửi thông báo hệ thống khởi động
 * @param {string[]} walletSummaries - Mảng mô tả các ví đang được theo dõi
 */
async function sendStartupMessage(walletSummaries) {
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!chatId) return;

  const threshold = Number(process.env.ALERT_THRESHOLD_USD || 50000).toLocaleString("en-US");
  const interval = Math.round((Number(process.env.POLL_INTERVAL_MS) || 120000) / 1000);

  const walletList = walletSummaries.length
    ? walletSummaries.map((w) => `  • ${w}`).join("\n")
    : "  (Chưa có ví nào được cấu hình)";

  const message = [
    `✅ *Blockchain Notification Bot đã khởi động*`,
    ``,
    `📋 *Ví đang theo dõi:*`,
    walletList,
    ``,
    `⚡ *Ngưỡng cảnh báo:* $${threshold} USD`,
    `🔄 *Chu kỳ kiểm tra:* ${interval} giây`,
  ].join("\n");

  await sendTelegramMessage(message);
}

/**
 * Gửi tin nhắn lỗi hệ thống tới Telegram (nếu cần debug)
 */
async function sendError(errorMsg) {
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!chatId) return;
  try {
    await sendTelegramMessage(`⚠️ *Lỗi hệ thống:*\n\`${errorMsg}\``);
  } catch {
    // Bỏ qua lỗi khi gửi error message
  }
}

module.exports = { sendAlert, sendStartupMessage, sendError, sendTelegramMessage };
