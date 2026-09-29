import { MarketplaceItem, MarketplaceConditionCode, MarketplaceDeliveryMethodCode } from '../types';
import { normalizeCondition, VALID_DELIVERY_METHODS } from './marketplaceFilter';

/**
 * Trạng thái tin chợ đồ cũ trong DB (migration 025).
 * - available: đang bán/tặng
 * - sold: đã bán
 * - closed: người bán đóng tin (không bán nữa)
 * - pending / rejected / hidden: đang kiểm duyệt, bị từ chối, bị tạm ẩn
 * - deleted: đã xóa mềm (giữ lịch sử hội thoại và báo cáo)
 */
export type MarketplaceDbStatus = 'available' | 'sold' | 'closed' | 'pending' | 'rejected' | 'hidden' | 'deleted';
export type MarketplaceSellerStatus = 'available' | 'sold' | 'closed';
export type MarketplaceItemStatus = NonNullable<MarketplaceItem['status']>;
type ModerationStatus = NonNullable<MarketplaceItem['moderationStatus']>;

export type MarketplaceAvailability = 'available' | 'sold' | 'closed' | 'pending' | 'rejected' | 'hidden';

export const CATEGORY_FROM_DB: Record<string, MarketplaceItem['category']> = {
  furniture: 'Nội thất',
  electronics: 'Đồ điện tử',
  books: 'Sách vở',
  household: 'Đồ gia dụng',
  other: 'Đồ gia dụng',
};

export const CATEGORY_TO_DB: Record<MarketplaceItem['category'], string> = {
  'Nội thất': 'furniture',
  'Đồ điện tử': 'electronics',
  'Sách vở': 'books',
  'Đồ gia dụng': 'household',
};

const CONDITION_FROM_DB: Record<string, MarketplaceConditionCode> = {
  new90: 'nhu_moi',
  used: 'con_tot',
  needs_repair: 'da_cu',
};

export const CONDITION_TO_DB: Record<MarketplaceConditionCode, string> = {
  nhu_moi: 'new90',
  con_tot: 'used',
  da_cu: 'needs_repair',
};

/**
 * Chuyển trạng thái DB sang nhãn hiển thị. Trả về null với tin đã xóa mềm.
 */
export function toItemStatus(status?: string | null, moderationStatus?: string | null): MarketplaceItemStatus | null {
  if (status === 'deleted') return null;
  if (status === 'rejected' || moderationStatus === 'rejected') return 'Bị từ chối';
  if (status === 'pending' || moderationStatus === 'pending') return 'Chờ duyệt';
  if (status === 'hidden') return 'Đã ẩn';
  if (status === 'sold' || status === 'given') return 'Đã bán';
  if (status === 'closed') return 'Đã đóng';
  return 'Còn hàng';
}

function toModerationStatus(status?: string | null, moderationStatus?: string | null): ModerationStatus {
  if (moderationStatus === 'pending' || moderationStatus === 'rejected' || moderationStatus === 'approved') {
    return moderationStatus;
  }
  if (status === 'pending') return 'pending';
  if (status === 'rejected') return 'rejected';
  return 'approved';
}

/**
 * Tình trạng thực tế của tin, dùng chung cho danh sách, chi tiết, thẻ và chat.
 */
export function getItemAvailability(
  item: Pick<MarketplaceItem, 'status' | 'moderationStatus' | 'isHidden'>
): MarketplaceAvailability {
  if (item.status === 'Bị từ chối' || item.moderationStatus === 'rejected') return 'rejected';
  if (item.status === 'Chờ duyệt' || item.moderationStatus === 'pending') return 'pending';
  if (item.status === 'Đã ẩn' || item.isHidden) return 'hidden';
  if (item.status === 'Đã bán') return 'sold';
  if (item.status === 'Đã đóng') return 'closed';
  return 'available';
}

export const AVAILABILITY_LABELS: Record<MarketplaceAvailability, string> = {
  available: 'Còn hàng',
  sold: 'Đã bán',
  closed: 'Đã đóng',
  pending: 'Chờ duyệt',
  rejected: 'Bị từ chối',
  hidden: 'Đang ẩn',
};

