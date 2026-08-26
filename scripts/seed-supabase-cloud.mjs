import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://nanhmbnpihlaojbwfebb.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function seedCloudDatabase() {
  console.log('🚀 BẮT ĐẦU ĐỒNG BỘ CƠ SỞ DỮ LIỆU CHUẨN POSTGRESQL LÊN SUPABASE CLOUD...');

  try {
    // 1. Get or setup owner profile
    let { data: profiles } = await supabase.from('profiles').select('id, role').limit(2);
    let ownerProfileId = profiles && profiles[0] ? profiles[0].id : null;

    if (!ownerProfileId) {
      console.log('Chưa có profile trong CSDL.');
      return;
    }

    // Upgrade profile to owner
    await supabase.from('profiles').update({
      role: 'owner',
      full_name: 'Trần Quốc Tuấn',
      phone: '0912345678',
      owner_application_status: 'approved'
    }).eq('id', ownerProfileId);
    console.log('✅ Đã cấu hình profile chủ trọ:', ownerProfileId);

    // 2. Seed Buildings
    const sampleBuildings = [
      {
        owner_id: ownerProfileId,
        name: 'Tòa Nhà TroXinh Cầu Giấy Complex',
        address: 'Số 18 Ngõ 165 Cầu Giấy, P. Dịch Vọng',
        district: 'Quận Cầu Giấy',
        city: 'Hà Nội',
        lat: 21.0368,
        lng: 105.7905,
        description: 'Tòa nhà căn hộ dịch vụ và phòng trọ cao cấp, camera an ninh 24/7, thang máy, khóa vân tay.',
        amenities: ['Thang máy', 'Khóa vân tay', 'PCCC đạt chuẩn', 'Để xe miễn phí'],
        cover_image_url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800',
        status: 'active'
      },
      {
        owner_id: ownerProfileId,
        name: 'Chung Cư Mini Đống Đa - Chùa Láng',
        address: 'Số 82 Chùa Láng, P. Láng Thượng',
        district: 'Quận Đống Đa',
        city: 'Hà Nội',
        lat: 21.0227,
        lng: 105.8023,
        description: 'Chung cư mini cao cấp gần ĐH Ngoại Thương, ĐH Luật, Ngoại Giao. Giờ giấc tự do 100%.',
        amenities: ['Thang máy', 'Bếp riêng', 'Ban công thoáng', 'Khóa vân tay'],
        cover_image_url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800',
        status: 'active'
      }
    ];

    const { data: bldData, error: bldErr } = await supabase.from('buildings').insert(sampleBuildings).select();
    if (bldErr) {
      console.warn('Lỗi khi sync buildings:', bldErr.message);
    } else {
      console.log(`✅ Đã đồng bộ ${bldData.length} tòa nhà lên Supabase Cloud.`);
    }

    const bldId1 = bldData && bldData[0] ? bldData[0].id : null;
    const bldId2 = bldData && bldData[1] ? bldData[1].id : bldId1;

    // 3. Seed Rooms
    if (bldId1) {
      const sampleRooms = [
        {
          building_id: bldId1,
          owner_id: ownerProfileId,
          name: 'Phòng Studio Full Đồ Ban Công Thoáng Mát Cầu Giấy',
          price: 3500000,
          area: 25,
          room_type: 'studio',
          amenities: ['Điều hòa Inverter', 'Nóng lạnh', 'Tủ lạnh', 'Máy giặt chung', 'Ban công thoáng', 'Khóa vân tay', 'Thang máy'],
          description: 'Phòng trọ cao cấp thiết kế hiện đại, đầy đủ tiện nghi, view thoáng mát, cách ĐHQG và ĐH Sư Phạm 800m.',
          status: 'available',
          moderation_status: 'approved',
          view_count: 142,
          save_count: 28,
          boost_type: 'vip'
        },
        {
          building_id: bldId2 || bldId1,
          owner_id: ownerProfileId,
          name: 'Căn Hộ Mini Khép Kín Gần ĐH Ngoại Thương',
          price: 4200000,
          area: 32,
          room_type: 'apartment',
          amenities: ['Điều hòa Inverter', 'Nóng lạnh', 'Tủ bếp riêng', 'Máy giặt riêng', 'Giường nệm cao cấp', 'PCCC chuẩn'],
          description: 'Căn hộ mini cao cấp cách cổng trường Ngoại Thương và Ngoại Giao 500m. Thiết kế bếp riêng biệt không ám mùi, giờ giấc tự do.',
          status: 'available',
          moderation_status: 'approved',
          view_count: 210,
          save_count: 45,
          boost_type: 'vip'
        }
      ];

      const { data: roomData, error: roomErr } = await supabase.from('rooms').insert(sampleRooms).select();
      if (roomErr) {
        console.warn('Lỗi khi sync rooms:', roomErr.message);
      } else {
        console.log(`✅ Đã đồng bộ ${roomData.length} phòng trọ lên Supabase Cloud.`);
        // Seed room images
        for (const r of roomData) {
          await supabase.from('room_images').insert([
            { room_id: r.id, url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800', is_cover: true, order_index: 0 },
            { room_id: r.id, url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800', is_cover: false, order_index: 1 }
          ]);
        }
        console.log('✅ Đã đồng bộ album ảnh phòng trọ lên Supabase Cloud.');
      }
    }

    // 4. Seed Roommate Posts
    const sampleRoommates = [
      {
        poster_id: ownerProfileId,
        nickname: 'Nguyễn Thùy Linh',
        age: 21,
        gender: 'female',
        preferred_gender: 'female',
        budget_per_person: 2000000,
        lifestyle_tags: ['Không hút thuốc', 'Giữ vệ sinh sạch sẽ', 'Ngủ trước 23h', 'Nấu ăn tại nhà'],
        self_intro: 'Chào bạn! Mình là sinh viên năm 3 FTU, tính tình vui vẻ, hòa đồng, sạch sẽ. Mình đang cần tìm 1 bạn nữ ở ghép để share tiền phòng căn hộ mini 4tr/tháng.',
        status: 'active'
      },
      {
        poster_id: ownerProfileId,
        nickname: 'Trần Minh Đức',
        age: 20,
        gender: 'male',
        preferred_gender: 'male',
        budget_per_person: 1800000,
        lifestyle_tags: ['Không hút thuốc', 'Yên tĩnh học bài', 'Không ồn ào đêm', 'Trung thực'],
        self_intro: 'Mình là sinh viên IT Bách Khoa K67. Cần tìm 1 bạn nam ở ghép phòng studio gần trường để tiện đi bộ đi học.',
        status: 'active'
      }
    ];

    const { data: rmData, error: rmErr } = await supabase.from('roommate_posts').insert(sampleRoommates).select();
    if (rmErr) {
      console.warn('Lỗi khi sync roommate_posts:', rmErr.message);
    } else {
      console.log(`✅ Đã đồng bộ ${rmData.length} bài đăng tìm bạn ghép lên Supabase Cloud.`);
    }

    // 5. Seed Marketplace Items
    const sampleMarketItems = [
      {
        seller_id: ownerProfileId,
        title: 'Tủ Lạnh Mini Electrolux 92 Lít Còn Mới 95%',
        price: 850000,
        is_free: false,
        category: 'electronics',
        condition: 'new90',
        district: 'Quận Cầu Giấy',
        description: 'Tủ lạnh mini tiết kiệm điện dùng tốt, làm đá nhanh. Mình chuyển trọ nên pass lại cho bạn sinh viên nào cần.',
        image_urls: ['https://images.unsplash.com/photo-1584992236310-6edddc08acff?w=800'],
        status: 'available'
      },
      {
        seller_id: ownerProfileId,
        title: 'Tặng Miễn Phí Bàn Học Gấp Gọn + Đệm Đơn Sinh Viên 0đ',
        price: 0,
        is_free: true,
        category: 'furniture',
        condition: 'used',
        district: 'Quận Đống Đa',
        description: 'Mình tốt nghiệp về quê nên tặng lại bàn học gấp và đệm bông ép cho bạn tân sinh viên nào cần qua tự chở nhé!',
        image_urls: ['https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=800'],
        status: 'available'
      }
    ];

    const { data: mkData, error: mkErr } = await supabase.from('marketplace_items').insert(sampleMarketItems).select();
    if (mkErr) {
      console.warn('Lỗi khi sync marketplace_items:', mkErr.message);
    } else {
      console.log(`✅ Đã đồng bộ ${mkData.length} món đồ chợ sinh viên lên Supabase Cloud.`);
    }

    console.log('🎉 ĐỒNG BỘ DỮ LIỆU LÊN SUPABASE CLOUD THÀNH CÔNG RỰC RỠ 100%!');
  } catch (err) {
    console.error('❌ Lỗi khi seed cloud database:', err);
  }
}

seedCloudDatabase();
