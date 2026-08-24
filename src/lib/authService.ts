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
  ConfirmationResult,
  firebaseConfig,
} from './firebase';
import { supabase } from './supabase';
import { syncUserToSupabase } from './supabaseAuthSync';

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
    confirmationResult?: ConfirmationResult;
  }
}

export interface SendOtpResult {
  success: boolean;
  verificationId?: string;
  isSimulated?: boolean;
  demoOtp?: string;
  error?: string;
}

export interface VerifyOtpResult {
  success: boolean;
  phone?: string;
  email?: string;
  user?: any;
  error?: string;
}

export interface AuthActionResult {
  success: boolean;
  user?: {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    role: 'user' | 'renter' | 'owner' | 'admin';
    avatarUrl?: string;
  };
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
 * 1. GỬI MÃ OTP 6 SỐ THẬT VỀ GMAIL (Miễn phí 100% vĩnh viễn không cần thẻ)
 */
export async function sendEmailOtp(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        shouldCreateUser: true,
      },
    });

    if (error) {
      console.warn('[Supabase Auth] Lỗi gửi Email OTP:', error);
      return { success: false, error: error.message };
    }

    console.log(`[Supabase Auth] Đã gửi mã OTP 6 số thật về Gmail: ${email}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Không thể gửi email xác thực.' };
  }
}

/**
 * 2. XÁC MINH MÃ OTP 6 SỐ TỪ GMAIL
 */
export async function verifyEmailOtp(
  email: string,
  token: string
): Promise<{ success: boolean; user?: any; error?: string }> {
  try {
    const cleanToken = token.trim();
    if (!cleanToken || cleanToken.length < 6) {
      return { success: false, error: 'Vui lòng nhập đủ 6 chữ số mã OTP từ email.' };
    }

    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: cleanToken,
      type: 'email',
    });

    if (error) {
      console.warn('[Supabase Auth] Lỗi xác thực OTP Email:', error);
      return {
        success: false,
        error: 'Mã xác thực từ email không chính xác hoặc đã hết hạn. Vui lòng kiểm tra lại!',
      };
    }

    return {
      success: true,
      user: data.user,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Xác thực OTP thất bại.' };
  }
}

/**
 * 3. GỬI MÃ OTP QUA SỐ ĐIỆN THOẠI (Firebase SMS Phone Auth)
 */
export async function sendPhoneOtp(
  phone: string,
  containerId: string = 'recaptcha-container'
): Promise<SendOtpResult> {
  const formattedPhone = formatVietnamesePhone(phone);

  const hasRealFirebase = Boolean(
    firebaseConfig.apiKey &&
    !firebaseConfig.apiKey.includes('DemoKey')
  );

  if (hasRealFirebase && typeof window !== 'undefined') {
    try {
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch (e) {}
        window.recaptchaVerifier = undefined;
      }

      const containerEl = document.getElementById(containerId);
      if (containerEl) {
        containerEl.innerHTML = '';
      }

      window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
        size: 'invisible',
        callback: () => {
          console.log('[Firebase Auth] Invisible reCAPTCHA verified');
        },
        'expired-callback': () => {
          console.warn('[Firebase Auth] reCAPTCHA expired, please retry');
        },
      });

      console.log(`[Firebase Auth] Đang gửi OTP tới ${formattedPhone}...`);
      const confirmationResult = await signInWithPhoneNumber(
        auth,
        formattedPhone,
        window.recaptchaVerifier
      );

      window.confirmationResult = confirmationResult;
      console.log('[Firebase Auth] Đã kích hoạt gửi SMS qua Firebase!');

      return {
        success: true,
        verificationId: confirmationResult.verificationId,
        isSimulated: false,
      };
    } catch (error: any) {
      console.warn('[Firebase Auth] Phản hồi từ Google SMS:', error);
      
      let friendlyError = 'Không thể gửi tin nhắn SMS.';
      if (error.code === 'auth/invalid-phone-number') {
        friendlyError = 'Số điện thoại không đúng định dạng quốc tế (+84).';
      } else if (error.code === 'auth/quota-exceeded' || error.code === 'auth/billing-not-enabled') {
        friendlyError = 'Google yêu cầu bật gói Blaze hoặc dùng số thử nghiệm.';
      } else if (error.code === 'auth/captcha-check-failed') {
        friendlyError = 'Xác minh reCAPTCHA không thành công.';
      } else if (error.code === 'auth/too-many-requests') {
        friendlyError = 'Bạn đã yêu cầu gửi mã quá nhiều lần. Vui lòng đợi 1–2 phút.';
      }

      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const mockVerificationId = `verif_${Date.now()}`;
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(`otp_${mockVerificationId}`, generatedOtp);
      }

      return {
        success: true,
        verificationId: mockVerificationId,
        isSimulated: true,
        demoOtp: generatedOtp,
        error: friendlyError,
      };
    }
  }

  const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
  const mockVerificationId = `verif_${Date.now()}`;
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(`otp_${mockVerificationId}`, generatedOtp);
  }

  return {
    success: true,
    verificationId: mockVerificationId,
    isSimulated: true,
    demoOtp: generatedOtp,
  };
}

/**
 * 4. XÁC MINH MÃ OTP 6 SỐ SĐT
 */
export async function verifyPhoneOtp(
  verificationId: string,
  otpCode: string,
  phone: string
): Promise<VerifyOtpResult> {
  const cleanCode = otpCode.trim();

  if (!cleanCode || cleanCode.length !== 6 || !/^\d{6}$/.test(cleanCode)) {
    return {
      success: false,
      phone,
      error: 'Mã xác thực phải gồm đúng 6 chữ số!',
    };
  }

  // 1. Xác thực bằng Firebase confirmationResult thật
  if (window.confirmationResult) {
    try {
      const result = await window.confirmationResult.confirm(cleanCode);
      return {
        success: true,
        phone,
        user: result.user,
      };
    } catch (error: any) {
      console.warn('[Firebase Auth] Lỗi kiểm tra OTP SMS:', error);
      return {
        success: false,
        phone,
        error: 'Mã OTP từ tin nhắn SMS không chính xác hoặc đã hết hạn!',
      };
    }
  }

  // 2. Xác thực bằng mã trong sessionStorage (fallback)
  if (typeof window !== 'undefined' && verificationId) {
    const savedOtp = sessionStorage.getItem(`otp_${verificationId}`);
    if (savedOtp) {
      if (savedOtp === cleanCode) {
        sessionStorage.removeItem(`otp_${verificationId}`);
        return {
          success: true,
          phone,
          user: { phoneNumber: phone, uid: `usr_${Date.now()}` },
        };
      } else {
        return {
          success: false,
          phone,
          error: 'Mã OTP không chính xác. Vui lòng kiểm tra lại!',
        };
      }
    }
  }

  return {
    success: false,
    phone,
    error: 'Mã xác thực OTP không đúng hoặc đã hết hạn!',
  };
}

/**
 * 5. ĐĂNG NHẬP BẰNG EMAIL + MẬT KHẨU
 */
export async function loginWithEmailPassword(
  email: string,
  pass: string
): Promise<AuthActionResult> {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email.trim(), pass);
    const fbUser = userCredential.user;

    const userProfile = {
      id: fbUser.uid,
      name: fbUser.displayName || email.split('@')[0],
      email: fbUser.email || email,
      phone: fbUser.phoneNumber || undefined,
      role: 'user' as const,
      avatar_url: fbUser.photoURL || '/images/user-avatar.jpg',
      auth_provider: 'email_password',
    };

    await syncUserToSupabase(userProfile);

    return {
      success: true,
      user: {
        id: userProfile.id,
        name: userProfile.name,
        email: userProfile.email,
        phone: userProfile.phone,
        role: userProfile.role,
        avatarUrl: userProfile.avatar_url,
      },
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
 * 6. ĐĂNG KÝ BẰNG EMAIL + MẬT KHẨU
 */
export async function registerWithEmailPassword(
  email: string,
  pass: string,
  name: string,
  phone?: string
): Promise<AuthActionResult> {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    const fbUser = userCredential.user;

    const userProfile = {
      id: fbUser.uid,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone ? phone.replace(/\D/g, '') : undefined,
      role: 'user' as const,
      avatar_url: '/images/user-avatar.jpg',
      auth_provider: 'email_password',
    };

    await syncUserToSupabase(userProfile);

    return {
      success: true,
      user: {
        id: userProfile.id,
        name: userProfile.name,
        email: userProfile.email,
        phone: userProfile.phone,
        role: userProfile.role,
        avatarUrl: userProfile.avatar_url,
      },
    };
  } catch (error: any) {
    console.warn('[Firebase Auth] Đăng ký Email thất bại:', error);
    let msg = 'Đăng ký không thành công. Vui lòng thử lại!';
    if (error.code === 'auth/email-already-in-use') {
      msg = 'Email này đã được sử dụng cho một tài khoản khác.';
    } else if (error.code === 'auth/weak-password') {
      msg = 'Mật khẩu phải có ít nhất 8 ký tự.';
    }
    return { success: false, error: msg };
  }
}

/**
 * 7. ĐĂNG NHẬP 1-CHẠM BẰNG GOOGLE
 */
export async function loginWithGoogle(): Promise<AuthActionResult> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const fbUser = result.user;

    const userProfile = {
      id: fbUser.uid,
      name: fbUser.displayName || 'Người Dùng Google',
      email: fbUser.email || undefined,
      phone: fbUser.phoneNumber || undefined,
      role: 'user' as const,
      avatar_url: fbUser.photoURL || '/images/user-avatar.jpg',
      auth_provider: 'google',
    };

    await syncUserToSupabase(userProfile);

    return {
      success: true,
      user: {
        id: userProfile.id,
        name: userProfile.name,
        email: userProfile.email,
        phone: userProfile.phone,
        role: userProfile.role,
        avatarUrl: userProfile.avatar_url,
      },
    };
  } catch (error: any) {
    console.warn('[Firebase Auth] Đăng nhập Google lỗi:', error);
    let msg = 'Đăng nhập Google không thành công.';
    if (error.code === 'auth/popup-closed-by-user') {
      msg = 'Bạn đã đóng cửa sổ đăng nhập Google.';
    } else if (error.code === 'auth/unauthorized-domain') {
      msg = 'Tên miền chưa được ủy quyền trên Firebase Console.';
    }
    return { success: false, error: msg };
  }
}

/**
 * 8. QUÊN MẬT KHẨU
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
 * 9. ĐĂNG XUẤT TOÀN DIỆN
 */
export async function logoutAuth(): Promise<void> {
  try {
    await firebaseSignOut(auth);
  } catch (err) {
    console.warn('[Firebase Auth] Lỗi signOut:', err);
  }
  if (typeof window !== 'undefined') {
    localStorage.removeItem('troxinh_current_user');
    localStorage.removeItem('troxinh_token');
  }
}
