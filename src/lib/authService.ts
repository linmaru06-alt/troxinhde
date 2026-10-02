import {
  auth,
  googleProvider,
  facebookProvider,
  appleProvider,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInWithPopup,
  signInWithEmailAndPassword,
  signInWithCustomToken,
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
} from './supabaseAuthSync';
import { initialUsers } from '../data/demoUsers';

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
 * Chuẩn hóa số điện thoại Việt Nam về dạng trong nước (0...) — khớp hàm SQL normalize_vn_phone
 * '+84 912 345 678' / '84912345678' / '0912345678' -> '0912345678'
 */
export function toNationalVietnamesePhone(phone?: string | null): string | undefined {
  if (!phone) return undefined;
  let digits = phone.replace(/\D/g, '');
  if (!digits) return undefined;
  if (digits.startsWith('84') && digits.length >= 11) {
    digits = '0' + digits.slice(2);
  }
  return digits;
}

const PROFILE_UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * id của bảng profiles luôn là UUID. Firebase UID hay mã tạm như `usr_phone_...` không phải id hồ sơ.
 */
export function isProfileUuid(id?: string | null): id is string {
  return Boolean(id && PROFILE_UUID_RE.test(id));
}

function mapProfileRow(profile: any): AuthUserProfile {
  const isSuperAdmin = profile.email === 'quan66934@gmail.com' || profile.email === 'admin@troxinh.vn';
  const isLandlord = profile.email === 'phuonglinh832005@gmail.com';
  const resolvedRole: AppUserRole = isSuperAdmin
    ? 'admin'
    : isLandlord
    ? 'owner'
    : ((profile.app_role || (profile.role === 'user' ? 'renter' : profile.role) || 'renter') as AppUserRole);

  return {
    id: profile.id,
    firebaseUid: profile.firebase_uid || profile.id,
    name: profile.full_name || profile.name || (isSuperAdmin ? 'Quản Trị Viên (Quân)' : 'Người dùng Trọ Xinh'),
    email: profile.email || undefined,
    phone: profile.phone || undefined,
    role: resolvedRole,
    avatarUrl: profile.avatar_url || '/images/user-avatar.jpg',
    ownerApplicationStatus: (isLandlord || resolvedRole === 'owner') ? 'approved' : (profile.owner_application_status || 'none'),
    isDemoAccount: Boolean(profile.is_demo_account),
    createdAt: profile.created_at,
  };
}

/**
 * Đọc hồ sơ theo Firebase UID, ném lỗi thật nếu Supabase lỗi (để phân biệt "chưa có hồ sơ" với "không đọc được").
 */
async function fetchProfileByFirebaseUid(firebaseUid: string): Promise<AuthUserProfile | null> {
  const query = supabase.from('profiles').select('*');
  // Chỉ so khớp cột id (UUID) khi giá trị đúng dạng UUID; Firebase UID ghép vào id.eq sẽ làm cả truy vấn lỗi 22P02
  const { data: profile, error } = await (isProfileUuid(firebaseUid)
    ? query.or(`firebase_uid.eq.${firebaseUid},id.eq.${firebaseUid}`)
    : query.eq('firebase_uid', firebaseUid)
  ).maybeSingle();

  if (error) throw error;
  return profile ? mapProfileRow(profile) : null;
}

/**
 * Đọc hồ sơ người dùng từ Supabase (bảng profiles)
 */
export async function getProfileByFirebaseUid(firebaseUid: string): Promise<AuthUserProfile | null> {
  try {
    return await fetchProfileByFirebaseUid(firebaseUid);
  } catch (err) {
    console.warn('[AuthService] Lỗi khi lấy profile từ Supabase:', err);
    return null;
  }
}

function requireProfileUuid(profile: AuthUserProfile): AuthUserProfile {
  if (!isProfileUuid(profile.id)) {
    throw new Error('Máy chủ không trả về mã hồ sơ hợp lệ. Vui lòng đăng nhập lại.');
  }
  return profile;
}

function isMissingRpcError(error: any): boolean {
  return error?.code === 'PGRST202' || /could not find the function/i.test(error?.message || '');
}

/**
 * Đồng bộ hoặc khởi tạo Profile trên Supabase sau khi Firebase xác thực thành công.
 * Luôn trả về hồ sơ có id là UUID của bảng profiles. Lỗi được ném ra để giao diện hiển thị,
 * không dùng Firebase UID thay cho id hồ sơ.
 */
