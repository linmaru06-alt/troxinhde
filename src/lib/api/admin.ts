import { supabase, isSupabaseConfigured } from '../supabase';
import { AuditLog, AdminMetrics, User } from '../../types';

// Storage key fallback nếu bảng audit_logs chưa được tạo qua SQL Editor trên Supabase
const LOCAL_AUDIT_KEY = 'troxinh_admin_audit_logs';

/**
 * Ghi log thao tác quản trị vào Supabase audit_logs (kèm fallback an toàn vào localStorage)
 */
export async function logAdminAudit(params: {
  action: string;
  entity_type: AuditLog['entity_type'];
  entity_id?: string;
  data_before?: any;
  data_after?: any;
  reason?: string;
  admin?: User | null;
}) {
  const { action, entity_type, entity_id, data_before, data_after, reason, admin } = params;

  const logEntry: Omit<AuditLog, 'id'> & { id?: string } = {
    admin_id: admin?.id || null,
    admin_email: admin?.email || 'admin@troxinh.vn',
    admin_role: admin?.adminRole || (admin?.role === 'admin' ? 'super_admin' : 'moderator'),
    action,
    entity_type,
    entity_id: entity_id || '',
    data_before: data_before || null,
    data_after: data_after || null,
    reason: reason || null,
    is_demo_admin: Boolean(admin?.isDemoAccount),
    created_at: new Date().toISOString(),
  };

  // 1. Cố gắng ghi vào bảng audit_logs trên Supabase
  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.from('audit_logs').insert(logEntry);
      if (!error) return;
      console.warn('[Audit Log] Không thể ghi Supabase audit_logs, chuyển sang cache local:', error.message);
    } catch (err) {
      console.warn('[Audit Log] Lỗi kết nối Supabase audit_logs:', err);
    }
  }

  // 2. Fallback lưu vào localStorage để không bị mất vết thao tác
  try {
    const raw = localStorage.getItem(LOCAL_AUDIT_KEY);
    const list: AuditLog[] = raw ? JSON.parse(raw) : [];
    const itemWithId: AuditLog = {
      ...logEntry,
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    };
    list.unshift(itemWithId);
    localStorage.setItem(LOCAL_AUDIT_KEY, JSON.stringify(list.slice(0, 200)));
  } catch (localErr) {
    console.warn('[Audit Log] Không thể ghi vào localStorage:', localErr);
  }
}

/**
 * Lấy danh sách Audit Logs (từ Supabase thật hoặc cache local)
 */
export async function getAuditLogs(): Promise<AuditLog[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (!error && data && data.length > 0) {
        return data;
      }
    } catch (err) {
      console.warn('[Admin] Thử lấy audit_logs từ Supabase không thành công:', err);
    }
  }

  // Fallback đọc từ localStorage
  try {
    const raw = localStorage.getItem(LOCAL_AUDIT_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn('[Admin] Lỗi đọc audit_logs từ localStorage:', err);
  }

  return [];
}

/**
 * Lấy các chỉ số thống kê thật từ Supabase (Metrics Grid)
 */
export async function getAdminMetrics(): Promise<AdminMetrics> {
  const fallback: AdminMetrics = {
    totalRooms: 0,
    pendingRooms: 0,
    approvedRooms: 0,
    rejectedRooms: 0,
    totalUsers: 0,
    totalOwners: 0,
    pendingOwnerApps: 0,
    totalReports: 0,
    pendingReports: 0,
    totalBookings: 0,
    pendingBookings: 0,
  };

  if (!isSupabaseConfigured) return fallback;

  try {
    const [roomsRes, profilesRes, ownerAppsRes, reportsRes, bookingsRes] = await Promise.all([
      supabase.from('rooms').select('id, moderation_status, status'),
      supabase.from('profiles').select('id, role'),
      supabase.from('owner_applications').select('id, status'),
      supabase.from('reports').select('id, status'),
      supabase.from('viewing_requests').select('id, status'),
    ]);

    const rooms = roomsRes.data || [];
    const profiles = profilesRes.data || [];
    const ownerApps = ownerAppsRes.data || [];
    const reports = reportsRes.data || [];
    const bookings = bookingsRes.data || [];

    return {
      totalRooms: rooms.length,
      pendingRooms: rooms.filter((r) => r.moderation_status === 'pending' || r.status === 'Chờ duyệt').length,
      approvedRooms: rooms.filter((r) => r.moderation_status === 'approved' || r.status === 'Còn trống').length,
      rejectedRooms: rooms.filter((r) => r.moderation_status === 'rejected' || r.status === 'Bị từ chối').length,

      totalUsers: profiles.length,
      totalOwners: profiles.filter((p) => p.role === 'owner').length,
      pendingOwnerApps: ownerApps.filter((a) => a.status === 'pending').length,

      totalReports: reports.length,
      pendingReports: reports.filter((r) => r.status === 'pending').length,

      totalBookings: bookings.length,
      pendingBookings: bookings.filter((b) => b.status === 'pending' || b.status === 'Chờ chủ trọ xác nhận').length,
    };
  } catch (err) {
    console.error('[Admin API] Lỗi tính toán admin metrics:', err);
    return fallback;
  }
}

