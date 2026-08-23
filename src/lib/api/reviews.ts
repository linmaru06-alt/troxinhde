import { supabase, isSupabaseConfigured } from '../supabase';

export async function getReviews(roomId: string) {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from('reviews')
    .select(`
      *,
      reviewer:profiles!reviewer_id(full_name, avatar_url)
    `)
    .eq('room_id', roomId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createReview(reviewData: {
  room_id: string;
  reviewer_id: string;
  rating: number;
  cleanliness_rating?: number;
  owner_rating?: number;
  accuracy_rating?: number;
  location_rating?: number;
  content?: string;
  rental_period?: string;
  image_urls?: string[];
}) {
  if (!isSupabaseConfigured) {
    return { id: `rev_${Date.now()}`, ...reviewData, created_at: new Date().toISOString() };
  }

  const { data, error } = await supabase
    .from('reviews')
    .upsert(
      {
        ...reviewData,
        image_urls: reviewData.image_urls || [],
      },
      { onConflict: 'room_id,reviewer_id' }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}
