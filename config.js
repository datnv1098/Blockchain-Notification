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
    {
      label:   "ETH Whale 1",            // Tên hiển thị trong Telegram
      address: "0x1234567890123456789012345678901234567890",  // Test address
      chain:   "ethereum",
      tags:    ["whale"],
    },
    // {
    //   label:   "ETH Fund 1",
    //   address: "0x...",
    //   chain:   "ethereum",
    //   tags:    ["fund"],
    // },

    // ── BSC (BNB CHAIN) ───────────────────────────────────────────────────────
    {
      label:   "BSC Whale 1",
      address: "0x0000000000000000000000000000000000000001",  // Test address
      chain:   "bsc",
      tags:    ["whale"],
    },
    // {
    //   label:   "BSC Smart Money 1",
    //   address: "0x...",
    //   chain:   "bsc",
    //   tags:    ["smart-money"],
    // },

    // ── POLYGON ───────────────────────────────────────────────────────────────
    // {
    //   label:   "Polygon Whale 1",
    //   address: "0x...",
    //   chain:   "polygon",
    //   tags:    ["whale"],
    // },

    // ── ARBITRUM ──────────────────────────────────────────────────────────────
    // {
    //   label:   "Arbitrum Fund 1",
    //   address: "0x...",
    //   chain:   "arbitrum",
    //   tags:    ["fund"],
    // },

    // ── OPTIMISM ──────────────────────────────────────────────────────────────
    // {
    //   label:   "Optimism Whale 1",
    //   address: "0x...",
    //   chain:   "optimism",
    //   tags:    ["whale"],
    // },

    // ── BASE ──────────────────────────────────────────────────────────────────
    // {
    //   label:   "Base KOL 1",
    //   address: "0x...",
    //   chain:   "base",
    //   tags:    ["kol"],
    // },

    // ── AVALANCHE ─────────────────────────────────────────────────────────────
    // {
    //   label:   "Avalanche Whale 1",
    //   address: "0x...",                  // Địa chỉ C-Chain (0x...)
    //   chain:   "avalanche",
    //   tags:    ["whale"],
    // },

    // ── SOLANA ────────────────────────────────────────────────────────────────
    {
      label:   "SOL Whale 1",
      address: "11111111111111111111111111111111",  // Test Solana address
      chain:   "solana",
      tags:    ["whale"],
    },
    // {
    //   label:   "SOL Smart Money 1",
    //   address: "...",
    //   chain:   "solana",
    //   tags:    ["smart-money"],
    // },

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
