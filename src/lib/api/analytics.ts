import { supabase, isSupabaseConfigured } from '../supabase';

export async function getAdminStats() {
  if (!isSupabaseConfigured) {
    return {
      totalUsers: 154,
      totalOwners: 28,
      totalRooms: 68,
      pendingRooms: 4,
      pendingOwnerApplications: 2,
      activeSubscriptions: 18,
    };
  }

  const [
    { count: totalUsers },
    { count: totalRooms },
    { count: pendingRooms },
    { count: pendingOwnerApplications },
    { count: activeSubscriptions },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('rooms').select('*', { count: 'exact', head: true }),
    supabase.from('rooms').select('*', { count: 'exact', head: true }).eq('moderation_status', 'pending'),
    supabase.from('owner_applications').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('user_subscriptions').select('*', { count: 'exact', head: true }).eq('is_active', true),
  ]);

  return {
    totalUsers: totalUsers || 0,
    totalRooms: totalRooms || 0,
    pendingRooms: pendingRooms || 0,
    pendingOwnerApplications: pendingOwnerApplications || 0,
    activeSubscriptions: activeSubscriptions || 0,
  };
}
