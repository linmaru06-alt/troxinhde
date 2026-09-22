import React, { useEffect, useState, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap,
  useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import { Link } from 'react-router-dom';
import { Room, Building } from '../../types';
import { formatPrice } from '../ui/Cards';
import { MapPin, Navigation, School, ExternalLink, Compass } from 'lucide-react';

// Fix Leaflet default icon paths in bundler
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Coordinates for top universities in Hanoi
export const HANOI_UNIVERSITIES = [
  { name: 'ĐH Quốc Gia Hà Nội', coords: [21.0380, 105.7829] as [number, number] },
  { name: 'ĐH Bách Khoa HN', coords: [21.0070, 105.8430] as [number, number] },
  { name: 'ĐH Kinh Tế Quốc Dân', coords: [20.9955, 105.8590] as [number, number] },
  { name: 'ĐH Xây Dựng', coords: [21.0155, 105.8432] as [number, number] },
  { name: 'ĐH Sư Phạm HN', coords: [21.0455, 105.8390] as [number, number] },
  { name: 'ĐH Y Hà Nội', coords: [21.0241, 105.8412] as [number, number] },
  { name: 'ĐH Ngoại Thương', coords: [21.0378, 105.7839] as [number, number] },
  { name: 'ĐH Luật HN', coords: [21.0359, 105.8105] as [number, number] },
  { name: 'Học Viện Ngân Hàng', coords: [20.9815, 105.7975] as [number, number] },
  { name: 'ĐH FPT Hà Nội', coords: [21.0122, 105.5257] as [number, number] },
];

// University icon creator
const createUniIcon = (name: string) => {
  return L.divIcon({
    className: 'custom-uni-pin',
    html: `
      <div style="background: white; border: 1.5px solid #2563eb; color: #1e40af; border-radius: 9999px; padding: 2px 8px; font-size: 10px; font-weight: 700; box-shadow: 0 2px 4px rgba(0,0,0,0.15); display: flex; items-center; gap: 3px; white-space: nowrap;">
        <span>🎓</span> ${name}
      </div>
    `,
    iconSize: [120, 24],
    iconAnchor: [60, 12],
  });
};

// Custom Price Pin Icon Creator
export const createPricePinIcon = (price: number, isActive: boolean, isRented = false) => {
  const statusClass = isRented ? 'rented' : isActive ? 'available active' : 'available';
  const priceText = formatPrice(price);

  return L.divIcon({
    className: 'custom-price-pin',
    html: `
      <div class="pin-body ${statusClass}">
        <span style="font-size: 11px;">📍</span>
        <span>${priceText}</span>
      </div>
    `,
    iconSize: [80, 30],
    iconAnchor: [40, 15],
  });
};

// Component to dynamically re-center when active room changes
const MapRecenter: React.FC<{ center: [number, number]; zoom?: number }> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom || map.getZoom(), { animate: true });
  }, [center, zoom, map]);
  return null;
};

// 1. MAIN MAP COMPONENT (/ban-do)
export interface TroXinhMapProps {
  rooms: Room[];
  activeRoomId?: string | null;
  onSelectRoom?: (roomId: string) => void;
  center?: [number, number];
  zoom?: number;
  showUniversities?: boolean;
  userLocation?: [number, number] | null;
  universityRadiusCenter?: [number, number] | null;
}

