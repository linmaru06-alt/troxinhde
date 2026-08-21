import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { RoomCard } from '../components/ui/Cards';
import { Button } from '../components/ui/Button';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { GuestPromptBanner } from '../components/search/GuestPromptBanner';
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

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showMobileFilter, setShowMobileFilter] = useState<boolean>(false);

  // Filters State from URL
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

  const districts = ['Quận Bình Thạnh', 'Quận Tân Bình', 'TP. Thủ Đức', 'Quận 10', 'Quận Gò Vấp', 'Quận 1'];
  const roomTypes = ['Phòng đơn', 'Studio', 'Phòng ghép', 'Căn hộ mini'];
  const amenitiesList = ['Máy lạnh', 'Tủ lạnh', 'Gác lửng', 'Ban công', 'Bếp', 'Wifi', 'Bảo vệ 24/7'];

  // Filtered & Sorted Rooms
  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
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
      if (selectedSort === 'price_asc') return a.price - b.price;
      if (selectedSort === 'price_desc') return b.price - a.price;
      if (selectedSort === 'distance') return a.distanceToSchoolKm - b.distanceToSchoolKm;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [rooms, selectedDistrict, selectedPrice, selectedType, selectedSort, selectedAmenity]);

  const activeFilterCount = [selectedDistrict, selectedPrice, selectedType, selectedAmenity].filter(Boolean).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Search Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
            Danh Sách Phòng Trọ Cho Thuê
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Hiển thị <span className="font-bold text-[#006d37]">{filteredRooms.length}</span> phòng trọ đã qua kiểm duyệt thực tế tại TP.HCM
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
            onClick={() => setShowMobileFilter(true)}
            className="md:hidden relative flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 shadow-xs"
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
          {selectedDistrict && (
            <span className="inline-flex items-center gap-1 bg-emerald-50 text-[#006d37] px-2.5 py-1 rounded-full border border-emerald-200 font-medium">
              Khu vực: {selectedDistrict}
              <button onClick={() => updateParam('khuVuc', '')}><X className="w-3 h-3 hover:text-rose-600" /></button>
            </span>
          )}
          {selectedPrice && (
            <span className="inline-flex items-center gap-1 bg-emerald-50 text-[#006d37] px-2.5 py-1 rounded-full border border-emerald-200 font-medium">
              Giá: {selectedPrice === '0-2000000' ? '< 2 triệu' : selectedPrice === '2000000-3500000' ? '2 - 3.5 triệu' : selectedPrice === '3500000-5000000' ? '3.5 - 5 triệu' : '> 5 triệu'}
              <button onClick={() => updateParam('gia', '')}><X className="w-3 h-3 hover:text-rose-600" /></button>
            </span>
          )}
          {selectedType && (
            <span className="inline-flex items-center gap-1 bg-emerald-50 text-[#006d37] px-2.5 py-1 rounded-full border border-emerald-200 font-medium">
              Loại: {selectedType}
              <button onClick={() => updateParam('loai', '')}><X className="w-3 h-3 hover:text-rose-600" /></button>
            </span>
          )}
          {selectedAmenity && (
            <span className="inline-flex items-center gap-1 bg-emerald-50 text-[#006d37] px-2.5 py-1 rounded-full border border-emerald-200 font-medium">
              Tiện ích: {selectedAmenity}
              <button onClick={() => updateParam('tienIch', '')}><X className="w-3 h-3 hover:text-rose-600" /></button>
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
            <label className="block text-xs font-bold text-gray-700 uppercase">Khu vực / Quận</label>
            <div className="space-y-1">
              <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer hover:text-[#006d37]">
                <input
                  type="radio"
                  name="district"
                  checked={!selectedDistrict}
                  onChange={() => updateParam('khuVuc', '')}
                  className="text-[#006d37] focus:ring-[#006d37]"
                />
                <span>Tất cả khu vực</span>
              </label>
              {districts.map((d) => (
                <label key={d} className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer hover:text-[#006d37]">
                  <input
                    type="radio"
                    name="district"
                    checked={selectedDistrict === d}
                    onChange={() => updateParam('khuVuc', d)}
                    className="text-[#006d37] focus:ring-[#006d37]"
                  />
                  <span>{d}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Price Range Filter */}
          <div className="space-y-2 pt-3 border-t border-gray-100">
            <label className="block text-xs font-bold text-gray-700 uppercase">Mức giá thuê</label>
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

          {/* Room Type */}
          <div className="space-y-2 pt-3 border-t border-gray-100">
            <label className="block text-xs font-bold text-gray-700 uppercase">Loại phòng</label>
            <div className="space-y-1">
              <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer hover:text-[#006d37]">
                <input
                  type="radio"
                  name="type"
                  checked={!selectedType}
                  onChange={() => updateParam('loai', '')}
                  className="text-[#006d37] focus:ring-[#006d37]"
                />
                <span>Tất cả loại</span>
              </label>
              {roomTypes.map((t) => (
                <label key={t} className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer hover:text-[#006d37]">
                  <input
                    type="radio"
                    name="type"
                    checked={selectedType === t}
                    onChange={() => updateParam('loai', t)}
                    className="text-[#006d37] focus:ring-[#006d37]"
                  />
                  <span>{t}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Amenities */}
          <div className="space-y-2 pt-3 border-t border-gray-100">
            <label className="block text-xs font-bold text-gray-700 uppercase">Tiện ích kèm theo</label>
            <div className="flex flex-wrap gap-1.5">
              {amenitiesList.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => updateParam('tienIch', selectedAmenity === a ? '' : a)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border transition ${
                    selectedAmenity === a
                      ? 'bg-[#006d37] text-white border-[#006d37] font-semibold'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* RESULTS SECTION */}
        <main className="md:col-span-3 space-y-4">
          <GuestPromptBanner />

          {/* Sorting Bar */}
          <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-gray-200 text-xs">
            <span className="text-gray-500 font-medium hidden sm:inline">
              Sắp xếp theo:
            </span>
            <div className="flex items-center gap-1 sm:gap-2 w-full sm:w-auto justify-between sm:justify-end">
              <select
                value={selectedSort}
                onChange={(e) => updateParam('sort', e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-gray-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#006d37]"
              >
                <option value="newest">Mới nhất</option>
                <option value="price_asc">Giá: Thấp đến Cao</option>
                <option value="price_desc">Giá: Cao đến Thấp</option>
                <option value="distance">Gần trường đại học nhất</option>
              </select>
            </div>
          </div>

          {/* Skeletons or Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl p-4 border border-gray-200 space-y-3">
                  <Skeleton className="aspect-4/3 w-full rounded-xl" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ))}
            </div>
          ) : filteredRooms.length === 0 ? (
            <EmptyState
              icon="search"
              title="Không tìm thấy phòng phù hợp"
              description="Hãy thử nới lỏng các tiêu chí lọc giá, khu vực hoặc tiện ích để xem nhiều phòng trọ hơn nhé!"
              actionText="Xóa tất cả bộ lọc"
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

      {/* MOBILE FILTER MODAL / DRAWER */}
      {showMobileFilter && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 md:hidden">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setShowMobileFilter(false)} />
          <div className="relative w-full bg-white rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto space-y-6 z-10">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-base">Bộ Lọc Tìm Kiếm</h3>
              <button onClick={() => setShowMobileFilter(false)} className="p-1 text-gray-400"><X className="w-5 h-5" /></button>
            </div>

            {/* District */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 uppercase">Khu vực</label>
              <select
                value={selectedDistrict}
                onChange={(e) => updateParam('khuVuc', e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-xs"
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
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-xs"
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
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-xs"
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
              <Button variant="primary" size="md" className="flex-1" onClick={() => setShowMobileFilter(false)}>
                Áp Dụng ({filteredRooms.length})
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
