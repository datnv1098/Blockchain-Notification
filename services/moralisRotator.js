/**
 * services/moralisRotator.js
 * ---
 * Quản lý nhiều Moralis API key và tự động xoay vòng (rotate)
 * khi gặp lỗi rate limit (429) hoặc key không hợp lệ (401).
 *
 * Cách dùng:
 *   const { moralisCall } = require("./moralisRotator");
 *   const result = await moralisCall(() => Moralis.EvmApi.token.getTokenPrice(...));
 */

require("dotenv").config();
const Moralis = require("moralis").default;

// ── Đọc danh sách keys từ .env ────────────────────────────────────────────

function loadKeys() {
  const keys = [
    process.env.MORALIS_API_KEY_1,
    process.env.MORALIS_API_KEY_2,
    process.env.MORALIS_API_KEY_3,
    process.env.MORALIS_API_KEY_4,
    process.env.MORALIS_API_KEY_5,
  ].filter(Boolean); // bỏ key rỗng

  // Backward compat: nếu dùng MORALIS_API_KEY cũ thì thêm vào đầu
  if (process.env.MORALIS_API_KEY && !keys.includes(process.env.MORALIS_API_KEY)) {
    keys.unshift(process.env.MORALIS_API_KEY);
  }

  return keys;
}

const KEYS = loadKeys();
let currentIndex = 0;
let moralisInitialized = false;
const invalidKeys = new Set(); // keys bị hỏi vĩnh viễn trong session (401 invalid key)

if (KEYS.length === 0) {
  console.warn("[MORALIS] Không tìm thấy MORALIS_API_KEY nào trong .env");
}

// ── Khởi tạo / re-khởi tạo Moralis với key hiện tại ─────────────────────

async function initWithCurrentKey() {
  const key = KEYS[currentIndex];
  if (!key) return;

  try {
    // Moralis SDK cho phép gọi start() lại để đổi key
    await Moralis.start({ apiKey: key });
    moralisInitialized = true;
    console.log(`[MORALIS] Dùng key #${currentIndex + 1} (${key.slice(0, 12)}...)`);
  } catch (err) {
    console.error(`[MORALIS] Không khởi tạo được với key #${currentIndex + 1}:`, err.message);
  }
}

/**
 * Khởi tạo Moralis lần đầu — thử từng key cho đến khi có key hợp lệ.
 * Key không hợp lệ (401) sẽ bị blacklist ngay.
 */
async function initMoralis() {
  if (KEYS.length === 0) {
    console.warn("[MORALIS] Bỏ qua khởi tạo — không có key.");
    return;
  }

  // Thử key hiện tại, nếu fail thì tìm key kế tiếp còn hợp lệ
  for (let i = 0; i < KEYS.length; i++) {
    if (invalidKeys.has(currentIndex)) {
      // Tìm key tiếp theo chưa bị blacklist
      let found = false;
      for (let j = 1; j < KEYS.length; j++) {
        const candidate = (currentIndex + j) % KEYS.length;
        if (!invalidKeys.has(candidate)) {
          currentIndex = candidate;
          found = true;
          break;
        }
      }
      if (!found) {
        console.error("[MORALIS] Tất cả keys đều không hợp lệ.");
        return;
      }
    }

    await initWithCurrentKey();

    // Kiểm tra xem key có thực sự hoạt động không
    try {
      const axios = require("axios");
      await axios.get(
        "https://deep-index.moralis.io/api/v2.2/dateToBlock?chain=eth&date=2024-01-01",
        { headers: { "X-API-Key": KEYS[currentIndex] }, timeout: 8000 }
      );
      console.log(`[MORALIS] Key #${currentIndex + 1} xác nhận hợp lệ.`);
      return; // key tốt, xong
    } catch (err) {
      if (err.response?.status === 401) {
        console.warn(`[MORALIS] Key #${currentIndex + 1} không hợp lệ (401) — blacklist và thử key tiếp.`);
        invalidKeys.add(currentIndex);
        // Tìm key tiếp
        let found = false;
        for (let j = 1; j < KEYS.length; j++) {
          const candidate = (currentIndex + j) % KEYS.length;
          if (!invalidKeys.has(candidate)) {
            currentIndex = candidate;
            found = true;
            break;
          }
        }
        if (!found) {
          console.error("[MORALIS] Tất cả keys đều không hợp lệ.");
          return;
        }
      } else {
        // Lỗi mạng, không blacklist
        console.warn(`[MORALIS] Key #${currentIndex + 1} lỗi kết nối (${err.message}) — vẫn dùng key này.`);
        return;
      }
    }
  }
}

