/**
 * src/lib/storage/concurrencyUploader.ts
 * Động cơ tải lên song song có điều tiết (Concurrency Pool)
 * Dựa trên giáo trình Qiangu Web (Chương 12: Stream & Concurrency Pool)
 */
import { compressImageToBlob } from './imageCompressor';

export interface UploadTask {
  id: string;
  file: File;
  folder?: string;
  onProgress?: (progressPercent: number) => void;
}

export interface UploadTaskResult {
  id: string;
  url: string;
  savedPercent?: number;
}

export async function uploadWithConcurrencyPool(
  tasks: UploadTask[],
  uploadFn: (fileOrBlob: File | Blob, folder?: string) => Promise<string>,
  concurrencyLimit: number = 3,
  onOverallProgress?: (completed: number, total: number) => void
): Promise<UploadTaskResult[]> {
  if (!tasks || tasks.length === 0) return [];

  const results: UploadTaskResult[] = new Array(tasks.length);
  let currentIndex = 0;
  let completedCount = 0;

  async function worker(): Promise<void> {
    while (currentIndex < tasks.length) {
      const taskIndex = currentIndex++;
      const task = tasks[taskIndex];

      let attempts = 0;
      const maxRetries = 3;
      let success = false;

      while (attempts < maxRetries && !success) {
        try {
          attempts++;

          // 1. Nén ảnh stream máy khách sang WebP trước khi gửi
          let uploadPayload: File | Blob = task.file;
          let savedPercent = 0;

          try {
            const compression = await compressImageToBlob(task.file);
            uploadPayload = compression.blob;
            savedPercent = compression.savedPercent;
          } catch (compErr) {
            console.warn('[Upload Engine] Nén ảnh thất bại, fallback dùng file gốc:', compErr);
            uploadPayload = task.file;
          }

          // 2. Tải trực tiếp lên Cloud Storage
          const url = await uploadFn(uploadPayload, task.folder);
          results[taskIndex] = { id: task.id, url, savedPercent };
          success = true;
          task.onProgress?.(100);
        } catch (err) {
          if (attempts >= maxRetries) {
            console.error(`[Upload Engine] Ảnh ${task.file.name} thất bại sau ${maxRetries} lần thử:`, err);
            throw err;
          }
          // Chờ theo thuật toán Exponential Backoff: 1s, 2s, 4s rồi thử lại
          await new Promise((r) => setTimeout(r, Math.pow(2, attempts - 1) * 1000));
        }
      }

      completedCount++;
      onOverallProgress?.(completedCount, tasks.length);
    }
  }

  // Khởi chạy đồng thời số lượng worker bằng concurrencyLimit
  const workers = Array.from(
    { length: Math.min(concurrencyLimit, tasks.length) },
    () => worker()
  );

  await Promise.all(workers);
  return results.filter(Boolean);
}
