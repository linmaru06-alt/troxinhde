import { MarketplaceItem, MarketplaceConditionCode, MarketplaceDeliveryMethodCode } from '../types';
export type { MarketplaceConditionCode, MarketplaceDeliveryMethodCode };

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

/**
 * Danh sách mã tình trạng hợp lệ
 */
export const VALID_CONDITIONS = ['nhu_moi', 'con_tot', 'da_cu'] as const;

/**
 * Danh sách mã cách nhận đồ hợp lệ
 */
export const VALID_DELIVERY_METHODS = [
  'tai_truong',
  'giao_tan_noi',
  'tu_den_lay',
] as const;

/**
 * Bảng ánh xạ mã -> nhãn tiếng Việt dùng chung cho Form, Filter và Chip
 */
export const CONDITION_LABELS: Record<string, string> = {
  nhu_moi: 'Như mới',
  con_tot: 'Còn tốt',
  da_cu: 'Đã cũ',
};

export const DELIVERY_METHOD_LABELS: Record<string, string> = {
  tai_truong: 'Gặp tại trường/KTX',
  giao_tan_noi: 'Giao tận nơi',
  tu_den_lay: 'Tự đến lấy',
};

/**
 * Khoảng thời gian đăng
 */
export const VALID_TIME_RANGES = ['all', '24h', '7d'] as const;
export type MarketplaceTimeRange = typeof VALID_TIME_RANGES[number];

/**
 * Chuẩn hóa tình trạng món đồ từ chuỗi bất kỳ hoặc phần trăm:
 * - "tặng miễn phí" / "miễn phí" -> undefined (miễn phí là giá, không phải tình trạng)
 * - >=95% -> 'nhu_moi'
 * - 70-94% -> 'con_tot'
 * - <70% -> 'da_cu'
 * - Nhận diện từ khóa tiếng Việt bỏ dấu
 */
export function normalizeCondition(cond: string | undefined): MarketplaceConditionCode | undefined {
  if (!cond) return undefined;
  const raw = removeVietnameseTones(cond).toLowerCase().trim();

  // 1. "tặng miễn phí" / "miễn phí" trả về undefined
  if (raw.includes('tang mien phi') || raw === 'mien phi' || raw.includes('0d') || raw.includes('0 dong')) {
    return undefined;
  }

  // 2. Nhận diện nếu đã là mã code chuẩn
  if (raw === 'nhu_moi') return 'nhu_moi';
  if (raw === 'con_tot') return 'con_tot';
  if (raw === 'da_cu') return 'da_cu';

  // 3. Nhận diện theo phần trăm: >=95% -> nhu_moi, 70-94% -> con_tot, <70% -> da_cu
  const percentMatch = raw.match(/(\d+)\s*%/);
  if (percentMatch) {
    const percent = parseInt(percentMatch[1], 10);
    if (!isNaN(percent)) {
      if (percent >= 95) return 'nhu_moi';
      if (percent >= 70) return 'con_tot';
      return 'da_cu';
    }
  }

  // 4. Nhận diện theo từ khóa
  if (
    raw.includes('nhu moi') ||
    raw.includes('moi 99') ||
    raw.includes('moi 95') ||
    raw.includes('moi tinh') ||
    raw.startsWith('moi')
  ) {
    return 'nhu_moi';
  }

  if (
    raw.includes('con dung tot') ||
    raw.includes('con tot') ||
    raw.includes('dung tot') ||
    raw.includes('tot')
  ) {
    return 'con_tot';
  }

  if (
    raw.includes('da qua su dung') ||
    raw.includes('da cu') ||
    raw.includes('cu')
  ) {
    return 'da_cu';
  }

  return undefined;
}

