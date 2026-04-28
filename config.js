/**
 * config.js
 * ═══════════════════════════════════════════════════════════════════════════
 * File cấu hình TRUNG TÂM — thêm ví và tùy chỉnh mạng tại đây.
 *
 * HƯỚNG DẪN THÊM VÍ:
 *   1. Copy 1 block ví mẫu bên dưới
 *   2. Bỏ comment (//) ở 4 dòng { label, address, chain, tags }
 *   3. Điền thông tin ví của bạn
 *   4. Lưu file, bot sẽ tự reload (nếu dùng nodemon)
 *
 * CHAIN HỖ TRỢ:
 *   ┌──────────────┬────────────┬──────────────────────────────────────────┐
 *   │ chain        │ Mạng       │ Ghi chú                                  │
 *   ├──────────────┼────────────┼──────────────────────────────────────────┤
 *   │ "ethereum"   │ Ethereum   │ EVM, cần MORALIS_API_KEY                 │
 *   │ "bsc"        │ BNB Chain  │ EVM, cần MORALIS_API_KEY                 │
 *   │ "polygon"    │ Polygon    │ EVM, cần MORALIS_API_KEY                 │
 *   │ "arbitrum"   │ Arbitrum   │ EVM, cần MORALIS_API_KEY                 │
 *   │ "optimism"   │ Optimism   │ EVM, cần MORALIS_API_KEY                 │
 *   │ "base"       │ Base       │ EVM, cần MORALIS_API_KEY                 │
 *   │ "avalanche"  │ Avalanche  │ EVM, cần MORALIS_API_KEY                 │
 *   │ "solana"     │ Solana     │ WebSocket realtime, cần HELIUS_API_KEY   │
 *   └──────────────┴────────────┴──────────────────────────────────────────┘
 *
 * TRƯỜNG tags (tùy chọn):
 *   Gắn nhãn phân loại ví, ví dụ: ["whale", "cex"], ["fund"], ["kol"]
 *   Hiển thị trong thông báo Telegram để dễ phân biệt.
 * ═══════════════════════════════════════════════════════════════════════════
 */

