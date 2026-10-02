/**
 * src/lib/storage/imageCompressor.ts
 * Nén ảnh tự động sang chuẩn WebP, tối ưu kích thước Full HD 1920px
 * Dựa trên giáo trình Qiangu Web (Chương 12: Stream & Client-side Compression)
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.1 - 1.0 (Khuyến nghị 0.82 - 0.85)
  format?: 'image/webp' | 'image/jpeg';
}

export interface CompressionResult {
  blob: Blob;
  originalSize: number;
  compressedSize: number;
  ratio: string;
  savedPercent: number;
}

export async function compressImageToBlob(
  file: File,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const {
    maxWidth = 1920,
    maxHeight = 1440,
    quality = 0.84,
    format = 'image/webp'
  } = options;

  // Nếu file là ảnh GIF hoặc không phải ảnh raster thông thường, giữ nguyên
  if (file.type === 'image/gif') {
    return {
      blob: file,
      originalSize: file.size,
      compressedSize: file.size,
      ratio: 'Giữ nguyên định dạng GIF',
      savedPercent: 0
    };
  }

  return new Promise((resolve, reject) => {
    const originalSize = file.size;
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      // V8 Garbage Collection: Thu hồi Blob URL tạm ngay khi nạp ảnh xong
      URL.revokeObjectURL(objectUrl);

      let { width, height } = img;

      // Tính toán tỷ lệ co dãn giữ nguyên Aspect Ratio
      if (width > maxWidth || height > maxHeight) {
        const aspect = width / height;
        if (width / maxWidth > height / maxHeight) {
          width = maxWidth;
          height = Math.round(width / aspect);
        } else {
          height = maxHeight;
          width = Math.round(height * aspect);
        }
      }

      // Khởi tạo Canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        return reject(new Error('Không thể khởi tạo Canvas Context 2D'));
      }

      // Áp dụng thuật toán làm mịn ảnh chất lượng cao
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            return reject(new Error('Lỗi chuyển đổi Canvas sang Blob'));
          }

          const compressedSize = blob.size;
          const savedPercent = Math.max(0, Number(((1 - compressedSize / originalSize) * 100).toFixed(1)));

          resolve({
            blob,
            originalSize,
            compressedSize,
            ratio: `Tiết kiệm ${savedPercent}% dung lượng`,
            savedPercent
          });
        },
        format,
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Không thể đọc file ảnh'));
    };

    img.src = objectUrl;
  });
}
