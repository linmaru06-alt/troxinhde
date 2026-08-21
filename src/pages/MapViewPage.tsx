import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { Room } from '../types';
import { RoomCard, formatPrice } from '../components/ui/Cards';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { List, MapPin, Navigation, ArrowLeft, Building2, CheckCircle2 } from 'lucide-react';

export const MapViewPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { rooms } = useAppStore();

  const [activeRoomId, setActiveRoomId] = useState<string | null>(rooms[0]?.id || null);
  const [mobileTab, setMobileTab] = useState<'map' | 'list'>('map');

  const activeRoom = rooms.find((r) => r.id === activeRoomId) || rooms[0];

  // Map pin coordinates simulation around HCMC
  const pins = rooms.map((r, i) => {
    // Generate realistic distributed offset
    const latOffset = (i % 3) * 0.015 - 0.01;
    const lngOffset = ((i * 2) % 4) * 0.015 - 0.01;
    return {
      ...r,
      x: 35 + ((i * 23) % 45), // percentage for custom CSS map container
      y: 25 + ((i * 17) % 50),
    };
  });

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col overflow-hidden bg-gray-50">
      {/* Top Map Filter Sub-bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-2.5 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-2">
          <Link to={`/tim-kiem?${searchParams.toString()}`} className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-600 transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h2 className="text-sm font-bold text-gray-900 leading-tight">Bản Đồ Nhà Trọ Đã Kiểm Duyệt</h2>
            <p className="text-[11px] text-gray-500">TP. Hồ Chí Minh ({rooms.length} phòng)</p>
          </div>
        </div>

        {/* Mobile View Switcher */}
        <div className="md:hidden flex items-center bg-gray-100 rounded-xl p-0.5">
          <button
            onClick={() => setMobileTab('map')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
              mobileTab === 'map' ? 'bg-white text-[#006d37] shadow-xs' : 'text-gray-500'
            }`}
          >
            Bản đồ
          </button>
          <button
            onClick={() => setMobileTab('list')}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
              mobileTab === 'list' ? 'bg-white text-[#006d37] shadow-xs' : 'text-gray-500'
            }`}
          >
            Danh sách
          </button>
        </div>

        <Link to={`/tim-kiem?${searchParams.toString()}`} className="hidden md:block">
          <Button variant="outline" size="sm" leftIcon={<List className="w-4 h-4" />}>
            Xem dạng danh sách
          </Button>
        </Link>
      </div>

      {/* Main Split Layout */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Scrollable List */}
        <div
          className={`w-full md:w-[420px] lg:w-[460px] bg-white border-r border-gray-200 overflow-y-auto p-4 space-y-4 shrink-0 transition-transform md:translate-x-0 ${
            mobileTab === 'list' ? 'block' : 'hidden md:block'
          }`}
        >
          <p className="text-xs text-gray-500 font-medium">Chọn một vị trí trên bản đồ để xem phòng tương ứng:</p>
          <div className="space-y-4">
            {rooms.map((room) => (
              <div
                key={room.id}
                onClick={() => {
                  setActiveRoomId(room.id);
                  if (window.innerWidth < 768) setMobileTab('map');
                }}
                className={`cursor-pointer transition rounded-2xl ${
                  activeRoomId === room.id ? 'ring-2 ring-[#006d37] shadow-md' : 'opacity-90 hover:opacity-100'
                }`}
              >
                <RoomCard room={room} />
              </div>
            ))}
          </div>
        </div>

        {/* Right Interactive Custom Map Simulation Canvas */}
        <div
          className={`flex-1 relative bg-[#e5e9ec] overflow-hidden ${
            mobileTab === 'map' ? 'block' : 'hidden md:block'
          }`}
        >
          {/* Stylized Vector Map Background */}
          <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#006d37_1px,transparent_1px)] [background-size:20px_20px]" />

          {/* Map Landmarks & Roads SVG */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-50" xmlns="http://www.w3.org/2000/svg">
            <path d="M-50,200 Q300,150 600,400 T1200,500" fill="none" stroke="#cbd5e1" strokeWidth="24" />
            <path d="M200,-50 Q400,300 350,800" fill="none" stroke="#cbd5e1" strokeWidth="18" />
            <path d="M100,500 Q500,450 900,900" fill="none" stroke="#cbd5e1" strokeWidth="16" />
            <circle cx="450" cy="350" r="140" fill="#d1fae5" opacity="0.4" />
            <text x="400" y="350" fill="#006d37" fontSize="13" fontWeight="bold">Sông Sài Gòn</text>
          </svg>

          {/* University Landmark Badges on Map */}
          <div className="absolute top-[20%] left-[25%] bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-full text-[10px] font-bold text-gray-700 shadow-md border border-gray-200 pointer-events-none flex items-center gap-1">
            🎓 ĐH Bách Khoa TP.HCM
          </div>
          <div className="absolute top-[40%] left-[60%] bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-full text-[10px] font-bold text-gray-700 shadow-md border border-gray-200 pointer-events-none flex items-center gap-1">
            🎓 ĐH HUTECH
          </div>
          <div className="absolute top-[65%] left-[70%] bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-full text-[10px] font-bold text-gray-700 shadow-md border border-gray-200 pointer-events-none flex items-center gap-1">
            🎓 Làng Đại Học Quốc Gia
          </div>

          {/* Map Price Pins */}
          {pins.map((pin) => {
            const isActive = pin.id === activeRoomId;
            return (
              <button
                key={pin.id}
                onClick={() => setActiveRoomId(pin.id)}
                style={{ top: `${pin.y}%`, left: `${pin.x}%` }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-300 z-20 group ${
                  isActive ? 'scale-125 z-30' : 'hover:scale-110'
                }`}
              >
                <div
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold shadow-lg transition ${
                    isActive
                      ? 'bg-[#006d37] text-white ring-4 ring-[#006d37]/30'
                      : 'bg-white text-gray-900 hover:bg-[#006d37] hover:text-white border border-gray-200'
                  }`}
                >
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span>{formatPrice(pin.price)}</span>
                </div>
              </button>
            );
          })}

          {/* Floating Selected Room Card Popup */}
          {activeRoom && (
            <div className="absolute bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-2xl border border-gray-200 z-30 animate-fadeIn">
              <div className="flex gap-3">
                <img
                  src={activeRoom.images[0]}
                  alt={activeRoom.title}
                  className="w-24 h-24 rounded-xl object-cover shrink-0"
                />
                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center gap-1 mb-1">
                    {activeRoom.verified && <Badge variant="verified" size="sm">Đã kiểm duyệt</Badge>}
                    <span className="text-xs text-gray-500 font-medium">• {activeRoom.area} m²</span>
                  </div>
                  <h4 className="text-sm font-bold text-gray-900 line-clamp-1 leading-snug">
                    {activeRoom.title}
                  </h4>
                  <p className="text-xs text-[#006d37] font-bold mt-1">
                    {formatPrice(activeRoom.price)}
                  </p>
                  <p className="text-[11px] text-gray-400 truncate mt-1">
                    {activeRoom.address}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-gray-100">
                <Link to={`/phong/${activeRoom.id}`} className="w-full">
                  <Button variant="primary" size="sm" className="w-full">
                    Xem Chi Tiết Phòng →
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
