/**
 * services/cache.js
 * ---
 * Simple TTL-based cache để giảm số lượng API calls.
 * Cache token prices, transfer history, metadata, v.v. trong 1 tiếng.
 * 
 * Cache types:
 *   - "price:chain:address" → token price (1 hour TTL)
 *   - "transfers:wallet:chain" → transfers list (5 min TTL) 
 *   - "balance:wallet:chain:token" → token balance (5 min TTL)
 *   - "metadata:address" → token metadata (24 hour TTL)
 */

// {key: {value, expiresAt}}
const cache = {};

/**
 * Lấy giá trị từ cache nếu còn hiệu lực
 */
function get(key) {
  const item = cache[key];
  if (!item) return null;

  if (Date.now() > item.expiresAt) {
    delete cache[key];
    return null;
  }

  return item.value;
}

/**
 * Lưu giá trị vào cache với TTL (milliseconds)
 */
function set(key, value, ttlMs = 5 * 60 * 1000) {
  cache[key] = {
    value,
    expiresAt: Date.now() + ttlMs,
  };
}

/**
 * Xóa tất cả cache (gọi khi restart/reset)
 */
function clear() {
  Object.keys(cache).forEach((key) => delete cache[key]);
}

/**
 * Xóa cache theo pattern (ví dụ: xóa tất cả transfers của 1 wallet)
 */
function clearPattern(pattern) {
  const regex = new RegExp(pattern);
  let deleted = 0;
  Object.keys(cache).forEach((key) => {
    if (regex.test(key)) {
      delete cache[key];
      deleted++;
    }
  });
  return deleted;
}

/**
 * Lấy tổng số items trong cache
 */
function getStats() {
  const now = Date.now();
  const stats = {
    total: 0,
    prices: 0,
    transfers: 0,
    balances: 0,
    metadata: 0,
    expired: 0,
    keys: [],
  };

  Object.keys(cache).forEach((key) => {
    const item = cache[key];
    stats.total++;
    stats.keys.push(key);

    // Đếm loại
    if (key.startsWith("price:")) stats.prices++;
    else if (key.startsWith("transfers:")) stats.transfers++;
    else if (key.startsWith("balance:")) stats.balances++;
    else if (key.startsWith("metadata:")) stats.metadata++;

    // Đếm expired
    if (now > item.expiresAt) stats.expired++;
  });

  return stats;
}

module.exports = { get, set, clear, clearPattern, getStats };
