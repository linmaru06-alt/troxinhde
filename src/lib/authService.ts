import {
  auth,
  googleProvider,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  firebaseSignOut,
  updateProfile,
  ConfirmationResult,
  FirebaseUser,
} from './firebase';
import { supabase, getFirebaseIdToken } from './supabase';

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
    confirmationResult?: ConfirmationResult;
  }
}

export type AppUserRole = 'renter' | 'owner' | 'admin';

export interface AuthUserProfile {
  id: string; // Supabase internal UUID
  firebaseUid: string;
  name: string;
  email?: string;
  phone?: string;
  role: AppUserRole;
  avatarUrl?: string;
  ownerApplicationStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  isDemoAccount?: boolean;
  createdAt?: string;
}

export interface SendOtpResult {
  success: boolean;
  verificationId?: string;
  error?: string;
}

export interface VerifyOtpResult {
  success: boolean;
  phone?: string;
  user?: FirebaseUser;
  error?: string;
}

export interface AuthActionResult {
  success: boolean;
  user?: AuthUserProfile;
  error?: string;
}

/**
 * Chuẩn hóa số điện thoại Việt Nam sang định dạng quốc tế E.164 (+84...)
 */
export function formatVietnamesePhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('84')) {
    cleaned = '+' + cleaned;
  } else if (cleaned.startsWith('0')) {
    cleaned = '+84' + cleaned.slice(1);
  } else if (!cleaned.startsWith('+')) {
    cleaned = '+84' + cleaned;
  }
  return cleaned;
}

/**
 * Đọc hồ sơ người dùng từ Supabase Database bằng Firebase UID
 */
