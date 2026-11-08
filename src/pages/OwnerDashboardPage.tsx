import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore, SUBSCRIPTION_PLANS } from '../store/useAppStore';
import { useRealtimeRoomStatus } from '../hooks/useRealtimeRoomStatus';
import { BookingRequest, Room } from '../types';
import { DashboardSidebar } from '../components/layout/DashboardSidebar';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { formatPrice } from '../components/ui/Cards';
import {
  Home,
  PlusCircle,
  TrendingUp,
  CheckCircle2,
  Clock,
  Building2,
  Eye,
  Heart,
  Calendar,
  AlertCircle,
  ChevronRight,
  Sparkles,
  Crown,
  Rocket,
  Phone,
  MessageSquare,
  XCircle,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react';

import { StaffManagementModal } from '../components/k23/staff/StaffManagementModal';
import { TieredTariffConfigModal } from '../components/k23/tariffs/TieredTariffConfigModal';
import { TaxReportModal } from '../components/k23/tax/TaxReportModal';
import { IotDeviceManagementModal } from '../components/k23/iot/IotDeviceManagementModal';
import { ParkingManagementModal } from '../components/k23/parking/ParkingManagementModal';
import { AiMeterScannerModal } from '../components/k23/ai/AiMeterScannerModal';
import { ZnsNotificationModal } from '../components/k23/zns/ZnsNotificationModal';
import { VneidDeclarationModal } from '../components/k23/vneid/VneidDeclarationModal';
import { OfflineSyncStatusBadge } from '../components/k23/mobile/OfflineSyncStatusBadge';
import { RepostRoomModal } from '../components/k23/rooms/RepostRoomModal';
import { ListingVerificationModal } from '../components/k23/trust/ListingVerificationModal';
import { calculateListingStatus } from '../utils/listingLifecycle';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getOwnerViewingRequests, updateViewingRequestStatus, ViewingRequestItem } from '../lib/api/bookings';

