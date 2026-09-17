import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { DashboardSidebar } from '../components/layout/DashboardSidebar';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { AdminConfirmModal } from '../components/admin/AdminConfirmModal';
import { formatPrice } from '../components/ui/Cards';
import {
  getAllRoomsAdmin,
  getPendingOwnerApplications,
  getReportsAdmin,
  approveRoom as approveRoomApi,
  rejectRoom as rejectRoomApi,
  hideRoom as hideRoomApi,
  approveOwnerApplication as approveOwnerAppApi,
  rejectOwnerApplication as rejectOwnerAppApi,
  resolveReport as resolveReportApi,
} from '../lib/api/admin';
import {
  ShieldCheck,
  Check,
  X,
  Eye,
  AlertTriangle,
  Building2,
  Clock,
  MapPin,
  Phone,
  ShieldAlert,
  RefreshCw,
  CheckSquare,
  Square,
  ZoomIn,
} from 'lucide-react';

const MODERATION_CHECKLIST = [
  { id: 'photos', label: 'Ảnh chụp đầy đủ, rõ góc phòng, không bị mờ/lóa/giả mạo' },
  { id: 'pricing', label: 'Mức giá phòng và tiền cọc phù hợp mặt bằng thực tế khu vực' },
  { id: 'location', label: 'Địa chỉ cụ thể, xác thực được trên bản đồ' },
  { id: 'amenities', label: 'Tiện ích (điều hòa, nóng lạnh, PCCC) khai báo trung thực' },
  { id: 'contact', label: 'Không chèn số điện thoại, watermark hoặc link ngoài vào ảnh/mô tả' },
];

