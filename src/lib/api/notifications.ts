import { supabase, isSupabaseConfigured } from '../supabase';

export async function getNotifications(userId: string) {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function markNotificationRead(id: string) {
  if (!isSupabaseConfigured) return true;

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id);

  if (error) throw error;
  return true;
}

export async function markAllNotificationsRead(userId: string) {
  if (!isSupabaseConfigured) return true;

  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId);

  if (error) throw error;
  return true;
}

export async function getUnreadNotificationCount(userId: string) {
  if (!isSupabaseConfigured) return 0;

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) return 0;
  return count || 0;
}
