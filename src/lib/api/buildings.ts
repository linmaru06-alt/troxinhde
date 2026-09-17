import { supabase, isSupabaseConfigured } from '../supabase';

export async function getBuildings(ownerId?: string) {
  if (!isSupabaseConfigured) return [];

  let query = supabase
    .from('buildings')
    .select(`
      id,
      name,
      address,
      district,
      city,
      cover_image_url,
      total_rooms,
      available_rooms,
      status,
      created_at,
      rooms(id, title, price, status)
    `);

  if (ownerId) {
    query = query.eq('owner_id', ownerId);
  } else {
    query = query.eq('status', 'active');
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getBuildingById(id: string) {
  if (!isSupabaseConfigured) return null;

  const { data, error } = await supabase
    .from('buildings')
    .select(`
      *,
      rooms(*, room_images(*)),
      profiles!owner_id(full_name, phone, avatar_url)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function createBuilding(buildingData: {
  owner_id: string;
  name: string;
  address: string;
  district: string;
  city?: string;
  lat?: number;
  lng?: number;
  description?: string;
  amenities?: string[];
  cover_image_url?: string;
}) {
  if (!isSupabaseConfigured) {
    return { id: `building_${Date.now()}`, ...buildingData };
  }

  const { data, error } = await supabase
    .from('buildings')
    .insert({
      ...buildingData,
      city: buildingData.city || 'Hà Nội',
      amenities: buildingData.amenities || [],
      status: 'active',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateBuilding(id: string, updates: Record<string, any>) {
  if (!isSupabaseConfigured) return updates;

  const { data, error } = await supabase
    .from('buildings')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}
