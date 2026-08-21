/**
 * Comprehensive Project Audit Script for TroXinh.vn
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { resolve, join } from 'path';

console.log('🔍 BẮT ĐẦU AUDIT TOÀN DIỆN DỰ ÁN TRỌ XINH (TROXINH.VN)...\n');

const auditReport = {
  summary: { totalChecks: 0, passed: 0, warnings: 0, failed: 0 },
  details: [],
};

function record(category, name, status, message = '') {
  auditReport.summary.totalChecks++;
  if (status === 'PASS') auditReport.summary.passed++;
  else if (status === 'WARN') auditReport.summary.warnings++;
  else auditReport.summary.failed++;

  auditReport.details.push({ category, name, status, message });
  const icon = status === 'PASS' ? '✅' : status === 'WARN' ? '⚠️' : '❌';
  console.log(`${icon} [${category}] ${name} ${message ? `-> ${message}` : ''}`);
}

// 1. PROJECT STRUCTURE AUDIT
const requiredDirs = [
  'src/components/layout',
  'src/components/modals',
  'src/components/profile',
  'src/components/rooms',
  'src/components/search',
  'src/components/ui',
  'src/data',
  'src/hooks',
  'src/lib/auth',
  'src/pages',
  'src/store',
  'src/types',
];

requiredDirs.forEach((dir) => {
  try {
    const stats = statSync(resolve(dir));
    record('Structure', `Thư mục ${dir}`, stats.isDirectory() ? 'PASS' : 'FAIL');
  } catch (e) {
    record('Structure', `Thư mục ${dir}`, 'FAIL', 'Không tìm thấy');
  }
});

// 2. ROUTE & PAGE AUDIT
const appFile = readFileSync(resolve('src/App.tsx'), 'utf-8');
const routes = [
  { path: '/', name: 'LandingPage' },
  { path: '/tim-kiem', name: 'SearchPage' },
  { path: '/tim-phong', name: 'SearchPage' },
  { path: '/ban-do', name: 'MapViewPage' },
  { path: '/phong/:id', name: 'RoomDetailPage' },
  { path: '/toa-nha/:id', name: 'BuildingDetailPage' },
  { path: '/roommate', name: 'RoommateListPage' },
  { path: '/roommate/:id', name: 'RoommateDetailPage' },
  { path: '/cho-do-cu', name: 'MarketplaceListPage' },
  { path: '/cho-do-cu/:id', name: 'MarketplaceDetailPage' },
  { path: '/ve-chung-toi/kiem-duyet', name: 'TrustVerificationPage' },
  { path: '/dang-nhap', name: 'LoginPage' },
  { path: '/dang-ky', name: 'RegisterPage' },
  { path: '/quen-mat-khau', name: 'ForgotPasswordPage' },
  { path: '/xac-thuc-otp', name: 'OtpVerificationPage' },
  { path: '/toi', name: 'RenterProfilePage' },
  { path: '/da-luu', name: 'SavedRoomsPage' },
  { path: '/thong-bao', name: 'NotificationsPage' },
  { path: '/tin-nhan', name: 'ChatPage' },
  { path: '/dat-lich/:roomId', name: 'BookingPage' },
  { path: '/nang-cap-chu-tro', name: 'OwnerUpgradePage' },
  { path: '/nang-cap-chu-tro/trang-thai', name: 'OwnerApplicationStatusPage' },
  { path: '/chu-tro', name: 'OwnerDashboardPage' },
  { path: '/chu-tro/toa-nha', name: 'OwnerBuildingListPage' },
  { path: '/chu-tro/toa-nha/tao-moi', name: 'OwnerCreateBuildingPage' },
  { path: '/chu-tro/phong/tao-moi', name: 'OwnerCreateRoomPage' },
  { path: '/admin', name: 'AdminModerationPage' },
  { path: '/admin/don-chu-tro', name: 'AdminOwnerApplicationsPage' },
  { path: '/admin/nguoi-dung', name: 'AdminUsersPage' },
  { path: '/admin/thong-ke', name: 'AdminAnalyticsPage' },
  { path: '/debug', name: 'DebugPage' },
];

routes.forEach((r) => {
  const isIncluded = appFile.includes(`path="${r.path}"`);
  record('Route', `Đường dẫn ${r.path} (${r.name})`, isIncluded ? 'PASS' : 'FAIL');
});

// 3. TYPOGRAPHY & LOCALIZATION AUDIT
const indexHtml = readFileSync(resolve('index.html'), 'utf-8');
const hasFont = indexHtml.includes('Be+Vietnam+Pro');
record('Typography', 'Font Google Be Vietnam Pro trong index.html', hasFont ? 'PASS' : 'FAIL');
const hasLangVi = indexHtml.includes('lang="vi"');
record('Typography', 'Thẻ HTML lang="vi"', hasLangVi ? 'PASS' : 'FAIL');

// 4. ROLE & ACCESS CONTROL GUARDS AUDIT
const hasOwnerGuard = appFile.includes('const OwnerRoute');
const hasAdminGuard = appFile.includes('const AdminRoute');
record('Security', 'Route Guard bảo vệ Chủ trọ (OwnerRoute)', hasOwnerGuard ? 'PASS' : 'FAIL');
record('Security', 'Route Guard bảo vệ Ban quản trị (AdminRoute)', hasAdminGuard ? 'PASS' : 'FAIL');

// 5. MOCK DATA AUDIT
const mockDataFile = readFileSync(resolve('src/data/mockData.ts'), 'utf-8');
record('Data', 'Dữ liệu mock phòng trọ (initialRooms)', mockDataFile.includes('initialRooms:') ? 'PASS' : 'FAIL');
record('Data', 'Dữ liệu mock tòa nhà (initialBuildings)', mockDataFile.includes('initialBuildings:') ? 'PASS' : 'FAIL');
record('Data', 'Dữ liệu mock ở ghép (initialRoommates)', mockDataFile.includes('initialRoommates:') ? 'PASS' : 'FAIL');
record('Data', 'Dữ liệu mock chợ đồ cũ (initialMarketplaceItems)', mockDataFile.includes('initialMarketplaceItems:') ? 'PASS' : 'FAIL');
record('Data', 'Dữ liệu mock đơn chủ trọ (initialOwnerApplications)', mockDataFile.includes('initialOwnerApplications:') ? 'PASS' : 'FAIL');

console.log('\n========================================');
console.log(`📊 TỔNG KẾT AUDIT: ${auditReport.summary.passed}/${auditReport.summary.totalChecks} HẠNG MỤC ĐẠT CHUẨN`);
console.log(`❌ Lỗi: ${auditReport.summary.failed} | ⚠️ Cảnh báo: ${auditReport.summary.warnings}`);
console.log('========================================\n');
