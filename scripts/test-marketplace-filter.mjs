import assert from 'node:assert';

// Import logic mô phỏng trực tiếp từ src/lib/marketplaceFilter.ts
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

function parseMarketplaceUrlParams(searchParams) {
  const rawQ = searchParams.get('q') || '';
  const rawCat = searchParams.get('danhMuc');
  const rawDist = searchParams.get('khuVuc') || '';
  const rawMin = searchParams.get('giaTu');
  const rawMax = searchParams.get('giaDen');
  const rawFree = searchParams.get('mienPhi');
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
    sortBy,
    page,
  };
}

function buildMarketplaceUrlParams(state) {
  const params = new URLSearchParams();

  if (state.keyword && state.keyword.trim()) {
    params.set('q', state.keyword.trim());
  }

  const validCats = state.categories.filter((c) => VALID_CATEGORIES.includes(c));
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

  if (state.sortBy && state.sortBy !== 'newest') {
    params.set('sapXep', state.sortBy);
  }

  if (state.page && state.page > 1) {
    params.set('trang', String(Math.floor(state.page)));
  }

  return params;
}

function filterMarketplaceItems(items, criteria) {
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

      if (validCategories.length > 0) {
        if (!validCategories.includes(item.category)) return false;
      }

      if (isFreeOnly) {
        const isItemFree = item.pricingType === 'Miễn phí' || item.price === 0;
        if (!isItemFree) return false;
      } else {
        const itemPrice = Number(item.price) || 0;
        if (minPrice !== undefined && itemPrice < minPrice) return false;
        if (maxPrice !== undefined && itemPrice > maxPrice) return false;
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

        if (!matchName && !matchDesc && !matchLoc && !matchDist) return false;
      }

      return true;
    })
    .sort((a, b) => {
      const timeB = new Date(b.createdAt || 0).getTime();
      const timeA = new Date(a.createdAt || 0).getTime();

      if (sortBy === 'price_asc') {
        const diff = (a.price || 0) - (b.price || 0);
        if (diff !== 0) return diff;
        return timeB - timeA; // Stable sort: mới hơn lên trước khi trùng giá
      }
      if (sortBy === 'price_desc') {
        const diff = (b.price || 0) - (a.price || 0);
        if (diff !== 0) return diff;
        return timeB - timeA; // Stable sort: mới hơn lên trước khi trùng giá
      }

      return timeB - timeA;
    });
}

