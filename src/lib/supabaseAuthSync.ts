import { supabase } from './supabase';
import { auth, fetchSignInMethodsForEmail } from './firebase';
import { initialUsers } from '../data/demoUsers';
import { resolveDemoAlias } from './demoAliases';
import { isAdminIdentifier } from './security/sessionIntegrity';

function generateRobustUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {}
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export interface SupabaseUserProfile {
  id: string;
  name: string;
  full_name?: string;
  email?: string;
  phone?: string;
  role: 'user' | 'renter' | 'owner' | 'admin';
  app_role?: 'renter' | 'owner' | 'admin';
  avatar_url?: string;
  verified?: boolean;
  auth_provider?: string;
  owner_application_status?: 'none' | 'pending' | 'approved' | 'rejected';
  school?: string;
  year?: string;
  university?: string;
  student_year?: string;
  bio?: string;
  address?: string;
  student_card_url?: string;
  social_link?: string;
  facebook_link?: string;
  zalo_link?: string;
  phone_verified?: boolean;
  email_verified?: boolean;
  student_verified?: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Lấy dữ liệu hồ sơ người dùng thực tế từ bảng profiles trên Supabase
 */
export async function fetchUserProfileFromSupabase(
  userId?: string
): Promise<SupabaseUserProfile | null> {
  if (!userId || userId === 'undefined' || userId.trim() === '') return null;
  try {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId.trim());
    
    let query = supabase.from('profiles').select('*');
    if (isUUID) {
      query = query.or(`id.eq.${userId},firebase_uid.eq.${userId}`);
    } else {
      query = query.eq('firebase_uid', userId);
    }

    const { data, error } = await query.maybeSingle();

    if (error || !data) {
      return null;
    }

    let privEmail = (data as any).email;
    let privStudentCard = (data as any).student_card_url;
    try {
      const { data: privData } = await supabase
        .from('profile_private')
        .select('email, student_card_url')
        .eq('profile_id', data.id)
        .maybeSingle();
      if (privData) {
        if (privData.email !== undefined && privData.email !== null) privEmail = privData.email;
        if (privData.student_card_url !== undefined && privData.student_card_url !== null) privStudentCard = privData.student_card_url;
      }
    } catch {}

    const schoolVal = data.university || data.school || '';
    const yearVal = data.student_year || data.year || '';

    return {
      id: data.id || userId,
      name: data.full_name || data.name || '',
      full_name: data.full_name || data.name || '',
      email: privEmail || undefined,
      phone: data.phone || undefined,
      role: (data.app_role || data.role || 'renter') as any,
      app_role: (data.app_role || (data.role === 'user' ? 'renter' : data.role) || 'renter') as any,
      avatar_url: data.avatar_url || '/images/user-avatar.jpg',
      verified: Boolean(data.verified),
      owner_application_status: data.owner_application_status || 'none',
      school: schoolVal,
      university: schoolVal,
      year: yearVal,
      student_year: yearVal,
      bio: data.bio || '',
      address: data.address || '',
      student_card_url: privStudentCard || '',
      social_link: data.social_link || data.facebook_link || data.zalo_link || '',
      facebook_link: data.facebook_link || data.social_link || '',
      zalo_link: data.zalo_link || '',
      phone_verified: Boolean(data.phone_verified || data.phone),
      email_verified: Boolean(data.email_verified || privEmail),
      student_verified: Boolean(data.student_verified || privStudentCard),
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  } catch (err) {
    console.warn('[Supabase Sync] Lỗi khi lấy profile từ Supabase:', err);
    return null;
  }
}

/**
 * Cập nhật hoặc lưu trực tiếp thông tin hồ sơ trong bảng `profiles` trên Supabase
 * Sử dụng Supabase client: supabase.from('profiles').upsert(...)
 */
export async function updateUserProfile(
  userId: string,
  data: any
): Promise<{ success: boolean; data?: any; error?: string }> {
  if (!userId || userId === 'undefined' || userId.trim() === '') {
    return { success: false, error: 'Không tìm thấy ID người dùng để cập nhật.' };
  }

  try {
    const cleanUserId = userId.trim();
    const demoResolved = resolveDemoAlias(cleanUserId);
    const effectiveUserId = demoResolved || cleanUserId;
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(effectiveUserId);
    const currentFbUid = auth?.currentUser?.uid || data.firebase_uid || data.firebaseUid || null;
    const isDemo = isDemoUser(effectiveUserId) || isDemoUser(cleanUserId) || (!currentFbUid && !isUUID);

    // Hỗ trợ chế độ demo / thử nghiệm nếu không có session Firebase thực
    if (isDemo && !currentFbUid) {
      console.log('[updateUserProfile] Chế độ demo / kiểm thử, lưu thành công vào trạng thái local:', effectiveUserId);
      const demoData = {
        id: effectiveUserId,
        ...data,
        updated_at: new Date().toISOString(),
      };
      return { success: true, data: demoData };
    }

    // 1. Chuẩn bị Payload khớp với schema bảng profiles
    const upsertPayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (data.name !== undefined || data.full_name !== undefined) {
      const resolvedName = (data.full_name || data.name || '').trim();
      upsertPayload.name = resolvedName;
      upsertPayload.full_name = resolvedName;
    }

    if (data.phone !== undefined) {
      upsertPayload.phone = data.phone && data.phone.trim() !== '' ? data.phone.trim() : null;
    }
    if (data.school !== undefined || data.university !== undefined) {
      const universityVal = (data.university || data.school) ? (data.university || data.school).trim() : null;
      upsertPayload.school = universityVal;
      upsertPayload.university = universityVal;
    }
    if (data.year !== undefined || data.student_year !== undefined) {
      const yearVal = (data.student_year || data.year) ? (data.student_year || data.year).trim() : null;
      upsertPayload.year = yearVal;
      upsertPayload.student_year = yearVal;
    }
    if (data.bio !== undefined) {
      upsertPayload.bio = data.bio ? data.bio.trim() : null;
    }
    if (data.address !== undefined) {
      upsertPayload.address = data.address ? data.address.trim() : null;
    }
    if (data.social_link !== undefined) {
      const sLink = data.social_link ? data.social_link.trim() : null;
      upsertPayload.social_link = sLink;
      upsertPayload.facebook_link = sLink;
    } else if (data.facebook_link !== undefined) {
      const fbLink = data.facebook_link ? data.facebook_link.trim() : null;
      upsertPayload.facebook_link = fbLink;
      upsertPayload.social_link = fbLink;
    }
    if (data.zalo_link !== undefined) {
      upsertPayload.zalo_link = data.zalo_link ? data.zalo_link.trim() : null;
    }
    if (data.avatar_url !== undefined) {
      upsertPayload.avatar_url = data.avatar_url || '/images/user-avatar.jpg';
    }
    if (data.verified !== undefined) {
      upsertPayload.verified = Boolean(data.verified);
    }
    if (data.phone_verified !== undefined) {
      upsertPayload.phone_verified = Boolean(data.phone_verified);
    }
    if (data.student_verified !== undefined) {
      upsertPayload.student_verified = Boolean(data.student_verified);
    }
    if (data.owner_application_status !== undefined) {
      upsertPayload.owner_application_status = data.owner_application_status;
    }
    if (data.role !== undefined || data.app_role !== undefined) {
      const resolvedRole = data.app_role || (data.role === 'user' ? 'renter' : data.role) || 'renter';
      upsertPayload.role = resolvedRole;
      upsertPayload.app_role = resolvedRole;
    }

    // Gắn firebase_uid để đáp ứng RLS policy (profiles_update_own / profiles_insert_own)
    if (currentFbUid) {
      upsertPayload.firebase_uid = currentFbUid;
    }

    // Loại bỏ các trường không thuộc profiles (email và student_card_url được lưu tại profile_private)
    delete (upsertPayload as any).email;
    delete (upsertPayload as any).student_card_url;

    // Loại bỏ hoàn toàn các keys có giá trị undefined trước khi gửi
    Object.keys(upsertPayload).forEach((key) => {
      if (upsertPayload[key] === undefined) {
        delete upsertPayload[key];
      }
    });

    let savedProfileRecord: any = null;
    let upsertError: any = null;

    // 2. Gắn ID chính xác và thực hiện upsert
    if (isUUID) {
      upsertPayload.id = effectiveUserId;

      if (!upsertPayload.firebase_uid) {
        try {
          const { data: existingProf } = await supabase
            .from('profiles')
            .select('firebase_uid')
            .eq('id', effectiveUserId)
            .maybeSingle();
          if (existingProf?.firebase_uid) {
            upsertPayload.firebase_uid = existingProf.firebase_uid;
          }
        } catch {}
      }

      console.log("[updateUserProfile] Upsert Payload (by id):", upsertPayload);

      const res = await supabase
        .from('profiles')
        .upsert(upsertPayload, { onConflict: 'id' })
        .select()
        .maybeSingle();

      savedProfileRecord = res.data;
      upsertError = res.error;
    } else {
      const targetFbUid = currentFbUid || effectiveUserId;
      upsertPayload.firebase_uid = targetFbUid;

      const { data: matchedProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('firebase_uid', targetFbUid)
        .maybeSingle();

      if (matchedProfile?.id) {
        upsertPayload.id = matchedProfile.id;
        console.log("[updateUserProfile] Upsert Payload (matched UUID):", upsertPayload);
        const res = await supabase
          .from('profiles')
          .upsert(upsertPayload, { onConflict: 'id' })
          .select()
          .maybeSingle();

        savedProfileRecord = res.data;
        upsertError = res.error;
      } else {
        if (!upsertPayload.id) {
          upsertPayload.id = generateRobustUUID();
        }
        console.log("[updateUserProfile] Upsert Payload (by firebase_uid with generated UUID):", upsertPayload);
        const res = await supabase
          .from('profiles')
          .upsert(upsertPayload, { onConflict: 'firebase_uid' })
          .select()
          .maybeSingle();

        savedProfileRecord = res.data;
        upsertError = res.error;
      }
    }

    // 3. Bắt lỗi (Error Handling): In chi tiết mã lỗi Supabase ra console log nếu có
    if (upsertError) {
      console.error('[updateUserProfile] Chi tiết mã lỗi Supabase:', {
        code: upsertError.code,
        message: upsertError.message,
        details: upsertError.details,
        hint: upsertError.hint,
      });

      // Nếu lỗi do RLS policy trên môi trường thử nghiệm không có JWT hợp lệ
      if (isDemo || !currentFbUid) {
        console.warn('[updateUserProfile] Bỏ qua lỗi RLS cho tài khoản demo/kiểm thử');
        return {
          success: true,
          data: {
            id: effectiveUserId,
            ...data,
            updated_at: new Date().toISOString(),
          },
        };
      }

      return { success: false, error: upsertError.message || 'Lỗi khi cập nhật hồ sơ người dùng.' };
    }

    // 4. Cập nhật profile_private nếu có truyền email hoặc student_card_url
    const finalProfileId = savedProfileRecord?.id || (isUUID ? effectiveUserId : null);
    if (finalProfileId && (data.student_card_url !== undefined || data.email !== undefined)) {
      try {
        const privPayload: Record<string, any> = {
          profile_id: finalProfileId,
          updated_at: new Date().toISOString(),
        };
        if (data.student_card_url !== undefined) {
          privPayload.student_card_url = data.student_card_url ? data.student_card_url.trim() : null;
        }
        if (data.email !== undefined) {
          privPayload.email = data.email ? data.email.trim().toLowerCase() : null;
        }
        const { error: privError } = await supabase
          .from('profile_private')
          .upsert(privPayload, { onConflict: 'profile_id' });

        if (privError) {
          console.error('[updateUserProfile] Chi tiết mã lỗi Supabase (profile_private):', {
            code: privError.code,
            message: privError.message,
            details: privError.details,
            hint: privError.hint,
          });
        }
      } catch (privErr) {
        console.warn('[Supabase Sync] Lỗi cập nhật profile_private:', privErr);
      }
    }

    if (savedProfileRecord) {
      return { success: true, data: savedProfileRecord };
    }

    return { success: false, error: 'Không thể lưu hồ sơ người dùng vào hệ thống.' };
  } catch (err: any) {
    console.error('[updateUserProfile] Exception:', err);
    return { success: false, error: err?.message || 'Lỗi khi cập nhật hồ sơ người dùng.' };
  }
}

/**
 * Đồng bộ hoặc cập nhật hồ sơ người dùng trong bảng `profiles` trên Supabase
 */
export async function syncUserToSupabase(
  profile: SupabaseUserProfile
): Promise<{ success: boolean; data?: SupabaseUserProfile; error?: string }> {
  try {
    const finalUniversity = (profile.university || profile.school || '').trim() || null;
    const finalStudentYear = (profile.student_year || profile.year || '').trim() || null;

    const updateRes = await updateUserProfile(profile.id, {
      name: profile.name,
      full_name: profile.full_name || profile.name,
      email: profile.email,
      phone: profile.phone,
      role: profile.role,
      app_role: profile.app_role || (profile.role === 'user' ? 'renter' : profile.role),
      avatar_url: profile.avatar_url,
      verified: profile.verified,
      owner_application_status: profile.owner_application_status,
      school: finalUniversity,
      university: finalUniversity,
      year: finalStudentYear,
      student_year: finalStudentYear,
      bio: profile.bio,
      address: profile.address,
      student_card_url: profile.student_card_url,
      social_link: profile.social_link || profile.facebook_link,
      facebook_link: profile.facebook_link || profile.social_link,
      zalo_link: profile.zalo_link,
      phone_verified: profile.phone_verified,
      student_verified: profile.student_verified,
    });

    if (updateRes.success) {
      return {
        success: true,
        data: {
          ...profile,
          school: finalUniversity || profile.school,
          university: finalUniversity || profile.university,
          year: finalStudentYear || profile.year,
          student_year: finalStudentYear || profile.student_year,
          id: updateRes.data?.id || profile.id,
        },
      };
    }

    // Nếu chưa có hồ sơ thì thực hiện upsert an toàn
    const payload: any = {
      full_name: profile.name,
      name: profile.name,
      phone: profile.phone ? profile.phone.replace(/\D/g, '') : null,
      app_role: profile.role === 'user' ? 'renter' : profile.role || 'renter',
      role: profile.role || 'renter',
      avatar_url: profile.avatar_url || '/images/user-avatar.jpg',
      verified: profile.verified ?? true,
      owner_application_status: profile.owner_application_status || 'none',
      school: finalUniversity,
      university: finalUniversity,
      year: finalStudentYear,
      student_year: finalStudentYear,
      bio: profile.bio || null,
      address: profile.address || null,
      student_card_url: profile.student_card_url || null,
      social_link: profile.social_link || profile.facebook_link || null,
      facebook_link: profile.facebook_link || profile.social_link || null,
      zalo_link: profile.zalo_link || null,
      phone_verified: profile.phone_verified ?? Boolean(profile.phone),
      email_verified: profile.email_verified ?? Boolean(profile.email),
      student_verified: profile.student_verified ?? Boolean(profile.student_card_url),
      updated_at: new Date().toISOString(),
    };

    if (profile.id.includes('-') && profile.id.length === 36) {
      payload.id = profile.id;
    } else {
      payload.firebase_uid = profile.id;
    }

    const { data, error } = await supabase
      .from('profiles')
      .upsert(payload)
      .select()
      .maybeSingle();

    if (error) {
      console.warn('[Supabase Sync] Lỗi upsert profiles:', error.message);
      return { success: false, error: error.message, data: profile };
    }

    const returnSchool = data?.university || data?.school || finalUniversity || profile.school;
    const returnYear = data?.student_year || data?.year || finalStudentYear || profile.year;

    return {
      success: true,
      data: {
        id: data?.id || profile.id,
        name: data?.full_name || data?.name || profile.name,
        email: data?.email || profile.email,
        phone: data?.phone || profile.phone,
        role: data?.app_role || data?.role || profile.role,
        avatar_url: data?.avatar_url || profile.avatar_url,
        verified: data?.verified ?? true,
        owner_application_status: data?.owner_application_status || 'none',
        school: returnSchool,
        university: returnSchool,
        year: returnYear,
        student_year: returnYear,
        student_card_url: data?.student_card_url || profile.student_card_url,
        social_link: data?.social_link || profile.social_link,
        phone_verified: Boolean(data?.phone_verified ?? profile.phone_verified),
        student_verified: Boolean(data?.student_verified ?? profile.student_verified),
        created_at: data?.created_at,
        updated_at: data?.updated_at,
      },
    };
  } catch (err: any) {
    console.warn('[Supabase Sync] Exception khi đồng bộ profile:', err);
    return { success: false, error: err.message, data: profile };
  }
}

/**
 * Kiểm tra xem Email hoặc Số điện thoại đã được đăng ký trên Supabase (bảng profiles), Firebase hoặc Demo Accounts chưa
 */
export async function checkUserExists(params: {
  email?: string;
  phone?: string;
}): Promise<{ exists: boolean; field?: 'email' | 'phone'; message?: string }> {
  const cleanEmail = params.email ? params.email.trim().toLowerCase() : undefined;
  const cleanPhone = params.phone ? params.phone.replace(/\D/g, '') : undefined;

  // 1. Kiểm tra trong danh sách tài khoản hệ thống / demo
  if (cleanEmail) {
    const demoFound = initialUsers.find((u) => u.email?.toLowerCase() === cleanEmail);
    if (demoFound) {
      return {
        exists: true,
        field: 'email',
        message: 'Địa chỉ Email này thuộc tài khoản mẫu của hệ thống. Vui lòng sử dụng Email khác hoặc Đăng nhập!',
      };
    }
  }

  if (cleanPhone) {
    const demoPhoneFound = initialUsers.find((u) => u.phone?.replace(/\D/g, '') === cleanPhone);
    if (demoPhoneFound) {
      return {
        exists: true,
        field: 'phone',
        message: 'Số điện thoại này đã được sử dụng cho một tài khoản trong hệ thống!',
      };
    }
  }

  // 2. Kiểm tra trên Supabase bảng `profiles`
  try {
    if (cleanEmail) {
      const { data: profileByEmail, error: emailErr } = await supabase
        .from('profiles')
        .select('id, firebase_uid, email')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (!emailErr && profileByEmail) {
        return {
          exists: true,
          field: 'email',
          message: 'Địa chỉ Email này đã được đăng ký tài khoản. Vui lòng đăng nhập hoặc dùng Email khác!',
        };
      }
    }

    if (cleanPhone) {
      // Chỉ hỏi đúng/sai qua RPC; bảng profiles không cho đọc hồ sơ người khác
      const { data: phoneTaken, error: phoneErr } = await supabase.rpc('is_phone_registered', { p_phone: cleanPhone });

      if (!phoneErr && phoneTaken === true) {
        return {
          exists: true,
          field: 'phone',
          message: 'Số điện thoại này đã được sử dụng cho một tài khoản khác!',
        };
      }
    }
  } catch (dbErr) {
    console.warn('[Supabase Check] Lỗi khi truy vấn trùng lặp profiles:', dbErr);
  }

  // 3. Kiểm tra trên Firebase Auth nếu có Email (non-blocking)
  if (cleanEmail && auth) {
    try {
      const signInMethods = await Promise.race([
        fetchSignInMethodsForEmail(auth, cleanEmail),
        new Promise<string[]>((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500)),
      ]);
      if (signInMethods && signInMethods.length > 0) {
        return {
          exists: true,
          field: 'email',
          message: 'Địa chỉ Email này đã được đăng ký trên hệ thống xác thực. Vui lòng Đăng nhập!',
        };
      }
    } catch (fbErr: any) {
      if (fbErr?.code === 'auth/email-already-in-use') {
        return {
          exists: true,
          field: 'email',
          message: 'Địa chỉ Email này đã được sử dụng. Vui lòng đăng nhập!',
        };
      }
    }
  }

  return { exists: false };
}

/**
 * Tạo hồ sơ người dùng mới trong bảng `profiles` trên Supabase
 * Bắt lỗi chặt chẽ, tuân thủ kiến trúc duy nhất bảng `profiles`.
 */
export async function createSupabaseProfile(
  firebaseUid: string,
  data: {
    name: string;
    full_name?: string;
    email?: string;
    phone?: string;
    role?: 'user' | 'renter' | 'owner' | 'admin';
    app_role?: 'renter' | 'owner' | 'admin';
    avatar_url?: string;
    avatarUrl?: string;
    isDemo?: boolean;
  }
): Promise<{ success: boolean; data?: SupabaseUserProfile; error?: string }> {
  const cleanEmail = data.email ? data.email.trim().toLowerCase() : null;
  const cleanPhone = data.phone ? data.phone.replace(/\D/g, '') : null;
  const isSuperAdmin = isAdminIdentifier(cleanEmail, cleanPhone);
  const isLandlord = cleanEmail === 'phuonglinh832005@gmail.com';
  const role = isSuperAdmin ? 'admin' : isLandlord ? 'owner' : (data.role === 'owner' ? 'owner' : data.role === 'admin' ? 'admin' : 'renter');
  const avatarUrl = data.avatar_url || data.avatarUrl || '/images/user-avatar.jpg';

  try {
    // 1. Kiểm tra xem profile đã tồn tại theo firebase_uid chưa để giữ nguyên ID
    let targetProfileId: string | undefined;
    try {
      const { data: existingProf } = await supabase
        .from('profiles')
        .select('id')
        .eq('firebase_uid', firebaseUid)
        .maybeSingle();
      if (existingProf?.id) {
        targetProfileId = existingProf.id;
      }
    } catch {
      // Bỏ qua lỗi query kiểm tra
    }

    // Nếu chưa có, sinh sẵn UUID mới chuẩn RFC4122 để không bao giờ vi phạm NOT NULL constraint
    if (!targetProfileId) {
      targetProfileId = generateRobustUUID();
    }

    const profilePayload: Record<string, any> = {
      firebase_uid: firebaseUid,
      full_name: data.full_name || data.name.trim(),
      name: data.name.trim(),
      phone: cleanPhone,
      app_role: data.app_role || role,
      role: role,
      avatar_url: avatarUrl,
      is_demo_account: Boolean(data.isDemo),
      owner_application_status: role === 'owner' ? 'approved' : 'none',
      updated_at: new Date().toISOString(),
    };

    if (targetProfileId) {
      profilePayload.id = targetProfileId;
    }

    const { data: createdProfile, error: profErr } = await supabase
      .from('profiles')
      .upsert(profilePayload, { onConflict: 'firebase_uid' })
      .select()
      .maybeSingle();

    if (profErr) {
      console.error('[Supabase Auth Sync] Lỗi khi tạo profile trong bảng profiles:', profErr);
      if (profErr.code === '23505' && /phone/i.test(`${profErr.message} ${profErr.details || ''}`)) {
        return {
          success: false,
          error: 'Số điện thoại này đã gắn với một tài khoản Trọ Xinh khác. Vui lòng đăng nhập đúng tài khoản đó hoặc liên hệ quản trị viên.',
        };
      }
      if (profErr.code === '42501') {
        return {
          success: false,
          error: 'Máy chủ dữ liệu chưa nhận phiên đăng nhập Firebase nên không thể tạo hồ sơ. Vui lòng báo quản trị viên kiểm tra cấu hình xác thực Supabase.',
        };
      }
      return {
        success: false,
        error: `Lỗi khởi tạo dữ liệu trên Supabase: ${profErr.message}`,
      };
    }

    // Không đọc lại được hồ sơ thì không có id thật; không dùng Firebase UID thay thế
    if (!createdProfile?.id) {
      return {
        success: false,
        error: 'Đã gửi yêu cầu tạo hồ sơ nhưng không đọc lại được hồ sơ trên Supabase. Vui lòng đăng nhập lại.',
      };
    }

    if (createdProfile?.id && cleanEmail) {
      try {
        await supabase
          .from('profile_private')
          .upsert({ profile_id: createdProfile.id, email: cleanEmail }, { onConflict: 'profile_id' });
      } catch (privErr) {
        console.warn('[createSupabaseProfile] Lưu profile_private warning:', privErr);
      }
    }

    const resProfile = createdProfile;

    return {
      success: true,
      data: {
        id: resProfile.id,
        name: resProfile.full_name || resProfile.name || data.name.trim(),
        full_name: resProfile.full_name || resProfile.name || data.name.trim(),
        email: resProfile.email || (cleanEmail ?? undefined),
        phone: resProfile.phone || (cleanPhone ?? undefined),
        role: (resProfile.app_role || resProfile.role || role) as any,
        app_role: (resProfile.app_role || resProfile.role || role) as any,
        avatar_url: resProfile.avatar_url || avatarUrl,
        owner_application_status: resProfile.owner_application_status || (role === 'owner' ? 'approved' : 'none'),
        created_at: resProfile.created_at || new Date().toISOString(),
      },
    };
  } catch (err: any) {
    console.error('[Supabase Auth Sync] Exception khi tạo Supabase profile:', err);
    return {
      success: false,
      error: `Không thể kết nối cơ sở dữ liệu Supabase: ${err.message || 'Lỗi không xác định'}`,
    };
  }
}


/**
 * Tìm kiếm người dùng theo Email trên Supabase (bảng profiles)
 */
export async function getSupabaseUserByEmail(
  email: string
): Promise<SupabaseUserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();

    if (error || !data) return null;
    return {
      id: data.id,
      name: data.full_name || data.name || 'Người dùng Trọ Xinh',
      full_name: data.full_name || data.name || 'Người dùng Trọ Xinh',
      email: data.email,
      phone: data.phone,
      role: (data.app_role || data.role || 'renter') as any,
      app_role: (data.app_role || data.role || 'renter') as any,
      avatar_url: data.avatar_url,
      verified: data.verified,
      owner_application_status: data.owner_application_status,
      created_at: data.created_at,
    };
  } catch (err) {
    return null;
  }
}

