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
      *,
      room_images(*),
      buildings(name, district, address, lat, lng),
      profiles!owner_id(full_name, phone, avatar_url)
    `)
    .eq('moderation_status', 'approved')
    .neq('status', 'hidden');

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
  return data || [];
}

export async function getRoomById(id: string) {
  if (!isSupabaseConfigured) return null;

  const { data, error } = await supabase
    .from('rooms')
    .select(`
      *,
      room_images(*),
      buildings(*),
      profiles!owner_id(*)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function createRoom(roomData: {
  building_id: string;
  owner_id: string;
  name: string;
  price: number;
  area: number;
  room_type: string;
  amenities?: string[];
  description?: string;
  images?: string[];
}) {
  if (!isSupabaseConfigured) {
    return { id: `room_${Date.now()}`, ...roomData };
  }

  const { data: room, error } = await supabase
    .from('rooms')
    .insert({
      building_id: roomData.building_id,
      owner_id: roomData.owner_id,
      name: roomData.name,
      price: roomData.price,
      area: roomData.area,
      room_type: roomData.room_type,
      amenities: roomData.amenities || [],
      description: roomData.description || '',
      status: 'available',
      moderation_status: 'pending',
    })
    .select()
    .single();

  if (error) throw error;

  if (roomData.images && roomData.images.length > 0) {
    const imageInserts = roomData.images.map((url, idx) => ({
      room_id: room.id,
      url,
      order_index: idx,
      is_cover: idx === 0,
    }));

    await supabase.from('room_images').insert(imageInserts);
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
