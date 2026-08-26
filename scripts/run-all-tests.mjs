import { execSync } from 'child_process';

console.log('===============================================================');
console.log('🧪 BẮT ĐẦU CHẠY BỘ KIỂM THỬ TOÀN DIỆN HỆ THỐNG TRỌ XINH (TROXINH.VN)');
console.log('===============================================================\n');

const testSuites = [
  { name: '1. Động Cơ Xác Thực Hợp Nhất (Unified Auth Engine)', script: 'scripts/test-unified-auth.mjs' },
  { name: '2. Cổng Thanh Toán MoMo Gateway & VietQR', script: 'scripts/test-momo-integration.mjs' },
  { name: '3. Kiểm Tra Kết Nối Cơ Sở Dữ Liệu Supabase', script: 'scripts/check-tables-detail.mjs' },
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
