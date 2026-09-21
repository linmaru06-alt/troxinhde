import { MarketplaceItem } from '../types';

/**
 * Loại bỏ dấu tiếng Việt và chuẩn hóa chuỗi để tìm kiếm không phân biệt hoa thường và dấu
 */
export function removeVietnameseTones(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

export type MarketplaceSortOption = 'newest' | 'price_asc' | 'price_desc' | 'free_first';

export interface MarketplaceFilterCriteria {
  keyword?: string;
  categories?: string[]; // Hỗ trợ chọn 1 hoặc nhiều danh mục
  district?: string;
  minPrice?: number;
  maxPrice?: number;
  isFreeOnly?: boolean;
  sortBy?: MarketplaceSortOption;
  viewMode?: 'public' | 'my_items';
  currentUserId?: string;
}

/**
 * Kiểm tra tính hợp lệ của khoảng giá min - max
 */
export function validatePriceRange(
  min?: number,
  max?: number
): { isValid: boolean; error?: string } {
  if (min !== undefined && min < 0) {
    return { isValid: false, error: 'Giá tối thiểu không được âm' };
  }
  if (max !== undefined && max < 0) {
    return { isValid: false, error: 'Giá tối đa không được âm' };
  }
  if (min !== undefined && max !== undefined && min > max) {
    return { isValid: false, error: 'Giá tối thiểu không được lớn hơn giá tối đa' };
  }
  return { isValid: true };
}

/**
 * Đếm số lượng bộ lọc đang được kích hoạt (dùng cho Badge trên mobile button)
 */
export function countActiveFilters(criteria: MarketplaceFilterCriteria): number {
  let count = 0;

  if (criteria.keyword && criteria.keyword.trim()) {
    count += 1;
  }

  if (criteria.categories && criteria.categories.length > 0 && !criteria.categories.includes('Tất cả')) {
    count += criteria.categories.length;
  }

  if (criteria.district && criteria.district.trim() && criteria.district !== 'Tất cả khu vực') {
    count += 1;
  }

  if (criteria.isFreeOnly) {
    count += 1;
  } else {
    if (criteria.minPrice !== undefined || criteria.maxPrice !== undefined) {
      count += 1;
    }
  }

  return count;
}

/**
 * Hàm lọc danh sách sản phẩm Chợ đồ cũ dựa trên tiêu chí
 */
export function filterMarketplaceItems(
  items: MarketplaceItem[],
  criteria: MarketplaceFilterCriteria
): MarketplaceItem[] {
  if (!Array.isArray(items)) return [];

  const {
    keyword = '',
    categories = [],
    district = '',
    minPrice,
    maxPrice,
    isFreeOnly = false,
    sortBy = 'newest',
    viewMode = 'public',
    currentUserId,
  } = criteria;

  const priceValidation = validatePriceRange(minPrice, maxPrice);
  const hasPriceError = !priceValidation.isValid;

  // Chuẩn hóa từ khóa tìm kiếm
  const normKeyword = removeVietnameseTones(keyword);

  // Chuẩn hóa quận huyện lọc
  const normSelectedDistrict = district && district !== 'Tất cả khu vực'
    ? removeVietnameseTones(district).replace(/quan\s*/g, '').trim()
    : '';

  // Chuẩn hóa danh mục đã chọn (loại bỏ 'Tất cả')
  const validCategories = categories.filter((c) => c && c !== 'Tất cả');

  return items
    .filter((item) => {
      // 1. Phân quyền theo chế độ xem (View Mode):
      if (viewMode === 'public') {
        // Chỉ công khai tin hợp lệ (không chờ duyệt, không bị từ chối)
        const isPending = item.status === 'Chờ duyệt' || item.moderationStatus === 'pending';
        const isRejected = item.status === 'Bị từ chối' || item.moderationStatus === 'rejected';
        if (isPending || isRejected) return false;
      } else if (viewMode === 'my_items') {
        // Chỉ hiện tin của chính người dùng hiện tại
        if (!currentUserId || item.userId !== currentUserId) return false;
      }

      // 2. Lọc theo danh mục (chọn 1 hoặc nhiều danh mục)
      if (validCategories.length > 0) {
        if (!validCategories.includes(item.category)) {
          return false;
        }
      }

      // 3. Lọc theo Giá:
      if (isFreeOnly) {
        // Khi bật toggle "Chỉ đồ miễn phí", chỉ giữ các món 0đ hoặc loại "Miễn phí"
        const isItemFree = item.pricingType === 'Miễn phí' || item.price === 0;
        if (!isItemFree) return false;
      } else {
        // Nếu khoảng giá bị lỗi (min > max), không hiển thị kết quả sai lệch
        if (hasPriceError) return false;

        const itemPrice = Number(item.price) || 0;
        if (minPrice !== undefined && itemPrice < minPrice) {
          return false;
        }
        if (maxPrice !== undefined && itemPrice > maxPrice) {
          return false;
        }
      }

      // 4. Lọc theo Khu vực (District):
      if (normSelectedDistrict) {
        const normItemDistrict = removeVietnameseTones(item.district || '').replace(/quan\s*/g, '').trim();
        const normItemLocation = removeVietnameseTones(item.location || '').replace(/quan\s*/g, '').trim();
        if (
          !normItemDistrict.includes(normSelectedDistrict) &&
          !normItemLocation.includes(normSelectedDistrict)
        ) {
          return false;
        }
      }

      // 5. Tìm kiếm từ khóa (Keyword - không phân biệt hoa thường và không dấu tiếng Việt):
      if (normKeyword) {
        const normName = removeVietnameseTones(item.name || '');
        const normDesc = removeVietnameseTones(item.description || '');
        const normLoc = removeVietnameseTones(item.location || '');
        const normDist = removeVietnameseTones(item.district || '');

        const matchName = normName.includes(normKeyword);
        const matchDesc = normDesc.includes(normKeyword);
        const matchLoc = normLoc.includes(normKeyword);
        const matchDist = normDist.includes(normKeyword);

        if (!matchName && !matchDesc && !matchLoc && !matchDist) {
          return false;
        }
      }

      return true;
    })
    .sort((a, b) => {
      // 6. Sắp xếp kết quả:
      if (sortBy === 'price_asc') {
        return (a.price || 0) - (b.price || 0);
      }
      if (sortBy === 'price_desc') {
        return (b.price || 0) - (a.price || 0);
      }
      if (sortBy === 'free_first') {
        const aFree = a.pricingType === 'Miễn phí' || a.price === 0;
        const bFree = b.pricingType === 'Miễn phí' || b.price === 0;
        if (aFree && !bFree) return -1;
        if (!aFree && bFree) return 1;
      }
      // Mặc định: 'newest'
      const timeB = new Date(b.createdAt || 0).getTime();
      const timeA = new Date(a.createdAt || 0).getTime();
      return timeB - timeA;
    });
}
