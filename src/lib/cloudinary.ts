// Các folder upload tổ chức theo context
export type UploadFolder = 
  | 'troxinh/rooms'
  | 'troxinh/buildings'
  | 'troxinh/marketplace'
  | 'troxinh/avatars'
  | 'troxinh/reviews';

// Upload 1 ảnh
export async function uploadImage(
  file: File,
  folder: UploadFolder = 'troxinh/rooms'
): Promise<string> {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'troxinh_unsigned';

  // Fallback graceful: Nếu chưa cấu hình cloud_name thật trong env, chuyển file thành data url preview
  if (!cloudName) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.readAsDataURL(file);
    });
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);
  formData.append('folder', folder);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: 'POST', body: formData }
  );

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData?.error?.message || 'Upload thất bại. Vui lòng kiểm tra Cloudinary config.');
  }

  const data = await response.json();
  return data.secure_url;
}

// Upload nhiều ảnh tuần tự
export async function uploadMultipleImages(
  files: File[],
  folder: UploadFolder,
  onProgress?: (uploaded: number, total: number) => void
): Promise<string[]> {
  const results: string[] = [];
  
  for (let i = 0; i < files.length; i++) {
    const url = await uploadImage(files[i], folder);
    results.push(url);
    onProgress?.(i + 1, files.length);
  }
  
  return results;
}

// Tối ưu ảnh Cloudinary theo từng ngữ cảnh hiển thị
export type ImagePreset = 
  | 'thumbnail'   // Card danh sách phòng
  | 'gallery'     // Gallery chi tiết phòng
  | 'avatar'      // Ảnh đại diện người dùng
  | 'hero'        // Ảnh bìa tòa nhà full-width
  | 'market'      // Card chợ đồ cũ
  | 'review';     // Ảnh đính kèm đánh giá

const IMAGE_TRANSFORMS: Record<ImagePreset, string> = {
  thumbnail: 'w_400,h_250,c_fill,q_auto,f_auto',
  gallery: 'w_800,h_500,c_fill,q_auto,f_auto',
  avatar: 'w_200,h_200,c_fill,g_face,q_auto,f_auto',
  hero: 'w_1200,h_450,c_fill,q_auto,f_auto',
  market: 'w_400,h_400,c_fill,q_auto,f_auto',
  review: 'w_600,h_400,c_fill,q_auto,f_auto',
};

export function getOptimizedImageUrl(
  cloudinaryUrl?: string,
  preset: ImagePreset = 'thumbnail'
): string {
  if (!cloudinaryUrl) return '';
  if (!cloudinaryUrl.includes('cloudinary.com')) {
    return cloudinaryUrl; // Giữ nguyên nếu không phải Cloudinary URL
  }
  
  const transform = IMAGE_TRANSFORMS[preset];
  return cloudinaryUrl.replace('/upload/', `/upload/${transform}/`);
}

// Validate file trước khi upload
export function validateImageFile(file: File): string | null {
  const MAX_SIZE_MB = 5;
  const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return `Ảnh "${file.name}" không hợp lệ. Chỉ chấp nhận JPG, PNG, WebP`;
  }
  
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return `Ảnh "${file.name}" vượt quá ${MAX_SIZE_MB}MB`;
  }
  
  return null; // Hợp lệ
}
