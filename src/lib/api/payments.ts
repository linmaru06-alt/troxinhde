import { supabase, isSupabaseConfigured } from '../supabase';

export async function getUserSubscription(userId: string) {
  if (!isSupabaseConfigured) return null;

  const { data, error } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (error) return null;
  return data;
}

export async function getUserTransactions(userId: string) {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}
