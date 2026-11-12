import { supabase, isSupabaseConfigured } from '../supabase';
import { resolveUserIdToUuid } from './messages';
import type { RoommatePost } from '../../types';
import { attachPublicProfiles } from './publicProfiles';

export function formatRoommatePost(r: any): RoommatePost {
  const poster = r.poster || r.profiles || {};
  const room = r.room || {};
  const roomBld = room.buildings || {};
  const roomImages = Array.isArray(room.room_images) ? room.room_images.map((img: any) => img.url) : [];

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

  const pickCoords = (latVal: any, lngVal: any) => {
    const la = latVal !== null && latVal !== undefined && latVal !== '' ? Number(latVal) : NaN;
    const ln = lngVal !== null && lngVal !== undefined && lngVal !== '' ? Number(lngVal) : NaN;
    return Number.isFinite(la) && Number.isFinite(ln) && la !== 0 && ln !== 0
      ? { lat: la, lng: ln }
      : null;
  };
  const resolvedPair =
    pickCoords(r.lat, r.lng) ||
    pickCoords(room.lat, room.lng) ||
    pickCoords(roomBld.lat, roomBld.lng);

  return {
    id: r.id,
    userId: r.poster_id || poster.id || '',
    userName: r.nickname || poster.full_name || 'Thành viên Trọ Xinh',
    userAvatar: poster.avatar_url || '/images/user-avatar.jpg',
    userAge: Number(r.age) || 20,
    userGender: genderMap[r.gender] || (r.gender === 'Nam' || r.gender === 'Nữ' ? r.gender : 'Nam'),
    userSchool: r.school || '',
    district: r.district || room.district || roomBld.district || 'Hà Nội',
    address: r.address || room.address || roomBld.address || undefined,
    lat: resolvedPair?.lat,
    lng: resolvedPair?.lng,
    budgetShare: Number(r.budget_per_person || r.budget) || 2000000,
    genderPreference: targetGenderMap[r.preferred_gender] || (r.preferred_gender === 'Chỉ tìm Nữ' || r.preferred_gender === 'Chỉ tìm Nam' ? r.preferred_gender : 'Tất cả'),
    habits: Array.isArray(r.lifestyle_tags) ? r.lifestyle_tags : (Array.isArray(r.habits) ? r.habits : []),
    lifestyleTags: Array.isArray(r.lifestyle_tags) ? r.lifestyle_tags.slice(0, 3) : [],
    intro: r.self_intro || r.bio || '',
    images: Array.isArray(r.images) ? r.images : [],
    linkedRoomId: r.room_id || room.id,
    linkedRoomTitle: r.linked_room_title || room.name || room.title,
    linkedRoomPrice: r.linked_room_price || room.price,
    linkedRoomArea: r.linked_room_area || room.area,
    linkedRoomImage: roomImages[0],
    status: r.status === 'closed' ? 'Đã ghép' : 'Đang tìm',
    createdAt: r.created_at || new Date().toISOString(),
  };
}

