import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nanhmbnpihlaojbwfebb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_aIbyNWURIM1qwQG6g_bTUg_lukLkC4f';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('🧪 BẮT ĐẦU KIỂM THỬ HỆ THỐNG QUẢN TRỊ ADMIN TRÊN SUPABASE THẬT...\n');

async function runTests() {
  let passed = 0;
  let total = 4;

  // TEST 1: Truy vấn danh sách phòng thật và tính trạng thái kiểm duyệt
  try {
    console.log('--- TEST 1: Kiểm tra dữ liệu phòng kiểm duyệt thật ---');
    const { data: rooms, error } = await supabase
      .from('rooms')
      .select('id, name, status, moderation_status, price')
      .limit(10);

    if (error) throw error;
    console.log(`✅ Thành công: Lấy được ${rooms.length} phòng từ database Cloud.`);
    if (rooms.length > 0) {
      console.log(`   Ví dụ phòng: ID=${rooms[0].id.slice(0, 8)}..., Tên="${rooms[0].name}", Trạng thái="${rooms[0].status}"`);
    }
    passed++;
  } catch (err) {
    console.error('❌ TEST 1 Thất bại:', err.message);
  }

  // TEST 2: Kiểm tra danh sách người dùng profiles
  try {
    console.log('\n--- TEST 2: Kiểm tra danh sách profiles người dùng ---');
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, full_name, phone, role')
      .limit(10);

    if (error) throw error;
    console.log(`✅ Thành công: Lấy được ${profiles.length} tài khoản người dùng từ Supabase.`);
    if (profiles.length > 0) {
      console.log(`   Ví dụ tài khoản: Tên="${profiles[0].full_name}", Vai trò="${profiles[0].role}"`);
    }
    passed++;
  } catch (err) {
    console.error('❌ TEST 2 Thất bại:', err.message);
  }

  // TEST 3: Kiểm tra bảng lịch hẹn xem phòng viewing_requests
  try {
    console.log('\n--- TEST 3: Kiểm tra lịch hẹn xem phòng viewing_requests ---');
    const { data: bookings, error } = await supabase
      .from('viewing_requests')
      .select('id, requested_date, status, contact_phone')
      .limit(5);

    if (error) throw error;
    console.log(`✅ Thành công: Lấy được ${bookings.length} lịch hẹn xem phòng từ database.`);
    passed++;
  } catch (err) {
    console.error('❌ TEST 3 Thất bại:', err.message);
  }

  // TEST 4: Kiểm tra bảng báo cáo vi phạm reports
  try {
    console.log('\n--- TEST 4: Kiểm tra bảng báo cáo vi phạm reports ---');
    const { data: reports, error } = await supabase
      .from('reports')
      .select('id, target_type, reason, status')
      .limit(5);

    if (error) throw error;
    console.log(`✅ Thành công: Truy vấn thành công bảng reports, hiện có ${reports.length} bản ghi.`);
    passed++;
  } catch (err) {
    console.error('❌ TEST 4 Thất bại:', err.message);
  }

  console.log(`\n==============================================`);
  console.log(`📊 KẾT QUẢ KIỂM THỬ ADMIN: ${passed}/${total} TESTS PASS!`);
  console.log(`==============================================\n`);
}

runTests();