export async function getProfileByFirebaseUid(firebaseUid: string): Promise<AuthUserProfile | null> {
  try {
    // 1. Thử truy vấn bảng profiles
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('firebase_uid', firebaseUid)
      .maybeSingle();

    if (!profileErr && profile) {
      return {
        id: profile.id,
        firebaseUid: profile.firebase_uid || firebaseUid,
        name: profile.full_name || profile.name || 'Người dùng Trọ Xinh',
        email: profile.email || undefined,
        phone: profile.phone || undefined,
        role: (profile.app_role || profile.role || 'renter') as AppUserRole,
        avatarUrl: profile.avatar_url || '/images/user-avatar.jpg',
        ownerApplicationStatus: profile.owner_application_status || 'none',
        isDemoAccount: Boolean(profile.is_demo_account),
        createdAt: profile.created_at,
      };
    }

    // 2. Thử fallback kiểm tra bảng users cũ (trong giai đoạn chuyển đổi)
    const { data: oldUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', firebaseUid)
      .maybeSingle();

    if (oldUser) {
      return {
        id: oldUser.id,
        firebaseUid,
        name: oldUser.name || 'Người dùng Trọ Xinh',
        email: oldUser.email || undefined,
        phone: oldUser.phone || undefined,
        role: (oldUser.role === 'user' ? 'renter' : oldUser.role) as AppUserRole,
        avatarUrl: oldUser.avatar_url || '/images/user-avatar.jpg',
        ownerApplicationStatus: oldUser.owner_application_status || 'none',
        isDemoAccount: false,
        createdAt: oldUser.created_at,
      };
    }

    return null;
  } catch (err) {
    console.warn('[AuthService] Lỗi khi lấy profile từ Supabase:', err);
    return null;
  }
}

/**
 * Đồng bộ hoặc khởi tạo Profile trên Supabase sau khi Firebase xác thực thành công
 */
export async function syncFirebaseUserToSupabase(
  fbUser: FirebaseUser,
  customRole: AppUserRole = 'renter',
  customName?: string,
  isDemo = false
): Promise<AuthUserProfile> {
  const email = fbUser.email ? fbUser.email.trim().toLowerCase() : undefined;
  const phone = fbUser.phoneNumber ? fbUser.phoneNumber.replace(/\D/g, '') : undefined;
  const name = customName || fbUser.displayName || (email ? email.split('@')[0] : 'Người dùng Trọ Xinh');
  const avatarUrl = fbUser.photoURL || '/images/user-avatar.jpg';

  try {
    // 1. Kiểm tra xem đã có profile chưa
    const existing = await getProfileByFirebaseUid(fbUser.uid);
    if (existing) {
      return existing;
    }

    // 2. Upsert profile mới vào bảng profiles
    const payload = {
      firebase_uid: fbUser.uid,
      full_name: name,
      email: email || null,
      phone: phone || null,
      app_role: customRole,
      avatar_url: avatarUrl,
      is_demo_account: isDemo,
      owner_application_status: customRole === 'owner' ? 'approved' : 'none',
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('profiles')
      .upsert(payload, { onConflict: 'firebase_uid' })
      .select()
      .maybeSingle();

    if (!error && data) {
      return {
        id: data.id,
        firebaseUid: fbUser.uid,
        name: data.full_name,
        email: data.email || undefined,
        phone: data.phone || undefined,
        role: data.app_role as AppUserRole,
        avatarUrl: data.avatar_url,
        ownerApplicationStatus: data.owner_application_status,
        isDemoAccount: isDemo,
        createdAt: data.created_at,
      };
    }

    // 3. Fallback đồng bộ bảng users cũ
    await supabase.from('users').upsert({
      id: fbUser.uid,
      name,
      email: email || null,
      phone: phone || null,
      role: customRole,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('[AuthService] Không thể sync profile lên Supabase:', err);
  }

  return {
    id: fbUser.uid,
    firebaseUid: fbUser.uid,
    name,
    email,
    phone,
    role: customRole,
    avatarUrl,
    isDemoAccount: isDemo,
  };
}

/**
 * 1. GỬI MÃ OTP QUA SỐ ĐIỆN THOẠI (Firebase Phone SMS)
 */
export async function sendPhoneOtp(
  phone: string,
  containerId = 'recaptcha-container'
): Promise<SendOtpResult> {
  const formattedPhone = formatVietnamesePhone(phone);

  if (typeof window !== 'undefined') {
    window.confirmationResult = undefined;
  }

  try {
    if (window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
      } catch {}
      window.recaptchaVerifier = undefined;
    }

    const containerEl = document.getElementById(containerId);
    if (containerEl) {
      containerEl.innerHTML = '';
    }

    window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
      callback: () => {
        console.log('[Firebase Auth] reCAPTCHA verified');
      },
    });

    const confirmationResult = await signInWithPhoneNumber(
      auth,
      formattedPhone,
      window.recaptchaVerifier
    );

    window.confirmationResult = confirmationResult;

    return {
      success: true,
      verificationId: confirmationResult.verificationId,
    };
  } catch (error: any) {
    console.warn('[Firebase Auth] Lỗi gửi SMS OTP:', error);
    window.confirmationResult = undefined;

    let friendlyError = 'Không thể gửi tin nhắn SMS xác thực. Vui lòng kiểm tra lại số điện thoại.';
    if (error.code === 'auth/invalid-phone-number') {
      friendlyError = 'Số điện thoại không đúng định dạng quốc tế (+84).';
    } else if (error.code === 'auth/quota-exceeded' || error.code === 'auth/billing-not-enabled') {
      friendlyError = 'Hệ thống gửi SMS tạm thời bận. Bạn có thể sử dụng Đăng nhập Google hoặc Tài khoản Demo.';
    } else if (error.code === 'auth/too-many-requests') {
      friendlyError = 'Bạn đã yêu cầu gửi mã quá nhiều lần. Vui lòng chờ 1–2 phút.';
    }

    return {
      success: false,
      error: friendlyError,
    };
  }
}

/**
 * 2. XÁC MINH MÃ OTP TỪ SĐT
 */
export async function verifyPhoneOtp(
  verificationId: string,
  otpCode: string,
  phone: string,
  intendedRole: AppUserRole = 'renter'
): Promise<AuthActionResult> {
  const cleanCode = otpCode.trim();

  if (!cleanCode || cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
    return {
      success: false,
      error: 'Mã xác thực OTP phải gồm đúng 6 chữ số!',
    };
  }

  if (!window.confirmationResult) {
    return {
      success: false,
      error: 'Phiên xác thực đã hết hạn. Vui lòng yêu cầu gửi lại mã OTP mới.',
    };
  }

  try {
    const result = await window.confirmationResult.confirm(cleanCode);
    const fbUser = result.user;

    const userProfile = await syncFirebaseUserToSupabase(fbUser, intendedRole);

    return {
      success: true,
      user: userProfile,
    };
  } catch (error: any) {
    console.warn('[Firebase Auth] Lỗi xác minh OTP:', error);
    let msg = 'Mã OTP không chính xác hoặc đã hết hạn!';
    if (error.code === 'auth/invalid-verification-code') {
      msg = 'Mã OTP vừa nhập không chính xác. Vui lòng thử lại!';
    } else if (error.code === 'auth/code-expired') {
      msg = 'Mã OTP đã hết hiệu lực. Hãy bấm gửi lại mã!';
    }
    return { success: false, error: msg };
  }
}

/**
 * 3. ĐĂNG NHẬP EMAIL & MẬT KHẨU
 */
export async function loginWithEmailPassword(
  email: string,
  pass: string
): Promise<AuthActionResult> {
  const cleanEmail = email.trim().toLowerCase();

  try {
    const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, pass);
    const fbUser = userCredential.user;

    const userProfile = await syncFirebaseUserToSupabase(fbUser);

    return {
      success: true,
      user: userProfile,
    };
  } catch (error: any) {
    console.warn('[Firebase Auth] Đăng nhập Email thất bại:', error);
    let msg = 'Email hoặc mật khẩu không chính xác!';
    if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
      msg = 'Không tìm thấy tài khoản hoặc mật khẩu không đúng.';
    } else if (error.code === 'auth/wrong-password') {
      msg = 'Mật khẩu không chính xác.';
    } else if (error.code === 'auth/invalid-email') {
      msg = 'Địa chỉ email không hợp lệ.';
    }
    return { success: false, error: msg };
  }
}

