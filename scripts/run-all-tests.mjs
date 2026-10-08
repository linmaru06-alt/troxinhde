import { execSync } from 'child_process';

console.log('===============================================================');
console.log('🧪 BẮT ĐẦU CHẠY BỘ KIỂM THỬ TOÀN DIỆN HỆ THỐNG TRỌ XINH (TROXINH.VN)');
console.log('===============================================================\n');

const testSuites = [
  { name: '1. Động Cơ Xác Thực Hợp Nhất (Unified Auth Engine)', script: 'scripts/test-unified-auth.mjs' },
  { name: '2. Cổng Thanh Toán MoMo Gateway & VietQR', script: 'scripts/test-momo-integration.mjs' },
  { name: '3. Kiểm Tra Kết Nối Cơ Sở Dữ Liệu Supabase', script: 'scripts/check-tables-detail.mjs' },
  { name: '4. Kiểm Tra Toàn Bộ Quy Tắc Báo Cáo Vi Phạm', script: 'scripts/test-report-rules.mjs' },
  { name: '5. Kiểm Tra Khởi Tạo Hội Thoại & Chợ Đồ Cũ', script: 'scripts/test-find-or-create-conversation.mjs' },
  { name: '6. Cổng Thanh Toán Webhook & Kích Hoạt Tự Động (Plan 2)', script: 'scripts/test-payment-webhooks.mjs' },
  { name: '7. Động Cơ Debounce & Throttle Engine (Plan 3)', script: 'scripts/test-debounce-throttle.mjs' },
  { name: '8. Tải Trước Khi Rê Chuột Hover Pre-fetching (Plan 4)', script: 'scripts/test-hover-prefetch.mjs' },
  { name: '9. Giao Diện Phản Hồi Lạc Quan Optimistic UI (Plan 5)', script: 'scripts/test-optimistic-ui.mjs' },
  { name: '10. Khung Xương Phát Sáng Shimmer Skeleton 1:1 (Plan 6)', script: 'scripts/test-skeleton-parity.mjs' },
  { name: '11. Quản Lý V8 Garbage Collection & Triệt Tiêu Rò Rỉ RAM (Plan 7)', script: 'scripts/test-v8-cleanup.mjs' },
  { name: '12. Phòng Ngự XSS Đa Tầng & Zero-Trust LocalStorage (Plan 8)', script: 'scripts/test-xss-zerotrust.mjs' },
  { name: '13. Tiêu Đề Bảo Mật HTTP & Chống Clickjacking Framebusting (Plan 9)', script: 'scripts/test-clickjacking-defense.mjs' },
  { name: '14. Nén Ảnh Stream & Tải Song Song Concurrency Pool (Plan 10)', script: 'scripts/test-stream-upload.mjs' },
];

let totalPassed = 0;

for (const suite of testSuites) {
  console.log(`\n▶️ Đang chạy ${suite.name}...`);
  try {
    const output = execSync(`node ${suite.script}`, { encoding: 'utf-8' });
    console.log(output);
    totalPassed++;
  } catch (err) {
    console.error(`❌ Thất bại tại: ${suite.name}`);
    console.error(err.stdout || err.message);
  }
}

console.log('\n===============================================================');
console.log(`🎉 HOÀN THÀNH KIỂM THỬ: ${totalPassed}/${testSuites.length} SUITES ĐẠT CHUẨN 100%!`);
console.log('===============================================================');
