import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Layers,
  CheckCircle2,
  AlertCircle,
  Clock,
  Wrench,
  DollarSign,
  User,
  Filter,
  Eye,
  Edit,
  Rocket,
  ShieldCheck,
  ChevronDown,
  Sparkles,
  Home,
} from 'lucide-react';
import { Room } from '../../../types';
import { formatPrice } from '../../ui/Cards';

export type RoomFilterState = 'all' | 'vacant' | 'occupied' | 'reserved' | 'maintenance';

interface RoomMatrixGridProps {
  rooms: Room[];
  onUpdateStatus: (roomId: string, newStatus: Room['status']) => void;
  onOpenBatchModal?: () => void;
}

export const RoomMatrixGrid: React.FC<RoomMatrixGridProps> = ({
  rooms,
  onUpdateStatus,
  onOpenBatchModal,
}) => {
  const [filterState, setFilterState] = useState<RoomFilterState>('all');
  const [activeMenuRoomId, setActiveMenuRoomId] = useState<string | null>(null);

  // 1. Thống kê nhanh
  const stats = useMemo(() => {
    const total = rooms.length;
    const occupied = rooms.filter((r) => r.status === 'Đã cho thuê').length;
    const vacant = rooms.filter((r) => r.status === 'Còn trống').length;
    const pending = rooms.filter((r) => r.status === 'Chờ duyệt').length;
    const occupancyRate = total > 0 ? Math.round((occupied / total) * 100) : 0;

    return {
      total,
      occupied,
      vacant,
      pending,
      occupancyRate,
    };
  }, [rooms]);

  // 2. Nhóm phòng theo tầng (Floor)
  const roomsByFloor = useMemo(() => {
    const grouped: { [floor: number]: Room[] } = {};

    rooms.forEach((r) => {
      // Ưu tiên r.floor nếu có; nếu không bóc tách từ số phòng (VD: P.402 -> tầng 4)
      let floorNum = r.floor || 1;
      if (!r.floor && r.roomNumber) {
        const cleaned = r.roomNumber.replace(/\D/g, '');
        if (cleaned.length >= 3) {
          floorNum = parseInt(cleaned.slice(0, cleaned.length - 2), 10) || 1;
        } else if (cleaned.length > 0) {
          floorNum = parseInt(cleaned[0], 10) || 1;
        }
      }

      if (!grouped[floorNum]) {
        grouped[floorNum] = [];
      }
      grouped[floorNum].push(r);
    });

    // Sắp xếp các tầng từ cao xuống thấp (Floor 4 -> Floor 1)
    const sortedFloors = Object.keys(grouped)
      .map(Number)
      .sort((a, b) => b - a);

    return sortedFloors.map((floor) => ({
      floor,
      // Sắp xếp các phòng trong tầng theo số phòng
      rooms: grouped[floor].sort((a, b) => (a.roomNumber || '').localeCompare(b.roomNumber || '')),
    }));
  }, [rooms]);

  // 3. Lọc phòng theo trạng thái
  const filterRoomMatch = (r: Room) => {
    if (filterState === 'all') return true;
    if (filterState === 'vacant') return r.status === 'Còn trống';
    if (filterState === 'occupied') return r.status === 'Đã cho thuê';
    if (filterState === 'reserved') return (r as any).k23Status === 'reserved';
    if (filterState === 'maintenance') return (r as any).k23Status === 'maintenance';
    return true;
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Thống kê tỷ lệ lấp đầy & Bộ lọc */}
      <div className="bg-slate-50/80 p-4 sm:p-5 rounded-3xl border border-slate-200/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Cụm thông số */}
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div className="bg-white px-3.5 py-2 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-slate-400 block text-[10px]">Tổng quy mô</span>
              <span className="text-base font-black text-slate-900">{stats.total} phòng</span>
            </div>

            <div className="bg-emerald-50/80 px-3.5 py-2 rounded-2xl border border-emerald-200 shadow-xs">
              <span className="text-emerald-600 block text-[10px]">Đang cho thuê</span>
              <span className="text-base font-black text-emerald-800">{stats.occupied} phòng</span>
            </div>

            <div className="bg-white px-3.5 py-2 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-slate-500 block text-[10px]">Còn trống</span>
              <span className="text-base font-black text-amber-600">{stats.vacant} phòng</span>
            </div>

            <div className="bg-white px-3.5 py-2 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-slate-400 block text-[10px]">Tỷ lệ lấp đầy</span>
              <span className="text-base font-black text-emerald-700">{stats.occupancyRate}%</span>
            </div>
          </div>

          {/* Nút tạo hàng loạt nếu có */}
          {onOpenBatchModal && (
            <button
              onClick={onOpenBatchModal}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-600/20 transition cursor-pointer self-start sm:self-auto"
            >
              <Sparkles className="w-4 h-4 fill-current" />
              <span>Khởi tạo phòng hàng loạt</span>
            </button>
          )}
        </div>

        {/* Thanh Tab Lọc Trạng Thái */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-200/60 text-xs">
          <span className="text-slate-400 font-semibold mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Lọc nhanh:
          </span>

          {[
            { id: 'all', label: `Tất cả (${stats.total})` },
            { id: 'vacant', label: `Còn trống (${stats.vacant})` },
            { id: 'occupied', label: `Đang thuê (${stats.occupied})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterState(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl font-bold transition cursor-pointer ${
                filterState === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Ma trận sơ đồ tầng (Room Matrix Grid) */}
      {roomsByFloor.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-3xl border border-slate-200 p-8">
          <Home className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-slate-700">Chưa có phòng nào trong tòa nhà này</h4>
          <p className="text-xs text-slate-400 mt-1 mb-4">
            Bấm nút &quot;Khởi tạo phòng hàng loạt&quot; để sinh tự động các tầng và phòng chỉ trong 10 giây.
          </p>
          {onOpenBatchModal && (
            <button
              onClick={onOpenBatchModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs"
            >
              <Sparkles className="w-4 h-4" /> Khởi tạo phòng ngay
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {roomsByFloor.map(({ floor, rooms: floorRooms }) => {
            const visibleRooms = floorRooms.filter(filterRoomMatch);
            if (filterState !== 'all' && visibleRooms.length === 0) return null;

            return (
              <div
                key={floor}
                className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-xs space-y-3.5"
              >
                {/* Floor Header */}
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-slate-900 text-white font-black text-xs flex items-center justify-center">
                      {floor}
                    </span>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                      Tầng {floor}
                    </h3>
                    <span className="text-xs text-slate-400 font-semibold">
                      ({visibleRooms.length} phòng)
                    </span>
                  </div>

                  <span className="text-[11px] font-bold text-slate-400">
                    {floorRooms.filter((r) => r.status === 'Đã cho thuê').length}/{floorRooms.length} đã thuê
                  </span>
                </div>

                {/* Rooms Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {visibleRooms.map((room) => {
                    const isOccupied = room.status === 'Đã cho thuê';
                    const isVacant = room.status === 'Còn trống';
                    const isPending = room.status === 'Chờ duyệt';

                    return (
                      <div
                        key={room.id}
                        className={`relative rounded-2xl p-3.5 border transition-all duration-200 flex flex-col justify-between group ${
                          isOccupied
                            ? 'bg-emerald-50/60 border-emerald-300 hover:border-emerald-500 hover:shadow-md'
                            : isVacant
                            ? 'bg-white border-slate-200 hover:border-amber-400 hover:shadow-md'
                            : 'bg-amber-50/40 border-amber-200'
                        }`}
                      >
                        {/* Top: Số phòng & Trạng thái */}
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm font-black text-slate-950 font-mono tracking-tight">
                              {room.roomNumber}
                            </span>

                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                                isOccupied
                                  ? 'bg-emerald-600 text-white'
                                  : isVacant
                                  ? 'bg-slate-100 text-slate-700'
                                  : 'bg-amber-500 text-white'
                              }`}
                            >
                              {isOccupied ? 'Đã thuê' : isVacant ? 'Trống' : 'Chờ'}
                            </span>
                          </div>

                          {/* Tiêu đề ngắn gọn */}
                          <div className="text-[11px] text-slate-500 truncate mb-1" title={room.title}>
                            {room.title}
                          </div>

                          {/* Giá thuê */}
                          <div className="text-xs font-black text-emerald-800">
                            {formatPrice(room.price)}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {room.area} m² • {room.type}
                          </div>
                        </div>

                        {/* Bottom: Action buttons */}
                        <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between gap-1">
                          <Link
                            to={`/chu-tro/phong/${room.id}`}
                            className="text-[11px] font-bold text-slate-600 hover:text-emerald-700 transition"
                          >
                            Xem phòng →
                          </Link>

                          {/* Dropdown đổi trạng thái nhanh */}
                          <div className="relative">
                            <button
                              onClick={() =>
                                setActiveMenuRoomId(activeMenuRoomId === room.id ? null : room.id)
                              }
                              className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-xs transition cursor-pointer"
                              title="Đổi trạng thái phòng"
                            >
                              <ChevronDown className="w-3 h-3" />
                            </button>

                            {activeMenuRoomId === room.id && (
                              <div className="absolute right-0 bottom-full mb-1 w-36 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-30 animate-in fade-in zoom-in-95 text-xs">
                                <button
                                  onClick={() => {
                                    onUpdateStatus(room.id, 'Còn trống');
                                    setActiveMenuRoomId(null);
                                  }}
                                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 font-semibold text-slate-700 flex items-center gap-1.5"
                                >
                                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                                  <span>Còn trống</span>
                                </button>
                                <button
                                  onClick={() => {
                                    onUpdateStatus(room.id, 'Đã cho thuê');
                                    setActiveMenuRoomId(null);
                                  }}
                                  className="w-full text-left px-3 py-1.5 hover:bg-emerald-50 font-semibold text-emerald-800 flex items-center gap-1.5"
                                >
                                  <span className="w-2 h-2 rounded-full bg-emerald-600" />
                                  <span>Đã cho thuê</span>
                                </button>
                                <button
                                  onClick={() => {
                                    onUpdateStatus(room.id, 'Chờ duyệt');
                                    setActiveMenuRoomId(null);
                                  }}
                                  className="w-full text-left px-3 py-1.5 hover:bg-amber-50 font-semibold text-amber-800 flex items-center gap-1.5"
                                >
                                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                                  <span>Chờ duyệt</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
