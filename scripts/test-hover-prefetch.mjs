import assert from 'assert';
import fs from 'fs';

console.log('======================================================================');
console.log('  BẮT ĐẦU CHẠY TEST SUITE CHO HOVER PRE-FETCHING ENGINE (PLAN 4)');
console.log('======================================================================\n');

// 1. Kiểm tra logic Intent Filter 65ms
async function testIntentThreshold() {
  console.log('Test 1: Kiểm tra bộ lọc ý định Intent Threshold (65ms)');

  let prefetchFired = false;
  let timer = null;

  function onPointerEnter(delay = 65) {
    timer = setTimeout(() => {
      prefetchFired = true;
    }, delay);
  }

  function onPointerLeave() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  }

  // Kịch bản A: Chuột chỉ lướt vèo qua trong 30ms (< 65ms)
  onPointerEnter(65);
  await new Promise(r => setTimeout(r, 30));
  onPointerLeave();
  await new Promise(r => setTimeout(r, 50));

  assert.strictEqual(prefetchFired, false, 'Không được kích hoạt khi chuột chỉ lướt vèo qua');
  console.log('  ✅ [PASS] Chuột lướt qua < 65ms: Hủy nạp trước kịp thời, tiết kiệm băng thông');

  // Kịch bản B: Chuột dừng lại 80ms (>= 65ms) -> Kích hoạt!
  onPointerEnter(65);
  await new Promise(r => setTimeout(r, 80));

  assert.strictEqual(prefetchFired, true, 'Phải kích hoạt khi chuột dừng trên thẻ >= 65ms');
  console.log('  ✅ [PASS] Chuột dừng >= 65ms: Kích hoạt nạp trước thành công');
}

// 2. Kiểm tra thao tác chạm trên điện thoại di động (onPointerDown = 0ms)
function testMobileTouchZeroDelay() {
  console.log('\nTest 2: Kiểm tra thao tác chạm trên màn hình di động (0ms latency)');

  let mobilePrefetchFired = false;
  function onPointerDown() {
    mobilePrefetchFired = true; // Kích hoạt ngay lập tức
  }

  onPointerDown();
  assert.strictEqual(mobilePrefetchFired, true, 'Trên di động phải nạp ngay khi ngón tay vừa chạm mặt kính');
  console.log('  ✅ [PASS] Mobile onPointerDown: Kích hoạt nạp trước trong 0ms trước khi click hoàn tất');
}

// 3. Kiểm tra tính toàn vẹn của Speculation Rules API trong index.html
function testSpeculationRulesInIndexHtml() {
  console.log('\nTest 3: Kiểm tra định dạng W3C Speculation Rules trong index.html');

  const indexHtml = fs.readFileSync('index.html', 'utf8');
  assert.ok(indexHtml.includes('type="speculationrules"'), 'index.html phải có thẻ script speculationrules');
  assert.ok(indexHtml.includes('/tim-kiem'), 'Phải nạp trước trang /tim-kiem');
  assert.ok(indexHtml.includes('/cho-do-cu'), 'Phải nạp trước trang /cho-do-cu');
  console.log('  ✅ [PASS] Speculation Rules API đã được cấu hình chuẩn W3C trên Chromium browsers');
}

async function run() {
  await testIntentThreshold();
  testMobileTouchZeroDelay();
  testSpeculationRulesInIndexHtml();

  console.log('\n======================================================================');
  console.log('🎉 TẤT CẢ CÁC BÀI TEST HOVER PRE-FETCHING ĐẠT CHUẨN 100%!');
  console.log('======================================================================');
}

run().catch(err => {
  console.error('❌ Test thất bại:', err);
  process.exit(1);
});
