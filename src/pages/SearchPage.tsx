import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { useUIStore } from '../store/useUIStore';
import { useOutsideClick } from '../hooks/useOutsideClick';
import { RoomCard } from '../components/ui/Cards';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { GuestPromptBanner } from '../components/search/GuestPromptBanner';
import { SEOHead } from '../components/seo/SEOHead';
import { SearchAutocomplete } from '../components/search/SearchAutocomplete';
import { AIRecommendationsSection } from '../components/rooms/AIRecommendationsSection';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Search,
  Filter,
  MapPin,
  SlidersHorizontal,
  Map,
  X,
  Sparkles,
  ChevronDown,
  RotateCcw,
  ShieldCheck,
  GraduationCap,
  Home,
  CheckCircle2,
  Clock,
  ArrowUpDown,
  Banknote,
  Zap,
} from 'lucide-react';

import { Room } from '../types';
import { useRooms } from '../hooks/queries/useRooms';

export const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { rooms } = useAppStore();
  const { isMobileFilterOpen, toggleMobileFilter, closeAllSheets } = useUIStore();
  const { data: cloudRooms, isLoading: isQueryLoading } = useRooms();

  const activeRooms: Room[] = (cloudRooms && cloudRooms.length > 0 ? cloudRooms : rooms) as unknown as Room[];

  const mobileDrawerRef = useRef<HTMLDivElement>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Filters State from URL
  const searchQuery = searchParams.get('q') || '';
  const selectedSchool = searchParams.get('truong') || '';
  const selectedDistrict = searchParams.get('khuVuc') || '';
  const selectedPrice = searchParams.get('gia') || '';
  const selectedType = searchParams.get('loai') || '';
  const selectedSort = searchParams.get('sort') || 'verified_first';
  const selectedAmenity = searchParams.get('tienIch') || '';
  const verifiedOnly = searchParams.get('xacMinh') === 'true';

  // Mobile draft filters – only applied to URL when "Ap dung" tapped
  const [mobileDraft, setMobileDraft] = useState({
    verified: verifiedOnly,
    school: selectedSchool,
    district: selectedDistrict,
    price: selectedPrice,
    type: selectedType,
    amenity: selectedAmenity,
  });

  // Sync draft each time the drawer opens (discard unapplied prev changes)
  useEffect(() => {
    if (isMobileFilterOpen) {
      setMobileDraft({
        verified: verifiedOnly,
        school: selectedSchool,
        district: selectedDistrict,
        price: selectedPrice,
        type: selectedType,
        amenity: selectedAmenity,
      });
    }
  }, [isMobileFilterOpen]);

  // Close without applying – draft changes are discarded
  const handleMobileClose = () => closeAllSheets();

  useOutsideClick(mobileDrawerRef, handleMobileClose, isMobileFilterOpen);

  // Flush draft to URL
  const applyMobileFilters = () => {
    const next = new URLSearchParams(searchParams);
    mobileDraft.verified ? next.set('xacMinh', 'true') : next.delete('xacMinh');
    mobileDraft.school   ? next.set('truong',  mobileDraft.school)   : next.delete('truong');
    mobileDraft.district ? next.set('khuVuc',  mobileDraft.district) : next.delete('khuVuc');
    mobileDraft.price    ? next.set('gia',     mobileDraft.price)    : next.delete('gia');
    mobileDraft.type     ? next.set('loai',    mobileDraft.type)     : next.delete('loai');
    mobileDraft.amenity  ? next.set('tienIch', mobileDraft.amenity)  : next.delete('tienIch');
    setSearchParams(next);
    closeAllSheets();
  };

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setSearchParams(next);
  };

  const clearAllFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  const districts = [
    'Quận Cầu Giấy',
    'Quận Đống Đa',
    'Quận Hai Bà Trưng',
    'Quận Thanh Xuân',
    'Quận Nam Từ Liêm',
    'Quận Hà Đông',
    'Quận Ba Đình',
    'Quận Hoàng Mai',
    'Quận Bắc Từ Liêm',
  ];

  const universities = [
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
  ];

  const roomTypes = ['Phòng đơn', 'Studio', 'Phòng ghép', 'Căn hộ mini'];
  const amenitiesList = ['Máy lạnh', 'Tủ lạnh', 'Gác lửng', 'Ban công', 'Bếp', 'Wifi', 'Bảo vệ 24/7', 'Thang máy', 'Khóa vân tay'];

  // Helper to remove Vietnamese tones for fuzzy searching
  function removeVietnameseTones(str: string): string {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase();
  }

  // Normalize university names for fuzzy matching between full names, acronyms, and room data
  function normalizeSchoolName(str: string): string {
    if (!str) return '';
    return removeVietnameseTones(str)
      .replace(/\(.*?\)/g, '')
      .replace(/\bdhqg\b/g, 'dai hoc quoc gia')
      .replace(/\bđhqg\b/g, 'dai hoc quoc gia')
      .replace(/\bđh\b/g, 'dai hoc')
      .replace(/\bdh\b/g, 'dai hoc')
      .replace(/\bhv\b/g, 'hoc vien')
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function isSchoolMatch(selected: string, roomSchool: string): boolean {
    if (!selected || !roomSchool) return false;
    const normSel = normalizeSchoolName(selected);
    const normRoom = normalizeSchoolName(roomSchool);
    if (!normRoom || !normSel) return false;
    if (normRoom.includes(normSel) || normSel.includes(normRoom)) return true;

    // Keyword core tokens check (excluding common stop words like "dai", "hoc", "vien", "ha", "noi", "truong")
    const stopWords = new Set(['dai', 'hoc', 'vien', 'ha', 'noi', 'truong']);
    const tokens = normSel.split(' ').filter((w) => !stopWords.has(w) && w.length > 1);
    return tokens.length > 0 && tokens.every((t) => normRoom.includes(t));
  }

  // Parse & validate price range string "min-max" – returns null if invalid
  function parsePriceRange(raw: string): [number, number] | null {
    if (!raw) return null;
    const parts = raw.split('-');
    if (parts.length !== 2) return null;
    const min = Number(parts[0]);
    const max = Number(parts[1]);
    if (isNaN(min) || isNaN(max) || min < 0 || max < min) return null;
    return [min, max];
  }

  const matchedUniversityOption = useMemo(() => {
    if (!selectedSchool) return '';
    return universities.find((u) => isSchoolMatch(selectedSchool, u)) || selectedSchool;
  }, [selectedSchool]);

  // Filtered & Sorted Rooms
  const filteredRooms = useMemo(() => {
    const priceRange = parsePriceRange(selectedPrice);

    return (activeRooms || []).filter((r: any) => {
      // Verification filter
      if (verifiedOnly && !r.verified) return false;

      // School filter
      if (selectedSchool) {
        const matchRoomSchool = r.nearestSchool && isSchoolMatch(selectedSchool, r.nearestSchool);
        if (!matchRoomSchool) return false;
      }

      // Keyword query filter
      if (searchQuery) {
        const normQ = removeVietnameseTones(searchQuery.trim());
        const matchTitle = removeVietnameseTones(r.title).includes(normQ);
        const matchAddress = removeVietnameseTones(r.address).includes(normQ);
        const matchDistrict = removeVietnameseTones(r.district).includes(normQ);
        const matchDesc = removeVietnameseTones(r.description).includes(normQ);
        const matchSchool = r.nearestSchool && (
          removeVietnameseTones(r.nearestSchool).includes(normQ) ||
          isSchoolMatch(searchQuery.trim(), r.nearestSchool)
        );
        if (!matchTitle && !matchAddress && !matchDistrict && !matchDesc && !matchSchool) {
          return false;
        }
      }

      // District filter
      if (selectedDistrict && r.district !== selectedDistrict) return false;

      // Type filter
      if (selectedType && r.type !== selectedType) return false;

      // Amenity filter
      if (selectedAmenity && !r.amenities.some((a: string) => a.toLowerCase().includes(selectedAmenity.toLowerCase()))) {
        return false;
      }

      // Price filter – skip silently when range is invalid (NaN, negative, min>max)
      if (priceRange) {
        const [min, max] = priceRange;
        if (r.price < min || r.price > max) return false;
      }

      return true;
    }).sort((a: any, b: any) => {
      // Prioritize boosted rooms at top
      if (a.isBoosted && !b.isBoosted) return -1;
      if (!a.isBoosted && b.isBoosted) return 1;

      if (selectedSort === 'verified_first') {
        if (a.verified && !b.verified) return -1;
        if (!a.verified && b.verified) return 1;
      }
      if (selectedSort === 'price_asc') return a.price - b.price;
      if (selectedSort === 'price_desc') return b.price - a.price;
      if (selectedSort === 'distance') return (a.distanceToSchoolKm || 0) - (b.distanceToSchoolKm || 0);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [activeRooms, searchQuery, selectedSchool, selectedDistrict, selectedPrice, selectedType, selectedSort, selectedAmenity, verifiedOnly]);

  const priceRangeInvalid = selectedPrice !== '' && parsePriceRange(selectedPrice) === null;

  const activeFilterCount = [searchQuery, selectedSchool, selectedDistrict, selectedPrice, selectedType, selectedAmenity, verifiedOnly ? 'xacMinh' : ''].filter(Boolean).length;

  const mobileDraftFilterCount = [
    mobileDraft.school, mobileDraft.district, mobileDraft.price,
    mobileDraft.type, mobileDraft.amenity, mobileDraft.verified ? 'v' : '',
  ].filter(Boolean).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <SEOHead
        title={selectedDistrict ? `Tìm Phòng Trọ ${selectedDistrict} | Trọ Xinh Hà Nội` : `Tìm Phòng Trọ Đã Xác Minh Tại Hà Nội (${filteredRooms.length} phòng) | Trọ Xinh`}
        description={`Xem ${filteredRooms.length} phòng trọ sinh viên đã đối chiếu thực tế tại Hà Nội. Minh bạch tổng chi phí, lọc theo trường ĐH, mức giá, tiện nghi.`}
        url={`/tim-phong${searchParams.toString() ? `?${searchParams.toString()}` : ''}`}
      />

      {/* Top Search Autocomplete Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-3xl border border-gray-200 shadow-xs">
        <SearchAutocomplete
          initialValue={searchQuery || selectedSchool}
          placeholder="Tìm phòng theo trường ĐH, quận hoặc địa danh (vd: Bách Khoa, Cầu Giấy, Chùa Láng...)"
          onSelect={(val, type) => {
            if (type === 'district') {
              updateParam('khuVuc', val);
            } else if (type === 'university') {
              const next = new URLSearchParams(searchParams);
              next.set('truong', val);
              next.delete('q');
              setSearchParams(next);
            } else {
              updateParam('q', val);
            }
          }}
        />
      </div>

      {/* Top Header & Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#00a854] text-[11px] font-black mb-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Phòng Đã Đối Chiếu Thực Tế</span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-gray-950 tracking-tight">
            Danh Sách Phòng Trọ Cho Thuê Hà Nội
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Hiển thị <span className="font-black text-[#00a854]">{filteredRooms.length}</span> phòng trọ có sẵn & minh bạch chi phí
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Sorting Dropdown */}
          <div className="flex items-center bg-white border border-gray-200 rounded-2xl px-3 py-2 text-xs font-bold text-gray-900 shadow-2xs">
            <ArrowUpDown className="w-3.5 h-3.5 text-gray-400 mr-1.5" />
            <select
              value={selectedSort}
              onChange={(e) => updateParam('sort', e.target.value)}
              className="bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="verified_first">Ưu tiên đã xác minh</option>
              <option value="newest">Tin mới nhất</option>
              <option value="price_asc">Giá: Thấp → Cao</option>
              <option value="price_desc">Giá: Cao → Thấp</option>
              <option value="distance">Gần trường nhất</option>
            </select>
          </div>

          {/* Map view button */}
          <Link to={`/ban-do?${searchParams.toString()}`}>
            <Button variant="outline" size="sm" leftIcon={<Map className="w-4 h-4 text-[#00a854]" />}>
              Bản đồ
            </Button>
          </Link>

          {/* Mobile Filter trigger */}
          <button
            onClick={toggleMobileFilter}
            className="md:hidden relative flex items-center gap-1.5 px-3.5 py-2 bg-white border border-gray-200 rounded-2xl text-xs font-bold text-gray-950 shadow-xs active:scale-95 transition"
            aria-expanded={isMobileFilterOpen}
          >
            <SlidersHorizontal className="w-4 h-4 text-[#00a854]" />
            <span>Bộ lọc</span>
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 bg-[#00a854] text-white text-[10px] rounded-full flex items-center justify-center font-black">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Applied Filter Chips */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-gray-500 font-bold">Đang lọc:</span>
          {verifiedOnly && (
            <span className="inline-flex items-center gap-1 bg-emerald-50 text-[#00a854] px-3 py-1 rounded-full border border-emerald-200 font-bold">
              🛡️ Đã xác minh
              <button onClick={() => updateParam('xacMinh', '')}><X className="w-3 h-3 hover:text-rose-600" /></button>
            </span>
          )}
          {searchQuery && (
            <span className="inline-flex items-center gap-1 bg-emerald-50 text-[#00a854] px-3 py-1 rounded-full border border-emerald-200 font-bold">
              Từ khóa: "{searchQuery}"
              <button onClick={() => updateParam('q', '')}><X className="w-3 h-3 hover:text-rose-600" /></button>
            </span>
          )}
          {selectedSchool && (
            <span className="inline-flex items-center gap-1 bg-emerald-50 text-[#00a854] px-3 py-1 rounded-full border border-emerald-200 font-bold">
              🎓 {matchedUniversityOption || selectedSchool}
              <button onClick={() => updateParam('truong', '')}><X className="w-3 h-3 hover:text-rose-600" /></button>
            </span>
          )}
          {selectedDistrict && (
            <span className="inline-flex items-center gap-1 bg-emerald-50 text-[#00a854] px-3 py-1 rounded-full border border-emerald-200 font-bold">
              📍 {selectedDistrict}
              <button onClick={() => updateParam('khuVuc', '')}><X className="w-3 h-3 hover:text-rose-600" /></button>
            </span>
          )}
          {selectedPrice && !priceRangeInvalid && (
            <span className="inline-flex items-center gap-1 bg-emerald-50 text-[#00a854] px-3 py-1 rounded-full border border-emerald-200 font-bold">
              💵 {selectedPrice.split('-')[0]}đ - {selectedPrice.split('-')[1]}đ
              <button onClick={() => updateParam('gia', '')}><X className="w-3 h-3 hover:text-rose-600" /></button>
            </span>
          )}
          {selectedPrice && priceRangeInvalid && (
            <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-600 px-3 py-1 rounded-full border border-rose-200 font-bold">
              ⚠️ Giá không hợp lệ
              <button onClick={() => updateParam('gia', '')}><X className="w-3 h-3 hover:text-rose-600" /></button>
            </span>
          )}
          {selectedType && (
            <span className="inline-flex items-center gap-1 bg-emerald-50 text-[#00a854] px-3 py-1 rounded-full border border-emerald-200 font-bold">
              🏠 {selectedType}
              <button onClick={() => updateParam('loai', '')}><X className="w-3 h-3 hover:text-rose-600" /></button>
            </span>
          )}
          {selectedAmenity && (
            <span className="inline-flex items-center gap-1 bg-emerald-50 text-[#00a854] px-3 py-1 rounded-full border border-emerald-200 font-bold">
              ⚡ {selectedAmenity}
              <button onClick={() => updateParam('tienIch', '')}><X className="w-3 h-3 hover:text-rose-600" /></button>
            </span>
          )}
          <button
            onClick={clearAllFilters}
            className="text-xs text-rose-600 font-black hover:underline flex items-center gap-1 ml-2 tap-bounce"
          >
            <RotateCcw className="w-3 h-3" /> Đặt lại tất cả
          </button>
        </div>
      )}

      {/* Mobile Quick Filter Chips Carousel (1-touch filters) */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 pt-0.5 -mx-4 px-4 sm:mx-0 sm:px-0">
        <button
          onClick={() => updateParam('xacMinh', verifiedOnly ? '' : 'true')}
          className={`shrink-0 px-3.5 py-2 min-h-[38px] rounded-full text-xs font-bold transition tap-bounce flex items-center gap-1.5 ${
            verifiedOnly
              ? 'bg-[#00a854] text-white shadow-xs'
              : 'bg-white text-gray-700 border border-gray-200 hover:border-[#00a854]'
          }`}
        >
          Đã kiểm duyệt
        </button>
        <button
          onClick={() => updateParam('gia', selectedPrice === '0-2500000' ? '' : '0-2500000')}
          className={`shrink-0 px-3.5 py-2 min-h-[38px] rounded-full text-xs font-bold transition tap-bounce flex items-center gap-1.5 ${
            selectedPrice === '0-2500000'
              ? 'bg-[#00a854] text-white shadow-xs'
              : 'bg-white text-gray-700 border border-gray-200 hover:border-[#00a854]'
          }`}
        >
          Dưới 2.5 triệu
        </button>
        <button
          onClick={() => updateParam('gia', selectedPrice === '2500000-4000000' ? '' : '2500000-4000000')}
          className={`shrink-0 px-3.5 py-2 min-h-[38px] rounded-full text-xs font-bold transition tap-bounce flex items-center gap-1.5 ${
            selectedPrice === '2500000-4000000'
              ? 'bg-[#00a854] text-white shadow-xs'
              : 'bg-white text-gray-700 border border-gray-200 hover:border-[#00a854]'
          }`}
        >
          2.5 - 4 triệu
        </button>
        <button
          onClick={() => updateParam('truong', isSchoolMatch('Bách Khoa', selectedSchool) ? '' : 'Đại học Bách Khoa Hà Nội')}
          className={`shrink-0 px-3.5 py-2 min-h-[38px] rounded-full text-xs font-bold transition tap-bounce flex items-center gap-1.5 ${
            isSchoolMatch('Bách Khoa', selectedSchool)
              ? 'bg-[#00a854] text-white shadow-xs'
              : 'bg-white text-gray-700 border border-gray-200 hover:border-[#00a854]'
          }`}
        >
          Bách Khoa
        </button>
        <button
          onClick={() => updateParam('khuVuc', selectedDistrict === 'Quận Cầu Giấy' ? '' : 'Quận Cầu Giấy')}
          className={`shrink-0 px-3.5 py-2 min-h-[38px] rounded-full text-xs font-bold transition tap-bounce flex items-center gap-1.5 ${
            selectedDistrict === 'Quận Cầu Giấy'
              ? 'bg-[#00a854] text-white shadow-xs'
              : 'bg-white text-gray-700 border border-gray-200 hover:border-[#00a854]'
          }`}
        >
          Cầu Giấy
        </button>
        <button
          onClick={() => updateParam('khuVuc', selectedDistrict === 'Quận Đống Đa' ? '' : 'Quận Đống Đa')}
          className={`shrink-0 px-3.5 py-2 min-h-[38px] rounded-full text-xs font-bold transition tap-bounce flex items-center gap-1.5 ${
            selectedDistrict === 'Quận Đống Đa'
              ? 'bg-[#00a854] text-white shadow-xs'
              : 'bg-white text-gray-700 border border-gray-200 hover:border-[#00a854]'
          }`}
        >
          Đống Đa
        </button>
        <button
          onClick={() => updateParam('loai', selectedType === 'Studio' ? '' : 'Studio')}
          className={`shrink-0 px-3.5 py-2 min-h-[38px] rounded-full text-xs font-bold transition tap-bounce flex items-center gap-1.5 ${
            selectedType === 'Studio'
              ? 'bg-[#00a854] text-white shadow-xs'
              : 'bg-white text-gray-700 border border-gray-200 hover:border-[#00a854]'
          }`}
        >
          Studio
        </button>
      </div>

      {/* Main Content Layout: Sidebar + Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
        {/* DESKTOP FILTER SIDEBAR */}
        <aside className="hidden md:block bg-white rounded-3xl border border-gray-200 p-5 space-y-6 sticky top-24 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <h3 className="font-black text-gray-950 text-sm flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[#00a854]" />
              Bộ Lọc Nâng Cao
            </h3>
            {activeFilterCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="text-xs text-gray-400 hover:text-rose-600 font-bold transition"
              >
                Đặt lại
              </button>
            )}
          </div>

          {/* Verification toggle */}
          <div className="p-3 bg-emerald-50/70 rounded-2xl border border-emerald-100 space-y-2">
            <label className="flex items-center gap-2 text-xs font-black text-gray-950 cursor-pointer">
              <input
                type="checkbox"
                checked={verifiedOnly}
                onChange={(e) => updateParam('xacMinh', e.target.checked ? 'true' : '')}
                className="w-4 h-4 rounded text-[#00a854] focus:ring-[#00a854] accent-[#00a854]"
              />
              <span className="flex items-center gap-1 text-emerald-900">
                <ShieldCheck className="w-4 h-4 text-[#00a854]" /> Chỉ phòng đã xác minh
              </span>
            </label>
            <p className="text-[10px] text-gray-500 leading-tight">
              Đã đối chiếu danh tính chủ trọ và hình ảnh thực tế trong 30 ngày.
            </p>
          </div>

          {/* University selector */}
          <div className="space-y-2">
            <label className="block text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-[#00a854]" /> Trường Đại học lân cận
            </label>
            <select
              value={matchedUniversityOption}
              onChange={(e) => updateParam('truong', e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-2.5 text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#00a854]"
            >
              <option value="">Tất cả các trường ĐH</option>
              {universities.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>

          {/* District Filter */}
          <div className="space-y-2 pt-3 border-t border-gray-100">
            <label className="block text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#00a854]" /> Khu vực (Hà Nội)
            </label>
            <select
              value={selectedDistrict}
              onChange={(e) => updateParam('khuVuc', e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-2.5 text-xs font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#00a854]"
            >
              <option value="">Tất cả quận / huyện</option>
              {districts.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Room Type */}
          <div className="space-y-2 pt-3 border-t border-gray-100">
            <label className="block text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
              <Home className="w-3.5 h-3.5 text-[#00a854]" /> Loại hình phòng
            </label>
            <div className="space-y-1">
              <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer hover:text-[#00a854]">
                <input
                  type="radio"
                  name="type"
                  checked={!selectedType}
                  onChange={() => updateParam('loai', '')}
                  className="text-[#00a854] focus:ring-[#00a854] accent-[#00a854]"
                />
                <span>Tất cả loại phòng</span>
              </label>
              {roomTypes.map((t) => (
                <label key={t} className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer hover:text-[#00a854]">
                  <input
                    type="radio"
                    name="type"
                    checked={selectedType === t}
                    onChange={() => updateParam('loai', t)}
                    className="text-[#00a854] focus:ring-[#00a854] accent-[#00a854]"
                  />
                  <span>{t}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div className="space-y-2 pt-3 border-t border-gray-100">
            <label className="block text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
              <Banknote className="w-3.5 h-3.5 text-[#00a854]" /> Mức giá thuê
            </label>
            {priceRangeInvalid && (
              <p className="text-[10px] text-rose-600 font-bold">⚠️ Khoảng giá không hợp lệ</p>
            )}
            <div className="space-y-1">
              <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer hover:text-[#00a854]">
                <input
                  type="radio"
                  name="price"
                  checked={!selectedPrice}
                  onChange={() => updateParam('gia', '')}
                  className="text-[#00a854] focus:ring-[#00a854] accent-[#00a854]"
                />
                <span>Tất cả mức giá</span>
              </label>
              <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer hover:text-[#00a854]">
                <input
                  type="radio"
                  name="price"
                  checked={selectedPrice === '0-2500000'}
                  onChange={() => updateParam('gia', '0-2500000')}
                  className="text-[#00a854] focus:ring-[#00a854] accent-[#00a854]"
                />
                <span>Dưới 2.5 triệu</span>
              </label>
              <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer hover:text-[#00a854]">
                <input
                  type="radio"
                  name="price"
                  checked={selectedPrice === '2500000-4000000'}
                  onChange={() => updateParam('gia', '2500000-4000000')}
                  className="text-[#00a854] focus:ring-[#00a854] accent-[#00a854]"
                />
                <span>2.5 - 4 triệu</span>
              </label>
              <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer hover:text-[#00a854]">
                <input
                  type="radio"
                  name="price"
                  checked={selectedPrice === '4000000-6000000'}
                  onChange={() => updateParam('gia', '4000000-6000000')}
                  className="text-[#00a854] focus:ring-[#00a854] accent-[#00a854]"
                />
                <span>4 - 6 triệu</span>
              </label>
              <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer hover:text-[#00a854]">
                <input
                  type="radio"
                  name="price"
                  checked={selectedPrice === '6000000-99999999'}
                  onChange={() => updateParam('gia', '6000000-99999999')}
                  className="text-[#00a854] focus:ring-[#00a854] accent-[#00a854]"
                />
                <span>Trên 6 triệu</span>
              </label>
            </div>
          </div>

          {/* Amenities */}
          <div className="space-y-2 pt-3 border-t border-gray-100">
            <label className="block text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-[#00a854]" /> Tiện ích kèm theo
            </label>
            <div className="space-y-1">
              <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer hover:text-[#00a854]">
                <input
                  type="radio"
                  name="amenity"
                  checked={!selectedAmenity}
                  onChange={() => updateParam('tienIch', '')}
                  className="text-[#00a854] focus:ring-[#00a854] accent-[#00a854]"
                />
                <span>Tất cả</span>
              </label>
              {amenitiesList.map((a) => (
                <label key={a} className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer hover:text-[#00a854]">
                  <input
                    type="radio"
                    name="amenity"
                    checked={selectedAmenity === a}
                    onChange={() => updateParam('tienIch', a)}
                    className="text-[#00a854] focus:ring-[#00a854] accent-[#00a854]"
                  />
                  <span>{a}</span>
                </label>
              ))}
            </div>
          </div>
        </aside>

        {/* RESULTS LIST & GUEST PROMPT */}
        <main className="md:col-span-3 space-y-6">
          <GuestPromptBanner />

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">
                  <Skeleton className="h-44 w-full rounded-xl" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : filteredRooms.length === 0 ? (
            <EmptyState
              title="Không tìm thấy phòng phù hợp"
              description="Hãy thử nới lỏng các tiêu chí lọc như mức giá hoặc chọn khu vực lân cận."
              actionText="Xóa Tất Cả Bộ Lọc"
              onAction={clearAllFilters}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredRooms.map((room: Room) => (
                <RoomCard key={room.id} room={room} />
              ))}
            </div>
          )}

          {/* AI-Powered Recommendations */}
          <div className="pt-8">
            <AIRecommendationsSection />
          </div>
        </main>
      </div>

      {/* MOBILE FILTER MODAL / DRAWER */}
      <AnimatePresence>
        {isMobileFilterOpen && (
          <div className="fixed inset-0 z-50 flex">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={handleMobileClose}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            />

            <motion.div
              ref={mobileDrawerRef}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative ml-auto w-full max-w-sm bg-white h-full shadow-2xl z-10 flex flex-col overflow-hidden"
            >
              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <h3 className="font-black text-gray-950 text-base flex items-center gap-2">
                    <SlidersHorizontal className="w-5 h-5 text-[#00a854]" />
                    Bộ Lọc Tìm Kiếm
                  </h3>
                  <button onClick={handleMobileClose} className="p-1 rounded-full text-gray-400 hover:text-gray-700">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Verification Check */}
                <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <label className="flex items-center gap-2 text-xs font-black text-gray-950 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={mobileDraft.verified}
                      onChange={(e) => setMobileDraft((d) => ({ ...d, verified: e.target.checked }))}
                      className="w-4 h-4 rounded text-[#00a854] accent-[#00a854]"
                    />
                    <span>🛡️ Chỉ phòng đã xác minh</span>
                  </label>
                </div>

                {/* University selector */}
                <div className="space-y-2">
                  <label className="block text-xs font-black text-gray-900 uppercase flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-[#00a854]" /> Trường ĐH
                  </label>
                  <select
                    value={mobileDraft.school ? (universities.find((u) => isSchoolMatch(mobileDraft.school, u)) || mobileDraft.school) : ''}
                    onChange={(e) => setMobileDraft((d) => ({ ...d, school: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-xs font-bold text-gray-900"
                  >
                    <option value="">Tất cả các trường ĐH</option>
                    {universities.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>

                {/* District */}
                <div className="space-y-2">
                  <label className="block text-xs font-black text-gray-900 uppercase flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#00a854]" /> Khu vực
                  </label>
                  <select
                    value={mobileDraft.district}
                    onChange={(e) => setMobileDraft((d) => ({ ...d, district: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-xs font-bold text-gray-900"
                  >
                    <option value="">Tất cả khu vực</option>
                    {districts.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                {/* Room Type */}
                <div className="space-y-2">
                  <label className="block text-xs font-black text-gray-900 uppercase flex items-center gap-1.5">
                    <Home className="w-3.5 h-3.5 text-[#00a854]" /> Loại hình phòng
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setMobileDraft((d) => ({ ...d, type: '' }))}
                      className={`p-2 rounded-xl text-xs font-bold border ${!mobileDraft.type ? 'bg-[#00a854] text-white border-[#00a854]' : 'bg-gray-50 border-gray-200 text-gray-800'}`}
                    >
                      Tất cả
                    </button>
                    {roomTypes.map((t) => (
                      <button
                        key={t}
                        onClick={() => setMobileDraft((d) => ({ ...d, type: d.type === t ? '' : t }))}
                        className={`p-2 rounded-xl text-xs font-bold border ${mobileDraft.type === t ? 'bg-[#00a854] text-white border-[#00a854]' : 'bg-gray-50 border-gray-200 text-gray-800'}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price */}
                <div className="space-y-2">
                  <label className="block text-xs font-black text-gray-900 uppercase flex items-center gap-1.5">
                    <Banknote className="w-3.5 h-3.5 text-[#00a854]" /> Mức giá
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: 'Dưới 2.5Tr', value: '0-2500000' },
                      { label: '2.5 - 4Tr', value: '2500000-4000000' },
                      { label: '4 - 6Tr', value: '4000000-6000000' },
                      { label: 'Trên 6Tr', value: '6000000-99999999' },
                    ].map(({ label, value }) => (
                      <button
                        key={value}
                        onClick={() => setMobileDraft((d) => ({ ...d, price: d.price === value ? '' : value }))}
                        className={`p-2 rounded-xl text-xs font-bold border ${mobileDraft.price === value ? 'bg-[#00a854] text-white border-[#00a854]' : 'bg-gray-50 border-gray-200 text-gray-800'}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Amenities */}
                <div className="space-y-2">
                  <label className="block text-xs font-black text-gray-900 uppercase flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-[#00a854]" /> Tiện ích
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setMobileDraft((d) => ({ ...d, amenity: '' }))}
                      className={`p-2 rounded-xl text-xs font-bold border ${!mobileDraft.amenity ? 'bg-[#00a854] text-white border-[#00a854]' : 'bg-gray-50 border-gray-200 text-gray-800'}`}
                    >
                      Tất cả
                    </button>
                    {amenitiesList.map((a) => (
                      <button
                        key={a}
                        onClick={() => setMobileDraft((d) => ({ ...d, amenity: d.amenity === a ? '' : a }))}
                        className={`p-2 rounded-xl text-xs font-bold border ${mobileDraft.amenity === a ? 'bg-[#00a854] text-white border-[#00a854]' : 'bg-gray-50 border-gray-200 text-gray-800'}`}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Fixed bottom action bar */}
              <div className="px-5 py-4 border-t border-gray-100 bg-white flex gap-2 shrink-0">
                <button
                  onClick={() => setMobileDraft({ verified: false, school: '', district: '', price: '', type: '', amenity: '' })}
                  className="w-1/2 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl text-xs"
                >
                  Xóa lọc
                </button>
                <button
                  onClick={applyMobileFilters}
                  className="w-1/2 py-3 bg-[#00a854] text-white font-black rounded-xl text-xs shadow-md"
                >
                  Áp dụng {mobileDraftFilterCount > 0 ? `(${mobileDraftFilterCount})` : ''}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
