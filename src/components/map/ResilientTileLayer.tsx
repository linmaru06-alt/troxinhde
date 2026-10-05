import React, { useState, useEffect, useRef } from 'react';
import { TileLayer, useMap } from 'react-leaflet';

export interface TileProvider {
  id: string;
  name: string;
  url: string;
  attribution: string;
  subdomains?: string[];
  maxZoom: number;
}

export const TILE_PROVIDERS: TileProvider[] = [
  {
    id: 'openstreetmap',
    name: 'OpenStreetMap Tiêu Chuẩn (Mạng lưới toàn cầu - Tin cậy 100%)',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors',
    subdomains: ['a', 'b', 'c'],
    maxZoom: 19,
  },
  {
    id: 'cartodb_voyager',
    name: 'CartoDB Voyager (Tone sáng hiện đại, tối ưu cho Bất động sản)',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/" target="_blank" rel="noopener">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
    subdomains: ['a', 'b', 'c', 'd'],
    maxZoom: 19,
  },
  {
    id: 'esri_world',
    name: 'Esri World Street Map (Độ ổn định CDN doanh nghiệp)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS',
    maxZoom: 18,
  },
  {
    id: 'osm_france',
    name: 'OpenStreetMap France (Dự phòng bổ sung)',
    url: 'https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap France | &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
    subdomains: ['a', 'b', 'c'],
    maxZoom: 19,
  },
];

/**
 * ResilientTileLayer - Lớp hiển thị mảnh bản đồ có khả năng tự phục hồi.
 * Khi một nguồn tile bị chặn bởi AdBlocker hoặc lỗi mạng (>= 5 lỗi tile liên tiếp),
 * tự động chuyển sang server dự phòng tiếp theo một cách an toàn và có debounce.
 */
export const ResilientTileLayer: React.FC = () => {
  const [providerIndex, setProviderIndex] = useState(0);
  const map = useMap();
  const errorStreakRef = useRef(0);
  const lastSwitchTimeRef = useRef(0);

  const currentProvider = TILE_PROVIDERS[providerIndex] || TILE_PROVIDERS[0];

  const handleTileLoad = () => {
    // Khi có tile load thành công, giảm dần streak lỗi
    errorStreakRef.current = Math.max(0, errorStreakRef.current - 1);
  };

  const handleTileError = () => {
    errorStreakRef.current += 1;
    const now = Date.now();

    // Chỉ đổi provider khi:
    // 1. Tích lũy tối thiểu 5 tile lỗi liên tiếp (tránh nhảy lung tung khi mạng lag 1 tile)
    // 2. Đã qua ít nhất 3500ms kể từ lần đổi provider gần nhất
    if (errorStreakRef.current >= 5 && now - lastSwitchTimeRef.current >= 3500) {
      lastSwitchTimeRef.current = now;
      errorStreakRef.current = 0;

      setProviderIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % TILE_PROVIDERS.length;
        console.warn(
          `[Trọ Xinh Map] Nguồn tile "${TILE_PROVIDERS[prevIndex].name}" gặp sự cố. Tự động chuyển sang "${TILE_PROVIDERS[nextIndex].name}".`
        );
        setTimeout(() => {
          try {
            map.invalidateSize();
          } catch {
            // Không làm gián đoạn render nếu map đang unmounting
          }
        }, 100);
        return nextIndex;
      });
    }
  };

  return (
    <TileLayer
      key={`${currentProvider.id}-${providerIndex}`}
      url={currentProvider.url}
      attribution={currentProvider.attribution}
      subdomains={currentProvider.subdomains || ['a', 'b', 'c']}
      maxZoom={currentProvider.maxZoom}
      eventHandlers={{
        tileload: handleTileLoad,
        tileerror: handleTileError,
      }}
    />
  );
};

/**
 * MapAutoResize - Tự động tính toán lại kích thước Leaflet container khi mount
 * hoặc khi layout xung quanh thay đổi, triệt tiêu hoàn toàn lỗi bản đồ xám do flexbox.
 */
export const MapAutoResize: React.FC = () => {
  const map = useMap();

  useEffect(() => {
    // Invalidate size định kỳ lúc mới mount để triệt tiêu độ trễ render của CSS flex
    const timers = [
      setTimeout(() => map.invalidateSize(), 50),
      setTimeout(() => map.invalidateSize(), 200),
      setTimeout(() => map.invalidateSize(), 600),
      setTimeout(() => map.invalidateSize(), 1200),
    ];

    const container = map.getContainer();
    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && container) {
      resizeObserver = new ResizeObserver(() => {
        map.invalidateSize();
      });
      resizeObserver.observe(container);
    }

    const handleResize = () => {
      map.invalidateSize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      timers.forEach(clearTimeout);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [map]);

  return null;
};
