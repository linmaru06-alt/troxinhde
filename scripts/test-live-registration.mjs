import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nanhmbnpihlaojbwfebb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_aIbyNWURIM1qwQG6g_bTUg_lukLkC4f';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('🚀 Kiểm tra Đăng ký tài khoản mới & Lưu Supabase...');

async function testRegisterUser(email, name, phone, role) {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPhone = phone ? phone.trim().replace(/\D/g, '') : null;
  const firebaseUid = `usr_${Date.now()}`;

  console.log(`\nĐang lưu tài khoản: ${name} (${cleanEmail})...`);

  const userPayload = {
    id: firebaseUid,
    name: name.trim(),
    email: cleanEmail,
    phone: cleanPhone,
    role: role || 'user',
    avatar_url: '/images/user-avatar.jpg',
    verified: true,
    auth_provider: 'email_password',
    owner_application_status: role === 'owner' ? 'approved' : 'none',
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('users')
    .upsert(userPayload, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    console.error('❌ Lỗi lưu Supabase:', error.message);
    return null;
  }

  console.log('✅ ĐÃ LƯU THÀNH CÔNG VÀO SUPABASE!');
  console.log('   - ID:', data.id);
  console.log('   - Name:', data.name);
  console.log('   - Email:', data.email);
  console.log('   - Phone:', data.phone);
  console.log('   - Role:', data.role);
  console.log('   - Created At:', data.created_at);
  return data;
}

async function run() {
  const testUser = await testRegisterUser('nguyenvana_troxinh@gmail.com', 'Nguyễn Văn A (Người Thuê Mới)', '0981234567', 'user');

  console.log('\n--- Kiểm tra danh sách bảng users hiện tại ---');
  const { data: allUsers } = await supabase.from('users').select('id, name, email, phone, role, created_at').order('created_at', { ascending: false });
  console.table(allUsers);
}

run().catch(console.error);
