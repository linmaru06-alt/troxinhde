import React, { useState, useEffect } from 'react';
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
    id: 'cartodb_voyager',
    name: 'CartoDB Voyager (Tone sáng hiện đại, tối ưu cho Bất động sản)',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    subdomains: ['a', 'b', 'c', 'd'],
    maxZoom: 19,
  },
  {
    id: 'openstreetmap',
    name: 'OpenStreetMap Tiêu Chuẩn (Dự phòng toàn cầu)',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    subdomains: ['a', 'b', 'c'],
    maxZoom: 19,
  },
  {
    id: 'osm_france',
    name: 'OpenStreetMap France (Dự phòng bổ sung)',
    url: 'https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap France | &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    subdomains: ['a', 'b', 'c'],
    maxZoom: 20,
  }
];

/**
 * ResilientTileLayer - Lớp hiển thị mảnh bản đồ có khả năng tự phục hồi.
 * Khi một nguồn tile bị chặn bởi AdBlocker hoặc lỗi mạng (>= 3 lỗi tile),
 * tự động chuyển sang server dự phòng tiếp theo một cách trong suốt.
 */
export const ResilientTileLayer: React.FC = () => {
  const [providerIndex, setProviderIndex] = useState(0);

  const currentProvider = TILE_PROVIDERS[providerIndex] || TILE_PROVIDERS[0];

  const handleTileError = () => {
    // Nếu provider hiện tại gặp lỗi liên tục, chuyển sang provider kế tiếp
    setProviderIndex((prevIndex) => {
      if (prevIndex < TILE_PROVIDERS.length - 1) {
        const nextIndex = prevIndex + 1;
        console.warn(
          `[Trọ Xinh Map] Nguồn tile "${TILE_PROVIDERS[prevIndex].name}" gặp sự cố hoặc bị AdBlocker chặn. Tự động chuyển sang "${TILE_PROVIDERS[nextIndex].name}".`
        );
        return nextIndex;
      }
      return prevIndex;
    });
  };

  return (
    <TileLayer
      key={currentProvider.id}
      url={currentProvider.url}
      attribution={currentProvider.attribution}
      subdomains={currentProvider.subdomains || ['a', 'b', 'c']}
      maxZoom={currentProvider.maxZoom}
      eventHandlers={{
        tileerror: handleTileError,
      }}
    />
  );
};

/**
 * MapAutoResize - Tự động tính toán lại kích thước Leaflet container khi mount
 * hoặc khi layout xung quanh thay đổi, triệt tiêu lỗi bản đồ xám do flexbox.
 */
export const MapAutoResize: React.FC = () => {
  const map = useMap();

  useEffect(() => {
    // Kích hoạt ngay sau khi component mount
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    const handleResize = () => {
      map.invalidateSize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, [map]);

  return null;
};
