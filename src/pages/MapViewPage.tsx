import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { Room } from '../types';
import { RoomCard, HorizontalRoomCard, formatPrice } from '../components/ui/Cards';
import { Button } from '../components/ui/Button';
import { TroXinhMap, HANOI_UNIVERSITIES, DISTRICT_CENTERS } from '../components/map/TroXinhMap';
import {
  List,
  MapPin,
  Navigation,
  ArrowLeft,
  GraduationCap,
  SlidersHorizontal,
  Compass,
  Search,
  CheckCircle2,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const HANOI_DISTRICTS = [
  'Cầu Giấy', 'Đống Đa', 'Thanh Xuân', 'Hà Đông', 
  'Nam Từ Liêm', 'Bắc Từ Liêm', 'Hai Bà Trưng', 
  'Ba Đình', 'Hoàng Mai', 'Tây Hồ', 'Long Biên', 'Hoàn Kiếm'
];

import { useRooms } from '../hooks/queries/useRooms';

const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Bán kính trái đất (km)
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Khoảng cách (km)
};

export const MapViewPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { rooms, showToast } = useAppStore();
  const { data: cloudRooms } = useRooms();

  const activeRooms: Room[] = (cloudRooms && cloudRooms.length > 0 ? cloudRooms : rooms) as unknown as Room[];

  const [activeRoomId, setActiveRoomId] = useState<string | null>(activeRooms[0]?.id || null);
  const [mobileTab, setMobileTab] = useState<'map' | 'list'>('map');
  const [priceRange, setPriceRange] = useState<string>('all');
  const [keyword, setKeyword] = useState<string>('');
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [showUniversities, setShowUniversities] = useState<boolean>(false);
  const [showRooms, setShowRooms] = useState<boolean>(true);
  const [showMetroBus, setShowMetroBus] = useState<boolean>(false);
  const [isLayerPanelOpen, setIsLayerPanelOpen] = useState<boolean>(true);
  const [activeUniversity, setActiveUniversity] = useState<{ name: string; coords: [number, number] } | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);

  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const districtScrollRef = useRef<HTMLDivElement>(null);

  const scrollDistricts = (direction: 'left' | 'right') => {
    if (districtScrollRef.current) {
      const scrollAmount = 200;
      districtScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // Nếu người dùng thay đổi từ khóa tìm kiếm mà khác với tên trường đang chọn, xóa trạng thái trường
  useEffect(() => {
    if (activeUniversity && keyword !== activeUniversity.name) {
      setActiveUniversity(null);
    }
  }, [keyword, activeUniversity]);

  const handleSelectUniversity = (uni: { name: string; coords: [number, number] }) => {
    setActiveUniversity(uni);
    setKeyword(uni.name); // Tự động điền từ khóa để lọc các phòng gần trường này
  };

  // Filtered rooms on map
  const filteredRooms = useMemo(() => {
    return (activeRooms || []).filter((r: any) => {

      // Price filter
      if (priceRange === 'under_2m' && r.price >= 2000000) return false;
      if (priceRange === '2m_3.5m' && (r.price < 2000000 || r.price > 3500000)) return false;
      if (priceRange === 'over_3.5m' && r.price <= 3500000) return false;

      // Keyword search
      if (keyword.trim()) {
        if (activeUniversity && keyword === activeUniversity.name) {
          // Lọc theo bán kính (VD: 4.5km) quanh trường thay vì tìm text chính xác
          const cleanDistrict = r.district?.replace('Quận ', '').replace('Huyện ', '') || 'Cầu Giấy';
          const center = DISTRICT_CENTERS[cleanDistrict] || { lat: 21.0333, lng: 105.7937 };
          const dist = getDistance(
            activeUniversity.coords[0], activeUniversity.coords[1],
            center.lat, center.lng
          );
          if (dist > 4.5) return false;
        } else {
          const q = keyword.toLowerCase();
          const matchTitle = (r.title || '').toLowerCase().includes(q);
          const matchAddr = (r.address || '').toLowerCase().includes(q);
          const matchDistrict = (r.district || '').toLowerCase().includes(q);
          const matchSchool = r.nearestSchool?.toLowerCase().includes(q);
          if (!matchTitle && !matchAddr && !matchDistrict && !matchSchool) return false;
        }
      }

      return true;
    });
  }, [activeRooms, priceRange, keyword]);

  const handleSelectRoom = (roomId: string) => {
    setActiveRoomId(roomId);
    const cardEl = cardRefs.current[roomId];
    if (cardEl) {
      cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  // Get User GPS Location
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      showToast('Trình duyệt không hỗ trợ GPS', 'Vui lòng kiểm tra cài đặt trình duyệt của bạn.', 'error');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setIsLocating(false);
        const userCoords: [number, number] = [position.coords.latitude, position.coords.longitude];
        setUserLocation(userCoords);
        showToast('Đã định vị thành công! 📍', 'Bản đồ đang hiển thị các phòng trọ quanh vị trí của bạn.', 'success');
      },
      (error) => {
        setIsLocating(false);
        // Default to Cầu Giấy demo center if blocked
        setUserLocation([21.0333, 105.7937]);
        showToast('Vị trí mẫu (Hà Nội)', 'Đã lấy tọa độ trung tâm khu vực Cầu Giấy, Hà Nội.', 'info');
      },
      { timeout: 8000 }
    );
  };

  // Lazy load Leaflet CSS only when MapViewPage is mounted
  useEffect(() => {
    const leafletId = 'leaflet-dynamic-css';
    if (!document.getElementById(leafletId)) {
      const link = document.createElement('link');
      link.id = leafletId;
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.crossOrigin = '';
      document.head.appendChild(link);
    }
  }, []);

  return (
    <div className="h-[calc(100dvh-70px)] lg:h-[calc(100dvh-76px)] flex flex-col overflow-hidden bg-gray-50 relative -mt-[1px]">
      {/* Top Map Filter Sub-bar */}
      <div className="bg-white border-b border-gray-200 z-20 shrink-0 shadow-xs relative">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2.5 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Link
                to={`/tim-phong?${searchParams.toString()}`}
                className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-700 transition"
                title="Quay lại danh sách"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h2 className="text-sm font-black text-gray-950 leading-tight flex items-center gap-1.5">
                  <span>Bản Đồ Nhà Trọ Đã Xác Minh</span>
                  <span className="bg-emerald-100 text-[#006d37] text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {filteredRooms.length} phòng
                  </span>
                </h2>
                <p className="text-[11px] text-gray-500 font-medium hidden sm:block">
                  Hiển thị mức giá thực tế và vị trí đã kiểm duyệt 100%
                </p>
              </div>
            </div>

            {/* Action Tools */}
            <div className="flex items-center gap-2">
              {/* GPS Location Button */}
              <button
                onClick={handleGetLocation}
                disabled={isLocating}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition ${
                  userLocation
                    ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-xs'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
                title="Định vị vị trí hiện tại của bạn"
              >
                <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin text-blue-600' : 'text-blue-600'}`} />
                <span className="hidden sm:inline">{userLocation ? 'Đang bật GPS' : 'Vị trí của tôi'}</span>
              </button>


              <Link to={`/tim-phong?${searchParams.toString()}`} className="hidden md:block">
                <Button variant="outline" size="sm" leftIcon={<List className="w-4 h-4 text-[#00a854]" />}>
                  Xem danh sách
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* District Horizontal Scroll Bar */}
      <div className="bg-emerald-50/70 border-b border-emerald-100/50 z-10 shrink-0 relative shadow-xs overflow-hidden">
        <div className="max-w-7xl mx-auto px-3 py-2 flex items-center relative">
          <button 
          onClick={() => scrollDistricts('left')}
          className="absolute left-0 z-10 p-1.5 bg-emerald-50/90 backdrop-blur shadow-[2px_0_4px_rgba(0,0,0,0.05)] hover:bg-emerald-100 flex items-center justify-center border-r border-emerald-100/50"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        
        <div 
          ref={districtScrollRef}
          className="flex items-center gap-2 overflow-x-auto no-scrollbar px-6 w-full scroll-smooth"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <button
            onClick={() => setSelectedDistrict(null)}
            className={`whitespace-nowrap px-4 py-1.5 text-[13px] font-bold rounded-full transition-all border ${
              selectedDistrict === null 
                ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm' 
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
            }`}
          >
            Tất cả
          </button>
          {HANOI_DISTRICTS.map((district) => (
            <button
              key={district}
              onClick={() => setSelectedDistrict(district)}
              className={`whitespace-nowrap px-4 py-1.5 text-[13px] font-bold rounded-full transition-all border ${
                selectedDistrict === district 
                  ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm' 
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
              }`}
            >
              {district}
            </button>
          ))}
        </div>

        <button 
          onClick={() => scrollDistricts('right')}
          className="absolute right-0 z-10 p-1.5 bg-emerald-50/90 backdrop-blur shadow-[-2px_0_4px_rgba(0,0,0,0.05)] hover:bg-emerald-100 flex items-center justify-center border-l border-emerald-100/50"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>
      </div>

      {/* Main Split Layout */}
      <div className="flex-1 flex overflow-hidden relative w-full max-w-7xl mx-auto border-x border-gray-200 bg-white">
        {/* Left Scrollable List */}
        <div
          className={`w-full md:w-[400px] lg:w-[450px] bg-white border-r border-gray-200 overflow-y-auto p-4 space-y-4 shrink-0 transition-transform md:translate-x-0 z-10 ${
            mobileTab === 'list' ? 'block' : 'hidden md:block'
          }`}
        >
          {/* Search Bar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Nhập địa điểm tìm kiếm cụ thể..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#006d37] focus:border-transparent text-sm transition font-medium"
            />
          </div>

          <div className="flex items-center justify-between pb-1">
            <p className="text-xs text-gray-500 font-medium">Bấm vào phòng để xem vị trí:</p>
            <span className="text-[11px] font-bold text-[#006d37] bg-emerald-50 px-2 py-0.5 rounded-md">
              {filteredRooms.length} kết quả
            </span>
          </div>

          {/* Price Pills */}
          <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-gray-100">
            <button
              onClick={() => setPriceRange('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                priceRange === 'all'
                  ? 'bg-[#00a854] text-white border border-[#00a854]'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              Tất cả giá
            </button>
            <button
              onClick={() => setPriceRange('under_2m')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                priceRange === 'under_2m'
                  ? 'bg-[#00a854] text-white border border-[#00a854]'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              &lt; 2 triệu
            </button>
            <button
              onClick={() => setPriceRange('2m_3.5m')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                priceRange === '2m_3.5m'
                  ? 'bg-[#00a854] text-white border border-[#00a854]'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              2 - 3.5 triệu
            </button>
            <button
              onClick={() => setPriceRange('over_3.5m')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                priceRange === 'over_3.5m'
                  ? 'bg-[#00a854] text-white border border-[#00a854]'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              &gt; 3.5 triệu
            </button>
          </div>

          {filteredRooms.length === 0 ? (
            <div className="text-center py-12 space-y-3 bg-gray-50 rounded-2xl p-6 border border-dashed border-gray-200">
              <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-800">Không tìm thấy phòng trọ phù hợp</p>
                <p className="text-[11px] text-gray-500 mt-1">Hãy thử chọn "Tất cả khu vực" hoặc mở rộng khoảng giá.</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPriceRange('all');
                  setKeyword('');
                }}
              >
                Đặt lại bộ lọc
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredRooms.map((room: Room) => (
                <div
                  key={room.id}
                  ref={(el) => (cardRefs.current[room.id] = el)}
                  onClick={() => {
                    setActiveRoomId(room.id);
                    if (window.innerWidth < 768) setMobileTab('map');
                  }}
                  className={`cursor-pointer transition rounded-2xl ${
                    activeRoomId === room.id
                      ? 'ring-2 ring-[#006d37] shadow-md scale-[1.01]'
                      : 'opacity-90 hover:opacity-100'
                  }`}
                >
                  <HorizontalRoomCard room={room} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Real Leaflet Interactive Map */}
        <div
          className={`flex-1 relative bg-gray-100 overflow-hidden ${
            mobileTab === 'map' ? 'block' : 'hidden md:block'
          }`}
        >
          <TroXinhMap
            rooms={showRooms ? filteredRooms : []}
            activeRoomId={activeRoomId}
            onSelectRoom={handleSelectRoom}
            userLocation={userLocation}
            universityRadiusCenter={activeUniversity ? activeUniversity.coords : null}
            zoom={userLocation ? 14 : activeUniversity ? 14 : 13}
            showUniversities={showUniversities}
            showMetroBus={showMetroBus}
            onSelectUniversity={handleSelectUniversity}
            selectedDistrict={selectedDistrict}
          />

          {/* Map Display Layers Panel */}
          <div className="absolute top-4 right-4 z-10 bg-white/95 backdrop-blur-md rounded-2xl border border-blue-100 shadow-xl w-[190px] overflow-hidden">
            <div 
              className="px-3.5 py-2.5 bg-blue-50 border-b border-blue-100 flex items-center justify-between cursor-pointer hover:bg-blue-100 transition-colors"
              onClick={() => setIsLayerPanelOpen(!isLayerPanelOpen)}
            >
              <span className="text-xs font-black text-blue-700 tracking-wider uppercase">Lớp hiển thị</span>
              <SlidersHorizontal className={`w-4 h-4 text-blue-600 transition-transform duration-300 ${isLayerPanelOpen ? 'rotate-180' : ''}`} />
            </div>
            
            {isLayerPanelOpen && (
              <div className="p-1.5 flex flex-col gap-0.5 animate-fadeIn">
                <label className="flex items-center justify-between px-2.5 py-2 hover:bg-gray-50 rounded-xl cursor-pointer transition">
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                      <GraduationCap className="w-3 h-3 text-blue-600" />
                    </div>
                    <span className="text-[11px] font-medium text-gray-700">Trường Đại Học</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={showUniversities}
                    onChange={(e) => setShowUniversities(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                </label>
                
                <label className="flex items-center justify-between px-2.5 py-2 hover:bg-gray-50 rounded-xl cursor-pointer transition">
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                      <span className="text-[10px]">🏠</span>
                    </div>
                    <span className="text-[11px] font-medium text-gray-700">Phòng trọ</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={showRooms}
                    onChange={(e) => setShowRooms(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-[#00a854] focus:ring-[#00a854] border-gray-300"
                  />
                </label>

                <label className="flex items-center justify-between px-2.5 py-2 hover:bg-gray-50 rounded-xl cursor-pointer transition">
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center">
                      <span className="text-[10px]">🚊</span>
                    </div>
                    <span className="text-[11px] font-medium text-gray-700">Ga Metro & Bus</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={showMetroBus}
                    onChange={(e) => setShowMetroBus(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-orange-500 focus:ring-orange-500 border-gray-300"
                  />
                </label>
              </div>
            )}
          </div>

          {/* Mobile Bottom Room Preview Card (Slide-up on marker tap) */}
          {(() => {
            const activeRoom = rooms.find((r) => r.id === activeRoomId);
            if (!activeRoom) return null;
            return (
              <div
                className="md:hidden absolute left-3 right-3 z-20 bg-white rounded-3xl p-3 shadow-2xl border border-gray-200 tap-bounce animate-fadeIn"
                style={{ bottom: 'calc(var(--mobile-bottom-offset, 3.5rem) + 3.5rem)' }}
              >
                <div className="flex items-center gap-3">
                  <img
                    src={activeRoom.images?.[0] || '/images/hero-banner.webp'}
                    alt={activeRoom.title}
                    className="w-18 h-18 rounded-2xl object-cover shrink-0"
                  />
                  <div className="flex-1 overflow-hidden space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-[#006d37] bg-emerald-50 px-2 py-0.5 rounded-full">
                        {formatPrice(activeRoom.price)}
                      </span>
                      <span className="text-[10px] text-gray-400 font-bold">{activeRoom.area}m²</span>
                    </div>
                    <h4 className="text-xs font-bold text-gray-900 truncate">{activeRoom.title}</h4>
                    <p className="text-[10px] text-gray-500 truncate flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                      {activeRoom.address}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-2 mt-2 border-t border-gray-100">
                  <Link to={`/phong/${activeRoom.id}`} className="flex-1">
                    <Button variant="primary" size="sm" className="w-full text-xs font-bold min-h-[38px]">
                      Xem Chi Tiết Phòng
                    </Button>
                  </Link>
                  <Link to={`/dat-lich/${activeRoom.id}`}>
                    <Button variant="outline" size="sm" className="text-xs font-bold min-h-[38px]">
                      Đặt Lịch
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Mobile Floating View Switcher (Bản đồ / Danh sách) - Luôn nổi và không bị bottom nav che */}
      <div
        className="md:hidden fixed z-30 left-1/2 -translate-x-1/2 flex items-center bg-gray-950/90 backdrop-blur-md text-white rounded-full p-1 shadow-2xl border border-white/20"
        style={{ bottom: 'calc(var(--mobile-bottom-offset, 3.5rem) + 0.75rem)' }}
      >
        <button
          onClick={() => setMobileTab('map')}
          className={`px-3.5 py-1.5 text-xs font-black rounded-full transition flex items-center gap-1.5 ${
            mobileTab === 'map' ? 'bg-[#00a854] text-white shadow-md' : 'text-gray-300 hover:text-white'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>Bản đồ</span>
        </button>
        <button
          onClick={() => setMobileTab('list')}
          className={`px-3.5 py-1.5 text-xs font-black rounded-full transition flex items-center gap-1.5 ${
            mobileTab === 'list' ? 'bg-[#00a854] text-white shadow-md' : 'text-gray-300 hover:text-white'
          }`}
        >
          <List className="w-3.5 h-3.5" />
          <span>Danh sách ({filteredRooms.length})</span>
        </button>
      </div>
    </div>
  );
};
