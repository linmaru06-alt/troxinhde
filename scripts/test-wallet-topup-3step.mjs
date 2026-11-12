import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {
  calculateWalletXuBreakdown,
  generateTopupOrderCode,
  buildVietQrImageUrl,
  verifyFirebaseIdToken,
  getServiceSupabase,
  getWalletSupabaseClient,
  resolveSupabaseUrl,
} from '../api/_lib/walletServer.ts';
import paymentIpnHandler from '../api/webhook/payment-ipn.ts';

function createMockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
  return res;
}

async function runTests() {
  console.log('======================================================================');
  console.log('  KIỂM THỬ PRODUCTION CODE: LUỒNG NẠP XU 3 BƯỚC & BẢO MẬT WEBHOOK');
  console.log('======================================================================\n');

  // Test 1: Quy đổi Xu bậc thang từ production server helper
  console.log('Test 1: Kiểm tra calculateWalletXuBreakdown (production server helper)');
  assert.deepEqual(calculateWalletXuBreakdown(50000), {
    amountVnd: 50000,
    realXu: 50,
    bonusXu: 0,
    totalXu: 50,
    bonusPercent: 0,
  });
  assert.deepEqual(calculateWalletXuBreakdown(500000), {
    amountVnd: 500000,
    realXu: 500,
    bonusXu: 50,
    totalXu: 550,
    bonusPercent: 10,
  });
  assert.deepEqual(calculateWalletXuBreakdown(1000000), {
    amountVnd: 1000000,
    realXu: 1000,
    bonusXu: 100,
    totalXu: 1100,
    bonusPercent: 10,
  });
  assert.deepEqual(calculateWalletXuBreakdown(2000000), {
    amountVnd: 2000000,
    realXu: 2000,
    bonusXu: 250,
    totalXu: 2250,
    bonusPercent: 12.5,
  });

  assert.throws(() => calculateWalletXuBreakdown(5000), /tối thiểu/);
  assert.throws(() => calculateWalletXuBreakdown(50500), /bội số/);
  assert.throws(() => calculateWalletXuBreakdown(60000000), /tối đa/);
  console.log('  ✅ [PASS] Công thức Xu bậc thang (500k +10%, 2M +12.5%) & chặn input sai hoạt động chính xác.');

  // Test 2: Sinh mã đơn TXNAP duy nhất & URL VietQR
  console.log('\nTest 2: Sinh mã đơn TXNAP & URL VietQR động');
  const codeA = generateTopupOrderCode();
  const codeB = generateTopupOrderCode();
  assert.match(codeA, /^TXNAP[A-F0-9]{8}$/);
  assert.notEqual(codeA, codeB);
  const qrUrl = buildVietQrImageUrl('970407', '0888110789', 500000, codeA, 'NGUYEN VU CHINH');
  assert.ok(qrUrl.includes('https://img.vietqr.io/image/970407-0888110789-compact2.png'));
  assert.ok(qrUrl.includes(`addInfo=${codeA}`));
  console.log(`  ✅ [PASS] Mã đơn duy nhất: ${codeA}, VietQR URL hợp lệ.`);

  // Test 3: Verify Firebase ID Token từ chối token thiếu / giả mạo
  console.log('\nTest 3: Kiểm tra verifyFirebaseIdToken từ chối token giả mạo');
  await assert.rejects(() => verifyFirebaseIdToken(undefined), /Bearer Token/);
  await assert.rejects(() => verifyFirebaseIdToken('Bearer invalid.jwt'), /JWT/);

  const fakeHeader = Buffer.from(JSON.stringify({ alg: 'RS256', kid: 'fake_kid' })).toString('base64url');
  const fakePayload = Buffer.from(
    JSON.stringify({
      aud: 'troxinh-eb',
      iss: 'https://securetoken.google.com/troxinh-eb',
      sub: 'attacker_uid',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
    })
  ).toString('base64url');
  const fakeJwt = `Bearer ${fakeHeader}.${fakePayload}.${Buffer.from('forged').toString('base64url')}`;
  await assert.rejects(() => verifyFirebaseIdToken(fakeJwt));
  console.log('  ✅ [PASS] Token thiếu hoặc giả mạo chữ ký đều bị từ chối.');

  // Test 4: Kiểm tra bảo mật Webhook IPN production handler
  console.log('\nTest 4: Kiểm tra bảo mật Webhook IPN (api/webhook/payment-ipn.ts)');
  const prevUrl = process.env.SUPABASE_URL;
  const prevSrvKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const prevSepaySecret = process.env.SEPAY_WEBHOOK_SECRET;
  const prevPayosKey = process.env.PAYOS_CHECKSUM_KEY;

  process.env.SUPABASE_URL = 'https://nanhmbnpihlaojbwfebb.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'dummy_service_role_for_unit_test';
  process.env.SEPAY_WEBHOOK_SECRET = 'sepay_secret_abc_123';
  process.env.PAYOS_CHECKSUM_KEY = 'payos_checksum_xyz_456';

  try {
    // 4.1 Reject GET
    const resGet = createMockRes();
    await paymentIpnHandler({ method: 'GET', headers: {} }, resGet);
    assert.equal(resGet.statusCode, 405);

    // 4.2 Reject SePay wrong secret
    const resWrongSecret = createMockRes();
    await paymentIpnHandler(
      {
        method: 'POST',
        headers: { authorization: 'Apikey wrong_secret' },
        body: { transferAmount: 500000, content: codeA, referenceCode: 'REF_1' },
      },
      resWrongSecret
    );
    assert.equal(resWrongSecret.statusCode, 401);

    // 4.3 Reject PayOS forged HMAC signature
    const payosData = { amount: 500000, description: codeA, orderCode: 12345 };
    const resWrongPayos = createMockRes();
    await paymentIpnHandler(
      {
        method: 'POST',
        headers: {},
        body: { code: '00', data: payosData, signature: '0'.repeat(64) },
      },
      resWrongPayos
    );
    assert.equal(resWrongPayos.statusCode, 401);

    // 4.4 Accept valid PayOS HMAC signature (proceeds past auth into handler)
    const sorted = Object.keys(payosData).sort();
    const signStr = sorted.map((k) => `${k}=${payosData[k]}`).join('&');
    const validSig = crypto
      .createHmac('sha256', process.env.PAYOS_CHECKSUM_KEY)
      .update(signStr)
      .digest('hex');

    const resValidPayos = createMockRes();
    await paymentIpnHandler(
      {
        method: 'POST',
        headers: {},
        body: { code: '00', data: payosData, signature: validSig },
      },
      resValidPayos
    );
    // Không bị 401 -> chữ ký PayOS hợp lệ đã vượt qua bước bảo mật và đi tới Supabase RPC credit_wallet_from_topup
    assert.equal(resValidPayos.statusCode, 200);
    const firstResult = resValidPayos.body?.results?.[0];
    assert.ok(firstResult, 'Phải trả về kết quả xử lý sự kiện webhook');
    if (firstResult.type === 'WALLET_TOPUP_ORDER') {
      assert.equal(firstResult.orderCode, codeA);
    } else {
      assert.equal(firstResult.type, 'ERROR');
      assert.equal(firstResult.content, codeA);
      assert.match(String(firstResult.error || ''), /API key|JWT|credit_wallet_from_topup/i);
    }
    console.log('  ✅ [PASS] Webhook IPN chặn sai method/secret/HMAC (401/405) và định tuyến đúng nhánh TXNAP...');
  } finally {
    process.env.SUPABASE_URL = prevUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = prevSrvKey;
    process.env.SEPAY_WEBHOOK_SECRET = prevSepaySecret;
    process.env.PAYOS_CHECKSUM_KEY = prevPayosKey;
  }

  // Test 5: Kiểm tra cơ chế fallback Supabase URL & Client khi thiếu/sai env trên Vercel
  console.log('\nTest 5: Kiểm tra resolveSupabaseUrl & fallback Anon + Firebase JWT');
  const prevUrl5 = process.env.SUPABASE_URL;
  const prevViteUrl5 = process.env.VITE_SUPABASE_URL;
  const prevSrvKey5 = process.env.SUPABASE_SERVICE_ROLE_KEY;
  try {
    // 5.0 SUPABASE_URL sai định dạng / placeholder / dính dấu ngoặc kép phải tự sửa hoặc fallback về URL chuẩn
    process.env.SUPABASE_URL = 'your_supabase_url';
    process.env.VITE_SUPABASE_URL = '  "https://nanhmbnpihlaojbwfebb.supabase.co/"  ';
    assert.equal(resolveSupabaseUrl(), 'https://nanhmbnpihlaojbwfebb.supabase.co');

    process.env.SUPABASE_URL = 'not-a-valid-url';
    process.env.VITE_SUPABASE_URL = 'invalid_url_here';
    assert.equal(resolveSupabaseUrl(), 'https://nanhmbnpihlaojbwfebb.supabase.co');

    delete process.env.SUPABASE_URL;
    delete process.env.VITE_SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    // 5.1 Thiếu SERVICE_ROLE_KEY -> getServiceSupabase() phải báo rõ thiếu SUPABASE_SERVICE_ROLE_KEY
    assert.throws(() => getServiceSupabase(), /SUPABASE_SERVICE_ROLE_KEY/);

    // 5.2 Thiếu SERVICE_ROLE_KEY -> getWalletSupabaseClient() tự fallback sang Anon Key + Firebase JWT (isServiceRole=false)
    const fallbackClient = getWalletSupabaseClient('Bearer dummy_firebase_jwt');
    assert.equal(fallbackClient.isServiceRole, false);
    assert.ok(fallbackClient.supabase);

    // 5.3 Khi có SERVICE_ROLE_KEY -> isServiceRole=true
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'dummy_service_role_key_test';
    const privilegedClient = getWalletSupabaseClient('Bearer dummy_firebase_jwt');
    assert.equal(privilegedClient.isServiceRole, true);
    console.log('  ✅ [PASS] resolveSupabaseUrl chống URL lỗi/placeholder & fallback Anon+FirebaseJWT hoạt động chuẩn.');
  } finally {
    if (prevUrl5 !== undefined) process.env.SUPABASE_URL = prevUrl5;
    else delete process.env.SUPABASE_URL;
    if (prevViteUrl5 !== undefined) process.env.VITE_SUPABASE_URL = prevViteUrl5;
    else delete process.env.VITE_SUPABASE_URL;
    if (prevSrvKey5 !== undefined) process.env.SUPABASE_SERVICE_ROLE_KEY = prevSrvKey5;
    else delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  }

  console.log('\n🎉 TẤT CẢ 5/5 BÀI TEST LUỒNG NẠP XU 3 BƯỚC ĐẠT 100%!');
}

runTests().catch((err) => {
  console.error('❌ Test thất bại:', err);
  process.exit(1);
});
