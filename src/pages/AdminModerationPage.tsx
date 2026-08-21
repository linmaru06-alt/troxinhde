import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { DashboardSidebar } from '../components/layout/DashboardSidebar';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { formatPrice } from '../components/ui/Cards';
import {
  ShieldCheck,
  Check,
  X,
  Eye,
  AlertTriangle,
  Building2,
  UserCheck,
  Clock,
  MapPin,
  Phone,
  FileCheck,
} from 'lucide-react';

export const AdminModerationPage: React.FC = () => {
  const {
    rooms,
    approveRoom,
    rejectRoom,
    ownerApplications,
    approveOwnerApplication,
    rejectOwnerApplication,
  } = useAppStore();

  const [mainSection, setMainSection] = useState<'rooms' | 'owner_upgrades'>('rooms');
  const [activeRoomTab, setActiveRoomTab] = useState<'Chờ duyệt' | 'Còn trống' | 'Bị từ chối'>('Chờ duyệt');

  const [rejectingRoomId, setRejectingRoomId] = useState<string | null>(null);
  const [rejectRoomReason, setRejectRoomReason] = useState<string>('Hình ảnh chụp không rõ ràng / mờ');
  const [customRoomReason, setCustomRoomReason] = useState<string>('');

  const [rejectingAppId, setRejectingAppId] = useState<string | null>(null);
  const [rejectAppReason, setRejectAppReason] = useState<string>('Thông tin giấy tờ sở hữu / PCCC chưa hợp lệ');
  const [customAppReason, setCustomAppReason] = useState<string>('');

  const filteredRooms = rooms.filter((r) => {
    if (activeRoomTab === 'Chờ duyệt') return r.status === 'Chờ duyệt';
    if (activeRoomTab === 'Còn trống') return r.status === 'Còn trống';
    if (activeRoomTab === 'Bị từ chối') return r.status === 'Bị từ chối';
    return true;
  });

  const handleConfirmRejectRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingRoomId) return;
    const finalReason = customRoomReason ? `${rejectRoomReason}: ${customRoomReason}` : rejectRoomReason;
    rejectRoom(rejectingRoomId, finalReason);
    setRejectingRoomId(null);
    setCustomRoomReason('');
  };

  const handleConfirmRejectApp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingAppId) return;
    const finalReason = customAppReason ? `${rejectAppReason}: ${customAppReason}` : rejectAppReason;
    rejectOwnerApplication(rejectingAppId, finalReason);
    setRejectingAppId(null);
    setCustomAppReason('');
  };

  const pendingApps = ownerApplications.filter((a) => a.status === 'pending');
  const pendingRoomsCount = rooms.filter((r) => r.status === 'Chờ duyệt').length;

  return (
    <div className="flex bg-gray-50 min-h-[calc(100vh-4rem)]">
      <DashboardSidebar role="admin" />

      <main className="flex-1 p-4 sm:p-8 max-w-6xl space-y-6 overflow-y-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-7 h-7 text-[#006d37]" />
              Trung Tâm Kiểm Duyệt Nền Tảng
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Phê duyệt tin đăng phòng trọ và thẩm định hồ sơ nâng cấp quyền Chủ Trọ
            </p>
          </div>
        </div>

        {/* Section Switcher (Rooms vs Owner Upgrades) */}
        <div className="flex bg-white p-1.5 rounded-2xl border border-gray-200 shadow-xs max-w-md">
          <button
            onClick={() => setMainSection('rooms')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 ${
              mainSection === 'rooms'
                ? 'bg-[#006d37] text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span>Tin Đăng Phòng</span>
            {pendingRoomsCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${mainSection === 'rooms' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-[#006d37]'}`}>
                {pendingRoomsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setMainSection('owner_upgrades')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 ${
              mainSection === 'owner_upgrades'
                ? 'bg-[#006d37] text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span>Nâng Cấp Chủ Trọ</span>
            {pendingApps.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${mainSection === 'owner_upgrades' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'}`}>
                {pendingApps.length}
              </span>
            )}
          </button>
        </div>

        {/* SECTION 1: ROOMS MODERATION */}
        {mainSection === 'rooms' && (
          <div className="space-y-4 animate-fadeIn">
            {/* Tab Filters */}
            <div className="flex items-center gap-2">
              {[
                { key: 'Chờ duyệt', label: `Đang chờ duyệt (${rooms.filter((r) => r.status === 'Chờ duyệt').length})` },
                { key: 'Còn trống', label: `Đã phê duyệt (${rooms.filter((r) => r.status === 'Còn trống').length})` },
                { key: 'Bị từ chối', label: `Bị từ chối (${rooms.filter((r) => r.status === 'Bị từ chối').length})` },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setActiveRoomTab(t.key as any)}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
                    activeRoomTab === t.key
                      ? 'bg-[#006d37] text-white shadow-xs'
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Moderation Table */}
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
          </div>
        )}

        {/* SECTION 2: OWNER UPGRADE APPLICATIONS */}
        {mainSection === 'owner_upgrades' && (
          <div className="space-y-4 animate-fadeIn">
            <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-700">
                Danh sách hồ sơ đăng ký đối tác Chủ Trọ ({ownerApplications.length})
              </div>

              <div className="divide-y divide-gray-100">
                {ownerApplications.length === 0 ? (
                  <div className="p-12 text-center text-gray-400 text-xs">
                    Chưa có hồ sơ nâng cấp nào.
                  </div>
                ) : (
                  ownerApplications.map((app) => (
                    <div key={app.id} className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-sm text-gray-900">{app.buildingName}</h3>
                          <Badge variant={app.status === 'approved' ? 'verified' : app.status === 'pending' ? 'pending' : 'rejected'} size="sm">
                            {app.status === 'approved' ? 'Đã duyệt' : app.status === 'pending' ? 'Chờ thẩm định' : 'Từ chối'}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-gray-600">
                          <p>👤 Đại diện: <strong>{app.userName}</strong> ({app.userPhone})</p>
                          <p>🪪 Số CCCD: <strong>{app.cccdNumber}</strong></p>
                          <p>📍 Địa chỉ: {app.address}, {app.district}</p>
                          <p>🏢 Quy mô: <strong>{app.totalRooms} phòng</strong></p>
                        </div>

                        {app.legalDocsNote && (
                          <p className="text-xs text-gray-500 bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                            📝 Giấy tờ & Ghi chú: {app.legalDocsNote}
                          </p>
                        )}

                        {app.rejectionReason && (
                          <p className="text-xs text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg">
                            Lý do từ chối: {app.rejectionReason}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                        {app.status === 'pending' && (
                          <>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => approveOwnerApplication(app.id)}
                              leftIcon={<Check className="w-4 h-4" />}
                            >
                              Phê Duyệt Chủ Trọ
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => setRejectingAppId(app.id)}
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
          </div>
        )}
      </main>

      {/* Reject Room Modal */}
      {rejectingRoomId && (
        <Modal isOpen={!!rejectingRoomId} onClose={() => setRejectingRoomId(null)} title="Từ Chối Phê Duyệt Tin Đăng" maxWidth="sm">
          <form onSubmit={handleConfirmRejectRoom} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase">Lý do từ chối:</label>
              <select
                value={rejectRoomReason}
                onChange={(e) => setRejectRoomReason(e.target.value)}
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
                value={customRoomReason}
                onChange={(e) => setCustomRoomReason(e.target.value)}
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

      {/* Reject Application Modal */}
      {rejectingAppId && (
        <Modal isOpen={!!rejectingAppId} onClose={() => setRejectingAppId(null)} title="Từ Chối Hồ Sơ Nâng Cấp Chủ Trọ" maxWidth="sm">
          <form onSubmit={handleConfirmRejectApp} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase">Lý do từ chối:</label>
              <select
                value={rejectAppReason}
                onChange={(e) => setRejectAppReason(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-xs font-medium"
              >
                <option value="Thông tin giấy tờ sở hữu / PCCC chưa hợp lệ">Thông tin giấy tờ sở hữu / PCCC chưa hợp lệ</option>
                <option value="Số CCCD không khớp với người liên hệ">Số CCCD không khớp với người liên hệ</option>
                <option value="Không liên hệ được với người nộp hồ sơ">Không liên hệ được với người nộp hồ sơ</option>
                <option value="Khác">Lý do khác...</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 uppercase">Ghi chú cụ thể:</label>
              <textarea
                rows={2}
                value={customAppReason}
                onChange={(e) => setCustomAppReason(e.target.value)}
                placeholder="Vui lòng bổ sung giấy phép kinh doanh..."
                className="w-full text-xs rounded-xl border border-gray-300 p-2.5 focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <Button type="button" variant="outline" size="sm" onClick={() => setRejectingAppId(null)}>
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
