export const XU_TO_VND_RATE = 1000;
export const FREE_LISTING_QUOTA = 2;
export const LISTING_YEARLY_DISCOUNT_PERCENT = 20;

export type ListingPlanId = 'single_15d' | 'single_30d' | 'featured' | 'pro';
export type ListingBillingCycle = 'monthly' | 'yearly';
export type BoostPackageId = 'single' | '3days' | '7days' | '30days';
export type CanonicalK23PlanCode = 'basic' | 'standard' | 'chain';
export type ServiceOrderType = 'listing_plan' | 'boost' | 'k23' | 'repost';

export interface ListingPlanDefinition {
  id: ListingPlanId;
  name: string;
  shortName: string;
  billingType: 'one_time' | 'subscription';
  priceXu: number;
  yearlyPriceXu?: number;
  yearlyEffectiveMonthlyXu?: number;
  durationDays: number;
  periodLabel: string;
  roomLimit: number; // -1 = không giới hạn, 1 = 1 tin mỗi lượt mua
  freeRepostsGranted: number;
  badge?: string;
  popular?: boolean;
  description: string;
  subtitle: string;
  features: string[];
}

export const LISTING_PLANS: ListingPlanDefinition[] = [
  {
    id: 'single_15d',
    name: 'Đăng tin lẻ 15 ngày',
    shortName: 'Tin lẻ 15 ngày',
    billingType: 'one_time',
    priceXu: 30,
    durationDays: 15,
    periodLabel: 'tin / 15 ngày',
    roomLimit: 1,
    freeRepostsGranted: 0,
    subtitle: '15 ngày',
    description: 'Phù hợp khi bạn đã dùng hết 2 phòng miễn phí và chỉ cần đăng thêm 1 phòng ngắn hạn.',
    features: [
      'Đăng 1 tin trong 15 ngày',
      'Kiểm duyệt nội dung & thông tin PCCC',
      'Hiển thị tìm kiếm theo khu vực & gần trường',
      'Nhắn tin trực tiếp với khách thuê',
    ],
  },
  {
    id: 'single_30d',
    name: 'Đăng tin lẻ 30 ngày',
    shortName: 'Tin lẻ 30 ngày',
    billingType: 'one_time',
    priceXu: 50,
    durationDays: 30,
    periodLabel: 'tin / 30 ngày',
    roomLimit: 1,
    freeRepostsGranted: 1,
    subtitle: '30 ngày',
    description: 'Đăng 1 phòng trọn vẹn 30 ngày và được tặng kèm 1 lượt đăng lại miễn phí.',
    features: [
      'Tin 30 ngày + tặng 1 lần đăng lại miễn phí',
      'Kiểm duyệt nội dung & thông tin PCCC',
      'Hiển thị tìm kiếm & bản đồ đầy đủ',
      'Lưu trữ lịch sử phòng & khách quan tâm',
    ],
  },
  {
    id: 'featured',
    name: 'Tin nổi bật',
    shortName: 'Tin nổi bật',
    billingType: 'subscription',
    priceXu: 149,
    yearlyPriceXu: Math.round(149 * 12 * (1 - LISTING_YEARLY_DISCOUNT_PERCENT / 100)), // 1430 Xu
    yearlyEffectiveMonthlyXu: Math.round(149 * (1 - LISTING_YEARLY_DISCOUNT_PERCENT / 100)), // 119 Xu
    durationDays: 30,
    periodLabel: 'tháng',
    roomLimit: 10,
    freeRepostsGranted: 0,
    popular: true,
    badge: 'PHỔ BIẾN NHẤT',
    subtitle: 'Tối đa 10 tin',
    description: 'Lựa chọn tối ưu cho chủ trọ có từ 3–10 phòng đang cho thuê cần tăng tốc độ lấp phòng.',
    features: [
      'Đăng tối đa 10 tin đang hoạt động',
      'Hiển thị ưu tiên, nổi bật trên đầu danh sách',
      'Huy hiệu nổi bật tăng 3× lượt xem',
      'Tắt tự động gia hạn bất cứ lúc nào',
    ],
  },
  {
    id: 'pro',
    name: 'Gói Pro',
    shortName: 'Gói Pro',
    billingType: 'subscription',
    priceXu: 450,
    yearlyPriceXu: Math.round(450 * 12 * (1 - LISTING_YEARLY_DISCOUNT_PERCENT / 100)), // 4320 Xu
    yearlyEffectiveMonthlyXu: Math.round(450 * (1 - LISTING_YEARLY_DISCOUNT_PERCENT / 100)), // 360 Xu
    durationDays: 30,
    periodLabel: 'tháng',
    roomLimit: -1,
    freeRepostsGranted: 0,
    badge: 'CHỦ TRỌ CHUYÊN NGHIỆP',
    subtitle: 'Không giới hạn tin',
    description: 'Dành cho chủ đầu tư hoặc nhà trọ nhiều tòa nhà muốn phủ kín tin đăng không giới hạn.',
    features: [
      'Đăng tin không giới hạn',
      'Ưu tiên hiển thị & hỗ trợ 24/7',
      'Thống kê chi tiết lượt xem & tương tác',
      'Huy hiệu Pro uy tín trên tất cả tin phòng',
    ],
  },
];

