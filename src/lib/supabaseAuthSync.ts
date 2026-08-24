import { supabase } from './supabase';

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
 * Kiểm tra xem Email hoặc Số điện thoại đã được đăng ký trên Supabase hay chưa
 */
export async function checkUserExists(params: {
  email?: string;
  phone?: string;
}): Promise<{ exists: boolean; field?: 'email' | 'phone'; message?: string }> {
  try {
    if (params.email) {
      const { data: emailData, error: emailErr } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', params.email.trim().toLowerCase())
        .maybeSingle();

      if (!emailErr && emailData) {
        return {
          exists: true,
          field: 'email',
          message: 'Địa chỉ Email này đã được đăng ký tài khoản!',
        };
      }
    }

    if (params.phone) {
      const cleanPhone = params.phone.replace(/\D/g, '');
      const { data: phoneData, error: phoneErr } = await supabase
        .from('users')
        .select('id, phone')
        .eq('phone', cleanPhone)
        .maybeSingle();

      if (!phoneErr && phoneData) {
        return {
          exists: true,
          field: 'phone',
          message: 'Số điện thoại này đã được sử dụng cho một tài khoản khác!',
        };
      }
    }

    return { exists: false };
  } catch (error) {
    console.warn('[Supabase Sync] Lỗi khi kiểm tra trùng lặp tài khoản:', error);
    // Nếu có lỗi kết nối Supabase, không block luồng người dùng
    return { exists: false };
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
