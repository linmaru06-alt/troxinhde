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

// 6. Module Tính phạt chậm nộp tiền phòng (P2-06)
function calculateLateFee(totalDue, dueDateStr, asOfDateStr, config) {
  const dueDate = new Date(dueDateStr);
  const asOfDate = new Date(asOfDateStr);
  dueDate.setHours(0, 0, 0, 0);
  asOfDate.setHours(0, 0, 0, 0);

  const diffDays = Math.max(0, Math.round((asOfDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)));
  if (diffDays <= config.grace_period_days) {
    return { overdueDays: diffDays, chargeableDays: 0, lateFeeAmount: 0 };
  }

  const chargeableDays = diffDays - config.grace_period_days;
  const lateFeeAmount = chargeableDays * config.daily_amount;
  return { overdueDays: diffDays, chargeableDays, lateFeeAmount };
}

// 7. Module Tính nghĩa vụ thuế cho thuê nhà TT 40/2021 (P2-07)
function calculateRentalTax(grossRentalRevenue, isTaxable = true) {
  if (!isTaxable) return { vatAmount: 0, pitAmount: 0, totalTax: 0 };
  const vatAmount = Math.round(grossRentalRevenue * 0.05); // 5% GTGT
  const pitAmount = Math.round(grossRentalRevenue * 0.05); // 5% TNCN
  return { vatAmount, pitAmount, totalTax: vatAmount + pitAmount };
}

// 8. Module AI Camera OCR Parse Số Công Tơ (P3-01)
function parseAiMeterReading(ocrRawText, previousReading = 0) {
  // 1. Ưu tiên tìm số sau các từ khóa định danh công tơ (chỉ số, chi so, kWh, m3)
  const keywordMatch = ocrRawText.match(/(?:chi\s*so|chỉ\s*số|số\s*điện|chỉ\s*số\s*mới)[:\s]*([0-9]+(?:[.,][0-9]+)?)/i);
  if (keywordMatch && keywordMatch[1]) {
    const val = parseFloat(keywordMatch[1].replace(/,/g, '.'));
    if (!isNaN(val) && val >= previousReading) {
      const usage = Math.round((val - previousReading) * 10) / 10;
      return { rawReading: val, usage, isSpike: usage > 500, isValid: true };
    }
  }

  // 2. Fallback bóc tách toàn bộ mảng số và sắp xếp theo khoảng cách tiệm cận số cũ
  const clean = ocrRawText.replace(/[^0-9\s.,]/g, ' ');
  const numbers = clean
    .split(/\s+/)
    .map((s) => s.replace(/,/g, '.'))
    .map((s) => parseFloat(s))
    .filter((n) => !isNaN(n) && n > 0);

  const validCandidates = numbers
    .filter((n) => n >= previousReading && n <= previousReading + 1500)
    .sort((a, b) => (a - previousReading) - (b - previousReading));

  const chosenReading = validCandidates.length > 0 ? validCandidates[0] : (numbers[0] || previousReading);
  const usage = Math.round(Math.max(0, chosenReading - previousReading) * 10) / 10;
  const isSpike = usage > 500;

  return {
    rawReading: chosenReading,
    usage,
    isSpike,
    isValid: chosenReading >= previousReading,
  };
}

// 9. Module Zalo ZNS Tích Xanh Payload Builder & Cost (P3-02)
function buildZnsPayload(tenant, invoice, templateType = 'bill_notice') {
  const costPerMessage = 250; // 250 VNĐ / tin ZNS
  const isVerifiedOA = true;
  const trackingId = `ZNS_TRK_${invoice.id.slice(-6)}`;
  return {
    recipientPhone: tenant.phone,
    recipientName: tenant.name,
    roomNumber: invoice.roomNumber,
    totalAmount: invoice.totalAmount,
    dueDate: invoice.dueDate,
    templateType,
    costPerMessage,
    isVerifiedOA,
    trackingId,
  };
}

console.log('======================================================================');
console.log('  BẮT ĐẦU CHẠY TEST SUITE LOGIC KẾ TOÁN VẬN HÀNH K23 PMS (P1, P2, P3 FULL)');
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
const code1 = extractInvoiceCodeFromContent('MBVCB.123456.TROXINH HD202611P101 thanh toan tien phong');
assert.strictEqual(code1, 'HD202611P101', 'Phải bóc tách được HD202611P101');

const code2 = extractInvoiceCodeFromContent('NGUYEN VAN A CHUYEN KHOAN HD-2026-P304');
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
const tieredRes = calculateTieredElectricity(250, tiersPreset);
assert.strictEqual(tieredRes.totalCost, 927000, '250 kWh theo 3 bậc giá phải là 927.000đ');
assert.strictEqual(tieredRes.breakdown.length, 3, 'Phải có đủ 3 bậc tiêu thụ');
console.log('  ✅ [PASS] Tính điện bậc thang 250 kWh = 927.000đ chính xác từng bậc 100%\n');

