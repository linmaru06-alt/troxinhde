import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { DashboardSidebar } from '../components/layout/DashboardSidebar';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { formatPrice, formatCurrency } from '../components/ui/Cards';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import {
  Home,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  Heart,
  Calendar,
  Trash2,
  Edit,
  ExternalLink,
  ArrowLeft,
} from 'lucide-react';

export const OwnerRoomDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { rooms, updateRoomStatus, showToast } = useAppStore();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);

  const room = rooms.find((r) => r.id === id) || rooms[0];

  if (!room) {
    return <div className="p-8 text-center">Không tìm thấy phòng</div>;
  }

  const handleDelete = () => {
    showToast('Đã xóa phòng trọ khỏi hệ thống', '', 'info');
    setShowDeleteConfirm(false);
    navigate('/chu-tro');
  };

  return (
    <div className="flex bg-gray-50 min-h-[calc(100vh-4rem)]">
      <DashboardSidebar role="owner" />

      <main className="flex-1 p-4 sm:p-8 max-w-5xl space-y-6 overflow-y-auto">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Link to="/chu-tro" className="hover:text-[#006d37]">Bảng điều khiển</Link>
          <span>/</span>
          <span className="font-bold text-gray-900">{room.roomNumber} - {room.title}</span>
        </div>

        {/* Status Banner */}
        <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img src={room.images[0]} alt="" className="w-16 h-16 rounded-2xl object-cover shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900">{room.roomNumber} - {room.title}</h1>
                <Badge variant={room.status === 'Còn trống' ? 'available' : room.status === 'Chờ duyệt' ? 'pending' : 'rented'} size="sm">
                  {room.status}
                </Badge>
              </div>
              <p className="text-xs text-gray-500">{room.buildingName} • {room.area} m²</p>
            </div>
          </div>

          {/* Quick status dropdown */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between">
            <select
              value={room.status}
              onChange={(e) => updateRoomStatus(room.id, e.target.value as any)}
              className="bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-xs font-bold text-gray-800"
            >
              <option value="Còn trống">Trạng thái: Còn trống</option>
              <option value="Đã cho thuê">Trạng thái: Đã cho thuê</option>
              <option value="Chờ duyệt">Trạng thái: Chờ duyệt</option>
            </select>

            <Link to={`/phong/${room.id}`} target="_blank">
              <Button variant="outline" size="sm" rightIcon={<ExternalLink className="w-3.5 h-3.5" />}>
                Xem Như Khách
              </Button>
            </Link>
          </div>
        </div>

        {/* Performance metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-2xl border border-gray-200 text-center space-y-1">
            <Eye className="w-5 h-5 text-emerald-600 mx-auto" />
            <span className="text-xs text-gray-500">Lượt xem</span>
            <div className="text-xl font-black text-gray-900">{room.views}</div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-200 text-center space-y-1">
            <Heart className="w-5 h-5 text-rose-500 mx-auto" />
            <span className="text-xs text-gray-500">Lượt lưu</span>
            <div className="text-xl font-black text-gray-900">{room.savedCount}</div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-200 text-center space-y-1">
            <Calendar className="w-5 h-5 text-amber-500 mx-auto" />
            <span className="text-xs text-gray-500">Lịch hẹn</span>
            <div className="text-xl font-black text-gray-900">4 cuộc hẹn</div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-gray-200 text-center space-y-1">
            <CheckCircle2 className="w-5 h-5 text-blue-500 mx-auto" />
            <span className="text-xs text-gray-500">Giá thuê</span>
            <div className="text-sm font-black text-[#006d37]">{formatPrice(room.price)}</div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDeleteConfirm(true)}
            leftIcon={<Trash2 className="w-4 h-4" />}
          >
            Xóa Phòng Này
          </Button>
        </div>
      </main>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDelete}
        title="Xác nhận xóa phòng trọ"
        description="Bạn có chắc chắn muốn xóa phòng này khỏi danh sách quản lý? Hành động này không thể hoàn tác."
        variant="destructive"
        confirmText="Xóa vĩnh viễn"
      />
    </div>
  );
};
