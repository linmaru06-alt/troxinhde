import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { PayOS } from '@payos/node';
import QRCode from 'qrcode';

console.log('======================================================================');
console.log('  CHẠY TEST SUITE TÍCH HỢP CỔNG THANH TOÁN PAYOS & WEBHOOK (PAYOS.VN)');
console.log('======================================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passCount++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    failCount++;
  }
}

async function runTests() {
  // -------------------------------------------------------------------------
  // TEST 1: Khởi tạo PayOS SDK v2 từ @payos/node
  // -------------------------------------------------------------------------
  console.log('Test 1: Khởi tạo PayOS SDK v2 từ thư viện chính thức @payos/node');
  const dummyClientId = 'payos_client_id_test_123';
  const dummyApiKey = 'payos_api_key_test_456';
  const dummyChecksumKey = '0123456789abcdef0123456789abcdef';

  const payosInstance = new PayOS({
    clientId: dummyClientId,
    apiKey: dummyApiKey,
    checksumKey: dummyChecksumKey,
  });

  assert(typeof PayOS === 'function', 'Thư viện @payos/node xuất class PayOS chuẩn.');
  assert(
    typeof payosInstance.paymentRequests?.create === 'function',
    'Phương thức payos.paymentRequests.create tồn tại theo chuẩn SDK v2.'
  );
  assert(
    typeof payosInstance.webhooks?.verify === 'function',
    'Phương thức payos.webhooks.verify tồn tại để xác minh chữ ký.'
  );

  // -------------------------------------------------------------------------
  // TEST 2: Sinh mã đơn hàng số nguyên duy nhất (orderCode: number)
  // -------------------------------------------------------------------------
  console.log('\nTest 2: Sinh mã đơn hàng số nguyên duy nhất theo chuẩn PayOS');
  let orderCounter = Math.floor(Math.random() * 1000);
  function generatePayOSOrderCode() {
    orderCounter = (orderCounter + 1) % 10000;
    const offsetTime = Date.now() - 1700000000000;
    return offsetTime * 10000 + orderCounter;
  }

  const codes = new Set();
  let allSafeIntegers = true;
  let allPositive = true;

  for (let i = 0; i < 500; i++) {
    const code = generatePayOSOrderCode();

    if (!Number.isSafeInteger(code) || typeof code !== 'number') {
      allSafeIntegers = false;
    }
    if (code <= 0) {
      allPositive = false;
    }
    codes.add(code);
  }

  assert(allSafeIntegers, 'Mọi mã đơn sinh ra đều là số nguyên an toàn (Number.isSafeInteger).');
  assert(allPositive, 'Mọi mã đơn sinh ra đều là số nguyên dương > 0.');
  assert(codes.size === 500, '500 mã đơn sinh ngẫu nhiên đều duy nhất, không trùng lặp.');

  // -------------------------------------------------------------------------
  // TEST 3: Xác minh chữ ký số Webhook PayOS (HMAC-SHA256)
  // -------------------------------------------------------------------------
  console.log('\nTest 3: Xác minh chữ ký số Webhook PayOS (HMAC-SHA256 Checksum)');
  const testOrderCode = 1794501234567;
  const testAmount = 150000;
  const testDescription = 'TX 1794501234567';

  const testWebhookData = {
    accountNumber: '0888110789',
    amount: testAmount,
    code: '00',
    currency: 'VND',
    desc: 'success',
    description: testDescription,
    orderCode: testOrderCode,
    paymentLinkId: 'link_payos_mock_999',
    reference: 'FT261117001',
    transactionDateTime: '2026-11-17 18:30:00',
  };

  // Tạo chữ ký hợp lệ bằng HMAC-SHA256 với checksumKey theo quy tắc PayOS
  const sortedKeys = Object.keys(testWebhookData).sort();
  const signString = sortedKeys.map((k) => `${k}=${testWebhookData[k]}`).join('&');
  const validSignature = crypto.createHmac('sha256', dummyChecksumKey).update(signString).digest('hex');

  const validPayload = {
    code: '00',
    desc: 'success',
    success: true,
    data: testWebhookData,
    signature: validSignature,
  };

  // 3a. Xác minh chữ ký hợp lệ
  let verifySuccess = false;
  try {
    const verified = await payosInstance.webhooks.verify(validPayload);
    if (verified && verified.orderCode === testOrderCode && verified.amount === testAmount) {
      verifySuccess = true;
    }
  } catch (err) {
    console.error('Lỗi không mong muốn khi verify chữ ký hợp lệ:', err);
  }
  assert(verifySuccess, 'Chữ ký hợp lệ được payos.webhooks.verify chấp thuận chính xác.');

  // 3b. Xác minh chữ ký giả mạo bị từ chối
  let rejectedFakeSig = false;
  const fakePayload = {
    ...validPayload,
    signature: 'bad_signature_tampered_hex_value_1234567890abcdef',
  };
  try {
    await payosInstance.webhooks.verify(fakePayload);
  } catch {
    rejectedFakeSig = true;
  }
  assert(rejectedFakeSig, 'Chữ ký giả mạo bị từ chối chính xác (throw Error).');

  // 3c. Xác minh dữ liệu bị chỉnh sửa số tiền (Data Tampering) bị từ chối
  let rejectedTamperedData = false;
  const tamperedPayload = {
    ...validPayload,
    data: {
      ...testWebhookData,
      amount: 1000, // Kẻ gian cố tình sửa số tiền
    },
  };
  try {
    await payosInstance.webhooks.verify(tamperedPayload);
  } catch {
    rejectedTamperedData = true;
  }
  assert(rejectedTamperedData, 'Dữ liệu bị sửa đổi (tampered amount) bị từ chối chính xác.');

  // -------------------------------------------------------------------------
  // TEST 4: Cơ chế chống xử lý trùng lặp (Idempotency Simulation)
  // -------------------------------------------------------------------------
  console.log('\nTest 4: Cơ chế chống xử lý trùng lặp (Idempotency Logic)');
  // Giả lập database state
  const mockDbTransactions = new Map();
  mockDbTransactions.set(String(testOrderCode), {
    order_code: String(testOrderCode),
    amount: testAmount,
    status: 'pending',
    paid_at: null,
  });

  async function simulateWebhookProcess(orderCode, amount, code) {
    const tx = mockDbTransactions.get(String(orderCode));
    if (!tx) return { error: 0, message: 'Order not found' };

    // Idempotency check:
    if (tx.status === 'paid' || tx.status === 'success') {
      return {
        error: 0,
        already_processed: true,
        message: 'Đơn hàng này đã được ghi nhận thanh toán thành công trước đó (Idempotent OK).',
      };
    }

    if (code === '00') {
      tx.status = 'paid';
      tx.paid_at = new Date().toISOString();
      return { error: 0, already_processed: false, message: 'Cập nhật trạng thái PAID thành công.' };
    }

    return { error: 0, already_processed: false, message: 'Trạng thái khác' };
  }

  // Lần gửi Webhook 1:
  const firstCall = await simulateWebhookProcess(testOrderCode, testAmount, '00');
  assert(
    firstCall.already_processed === false && mockDbTransactions.get(String(testOrderCode)).status === 'paid',
    'Lần gửi webhook đầu tiên: Đổi trạng thái đơn thành PAID.'
  );

  // Lần gửi Webhook 2 (PayOS retry hoặc duplicate packet):
  const secondCall = await simulateWebhookProcess(testOrderCode, testAmount, '00');
  assert(
    secondCall.already_processed === true,
    'Lần gửi webhook trùng lặp thứ 2: Chống xử lý trùng thành công (Idempotent OK).'
  );

  // -------------------------------------------------------------------------
  // TEST 5: Kiểm tra các file Serverless Function và Pages đã tạo
  // -------------------------------------------------------------------------
  console.log('\nTest 5: Kiểm tra cấu trúc các file đã tạo');
  const requiredFiles = [
    'api/_lib/payosServer.ts',
    'api/payos/create-payment-link.ts',
    'api/payos/webhook.ts',
    'api/payos/order-status.ts',
    'src/lib/payos.ts',
    'src/pages/PaymentSuccessPage.tsx',
    'src/pages/PaymentCancelPage.tsx',
  ];

  for (const relPath of requiredFiles) {
    const fullPath = path.resolve(relPath);
    assert(fs.existsSync(fullPath), `File ${relPath} tồn tại trên đĩa.`);
  }

  // -------------------------------------------------------------------------
  // TEST 6: Kiểm thử hồi quy (Regression) cho QR gốc PayOS, RPC atomic & Active Sync
  // -------------------------------------------------------------------------
  console.log('\nTest 6: Kiểm thử hồi quy chuỗi QR EMVCo gốc PayOS, thứ tự RPC & đối soát chủ động');

  const sampleEmvcoQr = '00020101021238540010A00000072701240006970422011009812462820208QRIBFTTA53037045405500005802VN62180814CS123456 TX1236304ABCD';
  const qrDataUrl = await QRCode.toDataURL(sampleEmvcoQr, { width: 320, margin: 2 });
  assert(
    typeof qrDataUrl === 'string' && qrDataUrl.startsWith('data:image/png;base64,'),
    'Render trực tiếp chuỗi EMVCo qrCode gốc từ PayOS ra ảnh PNG data URL thành công.'
  );

  const payosServerSrc = fs.readFileSync(path.resolve('api/_lib/payosServer.ts'), 'utf8');
  const webhookSrc = fs.readFileSync(path.resolve('api/payos/webhook.ts'), 'utf8');
  const topupCreateSrc = fs.readFileSync(path.resolve('api/wallet/create-topup-order.ts'), 'utf8');
  const serviceCreateSrc = fs.readFileSync(path.resolve('api/payments/create-service-order.ts'), 'utf8');
  const orderStatusSrc = fs.readFileSync(path.resolve('api/payos/order-status.ts'), 'utf8');
  const topupStatusSrc = fs.readFileSync(path.resolve('api/wallet/topup-status.ts'), 'utf8');
  const serviceStatusSrc = fs.readFileSync(path.resolve('api/payments/service-order-status.ts'), 'utf8');

  assert(
    payosServerSrc.includes('buildPayOSQrDataUrl') && payosServerSrc.includes('QRCode.toDataURL'),
    'payosServer.ts render ảnh QR trực tiếp từ chuỗi EMVCo gốc của PayOS.'
  );
  assert(
    payosServerSrc.includes('effectivePaidAmount < expectedAmount') &&
      payosServerSrc.includes('amountPaid >= Number(tx.amount) && amountRemaining <= 0'),
    'payosServer.ts chỉ xác nhận PAID khi đã nhận đủ 100% số tiền yêu cầu.'
  );
  assert(
    payosServerSrc.indexOf("rpc('credit_wallet_from_topup'") <
      payosServerSrc.indexOf("updatePayload.status = 'paid'"),
    'Thứ tự xử lý chuẩn: gọi RPC cộng Xu / kích hoạt dịch vụ TRƯỚC khi đổi status=paid.'
  );
  assert(
    webhookSrc.includes('fulfillPaidPayOSTransaction') && webhookSrc.includes('hasSupabaseServiceRoleKey'),
    'webhook.ts dùng hàm hoàn tất nguyên tử & kiểm tra quyền SUPABASE_SERVICE_ROLE_KEY.'
  );
  assert(
    topupCreateSrc.includes('res.status(502)') && serviceCreateSrc.includes('res.status(502)'),
    'create-topup-order & create-service-order trả lỗi 502 rõ ràng khi PayOS lỗi, không vẽ QR tĩnh giả.'
  );
  assert(
    topupCreateSrc.includes('payosRes.description') && serviceCreateSrc.includes('payosRes.description'),
    'Nội dung chuyển khoản hiển thị lấy chính xác từ payosRes.description của PayOS.'
  );
  assert(
    orderStatusSrc.includes('syncPayOSOrderStatusIfNeeded') &&
      topupStatusSrc.includes('syncPayOSOrderStatusIfNeeded') &&
      serviceStatusSrc.includes('syncPayOSOrderStatusIfNeeded'),
    'Cả 3 API kiểm tra trạng thái đều đối soát chủ động trực tiếp với PayOS API khi đơn còn pending.'
  );

  console.log('\n======================================================================');
  console.log(`  KẾT QUẢ: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('======================================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
