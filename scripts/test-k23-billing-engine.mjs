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

// 4. Module Tính điện bậc thang lũy tiến (P2-02)
function calculateTieredElectricity(usageKwh, tiers) {
  if (usageKwh <= 0) return { totalCost: 0, breakdown: [] };
  const sortedTiers = [...tiers].sort((a, b) => a.from_kwh - b.from_kwh);
  const breakdown = [];
  let remainingUsage = usageKwh;
  let totalCost = 0;

  for (const tier of sortedTiers) {
    if (remainingUsage <= 0) break;
    const tierCapacity =
      tier.to_kwh !== null ? Math.max(0, tier.to_kwh - tier.from_kwh + (tier.from_kwh === 0 ? 0 : 1)) : remainingUsage;
    const consumed = Math.min(remainingUsage, tierCapacity);
    const subtotal = Math.round(consumed * tier.unit_price);
    breakdown.push({ tier_number: tier.tier_number, consumed, unit_price: tier.unit_price, subtotal });
    totalCost += subtotal;
    remainingUsage -= consumed;
  }
  return { totalCost, breakdown };
}

// 5. Module Validation số công tơ điện nước (P2-02)
function validateMeterReading(oldReading, newReading, previousMonthUsage) {
  if (newReading < oldReading) {
    return { isValid: false, isSpike: false, errorMessage: 'Số mới không được nhỏ hơn số cũ' };
  }
  const usage = newReading - oldReading;
  if (previousMonthUsage && previousMonthUsage > 15 && usage / previousMonthUsage >= 1.8) {
    return { isValid: true, isSpike: true, usage, spikeRatio: usage / previousMonthUsage };
  }
  return { isValid: true, isSpike: false, usage };
}

console.log('======================================================================');
console.log('  BẮT ĐẦU CHẠY TEST SUITE LOGIC KẾ TOÁN VẬN HÀNH K23 PMS (P1 & P2)');
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

// Test 5: Tính tiền điện bậc thang lũy tiến (P2-02)
console.log('Test 5: Kiểm tra tính lũy tiến điện bậc thang (P2-02)');
const tiersPreset = [
  { tier_number: 1, from_kwh: 0, to_kwh: 80, unit_price: 3200 },
  { tier_number: 2, from_kwh: 81, to_kwh: 200, unit_price: 3800 },
  { tier_number: 3, from_kwh: 201, to_kwh: null, unit_price: 4300 },
];
// Dùng 250 kWh: 80*3200 + 120*3800 + 50*4300 = 256.000 + 456.000 + 215.000 = 927.000đ
const tieredRes = calculateTieredElectricity(250, tiersPreset);
assert.strictEqual(tieredRes.totalCost, 927000, '250 kWh theo 3 bậc giá phải là 927.000đ');
assert.strictEqual(tieredRes.breakdown.length, 3, 'Phải có đủ 3 bậc tiêu thụ');
console.log('  ✅ [PASS] Tính điện bậc thang 250 kWh = 927.000đ chính xác từng bậc 100%\n');

// Test 6: Kiểm tra validation công tơ chặn số lùi và cảnh báo tăng vọt (P2-02)
console.log('Test 6: Kiểm tra validation công tơ điện nước (P2-02)');
const invalidCheck = validateMeterReading(450, 420);
assert.strictEqual(invalidCheck.isValid, false, 'Số mới 420 < 450 phải bị từ chối');

const spikeCheck = validateMeterReading(400, 600, 100); // 200 kWh so với 100 kWh tháng trước = gấp 2 lần (200%)
assert.strictEqual(spikeCheck.isValid, true, 'Số tăng vẫn hợp lệ');
assert.strictEqual(spikeCheck.isSpike, true, 'Nhảy số trên 180% phải bật cảnh báo');
console.log('  ✅ [PASS] Chặn nhập lùi và cảnh báo tăng vọt 200% hoạt động chính xác 100%\n');

console.log('======================================================================');
console.log('🎉 TẤT CẢ 6/6 BÀI TEST LOGIC TÀI CHÍNH K23 PMS ĐẠT CHUẨN 100%!');
console.log('======================================================================');