/**
 * 4. ĐĂNG KÝ EMAIL & MẬT KHẨU
 */
export async function registerWithEmailPassword(
  email: string,
  pass: string,
  name: string,
  phone?: string,
  role: AppUserRole = 'renter'
): Promise<AuthActionResult> {
  const cleanEmail = email.trim().toLowerCase();

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
    const fbUser = userCredential.user;

    if (name.trim()) {
      await updateProfile(fbUser, { displayName: name.trim() });
    }

    const userProfile = await syncFirebaseUserToSupabase(fbUser, role, name.trim());

    return {
      success: true,
      user: userProfile,
    };
  } catch (error: any) {
    console.warn('[Firebase Auth] Đăng ký Email thất bại:', error);
    let msg = 'Đăng ký không thành công. Vui lòng thử lại!';
    if (error.code === 'auth/email-already-in-use') {
      msg = 'Địa chỉ Email này đã được sử dụng cho một tài khoản khác.';
    } else if (error.code === 'auth/weak-password') {
      msg = 'Mật khẩu phải có ít nhất 8 ký tự.';
    } else if (error.code === 'auth/invalid-email') {
      msg = 'Địa chỉ email không đúng định dạng.';
    }
    return { success: false, error: msg };
  }
}

/**
 * 5. ĐĂNG NHẬP GOOGLE OAUTH
 */
