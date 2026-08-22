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
} from 'lucide-react';

export const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { rooms } = useAppStore();
  const { isMobileFilterOpen, toggleMobileFilter, closeAllSheets } = useUIStore();

  const mobileDrawerRef = useRef<HTMLDivElement>(null);
  useOutsideClick(mobileDrawerRef, closeAllSheets, isMobileFilterOpen);

  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters State from URL
  const searchQuery = searchParams.get('q') || searchParams.get('truong') || '';
  const selectedDistrict = searchParams.get('khuVuc') || '';
  const selectedPrice = searchParams.get('gia') || '';
  const selectedType = searchParams.get('loai') || '';
  const selectedSort = searchParams.get('sort') || 'newest';
  const selectedAmenity = searchParams.get('tienIch') || '';

  // Simulate network fetch
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 350);
    return () => clearTimeout(timer);
  }, [searchParams]);

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
  ];
  const roomTypes = ['Phòng đơn', 'Studio', 'Phòng ghép', 'Căn hộ mini'];
  const amenitiesList = ['Máy lạnh', 'Tủ lạnh', 'Gác lửng', 'Ban công', 'Bếp', 'Wifi', 'Bảo vệ 24/7'];

// Helper to remove Vietnamese tones for fuzzy searching
function removeVietnameseTones(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

  // Filtered & Sorted Rooms
  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      // Keyword/University/Landmark search query filter
      if (searchQuery) {
        const normQ = removeVietnameseTones(searchQuery.trim());
        const matchTitle = removeVietnameseTones(r.title).includes(normQ);
        const matchAddress = removeVietnameseTones(r.address).includes(normQ);
        const matchDistrict = removeVietnameseTones(r.district).includes(normQ);
        const matchDesc = removeVietnameseTones(r.description).includes(normQ);
        const matchSchool = r.nearestSchool && removeVietnameseTones(r.nearestSchool).includes(normQ);
        if (!matchTitle && !matchAddress && !matchDistrict && !matchDesc && !matchSchool) {
          return false;
        }
      }

      // District filter
      if (selectedDistrict && r.district !== selectedDistrict) return false;

      // Type filter
      if (selectedType && r.type !== selectedType) return false;

      // Amenity filter
      if (selectedAmenity && !r.amenities.some((a) => a.toLowerCase().includes(selectedAmenity.toLowerCase()))) {
        return false;
      }

      // Price filter
      if (selectedPrice) {
        const [min, max] = selectedPrice.split('-').map(Number);
        if (r.price < min || r.price > max) return false;
      }

      return true;
    }).sort((a, b) => {
      // Prioritize boosted rooms at the top
      if (a.isBoosted && !b.isBoosted) return -1;
      if (!a.isBoosted && b.isBoosted) return 1;

      if (selectedSort === 'price_asc') return a.price - b.price;
      if (selectedSort === 'price_desc') return b.price - a.price;
      if (selectedSort === 'distance') return a.distanceToSchoolKm - b.distanceToSchoolKm;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [rooms, searchQuery, selectedDistrict, selectedPrice, selectedType, selectedSort, selectedAmenity]);

  const activeFilterCount = [searchQuery, selectedDistrict, selectedPrice, selectedType, selectedAmenity].filter(Boolean).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <SEOHead
        title={selectedDistrict ? `Tìm Phòng Trọ ${selectedDistrict} | TroXinh Hà Nội` : `Tìm Phòng Trọ Hà Nội (${filteredRooms.length} phòng) | TroXinh`}
        description={`Xem ${filteredRooms.length} phòng trọ đã kiểm duyệt tại Hà Nội ${selectedDistrict ? `khu vực ${selectedDistrict}` : ''}. Lọc theo khoảng cách trường học, mức giá, tiện nghi.`}
        url={`/tim-kiem${searchParams.toString() ? `?${searchParams.toString()}` : ''}`}
      />

      {/* Instant Search Autocomplete Bar on /tim-kiem */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-gray-200 shadow-xs">
        <SearchAutocomplete
          initialValue={searchQuery}
          placeholder="Tìm phòng theo trường ĐH, quận, hoặc địa danh (vd: Bách Khoa, Cầu Giấy, Chùa Láng...)"
          onSelect={(val, type) => {
            if (type === 'district') {
              updateParam('khuVuc', val);
            } else if (type === 'university') {
              const next = new URLSearchParams(searchParams);
              next.set('truong', val);
              next.set('q', val);
              setSearchParams(next);
            } else {
              updateParam('q', val);
            }
          }}
        />
      </div>

      {/* Top Search Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Danh Sách Phòng Trọ Cho Thuê
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Hiển thị <span className="font-bold text-[#006d37]">{filteredRooms.length}</span> phòng trọ đã qua kiểm duyệt thực tế tại Hà Nội
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Map view button */}
          <Link to={`/ban-do?${searchParams.toString()}`}>
            <Button variant="outline" size="sm" leftIcon={<Map className="w-4 h-4 text-[#006d37]" />}>
              Xem trên bản đồ
            </Button>
          </Link>

          {/* Mobile Filter trigger */}
          <button
            onClick={toggleMobileFilter}
            className="md:hidden relative flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 shadow-xs active:scale-95 transition"
            aria-expanded={isMobileFilterOpen}
          >
            <SlidersHorizontal className="w-4 h-4 text-[#006d37]" />
            <span>Bộ lọc</span>
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 bg-[#006d37] text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Applied Filter Chips */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-gray-500 font-semibold">Đang lọc:</span>
          {searchQuery && (
            <span className="inline-flex items-center gap-1 bg-emerald-50 text-[#006d37] px-2.5 py-1 rounded-full border border-emerald-200 font-medium">
              Từ khóa: "{searchQuery}"
              <button onClick={() => {
                const next = new URLSearchParams(searchParams);
                next.delete('q');
                next.delete('truong');
                setSearchParams(next);
              }}><X className="w-3 h-3 hover:text-rose-600" /></button>
            </span>
          )}
          {selectedDistrict && (
            <span className="inline-flex items-center gap-1 bg-emerald-50 text-[#006d37] px-2.5 py-1 rounded-full border border-emerald-200 font-medium">
              Khu vực: {selectedDistrict}
              <button onClick={() => updateParam('khuVuc', '')}><X className="w-3 h-3 hover:text-rose-600" /></button>
            </span>
          )}
          {selectedPrice && (
            <span className="inline-flex items-center gap-1 bg-emerald-50 text-[#006d37] px-2.5 py-1 rounded-full border border-emerald-200 font-medium">
              Giá: {selectedPrice.split('-')[0]}đ - {selectedPrice.split('-')[1]}đ
              <button onClick={() => updateParam('gia', '')}><X className="w-3 h-3 hover:text-rose-600" /></button>
            </span>
          )}
          {selectedType && (
            <span className="inline-flex items-center gap-1 bg-emerald-50 text-[#006d37] px-2.5 py-1 rounded-full border border-emerald-200 font-medium">
              Loại: {selectedType}
              <button onClick={() => updateParam('loai', '')}><X className="w-3 h-3 hover:text-rose-600" /></button>
            </span>
          )}
          <button
            onClick={clearAllFilters}
            className="text-xs text-rose-600 font-semibold hover:underline flex items-center gap-1 ml-2"
          >
            <RotateCcw className="w-3 h-3" /> Xóa tất cả
          </button>
        </div>
      )}

      {/* Main Content Layout: Sidebar + Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
        {/* DESKTOP FILTER SIDEBAR */}
        <aside className="hidden md:block bg-white rounded-2xl border border-gray-200 p-5 space-y-6 sticky top-24 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[#006d37]" />
              Bộ Lọc Tìm Kiếm
            </h3>
            {activeFilterCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="text-xs text-gray-400 hover:text-rose-600 transition"
              >
                Đặt lại
              </button>
            )}
          </div>

          {/* District Filter */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-700 uppercase">Khu vực (Hà Nội)</label>
            <select
              value={selectedDistrict}
              onChange={(e) => updateParam('khuVuc', e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#006d37]"
            >
              <option value="">Tất cả khu vực</option>
              {districts.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Price Range */}
          <div className="space-y-2 pt-3 border-t border-gray-100">
            <label className="block text-xs font-bold text-gray-700 uppercase">Mức giá</label>
            <div className="space-y-1">
              <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer hover:text-[#006d37]">
                <input
                  type="radio"
                  name="price"
                  checked={!selectedPrice}
                  onChange={() => updateParam('gia', '')}
                  className="text-[#006d37] focus:ring-[#006d37]"
                />
                <span>Tất cả mức giá</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer hover:text-[#006d37]">
                <input
                  type="radio"
                  name="price"
                  checked={selectedPrice === '0-2000000'}
                  onChange={() => updateParam('gia', '0-2000000')}
                  className="text-[#006d37] focus:ring-[#006d37]"
                />
                <span>Dưới 2 triệu</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer hover:text-[#006d37]">
                <input
                  type="radio"
                  name="price"
                  checked={selectedPrice === '2000000-3500000'}
                  onChange={() => updateParam('gia', '2000000-3500000')}
                  className="text-[#006d37] focus:ring-[#006d37]"
                />
                <span>2 - 3.5 triệu</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer hover:text-[#006d37]">
                <input
                  type="radio"
                  name="price"
                  checked={selectedPrice === '3500000-5000000'}
                  onChange={() => updateParam('gia', '3500000-5000000')}
                  className="text-[#006d37] focus:ring-[#006d37]"
                />
                <span>3.5 - 5 triệu</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer hover:text-[#006d37]">
                <input
                  type="radio"
                  name="price"
                  checked={selectedPrice === '5000000-99999999'}
                  onChange={() => updateParam('gia', '5000000-99999999')}
                  className="text-[#006d37] focus:ring-[#006d37]"
                />
                <span>Trên 5 triệu</span>
              </label>
            </div>
          </div>

          {/* Amenities */}
          <div className="space-y-2 pt-3 border-t border-gray-100">
            <label className="block text-xs font-bold text-gray-700 uppercase">Tiện ích kèm theo</label>
            <div className="space-y-1">
              <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer hover:text-[#006d37]">
                <input
                  type="radio"
                  name="amenity"
                  checked={!selectedAmenity}
                  onChange={() => updateParam('tienIch', '')}
                  className="text-[#006d37] focus:ring-[#006d37]"
                />
                <span>Tất cả</span>
              </label>
              {amenitiesList.map((a) => (
                <label key={a} className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer hover:text-[#006d37]">
                  <input
                    type="radio"
                    name="amenity"
                    checked={selectedAmenity === a}
                    onChange={() => updateParam('tienIch', a)}
                    className="text-[#006d37] focus:ring-[#006d37]"
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
              {filteredRooms.map((room) => (
                <RoomCard key={room.id} room={room} />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* MOBILE FILTER MODAL / DRAWER WITH ANIMATION & AUTO-CLOSE */}
      <AnimatePresence>
        {isMobileFilterOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center p-0 md:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
              onClick={closeAllSheets}
            />
            <motion.div
              ref={mobileDrawerRef}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
              className="relative w-full bg-white rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto space-y-6 z-10 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <h3 className="font-bold text-gray-900 text-base">Bộ Lọc Tìm Kiếm</h3>
                <button onClick={closeAllSheets} className="p-1 text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* District */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 uppercase">Khu vực</label>
                <select
                  value={selectedDistrict}
                  onChange={(e) => updateParam('khuVuc', e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-xs text-gray-800"
                >
                  <option value="">Tất cả khu vực</option>
                  {districts.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* Price */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 uppercase">Khoảng giá</label>
                <select
                  value={selectedPrice}
                  onChange={(e) => updateParam('gia', e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-xs text-gray-800"
                >
                  <option value="">Tất cả mức giá</option>
                  <option value="0-2000000">Dưới 2 triệu</option>
                  <option value="2000000-3500000">2 - 3.5 triệu</option>
                  <option value="3500000-5000000">3.5 - 5 triệu</option>
                  <option value="5000000-99999999">Trên 5 triệu</option>
                </select>
              </div>

              {/* Type */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 uppercase">Loại phòng</label>
                <select
                  value={selectedType}
                  onChange={(e) => updateParam('loai', e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-xs text-gray-800"
                >
                  <option value="">Tất cả loại phòng</option>
                  {roomTypes.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <Button variant="outline" size="md" className="flex-1" onClick={clearAllFilters}>
                  Đặt lại
                </Button>
                <Button variant="primary" size="md" className="flex-1" onClick={closeAllSheets}>
                  Áp Dụng ({filteredRooms.length})
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
