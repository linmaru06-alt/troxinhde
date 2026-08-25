import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://nanhmbnpihlaojbwfebb.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_qhWXgPWrnZoCRGppWt2ncQ_RLUx-AAg';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

async function seedPublicBetaDatabase() {
  console.log('🚀 BẮT ĐẦU ĐỒNG BỘ CƠ SỞ DỮ LIỆU CHUẨN PUBLIC BETA LÊN SUPABASE CLOUD...');

  try {
    // 1. Khởi tạo 3 Tài Khoản Demo (Admin, Chủ Trọ, Sinh Viên)
    console.log('1. Đang đồng bộ 3 tài khoản Demo...');
    const demoProfiles = [
      {
        firebase_uid: 'demo_admin_troxinh',
        full_name: 'Ban Quản Trị Trọ Xinh',
        name: 'Ban Quản Trị Trọ Xinh',
        email: 'admin@troxinh.vn',
        phone: '0888110789',
        app_role: 'admin',
        role: 'admin',
        is_demo_account: true,
        owner_application_status: 'approved',
        avatar_url: '/images/user-avatar.jpg',
      },
      {
        firebase_uid: 'demo_owner_troxinh',
        full_name: 'Trần Quốc Tuấn (Chủ Trọ)',
        name: 'Trần Quốc Tuấn (Chủ Trọ)',
        email: 'chutro@troxinh.vn',
        phone: '0912345678',
        app_role: 'owner',
        role: 'owner',
        is_demo_account: true,
        owner_application_status: 'approved',
        avatar_url: '/images/user-avatar.jpg',
      },
      {
        firebase_uid: 'demo_renter_troxinh',
        full_name: 'Nguyễn Văn An (Người Thuê)',
        name: 'Nguyễn Văn An (Người Thuê)',
        email: 'nguoithue@troxinh.vn',
        phone: '0988110789',
        app_role: 'renter',
        role: 'renter',
        is_demo_account: true,
        owner_application_status: 'none',
        avatar_url: '/images/user-avatar.jpg',
      },
    ];

    const { data: upsertedProfiles, error: profileErr } = await supabase
      .from('profiles')
      .upsert(demoProfiles, { onConflict: 'firebase_uid' })
      .select();

    if (profileErr) {
      console.warn('Lỗi khi upsert profiles:', profileErr.message);
    } else {
      console.log(`✅ Đã đồng bộ ${upsertedProfiles?.length || 3} hồ sơ tài khoản demo.`);
    }

    const ownerProfile = upsertedProfiles?.find((p) => p.firebase_uid === 'demo_owner_troxinh') || upsertedProfiles?.[0];
    const ownerId = ownerProfile?.id;

    if (!ownerId) {
      console.error('Không tìm thấy Owner ID để tạo tòa nhà và phòng.');
      return;
    }

    // 2. Đồng bộ Tòa Nhà (Buildings)
    console.log('2. Đang đồng bộ Tòa nhà...');
    const sampleBuildings = [
      {
        owner_id: ownerId,
        name: 'Tòa Nhà TroXinh Cầu Giấy Complex',
        address: 'Số 18 Ngõ 165 Cầu Giấy, P. Dịch Vọng',
        district: 'Quận Cầu Giấy',
        city: 'Hà Nội',
        lat: 21.0368,
        lng: 105.7905,
        total_rooms: 16,
        electricity_price: 3500,
        water_price: 100000,
        amenities: ['Thang máy', 'Khóa vân tay', 'PCCC đạt chuẩn', 'Để xe miễn phí', 'Camera an ninh'],
        images: ['https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800'],
        status: 'active',
      },
      {
        owner_id: ownerId,
        name: 'Chung Cư Mini Đống Đa - Chùa Láng',
        address: 'Số 82 Chùa Láng, P. Láng Thượng',
        district: 'Quận Đống Đa',
        city: 'Hà Nội',
        lat: 21.0227,
        lng: 105.8023,
        total_rooms: 12,
        electricity_price: 3800,
        water_price: 100000,
        amenities: ['Thang máy', 'Bếp riêng', 'Ban công thoáng', 'Khóa vân tay', 'Giờ giấc tự do'],
        images: ['https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800'],
        status: 'active',
      },
    ];

    const { data: bldData, error: bldErr } = await supabase
      .from('buildings')
      .upsert(sampleBuildings, { onConflict: 'name' })
      .select();

    if (bldErr) {
      console.warn('Lỗi khi sync buildings:', bldErr.message);
    } else {
      console.log(`✅ Đã đồng bộ ${bldData?.length || 2} tòa nhà.`);
    }

    const bldId1 = bldData?.[0]?.id;
    const bldId2 = bldData?.[1]?.id || bldId1;

    // 3. Đồng bộ Phòng Trọ (Rooms)
    console.log('3. Đang đồng bộ Phòng trọ...');
    if (bldId1) {
      const sampleRooms = [
        {
          building_id: bldId1,
          owner_id: ownerId,
          title: 'Phòng Studio Full Đồ Ban Công Thoáng Mát Cầu Giấy',
          name: 'Phòng Studio Full Đồ Ban Công Thoáng Mát Cầu Giấy',
          room_number: '201',
          price: 3500000,
          deposit: 3500000,
          electricity_price: 3500,
          water_price: 100000,
          area: 25,
          room_type: 'Studio',
          amenities: ['Điều hòa Inverter', 'Nóng lạnh', 'Tủ lạnh', 'Máy giặt chung', 'Ban công thoáng', 'Khóa vân tay', 'Thang máy'],
          description: 'Phòng trọ cao cấp thiết kế hiện đại, đầy đủ tiện nghi, view thoáng mát, cách ĐHQG và ĐH Sư Phạm 800m.',
          moderation_status: 'approved',
          availability_status: 'available',
          images: [
            'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
            'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
          ],
          is_boosted: true,
          boost_badge: 'Tin Nổi Bật',
        },
        {
          building_id: bldId2,
          owner_id: ownerId,
          title: 'Căn Hộ Mini Khép Kín Gần ĐH Ngoại Thương',
          name: 'Căn Hộ Mini Khép Kín Gần ĐH Ngoại Thương',
          room_number: '302',
          price: 4200000,
          deposit: 4200000,
          electricity_price: 3800,
          water_price: 100000,
          area: 32,
          room_type: 'Căn hộ mini',
          amenities: ['Điều hòa Inverter', 'Nóng lạnh', 'Tủ bếp riêng', 'Máy giặt riêng', 'Giường nệm cao cấp', 'PCCC chuẩn'],
          description: 'Căn hộ mini cao cấp cách cổng trường Ngoại Thương và Ngoại Giao 500m. Thiết kế bếp riêng biệt không ám mùi, giờ giấc tự do.',
          moderation_status: 'approved',
          availability_status: 'available',
          images: [
            'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800',
            'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
          ],
          is_boosted: false,
        },
      ];

      const { data: roomData, error: roomErr } = await supabase
        .from('rooms')
        .upsert(sampleRooms, { onConflict: 'title' })
        .select();

      if (roomErr) {
        console.warn('Lỗi khi sync rooms:', roomErr.message);
      } else {
        console.log(`✅ Đã đồng bộ ${roomData?.length || 2} phòng trọ.`);
      }
    }

    console.log('🎉 ĐỒNG BỘ CƠ SỞ DỮ LIỆU PUBLIC BETA HOÀN TẤT THÀNH CÔNG!');
  } catch (err) {
    console.error('Lỗi khi chạy seed database:', err);
  }
}

seedPublicBetaDatabase();
