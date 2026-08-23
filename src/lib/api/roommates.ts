import { supabase, isSupabaseConfigured } from '../supabase';

export async function getRoommatePosts(district?: string) {
  if (!isSupabaseConfigured) return [];

  let query = supabase
    .from('roommate_posts')
    .select(`
      *,
      poster:profiles!poster_id(full_name, avatar_url, phone),
      room:rooms(id, name, price, area, room_images(url))
    `)
    .eq('status', 'active');

  if (district && district !== 'Tất cả quận') {
    query = query.eq('district', district);
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getRoommatePostById(id: string) {
  if (!isSupabaseConfigured) return null;

  const { data, error } = await supabase
    .from('roommate_posts')
    .select(`
      *,
      poster:profiles!poster_id(full_name, avatar_url, phone),
      room:rooms(id, name, price, area, room_images(url))
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
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
}) {
  if (!isSupabaseConfigured) {
    return { id: `post_${Date.now()}`, ...postData, status: 'active', created_at: new Date().toISOString() };
  }

  const { data, error } = await supabase
    .from('roommate_posts')
    .insert({
      ...postData,
      lifestyle_tags: postData.lifestyle_tags || [],
      status: 'active',
    })
    .select()
    .single();

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
