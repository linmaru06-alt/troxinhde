import assert from 'node:assert';

// 1. Định nghĩa hằng số và danh sách hợp lệ
const VALID_CATEGORIES = ['Nội thất', 'Đồ điện tử', 'Sách vở', 'Đồ gia dụng'];
const VALID_DISTRICTS = [
  'Quận Cầu Giấy',
  'Quận Đống Đa',
  'Quận Hai Bà Trưng',
  'Quận Thanh Xuân',
  'Quận Nam Từ Liêm',
  'Quận Hà Đông',
  'Quận Ba Đình',
  'Quận Bắc Từ Liêm',
  'Quận Hoàng Mai',
];

const VALID_CONDITIONS = ['nhu_moi', 'con_tot', 'da_cu'];
const VALID_DELIVERY_METHODS = ['tai_truong', 'giao_tan_noi', 'tu_den_lay'];

const CONDITION_LABELS = {
  nhu_moi: 'Như mới',
  con_tot: 'Còn tốt',
  da_cu: 'Đã cũ',
};

const DELIVERY_METHOD_LABELS = {
  tai_truong: 'Gặp tại trường/KTX',
  giao_tan_noi: 'Giao tận nơi',
  tu_den_lay: 'Tự đến lấy',
};

const VALID_TIME_RANGES = ['all', '24h', '7d'];

function removeVietnameseTones(str) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

function sanitizePrice(val) {
  if (val === null || val === undefined || val === '') return undefined;
  const num = Number(val);
  if (isNaN(num) || num < 0) return undefined;
  return Math.floor(num);
}

