/**
 * services/tokenExtractor.js
 * ---
 * Trích xuất thông tin token từ transactions một cách nhanh nhất.
 * Tập trung vào transaction data thay vì nhiều API calls.
 * 
 * Cache token metadata để tránh lặp lại queries cùng một token.
 */

const { get: cacheGet, set: cacheSet } = require("./cache");
const { getTokenPriceUSD } = require("./price");
const Moralis = require("moralis").default;
const { moralisCall } = require("./moralisRotator");

/**
 * Trích xuất token info từ một transfer transaction
 * Tối ưu: lấy từ transaction object trước, API call sau.
 * 
 * @param {object} transfer - transfer object từ Moralis API
 * @param {string} chain - "ethereum" | "bsc" | ...
 * @returns {object} token info {address, symbol, decimals, name}
 */
function extractTokenFromTransfer(transfer) {
  if (!transfer) return null;

  return {
    address: transfer.token_address || null,
    symbol: transfer.token_symbol || "UNKNOWN",
    decimals: transfer.token_decimals ? Number(transfer.token_decimals) : 18,
    name: transfer.token_name || transfer.token_symbol || "Unknown Token",
    fromAddress: transfer.from_address || null,
    toAddress: transfer.to_address || null,
    amount: transfer.value || "0",
    txHash: transfer.transaction_hash || null,
    timestamp: transfer.block_timestamp || new Date().toISOString(),
  };
}

/**
 * Lấy token metadata từ blockchain (cached 24h)
 * @param {string} tokenAddress
 * @param {string} chain
 * @returns {object} {name, symbol, decimals, totalSupply}
 */
async function getTokenMetadata(tokenAddress, chain) {
  if (!tokenAddress || typeof tokenAddress !== "string") return null;
  const cacheKey = `metadata:${chain}:${tokenAddress.toLowerCase()}`;
  
  // Check cache first
  const cached = cacheGet(cacheKey);
  if (cached !== null) {
    return cached;
  }

  try {
    const response = await moralisCall(() =>
      Moralis.EvmApi.token.getTokenMetadata({
        address: tokenAddress,
        chain: chain,
      })
    );

    const metadata = {
      name: response?.raw?.name || "Unknown",
      symbol: response?.raw?.symbol || "???",
      decimals: response?.raw?.decimals || 18,
      totalSupply: response?.raw?.totalSupply || null,
      logo: response?.raw?.logo || null,
    };

    // Cache for 24 hours
    cacheSet(cacheKey, metadata, 24 * 60 * 60 * 1000);
    return metadata;
  } catch (err) {
    console.error(`[TOKEN] Không lấy metadata cho ${tokenAddress}:`, err.message);
    return null;
  }
}

/**
 * Phân tích token từ transfer + lấy giá nhanh
 * Tối ưu cho speed: transaction data first, metadata second.
 * 
 * @param {object} transfer - transfer object
 * @param {string} chain - "ethereum" | "bsc" | ...
 * @returns {object} {token: {...}, price, value_usd, quick: true/false}
 */
async function analyzeTokenFromTransfer(transfer, chain) {
  const tokenInfo = extractTokenFromTransfer(transfer);
  if (!tokenInfo) return null;

  // Lấy giá nhanh từ cache (1 hour TTL)
  const price = await getTokenPriceUSD(tokenInfo.address, chain);

  // Tính value USD
  let valueUSD = 0;
  if (price && transfer.value) {
    const decimals = Number(transfer.token_decimals || 18);
    const amount = Number(BigInt(transfer.value || "0")) / Math.pow(10, decimals);
    valueUSD = amount * price;
  }

  return {
    token: tokenInfo,
    price,
    value_usd: valueUSD,
    quick: true, // Indicates data extracted from transaction, not full metadata lookup
  };
}

/**
 * Batch analyze multiple transfers
 * Tối ưu: parallel processing, shared cache
 * 
 * @param {array} transfers - array of transfer objects
 * @param {string} chain
 * @param {number} limit - max transfers to process (for speed)
 * @returns {array} analyzed token data
 */
async function analyzeTransfersBatch(transfers, chain, limit = 50) {
  if (!transfers || transfers.length === 0) return [];

  // Limit to most recent for speed
  const toProcess = transfers.slice(0, Math.min(limit, transfers.length));

  const results = await Promise.allSettled(
    toProcess.map((transfer) => analyzeTokenFromTransfer(transfer, chain))
  );

  return results
    .map((r) => (r.status === "fulfilled" ? r.value : null))
    .filter((r) => r !== null);
}

/**
 * Get thông tin token nhanh: từ cache hoặc transaction
 * Không đợi metadata API, trả về immediately với data sẵn có.
 * 
 * @param {string} tokenAddress
 * @param {string} chain
 * @param {number} price - optional, price already known
 * @returns {object} quick token info
 */
function getQuickTokenInfo(tokenAddress, chain, price = null) {
  const cacheKey = `metadata:${chain}:${tokenAddress.toLowerCase()}`;
  const cached = cacheGet(cacheKey);

  if (cached) {
    return {
      ...cached,
      price,
      source: "cache",
    };
  }

  // Return minimal info immediately
  return {
    address: tokenAddress,
    symbol: "???",
    decimals: 18,
    name: "Unknown Token",
    price,
    source: "minimal",
  };
}

/**
 * Tóm tắt transfers cho quick display
 * Dùng cho logging/alerts - show info nhanh nhất
 * 
 * @param {array} transfers - transfer objects
 * @param {string} chain
 * @returns {array} summary [{tokenSymbol, amount, value_usd, txHash}]
 */
function summarizeTransfers(transfers, chain) {
  if (!transfers || transfers.length === 0) return [];

  return transfers.slice(0, 10).map((tx) => ({
    symbol: tx.token_symbol || "???",
    address: tx.token_address || "UNKNOWN",
    amount: tx.value || "0",
    decimals: tx.token_decimals || 18,
    txHash: tx.transaction_hash?.slice(0, 10) + "..." || "???",
    timestamp: tx.block_timestamp || new Date().toISOString(),
  }));
}

module.exports = {
  extractTokenFromTransfer,
  getTokenMetadata,
  analyzeTokenFromTransfer,
  analyzeTransfersBatch,
  getQuickTokenInfo,
  summarizeTransfers,
};
