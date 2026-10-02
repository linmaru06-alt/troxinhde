import fs from 'fs';
import path from 'path';

console.log('======================================================================');
console.log('  BẮT ĐẦU CHẠY TEST SUITE CHO HTTP SECURITY HEADERS & CLICKJACKING (PLAN 9)');
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

// Test 1: Kiểm tra cấu hình OWASP Security Headers trong vercel.json
console.log('Test 1: Kiểm tra cấu hình OWASP Security Headers trong vercel.json');
try {
  const vercelJson = JSON.parse(fs.readFileSync(path.resolve('vercel.json'), 'utf-8'));
  const allRoutesHeader = vercelJson.headers.find(h => h.source === '/(.*)');
  assert(Boolean(allRoutesHeader), 'vercel.json: Có khối cấu hình header toàn cục /(.*)');

  const headerMap = {};
  allRoutesHeader.headers.forEach(h => {
    headerMap[h.key] = h.value;
  });

  // HSTS 2 năm preload
  const hsts = headerMap['Strict-Transport-Security'];
  assert(hsts && hsts.includes('max-age=63072000') && hsts.includes('preload'), 'HSTS: Bắt buộc HTTPS 2 năm và đạt chuẩn Chrome Preload List');

  // CSP frame-ancestors 'self'
  const csp = headerMap['Content-Security-Policy'];
  assert(csp && csp.includes("frame-ancestors 'self'"), "CSP: Thiết lập frame-ancestors 'self' triệt tiêu Clickjacking tầng mạng");
  assert(csp && csp.includes("default-src 'self'"), "CSP: default-src 'self' bảo vệ nguồn tải tài nguyên");
  assert(csp && csp.includes('nanhmbnpihlaojbwfebb.supabase.co'), 'CSP: Khai báo máy chủ Supabase chính thức trong connect-src');

  // COOP
  const coop = headerMap['Cross-Origin-Opener-Policy'];
  assert(coop === 'same-origin-allow-popups', 'COOP: same-origin-allow-popups bảo vệ an toàn ngữ cảnh và hỗ trợ Google Login Popup');

  // Permissions-Policy
  const perm = headerMap['Permissions-Policy'];
  assert(perm && perm.includes('camera=()') && perm.includes('microphone=()') && perm.includes('geolocation=(self)'), 'Permissions-Policy: Vô hiệu hóa Camera/Mic, chỉ mở Geolocation cho chính chủ');

  // nosniff
  assert(headerMap['X-Content-Type-Options'] === 'nosniff', 'X-Content-Type-Options: nosniff chống MIME sniffing');
} catch (e) {
  assert(false, `Lỗi đọc vercel.json: ${e.message}`);
}

// Test 2: Kiểm tra FramebustingGuard.tsx client-side
console.log('\nTest 2: Kiểm tra FramebustingGuard.tsx phòng thủ dự phòng ở Client');
try {
  const guardContent = fs.readFileSync(path.resolve('src/components/common/FramebustingGuard.tsx'), 'utf-8');
  assert(guardContent.includes('window.top !== window.self'), 'FramebustingGuard: Phát hiện khi website bị nhúng lén vào iframe');
  assert(guardContent.includes("document.documentElement.style.display = 'none'"), 'FramebustingGuard: Lập tức ẩn DOM để triệt tiêu giao diện ma');
  assert(guardContent.includes('window.top.location.href = window.self.location.href') || guardContent.includes('window.location.href'), 'FramebustingGuard: Phá vỡ lồng iframe và điều hướng về trang chính thức');
} catch (e) {
  assert(false, `Lỗi đọc FramebustingGuard.tsx: ${e.message}`);
}

// Test 3: Kiểm tra tích hợp FramebustingGuard trong App.tsx
console.log('\nTest 3: Kiểm tra tích hợp FramebustingGuard & AdminRoute trong App.tsx');
try {
  const appContent = fs.readFileSync(path.resolve('src/App.tsx'), 'utf-8');
  assert(appContent.includes('<FramebustingGuard />'), 'App.tsx: Đã gắn FramebustingGuard ở cấp cao nhất của Router');
  assert(appContent.includes('isPermittedAdmin(currentUser)'), 'App.tsx: AdminRoute được bảo vệ kép bởi Whitelist Guard');
} catch (e) {
  assert(false, `Lỗi đọc App.tsx: ${e.message}`);
}

// Test 4: Kiểm tra migration SQL 035
console.log('\nTest 4: Kiểm tra migration SQL 035_security_events_and_monitoring.sql');
try {
  const migrationContent = fs.readFileSync(path.resolve('supabase/migrations/035_security_events_and_monitoring.sql'), 'utf-8');
  assert(migrationContent.includes('CREATE TABLE IF NOT EXISTS public.security_events'), 'Migration 035: Tạo bảng security_events ghi nhận cảnh báo');
  assert(migrationContent.includes('ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY'), 'Migration 035: Đã bật RLS cho bảng security_events');
  assert(migrationContent.includes('USING (false)'), 'Migration 035: Cấm tuyệt đối client sửa hoặc xóa log an ninh');
} catch (e) {
  assert(false, `Lỗi đọc migration 035: ${e.message}`);
}

console.log('\n======================================================================');
if (failCount === 0) {
  console.log(`🎉 TẤT CẢ ${passCount} BÀI TEST SECURITY HEADERS & CLICKJACKING ĐẠT CHUẨN 100%!`);
  console.log('======================================================================');
  process.exit(0);
} else {
  console.error(`💥 CÓ ${failCount} BÀI TEST THẤT BÀI!`);
  console.log('======================================================================');
  process.exit(1);
}
