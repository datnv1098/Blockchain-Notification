# Blockchain Notification Bot

Hệ thống theo dõi ví blockchain đa chuỗi và gửi thông báo Telegram khi có token/coin mới được gửi vào với giá trị ≥ $500,000 USD.

## Tính năng

- **Đa chuỗi**: Ethereum, BSC (BNB Chain), Solana
- **Lọc trùng lặp**: Mỗi token chỉ thông báo 1 lần cho mỗi ví (không thông báo lại lần 2)
- **Ngưỡng tùy chỉnh**: Mặc định $500,000 USD, có thể thay đổi qua `.env`
- **Thông báo Telegram**: Gửi ngay lập tức với đầy đủ thông tin giao dịch

## Cấu trúc dự án

```
├── index.js               # Điểm khởi chạy chính
├── config.js              # Danh sách ví cần theo dõi
├── monitors/
│   ├── evm.js             # Monitor Ethereum + BSC (Moralis)
│   └── solana.js          # Monitor Solana (Helius)
├── services/
│   ├── telegram.js        # Gửi thông báo Telegram
│   ├── price.js           # Lấy giá token USD
│   └── storage.js         # Lưu trữ token đã thông báo
├── data/
│   └── notified.json      # Auto-tạo, lưu token đã alert
├── .env                   # API keys (không commit)
└── .env.example           # Mẫu cấu hình
```

## Cài đặt

### 1. Cài dependencies

```bash
npm install
```

### 2. Cấu hình môi trường

```bash
cp .env.example .env
```

Điền vào `.env`:

| Biến | Mô tả | Lấy ở đâu |
|------|-------|-----------|
| `MORALIS_API_KEY` | API key Moralis cho EVM | [admin.moralis.io](https://admin.moralis.io) |
| `HELIUS_API_KEY` | API key Helius cho Solana | [dev.helius.xyz](https://dev.helius.xyz) |
| `TELEGRAM_BOT_TOKEN` | Token bot Telegram | Chat với @BotFather |
| `TELEGRAM_CHAT_ID` | ID nhóm/kênh nhận thông báo | Xem hướng dẫn bên dưới |

#### Lấy Telegram Chat ID

1. Chat với bot của bạn (gửi bất kỳ tin nhắn nào)
2. Truy cập: `https://api.telegram.org/bot<TOKEN>/getUpdates`
3. Tìm `"chat": {"id": 123456789}` và copy số đó

### 3. Thêm ví cần theo dõi

Chỉnh sửa file `config.js`:

```js
module.exports = {
  wallets: [
    {
      label: "Whale Wallet 1",          // Tên gợi nhớ
      address: "0xABC...123",           // Địa chỉ ví
      chain: "ethereum",                // ethereum | bsc | solana
    },
    {
      label: "Solana Whale",
      address: "5oNDLjTFM...",
      chain: "solana",
    }
  ]
}
```

### 4. Chạy bot

```bash
npm start
```

Hoặc chế độ dev (tự reload khi sửa code):

```bash
npm run dev
```

## Ví dụ thông báo Telegram

```
🚨 LARGE INFLOW DETECTED

🔗 Chain: Ethereum
👛 Wallet: Whale Wallet 1 (0xABC...123)
🪙 Token: USDC (0xa0b8...3606)
📥 Amount: 520,000.00 USDC
💵 USD Value: $520,000.00
🔗 Tx Hash: 0xdef...789
⏰ Time: 2026-04-29 14:30:00 UTC
```

## Lưu ý

- Hệ thống kiểm tra giao dịch mới mỗi **2 phút** (có thể thay đổi qua `POLL_INTERVAL_MS`)
- Token đã thông báo được lưu tại `data/notified.json` — **KHÔNG xóa file này** nếu không muốn nhận thông báo trùng
- Để reset lại danh sách đã thông báo, xóa nội dung trong `data/notified.json` và thay bằng `{}`
