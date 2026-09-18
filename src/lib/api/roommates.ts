import { supabase, isSupabaseConfigured } from '../supabase';
import type { RoommatePost } from '../../types';

export function formatRoommatePost(r: any): RoommatePost {
  const poster = r.poster || r.profiles || {};
  const room = r.room || {};
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

  return {
    id: r.id,
    userId: r.poster_id || poster.id || '',
    userName: r.nickname || poster.full_name || 'Thành viên Trọ Xinh',
    userAvatar: poster.avatar_url || '/images/user-avatar.jpg',
    userAge: Number(r.age) || 20,
    userGender: genderMap[r.gender] || (r.gender === 'Nam' || r.gender === 'Nữ' ? r.gender : 'Nam'),
    userSchool: r.school || '',
    district: r.district || 'Hà Nội',
    budgetShare: Number(r.budget_per_person || r.budget) || 2000000,
    genderPreference: targetGenderMap[r.preferred_gender] || (r.preferred_gender === 'Chỉ tìm Nữ' || r.preferred_gender === 'Chỉ tìm Nam' ? r.preferred_gender : 'Tất cả'),
    habits: Array.isArray(r.lifestyle_tags) ? r.lifestyle_tags : (Array.isArray(r.habits) ? r.habits : []),
    lifestyleTags: Array.isArray(r.lifestyle_tags) ? r.lifestyle_tags.slice(0, 3) : [],
    intro: r.self_intro || r.bio || '',
    images: Array.isArray(r.images) ? r.images : [],
    linkedRoomId: r.room_id || room.id,
    linkedRoomTitle: room.name,
    linkedRoomPrice: room.price,
    linkedRoomArea: room.area,
    linkedRoomImage: roomImages[0],
    status: r.status === 'closed' ? 'Đã ghép' : 'Đang tìm',
    createdAt: r.created_at || new Date().toISOString(),
  };
}

export async function getRoommatePosts(district?: string): Promise<RoommatePost[]> {
  if (!isSupabaseConfigured) return [];

  // Bảo mật: Tuyệt đối không select cột phone của bảng profiles để tránh rò rỉ SĐT
  try {
    let query = supabase
      .from('roommate_posts')
      .select(`
        *,
        poster:profiles!poster_id(id, full_name, avatar_url),
        room:rooms(id, name, price, area, room_images(url))
      `)
      .eq('status', 'active');

    if (district && district !== 'Tất cả quận' && district !== 'Tất cả khu vực') {
      query = query.eq('district', district);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (!error && data) {
      return data.map(formatRoommatePost);
    }
  } catch (err) {
    console.warn('[Roommates API] Lỗi truy vấn getRoommatePosts:', err);
  }

  // Fallback an toàn nếu cột district chưa được migrate trên Supabase
  try {
    const { data, error } = await supabase
      .from('roommate_posts')
      .select(`
        *,
        poster:profiles!poster_id(id, full_name, avatar_url),
        room:rooms(id, name, price, area, room_images(url))
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (!error && data) {
      let results = data.map(formatRoommatePost);
      if (district && district !== 'Tất cả quận' && district !== 'Tất cả khu vực') {
        results = results.filter((p) => p.district === district);
      }
      return results;
    }
  } catch {}

  return [];
}

export async function getRoommatePostById(id: string): Promise<RoommatePost | null> {
  if (!isSupabaseConfigured) return null;

  // Bảo mật: Tuyệt đối không select cột phone của bảng profiles
  const { data, error } = await supabase
    .from('roommate_posts')
    .select(`
      *,
      poster:profiles!poster_id(id, full_name, avatar_url),
      room:rooms(id, name, price, area, room_images(url))
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return formatRoommatePost(data);
}

export async function createRoommatePost(postData: {
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
  school?: string;
  images?: string[];
}) {
  if (!isSupabaseConfigured) {
    return { id: `post_${Date.now()}`, ...postData, status: 'active', created_at: new Date().toISOString() };
  }

  // 1. Thử insert đầy đủ các cột mới
  const fullPayload = {
    poster_id: postData.poster_id,
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
  };

  const { data, error } = await supabase
    .from('roommate_posts')
    .insert(fullPayload)
    .select()
    .single();

  if (!error && data) return data;

  // 2. Nếu lỗi do Supabase chưa migrate các cột mới (school, district, images) -> Fallback insert các cột cơ bản
  if (error && error.message?.includes('does not exist')) {
    console.warn('[Roommate Post] Supabase chưa có cột mới, tự động fallback insert schema cơ bản:', error.message);
    const basicPayload = {
      poster_id: postData.poster_id,
      room_id: postData.room_id || null,
      nickname: postData.nickname,
      age: postData.age,
      gender: postData.gender,
      preferred_gender: postData.preferred_gender,
      budget_per_person: postData.budget_per_person,
      lifestyle_tags: postData.lifestyle_tags || [],
      self_intro: postData.self_intro,
      status: 'active',
    };
    const { data: fallbackData, error: fallbackErr } = await supabase
      .from('roommate_posts')
      .insert(basicPayload)
      .select()
      .single();

    if (fallbackErr) throw fallbackErr;
    return fallbackData;
  }

  if (error) throw error;
  return data;
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
