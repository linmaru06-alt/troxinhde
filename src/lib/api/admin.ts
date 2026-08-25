import { supabase, isSupabaseConfigured } from '../supabase';

export async function logAdminAudit(
  action: string,
  targetTable: string,
  targetId: string,
  metadata: Record<string, any> = {},
  adminEmail = 'admin@troxinh.vn'
) {
  if (!isSupabaseConfigured) return;
  try {
    await supabase.from('audit_logs').insert({
      admin_email: adminEmail,
      action,
      target_table: targetTable,
      target_id: targetId,
      metadata,
    });
  } catch (err) {
    console.warn('[Audit Log] Không thể ghi audit log:', err);
  }
}

export async function getPendingRooms() {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from('rooms')
    .select(`
      *,
      buildings(name, district, address),
      profiles!owner_id(full_name, phone, avatar_url)
    `)
    .eq('moderation_status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function approveRoom(roomId: string, adminEmail?: string) {
  if (!isSupabaseConfigured) return true;

  const { error } = await supabase
    .from('rooms')
    .update({ moderation_status: 'approved', rejection_reason: null, updated_at: new Date().toISOString() })
    .eq('id', roomId);

  if (error) throw error;

  await logAdminAudit('approve_room', 'rooms', roomId, { approvedAt: new Date().toISOString() }, adminEmail);
  return true;
}

export async function rejectRoom(roomId: string, reason: string, adminEmail?: string) {
  if (!isSupabaseConfigured) return true;

  const { error } = await supabase
    .from('rooms')
    .update({ moderation_status: 'rejected', rejection_reason: reason, updated_at: new Date().toISOString() })
    .eq('id', roomId);

  if (error) throw error;

  await logAdminAudit('reject_room', 'rooms', roomId, { reason, rejectedAt: new Date().toISOString() }, adminEmail);
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

export async function approveOwnerApplication(applicationId: string, userId: string, adminEmail?: string) {
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
      app_role: 'owner',
      role: 'owner',
      owner_application_status: 'approved',
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) throw error;

  await logAdminAudit('approve_owner_application', 'owner_applications', applicationId, { userId }, adminEmail);
  return true;
}

export async function rejectOwnerApplication(applicationId: string, userId: string, reason: string, adminEmail?: string) {
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
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) throw error;

  await logAdminAudit('reject_owner_application', 'owner_applications', applicationId, { userId, reason }, adminEmail);
  return true;
}

export async function getAuditLogs() {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) throw error;
  return data || [];
}
