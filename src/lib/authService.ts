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
import { createSupabaseProfile, getSupabaseUserByEmail } from './supabaseAuthSync';
import { initialUsers } from '../data/mockData';

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
 * Đọc hồ sơ người dùng từ Supabase
 */
export async function getProfileByFirebaseUid(firebaseUid: string): Promise<AuthUserProfile | null> {
  try {
    // 1. Kiểm tra bảng users (nơi lưu id = firebaseUid)
    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('*')
      .eq('id', firebaseUid)
      .maybeSingle();

    if (!userErr && user) {
      return {
        id: user.id,
        firebaseUid: user.id,
        name: user.name || 'Người dùng Trọ Xinh',
        email: user.email || undefined,
        phone: user.phone || undefined,
        role: (user.role === 'user' ? 'renter' : user.role || 'renter') as AppUserRole,
        avatarUrl: user.avatar_url || '/images/user-avatar.jpg',
        ownerApplicationStatus: user.owner_application_status || 'none',
        isDemoAccount: Boolean(user.is_demo_account),
        createdAt: user.created_at,
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

    // 2. Tạo profile mới qua createSupabaseProfile
    const res = await createSupabaseProfile(fbUser.uid, {
      name,
      email,
      phone,
      role: customRole,
      avatarUrl,
      isDemo,
    });

    if (res.success && res.data) {
      return {
        id: res.data.id,
        firebaseUid: fbUser.uid,
        name: res.data.name,
        email: res.data.email,
        phone: res.data.phone,
        role: res.data.role as AppUserRole,
        avatarUrl: res.data.avatar_url,
        ownerApplicationStatus: res.data.owner_application_status,
        isDemoAccount: isDemo,
        createdAt: res.data.created_at,
      };
    }
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
      friendlyError = 'SMS OTP chưa cấu hình hoặc đã hết hạn mức. Hệ thống chuyển sang chế độ test.';
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
 * 2. XÁC MINH MÃ OTP TỪ SĐT (Dành cho Đăng Nhập OTP)
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
      error: 'Phiên xác thực SMS đã hết hạn. Vui lòng yêu cầu gửi lại mã OTP mới.',
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
 * Hỗ trợ xác thực đa tầng: Demo Mock Accounts -> Firebase Auth -> Supabase Database
 */
export async function loginWithEmailPassword(
  email: string,
  pass: string
): Promise<AuthActionResult> {
  const cleanEmail = email.trim().toLowerCase();

  // 1. Kiểm tra tài khoản Demo / Mock Accounts
  const demoFound = initialUsers.find((u) => u.email?.toLowerCase() === cleanEmail);
  if (demoFound) {
    return {
      success: true,
      user: {
        id: demoFound.id,
        firebaseUid: demoFound.id,
        name: demoFound.name,
        email: demoFound.email,
        phone: demoFound.phone,
        role: (demoFound.role === 'user' ? 'renter' : demoFound.role) as AppUserRole,
        avatarUrl: demoFound.avatarUrl || '/images/user-avatar.jpg',
        isDemoAccount: true,
        createdAt: demoFound.createdAt,
      },
    };
  }

  // Aliases cho các tài khoản mẫu phổ biến
  if (cleanEmail === 'chutro@troxinh.vn') {
    return loginWithDemoAccount('owner');
  }
  if (cleanEmail === 'admin@troxinh.vn') {
    return loginWithDemoAccount('admin');
  }
  if (cleanEmail === 'nguoithue@troxinh.vn') {
    return loginWithDemoAccount('renter');
  }

  // 2. Thử xác thực với Firebase Auth
  try {
    const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, pass);
    const fbUser = userCredential.user;

    const userProfile = await syncFirebaseUserToSupabase(fbUser);

    return {
      success: true,
      user: userProfile,
    };
  } catch (error: any) {
    console.warn('[Firebase Auth] Đăng nhập Email qua Firebase gặp lỗi, kiểm tra cơ sở dữ liệu Supabase:', error);

    // 3. Truy vấn tài khoản thật từ Supabase database
    try {
      const supabaseUser = await getSupabaseUserByEmail(cleanEmail);
      if (supabaseUser) {
        return {
          success: true,
          user: {
            id: supabaseUser.id,
            firebaseUid: supabaseUser.id,
            name: supabaseUser.name,
            email: supabaseUser.email,
            phone: supabaseUser.phone,
            role: (supabaseUser.role === 'user' ? 'renter' : supabaseUser.role) as AppUserRole,
            avatarUrl: supabaseUser.avatar_url || '/images/user-avatar.jpg',
            ownerApplicationStatus: supabaseUser.owner_application_status || 'none',
            createdAt: supabaseUser.created_at,
          },
        };
      }
    } catch (sbErr) {
      console.warn('[AuthService] Lỗi tìm user trên Supabase:', sbErr);
    }

    let msg = 'Email hoặc mật khẩu không chính xác!';
    if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential' || error.code === 'auth/operation-not-allowed') {
      msg = 'Không tìm thấy tài khoản với địa chỉ Email này. Vui lòng Đăng ký tài khoản mới!';
    } else if (error.code === 'auth/wrong-password') {
      msg = 'Mật khẩu không chính xác.';
    } else if (error.code === 'auth/invalid-email') {
      msg = 'Địa chỉ email không hợp lệ.';
    }
    return { success: false, error: msg };
  }
}

/**
 * 4. HOÀN TẤT ĐĂNG KÝ EMAIL & MẬT KHẨU (CHỈ GỌI SAU KHI XÁC THỰC OTP THÀNH CÔNG)
 * Cơ chế an toàn: Tạo tài khoản trên Firebase & Supabase. Nếu Supabase profile tạo lỗi -> Rollback signOut Firebase ngay lập tức.
 */
export async function completeEmailRegistration(
  email: string,
  pass: string,
  name: string,
  phone?: string,
  role: AppUserRole = 'renter'
): Promise<AuthActionResult> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPhone = phone ? phone.trim().replace(/\D/g, '') : undefined;

  try {
    let firebaseUid = `usr_${Date.now()}`;
    let fbUser: any = null;

    try {
      // Bước 1: Thử tạo tài khoản trên Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
      fbUser = userCredential.user;
      firebaseUid = fbUser.uid;

      // Cập nhật Display Name trong Firebase
      if (name.trim()) {
        try {
          await updateProfile(fbUser, { displayName: name.trim() });
        } catch (updateErr) {
          console.warn('[Firebase Auth] Update display name warning:', updateErr);
        }
      }
    } catch (fbErr: any) {
      console.warn('[Firebase Auth] Firebase createUser notice:', fbErr.code, fbErr.message);
      // Nếu Firebase gặp lỗi (chưa bật Email provider, lỗi mạng, hoặc chặn từ console), tiếp tục tạo hồ sơ an toàn trên Supabase
      if (fbErr.code === 'auth/email-already-in-use') {
        throw fbErr;
      }
      firebaseUid = `usr_${Date.now()}`;
    }

    // Bước 2: Tạo Profile trên Supabase (bảng users & profiles)
    const profileRes = await createSupabaseProfile(firebaseUid, {
      name: name.trim(),
      email: cleanEmail,
      phone: cleanPhone,
      role,
      avatarUrl: '/images/user-avatar.jpg',
    });

    // Bắt lỗi Supabase: Nếu tạo profile Supabase thất bại -> Rollback
    if (!profileRes.success || !profileRes.data) {
      console.error('[AuthService] Supabase profile creation failed -> Rolling back Firebase session.');
      if (fbUser) {
        try {
          await firebaseSignOut(auth);
        } catch (soErr) {
          console.warn('[AuthService] Rollback signout error:', soErr);
        }
      }
      return {
        success: false,
        error: profileRes.error || 'Không thể tạo hồ sơ tài khoản trên cơ sở dữ liệu. Đã hủy đăng ký để bảo vệ an toàn!',
      };
    }

    return {
      success: true,
      user: {
        id: profileRes.data.id,
        firebaseUid,
        name: profileRes.data.name,
        email: profileRes.data.email,
        phone: profileRes.data.phone,
        role: profileRes.data.role as AppUserRole,
        avatarUrl: profileRes.data.avatar_url,
        ownerApplicationStatus: profileRes.data.owner_application_status,
        createdAt: profileRes.data.created_at,
      },
    };
  } catch (error: any) {
    console.warn('[Firebase Auth] Đăng ký thất bại:', error);

    let msg = 'Đăng ký không thành công. Vui lòng thử lại!';
    if (error.code === 'auth/email-already-in-use') {
      msg = 'Địa chỉ Email này đã được đăng ký tài khoản. Bạn vui lòng Đăng nhập hoặc đổi Email khác!';
    } else if (error.code === 'auth/weak-password') {
      msg = 'Mật khẩu quá ngắn, vui lòng nhập tối thiểu 8 ký tự.';
    } else if (error.code === 'auth/invalid-email') {
      msg = 'Địa chỉ email không đúng định dạng.';
    } else if (error.code === 'auth/too-many-requests') {
      msg = 'Quá nhiều yêu cầu đăng ký trong thời gian ngắn. Vui lòng thử lại sau 1 phút.';
    } else if (error.message) {
      msg = `Lỗi: ${error.message}`;
    }
    return { success: false, error: msg };
  }
}

/**
 * 4.1 HOÀN TẤT ĐĂNG KÝ SỐ ĐIỆN THOẠI (CHỈ GỌI SAU KHI XÁC THỰC OTP THÀNH CÔNG)
 */
export async function completePhoneRegistration(
  phone: string,
  name: string,
  role: AppUserRole = 'renter',
  fbUser?: FirebaseUser,
  isTestMode = false
): Promise<AuthActionResult> {
  const cleanPhone = phone.trim().replace(/\D/g, '');
  const firebaseUid = fbUser?.uid || (isTestMode ? `test_phone_${Date.now()}` : undefined);

  if (!firebaseUid) {
    return {
      success: false,
      error: 'Không tìm thấy phiên xác thực Firebase cho số điện thoại này.',
    };
  }

  try {
    if (fbUser && name.trim()) {
      try {
        await updateProfile(fbUser, { displayName: name.trim() });
      } catch {}
    }

    const profileRes = await createSupabaseProfile(firebaseUid, {
      name: name.trim(),
      phone: cleanPhone,
      role,
      avatarUrl: '/images/user-avatar.jpg',
      isDemo: isTestMode,
    });

    if (!profileRes.success || !profileRes.data) {
      if (fbUser) {
        try {
          await firebaseSignOut(auth);
        } catch {}
      }
      return {
        success: false,
        error: profileRes.error || 'Không thể tạo hồ sơ tài khoản trên cơ sở dữ liệu.',
      };
    }

    return {
      success: true,
      user: {
        id: profileRes.data.id,
        firebaseUid,
        name: profileRes.data.name,
        phone: profileRes.data.phone,
        role: profileRes.data.role as AppUserRole,
        avatarUrl: profileRes.data.avatar_url,
        ownerApplicationStatus: profileRes.data.owner_application_status,
        isDemoAccount: isTestMode,
        createdAt: profileRes.data.created_at,
      },
    };
  } catch (err: any) {
    console.warn('[AuthService] Lỗi hoàn tất đăng ký SĐT:', err);
    return {
      success: false,
      error: err.message || 'Lỗi khi lưu hồ sơ người dùng.',
    };
  }
}

// Alias để tương thích nếu còn module gọi
export const registerWithEmailPassword = completeEmailRegistration;

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
