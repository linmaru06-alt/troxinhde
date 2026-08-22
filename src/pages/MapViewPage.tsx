import React, { useState, useRef, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { Room } from '../types';
import { RoomCard, formatPrice } from '../components/ui/Cards';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { TroXinhMap } from '../components/map/TroXinhMap';
import { List, MapPin, Navigation, ArrowLeft, Building2, CheckCircle2, Eye } from 'lucide-react';

export const MapViewPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { rooms } = useAppStore();

  const [activeRoomId, setActiveRoomId] = useState<string | null>(rooms[0]?.id || null);
  const [mobileTab, setMobileTab] = useState<'map' | 'list'>('map');
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const activeRoom = rooms.find((r) => r.id === activeRoomId) || rooms[0];

  const handleSelectRoom = (roomId: string) => {
    setActiveRoomId(roomId);
    const cardEl = cardRefs.current[roomId];
    if (cardEl) {
      cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col overflow-hidden bg-gray-50">
      {/* Top Map Filter Sub-bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-2.5 flex items-center justify-between z-20 shrink-0 shadow-xs">
        <div className="flex items-center gap-2">
          <Link to={`/tim-kiem?${searchParams.toString()}`} className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-600 transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h2 className="text-sm font-bold text-gray-900 leading-tight">Bản Đồ Nhà Trọ Đã Kiểm Duyệt</h2>
            <p className="text-[11px] text-gray-500">Khu vực Hà Nội ({rooms.length} phòng trọ có tọa độ thật)</p>
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
          className={`w-full md:w-[400px] lg:w-[450px] bg-white border-r border-gray-200 overflow-y-auto p-4 space-y-4 shrink-0 transition-transform md:translate-x-0 z-10 ${
            mobileTab === 'list' ? 'block' : 'hidden md:block'
          }`}
        >
          <div className="flex items-center justify-between pb-1">
            <p className="text-xs text-gray-500 font-medium">Chọn một vị trí trên bản đồ hoặc danh sách:</p>
            <span className="text-[11px] font-bold text-[#006d37] bg-emerald-50 px-2 py-0.5 rounded-md">
              {rooms.length} phòng
            </span>
          </div>

          <div className="space-y-4">
            {rooms.map((room) => (
              <div
                key={room.id}
                ref={(el) => (cardRefs.current[room.id] = el)}
                onClick={() => {
                  setActiveRoomId(room.id);
                  if (window.innerWidth < 768) setMobileTab('map');
                }}
                className={`cursor-pointer transition rounded-2xl ${
                  activeRoomId === room.id ? 'ring-2 ring-[#006d37] shadow-md scale-[1.01]' : 'opacity-90 hover:opacity-100'
                }`}
              >
                <RoomCard room={room} />
              </div>
            ))}
          </div>
        </div>

        {/* Right Real Leaflet Interactive Map */}
        <div
          className={`flex-1 relative bg-gray-100 overflow-hidden ${
            mobileTab === 'map' ? 'block' : 'hidden md:block'
          }`}
        >
          <TroXinhMap
            rooms={rooms}
            activeRoomId={activeRoomId}
            onSelectRoom={handleSelectRoom}
          />

          {/* Floating Quick Action Badge */}
          <div className="absolute top-4 right-4 z-10 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full border border-gray-200 shadow-md text-xs font-semibold text-gray-700 flex items-center gap-1.5 pointer-events-none">
            <span className="w-2.5 h-2.5 rounded-full bg-[#006d37] animate-pulse" />
            <span>Kéo & Zoom bản đồ để khám phá</span>
          </div>
        </div>
      </div>
    </div>
  );
};