export const TroXinhMap: React.FC<TroXinhMapProps> = ({
  rooms,
  activeRoomId,
  onSelectRoom,
  center = [21.0333, 105.7937], // Default Hanoi Cầu Giấy center
  zoom = 13,
  showUniversities = true,
  userLocation = null,
  universityRadiusCenter = null,
}) => {
  // Map rooms to geo locations
  const roomMarkers = useMemo(() => {
    // Basic District Centers for Hanoi
    const districtCenters: Record<string, { lat: number; lng: number }> = {
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
    };

    return rooms.map((room, index) => {
      const cleanDistrict = room.district?.replace('Quận ', '').replace('Huyện ', '') || 'Cầu Giấy';
      const baseCenter = districtCenters[cleanDistrict] || { lat: 21.0333, lng: 105.7937 };

      // Spiral placement to prevent overlapping markers
      const angle = index * 2.4; // Golden angle approximation
      const radius = 0.003 * Math.sqrt(index); // Expanding radius
      
      const lat = baseCenter.lat + (radius * Math.cos(angle));
      const lng = baseCenter.lng + (radius * Math.sin(angle));

      return {
        ...room,
        geo: { lat, lng },
      };
    });
  }, [rooms]);

  const selectedRoom = roomMarkers.find((r) => r.id === activeRoomId);
  const mapCenter: [number, number] = userLocation
    ? userLocation
    : universityRadiusCenter
    ? universityRadiusCenter
    : selectedRoom
    ? [selectedRoom.geo.lat, selectedRoom.geo.lng]
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
                <div className="text-xs font-bold text-gray-900 p-1">📍 Vị trí hiện tại của bạn</div>
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
            />
          ))}

        {/* Room Price Pin Markers */}
        {roomMarkers.map((room) => {
          const isActive = room.id === activeRoomId;
          const isRented = room.status === 'Đã cho thuê';

          return (
            <Marker
              key={room.id}
              position={[room.geo.lat, room.geo.lng]}
              icon={createPricePinIcon(room.price, isActive, isRented)}
              eventHandlers={{
                click: () => {
                  if (onSelectRoom) onSelectRoom(room.id);
                },
              }}
            >
              <Popup className="troxinh-map-popup">
                <div className="w-56 p-3 space-y-2 text-left">
                  <div className="aspect-16/10 rounded-xl overflow-hidden bg-gray-100 relative">
                    <img
                      src={room.images[0]}
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
                    <p className="text-[11px] text-gray-500 line-clamp-1 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                      {room.district} • {room.area}m²
                    </p>
                  </div>
                  <div className="pt-1.5 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-[10px] text-[#006d37] font-semibold">
                      {room.nearestSchool}
                    </span>
                    <Link
                      to={`/phong/${room.id}`}
                      className="text-[11px] font-bold text-[#006d37] hover:underline flex items-center gap-0.5"
                    >
                      Chi tiết <ExternalLink className="w-3 h-3" />
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

// 2. MINI ROOM MAP FOR DETAILS PAGE (/phong/:id)
export interface MiniRoomMapProps {
  roomTitle: string;
  buildingName?: string;
  lat?: number;
  lng?: number;
  nearestSchool?: string;
  className?: string;
}

export const MiniRoomMap: React.FC<MiniRoomMapProps> = ({
  roomTitle,
  buildingName,
  lat = 21.0333,
  lng = 105.7937,
  nearestSchool,
  className = 'h-64 rounded-3xl overflow-hidden',
}) => {
  const roomPosition: [number, number] = [lat, lng];

  const singlePinIcon = L.divIcon({
    className: 'custom-single-pin',
    html: `
      <div style="background: #006d37; color: white; padding: 6px 12px; border-radius: 9999px; font-weight: 800; font-size: 11px; box-shadow: 0 4px 10px rgba(0,109,55,0.4); display: flex; align-items: center; gap: 4px; border: 2px solid white;">
        <span>🏠</span> ${buildingName || 'Vị trí phòng'}
      </div>
    `,
    iconSize: [140, 32],
    iconAnchor: [70, 16],
  });

  return (
    <div className={`relative border border-gray-200 shadow-xs ${className}`}>
      <MapContainer
        center={roomPosition}
        zoom={14}
        scrollWheelZoom={false}
        className="w-full h-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://maps.google.com">Google Maps</a>'
          url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
        />

        {/* 1.5km Radius circle around room */}
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
            <div className="p-2 text-xs font-semibold text-gray-800">
              <p className="font-bold text-[#006d37]">{buildingName || 'Tòa nhà'}</p>
              <p className="text-gray-500 text-[11px]">{roomTitle}</p>
            </div>
          </Popup>
        </Marker>

        {/* Nearby University Markers */}
        {HANOI_UNIVERSITIES.slice(0, 3).map((uni, i) => (
          <Marker
            key={i}
            position={uni.coords}
            icon={createUniIcon(uni.name)}
          />
        ))}
      </MapContainer>

      {/* Floating Info Badge */}
      <div className="absolute bottom-3 left-3 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 shadow-md flex items-center gap-2 z-10">
        <Compass className="w-4 h-4 text-[#006d37]" />
        <span>Bán kính 1.2km quanh phòng</span>
      </div>
    </div>
  );
};

// 3. MAP PIN PICKER FOR BUILDING CREATION (/chu-tro/toa-nha/tao-moi)
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

  const handlePositionChange = async (newPos: [number, number]) => {
    setPosition(newPos);
    setIsGeocoding(true);

    try {
      const address = await reverseGeocode(newPos[0], newPos[1]);
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
        zoom={14}
        scrollWheelZoom={true}
        className="w-full h-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://maps.google.com">Google Maps</a>'
          url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
        />

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
              : addressPreview || `Tọa độ: ${position[0].toFixed(4)}, ${position[1].toFixed(4)}`}
          </span>
        </div>
        <span className="text-[10px] text-gray-400 font-medium shrink-0">
          Nhấp hoặc kéo ghim để đổi vị trí
        </span>
      </div>
    </div>
  );
};

// 4. FREE NOMINATIM GEOCODING UTILITIES
export async function geocodeAddress(
  address: string
): Promise<{ lat: number; lng: number } | null> {
  try {
    const query = `${address}, Hà Nội, Vietnam`;
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      query
    )}&format=json&limit=1`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'TroXinh/1.0' },
    });
    const data = await response.json();
    if (data && data[0]) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      };
    }
  } catch (err) {
    console.error('Geocoding error:', err);
  }
  return null;
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'TroXinh/1.0' },
    });
    const data = await response.json();
    if (data && data.display_name) {
      return data.display_name;
    }
  } catch (err) {
    console.error('Reverse geocoding error:', err);
  }
  return 'Không xác định được địa chỉ';
}
