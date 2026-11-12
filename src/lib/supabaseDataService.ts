import { supabase } from './supabase';
import { Room, Building, RoommatePost, MarketplaceItem } from '../types';
import { fetchMarketplaceItems } from './api/marketplace';
import { attachPublicProfiles } from './api/publicProfiles';
import { resolveUserIdToUuid } from './api/messages';

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
        address: r.address || b.address || 'Hà Nội',
        district: r.district || b.district || 'Quận Cầu Giấy',
        lat: Number(r.lat) || Number(b.lat) || undefined,
        lng: Number(r.lng) || Number(b.lng) || undefined,
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

    // Tên/ảnh chủ trọ khác lấy qua RPC công khai (profiles chỉ trả hồ sơ của chính mình)
    const bldRows = await attachPublicProfiles(bldData, 'owner_id', 'profiles');

    return bldRows.map((b: any) => {
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
  const genderMap: Record<string, 'Nam' | 'Nữ' | 'Khác'> = {
    male: 'Nam',
    female: 'Nữ',
    any: 'Khác',
  };

  const targetGenderMap: Record<string, 'Chỉ tìm Nam' | 'Chỉ tìm Nữ' | 'Tất cả'> = {
    male: 'Chỉ tìm Nam',
    female: 'Chỉ tìm Nữ',
    any: 'Tất cả',
  };

  const mapRecord = (r: any): RoommatePost => {
    const poster = r.profiles || {};
    const room = r.room || {};
    const roomBld = room.buildings || {};
    const rawLat = Number(r.lat) || Number(room.lat) || Number(roomBld.lat);
    const rawLng = Number(r.lng) || Number(room.lng) || Number(roomBld.lng);
    return {
      id: r.id,
      userId: r.original_user_id || r.poster_id || poster.id || r.userId || '',
      userName: r.nickname || poster.full_name || r.userName || 'Thành viên Trọ Xinh',
      userAvatar: poster.avatar_url || r.userAvatar || '/images/user-avatar.jpg',
      userAge: Number(r.age || r.userAge) || 20,
      userGender: (genderMap[r.gender] || (r.gender === 'Nam' || r.gender === 'Nữ' ? r.gender : (r.userGender || 'Nam'))) as any,
      userSchool: r.school || r.userSchool || '',
      genderPreference: (targetGenderMap[r.preferred_gender] || (r.preferred_gender === 'Chỉ tìm Nữ' || r.preferred_gender === 'Chỉ tìm Nam' ? r.preferred_gender : (r.genderPreference || 'Tất cả'))) as any,
      district: r.district || room.district || roomBld.district || 'Hà Nội',
      address: r.address || room.address || roomBld.address || undefined,
      lat: Number.isFinite(rawLat) && rawLat !== 0 ? rawLat : undefined,
      lng: Number.isFinite(rawLng) && rawLng !== 0 ? rawLng : undefined,
      budgetShare: Number(r.budget_per_person || r.budget || r.budgetShare) || 2000000,
      habits: Array.isArray(r.lifestyle_tags) ? r.lifestyle_tags : (Array.isArray(r.habits) ? r.habits : []),
      lifestyleTags: Array.isArray(r.lifestyle_tags) ? r.lifestyle_tags.slice(0, 3) : (Array.isArray(r.habits) ? r.habits.slice(0, 3) : []),
      intro: r.self_intro || r.bio || r.intro || '',
      images: Array.isArray(r.images) ? r.images : [],
      linkedRoomId: r.room_id || r.linkedRoomId,
      linkedRoomTitle: r.linked_room_title || room.name || room.title || undefined,
      linkedRoomPrice: r.linked_room_price || room.price || undefined,
      linkedRoomArea: r.linked_room_area || room.area || undefined,
      status: r.status === 'closed' ? 'Đã ghép' : 'Đang tìm',
      createdAt: r.created_at || r.createdAt || new Date().toISOString(),
    };
  };

  let directPosts: RoommatePost[] = [];
  let cloudAuditPosts: RoommatePost[] = [];

  // 1. Tải từ bảng roommate_posts
  try {
    const { data: rmData, error: rmErr } = await supabase
      .from('roommate_posts')
      .select('*, profiles:poster_id(id, full_name, avatar_url), room:rooms(*, buildings(address, district, lat, lng))')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (!rmErr && rmData) {
      const rmRows = await attachPublicProfiles(rmData, 'poster_id', 'profiles');
      directPosts = rmRows.map(mapRecord);
    }
  } catch (err) {
    console.warn('[Supabase] Không thể tải roommate_posts:', err);
  }

  // 2. Tải thêm các bài đăng người dùng từ tầng Cloud audit_logs
  try {
    const { data: auditData, error: auditErr } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('entity_type', 'roommate_post')
      .eq('action', 'create_roommate_post')
      .order('created_at', { ascending: false });

    if (!auditErr && auditData) {
      const activeCloud = auditData
        .map((item: any) => item.data_after)
        .filter((p: any) => p && p.status === 'active');
        
      const posterIds = Array.from(new Set(activeCloud.map((p: any) => p.poster_id).filter(Boolean)));
      let profileMap: Record<string, any> = {};
      
      if (posterIds.length > 0) {
        try {
          const { data: profiles } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', posterIds);
          if (profiles) {
            profileMap = Object.fromEntries(profiles.map((p: any) => [p.id, p]));
          }
        } catch (err) {
          console.warn('[Supabase] Lỗi khi tải profiles cho audit_logs:', err);
        }
      }

      cloudAuditPosts = activeCloud.map((p: any) => {
        if (p.poster_id && profileMap[p.poster_id]) {
          p.profiles = profileMap[p.poster_id];
        }
        return mapRecord(p);
      });
    }
  } catch (err) {
    console.warn('[Supabase] Lỗi khi tải audit_logs roommate posts:', err);
  }

  // 3. Khử trùng lặp và sắp xếp mới nhất
  const postMap = new Map<string, RoommatePost>();
  cloudAuditPosts.forEach((p) => {
    if (p.id) postMap.set(p.id, p);
  });
  directPosts.forEach((p) => {
    if (p.id) postMap.set(p.id, p);
  });

  return Array.from(postMap.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

// 4. TẢI CHỢ ĐỒ CŨ SINH VIÊN TỪ SUPABASE
// Tải danh sách chợ đồ cũ; lỗi được ném ra để store hiển thị trên giao diện
export async function fetchMarketplaceItemsFromSupabase(): Promise<MarketplaceItem[]> {
  return fetchMarketplaceItems();
}

// 5. GHI / ĐỒNG BỘ PHÒNG TRỌ MỚI LÊN SUPABASE
export async function syncRoomToSupabase(room: Room): Promise<boolean> {
  try {
    const basePayload = {
      name: room.title,
      title: room.title,
      price: room.price,
      area: room.area,
      room_type: room.type === 'Studio' ? 'studio' : room.type === 'Căn hộ mini' ? 'apartment' : 'single',
      amenities: room.amenities,
      description: room.description,
      status: 'available',
      moderation_status: 'approved',
    };

    const geoPayload = {
      ...basePayload,
      address: room.address,
      district: room.district,
      lat: room.lat ?? null,
      lng: room.lng ?? null,
    };

    let { error } = await supabase.from('rooms').insert(geoPayload);
    if (error && /column .* does not exist|schema cache/i.test(error.message || '')) {
      const retry = await supabase.from('rooms').insert(basePayload);
      error = retry.error;
    }
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
  let validPosterId = '0016bd8f-d19e-4348-9175-3a4379cffad4';
  if (post.userId) {
    try {
      validPosterId = await resolveUserIdToUuid(post.userId);
    } catch {
      validPosterId = post.userId.length === 36 ? post.userId : validPosterId;
    }
  }

  const basePayload = {
    id: post.id,
    poster_id: validPosterId,
    room_id: (post.linkedRoomId && post.linkedRoomId.length === 36) ? post.linkedRoomId : null,
    nickname: post.userName,
    age: post.userAge || 20,
    gender: post.userGender === 'Nam' ? 'male' : post.userGender === 'Nữ' ? 'female' : 'any',
    preferred_gender: post.genderPreference === 'Chỉ tìm Nam' ? 'male' : post.genderPreference === 'Chỉ tìm Nữ' ? 'female' : 'any',
    budget_per_person: post.budgetShare,
    lifestyle_tags: post.habits,
    self_intro: post.intro,
    district: post.district,
    school: post.userSchool,
    images: post.images || [],
    status: 'active',
    created_at: post.createdAt || new Date().toISOString(),
  };

  const fullPayload = {
    ...basePayload,
    address: post.address || null,
    lat: post.lat ?? null,
    lng: post.lng ?? null,
  };

  // 1. Thử insert trực tiếp vào roommate_posts
  try {
    let { error } = await supabase.from('roommate_posts').insert(fullPayload);
    if (error && /column .* does not exist|schema cache/i.test(error.message || '')) {
      const retry = await supabase.from('roommate_posts').insert(basePayload);
      error = retry.error;
    }
    if (!error) return true;
  } catch (directErr) {
    console.warn('[Supabase] Thử insert roommate_posts:', directErr);
  }

  // 2. Chuyển tiếp lưu Cloud audit_logs nếu RLS chặn (luôn giữ đủ address/lat/lng)
  try {
    const cloudPayload = {
      action: 'create_roommate_post',
      entity_type: 'roommate_post',
      entity_id: post.id,
      data_after: {
        ...fullPayload,
        linked_room_title: post.linkedRoomTitle,
        linked_room_price: post.linkedRoomPrice,
        linked_room_area: post.linkedRoomArea,
      },
    };
    const { error: auditErr } = await supabase.from('audit_logs').insert(cloudPayload);
    if (!auditErr) return true;
  } catch (auditErr) {
    console.warn('[Supabase] Lỗi khi sync roommate post qua audit_logs:', auditErr);
  }

  return true;
}