export const OwnerDashboardPage: React.FC = () => {
  const {
    rooms = [],
    buildings = [],
    currentUser,
    ownerSubscription,
    updateRoomStatus,
    showToast,
  } = useAppStore();
  const [cloudBookings, setCloudBookings] = useState<ViewingRequestItem[]>([]);
  const [selectedStatusTab, setSelectedStatusTab] = useState<'all' | 'Còn trống' | 'Đã cho thuê' | 'Chờ duyệt' | 'Hết hạn'>('all');
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [rescheduleTime, setRescheduleTime] = useState<string>('');
  const [isStaffModalOpen, setIsStaffModalOpen] = useState<boolean>(false);
  const [isTariffModalOpen, setIsTariffModalOpen] = useState<boolean>(false);
  const [isTaxModalOpen, setIsTaxModalOpen] = useState<boolean>(false);
  const [isIotModalOpen, setIsIotModalOpen] = useState<boolean>(false);
  const [isParkingModalOpen, setIsParkingModalOpen] = useState<boolean>(false);
  const [isAiScannerOpen, setIsAiScannerOpen] = useState<boolean>(false);
  const [isZnsOpen, setIsZnsOpen] = useState<boolean>(false);
  const [isVneidModalOpen, setIsVneidModalOpen] = useState<boolean>(false);
  const [repostRoomTarget, setRepostRoomTarget] = useState<Room | null>(null);
  const [verifyRoomTarget, setVerifyRoomTarget] = useState<Room | null>(null);

  // Nạp danh sách lịch hẹn thật từ Supabase Cloud
  React.useEffect(() => {
    if (!currentUser?.id) return;

    let isMounted = true;
    async function loadBookings() {
      try {
        const data = await getOwnerViewingRequests(currentUser!.id);
        if (isMounted) setCloudBookings(data || []);
      } catch (err) {
        console.error('[OwnerDashboard] Lỗi tải lịch hẹn:', err);
      }
    }

    loadBookings();

    const channel = supabase
      .channel(`owner-dashboard-bookings-${currentUser.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'viewing_requests' },
        () => {
          loadBookings();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id]);

  // Supabase Real-time Room Status Subscription
  useRealtimeRoomStatus();

  const handleUpdateRoomStatus = (roomId: string, status: any) => {
    updateRoomStatus(roomId, status);
    if (isSupabaseConfigured && roomId && roomId.length === 36) {
      supabase
        .from('rooms')
        .update({
          availability_status: status === 'Đã cho thuê' ? 'rented' : 'available',
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', roomId)
        .then();
    }
  };

  const handleUpdateBookingStatus = async (bookingId: string, status: any, note?: string) => {
    const res = await updateViewingRequestStatus(bookingId, status, note);
    if (res.success) {
      setCloudBookings((prev) =>
        (prev || []).map((b) => (b.id === bookingId ? { ...b, status } : b))
      );
      showToast(
        status === 'Đã xác nhận' ? 'Đã xác nhận lịch hẹn! ✅' : 'Đã cập nhật trạng thái',
        'Khách thuê sẽ nhận được thông báo về lịch hẹn của họ.',
        status === 'Đã xác nhận' ? 'success' : 'info'
      );
    } else {
      showToast('Không thể cập nhật lịch hẹn', res.error || 'Vui lòng thử lại', 'error');
    }
  };

  const isDemo = Boolean(currentUser?.isDemoAccount || currentUser?.id === '00000000-0000-0000-0000-000000000002' || currentUser?.id === 'user_owner_1');
  const myRooms = (rooms || []).filter(
    (r) =>
      r &&
      (r.ownerId === currentUser?.id ||
        (isDemo && (r.ownerId === 'user_owner_1' || r.ownerId === '00000000-0000-0000-0000-000000000002')) ||
        (currentUser?.firebaseUid && r.ownerId === currentUser.firebaseUid))
  );

  const currentPlan =
    SUBSCRIPTION_PLANS.find((p) => p.id === (ownerSubscription?.planId || 'free')) || SUBSCRIPTION_PLANS[0];

  // Tổng số phòng của tất cả các tòa nhà đã được admin duyệt
  const approvedRooms = myRooms.filter(
    (r) => (r.status === 'Còn trống' || r.status === 'Đã cho thuê') && r.status !== 'Chờ duyệt' && r.status !== 'Bị từ chối' && r.status !== 'Hết hạn'
  );
  const totalApprovedRooms = approvedRooms.length;
  const availableRooms = myRooms.filter((r) => r.status === 'Còn trống').length;
  const rentedRooms = myRooms.filter((r) => r.status === 'Đã cho thuê').length;
  const pendingRooms = myRooms.filter((r) => r.status === 'Chờ duyệt').length;
  const expiredRooms = myRooms.filter((r) => r.status === 'Hết hạn' || calculateListingStatus(r).isExpired).length;

  const filteredRooms = myRooms.filter((r) => {
    if (selectedStatusTab === 'all') return true;
    if (selectedStatusTab === 'Hết hạn') return r.status === 'Hết hạn' || calculateListingStatus(r).isExpired;
    return r.status === selectedStatusTab;
  });

  return (
    <div className="flex bg-gray-50 min-h-[calc(100vh-4rem)]">
      {/* Desktop Sidebar */}
      <DashboardSidebar role="owner" />

      {/* Main Dashboard Content */}
      <main className="flex-1 p-4 sm:p-8 max-w-6xl space-y-6 overflow-y-auto">
        {/* Subscription Plan Active Strip Banner */}
        <div className="bg-gradient-to-r from-emerald-900 to-[#00a854] text-white rounded-3xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-amber-300 shrink-0">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm sm:text-base">{currentPlan.name}</span>
                <span className="text-[10px] font-black bg-amber-400 text-amber-950 px-2 py-0.5 rounded-full">
                  {totalApprovedRooms}/{currentPlan.roomLimit === 999 ? '∞' : currentPlan.roomLimit} phòng
                </span>
              </div>
              <p className="text-xs text-emerald-100/90 mt-0.5">
                Hạn sử dụng đến: {ownerSubscription?.expiresAt ? new Date(ownerSubscription.expiresAt).toLocaleDateString('vi-VN') : 'Không giới hạn'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/chu-tro/quan-ly-goi">
              <button className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition cursor-pointer">
                Quản lý gói & Hóa đơn
              </button>
            </Link>
            <Link to="/chu-tro/quan-ly-goi">
              <button className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-amber-950 text-xs font-black transition shadow-xs cursor-pointer">
                Nâng cấp gói ⭐
              </button>
            </Link>
          </div>
        </div>

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-black text-gray-950 tracking-tight">
                Bảng Điều Khiển Chủ Trọ
              </h1>
              <OfflineSyncStatusBadge />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Quản lý danh sách phòng, lịch hẹn xem phòng và lượt tiếp cận khách thuê
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link to="/chu-tro/toa-nha/tao-moi">
              <Button variant="outline" size="md" leftIcon={<Building2 className="w-4 h-4 text-[#00a854]" />}>
                Thêm Tòa Nhà
              </Button>
            </Link>
            <Link to="/chu-tro/phong/tao-moi">
              <Button variant="primary" size="md" leftIcon={<PlusCircle className="w-4 h-4" />}>
                Đăng Phòng Mới
              </Button>
            </Link>
          </div>
        </div>

        {/* 🌟 TRUNG TÂM VẬN HÀNH K23 PMS — ĐẦY ĐỦ TÍNH NĂNG ĐÃ SẴN SÀNG */}
        <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 rounded-3xl p-6 text-white shadow-lg space-y-4 border border-emerald-500/30">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-400/30 mb-1.5">
                <Sparkles className="w-3.5 h-3.5" /> PHÂN HỆ QUẢN LÝ VẬN HÀNH PHÒNG TRỌ K23
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                Hệ Thống Thu Tiền & Quản Lý Khách Thuê Thông Minh
              </h2>
            </div>
            <Link to="/demo-hoa-don">
              <button className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer">
                <span>Mở Phòng Lab Demo K23</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
            <Link
              to="/chu-tro/hop-dong"
              className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition block space-y-1"
            >
              <span className="font-bold text-white block">Sổ Khách & Hợp Đồng</span>
              <p className="text-[11px] text-slate-300">Tủ hồ sơ CCCD, giữ cọc, chống trùng phòng</p>
            </Link>

            <Link
              to="/chu-tro/hoa-don"
              className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition block space-y-1"
            >
              <span className="font-bold text-white block">Hóa Đơn & Thu Tiền</span>
              <p className="text-[11px] text-slate-300">VietQR SePay 3s, thu từng phần, xuất Excel</p>
            </Link>

            <Link
              to="/chu-tro/chot-so"
              className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition block space-y-1"
            >
              <span className="font-bold text-white block">Chốt Số Điện Nước</span>
              <p className="text-[11px] text-slate-300">Nhập chỉ số tháng, tính tiền tự động</p>
            </Link>

            <a
              href="/tra-cuu-phong"
              target="_blank"
              rel="noreferrer"
              className="p-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition block space-y-1"
            >
              <span className="font-bold text-white block">Cổng Web Khách Thuê ↗</span>
              <p className="text-[11px] text-slate-300">Khách tra cứu bill & báo hỏng đồ không cần app</p>
            </a>

            <button
              type="button"
              onClick={() => setIsStaffModalOpen(true)}
              className="p-3.5 rounded-2xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-400/30 text-left transition block space-y-1 cursor-pointer"
            >
              <span className="font-bold text-indigo-300 block">Phân Quyền Nhân Sự</span>
              <p className="text-[11px] text-slate-300">RBAC đa cơ sở, giấu doanh thu với bảo vệ</p>
            </button>

            <button
              type="button"
              onClick={() => setIsTariffModalOpen(true)}
              className="p-3.5 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-400/30 text-left transition block space-y-1 cursor-pointer"
            >
              <span className="font-bold text-amber-300 block">Điện Bậc Thang</span>
              <p className="text-[11px] text-slate-300">Biểu giá lũy tiến EVN, ảnh công tơ</p>
            </button>

            <button
              type="button"
              onClick={() => setIsParkingModalOpen(true)}
              className="p-3.5 rounded-2xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-400/30 text-left transition block space-y-1 cursor-pointer"
            >
              <span className="font-bold text-sky-300 block">Vé Xe Tháng</span>
              <p className="text-[11px] text-slate-300">Quản lý biển số, kiểm soát an ninh ra vào</p>
            </button>

            <button
              type="button"
              onClick={() => setIsTaxModalOpen(true)}
              className="p-3.5 rounded-2xl bg-teal-500/10 hover:bg-teal-500/20 border border-teal-400/30 text-left transition block space-y-1 cursor-pointer"
            >
              <span className="font-bold text-teal-300 block">Sổ Kê Khai Thuế</span>
              <p className="text-[11px] text-slate-300">Mẫu 01/TTS, thuế TNCN 5% & GTGT 5%</p>
            </button>

            <button
              type="button"
              onClick={() => setIsIotModalOpen(true)}
              className="p-3.5 rounded-2xl bg-violet-500/10 hover:bg-violet-500/20 border border-violet-400/30 text-left transition block space-y-1 cursor-pointer"
            >
              <span className="font-bold text-violet-300 block">Cổng IoT Phần Cứng</span>
              <p className="text-[11px] text-slate-300">Đồng bộ công tơ Tuya & Khóa TTLock</p>
            </button>

            <button
              type="button"
              onClick={() => setIsAiScannerOpen(true)}
              className="p-3.5 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-400/40 text-left transition block space-y-1 cursor-pointer ring-1 ring-amber-400/30"
            >
              <span className="font-bold text-amber-300 block">AI Camera OCR</span>
              <p className="text-[11px] text-slate-300">Quét số công tơ điện nước tự động</p>
            </button>

            <button
              type="button"
              onClick={() => setIsZnsOpen(true)}
              className="p-3.5 rounded-2xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-400/40 text-left transition block space-y-1 cursor-pointer ring-1 ring-sky-400/30"
            >
              <span className="font-bold text-sky-300 block">Zalo ZNS Tích Xanh</span>
              <p className="text-[11px] text-slate-300">Gửi tin tự động 250đ/tin qua SĐT</p>
            </button>

            <button
              type="button"
              onClick={() => setIsVneidModalOpen(true)}
              className="p-3.5 rounded-2xl bg-red-500/10 hover:bg-red-500/20 border border-red-400/40 text-left transition block space-y-1 cursor-pointer ring-1 ring-red-400/30"
            >
              <span className="font-bold text-red-300 block">Cổng Lưu Trú VNeID</span>
              <p className="text-[11px] text-slate-300">Xuất XML Cổng DVC Bộ Công An</p>
            </button>
          </div>
        </div>

        {/* 4 Stat Cards Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Link to="/chu-tro/toa-nha" className="bg-white p-5 rounded-3xl border border-gray-200 shadow-xs space-y-2 hover:border-gray-300 transition block">
            <div className="flex items-center justify-between text-xs text-gray-500 font-bold">
              <span>Tổng số phòng</span>
              <Building2 className="w-4 h-4 text-gray-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-gray-950">{totalApprovedRooms}</div>
            <p className="text-[11px] text-emerald-600 font-bold">↑ Đã được duyệt công khai</p>
          </Link>

          <div className="bg-white p-5 rounded-3xl border border-emerald-200 shadow-xs space-y-2 bg-emerald-50/40">
            <div className="flex items-center justify-between text-xs text-emerald-800 font-bold">
              <span>Đang còn trống</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-[#00a854]">{availableRooms}</div>
            <p className="text-[11px] text-gray-500 font-medium">Sẵn sàng đón khách xem</p>
          </div>

          <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-500 font-bold">
              <span>Đã cho thuê</span>
              <Home className="w-4 h-4 text-gray-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-gray-800">{rentedRooms}</div>
            <p className="text-[11px] text-emerald-600 font-bold">Tỷ lệ lấp đầy cao</p>
          </div>

          <Link to="/chu-tro/lich-hen" className="bg-white p-5 rounded-3xl border border-amber-200 shadow-xs space-y-2 bg-amber-50/40 hover:border-amber-300 transition block">
            <div className="flex items-center justify-between text-xs text-amber-800 font-bold">
              <span>Lịch hẹn xem phòng</span>
              <Calendar className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-700">{(cloudBookings || []).length}</div>
            <p className="text-[11px] text-amber-700 font-bold">→ Quản lý lịch hẹn</p>
          </Link>
        </div>

        {/* 🌟 2-WAY BOOKING APPOINTMENTS SECTION FOR LANDLORD */}
        {(cloudBookings || []).length > 0 && (
          <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-base font-black text-gray-950 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#00a854]" />
                  Khách Đặt Lịch Xem Phòng Trực Tiếp ({cloudBookings.length})
                </h3>
                <p className="text-xs text-gray-500">Xác nhận để khách chuẩn bị đến xem phòng đúng giờ</p>
              </div>
              <Link
                to="/chu-tro/lich-hen"
                className="text-xs font-bold text-[#006d37] hover:underline"
              >
                Xem tất cả lịch hẹn →
              </Link>
            </div>

            <div className="space-y-3">
              {(cloudBookings || []).map((b: ViewingRequestItem) => {
                const currentStatus = b.status;
                return (
                <div
                  key={b.id}
                  className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm text-gray-950">{b.renterName}</span>
                      <span className="text-xs text-gray-500">({b.renterPhone})</span>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          currentStatus === 'Đã xác nhận'
                            ? 'bg-emerald-100 text-emerald-800'
                            : currentStatus === 'Đã hủy'
                            ? 'bg-rose-100 text-rose-800'
                            : currentStatus === 'Đổi giờ'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {currentStatus}
                      </span>
                    </div>

                    <p className="text-xs text-gray-600">
                      🏠 Phòng: <strong>{b.roomTitle}</strong> • 📅 <strong>{b.date}</strong> ({b.timeSlot})
                    </p>

                    {b.note && (
                      <p className="text-[11px] text-gray-500 italic">
                        Lời nhắn: "{b.note}"
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                    <a
                      href={`tel:${b.renterPhone}`}
                      className="px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-800 border border-gray-200 rounded-xl text-xs font-bold flex items-center gap-1 transition"
                    >
                      <Phone className="w-3.5 h-3.5 text-emerald-600" /> Gọi khách
                    </a>

                    <Link
                      to={`/chu-tro/hop-dong?renterName=${encodeURIComponent(b.renterName)}&renterPhone=${encodeURIComponent(b.renterPhone)}&roomId=${b.roomId}`}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition flex items-center gap-1"
                      title="Đưa khách quan tâm từ tin đăng vào Sổ khách K23 để lập Hợp đồng"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> Tạo HĐ từ Lead
                    </Link>

                    {currentStatus === 'Chờ chủ trọ xác nhận' && (
                      <>
                        <button
                          onClick={() => handleUpdateBookingStatus(b.id, 'Đã xác nhận')}
                          className="px-3 py-1.5 bg-[#00a854] hover:bg-[#008f47] text-white rounded-xl text-xs font-black transition shadow-xs flex items-center gap-1 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Xác nhận đón
                        </button>
                        <button
                          onClick={() => {
                            setRescheduleId(b.id);
                            setRescheduleTime(b.timeSlot);
                          }}
                          className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold transition cursor-pointer"
                        >
                          Đổi giờ
                        </button>
                        <button
                          onClick={() => handleUpdateBookingStatus(b.id, 'Đã hủy')}
                          className="px-3 py-1.5 bg-gray-100 hover:bg-rose-50 hover:text-rose-600 text-gray-600 rounded-xl text-xs font-bold transition cursor-pointer"
                        >
                          Từ chối
                        </button>
                      </>
                    )}
                  </div>
                  
                  {rescheduleId === b.id && (
                    <div className="w-full bg-blue-50/50 p-3 rounded-xl border border-blue-100 mt-3 flex items-center gap-2">
                      <input 
                        type="text" 
                        value={rescheduleTime} 
                        onChange={(e) => setRescheduleTime(e.target.value)}
                        placeholder="Vd: 10:30 - 11:30"
                        className="flex-1 text-xs p-2 rounded-lg border border-blue-200 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      />
                      <button 
                        onClick={() => {
                          handleUpdateBookingStatus(b.id, 'Đổi giờ', rescheduleTime);
                          setRescheduleId(null);
                        }}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shrink-0 transition cursor-pointer"
                      >Gửi đề xuất</button>
                      <button 
                        onClick={() => setRescheduleId(null)} 
                        className="px-3 py-2 bg-white text-gray-600 text-xs font-bold rounded-lg border border-gray-200 shrink-0 hover:bg-gray-50 transition cursor-pointer"
                      >Hủy</button>
                    </div>
                  )}
                </div>
              );
            })}
            </div>
          </div>
        )}

        {/* Room Management Section */}
        <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-xs space-y-6">
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-2 overflow-x-auto">
              {[
                { key: 'all', label: `Tất cả (${myRooms.length})` },
                { key: 'Còn trống', label: `Còn trống (${availableRooms})` },
                { key: 'Đã cho thuê', label: `Đã cho thuê (${rentedRooms})` },
                { key: 'Chờ duyệt', label: `Chờ duyệt (${pendingRooms})` },
                { key: 'Hết hạn', label: `Hết hạn (${expiredRooms})` },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setSelectedStatusTab(tab.key as any)}
                  className={`px-3.5 py-2 text-xs font-bold rounded-2xl transition cursor-pointer ${
                    selectedStatusTab === tab.key
                      ? 'bg-[#00a854] text-white shadow-xs'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <Link to="/chu-tro/phong/tao-moi">
              <Button variant="primary" size="sm" leftIcon={<PlusCircle className="w-4 h-4" />}>
                Thêm phòng
              </Button>
            </Link>
          </div>

          {/* Rooms Table / Grid */}
          <div className="space-y-4">
            {(filteredRooms || []).map((room) => {
              const isApproved =
                (room?.status === 'Còn trống' || room?.status === 'Đã cho thuê') &&
                room?.status !== 'Chờ duyệt' &&
                room?.status !== 'Bị từ chối';
              const isNeedsInfo = room?.status === 'Bị từ chối' || Boolean(room?.rejectionReason);
              const isPending = room?.status === 'Chờ duyệt';

              return (
                <div
                  key={room.id}
                  className="p-4 sm:p-5 rounded-3xl border border-gray-200 hover:border-[#00a854]/40 bg-white transition space-y-3.5 shadow-2xs"
                >
                  {/* Top Row: Room info + Status badge + Actions */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <img
                        src={room?.images?.[0] || '/images/hero-banner.webp'}
                        alt={room?.title || 'Phòng trọ'}
                        className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl object-cover shrink-0"
                      />
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-gray-950">
                            {room?.roomNumber || 'P'} - {room?.title || 'Phòng trọ'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">
                          {room?.buildingName || 'Tòa nhà'} • {room?.area || 0} m²
                        </p>
                        <div className="text-xs font-black text-[#00a854]">
                          {formatPrice(room?.price)}
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Status Badge + Action Buttons + Toggle Button underneath */}
                    <div className="flex flex-col items-stretch sm:items-end gap-2.5 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                      {/* Top Row: Status indicator + Action Buttons */}
                      <div className="flex flex-wrap items-center gap-2 justify-between sm:justify-end w-full">
                        {/* Status indicator */}
                        {isPending && (
                          <span className="px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span>Chờ duyệt</span>
                          </span>
                        )}

                        {isNeedsInfo && (
                          <Link
                            to={`/chu-tro/phong/chinh-sua/${room.id}`}
                            className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                          >
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                            <span>Bổ sung thông tin</span>
                          </Link>
                        )}

                        {/* Badge Hết hạn chu kỳ 30 ngày */}
                        {(room.status === 'Hết hạn' || calculateListingStatus(room).isExpired) && (
                          <span className="px-3 py-1.5 rounded-xl bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                            <Clock className="w-3.5 h-3.5 text-amber-700" />
                            <span>Hết hạn (Lưu trữ 60d)</span>
                          </span>
                        )}

                        {isApproved && room.status === 'Còn trống' && !calculateListingStatus(room).isExpired && (
                          <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Còn trống</span>
                          </span>
                        )}

                        {isApproved && room.status === 'Đã cho thuê' && !calculateListingStatus(room).isExpired && (
                          <span className="px-3 py-1.5 rounded-xl bg-gray-100 text-gray-700 border border-gray-200 text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                            <Home className="w-3.5 h-3.5 text-gray-500" />
                            <span>Đã cho thuê</span>
                          </span>
                        )}

                        {/* Badge hoặc nút Xác thực tin Batdongsan (Tick xanh) */}
                        {room.isVerifiedListing ? (
                          <span className="px-2.5 py-1.5 rounded-xl bg-teal-50 text-teal-800 border border-teal-200 text-xs font-black flex items-center gap-1 shadow-2xs">
                            <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                            <span>Chính chủ ✓</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setVerifyRoomTarget(room)}
                            className="px-2.5 py-1.5 rounded-xl bg-teal-50/70 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                            title="Xác thực chính chủ miễn phí để nhận Tick Xanh và tặng 48h đẩy tin"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
                            <span>Nhận Tick Xanh</span>
                          </button>
                        )}

                        {/* Nếu hết hạn: Nút Đăng lại 1 chạm (0 Xu) */}
                        {(room.status === 'Hết hạn' || calculateListingStatus(room).isExpired) && (
                          <button
                            type="button"
                            onClick={() => setRepostRoomTarget(room)}
                            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black flex items-center gap-1.5 transition shadow-xs cursor-pointer active:scale-95"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                            <span>Đăng lại (0 Xu)</span>
                          </button>
                        )}

                        {/* Action Buttons */}
                        <Link to={`/chu-tro/phong/chinh-sua/${room.id}`}>
                          <Button variant="outline" size="sm">
                            Sửa tin
                          </Button>
                        </Link>

                        <Link to={`/chu-tro/nang-cap-tin/${room.id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<Rocket className="w-3.5 h-3.5 text-amber-600" />}
                          >
                            Đẩy Tin
                          </Button>
                        </Link>

                        <Link to={`/chu-tro/phong/${room.id}`}>
                          <Button variant="outline" size="sm">
                            Chi tiết →
                          </Button>
                        </Link>
                      </div>

                      {/* Bottom Row under 3 buttons: Action Button to toggle Còn trống / Đã cho thuê */}
                      <div className="w-full flex justify-end">
                        {isApproved ? (
                          room.status === 'Còn trống' ? (
                            <button
                              type="button"
                              onClick={() => handleUpdateRoomStatus(room.id, 'Đã cho thuê')}
                              className="w-full sm:w-full py-2 px-3.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-950 border border-orange-300 hover:border-orange-400 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer active:scale-[0.98] shadow-xs"
                              title="Nhấn để đổi trạng thái sang Đã cho thuê"
                            >
                              <Home className="w-3.5 h-3.5 text-orange-600" />
                              <span>
                                Đánh dấu phòng: <strong className="text-orange-700 underline underline-offset-2">Đã cho thuê</strong> (Tạm ngừng đón khách)
                              </span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleUpdateRoomStatus(room.id, 'Còn trống')}
                              className="w-full sm:w-full py-2 px-3.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border border-emerald-300 hover:border-emerald-400 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer active:scale-[0.98] shadow-xs"
                              title="Nhấn để đổi trạng thái sang Còn trống"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>
                                Đánh dấu phòng: <strong className="text-emerald-700 underline underline-offset-2">Còn trống</strong> (Sẵn sàng mở đón khách)
                              </span>
                            </button>
                          )
                        ) : (
                          <div className="w-full py-2 px-3.5 rounded-xl bg-gray-100/90 border border-dashed border-gray-300 text-gray-400 text-xs font-semibold flex items-center justify-center gap-2 cursor-not-allowed select-none">
                            {isPending ? (
                              <>
                                <Clock className="w-3.5 h-3.5 text-gray-400" />
                                <span>Đang chờ Admin duyệt — Chưa thể đổi trạng thái</span>
                              </>
                            ) : (
                              <>
                                <AlertTriangle className="w-3.5 h-3.5 text-gray-400" />
                                <span>Cần bổ sung thông tin để mở khóa hoạt động</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* 🌟 5 MODAL VẬN HÀNH K23 PMS GIAI ĐOẠN 3 */}
      <StaffManagementModal
        isOpen={isStaffModalOpen}
        onClose={() => setIsStaffModalOpen(false)}
      />

      <TieredTariffConfigModal
        isOpen={isTariffModalOpen}
        onClose={() => setIsTariffModalOpen(false)}
      />

      <ParkingManagementModal
        isOpen={isParkingModalOpen}
        onClose={() => setIsParkingModalOpen(false)}
      />

      <TaxReportModal
        isOpen={isTaxModalOpen}
        onClose={() => setIsTaxModalOpen(false)}
      />

      <IotDeviceManagementModal
        isOpen={isIotModalOpen}
        onClose={() => setIsIotModalOpen(false)}
      />

      {/* 🌟 2 MODAL PHASE 4: AI SCANNER & ZNS TÍCH XANH */}
      <AiMeterScannerModal
        isOpen={isAiScannerOpen}
        onClose={() => setIsAiScannerOpen(false)}
        meterType="electricity"
        roomNumber="P.101"
        previousReading={1250}
        onScanSuccess={(reading) => {
          showToast('Đã quét AI thành công! 📸', `Chỉ số công tơ ${reading} kWh đã được ghi nhận.`, 'success');
        }}
      />

      <ZnsNotificationModal
        isOpen={isZnsOpen}
        onClose={() => setIsZnsOpen(false)}
        defaultPayload={{
          tenantName: 'Lê Hoàng Nam',
          tenantPhone: '0988123456',
          roomNumber: 'P.101',
          buildingName: 'Tòa Nhà Xanh Trọ Xinh',
          totalAmount: 3620000,
          billingMonth: '11/2026',
          dueDate: '05/11/2026',
        }}
      />

      <VneidDeclarationModal
        isOpen={isVneidModalOpen}
        onClose={() => setIsVneidModalOpen(false)}
        buildingName="Tòa Nhà Xanh Trọ Xinh"
        buildingAddress="Số 12 Ngõ 68 Triều Khúc, Thanh Xuân, Hà Nội"
      />

      {/* 🌟 MODAL ĐĂNG LẠI TIN 1 CHẠM (0 XU / CÓ PHÍ) */}
      {repostRoomTarget && (
        <RepostRoomModal
          isOpen={Boolean(repostRoomTarget)}
          onClose={() => setRepostRoomTarget(null)}
          room={repostRoomTarget}
          onSuccess={() => setRepostRoomTarget(null)}
        />
      )}

      {/* 🌟 MODAL XÁC THỰC TIN BATDONGSAN (TICK XANH + TẶNG 48H VIP) */}
      {verifyRoomTarget && (
        <ListingVerificationModal
          isOpen={Boolean(verifyRoomTarget)}
          onClose={() => setVerifyRoomTarget(null)}
          room={verifyRoomTarget}
        />
      )}
    </div>
  );
};