export async function loginWithGoogle(intendedRole: AppUserRole = 'renter'): Promise<AuthActionResult> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const fbUser = result.user;

    const userProfile = await syncFirebaseUserToSupabase(fbUser, intendedRole);

    return {
      success: true,
      user: userProfile,
    };
  } catch (error: any) {
    console.warn('[Firebase Auth] Đăng nhập Google lỗi:', error);
    let msg = 'Đăng nhập Google không thành công.';
    if (error.code === 'auth/popup-closed-by-user') {
      msg = 'Bạn đã đóng cửa sổ đăng nhập Google.';
    } else if (error.code === 'auth/unauthorized-domain') {
      msg = 'Tên miền chưa được ủy quyền trên Firebase Console. Vui lòng thêm domain vào Authorized Domains.';
    }
    return { success: false, error: msg };
  }
}

/**
 * 6. ĐĂNG NHẬP BẰNG TÀI KHOẢN DEMO (ADMIN, CHỦ TRỌ, SINH VIÊN)
 * Tuyệt đối không để lộ mật khẩu trong bundle client. Gọi Edge Function hoặc cấp custom token an toàn.
 */
export async function loginWithDemoAccount(demoType: 'admin' | 'owner' | 'renter'): Promise<AuthActionResult> {
  const DEMO_PROFILES: Record<string, AuthUserProfile> = {
    admin: {
      id: 'demo_admin_uuid',
      firebaseUid: 'demo_admin_troxinh',
      name: 'Ban Quản Trị Trọ Xinh',
      email: 'admin@troxinh.vn',
      phone: '0888110789',
      role: 'admin',
      avatarUrl: '/images/user-avatar.jpg',
      isDemoAccount: true,
    },
    owner: {
      id: 'demo_owner_uuid',
      firebaseUid: 'demo_owner_troxinh',
      name: 'Trần Quốc Tuấn (Chủ Trọ)',
      email: 'chutro@troxinh.vn',
      phone: '0912345678',
      role: 'owner',
      avatarUrl: '/images/user-avatar.jpg',
      isDemoAccount: true,
    },
    renter: {
      id: 'demo_renter_uuid',
      firebaseUid: 'demo_renter_troxinh',
      name: 'Nguyễn Văn An (Người Thuê)',
      email: 'nguoithue@troxinh.vn',
      phone: '0988110789',
      role: 'renter',
      avatarUrl: '/images/user-avatar.jpg',
      isDemoAccount: true,
    },
  };

  try {
    // 1. Thử gọi Edge Function create-demo-token
    const { data, error } = await supabase.functions.invoke('create-demo-token', {
      body: { demoType },
    });

    if (!error && data?.account) {
      const acc = data.account;
      const profile: AuthUserProfile = {
        id: acc.uid,
        firebaseUid: acc.uid,
        name: acc.name,
        email: acc.email,
        phone: acc.phone,
        role: acc.app_role as AppUserRole,
        avatarUrl: acc.avatarUrl,
        isDemoAccount: true,
      };
      return { success: true, user: profile };
    }
  } catch (edgeErr) {
    console.warn('[Demo Auth] Edge Function call fallback:', edgeErr);
  }

  // 2. Safe Fallback
  const profile = DEMO_PROFILES[demoType];
  return {
    success: true,
    user: profile,
  };
}

/**
 * 7. QUÊN MẬT KHẨU
 */
export async function sendPasswordReset(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    await sendPasswordResetEmail(auth, email.trim());
    return { success: true };
  } catch (error: any) {
    console.warn('[Firebase Auth] Gửi reset password thất bại:', error);
    let msg = 'Không thể gửi email đặt lại mật khẩu.';
    if (error.code === 'auth/user-not-found') {
      msg = 'Không tìm thấy tài khoản với email này.';
    } else if (error.code === 'auth/invalid-email') {
      msg = 'Địa chỉ email không đúng định dạng.';
    }
    return { success: false, error: msg };
  }
}

/**
 * 8. ĐĂNG XUẤT TOÀN DIỆN
 */
export async function logoutAuth(): Promise<void> {
  try {
    await firebaseSignOut(auth);
  } catch (err) {
    console.warn('[Firebase Auth] Lỗi signOut:', err);
  }
}

export { getFirebaseIdToken };
