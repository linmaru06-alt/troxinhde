/**
 * src/lib/security/sessionIntegrity.ts
 * Cơ chế bảo vệ tính toàn vẹn phiên và chống can thiệp LocalStorage (Zero-Trust LocalStorage)
 * Dựa trên giáo trình Qiangu Web (Chương 16: LocalStorage 防篡改与权限校验)
 */

export const ADMIN_WHITELIST_EMAILS = [
  'quan66934@gmail.com',
  'admin@troxinh.vn',
];

export const ADMIN_WHITELIST_PHONES = [
  '0876817699',
  '0888110789',
  '84876817699',
  '84888110789',
];

const SESSION_SALT = 'TROXINH_SECURE_SALT_2026_QIANGU';

/**
 * Tạo chữ ký băm kiểm tra tính toàn vẹn của phiên người dùng
 * Băm chuỗi DJB2 kết hợp Salt bảo mật
 */
export function generateSessionSignature(user: any): string {
  if (!user || !user.id) return '';
  const phone = (user.phone || '').replace(/\D/g, '');
  const raw = `${user.id}::${user.firebaseUid || ''}::${(user.email || '').toLowerCase()}::${phone}::${user.role || 'user'}`;
  const str = raw + SESSION_SALT;
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

/**
 * Kiểm tra tính hợp lệ của chữ ký phiên
 */
export function verifySessionSignature(user: any, signature?: string | null): boolean {
  if (!user) return true; // Chưa đăng nhập coi như không cần chữ ký
  if (!signature) return false; // Có user nhưng thiếu chữ ký -> nghi vấn giả mạo
  const expected = generateSessionSignature(user);
  return expected === signature;
}

export function isAdminIdentifier(email?: string | null, phone?: string | null): boolean {
  if (email) {
    const cleanEmail = email.trim().toLowerCase();
    if (ADMIN_WHITELIST_EMAILS.includes(cleanEmail)) return true;
  }
  const rawPhone = (phone || '').replace(/\D/g, '');
  if (rawPhone) {
    const normalizedPhone = rawPhone.startsWith('84') && rawPhone.length >= 11
      ? '0' + rawPhone.slice(2)
      : rawPhone;
    if (['0876817699', '0888110789'].includes(normalizedPhone)) {
      return true;
    }
  }
  return false;
}

/**
 * Kiểm tra phân quyền kép Quản trị viên (Admin Whitelist Check)
 * Hỗ trợ xác thực cả Email và Số điện thoại chính chủ của Quản trị viên
 * Chống việc hacker mở F12 Console sửa role: "admin"
 */
export function isPermittedAdmin(user: any): boolean {
  if (!user) return false;

  // 1. Tài khoản Demo Admin
  if (user.id === 'demo_admin_001' || user.firebaseUid === 'demo_admin_001') {
    return true;
  }

  // 2. Định danh Email hoặc Số điện thoại thuộc Whitelist Quản trị viên chính thức
  if (isAdminIdentifier(user.email, user.phone || user.phoneNumber)) {
    return true;
  }

  // 3. Nếu role/app_role là 'admin' nhưng không thỏa mãn các điều kiện trên -> Từ chối (Zero-Trust)
  return false;
}
