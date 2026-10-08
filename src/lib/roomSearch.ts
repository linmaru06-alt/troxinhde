import { Room } from '../types';

export interface RoomSearchParams {
  searchQuery: string;
  selectedSchool: string;
  selectedDistrict: string;
  selectedPrice: string;
  selectedType: string;
  selectedAmenity: string;
  selectedAmenities: string[];
  verifiedOnly: boolean;
  selectedSort: 'verified_first' | 'newest' | 'price_asc' | 'price_desc' | 'distance';
}

export const DISTRICTS = [
  'Quận Cầu Giấy',
  'Quận Đống Đa',
  'Quận Hai Bà Trưng',
  'Quận Thanh Xuân',
  'Quận Nam Từ Liêm',
  'Quận Hà Đông',
  'Quận Ba Đình',
  'Quận Hoàng Mai',
  'Quận Bắc Từ Liêm',
] as const;

export const UNIVERSITIES = [
  'Đại học Quốc Gia Hà Nội',
  'Đại học Bách Khoa Hà Nội',
  'Đại học Kinh Tế Quốc Dân',
  'Đại học Sư Phạm Hà Nội',
  'Đại học Ngoại Thương',
  'Học viện Ngoại Giao',
  'Học viện Bưu Chính Viễn Thông',
  'Học viện Báo chí & Tuyên truyền',
  'Đại học Thương Mại',
  'Đại học Kiến Trúc Hà Nội',
  'Đại học Hà Nội',
  'Đại học Luật Hà Nội',
  'Đại học Xây Dựng Hà Nội',
  'Đại học Giao Thông Vận Tải',
  'Đại học Y Hà Nội',
] as const;

export const ROOM_TYPES = ['Phòng đơn', 'Studio', 'Phòng ghép', 'Căn hộ mini'] as const;

export const AMENITIES_LIST = [
  'Máy lạnh',
  'Tủ lạnh',
  'Gác lửng',
  'Ban công',
  'Bếp',
  'Wifi',
  'Bảo vệ 24/7',
  'Thang máy',
  'Khóa vân tay',
] as const;

export const PRICE_OPTIONS = [
  { label: 'Tất cả mức giá', value: '' },
  { label: 'Dưới 2.5 triệu', value: '0-2500000' },
  { label: '2.5 - 4 triệu', value: '2500000-4000000' },
  { label: '4 - 6 triệu', value: '4000000-6000000' },
  { label: 'Trên 6 triệu', value: '6000000-99999999' },
] as const;

/**
 * Thống nhất điều kiện phòng công khai cho cả Tìm kiếm và Bản đồ.
 * Loại trừ phòng chưa duyệt, bị từ chối, đã ẩn, đã cho thuê hoặc lưu trữ.
 */
export function isPublicRoom(r: any): boolean {
  if (!r) return false;

  // Supabase moderation status
  if (r.moderation_status && r.moderation_status !== 'approved') {
    return false;
  }

  // Supabase availability status
  if (r.availability_status && r.availability_status === 'rented') {
    return false;
  }

  // App / mock status
  const privateStatuses = ['Đã ẩn', 'Bị từ chối', 'Chờ duyệt', 'Đã cho thuê', 'Đã thuê', 'archived', 'hidden', 'draft'];
  if (r.status && privateStatuses.includes(r.status)) {
    return false;
  }

  // Boolean flags
  if (r.isArchived || r.isHidden || r.isDeleted) {
    return false;
  }

  return true;
}

/**
 * Chuẩn hóa phòng trọ từ Supabase (snake_case) hoặc mockData (camelCase) sang kiểu Room chuẩn.
 */