/**
 * Tìm kiếm người dùng theo SĐT trên Supabase (bảng profiles)
 */
export async function getSupabaseUserByPhone(
  phone: string
): Promise<SupabaseUserProfile | null> {
  try {
    const clean = phone.replace(/\D/g, '');
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('phone', clean)
      .maybeSingle();

    if (error || !data) return null;
    return {
      id: data.id,
      name: data.full_name || data.name || 'Người dùng Trọ Xinh',
      full_name: data.full_name || data.name || 'Người dùng Trọ Xinh',
      email: data.email,
      phone: data.phone,
      role: (data.app_role || data.role || 'renter') as any,
      app_role: (data.app_role || data.role || 'renter') as any,
      avatar_url: data.avatar_url,
      verified: data.verified,
      owner_application_status: data.owner_application_status,
      created_at: data.created_at,
    };
  } catch (err) {
    return null;
  }
}

export interface UnifiedAuthResult {
  success: boolean;
  isNewUser: boolean;
  user?: {
    id: string;
    firebaseUid: string;
    name: string;
    email?: string;
    phone?: string;
    role: 'user' | 'renter' | 'owner' | 'admin';
    avatarUrl?: string;
    ownerApplicationStatus?: 'none' | 'pending' | 'approved' | 'rejected';
    createdAt?: string;
  };
  error?: string;
}

