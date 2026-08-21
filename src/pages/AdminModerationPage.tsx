import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { DashboardSidebar } from '../components/layout/DashboardSidebar';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { formatPrice } from '../components/ui/Cards';
import { ShieldCheck, Check, X, Eye, AlertTriangle } from 'lucide-react';

export const AdminModerationPage: React.FC = () => {
  const { rooms, approveRoom, rejectRoom } = useAppStore();
  const [activeTab, setActiveTab] = useState<'Chờ duyệt' | 'Còn trống' | 'Bị từ chối'>('Chờ duyệt');

  const [rejectingRoomId, setRejectingRoomId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('Hình ảnh chụp không rõ ràng / mờ');
  const [customReason, setCustomReason] = useState<string>('');

  const filteredRooms = rooms.filter((r) => {
    if (activeTab === 'Chờ duyệt') return r.status === 'Chờ duyệt';
    if (activeTab === 'Còn trống') return r.status === 'Còn trống';
    if (activeTab === 'Bị từ chối') return r.status === 'Bị từ chối';
    return true;
  });

  const handleConfirmReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingRoomId) return;
    const finalReason = customReason ? `${rejectReason}: ${customReason}` : rejectReason;
    rejectRoom(rejectingRoomId, finalReason);
    setRejectingRoomId(null);
    setCustomReason('');
  };

  return (
    <div className="flex bg-gray-50 min-h-[calc(100vh-4rem)]">
      <DashboardSidebar role="admin" />

      <main className="flex-1 p-4 sm:p-8 max-w-6xl space-y-6 overflow-y-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-7 h-7 text-[#006d37]" />
              Trung Tâm Kiểm Duyệt Tin Đăng
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">Xác minh hình ảnh, giá cả và thông tin phòng trọ trước khi hiển thị công khai</p>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-2">
          {[
            { key: 'Chờ duyệt', label: `Đang chờ duyệt (${rooms.filter((r) => r.status === 'Chờ duyệt').length})` },
            { key: 'Còn trống', label: `Đã phê duyệt (${rooms.filter((r) => r.status === 'Còn trống').length})` },
            { key: 'Bị từ chối', label: `Bị từ chối (${rooms.filter((r) => r.status === 'Bị từ chối').length})` },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key as any)}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
                activeTab === t.key
                  ? 'bg-[#006d37] text-white shadow-xs'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Moderation Table / Cards */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="divide-y divide-gray-100">
            {filteredRooms.length === 0 ? (
              <div className="p-12 text-center text-gray-400 text-xs">
                Không có tin đăng nào trong danh mục này.
              </div>
            ) : (
              filteredRooms.map((room) => (
                <div key={room.id} className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <img src={room.images[0]} alt="" className="w-20 h-20 rounded-2xl object-cover shrink-0" />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-gray-900">{room.roomNumber} - {room.title}</span>
                        <Badge variant={room.status === 'Còn trống' ? 'available' : room.status === 'Chờ duyệt' ? 'pending' : 'rejected'} size="sm">
                          {room.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500">
                        Chủ trọ: <strong>{room.ownerName}</strong> ({room.ownerPhone}) • {room.address}
                      </p>
                      <p className="text-xs font-bold text-[#006d37]">
                        {formatPrice(room.price)} • {room.area} m²
                      </p>
                      {room.rejectionReason && (
                        <p className="text-xs text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md inline-block">
                          Lý do từ chối: {room.rejectionReason}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                    {room.status === 'Chờ duyệt' && (
                      <>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => approveRoom(room.id)}
                          leftIcon={<Check className="w-4 h-4" />}
                        >
                          Duyệt Tin
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setRejectingRoomId(room.id)}
                          leftIcon={<X className="w-4 h-4" />}
                        >
                          Từ Chối
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Reject Modal */}
      {rejectingRoomId && (
        <Modal isOpen={!!rejectingRoomId} onClose={() => setRejectingRoomId(null)} title="Từ Chối Phê Duyệt Tin Đăng" maxWidth="sm">
          <form onSubmit={handleConfirmReject} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase">Lý do từ chối bắt buộc:</label>
              <select
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-xs font-medium"
              >
                <option value="Hình ảnh chụp không rõ ràng / mờ">Hình ảnh chụp không rõ ràng / mờ</option>
                <option value="Giá thuê không hợp lý so với thị trường">Giá thuê không hợp lý so với thị trường</option>
                <option value="Thông tin địa chỉ hoặc liên hệ không chính xác">Thông tin địa chỉ hoặc liên hệ không chính xác</option>
                <option value="Nội dung vi phạm quy tắc cộng đồng">Nội dung vi phạm quy tắc cộng đồng</option>
                <option value="Khác">Lý do khác...</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase">Ghi chú bổ sung cho chủ trọ:</label>
              <textarea
                rows={2}
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Vui lòng chụp lại ảnh ban công và hóa đơn điện nước..."
                className="w-full text-xs rounded-xl border border-gray-300 p-2.5 focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <Button type="button" variant="outline" size="sm" onClick={() => setRejectingRoomId(null)}>
                Hủy
              </Button>
              <Button type="submit" variant="destructive" size="sm">
                Xác Nhận Từ Chối
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
