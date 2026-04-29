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
      label:   "Binance Hot Wallet (0x889)",
      address: "0x8894E0a0c962CB723c1976a4421c95949bE2D4E3",
      chain:   "ethereum",
      tags:    ["exchange", "binance"],
    },

    {
      label:   "Coinbase Hot Wallet (0x503)",
      address: "0x503828976D22510aad0201ac7EC88293211D23Da",
      chain:   "ethereum",
      tags:    ["exchange", "coinbase"],
    },

    {
      label:   "OKX Hot Wallet (0x504)",
      address: "0x5041ed759Dd4aFc3a72b8192C143F72f4724081A",
      chain:   "ethereum",
      tags:    ["exchange", "okx"],
    },

    {
      label:   "Bybit Hot Wallet (0xf89)",
      address: "0xf89d7b9c864f589bbF53a82105107622B35EaA40",
      chain:   "ethereum",
      tags:    ["exchange", "bybit"],
    },


    // === VENTURE CAPITAL / FUNDS ===

    {
      label:   "a16z Crypto (0x05E)",
      address: "0x05E793cE0C6027323Ac150F6d45C2344d28B6019",
      chain:   "ethereum",
      tags:    ["fund", "vc", "a16z"],
    },

    {
      label:   "Paradigm Capital (0x115)",
      address: "0x11577a8A5bAF1e25B9a2d89f39670F447d75c3cD",
      chain:   "ethereum",
      tags:    ["fund", "paradigm"],
    },

    {
      label:   "Pantera Capital (0xe52)",
      address: "0xe523Fc253BcdEA8373E030ee66e00c6864776d70",
      chain:   "ethereum",
      tags:    ["fund", "pantera"],
    },

    {
      label:   "Multicoin Capital (0x475)",
      address: "0x475ea9EA47F13A1D1f144f0A36501f822A0f7648",
      chain:   "ethereum",
      tags:    ["fund", "multicoin"],
    },

    {
      label:   "Three Arrows Capital (0x486)",
      address: "0x4862733B5FdDFd35f35ea8CCf08F5045e57388B3",
      chain:   "ethereum",
      tags:    ["fund", "3ac"],
    },


    // === TRADING & MARKET MAKERS ===

    {
      label:   "Jump Crypto (0xf58)",
      address: "0xf584F8728B874a6a5c7A8d4d387C9aae9172D621",
      chain:   "ethereum",
      tags:    ["trading", "jump"],
    },

    {
      label:   "Wintermute (0x768)",
      address: "0x76801132a22801640284Cd67F7DD41fED2926B6a",
      chain:   "ethereum",
      tags:    ["market-maker", "wintermute"],
    },

    {
      label:   "Wintermute: Market Maker (0x51C)",
      address: "0x51C72848c68a965f66FA7a88855F9f7784502a7F",
      chain:   "ethereum",
      tags:    ["market-maker", "wintermute"],
    },

    {
      label:   "Alameda Research (0x84D)",
      address: "0x84D34f4f83a87596Cd3FB6887cFf8F17Bf5A7B83",
      chain:   "ethereum",
      tags:    ["trading", "alameda"],
    },

    {
      label:   "DWF Labs (0x53c)",
      address: "0x53c902A9EF069F3b85e5e71f918C4D582F3063Fa",
      chain:   "ethereum",
      tags:    ["fund", "dwf"],
    },

    {
      label:   "GSR Markets (0xe92)",
      address: "0xe92e65049b3c2ca12806E9567B08895118c5a03f",
      chain:   "ethereum",
      tags:    ["market-maker", "gsr"],
    },

    {
      label:   "Cumberland DRW (0xad6)",
      address: "0xad6eaa735D9dF3D7696fd03984379dAE02eD8862",
      chain:   "ethereum",
      tags:    ["market-maker", "cumberland"],
    },


    // === INDIVIDUAL / KEY OPINION LEADERS ===

    {
      label:   "Vitalik Buterin (vitalik.eth)",
      address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
      chain:   "ethereum",
      tags:    ["individual", "vitalik", "ethereum-founder"],
    },

    {
      label:   "Vitalik Buterin (0xAb5)",
      address: "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B",
      chain:   "ethereum",
      tags:    ["individual", "vitalik"],
    },

    {
      label:   "Vitalik Buterin (0x1Db)",
      address: "0x1Db3439a222C519ab44bb1144fC28167b4Fa6EE6",
      chain:   "ethereum",
      tags:    ["individual", "vitalik"],
    },

    {
      label:   "Vitalik Buterin (0x9D2)",
      address: "0x9D22816f6611cFcB0cDE5076C5f4e4A269E79Bef",
      chain:   "ethereum",
      tags:    ["individual", "vitalik"],
    },

    {
      label:   "Changpeng Zhao (CZ Binance)",
      address: "0x28816c4C4792467390C90e5B426F198570E29307",
      chain:   "ethereum",
      tags:    ["individual", "cz", "binance-founder"],
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