/**
 * ĐỘNG CƠ HỢP NHẤT ĐĂNG KÝ / ĐĂNG NHẬP (UNIFIED AUTH ENGINE) TRÊN BẢNG PROFILES
 * - Nếu SĐT / Email ĐÃ TỒN TẠI trên `profiles` -> Tự động đăng nhập (lấy dữ liệu cũ)
 * - Nếu SĐT / Email CHƯA CÓ trên `profiles` -> Tự động tạo mới profile (Đăng ký)
 */
export async function handleUnifiedAuth(params: {
  identifier: string; // Số điện thoại (0988110789) hoặc Email (user@gmail.com)
  authType: 'phone' | 'google' | 'facebook' | 'apple' | 'email';
  name?: string;
  avatarUrl?: string;
  firebaseUid?: string;
  intendedRole?: 'renter' | 'owner' | 'admin' | 'user';
}): Promise<UnifiedAuthResult> {
  const isPhone = params.authType === 'phone' || !params.identifier.includes('@');
  const cleanPhone = isPhone ? params.identifier.trim().replace(/\D/g, '') : undefined;
  const cleanEmail = !isPhone ? params.identifier.trim().toLowerCase() : undefined;

  try {
    // 1. Kiểm tra tài khoản mẫu / Demo trong initialUsers
    if (cleanPhone) {
      const demoPhoneFound = initialUsers.find((u) => u.phone?.replace(/\D/g, '') === cleanPhone);
      if (demoPhoneFound) {
        // Lấy dữ liệu mới nhất từ DB để không mất avatar
        const { data: latestProfile } = await supabase.from('profiles').select('*').eq('id', demoPhoneFound.id).maybeSingle();
        return {
          success: true,
          isNewUser: false,
          user: {
            id: demoPhoneFound.id,
            firebaseUid: demoPhoneFound.id,
            name: latestProfile?.name || demoPhoneFound.name,
            email: demoPhoneFound.email,
            phone: demoPhoneFound.phone,
            role: demoPhoneFound.role as any,
            avatarUrl: latestProfile?.avatar_url || demoPhoneFound.avatarUrl || '/images/user-avatar.jpg',
            ownerApplicationStatus: demoPhoneFound.ownerApplicationStatus,
            createdAt: demoPhoneFound.createdAt,
          },
        };
      }
    }

    if (cleanEmail) {
      const demoEmailFound = initialUsers.find((u) => u.email?.toLowerCase() === cleanEmail);
      if (demoEmailFound) {
        // Lấy dữ liệu mới nhất từ DB để không mất avatar
        const { data: latestProfile } = await supabase.from('profiles').select('*').eq('id', demoEmailFound.id).maybeSingle();
        return {
          success: true,
          isNewUser: false,
          user: {
            id: demoEmailFound.id,
            firebaseUid: demoEmailFound.id,
            name: latestProfile?.name || demoEmailFound.name,
            email: demoEmailFound.email,
            phone: demoEmailFound.phone,
            role: demoEmailFound.role as any,
            avatarUrl: latestProfile?.avatar_url || demoEmailFound.avatarUrl || '/images/user-avatar.jpg',
            ownerApplicationStatus: demoEmailFound.ownerApplicationStatus,
            createdAt: demoEmailFound.createdAt,
          },
        };
      }
    }

    // 2. Truy vấn Supabase bảng profiles xem đã có tài khoản chưa
    let existingProfile: any = null;

    if (params.firebaseUid) {
      const { data: profByUid } = await supabase
        .from('profiles')
        .select('*')
        .eq('firebase_uid', params.firebaseUid)
        .maybeSingle();
      existingProfile = profByUid;
    }

    if (!existingProfile && cleanPhone) {
      const { data: profByPhone } = await supabase
        .from('profiles')
        .select('*')
        .eq('phone', cleanPhone)
        .maybeSingle();
      existingProfile = profByPhone;
    } else if (!existingProfile && cleanEmail) {
      const { data: profByEmail } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', cleanEmail)
        .maybeSingle();
      existingProfile = profByEmail;
    }

    // 3. NẾU ĐÃ CÓ PROFILE -> ĐĂNG NHẬP NGAY
    if (existingProfile) {
      // Cập nhật updated_at và firebase_uid nếu chưa có
      try {
        await supabase
          .from('profiles')
          .update({
            firebase_uid: params.firebaseUid || existingProfile.firebase_uid,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingProfile.id);
      } catch {}

      return {
        success: true,
        isNewUser: false,
        user: {
          id: existingProfile.id,
          firebaseUid: existingProfile.firebase_uid || existingProfile.id,
          name: existingProfile.full_name || existingProfile.name || 'Người dùng Trọ Xinh',
          email: existingProfile.email || undefined,
          phone: existingProfile.phone || undefined,
          role: (existingProfile.app_role || (existingProfile.role === 'user' ? 'renter' : existingProfile.role) || 'renter') as any,
          avatarUrl: existingProfile.avatar_url || '/images/user-avatar.jpg',
          ownerApplicationStatus: existingProfile.owner_application_status || 'none',
          createdAt: existingProfile.created_at,
        },
      };
    }

    // 4. NẾU CHƯA CÓ PROFILE -> TỰ ĐỘNG ĐĂNG KÝ & LƯU SUPABASE PROFILES
    const isSuperAdmin = isAdminIdentifier(cleanEmail, cleanPhone);
    const isLandlord = cleanEmail === 'phuonglinh832005@gmail.com';
    const defaultName =
      (isSuperAdmin ? 'Quản Trị Viên (Quân)' : undefined) ||
      params.name?.trim() ||
      (cleanPhone ? `Người dùng ${cleanPhone.slice(-4)}` : cleanEmail ? cleanEmail.split('@')[0] : 'Người dùng Trọ Xinh');
    const role = isSuperAdmin ? 'admin' : isLandlord ? 'owner' : (params.intendedRole === 'owner' ? 'owner' : params.intendedRole === 'admin' ? 'admin' : 'renter');
    const avatar = params.avatarUrl || '/images/user-avatar.jpg';

    const newProfileRecord: Record<string, any> = {
      firebase_uid: params.firebaseUid || `usr_${Date.now()}`,
      full_name: defaultName,
      name: defaultName,
      phone: cleanPhone || null,
      app_role: role,
      role: role,
      avatar_url: avatar,
      owner_application_status: role === 'owner' ? 'approved' : 'none',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: createdProfile, error: insertErr } = await supabase
      .from('profiles')
      .upsert(newProfileRecord, { onConflict: 'firebase_uid' })
      .select()
      .maybeSingle();

    if (insertErr) {
      console.warn('[Unified Auth] Profiles insert warning:', insertErr.message);
    }

    if (createdProfile?.id && cleanEmail) {
      try {
        await supabase
          .from('profile_private')
          .upsert({ profile_id: createdProfile.id, email: cleanEmail }, { onConflict: 'profile_id' });
      } catch (privErr) {
        console.warn('[Unified Auth] Lưu profile_private warning:', privErr);
      }
    }

    const savedProfile = createdProfile || newProfileRecord;

    return {
      success: true,
      isNewUser: true,
      user: {
        id: savedProfile.id || params.firebaseUid || `usr_${Date.now()}`,
        firebaseUid: savedProfile.firebase_uid || params.firebaseUid || `usr_${Date.now()}`,
        name: savedProfile.full_name || savedProfile.name || defaultName,
        email: savedProfile.email || undefined,
        phone: savedProfile.phone || undefined,
        role: (savedProfile.app_role || savedProfile.role || role) as any,
        avatarUrl: savedProfile.avatar_url || avatar,
        ownerApplicationStatus: savedProfile.owner_application_status || 'none',
        createdAt: savedProfile.created_at,
      },
    };
  } catch (err: any) {
    console.error('[Unified Auth] Exception:', err);
    return {
      success: false,
      isNewUser: false,
      error: err.message || 'Lỗi khi xử lý xác thực tài khoản.',
    };
  }
}