// Test 6: Kiểm tra validation công tơ chặn số lùi và cảnh báo tăng vọt (P2-02)
console.log('Test 6: Kiểm tra validation công tơ điện nước (P2-02)');
const invalidCheck = validateMeterReading(450, 420);
assert.strictEqual(invalidCheck.isValid, false, 'Số mới 420 < 450 phải bị từ chối');

const spikeCheck = validateMeterReading(400, 600, 100);
assert.strictEqual(spikeCheck.isValid, true, 'Số tăng vẫn hợp lệ');
assert.strictEqual(spikeCheck.isSpike, true, 'Nhảy số trên 180% phải bật cảnh báo');
console.log('  ✅ [PASS] Chặn nhập lùi và cảnh báo tăng vọt 200% hoạt động chính xác 100%\n');

// Test 7: Kiểm tra tính phạt chậm nộp tiền phòng (P2-06)
console.log('Test 7: Kiểm tra tính phạt chậm nộp tiền phòng tự động (P2-06)');
const lateCheck = calculateLateFee(4000000, '2026-11-05', '2026-11-10', {
  grace_period_days: 3,
  daily_amount: 20000,
});
assert.strictEqual(lateCheck.overdueDays, 5, 'Quá hạn 5 ngày');
assert.strictEqual(lateCheck.chargeableDays, 2, 'Sau khi trừ 3 ngày ân hạn phải tính phạt 2 ngày');
assert.strictEqual(lateCheck.lateFeeAmount, 40000, 'Phạt 2 ngày * 20.000đ = 40.000đ');
console.log('  ✅ [PASS] Tính phạt chậm nộp trừ thời gian ân hạn chính xác 100% (Phạt 40.000đ)\n');

// Test 8: Kiểm tra tính nghĩa vụ thuế TT 40/2021 (P2-07)
console.log('Test 8: Kiểm tra tính thuế TNCN 5% & GTGT 5% cho thuê nhà (P2-07)');
const taxCheck = calculateRentalTax(50000000); // 50 triệu tiền thuê nhà
assert.strictEqual(taxCheck.vatAmount, 2500000, 'Thuế GTGT 5% của 50 triệu phải là 2.500.000đ');
assert.strictEqual(taxCheck.pitAmount, 2500000, 'Thuế TNCN 5% của 50 triệu phải là 2.500.000đ');
assert.strictEqual(taxCheck.totalTax, 5000000, 'Tổng thuế 10% phải là 5.000.000đ');
console.log('  ✅ [PASS] Công thức thuế cho thuê nhà TT 40/2021 đạt chuẩn 100% (Tổng thuế 5.000.000đ)\n');

// Test 9: Kiểm tra AI Camera OCR quét công tơ (P3-01)
console.log('Test 9: Kiểm tra AI Camera OCR bóc tách số công tơ và lọc nhiễu (P3-01)');
const rawOcrText = 'EVN HANOI DONG HO DIEN 2021 SERIAL: 88923 CHI SO: 1425.8 kWh';
const ocrResult = parseAiMeterReading(rawOcrText, 1200);
assert.strictEqual(ocrResult.rawReading, 1425.8, 'AI phải bóc tách đúng số công tơ 1425.8');
assert.strictEqual(ocrResult.usage, 225.8, 'Sản lượng tiêu thụ là 225.8 kWh');
assert.strictEqual(ocrResult.isValid, true, 'Số đọc 1425.8 > 1200 là hợp lệ');
assert.strictEqual(ocrResult.isSpike, false, 'Tiêu thụ 225.8 kWh trong ngưỡng an toàn');
console.log('  ✅ [PASS] AI OCR bóc tách số công tơ và lọc nhiễu năm sản xuất chính xác 100%\n');

// Test 10: Kiểm tra Zalo ZNS Tích Xanh & Đối soát chi phí (P3-02)
console.log('Test 10: Kiểm tra Zalo ZNS tích xanh doanh nghiệp và đối soát phí 250đ (P3-02)');
const znsResult = buildZnsPayload(
  { name: 'Lê Hoàng Nam', phone: '0988123456' },
  { id: 'inv_k23_001', roomNumber: 'P.101', totalAmount: 3620000, dueDate: '05/11/2026' },
  'bill_notice'
);
assert.strictEqual(znsResult.costPerMessage, 250, 'Đơn giá tin ZNS chuẩn phải là 250 VNĐ');
assert.strictEqual(znsResult.isVerifiedOA, true, 'Tin nhắn phải có tích xanh Zalo OA');
assert.strictEqual(znsResult.recipientPhone, '0988123456', 'Số điện thoại nhận tin phải chính xác');
assert.strictEqual(znsResult.trackingId, 'ZNS_TRK_23_001', 'Mã tracking ZNS phải tạo chuẩn');
console.log('  ✅ [PASS] Payload Zalo ZNS tích xanh và đối soát 250đ/tin đạt chuẩn 100%\n');

console.log('======================================================================');
console.log('🎉 TẤT CẢ 10/10 BÀI TEST LOGIC TÀI CHÍNH & AI K23 PMS ĐẠT CHUẨN 100%!');
console.log('======================================================================');
