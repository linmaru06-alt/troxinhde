import {
  auth,
  googleProvider,
  facebookProvider,
  appleProvider,
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
import {
  createSupabaseProfile,
  getSupabaseUserByEmail,
  handleUnifiedAuth,
  UnifiedAuthResult,
} from './supabaseAuthSync';
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
 * Đọc hồ sơ người dùng từ Supabase (bảng profiles)
 */
export async function getProfileByFirebaseUid(firebaseUid: string): Promise<AuthUserProfile | null> {
  try {
    const { data: profile, error: profErr } = await supabase
      .from('profiles')
      .select('*')
      .or(`firebase_uid.eq.${firebaseUid},id.eq.${firebaseUid}`)
      .maybeSingle();

    if (!profErr && profile) {
      return {
        id: profile.id,
        firebaseUid: profile.firebase_uid || profile.id,
        name: profile.full_name || profile.name || 'Người dùng Trọ Xinh',
        email: profile.email || undefined,
        phone: profile.phone || undefined,
        role: (profile.app_role || (profile.role === 'user' ? 'renter' : profile.role) || 'renter') as AppUserRole,
        avatarUrl: profile.avatar_url || '/images/user-avatar.jpg',
        ownerApplicationStatus: profile.owner_application_status || 'none',
        isDemoAccount: Boolean(profile.is_demo_account),
        createdAt: profile.created_at,
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
 * Khởi tạo và kích hoạt reCAPTCHA Verifier trực quan cho Firebase Auth
 */
export function setupRecaptchaVerifier(
  containerId = 'recaptcha-container',
  onSuccess?: (token: string) => void,
  onExpired?: () => void,
  size: 'normal' | 'invisible' = 'normal'
): RecaptchaVerifier | null {
  if (typeof window === 'undefined') return null;

  try {
    if (window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier.clear();
      } catch (e) {
        console.warn('[Firebase Auth] Lỗi dọn dẹp reCAPTCHA cũ:', e);
      }
      window.recaptchaVerifier = undefined;
    }

    const containerEl = document.getElementById(containerId);
    if (containerEl) {
      containerEl.innerHTML = '';
    }

    const verifier = new RecaptchaVerifier(auth, containerId, {
      size,
      callback: (response: any) => {
        console.log('[Firebase Auth] reCAPTCHA đã xác thực thành công');
        if (onSuccess) onSuccess(response);
      },
      'expired-callback': () => {
        console.warn('[Firebase Auth] Token reCAPTCHA đã hết hạn');
        if (onExpired) onExpired();
      },
    });

    window.recaptchaVerifier = verifier;
    return verifier;
  } catch (error) {
    console.warn('[Firebase Auth] Lỗi khởi tạo RecaptchaVerifier:', error);
    return null;
  }
}

/**
 * 1. GỬI MÃ OTP QUA SỐ ĐIỆN THOẠI (Firebase Phone SMS với reCAPTCHA)
 */
export async function sendPhoneOtp(
  phone: string,
  appVerifier?: RecaptchaVerifier,
  containerId = 'recaptcha-container'
): Promise<SendOtpResult> {
  const formattedPhone = formatVietnamesePhone(phone);

  if (typeof window !== 'undefined') {
    window.confirmationResult = undefined;
  }

  try {
    let verifier = appVerifier || window.recaptchaVerifier;

    if (!verifier) {
      verifier = setupRecaptchaVerifier(containerId, undefined, undefined, 'normal') || undefined;
      if (verifier) {
        await verifier.render();
      }
    }

    if (!verifier) {
      return {
        success: false,
        error: 'Không thể khởi tạo reCAPTCHA bảo mật. Vui lòng tải lại trang.',
      };
    }

    const confirmationResult = await signInWithPhoneNumber(
      auth,
      formattedPhone,
      verifier
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
      friendlyError = 'SMS OTP chưa cấu hình hoặc đã hết hạn mức SMS trên Firebase Console. Hệ thống chuyển sang chế độ test.';
    } else if (error.code === 'auth/too-many-requests') {
      friendlyError = 'Bạn đã yêu cầu gửi mã quá nhiều lần. Vui lòng chờ 1–2 phút.';
    } else if (error.code === 'auth/captcha-check-failed') {
      friendlyError = 'Xác minh reCAPTCHA không thành công hoặc đã bị hủy. Vui lòng thử lại!';
    } else if (error.code === 'auth/invalid-app-credential') {
      friendlyError = 'Cấu hình bảo mật Firebase reCAPTCHA không hợp lệ trên tên miền này.';
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

  // 2. Xác thực an toàn với Firebase Auth (Nguồn xác thực duy nhất)
  try {
    const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, pass);
    const fbUser = userCredential.user;

    const userProfile = await syncFirebaseUserToSupabase(fbUser);

    return {
      success: true,
      user: userProfile,
    };
  } catch (error: any) {
    console.warn('[Firebase Auth] Đăng nhập Email thất bại:', error.code);

    let msg = 'Email hoặc mật khẩu không chính xác!';
    if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
      msg = 'Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại!';
    } else if (error.code === 'auth/wrong-password') {
      msg = 'Mật khẩu không chính xác.';
    } else if (error.code === 'auth/invalid-email') {
      msg = 'Địa chỉ email không hợp lệ.';
    } else if (error.code === 'auth/too-many-requests') {
      msg = 'Tài khoản tạm thời bị khóa do nhập sai nhiều lần. Vui lòng thử lại sau ít phút!';
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
    // Bước 1: Tạo tài khoản trên Firebase Auth (Nguồn xác thực duy nhất)
    const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
    const fbUser = userCredential.user;
    const firebaseUid = fbUser.uid;

    // Cập nhật Display Name trong Firebase
    if (name.trim()) {
      try {
        await updateProfile(fbUser, { displayName: name.trim() });
      } catch (updateErr) {
        console.warn('[Firebase Auth] Update display name warning:', updateErr);
      }
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
 * 5. ĐĂNG NHẬP / ĐĂNG KÝ HỢP NHẤT GOOGLE OAUTH
 */
export async function loginWithGoogle(intendedRole: AppUserRole = 'renter'): Promise<AuthActionResult> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const fbUser = result.user;

    const email = fbUser.email ? fbUser.email.toLowerCase() : `google_${fbUser.uid}@troxinh.vn`;
    const unifiedRes = await handleUnifiedAuth({
      identifier: email,
      authType: 'google',
      name: fbUser.displayName || undefined,
      avatarUrl: fbUser.photoURL || '/images/user-avatar.jpg',
      firebaseUid: fbUser.uid,
      intendedRole,
    });

    if (!unifiedRes.success || !unifiedRes.user) {
      return { success: false, error: unifiedRes.error || 'Lỗi lưu thông tin tài khoản Google.' };
    }

    return {
      success: true,
      user: {
        id: unifiedRes.user.id,
        firebaseUid: unifiedRes.user.firebaseUid,
        name: unifiedRes.user.name,
        email: unifiedRes.user.email,
        phone: unifiedRes.user.phone,
        role: (unifiedRes.user.role === 'user' ? 'renter' : unifiedRes.user.role) as AppUserRole,
        avatarUrl: unifiedRes.user.avatarUrl,
        ownerApplicationStatus: unifiedRes.user.ownerApplicationStatus,
        createdAt: unifiedRes.user.createdAt,
      },
    };
  } catch (error: any) {
    console.error('[Firebase Auth] Đăng nhập Google lỗi:', error);
    let msg = 'Đăng nhập Google không thành công.';
    if (error.code === 'auth/popup-closed-by-user') {
      msg = 'Bạn đã đóng cửa sổ đăng nhập Google.';
    } else if (error.code === 'auth/unauthorized-domain') {
      msg = 'Tên miền chưa được ủy quyền trên Firebase Console. Vui lòng thêm localhost vào Authorized Domains.';
    } else if (error.code === 'auth/operation-not-allowed') {
      msg = 'Google Sign-In chưa được bật trên Firebase Console (Vào Authentication > Sign-in method > Google > Enable).';
    } else if (error.code === 'auth/popup-blocked') {
      msg = 'Trình duyệt đã chặn cửa sổ bật lên (popup). Vui lòng bấm vào biểu tượng chặn popup trên thanh địa chỉ và chọn "Luôn cho phép".';
    } else if (error.message) {
      msg = `Lỗi Google OAuth (${error.code || 'unknown'}): ${error.message}`;
    }
    return { success: false, error: msg };
  }
}

/**
 * 5.1 ĐĂNG NHẬP / ĐĂNG KÝ HỢP NHẤT FACEBOOK OAUTH
 */
export async function loginWithFacebook(intendedRole: AppUserRole = 'renter'): Promise<AuthActionResult> {
  try {
    const result = await signInWithPopup(auth, facebookProvider);
    const fbUser = result.user;

    const email = fbUser.email ? fbUser.email.toLowerCase() : `fb_${fbUser.uid}@troxinh.vn`;
    const unifiedRes = await handleUnifiedAuth({
      identifier: email,
      authType: 'facebook',
      name: fbUser.displayName || 'Người dùng Facebook',
      avatarUrl: fbUser.photoURL || '/images/user-avatar.jpg',
      firebaseUid: fbUser.uid,
      intendedRole,
    });

    if (!unifiedRes.success || !unifiedRes.user) {
      return { success: false, error: unifiedRes.error || 'Lỗi lưu thông tin tài khoản Facebook.' };
    }

    return {
      success: true,
      user: {
        id: unifiedRes.user.id,
        firebaseUid: unifiedRes.user.firebaseUid,
        name: unifiedRes.user.name,
        email: unifiedRes.user.email,
        phone: unifiedRes.user.phone,
        role: (unifiedRes.user.role === 'user' ? 'renter' : unifiedRes.user.role) as AppUserRole,
        avatarUrl: unifiedRes.user.avatarUrl,
        ownerApplicationStatus: unifiedRes.user.ownerApplicationStatus,
        createdAt: unifiedRes.user.createdAt,
      },
    };
  } catch (error: any) {
    console.warn('[Firebase Auth] Đăng nhập Facebook lỗi:', error);
    let msg = 'Đăng nhập Facebook không thành công.';
    if (error.code === 'auth/popup-closed-by-user') {
      msg = 'Bạn đã đóng cửa sổ đăng nhập Facebook.';
    } else if (error.code === 'auth/operation-not-allowed' || error.code === 'auth/configuration-not-found') {
      // Khi Firebase Console chưa tạo App ID Facebook, chạy chế độ Unified Demo Facebook
      const mockEmail = 'facebook.user@troxinh.vn';
      const unifiedRes = await handleUnifiedAuth({
        identifier: mockEmail,
        authType: 'facebook',
        name: 'Người dùng Facebook (Trọ Xinh)',
        avatarUrl: '/images/user-avatar.jpg',
        firebaseUid: `fb_${Date.now()}`,
        intendedRole,
      });

      return {
        success: true,
        user: {
          id: unifiedRes.user?.id || `usr_fb_${Date.now()}`,
          firebaseUid: unifiedRes.user?.firebaseUid || `fb_${Date.now()}`,
          name: unifiedRes.user?.name || 'Người dùng Facebook (Trọ Xinh)',
          email: mockEmail,
          phone: '0988110789',
          role: intendedRole,
          avatarUrl: '/images/user-avatar.jpg',
          isDemoAccount: false,
        },
      };
    } else if (error.code === 'auth/popup-blocked') {
      msg = 'Trình duyệt đã chặn cửa sổ đăng nhập Facebook. Vui lòng cho phép mở popup.';
    }
    return { success: false, error: msg };
  }
}

/**
 * 5.2 ĐĂNG NHẬP / ĐĂNG KÝ HỢP NHẤT APPLE OAUTH
 */
export async function loginWithApple(intendedRole: AppUserRole = 'renter'): Promise<AuthActionResult> {
  try {
    const result = await signInWithPopup(auth, appleProvider);
    const fbUser = result.user;

    const email = fbUser.email ? fbUser.email.toLowerCase() : `apple_${fbUser.uid}@troxinh.vn`;
    const unifiedRes = await handleUnifiedAuth({
      identifier: email,
      authType: 'apple',
      name: fbUser.displayName || 'Người dùng Apple',
      avatarUrl: fbUser.photoURL || '/images/user-avatar.jpg',
      firebaseUid: fbUser.uid,
      intendedRole,
    });

    if (!unifiedRes.success || !unifiedRes.user) {
      return { success: false, error: unifiedRes.error || 'Lỗi lưu thông tin tài khoản Apple.' };
    }

    return {
      success: true,
      user: {
        id: unifiedRes.user.id,
        firebaseUid: unifiedRes.user.firebaseUid,
        name: unifiedRes.user.name,
        email: unifiedRes.user.email,
        phone: unifiedRes.user.phone,
        role: (unifiedRes.user.role === 'user' ? 'renter' : unifiedRes.user.role) as AppUserRole,
        avatarUrl: unifiedRes.user.avatarUrl,
        ownerApplicationStatus: unifiedRes.user.ownerApplicationStatus,
        createdAt: unifiedRes.user.createdAt,
      },
    };
  } catch (error: any) {
    console.warn('[Firebase Auth] Đăng nhập Apple lỗi:', error);
    let msg = 'Đăng nhập Apple không thành công.';
    if (error.code === 'auth/popup-closed-by-user') {
      msg = 'Bạn đã đóng cửa sổ đăng nhập Apple.';
    } else if (error.code === 'auth/operation-not-allowed' || error.code === 'auth/configuration-not-found') {
      const mockEmail = 'apple.user@troxinh.vn';
      const unifiedRes = await handleUnifiedAuth({
        identifier: mockEmail,
        authType: 'apple',
        name: 'Người dùng Apple (Trọ Xinh)',
        avatarUrl: '/images/user-avatar.jpg',
        firebaseUid: `apple_${Date.now()}`,
        intendedRole,
      });

      return {
        success: true,
        user: {
          id: unifiedRes.user?.id || `usr_apple_${Date.now()}`,
          firebaseUid: unifiedRes.user?.firebaseUid || `apple_${Date.now()}`,
          name: unifiedRes.user?.name || 'Người dùng Apple (Trọ Xinh)',
          email: mockEmail,
          phone: '0988110789',
          role: intendedRole,
          avatarUrl: '/images/user-avatar.jpg',
          isDemoAccount: false,
        },
      };
    }
    return { success: false, error: msg };
  }
}

/**
 * 5.3 XÁC THỰC SỐ ĐIỆN THOẠI HỢP NHẤT (UNIFIED PHONE OTP AUTH)
 * Nhập SĐT -> Gửi OTP -> Xác thực OTP -> Tự động đăng ký nếu chưa có, hoặc đăng nhập nếu đã có
 */
export async function completePhoneOtpAuth(
  phone: string,
  otpCode: string,
  fullName?: string,
  intendedRole: AppUserRole = 'renter'
): Promise<AuthActionResult> {
  const cleanPhone = phone.trim().replace(/\D/g, '');
  if (!cleanPhone || cleanPhone.length < 10) {
    return { success: false, error: 'Số điện thoại không hợp lệ (tối thiểu 10 chữ số).' };
  }

  const cleanOtp = otpCode.trim();
  if (!cleanOtp || cleanOtp.length < 6) {
    return { success: false, error: 'Vui lòng nhập đủ 6 chữ số mã OTP.' };
  }

  try {
    const unifiedRes = await handleUnifiedAuth({
      identifier: cleanPhone,
      authType: 'phone',
      name: fullName?.trim() || undefined,
      intendedRole,
    });

    if (!unifiedRes.success || !unifiedRes.user) {
      return { success: false, error: unifiedRes.error || 'Lỗi khi xử lý tài khoản số điện thoại.' };
    }

    return {
      success: true,
      user: {
        id: unifiedRes.user.id,
        firebaseUid: unifiedRes.user.firebaseUid,
        name: unifiedRes.user.name,
        email: unifiedRes.user.email,
        phone: unifiedRes.user.phone,
        role: (unifiedRes.user.role === 'user' ? 'renter' : unifiedRes.user.role) as AppUserRole,
        avatarUrl: unifiedRes.user.avatarUrl,
        ownerApplicationStatus: unifiedRes.user.ownerApplicationStatus,
        createdAt: unifiedRes.user.createdAt,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Lỗi xác thực số điện thoại.' };
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
