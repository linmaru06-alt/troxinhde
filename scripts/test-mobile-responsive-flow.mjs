// scripts/test-mobile-responsive-flow.mjs
// Test suite verifying Mobile UX & Security Optimizations (Gói 1, Gói 2, Gói 3)

import fs from 'fs';
import path from 'path';

const ROOT = process.cwd();

function checkFileContains(relPath, queries, shouldNotContain = []) {
  const fullPath = path.join(ROOT, relPath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`File not found: ${relPath}`);
  }
  const content = fs.readFileSync(fullPath, 'utf8');

  for (const q of queries) {
    if (!content.includes(q)) {
      throw new Error(`[FAIL] ${relPath} missing expected text: "${q}"`);
    }
  }

  for (const nq of shouldNotContain) {
    if (content.includes(nq)) {
      throw new Error(`[FAIL] ${relPath} contains forbidden text: "${nq}"`);
    }
  }
}

function checkFileNotExists(relPath) {
  const fullPath = path.join(ROOT, relPath);
  if (fs.existsSync(fullPath)) {
    throw new Error(`[FAIL] File should have been removed: ${relPath}`);
  }
}

console.log('--- RUNNING TROXINH MOBILE RESPONSIVE & SECURITY TESTS ---');

try {
  // 1. Gói 1: CSS variable & Safe-area
  console.log('[1/7] Checking CSS & Bottom Bar Variables...');
  checkFileContains('src/index.css', [
    '--mobile-nav-height: 3.5rem',
    '--mobile-bottom-offset:',
    'env(safe-area-inset-bottom, 0px)',
  ]);

  // 2. Gói 1: MobileBottomNav role tabs & dynamic bottom
  console.log('[2/7] Checking MobileBottomNav tabs & aria-labels...');
  checkFileContains('src/components/layout/MobileBottomNav.tsx', [
    'aria-label="Thanh điều hướng dưới"',
    'aria-label={tab.label}',
    'isRoomDetailPage',
  ]);

  // 3. Gói 1: Cards.tsx horizontal overflow prevention
  console.log('[3/7] Checking RoomCard responsiveness & truncate...');
  checkFileContains('src/components/ui/Cards.tsx', [
    'max-w-full w-full',
    'min-[380px]:flex-row',
    'truncate',
  ]);

  // 4. Gói 1: 100dvh for Chat & Map
  console.log('[4/7] Checking ChatPage & MapViewPage 100dvh / viewport tracking...');
  checkFileContains('src/pages/ChatPage.tsx', [
    'visualViewport',
    '100dvh',
  ]);
  checkFileContains('src/pages/MapViewPage.tsx', [
    '100dvh',
    'var(--mobile-bottom-offset',
  ]);

  // 5. Gói 2: Booking 404 & /lich-hen route
  console.log('[5/7] Checking BookingPage 404 & /lich-hen view...');
  checkFileContains(
    'src/pages/BookingPage.tsx',
    ['Không tìm thấy phòng trọ', 'Lịch Hẹn Xem Phòng Trực Tiếp'],
    ['rooms[0]'] // Cannot fallback to rooms[0]
  );

  // 6. Gói 2 & 3: Chat schema & Auth security
  console.log('[6/7] Checking Realtime Chat schema & Firebase Auth security...');
  checkFileContains('src/hooks/useRealtimeChat.ts', [
    'conversation_id',
    'content',
  ]);
  checkFileContains(
    'src/pages/RegisterPage.tsx',
    ['completeEmailRegistration'],
    ['troxinh_email_otp', 'troxinh_pending_reg', 'Math.random']
  );
  checkFileContains(
    'src/pages/OtpVerificationPage.tsx',
    ['verifyPhoneOtp'],
    ['Math.random()', 'Troxinh@2026', 'troxinh_pending_reg']
  );

  // 7. Gói 3: Cleaned up duplicates & PWA caching
  console.log('[7/7] Checking deleted duplicate assets & vite.config.ts...');
  checkFileNotExists('public/hero-banner.jpg');
  checkFileNotExists('public/hero-banner.webp');
  checkFileNotExists('public/marketplace-banner.jpg');
  checkFileNotExists('public/marketplace-banner.webp');
  checkFileNotExists('public/roommate-banner.jpg');
  checkFileNotExists('public/roommate-banner.webp');
  checkFileContains(
    'vite.config.ts',
    ['osm-tiles-cache', 'google-fonts-cache'],
    ['supabase.co/rest']
  );

  console.log('----------------------------------------------------');
  console.log('✅ ALL MOBILE RESPONSIVE & SECURITY TESTS PASSED!');
  console.log('----------------------------------------------------');
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
