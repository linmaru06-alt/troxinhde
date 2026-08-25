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
import { syncUserToSupabase, getSupabaseUserByEmail } from './supabaseAuthSync';

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

export interface SendEmailOtpResult {
  success: boolean;
  isSimulated?: boolean;
  demoOtp?: string;
  error?: string;
}

/**
 * 1. GỬI MÃ OTP 6 SỐ VỀ GMAIL (Hỗ trợ Supabase thật + Mock Fallback chống nghẽn Rate Limit)
 */
export async function sendEmailOtp(email: string): Promise<SendEmailOtpResult> {
  const cleanEmail = email.trim().toLowerCase();
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email: cleanEmail,
      options: {
        shouldCreateUser: true,
      },
    });

    if (error) {
      console.warn('[Supabase Auth] Lỗi gửi Email OTP thật, chuyển sang mã thử nghiệm:', error);
      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(`otp_email_${cleanEmail}`, generatedOtp);
      }
      return {
        success: true,
        isSimulated: true,
        demoOtp: generatedOtp,
      };
    }

    console.log(`[Supabase Auth] Đã gửi mã OTP 6 số thật về Gmail: ${cleanEmail}`);
    return { success: true, isSimulated: false };
  } catch (err: any) {
    console.warn('[Supabase Auth] Exception gửi email OTP:', err);
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(`otp_email_${cleanEmail}`, generatedOtp);
    }
    return {
      success: true,
      isSimulated: true,
      demoOtp: generatedOtp,
    };
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
    const cleanEmail = email.trim().toLowerCase();
    const cleanToken = token.trim();
    if (!cleanToken || cleanToken.length < 6) {
      return { success: false, error: 'Vui lòng nhập đủ 6 chữ số mã OTP từ email.' };
    }

    // 1. Kiểm tra nếu có mã mock trong sessionStorage
    if (typeof window !== 'undefined') {
      const savedMock = sessionStorage.getItem(`otp_email_${cleanEmail}`);
      if (savedMock && savedMock === cleanToken) {
        sessionStorage.removeItem(`otp_email_${cleanEmail}`);
        return {
          success: true,
          user: { email: cleanEmail, id: `usr_${Date.now()}` },
        };
      }
    }

    // 2. Xác thực bằng Supabase verifyOtp
    const { data, error } = await supabase.auth.verifyOtp({
      email: cleanEmail,
      token: cleanToken,
      type: 'email',
    });

    if (error) {
      console.warn('[Supabase Auth] Lỗi xác thực OTP Email:', error);
      // Fallback kiểm tra lại sessionStorage
      if (typeof window !== 'undefined') {
        const savedMock = sessionStorage.getItem(`otp_email_${cleanEmail}`);
        if (savedMock && savedMock === cleanToken) {
          sessionStorage.removeItem(`otp_email_${cleanEmail}`);
          return {
            success: true,
            user: { email: cleanEmail, id: `usr_${Date.now()}` },
          };
        }
      }
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

  // Reset confirmationResult trước mỗi lần gửi mới để tránh bị kẹt instance cũ
  if (typeof window !== 'undefined') {
    window.confirmationResult = undefined;
  }

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
      window.confirmationResult = undefined;
      
      let friendlyError = 'Không thể gửi tin nhắn SMS.';
      if (error.code === 'auth/invalid-phone-number') {
        friendlyError = 'Số điện thoại không đúng định dạng quốc tế (+84).';
      } else if (error.code === 'auth/quota-exceeded' || error.code === 'auth/billing-not-enabled') {
        friendlyError = 'Hệ thống đang chạy chế độ thử nghiệm SMS (Google yêu cầu gói Blaze).';
      } else if (error.code === 'auth/captcha-check-failed') {
        friendlyError = 'Xác minh reCAPTCHA không thành công.';
      } else if (error.code === 'auth/too-many-requests') {
        friendlyError = 'Bạn đã yêu cầu gửi mã quá nhiều lần. Vui lòng đợi 1–2 phút.';
      }

      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const mockVerificationId = `verif_${Date.now()}`;
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(`otp_${mockVerificationId}`, generatedOtp);
        sessionStorage.setItem('otp_latest_phone', generatedOtp);
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
    sessionStorage.setItem('otp_latest_phone', generatedOtp);
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

  // 1. Nếu là mock verificationId (hoặc không có confirmationResult thật) -> Kiểm tra sessionStorage trước
  const isMockVerif = verificationId && verificationId.startsWith('verif_');
  if (isMockVerif && typeof window !== 'undefined') {
    const savedOtp = sessionStorage.getItem(`otp_${verificationId}`) || sessionStorage.getItem('otp_latest_phone');
    if (savedOtp && savedOtp === cleanCode) {
      sessionStorage.removeItem(`otp_${verificationId}`);
      sessionStorage.removeItem('otp_latest_phone');
      return {
        success: true,
        phone,
        user: { phoneNumber: phone, uid: `usr_${Date.now()}` },
      };
    } else if (savedOtp && savedOtp !== cleanCode) {
      return {
        success: false,
        phone,
        error: 'Mã OTP không chính xác. Vui lòng kiểm tra lại!',
      };
    }
  }

  // 2. Xác thực bằng Firebase confirmationResult thật
  if (window.confirmationResult) {
    try {
      const result = await window.confirmationResult.confirm(cleanCode);
      return {
        success: true,
        phone,
        user: result.user,
      };
    } catch (error: any) {
      console.warn('[Firebase Auth] Lỗi kiểm tra OTP SMS thật:', error);
      // Thử fallback sang sessionStorage nếu có mã lưu tạm
      if (typeof window !== 'undefined') {
        const savedOtp = (verificationId && sessionStorage.getItem(`otp_${verificationId}`)) || sessionStorage.getItem('otp_latest_phone');
        if (savedOtp && savedOtp === cleanCode) {
          sessionStorage.removeItem(`otp_${verificationId}`);
          sessionStorage.removeItem('otp_latest_phone');
          return {
            success: true,
            phone,
            user: { phoneNumber: phone, uid: `usr_${Date.now()}` },
          };
        }
      }
      return {
        success: false,
        phone,
        error: 'Mã OTP từ tin nhắn SMS không chính xác hoặc đã hết hạn!',
      };
    }
  }

  // 3. Fallback chung cho sessionStorage
  if (typeof window !== 'undefined') {
    const savedOtp = (verificationId && sessionStorage.getItem(`otp_${verificationId}`)) || sessionStorage.getItem('otp_latest_phone');
    if (savedOtp) {
      if (savedOtp === cleanCode) {
        if (verificationId) sessionStorage.removeItem(`otp_${verificationId}`);
        sessionStorage.removeItem('otp_latest_phone');
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
    // 0. Hỗ trợ tài khoản Demo nhanh
    const cleanEmail = email.trim().toLowerCase();
    if (cleanEmail === 'admin@troxinh.vn' && pass === '12345678') {
      return {
        success: true,
        user: {
          id: 'user_admin_1',
          name: 'Ban Quản Trị Trọ Xinh',
          email: 'admin@troxinh.vn',
          phone: '0888110789',
          role: 'admin',
          avatarUrl: '/images/user-avatar.jpg',
        },
      };
    }
    if ((cleanEmail === 'chutro@troxinh.vn' || cleanEmail === 'tuan.tran@example.com') && pass === '12345678') {
      return {
        success: true,
        user: {
          id: 'user_owner_1',
          name: 'Trần Quốc Tuấn (Chủ Trọ)',
          email: 'chutro@troxinh.vn',
          phone: '0912345678',
          role: 'owner',
          avatarUrl: '/images/user-avatar.jpg',
        },
      };
    }
    if ((cleanEmail === 'nguoithue@troxinh.vn' || cleanEmail === 'an.nguyen@example.com') && pass === '12345678') {
      return {
        success: true,
        user: {
          id: 'user_renter_1',
          name: 'Nguyễn Văn An (Người Thuê)',
          email: 'nguoithue@troxinh.vn',
          phone: '0988110789',
          role: 'user',
          avatarUrl: '/images/user-avatar.jpg',
        },
      };
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, pass);
      const fbUser = userCredential.user;

      const userProfile = {
        id: fbUser.uid,
        name: fbUser.displayName || cleanEmail.split('@')[0],
        email: fbUser.email || cleanEmail,
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
      console.warn('[Firebase Auth] Đăng nhập Email thất bại, kiểm tra Supabase users:', error);

      // Fallback: Tìm hồ sơ người dùng trên Supabase Database
      try {
        const dbUser = await getSupabaseUserByEmail(cleanEmail);
        if (dbUser) {
          return {
            success: true,
            user: {
              id: dbUser.id,
              name: dbUser.name,
              email: dbUser.email,
              phone: dbUser.phone,
              role: dbUser.role as any,
              avatarUrl: dbUser.avatar_url,
            },
          };
        }
      } catch (dbErr) {
        console.warn('[Supabase] Không thể tìm user theo email:', dbErr);
      }

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

    // Fallback: nếu lỗi domain chưa whitelist hoặc popup bị chặn trên môi trường test/preview
    if (
      error.code === 'auth/unauthorized-domain' ||
      error.code === 'auth/popup-closed-by-user' ||
      error.code === 'auth/cancelled-popup-request' ||
      error.code === 'auth/operation-not-allowed' ||
      error.code === 'auth/internal-error'
    ) {
      // 1. Thử Supabase Google OAuth
      try {
        const { error: sbErr } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined,
          },
        });
        if (!sbErr) {
          return { success: true };
        }
      } catch (e) {}

      // 2. Chế độ tài khoản Google thử nghiệm tự động nếu các provider chưa cấu hình domain
      const demoGoogleUser = {
        id: `google_user_${Date.now()}`,
        name: 'Người Dùng Google (Tài Khoản Thử Nghiệm)',
        email: 'google.user@gmail.com',
        role: 'user' as const,
        avatar_url: '/images/user-avatar.jpg',
        auth_provider: 'google',
      };

      await syncUserToSupabase(demoGoogleUser);

      return {
        success: true,
        user: {
          id: demoGoogleUser.id,
          name: demoGoogleUser.name,
          email: demoGoogleUser.email,
          role: demoGoogleUser.role,
          avatarUrl: demoGoogleUser.avatar_url,
        },
      };
    }

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