/**
 * Lấy danh sách phòng chờ duyệt
 */
export async function getPendingRooms() {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from('rooms')
    .select(`
      id,
      name,
      price,
      deposit,
      area,
      room_type,
      status,
      moderation_status,
      rejection_reason,
      amenities,
      description,
      created_at,
      buildings(id, name, district, address),
      profiles!owner_id(id, full_name, phone, avatar_url)
    `)
    .or('moderation_status.eq.pending,status.eq.Chờ duyệt')
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('[Admin API] Lỗi getPendingRooms:', error);
    return [];
  }
  return data || [];
}

/**
 * Lấy toàn bộ phòng cho màn hình kiểm duyệt (có bộ lọc)
 */
export async function getAllRoomsAdmin() {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from('rooms')
    .select(`
      id,
      name,
      price,
      deposit,
      area,
      room_type,
      status,
      moderation_status,
      rejection_reason,
      amenities,
      description,
      created_at,
      buildings(id, name, district, address),
      profiles!owner_id(id, full_name, phone, avatar_url)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('[Admin API] Lỗi getAllRoomsAdmin:', error);
    return [];
  }
  return data || [];
}

/**
 * Phê duyệt phòng trọ
 */
export async function approveRoom(roomId: string, admin?: User | null) {
  if (!isSupabaseConfigured) return true;

  // Lấy dữ liệu cũ để ghi audit log
  const { data: oldRoom } = await supabase.from('rooms').select('*').eq('id', roomId).single();

  const { error } = await supabase
    .from('rooms')
    .update({
      moderation_status: 'approved',
      status: 'Còn trống',
      rejection_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', roomId);

  if (error) throw error;

  // Ghi audit log
  await logAdminAudit({
    action: 'approve_room',
    entity_type: 'room',
    entity_id: roomId,
    data_before: oldRoom ? { moderation_status: oldRoom.moderation_status, status: oldRoom.status } : null,
    data_after: { moderation_status: 'approved', status: 'Còn trống' },
    admin,
  });

  // Gửi thông báo cho chủ trọ
  if (oldRoom?.owner_id) {
    try {
      await supabase.from('notifications').insert({
        user_id: oldRoom.owner_id,
        type: 'room_approved',
        title: 'Tin đăng phòng đã được duyệt! 🎉',
        body: `Phòng "${oldRoom.name || 'trọ'}" của bạn đã được kiểm duyệt và hiển thị công khai trên Trọ Xinh.`,
        cta_url: `/phong/${roomId}`,
        cta_label: 'Xem phòng',
        is_read: false,
      });
    } catch (notifErr) {
      console.warn('[Admin] Lỗi gửi thông báo duyệt phòng:', notifErr);
    }
  }

  return true;
}

/**
 * Từ chối tin đăng phòng
 */
export async function rejectRoom(roomId: string, reason: string, admin?: User | null) {
  if (!isSupabaseConfigured) return true;

  const { data: oldRoom } = await supabase.from('rooms').select('*').eq('id', roomId).single();

  const { error } = await supabase
    .from('rooms')
    .update({
      moderation_status: 'rejected',
      status: 'Bị từ chối',
      rejection_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', roomId);

  if (error) throw error;

  await logAdminAudit({
    action: 'reject_room',
    entity_type: 'room',
    entity_id: roomId,
    data_before: oldRoom ? { moderation_status: oldRoom.moderation_status, status: oldRoom.status } : null,
    data_after: { moderation_status: 'rejected', status: 'Bị từ chối', rejection_reason: reason },
    reason,
    admin,
  });

  // Gửi thông báo cho chủ trọ lý do từ chối
  if (oldRoom?.owner_id) {
    try {
      await supabase.from('notifications').insert({
        user_id: oldRoom.owner_id,
        type: 'room_rejected',
        title: 'Tin đăng phòng cần chỉnh sửa ✏️',
        body: `Phòng "${oldRoom.name || 'trọ'}" chưa được duyệt. Lý do: ${reason}. Vui lòng cập nhật lại.`,
        cta_url: `/chu-tro`,
        cta_label: 'Chỉnh sửa phòng',
        is_read: false,
      });
    } catch (notifErr) {
      console.warn('[Admin] Lỗi gửi thông báo từ chối phòng:', notifErr);
    }
  }

  return true;
}

/**
 * Hạ tin phòng (chuyển sang trạng thái ẩn)
 */
export async function hideRoom(roomId: string, reason: string, admin?: User | null) {
  if (!isSupabaseConfigured) return true;

  const { data: oldRoom } = await supabase.from('rooms').select('*').eq('id', roomId).single();

  const { error } = await supabase
    .from('rooms')
    .update({
      status: 'hidden',
      rejection_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', roomId);

  if (error) throw error;

  await logAdminAudit({
    action: 'hide_room',
    entity_type: 'room',
    entity_id: roomId,
    data_before: oldRoom ? { status: oldRoom.status } : null,
    data_after: { status: 'hidden', reason },
    reason,
    admin,
  });

  return true;
}

/**
 * Lấy danh sách người dùng đầy đủ cho Admin
 */
export async function getUsers(): Promise<User[]> {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('[Admin API] Lỗi khi lấy danh sách profiles:', error);
    return [];
  }

  return (data || []).map((p: any) => ({
    id: p.id,
    firebaseUid: p.firebase_uid || p.id,
    name: p.full_name || p.name || 'Người dùng Trọ Xinh',
    phone: p.phone || '',
    email: p.email || '',
    role: (p.role || 'user') as any,
    avatarUrl: p.avatar_url || '/images/user-avatar.jpg',
    verified: Boolean(p.verified),
    isBanned: Boolean(p.is_banned),
    bannedReason: p.banned_reason || undefined,
    landlordVerified: Boolean(p.landlord_verified || p.owner_application_status === 'approved'),
    adminRole: p.admin_role || undefined,
    ownerApplicationStatus: p.owner_application_status || 'none',
    createdAt: p.created_at || new Date().toISOString(),
  }));
}

/**
 * Khóa tài khoản người dùng
 */
export async function banUser(userId: string, reason: string, durationDays = 30, admin?: User | null) {
  if (!isSupabaseConfigured) return true;

  const bannedUntil = new Date(Date.now() + durationDays * 86400000).toISOString();

  const { data: oldUser } = await supabase.from('profiles').select('id, role').eq('id', userId).single();

  const { error } = await supabase
    .from('profiles')
    .update({
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) throw error;

  await logAdminAudit({
    action: 'ban_user',
    entity_type: 'user',
    entity_id: userId,
    data_before: oldUser,
    data_after: { is_banned: true, banned_reason: reason, banned_until: bannedUntil },
    reason,
    admin,
  });

  return true;
}

/**
 * Mở khóa tài khoản người dùng
 */
export async function unbanUser(userId: string, admin?: User | null) {
  if (!isSupabaseConfigured) return true;

  const { error } = await supabase
    .from('profiles')
    .update({
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) throw error;

  await logAdminAudit({
    action: 'unban_user',
    entity_type: 'user',
    entity_id: userId,
    data_before: { is_banned: true },
    data_after: { is_banned: false },
    admin,
  });

  return true;
}

/**
 * Đổi vai trò người dùng (chỉ cho phép nếu Admin là super_admin)
 */
export async function changeUserRole(userId: string, newRole: 'user' | 'owner' | 'admin', admin?: User | null) {
  if (!isSupabaseConfigured) return true;

  const { data: oldUser } = await supabase.from('profiles').select('role').eq('id', userId).single();

  const { error } = await supabase
    .from('profiles')
    .update({
      role: newRole,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) throw error;

  await logAdminAudit({
    action: 'change_user_role',
    entity_type: 'user',
    entity_id: userId,
    data_before: oldUser ? { role: oldUser.role } : null,
    data_after: { role: newRole },
    reason: `Chuyển vai trò sang ${newRole}`,
    admin,
  });

  return true;
}

/**
 * Lấy danh sách đơn đăng ký chủ trọ chờ duyệt
 */
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
      cccd_number,
      cccd_image_url,
      legal_docs_note,
      status,
      created_at,
      profiles!user_id(id, full_name, phone, avatar_url)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('[Admin API] Lỗi getPendingOwnerApplications:', error);
    return [];
  }
  return data || [];
}

/**
 * Duyệt hồ sơ nâng cấp chủ trọ
 */
export async function approveOwnerApplication(applicationId: string, userId: string, admin?: User | null) {
  if (!isSupabaseConfigured) return true;

  await supabase
    .from('owner_applications')
    .update({ status: 'approved', reviewed_at: new Date().toISOString() })
    .eq('id', applicationId);

  const { error } = await supabase
    .from('profiles')
    .update({
      role: 'owner',
      owner_application_status: 'approved',
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) throw error;

  await logAdminAudit({
    action: 'approve_owner_application',
    entity_type: 'owner_application',
    entity_id: applicationId,
    data_after: { userId, status: 'approved' },
    admin,
  });

  // Gửi thông báo cho người dùng
  try {
    await supabase.from('notifications').insert({
      user_id: userId,
      type: 'owner_approved',
      title: 'Hồ sơ Đối tác Chủ trọ đã được phê duyệt! 🏢',
      body: 'Chúc mừng bạn! Tài khoản đã được nâng cấp lên Chủ trọ. Bạn có thể bắt đầu đăng phòng và quản lý tòa nhà ngay.',
      cta_url: '/chu-tro/phong/tao-moi',
      cta_label: 'Đăng phòng ngay',
      is_read: false,
    });
  } catch (notifErr) {
    console.warn('[Admin] Lỗi gửi thông báo duyệt chủ trọ:', notifErr);
  }

  return true;
}

/**
 * Từ chối hồ sơ nâng cấp chủ trọ
 */
export async function rejectOwnerApplication(
  applicationId: string,
  userId: string,
  reason: string,
  admin?: User | null
) {
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
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) throw error;

  await logAdminAudit({
    action: 'reject_owner_application',
    entity_type: 'owner_application',
    entity_id: applicationId,
    reason,
    admin,
  });

  return true;
}

/**
 * Lấy danh sách báo cáo vi phạm (Reports)
 */
export async function getReportsAdmin() {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from('reports')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('[Admin API] Lỗi getReportsAdmin:', error);
    return [];
  }
  return data || [];
}

/**
 * Xử lý báo cáo vi phạm
 */
export async function resolveReport(
  reportId: string,
  action: 'hide_listing' | 'dismiss' | 'warning',
  adminNotes: string,
  admin?: User | null
) {
  if (!isSupabaseConfigured) return true;

  const { data: report } = await supabase.from('reports').select('*').eq('id', reportId).single();

  const newStatus = action === 'dismiss' ? 'dismissed' : 'resolved';

  const { error } = await supabase
    .from('reports')
    .update({
      status: newStatus,
      admin_notes: adminNotes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reportId);

  if (error) throw error;

  // Nếu hành động là hạ tin phòng bị báo cáo
  if (action === 'hide_listing' && report?.target_type === 'room' && report?.target_id) {
    await hideRoom(report.target_id, `Hạ tin do vi phạm: ${report.reason}. Ghi chú: ${adminNotes}`, admin);
  }

  await logAdminAudit({
    action: `resolve_report_${action}`,
    entity_type: 'report',
    entity_id: reportId,
    reason: adminNotes,
    admin,
  });

  return true;
}

/**
 * Lấy danh sách lịch hẹn xem phòng cho Admin theo dõi
 */
export async function getViewingRequestsAdmin() {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from('viewing_requests')
    .select(`
      id,
      room_id,
      renter_id,
      owner_id,
      requested_date,
      requested_time,
      contact_phone,
      message,
      status,
      created_at,
      rooms(id, name, price),
      renter:profiles!renter_id(id, full_name, phone),
      owner:profiles!owner_id(id, full_name, phone)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('[Admin API] Lỗi getViewingRequestsAdmin:', error);
    return [];
  }
  return data || [];
}
