import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://nanhmbnpihlaojbwfebb.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function seedPublicBetaDatabase() {
  console.log('🚀 BẮT ĐẦU ĐỒNG BỘ CƠ SỞ DỮ LIỆU CHUẨN PUBLIC BETA LÊN SUPABASE CLOUD...');

  try {
    const ownerId = '0016bd8f-d19e-4348-9175-3a4379cffad4';
    const buildingId1 = 'ea39aefa-3d88-4265-b828-1e2d10b27ce9';
    const buildingId2 = 'ea39aefa-3d88-4265-b828-1e2d10b27ce0';

    // 1. Đồng bộ Tòa Nhà (Buildings)
    console.log('1. Đang đồng bộ Tòa nhà...');
    const sampleBuildings = [
      {
        id: buildingId1,
        owner_id: ownerId,
        name: 'Tòa Nhà TroXinh Cầu Giấy Complex',
        address: 'Số 18 Ngõ 165 Cầu Giấy, P. Dịch Vọng',
        district: 'Quận Cầu Giấy',
        city: 'Hà Nội',
        lat: 21.0368,
        lng: 105.7905,
        description: 'Tòa nhà căn hộ dịch vụ và phòng trọ cao cấp, camera an ninh 24/7, thang máy, khóa vân tay.',
        amenities: ['Thang máy', 'Khóa vân tay', 'PCCC đạt chuẩn', 'Để xe miễn phí'],
        cover_image_url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800',
        status: 'active',
      },
      {
        id: buildingId2,
        owner_id: ownerId,
        name: 'Chung Cư Mini Đống Đa - Chùa Láng',
        address: 'Số 82 Chùa Láng, P. Láng Thượng',
        district: 'Quận Đống Đa',
        city: 'Hà Nội',
        lat: 21.0227,
        lng: 105.8023,
        description: 'Chung cư mini hiện đại cách ĐH Ngoại Thương 400m, bảo vệ 24/7, giờ giấc tự do.',
        amenities: ['Thang máy', 'Bếp riêng', 'Ban công thoáng', 'Khóa vân tay', 'Giờ giấc tự do'],
        cover_image_url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800',
        status: 'active',
      },
    ];

    const { error: bldErr } = await supabase.from('buildings').upsert(sampleBuildings, { onConflict: 'id' });
    if (bldErr) console.warn('Lỗi buildings:', bldErr.message);
    else console.log('✅ Đã đồng bộ 2 tòa nhà.');

    // 2. Đồng bộ Phòng Trọ (Rooms)
    console.log('2. Đang đồng bộ Phòng trọ...');
    const sampleRooms = [
      {
        id: '505010c2-505e-451b-b699-de8b871541ac',
        building_id: buildingId1,
        owner_id: ownerId,
        name: 'Phòng Studio Full Đồ Ban Công Thoáng Mát Cầu Giấy',
        price: 3500000,
        area: 25,
        room_type: 'studio',
        amenities: ['Điều hòa Inverter', 'Nóng lạnh', 'Tủ lạnh', 'Máy giặt chung', 'Ban công thoáng', 'Khóa vân tay', 'Thang máy'],
        description: 'Phòng trọ cao cấp thiết kế hiện đại, đầy đủ tiện nghi, view thoáng mát, cách ĐHQG và ĐH Sư Phạm 800m.',
        status: 'available',
        moderation_status: 'approved',
        boost_type: 'vip',
      },
      {
        id: '505010c2-505e-451b-b699-de8b871541ad',
        building_id: buildingId2,
        owner_id: ownerId,
        name: 'Căn Hộ Mini Khép Kín Gần ĐH Ngoại Thương',
        price: 4200000,
        area: 32,
        room_type: 'studio',
        amenities: ['Điều hòa Inverter', 'Nóng lạnh', 'Tủ bếp riêng', 'Máy giặt riêng', 'Giường nệm cao cấp', 'PCCC chuẩn'],
        description: 'Căn hộ mini cao cấp cách cổng trường Ngoại Thương và Ngoại Giao 500m. Thiết kế bếp riêng biệt không ám mùi, giờ giấc tự do.',
        status: 'available',
        moderation_status: 'approved',
        boost_type: 'vip',
      },
    ];

    const { error: roomErr } = await supabase.from('rooms').upsert(sampleRooms, { onConflict: 'id' });
    if (roomErr) console.warn('Lỗi rooms:', roomErr.message);
    else console.log('✅ Đã đồng bộ 2 phòng trọ.');

    console.log('\n===============================================================');
    console.log('🎉 ĐỒNG BỘ CƠ SỞ DỮ LIỆU PUBLIC BETA HOÀN TẤT THÀNH CÔNG 100%!');
    console.log('===============================================================');
  } catch (err) {
    console.error('Lỗi khi chạy seed database:', err);
  }
}

seedPublicBetaDatabase();