export interface MarketplaceFilterCriteria {
  keyword?: string;
  categories?: string[]; // Hỗ trợ chọn 1 hoặc nhiều danh mục
  district?: string;
  minPrice?: number;
  maxPrice?: number;
  isFreeOnly?: boolean;
  conditions?: MarketplaceConditionCode[]; // Tình trạng theo mã: nhu_moi, con_tot, da_cu
  deliveryMethods?: MarketplaceDeliveryMethodCode[]; // Cách nhận đồ theo mã
  timeRange?: MarketplaceTimeRange; // Thời gian đăng: all / 24h / 7d
  isNegotiableOnly?: boolean; // Có thể trả giá
  hasImagesOnly?: boolean; // Chỉ tin có ảnh
  sortBy?: MarketplaceSortOption;
  viewMode?: 'public' | 'my_items';
  currentUserId?: string;
  hiddenItemIds?: string[]; // Danh sách ID các tin đã ẩn
  blockedUserIds?: string[]; // Danh sách ID người dùng/người bán đã chặn
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
 * Đếm số lượng nhóm bộ lọc con đang áp dụng trong "Bộ lọc khác" (tối đa 6 nhóm)
 */
export function countAdvancedFilters(criteria: Partial<MarketplaceFilterCriteria>): number {
  let count = 0;

  // 1. Khoảng giá (chỉ tính khi không bật đồ miễn phí)
  if (!criteria.isFreeOnly && (criteria.minPrice !== undefined || criteria.maxPrice !== undefined)) {
    count += 1;
  }

  // 2. Tình trạng
  if (criteria.conditions && criteria.conditions.length > 0) {
    count += 1;
  }

  // 3. Cách nhận đồ
  if (criteria.deliveryMethods && criteria.deliveryMethods.length > 0) {
    count += 1;
  }

  // 4. Thời gian đăng
  if (criteria.timeRange && criteria.timeRange !== 'all') {
    count += 1;
  }

  // 5. Có thể trả giá
  if (criteria.isNegotiableOnly) {
    count += 1;
  }

  // 6. Chỉ tin có ảnh
  if (criteria.hasImagesOnly) {
    count += 1;
  }

  return count;
}

/**
 * Đếm tổng số lượng tất cả bộ lọc đang được kích hoạt (bao gồm cả từ khóa, danh mục, khu vực, miễn phí)
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
  }

  // Cộng thêm các nhóm bộ lọc con nâng cao
  count += countAdvancedFilters(criteria);

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
  conditions: MarketplaceConditionCode[];
  deliveryMethods: MarketplaceDeliveryMethodCode[];
  timeRange: MarketplaceTimeRange;
  isNegotiableOnly: boolean;
  hasImagesOnly: boolean;
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
  const rawCond = searchParams.get('tinhTrang');
  const rawDeliv = searchParams.get('nhanDo');
  const rawTime = searchParams.get('thoiGian');
  const rawNego = searchParams.get('traGia');
  const rawImg = searchParams.get('coAnh');
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

  // 6. Tình trạng (nhu_moi, con_tot, da_cu)
  let conditions: MarketplaceConditionCode[] = [];
  if (rawCond) {
    const splitConds = rawCond.split(',').map((c) => c.trim()).filter(Boolean);
    for (const c of splitConds) {
      const normalized = normalizeCondition(c);
      if (normalized && !conditions.includes(normalized)) {
        conditions.push(normalized);
      }
    }
  }

  // 7. Cách nhận đồ (tai_truong, giao_tan_noi, tu_den_lay)
  let deliveryMethods: MarketplaceDeliveryMethodCode[] = [];
  if (rawDeliv) {
    const splitDelivs = rawDeliv.split(',').map((d) => d.trim().toLowerCase()).filter(Boolean);
    for (const d of splitDelivs) {
      if ((VALID_DELIVERY_METHODS as readonly string[]).includes(d) && !deliveryMethods.includes(d as MarketplaceDeliveryMethodCode)) {
        deliveryMethods.push(d as MarketplaceDeliveryMethodCode);
      }
    }
  }

  // 8. Thời gian đăng (all, 24h, 7d)
  let timeRange: MarketplaceTimeRange = 'all';
  if (rawTime === '24h' || rawTime === '7d') {
    timeRange = rawTime;
  }

  // 9. Có thể trả giá
  const isNegotiableOnly = rawNego === '1' || rawNego === 'true';

  // 10. Chỉ tin có ảnh
  const hasImagesOnly = rawImg === '1' || rawImg === 'true';

  // 11. Sắp xếp (fallback 'newest' nếu giá trị lạ)
  let sortBy: MarketplaceSortOption = 'newest';
  if (rawSort === 'price_asc' || rawSort === 'price_desc') {
    sortBy = rawSort;
  }

  // 12. Số trang (fallback 1 nếu <= 0 hoặc không phải số)
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
    conditions,
    deliveryMethods,
    timeRange,
    isNegotiableOnly,
    hasImagesOnly,
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

  // 5. Tình trạng (lưu trực tiếp mã code)
  if (state.conditions && state.conditions.length > 0) {
    const validCodes = state.conditions.filter((c) => (VALID_CONDITIONS as readonly string[]).includes(c));
    if (validCodes.length > 0) {
      params.set('tinhTrang', validCodes.join(','));
    }
  }

  // 6. Cách nhận đồ (lưu trực tiếp mã code)
  if (state.deliveryMethods && state.deliveryMethods.length > 0) {
    const validDelivs = state.deliveryMethods.filter((d) => (VALID_DELIVERY_METHODS as readonly string[]).includes(d));
    if (validDelivs.length > 0) {
      params.set('nhanDo', validDelivs.join(','));
    }
  }

  // 7. Thời gian đăng
  if (state.timeRange && state.timeRange !== 'all') {
    params.set('thoiGian', state.timeRange);
  }

  // 8. Có thể trả giá
  if (state.isNegotiableOnly) {
    params.set('traGia', '1');
  }

  // 9. Chỉ tin có ảnh
  if (state.hasImagesOnly) {
    params.set('coAnh', '1');
  }

  // 10. Sắp xếp: chỉ đưa vào khi khác 'newest' (mặc định)
  if (state.sortBy && state.sortBy !== 'newest') {
    params.set('sapXep', state.sortBy);
  }

  // 11. Trang: chỉ đưa vào khi > 1
  if (state.page && state.page > 1) {
    params.set('trang', String(Math.floor(state.page)));
  }

  return params;
}

/**
 * Hàm lọc danh sách sản phẩm Chợ đồ cũ dựa trên tiêu chí
 * Nhận tham số nowTime (mặc định Date.now()) để kiểm thử ổn định với thời điểm cố định
 */
export function filterMarketplaceItems(
  items: MarketplaceItem[],
  criteria: MarketplaceFilterCriteria,
  nowTime: number = Date.now()
): MarketplaceItem[] {
  if (!Array.isArray(items)) return [];

  const {
    keyword = '',
    categories = [],
    district = '',
    minPrice,
    maxPrice,
    isFreeOnly = false,
    conditions = [],
    deliveryMethods = [],
    timeRange = 'all',
    isNegotiableOnly = false,
    hasImagesOnly = false,
    sortBy = 'newest',
    viewMode = 'public',
    currentUserId,
    hiddenItemIds = [],
    blockedUserIds = [],
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
        const isPending = item.status === 'Chờ duyệt' || item.moderationStatus === 'pending';
        const isRejected = item.status === 'Bị từ chối' || item.moderationStatus === 'rejected';
        if (isPending || isRejected) return false;

        // Loại bỏ tin bị ẩn khỏi danh sách của người dùng
        if (hiddenItemIds.length > 0 && hiddenItemIds.includes(item.id)) {
          return false;
        }

        // Loại bỏ tin của người bán bị chặn
        if (blockedUserIds.length > 0 && item.userId && blockedUserIds.includes(item.userId)) {
          return false;
        }
      } else if (viewMode === 'my_items') {
        if (!currentUserId || item.userId !== currentUserId) return false;
      }

      // 2. Lọc theo danh mục
      if (validCategories.length > 0) {
        if (!validCategories.includes(item.category)) {
          return false;
        }
      }

      // 3. Lọc theo Giá:
      if (isFreeOnly) {
        const isItemFree = item.pricingType === 'Miễn phí' || item.price === 0;
        if (!isItemFree) return false;
      } else {
        if (hasPriceError) return false;

        const itemPrice = Number(item.price) || 0;
        if (minPrice !== undefined && itemPrice < minPrice) {
          return false;
        }
        if (maxPrice !== undefined && itemPrice > maxPrice) {
          return false;
        }
      }

      // 4. Lọc theo Tình trạng đồ:
      if (conditions.length > 0) {
        const normalizedItemCond = normalizeCondition(item.condition);
        if (!normalizedItemCond || !conditions.includes(normalizedItemCond)) {
          return false;
        }
      }

      // 5. Lọc theo Cách nhận đồ:
      // Quy tắc: Tin đăng cũ thiếu trường này (hoặc rỗng) thì không khớp bộ lọc cách nhận đồ
      if (deliveryMethods.length > 0) {
        const itemMethods = item.deliveryMethods;
        if (!itemMethods || itemMethods.length === 0) {
          return false;
        }
        const hasMatch = deliveryMethods.some((m) => itemMethods.includes(m));
        if (!hasMatch) {
          return false;
        }
      }

      // 6. Lọc theo Thời gian đăng (so sánh với nowTime):
      if (timeRange === '24h') {
        const itemTime = new Date(item.createdAt || 0).getTime();
        if (isNaN(itemTime) || nowTime - itemTime > 24 * 3600 * 1000) {
          return false;
        }
      } else if (timeRange === '7d') {
        const itemTime = new Date(item.createdAt || 0).getTime();
        if (isNaN(itemTime) || nowTime - itemTime > 7 * 24 * 3600 * 1000) {
          return false;
        }
      }

      // 7. Lọc theo "Có thể trả giá":
      // Quy tắc: Tin cũ thiếu trường này mặc định là false
      if (isNegotiableOnly) {
        if (item.isNegotiable !== true) {
          return false;
        }
      }

      // 8. Lọc theo "Chỉ tin có ảnh":
      if (hasImagesOnly) {
        const hasValidImg =
          Array.isArray(item.images) &&
          item.images.length > 0 &&
          item.images.some((img) => img && !img.includes('placeholder'));
        if (!hasValidImg) {
          return false;
        }
      }

      // 9. Lọc theo Khu vực (District):
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

      // 10. Tìm kiếm từ khóa:
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
      // 11. Sắp xếp kết quả (Stable sort: Tiêu chí phụ là createdAt mới hơn)
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
