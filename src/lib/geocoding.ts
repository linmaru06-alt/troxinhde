export interface GeoCoords {
  lat: number;
  lng: number;
}

export interface ResolvedGeoCoords extends GeoCoords {
  source: 'explicit' | 'building' | 'cache' | 'street' | 'school' | 'district';
}

export const DISTRICT_CENTERS: Record<string, GeoCoords> = {
  'Cầu Giấy': { lat: 21.0333, lng: 105.7937 },
  'Đống Đa': { lat: 21.0150, lng: 105.8239 },
  'Hai Bà Trưng': { lat: 21.0062, lng: 105.8431 },
  'Hoàn Kiếm': { lat: 21.0287, lng: 105.8524 },
  'Thanh Xuân': { lat: 20.9935, lng: 105.8152 },
  'Hoàng Mai': { lat: 20.9634, lng: 105.8499 },
  'Nam Từ Liêm': { lat: 21.0120, lng: 105.7663 },
  'Bắc Từ Liêm': { lat: 21.0664, lng: 105.7483 },
  'Hà Đông': { lat: 20.9669, lng: 105.7723 },
  'Ba Đình': { lat: 21.0340, lng: 105.8226 },
  'Tây Hồ': { lat: 21.0601, lng: 105.8173 },
  'Long Biên': { lat: 21.0404, lng: 105.8973 },
  'Gia Lâm': { lat: 21.0117, lng: 105.9395 },
  'Thanh Trì': { lat: 20.9416, lng: 105.8442 },
  'Hoài Đức': { lat: 21.0537, lng: 105.7066 },
  'Thạch Thất': { lat: 21.0131, lng: 105.5273 },
};

export const HANOI_UNIVERSITIES = [
  { name: 'ĐH Quốc Gia Hà Nội', coords: [21.0375, 105.7816] as [number, number] },
  { name: 'ĐH Bách Khoa HN', coords: [21.0054, 105.8427] as [number, number] },
  { name: 'ĐH Kinh Tế Quốc Dân', coords: [20.9995, 105.8432] as [number, number] },
  { name: 'ĐH Xây Dựng', coords: [21.0036, 105.8426] as [number, number] },
  { name: 'ĐH Sư Phạm HN', coords: [21.0375, 105.7831] as [number, number] },
  { name: 'ĐH Y Hà Nội', coords: [21.0030, 105.8302] as [number, number] },
  { name: 'ĐH Ngoại Thương', coords: [21.0227, 105.8037] as [number, number] },
  { name: 'ĐH Luật HN', coords: [21.0227, 105.8115] as [number, number] },
  { name: 'Học Viện Ngân Hàng', coords: [21.0076, 105.8286] as [number, number] },
  { name: 'ĐH FPT Hà Nội', coords: [21.0131, 105.5273] as [number, number] },
  { name: 'ĐH Công Nghiệp HN', coords: [21.0538, 105.7351] as [number, number] },
  { name: 'ĐH Thương Mại', coords: [21.0366, 105.7747] as [number, number] },
  { name: 'ĐH Giao Thông VT', coords: [21.0287, 105.8037] as [number, number] },
  { name: 'ĐH Thủy Lợi', coords: [21.0074, 105.8247] as [number, number] },
  { name: 'HV Tài Chính', coords: [21.0754, 105.7745] as [number, number] },
  { name: 'HV Báo Chí & TT', coords: [21.0382, 105.7869] as [number, number] },
  { name: 'ĐH Mỏ - Địa Chất', coords: [21.0721, 105.7749] as [number, number] },
  { name: 'ĐH Dược HN', coords: [21.0253, 105.8554] as [number, number] },
  { name: 'HV Bưu Chính VT', coords: [20.9806, 105.7877] as [number, number] },
  { name: 'ĐH Kiến Trúc HN', coords: [20.9831, 105.7891] as [number, number] },
  { name: 'ĐH Hà Nội', coords: [20.9904, 105.7958] as [number, number] },
  { name: 'HV An Ninh ND', coords: [20.9839, 105.7925] as [number, number] },
  { name: 'ĐH KHTN (ĐHQGHN)', coords: [20.9959, 105.8080] as [number, number] },
  { name: 'ĐH KHXH&NV (ĐHQGHN)', coords: [20.9961, 105.8058] as [number, number] },
  { name: 'HV Ngoại Giao', coords: [21.0215, 105.8085] as [number, number] },
  { name: 'ĐH Ngoại Ngữ (ĐHQGHN)', coords: [21.0375, 105.7815] as [number, number] },
  { name: 'ĐH Công Đoàn', coords: [21.0118, 105.8268] as [number, number] },
  { name: 'ĐH Thăng Long', coords: [20.9754, 105.8143] as [number, number] },
  { name: 'ĐH Điện Lực', coords: [21.0463, 105.7845] as [number, number] },
  { name: 'ĐH Mở Hà Nội', coords: [21.0025, 105.8459] as [number, number] },
  { name: 'ĐH Tài Nguyên MT', coords: [21.0427, 105.7601] as [number, number] },
  { name: 'HV Nông Nghiệp VN', coords: [21.0041, 105.9348] as [number, number] },
  { name: 'HV Cảnh Sát ND', coords: [21.0664, 105.7629] as [number, number] },
  { name: 'ĐH Sân Khấu ĐA', coords: [21.0374, 105.7725] as [number, number] },
  { name: 'ĐH Mỹ Thuật CN', coords: [21.0232, 105.8267] as [number, number] },
  { name: 'HV Quản Lý GD', coords: [20.9859, 105.8443] as [number, number] },
  { name: 'HV Y Dược Cổ Truyền', coords: [20.9789, 105.7909] as [number, number] },
  { name: 'HV Kỹ thuật Quân sự', coords: [21.0471, 105.7928] as [number, number] },
  { name: 'ĐH Phenikaa', coords: [20.9616, 105.7482] as [number, number] },
  { name: 'ĐH Kinh tế kỹ thuật CN', coords: [20.9984, 105.8647] as [number, number] },
  { name: 'HV Phụ nữ Việt Nam', coords: [21.0203, 105.8099] as [number, number] },
  { name: 'ĐH Văn hóa HN', coords: [21.0267, 105.8251] as [number, number] },
  { name: 'ĐH KD & Công nghệ HN', coords: [20.9959, 105.8756] as [number, number] },
  { name: 'ĐH Y tế Công cộng', coords: [21.0776, 105.7770] as [number, number] },
];

