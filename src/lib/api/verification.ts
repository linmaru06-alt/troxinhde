import { auth, PhoneAuthProvider, linkWithCredential, updatePhoneNumber } from '../firebase';
import { supabase, isSupabaseConfigured, getFirebaseIdToken } from '../supabase';
import { formatVietnamesePhone, setupRecaptchaVerifier } from '../authService';

// ==============================================================================
// XÁC MINH TÀI KHOẢN: SỐ ĐIỆN THOẠI (Firebase OTP thật) & THẺ SINH VIÊN (admin duyệt)
// Trạng thái xác minh chỉ được ghi ở máy chủ (migration 028); frontend không tự đặt cờ.
// ==============================================================================

export type StudentVerificationStatus = 'pending' | 'approved' | 'rejected';

export interface StudentVerification {
  id: string;
  profile_id: string;
  card_path: string;
  status: StudentVerificationStatus;
  reject_reason: string | null;
  submitted_at: string;
  reviewed_at: string | null;
}

export interface PendingStudentVerification extends StudentVerification {
  profile: {
    full_name: string | null;
    university: string | null;
    student_year: string | null;
  } | null;
}

function toVerificationError(error: any, fallback: string): Error {
  const message: string = error?.message || '';
  if (error?.code === 'PGRST202' || error?.code === 'PGRST205' || /could not find the (function|table)/i.test(message)) {
    return new Error('Máy chủ chưa hỗ trợ chức năng xác minh (thiếu migration 028). Vui lòng báo quản trị viên.');
  }
  return new Error(message || fallback);
}

function toPhoneAuthError(error: any): Error {
  switch (error?.code) {
    case 'auth/invalid-phone-number':
      return new Error('Số điện thoại không đúng định dạng.');
    case 'auth/invalid-verification-code':
      return new Error('Mã OTP không đúng. Vui lòng kiểm tra lại.');
    case 'auth/code-expired':
    case 'auth/session-expired':
      return new Error('Mã OTP đã hết hạn. Vui lòng gửi lại mã mới.');
    case 'auth/credential-already-in-use':
    case 'auth/account-exists-with-different-credential':
      return new Error('Số điện thoại này đã được dùng cho một tài khoản Trọ Xinh khác.');
    case 'auth/requires-recent-login':
      return new Error('Phiên đăng nhập đã cũ. Vui lòng đăng xuất, đăng nhập lại rồi xác minh số điện thoại.');
    case 'auth/too-many-requests':
      return new Error('Bạn đã yêu cầu quá nhiều lần. Vui lòng chờ vài phút rồi thử lại.');
    case 'auth/quota-exceeded':
    case 'auth/billing-not-enabled':
      return new Error('Hệ thống gửi SMS tạm thời không khả dụng. Vui lòng thử lại sau.');
    case 'auth/captcha-check-failed':
    case 'auth/invalid-app-credential':
      return new Error('Xác minh reCAPTCHA không thành công. Vui lòng tải lại trang và thử lại.');
    case 'auth/operation-not-allowed':
      return new Error('Xác thực bằng số điện thoại chưa được bật trên hệ thống.');
    default:
      return new Error(error?.message || 'Không thể xác thực số điện thoại. Vui lòng thử lại.');
  }
}

function requireFirebaseUser() {
  const user = auth?.currentUser;
  if (!user) {
    throw new Error('Chỉ tài khoản đăng nhập thật mới xác minh được số điện thoại (tài khoản demo không hỗ trợ).');
  }
  return user;
}

/**
 * Ghi trạng thái SĐT đã xác minh vào hồ sơ. Máy chủ chỉ tin claim phone_number trong
 * Firebase ID token mới nhất, nên phải làm mới token trước khi gọi.
 */
export async function syncVerifiedPhoneToProfile(): Promise<string> {
  requireFirebaseUser();
  await getFirebaseIdToken(true);
  const { data, error } = await supabase.rpc('sync_my_phone_verification');
  if (error) throw toVerificationError(error, 'Không thể lưu trạng thái xác minh số điện thoại');
  return (data as { phone: string }).phone;
}

export interface PhoneVerificationStart {
  /** Số này đã gắn với tài khoản Firebase từ trước: chỉ cần đồng bộ, không gửi SMS */
  alreadyVerified: boolean;
  verificationId?: string;
}

/**
 * Bước 1: gửi OTP thật tới số điện thoại cần gắn vào tài khoản đang đăng nhập.
 */