function normalizeCondition(cond) {
  if (!cond) return undefined;
  const raw = removeVietnameseTones(cond).toLowerCase().trim();

  // 1. "tặng miễn phí" / "miễn phí" trả về undefined (miễn phí là giá, không phải tình trạng)
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

function validatePriceRange(min, max) {
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

function countAdvancedFilters(criteria) {
  let count = 0;
  if (!criteria.isFreeOnly && (criteria.minPrice !== undefined || criteria.maxPrice !== undefined)) {
    count += 1;
  }
  if (criteria.conditions && criteria.conditions.length > 0) {
    count += 1;
  }
  if (criteria.deliveryMethods && criteria.deliveryMethods.length > 0) {
    count += 1;
  }
  if (criteria.timeRange && criteria.timeRange !== 'all') {
    count += 1;
  }
  if (criteria.isNegotiableOnly) {
    count += 1;
  }
  if (criteria.hasImagesOnly) {
    count += 1;
  }
  return count;
}

function parseMarketplaceUrlParams(searchParams) {
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

  const keyword = rawQ.trim();

  let categories = [];
  if (rawCat) {
    const splitCats = rawCat.split(',').map((c) => c.trim()).filter(Boolean);
    categories = splitCats.filter((c) => VALID_CATEGORIES.includes(c));
  }

  let district = '';
  if (rawDist && VALID_DISTRICTS.includes(rawDist.trim())) {
    district = rawDist.trim();
  }

  const isFreeOnly = rawFree === '1' || rawFree === 'true';

  let minPrice = isFreeOnly ? undefined : sanitizePrice(rawMin);
  let maxPrice = isFreeOnly ? undefined : sanitizePrice(rawMax);

  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    const temp = minPrice;
    minPrice = maxPrice;
    maxPrice = temp;
  }

  let conditions = [];
  if (rawCond) {
    const splitConds = rawCond.split(',').map((c) => c.trim()).filter(Boolean);
    for (const c of splitConds) {
      const normalized = normalizeCondition(c);
      if (normalized && !conditions.includes(normalized)) {
        conditions.push(normalized);
      }
    }
  }

  let deliveryMethods = [];
  if (rawDeliv) {
    const splitDelivs = rawDeliv.split(',').map((d) => d.trim().toLowerCase()).filter(Boolean);
    for (const d of splitDelivs) {
      if (VALID_DELIVERY_METHODS.includes(d) && !deliveryMethods.includes(d)) {
        deliveryMethods.push(d);
      }
    }
  }

  let timeRange = 'all';
  if (rawTime === '24h' || rawTime === '7d') {
    timeRange = rawTime;
  }

  const isNegotiableOnly = rawNego === '1' || rawNego === 'true';
  const hasImagesOnly = rawImg === '1' || rawImg === 'true';

  let sortBy = 'newest';
  if (rawSort === 'price_asc' || rawSort === 'price_desc') {
    sortBy = rawSort;
  }

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

function buildMarketplaceUrlParams(state) {
  const params = new URLSearchParams();

  if (state.keyword && state.keyword.trim()) {
    params.set('q', state.keyword.trim());
  }

  const validCats = (state.categories || []).filter((c) => VALID_CATEGORIES.includes(c));
  if (validCats.length > 0) {
    params.set('danhMuc', validCats.join(','));
  }

  if (state.district && VALID_DISTRICTS.includes(state.district)) {
    params.set('khuVuc', state.district);
  }

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

  if (state.conditions && state.conditions.length > 0) {
    const validCodes = state.conditions.filter((c) => VALID_CONDITIONS.includes(c));
    if (validCodes.length > 0) {
      params.set('tinhTrang', validCodes.join(','));
    }
  }

  if (state.deliveryMethods && state.deliveryMethods.length > 0) {
    const validDelivs = state.deliveryMethods.filter((d) => VALID_DELIVERY_METHODS.includes(d));
    if (validDelivs.length > 0) {
      params.set('nhanDo', validDelivs.join(','));
    }
  }

  if (state.timeRange && state.timeRange !== 'all') {
    params.set('thoiGian', state.timeRange);
  }

  if (state.isNegotiableOnly) {
    params.set('traGia', '1');
  }

  if (state.hasImagesOnly) {
    params.set('coAnh', '1');
  }

  if (state.sortBy && state.sortBy !== 'newest') {
    params.set('sapXep', state.sortBy);
  }

  if (state.page && state.page > 1) {
    params.set('trang', String(Math.floor(state.page)));
  }

  return params;
}

function filterMarketplaceItems(items, criteria, nowTime = Date.now()) {
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
  } = criteria;

  const priceValidation = validatePriceRange(minPrice, maxPrice);
  const hasPriceError = !priceValidation.isValid;
  const normKeyword = removeVietnameseTones(keyword);
  const normSelectedDistrict = district && district !== 'Tất cả khu vực'
    ? removeVietnameseTones(district).replace(/quan\s*/g, '').trim()
    : '';

  const validCategories = categories.filter((c) => c && c !== 'Tất cả');

  return items
    .filter((item) => {
      if (viewMode === 'public') {
        const isPending = item.status === 'Chờ duyệt' || item.moderationStatus === 'pending';
        const isRejected = item.status === 'Bị từ chối' || item.moderationStatus === 'rejected';
        if (isPending || isRejected) return false;
      } else if (viewMode === 'my_items') {
        if (!currentUserId || item.userId !== currentUserId) return false;
      }

      if (validCategories.length > 0 && !validCategories.includes(item.category)) {
        return false;
      }

      if (isFreeOnly) {
        const isItemFree = item.pricingType === 'Miễn phí' || item.price === 0;
        if (!isItemFree) return false;
      } else {
        if (hasPriceError) return false;
        const itemPrice = Number(item.price) || 0;
        if (minPrice !== undefined && itemPrice < minPrice) return false;
        if (maxPrice !== undefined && itemPrice > maxPrice) return false;
      }

      if (conditions.length > 0) {
        const normalizedItemCond = normalizeCondition(item.condition);
        if (!normalizedItemCond || !conditions.includes(normalizedItemCond)) {
          return false;
        }
      }

      // Tin cũ thiếu deliveryMethods -> không khớp bộ lọc cách nhận đồ
      if (deliveryMethods.length > 0) {
        const itemMethods = item.deliveryMethods;
        if (!itemMethods || itemMethods.length === 0) {
          return false;
        }
        const hasMatch = deliveryMethods.some((m) => itemMethods.includes(m));
        if (!hasMatch) return false;
      }

      // Thời gian đăng (so với nowTime)
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

      // Có thể trả giá (tin cũ thiếu mặc định false)
      if (isNegotiableOnly) {
        if (item.isNegotiable !== true) {
          return false;
        }
      }

      // Chỉ tin có ảnh
      if (hasImagesOnly) {
        const hasValidImg =
          Array.isArray(item.images) &&
          item.images.length > 0 &&
          item.images.some((img) => img && !img.includes('placeholder'));
        if (!hasValidImg) return false;
      }

      if (normSelectedDistrict) {
        const normItemDistrict = removeVietnameseTones(item.district || '').replace(/quan\s*/g, '').trim();
        const normItemLocation = removeVietnameseTones(item.location || '').replace(/quan\s*/g, '').trim();
        if (!normItemDistrict.includes(normSelectedDistrict) && !normItemLocation.includes(normSelectedDistrict)) {
          return false;
        }
      }

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

      return timeB - timeA;
    });
}

// -------------------------------------------------------------
// FIXTURES ĐỘC LẬP (Không phụ thuộc mockData.ts)
// -------------------------------------------------------------
const FIXED_NOW = 1700000000000; // Thời điểm cố định để test thời gian
const ONE_HOUR = 3600 * 1000;
const ONE_DAY = 24 * ONE_HOUR;

const TEST_FIXTURES = [
  {
    id: 'fix-1',
    name: 'Bàn học gấp gọn sinh viên',
    category: 'Nội thất',
    price: 120000,
    pricingType: 'Giá rẻ',
    condition: 'nhu_moi',
    deliveryMethods: ['tai_truong', 'tu_den_lay'],
    isNegotiable: true,
    images: ['https://images.unsplash.com/photo-1.jpg'],
    district: 'Quận Cầu Giấy',
    location: '144 Xuân Thủy, Cầu Giấy',
    description: 'Bàn học chân sắt chắc chắn',
    createdAt: new Date(FIXED_NOW - 2 * ONE_HOUR).toISOString(), // 2h trước -> thuộc cả 24h và 7d
    status: 'Còn hàng',
  },
  {
    id: 'fix-2',
    name: 'Ấm đun nước siêu tốc Sunhouse',
    category: 'Đồ gia dụng',
    price: 80000,
    pricingType: 'Giá rẻ',
    condition: 'con_tot',
    deliveryMethods: ['giao_tan_noi'],
    isNegotiable: false,
    images: ['https://images.unsplash.com/photo-2.jpg'],
    district: 'Quận Đống Đa',
    location: 'Chùa Bộc, Đống Đa',
    description: 'Ấm đun nhanh, tự ngắt',
    createdAt: new Date(FIXED_NOW - 3 * ONE_DAY).toISOString(), // 3 ngày trước -> không thuộc 24h, thuộc 7d
    status: 'Còn hàng',
  },
  {
    id: 'fix-3',
    name: 'Giáo trình Giải tích 1',
    category: 'Sách vở',
    price: 0,
    pricingType: 'Miễn phí',
    condition: 'da_cu',
    deliveryMethods: ['tai_truong'],
    isNegotiable: false,
    images: [], // Không có ảnh
    district: 'Quận Hai Bà Trưng',
    location: 'Đại học Bách Khoa, Hai Bà Trưng',
    description: 'Tặng lại cho khóa dưới',
    createdAt: new Date(FIXED_NOW - 10 * ONE_DAY).toISOString(), // 10 ngày trước -> ngoài cả 24h và 7d
    status: 'Còn hàng',
  },
  {
    id: 'fix-4-legacy',
    // Tin đăng cũ: thiếu deliveryMethods, thiếu isNegotiable, condition chuỗi cũ
    name: 'Tai nghe chụp tai Sony cũ',
    category: 'Đồ điện tử',
    price: 350000,
    pricingType: 'Giá rẻ',
    condition: 'Mới 99%', // Tin cũ chưa chuẩn hóa
    images: ['https://images.unsplash.com/photo-4.jpg'],
    district: 'Quận Thanh Xuân',
    location: 'Nguyễn Trãi, Thanh Xuân',
    description: 'Nghe tốt, bass ấm',
    createdAt: new Date(FIXED_NOW - 12 * ONE_HOUR).toISOString(), // 12h trước -> thuộc 24h
    status: 'Còn hàng',
  },
  {
    id: 'fix-5-pending',
    // Tin chờ duyệt -> public không xem được
    name: 'Quạt đứng Senko',
    category: 'Đồ gia dụng',
    price: 150000,
    pricingType: 'Giá rẻ',
    condition: 'con_tot',
    deliveryMethods: ['tu_den_lay'],
    images: ['https://images.unsplash.com/photo-5.jpg'],
    district: 'Quận Cầu Giấy',
    description: 'Quạt chạy êm',
    createdAt: new Date(FIXED_NOW - 1 * ONE_HOUR).toISOString(),
    status: 'Chờ duyệt',
    moderationStatus: 'pending',
  },
];

// -------------------------------------------------------------
// CHẠY TEST SUITE
// -------------------------------------------------------------
let totalPassed = 0;
let totalFailed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  PASS: ${name}`);
    totalPassed++;
  } catch (err) {
    console.error(`  FAIL: ${name}`);
    console.error(`    ${err.message}`);
    totalFailed++;
  }
}

console.log('--- KIỂM THỬ TỰ ĐỘNG BỘ LỌC CHỢ ĐỒ CŨ ---');

// Nhóm 1: Test normalizeCondition
console.log('\n[1. Unit test normalizeCondition]');

runTest('"tặng miễn phí" và "miễn phí" trả về undefined (miễn phí là giá, không phải tình trạng)', () => {
  assert.strictEqual(normalizeCondition('tặng miễn phí'), undefined);
  assert.strictEqual(normalizeCondition('tang mien phi'), undefined);
  assert.strictEqual(normalizeCondition('miễn phí'), undefined);
  assert.strictEqual(normalizeCondition('mien phi'), undefined);
  assert.strictEqual(normalizeCondition('0đ'), undefined);
  assert.strictEqual(normalizeCondition('0 dong'), undefined);
  assert.strictEqual(normalizeCondition(''), undefined);
  assert.strictEqual(normalizeCondition(undefined), undefined);
});

runTest('Nhận diện mã code chuẩn', () => {
  assert.strictEqual(normalizeCondition('nhu_moi'), 'nhu_moi');
  assert.strictEqual(normalizeCondition('con_tot'), 'con_tot');
  assert.strictEqual(normalizeCondition('da_cu'), 'da_cu');
});

runTest('Nhận diện phần trăm: >=95% -> nhu_moi, 70-94% -> con_tot, <70% -> da_cu', () => {
  // >= 95% -> nhu_moi
  assert.strictEqual(normalizeCondition('99%'), 'nhu_moi');
  assert.strictEqual(normalizeCondition('Mới 99%'), 'nhu_moi');
  assert.strictEqual(normalizeCondition('moi 95%'), 'nhu_moi');
  assert.strictEqual(normalizeCondition('95%'), 'nhu_moi');

  // 70-94% -> con_tot
  assert.strictEqual(normalizeCondition('94%'), 'con_tot');
  assert.strictEqual(normalizeCondition('Còn 90%'), 'con_tot');
  assert.strictEqual(normalizeCondition('85%'), 'con_tot');
  assert.strictEqual(normalizeCondition('70%'), 'con_tot');

  // <70% -> da_cu
  assert.strictEqual(normalizeCondition('69%'), 'da_cu');
  assert.strictEqual(normalizeCondition('Khoảng 50%'), 'da_cu');
  assert.strictEqual(normalizeCondition('30%'), 'da_cu');
});

runTest('Nhận diện theo từ khóa tiếng Việt không dấu và có dấu', () => {
  assert.strictEqual(normalizeCondition('Như mới'), 'nhu_moi');
  assert.strictEqual(normalizeCondition('nhu moi'), 'nhu_moi');
  assert.strictEqual(normalizeCondition('Mới tinh'), 'nhu_moi');
  assert.strictEqual(normalizeCondition('mới'), 'nhu_moi');

  assert.strictEqual(normalizeCondition('Còn dùng tốt'), 'con_tot');
  assert.strictEqual(normalizeCondition('còn tốt'), 'con_tot');
  assert.strictEqual(normalizeCondition('dung tot'), 'con_tot');

  assert.strictEqual(normalizeCondition('Đã qua sử dụng'), 'da_cu');
  assert.strictEqual(normalizeCondition('đã cũ'), 'da_cu');
  assert.strictEqual(normalizeCondition('da cu'), 'da_cu');
});

// Nhóm 2: Test Round-trip URL params
console.log('\n[2. Round-trip build & parse URL Params]');

runTest('Round-trip cho state đầy đủ các trường mới', () => {
  const originalState = {
    keyword: 'laptop gaming',
    categories: ['Đồ điện tử'],
    district: 'Quận Cầu Giấy',
    minPrice: 5000000,
    maxPrice: 15000000,
    isFreeOnly: false,
    conditions: ['nhu_moi', 'con_tot'],
    deliveryMethods: ['tai_truong', 'tu_den_lay'],
    timeRange: '24h',
    isNegotiableOnly: true,
    hasImagesOnly: true,
    sortBy: 'price_asc',
    page: 2,
  };

  const urlParams = buildMarketplaceUrlParams(originalState);
  const parsedState = parseMarketplaceUrlParams(urlParams);

  assert.deepStrictEqual(parsedState, originalState);
});

runTest('Bật mienPhi thì build không đưa giaTu/giaDen vào URL', () => {
  const state = {
    keyword: '',
    categories: [],
    district: '',
    minPrice: 100000,
    maxPrice: 500000,
    isFreeOnly: true,
    conditions: [],
    deliveryMethods: [],
    timeRange: 'all',
    isNegotiableOnly: false,
    hasImagesOnly: false,
    sortBy: 'newest',
    page: 1,
  };

  const params = buildMarketplaceUrlParams(state);
  assert.strictEqual(params.get('mienPhi'), '1');
  assert.strictEqual(params.get('giaTu'), null);
  assert.strictEqual(params.get('giaDen'), null);

  const parsed = parseMarketplaceUrlParams(params);
  assert.strictEqual(parsed.isFreeOnly, true);
  assert.strictEqual(parsed.minPrice, undefined);
  assert.strictEqual(parsed.maxPrice, undefined);
});

runTest('giaTu > giaDen trên URL được hoán đổi an toàn', () => {
  const params = new URLSearchParams('giaTu=500000&giaDen=200000');
  const parsed = parseMarketplaceUrlParams(params);
  assert.strictEqual(parsed.minPrice, 200000);
  assert.strictEqual(parsed.maxPrice, 500000);
});

runTest('Từ khóa tiếng Việt và ký tự đặc biệt encode/decode chính xác', () => {
  const state = {
    keyword: 'bàn & ghế #1 (mới?)',
    categories: ['Nội thất'],
    district: '',
    isFreeOnly: false,
    conditions: [],
    deliveryMethods: [],
    timeRange: 'all',
    isNegotiableOnly: false,
    hasImagesOnly: false,
    sortBy: 'newest',
    page: 1,
  };

  const params = buildMarketplaceUrlParams(state);
  const searchStr = params.toString();
  const parsedParams = new URLSearchParams(searchStr);
  const parsed = parseMarketplaceUrlParams(parsedParams);

  assert.strictEqual(parsed.keyword, 'bàn & ghế #1 (mới?)');
});

runTest('danhMuc và khuVuc không hợp lệ bị loại bỏ', () => {
  const params = new URLSearchParams('danhMuc=VũKhí,Đồ điện tử,BấtĐộngSản&khuVuc=SaoHỏa');
  const parsed = parseMarketplaceUrlParams(params);
  assert.deepStrictEqual(parsed.categories, ['Đồ điện tử']);
  assert.strictEqual(parsed.district, '');
});

// Nhóm 3: Test đếm nhóm bộ lọc con (countAdvancedFilters)
console.log('\n[3. Đếm nhóm bộ lọc con - countAdvancedFilters]');

runTest('Đếm chính xác 6 nhóm tiêu chí con độc lập', () => {
  assert.strictEqual(countAdvancedFilters({}), 0);

  // 1. Khoảng giá
  assert.strictEqual(countAdvancedFilters({ minPrice: 50000 }), 1);
  // Khoảng giá không tính khi bật miễn phí
  assert.strictEqual(countAdvancedFilters({ minPrice: 50000, isFreeOnly: true }), 0);

  // 2. Tình trạng
  assert.strictEqual(countAdvancedFilters({ conditions: ['nhu_moi'] }), 1);

  // 3. Cách nhận đồ
  assert.strictEqual(countAdvancedFilters({ deliveryMethods: ['tai_truong'] }), 1);

  // 4. Thời gian đăng
  assert.strictEqual(countAdvancedFilters({ timeRange: '24h' }), 1);
  assert.strictEqual(countAdvancedFilters({ timeRange: 'all' }), 0);

  // 5. Có thể trả giá
  assert.strictEqual(countAdvancedFilters({ isNegotiableOnly: true }), 1);

  // 6. Có ảnh
  assert.strictEqual(countAdvancedFilters({ hasImagesOnly: true }), 1);

  // Cả 6 nhóm
  assert.strictEqual(
    countAdvancedFilters({
      minPrice: 10000,
      conditions: ['con_tot'],
      deliveryMethods: ['giao_tan_noi'],
      timeRange: '7d',
      isNegotiableOnly: true,
      hasImagesOnly: true,
    }),
    6
  );
});

// Nhóm 4: Test hàm lọc filterMarketplaceItems với FIXTURES
console.log('\n[4. Test lọc dữ liệu với FIXTURES và nowTime cố định]');

runTest('Lọc đồ miễn phí (isFreeOnly: true)', () => {
  const result = filterMarketplaceItems(TEST_FIXTURES, { isFreeOnly: true });
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].id, 'fix-3');
});

runTest('Tin cũ thiếu deliveryMethods: không khớp khi lọc theo deliveryMethods', () => {
  // Lọc theo 'tai_truong'
  const result = filterMarketplaceItems(TEST_FIXTURES, { deliveryMethods: ['tai_truong'] });
  const ids = result.map((r) => r.id);
  assert.ok(ids.includes('fix-1'));
  assert.ok(ids.includes('fix-3'));
  // fix-4-legacy thiếu deliveryMethods -> không được xuất hiện
  assert.ok(!ids.includes('fix-4-legacy'));
});

runTest('Tin cũ thiếu isNegotiable: mặc định false khi lọc isNegotiableOnly', () => {
  const result = filterMarketplaceItems(TEST_FIXTURES, { isNegotiableOnly: true });
  assert.strictEqual(result.length, 1);
  assert.strictEqual(result[0].id, 'fix-1');
  // fix-4-legacy không có isNegotiable -> không được xuất hiện
  const ids = result.map((r) => r.id);
  assert.ok(!ids.includes('fix-4-legacy'));
});

runTest('Tin cũ với condition chuỗi cũ "Mới 99%" được chuẩn hóa và lọc khớp nhu_moi', () => {
  const result = filterMarketplaceItems(TEST_FIXTURES, { conditions: ['nhu_moi'] });
  const ids = result.map((r) => r.id);
  assert.ok(ids.includes('fix-1'));
  assert.ok(ids.includes('fix-4-legacy')); // Mới 99% -> nhu_moi
});

runTest('Lọc thời gian đăng với nowTime cố định (24h vs 7d)', () => {
  // 24h: fix-1 (2h trước), fix-4-legacy (12h trước)
  const res24h = filterMarketplaceItems(TEST_FIXTURES, { timeRange: '24h' }, FIXED_NOW);
  const ids24h = res24h.map((r) => r.id);
  assert.ok(ids24h.includes('fix-1'));
  assert.ok(ids24h.includes('fix-4-legacy'));
  assert.ok(!ids24h.includes('fix-2')); // 3 ngày trước
  assert.ok(!ids24h.includes('fix-3')); // 10 ngày trước

  // 7d: fix-1, fix-4-legacy, fix-2
  const res7d = filterMarketplaceItems(TEST_FIXTURES, { timeRange: '7d' }, FIXED_NOW);
  const ids7d = res7d.map((r) => r.id);
  assert.ok(ids7d.includes('fix-1'));
  assert.ok(ids7d.includes('fix-4-legacy'));
  assert.ok(ids7d.includes('fix-2'));
  assert.ok(!ids7d.includes('fix-3')); // 10 ngày trước -> ngoài 7d
});

runTest('Lọc chỉ tin có ảnh (hasImagesOnly: true)', () => {
  const result = filterMarketplaceItems(TEST_FIXTURES, { hasImagesOnly: true });
  const ids = result.map((r) => r.id);
  assert.ok(ids.includes('fix-1'));
  assert.ok(ids.includes('fix-2'));
  assert.ok(ids.includes('fix-4-legacy'));
  assert.ok(!ids.includes('fix-3')); // fix-3 có images: []
});

runTest('Trạng thái chờ duyệt không hiển thị ở public mode', () => {
  const result = filterMarketplaceItems(TEST_FIXTURES, { viewMode: 'public' });
  const ids = result.map((r) => r.id);
  assert.ok(!ids.includes('fix-5-pending'));
});

// -------------------------------------------------------------
// TỔNG KẾT
// -------------------------------------------------------------
console.log(`\n========================================`);
console.log(`KẾT QUẢ: ${totalPassed} Passed, ${totalFailed} Failed`);
console.log(`========================================`);

if (totalFailed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
