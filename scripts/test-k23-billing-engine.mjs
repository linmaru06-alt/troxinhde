import assert from 'assert';

// 1. Module Tính tiền ngày lẻ (P0-05 / P1-09)
function calculateProratedRent(monthlyRent, startDateStr, endDateStr) {
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  const diffTime = end.getTime() - start.getTime();
  const actualStayDays = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1);

  const year = start.getFullYear();
  const month = start.getMonth() + 1;
  const totalDaysInMonth = new Date(year, month, 0).getDate();

  const rawProrated = Math.round((monthlyRent / totalDaysInMonth) * actualStayDays);
  const proratedRent = Math.round(rawProrated / 1000) * 1000;

  return { actualStayDays, totalDaysInMonth, proratedRent };
}

// 2. Module Bóc tách mã hóa đơn SePay (P1-06)
function extractInvoiceCodeFromContent(content) {
  if (!content) return null;
  const matchTroxinh = content.match(/TROXINH\s+([A-Za-z0-9_-]+)/i);
  if (matchTroxinh && matchTroxinh[1]) {
    return matchTroxinh[1].toUpperCase();
  }
  const matchHD = content.match(/(HD[A-Za-z0-9_-]+)/i);
  if (matchHD && matchHD[1]) {
    return matchHD[1].toUpperCase();
  }
  return null;
}

// 3. Module Khấu trừ cọc (P1-01)
function calculateMoveOutSettlement(depositHolding, deductions) {
  const totalDeductions = Object.values(deductions).reduce((sum, val) => sum + (val || 0), 0);
  const netRefundAmount = depositHolding - totalDeductions;
  return { totalDeductions, netRefundAmount };
}

console.log('======================================================================');
console.log('  BẮT ĐẦU CHẠY TEST SUITE LOGIC KẾ TOÁN VẬN HÀNH K23 PMS (P1-09)');
console.log('======================================================================\n');

// Test 1: Tính tiền ngày lẻ
console.log('Test 1: Kiểm tra tính tiền phòng ngày lẻ (Prorated Rent)');
const res1 = calculateProratedRent(3000000, '2026-11-12', '2026-11-30');
assert.strictEqual(res1.actualStayDays, 19, 'Số ngày ở từ 12/11 đến 30/11 phải là 19 ngày');
assert.strictEqual(res1.totalDaysInMonth, 30, 'Tháng 11 phải có 30 ngày');
assert.strictEqual(res1.proratedRent, 1900000, 'Tiền phòng 19 ngày của 3.000.000đ phải là 1.900.000đ');
console.log('  ✅ [PASS] Tính tiền ngày lẻ chính xác 100% (19 ngày = 1.900.000đ)\n');

// Test 2: Bóc tách mã SePay Webhook
console.log('Test 2: Kiểm tra bóc tách mã hóa đơn từ nội dung chuyển khoản ngân hàng');
const code1 = extractInvoiceCodeFromContent('MBVCB.123456.TROXINH HD202611302.CT TU LE THI THU MAI');
assert.strictEqual(code1, 'HD202611302', 'Phải bóc tách được HD202611302');

const code2 = extractInvoiceCodeFromContent('chuyen khoan tien phong hd-2026-p304');
assert.strictEqual(code2, 'HD-2026-P304', 'Phải bóc tách được HD-2026-P304');
console.log('  ✅ [PASS] Regex bóc tách mã chuyển khoản ngân hàng chính xác 100%\n');

// Test 3: Khấu trừ cọc khi trả phòng
console.log('Test 3: Kiểm tra công thức cấn trừ tiền cọc khi trả phòng');
const settlement1 = calculateMoveOutSettlement(4000000, {
  accumulatedDebt: 0,
  electricFee: 150000,
  waterFee: 50000,
  damageFee: 300000,
  cleaningFee: 150000,
});
assert.strictEqual(settlement1.totalDeductions, 650000, 'Tổng các khoản trừ phải là 650.000đ');
assert.strictEqual(settlement1.netRefundAmount, 3350000, 'Hoàn lại khách phải là 3.350.000đ');
console.log('  ✅ [PASS] Cấn trừ cọc hoàn tiền cho khách chuẩn xác (4.000.000 - 650.000 = 3.350.000đ)\n');

// Test 4: Khách làm hỏng đồ vượt cọc
console.log('Test 4: Kiểm tra trường hợp khách làm hỏng đồ vượt quá tiền cọc');
const settlement2 = calculateMoveOutSettlement(2000000, {
  accumulatedDebt: 1000000,
  damageFee: 1800000, // Làm hỏng tivi
});
assert.strictEqual(settlement2.netRefundAmount, -800000, 'Khách phải nộp thêm 800.000đ');
console.log('  ✅ [PASS] Cảnh báo âm cọc chuẩn xác (Khách phải bù thêm 800.000đ)\n');

console.log('======================================================================');
console.log('🎉 TẤT CẢ 4/4 BÀI TEST LOGIC TÀI CHÍNH K23 PMS ĐẠT CHUẨN 100%!');
console.log('======================================================================');

