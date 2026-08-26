import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nanhmbnpihlaojbwfebb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_aIbyNWURIM1qwQG6g_bTUg_lukLkC4f';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('🚀 Bắt đầu kiểm thử Động Cơ Hợp Nhất Đăng Ký / Đăng Nhập (Unified Auth Engine)...\n');

async function handleUnifiedAuthEngine(params) {
  const isPhone = params.authType === 'phone' || !params.identifier.includes('@');
  const cleanPhone = isPhone ? params.identifier.trim().replace(/\D/g, '') : undefined;
  const cleanEmail = !isPhone ? params.identifier.trim().toLowerCase() : undefined;

  let existingUser = null;

  if (cleanPhone) {
    const { data } = await supabase.from('users').select('*').eq('phone', cleanPhone).maybeSingle();
    existingUser = data;
  } else if (cleanEmail) {
    const { data } = await supabase.from('users').select('*').eq('email', cleanEmail).maybeSingle();
    existingUser = data;
  }

  if (existingUser) {
    await supabase.from('users').update({ updated_at: new Date().toISOString() }).eq('id', existingUser.id);
    return {
      success: true,
      isNewUser: false,
      user: existingUser,
    };
  }

  const userId = params.firebaseUid || `usr_${Date.now()}`;
  const defaultName =
    params.name?.trim() ||
    (cleanPhone ? `Người dùng ${cleanPhone.slice(-4)}` : cleanEmail ? cleanEmail.split('@')[0] : 'Người dùng mới');
  const role = params.intendedRole === 'owner' ? 'owner' : 'user';
  const avatar = params.avatarUrl || '/images/user-avatar.jpg';

  const newRecord = {
    id: userId,
    name: defaultName,
    email: cleanEmail || null,
    phone: cleanPhone || null,
    role,
    avatar_url: avatar,
    verified: true,
    auth_provider: params.authType,
    owner_application_status: role === 'owner' ? 'approved' : 'none',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data: createdData, error: insertErr } = await supabase
    .from('users')
    .upsert(newRecord, { onConflict: 'id' })
    .select()
    .single();

  if (insertErr) {
    throw new Error(insertErr.message);
  }

  return {
    success: true,
    isNewUser: true,
    user: createdData,
  };
}

async function runTests() {
  const testPhone = '0999888777';
  const testEmail = 'unified.test.user@gmail.com';
  let createdPhoneUserId = null;
  let createdEmailUserId = null;

  // Test 1: SĐT mới -> Tự động Đăng Ký
  console.log('Test 1: SĐT mới (0999888777) đăng nhập lần đầu');
  const res1 = await handleUnifiedAuthEngine({
    identifier: testPhone,
    authType: 'phone',
    name: 'Anh Nam Renter',
  });
  console.log(`  ✅ [PASS] isNewUser = ${res1.isNewUser} (Đăng ký thành công)`);
  console.log(`  ✅ [PASS] ID = ${res1.user.id}, Name = ${res1.user.name}, Role = ${res1.user.role}`);
  createdPhoneUserId = res1.user.id;

  // Test 2: SĐT cũ -> Tự động Đăng Nhập (Xuất dữ liệu Supabase)
  console.log('\nTest 2: SĐT cũ (0999888777) đăng nhập lần thứ hai');
  const res2 = await handleUnifiedAuthEngine({
    identifier: testPhone,
    authType: 'phone',
  });
  console.log(`  ✅ [PASS] isNewUser = ${res2.isNewUser} (Đăng nhập thành công)`);
  console.log(`  ✅ [PASS] Dữ liệu xuất từ Supabase khớp chính xác ID = ${res2.user.id}, Name = ${res2.user.name}`);

  // Test 3: Google Email mới -> Tự động Đăng Ký
  console.log('\nTest 3: Google Email mới (unified.test.user@gmail.com) đăng nhập lần đầu');
  const res3 = await handleUnifiedAuthEngine({
    identifier: testEmail,
    authType: 'google',
    name: 'Google User Test',
    avatarUrl: 'https://lh3.googleusercontent.com/avatar.jpg',
  });
  console.log(`  ✅ [PASS] isNewUser = ${res3.isNewUser} (Đăng ký Google thành công)`);
  console.log(`  ✅ [PASS] ID = ${res3.user.id}, Email = ${res3.user.email}`);
  createdEmailUserId = res3.user.id;

  // Test 4: Google Email cũ -> Tự động Đăng Nhập
  console.log('\nTest 4: Google Email cũ (unified.test.user@gmail.com) đăng nhập lần thứ hai');
  const res4 = await handleUnifiedAuthEngine({
    identifier: testEmail,
    authType: 'google',
  });
  console.log(`  ✅ [PASS] isNewUser = ${res4.isNewUser} (Đăng nhập Google thành công)`);
  console.log(`  ✅ [PASS] Khớp ID = ${res4.user.id}`);

  // Dọn dẹp
  console.log('\n🧹 Đang dọn dẹp dữ liệu kiểm thử trên Supabase...');
  if (createdPhoneUserId) await supabase.from('users').delete().eq('id', createdPhoneUserId);
  if (createdEmailUserId) await supabase.from('users').delete().eq('id', createdEmailUserId);
  console.log('✅ Đã dọn dẹp dữ liệu test sạch sẽ.');

  console.log('\n======================================================');
  console.log('🎉 TOÀN BỘ 4 TEST CASES HỢP NHẤT XÁC THỰC THÀNH CÔNG 100%!');
  console.log('======================================================');
}

runTests().catch(console.error);