export interface BoostPackageDefinition {
  id: BoostPackageId;
  name: string;
  priceXu: number;
  days: number;
  isGoldenHour: boolean;
  badgeText: string;
  popular?: boolean;
  description: string;
  features: string[];
}

export const BOOST_PACKAGES: BoostPackageDefinition[] = [
  {
    id: 'single',
    name: 'Đẩy Lẻ',
    priceXu: 15,
    days: 1,
    isGoldenHour: false,
    badgeText: 'Đẩy Nhanh',
    description: 'Làm mới thứ hạng tin đăng lên đầu danh sách tìm kiếm trong 24 giờ.',
    features: [
      'Đưa tin lên đầu danh sách 1 ngày',
      'Tăng lượt tiếp cận sinh viên tìm phòng gấp',
      'Kích hoạt tức thì sau thanh toán',
    ],
  },
  {
    id: '3days',
    name: 'Đẩy Top 3 Ngày',
    priceXu: 29,
    days: 3,
    isGoldenHour: false,
    badgeText: 'Tin Nổi Bật',
    popular: true,
    description: 'Giữ vị trí nổi bật liên tục 3 ngày, lựa chọn hiệu quả và tiết kiệm nhất.',
    features: [
      'Ưu tiên đầu danh sách tìm kiếm 3 ngày',
      'Gắn huy hiệu Tin Nổi Bật thu hút click',
      'Tăng gấp 3× lượt xem so với tin thường',
    ],
  },
  {
    id: '7days',
    name: 'Đẩy Giờ Vàng 7 Ngày',
    priceXu: 59,
    days: 7,
    isGoldenHour: true,
    badgeText: 'Giờ Vàng',
    description: 'Tự động đẩy tin vào khung giờ vàng 11h–13h và 19h–22h suốt 7 ngày.',
    features: [
      'Tự đẩy vào giờ vàng 11h–13h & 19h–22h',
      'Duy trì 7 ngày liên tiếp',
      'Gắn nhãn Giờ Vàng nổi bật trên kết quả',
    ],
  },
  {
    id: '30days',
    name: 'VIP Toàn Diện 30 Ngày',
    priceXu: 199,
    days: 30,
    isGoldenHour: true,
    badgeText: 'VIP Toàn Diện',
    description: 'Phủ sóng vị trí VIP đầu trang tìm kiếm & trang chủ suốt 30 ngày.',
    features: [
      'Ưu tiên VIP suốt 30 ngày cả giờ vàng',
      'Khung viền & huy hiệu VIP Toàn Diện',
      'Tối ưu tỷ lệ lấp đầy phòng nhanh nhất',
    ],
  },
];

export interface K23PlanCatalogItem {
  id: string;
  code: CanonicalK23PlanCode;
  legacyCodes: string[];
  name: string;
  description: string;
  priceMonthlyXu: number;
  priceYearlyXu: number; // Đóng 10 tặng 2
  maxRooms: number; // -1 = không giới hạn
  maxBuildings: number; // -1 = không giới hạn
  maxManagers: number;
  popular?: boolean;
  badge?: string;
  features: string[];
  displayOrder: number;
}

export const K23_TRIAL_DAYS = 30;
export const K23_TRIAL_PLAN_CODE: CanonicalK23PlanCode = 'standard';