export async function syncFirebaseUserToSupabase(
  fbUser: FirebaseUser,
  customRole: AppUserRole = 'renter',
  customName?: string,
  isDemo = false
): Promise<AuthUserProfile> {
  const email = fbUser.email ? fbUser.email.trim().toLowerCase() : undefined;
  const isSuperAdmin = email === 'quan66934@gmail.com' || email === 'admin@troxinh.vn';
  const isLandlord = email === 'phuonglinh832005@gmail.com';
  const effectiveRole: AppUserRole = isSuperAdmin ? 'admin' : (isLandlord ? 'owner' : customRole);
  const phone = toNationalVietnamesePhone(fbUser.phoneNumber);
  const name = customName || fbUser.displayName || (isSuperAdmin ? 'Quản Trị Viên (Quân)' : (email ? email.split('@')[0] : 'Người dùng Trọ Xinh'));
  const avatarUrl = fbUser.photoURL || '/images/user-avatar.jpg';

  // 1. Hồ sơ đã gắn với Firebase UID này
  let existing: AuthUserProfile | null;
  try {
    existing = await fetchProfileByFirebaseUid(fbUser.uid);
  } catch (err: any) {
    throw new Error(`Không đọc được hồ sơ tài khoản trên Supabase: ${err?.message || 'lỗi không xác định'}`);
  }
  if (existing) {
    return requireProfileUuid(existing);
  }

  // 2. Hồ sơ cũ cùng số điện thoại (tạo bởi luồng OTP trước đây) — máy chủ chỉ liên kết
  //    khi số khớp claim phone_number mà Firebase đã xác thực trong token
  if (phone) {
    const { data: claimedId, error: claimErr } = await supabase.rpc('claim_profile_by_verified_phone');
    if (claimErr && !isMissingRpcError(claimErr)) {
      throw new Error(`Không thể liên kết hồ sơ theo số điện thoại: ${claimErr.message}`);
    }
    if (claimedId) {
      const claimed = await fetchProfileByFirebaseUid(fbUser.uid);
      if (claimed) return requireProfileUuid(claimed);
    }
  }

  // 3. Chưa có hồ sơ: tạo mới
  const res = await createSupabaseProfile(fbUser.uid, {
    name,
    email,
    phone,
    role: effectiveRole,
    avatarUrl,
    isDemo,
  });

  if (!res.success || !res.data) {
    throw new Error(res.error || 'Không thể tạo hồ sơ tài khoản trên Supabase.');
  }

  return requireProfileUuid({
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
  });
}

/**
 * id hồ sơ (UUID) của phiên hiện tại, dùng ngay trước khi ghi dữ liệu.
 * currentUser lưu trong trình duyệt có thể còn id cũ (phiên trước bản sửa đồng bộ) hoặc
 * chưa kịp được ghi đè lúc vừa mở trang; có phiên Firebase thì luôn đồng bộ lại theo Firebase UID.
 */
export async function resolveSessionProfileId(storedId?: string | null): Promise<string> {
  const fbUser = auth?.currentUser;
  if (!fbUser) {
    // Không có phiên Firebase (ví dụ demo chỉ xem): giữ id đã lưu, máy chủ sẽ báo lỗi phiên rõ ràng
    if (isProfileUuid(storedId)) return storedId;
    throw new Error('Phiên đăng nhập đã hết hạn hoặc chưa đồng bộ hồ sơ. Vui lòng đăng xuất và đăng nhập lại.');
  }
  const profile = await syncFirebaseUserToSupabase(fbUser);
  return profile.id;
}

/**
 * Hoàn tất đăng nhập sau khi Firebase xác thực thành công: gắn phiên với hồ sơ profiles.
 * Không đồng bộ được hồ sơ thì đăng xuất Firebase và trả lỗi, không cho vào ứng dụng với định danh tạm.
 */
