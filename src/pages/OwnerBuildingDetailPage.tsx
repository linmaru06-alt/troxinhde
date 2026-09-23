import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { DashboardSidebar } from '../components/layout/DashboardSidebar';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { formatPrice } from '../components/ui/Cards';
import {
  Building2,
  MapPin,
  CheckCircle2,
  PlusCircle,
  ArrowLeft,
  ShieldCheck,
  ExternalLink,
  Rocket,
} from 'lucide-react';

export const OwnerBuildingDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { buildings, rooms, updateRoomStatus, showToast } = useAppStore();

  const building = buildings.find((b) => b.id === id) || buildings[0];
  const buildingRooms = rooms.filter((r) => r.buildingId === building?.id);

  if (!building) {
    return (
      <div className="flex bg-gray-50 min-h-[calc(100vh-4rem)]">
        <DashboardSidebar role="owner" />
        <main className="flex-1 p-8 text-center space-y-4">
          <h2 className="text-xl font-bold">Không tìm thấy tòa nhà</h2>
          <Link to="/chu-tro/toa-nha" className="text-[#006d37] font-semibold">← Về danh sách tòa nhà</Link>
        </main>
      </div>
    );
  }

  const handleUpdateStatus = (roomId: string, newStatus: any) => {
    updateRoomStatus(roomId, newStatus);
    showToast('Cập nhật trạng thái thành công! ✅', `Phòng đã chuyển sang: ${newStatus}`, 'success');
  };

  return (
    <div className="flex bg-gray-50 min-h-[calc(100vh-4rem)]">
      <DashboardSidebar role="owner" />

      <main className="flex-1 p-4 sm:p-8 max-w-6xl space-y-6 overflow-y-auto">
        {/* Breadcrumb Back */}
        <div className="flex items-center justify-between">
          <Link
            to="/chu-tro/toa-nha"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-[#006d37] transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại Danh sách Tòa nhà</span>
          </Link>

          <Link
            to={`/toa-nha/${building.id}`}
            target="_blank"
            className="inline-flex items-center gap-1 text-xs font-bold text-[#006d37] hover:underline"
          >
            <span>Xem trang công khai</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Building Banner */}
        <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <img
              src={building.images[0]}
              alt={building.name}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover ring-1 ring-gray-200 shrink-0"
            />
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-gray-950">{building.name}</h1>
                {building.verifiedBadge && (
                  <Badge variant="verified" size="sm">Đạt Chuẩn PCCC</Badge>
                )}
              </div>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                {building.address}, {building.district}, {building.city}
              </p>
              <div className="flex items-center gap-3 text-xs pt-1">
                <span className="font-semibold text-gray-700">Quy mô: <strong>{building.totalRooms} phòng</strong></span>
                <span>•</span>
                <span className="font-semibold text-[#006d37]">Còn trống: <strong>{building.availableRooms} phòng</strong></span>
              </div>
            </div>
          </div>

          <Link to={`/chu-tro/phong/tao-moi/${building.id}`}>
            <Button variant="primary" size="md" leftIcon={<PlusCircle className="w-4 h-4" />}>
              Đăng Phòng Vào Tòa Này
            </Button>
          </Link>
        </div>

        {/* Rooms in Building List */}
        <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div>
              <h2 className="text-lg font-black text-gray-950">
                Danh Sách Phòng Trọ Thuộc Tòa Nhà ({buildingRooms.length})
              </h2>
              <p className="text-xs text-gray-500">Quản lý trạng thái và lượt hiển thị các phòng trong cơ sở này</p>
            </div>
          </div>

          {buildingRooms.length === 0 ? (
            <div className="text-center py-10 space-y-3">
              <Building2 className="w-10 h-10 text-gray-300 mx-auto" />
              <p className="text-xs text-gray-500">Chưa có phòng nào được tạo trong tòa nhà này.</p>
              <Link to={`/chu-tro/phong/tao-moi/${building.id}`}>
                <Button variant="primary" size="sm" leftIcon={<PlusCircle className="w-4 h-4" />}>
                  Đăng Phòng Đầu Tiên
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {buildingRooms.map((room) => (
                <div
                  key={room.id}
                  className="p-4 rounded-2xl border border-gray-200 hover:border-[#00a854]/40 bg-white transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={room.images[0]}
                      alt={room.title}
                      className="w-16 h-16 rounded-xl object-cover shrink-0"
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-gray-950">{room.roomNumber} - {room.title}</span>
                      </div>
                      <p className="text-xs text-gray-500">{room.area} m² • Tầng {room.floor || 1}</p>
                      <div className="text-xs font-black text-[#00a854]">
                        {formatPrice(room.price)}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
                    <select
                      value={room.status}
                      onChange={(e) => handleUpdateStatus(room.id, e.target.value as any)}
                      className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-800 focus:ring-2 focus:ring-[#00a854]"
                    >
                      <option value="Còn trống">Còn trống</option>
                      <option value="Đã cho thuê">Đã cho thuê</option>
                      <option value="Chờ duyệt">Chờ duyệt</option>
                    </select>

                    <Link to={`/chu-tro/nang-cap-tin/${room.id}`}>
                      <Button variant="outline" size="sm" leftIcon={<Rocket className="w-3.5 h-3.5 text-amber-600" />}>
                        Đẩy Tin
                      </Button>
                    </Link>

                    <Link to={`/chu-tro/phong/${room.id}`}>
                      <Button variant="outline" size="sm">
                        Chi tiết →
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
