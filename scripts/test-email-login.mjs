import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nanhmbnpihlaojbwfebb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_aIbyNWURIM1qwQG6g_bTUg_lukLkC4f';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('🚀 Kiểm tra Đăng nhập tài khoản Email Real...');

async function testRealEmailLogin() {
  const realEmail = 'nguyentanh1607@gmail.com';

  console.log(`\n1. Kiểm tra tài khoản real: ${realEmail}`);
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', realEmail)
    .maybeSingle();

  if (error) {
    console.error('❌ Lỗi truy vấn Supabase:', error.message);
    return;
  }

  if (user) {
    console.log('✅ Tìm thấy tài khoản thành công!');
    console.log('   - ID:', user.id);
    console.log('   - Họ tên:', user.name);
    console.log('   - Email:', user.email);
    console.log('   - SĐT:', user.phone);
    console.log('   - Vai trò:', user.role);
  } else {
    console.error('❌ Không tìm thấy tài khoản trong Database!');
  }
}

testRealEmailLogin().catch(console.error);
