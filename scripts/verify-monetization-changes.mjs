import fs from 'fs';

console.log('======================================================================');
console.log('  KIỂM TRA CÁC ĐẶC TẢ THU TIỀN & QUY ĐỔI XU (1 XU = 1.000Đ) TRỌ XINH');
console.log('======================================================================');

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName) {
  totalTests++;
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}`);
  }
}

// 1. Kiểm tra k23Subscriptions.ts
const k23SubContent = fs.readFileSync('src/lib/api/k23Subscriptions.ts', 'utf8');
assert(k23SubContent.includes("name: 'Dùng Thử K23'"), 'Gói Dùng Thử K23 có trong k23Subscriptions.ts');
assert(k23SubContent.includes("name: 'Quản Lý Cơ Bản'"), 'Gói Quản Lý Cơ Bản có trong k23Subscriptions.ts');
assert(k23SubContent.includes("name: 'Quản Lý Nâng Cao'"), 'Gói Quản Lý Nâng Cao có trong k23Subscriptions.ts');
assert(k23SubContent.includes("price_monthly: 199000"), 'Gói Quản Lý Cơ Bản có giá tháng 199.000đ');
assert(k23SubContent.includes("price_quarterly: 537300"), 'Gói Quản Lý Cơ Bản có giá quý 537.300đ (-10%)');
assert(k23SubContent.includes("price_yearly: 1910400"), 'Gói Quản Lý Cơ Bản có giá năm 1.910.400đ (-20%)');
assert(k23SubContent.includes("price_monthly: 399000"), 'Gói Quản Lý Nâng Cao có giá tháng 399.000đ');
assert(k23SubContent.includes("price_quarterly: 1077300"), 'Gói Quản Lý Nâng Cao có giá quý 1.077.300đ (-10%)');
assert(k23SubContent.includes("price_yearly: 3830400"), 'Gói Quản Lý Nâng Cao có giá năm 3.830.400đ (-20%)');

// 2. Kiểm tra k23.ts
const k23TypesContent = fs.readFileSync('src/types/k23.ts', 'utf8');
assert(k23TypesContent.includes("'quarterly'"), 'K23BillingCycle có hỗ trợ chu kỳ quarterly');
assert(k23TypesContent.includes("price_quarterly?: number"), 'K23Plan có thuộc tính price_quarterly');

// 3. Kiểm tra CheckoutPage.tsx (Kho Voucher và format Xu)
const checkoutContent = fs.readFileSync('src/pages/CheckoutPage.tsx', 'utf8');
assert(checkoutContent.includes('AVAILABLE_VOUCHERS'), 'CheckoutPage có khai báo AVAILABLE_VOUCHERS');
assert(checkoutContent.includes('Kho Voucher của bạn'), 'CheckoutPage có nút mở Kho Voucher');
assert(checkoutContent.includes('isVoucherModalOpen'), 'CheckoutPage có modal Kho Voucher');
assert(checkoutContent.includes('Math.round(totalAmount / 1000)'), 'CheckoutPage có quy đổi tổng tiền ra Xu');

// 4. Kiểm tra PricingPage.tsx
const pricingContent = fs.readFileSync('src/pages/PricingPage.tsx', 'utf8');
assert(pricingContent.includes('1 Xu = 1.000 VNĐ'), 'PricingPage có thông báo quy ước 1 Xu = 1.000đ');
assert(pricingContent.includes('950.400') || pricingContent.includes('950 Xu') || pricingContent.includes('yearlyTotalXu'), 'PricingPage hiển thị giá năm và Xu cho gói');

// 5. Kiểm tra OwnerBoostRoomPage.tsx
const boostContent = fs.readFileSync('src/pages/OwnerBoostRoomPage.tsx', 'utf8');
assert(boostContent.includes('29.000') || boostContent.includes('29000'), 'Có gói đẩy top 3 ngày 29.000đ');
assert(boostContent.includes('59.000') || boostContent.includes('59000'), 'Có gói đẩy top 7 ngày 59.000đ');
assert(boostContent.includes('199.000') || boostContent.includes('199000'), 'Có gói VIP toàn diện 30 ngày 199.000đ');
assert(boostContent.includes('wallet_xu'), 'Có hỗ trợ thanh toán bằng Ví Xu');

// 6. Kiểm tra OwnerK23PricingPage.tsx
const k23PricingContent = fs.readFileSync('src/pages/OwnerK23PricingPage.tsx', 'utf8');
assert(k23PricingContent.includes("setBillingCycle('quarterly')"), 'OwnerK23PricingPage có nút chọn chu kỳ Theo Quý');
assert(k23PricingContent.includes('isStarterTrial'), 'OwnerK23PricingPage xử lý gói dùng thử 2 tháng');

// 7. Kiểm tra OwnerK23CheckoutPage.tsx
const k23CheckoutContent = fs.readFileSync('src/pages/OwnerK23CheckoutPage.tsx', 'utf8');
assert(k23CheckoutContent.includes("paymentMethod === 'momo'"), 'OwnerK23CheckoutPage hỗ trợ ví MoMo');
assert(k23CheckoutContent.includes("paymentMethod === 'wallet_xu'"), 'OwnerK23CheckoutPage hỗ trợ Ví Xu');
assert(k23CheckoutContent.includes('generateInvoicePDF'), 'OwnerK23CheckoutPage có nút xuất biên lai PDF');
assert(k23CheckoutContent.includes('handleActivateTrial'), 'OwnerK23CheckoutPage có hàm kích hoạt miễn phí 2 tháng');

console.log('======================================================================');
console.log(`KẾT QUẢ: ${passedTests}/${totalTests} BÀI KIỂM TRA ĐẠT CHUẨN!`);
console.log('======================================================================');

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}

