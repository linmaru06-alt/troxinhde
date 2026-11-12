import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  GeoJSON,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import { Room, Building, RoommatePost } from '../../types';
import { formatPrice } from '../ui/Cards';
import { MapPin, ExternalLink, Compass, Users, GraduationCap } from 'lucide-react';
import { MapAutoResize } from './ResilientTileLayer';
import {
  DISTRICT_CENTERS,
  HANOI_UNIVERSITIES,
  cleanDistrictName,
  geocodeAddressCached,
  getDistanceKm,
  getDistrictCenter,
  isValidHanoiCoord,
  resolveEntityCoordsSync,
  reverseGeocodeAddress,
  spreadCoincidentCoords,
} from '../../lib/geocoding';

// Re-export for existing consumers
export { DISTRICT_CENTERS, HANOI_UNIVERSITIES };

function useLeafletCss() {
  useEffect(() => {
    if (typeof document === 'undefined') return;
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
}

// Fix Leaflet default icon paths in bundler
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Coordinates for Metro & Bus stations in Hanoi
export const HANOI_METRO_BUS_STATIONS = [
  // Metro Line 2A (Cát Linh - Hà Đông) - Full 12 stations
  { name: 'Ga Cát Linh', coords: [21.0278, 105.8322] as [number, number], type: 'metro' },
  { name: 'Ga La Thành', coords: [21.0238, 105.8258] as [number, number], type: 'metro' },
  { name: 'Ga Thái Hà', coords: [21.0188, 105.8202] as [number, number], type: 'metro' },
  { name: 'Ga Láng', coords: [21.0125, 105.8152] as [number, number], type: 'metro' },
  { name: 'Ga Thượng Đình', coords: [20.9997, 105.8115] as [number, number], type: 'metro' },
  { name: 'Ga Vành Đai 3', coords: [20.9922, 105.8013] as [number, number], type: 'metro' },
  { name: 'Ga Phùng Khoang', coords: [20.9855, 105.7925] as [number, number], type: 'metro' },
  { name: 'Ga Văn Quán', coords: [20.9789, 105.7865] as [number, number], type: 'metro' },
  { name: 'Ga Hà Đông', coords: [20.9715, 105.7760] as [number, number], type: 'metro' },
  { name: 'Ga La Khê', coords: [20.9634, 105.7610] as [number, number], type: 'metro' },
  { name: 'Ga Văn Khê', coords: [20.9575, 105.7535] as [number, number], type: 'metro' },
  { name: 'Ga Yên Nghĩa', coords: [20.9505, 105.7460] as [number, number], type: 'metro' },
  // Metro Line 3 (Nhổn - Ga Hà Nội) - Full 8 elevated stations
  { name: 'Ga Nhổn', coords: [21.0538, 105.7350] as [number, number], type: 'metro' },
  { name: 'Ga Minh Khai', coords: [21.0495, 105.7420] as [number, number], type: 'metro' },
  { name: 'Ga Phú Diễn', coords: [21.0435, 105.7560] as [number, number], type: 'metro' },
  { name: 'Ga Cầu Diễn', coords: [21.0375, 105.7630] as [number, number], type: 'metro' },
  { name: 'Ga Lê Đức Thọ', coords: [21.0360, 105.7685] as [number, number], type: 'metro' },
  { name: 'Ga ĐHQG Hà Nội', coords: [21.0365, 105.7820] as [number, number], type: 'metro' },
  { name: 'Ga Chùa Hà', coords: [21.0325, 105.7930] as [number, number], type: 'metro' },
  { name: 'Ga Cầu Giấy', coords: [21.0285, 105.8035] as [number, number], type: 'metro' },
  // City Bus Routes & Interchange Stops
  { name: 'Bus 16, 20A, 26, 32, 34 (ĐHQG)', coords: [21.0372, 105.7818] as [number, number], type: 'bus' },
  { name: 'Bus 13, 26, 32 (ĐH Sư Phạm)', coords: [21.0360, 105.7845] as [number, number], type: 'bus' },
  { name: 'Bus 16, 26, 32, 49, 51 (Chợ Xanh)', coords: [21.0365, 105.7865] as [number, number], type: 'bus' },
  { name: 'Bus 09, 26, 28 (Trạm Cầu Giấy)', coords: [21.0284, 105.8039] as [number, number], type: 'bus' },
  { name: 'Bus 12, 21A, 26, 35A (Thái Hà)', coords: [21.0118, 105.8268] as [number, number], type: 'bus' },
  { name: 'Bus 08A, 18, 23, 26 (ĐH Bách Khoa)', coords: [21.0070, 105.8430] as [number, number], type: 'bus' },
  { name: 'Bus 03, 21, 25, 28, 32 (BV Bạch Mai)', coords: [21.0028, 105.8414] as [number, number], type: 'bus' },
  { name: 'Bus 01, 02, 08, 09 (Trạm Long Biên)', coords: [21.0425, 105.8483] as [number, number], type: 'bus' },
  { name: 'Bus 11, 22A, 32, 34, 38 (Trạm Kim Mã)', coords: [21.0311, 105.8234] as [number, number], type: 'bus' },
  { name: 'Bus 07, 14, 27, 35A (Hoàng Q. Việt)', coords: [21.0465, 105.7940] as [number, number], type: 'bus' },
  { name: 'Bus 20A, 29, 32, 57 (Trạm Nhổn)', coords: [21.0540, 105.7350] as [number, number], type: 'bus' },
  { name: 'Bus 16, 30, 33, 44 (BX Mỹ Đình)', coords: [21.0288, 105.7783] as [number, number], type: 'bus' },
  { name: 'Bus 03, 08, 16, 21A (BX Giáp Bát)', coords: [20.9806, 105.8415] as [number, number], type: 'bus' },
  { name: 'Bus 04, 08B, 16, 60B (BX Nước Ngầm)', coords: [20.9634, 105.8447] as [number, number], type: 'bus' },
  { name: 'Bus 01, 02, 19, 21, 27 (Ngã Tư Sở)', coords: [21.0039, 105.8183] as [number, number], type: 'bus' },
  { name: 'Bus 01, 02, 19, 21, 27 (Thanh Xuân)', coords: [20.9935, 105.8052] as [number, number], type: 'bus' },
  { name: 'Bus 22A, 35A, 50, 60A (BigC Thăng Long)', coords: [21.0068, 105.7937] as [number, number], type: 'bus' },
  { name: 'Bus 14, 28, 30, 46 (Ngã tư Cổ Nhuế)', coords: [21.0601, 105.7745] as [number, number], type: 'bus' },
];

// University icon creator
const createUniIcon = (name: string) => {
  return L.divIcon({
    className: 'custom-uni-pin',
    html: `
      <div style="background: white; border: 1.5px solid #2563eb; color: #1e40af; border-radius: 9999px; padding: 2px 8px; font-size: 10px; font-weight: 700; box-shadow: 0 2px 4px rgba(0,0,0,0.15); display: flex; align-items: center; gap: 3px; white-space: nowrap;">
        <span>🎓</span> ${name}
      </div>
    `,
    iconSize: [120, 24],
    iconAnchor: [60, 12],
  });
};

// Custom Price Pin Icon Creator (Phòng trọ)
export const createPricePinIcon = (price: number, isActive: boolean, isRented = false) => {
  const statusClass = isRented ? 'rented' : isActive ? 'available active' : 'available';
  const priceText = formatPrice(price);

  return L.divIcon({
    className: 'custom-price-pin',
    html: `
      <div class="pin-body ${statusClass}">
        <span style="font-size: 11px;">🏠</span>
        <span>${priceText}</span>
      </div>
    `,
    iconSize: [96, 30],
    iconAnchor: [48, 15],
  });
};

// Custom Roommate Pin Icon Creator (Tìm người ở ghép)
export const createRoommatePinIcon = (budgetShare: number, isActive: boolean) => {
  const statusClass = isActive ? 'roommate active' : 'roommate';
  const priceText = formatPrice(budgetShare);

  return L.divIcon({
    className: 'custom-roommate-pin',
    html: `
      <div class="pin-body ${statusClass}">
        <span style="font-size: 11px;">👥</span>
        <span>${priceText}</span>
      </div>
    `,
    iconSize: [100, 30],
    iconAnchor: [50, 15],
  });
};

// Component to dynamically re-center only when target coordinates or zoom meaningfully change
const MapRecenter: React.FC<{ center: [number, number]; zoom?: number }> = ({ center, zoom }) => {
  const map = useMap();
  const prevRef = useRef<{ lat: number; lng: number; zoom?: number } | null>(null);

  useEffect(() => {
    const prev = prevRef.current;
    const latDiff = prev ? Math.abs(prev.lat - center[0]) : 1;
    const lngDiff = prev ? Math.abs(prev.lng - center[1]) : 1;
    const zoomChanged = prev ? prev.zoom !== zoom : true;

    if (latDiff > 0.0001 || lngDiff > 0.0001 || zoomChanged) {
      map.setView(center, zoom || map.getZoom(), { animate: true });
      prevRef.current = { lat: center[0], lng: center[1], zoom };
    }
  }, [center, zoom, map]);

  return null;
};

// Component to handle map clicks
const MapClickHandler: React.FC<{ onMapClick?: () => void }> = ({ onMapClick }) => {
  useMapEvents({
    click() {
      if (onMapClick) onMapClick();
    },
  });
  return null;
};

// 1. MAIN MAP COMPONENT (/ban-do)
export interface TroXinhMapProps {
  rooms: Room[];
  buildings?: Building[];
  roommates?: RoommatePost[];
  activeRoomId?: string | null;
  activeRoommateId?: string | null;
  onSelectRoom?: (roomId: string) => void;
  onSelectRoommate?: (roommateId: string) => void;
  resolvedCoordsMap?: Record<string, { lat: number; lng: number }>;
  center?: [number, number];
  zoom?: number;
  showUniversities?: boolean;
  userLocation?: [number, number] | null;
  universityRadiusCenter?: [number, number] | null;
  onSelectUniversity?: (uni: { name: string; coords: [number, number] }) => void;
  onMapClick?: () => void;
  selectedDistrict?: string | null;
}

export const TroXinhMap: React.FC<TroXinhMapProps> = ({
  rooms,
  buildings = [],
  roommates = [],
  activeRoomId,
  activeRoommateId,
  onSelectRoom,
  onSelectRoommate,
  resolvedCoordsMap = {},
  center = [21.0333, 105.7937], // Default Hanoi Cầu Giấy center
  zoom = 13,
  showUniversities = true,
  userLocation = null,
  universityRadiusCenter = null,
  onSelectUniversity,
  onMapClick,
  selectedDistrict = null,
}) => {
  const [geoJsonData, setGeoJsonData] = useState<any>(null);
  const [internalResolved, setInternalResolved] = useState<Record<string, { lat: number; lng: number }>>({});
  useLeafletCss();

  // Fetch GeoJSON boundary data
  useEffect(() => {
    fetch('/data/hanoi-districts.geojson')
      .then((res) => res.json())
      .then((data) => setGeoJsonData(data))
      .catch((err) => console.warn('Không tải được viền quận huyện:', err));
  }, []);

  const buildingMap = useMemo(() => {
    const map = new Map<string, Building>();
    (buildings || []).forEach((b) => {
      if (b?.id) map.set(b.id, b);
    });
    return map;
  }, [buildings]);

  const roomMap = useMemo(() => {
    const map = new Map<string, Room>();
    (rooms || []).forEach((r) => {
      if (r?.id) map.set(r.id, r);
    });
    return map;
  }, [rooms]);

  // Background geocode any rooms or roommates that lack explicit coordinates
  useEffect(() => {
    let cancelled = false;
    const queue: Array<{ key: string; address?: string; district?: string; school?: string }> = [];

    (rooms || []).forEach((room: any) => {
      const key = `room:${room.id}`;
      if (resolvedCoordsMap[key] || internalResolved[key]) return;
      const bld = room.buildingId ? buildingMap.get(room.buildingId) : undefined;
      const bldLat = room.buildings?.lat ?? bld?.geo?.lat;
      const bldLng = room.buildings?.lng ?? bld?.geo?.lng;
      const bldAddr = room.buildings?.address ?? bld?.address;
      const sync = resolveEntityCoordsSync({
        lat: room.lat,
        lng: room.lng,
        address: room.address || bldAddr,
        district: room.district || room.buildings?.district || bld?.district,
        school: room.nearestSchool,
        buildingGeo: isValidHanoiCoord(bldLat, bldLng) ? { lat: bldLat, lng: bldLng } : null,
        buildingAddress: bldAddr,
      });
      if ((sync.source === 'district' || sync.source === 'school') && (room.address || bldAddr)) {
        queue.push({
          key,
          address: room.address || bldAddr,
          district: room.district || room.buildings?.district || bld?.district,
          school: room.nearestSchool,
        });
      }
    });

    (roommates || []).forEach((rm) => {
      const key = `roommate:${rm.id}`;
      if (resolvedCoordsMap[key] || internalResolved[key]) return;
      const linked = rm.linkedRoomId ? roomMap.get(rm.linkedRoomId) : undefined;
      const sync = resolveEntityCoordsSync({
        lat: rm.lat ?? linked?.lat,
        lng: rm.lng ?? linked?.lng,
        address: rm.address || linked?.address || rm.linkedRoomTitle,
        district: rm.district || linked?.district,
        school: rm.userSchool,
      });
      if ((sync.source === 'district' || sync.source === 'school') && (rm.address || linked?.address)) {
        queue.push({
          key,
          address: rm.address || linked?.address,
          district: rm.district || linked?.district,
          school: rm.userSchool,
        });
      }
    });

    if (queue.length === 0) return;

    (async () => {
      for (const item of queue.slice(0, 15)) {
        if (cancelled) break;
        const coords = await geocodeAddressCached(item.address, item.district, item.school);
        if (!cancelled && coords) {
          setInternalResolved((prev) => (prev[item.key] ? prev : { ...prev, [item.key]: coords }));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [rooms, roommates, buildingMap, roomMap, resolvedCoordsMap, internalResolved]);

  // Filter geojson for selected district
  const selectedDistrictGeoJson = useMemo(() => {
    if (!selectedDistrict || !geoJsonData) return null;
    const cleanSelected = cleanDistrictName(selectedDistrict);
    const feature = geoJsonData.features?.find((f: any) => {
      const name = f.properties?.shapeName || f.properties?.name || '';
      return name.includes(cleanSelected);
    });
    return feature ? { type: 'FeatureCollection' as const, features: [feature] } : null;
  }, [selectedDistrict, geoJsonData]);

  // Resolve real coordinates for rooms and roommate posts together, spreading only exact duplicates (~12m)
  const { roomMarkers, roommateMarkers } = useMemo(() => {
    type MarkerEntry =
      | { kind: 'room'; id: string; item: Room; coords: { lat: number; lng: number } }
      | { kind: 'roommate'; id: string; item: RoommatePost; coords: { lat: number; lng: number } };

    const entries: MarkerEntry[] = [];

    (rooms || []).forEach((room: any) => {
      const key = `room:${room.id}`;
      const override = resolvedCoordsMap[key] || internalResolved[key];
      const bld = room.buildingId ? buildingMap.get(room.buildingId) : undefined;
      const bldLat = Number(room.buildings?.lat ?? bld?.geo?.lat);
      const bldLng = Number(room.buildings?.lng ?? bld?.geo?.lng);
      const bldAddr = room.buildings?.address ?? bld?.address;
      const addr = room.address || bldAddr;
      const dist = room.district || room.buildings?.district || bld?.district;

      const coords = override
        ? override
        : resolveEntityCoordsSync({
            lat: typeof room.lat === 'number' ? room.lat : undefined,
            lng: typeof room.lng === 'number' ? room.lng : undefined,
            address: addr,
            district: dist,
            school: room.nearestSchool,
            buildingGeo: isValidHanoiCoord(bldLat, bldLng) ? { lat: bldLat, lng: bldLng } : null,
            buildingAddress: bldAddr,
          });

      entries.push({
        kind: 'room',
        id: `room_${room.id}`,
        item: {
          ...room,
          address: addr || 'Hà Nội',
          district: dist || 'Quận Cầu Giấy',
        },
        coords: { lat: coords.lat, lng: coords.lng },
      });
    });

    (roommates || []).forEach((rm) => {
      const key = `roommate:${rm.id}`;
      const override = resolvedCoordsMap[key] || internalResolved[key];
      const linked = rm.linkedRoomId ? roomMap.get(rm.linkedRoomId) : undefined;
      const linkedBld = linked?.buildingId ? buildingMap.get(linked.buildingId) : undefined;
      const addr = rm.address || linked?.address || linkedBld?.address;
      const dist = rm.district || linked?.district || linkedBld?.district;

      const coords = override
        ? override
        : resolveEntityCoordsSync({
            lat: rm.lat ?? linked?.lat,
            lng: rm.lng ?? linked?.lng,
            address: addr,
            district: dist,
            school: rm.userSchool,
            buildingGeo: linkedBld?.geo,
            buildingAddress: linkedBld?.address,
          });

      entries.push({
        kind: 'roommate',
        id: `rm_${rm.id}`,
        item: {
          ...rm,
          address: addr || rm.address,
        },
        coords: { lat: coords.lat, lng: coords.lng },
      });
    });

    const spread = spreadCoincidentCoords(entries);

    const nextRooms: Array<Room & { geo: { lat: number; lng: number } }> = [];
    const nextRoommates: Array<RoommatePost & { geo: { lat: number; lng: number } }> = [];

    spread.forEach((entry) => {
      if (entry.kind === 'room') {
        nextRooms.push({
          ...entry.item,
          geo: entry.displayCoords,
        });
      } else {
        nextRoommates.push({
          ...entry.item,
          geo: entry.displayCoords,
        });
      }
    });

    return { roomMarkers: nextRooms, roommateMarkers: nextRoommates };
  }, [rooms, roommates, buildingMap, roomMap, resolvedCoordsMap, internalResolved]);

  const selectedRoom = roomMarkers.find((r) => r.id === activeRoomId);
  const selectedRoommate = roommateMarkers.find((rm) => rm.id === activeRoommateId);
  const selectedDistrictCenter = selectedDistrict ? getDistrictCenter(selectedDistrict) : null;

  const mapCenter: [number, number] = userLocation
    ? userLocation
    : universityRadiusCenter
    ? universityRadiusCenter
    : selectedRoommate
    ? [selectedRoommate.geo.lat, selectedRoommate.geo.lng]
    : selectedRoom
    ? [selectedRoom.geo.lat, selectedRoom.geo.lng]
    : selectedDistrictCenter
    ? [selectedDistrictCenter.lat, selectedDistrictCenter.lng]
    : center;

  return (
    <div className="w-full h-full relative z-0">
      <MapContainer
        center={mapCenter}
        zoom={zoom}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://maps.google.com">Google Maps</a>'
          url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
        />
        <MapAutoResize />

        <MapClickHandler onMapClick={onMapClick} />
        <MapRecenter center={mapCenter} zoom={zoom} />

        {/* User GPS Location Marker */}
        {userLocation && (
          <>
            <Marker
              position={userLocation}
              icon={L.divIcon({
                className: 'custom-user-gps',
                html: `
                  <div style="width: 20px; height: 20px; background: #2563eb; border: 3px solid white; border-radius: 50%; box-shadow: 0 0 10px rgba(37,99,235,0.8); position: relative;">
                    <div style="position: absolute; inset: -6px; border: 2px solid #3b82f6; border-radius: 50%; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
                  </div>
                `,
                iconSize: [20, 20],
                iconAnchor: [10, 10],
              })}
            >
              <Popup>
                <div className="text-xs font-bold text-gray-900 p-2">📍 Vị trí hiện tại của bạn</div>
              </Popup>
            </Marker>
            <Circle
              center={userLocation}
              radius={1500}
              pathOptions={{
                color: '#2563eb',
                fillColor: '#3b82f6',
                fillOpacity: 0.1,
                weight: 1.5,
                dashArray: '4, 6',
              }}
            />
          </>
        )}

        {/* Selected University Radius Circle */}
        {universityRadiusCenter && (
          <Circle
            center={universityRadiusCenter}
            radius={2000}
            pathOptions={{
              color: '#006d37',
              fillColor: '#10b981',
              fillOpacity: 0.12,
              weight: 2,
            }}
          />
        )}

        {/* Universities Landmarks */}
        {showUniversities &&
          HANOI_UNIVERSITIES.map((uni, i) => (
            <Marker
              key={`uni_${i}`}
              position={uni.coords}
              icon={createUniIcon(uni.name)}
              eventHandlers={{
                click: () => {
                  if (onSelectUniversity) onSelectUniversity(uni);
                },
              }}
            />
          ))}

        {/* District Boundary Highlight */}
        {selectedDistrictGeoJson && (
          <GeoJSON
            key={selectedDistrict || 'district'}
            data={selectedDistrictGeoJson}
            style={{
              color: '#ef4444',
              weight: 2,
              opacity: 1,
              fillColor: '#ef4444',
              fillOpacity: 0.1,
              dashArray: '5, 5',
            }}
          />
        )}

        {/* Room Price Pin Markers */}
        {roomMarkers.map((room) => {
          const isActive = room.id === activeRoomId || !!universityRadiusCenter;
          const isRented = room.status === 'Đã cho thuê';

          return (
            <Marker
              key={`room_${room.id}`}
              position={[room.geo.lat, room.geo.lng]}
              icon={createPricePinIcon(room.price, isActive, isRented)}
              eventHandlers={{
                click: () => {
                  if (onSelectRoom) onSelectRoom(room.id);
                },
              }}
            >
              <Popup className="troxinh-map-popup">
                <div className="w-60 p-3 space-y-2 text-left">
                  <div className="aspect-16/10 rounded-xl overflow-hidden bg-gray-100 relative">
                    <img
                      src={room.images?.[0] || '/images/hero-banner.webp'}
                      alt={room.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-1.5 left-1.5 bg-[#006d37] text-white text-[9px] font-bold px-2 py-0.5 rounded-md">
                      {formatPrice(room.price)}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-xs line-clamp-1 leading-snug">
                      {room.title}
                    </h4>
                    <p className="text-[11px] text-gray-600 line-clamp-2 flex items-start gap-1 mt-1">
                      <MapPin className="w-3 h-3 text-rose-500 shrink-0 mt-0.5" />
                      <span>
                        {[room.address, room.district].filter(Boolean).join(', ')} • {room.area}m²
                      </span>
                    </p>
                  </div>
                  <div className="pt-1.5 border-t border-gray-100 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-[#006d37] font-semibold truncate">
                      {room.nearestSchool}
                    </span>
                    <Link
                      to={`/phong/${room.id}`}
                      className="text-[11px] font-bold text-[#006d37] hover:underline flex items-center gap-0.5 shrink-0"
                    >
                      Chi tiết <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* Roommate Post Pin Markers */}
        {roommateMarkers.map((rm) => {
          const isActive = rm.id === activeRoommateId;

          return (
            <Marker
              key={`rm_${rm.id}`}
              position={[rm.geo.lat, rm.geo.lng]}
              icon={createRoommatePinIcon(rm.budgetShare, isActive)}
              eventHandlers={{
                click: () => {
                  if (onSelectRoommate) onSelectRoommate(rm.id);
                },
              }}
            >
              <Popup className="troxinh-map-popup">
                <div className="w-64 p-3 space-y-2.5 text-left">
                  <div className="flex items-center gap-2.5">
                    <img
                      src={rm.userAvatar || '/images/user-avatar.jpg'}
                      alt={rm.userName}
                      className="w-10 h-10 rounded-full object-cover border-2 border-indigo-200 shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/images/user-avatar.jpg';
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 uppercase">
                          Ở ghép
                        </span>
                        <span className="text-[10px] font-bold text-indigo-700 truncate">
                          {rm.genderPreference}
                        </span>
                      </div>
                      <h4 className="font-bold text-gray-900 text-xs truncate mt-0.5">
                        {rm.userName} ({rm.userAge}t • {rm.userGender})
                      </h4>
                    </div>
                  </div>

                  <div className="space-y-1">
                    {rm.userSchool && (
                      <p className="text-[11px] text-[#006d37] font-semibold flex items-center gap-1 truncate">
                        <GraduationCap className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{rm.userSchool}</span>
                      </p>
                    )}
                    <p className="text-[11px] text-gray-600 flex items-start gap-1 line-clamp-2">
                      <MapPin className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                      <span>{[rm.address, rm.district].filter(Boolean).join(', ') || 'Hà Nội'}</span>
                    </p>
                    {rm.linkedRoomTitle && (
                      <p className="text-[10px] text-gray-500 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100 truncate">
                        🏠 {rm.linkedRoomTitle}
                      </p>
                    )}
                  </div>

                  <div className="pt-1.5 border-t border-gray-100 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-black text-indigo-700 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {formatPrice(rm.budgetShare)}
                    </span>
                    <Link
                      to={`/roommate/${rm.id}`}
                      className="text-[11px] font-bold text-indigo-700 hover:underline flex items-center gap-0.5 shrink-0"
                    >
                      Xem hồ sơ <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

// 2. MINI ROOM MAP FOR DETAILS PAGE (/phong/:id & /roommate/:id)
export interface MiniRoomMapProps {
  roomTitle: string;
  buildingName?: string;
  address?: string;
  district?: string;
  lat?: number;
  lng?: number;
  nearestSchool?: string;
  className?: string;
}

export const MiniRoomMap: React.FC<MiniRoomMapProps> = ({
  roomTitle,
  buildingName,
  address,
  district,
  lat,
  lng,
  nearestSchool,
  className = 'h-64 rounded-3xl overflow-hidden',
}) => {
  const initialResolved = useMemo(() => {
    return resolveEntityCoordsSync({
      lat,
      lng,
      address,
      district,
      school: nearestSchool,
    });
  }, [lat, lng, address, district, nearestSchool]);

  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: initialResolved.lat,
    lng: initialResolved.lng,
  });
  useLeafletCss();

  useEffect(() => {
    setCoords({ lat: initialResolved.lat, lng: initialResolved.lng });
  }, [initialResolved.lat, initialResolved.lng]);

  useEffect(() => {
    if (isValidHanoiCoord(lat, lng)) return;
    if (!address && !district && !nearestSchool) return;
    if (initialResolved.source !== 'district' && initialResolved.source !== 'school') return;

    let cancelled = false;
    geocodeAddressCached(address, district, nearestSchool).then((res) => {
      if (!cancelled && res) {
        setCoords(res);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [lat, lng, address, district, nearestSchool, initialResolved.source]);

  const roomPosition: [number, number] = [coords.lat, coords.lng];

  const nearbyUniversities = useMemo(() => {
    return [...HANOI_UNIVERSITIES]
      .map((u) => ({
        ...u,
        dist: getDistanceKm(coords.lat, coords.lng, u.coords[0], u.coords[1]),
      }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 3);
  }, [coords.lat, coords.lng]);

  const singlePinIcon = L.divIcon({
    className: 'custom-single-pin',
    html: `
      <div style="background: #006d37; color: white; padding: 6px 12px; border-radius: 9999px; font-weight: 800; font-size: 11px; box-shadow: 0 4px 10px rgba(0,109,55,0.4); display: flex; align-items: center; gap: 4px; border: 2px solid white; white-space: nowrap;">
        <span>📍</span> ${buildingName || 'Vị trí trên bản đồ'}
      </div>
    `,
    iconSize: [150, 32],
    iconAnchor: [75, 16],
  });

  return (
    <div className={`relative border border-gray-200 shadow-xs ${className}`}>
      <MapContainer
        center={roomPosition}
        zoom={15}
        scrollWheelZoom={false}
        className="w-full h-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://maps.google.com">Google Maps</a>'
          url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
        />
        <MapAutoResize />
        <MapRecenter center={roomPosition} zoom={15} />

        {/* 1.2km Radius circle around listing */}
        <Circle
          center={roomPosition}
          radius={1200}
          pathOptions={{
            color: '#006d37',
            fillColor: '#27ae60',
            fillOpacity: 0.1,
            weight: 1.5,
          }}
        />

        {/* Room Marker */}
        <Marker position={roomPosition} icon={singlePinIcon}>
          <Popup>
            <div className="p-2.5 text-xs font-semibold text-gray-800 space-y-1">
              <p className="font-bold text-[#006d37]">{buildingName || roomTitle}</p>
              {address && (
                <p className="text-gray-600 text-[11px]">{[address, district].filter(Boolean).join(', ')}</p>
              )}
            </div>
          </Popup>
        </Marker>

        {/* Closest University Markers */}
        {nearbyUniversities.map((uni, i) => (
          <Marker key={i} position={uni.coords} icon={createUniIcon(uni.name)} />
        ))}
      </MapContainer>

      {/* Floating Info Badge */}
      <div className="absolute bottom-3 left-3 right-3 sm:right-auto max-w-[92%] bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 shadow-md flex items-center gap-2 z-10">
        <Compass className="w-4 h-4 text-[#006d37] shrink-0" />
        <span className="truncate">
          {address ? `${address}${district ? `, ${district}` : ''}` : 'Bán kính 1.2km quanh vị trí'}
        </span>
      </div>
    </div>
  );
};

// 3. MAP PIN PICKER FOR CREATION & EDITING
export interface MapPinPickerProps {
  initialLat?: number;
  initialLng?: number;
  onLocationChange: (loc: { lat: number; lng: number; address?: string }) => void;
  className?: string;
}

const LocationPickerMarker: React.FC<{
  position: [number, number];
  onPositionChange: (pos: [number, number]) => void;
}> = ({ position, onPositionChange }) => {
  const map = useMapEvents({
    click(e) {
      onPositionChange([e.latlng.lat, e.latlng.lng]);
      map.flyTo(e.latlng, map.getZoom());
    },
  });

  const pickerIcon = L.divIcon({
    className: 'custom-picker-pin',
    html: `
      <div style="background: #006d37; color: white; width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); border: 3px solid white; cursor: grab;">
        📍
      </div>
    `,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
  });

  return (
    <Marker
      position={position}
      draggable={true}
      icon={pickerIcon}
      eventHandlers={{
        dragend: (e) => {
          const marker = e.target;
          const pos = marker.getLatLng();
          onPositionChange([pos.lat, pos.lng]);
        },
      }}
    />
  );
};

export const MapPinPicker: React.FC<MapPinPickerProps> = ({
  initialLat = 21.0333,
  initialLng = 105.7937,
  onLocationChange,
  className = 'h-72 rounded-2xl overflow-hidden',
}) => {
  const [position, setPosition] = useState<[number, number]>([initialLat, initialLng]);
  const [addressPreview, setAddressPreview] = useState<string>('');
  const [isGeocoding, setIsGeocoding] = useState<boolean>(false);
  useLeafletCss();

  // Sync external coordinate changes (e.g. when user clicks "Định vị từ địa chỉ")
  useEffect(() => {
    if (
      Number.isFinite(initialLat) &&
      Number.isFinite(initialLng) &&
      (Math.abs(position[0] - initialLat) > 0.00005 || Math.abs(position[1] - initialLng) > 0.00005)
    ) {
      setPosition([initialLat, initialLng]);
    }
  }, [initialLat, initialLng]);

  const handlePositionChange = async (newPos: [number, number]) => {
    setPosition(newPos);
    setIsGeocoding(true);

    try {
      const address = await reverseGeocodeAddress(newPos[0], newPos[1]);
      setAddressPreview(address);
      onLocationChange({ lat: newPos[0], lng: newPos[1], address });
    } catch {
      onLocationChange({ lat: newPos[0], lng: newPos[1] });
    } finally {
      setIsGeocoding(false);
    }
  };

  return (
    <div className={`relative border border-gray-300 ${className}`}>
      <MapContainer
        center={position}
        zoom={15}
        scrollWheelZoom={true}
        className="w-full h-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://maps.google.com">Google Maps</a>'
          url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
        />
        <MapAutoResize />
        <MapRecenter center={position} zoom={15} />

        <LocationPickerMarker
          position={position}
          onPositionChange={handlePositionChange}
        />
      </MapContainer>

      {/* Floating Coordinate & Address Helper */}
      <div className="absolute bottom-3 left-3 right-3 bg-white/95 backdrop-blur-md p-2.5 rounded-xl border border-gray-200 text-xs shadow-md z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-gray-700 truncate">
          <MapPin className="w-4 h-4 text-[#006d37] shrink-0" />
          <span className="truncate">
            {isGeocoding
              ? 'Đang nhận diện địa chỉ...'
              : addressPreview || `Tọa độ: ${position[0].toFixed(5)}, ${position[1].toFixed(5)}`}
          </span>
        </div>
        <span className="text-[10px] text-gray-400 font-medium shrink-0">
          Nhấp hoặc kéo ghim để chỉnh vị trí
        </span>
      </div>
    </div>
  );
};

// 4. FREE NOMINATIM GEOCODING UTILITIES (Delegated to shared cache/service)
export async function geocodeAddress(
  address: string,
  district?: string
): Promise<{ lat: number; lng: number } | null> {
  return geocodeAddressCached(address, district);
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  return reverseGeocodeAddress(lat, lng);
}