export const K23_PLAN_CATALOG: K23PlanCatalogItem[] = [
  {
    id: 'plan_basic',
    code: 'basic',
    legacyCodes: ['basic'],
    name: 'Cơ Bản',
    description: 'Phù hợp cho chủ trọ quản lý 1 tòa nhà quy mô nhỏ với tối đa 10 phòng.',
    priceMonthlyXu: 49,
    priceYearlyXu: 490,
    maxRooms: 10,
    maxBuildings: 1,
    maxManagers: 1,
    displayOrder: 1,
    features: [
      'Quản lý tối đa 10 phòng',
      'Tối đa 1 tòa nhà cơ sở',
      'Chốt chỉ số điện nước hàng tháng',
      'Tính hóa đơn & tạo mã VietQR thu tiền',
      'Quản lý khách thuê & hợp đồng cơ bản',
    ],
  },
  {
    id: 'plan_standard',
    code: 'standard',
    legacyCodes: ['standard', 'pro'],
    name: 'Tiêu Chuẩn',
    description: 'Đầy đủ công cụ vận hành cho chủ trọ quản lý tới 35 phòng và 3 tòa nhà.',
    priceMonthlyXu: 129,
    priceYearlyXu: 1290,
    maxRooms: 35,
    maxBuildings: 3,
    maxManagers: 3,
    popular: true,
    badge: 'PHỔ BIẾN NHẤT',
    displayOrder: 2,
    features: [
      'Quản lý tối đa 35 phòng',
      'Tối đa 3 tòa nhà cơ sở',
      'Cảnh báo chỉ số điện nước bất thường',
      'Tự động gạch nợ hóa đơn qua Webhook VietQR',
      'Cổng Web Khách Thuê tra cứu hóa đơn',
      'Báo cáo doanh thu & công nợ hàng tháng',
    ],
  },
  {
    id: 'plan_chain',
    code: 'chain',
    legacyCodes: ['chain', 'enterprise'],
    name: 'Chuỗi',
    description: 'Dành cho hệ thống căn hộ dịch vụ, chung cư mini & chuỗi nhà trọ không giới hạn.',
    priceMonthlyXu: 299,
    priceYearlyXu: 2990,
    maxRooms: -1,
    maxBuildings: -1,
    maxManagers: 99,
    badge: 'KHÔNG GIỚI HẠN',
    displayOrder: 3,
    features: [
      'Không giới hạn số phòng',
      'Không giới hạn số tòa nhà',
      'Phân quyền quản lý vận hành nhiều cơ sở',
      'Đối soát hóa đơn & báo cáo tài chính chuyên sâu',
      'Hỗ trợ kỹ thuật ưu tiên 24/7',
    ],
  },
];

export interface CouponValidationResult {
  valid: boolean;
  code: string;
  discountPercent: number;
  message: string;
}

export function validateMonetizationCoupon(code?: string | null): CouponValidationResult {
  const cleaned = String(code || '').trim().toUpperCase();
  if (!cleaned) {
    return { valid: false, code: '', discountPercent: 0, message: '' };
  }
  if (cleaned === 'TROXINH50' || cleaned === 'TROXINH') {
    return { valid: true, code: cleaned, discountPercent: 50, message: 'Áp dụng mã giảm giá 50% thành công!' };
  }
  if (cleaned === 'CHUTROVIP') {
    return { valid: true, code: cleaned, discountPercent: 25, message: 'Áp dụng mã VIP Chủ Trọ 25% thành công!' };
  }
  if (cleaned === 'SINHVIEN' || cleaned === 'CHUTRO') {
    return { valid: true, code: cleaned, discountPercent: 20, message: 'Áp dụng mã ưu đãi 20% thành công!' };
  }
  if (cleaned === 'BANMOI') {
    return { valid: true, code: cleaned, discountPercent: 10, message: 'Áp dụng mã Bạn Mới 10% thành công!' };
  }
  return { valid: false, code: cleaned, discountPercent: 0, message: 'Mã giảm giá không hợp lệ hoặc đã hết hạn.' };
}

export function normalizeListingPlanId(planId?: string | null): ListingPlanId | null {
  if (!planId) return null;
  const raw = String(planId).trim().toLowerCase();
  if (raw === 'single_15d' || raw === 'single_30d' || raw === 'featured' || raw === 'pro') {
    return raw;
  }
  if (raw === 'basic') return 'featured'; // Tương thích đường dẫn cũ /thanh-toan/basic
  return null;
}

