import { createClient } from '@supabase/supabase-js';
import { initialBuildings, initialRooms, initialUsers } from '../src/data/mockData.ts';

const SUPABASE_URL = 'https://nanhmbnpihlaojbwfebb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_aIbyNWURIM1qwQG6g_bTUg_lukLkC4f';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function seedData() {
  console.log('--- ĐỒNG BỘ DỮ LIỆU LÊN SUPABASE CLOUD ---');
  try {
    const { count, error: checkError } = await supabase.from('rooms').select('*', { count: 'exact', head: true });
    if (checkError) {
      console.log('Lưu ý khi kiểm tra bảng rooms:', checkError.message);
      return;
    }
    
    console.log(`Số phòng trọ hiện có trong CSDL Cloud: ${count || 0}`);
    console.log('Supabase Cloud đã sẵn sàng tiếp nhận dữ liệu từ người dùng thật!');
  } catch (err) {
    console.error('Lỗi khi seed data:', err);
  }
}

seedData();
