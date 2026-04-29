/**
 * services/price.js
 * ---
 * Lấy giá token theo USD từ nhiều nguồn:
 *   1. Moralis Token Price API (EVM)
 *   2. Jupiter Price API (Solana)
 *   3. CoinGecko (fallback cho cả hai)
 */

require("dotenv").config();
const axios = require("axios");
const Moralis = require("moralis").default;
const { moralisCall } = require("./moralisRotator");
const { get: cacheGet, set: cacheSet } = require("./cache");

// Mapping chain name -> Moralis chain hex
const CHAIN_HEX = {
  ethereum: "0x1",
  bsc: "0x38",
};

/**
 * Lấy giá token EVM (Ethereum / BSC) qua Moralis
 * @param {string} tokenAddress
 * @param {string} chain - "ethereum" | "bsc"
 * @returns {number|null} giá USD mỗi token
 */
async function getEvmTokenPrice(tokenAddress, chain) {
  const chainHex = CHAIN_HEX[chain];
  if (!chainHex) return null;
  try {
    const response = await moralisCall(() =>
      Moralis.EvmApi.token.getTokenPrice({
        address: tokenAddress,
        chain: chainHex,
      })
    );
    return response?.raw?.usdPrice ?? null;
  } catch {
    return null;
  }
}

/**
 * Lấy giá token Solana qua Jupiter Aggregator Price API
 * @param {string} mintAddress - Địa chỉ mint của token
 * @returns {number|null}
 */
async function getSolanaTokenPrice(mintAddress) {
  try {
    const url = `https://price.jup.ag/v6/price?ids=${mintAddress}`;
    const { data } = await axios.get(url, { timeout: 10000 });
    return data?.data?.[mintAddress]?.price ?? null;
  } catch {
    return null;
  }
}

/**
 * Fallback: CoinGecko token price theo contract address
 * @param {string} tokenAddress
 * @param {string} chain - "ethereum" | "bsc" | "solana"
 * @returns {number|null}
 */
async function getCoinGeckoPrice(tokenAddress, chain) {
  try {
    // CoinGecko platform IDs
    const platformMap = {
      ethereum: "ethereum",
      bsc: "binance-smart-chain",
      solana: "solana",
      polygon: "polygon-pos",
      arbitrum: "arbitrum-one",
      optimism: "optimistic-ethereum",
      base: "base",
      avalanche: "avalanche",
    };
    const platform = platformMap[chain];
    if (!platform) return null;

    const headers = {};
    if (process.env.COINGECKO_API_KEY) {
      headers["x-cg-pro-api-key"] = process.env.COINGECKO_API_KEY;
    }

    const url = `https://api.coingecko.com/api/v3/simple/token_price/${platform}`;
    const { data } = await axios.get(url, {
      params: {
        contract_addresses: tokenAddress.toLowerCase(),
        vs_currencies: "usd",
      },
      headers,
      timeout: 10000,
    });

    const priceData = data?.[tokenAddress.toLowerCase()];
    return priceData?.usd ?? null;
  } catch {
    return null;
  }
}

/**
 * Lấy giá USD của token — thử theo thứ tự ưu tiên, fallback nếu thất bại
 * Kết quả được cache trong 1 tiếng để tránh lặp lại API calls.
 * Ưu tiên tốc độ: cache hit nhanh, fallback sang CoinGecko nếu Moralis fail.
 *
 * @param {string} tokenAddress
 * @param {string} chain - "ethereum" | "bsc" | "solana"
 * @returns {number|null}
 */
async function getTokenPriceUSD(tokenAddress, chain) {
  // Cache key: "price:chain:tokenAddress"
  const cacheKey = `price:${chain}:${tokenAddress.toLowerCase()}`;
  
  // Kiểm tra cache trước
  const cached = cacheGet(cacheKey);
  if (cached !== null) {
    return cached;
  }

  let price = null;

  if (chain === "solana") {
    price = await getSolanaTokenPrice(tokenAddress);
    if (price == null) {
      price = await getCoinGeckoPrice(tokenAddress, chain);
    }
  } else {
    // EVM: Moralis first, then CoinGecko
    price = await getEvmTokenPrice(tokenAddress, chain);
    if (price == null) {
      price = await getCoinGeckoPrice(tokenAddress, chain);
    }
  }

  // Cache result (1 tiếng TTL - giảm API calls tối đa)
  if (price != null) {
    cacheSet(cacheKey, price, 60 * 60 * 1000);
  }

  return price;
}

module.exports = { getTokenPriceUSD };