export const AdminModerationPage: React.FC = () => {
  const { currentUser, showToast } = useAppStore();

  const [mainSection, setMainSection] = useState<'rooms' | 'owner_upgrades' | 'reports'>('rooms');
  const [activeRoomTab, setActiveRoomTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  const [rooms, setRooms] = useState<any[]>([]);
  const [ownerApps, setOwnerApps] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Xem chi tiết phòng & checklist kiểm duyệt
  const [inspectingRoom, setInspectingRoom] = useState<any | null>(null);
  const [checkedItems, setCheckedItems] = useState<string[]>([]);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  // Modal xác nhận 2 bước
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'room' | 'owner' | 'user' | 'custom';
    title: string;
    description: string;
    entityName?: string;
    onConfirm: (reason: string) => Promise<void>;
  }>({
    isOpen: false,
    type: 'room',
    title: '',
    description: '',
    onConfirm: async () => {},
  });

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [r, o, rep] = await Promise.all([
        getAllRoomsAdmin(),
        getPendingOwnerApplications(),
        getReportsAdmin(),
      ]);
      setRooms(r);
      setOwnerApps(o);
      setReports(rep);
    } catch (err) {
      console.warn('[Moderation Page] Lỗi tải dữ liệu:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleCheck = (id: string) => {
    if (checkedItems.includes(id)) {
      setCheckedItems(checkedItems.filter((i) => i !== id));
    } else {
      setCheckedItems([...checkedItems, id]);
    }
  };

  const isChecklistComplete = checkedItems.length === MODERATION_CHECKLIST.length;

  // 1. Phê duyệt phòng
  const handleApproveRoom = async (roomId: string) => {
    try {
      await approveRoomApi(roomId, currentUser);
      showToast('Đã phê duyệt phòng và gửi thông báo cho chủ trọ! 🎉', 'success');
      setInspectingRoom(null);
      setCheckedItems([]);
      fetchData();
    } catch (err: any) {
      showToast(`Lỗi khi duyệt phòng: ${err?.message || 'Thất bại'}`, 'error');
    }
  };

  // 2. Mở modal từ chối phòng
  const handleOpenRejectRoomModal = (room: any) => {
    setConfirmModal({
      isOpen: true,
      type: 'room',
      title: 'Từ chối duyệt tin đăng phòng',
      description: 'Tin đăng phòng sẽ bị chuyển sang trạng thái "Bị từ chối". Vui lòng chọn lý do chuẩn hóa và ghi chú rõ ràng.',
      entityName: room.name,
      onConfirm: async (reason: string) => {
        try {
          await rejectRoomApi(room.id, reason, currentUser);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          setInspectingRoom(null);
          showToast('Đã từ chối tin đăng phòng và lưu lý do!', 'info');
          fetchData();
        } catch (err: any) {
          showToast(`Lỗi: ${err?.message}`, 'error');
        }
      },
    });
  };

  // 3. Mở modal hạ tin phòng đang công khai
  const handleOpenHideRoomModal = (room: any) => {
    setConfirmModal({
      isOpen: true,
      type: 'room',
      title: 'Hạ tin phòng trọ khỏi hệ thống',
      description: 'Phòng này sẽ bị ẩn khỏi kết quả tìm kiếm ngay lập tức.',
      entityName: room.name,
      onConfirm: async (reason: string) => {
        try {
          await hideRoomApi(room.id, reason, currentUser);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          showToast('Đã hạ tin phòng thành công!', 'success');
          fetchData();
        } catch (err: any) {
          showToast(`Lỗi: ${err?.message}`, 'error');
        }
      },
    });
  };

  // 4. Duyệt chủ trọ
  const handleApproveOwner = async (appId: string, userId: string) => {
    try {
      await approveOwnerAppApi(appId, userId, currentUser);
      showToast('Đã phê duyệt đối tác Chủ trọ thành công!', 'success');
      fetchData();
    } catch (err: any) {
      showToast(`Lỗi: ${err?.message}`, 'error');
    }
  };

  // 5. Từ chối chủ trọ
  const handleOpenRejectOwnerModal = (app: any) => {
    setConfirmModal({
      isOpen: true,
      type: 'owner',
      title: 'Từ chối hồ sơ đăng ký Chủ trọ',
      description: 'Hồ sơ đối tác này sẽ bị từ chối. Người dùng sẽ nhận được lý do giải thích để bổ sung CCCD/giấy tờ.',
      entityName: app.building_name,
      onConfirm: async (reason: string) => {
        try {
          await rejectOwnerAppApi(app.id, app.user_id, reason, currentUser);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          showToast('Đã từ chối đơn đăng ký chủ trọ!', 'info');
          fetchData();
        } catch (err: any) {
          showToast(`Lỗi: ${err?.message}`, 'error');
        }
      },
    });
  };

  // Lọc phòng theo tab
  const filteredRooms = rooms.filter((r) => {
    const mod = r.moderation_status || 'approved';
    const st = r.status || 'Còn trống';
    if (activeRoomTab === 'pending') return mod === 'pending' || st === 'Chờ duyệt';
    if (activeRoomTab === 'approved') return (mod === 'approved' && st !== 'hidden') || st === 'Còn trống';
    if (activeRoomTab === 'rejected') return mod === 'rejected' || st === 'Bị từ chối' || st === 'hidden';
    return true;
  });

  return (
    <div className="flex bg-gray-50 min-h-[calc(100vh-4rem)]">
      <DashboardSidebar role="admin" />

      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 overflow-y-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-950 tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-8 h-8 text-[#006d37]" />
              Trung Tâm Kiểm Duyệt Nội Dung
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Thẩm định tin đăng với checklist bắt buộc, xét duyệt hồ sơ chủ trọ và xử lý báo cáo vi phạm qua Supabase thật.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="text-xs flex items-center gap-1.5 self-start sm:self-auto"
            onClick={fetchData}
            disabled={isLoading}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Làm mới
          </Button>
        </div>

        {/* Chuyển đổi 3 phân hệ: Tin đăng | Hồ sơ chủ trọ | Báo cáo */}
        <div className="flex bg-white p-1.5 rounded-2xl border border-gray-200 shadow-xs max-w-xl">
          <button
            onClick={() => setMainSection('rooms')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 ${
              mainSection === 'rooms' ? 'bg-[#006d37] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span>Tin Đăng Phòng</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                mainSection === 'rooms' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-[#006d37]'
              }`}
            >
              {rooms.filter((r) => r.moderation_status === 'pending' || r.status === 'Chờ duyệt').length}
            </span>
          </button>

          <button
            onClick={() => setMainSection('owner_upgrades')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 ${
              mainSection === 'owner_upgrades'
                ? 'bg-[#006d37] text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span>Hồ Sơ Chủ Trọ</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                mainSection === 'owner_upgrades' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
              }`}
            >
              {ownerApps.filter((a) => a.status === 'pending').length}
            </span>
          </button>

          <button
            onClick={() => setMainSection('reports')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 ${
              mainSection === 'reports' ? 'bg-[#006d37] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <span>Báo Cáo Vi Phạm</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                mainSection === 'reports' ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-800'
              }`}
            >
              {reports.filter((r) => r.status === 'pending').length}
            </span>
          </button>
        </div>

        {/* SECTION 1: DUYỆT PHÒNG TRỌ KÈM CHECKLIST */}
        {mainSection === 'rooms' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {[
                { id: 'pending', label: 'Chờ duyệt' },
                { id: 'approved', label: 'Đang công khai' },
                { id: 'rejected', label: 'Bị từ chối / Hạ tin' },
                { id: 'all', label: 'Tất cả' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveRoomTab(tab.id as any)}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition ${
                    activeRoomTab === tab.id
                      ? 'bg-[#006d37] text-white shadow-xs'
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {filteredRooms.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-gray-200 text-gray-400 text-xs">
                Không có phòng trọ nào trong danh mục này.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredRooms.map((room) => {
                  const isPending = room.moderation_status === 'pending' || room.status === 'Chờ duyệt';
                  return (
                    <div
                      key={room.id}
                      className="bg-white rounded-3xl border border-gray-200/80 shadow-xs p-5 flex flex-col justify-between space-y-4 hover:shadow-md transition-all"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isPending
                                ? 'bg-amber-100 text-amber-800'
                                : room.status === 'Bị từ chối' || room.moderation_status === 'rejected'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {isPending
                              ? 'Chờ duyệt'
                              : room.status === 'Bị từ chối' || room.moderation_status === 'rejected'
                              ? 'Bị từ chối'
                              : 'Đã duyệt'}
                          </span>
                          <span className="text-[10px] text-gray-400">
                            {new Date(room.created_at).toLocaleDateString('vi-VN')}
                          </span>
                        </div>

                        <h3 className="font-extrabold text-sm text-gray-900 line-clamp-1">{room.name}</h3>
                        <p className="text-xs text-gray-500 line-clamp-1 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          {room.buildings?.name || 'Tòa nhà'} • {room.buildings?.district || 'Hà Nội'}
                        </p>

                        <div className="text-base font-black text-[#006d37]">
                          {room.price ? `${(room.price / 1000000).toFixed(1)} tr/tháng` : 'Thỏa thuận'}
                        </div>

                        <div className="text-xs text-gray-500 bg-gray-50 p-2.5 rounded-xl space-y-1">
                          <div>
                            Chủ trọ: <strong>{room.profiles?.full_name || 'Đối tác'}</strong>
                          </div>
                          <div>SĐT: {room.profiles?.phone || 'Chưa có'}</div>
                        </div>

                        {room.rejection_reason && (
                          <div className="text-[11px] text-rose-700 bg-rose-50 border border-rose-100 p-2.5 rounded-xl">
                            <strong>Lý do từ chối:</strong> {room.rejection_reason}
                          </div>
                        )}
                      </div>

                      {/* Nút hành động */}
                      <div className="pt-2 border-t border-gray-100 flex items-center gap-2">
                        {isPending ? (
                          <Button
                            variant="primary"
                            size="sm"
                            className="w-full text-xs py-2"
                            onClick={() => {
                              setInspectingRoom(room);
                              setCheckedItems([]);
                            }}
                          >
                            <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                            Kiểm duyệt theo Checklist
                          </Button>
                        ) : (
                          <div className="flex gap-2 w-full">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 text-xs text-rose-600 border-rose-200"
                              onClick={() => handleOpenHideRoomModal(room)}
                            >
                              Hạ tin
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 text-xs"
                              onClick={() => {
                                setInspectingRoom(room);
                                setCheckedItems(MODERATION_CHECKLIST.map((c) => c.id));
                              }}
                            >
                              Xem lại
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* SECTION 2: HỒ SƠ CHỦ TRỌ */}
        {mainSection === 'owner_upgrades' && (
          <div className="space-y-4">
            {ownerApps.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-gray-200 text-gray-400 text-xs">
                Chưa có đơn đăng ký đối tác chủ trọ nào cần xử lý.
              </div>
            ) : (
              <div className="space-y-3">
                {ownerApps.map((app) => (
                  <div
                    key={app.id}
                    className="p-5 rounded-3xl bg-white border border-gray-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-sm text-gray-950">
                          {app.profiles?.full_name || 'Người dùng'}
                        </h3>
                        <span className="text-xs text-gray-500 font-bold">({app.profiles?.phone})</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            app.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : app.status === 'pending'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {app.status === 'approved'
                            ? 'Đã duyệt'
                            : app.status === 'pending'
                            ? 'Chờ thẩm định'
                            : 'Từ chối'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">
                        🏢 Tòa nhà: <strong className="text-gray-900">{app.building_name}</strong> • 📍{' '}
                        {app.address}, {app.district}
                      </p>
                      <p className="text-xs text-gray-500">
                        Số CCCD: <strong className="font-mono text-gray-900">{app.cccd_number}</strong> • Ngày nộp:{' '}
                        {new Date(app.created_at).toLocaleDateString('vi-VN')}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                      {app.status === 'pending' && (
                        <>
                          <Button
                            variant="primary"
                            size="sm"
                            className="text-xs py-2"
                            onClick={() => handleApproveOwner(app.id, app.user_id)}
                          >
                            <Check className="w-3.5 h-3.5 mr-1" />
                            Cấp quyền Chủ trọ
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="text-xs py-2"
                            onClick={() => handleOpenRejectOwnerModal(app)}
                          >
                            <X className="w-3.5 h-3.5 mr-1" />
                            Từ chối
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

        {/* SECTION 3: BÁO CÁO VI PHẠM */}
        {mainSection === 'reports' && (
          <div className="space-y-4">
            {reports.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-gray-200 text-gray-400 text-xs">
                Hiện không có báo cáo vi phạm nào từ người dùng.
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map((rep) => (
                  <div
                    key={rep.id}
                    className="p-5 rounded-3xl bg-white border border-rose-200/70 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-black rounded-full flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3 text-rose-600" /> Báo cáo vi phạm
                        </span>
                        <h3 className="font-bold text-sm text-gray-950">Lý do: {rep.reason}</h3>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            rep.status === 'resolved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : rep.status === 'dismissed'
                              ? 'bg-gray-100 text-gray-600'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {rep.status === 'resolved'
                            ? 'Đã xử lý'
                            : rep.status === 'dismissed'
                            ? 'Đã đóng'
                            : 'Đang chờ'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">
                        Đối tượng bị báo cáo: <strong>{rep.target_type}</strong> (Mã: {rep.target_id})
                      </p>
                      <p className="text-xs text-gray-800 bg-rose-50/50 p-2.5 rounded-xl border border-rose-100">
                        {rep.description || 'Không có mô tả chi tiết'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {rep.status === 'pending' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={async () => {
                              await resolveReportApi(rep.id, 'dismiss', 'Bỏ qua báo cáo', currentUser);
                              showToast('Đã đóng báo cáo!', 'info');
                              fetchData();
                            }}
                          >
                            Bỏ qua
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="text-xs"
                            onClick={() => {
                              setConfirmModal({
                                isOpen: true,
                                type: 'custom',
                                title: 'Xử lý báo cáo vi phạm & Hạ tin',
                                description: 'Hệ thống sẽ ẩn nội dung bị phản ánh và gửi thông báo nhắc nhở.',
                                entityName: rep.reason,
                                onConfirm: async (reason: string) => {
                                  await resolveReportApi(rep.id, 'hide_listing', reason, currentUser);
                                  setConfirmModal((prev) => ({ ...prev, isOpen: false }));
                                  showToast('Đã xử lý và hạ tin vi phạm!', 'success');
                                  fetchData();
                                },
                              });
                            }}
                          >
                            Hạ tin & Xử lý
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

        {/* MODAL KIỂM DUYỆT PHÒNG CHI TIẾT KÈM CHECKLIST BẮT BUỘC */}
        {inspectingRoom && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
            <div className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl border border-gray-100 animate-scaleUp space-y-5 max-h-[90vh] overflow-y-auto">
              <div className="flex items-start justify-between border-b border-gray-100 pb-3">
                <div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-[#006d37]">
                    Quy chuẩn kiểm duyệt an toàn
                  </span>
                  <h3 className="font-extrabold text-base text-gray-900 mt-1">{inspectingRoom.name}</h3>
                  <p className="text-xs text-gray-500">
                    {inspectingRoom.buildings?.name} • {inspectingRoom.buildings?.address},{' '}
                    {inspectingRoom.buildings?.district}
                  </p>
                </div>
                <button
                  onClick={() => setInspectingRoom(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Thông số phòng */}
              <div className="grid grid-cols-3 gap-3 bg-gray-50 p-3.5 rounded-2xl text-xs">
                <div>
                  <span className="text-gray-400 block text-[10px]">Giá cho thuê:</span>
                  <span className="font-bold text-[#006d37]">
                    {inspectingRoom.price ? `${(inspectingRoom.price / 1000000).toFixed(1)} tr/th` : 'Thỏa thuận'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">Diện tích:</span>
                  <span className="font-bold text-gray-800">{inspectingRoom.area || 20} m²</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">Chủ trọ:</span>
                  <span className="font-bold text-gray-800">{inspectingRoom.profiles?.full_name || 'Đối tác'}</span>
                </div>
              </div>

              {/* Mô tả */}
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-gray-700">Mô tả phòng:</h4>
                <p className="text-xs text-gray-600 bg-gray-50 p-3 rounded-xl leading-relaxed">
                  {inspectingRoom.description || 'Chủ trọ chưa nhập mô tả chi tiết.'}
                </p>
              </div>

              {/* CHECKLIST KIỂM DUYỆT BẮT BUỘC */}
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                    <CheckSquare className="w-4 h-4 text-[#006d37]" />
                    Checklist Kiểm Duyệt Bắt Buộc (Tick đủ 5/5 để duyệt):
                  </h4>
                  <span className="text-xs font-bold text-[#006d37]">
                    {checkedItems.length}/{MODERATION_CHECKLIST.length}
                  </span>
                </div>

                <div className="space-y-1.5">
                  {MODERATION_CHECKLIST.map((item) => {
                    const isChecked = checkedItems.includes(item.id);
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleToggleCheck(item.id)}
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-emerald-50/50 border-[#006d37] text-gray-900 font-semibold'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="rounded text-[#006d37] focus:ring-[#006d37]"
                        />
                        <span>{item.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Nút hành động */}
              <div className="flex gap-2.5 pt-3 border-t border-gray-100">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 py-2 text-rose-600 border-rose-200 hover:bg-rose-50"
                  onClick={() => handleOpenRejectRoomModal(inspectingRoom)}
                >
                  <X className="w-4 h-4 mr-1" />
                  Từ chối tin này
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  className="flex-1 py-2"
                  disabled={!isChecklistComplete}
                  onClick={() => handleApproveRoom(inspectingRoom.id)}
                >
                  <Check className="w-4 h-4 mr-1" />
                  {isChecklistComplete ? 'Phê duyệt & Xuất bản' : 'Cần hoàn thành Checklist'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal xác nhận thao tác nguy hiểm */}
      <AdminConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        description={confirmModal.description}
        type={confirmModal.type}
        entityName={confirmModal.entityName}
      />
    </div>
  );
};
