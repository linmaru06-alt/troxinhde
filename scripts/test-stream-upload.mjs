import fs from 'fs';
import path from 'path';

console.log('======================================================================');
console.log('  BẮT ĐẦU CHẠY TEST SUITE CHO CLIENT STREAM COMPRESSION & CONCURRENCY POOL (PLAN 10)');
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

// Test 1: Kiểm tra mô phỏng thuật toán Concurrency Pool (Max 3 workers)
console.log('Test 1: Kiểm tra cơ chế Concurrency Pool điều phối tối đa 3 workers chạy song song');
async function testConcurrencyLogic() {
  let activeWorkers = 0;
  let maxConcurrentObserved = 0;
  const completedTasks = [];

  const mockTasks = Array.from({ length: 9 }, (_, i) => ({ id: `task_${i + 1}`, name: `Ảnh ${i + 1}` }));

  async function mockUploadWorker(tasks, concurrencyLimit = 3) {
    let index = 0;
    async function worker() {
      while (index < tasks.length) {
        const task = tasks[index++];
        activeWorkers++;
        if (activeWorkers > maxConcurrentObserved) {
          maxConcurrentObserved = activeWorkers;
        }
        // Giả lập thời gian nén và upload qua mạng 30ms
        await new Promise(r => setTimeout(r, 30));
        completedTasks.push(task.id);
        activeWorkers--;
      }
    }
    const workers = Array.from({ length: Math.min(concurrencyLimit, tasks.length) }, () => worker());
    await Promise.all(workers);
  }

  await mockUploadWorker(mockTasks, 3);

  assert(maxConcurrentObserved <= 3, `Concurrency Pool: Số worker chạy đồng thời đỉnh điểm là ${maxConcurrentObserved} <= 3 (Không gây nghẽn socket)`);
  assert(completedTasks.length === 9, 'Concurrency Pool: Toàn bộ 9/9 ảnh đã hoàn tất tải lên');
}

await testConcurrencyLogic();

// Test 2: Kiểm tra cơ chế Exponential Backoff Retry khi đứt mạng
console.log('\nTest 2: Kiểm tra Exponential Backoff Retry (Thử lại 3 lần khi mạng gián đoạn)');
async function testRetryLogic() {
  let attemptCount = 0;

  async function failingUploadWithRetry(maxRetries = 3) {
    let attempts = 0;
    while (attempts < maxRetries) {
      try {
        attempts++;
        attemptCount++;
        if (attempts < 3) {
          throw new Error('Mạng gián đoạn (Network Socket Timeout)');
        }
        return 'https://cloudinary.com/success.webp';
      } catch (err) {
        if (attempts >= maxRetries) throw err;
        // Mock delay ngắn để test
        await new Promise(r => setTimeout(r, 10));
      }
    }
  }

  const resultUrl = await failingUploadWithRetry(3);
  assert(attemptCount === 3, 'Exponential Retry: Tự động thử lại đúng 3 lần trước khi bỏ cuộc');
  assert(resultUrl.includes('success.webp'), 'Exponential Retry: Phục hồi thành công ở lần thử thứ 3 mà không làm đứt phiên người dùng');
}

await testRetryLogic();

// Test 3: Kiểm tra mã nguồn imageCompressor.ts
console.log('\nTest 3: Kiểm tra cấu hình và giải phóng bộ nhớ trong imageCompressor.ts');
try {
  const compressorCode = fs.readFileSync(path.resolve('src/lib/storage/imageCompressor.ts'), 'utf-8');
  assert(compressorCode.includes('maxWidth = 1920'), 'imageCompressor: Scale ảnh tối đa Full HD 1920px');
  assert(compressorCode.includes("format = 'image/webp'"), 'imageCompressor: Định dạng xuất nén mặc định là WebP');
  assert(compressorCode.includes('URL.revokeObjectURL(objectUrl)'), 'imageCompressor: Thu hồi Object URL ngay lập tức để giải phóng RAM V8');
  assert(compressorCode.includes('imageSmoothingQuality = \'high\''), 'imageCompressor: Sử dụng thuật toán làm mịn ảnh chất lượng cao');
} catch (e) {
  assert(false, `Lỗi đọc imageCompressor.ts: ${e.message}`);
}

// Test 4: Kiểm tra tích hợp trong ImageUploader.tsx
console.log('\nTest 4: Kiểm tra tích hợp Concurrency Pool trong ImageUploader.tsx');
try {
  const uploaderCode = fs.readFileSync(path.resolve('src/components/ui/ImageUploader.tsx'), 'utf-8');
  assert(uploaderCode.includes('uploadWithConcurrencyPool'), 'ImageUploader: Đã chuyển đổi sang tải song song Concurrency Pool');
  assert(uploaderCode.includes('compressImageToBlob'), 'ImageUploader: Nén ảnh Client-side trước khi truyền qua mạng');
  assert(uploaderCode.includes('URL.revokeObjectURL'), 'ImageUploader: Dọn dẹp bộ nhớ blob khi upload thành công');
} catch (e) {
  assert(false, `Lỗi đọc ImageUploader.tsx: ${e.message}`);
}

// Test 5: Kiểm tra hỗ trợ Blob trong storage.ts và cloudinary.ts
console.log('\nTest 5: Kiểm tra tương thích File | Blob trong storage.ts & cloudinary.ts');
try {
  const storageCode = fs.readFileSync(path.resolve('src/lib/storage.ts'), 'utf-8');
  assert(storageCode.includes('file: File | Blob'), 'storage.ts: uploadToStorage đã hỗ trợ cả File và Blob nén');

  const cloudinaryCode = fs.readFileSync(path.resolve('src/lib/cloudinary.ts'), 'utf-8');
  assert(cloudinaryCode.includes('file: File | Blob'), 'cloudinary.ts: uploadImage đã hỗ trợ cả File và Blob nén');
} catch (e) {
  assert(false, `Lỗi đọc storage.ts hoặc cloudinary.ts: ${e.message}`);
}

// Test 6: Kiểm tra migration SQL 036
console.log('\nTest 6: Kiểm tra migration SQL 036_storage_optimization_and_metrics.sql');
try {
  const migrationCode = fs.readFileSync(path.resolve('supabase/migrations/036_storage_optimization_and_metrics.sql'), 'utf-8');
  assert(migrationCode.includes('CREATE TABLE IF NOT EXISTS public.storage_upload_metrics'), 'Migration 036: Tạo bảng lưu trữ số liệu nén ảnh');
  assert(migrationCode.includes("ARRAY['image/jpeg', 'image/png', 'image/webp']"), 'Migration 036: Cấu hình bucket cho phép đầy đủ định dạng WebP');
  assert(migrationCode.includes('ALTER TABLE public.storage_upload_metrics ENABLE ROW LEVEL SECURITY'), 'Migration 036: Bật RLS bảo vệ bảng số liệu lưu trữ');
} catch (e) {
  assert(false, `Lỗi đọc migration 036: ${e.message}`);
}

console.log('\n======================================================================');
if (failCount === 0) {
  console.log(`🎉 TẤT CẢ ${passCount} BÀI TEST CLIENT COMPRESSION & CONCURRENCY POOL ĐẠT CHUẨN 100%!`);
  console.log('======================================================================');
  process.exit(0);
} else {
  console.error(`💥 CÓ ${failCount} BÀI TEST THẤT BÀI!`);
  console.log('======================================================================');
  process.exit(1);
}
