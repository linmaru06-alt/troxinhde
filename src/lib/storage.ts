import { supabase, isSupabaseConfigured } from './supabase';

export type StorageBucket = 'room-images' | 'avatars' | 'documents';

export interface UploadOptions {
  folder?: string;
  maxSizeMB?: number;
  allowedTypes?: string[];
}

/**
 * Tạo tên file độc nhất chống ghi đè (UUID + timestamp + extension)
 */
function generateUniqueFileName(originalName: string): string {
  const extension = originalName.split('.').pop() || 'jpg';
  const cleanExt = extension.toLowerCase().replace(/[^a-z0-9]/g, '');
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 9);
  return `${timestamp}_${randomStr}.${cleanExt}`;
}

/**
 * Tải 1 file ảnh hoặc tài liệu lên Supabase Storage
 * @param file Đối tượng File cần tải lên
 * @param bucket Tên bucket ('room-images' | 'avatars' | 'documents')
 * @param options Tuỳ chọn thư mục con, kích thước tối đa
 * @returns Đường dẫn URL công khai (nếu là public bucket) hoặc path nội bộ (nếu là private)
 */
export async function uploadToStorage(
  file: File,
  bucket: StorageBucket = 'room-images',
  options?: UploadOptions
): Promise<string> {
  if (!isSupabaseConfigured) {
    // Fallback: Nếu chưa cấu hình Supabase Cloud, trả về data URL tạm thời để xem trước
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });
  }

  // 1. Kiểm tra kích thước file
  const maxBytes = (options?.maxSizeMB || (bucket === 'avatars' ? 5 : 10)) * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error(`Dung lượng file vượt quá giới hạn cho phép (${options?.maxSizeMB || (bucket === 'avatars' ? 5 : 10)}MB).`);
  }

  // 2. Tạo đường dẫn lưu trữ
  const fileName = generateUniqueFileName(file.name);
  const filePath = options?.folder ? `${options.folder.replace(/^\/+|\/+$/g, '')}/${fileName}` : fileName;

  // 3. Thực hiện tải lên Supabase Storage
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error(`[Storage] Lỗi tải file lên ${bucket}:`, error.message);
    throw new Error(`Lỗi tải ảnh lên hệ thống: ${error.message}`);
  }

  // 4. Nếu là bucket công khai (room-images, avatars), lấy Public URL
  if (bucket === 'room-images' || bucket === 'avatars') {
    const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(data.path);
    return publicData.publicUrl;
  }

  // Nếu là bucket tài liệu riêng tư (documents), trả về đường dẫn nội bộ (path)
  return data.path;
}

/**
 * Tải nhiều ảnh lên Supabase Storage tuần tự có thông báo tiến trình
 */
export async function uploadMultipleToStorage(
  files: File[],
  bucket: StorageBucket = 'room-images',
  folder?: string,
  onProgress?: (uploaded: number, total: number) => void
): Promise<string[]> {
  const urls: string[] = [];

  for (let i = 0; i < files.length; i++) {
    const url = await uploadToStorage(files[i], bucket, { folder });
    urls.push(url);
    if (onProgress) {
      onProgress(i + 1, files.length);
    }
  }

  return urls;
}

/**
 * Xoá file khỏi Supabase Storage
 */
export async function deleteFromStorage(
  bucket: StorageBucket,
  filePaths: string[]
): Promise<boolean> {
  if (!isSupabaseConfigured || filePaths.length === 0) return true;

  try {
    const { error } = await supabase.storage.from(bucket).remove(filePaths);
    if (error) {
      console.warn(`[Storage] Lỗi xoá file trong ${bucket}:`, error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn(`[Storage] Ngoại lệ khi xoá file:`, err);
    return false;
  }
}

/**
 * Lấy URL có chữ ký tạm thời cho tài liệu riêng tư (documents)
 */
export async function getSignedDocumentUrl(
  filePath: string,
  expiresInSeconds: number = 300
): Promise<string | null> {
  if (!isSupabaseConfigured) return null;

  try {
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(filePath, expiresInSeconds);

    if (error || !data) return null;
    return data.signedUrl;
  } catch {
    return null;
  }
}