export function normalizeRoom(r: any): Room {
  const b = r.buildings || {};
  const rawType = r.type || r.room_type || 'Phòng đơn';
  const typeMap: Record<string, string> = {
    single: 'Phòng đơn',
    shared: 'Phòng ghép',
    studio: 'Studio',
    apartment: 'Căn hộ mini',
  };
  const type = (typeMap[rawType] || rawType) as Room['type'];

  const district = r.district || b.district || '';
  const address = r.address || b.address || '';
  const nearestSchool = r.nearestSchool || r.nearest_school || '';
  const price = Number(r.price) || 0;
  const createdAt = r.createdAt || r.created_at || (r.updatedAt || r.updated_at) || new Date().toISOString();
  const verified = Boolean(r.verified || r.moderation_status === 'approved');
  const isBoosted = Boolean(r.isBoosted || r.is_boosted || r.boost_type);
  const distanceToSchoolKm = Number(r.distanceToSchoolKm ?? r.distance_to_school_km) || 0;
  const amenities = Array.isArray(r.amenities) ? r.amenities : [];
  const images = Array.isArray(r.images) && r.images.length > 0
    ? r.images
    : (Array.isArray(r.room_images) && r.room_images.length > 0
        ? r.room_images.map((im: any) => im.url || im)
        : ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800']);

  return {
    ...r,
    id: String(r.id),
    title: r.title || r.name || 'Phòng trọ',
    type,
    district,
    address,
    nearestSchool,
    price,
    createdAt,
    verified,
    isBoosted,
    distanceToSchoolKm,
    amenities,
    images,
  } as Room;
}

/**
 * Bỏ dấu tiếng Việt để tìm kiếm mờ (Fuzzy matching) an toàn
 */
export function removeVietnameseTones(str: string | null | undefined): string {
  if (!str || typeof str !== 'string') return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

/**
 * Chuẩn hóa tên quận/huyện để so khớp chính xác
 */
export function isDistrictMatch(roomDistrict: string | null | undefined, targetDistrict: string | null | undefined): boolean {
  if (!roomDistrict || !targetDistrict) return false;
  const cleanDistrict = (d: string) =>
    removeVietnameseTones(d)
      .toLowerCase()
      .replace(/^(quan|huyen|thi\s+xa|tp|thanh\s+pho)\s+/, '')
      .trim();

  const normRoom = cleanDistrict(roomDistrict);
  const normTarget = cleanDistrict(targetDistrict);
  if (!normRoom || !normTarget) return false;
  return normRoom === normTarget || normRoom.includes(normTarget) || normTarget.includes(normRoom);
}

/**
 * Chuẩn hóa tên trường ĐH (hỗ trợ viết tắt quốc tế & thông dụng: HUST, NEU, FTU, VNU, TMU...)
 */
export function normalizeSchoolName(str: string | null | undefined): string {
  if (!str || typeof str !== 'string') return '';
  let text = removeVietnameseTones(str)
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/\bgan\b/gi, ' ')
    .replace(/\b(co\s+so|dia\s+diem|khu\s+vuc)\b/gi, ' ');

  // Mapping abbreviations to full standard names without accents
  const acronymMap: Record<string, string> = {
    hust: 'dai hoc bach khoa',
    bkhn: 'dai hoc bach khoa',
    bk: 'dai hoc bach khoa',
    neu: 'dai hoc kinh te quoc dan',
    ktqd: 'dai hoc kinh te quoc dan',
    ftu: 'dai hoc ngoai thuong',
    vnu: 'dai hoc quoc gia',
    dhqg: 'dai hoc quoc gia',
    tmu: 'dai hoc thuong mai',
    dhtm: 'dai hoc thuong mai',
    nuce: 'dai hoc xay dung',
    huce: 'dai hoc xay dung',
    dhxd: 'dai hoc xay dung',
    hnue: 'dai hoc su pham',
    dhsp: 'dai hoc su pham',
    hmu: 'dai hoc y',
    dhy: 'dai hoc y',
    hlu: 'dai hoc luat',
    dhluat: 'dai hoc luat',
    hau: 'dai hoc kien truc',
    dhkt: 'dai hoc kien truc',
    hanu: 'dai hoc ha noi',
    dhhn: 'dai hoc ha noi',
    utc: 'dai hoc giao thong van tai',
    gtvt: 'dai hoc giao thong van tai',
    haui: 'dai hoc cong nghiep',
    dhcn: 'dai hoc cong nghiep',
    ptit: 'hoc vien buu chinh vien thong',
    ajc: 'hoc vien bao chi tuyen truyen',
    dav: 'hoc vien ngoai giao',
    hvnh: 'hoc vien ngan hang',
    ba: 'hoc vien ngan hang',
    tlu: 'dai hoc thuy loi',
    dhtl: 'dai hoc thuy loi',
    epu: 'dai hoc dien luc',
    fpt: 'dai hoc fpt',
    uet: 'dai hoc cong nghe',
    hus: 'dai hoc khoa hoc tu nhien',
    ussh: 'dai hoc khoa hoc xa hoi va nhan van',
    ulis: 'dai hoc ngoai ngu',
  };

  for (const [abbr, expanded] of Object.entries(acronymMap)) {
    const regex = new RegExp(`\\b${abbr}\\b`, 'g');
    text = text.replace(regex, expanded);
  }

  return text
    .replace(/\bđh\b/g, 'dai hoc')
    .replace(/\bdh\b/g, 'dai hoc')
    .replace(/\bhv\b/g, 'hoc vien')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isSchoolMatch(selected: string, roomSchool: string): boolean {
  if (!selected || !roomSchool) return false;
  const normSel = normalizeSchoolName(selected);
  const normRoom = normalizeSchoolName(roomSchool);
  if (!normRoom || !normSel) return false;
  if (normRoom.includes(normSel) || normSel.includes(normRoom)) return true;

  const stopWords = new Set(['dai', 'hoc', 'vien', 'ha', 'noi', 'truong', 'gan', 'khu', 'vuc', 'co', 'so']);
  const tokens = normSel.split(' ').filter((w) => !stopWords.has(w) && w.length > 1);
  return tokens.length > 0 && tokens.every((t) => normRoom.includes(t));
}

export function parsePriceRange(raw: string | null | undefined): [number, number] | null {
  if (!raw || typeof raw !== 'string') return null;
  const parts = raw.trim().split('-');
  if (parts.length !== 2) return null;
  const min = Number(parts[0]);
  const max = Number(parts[1]);
  if (!Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max < min) return null;
  return [min, max];
}

export function formatPriceRangeDisplay(raw: string): string {
  const range = parsePriceRange(raw);
  if (!range) return raw;
  const [min, max] = range;
  const formatMillion = (n: number) => {
    if (n === 0) return '0đ';
    if (n >= 1000000) return `${(n / 1000000).toLocaleString('vi-VN')}tr`;
    return `${n.toLocaleString('vi-VN')}đ`;
  };
  if (min === 0) return `Dưới ${formatMillion(max)}`;
  if (max >= 99999999) return `Trên ${formatMillion(min)}`;
  return `${formatMillion(min)} - ${formatMillion(max)}`;
}

export function findMatchedUniversity(selectedSchool: string): string {
  if (!selectedSchool) return '';
  return UNIVERSITIES.find((u) => isSchoolMatch(selectedSchool, u)) || selectedSchool;
}

export function findMatchedDistrict(selectedDistrict: string): string {
  if (!selectedDistrict) return '';
  const normSelected = removeVietnameseTones(selectedDistrict).toLowerCase().trim();
  return DISTRICTS.find((d) => {
    const normD = removeVietnameseTones(d).toLowerCase().trim();
    const normDNoPrefix = normD.replace(/^quan\s+/, '');
    return normD === normSelected || normDNoPrefix === normSelected || normD.includes(normSelected);
  }) || selectedDistrict;
}

export function findMatchedType(selectedType: string): string {
  if (!selectedType) return '';
  const normSelected = removeVietnameseTones(selectedType).toLowerCase().trim();
  return ROOM_TYPES.find((t) => {
    const normT = removeVietnameseTones(t).toLowerCase().trim();
    return normT === normSelected || normT.includes(normSelected);
  }) || selectedType;
}

/**
 * Đọc tham số tìm kiếm từ URLSearchParams thống nhất
 */
export function parseRoomSearchParams(searchParams: URLSearchParams): RoomSearchParams {
  const searchQuery = searchParams.get('q') || searchParams.get('search') || searchParams.get('keyword') || '';
  const selectedSchool = searchParams.get('truong') || searchParams.get('school') || searchParams.get('university') || '';
  const selectedDistrict = searchParams.get('khuVuc') || searchParams.get('district') || searchParams.get('quan') || '';
  const selectedPrice = searchParams.get('gia') || searchParams.get('price') || '';
  const selectedType = searchParams.get('loai') || searchParams.get('type') || '';
  const rawAmenity = searchParams.get('tienIch') || searchParams.get('amenity') || '';
  const selectedAmenities = rawAmenity
    ? rawAmenity
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  const selectedAmenity = rawAmenity;
  const verifiedOnly =
    searchParams.get('xacMinh') === 'true' ||
    searchParams.get('xacMinh') === '1' ||
    searchParams.get('verified') === 'true';

  const VALID_SORTS = ['verified_first', 'newest', 'price_asc', 'price_desc', 'distance'] as const;
  const rawSort = searchParams.get('sort') || searchParams.get('sapXep') || '';
  const selectedSort = (VALID_SORTS.includes(rawSort as any) ? rawSort : 'verified_first') as RoomSearchParams['selectedSort'];

  return {
    searchQuery,
    selectedSchool,
    selectedDistrict,
    selectedPrice,
    selectedType,
    selectedAmenity,
    selectedAmenities,
    verifiedOnly,
    selectedSort,
  };
}

/**
 * Lọc và sắp xếp phòng trọ dựa trên nguồn tìm kiếm dùng chung.
 */
export function filterAndSortRooms(rooms: Room[], params: RoomSearchParams): Room[] {
  const priceRange = parsePriceRange(params.selectedPrice);
  const matchedDistrict = findMatchedDistrict(params.selectedDistrict);
  const matchedType = findMatchedType(params.selectedType);

  return (rooms || [])
    .filter((r: Room) => {
      if (!r) return false;

      // 1. Kiểm tra phòng công khai
      if (!isPublicRoom(r)) return false;

      // 2. Lọc xác minh
      if (params.verifiedOnly && !r.verified) return false;

      // 3. Lọc trường ĐH
      if (params.selectedSchool) {
        const matchRoomSchool = r.nearestSchool && isSchoolMatch(params.selectedSchool, r.nearestSchool);
        if (!matchRoomSchool) return false;
      }

      // 4. Lọc từ khóa tìm kiếm (q)
      if (params.searchQuery) {
        const rawQ = params.searchQuery.trim();
        const normQ = removeVietnameseTones(rawQ).toLowerCase();
        if (normQ) {
          // A. Khớp trường đại học (kể cả viết tắt HUST, NEU, FTU, VNU, TMU...)
          const matchSchool = Boolean(r.nearestSchool && (
            removeVietnameseTones(r.nearestSchool).toLowerCase().includes(normQ) ||
            isSchoolMatch(rawQ, r.nearestSchool)
          ));

          // B. Khớp quận / khu vực
          const matchDistrict = Boolean(r.district && isDistrictMatch(r.district, rawQ));

          // C. Khớp tiêu đề, địa chỉ, mô tả, loại phòng
          const matchTitle = removeVietnameseTones(r.title).toLowerCase().includes(normQ);
          const matchAddress = removeVietnameseTones(r.address).toLowerCase().includes(normQ);
          const matchDesc = removeVietnameseTones(r.description || '').toLowerCase().includes(normQ);
          const matchType = removeVietnameseTones(r.type || '').toLowerCase().includes(normQ);

          // D. Khớp tiện ích
          const matchAmenity = Array.isArray(r.amenities) && r.amenities.some((a: string) =>
            removeVietnameseTones(a).toLowerCase().includes(normQ)
          );

          // E. Khớp từ khóa ghép nhiều từ (Multi-token match: vd "phòng cầu giấy", "studio đống đa ban công")
          const qTokens = normQ.split(/\s+/).filter((w) => w.length > 1);
          const searchableText = removeVietnameseTones(
            `${r.title} ${r.address} ${r.district} ${r.nearestSchool || ''} ${r.type || ''} ${(r.amenities || []).join(' ')} ${r.description || ''}`
          ).toLowerCase();

          const allTokensMatch = qTokens.length > 1 && qTokens.every((token) => {
            const normToken = normalizeSchoolName(token);
            if (normToken && normToken !== token) {
              const subTokens = normToken.split(' ').filter((st) => st.length > 1);
              if (subTokens.some((st) => searchableText.includes(st))) return true;
            }
            return searchableText.includes(token);
          });

          if (!matchTitle && !matchAddress && !matchDistrict && !matchDesc && !matchSchool && !matchType && !matchAmenity && !allTokensMatch) {
            return false;
          }
        }
      }

      // 5. Lọc quận / khu vực
      if (params.selectedDistrict) {
        const target = matchedDistrict || params.selectedDistrict;
        if (!isDistrictMatch(r.district, target)) {
          return false;
        }
      }

      // 6. Lọc loại phòng
      if (params.selectedType) {
        const targetType = removeVietnameseTones(matchedType || params.selectedType).toLowerCase().trim();
        const roomType = removeVietnameseTones(r.type || '').toLowerCase().trim();
        if (!roomType.includes(targetType) && !targetType.includes(roomType)) {
          return false;
        }
      }

      // 7. Lọc tiện ích (hỗ trợ chọn 1 hoặc nhiều tiện ích cùng lúc dạng hộp kiểm)
      const amenitiesToMatch =
        params.selectedAmenities && params.selectedAmenities.length > 0
          ? params.selectedAmenities
          : params.selectedAmenity
          ? params.selectedAmenity.split(',').map((s) => s.trim()).filter(Boolean)
          : [];

      if (amenitiesToMatch.length > 0) {
        const roomAmenitiesNorm = (r.amenities || []).map((a: string) => removeVietnameseTones(a).toLowerCase());
        const hasAllAmenities = amenitiesToMatch.every((req) => {
          const normReq = removeVietnameseTones(req).toLowerCase().trim();
          return roomAmenitiesNorm.some((a: string) => a.includes(normReq));
        });
        if (!hasAllAmenities) return false;
      }

      // 8. Lọc mức giá
      if (priceRange) {
        const [min, max] = priceRange;
        const roomPrice = Number(r.price);
        if (!Number.isFinite(roomPrice) || roomPrice < min || roomPrice > max) {
          return false;
        }
      }

      return true;
    })
    .sort((a: Room, b: Room) => {
      // Ưu tiên tin được đẩy / Boosted lên đầu
      const aBoosted = Boolean(a?.isBoosted);
      const bBoosted = Boolean(b?.isBoosted);
      if (aBoosted && !bBoosted) return -1;
      if (!aBoosted && bBoosted) return 1;

      if (params.selectedSort === 'verified_first') {
        const aVer = Boolean(a?.verified);
        const bVer = Boolean(b?.verified);
        if (aVer && !bVer) return -1;
        if (!aVer && bVer) return 1;
      }

      const aPrice = Number(a?.price) || 0;
      const bPrice = Number(b?.price) || 0;
      const aTime = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
      const safeATime = isNaN(aTime) ? 0 : aTime;
      const safeBTime = isNaN(bTime) ? 0 : bTime;

      // Giá thấp đến cao
      if (params.selectedSort === 'price_asc') {
        const diff = aPrice - bPrice;
        if (diff !== 0) return diff;
        return safeBTime - safeATime;
      }

      // Giá cao đến thấp
      if (params.selectedSort === 'price_desc') {
        const diff = bPrice - aPrice;
        if (diff !== 0) return diff;
        return safeBTime - safeATime;
      }

      // Tin mới nhất
      if (params.selectedSort === 'newest') {
        const timeDiff = safeBTime - safeATime;
        if (timeDiff !== 0) return timeDiff;
        return String(b.id).localeCompare(String(a.id));
      }

      // Khoảng cách gần trường
      if (params.selectedSort === 'distance') {
        const aDist = Number(a?.distanceToSchoolKm) || 999;
        const bDist = Number(b?.distanceToSchoolKm) || 999;
        const diff = aDist - bDist;
        if (diff !== 0) return diff;
        return safeBTime - safeATime;
      }

      // Mặc định fallback: Ưu tiên xác minh, sau đó theo ngày đăng mới
      const aVer = Boolean(a?.verified);
      const bVer = Boolean(b?.verified);
      if (aVer !== bVer) return aVer ? -1 : 1;

      return safeBTime - safeATime;
    });
}
