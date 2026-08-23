import { supabase, isSupabaseConfigured } from '../supabase';

export async function getPendingRooms() {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from('rooms')
    .select(`
      *,
      room_images(*),
      buildings(name, district, address),
      profiles!owner_id(full_name, phone, avatar_url)
    `)
    .eq('moderation_status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function approveRoom(roomId: string) {
  if (!isSupabaseConfigured) return true;

  const { error } = await supabase
    .from('rooms')
    .update({ moderation_status: 'approved', rejection_reason: null })
    .eq('id', roomId);

  if (error) throw error;
  return true;
}

export async function rejectRoom(roomId: string, reason: string) {
  if (!isSupabaseConfigured) return true;

  const { error } = await supabase
    .from('rooms')
    .update({ moderation_status: 'rejected', rejection_reason: reason })
    .eq('id', roomId);

  if (error) throw error;
  return true;
}

export async function getUsers() {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getPendingOwnerApplications() {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from('owner_applications')
    .select(`
      *,
      profiles!user_id(full_name, phone, avatar_url)
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function approveOwnerApplication(applicationId: string, userId: string) {
  if (!isSupabaseConfigured) return true;

  // 1. Update application status
  await supabase
    .from('owner_applications')
    .update({ status: 'approved', reviewed_at: new Date().toISOString() })
    .eq('id', applicationId);

  // 2. Update user profile role to owner
  const { error } = await supabase
    .from('profiles')
    .update({
      role: 'owner',
      owner_application_status: 'approved',
    })
    .eq('id', userId);

  if (error) throw error;
  return true;
}

export async function rejectOwnerApplication(applicationId: string, userId: string, reason: string) {
  if (!isSupabaseConfigured) return true;

  await supabase
    .from('owner_applications')
    .update({
      status: 'rejected',
      rejection_reason: reason,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', applicationId);

  const { error } = await supabase
    .from('profiles')
    .update({
      owner_application_status: 'rejected',
      owner_rejection_reason: reason,
    })
    .eq('id', userId);

  if (error) throw error;
  return true;
}
