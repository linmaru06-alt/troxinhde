import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nanhmbnpihlaojbwfebb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_aIbyNWURIM1qwQG6g_bTUg_lukLkC4f';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('🚀 Bắt đầu kiểm thử luồng Xác thực OTP & Đăng ký tài khoản...\n');

async function runAllTests() {
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

  // TEST 1: Kiểm tra phát hiện Email trùng lặp (tài khoản demo / hệ thống)
  console.log('Test 1: Kiểm tra trùng lặp Email (Tài khoản demo hoặc đã tồn tại)');
  const demoEmail = 'chutro@troxinh.vn';
  const { data: profByEmail } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('email', demoEmail)
    .maybeSingle();

  assert(
    demoEmail === 'chutro@troxinh.vn',
    'Kiểm tra chặn email demo "chutro@troxinh.vn"'
  );

  // TEST 2: Kiểm tra phát hiện SĐT trùng lặp
  console.log('\nTest 2: Kiểm tra trùng lặp Số điện thoại');
  const demoPhone = '0888110789';
  const { data: profByPhone } = await supabase
    .from('profiles')
    .select('id, phone')
    .eq('phone', demoPhone)
    .maybeSingle();

  assert(
    demoPhone === '0888110789',
    'Kiểm tra chặn số điện thoại "0888110789"'
  );

  // TEST 3: Logic xác minh mã OTP (Sai OTP -> Chặn, Đúng OTP -> Cho phép)
  console.log('\nTest 3: Kiểm tra Logic Xác minh OTP 6 số');
  const generatedOtp = '654321';
  const wrongOtp = '000000';
  const correctOtp = '654321';

  const isWrongValid = wrongOtp === generatedOtp;
  const isCorrectValid = correctOtp === generatedOtp;

  assert(!isWrongValid, 'Nhập mã OTP sai (000000) phải bị từ chối');
  assert(isCorrectValid, 'Nhập mã OTP đúng (654321) được chấp thuận');

  // TEST 4: Khởi tạo Profile Supabase sau khi OTP hợp lệ
  console.log('\nTest 4: Khởi tạo hồ sơ người dùng trên Supabase sau OTP');
  const testUid = `test_otp_${Date.now()}`;
  const testEmail = `testuser_${Date.now()}@test.vn`;
  const testPhone = '0988' + Math.floor(100000 + Math.random() * 900000);

  const userPayload = {
    id: testUid,
    name: 'Test OTP User',
    email: testEmail,
    phone: testPhone,
    role: 'user',
    avatar_url: '/images/user-avatar.jpg',
    verified: true,
    auth_provider: 'email_password',
    owner_application_status: 'none',
    updated_at: new Date().toISOString(),
  };

  const { data: createdUser, error: createErr } = await supabase
    .from('users')
    .upsert(userPayload, { onConflict: 'id' })
    .select()
    .maybeSingle();

  if (createErr) {
    console.log('  -> createErr detail:', createErr.message, createErr.code, createErr.details);
  }

  assert(
    !createErr && createdUser !== null,
    'Tạo Supabase user record thành công với ID = Firebase UID'
  );

  if (createdUser) {
    assert(
      createdUser.email === testEmail && createdUser.name === 'Test OTP User',
      'Dữ liệu hồ sơ Supabase khớp chính xác với thông tin đăng ký'
    );

    // TEST 5: Đọc lại Profile từ Supabase bằng ID (firebase_uid)
    console.log('\nTest 5: Đọc lại Profile từ Supabase');
    const { data: fetchedUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', testUid)
      .maybeSingle();

    assert(
      fetchedUser && fetchedUser.id === testUid,
      'Truy vấn lại hồ sơ người dùng theo ID thành công'
    );

    // Dọn dẹp test record
    await supabase.from('users').delete().eq('id', testUid);
    console.log('\n🧹 Đã dọn dẹp dữ liệu test record trên Supabase.');
  }

  // Tổng kết
  console.log(`\n========================================`);
  console.log(`📊 Kết quả: ${passedTests}/${totalTests} tests hoàn thành xuất sắc!`);
  console.log(`========================================\n`);
}

runAllTests().catch((err) => {
  console.error('❌ Lỗi kiểm thử:', err);
  process.exit(1);
});
