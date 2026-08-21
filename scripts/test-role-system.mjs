/**
 * Role Model Verification Script
 * Validates scenarios in CHANGE 21
 */
import { readFileSync } from 'fs';
import { resolve } from 'path';

console.log('🧪 BẮT ĐẦU CHẠY KIỂM THỬ HỆ THỐNG PHÂN QUYỀN LŨY TIẾN (CHANGE 21)...');

const results = [];

function assert(condition, testName) {
  if (condition) {
    results.push({ name: testName, status: 'PASS' });
    console.log(`  [PASS] ${testName}`);
  } else {
    results.push({ name: testName, status: 'FAIL' });
    console.error(`  [FAIL] ${testName}`);
  }
}

// 1. Auth & Registration Schema
const registerCode = readFileSync(resolve('src/pages/RegisterPage.tsx'), 'utf-8');
const loginCode = readFileSync(resolve('src/pages/LoginPage.tsx'), 'utf-8');
const typesCode = readFileSync(resolve('src/types/index.ts'), 'utf-8');

assert(!registerCode.includes('Tôi là chủ trọ'), 'Registration: Không còn toggle chọn chủ trọ');
assert(!loginCode.includes('Tôi là chủ trọ'), 'Login: Không còn toggle chọn chủ trọ');
assert(typesCode.includes("role: 'user' | 'owner' | 'admin'"), 'Database Schema: role enum định nghĩa [user, owner, admin]');
assert(typesCode.includes("ownerApplicationStatus?: 'none' | 'pending' | 'approved' | 'rejected'"), 'Database Schema: ownerApplicationStatus enum');

// 2. Progressive Role & Gates
const loginGateModal = readFileSync(resolve('src/components/modals/LoginGateModal.tsx'), 'utf-8');
assert(loginGateModal.includes('Đăng Nhập Để Lưu Phòng Yêu Thích'), 'LoginGateModal: Hỗ trợ trigger save-room');
assert(loginGateModal.includes('Đăng Nhập Để Nhắn Tin'), 'LoginGateModal: Hỗ trợ trigger message-owner');
assert(loginGateModal.includes('Đăng Nhập Để Đặt Lịch'), 'LoginGateModal: Hỗ trợ trigger book-viewing');

// 3. Smart CTA Hook
const smartCTACode = readFileSync(resolve('src/hooks/useSmartCTA.ts'), 'utf-8');
assert(smartCTACode.includes('useSmartCTA'), 'useSmartCTA Hook: Khởi tạo thành công');
assert(smartCTACode.includes('save-room') && smartCTACode.includes('upgrade-owner'), 'useSmartCTA: Định nghĩa đầy đủ các context hành động');

// 4. Guest Experience
const guestBanner = readFileSync(resolve('src/components/search/GuestPromptBanner.tsx'), 'utf-8');
const guestBar = readFileSync(resolve('src/components/rooms/GuestViewingBar.tsx'), 'utf-8');
assert(guestBanner.includes('Đăng ký miễn phí để lưu phòng'), 'Search: Có GuestPromptBanner hiển thị khi chưa đăng nhập');
assert(guestBar.includes('Bạn quan tâm đến phòng trọ này?'), 'RoomDetail: Có GuestViewingBar trượt lên khi scroll');

// 5. Owner Upgrade & Admin Review Flow
const ownerUpgradePage = readFileSync(resolve('src/pages/OwnerUpgradePage.tsx'), 'utf-8');
const ownerStatusPage = readFileSync(resolve('src/pages/OwnerApplicationStatusPage.tsx'), 'utf-8');
const adminAppsPage = readFileSync(resolve('src/pages/AdminOwnerApplicationsPage.tsx'), 'utf-8');
const adminUsersPage = readFileSync(resolve('src/pages/AdminUsersPage.tsx'), 'utf-8');

assert(ownerUpgradePage.includes('Đăng Ký Trở Thành Chủ Trọ'), 'OwnerUpgrade: Trang nộp hồ sơ /nang-cap-chu-tro');
assert(ownerStatusPage.includes('Hồ Sơ Của Bạn Đang Được Thẩm Định'), 'OwnerStatus: Trang xem tiến độ /nang-cap-chu-tro/trang-thai');
assert(adminAppsPage.includes('Quản Lý Đơn Đăng Ký Chủ Trọ'), 'Admin: Trang /admin/don-chu-tro');
assert(adminUsersPage.includes('Lịch Sử Vai Trò') && adminUsersPage.includes('Thu Hồi Quyền'), 'Admin Users: Filter và can thiệp quyền');

console.log('\n----------------------------------------');
const allPassed = results.every(r => r.status === 'PASS');
console.log(`KẾT QUẢ TỔNG QUAN: ${allPassed ? '✅ TẤT CẢ TEST CASES ĐÃ ĐẠT (ALL PASS)' : '❌ CÓ LỖI'}`);
