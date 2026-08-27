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
      id,
      title,
      room_number,
      room_type,
      price,
      deposit,
      area,
      floor,
      status,
      moderation_status,
      rejection_reason,
      images,
      created_at,
      buildings(id, name, district, address),
      profiles!owner_id(id, full_name, phone, avatar_url)
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
    .select('id, firebase_uid, full_name, name, phone, email, role, app_role, avatar_url, verified, is_demo_account, owner_application_status, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('[Admin API] Lỗi khi lấy danh sách profiles:', error);
    return [];
  }

  return (data || []).map((p: any) => ({
    id: p.id,
    firebaseUid: p.firebase_uid || p.id,
    name: p.full_name || p.name || 'Người dùng Trọ Xinh',
    full_name: p.full_name || p.name || 'Người dùng Trọ Xinh',
    phone: p.phone,
    email: p.email,
    role: p.app_role || p.role || 'renter',
    app_role: p.app_role || p.role || 'renter',
    verified: p.verified ?? true,
    is_demo_account: Boolean(p.is_demo_account),
    avatar_url: p.avatar_url || '/images/user-avatar.jpg',
    owner_application_status: p.owner_application_status || 'none',
    created_at: p.created_at,
  }));
}

export async function getPendingOwnerApplications() {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from('owner_applications')
    .select(`
      id,
      user_id,
      building_name,
      address,
      district,
      id_card_number,
      business_license_url,
      status,
      created_at,
      profiles!user_id(id, full_name, phone, avatar_url)
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