// Từ điển tọa độ thực tế các tuyến phố, ngõ, phường phổ biến tại Hà Nội
const HANOI_STREET_AREA_COORDS: Array<{ keywords: string[]; coords: GeoCoords }> = [
  // Cầu Giấy
  { keywords: ['ngo 165 cau giay', '165 cau giay'], coords: { lat: 21.0338, lng: 105.7982 } },
  { keywords: ['ngo 121 xuan thuy', '121 xuan thuy'], coords: { lat: 21.0366, lng: 105.7848 } },
  { keywords: ['xuan thuy', 'dich vong hau'], coords: { lat: 21.0368, lng: 105.7841 } },
  { keywords: ['cau giay', 'dich vong'], coords: { lat: 21.0332, lng: 105.7987 } },
  { keywords: ['tran thai tong'], coords: { lat: 21.0341, lng: 105.7897 } },
  { keywords: ['duy tan'], coords: { lat: 21.0309, lng: 105.7835 } },
  { keywords: ['ho tung mau', 'mai dich'], coords: { lat: 21.0378, lng: 105.7721 } },
  { keywords: ['trung kinh', 'yen hoa'], coords: { lat: 21.0185, lng: 105.7924 } },
  { keywords: ['nguyen phong sac'], coords: { lat: 21.0402, lng: 105.7891 } },
  { keywords: ['hoang quoc viet', 'nghia do', 'nghia tan'], coords: { lat: 21.0465, lng: 105.7945 } },
  { keywords: ['chua ha'], coords: { lat: 21.0347, lng: 105.7949 } },
  { keywords: ['quan hoa'], coords: { lat: 21.0364, lng: 105.8022 } },
  { keywords: ['tran duy hung', 'trung hoa'], coords: { lat: 21.0089, lng: 105.7995 } },
  { keywords: ['nguyen khang'], coords: { lat: 21.0218, lng: 105.7998 } },

  // Hai Bà Trưng
  { keywords: ['ngo tu do', 'tran dai nghia', 'dong tam'], coords: { lat: 21.0005, lng: 105.8442 } },
  { keywords: ['le thanh nghi'], coords: { lat: 21.0038, lng: 105.8462 } },
  { keywords: ['ta quang buu', 'bach khoa'], coords: { lat: 21.0052, lng: 105.8456 } },
  { keywords: ['minh khai', 'vinh tuy'], coords: { lat: 20.9968, lng: 105.8592 } },
  { keywords: ['bach mai'], coords: { lat: 21.0020, lng: 105.8511 } },
  { keywords: ['thanh nhan'], coords: { lat: 21.0046, lng: 105.8565 } },
  { keywords: ['dai la'], coords: { lat: 20.9966, lng: 105.8453 } },
  { keywords: ['truong dinh'], coords: { lat: 20.9905, lng: 105.8476 } },

  // Đống Đa
  { keywords: ['chua lang', 'lang thuong'], coords: { lat: 21.0235, lng: 105.8038 } },
  { keywords: ['ngo 33 hao nam', 'hao nam', 'o cho dua'], coords: { lat: 21.0252, lng: 105.8266 } },
  { keywords: ['chua boc', 'quang trung'], coords: { lat: 21.0081, lng: 105.8277 } },
  { keywords: ['thai ha'], coords: { lat: 21.0124, lng: 105.8226 } },
  { keywords: ['ton that tung', 'khuong thuong'], coords: { lat: 21.0044, lng: 105.8311 } },
  { keywords: ['lang ha'], coords: { lat: 21.0169, lng: 105.8142 } },
  { keywords: ['duong lang', 'nga tu so'], coords: { lat: 21.0112, lng: 105.8087 } },
  { keywords: ['xa dan', 'nam dong'], coords: { lat: 21.0117, lng: 105.8342 } },
  { keywords: ['nguyen chi thanh'], coords: { lat: 21.0215, lng: 105.8087 } },
  { keywords: ['huynh thuc khang'], coords: { lat: 21.0176, lng: 105.8105 } },
  { keywords: ['tay son', 'thinh quang'], coords: { lat: 21.0074, lng: 105.8235 } },
  { keywords: ['de la thanh'], coords: { lat: 21.0231, lng: 105.8211 } },

  // Thanh Xuân
  { keywords: ['vu trong phung', 'thanh xuan trung'], coords: { lat: 20.9985, lng: 105.8075 } },
  { keywords: ['nguyen xien', 'ha dinh'], coords: { lat: 20.9862, lng: 105.8065 } },
  { keywords: ['nguyen trai', 'thuong dinh'], coords: { lat: 20.9951, lng: 105.8091 } },
  { keywords: ['khuong trung', 'khuong dinh', 'khuong ha'], coords: { lat: 20.9963, lng: 105.8165 } },
  { keywords: ['le van luong', 'nhan chinh'], coords: { lat: 21.0045, lng: 105.8032 } },
  { keywords: ['khuat duy tien', 'thanh xuan bac', 'thanh xuan nam'], coords: { lat: 20.9935, lng: 105.7995 } },
  { keywords: ['quan nhan'], coords: { lat: 21.0036, lng: 105.8095 } },
  { keywords: ['trieu khuc'], coords: { lat: 20.9838, lng: 105.7975 } },
  { keywords: ['chinh kinh'], coords: { lat: 20.9955, lng: 105.8112 } },

  // Nam Từ Liêm & Bắc Từ Liêm
  { keywords: ['me tri'], coords: { lat: 21.0112, lng: 105.7782 } },
  { keywords: ['le duc tho', 'my dinh 2'], coords: { lat: 21.0268, lng: 105.7676 } },
  { keywords: ['my dinh', 'nguyen hoang', 'ham nghi'], coords: { lat: 21.0315, lng: 105.7712 } },
  { keywords: ['phu do'], coords: { lat: 21.0145, lng: 105.7652 } },
  { keywords: ['phung khoang', 'trung van'], coords: { lat: 20.9866, lng: 105.7916 } },
  { keywords: ['pham van dong', 'co nhue'], coords: { lat: 21.0598, lng: 105.7805 } },
  { keywords: ['phu dien', 'cau dien'], coords: { lat: 21.0432, lng: 105.7582 } },
  { keywords: ['nhon', 'minh khai'], coords: { lat: 21.0538, lng: 105.7351 } },
  { keywords: ['duc thang', 'dong ngac'], coords: { lat: 21.0748, lng: 105.7742 } },

  // Hà Đông
  { keywords: ['le loi', 'ha cau'], coords: { lat: 20.9688, lng: 105.7745 } },
  { keywords: ['tran phu', 'van quan'], coords: { lat: 20.9786, lng: 105.7885 } },
  { keywords: ['mo lao', 'ao sen'], coords: { lat: 20.9802, lng: 105.7872 } },
  { keywords: ['quang trung ha dong', 'la khe', 'van khe'], coords: { lat: 20.9625, lng: 105.7625 } },
  { keywords: ['yen nghia'], coords: { lat: 20.9498, lng: 105.7478 } },
  { keywords: ['kien hung', 'xa la'], coords: { lat: 20.9612, lng: 105.7915 } },

  // Ba Đình
  { keywords: ['nguyen dinh chieu', 'doi can'], coords: { lat: 21.0358, lng: 105.8245 } },
  { keywords: ['kim ma', 'ngoc khanh'], coords: { lat: 21.0314, lng: 105.8178 } },
  { keywords: ['lieu giai', 'van cao'], coords: { lat: 21.0378, lng: 105.8142 } },
  { keywords: ['hoang hoa tham', 'buoi'], coords: { lat: 21.0422, lng: 105.8244 } },

  // Hoàng Mai
  { keywords: ['linh nam'], coords: { lat: 20.9832, lng: 105.8731 } },
  { keywords: ['giai phong', 'giap bat'], coords: { lat: 20.9835, lng: 105.8414 } },
  { keywords: ['tan mai', 'den lu'], coords: { lat: 20.9835, lng: 105.8542 } },
  { keywords: ['dinh cong'], coords: { lat: 20.9818, lng: 105.8332 } },
  { keywords: ['linh dam', 'hoang liet'], coords: { lat: 20.9665, lng: 105.8285 } },

  // Tây Hồ
  { keywords: ['lac long quan'], coords: { lat: 21.0642, lng: 105.8105 } },
  { keywords: ['xuan la'], coords: { lat: 21.0648, lng: 105.8022 } },
  { keywords: ['au co', 'tu lien', 'nhat tan'], coords: { lat: 21.0652, lng: 105.8264 } },
  { keywords: ['thuy khue'], coords: { lat: 21.0432, lng: 105.8214 } },

  // Long Biên
  { keywords: ['nguyen van cu', 'bo de'], coords: { lat: 21.0445, lng: 105.8758 } },
  { keywords: ['co linh', 'thach ban'], coords: { lat: 21.0278, lng: 105.8992 } },
  { keywords: ['ngoc lam'], coords: { lat: 21.0472, lng: 105.8715 } },

  // Hoàn Kiếm
  { keywords: ['hang bai', 'ly thuong kiet', 'tran hung dao'], coords: { lat: 21.0235, lng: 105.8528 } },
];