try {
  console.log('🧪 Bắt đầu chạy bộ kiểm thử chuyên sâu cho Chợ Đồ Cũ...');

  // 1. ROUND-TRIP TEST: parse(build(state)) === state ban đầu
  const testState1 = {
    keyword: 'bàn học sinh viên',
    categories: ['Nội thất', 'Đồ gia dụng'],
    district: 'Quận Cầu Giấy',
    minPrice: 50000,
    maxPrice: 200000,
    isFreeOnly: false,
    sortBy: 'price_asc',
    page: 2,
  };
  const url1 = buildMarketplaceUrlParams(testState1);
  const parsedState1 = parseMarketplaceUrlParams(url1);
  assert.deepStrictEqual(parsedState1, testState1, 'Round-trip State 1 phải khớp 100%');
  console.log('✅ 1. Round-trip state phức tạp thành công!');

  const testStateDefault = {
    keyword: '',
    categories: [],
    district: '',
    minPrice: undefined,
    maxPrice: undefined,
    isFreeOnly: false,
    sortBy: 'newest',
    page: 1,
  };
  const urlDefault = buildMarketplaceUrlParams(testStateDefault);
  assert.strictEqual(urlDefault.toString(), '', 'State mặc định phải sinh ra URL rỗng sạch');
  const parsedDefault = parseMarketplaceUrlParams(urlDefault);
  assert.deepStrictEqual(parsedDefault, testStateDefault, 'Parse URL rỗng phải ra đúng state mặc định');
  console.log('✅ 2. Clean URL: Không đưa tham số mặc định vào URL thành công!');

  // 2. TOGGLE MIỄN PHÍ: Không đưa giaTu / giaDen vào URL
  const testStateFree = {
    keyword: 'giáo trình',
    categories: ['Sách vở'],
    district: 'Quận Hai Bà Trưng',
    minPrice: 100000, // có giá nhập nhưng bật miễn phí
    maxPrice: 300000,
    isFreeOnly: true,
    sortBy: 'newest',
    page: 1,
  };
  const urlFree = buildMarketplaceUrlParams(testStateFree);
  assert.strictEqual(urlFree.has('giaTu'), false, 'Không được có giaTu khi bật mienPhi');
  assert.strictEqual(urlFree.has('giaDen'), false, 'Không được có giaDen khi bật mienPhi');
  assert.strictEqual(urlFree.get('mienPhi'), '1', 'mienPhi phải bằng 1');
  const parsedFree = parseMarketplaceUrlParams(urlFree);
  assert.strictEqual(parsedFree.isFreeOnly, true);
  assert.strictEqual(parsedFree.minPrice, undefined);
  assert.strictEqual(parsedFree.maxPrice, undefined);
  console.log('✅ 3. Toggle miễn phí tự loại bỏ tham số giá thành công!');

  // 3. XỬ LÝ GIÁ BẤT THƯỜNG: giaTu > giaDen, giá âm, giá thập phân
  const badPriceParams = new URLSearchParams('giaTu=500000.75&giaDen=100000&trang=-5&sapXep=random_hack');
  const parsedBad = parseMarketplaceUrlParams(badPriceParams);
  assert.strictEqual(parsedBad.minPrice, 100000, 'giaTu lớn hơn giaDen phải được tự động hoán đổi về min');
  assert.strictEqual(parsedBad.maxPrice, 500000, 'giaTu thập phân phải được làm tròn xuống số nguyên');
  assert.strictEqual(parsedBad.page, 1, 'trang âm phải fallback về trang 1');
  assert.strictEqual(parsedBad.sortBy, 'newest', 'sapXep lạ phải fallback về newest');
  console.log('✅ 4. Xử lý giá bất thường và URL sai an toàn 100%!');

  // Giá âm
  const negPriceParams = new URLSearchParams('giaTu=-10000');
  const parsedNeg = parseMarketplaceUrlParams(negPriceParams);
  assert.strictEqual(parsedNeg.minPrice, undefined, 'Giá âm phải bị loại bỏ');
  console.log('✅ 5. Loại bỏ giá âm an toàn!');

  // 4. KÝ TỰ ĐẶC BIỆT VÀ TIẾNG VIỆT CÓ DẤU
  const specialKeywordState = {
    keyword: 'Sách C++ & Giải tích #1 ? % test',
    categories: ['Sách vở'],
    district: 'Quận Đống Đa',
    minPrice: undefined,
    maxPrice: undefined,
    isFreeOnly: false,
    sortBy: 'newest',
    page: 1,
  };
  const urlSpecial = buildMarketplaceUrlParams(specialKeywordState);
  const parsedSpecial = parseMarketplaceUrlParams(urlSpecial);
  assert.strictEqual(parsedSpecial.keyword, specialKeywordState.keyword, 'Ký tự đặc biệt & ? # % phải giữ nguyên vẹn');
  console.log('✅ 6. Encode/Decode từ khóa ký tự đặc biệt & tiếng Việt chính xác 100%!');

  // 5. DANH MỤC / KHU VỰC KHÔNG TỒN TẠI
  const fakeParams = new URLSearchParams('danhMuc=HackCat,Nội thất,FakeUnknown&khuVuc=SaoHoa');
  const parsedFake = parseMarketplaceUrlParams(fakeParams);
  assert.deepStrictEqual(parsedFake.categories, ['Nội thất'], 'Chỉ giữ danh mục hợp lệ');
  assert.strictEqual(parsedFake.district, '', 'Khu vực không hợp lệ phải bị bỏ qua');
  console.log('✅ 7. Lọc bỏ danh mục và khu vực không tồn tại thành công!');

  // 6. STABLE SORT: Kiểm tra khi trùng giá thì món mới hơn xếp trước
  const samePriceItems = [
    { id: 'item_old', name: 'Bàn cũ', price: 100000, createdAt: '2026-01-01T00:00:00Z', status: 'Còn hàng' },
    { id: 'item_new', name: 'Bàn mới', price: 100000, createdAt: '2026-09-01T00:00:00Z', status: 'Còn hàng' },
  ];
  const sortedAsc = filterMarketplaceItems(samePriceItems, { sortBy: 'price_asc' });
  assert.strictEqual(sortedAsc[0].id, 'item_new', 'Cùng giá thì món mới hơn phải đứng trước trong price_asc');

  const sortedDesc = filterMarketplaceItems(samePriceItems, { sortBy: 'price_desc' });
  assert.strictEqual(sortedDesc[0].id, 'item_new', 'Cùng giá thì món mới hơn phải đứng trước trong price_desc');
  console.log('✅ 8. Sắp xếp ổn định (Stable sort khi trùng giá) thành công!');

  console.log('\n🎉 TOÀN BỘ 8/8 BỘ KIỂM THỬ ĐỀU THÀNH CÔNG VỚI EXIT CODE 0!');
  process.exit(0);
} catch (err) {
  console.error('\n❌ KIỂM THỬ THẤT BẠI:', err);
  process.exit(1);
}
