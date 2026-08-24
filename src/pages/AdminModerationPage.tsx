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
  ShieldAlert,
  AlertCircle,
  Trash2,
} from 'lucide-react';

export const AdminModerationPage: React.FC = () => {
  const {
    rooms,
    approveRoom,
    rejectRoom,
    ownerApplications,
    approveOwnerApplication,
    rejectOwnerApplication,
    reports,
    resolveReport,
  } = useAppStore();

  const [mainSection, setMainSection] = useState<'rooms' | 'owner_upgrades' | 'reports'>('rooms');
  const [activeRoomTab, setActiveRoomTab] = useState<'Chờ duyệt' | 'Còn trống' | 'Bị từ chối'>('Chờ duyệt');

  const [rejectingRoomId, setRejectingRoomId] = useState<string | null>(null);
  const [rejectRoomReason, setRejectRoomReason] = useState<string>('Hình ảnh chụp không rõ ràng / mờ');
  const [customRoomReason, setCustomRoomReason] = useState<string>('');

  const [rejectingAppId, setRejectingAppId] = useState<string | null>(null);
  const [rejectAppReason, setRejectAppReason] = useState<string>('Thông tin giấy tờ sở hữu / CCCD chưa hợp lệ');
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
  const pendingReportsCount = reports.filter((r) => r.status === 'pending').length;

  return (
    <div className="flex bg-gray-50 min-h-[calc(100vh-4rem)]">
      <DashboardSidebar role="admin" />

      <main className="flex-1 p-4 sm:p-8 max-w-6xl space-y-6 overflow-y-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-950 tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-8 h-8 text-[#00a854]" />
              Trung Tâm Kiểm Duyệt Nền Tảng
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Phê duyệt tin đăng phòng trọ, thẩm định hồ sơ chủ trọ và xử lý phản ánh sai lệch từ người thuê
            </p>
          </div>
        </div>

        {/* Section Switcher (3 Tabs: Rooms, Owner Upgrades, Reports) */}
        <div className="flex bg-white p-1.5 rounded-2xl border border-gray-200 shadow-xs max-w-xl">
          <button
            onClick={() => setMainSection('rooms')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 ${
              mainSection === 'rooms'
                ? 'bg-[#00a854] text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span>Tin Đăng Phòng</span>
            {pendingRoomsCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${mainSection === 'rooms' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-[#00a854]'}`}>
                {pendingRoomsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setMainSection('owner_upgrades')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 ${
              mainSection === 'owner_upgrades'
                ? 'bg-[#00a854] text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span>Hồ Sơ Chủ Trọ</span>
            {pendingApps.length > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${mainSection === 'owner_upgrades' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'}`}>
                {pendingApps.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setMainSection('reports')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 ${
              mainSection === 'reports'
                ? 'bg-[#00a854] text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span>Báo Cáo Vi Phạm</span>
            {pendingReportsCount > 0 && (
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${mainSection === 'reports' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-800'}`}>
                {pendingReportsCount}
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
                      ? 'bg-[#00a854] text-white shadow-xs'
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {filteredRooms.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-gray-200 text-gray-400 text-xs">
                Không có phòng nào trong mục này.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRooms.map((room) => (
                  <div
                    key={room.id}
                    className="p-5 rounded-3xl bg-white border border-gray-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <img
                        src={room.images[0]}
                        alt=""
                        className="w-20 h-20 rounded-2xl object-cover ring-1 ring-black/5 shrink-0"
                      />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-black text-sm text-gray-950">{room.title}</h3>
                          <Badge variant={room.status === 'Còn trống' ? 'available' : room.status === 'Chờ duyệt' ? 'pending' : 'rejected'} size="sm">
                            {room.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-gray-400" /> {room.address}, {room.district}
                        </p>
                        <p className="text-xs text-gray-500">
                          Chủ trọ: <span className="font-bold text-gray-900">{room.ownerName}</span> ({room.ownerPhone}) • Giá: <span className="font-black text-[#00a854]">{formatPrice(room.price)}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto justify-end pt-3 md:pt-0 border-t md:border-t-0 border-gray-100">
                      {room.status === 'Chờ duyệt' && (
                        <>
                          <Button
                            variant="primary"
                            size="sm"
                            leftIcon={<Check className="w-4 h-4" />}
                            onClick={() => approveRoom(room.id)}
                          >
                            Phê Duyệt & Gắn Tích
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            leftIcon={<X className="w-4 h-4" />}
                            onClick={() => setRejectingRoomId(room.id)}
                          >
                            Từ Chối
                          </Button>
                        </>
                      )}
                      {room.status === 'Còn trống' && (
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<X className="w-4 h-4 text-rose-600" />}
                          onClick={() => setRejectingRoomId(room.id)}
                        >
                          Hạ Tin
                        </Button>
                      )}
                      {room.status === 'Bị từ chối' && (
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<Check className="w-4 h-4 text-[#00a854]" />}
                          onClick={() => approveRoom(room.id)}
                        >
                          Duyệt Lại
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SECTION 2: OWNER UPGRADES */}
        {mainSection === 'owner_upgrades' && (
          <div className="space-y-4 animate-fadeIn">
            {ownerApplications.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-gray-200 text-gray-400 text-xs">
                Chưa có đơn đăng ký làm chủ trọ nào.
              </div>
            ) : (
              <div className="space-y-3">
                {ownerApplications.map((app) => (
                  <div
                    key={app.id}
                    className="p-5 rounded-3xl bg-white border border-gray-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-sm text-gray-950">{app.userName}</h3>
                        <span className="text-xs text-gray-500 font-bold">({app.userPhone})</span>
                        <Badge variant={app.status === 'approved' ? 'verified' : app.status === 'pending' ? 'pending' : 'rejected'} size="sm">
                          {app.status === 'approved' ? 'Đã duyệt' : app.status === 'pending' ? 'Chờ thẩm định' : 'Từ chối'}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600">
                        🏢 Tòa nhà: <strong className="text-gray-900">{app.buildingName}</strong> ({app.totalRooms} phòng) • 📍 {app.address}, {app.district}
                      </p>
                      <p className="text-xs text-gray-500">
                        CCCD: <strong className="text-gray-900">{app.cccdNumber}</strong> • Ngày nộp: {new Date(app.createdAt).toLocaleDateString('vi-VN')}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto justify-end pt-3 md:pt-0 border-t md:border-t-0 border-gray-100">
                      {app.status === 'pending' && (
                        <>
                          <Button
                            variant="primary"
                            size="sm"
                            leftIcon={<Check className="w-4 h-4" />}
                            onClick={() => approveOwnerApplication(app.id)}
                          >
                            Cấp Quyền Chủ Trọ
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            leftIcon={<X className="w-4 h-4" />}
                            onClick={() => setRejectingAppId(app.id)}
                          >
                            Từ Chối
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SECTION 3: REPORTS MANAGEMENT */}
        {mainSection === 'reports' && (
          <div className="space-y-4 animate-fadeIn">
            {reports.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-gray-200 text-gray-400 text-xs">
                Chưa có báo cáo vi phạm nào từ người dùng.
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map((rep) => (
                  <div
                    key={rep.id}
                    className="p-5 rounded-3xl bg-white border border-rose-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-black rounded-full flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3 text-rose-600" /> Báo cáo
                        </span>
                        <h3 className="font-black text-sm text-gray-950">{rep.targetTitle}</h3>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            rep.status === 'resolved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : rep.status === 'dismissed'
                              ? 'bg-gray-100 text-gray-600'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {rep.status === 'resolved' ? 'Đã xử lý hạ tin' : rep.status === 'dismissed' ? 'Đã bỏ qua' : 'Chờ xử lý'}
                        </span>
                      </div>

                      <p className="text-xs text-rose-700 font-bold">
                        Lý do: {rep.reason}
                      </p>

                      {rep.detail && (
                        <p className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                          Chi tiết: "{rep.detail}"
                        </p>
                      )}

                      <p className="text-[11px] text-gray-400">
                        Người báo cáo: {rep.reporterName} ({rep.reporterPhone || 'N/A'}) • Ngày gửi: {new Date(rep.createdAt).toLocaleDateString('vi-VN')}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto justify-end pt-3 md:pt-0 border-t md:border-t-0 border-gray-100">
                      {rep.status === 'pending' && (
                        <>
                          <Button
                            variant="danger"
                            size="sm"
                            leftIcon={<Trash2 className="w-4 h-4" />}
                            onClick={() => resolveReport(rep.id, 'hide_listing')}
                          >
                            Hạ Tin Vi Phạm
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => resolveReport(rep.id, 'dismiss')}
                          >
                            Bỏ Qua
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* REJECT ROOM MODAL */}
      <Modal
        isOpen={!!rejectingRoomId}
        onClose={() => setRejectingRoomId(null)}
        title="Từ Chối / Hạ Tin Đăng Phòng"
        maxWidth="md"
      >
        <form onSubmit={handleConfirmRejectRoom} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-700 uppercase">Lý do từ chối:</label>
            <select
              value={rejectRoomReason}
              onChange={(e) => setRejectRoomReason(e.target.value)}
              className="w-full text-xs rounded-xl border border-gray-300 p-2.5 focus:ring-2 focus:ring-rose-500"
            >
              <option value="Hình ảnh chụp không rõ ràng / mờ">Hình ảnh chụp không rõ ràng / mờ</option>
              <option value="Giá điện nước cao bất thường so với thực tế">Giá điện nước cao bất thường so với thực tế</option>
              <option value="Địa chỉ không chính xác trên bản đồ">Địa chỉ không chính xác trên bản đồ</option>
              <option value="Phòng đã cho thuê nhưng vẫn đăng">Phòng đã cho thuê nhưng vẫn đăng</option>
              <option value="Khác">Lý do khác</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold text-gray-700 uppercase">Ghi chú thêm:</label>
            <textarea
              rows={3}
              value={customRoomReason}
              onChange={(e) => setCustomRoomReason(e.target.value)}
              placeholder="Nhập thông tin phản hồi cụ thể cho chủ trọ..."
              className="w-full text-xs rounded-xl border border-gray-300 p-2.5 focus:ring-2 focus:ring-rose-500"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="md" className="flex-1" onClick={() => setRejectingRoomId(null)}>
              Hủy
            </Button>
            <Button variant="danger" size="md" className="flex-1" type="submit">
              Xác Nhận Từ Chối
            </Button>
          </div>
        </form>
      </Modal>

      {/* REJECT APP MODAL */}
      <Modal
        isOpen={!!rejectingAppId}
        onClose={() => setRejectingAppId(null)}
        title="Từ Chối Hồ Sơ Chủ Trọ"
        maxWidth="md"
      >
        <form onSubmit={handleConfirmRejectApp} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-700 uppercase">Lý do từ chối:</label>
            <select
              value={rejectAppReason}
              onChange={(e) => setRejectAppReason(e.target.value)}
              className="w-full text-xs rounded-xl border border-gray-300 p-2.5 focus:ring-2 focus:ring-rose-500"
            >
              <option value="Thông tin CCCD / Giấy tờ không hợp lệ">Thông tin CCCD / Giấy tờ không hợp lệ</option>
              <option value="Số điện thoại không liên lạc được">Số điện thoại không liên lạc được</option>
              <option value="Địa chỉ tòa nhà không có thật">Địa chỉ tòa nhà không có thật</option>
              <option value="Khác">Lý do khác</option>
            </select>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="md" className="flex-1" onClick={() => setRejectingAppId(null)}>
              Hủy
            </Button>
            <Button variant="danger" size="md" className="flex-1" type="submit">
              Xác Nhận Từ Chối
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
