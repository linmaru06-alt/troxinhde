/**
 * src/lib/security/sessionIntegrity.ts
 * Cơ chế bảo vệ tính toàn vẹn phiên và chống can thiệp LocalStorage (Zero-Trust LocalStorage)
 * Dựa trên giáo trình Qiangu Web (Chương 16: LocalStorage 防篡改与权限校验)
 */

export const ADMIN_WHITELIST_EMAILS = [
  'quan66934@gmail.com',
  'admin@troxinh.vn',
];

const SESSION_SALT = 'TROXINH_SECURE_SALT_2026_QIANGU';

/**
 * Tạo chữ ký băm kiểm tra tính toàn vẹn của phiên người dùng
 * Băm chuỗi DJB2 kết hợp Salt bảo mật
 */
export function generateSessionSignature(user: any): string {
  if (!user || !user.id) return '';
  const raw = `${user.id}::${user.firebaseUid || ''}::${(user.email || '').toLowerCase()}::${user.role || 'user'}`;
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

/**
 * Kiểm tra phân quyền kép Quản trị viên (Admin Whitelist Check)
 * Chống việc hacker mở F12 Console sửa role: "admin"
 */
export function isPermittedAdmin(user: any): boolean {
  if (!user) return false;
  if (user.role !== 'admin') return false;
  const email = (user.email || '').trim().toLowerCase();
  return ADMIN_WHITELIST_EMAILS.includes(email);
}
