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

export function isTargetDeletedRoom(r: any): boolean {
  if (!r) return false;
  const title = (r.title || r.name || '').toLowerCase();
  return (
    (title.includes('kim anh') && title.includes('hài nhi')) ||
    title.includes('phòng dành cho kim anh và hồng hài nhi') ||
    title.includes('kim anh và hồng hài nhi')
  );
}

/**
 * Thống nhất điều kiện phòng công khai cho cả Tìm kiếm và Bản đồ.
 * Loại trừ phòng chưa duyệt, bị từ chối, đã ẩn, đã cho thuê hoặc lưu trữ.
 */
export function isPublicRoom(r: any): boolean {
  if (!r) return false;

  // Loại bỏ phòng được yêu cầu xóa vĩnh viễn
  if (isTargetDeletedRoom(r)) {
    return false;
  }

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
 * Suy luận trường đại học gần nhất và khoảng cách dựa trên tiêu đề, địa chỉ, tòa nhà nếu Supabase chưa có cột nearest_school
 */
export function inferSchoolFromRoom(r: any, b: any = {}): { name: string; distanceKm: number } | null {
  const text = removeVietnameseTones(
    `${r?.title || ''} ${r?.address || ''} ${b?.address || ''} ${b?.name || ''} ${r?.description || ''}`
  ).toLowerCase();

  // 1. Chùa Láng / Đống Đa -> FTU / Ngoại Giao
  if (text.includes('chua lang') || text.includes('ngoai thuong') || text.includes('ftu')) {
    return { name: 'Đại học Ngoại Thương (300m)', distanceKm: 0.3 };
  }
  if (text.includes('ngoai giao') || text.includes('dav')) {
    return { name: 'Học viện Ngoại Giao (400m)', distanceKm: 0.4 };
  }
  // 2. Bách Kinh Xây / Tạ Quang Bửu / Trần Đại Nghĩa -> HUST
  if (
    text.includes('bach kinh xay') ||
    text.includes('bach khoa') ||
    text.includes('hust') ||
    text.includes('ta quang buu') ||
    text.includes('tran dai nghia') ||
    text.includes('hai ba trung')
  ) {
    return { name: 'Đại học Bách Khoa Hà Nội (400m)', distanceKm: 0.4 };
  }
  // 3. Cầu Giấy / Dịch Vọng / Xuân Thủy -> VNU
  if (
    text.includes('165 cau giay') ||
    text.includes('dich vong') ||
    text.includes('cau giay') ||
    text.includes('xuan thuy') ||
    text.includes('quoc gia')
  ) {
    return { name: 'Đại học Quốc Gia Hà Nội (500m)', distanceKm: 0.5 };
  }
  // 4. Thanh Xuân / Nguyễn Trãi -> ĐH Hà Nội
  if (text.includes('nguyen trai') || text.includes('thanh xuan')) {
    return { name: 'Đại học Hà Nội (600m)', distanceKm: 0.6 };
  }
  // 5. Hà Đông / Trần Phú -> PTIT / Kiến Trúc
  if (text.includes('tran phu') || text.includes('ha dong') || text.includes('buu chinh') || text.includes('kien truc')) {
    return { name: 'Học viện Bưu Chính Viễn Thông (500m)', distanceKm: 0.5 };
  }

  return null;
}

/**
 * Chuẩn hóa phòng trọ từ Supabase (snake_case) hoặc mockData (camelCase) sang kiểu Room chuẩn.
 */
export function normalizeRoom(r: any): Room {
  const b = r.buildings || {};
  const rawType = (r.type || r.room_type || 'Phòng đơn').toString().toLowerCase().trim();
  const typeMap: Record<string, Room['type']> = {
    single: 'Phòng đơn',
    'phong don': 'Phòng đơn',
    'phòng đơn': 'Phòng đơn',
    shared: 'Phòng ghép',
    'phong ghep': 'Phòng ghép',
    'phòng ghép': 'Phòng ghép',
    studio: 'Studio',
    apartment: 'Căn hộ mini',
    'can ho mini': 'Căn hộ mini',
    'căn hộ mini': 'Căn hộ mini',
  };
  const type = typeMap[rawType] || (r.type as Room['type']) || 'Phòng đơn';

  let district = r.district || b.district || '';
  const address = r.address || b.address || '';

  // Tự động suy luận quận nếu dữ liệu phòng bị thiếu
  if (!district && address) {
    for (const d of DISTRICTS) {
      const cleanD = removeVietnameseTones(d).toLowerCase().replace(/^quan\s+/, '');
      const normAddr = removeVietnameseTones(address).toLowerCase();
      if (normAddr.includes(cleanD)) {
        district = d;
        break;
      }
    }
  }

  let nearestSchool = r.nearestSchool || r.nearest_school || '';
  let distanceToSchoolKm = Number(r.distanceToSchoolKm ?? r.distance_to_school_km) || 0;

  if (!nearestSchool) {
    const inferred = inferSchoolFromRoom(r, b);
    if (inferred) {
      nearestSchool = inferred.name;
      if (!distanceToSchoolKm) distanceToSchoolKm = inferred.distanceKm;
    }
  }

  const price = Number(r.price) || 0;
  const createdAt = r.createdAt || r.created_at || (r.updatedAt || r.updated_at) || new Date().toISOString();
  const verified = Boolean(r.verified || r.moderation_status === 'approved');
  const isBoosted = Boolean(r.isBoosted || r.is_boosted || r.boost_type);
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

/**
 * Bản đồ từ đồng nghĩa cho từng tiện ích (Synonym dictionary)
 */
export const AMENITY_ALIASES: Record<string, string[]> = {
  'Máy lạnh': ['may lanh', 'dieu hoa', 'dieu hoa inverter', 'may lanh inverter', 'ac', 'dieu hoa 2 chieu'],
  'Tủ lạnh': ['tu lanh', 'tu lanh 2 canh', 'refrigerator', 'fridge'],
  'Gác lửng': ['gac lung', 'gac xep', 'tang lung', 'gac', 'mezzanine', 'loft'],
  'Ban công': ['ban cong', 'logia', 'lo gia', 'balcony', 'san phoi', 'san thuong', 'cua so thoang'],
  'Bếp': ['bep', 'tu bep', 'tu bep rieng', 'ke bep', 'bep tu', 'bep nau an', 'khu bep', 'nau an', 'kitchen'],
  'Wifi': ['wifi', 'internet', 'mang', 'cap quang', 'wifi cap quang', 'wifi toc do cao', 'wifi mien phi'],
  'Bảo vệ 24/7': ['bao ve', 'an ninh', 'camera', 'camera an ninh', 'bao ve 24/7', 'bao ve 24/24', 'an ninh 24/7', 'tu do', 'gio giac tu do', 'khong chung chu'],
  'Thang máy': ['thang may', 'elevator', 'lift'],
  'Khóa vân tay': ['khoa van tay', 'van tay', 'khoa tu', 'the tu', 'khoa thong minh', 'khoa dien tu', 'khoa van tay / the tu', 'khoa tu thong minh', 'mat ma'],
};

/**
 * Kiểm tra xem phòng có chứa tiện ích yêu cầu hay không (kể cả từ đồng nghĩa)
 */
export function roomHasAmenity(room: Room | any, requestedAmenity: string): boolean {
  if (!requestedAmenity || requestedAmenity === 'Tất cả') return true;
  const normReq = removeVietnameseTones(requestedAmenity).toLowerCase().trim();
  const aliases = AMENITY_ALIASES[requestedAmenity] || [normReq];

  const amenitiesList = Array.isArray(room?.amenities) ? room.amenities : [];
  for (const a of amenitiesList) {
    const normA = removeVietnameseTones(a).toLowerCase().trim();
    for (const alias of aliases) {
      if (normA.includes(alias) || alias.includes(normA)) {
        return true;
      }
    }
  }

  // Dự phòng kiểm tra trong tiêu đề và mô tả của phòng
  const fullText = removeVietnameseTones(`${room?.title || ''} ${room?.description || ''}`).toLowerCase();
  for (const alias of aliases) {
    if (fullText.includes(alias)) {
      return true;
    }
  }

  return false;
}

/**
 * So khớp loại hình phòng trọ chuẩn xác (chống lệch hoa thường, tiếng Anh / tiếng Việt)
 */
export function isRoomTypeMatch(roomType: string | null | undefined, targetType: string | null | undefined): boolean {
  if (!targetType || targetType === 'Tất cả loại phòng' || targetType === 'Tất cả') return true;
  if (!roomType) return false;

  const normTarget = removeVietnameseTones(targetType).toLowerCase().trim();
  const normRoom = removeVietnameseTones(roomType).toLowerCase().trim();

  if (normTarget === normRoom || normRoom.includes(normTarget) || normTarget.includes(normRoom)) {
    return true;
  }

  const typeCategories: Record<string, string[]> = {
    studio: ['studio'],
    canhomini: ['can ho mini', 'can ho', 'apartment', 'chung cu mini', 'chmn'],
    phongdon: ['phong don', 'single', 'phong khep kin', 'don'],
    phongghep: ['phong ghep', 'shared', 'o ghep', 'ktx', 'ky tuc xa', 'dorm'],
  };

  for (const aliases of Object.values(typeCategories)) {
    const targetInAliases = aliases.some((a) => normTarget.includes(a) || a.includes(normTarget));
    const roomInAliases = aliases.some((a) => normRoom.includes(a) || a.includes(normRoom));
    if (targetInAliases && roomInAliases) return true;
  }

  return false;
}

/**
 * So khớp phòng trọ với trường đại học được chọn (kiểm tra nearestSchool, từ khóa và địa bàn lân cận)
 */
export function isRoomMatchingSchool(r: Room | any, schoolQuery: string): boolean {
  if (!schoolQuery || !r) return true;
  const targetSchool = findMatchedUniversity(schoolQuery);
  const normQuery = normalizeSchoolName(schoolQuery);
  const normTarget = normalizeSchoolName(targetSchool);

  // 1. So khớp trực tiếp với r.nearestSchool
  if (r.nearestSchool && isSchoolMatch(schoolQuery, r.nearestSchool)) {
    return true;
  }

  // 2. So khớp từ khóa trong toàn bộ thông tin phòng và tòa nhà
  const b = r.buildings || {};
  const searchable = removeVietnameseTones(
    `${r.title || ''} ${r.address || ''} ${r.district || ''} ${r.nearestSchool || ''} ${b.name || ''} ${b.address || ''} ${b.district || ''} ${r.description || ''}`
  ).toLowerCase();

  const stopWords = new Set(['dai', 'hoc', 'vien', 'ha', 'noi', 'truong', 'gan', 'khu', 'vuc', 'co', 'so']);
  const tokens = normTarget.split(' ').filter((w) => !stopWords.has(w) && w.length > 1);
  if (tokens.length > 0 && tokens.every((t) => searchable.includes(t))) {
    return true;
  }

  // 3. So khớp theo các cụm địa bàn trường ĐH (Hub Area Proximity)
  // Ngoại Thương / Ngoại Giao / Luật
  const isFTUGroup = ['dai hoc ngoai thuong', 'hoc vien ngoai giao', 'dai hoc luat'].some(
    (s) => normTarget.includes(s) || normQuery.includes(s)
  );
  if (isFTUGroup) {
    if (
      searchable.includes('chua lang') ||
      searchable.includes('lang thuong') ||
      searchable.includes('phao dai lang') ||
      searchable.includes('huynh thuc khang') ||
      searchable.includes('ngoai thuong') ||
      searchable.includes('ftu')
    ) {
      return true;
    }
  }

  // Bách Khoa / Kinh Tế Quốc Dân / Xây Dựng ("Bách Kinh Xây")
  const isBKGroup = ['dai hoc bach khoa', 'dai hoc kinh te quoc dan', 'dai hoc xay dung'].some(
    (s) => normTarget.includes(s) || normQuery.includes(s)
  );
  if (isBKGroup) {
    if (
      searchable.includes('bach kinh xay') ||
      searchable.includes('bach khoa') ||
      searchable.includes('ta quang buu') ||
      searchable.includes('tran dai nghia') ||
      searchable.includes('le thanh nghi') ||
      searchable.includes('dai co viet') ||
      searchable.includes('dong tam')
    ) {
      return true;
    }
  }

  // ĐHQG / Sư Phạm / Báo Chí
  const isVNUGroup = ['dai hoc quoc gia', 'dai hoc su pham', 'hoc vien bao chi'].some(
    (s) => normTarget.includes(s) || normQuery.includes(s)
  );
  if (isVNUGroup) {
    if (
      searchable.includes('cau giay') ||
      searchable.includes('xuan thuy') ||
      searchable.includes('dich vong') ||
      searchable.includes('tran thai tong') ||
      searchable.includes('ho tung mau') ||
      searchable.includes('nghia tan') ||
      searchable.includes('duy tan')
    ) {
      return true;
    }
  }

  // Giao Thông Vận Tải
  const isUTC = normTarget.includes('giao thong van tai') || normQuery.includes('giao thong') || normQuery.includes('utc');
  if (isUTC) {
    if (
      searchable.includes('cau giay') ||
      searchable.includes('chua lang') ||
      searchable.includes('lang thuong') ||
      searchable.includes('kim ma')
    ) {
      return true;
    }
  }

  // Thương Mại
  const isTMU = normTarget.includes('thuong mai') || normQuery.includes('tmu');
  if (isTMU) {
    if (
      searchable.includes('ho tung mau') ||
      searchable.includes('mai dich') ||
      searchable.includes('le duc tho') ||
      searchable.includes('thuong mai')
    ) {
      return true;
    }
  }

  // Y Hà Nội
  const isHMU = normTarget.includes('dai hoc y') || normQuery.includes('hmu');
  if (isHMU) {
    if (
      searchable.includes('ton that tung') ||
      searchable.includes('chua boc') ||
      searchable.includes('tam khuong') ||
      searchable.includes('khuong thuong')
    ) {
      return true;
    }
  }

  // Bưu Chính / Kiến Trúc / ĐH Hà Nội
  const isHaDongGroup = ['buu chinh', 'kien truc', 'dai hoc ha noi'].some(
    (s) => normTarget.includes(s) || normQuery.includes(s)
  );
  if (isHaDongGroup) {
    if (
      searchable.includes('tran phu') ||
      searchable.includes('nguyen trai') ||
      searchable.includes('van quan') ||
      searchable.includes('phung khoang') ||
      searchable.includes('mo lao')
    ) {
      return true;
    }
  }

  return false;
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
        if (!isRoomMatchingSchool(r, params.selectedSchool)) {
          return false;
        }
      }

      // 4. Lọc từ khóa tìm kiếm (q)
      if (params.searchQuery) {
        const rawQ = params.searchQuery.trim();
        const normQ = removeVietnameseTones(rawQ).toLowerCase();
        if (normQ) {
          // A. Khớp trường đại học (thông qua hàm so khớp thông minh)
          const matchSchool = isRoomMatchingSchool(r, rawQ);

          // B. Khớp quận / khu vực
          const matchDistrict = Boolean(
            (r.district && isDistrictMatch(r.district, rawQ)) ||
            (r.address && isDistrictMatch(r.address, rawQ))
          );

          // C. Khớp tiêu đề, địa chỉ, mô tả, loại phòng
          const matchTitle = removeVietnameseTones(r.title).toLowerCase().includes(normQ);
          const matchAddress = removeVietnameseTones(r.address).toLowerCase().includes(normQ);
          const matchDesc = removeVietnameseTones(r.description || '').toLowerCase().includes(normQ);
          const matchType = isRoomTypeMatch(r.type, rawQ);

          // D. Khớp tiện ích
          const matchAmenity = roomHasAmenity(r, rawQ);

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
        if (!isDistrictMatch(r.district, target) && !isDistrictMatch(r.address, target)) {
          return false;
        }
      }

      // 6. Lọc loại phòng
      if (params.selectedType) {
        const targetType = matchedType || params.selectedType;
        if (!isRoomTypeMatch(r.type, targetType)) {
          return false;
        }
      }

      // 7. Lọc tiện ích (hỗ trợ chọn 1 hoặc nhiều tiện ích cùng lúc dạng hộp kiểm, từ đồng nghĩa)
      const amenitiesToMatch =
        params.selectedAmenities && params.selectedAmenities.length > 0
          ? params.selectedAmenities
          : params.selectedAmenity
          ? params.selectedAmenity.split(',').map((s) => s.trim()).filter(Boolean)
          : [];

      if (amenitiesToMatch.length > 0) {
        const hasAllAmenities = amenitiesToMatch.every((req) => roomHasAmenity(r, req));
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
