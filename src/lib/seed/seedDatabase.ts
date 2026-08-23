import { supabase, isSupabaseConfigured } from '../supabase';

export async function seedDatabase() {
  if (!isSupabaseConfigured) {
    console.warn('Supabase is not configured with live credentials. Skipping seed.');
    return { success: false, message: 'Supabase not configured' };
  }

  try {
    console.log('🌱 Bắt đầu khởi tạo dữ liệu mẫu lên Supabase...');

    // 1. Seed Demo Profiles
    const demoProfiles = [
      {
        id: '11111111-1111-1111-1111-111111111111',
        full_name: 'Nguyễn Minh Anh',
        phone: '0987654321',
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face',
        role: 'user',
        onboarding_completed: true,
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        full_name: 'Trần Quốc Tuấn',
        phone: '0912345678',
        avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
        role: 'owner',
        owner_application_status: 'approved',
        owner_onboarding_completed: true,
      },
      {
        id: '33333333-3333-3333-3333-333333333333',
        full_name: 'Admin Trọ Xinh',
        phone: '1900888899',
        avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
        role: 'admin',
      },
    ];

    await supabase.from('profiles').upsert(demoProfiles, { onConflict: 'id' });

    // 2. Seed Buildings
    const b1Id = '44444444-4444-4444-4444-444444444441';
    const b2Id = '44444444-4444-4444-4444-444444444442';

    const demoBuildings = [
      {
        id: b1Id,
        owner_id: '22222222-2222-2222-2222-222222222222',
        name: 'Tòa Nhà Xanh Cầu Giấy (EcoHome)',
        address: 'Số 18, Ngõ 123 Xuân Thủy, Phường Dịch Vọng Hậu',
        district: 'Cầu Giấy',
        city: 'Hà Nội',
        lat: 21.0368,
        lng: 105.7825,
        description: 'Tòa nhà căn hộ mini dịch vụ cao cấp, đầy đủ PCCC thang thoát hiểm, khóa vân tay, thang máy tốc độ cao.',
        amenities: ['Thang máy', 'Khóa vân tay', 'Thang thoát hiểm PCCC', 'Camera an ninh', 'Nhà để xe rộng', 'Bảo vệ 24/7'],
        cover_image_url: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&h=800&fit=crop',
        status: 'active',
      },
      {
        id: b2Id,
        owner_id: '22222222-2222-2222-2222-222222222222',
        name: 'Chung Cư Mini Chùa Láng Elite',
        address: 'Số 56, Ngõ 185 Chùa Láng, Phường Láng Thượng',
        district: 'Đống Đa',
        city: 'Hà Nội',
        lat: 21.0227,
        lng: 105.8019,
        description: 'Vị trí đắc địa gần ĐH Ngoại Thương, ĐH Ngoại Giao, HV Phụ Nữ. Không chung chủ, giờ giấc tự do 100%.',
        amenities: ['Khóa cổng vân tay', 'Ban công thoáng mát', 'Máy giặt chung', 'Camera 24/7', 'Wifi tốc độ cao'],
        cover_image_url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&h=800&fit=crop',
        status: 'active',
      },
    ];

    await supabase.from('buildings').upsert(demoBuildings, { onConflict: 'id' });

    // 3. Seed Rooms & Images
    const demoRooms = [
      {
        id: '55555555-5555-5555-5555-555555555501',
        building_id: b1Id,
        owner_id: '22222222-2222-2222-2222-222222222222',
        name: 'Studio Ban Công Thoáng Sáng P.302',
        price: 4200000,
        area: 28,
        room_type: 'studio',
        amenities: ['Điều hòa Inverter', 'Nóng lạnh', 'Tủ lạnh 180L', 'Máy giặt riêng', 'Bếp từ đôi', 'Sofa & Bàn trà', 'Giường nệm cao su', 'Tủ quần áo 3 cánh'],
        description: 'Phòng Studio full nội thất mới 100%, có ban công đón ánh sáng tự nhiên. Đã nghiệm thu PCCC an toàn tuyệt đối.',
        status: 'available',
        moderation_status: 'approved',
        boost_type: 'vip',
      },
      {
        id: '55555555-5555-5555-5555-555555555502',
        building_id: b1Id,
        owner_id: '22222222-2222-2222-2222-222222222222',
        name: 'Căn Hộ 1N1K Khép Kín Cao Cấp P.401',
        price: 5500000,
        area: 36,
        room_type: 'apartment',
        amenities: ['Phòng ngủ riêng biệt', 'Điều hòa 2 chiều', 'Smart TV 43 inch', 'Tủ bếp trên dưới', 'Máy hút mùi', 'Tủ lạnh Side by Side'],
        description: 'Căn hộ 1 phòng ngủ 1 khách riêng biệt thích hợp cho gia đình trẻ hoặc nhóm 2-3 bạn sinh viên ở sạch sẽ.',
        status: 'available',
        moderation_status: 'approved',
      },
      {
        id: '55555555-5555-5555-5555-555555555503',
        building_id: b2Id,
        owner_id: '22222222-2222-2222-2222-222222222222',
        name: 'Phòng Đơn Ban Công View Hồ Chùa Láng P.202',
        price: 3300000,
        area: 22,
        room_type: 'single',
        amenities: ['Điều hòa', 'Nóng lạnh', 'Giường đệm', 'Tủ quần áo', 'Bàn học sinh viên', 'Cửa sổ lớn view hồ'],
        description: 'Phòng khép kín sạch sẽ, cách ĐH Ngoại Thương 200m đi bộ. Khu dân trí cao, an ninh tuyệt đối.',
        status: 'available',
        moderation_status: 'approved',
      },
    ];

    await supabase.from('rooms').upsert(demoRooms, { onConflict: 'id' });

    // Seed Room Images
    const demoImages = [
      {
        room_id: '55555555-5555-5555-5555-555555555501',
        url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&h=800&fit=crop',
        order_index: 0,
        is_cover: true,
      },
      {
        room_id: '55555555-5555-5555-5555-555555555501',
        url: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&h=800&fit=crop',
        order_index: 1,
        is_cover: false,
      },
      {
        room_id: '55555555-5555-5555-5555-555555555502',
        url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&h=800&fit=crop',
        order_index: 0,
        is_cover: true,
      },
      {
        room_id: '55555555-5555-5555-5555-555555555503',
        url: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200&h=800&fit=crop',
        order_index: 0,
        is_cover: true,
      },
    ];

    await supabase.from('room_images').upsert(demoImages, { onConflict: 'room_id,url' });

    console.log('✅ Seed Database hoàn tất thành công!');
    return { success: true, message: 'Database seeded successfully' };
  } catch (error: any) {
    console.error('Lỗi khi seed database:', error);
    return { success: false, error: error.message };
  }
}
