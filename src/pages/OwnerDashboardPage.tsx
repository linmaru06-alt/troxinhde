import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAppStore, SUBSCRIPTION_PLANS } from '../store/useAppStore';
import { useRealtimeRoomStatus } from '../hooks/useRealtimeRoomStatus';
import { Room } from '../types';
import { DashboardSidebar } from '../components/layout/DashboardSidebar';
import { Button } from '../components/ui/Button';
import { formatPrice } from '../components/ui/Cards';
import { getOwnerListingQuota } from '../lib/api/monetization';
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
  Coins,
  Receipt,
  Zap,
  CheckSquare,
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
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('all');
  const [selectedCycle, setSelectedCycle] = useState<string>('11/2026');
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

  const { data: listingQuota } = useQuery({
    queryKey: ['owner-listing-quota', currentUser?.id],
    queryFn: () => getOwnerListingQuota(),
    enabled: Boolean(currentUser?.id),
    staleTime: 60_000,
  });

  const activeListingPlanId = listingQuota?.activePlanId || ownerSubscription?.planId || 'free';
  const currentPlan =
    SUBSCRIPTION_PLANS.find((p) => p.id === activeListingPlanId) || SUBSCRIPTION_PLANS[0];
  const freeRemaining = listingQuota?.freeRemaining ?? Math.max(0, 2 - myRooms.length);
  const singleCredits = listingQuota?.availableSingleCredits ?? 0;
  const activeListingExpiresAt = listingQuota?.activePlanExpiresAt || ownerSubscription?.expiresAt || null;

  // Lọc theo tòa nhà đã chọn (nếu có)
  const scopedRooms = myRooms.filter(
    (r) => selectedBuildingId === 'all' || r.buildingId === selectedBuildingId
  );

  // Tổng số phòng của tất cả các tòa nhà đã được admin duyệt
  const approvedRooms = scopedRooms.filter(
    (r) => (r.status === 'Còn trống' || r.status === 'Đã cho thuê') && r.status !== 'Chờ duyệt' && r.status !== 'Bị từ chối' && r.status !== 'Hết hạn'
  );
  const totalApprovedRooms = approvedRooms.length;
  const availableRooms = scopedRooms.filter((r) => r.status === 'Còn trống').length;
  const rentedRooms = scopedRooms.filter((r) => r.status === 'Đã cho thuê').length;
  const pendingRooms = scopedRooms.filter((r) => r.status === 'Chờ duyệt').length;
  const expiredRooms = scopedRooms.filter((r) => r.status === 'Hết hạn' || calculateListingStatus(r).isExpired).length;

  const filteredRooms = scopedRooms.filter((r) => {
    if (selectedStatusTab === 'all') return true;
    if (selectedStatusTab === 'Hết hạn') return r.status === 'Hết hạn' || calculateListingStatus(r).isExpired;
    return r.status === selectedStatusTab;
  });

  // Tính toán doanh thu & tiến độ tài chính theo thiết kế Stitch
  const avgRent = 3500000;
  const expectedMonthlyRevenue = totalApprovedRooms > 0 ? totalApprovedRooms * avgRent : 61000000;
  const collectedMonthlyRevenue = rentedRooms > 0 ? rentedRooms * avgRent : 45000000;
  const uncollectedRoomsCount = Math.max(0, totalApprovedRooms - rentedRooms);
  const uncollectedAmount = totalApprovedRooms > 0 ? uncollectedRoomsCount * avgRent : 12500000;
  const overdueRoomsCount = Math.min(1, rentedRooms > 3 ? 1 : 0);
  const overdueAmount = overdueRoomsCount * avgRent;
  const collectionProgress = totalApprovedRooms > 0 ? Math.round((rentedRooms / totalApprovedRooms) * 100) : 72;

  return (
    <div className="flex bg-gray-50 min-h-[calc(100vh-4rem)]">
      {/* Desktop Sidebar */}
      <DashboardSidebar role="owner" />

      {/* Main Dashboard Content */}
      <main className="flex-1 p-4 sm:p-8 max-w-6xl space-y-6 overflow-y-auto">
        {/* 🌟 1. Top Context Bar: Lời Chào + Quota + Bộ Lọc Tòa Nhà & Kỳ Tháng (Chuẩn Stitch) */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-gray-200 shadow-2xs">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                Xin chào, {currentUser?.name || 'Nguyễn Văn Quản'}
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-black border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Chủ nhà chuẩn
              </span>
              <Link
                to="/chu-tro/quan-ly-goi"
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-900 text-[11px] font-black border border-amber-200 hover:bg-amber-100 transition shadow-2xs"
                title="Quản lý gói đăng phòng"
              >
                <Crown className="w-3.5 h-3.5 text-amber-600" />
                <span>{currentPlan.name}: {activeListingPlanId === 'free' ? `Còn ${freeRemaining}/2 phòng free` : `${totalApprovedRooms} phòng`}</span>
              </Link>
              <OfflineSyncStatusBadge />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {(cloudBookings || []).length > 0
                ? `Hôm nay bạn có ${cloudBookings.length} lịch hẹn xem phòng và danh sách thu tiền cần đối soát.`
                : 'Hôm nay hệ thống phòng trọ đang vận hành ổn định. Chúc bạn một ngày tốt lành!'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Bộ lọc Tòa nhà */}
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-3 py-1.5 text-xs font-bold shadow-2xs">
              <Building2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <select
                value={selectedBuildingId}
                onChange={(e) => setSelectedBuildingId(e.target.value)}
                className="bg-transparent text-gray-800 font-bold outline-none cursor-pointer text-xs"
              >
                <option value="all">Tất cả tòa nhà ({(buildings || []).length || 2} tòa)</option>
                {(buildings || []).map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Bộ lọc Kỳ thanh toán */}
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-3 py-1.5 text-xs font-bold shadow-2xs">
              <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
              <select
                value={selectedCycle}
                onChange={(e) => setSelectedCycle(e.target.value)}
                className="bg-transparent text-gray-800 font-bold outline-none cursor-pointer text-xs"
              >
                <option value="11/2026">Kỳ Tháng 11/2026</option>
                <option value="10/2026">Kỳ Tháng 10/2026</option>
                <option value="09/2026">Kỳ Tháng 09/2026</option>
                <option value="08/2026">Kỳ Tháng 08/2026</option>
              </select>
            </div>

            <Link to="/chu-tro/toa-nha/tao-moi">
              <Button variant="outline" size="sm" leftIcon={<Building2 className="w-4 h-4 text-emerald-600" />}>
                Thêm Tòa
              </Button>
            </Link>
            <Link to="/chu-tro/phong/tao-moi">
              <Button variant="primary" size="sm" leftIcon={<PlusCircle className="w-4 h-4" />}>
                Đăng Phòng
              </Button>
            </Link>
          </div>
        </div>

        {/* 🌟 2. THẺ DOANH THU & TIỀN THUÊ THÁNG (STITCH FINANCIAL CARD) */}
        <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-gray-900 tracking-tight">
                  Doanh Thu & Tiền Thuê {selectedCycle}
                </h2>
                <span className="text-[11px] text-gray-500 font-medium flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Cập nhật tự động đối soát qua VietQR & MoMo
                </span>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-xs text-gray-500 font-medium block">Mục tiêu dự kiến tháng này:</span>
              <span className="text-sm font-black text-gray-900">{formatPrice(expectedMonthlyRevenue)} ({totalApprovedRooms || 25} phòng)</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100 space-y-1">
              <span className="text-xs font-bold text-emerald-800 block">Tổng tiền thực tế đã thu</span>
              <div className="text-2xl sm:text-3xl font-black text-emerald-700">
                {formatPrice(collectedMonthlyRevenue)}
              </div>
              <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Đã thu {rentedRooms || 18}/{totalApprovedRooms || 25} phòng
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-100 space-y-1">
              <span className="text-xs font-bold text-amber-800 block">Chưa thu ({uncollectedRoomsCount || 7} phòng)</span>
              <div className="text-2xl sm:text-3xl font-black text-amber-800">
                {formatPrice(uncollectedAmount)}
              </div>
              <p className="text-[11px] text-amber-700 font-medium">Chờ thanh toán hoặc xuất hóa đơn</p>
            </div>

            <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-100 space-y-1">
              <span className="text-xs font-bold text-rose-800 block flex items-center justify-between">
                <span>Quá hạn ({overdueRoomsCount || 1} phòng)</span>
                <span className="px-1.5 py-0.2 rounded-md bg-rose-600 text-white text-[9px] font-black uppercase">Cần nhắc</span>
              </span>
              <div className="text-2xl sm:text-3xl font-black text-rose-700">
                {formatPrice(overdueAmount || 3500000)}
              </div>
              <Link to="/chu-tro/hoa-don" className="text-[11px] text-rose-600 font-bold hover:underline flex items-center gap-1">
                Gửi nhắc nợ Zalo ngay →
              </Link>
            </div>
          </div>

          {/* Thanh Tiến Độ Thu Tiền */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-gray-600">
                Tiến độ thu tiền phòng: <strong className="text-emerald-700">{rentedRooms || 18}/{totalApprovedRooms || 25} phòng</strong>
              </span>
              <span className="text-emerald-700 font-black">{collectionProgress}% hoàn thành</span>
            </div>
            <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden p-0.5">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-[#00a854] rounded-full transition-all duration-500 shadow-xs"
                style={{ width: `${Math.min(100, Math.max(5, collectionProgress))}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* 🌟 3. BĂNG HÀNH ĐỘNG NHANH 1-CHẠM (QUICK ACTIONS - 4 NÚT LỚN TỪ STITCH) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <Link
            to="/chu-tro/chot-so"
            className="p-4 rounded-2xl bg-white border border-gray-200 hover:border-emerald-500 hover:shadow-md transition group block space-y-2 text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-50 group-hover:bg-emerald-600 text-emerald-700 group-hover:text-white flex items-center justify-center transition">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs sm:text-sm font-black text-gray-900 block group-hover:text-emerald-700 transition">
                Chốt điện nước
              </span>
              <p className="text-[11px] text-gray-500 mt-0.5">Nhập số công tơ {selectedCycle}</p>
            </div>
          </Link>

          <Link
            to="/chu-tro/hoa-don"
            className="p-4 rounded-2xl bg-white border border-gray-200 hover:border-blue-500 hover:shadow-md transition group block space-y-2 text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-50 group-hover:bg-blue-600 text-blue-700 group-hover:text-white flex items-center justify-center transition">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs sm:text-sm font-black text-gray-900 block group-hover:text-blue-700 transition">
                Tạo hóa đơn
              </span>
              <p className="text-[11px] text-gray-500 mt-0.5">Xuất VietQR hàng loạt</p>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => setIsZnsOpen(true)}
            className="p-4 rounded-2xl bg-white border border-gray-200 hover:border-teal-500 hover:shadow-md transition group block space-y-2 text-left cursor-pointer w-full"
          >
            <div className="w-10 h-10 rounded-xl bg-teal-50 group-hover:bg-teal-600 text-teal-700 group-hover:text-white flex items-center justify-center transition">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs sm:text-sm font-black text-gray-900 block group-hover:text-teal-700 transition">
                Nhắc tiền (Zalo)
              </span>
              <p className="text-[11px] text-gray-500 mt-0.5">Gửi tin nhắn mẫu 1 chạm</p>
            </div>
          </button>

          <Link
            to="/chu-tro/phong/tao-moi"
            className="p-4 rounded-2xl bg-white border border-gray-200 hover:border-amber-500 hover:shadow-md transition group block space-y-2 text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-50 group-hover:bg-amber-500 text-amber-700 group-hover:text-white flex items-center justify-center transition">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs sm:text-sm font-black text-gray-900 block group-hover:text-amber-700 transition">
                Đăng tin phòng trống
              </span>
              <p className="text-[11px] text-gray-500 mt-0.5">Tìm khách sinh viên nhanh</p>
            </div>
          </Link>
        </div>

        {/* 🌟 4. CHECKLIST VIỆC CẦN LÀM HÔM NAY (CHECKLIST TỪ STITCH) */}
        <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs sm:text-sm font-black text-gray-900">
                Việc Cần Làm Hôm Nay (Checklist)
              </h3>
            </div>
            <span className="text-[11px] font-bold text-gray-400">
              {((cloudBookings || []).length > 0 ? 1 : 0) + (overdueRoomsCount > 0 ? 1 : 0) + 1} việc cần chú ý
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-100 flex items-start gap-2.5">
              <Clock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-blue-900 block">{(cloudBookings || []).length} lịch hẹn xem phòng</span>
                <p className="text-[11px] text-blue-700 mt-0.5">Khách hẹn kiểm tra phòng trong ngày</p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-rose-50/70 border border-rose-100 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-rose-900 block">{overdueRoomsCount} phòng quá hạn nộp tiền</span>
                <p className="text-[11px] text-rose-700 mt-0.5">Quá 5 ngày kể từ ngày xuất hóa đơn</p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-100 flex items-start gap-2.5">
              <Zap className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-emerald-900 block">Kỳ chốt số {selectedCycle}</span>
                <p className="text-[11px] text-emerald-700 mt-0.5">Sẵn sàng nhập chỉ số & xuất hóa đơn</p>
              </div>
            </div>
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
