import { MarketplaceItem } from '../types';

/**
 * Danh sách danh mục hợp lệ
 */
export const VALID_CATEGORIES = [
  'Nội thất',
  'Đồ điện tử',
  'Sách vở',
  'Đồ gia dụng',
] as const;

/**
 * Danh sách quận/huyện hợp lệ tại Hà Nội
 */
export const VALID_DISTRICTS = [
  'Quận Cầu Giấy',
  'Quận Đống Đa',
  'Quận Hai Bà Trưng',
  'Quận Thanh Xuân',
  'Quận Nam Từ Liêm',
  'Quận Hà Đông',
  'Quận Ba Đình',
  'Quận Bắc Từ Liêm',
  'Quận Hoàng Mai',
] as const;

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

export type MarketplaceSortOption = 'newest' | 'price_asc' | 'price_desc';

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
 * Làm sạch và chuẩn hóa giá trị số tiền: loại bỏ số âm, làm tròn xuống số nguyên
 */
export function sanitizePrice(val: any): number | undefined {
  if (val === null || val === undefined || val === '') return undefined;
  const num = Number(val);
  if (isNaN(num) || num < 0) return undefined;
  return Math.floor(num);
}

export interface ParsedMarketplaceFilterState {
  keyword: string;
  categories: string[];
  district: string;
  minPrice?: number;
  maxPrice?: number;
  isFreeOnly: boolean;
  sortBy: MarketplaceSortOption;
  page: number;
}

/**
 * Phân tích và validate an toàn các query param từ URL search string
 */
export function parseMarketplaceUrlParams(searchParams: URLSearchParams): ParsedMarketplaceFilterState {
  const rawQ = searchParams.get('q') || '';
  const rawCat = searchParams.get('danhMuc');
  const rawDist = searchParams.get('khuVuc') || '';
  const rawMin = searchParams.get('giaTu');
  const rawMax = searchParams.get('giaDen');
  const rawFree = searchParams.get('mienPhi');
  const rawSort = searchParams.get('sapXep');
  const rawPage = searchParams.get('trang');

  // 1. Từ khóa
  const keyword = rawQ.trim();

  // 2. Danh mục (loại bỏ giá trị không hợp lệ)
  let categories: string[] = [];
  if (rawCat) {
    const splitCats = rawCat.split(',').map((c) => c.trim()).filter(Boolean);
    categories = splitCats.filter((c) => (VALID_CATEGORIES as readonly string[]).includes(c));
  }

  // 3. Khu vực (loại bỏ giá trị không hợp lệ)
  let district = '';
  if (rawDist && (VALID_DISTRICTS as readonly string[]).includes(rawDist.trim())) {
    district = rawDist.trim();
  }

  // 4. Toggle miễn phí
  const isFreeOnly = rawFree === '1' || rawFree === 'true';

  // 5. Khoảng giá (nếu bật miễn phí thì bỏ qua giá)
  let minPrice = isFreeOnly ? undefined : sanitizePrice(rawMin);
  let maxPrice = isFreeOnly ? undefined : sanitizePrice(rawMax);

  // Nếu min > max trong URL, hoán đổi để đảm bảo hợp lệ an toàn
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    const temp = minPrice;
    minPrice = maxPrice;
    maxPrice = temp;
  }

  // 6. Sắp xếp (fallback 'newest' nếu giá trị lạ)
  let sortBy: MarketplaceSortOption = 'newest';
  if (rawSort === 'price_asc' || rawSort === 'price_desc') {
    sortBy = rawSort;
  }

  // 7. Số trang (fallback 1 nếu <= 0 hoặc không phải số)
  let page = 1;
  if (rawPage) {
    const parsed = parseInt(rawPage, 10);
    if (!isNaN(parsed) && parsed >= 1) {
      page = parsed;
    }
  }

  return {
    keyword,
    categories,
    district,
    minPrice,
    maxPrice,
    isFreeOnly,
    sortBy,
    page,
  };
}

/**
 * Xây dựng URLSearchParams sạch từ state: Không đưa giá trị mặc định / rỗng vào URL
 */
export function buildMarketplaceUrlParams(state: ParsedMarketplaceFilterState): URLSearchParams {
  const params = new URLSearchParams();

  // 1. Từ khóa
  if (state.keyword && state.keyword.trim()) {
    params.set('q', state.keyword.trim());
  }

  // 2. Danh mục
  const validCats = state.categories.filter((c) => (VALID_CATEGORIES as readonly string[]).includes(c));
  if (validCats.length > 0) {
    params.set('danhMuc', validCats.join(','));
  }

  // 3. Khu vực
  if (state.district && (VALID_DISTRICTS as readonly string[]).includes(state.district)) {
    params.set('khuVuc', state.district);
  }

  // 4. Miễn phí hoặc khoảng giá
  if (state.isFreeOnly) {
    params.set('mienPhi', '1');
  } else {
    let min = sanitizePrice(state.minPrice);
    let max = sanitizePrice(state.maxPrice);
    if (min !== undefined && max !== undefined && min > max) {
      const temp = min;
      min = max;
      max = temp;
    }
    if (min !== undefined) {
      params.set('giaTu', String(min));
    }
    if (max !== undefined) {
      params.set('giaDen', String(max));
    }
  }

  // 5. Sắp xếp: chỉ đưa vào khi khác 'newest' (mặc định)
  if (state.sortBy && state.sortBy !== 'newest') {
    params.set('sapXep', state.sortBy);
  }

  // 6. Trang: chỉ đưa vào khi > 1
  if (state.page && state.page > 1) {
    params.set('trang', String(Math.floor(state.page)));
  }

  return params;
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
      // 6. Sắp xếp kết quả (Stable sort: Tiêu chí phụ là createdAt mới hơn)
      const timeB = new Date(b.createdAt || 0).getTime();
      const timeA = new Date(a.createdAt || 0).getTime();

      if (sortBy === 'price_asc') {
        const diff = (a.price || 0) - (b.price || 0);
        if (diff !== 0) return diff;
        return timeB - timeA;
      }
      if (sortBy === 'price_desc') {
        const diff = (b.price || 0) - (a.price || 0);
        if (diff !== 0) return diff;
        return timeB - timeA;
      }

      // Mặc định: 'newest'
      return timeB - timeA;
    });
}