// ── Rotate sang key tiếp theo ─────────────────────────────────────────────

/**
 * Chuyển sang key tiếp theo trong danh sách.
 * @returns {boolean} true nếu còn key khác để thử, false nếu đã hết
 */
async function rotateKey(reason = "", permanent = false) {
  if (permanent) {
    invalidKeys.add(currentIndex);
    console.warn(`[MORALIS] Key #${currentIndex + 1} bị đánh dấu INVALID vĩnh viễn.`);
  }

  // Tìm key tiếp theo không nằm trong blacklist
  let nextIndex = null;
  for (let i = 1; i < KEYS.length; i++) {
    const candidate = (currentIndex + i) % KEYS.length;
    if (!invalidKeys.has(candidate)) {
      nextIndex = candidate;
      break;
    }
  }

  if (nextIndex === null) {
    console.error("[MORALIS] Đã thử hết tất cả keys, không còn key nào khả dụng.");
    return false;
  }

  console.warn(`[MORALIS] Rotate key #${currentIndex + 1} → #${nextIndex + 1}${reason ? ` (lý do: ${reason})` : ""}`);
  currentIndex = nextIndex;
  await initWithCurrentKey();
  return true;
}

// ── Hàm wrapper với retry + rotate ───────────────────────────────────────

/**
 * Gọi một Moralis SDK function với tự động rotate key khi lỗi.
 *
 * @param {Function} fn - () => Moralis.EvmApi.xxx(...) — hàm không tham số trả về Promise
 * @param {number} [maxAttempts] - số lần thử tối đa (mặc định = số keys)
 * @returns {Promise<any>} kết quả của fn
 * @throws Ném lỗi nếu đã thử hết tất cả keys
 */
async function moralisCall(fn, maxAttempts = null) {
  if (!moralisInitialized) {
    await initMoralis();
  }

  const attempts = maxAttempts ?? KEYS.length;
  let backoffMs = 1000; // Start with 1 second backoff

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const status = err?.response?.status || err?.status || err?.code;
      const isRateLimit = status === 429 || String(err.message).includes("rate limit");
      const isAuthError = status === 401 || status === 403;
      const isQuotaExceeded = status === 401 && String(err.message).includes("plan");

      if (isQuotaExceeded) {
        // Plan quota exceeded - don't retry, pause for a while
        const pauseMinutes = Number(process.env.QUOTA_PAUSE_MINUTES) || 60;
        console.error(`[MORALIS] Quota exceeded! Pausing for ${pauseMinutes} minutes. Error:`, err.message);
        throw err; // Let caller handle the pause
      }

      if ((isRateLimit || isAuthError) && attempt < attempts) {
        const reason = isRateLimit ? "rate limit (429)" : "auth error (401/403)";
        // 401/403 không phải quota → key không hợp lệ → blacklist vĩnh viễn
        const permanent = isAuthError && !isQuotaExceeded;
        const rotated = await rotateKey(reason, permanent);
        if (!rotated) throw err;
        // Exponential backoff: 1s, 2s, 4s...
        console.log(`[MORALIS] Retrying in ${backoffMs}ms (attempt ${attempt}/${attempts})`);
        await new Promise((r) => setTimeout(r, backoffMs));
        backoffMs = Math.min(backoffMs * 2, 10000); // Cap at 10 seconds
        continue;
      }

      // Lỗi khác hoặc đã hết key → throw
      throw err;
    }
  }
}

/**
 * Lấy key hiện tại (dùng cho Moralis REST axios calls nếu cần)
 */
function getCurrentKey() {
  return KEYS[currentIndex] || null;
}

/**
 * Tóm tắt trạng thái keys (dùng cho health report)
 */
function getKeyStatus() {
  return {
    total: KEYS.length,
    currentIndex: currentIndex + 1,
    currentKeyPrefix: KEYS[currentIndex]?.slice(0, 12) + "..." || "N/A",
  };
}

module.exports = { initMoralis, moralisCall, rotateKey, getCurrentKey, getKeyStatus };
