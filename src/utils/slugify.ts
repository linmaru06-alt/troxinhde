/**
 * Tiện ích tạo URL Tiếng Việt Chuẩn Semantic SEO (Slug Generator)
 * Tuân thủ quy chuẩn SEO Google: N-gram relevance, không dấu, ngăn cách bằng dấu gạch ngang đơn
 * và phân tách mã định danh gốc (ID/UUID) bằng dấu gạch đôi '--' (Double-Dash Pattern).
 */

/**
 * Chuyển chuỗi tiếng Việt có dấu sang slug ASCII không dấu chuẩn SEO
 * @param text Chuỗi văn bản tiếng Việt cần tạo slug
 * @param maxLength Độ dài ký tự tối đa của slug (mặc định 65 ký tự)
 */
export function toVietnameseSlug(text: string, maxLength: number = 65): string {
  if (!text || typeof text !== 'string') return '';

  let slug = text
    .normalize('NFD') // Tách dấu thanh và phụ âm
    .replace(/[\u0300-\u036f]/g, '') // Xóa dấu thanh tổ hợp
    .replace(/[đĐ]/g, 'd') // Thay đ, Đ thành d
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Xóa toàn bộ ký tự đặc biệt, emoji
    .trim()
    .replace(/\s+/g, '-') // Thay khoảng trắng bằng gạch ngang
    .replace(/-+/g, '-'); // Gộp nhiều gạch nối liên tiếp thành một

  // Cắt ngắn nếu vượt quá maxLength tại ranh giới từ nguyên vẹn
  if (slug.length > maxLength) {
    const trimmed = slug.slice(0, maxLength);
    const lastHyphen = trimmed.lastIndexOf('-');
    slug = lastHyphen > 20 ? trimmed.slice(0, lastHyphen) : trimmed;
  }

  // Xóa gạch nối ở đầu và cuối chuỗi
  return slug.replace(/^-+|-+$/g, '');
}

/**
 * Bóc tách mã định danh gốc (ID/UUID) từ tham số URL
 * Hỗ trợ cả 2 định dạng:
 * 1. Định dạng mới chuẩn SEO có slug: "su-a-vo-nam-tu-liem--117c10ec-bddc-4d07-8355-7bdf72dae0ed" -> lấy phần sau '--'
 * 2. Định dạng cũ (ID/UUID trần): "117c10ec-bddc-4d07-8355-7bdf72dae0ed" -> giữ nguyên ID gốc
 * Đảm bảo 100% tương thích ngược, không bao giờ bị lỗi 404.
 */
export function extractIdFromParam(param?: string | null): string {
  if (!param || typeof param !== 'string') return '';
  const separatorIndex = param.lastIndexOf('--');
  if (separatorIndex !== -1) {
    return param.slice(separatorIndex + 2);
  }
  return param;
}

/**
 * Tạo URL chuẩn SEO cho bài đăng Tìm bạn ở ghép
 * Ví dụ: /o-ghep/tim-ban-o-ghep-su-a-vo-nam-tu-liem--117c10ec-bddc-4d07-8355-7bdf72dae0ed
 */
export function buildRoommateUrl(post: {
  id: string;
  userName?: string;
  name?: string;
  district?: string;
}): string {
  if (!post || !post.id) return '/o-ghep';
  const namePart = post.userName || post.name || 'tim-ban-o-ghep';
  const rawTitle = `tim-ban-o-ghep-${namePart} ${post.district || ''}`;
  const slug = toVietnameseSlug(rawTitle) || 'tim-ban-o-ghep';
  return `/o-ghep/${slug}--${post.id}`;
}

/**
 * Tạo URL chuẩn SEO cho tin đăng Phòng trọ
 * Ví dụ: /phong/phong-tro-khep-kin-full-do-xuan-thuy-cau-giay--p-101-cau-giay
 */
export function buildRoomUrl(room: {
  id: string;
  title?: string;
  district?: string;
}): string {
  if (!room || !room.id) return '/tim-kiem';
  const rawTitle = `${room.title || 'phong-tro-cho-thue'} ${room.district || ''}`;
  const slug = toVietnameseSlug(rawTitle) || 'phong-tro-cho-thue';
  return `/phong/${slug}--${room.id}`;
}

/**
 * Tạo URL chuẩn SEO cho món đồ thanh lý Chợ đồ cũ
 * Ví dụ: /cho-do-cu/thanh-ly-quat-dung-senko-nam-tu-liem--item-quat-101
 */
export function buildMarketplaceUrl(item: {
  id: string;
  title?: string;
  district?: string;
}): string {
  if (!item || !item.id) return '/cho-do-cu';
  const rawTitle = `thanh-ly-${item.title || 'do-cu'} ${item.district || ''}`;
  const slug = toVietnameseSlug(rawTitle) || 'thanh-ly-do-cu';
  return `/cho-do-cu/${slug}--${item.id}`;
}

/**
 * Tạo URL chuẩn SEO cho Tòa nhà / Khu trọ
 * Ví dụ: /toa-nha/toa-nha-tro-xinh-xuan-thuy-cau-giay--bld-xuan-thuy
 */
export function buildBuildingUrl(building: {
  id: string;
  name?: string;
  district?: string;
}): string {
  if (!building || !building.id) return '/tim-kiem';
  const rawTitle = `${building.name || 'toa-nha-tro-xinh'} ${building.district || ''}`;
  const slug = toVietnameseSlug(rawTitle) || 'toa-nha-tro-xinh';
  return `/toa-nha/${slug}--${building.id}`;
}
