import { supabase, isSupabaseConfigured } from '../supabase';

export async function getMarketplaceItems(category?: string, district?: string) {
  if (!isSupabaseConfigured) return [];

  let query = supabase
    .from('marketplace_items')
    .select(`
      *,
      seller:profiles!seller_id(full_name, avatar_url, phone)
    `)
    .eq('status', 'available');

  if (category && category !== 'Tất cả') {
    query = query.eq('category', category);
  }
  if (district && district !== 'Tất cả quận') {
    query = query.eq('district', district);
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getMarketplaceItemById(id: string) {
  if (!isSupabaseConfigured) return null;

  const { data, error } = await supabase
    .from('marketplace_items')
    .select(`
      *,
      seller:profiles!seller_id(full_name, avatar_url, phone)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

export async function createMarketplaceItem(itemData: {
  seller_id: string;
  title: string;
  price?: number;
  is_free?: boolean;
  condition?: 'new90' | 'used' | 'needs_repair';
  category?: 'furniture' | 'electronics' | 'books' | 'household' | 'other';
  district?: string;
  description?: string;
  image_urls?: string[];
}) {
  if (!isSupabaseConfigured) {
    return { id: `item_${Date.now()}`, ...itemData, status: 'available', created_at: new Date().toISOString() };
  }

  const { data, error } = await supabase
    .from('marketplace_items')
    .insert({
      ...itemData,
      image_urls: itemData.image_urls || [],
      status: 'available',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateMarketplaceItem(id: string, updates: Record<string, any>) {
  if (!isSupabaseConfigured) return updates;

  const { data, error } = await supabase
    .from('marketplace_items')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}
