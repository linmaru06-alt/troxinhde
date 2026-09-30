import { supabase, isSupabaseConfigured } from '../supabase';

// ==============================================================================
// HỒ SƠ CÔNG KHAI CỦA NGƯỜI DÙNG KHÁC
// Bảng profiles chỉ cho đọc hồ sơ của chính mình (migration 029). Tên, ảnh và huy hiệu
// xác minh của người khác lấy qua RPC get_public_profiles (không có SĐT, firebase_uid).
// ==============================================================================

export interface PublicProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  app_role: string | null;
  verified: boolean;
  student_verified: boolean;
  phone_verified: boolean;
  /** Đang bị khóa (đã tính cả thời hạn khóa) */
  is_banned: boolean;
  university: string | null;
  student_year: string | null;
  created_at: string | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BATCH_SIZE = 200;

/**
 * Lấy hồ sơ công khai theo danh sách id. Lỗi chỉ làm thiếu thông tin hiển thị
 * (tên/ảnh dùng giá trị mặc định), không chặn cả trang.
 */
export async function getPublicProfiles(ids: Array<string | null | undefined>): Promise<Map<string, PublicProfile>> {
  const result = new Map<string, PublicProfile>();
  const uniqueIds = Array.from(new Set(ids.filter((id): id is string => Boolean(id && UUID_RE.test(id)))));
  if (!isSupabaseConfigured || uniqueIds.length === 0) return result;

  for (let i = 0; i < uniqueIds.length; i += BATCH_SIZE) {
    const { data, error } = await supabase.rpc('get_public_profiles', { p_ids: uniqueIds.slice(i, i + BATCH_SIZE) });
    if (error) {
      console.warn('[PublicProfiles] Không thể tải hồ sơ công khai:', error.message);
      return result;
    }
    ((data as PublicProfile[]) || []).forEach((profile) => result.set(profile.id, profile));
  }
  return result;
}

/**
 * Gắn hồ sơ công khai vào các dòng có join profiles bị RLS ẩn (hồ sơ người khác).
 * Dòng đã có dữ liệu join (vd: hồ sơ của chính mình) được giữ nguyên.
 */
export async function attachPublicProfiles<T extends Record<string, any>>(
  rows: T[],
  idKey: string,
  targetKey: string
): Promise<T[]> {
  const missingIds = rows.filter((row) => !row[targetKey] && row[idKey]).map((row) => row[idKey] as string);
  if (missingIds.length === 0) return rows;

  const profiles = await getPublicProfiles(missingIds);
  return rows.map((row) =>
    !row[targetKey] && profiles.has(row[idKey]) ? { ...row, [targetKey]: profiles.get(row[idKey]) } : row
  );
}
