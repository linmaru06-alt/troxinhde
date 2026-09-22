import { supabase } from './supabase';
import { auth, fetchSignInMethodsForEmail } from './firebase';
import { initialUsers } from '../data/mockData';

export interface SupabaseUserProfile {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: 'user' | 'renter' | 'owner' | 'admin';
  avatar_url?: string;
  verified?: boolean;
  auth_provider?: string;
  owner_application_status?: 'none' | 'pending' | 'approved' | 'rejected';
  school?: string;
  year?: string;
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
  userId: string
): Promise<SupabaseUserProfile | null> {
  if (!userId) return null;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .or(`id.eq.${userId},firebase_uid.eq.${userId}`)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id || userId,
      name: data.full_name || data.name || '',
      email: data.email || undefined,
      phone: data.phone || undefined,
      role: (data.app_role || data.role || 'renter') as any,
      avatar_url: data.avatar_url || '/images/user-avatar.jpg',
      verified: Boolean(data.verified),
      owner_application_status: data.owner_application_status || 'none',
      school: data.school || '',
      year: data.year || '',
      bio: data.bio || '',
      address: data.address || '',
      student_card_url: data.student_card_url || '',
      social_link: data.social_link || data.facebook_link || data.zalo_link || '',
      facebook_link: data.facebook_link || data.social_link || '',
      zalo_link: data.zalo_link || '',
      phone_verified: Boolean(data.phone_verified || data.phone),
      email_verified: Boolean(data.email_verified || data.email),
      student_verified: Boolean(data.student_verified || data.student_card_url),
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  } catch (err) {
    console.warn('[Supabase Sync] Lỗi khi lấy profile từ Supabase:', err);
    return null;
  }
}

/**
 * Đồng bộ hoặc cập nhật hồ sơ người dùng trong bảng `profiles` trên Supabase
 */
export async function syncUserToSupabase(
  profile: SupabaseUserProfile
): Promise<{ success: boolean; data?: SupabaseUserProfile; error?: string }> {
  try {
    const payload: any = {
      firebase_uid: profile.id,
      full_name: profile.name,
      name: profile.name,
      email: profile.email ? profile.email.trim().toLowerCase() : null,
      phone: profile.phone ? profile.phone.replace(/\D/g, '') : null,
      app_role: profile.role === 'user' ? 'renter' : profile.role || 'renter',
      role: profile.role || 'renter',
      avatar_url: profile.avatar_url || '/images/user-avatar.jpg',
      verified: profile.verified ?? true,
      owner_application_status: profile.owner_application_status || 'none',
      school: profile.school || null,
      year: profile.year || null,
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

    const { data, error } = await supabase
      .from('profiles')
      .upsert(payload, { onConflict: 'firebase_uid' })
      .select()
      .maybeSingle();

    if (error) {
      console.warn('[Supabase Sync] Lỗi upsert profiles:', error.message);
      // Thử cập nhật theo ID nếu lỗi conflict
      const { data: updateData, error: updateErr } = await supabase
        .from('profiles')
        .update(payload)
        .or(`id.eq.${profile.id},firebase_uid.eq.${profile.id}`)
        .select()
        .maybeSingle();

      if (updateErr) {
        return { success: false, error: updateErr.message, data: profile };
      }
      return { success: true, data: updateData || profile };
    }

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
        school: data?.school || profile.school,
        year: data?.year || profile.year,
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
      const { data: profileByPhone, error: phoneErr } = await supabase
        .from('profiles')
        .select('id, firebase_uid, phone')
        .eq('phone', cleanPhone)
        .maybeSingle();

      if (!phoneErr && profileByPhone) {
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
    email?: string;
    phone?: string;
    role?: 'user' | 'renter' | 'owner' | 'admin';
    avatarUrl?: string;
    isDemo?: boolean;
  }
): Promise<{ success: boolean; data?: SupabaseUserProfile; error?: string }> {
  const cleanEmail = data.email ? data.email.trim().toLowerCase() : null;
  const cleanPhone = data.phone ? data.phone.replace(/\D/g, '') : null;
  const isSuperAdmin = cleanEmail === 'quan66934@gmail.com' || cleanEmail === 'admin@troxinh.vn';
  const role = isSuperAdmin ? 'admin' : (data.role === 'owner' ? 'owner' : data.role === 'admin' ? 'admin' : 'renter');
  const avatarUrl = data.avatarUrl || '/images/user-avatar.jpg';

  try {
    const profilePayload = {
      firebase_uid: firebaseUid,
      full_name: data.name.trim(),
      name: data.name.trim(),
      email: cleanEmail,
      phone: cleanPhone,
      app_role: role,
      role: role,
      avatar_url: avatarUrl,
      verified: true,
      is_demo_account: Boolean(data.isDemo),
      owner_application_status: role === 'owner' ? 'approved' : 'none',
      updated_at: new Date().toISOString(),
    };

    const { data: createdProfile, error: profErr } = await supabase
      .from('profiles')
      .upsert(profilePayload, { onConflict: 'firebase_uid' })
      .select()
      .maybeSingle();

    if (profErr) {
      console.error('[Supabase Auth Sync] Lỗi khi tạo profile trong bảng profiles:', profErr);
      return {
        success: false,
        error: `Lỗi khởi tạo dữ liệu trên Supabase: ${profErr.message}`,
      };
    }

    const resProfile = createdProfile || profilePayload;

    return {
      success: true,
      data: {
        id: resProfile.id || firebaseUid,
        name: resProfile.full_name || resProfile.name || data.name.trim(),
        email: resProfile.email || (cleanEmail ?? undefined),
        phone: resProfile.phone || (cleanPhone ?? undefined),
        role: (resProfile.app_role || resProfile.role || role) as any,
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
      email: data.email,
      phone: data.phone,
      role: data.app_role || data.role || 'renter',
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
      email: data.email,
      phone: data.phone,
      role: data.app_role || data.role || 'renter',
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
    const isSuperAdmin = cleanEmail === 'quan66934@gmail.com' || cleanEmail === 'admin@troxinh.vn';
    const defaultName =
      (isSuperAdmin ? 'Quản Trị Viên (Quân)' : undefined) ||
      params.name?.trim() ||
      (cleanPhone ? `Người dùng ${cleanPhone.slice(-4)}` : cleanEmail ? cleanEmail.split('@')[0] : 'Người dùng Trọ Xinh');
    const role = isSuperAdmin ? 'admin' : (params.intendedRole === 'owner' ? 'owner' : params.intendedRole === 'admin' ? 'admin' : 'renter');
    const avatar = params.avatarUrl || '/images/user-avatar.jpg';

    const newProfileRecord = {
      firebase_uid: params.firebaseUid || `usr_${Date.now()}`,
      full_name: defaultName,
      name: defaultName,
      email: cleanEmail || null,
      phone: cleanPhone || null,
      app_role: role,
      role: role,
      avatar_url: avatar,
      verified: true,
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