module.exports = {

  // ══════════════════════════════════════════════════════════════════════════
  // DANH SÁCH VÍ THEO DÕI
  // ══════════════════════════════════════════════════════════════════════════
  wallets: [

    // ── ETHEREUM ─────────────────────────────────────────────────────────────
    // === EXCHANGES ===
    {
      label:   "Binance Hot Wallet 1",
      address: "0xf977814e90da44bfa03339d0edf48f3c4d2f3f6f",
      chain:   "ethereum",
      tags:    ["exchange", "binance"],
    },
    {
      label:   "Binance Hot Wallet 2",
      address: "0x8894e0a0c962cb60db3f35ef5a539c50d3c51423",
      chain:   "ethereum",
      tags:    ["exchange", "binance"],
    },
    {
      label:   "Coinbase Custody",
      address: "0x71c7656ec7ab88b098defb751b7401b5f6d8976f",
      chain:   "ethereum",
      tags:    ["exchange", "coinbase"],
    },
    {
      label:   "OKX Hot Wallet",
      address: "0x6db43d8009d91e38b2d8d359239e146811292d21c",
      chain:   "ethereum",
      tags:    ["exchange", "okx"],
    },
    {
      label:   "Bybit Hot",
      address: "0x3b91e7a18a33e8ad98a8dadc1bce4fdcbe0c7ef8",
      chain:   "ethereum",
      tags:    ["exchange", "bybit"],
    },

    // === VENTURE CAPITAL / FUNDS ===
    {
      label:   "a16z Crypto",
      address: "0x4aBfDC6f4eb47e92ba1b5B3F3fC21E88f44e80Ec",
      chain:   "ethereum",
      tags:    ["fund", "vc", "a16z"],
    },
    {
      label:   "Paradigm Fund",
      address: "0x5f0c328e66c28d5b3f90797ba1ef74ae84849b92",
      chain:   "ethereum",
      tags:    ["fund", "paradigm"],
    },
    {
      label:   "Pantera Capital",
      address: "0xe674eb2acaaaa6d42c5c4bd14d4aca381a4f8d8d",
      chain:   "ethereum",
      tags:    ["fund", "pantera"],
    },
    {
      label:   "Multicoin Capital",
      address: "0x0eb5B86991c2a1243c2873735e28e9cf0CbEEbD3",
      chain:   "ethereum",
      tags:    ["fund", "multicoin"],
    },
    {
      label:   "Three Arrows Capital",
      address: "0x6be0ae71e6522dac1b36831487216d4350177d86",
      chain:   "ethereum",
      tags:    ["fund", "3ac"],
    },

    // === TRADING & MARKET MAKERS ===
    {
      label:   "Jump Trading",
      address: "0x1c0aa8ccd568d90d61659f060d1bfb5cd51bcc29",
      chain:   "ethereum",
      tags:    ["trading", "jump"],
    },
    {
      label:   "Wintermute",
      address: "0x2f0b23f53734252e6b82563ad7b406f51d1a9b4d",
      chain:   "ethereum",
      tags:    ["market-maker", "wintermute"],
    },
    {
      label:   "Alameda Research",
      address: "0x3bae4d3e2bbf58d5c4bfc8d9573db06368f39486",
      chain:   "ethereum",
      tags:    ["trading", "alameda"],
    },
    {
      label:   "DWF Labs",
      address: "0xb5d00b5e326fbe0a5fc386c9e8c1a06cf4f9a9f5",
      chain:   "ethereum",
      tags:    ["fund", "dwf"],
    },
    {
      label:   "GSR Markets",
      address: "0x79194d213167c7434e91fd08be3a27be1b9c8e00",
      chain:   "ethereum",
      tags:    ["market-maker", "gsr"],
    },
    {
      label:   "Cumberland DRW",
      address: "0x2c66999125a94b5b2dcb2d1a2b8e3f5f3e2d1c0b",
      chain:   "ethereum",
      tags:    ["market-maker", "cumberland"],
    },

    // ── BSC (BNB CHAIN) ───────────────────────────────────────────────────────
    {
      label:   "Binance BSC",
      address: "0x47ac0Fb4F2D84898b4Ef3592596cf3d64663c997",
      chain:   "bsc",
      tags:    ["exchange", "binance"],
    },
    {
      label:   "OKX BSC",
      address: "0x0a7e2b0d8c5e3f1b9a7d2e4f6c8b1a9e7d5c3b1a",
      chain:   "bsc",
      tags:    ["exchange", "okx"],
    },
    {
      label:   "Bybit BSC",
      address: "0x1c0aa8ccd568d90d61659f060d1bfb5cd51bcc29",
      chain:   "bsc",
      tags:    ["exchange", "bybit"],
    },

    // ── SOLANA ────────────────────────────────────────────────────────────────
    {
      label:   "Binance Solana",
      address: "GUrdSGsISXor7ZqkzauecKHMGnpSXjnKguPakc1FCiks",
      chain:   "solana",
      tags:    ["exchange", "binance"],
    },
    {
      label:   "Coinbase Solana",
      address: "ydXkhwcrtMpxkecc5K92co2gWXoKUytKwAP5W2awrC",
      chain:   "solana",
      tags:    ["exchange", "coinbase"],
    },
    {
      label:   "OKX Solana",
      address: "BVNo8ftg2eh64rCmm4saRd7avwrKaiJ85zv16NK7qWc",
      chain:   "solana",
      tags:    ["exchange", "okx"],
    },
    {
      label:   "Jump Trading Solana",
      address: "JUP6LkbZbjS1jKKwapdHNXUQRY1Xw5By6g1muKAVNKt",
      chain:   "solana",
      tags:    ["trading", "jump"],
    },

  ],

  // ══════════════════════════════════════════════════════════════════════════
  // CẤU HÌNH MẠNG (tự động dùng bởi monitors)
  // Thay đổi nếu muốn dùng RPC endpoint riêng
  // ══════════════════════════════════════════════════════════════════════════
  networks: {
    ethereum: {
      name:        "Ethereum",
      chainHex:    "0x1",
      explorerTx:  "https://etherscan.io/tx/",
      explorerAddr:"https://etherscan.io/address/",
      emoji:       "🔷",
    },
    bsc: {
      name:        "BSC",
      chainHex:    "0x38",
      explorerTx:  "https://bscscan.com/tx/",
      explorerAddr:"https://bscscan.com/address/",
      emoji:       "🟡",
    },
    polygon: {
      name:        "Polygon",
      chainHex:    "0x89",
      explorerTx:  "https://polygonscan.com/tx/",
      explorerAddr:"https://polygonscan.com/address/",
      emoji:       "🟣",
    },
    arbitrum: {
      name:        "Arbitrum",
      chainHex:    "0xa4b1",
      explorerTx:  "https://arbiscan.io/tx/",
      explorerAddr:"https://arbiscan.io/address/",
      emoji:       "🔵",
    },
    optimism: {
      name:        "Optimism",
      chainHex:    "0xa",
      explorerTx:  "https://optimistic.etherscan.io/tx/",
      explorerAddr:"https://optimistic.etherscan.io/address/",
      emoji:       "🔴",
    },
    base: {
      name:        "Base",
      chainHex:    "0x2105",
      explorerTx:  "https://basescan.org/tx/",
      explorerAddr:"https://basescan.org/address/",
      emoji:       "🟦",
    },
    avalanche: {
      name:        "Avalanche",
      chainHex:    "0xa86a",
      explorerTx:  "https://snowtrace.io/tx/",
      explorerAddr:"https://snowtrace.io/address/",
      emoji:       "🔺",
    },
    solana: {
      name:        "Solana",
      explorerTx:  "https://solscan.io/tx/",
      explorerAddr:"https://solscan.io/account/",
      emoji:       "◎",
    },
  },
};
