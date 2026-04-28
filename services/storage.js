/**
 * services/storage.js
 * ---
 * Lưu trữ các cặp (wallet + token + chain) đã được thông báo.
 * Ngăn gửi thông báo trùng lặp cho cùng một token trên cùng một ví.
 *
 * Format lưu trữ trong data/notified.json:
 * {
 *   "ethereum:0xWALLET:0xTOKEN": "2026-04-29T12:00:00.000Z",
 *   "solana:WALLET_ADDR:TOKEN_MINT": "2026-04-29T13:00:00.000Z"
 * }
 */

const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const STORAGE_FILE = path.join(DATA_DIR, "notified.json");

/** Đảm bảo thư mục data/ và file notified.json tồn tại */
function ensureStorage() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(STORAGE_FILE)) {
    fs.writeFileSync(STORAGE_FILE, JSON.stringify({}, null, 2), "utf8");
  }
}

/** Đọc toàn bộ dữ liệu đã lưu */
function readAll() {
  ensureStorage();
  try {
    const raw = fs.readFileSync(STORAGE_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/** Ghi toàn bộ dữ liệu xuống file */
function writeAll(data) {
  ensureStorage();
  fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2), "utf8");
}

/**
 * Tạo khóa duy nhất cho cặp (chain, wallet, token)
 * @param {string} chain       - "ethereum" | "bsc" | "solana"
 * @param {string} wallet      - địa chỉ ví (lowercase)
 * @param {string} tokenAddress - địa chỉ / mint của token (lowercase)
 */
function makeKey(chain, wallet, tokenAddress) {
  return `${chain}:${wallet.toLowerCase()}:${tokenAddress.toLowerCase()}`;
}

/**
 * Kiểm tra xem token này đã được thông báo cho ví này chưa
 */
function hasNotified(chain, wallet, tokenAddress) {
  const data = readAll();
  return !!data[makeKey(chain, wallet, tokenAddress)];
}

/**
 * Đánh dấu token này đã được thông báo cho ví
 */
function markNotified(chain, wallet, tokenAddress) {
  const data = readAll();
  data[makeKey(chain, wallet, tokenAddress)] = new Date().toISOString();
  writeAll(data);
}

/**
 * Lấy danh sách tất cả token đã thông báo (để debug / xem lịch sử)
 */
function listNotified() {
  return readAll();
}

module.exports = { hasNotified, markNotified, listNotified };
