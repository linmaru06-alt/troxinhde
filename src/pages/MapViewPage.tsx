import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { Building, Room, RoommatePost } from '../types';
import { HorizontalRoomCard, formatPrice } from '../components/ui/Cards';
import { Button } from '../components/ui/Button';
import { TroXinhMap } from '../components/map/TroXinhMap';
import { isTargetDeletedRoom } from '../lib/roomSearch';
import {
  cleanDistrictName,
  geocodeAddressCached,
  getDistanceKm,
  isValidHanoiCoord,
  normalizeViText,
  resolveEntityCoordsSync,
} from '../lib/geocoding';
import {
  List,
  MapPin,
  Navigation,
  ArrowLeft,
  GraduationCap,
  SlidersHorizontal,
  Search,
  ChevronLeft,
  ChevronRight,
  Users,
  X,
} from 'lucide-react';

const HANOI_DISTRICTS = [
  'Cầu Giấy', 'Đống Đa', 'Thanh Xuân', 'Hà Đông',
  'Nam Từ Liêm', 'Bắc Từ Liêm', 'Hai Bà Trưng',
  'Ba Đình', 'Hoàng Mai', 'Tây Hồ', 'Long Biên', 'Hoàn Kiếm'
];

import { useRooms } from '../hooks/queries/useRooms';