export async function startPhoneVerification(phone: string, recaptchaContainerId: string): Promise<PhoneVerificationStart> {
  const user = requireFirebaseUser();
  const formattedPhone = formatVietnamesePhone(phone);

  if (user.phoneNumber && user.phoneNumber === formattedPhone) {
    return { alreadyVerified: true };
  }

  const verifier = setupRecaptchaVerifier(recaptchaContainerId, undefined, undefined, 'invisible');
  if (!verifier) {
    throw new Error('Không thể khởi tạo reCAPTCHA bảo mật. Vui lòng tải lại trang.');
  }

  try {
    const provider = new PhoneAuthProvider(auth);
    const verificationId = await provider.verifyPhoneNumber(formattedPhone, verifier);
    return { alreadyVerified: false, verificationId };
  } catch (error: any) {
    throw toPhoneAuthError(error);
  }
}

/**
 * Bước 2: xác nhận OTP, gắn số vào tài khoản Firebase rồi đồng bộ trạng thái lên hồ sơ.
 * Trả về số điện thoại đã chuẩn hóa được máy chủ ghi nhận.
 */
export async function confirmPhoneVerification(verificationId: string, otpCode: string): Promise<string> {
  const user = requireFirebaseUser();
  const code = otpCode.trim();
  if (!/^\d{6}$/.test(code)) {
    throw new Error('Mã OTP phải gồm đúng 6 chữ số.');
  }

  try {
    const credential = PhoneAuthProvider.credential(verificationId, code);
    const hasPhoneProvider = user.providerData.some((p) => p.providerId === 'phone');
    if (hasPhoneProvider) {
      await updatePhoneNumber(user, credential);
    } else {
      await linkWithCredential(user, credential);
    }
  } catch (error: any) {
    throw toPhoneAuthError(error);
  }

  return syncVerifiedPhoneToProfile();
}

/**
 * Hồ sơ xác minh sinh viên gần nhất của người dùng hiện tại (RLS chỉ trả về của chính mình).
 */
export async function getMyStudentVerification(): Promise<StudentVerification | null> {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase
    .from('student_verifications')
    .select('id, profile_id, card_path, status, reject_reason, submitted_at, reviewed_at')
    .order('submitted_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw toVerificationError(error, 'Không thể tải trạng thái xác minh sinh viên');
  return (data as StudentVerification) || null;
}

/**
 * Gửi ảnh thẻ (đường dẫn trong bucket riêng tư `documents`) vào hàng chờ admin duyệt.
 */
export async function submitStudentVerification(cardPath: string): Promise<StudentVerification> {
  const { data, error } = await supabase.rpc('submit_student_verification', { p_card_path: cardPath });
  if (error) throw toVerificationError(error, 'Không thể gửi hồ sơ xác minh sinh viên');
  return data as StudentVerification;
}

/**
 * [Admin] Danh sách hồ sơ thẻ sinh viên đang chờ duyệt.
 */
export async function listPendingStudentVerifications(): Promise<PendingStudentVerification[]> {
  const { data, error } = await supabase
    .from('student_verifications')
    .select('id, profile_id, card_path, status, reject_reason, submitted_at, reviewed_at, profile:profiles!student_verifications_profile_id_fkey(full_name, university, student_year)')
    .eq('status', 'pending')
    .order('submitted_at', { ascending: true });
  if (error) throw toVerificationError(error, 'Không thể tải hàng chờ xác minh sinh viên');
  return (data as unknown as PendingStudentVerification[]) || [];
}

/**
 * [Admin] Link xem ảnh thẻ có thời hạn 10 phút (bucket riêng tư).
 */
export async function getStudentCardUrl(cardPath: string): Promise<string> {
  const { data, error } = await supabase.storage.from('documents').createSignedUrl(cardPath, 600);
  if (error || !data?.signedUrl) {
    throw new Error(error?.message || 'Không thể mở ảnh thẻ sinh viên');
  }
  return data.signedUrl;
}

/**
 * [Admin] Duyệt hoặc từ chối hồ sơ thẻ sinh viên.
 */
export async function reviewStudentVerification(id: string, approve: boolean, reason?: string): Promise<void> {
  const { error } = await supabase.rpc('admin_review_student_verification', {
    p_verification_id: id,
    p_approve: approve,
    p_reason: reason || null,
  });
  if (error) throw toVerificationError(error, 'Không thể cập nhật hồ sơ xác minh');
}
