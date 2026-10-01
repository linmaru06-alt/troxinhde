import { supabase, isSupabaseConfigured } from '../supabase';
import { OwnerApplication, User } from '../../types';
import { logAdminAudit } from './admin';

import { resolveDemoAlias } from '../demoAliases';

export interface SubmitOwnerApplicationParams {
  buildingName: string;
  address: string;
  district: string;
  totalRooms: number;
  cccdNumber: string;
  cccdImageUrl?: string;
  legalDocsNote?: string;
  user: User;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Tìm hoặc tạo Profile UUID tương ứng trong bảng profiles trên Supabase
 */
async function resolveProfileId(user: User): Promise<string> {
  let targetId = user.id;
  if (!UUID_REGEX.test(targetId)) {
    targetId = resolveDemoAlias(targetId) || targetId;
  }
  if (!UUID_REGEX.test(targetId)) {
    targetId = '00000000-0000-4000-8000-' + Date.now().toString(16).padStart(12, '0');
  }

  // Đảm bảo Profile luôn tồn tại trong Supabase trước khi insert vào owner_applications
  if (isSupabaseConfigured) {
    try {
      await supabase.rpc('ensure_profile_exists', {
        p_user_id: targetId,
        p_name: user.name || 'Người dùng Trọ Xinh',
        p_phone: user.phone ? user.phone.replace(/\D/g, '') : null,
        p_avatar: user.avatarUrl || '/images/user-avatar.jpg',
        p_role: user.role || 'renter',
      });
    } catch (e) {
      console.warn('[OwnerUpgrade API] ensure_profile_exists:', e);
    }
  }

  return targetId;
}

/**
 * Gửi đơn đăng ký nâng cấp đối tác Chủ trọ lên Supabase Cloud
 */
export async function submitOwnerApplicationApi(
  params: SubmitOwnerApplicationParams
): Promise<{ success: boolean; data?: OwnerApplication; error?: string }> {
  const { user, buildingName, address, district, totalRooms, cccdNumber, cccdImageUrl, legalDocsNote } = params;

  if (!isSupabaseConfigured) {
    return { success: false, error: 'Chưa cấu hình Supabase Cloud' };
  }

  const appId = crypto.randomUUID();
  const profileId = await resolveProfileId(user);

  const newAppRecord = {
    id: appId,
    user_id: profileId,
    full_name: user.name || 'Người dùng Trọ Xinh',
    phone: user.phone || '',
    cccd: cccdNumber.trim(),
    cccd_number: cccdNumber.trim(),
    room_count: String(totalRooms || 1),
    building_name: buildingName.trim(),
    address: address.trim(),
    district: district.trim(),
    total_rooms: Number(totalRooms) || 1,
    cccd_image_url: cccdImageUrl || null,
    legal_docs_note: legalDocsNote ? legalDocsNote.trim() : null,
    status: 'pending' as const,
    created_at: new Date().toISOString(),
  };

  try {
    // 1. Lưu trực tiếp vào bảng owner_applications trên Supabase
    const { data: insertedApp, error: appError } = await supabase
      .from('owner_applications')
      .insert(newAppRecord)
      .select()
      .maybeSingle();

    if (appError) {
      console.error('[OwnerUpgrade API] Lỗi gửi đơn lên Supabase Cloud:', appError.message);
      return {
        success: false,
        error: `Không thể gửi đơn lên máy chủ: ${appError.message}`,
      };
    }

    // 2. Cập nhật trạng thái owner_application_status trên bảng profiles nếu có profileId
    if (profileId) {
      try {
        await supabase
          .from('profiles')
          .update({
            owner_application_status: 'pending',
            owner_application_date: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', profileId);
      } catch (profErr) {
        console.warn('[OwnerUpgrade API] Cập nhật profiles status:', profErr);
      }
    }

    // 3. Ghi Audit Log lên Supabase
    try {
      await logAdminAudit({
        action: 'submit_owner_application',
        entity_type: 'owner_application',
        entity_id: appId,
        data_after: {
          userId: user.id,
          profileId,
          userName: user.name,
          userPhone: user.phone,
          userEmail: user.email,
          buildingName,
          address,
          district,
          totalRooms,
          cccdNumber,
        },
        reason: `Người dùng ${user.name} (${user.email || user.phone}) gửi đơn đăng ký làm Chủ trọ`,
      });
    } catch (auditErr) {
      console.warn('[OwnerUpgrade API] Ghi audit log:', auditErr);
    }

    const applicationResult: OwnerApplication = {
      id: insertedApp?.id || appId,
      userId: user.id,
      userName: user.name || 'Người dùng',
      userPhone: user.phone || '',
      userEmail: user.email || '',
      buildingName,
      address,
      district,
      totalRooms: Number(totalRooms) || 1,
      cccdNumber,
      cccdImageUrl,
      legalDocsNote,
      status: 'pending',
      createdAt: newAppRecord.created_at,
    };

    return { success: true, data: applicationResult };
  } catch (error: any) {
    console.error('[OwnerUpgrade API] Lỗi ngoại lệ khi gửi đơn:', error);
    return { success: false, error: error?.message || 'Có lỗi xảy ra khi gửi hồ sơ lên máy chủ' };
  }
}

/**
 * Lấy đơn đăng ký gần nhất của người dùng hiện tại từ Supabase
 */
export async function getMyOwnerApplication(userId: string): Promise<OwnerApplication | null> {
  if (!isSupabaseConfigured || !userId) return null;

  try {
    // 1. Thử tìm profileId
    const profileId = UUID_REGEX.test(userId)
      ? userId
      : (await supabase.from('profiles').select('id').eq('firebase_uid', userId).maybeSingle())?.data?.id;

    if (!profileId) return null;

    const { data, error } = await supabase
      .from('owner_applications')
      .select('*')
      .eq('user_id', profileId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;

    return {
      id: data.id,
      userId: userId,
      userName: '',
      userPhone: '',
      buildingName: data.building_name,
      address: data.address,
      district: data.district,
      totalRooms: data.total_rooms || 1,
      cccdNumber: data.cccd_number,
      cccdImageUrl: data.cccd_image_url || undefined,
      legalDocsNote: data.legal_docs_note || undefined,
      status: data.status as any,
      rejectionReason: data.rejection_reason || undefined,
      createdAt: data.created_at,
      reviewedAt: data.reviewed_at || undefined,
    };
  } catch (err) {
    console.warn('[OwnerUpgrade API] Lỗi lấy đơn cá nhân:', err);
    return null;
  }
}

/**
 * Lấy toàn bộ danh sách đơn đăng ký đối tác chủ trọ cho Ban Quản Trị
 */
export async function getAllOwnerApplicationsAdmin(): Promise<OwnerApplication[]> {
  const map = new Map<string, OwnerApplication>();

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('owner_applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        data.forEach((item: any) => {
          map.set(item.id, {
            id: item.id,
            userId: item.user_id || 'unknown_user',
            userName: item.full_name || item.userName || 'Người dùng Trọ Xinh',
            userPhone: item.phone || item.userPhone || 'Chưa cung cấp',
            buildingName: item.building_name || item.buildingName || 'Cơ sở trọ',
            address: item.address || '',
            district: item.district || '',
            totalRooms: Number(item.total_rooms || item.totalRooms) || 1,
            cccdNumber: item.cccd_number || item.cccd || '',
            cccdImageUrl: item.cccd_image_url || item.cccdFrontUrl,
            legalDocsNote: item.legal_docs_note || item.legalDocsNote,
            status: (item.status || 'pending') as 'pending' | 'approved' | 'rejected',
            rejectionReason: item.rejection_reason,
            createdAt: item.created_at || new Date().toISOString(),
            reviewedAt: item.reviewed_at,
          });
        });
      }
    } catch (err) {
      console.warn('[Admin API] Ngoại lệ lấy owner_applications từ Supabase:', err);
    }
  }

  // Luôn hòa nhập với Local Storage / Zustand Store
  try {
    const raw = localStorage.getItem('troxinh-storage');
    if (raw) {
      const parsed = JSON.parse(raw);
      const storeApps = parsed?.state?.ownerApplications || [];
      storeApps.forEach((a: OwnerApplication) => {
        if (!map.has(a.id)) {
          map.set(a.id, a);
        }
      });
    }
  } catch (e) {
    console.warn('[Admin API] Lỗi đọc local store:', e);
  }

  return Array.from(map.values());
}