export function getListingPlanById(planId?: string | null): ListingPlanDefinition | undefined {
  const normalized = normalizeListingPlanId(planId);
  if (!normalized) return undefined;
  return LISTING_PLANS.find((p) => p.id === normalized);
}

export function calculateListingPlanAmountXu(
  planId: ListingPlanId,
  billingCycle: ListingBillingCycle = 'monthly',
  couponCode?: string | null
): {
  plan: ListingPlanDefinition;
  effectiveCycle: ListingBillingCycle;
  baseXu: number;
  discountPercent: number;
  discountXu: number;
  finalXu: number;
  amountVnd: number;
} {
  const plan = LISTING_PLANS.find((p) => p.id === planId);
  if (!plan) {
    throw new Error('Không tìm thấy gói đăng phòng hợp lệ.');
  }

  const effectiveCycle: ListingBillingCycle =
    plan.billingType === 'subscription' && billingCycle === 'yearly' ? 'yearly' : 'monthly';

  const baseXu =
    effectiveCycle === 'yearly' && plan.yearlyPriceXu ? plan.yearlyPriceXu : plan.priceXu;

  const coupon = validateMonetizationCoupon(couponCode);
  const discountPercent = coupon.valid ? coupon.discountPercent : 0;
  const finalXu =
    discountPercent > 0
      ? Math.max(1, Math.round((baseXu * (100 - discountPercent)) / 100))
      : baseXu;

  return {
    plan,
    effectiveCycle,
    baseXu,
    discountPercent,
    discountXu: Math.max(0, baseXu - finalXu),
    finalXu,
    amountVnd: finalXu * XU_TO_VND_RATE,
  };
}

export function getBoostPackageById(boostId?: string | null): BoostPackageDefinition | undefined {
  if (!boostId) return undefined;
  const normalized = String(boostId).trim().toLowerCase();
  return BOOST_PACKAGES.find((b) => b.id === normalized);
}

export function normalizeK23PlanCode(code?: string | null): CanonicalK23PlanCode {
  const raw = String(code || '').trim().toLowerCase();
  if (raw === 'basic') return 'basic';
  if (raw === 'chain' || raw === 'enterprise') return 'chain';
  return 'standard';
}

export function getK23PlanCatalogItem(code?: string | null): K23PlanCatalogItem {
  const normalized = normalizeK23PlanCode(code);
  return K23_PLAN_CATALOG.find((p) => p.code === normalized) || K23_PLAN_CATALOG[1];
}

export const getK23PlanByCode = getK23PlanCatalogItem;

export function applyDiscountToXu(baseXu: number, discountPercent: number): number {
  if (!discountPercent || discountPercent <= 0) return baseXu;
  return Math.max(1, Math.round((baseXu * (100 - discountPercent)) / 100));
}

export function calculateK23AmountXu(
  code?: string | null,
  billingCycle: 'monthly' | 'yearly' | 'quarterly' = 'monthly'
): {
  plan: K23PlanCatalogItem;
  effectiveCycle: 'monthly' | 'yearly';
  amountXu: number;
  amountVnd: number;
} {
  const plan = getK23PlanCatalogItem(code);
  const effectiveCycle: 'monthly' | 'yearly' = billingCycle === 'yearly' ? 'yearly' : 'monthly';
  const amountXu = effectiveCycle === 'yearly' ? plan.priceYearlyXu : plan.priceMonthlyXu;
  return {
    plan,
    effectiveCycle,
    amountXu,
    amountVnd: amountXu * XU_TO_VND_RATE,
  };
}

export function calculateRepostPriceXu(durationDays: 15 | 30 = 30): number {
  return durationDays === 15 ? 30 : 50;
}

export function formatXu(xu: number): string {
  return `${Math.max(0, Math.round(xu)).toLocaleString('vi-VN')} Xu`;
}

export function sanitizeReturnUrl(raw?: string | null, fallback = '/chu-tro'): string {
  if (!raw || typeof raw !== 'string') return fallback;
  const trimmed = raw.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.includes('javascript:')) {
    return fallback;
  }
  return trimmed;
}
