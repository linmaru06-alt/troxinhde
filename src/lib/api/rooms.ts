import { resolveUserIdToUuid } from './messages';
import { supabase, isSupabaseConfigured } from '../supabase';

export interface RoomFilters {
  district?: string;
  minPrice?: number;
  maxPrice?: number;
  roomType?: string;
  amenities?: string[];
  searchQuery?: string;
  status?: string;
}

export async function getRooms(filters?: RoomFilters) {
  if (!isSupabaseConfigured) {
    return [];
  }

  let query = supabase
    .from('rooms')
    .select(`
      id,
      title,
      room_number,
      room_type,
      price,
      deposit,
      area,
      floor,
      status,
      availability_status,
      moderation_status,
      images,
      amenities,
      is_boosted,
      boost_badge,
      created_at,
      owner_id,
      owner_name,
      owner_avatar,
      owner_phone,
      show_phone,
      buildings(id, name, district, address, lat, lng, electricity_price, water_price)
    `)
    .eq('moderation_status', 'approved')
    .neq('availability_status', 'rented');

  if (filters?.district && filters.district !== 'Tất cả quận') {
    query = query.eq('buildings.district', filters.district);
  }
  if (filters?.minPrice) {
    query = query.gte('price', filters.minPrice);
  }
  if (filters?.maxPrice) {
    query = query.lte('price', filters.maxPrice);
  }
  if (filters?.roomType && filters.roomType !== 'Tất cả') {
    query = query.eq('room_type', filters.roomType);
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  
  return (data || []).map((r: any) => ({
    ...r,
    profiles: {
      id: r.owner_id,
      full_name: r.owner_name || 'Chủ trọ',
      avatar_url: r.owner_avatar || '/images/user-avatar.jpg',
      phone: r.owner_phone || '',
      app_role: 'owner',
    },
  }));
}

export async function getRoomById(id: string) {
  if (!isSupabaseConfigured) return null;

  const { data, error } = await supabase
    .from('rooms')
    .select(`
      *,
      buildings(*)
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    ...data,
    profiles: {
      id: data.owner_id,
      full_name: data.owner_name || data.profiles?.full_name || 'Chủ trọ',
      avatar_url: data.owner_avatar || data.profiles?.avatar_url || '/images/user-avatar.jpg',
      phone: data.owner_phone || data.profiles?.phone || '',
      app_role: 'owner',
    },
  };
}

export async function createRoom(roomData: {
  building_id: string;
  owner_id: string;
  title: string;
  name?: string;
  room_number?: string;
  price: number;
  deposit?: number;
  electricity_price?: number;
  water_price?: number;
  area: number;
  room_type: string;
  amenities?: string[];
  description?: string;
  images?: string[];
  show_phone?: boolean;
}) {
  if (!isSupabaseConfigured) {
    return { id: `room_${Date.now()}`, ...roomData };
  }

  const roomTitle = roomData.title || roomData.name || 'Phòng trọ mới';
  const cleanOwnerId = await resolveUserIdToUuid(roomData.owner_id);

  // Đảm bảo building_id là UUID hợp lệ
  let cleanBuildingId = roomData.building_id;
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!cleanBuildingId || !UUID_REGEX.test(cleanBuildingId.trim())) {
    try {
      const { data: bld } = await supabase.from('buildings').select('id').limit(1).maybeSingle();
      cleanBuildingId = bld?.id || 'b0000000-0000-0000-0000-000000000001';
    } catch {
      cleanBuildingId = 'b0000000-0000-0000-0000-000000000001';
    }
  }

  const imagesList = roomData.images && roomData.images.length > 0
    ? roomData.images
    : ['https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800'];

  const { data: room, error } = await supabase
    .from('rooms')
    .insert({
      building_id: cleanBuildingId,
      owner_id: cleanOwnerId,
      title: roomTitle,
      name: roomTitle,
      room_number: roomData.room_number || '101',
      price: roomData.price,
      deposit: roomData.deposit || 0,
      electricity_price: roomData.electricity_price || 3500,
      water_price: roomData.water_price || 100000,
      area: roomData.area,
      room_type: roomData.room_type,
      amenities: roomData.amenities || [],
      description: roomData.description || '',
      images: imagesList,
      moderation_status: 'pending',
      status: 'available',
      availability_status: 'available',
    })
    .select()
    .single();

  if (error) {
    console.error('[RoomsAPI] Lỗi khi tạo phòng trên Supabase:', error);
    throw error;
  }

  // Tự động đồng bộ vào bảng room_images
  if (room?.id && imagesList.length > 0) {
    try {
      const imageRecords = imagesList.map((url, idx) => ({
        room_id: room.id,
        url,
        order_index: idx,
        is_cover: idx === 0,
      }));
      await supabase.from('room_images').insert(imageRecords);
    } catch (imgErr) {
      console.warn('[RoomsAPI] Lỗi sync room_images (không ảnh hưởng bài đăng phòng):', imgErr);
    }
  }

  return room;
}

export async function updateRoom(id: string, updates: Record<string, any>) {
  if (!isSupabaseConfigured) return updates;

  const { data, error } = await supabase
    .from('rooms')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteRoom(id: string) {
  if (!isSupabaseConfigured) return true;

  const { error } = await supabase.from('rooms').delete().eq('id', id);
  if (error) throw error;
  return true;
}

export async function toggleSaveRoom(userId: string, roomId: string) {
  if (!isSupabaseConfigured) return true;

  const { data: existing } = await supabase
    .from('saved_rooms')
    .select('id')
    .eq('user_id', userId)
    .eq('room_id', roomId)
    .maybeSingle();

  if (existing) {
    await supabase.from('saved_rooms').delete().eq('id', existing.id);
    return false; // unsaved
  } else {
    await supabase.from('saved_rooms').insert({ user_id: userId, room_id: roomId });
    return true; // saved
  }
}

export async function getSavedRooms(userId: string) {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from('saved_rooms')
    .select(`
      room_id,
      rooms(
        *,
        room_images(*),
        buildings(name, district, address)
      )
    `)
    .eq('user_id', userId);

  if (error) throw error;
  return data?.map((d) => d.rooms) || [];
}

export async function incrementRoomView(roomId: string, userId?: string) {
  if (!isSupabaseConfigured) return;

  try {
    await supabase.from('view_history').insert({
      room_id: roomId,
      user_id: userId || null,
      duration_seconds: 10,
    });
  } catch {
    // view history logging failure should not break the UI
  }
}

export async function findRoomsNearLocation(targetLat: number, targetLng: number, radiusKm: number = 2.0) {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase.rpc('find_rooms_near_location', {
    target_lat: targetLat,
    target_lng: targetLng,
    radius_km: radiusKm,
  });

  if (error) throw error;
  return data || [];
}
