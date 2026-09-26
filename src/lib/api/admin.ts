import { supabase, isSupabaseConfigured } from '../supabase';
import { AuditLog, AdminMetrics, User } from '../../types';
import {
  ReportRecord,
  GroupedReportItem,
  ReportTargetType,
  groupReportsByTarget,
  getAllStoredReports,
  updateReportStatus,
} from './reports';

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
export async function getAdminMetrics(
  timeFilter: 'today' | '7days' | '30days' | 'all' = 'all'
): Promise<AdminMetrics> {
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

  // Tính mốc thời gian cho bộ lọc
  const getFromDate = (): string | null => {
    const now = new Date();
    if (timeFilter === 'today') {
      const d = new Date(now); d.setHours(0, 0, 0, 0); return d.toISOString();
    }
    if (timeFilter === '7days') {
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    }
    if (timeFilter === '30days') {
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    }
    return null;
  };
  const fromDate = getFromDate();

  try {
    // Rooms: luôn lấy tổng hệ thống (không filter thời gian cho tổng phòng)
    let roomsQuery = supabase.from('rooms').select('id, moderation_status, status, created_at');
    let profilesQuery = supabase.from('profiles').select('id, role, created_at');
    let ownerAppsQuery = supabase.from('owner_applications').select('id, status, created_at');
    let reportsQuery = supabase.from('reports').select('id, status, created_at');
    let bookingsQuery = supabase.from('viewing_requests').select('id, status, created_at');

    // Khi có bộ lọc thời gian, chỉ áp dụng cho rooms/reports/bookings mới tạo trong kỳ
    if (fromDate) {
      roomsQuery = roomsQuery.gte('created_at', fromDate) as any;
      reportsQuery = reportsQuery.gte('created_at', fromDate) as any;
      bookingsQuery = bookingsQuery.gte('created_at', fromDate) as any;
    }

    const [roomsRes, profilesRes, ownerAppsRes, reportsRes, bookingsRes] = await Promise.all([
      roomsQuery,
      profilesQuery,
      ownerAppsQuery,
      bookingsQuery,
      reportsQuery,
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
      status: 'available',
      availability_status: 'available',
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
    data_after: { moderation_status: 'approved', status: 'available' },
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
    .select('*, profile_private(email, student_card_url)')
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('[Admin API] Lỗi khi lấy danh sách profiles:', error);
    return [];
  }

  return (data || []).map((p: any) => {
    const priv = Array.isArray(p.profile_private) ? p.profile_private[0] : (p.profile_private || {});
    return {
      id: p.id,
      firebaseUid: p.firebase_uid || p.id,
      name: p.full_name || p.name || 'Người dùng Trọ Xinh',
      phone: p.phone || '',
      email: priv?.email || p.email || '',
      role: (p.role || 'user') as any,
      avatarUrl: p.avatar_url || '/images/user-avatar.jpg',
      verified: Boolean(p.verified),
      isBanned: Boolean(p.is_banned),
      bannedReason: p.banned_reason || undefined,
      landlordVerified: Boolean(p.landlord_verified || p.owner_application_status === 'approved'),
      adminRole: p.admin_role || undefined,
      ownerApplicationStatus: p.owner_application_status || 'none',
      createdAt: p.created_at || new Date().toISOString(),
    };
  });
}


function assertAdminPermission(admin?: User | null) {
  if (
    admin &&
    admin.app_role !== 'admin' &&
    admin.role !== 'admin' &&
    (admin as any).admin_role !== 'superadmin' &&
    (admin as any).admin_role !== 'super_admin'
  ) {
    throw new Error('42501: Chỉ Quản trị viên mới có quyền thực hiện thao tác này');
  }
}

/**
 * Khóa tài khoản người dùng vi phạm
 */
export async function banUser(userId: string, reason: string, durationDays = 30, admin?: User | null) {
  assertAdminPermission(admin);

  if (!reason || !reason.trim()) {
    throw new Error('Ghi chú lý do khóa tài khoản là bắt buộc');
  }

  // 1. Chặn Admin tự khóa tài khoản của chính mình
  if (admin?.id && userId === admin.id) {
    throw new Error('Quản trị viên không thể tự khóa tài khoản của chính mình');
  }

  if (!isSupabaseConfigured) return true;

  // 2. Kiểm tra tài khoản đích có phải Admin không
  const { data: oldUser } = await supabase
    .from('profiles')
    .select('id, role, app_role, admin_role, is_banned')
    .eq('id', userId)
    .maybeSingle();

  if (oldUser && (oldUser.app_role === 'admin' || oldUser.role === 'admin' || oldUser.admin_role === 'superadmin' || oldUser.admin_role === 'super_admin')) {
    throw new Error('Không thể khóa tài khoản của một Quản trị viên khác');
  }

  // Thử gọi RPC admin_ban_user nếu có
  try {
    const { data: rpcRes, error: rpcErr } = await supabase.rpc('admin_ban_user', {
      p_user_id: userId,
      p_reason: reason.trim(),
      p_duration_days: durationDays,
    });
    if (rpcErr) {
      if (rpcErr.code === '42501' || rpcErr.message?.includes('42501') || rpcErr.message?.includes('Quản trị viên')) {
        throw new Error(rpcErr.message || '42501: Chỉ Quản trị viên mới có quyền thực hiện thao tác này');
      }
    } else if (rpcRes) {
      return true;
    }
  } catch (rpcEx: any) {
    if (rpcEx.message?.includes('42501') || rpcEx.message?.includes('Quản trị viên') || rpcEx.message?.includes('tự khóa')) {
      throw rpcEx;
    }
    // Fallback to direct update if RPC is not deployed yet
  }

  const bannedUntil = new Date(Date.now() + durationDays * 86400000).toISOString();

  const { error } = await supabase
    .from('profiles')
    .update({
      is_banned: true,
      banned_reason: reason.trim(),
      banned_until: bannedUntil,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    if (error.code === '42501' || error.message?.includes('42501') || error.message?.includes('permission denied')) {
      throw new Error(error.message || '42501: Chỉ Quản trị viên mới có quyền thực hiện thao tác này');
    }
    throw error;
  }

  // Tự động đóng/ẩn các bài đăng tìm bạn của user bị khóa
  try {
    await supabase
      .from('roommate_posts')
      .update({
        status: 'closed',
        updated_at: new Date().toISOString(),
      })
      .eq('poster_id', userId);
  } catch (postErr) {
    console.warn('[Admin API] Lỗi đóng roommate_posts của user bị khóa:', postErr);
  }

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

export async function unbanUser(
  userId: string,
  reasonOrAdmin: string | User | null = 'Mở khóa tài khoản',
  adminUser?: User | null,
) {
  let reason = 'Mở khóa tài khoản';
  let admin: User | null | undefined = adminUser;

  if (typeof reasonOrAdmin === 'string') {
    reason = reasonOrAdmin.trim() || 'Mở khóa tài khoản';
  } else if (reasonOrAdmin && typeof reasonOrAdmin === 'object') {
    admin = reasonOrAdmin as User;
  }

  assertAdminPermission(admin);

  if (!reason || !reason.trim()) {
    throw new Error('Ghi chú lý do mở khóa tài khoản là bắt buộc');
  }

  if (!isSupabaseConfigured) return true;

  try {
    const { data: rpcRes, error: rpcErr } = await supabase.rpc('admin_unban_user', {
      p_user_id: userId,
      p_reason: reason.trim(),
    });
    if (rpcErr) {
      if (rpcErr.code === '42501' || rpcErr.message?.includes('42501') || rpcErr.message?.includes('Quản trị viên')) {
        throw new Error(rpcErr.message || '42501: Chỉ Quản trị viên mới có quyền thực hiện thao tác này');
      }
    } else if (rpcRes) {
      return true;
    }
  } catch (rpcEx: any) {
    if (rpcEx.message?.includes('42501') || rpcEx.message?.includes('Quản trị viên')) {
      throw rpcEx;
    }
    // Fallback to direct update
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      is_banned: false,
      banned_reason: null,
      banned_until: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    if (error.code === '42501' || error.message?.includes('42501') || error.message?.includes('permission denied')) {
      throw new Error(error.message || '42501: Chỉ Quản trị viên mới có quyền thực hiện thao tác này');
    }
    throw error;
  }

  await logAdminAudit({
    action: 'unban_user',
    entity_type: 'user',
    entity_id: userId,
    data_before: { is_banned: true },
    data_after: { is_banned: false },
    reason: reason.trim(),
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
    .eq('status', 'pending')
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

  // Nếu hành động là hạ tin vi phạm bị báo cáo
  if (action === 'hide_listing' && report?.target_id) {
    if (report.target_type === 'room') {
      await hideRoom(report.target_id, `Hạ tin do vi phạm: ${report.reason}. Ghi chú: ${adminNotes}`, admin);
    } else if (report.target_type === 'roommate') {
      await hideRoommatePost(report.target_id, `Hạ bài tìm bạn do vi phạm: ${report.reason}. Ghi chú: ${adminNotes}`, admin);
    } else if (report.target_type === 'marketplace') {
      await rejectMarketplaceItem(report.target_id, `Hạ tin thanh lý do vi phạm: ${report.reason}. Ghi chú: ${adminNotes}`, admin);
    }
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
 * Lấy danh sách báo cáo gom nhóm theo đối tượng dành cho Admin
 */
export async function getGroupedReportsAdmin(filters?: {
  status?: string;
  targetType?: string;
}): Promise<GroupedReportItem[]> {
  let reports: ReportRecord[] = [];

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select(`
          *,
          reporter:profiles!reporter_id(id, full_name, avatar_url, phone),
          resolver:profiles!resolved_by(id, full_name)
        `)
        .order('created_at', { ascending: false });

      if (!error && data) {
        reports = data.map((r: any) => ({
          id: r.id,
          reporter_id: r.reporter_id,
          target_type: r.target_type,
          target_id: r.target_id,
          target_owner_id: r.target_owner_id,
          reason: r.reason,
          description: r.description || r.details,
          content_snapshot: r.content_snapshot,
          status: r.status,
          admin_notes: r.admin_notes,
          reporter_name: r.reporter?.full_name || r.reporter_name,
          reporter_phone: r.reporter?.phone || r.reporter_phone,
          resolved_by: r.resolved_by,
          resolved_by_name: r.resolver?.full_name,
          resolved_at: r.resolved_at,
          created_at: r.created_at,
          updated_at: r.updated_at,
          auto_moderated: r.auto_moderated,
        }));
      } else if (error) {
        console.warn('[Admin API] Lỗi getGroupedReportsAdmin từ Supabase:', error);
        reports = getAllStoredReports();
      }
    } catch (err) {
      console.warn('[Admin API] Exception getGroupedReportsAdmin:', err);
      reports = getAllStoredReports();
    }
  } else {
    reports = getAllStoredReports();
  }

  // Thu thập thêm metadata đối tượng từ DB nếu có
  const metadataMap = new Map<string, { target_owner?: any; target_content?: any }>();

  if (isSupabaseConfigured && reports.length > 0) {
    const marketplaceIds = reports.filter((r) => r.target_type === 'tin_dang').map((r) => r.target_id);
    const userIds = reports.filter((r) => r.target_type === 'nguoi_dung').map((r) => r.target_id);
    const ownerIds = reports.map((r) => r.target_owner_id).filter(Boolean) as string[];

    try {
      // 1. Lấy thông tin tin đồ cũ
      if (marketplaceIds.length > 0) {
        const { data: items } = await supabase
          .from('marketplace_items')
          .select('id, title, price, images, status, moderation_status, seller:profiles!seller_id(id, full_name, avatar_url, phone, is_banned)')
          .in('id', marketplaceIds);

        if (items) {
          for (const item of items) {
            const key = `tin_dang:${item.id}`;
            const seller = Array.isArray(item.seller) ? item.seller[0] : item.seller;
            metadataMap.set(key, {
              target_owner: seller ? {
                id: seller.id,
                name: seller.full_name,
                avatarUrl: seller.avatar_url,
                phone: seller.phone,
                isBanned: seller.is_banned,
              } : undefined,
              target_content: {
                title: item.title,
                price: item.price,
                images: item.images,
                status: item.status,
                moderation_status: item.moderation_status,
                url: `/cho-do-cu/${item.id}`,
              },
            });
          }
        }
      }

      // 2. Lấy thông tin người dùng bị báo cáo
      const allUserIds = Array.from(new Set([...userIds, ...ownerIds]));
      if (allUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, phone, email, is_banned, banned_reason, created_at')
          .in('id', allUserIds);

        if (profiles) {
          for (const prof of profiles) {
            const userKey = `nguoi_dung:${prof.id}`;
            if (!metadataMap.has(userKey)) {
              metadataMap.set(userKey, {
                target_owner: {
                  id: prof.id,
                  name: prof.full_name,
                  avatarUrl: prof.avatar_url,
                  phone: prof.phone,
                  email: prof.email,
                  isBanned: prof.is_banned,
                  bannedReason: prof.banned_reason,
                },
                target_content: {
                  title: prof.full_name,
                  description: `Thành viên TroXinh (${prof.phone || prof.email || prof.id})`,
                  status: prof.is_banned ? 'banned' : 'active',
                },
              });
            }
          }
        }
      }
    } catch (metaErr) {
      console.warn('[Admin API] Lỗi tải metadata đối tượng báo cáo:', metaErr);
    }
  }

  // Gom nhóm theo đối tượng
  let grouped = groupReportsByTarget(reports, metadataMap);

  // Bộ lọc
  if (filters?.status && filters.status !== 'all') {
    grouped = grouped.filter((g) => g.status === filters.status);
  }

  if (filters?.targetType && filters.targetType !== 'all') {
    grouped = grouped.filter((g) => g.target_type === filters.targetType);
  }

  return grouped;
}

/**
 * Thao tác 1: Ẩn tin đăng vi phạm
 * Chuyển tin về trạng thái pending/hidden, cập nhật các báo cáo thành da_xu_ly
 */
export async function hideReportedListing(params: {
  targetType: ReportTargetType;
  targetId: string;
  adminNotes: string;
  admin?: User | null;
}): Promise<boolean> {
  const { targetType, targetId, adminNotes, admin } = params;
  assertAdminPermission(admin);

  if (!adminNotes || !adminNotes.trim()) {
    throw new Error('Ghi chú xử lý của Quản trị viên là bắt buộc');
  }

  const now = new Date().toISOString();
  const adminId = admin?.id || null;
  const adminName = admin?.name || 'Ban Quản Trị';

  // 1. Cập nhật đối tượng tin đăng
  if (isSupabaseConfigured) {
    if (targetType === 'tin_dang') {
      try {
        const { data: rpcRes, error: rpcErr } = await supabase.rpc('admin_hide_reported_listing', {
          p_target_id: targetId,
          p_reason: adminNotes.trim(),
        });
        if (rpcErr) {
          if (rpcErr.code === '42501' || rpcErr.message?.includes('42501') || rpcErr.message?.includes('Quản trị viên')) {
            throw new Error(rpcErr.message || '42501: Chỉ Quản trị viên mới có quyền thực hiện thao tác này');
          }
        }
      } catch (rpcEx: any) {
        if (rpcEx.message?.includes('42501') || rpcEx.message?.includes('Quản trị viên')) {
          throw rpcEx;
        }
      }
    }

    try {
      if (targetType === 'tin_dang') {
        const { data: item, error: itemErr } = await supabase
          .from('marketplace_items')
          .update({
            status: 'pending',
            moderation_status: 'pending',
            rejection_reason: adminNotes,
            updated_at: now,
          })
          .eq('id', targetId)
          .select('seller_id, title')
          .maybeSingle();

        if (itemErr) {
          if (itemErr.code === '42501' || itemErr.message?.includes('42501') || itemErr.message?.includes('permission denied')) {
            throw new Error(itemErr.message || '42501: Chỉ Quản trị viên mới có quyền thực hiện thao tác này');
          }
        }

        // Gửi thông báo cho người bán
        if (item?.seller_id) {
          await supabase.from('notifications').insert({
            user_id: item.seller_id,
            type: 'moderation',
            title: 'Tin đăng của bạn đã bị ẩn do có vi phạm ⚠️',
            body: `Tin đăng "${item.title || 'của bạn'}" đã bị ẩn khỏi chợ. Ghi chú kiểm duyệt: ${adminNotes}`,
            cta_url: `/cho-do-cu/${targetId}?edit=true`,
            cta_label: 'Chỉnh sửa & Gửi duyệt lại',
            is_read: false,
          });
        }
      }

      // Cập nhật tất cả reports của đối tượng này trên Supabase
      const { error: repErr } = await supabase
        .from('reports')
        .update({
          status: 'da_xu_ly',
          admin_notes: adminNotes,
          resolved_by: adminId,
          resolved_at: now,
          updated_at: now,
        })
        .eq('target_type', targetType)
        .eq('target_id', targetId);

      if (repErr) {
        if (repErr.code === '42501' || repErr.message?.includes('42501') || repErr.message?.includes('permission denied')) {
          throw new Error(repErr.message || '42501: Chỉ Quản trị viên mới có quyền thực hiện thao tác này');
        }
      }
    } catch (err: any) {
      if (err.message?.includes('42501') || err.message?.includes('Quản trị viên')) {
        throw err;
      }
      console.warn('[Admin API] Lỗi hideReportedListing Supabase:', err);
    }
  }

  // 2. Cập nhật local/in-memory fallback
  const allReports = getAllStoredReports();
  for (const r of allReports) {
    if (r.target_type === targetType && r.target_id === targetId) {
      updateReportStatus(r.id, 'da_xu_ly', adminNotes, adminId || undefined, adminName, now);
    }
  }

  // 3. Ghi Audit Log
  await logAdminAudit({
    action: 'admin_hide_reported_listing',
    entity_type: targetType === 'tin_dang' ? 'marketplace_item' : 'report',
    entity_id: targetId,
    reason: adminNotes,
    admin,
  });

  return true;
}

/**
 * Thao tác 2: Khôi phục tin đăng
 * Chuyển tin về trạng thái available/approved, cập nhật báo cáo thành da_xu_ly
 */
export async function restoreReportedListing(params: {
  targetType: ReportTargetType;
  targetId: string;
  adminNotes: string;
  admin?: User | null;
}): Promise<boolean> {
  const { targetType, targetId, adminNotes, admin } = params;
  assertAdminPermission(admin);

  if (!adminNotes || !adminNotes.trim()) {
    throw new Error('Ghi chú xử lý của Quản trị viên là bắt buộc');
  }

  const now = new Date().toISOString();
  const adminId = admin?.id || null;
  const adminName = admin?.name || 'Ban Quản Trị';

  // 1. Cập nhật tin đăng sang trạng thái hoạt động công khai
  if (isSupabaseConfigured) {
    if (targetType === 'tin_dang') {
      try {
        const { data: rpcRes, error: rpcErr } = await supabase.rpc('admin_restore_reported_listing', {
          p_target_id: targetId,
          p_reason: adminNotes.trim(),
        });
        if (rpcErr) {
          if (rpcErr.code === '42501' || rpcErr.message?.includes('42501') || rpcErr.message?.includes('Quản trị viên')) {
            throw new Error(rpcErr.message || '42501: Chỉ Quản trị viên mới có quyền thực hiện thao tác này');
          }
        }
      } catch (rpcEx: any) {
        if (rpcEx.message?.includes('42501') || rpcEx.message?.includes('Quản trị viên')) {
          throw rpcEx;
        }
      }
    }

    try {
      if (targetType === 'tin_dang') {
        const { data: item, error: itemErr } = await supabase
          .from('marketplace_items')
          .update({
            status: 'available',
            moderation_status: 'approved',
            rejection_reason: null,
            updated_at: now,
          })
          .eq('id', targetId)
          .select('seller_id, title')
          .maybeSingle();

        if (itemErr) {
          if (itemErr.code === '42501' || itemErr.message?.includes('42501') || itemErr.message?.includes('permission denied')) {
            throw new Error(itemErr.message || '42501: Chỉ Quản trị viên mới có quyền thực hiện thao tác này');
          }
        }

        // Gửi thông báo cho người đăng
        if (item?.seller_id) {
          await supabase.from('notifications').insert({
            user_id: item.seller_id,
            type: 'approval',
            title: 'Tin đăng của bạn đã được khôi phục công khai 🎉',
            body: `Tin đăng "${item.title || 'của bạn'}" đã được kiểm tra và hiển thị lại bình thường. Ghi chú: ${adminNotes}`,
            cta_url: `/cho-do-cu/${targetId}`,
            cta_label: 'Xem tin đăng',
            is_read: false,
          });
        }
      }

      // Cập nhật tất cả reports của đối tượng này
      const { error: repErr } = await supabase
        .from('reports')
        .update({
          status: 'da_xu_ly',
          admin_notes: adminNotes,
          resolved_by: adminId,
          resolved_at: now,
          updated_at: now,
        })
        .eq('target_type', targetType)
        .eq('target_id', targetId);

      if (repErr) {
        if (repErr.code === '42501' || repErr.message?.includes('42501') || repErr.message?.includes('permission denied')) {
          throw new Error(repErr.message || '42501: Chỉ Quản trị viên mới có quyền thực hiện thao tác này');
        }
      }
    } catch (err: any) {
      if (err.message?.includes('42501') || err.message?.includes('Quản trị viên')) {
        throw err;
      }
      console.warn('[Admin API] Lỗi restoreReportedListing Supabase:', err);
    }
  }

  // 2. Cập nhật local fallback
  const allReports = getAllStoredReports();
  for (const r of allReports) {
    if (r.target_type === targetType && r.target_id === targetId) {
      updateReportStatus(r.id, 'da_xu_ly', adminNotes, adminId || undefined, adminName, now);
    }
  }

  // 3. Ghi Audit Log
  await logAdminAudit({
    action: 'admin_restore_reported_listing',
    entity_type: targetType === 'tin_dang' ? 'marketplace_item' : 'report',
    entity_id: targetId,
    reason: adminNotes,
    admin,
  });

  return true;
}

/**
 * Thao tác 3: Khóa người dùng vi phạm
 * Đổi trạng thái profile is_banned = true, cập nhật báo cáo thành da_xu_ly
 */
export async function banReportedUser(params: {
  userId: string;
  targetId?: string;
  adminNotes: string;
  durationDays?: number;
  admin?: User | null;
}): Promise<boolean> {
  const { userId, targetId, adminNotes, durationDays = 30, admin } = params;
  assertAdminPermission(admin);

  if (!adminNotes || !adminNotes.trim()) {
    throw new Error('Ghi chú xử lý của Quản trị viên là bắt buộc');
  }

  const now = new Date().toISOString();
  const adminId = admin?.id || null;
  const adminName = admin?.name || 'Ban Quản Trị';

  // 1. Khóa tài khoản
  await banUser(userId, adminNotes, durationDays, admin);

  // 2. Cập nhật báo cáo liên quan
  if (isSupabaseConfigured) {
    try {
      const query = supabase
        .from('reports')
        .update({
          status: 'da_xu_ly',
          admin_notes: adminNotes,
          resolved_by: adminId,
          resolved_at: now,
          updated_at: now,
        });

      if (targetId) {
        query.or(`target_id.eq.${targetId},target_id.eq.${userId},target_owner_id.eq.${userId}`);
      } else {
        query.or(`target_id.eq.${userId},target_owner_id.eq.${userId}`);
      }

      const { error: repErr } = await query;
      if (repErr) {
        if (repErr.code === '42501' || repErr.message?.includes('42501') || repErr.message?.includes('permission denied')) {
          throw new Error(repErr.message || '42501: Chỉ Quản trị viên mới có quyền thực hiện thao tác này');
        }
      }
    } catch (err: any) {
      if (err.message?.includes('42501') || err.message?.includes('Quản trị viên')) {
        throw err;
      }
      console.warn('[Admin API] Lỗi banReportedUser cập nhật reports Supabase:', err);
    }
  }

  // 3. Cập nhật local fallback
  const allReports = getAllStoredReports();
  for (const r of allReports) {
    if (r.target_id === userId || r.target_owner_id === userId || (targetId && r.target_id === targetId)) {
      updateReportStatus(r.id, 'da_xu_ly', adminNotes, adminId || undefined, adminName, now);
    }
  }

  return true;
}

/**
 * Thao tác: Mở khóa người dùng
 * Đổi trạng thái profile is_banned = false, ghi audit log
 */
export async function unbanReportedUser(params: {
  userId: string;
  adminNotes: string;
  admin?: User | null;
}): Promise<boolean> {
  const { userId, adminNotes, admin } = params;
  assertAdminPermission(admin);

  if (!adminNotes || !adminNotes.trim()) {
    throw new Error('Ghi chú lý do mở khóa tài khoản là bắt buộc');
  }

  await unbanUser(userId, adminNotes.trim(), admin);

  await logAdminAudit({
    action: 'admin_unban_reported_user',
    entity_type: 'user',
    entity_id: userId,
    reason: adminNotes.trim(),
    admin,
  });

  return true;
}

/**
 * Thao tác 4: Bác bỏ báo cáo
 * Đổi trạng thái các báo cáo sang 'bac_bo', giữ nguyên đối tượng
 */
export async function dismissReportsGroup(params: {
  targetType: ReportTargetType;
  targetId: string;
  adminNotes: string;
  admin?: User | null;
}): Promise<boolean> {
  const { targetType, targetId, adminNotes, admin } = params;
  assertAdminPermission(admin);

  if (!adminNotes || !adminNotes.trim()) {
    throw new Error('Ghi chú xử lý của Quản trị viên là bắt buộc');
  }

  const now = new Date().toISOString();
  const adminId = admin?.id || null;
  const adminName = admin?.name || 'Ban Quản Trị';

  // 1. Cập nhật trạng thái báo cáo sang bac_bo trên Supabase
  if (isSupabaseConfigured) {
    try {
      const { data: rpcRes, error: rpcErr } = await supabase.rpc('admin_dismiss_reports', {
        p_target_type: targetType,
        p_target_id: targetId,
        p_reason: adminNotes.trim(),
      });
      if (rpcErr) {
        if (rpcErr.code === '42501' || rpcErr.message?.includes('42501') || rpcErr.message?.includes('Quản trị viên')) {
          throw new Error(rpcErr.message || '42501: Chỉ Quản trị viên mới có quyền thực hiện thao tác này');
        }
      }
    } catch (rpcEx: any) {
      if (rpcEx.message?.includes('42501') || rpcEx.message?.includes('Quản trị viên')) {
        throw rpcEx;
      }
    }

    try {
      const { error: repErr } = await supabase
        .from('reports')
        .update({
          status: 'bac_bo',
          admin_notes: adminNotes,
          resolved_by: adminId,
          resolved_at: now,
          updated_at: now,
        })
        .eq('target_type', targetType)
        .eq('target_id', targetId);

      if (repErr) {
        if (repErr.code === '42501' || repErr.message?.includes('42501') || repErr.message?.includes('permission denied')) {
          throw new Error(repErr.message || '42501: Chỉ Quản trị viên mới có quyền thực hiện thao tác này');
        }
      }
    } catch (err: any) {
      if (err.message?.includes('42501') || err.message?.includes('Quản trị viên')) {
        throw err;
      }
      console.warn('[Admin API] Lỗi dismissReportsGroup Supabase:', err);
    }
  }

  // 2. Cập nhật local fallback
  const allReports = getAllStoredReports();
  for (const r of allReports) {
    if (r.target_type === targetType && r.target_id === targetId) {
      updateReportStatus(r.id, 'bac_bo', adminNotes, adminId || undefined, adminName, now);
    }
  }

  // 3. Ghi Audit Log
  await logAdminAudit({
    action: 'admin_dismiss_reports',
    entity_type: 'report',
    entity_id: `${targetType}:${targetId}`,
    reason: adminNotes,
    admin,
  });

  return true;
}

/**
 * Hạ bài đăng tìm bạn ở ghép (chuyển sang trạng thái closed/ẩn)
 */
export async function hideRoommatePost(postId: string, reason: string, admin?: User | null) {
  if (!isSupabaseConfigured) return true;

  const { data: oldPost } = await supabase.from('roommate_posts').select('*').eq('id', postId).maybeSingle();

  const { error } = await supabase
    .from('roommate_posts')
    .update({
      status: 'closed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', postId);

  if (error) {
    console.warn('[Admin API] Lỗi hideRoommatePost:', error);
  }

  await logAdminAudit({
    action: 'hide_roommate_post',
    entity_type: 'roommate',
    entity_id: postId,
    data_before: oldPost ? { status: oldPost.status } : null,
    data_after: { status: 'closed', reason },
    reason,
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

/**
 * Lấy danh sách toàn bộ tin đồ cũ cho Admin kiểm duyệt
 */
export async function getAllMarketplaceItemsAdmin() {
  if (!isSupabaseConfigured) return [];

  try {
    const { data, error } = await supabase
      .from('marketplace_items')
      .select(`
        *,
        seller:profiles!seller_id(id, full_name, avatar_url, phone)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[Admin API] Lỗi getAllMarketplaceItemsAdmin:', error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.warn('[Admin API] Exception getAllMarketplaceItemsAdmin:', err);
    return [];
  }
}

/**
 * Phê duyệt tin đăng đồ cũ
 */
export async function approveMarketplaceItem(itemId: string, admin?: User | null) {
  if (!isSupabaseConfigured) {
    throw new Error('Chưa cấu hình kết nối máy chủ dữ liệu (Supabase).');
  }

  const { data: oldItem } = await supabase
    .from('marketplace_items')
    .select('*')
    .eq('id', itemId)
    .maybeSingle();

  const { data: updatedRows, error } = await supabase
    .from('marketplace_items')
    .update({
      status: 'available',
      moderation_status: 'approved',
      rejection_reason: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId)
    .select('id');

  if (error) throw new Error(error.message || 'Không thể phê duyệt tin đăng');
  if (!updatedRows || updatedRows.length === 0) {
    throw new Error('Không thể phê duyệt: tin không tồn tại hoặc tài khoản không có quyền quản trị.');
  }

  try {
    await logAdminAudit({
      action: 'approve_marketplace_item',
      entity_type: 'marketplace_item',
      entity_id: itemId,
      data_before: oldItem,
      data_after: { status: 'available', moderation_status: 'approved' },
      admin,
    });

    if (oldItem?.seller_id) {
      try {
        await supabase.from('notifications').insert({
          user_id: oldItem.seller_id,
          type: 'approval',
          title: 'Tin đăng thanh lý đã được duyệt! 🎉',
          body: `Món đồ "${oldItem.title || 'của bạn'}" đã được kiểm duyệt và hiển thị công khai trên Chợ đồ cũ sinh viên.`,
          cta_url: `/cho-do-cu/${itemId}`,
          cta_label: 'Xem tin đăng',
          is_read: false,
        });
      } catch (notifErr) {
        console.warn('[Admin] Lỗi gửi thông báo duyệt đồ cũ:', notifErr);
      }
    }
  } catch (err) {
    // Tin đã được duyệt; lỗi ghi nhật ký/thông báo không làm hỏng thao tác chính
    console.warn('[Admin API] approveMarketplaceItem audit/notification error:', err);
  }

  return true;
}

/**
 * Từ chối tin đăng đồ cũ kèm lý do
 */
export async function rejectMarketplaceItem(itemId: string, reason: string, admin?: User | null) {
  if (!isSupabaseConfigured) {
    throw new Error('Chưa cấu hình kết nối máy chủ dữ liệu (Supabase).');
  }

  const { data: oldItem } = await supabase
    .from('marketplace_items')
    .select('*')
    .eq('id', itemId)
    .maybeSingle();

  const { data: updatedRows, error } = await supabase
    .from('marketplace_items')
    .update({
      status: 'rejected',
      moderation_status: 'rejected',
      rejection_reason: reason,
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId)
    .select('id');

  if (error) throw new Error(error.message || 'Không thể từ chối tin đăng');
  if (!updatedRows || updatedRows.length === 0) {
    throw new Error('Không thể từ chối: tin không tồn tại hoặc tài khoản không có quyền quản trị.');
  }

  try {
    await logAdminAudit({
      action: 'reject_marketplace_item',
      entity_type: 'marketplace_item',
      entity_id: itemId,
      data_before: oldItem,
      data_after: { status: 'rejected', moderation_status: 'rejected', rejection_reason: reason },
      reason,
      admin,
    });

    if (oldItem?.seller_id) {
      try {
        await supabase.from('notifications').insert({
          user_id: oldItem.seller_id,
          type: 'rejected',
          title: 'Tin đăng thanh lý bị từ chối ⚠️',
          body: `Lý do: ${reason}. Vui lòng chỉnh sửa lại thông tin món đồ để gửi duyệt lại.`,
          cta_url: `/cho-do-cu`,
          cta_label: 'Sửa & Gửi lại',
          is_read: false,
        });
      } catch (notifErr) {
        console.warn('[Admin] Lỗi gửi thông báo từ chối đồ cũ:', notifErr);
      }
    }
  } catch (err) {
    // Tin đã bị từ chối; lỗi ghi nhật ký/thông báo không làm hỏng thao tác chính
    console.warn('[Admin API] rejectMarketplaceItem audit/notification error:', err);
  }

  return true;
}
