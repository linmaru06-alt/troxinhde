import assert from 'node:assert';

// Import trực tiếp logic lọc
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

function validatePriceRange(min, max) {
  if (min !== undefined && min < 0) return { isValid: false, error: 'Giá tối thiểu không được âm' };
  if (max !== undefined && max < 0) return { isValid: false, error: 'Giá tối đa không được âm' };
  if (min !== undefined && max !== undefined && min > max) {
    return { isValid: false, error: 'Giá tối thiểu không được lớn hơn giá tối đa' };
  }
  return { isValid: true };
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

      if (validCategories.length > 0) {
        if (!validCategories.includes(item.category)) return false;
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
      if (sortBy === 'price_asc') return (a.price || 0) - (b.price || 0);
      if (sortBy === 'price_desc') return (b.price || 0) - (a.price || 0);
      if (sortBy === 'free_first') {
        const aFree = a.pricingType === 'Miễn phí' || a.price === 0;
        const bFree = b.pricingType === 'Miễn phí' || b.price === 0;
        if (aFree && !bFree) return -1;
        if (!aFree && bFree) return 1;
      }
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
}

console.log('🧪 Bắt đầu kiểm thử độc lập bộ lọc Chợ Đồ Cũ (Marketplace Filter)...');

const mockItems = [
  {
    id: '1',
    name: 'Tủ lạnh mini Aqua 90L',
    category: 'Đồ điện tử',
    price: 650000,
    pricingType: 'Giá rẻ',
    district: 'Quận Cầu Giấy',
    location: 'Ngõ 165 Cầu Giấy',
    description: 'Tủ lạnh còn làm lạnh rất tốt, tiết kiệm điện cho sinh viên',
    status: 'Còn hàng',
    createdAt: '2026-09-20T10:00:00Z',
    userId: 'u_1',
  },
  {
    id: '2',
    name: 'Bàn học gấp gọn sinh viên',
    category: 'Nội thất',
    price: 45000,
    pricingType: 'Giá rẻ',
    district: 'Quận Đống Đa',
    location: 'Chùa Láng',
    description: 'Bàn chân sắt gấp gọn tiện dụng',
    status: 'Còn hàng',
    createdAt: '2026-09-21T08:00:00Z',
    userId: 'u_2',
  },
  {
    id: '3',
    name: 'Giáo trình Giải tích 1 + Đại số',
    category: 'Sách vở',
    price: 0,
    pricingType: 'Miễn phí',
    district: 'Quận Hai Bà Trưng',
    location: 'Đại Cồ Việt, Bách Khoa',
    description: 'Tặng lại các bạn K68',
    status: 'Còn hàng',
    createdAt: '2026-09-21T09:00:00Z',
    userId: 'u_1',
  },
  {
    id: '4',
    name: 'Nồi cơm điện Sunhouse 1.2L',
    category: 'Đồ gia dụng',
    price: 150000,
    pricingType: 'Giá rẻ',
    district: 'Quận Cầu Giấy',
    location: 'Xuân Thủy',
    description: 'Nấu cơm nhanh, chống dính tốt',
    status: 'Chờ duyệt',
    moderationStatus: 'pending',
    createdAt: '2026-09-21T11:00:00Z',
    userId: 'u_1',
  },
  {
    id: '5',
    name: 'Ghế xoay văn phòng có tựa lưng',
    category: 'Nội thất',
    price: 250000,
    pricingType: 'Giá rẻ',
    district: 'Quận Cầu Giấy',
    location: 'Duy Tân',
    description: 'Ghế ngồi êm, điều chỉnh được độ cao',
    status: 'Còn hàng',
    createdAt: '2026-09-19T10:00:00Z',
    userId: 'u_3',
  },
];

// Test 1: Tìm kiếm không phân biệt dấu và hoa thường ("tu lanh" tìm thấy "Tủ lạnh mini")
const res1 = filterMarketplaceItems(mockItems, { keyword: 'tu lanh' });
assert.strictEqual(res1.length, 1);
assert.strictEqual(res1[0].id, '1');
console.log('✅ Test 1: Tìm kiếm không dấu tiếng Việt ("tu lanh") thành công.');

// Test 2: Tìm kiếm "ban hoc" tìm thấy Bàn học gấp gọn
const res2 = filterMarketplaceItems(mockItems, { keyword: 'ban hoc' });
assert.strictEqual(res2.length, 1);
assert.strictEqual(res2[0].id, '2');
console.log('✅ Test 2: Tìm kiếm không dấu tiếng Việt ("ban hoc") thành công.');

// Test 3: Chọn nhiều danh mục (Nội thất & Sách vở)
const res3 = filterMarketplaceItems(mockItems, { categories: ['Nội thất', 'Sách vở'] });
assert.strictEqual(res3.length, 3); // id: 2, 3, 5
console.log('✅ Test 3: Chọn nhiều danh mục đồng thời thành công.');

// Test 4: Khoảng giá < 50k
const res4 = filterMarketplaceItems(mockItems, { minPrice: 0, maxPrice: 50000 });
assert.strictEqual(res4.length, 2); // id 2 (45k), id 3 (0đ)
console.log('✅ Test 4: Lọc khoảng giá mức < 50k thành công.');

// Test 5: Khoảng giá 50k - 200k (không tính tin chờ duyệt)
const res5 = filterMarketplaceItems(mockItems, { minPrice: 50000, maxPrice: 200000 });
assert.strictEqual(res5.length, 0); // id 4 bị pending ở public mode
console.log('✅ Test 5: Lọc khoảng giá 50k - 200k thành công.');

// Test 6: Validate khoảng giá min > max (trả về rỗng)
const res6 = filterMarketplaceItems(mockItems, { minPrice: 500000, maxPrice: 100000 });
assert.strictEqual(res6.length, 0);
console.log('✅ Test 6: Validate min > max ngăn chặn lọc sai thành công.');

// Test 7: Toggle "Chỉ đồ miễn phí" (isFreeOnly = true)
const res7 = filterMarketplaceItems(mockItems, { isFreeOnly: true, minPrice: 100000, maxPrice: 500000 });
assert.strictEqual(res7.length, 1);
assert.strictEqual(res7[0].id, '3');
console.log('✅ Test 7: Toggle chỉ đồ miễn phí vô hiệu hóa lọc giá thành công.');

// Test 8: Lọc theo khu vực (Quận Cầu Giấy)
const res8 = filterMarketplaceItems(mockItems, { district: 'Quận Cầu Giấy' });
assert.strictEqual(res8.length, 2); // id 1, id 5 (id 4 pending bị ẩn)
console.log('✅ Test 8: Lọc theo khu vực Quận Cầu Giấy thành công.');

// Test 9: Chế độ my_items xem được tin chờ duyệt của chính mình
const res9 = filterMarketplaceItems(mockItems, { viewMode: 'my_items', currentUserId: 'u_1' });
assert.strictEqual(res9.length, 3); // id 1, 3, 4
console.log('✅ Test 9: Chế độ Tin của tôi hiển thị tin chờ duyệt của chính chủ thành công.');

// Test 10: Sắp xếp giá tăng dần
const res10 = filterMarketplaceItems(mockItems, { sortBy: 'price_asc' });
assert.strictEqual(res10[0].price, 0);
assert.strictEqual(res10[res10.length - 1].price, 650000);
console.log('✅ Test 10: Sắp xếp theo giá tăng dần thành công.');

console.log('🎉 TẤT CẢ 10/10 TEST CASES ĐỀU ĐẠT CHUẨN XÁC 100%!');