export const MapViewPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { rooms, buildings, roommates, blockedUserIds, showToast } = useAppStore();
  const { data: cloudRooms } = useRooms();

  const initialLoai = searchParams.get('loai') || searchParams.get('tab') || 'all';
  const initialDistrictParam = searchParams.get('khuVuc') || '';
  const initialMatchedDistrict = initialDistrictParam
    ? HANOI_DISTRICTS.find((d) => normalizeViText(d) === normalizeViText(cleanDistrictName(initialDistrictParam))) || null
    : null;

  const [showRooms, setShowRooms] = useState<boolean>(initialLoai !== 'o-ghep' && initialLoai !== 'roommate');
  const [showRoommates, setShowRoommates] = useState<boolean>(initialLoai !== 'phong-tro' && initialLoai !== 'room');

  const buildingMap = useMemo(() => {
    const map = new Map<string, Building>();
    (buildings || []).forEach((b) => {
      if (b?.id) map.set(b.id, b);
    });
    return map;
  }, [buildings]);

  const activeRooms = useMemo<Room[]>(() => {
    const byId = new Map<string, any>();
    (cloudRooms || []).forEach((r: any) => {
      if (r?.id && !isTargetDeletedRoom(r)) {
        byId.set(r.id, r);
      }
    });
    (rooms || []).forEach((r: any) => {
      if (!r?.id || isTargetDeletedRoom(r)) return;
      const existing = byId.get(r.id);
      if (!existing) {
        byId.set(r.id, r);
      } else {
        byId.set(r.id, {
          ...existing,
          address: r.address || existing.address,
          district: r.district || existing.district,
          lat: r.lat ?? existing.lat,
          lng: r.lng ?? existing.lng,
        });
      }
    });
    return Array.from(byId.values()).filter((r) => !blockedUserIds.includes(r.ownerId));
  }, [cloudRooms, rooms, blockedUserIds]);

  const activeRoommates = useMemo<RoommatePost[]>(() => {
    return (roommates || []).filter(
      (rm) => !blockedUserIds.includes(rm.userId) && rm.status !== 'Đã ghép'
    );
  }, [roommates, blockedUserIds]);

  const [activeRoomId, setActiveRoomId] = useState<string | null>(
    initialLoai === 'o-ghep' || initialLoai === 'roommate' ? null : (activeRooms[0]?.id || null)
  );
  const [activeRoommateId, setActiveRoommateId] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<'map' | 'list'>('map');
  const [priceRange, setPriceRange] = useState<string>(searchParams.get('gia') || 'all');
  const [keyword, setKeyword] = useState<string>(searchParams.get('q') || '');
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [showUniversities, setShowUniversities] = useState<boolean>(false);
  const [isLayerPanelOpen, setIsLayerPanelOpen] = useState<boolean>(true);
  const [activeUniversity, setActiveUniversity] = useState<{ name: string; coords: [number, number] } | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(initialMatchedDistrict);
  const [resolvedCoordsMap, setResolvedCoordsMap] = useState<Record<string, { lat: number; lng: number }>>({});

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

  // Resolve coordinates synchronously & run background Nominatim lookup for addresses not in street dictionary
  const syncCoordsLookup = useMemo(() => {
    const map = new Map<string, { lat: number; lng: number; source: string; address?: string; district?: string; school?: string }>();
    const roomById = new Map<string, any>();

    (activeRooms || []).forEach((r: any) => {
      roomById.set(r.id, r);
      const bld = r.buildingId ? buildingMap.get(r.buildingId) : undefined;
      const bldLat = Number(r.buildings?.lat ?? bld?.geo?.lat);
      const bldLng = Number(r.buildings?.lng ?? bld?.geo?.lng);
      const bldAddr = r.buildings?.address ?? bld?.address;
      const addr = r.address || bldAddr;
      const dist = r.district || r.buildings?.district || bld?.district;

      const key = `room:${r.id}`;
      const cached = resolvedCoordsMap[key];
      if (cached) {
        map.set(key, { ...cached, source: 'geocoded', address: addr, district: dist, school: r.nearestSchool });
        return;
      }

      const resolved = resolveEntityCoordsSync({
        lat: typeof r.lat === 'number' ? r.lat : undefined,
        lng: typeof r.lng === 'number' ? r.lng : undefined,
        address: addr,
        district: dist,
        school: r.nearestSchool,
        buildingGeo: isValidHanoiCoord(bldLat, bldLng) ? { lat: bldLat, lng: bldLng } : null,
        buildingAddress: bldAddr,
      });
      map.set(key, { ...resolved, address: addr, district: dist, school: r.nearestSchool });
    });

    (activeRoommates || []).forEach((rm) => {
      const linked = rm.linkedRoomId ? roomById.get(rm.linkedRoomId) : undefined;
      const linkedBld = linked?.buildingId ? buildingMap.get(linked.buildingId) : undefined;
      const addr = rm.address || linked?.address || linkedBld?.address;
      const dist = rm.district || linked?.district || linkedBld?.district;
      const key = `roommate:${rm.id}`;

      const cached = resolvedCoordsMap[key];
      if (cached) {
        map.set(key, { ...cached, source: 'geocoded', address: addr, district: dist, school: rm.userSchool });
        return;
      }

      const resolved = resolveEntityCoordsSync({
        lat: rm.lat ?? linked?.lat,
        lng: rm.lng ?? linked?.lng,
        address: addr,
        district: dist,
        school: rm.userSchool,
        buildingGeo: linkedBld?.geo,
        buildingAddress: linkedBld?.address,
      });
      map.set(key, { ...resolved, address: addr, district: dist, school: rm.userSchool });
    });

    return map;
  }, [activeRooms, activeRoommates, buildingMap, resolvedCoordsMap]);

  useEffect(() => {
    let cancelled = false;
    const toLookup: Array<{ key: string; address?: string; district?: string; school?: string }> = [];

    syncCoordsLookup.forEach((info, key) => {
      if ((info.source === 'district' || info.source === 'school') && info.address && !resolvedCoordsMap[key]) {
        toLookup.push({
          key,
          address: info.address,
          district: info.district,
          school: info.school,
        });
      }
    });

    if (toLookup.length === 0) return;

    (async () => {
      for (const item of toLookup.slice(0, 12)) {
        if (cancelled) break;
        const coords = await geocodeAddressCached(item.address, item.district, item.school);
        if (!cancelled && coords) {
          setResolvedCoordsMap((prev) => (prev[item.key] ? prev : { ...prev, [item.key]: coords }));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [syncCoordsLookup, resolvedCoordsMap]);

  // Nếu người dùng thay đổi từ khóa tìm kiếm mà khác với tên trường đang chọn, xóa trạng thái trường
  useEffect(() => {
    if (activeUniversity && keyword !== activeUniversity.name) {
      setActiveUniversity(null);
    }
  }, [keyword, activeUniversity]);

  const handleSelectUniversity = (uni: { name: string; coords: [number, number] }) => {
    setActiveUniversity(uni);
    setKeyword(uni.name); // Tự động điền từ khóa để lọc các tin gần trường này
  };

  const handleMapClick = () => {
    if (activeUniversity) {
      setActiveUniversity(null);
      setKeyword('');
    }
  };

  // Filtered rooms on map
  const filteredRooms = useMemo(() => {
    const normSelectedDist = selectedDistrict ? normalizeViText(cleanDistrictName(selectedDistrict)) : '';

    return (activeRooms || []).filter((r: any) => {
      const bld = r.buildingId ? buildingMap.get(r.buildingId) : undefined;
      const roomAddr = r.address || r.buildings?.address || bld?.address || '';
      const roomDist = r.district || r.buildings?.district || bld?.district || '';

      // District filter
      if (normSelectedDist) {
        const normDist = normalizeViText(cleanDistrictName(roomDist));
        const normAddr = normalizeViText(roomAddr);
        if (!normDist.includes(normSelectedDist) && !normAddr.includes(normSelectedDist)) {
          return false;
        }
      }

      // Price filter
      if (priceRange === 'under_2m' && r.price >= 2000000) return false;
      if (priceRange === '2m_3.5m' && (r.price < 2000000 || r.price > 3500000)) return false;
      if (priceRange === 'over_3.5m' && r.price <= 3500000) return false;

      // Keyword / University filter
      if (keyword.trim()) {
        if (activeUniversity && keyword === activeUniversity.name) {
          const coords = syncCoordsLookup.get(`room:${r.id}`);
          const lat = coords?.lat ?? 21.0333;
          const lng = coords?.lng ?? 105.7937;
          const dist = getDistanceKm(
            activeUniversity.coords[0],
            activeUniversity.coords[1],
            lat,
            lng
          );
          if (dist > 4.5) return false;
        } else {
          const q = normalizeViText(keyword);
          const matchTitle = normalizeViText(r.title || '').includes(q);
          const matchAddr = normalizeViText(roomAddr).includes(q);
          const matchDistrict = normalizeViText(roomDist).includes(q);
          const matchSchool = normalizeViText(r.nearestSchool || '').includes(q);
          if (!matchTitle && !matchAddr && !matchDistrict && !matchSchool) return false;
        }
      }

      return true;
    });
  }, [activeRooms, buildingMap, selectedDistrict, priceRange, keyword, activeUniversity, syncCoordsLookup]);

  // Filtered roommate posts on map
  const filteredRoommates = useMemo(() => {
    const normSelectedDist = selectedDistrict ? normalizeViText(cleanDistrictName(selectedDistrict)) : '';

    return (activeRoommates || []).filter((rm) => {
      const rmAddr = rm.address || rm.linkedRoomTitle || '';
      const rmDist = rm.district || '';

      if (normSelectedDist) {
        const normDist = normalizeViText(cleanDistrictName(rmDist));
        const normAddr = normalizeViText(rmAddr);
        if (!normDist.includes(normSelectedDist) && !normAddr.includes(normSelectedDist)) {
          return false;
        }
      }

      // Budget share filter
      if (priceRange === 'under_2m' && rm.budgetShare >= 2000000) return false;
      if (priceRange === '2m_3.5m' && (rm.budgetShare < 2000000 || rm.budgetShare > 3500000)) return false;
      if (priceRange === 'over_3.5m' && rm.budgetShare <= 3500000) return false;

      if (keyword.trim()) {
        if (activeUniversity && keyword === activeUniversity.name) {
          const coords = syncCoordsLookup.get(`roommate:${rm.id}`);
          const lat = coords?.lat ?? 21.0333;
          const lng = coords?.lng ?? 105.7937;
          const dist = getDistanceKm(
            activeUniversity.coords[0],
            activeUniversity.coords[1],
            lat,
            lng
          );
          if (dist > 4.5) return false;
        } else {
          const q = normalizeViText(keyword);
          const matchName = normalizeViText(rm.userName || '').includes(q);
          const matchSchool = normalizeViText(rm.userSchool || '').includes(q);
          const matchAddr = normalizeViText(rmAddr).includes(q);
          const matchDistrict = normalizeViText(rmDist).includes(q);
          const matchIntro = normalizeViText(rm.intro || '').includes(q);
          if (!matchName && !matchSchool && !matchAddr && !matchDistrict && !matchIntro) return false;
        }
      }

      return true;
    });
  }, [activeRoommates, selectedDistrict, priceRange, keyword, activeUniversity, syncCoordsLookup]);

  const visibleRoomsCount = showRooms ? filteredRooms.length : 0;
  const visibleRoommatesCount = showRoommates ? filteredRoommates.length : 0;
  const totalVisibleCount = visibleRoomsCount + visibleRoommatesCount;

  const listingMode: 'all' | 'room' | 'roommate' =
    showRooms && showRoommates ? 'all' : showRooms ? 'room' : 'roommate';

  const handleListingModeChange = (mode: 'all' | 'room' | 'roommate') => {
    if (mode === 'all') {
      setShowRooms(true);
      setShowRoommates(true);
    } else if (mode === 'room') {
      setShowRooms(true);
      setShowRoommates(false);
      setActiveRoommateId(null);
    } else {
      setShowRooms(false);
      setShowRoommates(true);
      setActiveRoomId(null);
    }
  };

  const handleSelectRoom = (roomId: string) => {
    setActiveRoommateId(null);
    setActiveRoomId(roomId);
    const cardEl = cardRefs.current[`room:${roomId}`];
    if (cardEl) {
      cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const handleSelectRoommate = (roommateId: string) => {
    setActiveRoomId(null);
    setActiveRoommateId(roommateId);
    const cardEl = cardRefs.current[`rm:${roommateId}`];
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
        showToast('Đã định vị thành công! 📍', 'Bản đồ đang hiển thị các phòng trọ và tin ở ghép quanh vị trí của bạn.', 'success');
      },
      () => {
        setIsLocating(false);
        // Default to Cầu Giấy demo center if blocked
        setUserLocation([21.0333, 105.7937]);
        showToast('Vị trí mẫu (Hà Nội)', 'Đã lấy tọa độ trung tâm khu vực Cầu Giấy, Hà Nội.', 'info');
      },
      { timeout: 8000 }
    );
  };

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
                <h2 className="text-sm font-black text-gray-950 leading-tight flex flex-wrap items-center gap-1.5">
                  <span className="uppercase tracking-wide">BẢN ĐỒ TRỌ &amp; Ở GHÉP</span>
                  {showRooms && (
                    <span className="bg-emerald-100 text-[#006d37] text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {filteredRooms.length} phòng
                    </span>
                  )}
                  {showRoommates && (
                    <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {filteredRoommates.length} ở ghép
                    </span>
                  )}
                </h2>
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
                  ? 'bg-emerald-50 text-[#006d37] border-[#00a854]/50 shadow-sm'
                  : 'bg-white text-gray-700 border-[#00a854]/20 hover:bg-emerald-50/60 hover:border-[#00a854]/40'
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
                    ? 'bg-emerald-50 text-[#006d37] border-[#00a854]/50 shadow-sm'
                    : 'bg-white text-gray-700 border-[#00a854]/20 hover:bg-emerald-50/60 hover:border-[#00a854]/40'
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
          {/* Listing Type Filter (Tất cả / Phòng trọ / Ở ghép) */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-gray-100 rounded-xl">
            <button
              type="button"
              onClick={() => handleListingModeChange('all')}
              className={`py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                listingMode === 'all'
                  ? 'bg-white text-[#006d37] shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Tất cả ({filteredRooms.length + filteredRoommates.length})
            </button>
            <button
              type="button"
              onClick={() => handleListingModeChange('room')}
              className={`py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                listingMode === 'room'
                  ? 'bg-white text-[#006d37] shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🏠 Phòng ({filteredRooms.length})
            </button>
            <button
              type="button"
              onClick={() => handleListingModeChange('roommate')}
              className={`py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                listingMode === 'roommate'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              👥 Ở ghép ({filteredRoommates.length})
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Nhập tên đường, phố, ngõ, trường ĐH..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="block w-full pl-10 pr-8 py-2.5 border border-gray-200 rounded-xl leading-5 bg-gray-50 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#006d37] focus:border-transparent text-sm transition font-medium"
            />
            {keyword && (
              <button
                type="button"
                onClick={() => {
                  setKeyword('');
                  setActiveUniversity(null);
                }}
                className="absolute inset-y-0 right-2.5 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center justify-between pb-1">
            {selectedDistrict ? (
              <span className="text-[11px] font-semibold text-gray-500">
                Khu vực: <strong className="text-gray-800">{selectedDistrict}</strong>
              </span>
            ) : (
              <span className="text-[11px] text-gray-400 font-medium">Toàn bộ Hà Nội</span>
            )}
            <span className="text-[11px] font-bold text-[#006d37] bg-emerald-50 px-2 py-0.5 rounded-md">
              {totalVisibleCount} kết quả
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

          {totalVisibleCount === 0 ? (
            <div className="text-center py-12 space-y-3 bg-gray-50 rounded-2xl p-6 border border-dashed border-gray-200">
              <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-800">Không tìm thấy tin phù hợp trên bản đồ</p>
                <p className="text-[11px] text-gray-500 mt-1">Hãy thử chọn &quot;Tất cả&quot; khu vực hoặc mở rộng khoảng giá.</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setPriceRange('all');
                  setKeyword('');
                  setSelectedDistrict(null);
                  setActiveUniversity(null);
                  setShowRooms(true);
                  setShowRoommates(true);
                }}
              >
                Đặt lại bộ lọc
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {showRooms && filteredRooms.map((room: Room) => (
                <div
                  key={`room_${room.id}`}
                  ref={(el) => (cardRefs.current[`room:${room.id}`] = el)}
                  onClick={() => {
                    setActiveRoommateId(null);
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

              {showRoommates && filteredRoommates.length > 0 && (
                <div className="space-y-3 pt-1">
                  {showRooms && filteredRooms.length > 0 && (
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                      <Users className="w-3.5 h-3.5 text-indigo-600" />
                      <span className="text-[11px] font-black text-indigo-700 uppercase tracking-wider">
                        Tin tìm bạn ở ghép ({filteredRoommates.length})
                      </span>
                    </div>
                  )}

                  {filteredRoommates.map((rm) => (
                    <div
                      key={`rm_${rm.id}`}
                      ref={(el) => (cardRefs.current[`rm:${rm.id}`] = el)}
                      onClick={() => {
                        setActiveRoomId(null);
                        setActiveRoommateId(rm.id);
                        if (window.innerWidth < 768) setMobileTab('map');
                      }}
                      className={`cursor-pointer transition rounded-2xl bg-white border p-3 flex gap-3 hover:border-indigo-300 ${
                        activeRoommateId === rm.id
                          ? 'ring-2 ring-indigo-600 border-indigo-400 shadow-md scale-[1.01]'
                          : 'border-gray-200/90 opacity-95 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={rm.userAvatar || '/images/user-avatar.jpg'}
                        alt={rm.userName}
                        className="w-12 h-12 rounded-full object-cover border-2 border-indigo-100 shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/images/user-avatar.jpg';
                        }}
                      />
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase">
                            👥 Ở ghép • {rm.genderPreference}
                          </span>
                          <span className="text-xs font-black text-indigo-700 shrink-0">
                            {formatPrice(rm.budgetShare)}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-gray-900 truncate">
                          {rm.userName} ({rm.userAge} tuổi • {rm.userGender})
                        </h4>
                        {rm.userSchool && (
                          <p className="text-[11px] text-[#006d37] font-semibold truncate flex items-center gap-1">
                            <GraduationCap className="w-3 h-3 shrink-0" />
                            <span className="truncate">{rm.userSchool}</span>
                          </p>
                        )}
                        <p className="text-[11px] text-gray-500 truncate flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-indigo-500 shrink-0" />
                          <span className="truncate">
                            {[rm.address, rm.district].filter(Boolean).join(', ') || 'Hà Nội'}
                          </span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
            buildings={buildings}
            roommates={showRoommates ? filteredRoommates : []}
            activeRoomId={activeRoomId}
            activeRoommateId={activeRoommateId}
            onSelectRoom={handleSelectRoom}
            onSelectRoommate={handleSelectRoommate}
            resolvedCoordsMap={resolvedCoordsMap}
            userLocation={userLocation}
            universityRadiusCenter={activeUniversity ? activeUniversity.coords : null}
            zoom={userLocation ? 14 : activeUniversity ? 14 : 13}
            showUniversities={showUniversities}
            onSelectUniversity={handleSelectUniversity}
            onMapClick={handleMapClick}
            selectedDistrict={selectedDistrict}
          />

          {/* Map Display Layers Panel */}
          <div className="absolute top-4 right-4 z-10 bg-white/95 backdrop-blur-md rounded-2xl border border-blue-100 shadow-xl w-[198px] overflow-hidden">
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
                    <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center">
                      <span className="text-[10px]">👥</span>
                    </div>
                    <span className="text-[11px] font-medium text-gray-700">Tìm bạn ở ghép</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={showRoommates}
                    onChange={(e) => setShowRoommates(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300"
                  />
                </label>
              </div>
            )}
          </div>

          {/* Mobile Bottom Preview Card (Room or Roommate) */}
          {(() => {
            const activeRoom = showRooms ? filteredRooms.find((r) => r.id === activeRoomId) : undefined;
            const activeRoommate = showRoommates ? filteredRoommates.find((rm) => rm.id === activeRoommateId) : undefined;

            if (activeRoommate) {
              return (
                <div
                  className="md:hidden absolute left-3 right-3 z-20 bg-white rounded-3xl p-3 shadow-2xl border border-indigo-200 tap-bounce animate-fadeIn"
                  style={{ bottom: 'calc(var(--mobile-bottom-offset, 3.5rem) + 3.5rem)' }}
                >
                  <button
                    type="button"
                    onClick={() => setActiveRoommateId(null)}
                    className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center"
                    aria-label="Đóng xem nhanh"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <div className="flex items-center gap-3 pr-6">
                    <img
                      src={activeRoommate.userAvatar || '/images/user-avatar.jpg'}
                      alt={activeRoommate.userName}
                      className="w-14 h-14 rounded-2xl object-cover shrink-0 border border-indigo-100"
                    />
                    <div className="flex-1 overflow-hidden space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                          👥 {formatPrice(activeRoommate.budgetShare)}
                        </span>
                        <span className="text-[10px] text-gray-500 font-bold">{activeRoommate.genderPreference}</span>
                      </div>
                      <h4 className="text-xs font-bold text-gray-900 truncate">
                        {activeRoommate.userName} ({activeRoommate.userAge}t)
                      </h4>
                      <p className="text-[10px] text-gray-500 truncate flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-indigo-500 shrink-0" />
                        {[activeRoommate.address, activeRoommate.district].filter(Boolean).join(', ') || 'Hà Nội'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-2 mt-2 border-t border-gray-100">
                    <Link to={`/roommate/${activeRoommate.id}`} className="flex-1">
                      <Button variant="primary" size="sm" className="w-full text-xs font-bold min-h-[38px] bg-indigo-600 hover:bg-indigo-700">
                        Xem Hồ Sơ Ở Ghép
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            }

            if (!activeRoom) return null;
            return (
              <div
                className="md:hidden absolute left-3 right-3 z-20 bg-white rounded-3xl p-3 shadow-2xl border border-gray-200 tap-bounce animate-fadeIn"
                style={{ bottom: 'calc(var(--mobile-bottom-offset, 3.5rem) + 3.5rem)' }}
              >
                <button
                  type="button"
                  onClick={() => setActiveRoomId(null)}
                  className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center"
                  aria-label="Đóng xem nhanh"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <div className="flex items-center gap-3 pr-6">
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
                      {[activeRoom.address || (activeRoom as any).buildings?.address, activeRoom.district || (activeRoom as any).buildings?.district].filter(Boolean).join(', ') || 'Chưa cập nhật địa chỉ'}
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
          <span>Danh sách ({totalVisibleCount})</span>
        </button>
      </div>
    </div>
  );
};