export async function completeFirebaseSignIn(
  fbUser: FirebaseUser,
  intendedRole: AppUserRole = 'renter',
  customName?: string
): Promise<AuthActionResult> {
  try {
    const user = await syncFirebaseUserToSupabase(fbUser, intendedRole, customName);
    return { success: true, user };
  } catch (err: any) {
    console.warn('[AuthService] Không thể đồng bộ hồ sơ sau khi xác thực Firebase:', err);
    try {
      await firebaseSignOut(auth);
    } catch {}
    return {
      success: false,
      error: err?.message || 'Không thể đồng bộ hồ sơ tài khoản. Vui lòng thử lại.',
    };
  }
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

    let friendlyError = error.code 
      ? `Không thể gửi tin nhắn SMS xác thực (${error.code}). Vui lòng kiểm tra lại cấu hình Firebase hoặc số điện thoại.`
      : 'Không thể gửi tin nhắn SMS xác thực. Vui lòng kiểm tra lại số điện thoại.';

    if (error.code === 'auth/invalid-phone-number') {
      friendlyError = 'Số điện thoại không đúng định dạng quốc tế (+84).';
    } else if (error.code === 'auth/operation-not-allowed') {
      friendlyError = 'Phương thức đăng nhập Bằng Số Điện Thoại (Phone) chưa được BẬT trong Firebase Console > Authentication > Sign-in method.';
    } else if (error.code === 'auth/unauthorized-domain') {
      friendlyError = 'Tên miền hiện tại chưa được cấp phép trong Firebase Console > Authentication > Settings > Authorized domains.';
    } else if (error.code === 'auth/quota-exceeded' || error.code === 'auth/billing-not-enabled') {
      friendlyError = 'Firebase chưa cấu hình gói thanh toán (Blaze) hoặc đã hết hạn mức gửi SMS. Vui lòng thêm số điện thoại này vào "Phone numbers for testing" trong Firebase Console.';
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
 * 2. XÁC MINH MÃ OTP TỪ SĐT
 * Chỉ Firebase ConfirmationResult mới xác nhận được mã; không có mã dự phòng hay mã hiển thị sẵn.
 */
export async function confirmPhoneOtp(otpCode: string): Promise<VerifyOtpResult> {
  const cleanCode = otpCode.trim();

  if (!/^\d{6}$/.test(cleanCode)) {
    return {
      success: false,
      error: 'Mã xác thực OTP phải gồm đúng 6 chữ số!',
    };
  }

  if (typeof window === 'undefined' || !window.confirmationResult) {
    return {
      success: false,
      error: 'Phiên xác thực SMS đã hết hạn. Vui lòng yêu cầu gửi lại mã OTP mới.',
    };
  }

  try {
    const result = await window.confirmationResult.confirm(cleanCode);
    return { success: true, phone: result.user.phoneNumber || undefined, user: result.user };
  } catch (error: any) {
    console.warn('[Firebase Auth] Lỗi xác minh OTP:', error);
    let msg = 'Mã OTP không chính xác hoặc đã hết hạn!';
    if (error.code === 'auth/invalid-verification-code') {
      msg = 'Mã OTP vừa nhập không chính xác. Vui lòng thử lại!';
    } else if (error.code === 'auth/code-expired') {
      msg = 'Mã OTP đã hết hiệu lực. Hãy bấm gửi lại mã!';
    } else if (error.code === 'auth/too-many-requests') {
      msg = 'Bạn đã nhập sai quá nhiều lần. Vui lòng chờ ít phút rồi gửi lại mã.';
    }
    return { success: false, error: msg };
  }
}

/**
 * 2.1 XÁC MINH OTP RỒI ĐĂNG NHẬP (gắn phiên Firebase với hồ sơ profiles)
 */
export async function verifyPhoneOtp(
  _verificationId: string,
  otpCode: string,
  _phone: string,
  intendedRole: AppUserRole = 'renter'
): Promise<AuthActionResult> {
  const confirmed = await confirmPhoneOtp(otpCode);
  if (!confirmed.success || !confirmed.user) {
    return { success: false, error: confirmed.error };
  }
  return completeFirebaseSignIn(confirmed.user, intendedRole);
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
    const demoIdMap: Record<string, string> = {
      'admin@troxinh.vn': '00000000-0000-0000-0000-000000000001',
      'chutro@troxinh.vn': '00000000-0000-0000-0000-000000000002',
      'nguoithue@troxinh.vn': '00000000-0000-0000-0000-000000000003',
      'user_renter_1': '00000000-0000-0000-0000-000000000003',
      'user_owner_1': '00000000-0000-0000-0000-000000000002',
      'usr_admin_quan66934': '00000000-0000-0000-0000-000000000001',
    };
    const resolvedId = demoIdMap[cleanEmail] || demoIdMap[demoFound.id] || demoFound.id;

    // FETCH LATEST FROM SUPABASE TO PREVENT AVATAR LOSS
    const latestProfile = (await getSupabaseUserByEmail(cleanEmail)) || (await getProfileByFirebaseUid(demoFound.id));

    return {
      success: true,
      user: {
        id: resolvedId,
        firebaseUid: demoFound.id,
        name: latestProfile?.name || demoFound.name,
        email: demoFound.email,
        phone: demoFound.phone,
        role: (demoFound.role === 'user' ? 'renter' : demoFound.role) as AppUserRole,
        avatarUrl: (latestProfile as any)?.avatar_url || (latestProfile as any)?.avatarUrl || demoFound.avatarUrl || '/images/user-avatar.jpg',
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
  let fbUser: FirebaseUser;
  try {
    const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, pass);
    fbUser = userCredential.user;
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
    } else if (error.code === 'auth/operation-not-allowed') {
      msg = 'Đăng nhập bằng Email & Mật khẩu chưa được bật trong Firebase Console > Authentication > Sign-in method. Vui lòng đăng nhập bằng Google hoặc Số điện thoại.';
    }
    return { success: false, error: msg };
  }

  // 3. Gắn phiên Firebase với hồ sơ profiles; lỗi đồng bộ được báo riêng, không nhầm thành sai mật khẩu
  return completeFirebaseSignIn(fbUser);
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
 * 4.1 HOÀN TẤT ĐĂNG KÝ SỐ ĐIỆN THOẠI (CHỈ GỌI SAU KHI FIREBASE XÁC THỰC OTP THÀNH CÔNG)
 * Bắt buộc có Firebase user thật; số đã có hồ sơ thì đăng nhập vào đúng hồ sơ đó.
 */
export async function completePhoneRegistration(
  _phone: string,
  name: string,
  role: AppUserRole = 'renter',
  fbUser?: FirebaseUser
): Promise<AuthActionResult> {
  if (!fbUser) {
    return {
      success: false,
      error: 'Không tìm thấy phiên xác thực hợp lệ cho số điện thoại này. Vui lòng xác thực lại OTP.',
    };
  }

  if (name.trim()) {
    try {
      await updateProfile(fbUser, { displayName: name.trim() });
    } catch {}
  }

  return completeFirebaseSignIn(fbUser, role, name.trim() || undefined);
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

    return await completeFirebaseSignIn(fbUser, intendedRole, fbUser.displayName || undefined);
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
    } else if (error.code === 'auth/internal-error') {
      msg = 'Lỗi kết nối Firebase (auth/internal-error): Kết nối mạng đến Google bị gián đoạn hoặc tên miền hiện tại chưa được cấp quyền trong Firebase Console (Authentication > Settings > Authorized domains).';
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

    return await completeFirebaseSignIn(fbUser, intendedRole, fbUser.displayName || 'Người dùng Facebook');
  } catch (error: any) {
    console.warn('[Firebase Auth] Đăng nhập Facebook lỗi:', error);
    let msg = 'Đăng nhập Facebook không thành công.';
    if (error.code === 'auth/popup-closed-by-user') {
      msg = 'Bạn đã đóng cửa sổ đăng nhập Facebook.';
    } else if (error.code === 'auth/operation-not-allowed' || error.code === 'auth/configuration-not-found') {
      msg = 'Đăng nhập Facebook chưa được cấu hình hoặc kích hoạt trên Firebase Console. Vui lòng đăng nhập bằng Google hoặc Số điện thoại.';
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

    return await completeFirebaseSignIn(fbUser, intendedRole, fbUser.displayName || 'Người dùng Apple');
  } catch (error: any) {
    console.warn('[Firebase Auth] Đăng nhập Apple lỗi:', error);
    let msg = 'Đăng nhập Apple không thành công.';
    if (error.code === 'auth/popup-closed-by-user') {
      msg = 'Bạn đã đóng cửa sổ đăng nhập Apple.';
    } else if (error.code === 'auth/operation-not-allowed' || error.code === 'auth/configuration-not-found') {
      msg = 'Đăng nhập Apple chưa được cấu hình hoặc kích hoạt trên Firebase Console. Vui lòng đăng nhập bằng Google hoặc Số điện thoại.';
    } else if (error.code === 'auth/popup-blocked') {
      msg = 'Trình duyệt đã chặn cửa sổ đăng nhập Apple. Vui lòng cho phép mở popup.';
    }
    return { success: false, error: msg };
  }
}

/**
 * 5.3 XÁC THỰC SỐ ĐIỆN THOẠI HỢP NHẤT (UNIFIED PHONE OTP AUTH)
 * Nhập SĐT -> Gửi OTP -> Xác thực OTP -> Tự động đăng ký nếu chưa có, hoặc đăng nhập nếu đã có
 */
export async function completePhoneOtpAuth(
  _phone: string,
  _otpCode: string,
  _fullName?: string,
  _intendedRole: AppUserRole = 'renter'
): Promise<AuthActionResult> {
  // Tuân thủ quy tắc bảo mật: Không tạo phiên ảo hay bypass OTP mà không có Firebase Phone Auth ConfirmationResult
  return {
    success: false,
    error: 'Vui lòng xác thực số điện thoại qua màn hình OTP Firebase chính thức để đảm bảo an toàn tài khoản.',
  };
}

/**
 * 6. ĐĂNG NHẬP BẰNG TÀI KHOẢN DEMO (ADMIN, CHỦ TRỌ, SINH VIÊN)
 * Tuyệt đối không để lộ mật khẩu trong bundle client. Gọi Edge Function hoặc cấp custom token an toàn.
 */
export async function loginWithDemoAccount(demoType: 'admin' | 'owner' | 'renter'): Promise<AuthActionResult> {
  const DEMO_PROFILES: Record<string, AuthUserProfile> = {
    admin: {
      id: '00000000-0000-0000-0000-000000000001',
      firebaseUid: 'demo_admin_troxinh',
      name: 'Ban Quản Trị Trọ Xinh',
      email: 'admin@troxinh.vn',
      phone: '0999000001',
      role: 'admin',
      avatarUrl: '/images/user-avatar.jpg',
      isDemoAccount: true,
    },
    owner: {
      id: '00000000-0000-0000-0000-000000000002',
      firebaseUid: 'demo_owner_troxinh',
      name: 'Trần Quốc Tuấn (Chủ Trọ)',
      email: 'chutro@troxinh.vn',
      phone: '0999000002',
      role: 'owner',
      avatarUrl: '/images/user-avatar.jpg',
      isDemoAccount: true,
    },
    renter: {
      id: '00000000-0000-0000-0000-000000000003',
      firebaseUid: 'demo_renter_troxinh',
      name: 'Nguyễn Văn An (Người Thuê)',
      email: 'nguoithue@troxinh.vn',
      phone: '0999000003',
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

      // Có custom token: đăng nhập Firebase thật để Supabase RLS nhận diện tài khoản demo (đăng tin, nhắn tin...)
      if (data.customToken) {
        let demoFbUser: FirebaseUser;
        try {
          const credential = await signInWithCustomToken(auth, data.customToken);
          demoFbUser = credential.user;
        } catch (signInErr: any) {
          console.warn('[Demo Auth] Không thể đăng nhập Firebase bằng custom token:', signInErr);
          return {
            success: false,
            error: `Không thể đăng nhập Firebase cho tài khoản demo (${signInErr?.code || 'lỗi không xác định'}). Vui lòng báo quản trị viên kiểm tra FIREBASE_SERVICE_ACCOUNT.`,
          };
        }

        const signedIn = await completeFirebaseSignIn(demoFbUser, acc.app_role as AppUserRole, acc.name);
        if (!signedIn.success || !signedIn.user) return signedIn;
        return { success: true, user: { ...signedIn.user, isDemoAccount: true } };
      }

      // Không có token (demo Quản trị hoặc máy chủ chưa cấu hình): demo chỉ xem, không ghi được dữ liệu
      if (data.tokenError) {
        console.warn('[Demo Auth]', data.tokenError);
      }
      const demoIdMap: Record<string, string> = {
        demo_admin_troxinh: '00000000-0000-0000-0000-000000000001',
        demo_owner_troxinh: '00000000-0000-0000-0000-000000000002',
        demo_renter_troxinh: '00000000-0000-0000-0000-000000000003',
      };
      const validProfileId = demoIdMap[acc.uid] || DEMO_PROFILES[demoType].id;
      const profile: AuthUserProfile = {
        id: validProfileId,
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
  const demoUser = DEMO_PROFILES[demoType];

  // Lấy dữ liệu mới nhất từ DB để không bị mất avatar khi reload
  const latestProfile = (await getProfileByFirebaseUid(demoUser.firebaseUid)) || (await getSupabaseUserByEmail(demoUser.email || ''));
  if (latestProfile) {
    demoUser.name = latestProfile.name;
    demoUser.avatarUrl = (latestProfile as any).avatarUrl || (latestProfile as any).avatar_url || demoUser.avatarUrl;
  }

  return {
    success: true,
    user: demoUser,
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