/** Lý do không thể liên hệ người bán, rỗng nếu tin đang bán. */
export function getUnavailableReason(availability: MarketplaceAvailability): string {
  switch (availability) {
    case 'sold':
      return 'Món đồ này đã bán, không thể liên hệ.';
    case 'closed':
      return 'Người bán đã đóng tin này, không thể liên hệ.';
    case 'pending':
      return 'Món đồ đang chờ duyệt, chưa thể liên hệ.';
    case 'rejected':
      return 'Món đồ bị từ chối duyệt, không thể liên hệ.';
    case 'hidden':
      return 'Món đồ hiện đang bị ẩn, không thể liên hệ.';
    default:
      return '';
  }
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string' && v.trim() !== '') : [];
}

/**
 * Chuyển một dòng marketplace_items (kèm profiles nếu có) sang MarketplaceItem.
 * Không tự bịa số điện thoại, khu vực hay ảnh khi dữ liệu thiếu.
 * Trả về null với tin đã xóa mềm.
 */
export function mapMarketplaceRow(row: any): MarketplaceItem | null {
  if (!row || !row.id) return null;
  const status = toItemStatus(row.status, row.moderation_status);
  if (!status) return null;

  const seller = row.profiles || row.seller || {};
  const imageUrls = toStringArray(row.image_urls);
  const images = imageUrls.length > 0 ? imageUrls : toStringArray(row.images);
  const showPhone = row.show_phone !== false;
  const phone = status === 'Còn hàng' && showPhone ? row.seller_phone || seller.phone || '' : '';
  const price = Number(row.price) || 0;
  const deliveryMethods = toStringArray(row.delivery_methods).filter((m): m is MarketplaceDeliveryMethodCode =>
    (VALID_DELIVERY_METHODS as readonly string[]).includes(m)
  );

  const sellerId: string = row.seller_id || row.user_id || seller.id || '';

  return {
    id: row.id,
    userId: sellerId,
    seller_id: sellerId,
    sellerId,
    userName: row.seller_name || seller.full_name || 'Sinh viên Trọ Xinh',
    userPhone: phone,
    userAvatar: row.seller_avatar || seller.avatar_url || '/images/user-avatar.jpg',
    name: row.title || row.name || 'Món đồ thanh lý',
    price,
    pricingType: row.is_free || price === 0 ? 'Miễn phí' : 'Giá rẻ',
    category: CATEGORY_FROM_DB[row.category] || (Object.values(CATEGORY_FROM_DB).includes(row.category) ? row.category : 'Đồ gia dụng'),
    condition: CONDITION_FROM_DB[row.condition] || normalizeCondition(row.condition) || 'con_tot',
    images,
    location: row.location || row.district || '',
    district: row.district || '',
    description: row.description || '',
    deliveryMethods,
    isNegotiable: Boolean(row.is_negotiable),
    status,
    moderationStatus: toModerationStatus(row.status, row.moderation_status),
    rejectionReason: row.rejection_reason || undefined,
    isHidden: row.status === 'hidden',
    showPhone,
    closedAt: row.closed_at || undefined,
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || undefined,
  };
}

export interface MarketplaceItemInput {
  name: string;
  price: number;
  pricingType: MarketplaceItem['pricingType'];
  category: MarketplaceItem['category'];
  condition: MarketplaceConditionCode;
  location: string;
  district: string;
  description: string;
  images: string[];
  deliveryMethods: MarketplaceDeliveryMethodCode[];
  isNegotiable: boolean;
}

/**
 * Chuyển dữ liệu biểu mẫu sang cột DB (dùng cho tạo tin và sửa tin).
 */
export function toMarketplaceDbFields(input: MarketplaceItemInput) {
  const isFree = input.pricingType === 'Miễn phí';
  return {
    title: input.name.trim(),
    price: isFree ? 0 : Math.max(0, Math.round(Number(input.price) || 0)),
    is_free: isFree,
    category: CATEGORY_TO_DB[input.category] || 'other',
    condition: CONDITION_TO_DB[input.condition] || 'used',
    district: input.district.trim(),
    location: input.location.trim(),
    description: input.description.trim(),
    image_urls: input.images,
    images: input.images,
    delivery_methods: input.deliveryMethods,
    is_negotiable: input.isNegotiable,
  };
}