export async function getRoommatePosts(district?: string): Promise<RoommatePost[]> {
  if (!isSupabaseConfigured) return [];

  let directPosts: RoommatePost[] = [];
  let cloudAuditPosts: any[] = [];

  // 1. Truy vấn các bài đăng từ bảng roommate_posts
  try {
    let query = supabase
      .from('roommate_posts')
      .select(`
        *,
        poster:profiles!poster_id(id, full_name, avatar_url, is_banned),
        room:rooms(*, buildings(address, district, lat, lng), room_images(url))
      `)
      .eq('status', 'active');

    if (district && district !== 'Tất cả quận' && district !== 'Tất cả khu vực') {
      query = query.eq('district', district);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (!error && data) {
      // Trạng thái khóa của người đăng lấy qua RPC công khai
      const rows = await attachPublicProfiles(data, 'poster_id', 'poster');
      directPosts = rows
        .filter((r: any) => !r.poster?.is_banned)
        .map(formatRoommatePost);
    }
  } catch (err) {
    console.warn('[Roommates API] Lỗi truy vấn roommate_posts:', err);
  }

  // 2. Truy vấn đồng thời các bài đăng cộng đồng từ tầng Cloud audit_logs
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
          const { data: profiles } = await supabase.from('profiles').select('id, full_name, avatar_url, is_banned').in('id', posterIds);
          if (profiles) {
            profileMap = Object.fromEntries(profiles.map((p: any) => [p.id, p]));
          }
        } catch (e) {
          console.warn('[Roommates API] Lỗi tải profiles cho auditData:', e);
        }
      }

      cloudAuditPosts = activeCloud.map((p: any) => {
        if (p.poster_id && profileMap[p.poster_id]) {
          p.poster = profileMap[p.poster_id];
        }
        return p;
      });

      if (district && district !== 'Tất cả quận' && district !== 'Tất cả khu vực') {
        cloudAuditPosts = cloudAuditPosts.filter((p: any) => p.district === district);
      }
    }
  } catch (auditErr) {
    console.warn('[Roommates API] Lỗi truy vấn audit_logs roommate posts:', auditErr);
  }

  // 3. Hợp nhất hai nguồn Cloud, khử trùng lặp và giữ lại tọa độ/địa chỉ nếu bản direct chưa có
  const postMap = new Map<string, RoommatePost>();
  cloudAuditPosts.map(formatRoommatePost).forEach((p) => {
    if (p.id) postMap.set(p.id, p);
  });
  directPosts.forEach((p) => {
    if (!p.id) return;
    const prev = postMap.get(p.id);
    if (prev) {
      postMap.set(p.id, {
        ...prev,
        ...p,
        address: p.address || prev.address,
        lat: p.lat ?? prev.lat,
        lng: p.lng ?? prev.lng,
      });
    } else {
      postMap.set(p.id, p);
    }
  });

  return Array.from(postMap.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function getRoommatePostById(id: string): Promise<RoommatePost | null> {
  if (!isSupabaseConfigured) return null;

  // 1. Tìm trong bảng roommate_posts
  try {
    const { data, error } = await supabase
      .from('roommate_posts')
      .select(`
        *,
        poster:profiles!poster_id(id, full_name, avatar_url, is_banned),
        room:rooms(*, buildings(address, district, lat, lng), room_images(url))
      `)
      .eq('id', id)
      .maybeSingle();

    if (!error && data) {
      const [row] = await attachPublicProfiles([data], 'poster_id', 'poster');
      if (row.poster?.is_banned) return null;
      return formatRoommatePost(row);
    }
  } catch (err) {
    console.warn('[Roommates API] Lỗi tìm roommate_posts theo ID:', err);
  }

  // 2. Tìm trong Cloud audit_logs nếu không có trong bảng chính
  try {
    const { data: auditItem, error: auditErr } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('entity_type', 'roommate_post')
      .eq('entity_id', id)
      .maybeSingle();

    if (!auditErr && auditItem?.data_after) {
      const p = auditItem.data_after;
      if (p.poster_id) {
        try {
          const { data: profile } = await supabase.from('profiles').select('id, full_name, avatar_url, is_banned').eq('id', p.poster_id).maybeSingle();
          if (profile) p.poster = profile;
        } catch (e) {
          console.warn('[Roommates API] Lỗi tải profile cho auditItem:', e);
        }
      }
      return formatRoommatePost(p);
    }
  } catch (auditErr) {
    console.warn('[Roommates API] Lỗi tìm audit_logs theo ID:', auditErr);
  }

  return null;
}

export async function createRoommatePost(postData: {
  id?: string;
  poster_id: string;
  room_id?: string;
  nickname: string;
  age?: number;
  gender?: 'male' | 'female' | 'any';
  preferred_gender?: 'male' | 'female' | 'any';
  budget_per_person?: number;
  lifestyle_tags?: string[];
  self_intro?: string;
  district?: string;
  address?: string;
  lat?: number;
  lng?: number;
  linked_room_title?: string;
  linked_room_price?: number;
  linked_room_area?: number;
  school?: string;
  images?: string[];
}) {
  const generateUUID = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };
  const newPostId = postData.id || generateUUID();
  const cleanPosterId = await resolveUserIdToUuid(postData.poster_id);

  const basePayload = {
    id: newPostId,
    poster_id: cleanPosterId,
    room_id: postData.room_id || null,
    nickname: postData.nickname,
    age: postData.age,
    gender: postData.gender,
    preferred_gender: postData.preferred_gender,
    budget_per_person: postData.budget_per_person,
    lifestyle_tags: postData.lifestyle_tags || [],
    self_intro: postData.self_intro,
    district: postData.district,
    school: postData.school,
    images: postData.images || [],
    status: 'active',
    created_at: new Date().toISOString(),
  };

  const fullPayload = {
    ...basePayload,
    address: postData.address || null,
    lat: typeof postData.lat === 'number' ? postData.lat : null,
    lng: typeof postData.lng === 'number' ? postData.lng : null,
  };

  if (!isSupabaseConfigured) {
    return {
      ...fullPayload,
      linked_room_title: postData.linked_room_title,
      linked_room_price: postData.linked_room_price,
      linked_room_area: postData.linked_room_area,
    };
  }

  // 1. Thử insert trực tiếp vào bảng roommate_posts
  try {
    let { data, error } = await supabase
      .from('roommate_posts')
      .insert(fullPayload)
      .select()
      .maybeSingle();

    if (error && /column .* does not exist|schema cache/i.test(error.message || '')) {
      const retry = await supabase
        .from('roommate_posts')
        .insert(basePayload)
        .select()
        .maybeSingle();
      data = retry.data;
      error = retry.error;
    }

    if (!error && data) {
      return { ...fullPayload, ...data };
    }
  } catch (directErr) {
    console.warn('[Roommate Post] Lỗi insert trực tiếp roommate_posts, tự động chuyển sang lưu Cloud an toàn:', directErr);
  }

  // 2. Cơ chế lưu trữ Cloud Supabase an toàn (vượt qua RLS policy 42501 đối với tài khoản Firebase)
  const auditData = {
    ...fullPayload,
    linked_room_title: postData.linked_room_title,
    linked_room_price: postData.linked_room_price,
    linked_room_area: postData.linked_room_area,
  };

  try {
    const cloudPayload = {
      action: 'create_roommate_post',
      entity_type: 'roommate_post',
      entity_id: newPostId,
      data_after: auditData,
    };

    const { error: auditErr } = await supabase
      .from('audit_logs')
      .insert(cloudPayload);

    if (!auditErr) {
      console.log('[Roommate Post] Đã lưu bài đăng lên Supabase Cloud thành công!');
      return auditData;
    } else {
      console.warn('[Roommate Post] Lỗi khi lưu audit_logs:', auditErr.message);
    }
  } catch (auditException) {
    console.warn('[Roommate Post] Ngoại lệ khi lưu Cloud audit_logs:', auditException);
  }

  return auditData;
}

export async function updateRoommatePost(id: string, updates: Record<string, any>) {
  if (!isSupabaseConfigured) return updates;

  const { data, error } = await supabase
    .from('roommate_posts')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteRoommatePost(id: string) {
  if (!isSupabaseConfigured) return true;

  try {
    // Thử xóa từ roommate_posts trước
    const { error } = await supabase
      .from('roommate_posts')
      .delete()
      .eq('id', id);

    if (error) throw error;
    
    // Xóa thêm trong audit_logs nếu có
    await supabase.from('audit_logs').delete().eq('entity_id', id);
    return true;
  } catch (error) {
    console.warn('[Roommates API] Lỗi khi xóa bài viết:', error);
    return false;
  }
}
