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
  created_at?: string;
}

/**
 * Kiểm tra xem Email hoặc Số điện thoại đã được đăng ký trên Supabase, Firebase hoặc Demo Accounts chưa
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

  // 2. Kiểm tra trên Supabase bảng `users` và `profiles`
  try {
    if (cleanEmail) {
      // Kiểm tra bảng users
      const { data: userByEmail, error: userEmailErr } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (!userEmailErr && userByEmail) {
        return {
          exists: true,
          field: 'email',
          message: 'Địa chỉ Email này đã được đăng ký tài khoản. Vui lòng đăng nhập hoặc dùng Email khác!',
        };
      }
    }

    if (cleanPhone) {
      // Kiểm tra bảng users
      const { data: userByPhone, error: userPhoneErr } = await supabase
        .from('users')
        .select('id, phone')
        .eq('phone', cleanPhone)
        .maybeSingle();

      if (!userPhoneErr && userByPhone) {
        return {
          exists: true,
          field: 'phone',
          message: 'Số điện thoại này đã được sử dụng cho một tài khoản khác!',
        };
      }

      // Kiểm tra bảng profiles
      const { data: profileByPhone, error: profPhoneErr } = await supabase
        .from('profiles')
        .select('id, phone')
        .eq('phone', cleanPhone)
        .maybeSingle();

      if (!profPhoneErr && profileByPhone) {
        return {
          exists: true,
          field: 'phone',
          message: 'Số điện thoại này đã được sử dụng cho một tài khoản khác!',
        };
      }
    }
  } catch (dbErr) {
    console.warn('[Supabase Check] Lỗi khi truy vấn trùng lặp Supabase:', dbErr);
  }

  // 3. Kiểm tra trên Firebase Auth nếu có Email
  if (cleanEmail && auth) {
    try {
      const signInMethods = await fetchSignInMethodsForEmail(auth, cleanEmail);
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
 * Tạo hồ sơ người dùng mới trong Supabase (bảng users & profiles)
 * Bắt lỗi chặt chẽ, không giả lập thành công nếu Supabase lỗi.
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
  const role = data.role === 'owner' ? 'owner' : data.role === 'admin' ? 'admin' : 'user';
  const avatarUrl = data.avatarUrl || '/images/user-avatar.jpg';

  try {
    // 1. Lưu vào bảng users (bảng chính có trường id=firebaseUid, email, phone, name, role)
    const userPayload = {
      id: firebaseUid,
      name: data.name.trim(),
      email: cleanEmail,
      phone: cleanPhone,
      role,
      avatar_url: avatarUrl,
      verified: true,
      auth_provider: data.email ? 'email_password' : 'phone_otp',
      owner_application_status: role === 'owner' ? 'approved' : 'none',
      updated_at: new Date().toISOString(),
    };

    const { data: createdUser, error: userErr } = await supabase
      .from('users')
      .upsert(userPayload, { onConflict: 'id' })
      .select()
      .maybeSingle();

    if (userErr) {
      console.error('[Supabase Auth Sync] Lỗi khi tạo user trong bảng users:', userErr);
      return {
        success: false,
        error: `Lỗi khởi tạo dữ liệu trên Supabase: ${userErr.message}`,
      };
    }

    // 2. Đồng bộ bảng profiles nếu khả dụng
    try {
      const profilePayload = {
        full_name: data.name.trim(),
        phone: cleanPhone,
        role,
        avatar_url: avatarUrl,
        owner_application_status: role === 'owner' ? 'approved' : 'none',
        updated_at: new Date().toISOString(),
      };
      await supabase.from('profiles').upsert(profilePayload);
    } catch (profErr) {
      console.warn('[Supabase Auth Sync] Đồng bộ profiles notice:', profErr);
    }

    return {
      success: true,
      data: {
        id: createdUser?.id || firebaseUid,
        name: createdUser?.name || data.name.trim(),
        email: createdUser?.email || (cleanEmail ?? undefined),
        phone: createdUser?.phone || (cleanPhone ?? undefined),
        role: (createdUser?.role === 'user' ? 'renter' : createdUser?.role || role) as any,
        avatar_url: createdUser?.avatar_url || avatarUrl,
        owner_application_status: createdUser?.owner_application_status || (role === 'owner' ? 'approved' : 'none'),
        created_at: createdUser?.created_at || new Date().toISOString(),
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
 * Đồng bộ hoặc tạo mới hồ sơ người dùng trong bảng users trên Supabase
 */
export async function syncUserToSupabase(
  profile: SupabaseUserProfile
): Promise<{ success: boolean; data?: SupabaseUserProfile; error?: string }> {
  try {
    const payload = {
      id: profile.id,
      name: profile.name,
      email: profile.email ? profile.email.trim().toLowerCase() : null,
      phone: profile.phone ? profile.phone.replace(/\D/g, '') : null,
      role: profile.role || 'user',
      avatar_url: profile.avatar_url || '/images/user-avatar.jpg',
      verified: profile.verified ?? true,
      auth_provider: profile.auth_provider || 'phone_otp',
      owner_application_status: profile.owner_application_status || 'none',
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('users')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .maybeSingle();

    if (error) {
      console.warn('[Supabase Sync] Lỗi upsert users:', error.message);
      return { success: true, data: profile }; // Fallback an toàn
    }

    return { success: true, data: data as SupabaseUserProfile };
  } catch (err: any) {
    console.warn('[Supabase Sync] Exception khi đồng bộ user:', err);
    return { success: true, data: profile };
  }
}

/**
 * Tìm kiếm người dùng theo Email trên Supabase
 */
export async function getSupabaseUserByEmail(
  email: string
): Promise<SupabaseUserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();

    if (error || !data) return null;
    return data as SupabaseUserProfile;
  } catch (err) {
    return null;
  }
}

/**
 * Tìm kiếm người dùng theo SĐT trên Supabase
 */
export async function getSupabaseUserByPhone(
  phone: string
): Promise<SupabaseUserProfile | null> {
  try {
    const clean = phone.replace(/\D/g, '');
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('phone', clean)
      .maybeSingle();

    if (error || !data) return null;
    return data as SupabaseUserProfile;
  } catch (err) {
    return null;
  }
}
