/**
 * check-keys.js
 * ---
 * Kiểm tra từng Moralis API key để xác định cái nào hết quota
 */

require("dotenv").config();
const Moralis = require("moralis").default;

async function checkKey(keyNumber, keyValue) {
  if (!keyValue) {
    console.log(`❌ Key #${keyNumber}: KHÔNG CÓ (trống)`);
    return null;
  }

  try {
    console.log(`\n⏳ Kiểm tra Key #${keyNumber}...`);
    
    // Khởi tạo với key này
    await Moralis.start({ apiKey: keyValue });
    
    // Test API call
    const response = await Moralis.EvmApi.token.getTokenPrice({
      address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC
      chain: "0x1", // Ethereum
    });

    console.log(`✅ Key #${keyNumber}: CÓ HIỆU LỰC ✨`);
    console.log(`   Giá USDC: $${response?.raw?.usdPrice || "N/A"}`);
    return { number: keyNumber, status: "valid", price: response?.raw?.usdPrice };

  } catch (err) {
    const status = err?.response?.status || err?.status;
    const message = err?.message || "";
    
    if (status === 401 && message.includes("plan")) {
      console.log(`⚠️  Key #${keyNumber}: HẾT QUOTA`);
      console.log(`   Lỗi: ${message}`);
      return { number: keyNumber, status: "quota_exceeded" };
    } else if (status === 401 || status === 403) {
      console.log(`❌ Key #${keyNumber}: KHÔNG HỢP LỆ`);
      console.log(`   Lỗi: ${message}`);
      return { number: keyNumber, status: "invalid" };
    } else {
      console.log(`⚠️  Key #${keyNumber}: LỖI`);
      console.log(`   Status: ${status} | Lỗi: ${message}`);
      return { number: keyNumber, status: "error", error: message };
    }
  }
}

async function main() {
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║    KIỂM TRA MORALIS API KEYS                         ║");
  console.log("╚══════════════════════════════════════════════════════╝");

  const keys = [
    { num: 1, value: process.env.MORALIS_API_KEY_1 },
    { num: 2, value: process.env.MORALIS_API_KEY_2 },
    { num: 3, value: process.env.MORALIS_API_KEY_3 },
    { num: 4, value: process.env.MORALIS_API_KEY_4 },
    { num: 5, value: process.env.MORALIS_API_KEY_5 },
  ];

  const results = [];
  
  for (const key of keys) {
    const result = await checkKey(key.num, key.value);
    if (result) results.push(result);
    // Delay giữa các lần test để tránh rate limit
    await new Promise(r => setTimeout(r, 1000));
  }

  // Tóm tắt
  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log("║    KẾT QUẢ KIỂM TRA                                  ║");
  console.log("╚══════════════════════════════════════════════════════╝");

  const validKeys = results.filter(r => r.status === "valid");
  const quotaKeys = results.filter(r => r.status === "quota_exceeded");
  const invalidKeys = results.filter(r => r.status === "invalid");

  if (validKeys.length > 0) {
    console.log("\n✅ KEYS HOẠT ĐỘNG TỐT:");
    validKeys.forEach(k => console.log(`   Key #${k.number}`));
  }

  if (quotaKeys.length > 0) {
    console.log("\n⚠️  KEYS HẾT QUOTA (cần tạo mới):");
    quotaKeys.forEach(k => console.log(`   Key #${k.number} ← CẦN THAY THẾ`));
  }

  if (invalidKeys.length > 0) {
    console.log("\n❌ KEYS KHÔNG HỢP LỆ:");
    invalidKeys.forEach(k => console.log(`   Key #${k.number} ← CẦN THAY THẾ`));
  }

  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log("║    HÀNH ĐỘNG TIẾP THEO                               ║");
  console.log("╚══════════════════════════════════════════════════════╝");
  
  if (validKeys.length >= 2) {
    console.log("\n✅ Bạn có đủ keys hoạt động. Bot có thể chạy bình thường.");
  } else if (validKeys.length === 1) {
    console.log("\n⚠️  Chỉ còn 1 key hoạt động. Khuyến nghị:");
    console.log("   - Tạo keys mới để có backup");
    console.log("   - Tài khoản: https://admin.moralis.io");
  } else {
    console.log("\n❌ Không có key nào hoạt động!");
    console.log("   - Tạo 3 keys mới tại: https://admin.moralis.io");
    console.log("   - Cập nhật .env với keys mới");
  }

  process.exit(0);
}

main().catch(console.error);
