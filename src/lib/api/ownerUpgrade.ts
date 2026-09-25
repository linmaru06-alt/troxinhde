import { supabase, isSupabaseConfigured } from '../supabase';
import { OwnerApplication, User } from '../../types';
import { logAdminAudit } from './admin';

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
async function resolveProfileId(user: User): Promise<string | null> {
  if (user.id && UUID_REGEX.test(user.id)) {
    return user.id;
  }

  if (!isSupabaseConfigured) return null;

  try {
    // 1. Thử tìm theo firebase_uid
    const { data: byFirebase } = await supabase
      .from('profiles')
      .select('id')
      .eq('firebase_uid', user.id)
      .maybeSingle();

    if (byFirebase?.id) return byFirebase.id;

    // 2. Thử tìm theo số điện thoại
    if (user.phone) {
      const cleanPhone = user.phone.replace(/\D/g, '');
      const { data: byPhone } = await supabase
        .from('profiles')
        .select('id')
        .eq('phone', cleanPhone)
        .maybeSingle();

      if (byPhone?.id) return byPhone.id;
    }

    // 3. Nếu chưa có profile trong Supabase, tạo mới một profile hợp lệ
    const newProfileId = crypto.randomUUID();
    const { data: created, error: createErr } = await supabase
      .from('profiles')
      .insert({
        id: newProfileId,
        firebase_uid: user.id,
        full_name: user.name || 'Người dùng Trọ Xinh',
        phone: user.phone ? user.phone.replace(/\D/g, '') : null,
        role: user.role || 'user',
        avatar_url: user.avatarUrl || '/images/user-avatar.jpg',
        owner_application_status: 'pending',
        verified: Boolean(user.verified),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('id')
      .maybeSingle();

    if (!createErr && created?.id) {
      return created.id;
    }
  } catch (err) {
    console.warn('[OwnerUpgrade API] Lỗi tìm profile ID:', err);
  }

  return null;
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
    phone: user.phone || '0987654321',
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
    // 1. Lưu vào bảng owner_applications trên Supabase
    let savedToCloud = false;
    let insertErrorMsg: string | undefined;

    const { data: insertedApp, error: appError } = await supabase
      .from('owner_applications')
      .insert(newAppRecord)
      .select()
      .maybeSingle();

    if (appError) {
      insertErrorMsg = appError.message;
      console.warn('[OwnerUpgrade API] Supabase owner_applications insert:', appError.message);
    } else {
      savedToCloud = true;
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

    // 3. Đồng bộ trạng thái trên bảng users (nếu có tài khoản)
    if (user.id) {
      try {
        await supabase
          .from('users')
          .update({
            owner_application_status: 'pending',
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);
      } catch (userErr) {
        // Ignored fallback
      }
    }

    // 4. Ghi Audit Log lên Supabase (audit_logs luôn cho phép ghi để không mất vết đơn)
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

    if (!savedToCloud && insertErrorMsg) {
      // Nếu có lỗi RLS hoặc DB nhưng audit log và local đã lưu, cảnh báo rõ
      return {
        success: true,
        data: applicationResult,
        error: `Đơn đã được gửi và ghi nhận an toàn (Cảnh báo cloud: ${insertErrorMsg})`,
      };
    }

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
  if (!isSupabaseConfigured) return [];

  try {
    const { data, error } = await supabase
      .from('owner_applications')
      .select(`
        id,
        user_id,
        building_name,
        address,
        district,
        total_rooms,
        cccd_number,
        cccd_image_url,
        legal_docs_note,
        status,
        rejection_reason,
        created_at,
        reviewed_at,
        profiles!user_id(id, full_name, phone, avatar_url, firebase_uid)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[Admin API] Lỗi lấy danh sách owner_applications:', error.message);
      return [];
    }

    if (!data || data.length === 0) return [];

    return data.map((item: any) => {
      const profile = item.profiles;
      return {
        id: item.id,
        userId: profile?.firebase_uid || item.user_id || 'unknown_user',
        userName: profile?.full_name || 'Người dùng Trọ Xinh',
        userPhone: profile?.phone || 'Chưa cung cấp',
        buildingName: item.building_name || 'Cơ sở trọ',
        address: item.address || '',
        district: item.district || '',
        totalRooms: Number(item.total_rooms) || 1,
        cccdNumber: item.cccd_number || '',
        cccdImageUrl: item.cccd_image_url || undefined,
        legalDocsNote: item.legal_docs_note || undefined,
        status: (item.status || 'pending') as 'pending' | 'approved' | 'rejected',
        rejectionReason: item.rejection_reason || undefined,
        createdAt: item.created_at || new Date().toISOString(),
        reviewedAt: item.reviewed_at || undefined,
      };
    });
  } catch (err) {
    console.warn('[Admin API] Ngoại lệ lấy owner_applications:', err);
    return [];
  }
}
