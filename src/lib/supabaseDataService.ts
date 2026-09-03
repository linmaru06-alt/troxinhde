import { supabase } from './supabase';
import { Room, Building, RoommatePost, MarketplaceItem } from '../types';

/**
 * ==============================================================================
 * DỊCH VỤ ĐỒNG BỘ DỮ LIỆU THỰC TẾ 2 CHIỀU SUPABASE CLOUD (TROXINH CLOUD DATA SERVICE)
 * ==============================================================================
 */

// 1. TẢI DANH SÁCH PHÒNG TRỌ TỪ SUPABASE
export async function fetchRoomsFromSupabase(): Promise<Room[]> {
  try {
    const { data: roomsData, error: roomsErr } = await supabase
      .from('rooms')
      .select('*, buildings(*), room_images(*), profiles:owner_id(*)')
      .order('created_at', { ascending: false });

    if (roomsErr) {
      console.warn('[Supabase] Không thể tải rooms:', roomsErr.message);
      return [];
    }

    if (!roomsData || roomsData.length === 0) return [];

    return roomsData.map((r: any) => {
      const b = r.buildings || {};
      const owner = r.profiles || {};
      const images = Array.isArray(r.room_images) && r.room_images.length > 0
        ? r.room_images.sort((x: any, y: any) => (x.order_index || 0) - (y.order_index || 0)).map((img: any) => img.url)
        : (Array.isArray(r.images) && r.images.length > 0 ? r.images : ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800']);

      const typeMap: Record<string, string> = {
        single: 'Phòng đơn',
        shared: 'Phòng ghép',
        studio: 'Studio',
        apartment: 'Căn hộ mini',
      };

      const statusMap: Record<string, string> = {
        available: 'Còn trống',
        rented: 'Đã cho thuê',
        hidden: 'Chờ duyệt',
      };

      return {
        id: r.id,
        buildingId: r.building_id || b.id || 'bld_1',
        buildingName: b.name || r.building_name || 'Tòa nhà Trọ Xinh',
        ownerId: r.owner_id || owner.id || 'user_owner_1',
        ownerName: owner.full_name || r.owner_name || 'Chủ trọ',
        ownerPhone: owner.phone || r.owner_phone || '',
        ownerAvatar: owner.avatar_url || r.owner_avatar || '/images/user-avatar.jpg',
        title: r.name || r.title || 'Phòng trọ cao cấp',
        roomNumber: r.room_number || '101',
        price: Number(r.price) || 0,
        deposit: Number(r.deposit || r.price) || 0,
        electricityPrice: Number(b.electricity_price || r.electricity_price) || 3500,
        waterPrice: Number(b.water_price || r.water_price) || 30000,
        area: Number(r.area) || 20,
        type: (typeMap[r.room_type] || r.type || 'Phòng đơn') as any,
        status: (statusMap[r.status] || (r.status === 'Còn trống' ? 'Còn trống' : 'Còn trống')) as any,
        verified: Boolean(r.moderation_status === 'approved' || r.verified),
        rejectionReason: r.rejection_reason || undefined,
        amenities: Array.isArray(r.amenities) ? r.amenities : [],
        images,
        distanceToSchoolKm: Number(r.distance_to_school_km) || 0.8,
        nearestSchool: r.nearest_school || 'Đại Học Quốc Gia Hà Nội',
        address: b.address || r.address || 'Hà Nội',
        district: b.district || r.district || 'Quận Cầu Giấy',
        description: r.description || '',
        views: Number(r.view_count || r.views) || 0,
        savedCount: Number(r.save_count || r.saved_count) || 0,
        isBoosted: Boolean(r.boost_type || r.is_boosted),
        boostExpiresAt: r.boost_expires_at || undefined,
        boostBadge: r.boost_type === 'vip' ? 'Đối Tác Vàng 5★' : r.boost_badge || undefined,
        createdAt: r.created_at || new Date().toISOString(),
      };
    });
  } catch (err) {
    console.error('[Supabase] Lỗi khi fetch rooms:', err);
    return [];
  }
}

// 2. TẢI DANH SÁCH TÒA NHÀ TỪ SUPABASE
export async function fetchBuildingsFromSupabase(): Promise<Building[]> {
  try {
    const { data: bldData, error: bldErr } = await supabase
      .from('buildings')
      .select('*, profiles:owner_id(*)')
      .order('created_at', { ascending: false });

    if (bldErr) {
      console.warn('[Supabase] Không thể tải buildings:', bldErr.message);
      return [];
    }

    if (!bldData || bldData.length === 0) return [];

    return bldData.map((b: any) => {
      const owner = b.profiles || {};
      const lat = Number(b.lat) || 21.0285;
      const lng = Number(b.lng) || 105.8542;
      return {
        id: b.id,
        ownerId: b.owner_id || owner.id || 'user_owner_1',
        ownerName: owner.full_name || b.owner_name || 'Chủ trọ',
        ownerPhone: owner.phone || b.owner_phone || '',
        ownerAvatar: owner.avatar_url || b.owner_avatar || '/images/user-avatar.jpg',
        name: b.name || 'Tòa nhà Trọ Xinh',
        address: b.address || '',
        district: b.district || 'Quận Cầu Giấy',
        city: b.city || 'Hà Nội',
        totalRooms: Number(b.total_rooms) || 12,
        availableRooms: Number(b.available_rooms) || 3,
        amenities: Array.isArray(b.amenities) ? b.amenities : ['Thang máy', 'Khóa vân tay', 'PCCC đạt chuẩn'],
        images: Array.isArray(b.images) && b.images.length > 0 ? b.images : [b.cover_image_url || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800'],
        verifiedBadge: Boolean(b.status === 'active'),
        rating: Number(b.rating) || 5.0,
        reviewCount: 12,
        description: b.description || 'Tòa nhà căn hộ dịch vụ và phòng trọ cao cấp, camera an ninh 24/7.',
        geo: {
          lat,
          lng,
        },
        nearbyUniversities: [
          { name: 'Đại Học Quốc Gia Hà Nội', distanceKm: 0.8 },
          { name: 'Đại Học Sư Phạm Hà Nội', distanceKm: 1.0 },
        ],
      };
    });
  } catch (err) {
    console.error('[Supabase] Lỗi khi fetch buildings:', err);
    return [];
  }
}

// 3. TẢI BÀI ĐĂNG TÌM BẠN Ở GHÉP TỪ SUPABASE
export async function fetchRoommatesFromSupabase(): Promise<RoommatePost[]> {
  try {
    const { data: rmData, error: rmErr } = await supabase
      .from('roommate_posts')
      .select('*, profiles:poster_id(*)')
      .order('created_at', { ascending: false });

    if (rmErr) {
      console.warn('[Supabase] Không thể tải roommate_posts:', rmErr.message);
      return [];
    }

    if (!rmData || rmData.length === 0) return [];

    const genderMap: Record<string, string> = {
      male: 'Nam',
      female: 'Nữ',
      any: 'Tất cả',
    };

    const targetGenderMap: Record<string, string> = {
      male: 'Chỉ tìm Nam',
      female: 'Chỉ tìm Nữ',
      any: 'Tất cả',
    };

    return rmData.map((r: any) => {
      const poster = r.profiles || {};
      return {
        id: r.id,
        userId: r.poster_id || poster.id || 'user_1',
        userName: r.nickname || poster.full_name || 'Thành viên Trọ Xinh',
        userAvatar: poster.avatar_url || '/images/user-avatar.jpg',
        userPhone: poster.phone || '0977112233',
        userAge: Number(r.age) || 21,
        userGender: (genderMap[r.gender] || r.gender || 'Nữ') as any,
        userSchool: r.school || 'Đại Học Hà Nội',
        genderPreference: (targetGenderMap[r.preferred_gender] || r.target_gender || 'Tất cả') as any,
        district: r.district || 'Quận Đống Đa',
        location: r.location || 'Hà Nội',
        budgetShare: Number(r.budget_per_person || r.budget) || 2000000,
        habits: Array.isArray(r.lifestyle_tags) ? r.lifestyle_tags : (Array.isArray(r.habits) ? r.habits : []),
        intro: r.self_intro || r.bio || 'Chào bạn, mình đang tìm bạn ở ghép vui vẻ hòa đồng.',
        images: Array.isArray(r.images) && r.images.length > 0 ? r.images : ['https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800'],
        createdAt: r.created_at || new Date().toISOString(),
      };
    });
  } catch (err) {
    console.error('[Supabase] Lỗi khi fetch roommate posts:', err);
    return [];
  }
}

// 4. TẢI CHỢ ĐỒ CŨ SINH VIÊN TỪ SUPABASE
export async function fetchMarketplaceItemsFromSupabase(): Promise<MarketplaceItem[]> {
  try {
    const { data: mkData, error: mkErr } = await supabase
      .from('marketplace_items')
      .select('*, profiles:seller_id(*)')
      .order('created_at', { ascending: false });

    if (mkErr) {
      console.warn('[Supabase] Không thể tải marketplace_items:', mkErr.message);
      return [];
    }

    if (!mkData || mkData.length === 0) return [];

    const categoryMap: Record<string, string> = {
      furniture: 'Nội thất',
      electronics: 'Đồ điện tử',
      books: 'Sách vở',
      household: 'Đồ gia dụng',
      other: 'Đồ gia dụng',
    };

    const conditionMap: Record<string, string> = {
      new90: 'Mới 99%',
      used: 'Còn dùng tốt',
      needs_repair: 'Đã qua sử dụng',
    };

    return mkData.map((m: any) => {
      const seller = m.profiles || {};
      const images = Array.isArray(m.image_urls) && m.image_urls.length > 0
        ? m.image_urls
        : (Array.isArray(m.images) && m.images.length > 0 ? m.images : ['https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800']);

      return {
        id: m.id,
        userId: m.seller_id || seller.id || 'user_1',
        userName: seller.full_name || m.user_name || 'Sinh viên Trọ Xinh',
        userPhone: seller.phone || m.user_phone || '0912889900',
        userAvatar: seller.avatar_url || '/images/user-avatar.jpg',
        name: m.title || m.name || 'Món đồ thanh lý',
        price: Number(m.price) || 0,
        pricingType: (m.is_free || m.price === 0 ? 'Miễn phí' : 'Giá rẻ') as any,
        category: (categoryMap[m.category] || m.category || 'Nội thất') as any,
        condition: (conditionMap[m.condition] || m.condition || 'Còn dùng tốt') as any,
        images,
        location: m.location || m.district || 'Hà Nội',
        district: m.district || 'Quận Cầu Giấy',
        description: m.description || '',
        createdAt: m.created_at || new Date().toISOString(),
      };
    });
  } catch (err) {
    console.error('[Supabase] Lỗi khi fetch marketplace items:', err);
    return [];
  }
}

// 5. GHI / ĐỒNG BỘ PHÒNG TRỌ MỚI LÊN SUPABASE
export async function syncRoomToSupabase(room: Room): Promise<boolean> {
  try {
    const payload = {
      name: room.title,
      price: room.price,
      area: room.area,
      room_type: room.type === 'Studio' ? 'studio' : room.type === 'Căn hộ mini' ? 'apartment' : 'single',
      amenities: room.amenities,
      description: room.description,
      status: 'available',
      moderation_status: 'pending',
    };

    const { error } = await supabase.from('rooms').insert(payload);
    if (error) {
      console.warn('[Supabase] Sync room error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Supabase] Lỗi khi sync room:', err);
    return false;
  }
}

// 6. GHI / ĐỒNG BỘ BÀI ĐĂNG TÌM BẠN Ở GHÉP LÊN SUPABASE
export async function syncRoommatePostToSupabase(post: RoommatePost): Promise<boolean> {
  try {
    const payload = {
      nickname: post.userName,
      age: post.userAge || 20,
      gender: post.userGender === 'Nam' ? 'male' : 'female',
      preferred_gender: post.genderPreference === 'Chỉ tìm Nam' ? 'male' : post.genderPreference === 'Chỉ tìm Nữ' ? 'female' : 'any',
      budget_per_person: post.budgetShare,
      lifestyle_tags: post.habits,
      self_intro: post.intro,
      status: 'active',
    };

    const { error } = await supabase.from('roommate_posts').insert(payload);
    if (error) {
      console.warn('[Supabase] Sync roommate post error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Supabase] Lỗi khi sync roommate post:', err);
    return false;
  }
}

// 7. GHI / ĐỒNG BỘ MÓN ĐỒ CHỢ SINH VIÊN LÊN SUPABASE
export async function syncMarketplaceItemToSupabase(item: MarketplaceItem): Promise<boolean> {
  try {
    const payload = {
      title: item.name,
      price: item.price,
      is_free: item.pricingType === 'Miễn phí',
      category: item.category === 'Đồ điện tử' ? 'electronics' : item.category === 'Sách vở' ? 'books' : 'furniture',
      condition: item.condition === 'Mới 99%' ? 'new90' : 'used',
      district: item.district,
      description: item.description,
      image_urls: item.images,
      status: 'available',
    };

    const { error } = await supabase.from('marketplace_items').insert(payload);
    if (error) {
      console.warn('[Supabase] Sync marketplace item error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Supabase] Lỗi khi sync marketplace item:', err);
    return false;
  }
}