const GEOCODE_STORAGE_KEY = 'troxinh_geocode_cache_v1';
const memoryGeocodeCache = new Map<string, GeoCoords>();
const inFlightRequests = new Map<string, Promise<GeoCoords | null>>();
let nominatimQueue: Promise<any> = Promise.resolve();
let lastNominatimCallAt = 0;

export function normalizeViText(str: string): string {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[.,;:/\\|()[\]{}]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function cleanDistrictName(district?: string): string {
  if (!district) return '';
  return district
    .replace(/^Quận\s+/i, '')
    .replace(/^Huyện\s+/i, '')
    .replace(/^Thị xã\s+/i, '')
    .replace(/^Q\.\s*/i, '')
    .replace(/^H\.\s*/i, '')
    .trim();
}

export function isValidHanoiCoord(lat?: number | null, lng?: number | null): boolean {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  return lat >= 20.55 && lat <= 21.45 && lng >= 105.25 && lng <= 106.15;
}

export function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function getDistrictCenter(district?: string): GeoCoords {
  const clean = cleanDistrictName(district);
  if (clean && DISTRICT_CENTERS[clean]) {
    return DISTRICT_CENTERS[clean];
  }
  const norm = normalizeViText(clean);
  if (norm) {
    for (const [name, coords] of Object.entries(DISTRICT_CENTERS)) {
      if (normalizeViText(name) === norm || norm.includes(normalizeViText(name))) {
        return coords;
      }
    }
  }
  return DISTRICT_CENTERS['Cầu Giấy'];
}

function loadPersistentCache(): Record<string, GeoCoords> {
  if (typeof window === 'undefined' || !window.localStorage) return {};
  try {
    const raw = window.localStorage.getItem(GEOCODE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function buildGeoCacheKey(address?: string, district?: string, school?: string): string {
  return [normalizeViText(address || ''), normalizeViText(cleanDistrictName(district)), normalizeViText(school || '')]
    .filter(Boolean)
    .join('|');
}

export function getCachedGeocode(address?: string, district?: string, school?: string): GeoCoords | null {
  const key = buildGeoCacheKey(address, district, school);
  if (!key) return null;
  if (memoryGeocodeCache.has(key)) {
    return memoryGeocodeCache.get(key)!;
  }
  const disk = loadPersistentCache();
  const hit = disk[key];
  if (hit && isValidHanoiCoord(hit.lat, hit.lng)) {
    memoryGeocodeCache.set(key, hit);
    return hit;
  }
  return null;
}

export function setCachedGeocode(key: string, coords: GeoCoords): void {
  if (!key || !isValidHanoiCoord(coords.lat, coords.lng)) return;
  memoryGeocodeCache.set(key, coords);
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const disk = loadPersistentCache();
    disk[key] = coords;
    const keys = Object.keys(disk);
    if (keys.length > 400) {
      delete disk[keys[0]];
    }
    window.localStorage.setItem(GEOCODE_STORAGE_KEY, JSON.stringify(disk));
  } catch {
    // Ignore quota errors
  }
}

function matchUniversityCoords(text?: string): GeoCoords | null {
  const norm = normalizeViText(text || '')
    .replace(/\bdai hoc\b/g, 'dh')
    .replace(/\bhoc vien\b/g, 'hv')
    .replace(/\bha noi\b/g, 'hn');
  if (!norm) return null;

  for (const uni of HANOI_UNIVERSITIES) {
    const uniNorm = normalizeViText(uni.name)
      .replace(/\bdai hoc\b/g, 'dh')
      .replace(/\bhoc vien\b/g, 'hv')
      .replace(/\bha noi\b/g, 'hn');
    if (norm.includes(uniNorm) || (uniNorm.length > 5 && uniNorm.includes(norm))) {
      return { lat: uni.coords[0], lng: uni.coords[1] };
    }
  }
  return null;
}

export function matchLocalAreaCoords(
  address?: string,
  district?: string,
  school?: string
): { coords: GeoCoords; source: 'street' | 'school' | 'district' } {
  const normAddr = normalizeViText(address || '');

  // 1. Ưu tiên khớp đường / ngõ / phường từ địa chỉ cụ thể
  if (normAddr) {
    for (const entry of HANOI_STREET_AREA_COORDS) {
      for (const kw of entry.keywords) {
        if (normAddr.includes(kw)) {
          return { coords: entry.coords, source: 'street' };
        }
      }
    }
    const uniFromAddr = matchUniversityCoords(address);
    if (uniFromAddr) {
      return { coords: uniFromAddr, source: 'school' };
    }
  }

  // 2. Nếu không có địa chỉ đường cụ thể (hoặc không khớp từ điển), thử khớp trường ĐH
  const uniFromSchool = matchUniversityCoords(school);
  if (uniFromSchool) {
    return { coords: uniFromSchool, source: 'school' };
  }

  // 3. Fallback về tâm quận/huyện
  return { coords: getDistrictCenter(district), source: 'district' };
}

export function buildAddressCandidates(address?: string, district?: string, school?: string): string[] {
  const candidates: string[] = [];
  const cleanDist = cleanDistrictName(district);
  const distSuffix = cleanDist ? `${cleanDist}, Hà Nội, Vietnam` : 'Hà Nội, Vietnam';
  const rawAddr = (address || '').trim();

  if (rawAddr) {
    const hasHanoi = /hà nội|ha noi/i.test(rawAddr);
    const hasDist = cleanDist && normalizeViText(rawAddr).includes(normalizeViText(cleanDist));
    const full = hasHanoi ? rawAddr : hasDist ? `${rawAddr}, Hà Nội, Vietnam` : `${rawAddr}, ${distSuffix}`;
    candidates.push(full);

    // Lược bỏ số nhà đầu chuỗi (VD: "Số 18 Ngõ 165 Cầu Giấy, P. Dịch Vọng" -> "Ngõ 165 Cầu Giấy, P. Dịch Vọng")
    const withoutHouseNum = rawAddr
      .replace(/^(số|so|nhà|nha|tòa|toa|tầng|tang|phòng|phong)\s*[\w\d/-]+\s*,?\s*/i, '')
      .replace(/^\d+[a-zA-Z]?(\/\d+)*\s*,?\s*/, '')
      .trim();
    if (withoutHouseNum && withoutHouseNum !== rawAddr) {
      candidates.push(`${withoutHouseNum}, ${distSuffix}`);
    }

    // Lược bỏ thêm "Ngách ...", "Ngõ ..." để còn tên đường chính + phường
    const streetOnly = withoutHouseNum
      .replace(/^(ngách|ngach|hẻm|hem|ngõ|ngo)\s*[\w\d/-]+\s*,?\s*/i, '')
      .replace(/\b(phố|pho|đường|duong)\b\s*/i, '')
      .trim();
    if (streetOnly && streetOnly !== withoutHouseNum && streetOnly.length >= 4) {
      candidates.push(`${streetOnly}, ${distSuffix}`);
    }
  }

  if (school && school.trim()) {
    candidates.push(`${school.trim()}, ${distSuffix}`);
  }

  return Array.from(new Set(candidates.map((c) => c.trim()).filter(Boolean)));
}

async function queryNominatim(query: string): Promise<GeoCoords | null> {
  if (typeof fetch === 'undefined') return null;

  return new Promise((resolve) => {
    nominatimQueue = nominatimQueue
      .then(async () => {
        const waitMs = Math.max(0, 1050 - (Date.now() - lastNominatimCallAt));
        if (waitMs > 0) {
          await new Promise((r) => setTimeout(r, waitMs));
        }
        lastNominatimCallAt = Date.now();

        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timeoutId = controller ? setTimeout(() => controller.abort(), 5000) : null;

        try {
          const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
            query
          )}&format=json&limit=1&countrycodes=vn&accept-language=vi`;
          const response = await fetch(url, {
            headers: { 'User-Agent': 'TroXinhMap/2.0 (troxinh.vn)' },
            signal: controller?.signal,
          });
          if (!response.ok) return null;
          const data = await response.json();
          if (Array.isArray(data) && data[0]) {
            const lat = parseFloat(data[0].lat);
            const lng = parseFloat(data[0].lon);
            if (isValidHanoiCoord(lat, lng)) {
              return { lat, lng };
            }
          }
        } catch {
          return null;
        } finally {
          if (timeoutId) clearTimeout(timeoutId);
        }
        return null;
      })
      .then((res) => {
        resolve(res);
        return res;
      })
      .catch(() => {
        resolve(null);
      });
  });
}

export async function geocodeAddressCached(
  address?: string,
  district?: string,
  school?: string
): Promise<GeoCoords | null> {
  const key = buildGeoCacheKey(address, district, school);
  if (!key) {
    return getDistrictCenter(district);
  }

  const cached = getCachedGeocode(address, district, school);
  if (cached) return cached;

  // Nếu từ điển đường phố khớp trực tiếp rất cụ thể (đường/ngõ), ưu tiên kiểm tra Nominatim nếu có mạng,
  // nhưng có sẵn fallback cực chuẩn ngay lập tức để không bao giờ bị sai quận.
  if (inFlightRequests.has(key)) {
    return inFlightRequests.get(key)!;
  }

  const task = (async (): Promise<GeoCoords | null> => {
    const localMatch = matchLocalAreaCoords(address, district, school);
    const distCenter = getDistrictCenter(district);
    const candidates = buildAddressCandidates(address, district, school);

    for (const query of candidates) {
      const result = await queryNominatim(query);
      if (result) {
        // Kiểm tra kết quả không bị văng quá xa khỏi quận (nếu có chọn quận)
        const maxDistKm = cleanDistrictName(district) ? 14 : 35;
        if (getDistanceKm(result.lat, result.lng, distCenter.lat, distCenter.lng) <= maxDistKm) {
          setCachedGeocode(key, result);
          return result;
        }
      }
    }

    // Fallback từ điển đường phố -> trường ĐH -> tâm quận
    setCachedGeocode(key, localMatch.coords);
    return localMatch.coords;
  })();

  inFlightRequests.set(key, task);
  try {
    return await task;
  } finally {
    inFlightRequests.delete(key);
  }
}

export async function reverseGeocodeAddress(lat: number, lng: number): Promise<string> {
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), 4500) : null;
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=vi`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'TroXinhMap/2.0 (troxinh.vn)' },
      signal: controller?.signal,
    });
    if (!response.ok) return '';
    const data = await response.json();
    if (data && typeof data.display_name === 'string' && data.display_name.trim()) {
      return data.display_name.trim();
    }
  } catch (err) {
    console.error('Reverse geocoding error:', err);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
  return '';
}

export function resolveEntityCoordsSync(input: {
  lat?: number | null;
  lng?: number | null;
  address?: string;
  district?: string;
  school?: string;
  buildingGeo?: GeoCoords | null;
  buildingAddress?: string;
}): ResolvedGeoCoords {
  // 1. Tọa độ gắn trực tiếp trên phòng / tin ở ghép (hỗ trợ cả number và numeric string từ DB/JSON)
  const explicitLat = input.lat !== null && input.lat !== undefined && input.lat !== ('' as any) ? Number(input.lat) : NaN;
  const explicitLng = input.lng !== null && input.lng !== undefined && input.lng !== ('' as any) ? Number(input.lng) : NaN;
  if (isValidHanoiCoord(explicitLat, explicitLng)) {
    return { lat: explicitLat, lng: explicitLng, source: 'explicit' };
  }

  // 2. Chỉ kế thừa tọa độ tòa nhà khi địa chỉ phòng trùng/không ghi đè tòa nhà
  const sameBuildingAddress =
    !input.address ||
    !input.buildingAddress ||
    normalizeViText(input.address) === normalizeViText(input.buildingAddress);

  if (sameBuildingAddress && input.buildingGeo && isValidHanoiCoord(input.buildingGeo.lat, input.buildingGeo.lng)) {
    return { lat: input.buildingGeo.lat, lng: input.buildingGeo.lng, source: 'building' };
  }

  // 3. Cache geocode theo địa chỉ cụ thể
  const cached = getCachedGeocode(input.address, input.district, input.school);
  if (cached) {
    return { ...cached, source: 'cache' };
  }

  // 4. Từ điển tuyến phố / trường ĐH / tâm quận
  const local = matchLocalAreaCoords(input.address, input.district, input.school);
  return { ...local.coords, source: local.source };
}

/**
 * Tách nhẹ (~12m) các ghim có tọa độ hoàn toàn trùng nhau (ví dụ nhiều phòng trong cùng 1 tòa nhà)
 * để người dùng vẫn bấm chọn được từng phòng mà không làm sai lệch vị trí địa chỉ thực tế.
 */
export function spreadCoincidentCoords<
  T extends { id: string; coords: GeoCoords }
>(items: T[]): Array<T & { displayCoords: GeoCoords }> {
  const buckets = new Map<string, T[]>();

  for (const item of items) {
    const key = `${item.coords.lat.toFixed(4)}_${item.coords.lng.toFixed(4)}`;
    const list = buckets.get(key) || [];
    list.push(item);
    buckets.set(key, list);
  }

  const results: Array<T & { displayCoords: GeoCoords }> = [];
  for (const group of buckets.values()) {
    if (group.length === 1) {
      results.push({ ...group[0], displayCoords: group[0].coords });
      continue;
    }

    const total = group.length;
    group.forEach((item, idx) => {
      const ring = Math.floor(idx / 8) + 1;
      const angle = (2 * Math.PI * idx) / Math.min(total, 8);
      // ~0.00011 độ ~ 12 mét quanh tòa nhà
      const delta = 0.00011 * ring;
      results.push({
        ...item,
        displayCoords: {
          lat: item.coords.lat + delta * Math.cos(angle),
          lng: item.coords.lng + delta * Math.sin(angle),
        },
      });
    });
  }

  return results;
}

