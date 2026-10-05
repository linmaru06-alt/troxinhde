import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { supabase } from '../lib/supabase';
import { getOwnerViewingRequests, updateViewingRequestStatus, ViewingRequestItem } from '../lib/api/bookings';
import { DashboardSidebar } from '../components/layout/DashboardSidebar';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import {
  Calendar as CalendarIcon,
  Clock,
  Phone,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  ArrowRight,
  User,
  Home,
  AlertCircle,
  Loader2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  ListFilter,
  Columns,
  X,
  MapPin,
  Check,
  Send,
  Sparkles,
} from 'lucide-react';
import { useThrottleAction } from '../lib/utils/throttle';
import { BookingCardSkeleton } from '../components/ui/BookingCardSkeleton';

const WEEK_DAYS = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ nhật'];
const TIME_HOURS = [
  '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00'
];

export const OwnerBookingsPage: React.FC = () => {
  const { currentUser, rooms, bookings: storeBookings = [], showToast } = useAppStore();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<ViewingRequestItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Calendar View State: month | week | list
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'list'>('month');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [selectedBooking, setSelectedBooking] = useState<ViewingRequestItem | null>(null);

  // Reschedule state
  const [isRescheduling, setIsRescheduling] = useState<boolean>(false);
  const [rescheduleInput, setRescheduleInput] = useState<string>('');

  // 1. Load bookings for all rooms managed by this owner
  const myRooms = useMemo(() => {
    return rooms.filter(
      (r) =>
        r.ownerId === currentUser?.id ||
        (currentUser?.id === 'user_owner_1' && r.ownerId === 'user_owner_1') ||
        (currentUser?.firebaseUid && r.ownerId === currentUser.firebaseUid)
    );
  }, [rooms, currentUser]);

  const myRoomIds = useMemo(() => myRooms.map((r) => r.id), [myRooms]);

  const loadBookings = useCallback(async (silent = false) => {
    if (!currentUser?.id) {
      setIsLoading(false);
      return;
    }
    if (!silent) setIsLoading(true);
    try {
      const cloudData = await getOwnerViewingRequests(currentUser.id, myRoomIds);

      // Merge cloud data with any local store booking requests
      const mergedMap = new Map<string, ViewingRequestItem>();
      cloudData.forEach((b) => mergedMap.set(b.id, b));

      // Add local store bookings for owner's rooms if not in cloud
      storeBookings.forEach((lb) => {
        const isMyRoom = myRoomIds.includes(lb.roomId) || lb.renterId !== currentUser.id;
        if (isMyRoom && !mergedMap.has(lb.id)) {
          mergedMap.set(lb.id, {
            id: lb.id,
            roomId: lb.roomId,
            roomTitle: lb.roomTitle || 'Phòng trọ',
            renterId: lb.renterId,
            renterName: lb.renterName || 'Khách thuê',
            renterPhone: lb.renterPhone || '',
            ownerId: currentUser.id,
            date: lb.date || new Date().toISOString().split('T')[0],
            timeSlot: lb.timeSlot || '09:00 - 10:00',
            status: lb.status === 'Đã xác nhận' ? 'Đã xác nhận' : lb.status === 'Đã hủy' ? 'Đã hủy' : 'Chờ chủ trọ xác nhận',
            rawStatus: lb.status,
            note: lb.note || '',
            createdAt: lb.createdAt || new Date().toISOString(),
          });
        }
      });

      const finalBookings = Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b.date + ' ' + (b.timeSlot || '')).getTime() - new Date(a.date + ' ' + (a.timeSlot || '')).getTime()
      );

      setBookings(finalBookings);
    } catch (err) {
      console.error('[OwnerBookingsPage] Lỗi tải lịch hẹn:', err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [currentUser?.id, myRoomIds, storeBookings]);

  useEffect(() => {
    loadBookings();

    if (!currentUser?.id) return;

    // Realtime changes
    const channel = supabase
      .channel(`owner-bookings-live-${currentUser.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'viewing_requests' },
        () => {
          loadBookings(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id, loadBookings]);

  // Statistics
  const pendingCount = bookings.filter((b) => b.status === 'Chờ chủ trọ xác nhận').length;
  const confirmedCount = bookings.filter((b) => b.status === 'Đã xác nhận').length;
  const cancelledCount = bookings.filter((b) => b.status === 'Đã hủy').length;
  const completedCount = bookings.filter((b) => b.status === 'Đã hoàn thành').length;

  // Filtered
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      if (selectedStatus !== 'all' && b.status !== selectedStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = b.renterName?.toLowerCase().includes(q);
        const matchPhone = b.renterPhone?.toLowerCase().includes(q);
        const matchRoom = b.roomTitle?.toLowerCase().includes(q);
        const matchDate = b.date?.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchRoom && !matchDate) return false;
      }
      return true;
    });
  }, [bookings, selectedStatus, searchQuery]);

  // Status Colors & Badges
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'Đã xác nhận':
        return {
          pillClass: 'bg-emerald-100/90 text-emerald-950 border-l-[4px] border-emerald-500 hover:bg-emerald-200/90',
          badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          dotClass: 'bg-emerald-500',
          label: 'Đã xác nhận',
          colorName: 'emerald',
        };
      case 'Đã hủy':
        return {
          pillClass: 'bg-rose-100/80 text-rose-900 border-l-[4px] border-rose-400 hover:bg-rose-200/80 line-through opacity-75',
          badgeClass: 'bg-rose-100 text-rose-800 border-rose-200',
          dotClass: 'bg-rose-500',
          label: 'Đã hủy',
          colorName: 'rose',
        };
      case 'Đã hoàn thành':
        return {
          pillClass: 'bg-purple-100/90 text-purple-950 border-l-[4px] border-purple-500 hover:bg-purple-200/90',
          badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
          dotClass: 'bg-purple-500',
          label: 'Đã xem phòng',
          colorName: 'purple',
        };
      default:
        return {
          pillClass: 'bg-amber-100/90 text-amber-950 border-l-[4px] border-amber-500 hover:bg-amber-200/90 shadow-2xs',
          badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
          dotClass: 'bg-amber-500',
          label: 'Chờ xác nhận',
          colorName: 'amber',
        };
    }
  };

  // Calendar Navigation
  const handlePrev = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else if (viewMode === 'week') {
      const prevWeek = new Date(currentDate);
      prevWeek.setDate(prevWeek.getDate() - 7);
      setCurrentDate(prevWeek);
    } else {
      const prevMonth = new Date(currentDate);
      prevMonth.setMonth(prevMonth.getMonth() - 1);
      setCurrentDate(prevMonth);
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else if (viewMode === 'week') {
      const nextWeek = new Date(currentDate);
      nextWeek.setDate(nextWeek.getDate() + 7);
      setCurrentDate(nextWeek);
    } else {
      const nextMonth = new Date(currentDate);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      setCurrentDate(nextMonth);
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Update Status Handler with Zero-Latency Optimistic UI & Safe Rollback (Trụ cột 1)
  const { execute: handleUpdateStatus, isThrottled: isUpdatingStatus } = useThrottleAction(
    async (
      id: string,
      newStatus: 'Chờ chủ trọ xác nhận' | 'Đã xác nhận' | 'Đã hủy' | 'Đã hoàn thành',
      note?: string
    ) => {
      // 1. Snapshot previous state for safe rollback
      const previousBookings = [...bookings];
      const previousSelected = selectedBooking ? { ...selectedBooking } : null;

      // 2. Zero-latency optimistic UI update (0ms response)
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status: newStatus, ownerResponseNote: note || b.ownerResponseNote } : b))
      );
      if (selectedBooking && selectedBooking.id === id) {
        setSelectedBooking((prev) => (prev ? { ...prev, status: newStatus, ownerResponseNote: note || prev.ownerResponseNote } : null));
      }
      setIsRescheduling(false);
      setRescheduleInput('');

      // 3. Background Network Sync
      const res = await updateViewingRequestStatus(id, newStatus, note);
      if (res.success) {
        showToast(
          newStatus === 'Đã xác nhận' ? 'Đã xác nhận lịch hẹn! ✅' : 'Đã cập nhật trạng thái',
          `Khách thuê sẽ nhận được thông báo thời gian thực về lịch hẹn.`,
          newStatus === 'Đã xác nhận' ? 'success' : 'info'
        );
      } else {
        // 4. Safe Rollback if mutation fails
        setBookings(previousBookings);
        if (previousSelected) setSelectedBooking(previousSelected);
        showToast('Không thể cập nhật lịch hẹn', res.error || 'Đã tự động hoàn tác trạng thái ban đầu do lỗi mạng.', 'error');
      }
    },
    1200
  );

  // Calendar Math for Month View
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNameStr = new Intl.DateTimeFormat('vi-VN', { month: 'long', year: 'numeric' }).format(currentDate);

  const monthGridDays = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // Monday = 0, Sunday = 6
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const days: Array<{
      date: Date;
      isCurrentMonth: boolean;
      dateString: string;
      isToday: boolean;
    }> = [];

    // Preceding days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay - i);
      const ds = d.toISOString().split('T')[0];
      days.push({
        date: d,
        isCurrentMonth: false,
        dateString: ds,
        isToday: ds === new Date().toISOString().split('T')[0],
      });
    }

    // Current month days
    for (let dayNum = 1; dayNum <= lastDayOfMonth.getDate(); dayNum++) {
      const d = new Date(year, month, dayNum);
      const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      days.push({
        date: d,
        isCurrentMonth: true,
        dateString: ds,
        isToday: ds === new Date().toISOString().split('T')[0],
      });
    }

    // Trailing days to fill 35 or 42 grid cells
    const remaining = (7 - (days.length % 7)) % 7;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      const ds = d.toISOString().split('T')[0];
      days.push({
        date: d,
        isCurrentMonth: false,
        dateString: ds,
        isToday: ds === new Date().toISOString().split('T')[0],
      });
    }

    return days;
  }, [year, month]);

  // Week Grid Days
  const weekGridDays = useMemo(() => {
    const current = new Date(currentDate);
    const day = current.getDay();
    const diff = current.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    const monday = new Date(current.setDate(diff));

    const days = [];
    for (let i = 0; i < 7; i++) {
      const nextDay = new Date(monday);
      nextDay.setDate(monday.getDate() + i);
      const ds = nextDay.toISOString().split('T')[0];
      days.push({
        date: nextDay,
        dateString: ds,
        dayLabel: WEEK_DAYS[i],
        isToday: ds === new Date().toISOString().split('T')[0],
      });
    }
    return days;
  }, [currentDate]);

  // Bookings indexed by Date (YYYY-MM-DD)
  const bookingsByDate = useMemo(() => {
    const map: Record<string, ViewingRequestItem[]> = {};
    filteredBookings.forEach((b) => {
      // normalize date string to YYYY-MM-DD
      let d = b.date;
      if (d.includes('/')) {
        const parts = d.split('/');
        if (parts.length === 3) {
          d = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }
      if (!map[d]) map[d] = [];
      map[d].push(b);
    });
    return map;
  }, [filteredBookings]);

  return (
    <div className="flex bg-gray-50 min-h-[calc(100vh-4rem)]">
      <DashboardSidebar role="owner" />

      <main className="flex-1 p-3 sm:p-6 lg:p-8 max-w-7xl space-y-5 overflow-y-auto">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-gray-200">
          <div>
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <Link to="/chu-tro" className="hover:text-[#00a854]">Bảng điều khiển</Link>
              <span>/</span>
              <span className="font-bold text-gray-900">Lịch hẹn xem phòng</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-950 tracking-tight flex items-center gap-2.5">
              <CalendarIcon className="w-7 h-7 text-[#00a854]" />
              Lịch Hẹn Xem Phòng
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Theo dõi lịch hẹn trực quan theo ngày/giờ, tự động đồng bộ từ tất cả các phòng trọ bạn đang quản lý
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => loadBookings()}
              disabled={isLoading}
              className="px-3.5 py-2 bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-2xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-2xs disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Làm mới
            </button>
          </div>
        </div>

        {/* 4 Metric Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white p-4 rounded-3xl border border-gray-200 shadow-2xs space-y-1">
            <span className="text-[11px] text-gray-500 font-bold uppercase">Tổng Lịch Hẹn</span>
            <div className="text-2xl font-black text-gray-950">{bookings.length}</div>
            <p className="text-[11px] text-gray-400">Từ tất cả các phòng bạn đăng</p>
          </div>

          <div className="bg-amber-50/80 p-4 rounded-3xl border border-amber-200 shadow-2xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-amber-900 font-bold uppercase">Chờ Bạn Xác Nhận</span>
              {pendingCount > 0 && <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />}
            </div>
            <div className="text-2xl font-black text-amber-700">{pendingCount}</div>
            <p className="text-[11px] text-amber-800 font-medium">Khách đang đợi phản hồi</p>
          </div>

          <div className="bg-emerald-50/80 p-4 rounded-3xl border border-emerald-200 shadow-2xs space-y-1">
            <span className="text-[11px] text-emerald-900 font-bold uppercase">Đã Xác Nhận Đón</span>
            <div className="text-2xl font-black text-[#00a854]">{confirmedCount}</div>
            <p className="text-[11px] text-emerald-800 font-medium">Lịch hẹn sẵn sàng</p>
          </div>

          <div className="bg-purple-50/80 p-4 rounded-3xl border border-purple-200 shadow-2xs space-y-1">
            <span className="text-[11px] text-purple-900 font-bold uppercase">Đã Xem Phòng</span>
            <div className="text-2xl font-black text-purple-700">{completedCount}</div>
            <p className="text-[11px] text-purple-800 font-medium">Đã hoàn thành xem phòng</p>
          </div>
        </div>

        {/* Google Calendar Toolbar: Navigation & View Switcher */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-gray-200 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Left: Google Calendar Jump Controls */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleToday}
                className="px-3.5 py-1.5 rounded-xl border border-gray-300 hover:bg-gray-100 text-gray-800 text-xs font-bold transition shadow-2xs cursor-pointer active:scale-95"
              >
                Hôm nay
              </button>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrev}
                  className="w-8 h-8 rounded-xl border border-gray-200 hover:bg-gray-100 flex items-center justify-center text-gray-700 transition cursor-pointer"
                  title="Trước"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="w-8 h-8 rounded-xl border border-gray-200 hover:bg-gray-100 flex items-center justify-center text-gray-700 transition cursor-pointer"
                  title="Tiếp theo"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <h2 className="text-base sm:text-lg font-black text-gray-900 capitalize ml-1">
                {monthNameStr}
              </h2>
            </div>

            {/* Right: View Mode Selector & Search */}
            <div className="flex flex-wrap items-center gap-2.5 justify-between md:justify-end">
              {/* View switch pills */}
              <div className="bg-gray-100 p-1 rounded-2xl flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setViewMode('month')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                    viewMode === 'month'
                      ? 'bg-white text-[#00a854] shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span>Tháng</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode('week')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                    viewMode === 'week'
                      ? 'bg-white text-[#00a854] shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Columns className="w-3.5 h-3.5" />
                  <span>Tuần</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                    viewMode === 'list'
                      ? 'bg-white text-[#00a854] shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <ListFilter className="w-3.5 h-3.5" />
                  <span>Danh sách</span>
                </button>
              </div>

              {/* Status Filter */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="text-xs font-bold bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-700 outline-none focus:ring-2 focus:ring-[#00a854]/20 cursor-pointer"
              >
                <option value="all">Tất cả trạng thái ({bookings.length})</option>
                <option value="Chờ chủ trọ xác nhận">Chờ xác nhận ({pendingCount})</option>
                <option value="Đã xác nhận">Đã xác nhận ({confirmedCount})</option>
                <option value="Đã hoàn thành">Đã xem phòng ({completedCount})</option>
                <option value="Đã hủy">Đã hủy ({cancelledCount})</option>
              </select>

              {/* Search Bar */}
              <div className="relative w-full sm:w-48">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm khách, phòng..."
                  className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#00a854]/20"
                />
              </div>
            </div>
          </div>

          {/* Color Legend (Google Calendar Style) */}
          <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-gray-100 text-[11px] text-gray-600">
            <span className="font-bold text-gray-400">Chú giải màu sắc:</span>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-amber-400 shadow-2xs" />
              <span>Chờ xác nhận</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-emerald-500 shadow-2xs" />
              <span>Đã xác nhận đón khách</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-purple-500 shadow-2xs" />
              <span>Đã xem phòng xong</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-rose-400 shadow-2xs" />
              <span>Đã hủy / Từ chối</span>
            </div>
          </div>

          {/* Main Calendar Views (Trụ cột 1: Zero-CLS Skeleton Shimmer) */}
          {isLoading ? (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-4 py-2.5 rounded-xl border border-emerald-100 animate-pulse">
                <Sparkles className="w-4 h-4 text-[#00a854]" />
                <span>Đang đồng bộ dữ liệu Cloud Realtime và tối ưu hiển thị...</span>
              </div>
              <BookingCardSkeleton count={4} />
            </div>
          ) : viewMode === 'month' ? (
            /* 1. GOOGLE CALENDAR MONTH GRID VIEW */
            <div className="border border-gray-200 rounded-3xl overflow-hidden shadow-2xs bg-white">
              {/* Day names header */}
              <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50/80 text-center text-xs font-bold text-gray-600">
                {WEEK_DAYS.map((wd, i) => (
                  <div key={wd} className={`py-2.5 ${i === 6 ? 'text-rose-600' : ''}`}>
                    {wd}
                  </div>
                ))}
              </div>

              {/* Days grid */}
              <div className="grid grid-cols-7 divide-x divide-gray-200">
                {monthGridDays.map((dayItem, idx) => {
                  const dayBookings = bookingsByDate[dayItem.dateString] || [];
                  const isWeekend = dayItem.date.getDay() === 0;

                  return (
                    <div
                      key={idx}
                      className={`min-h-[115px] sm:min-h-[135px] p-1.5 sm:p-2 transition flex flex-col justify-between ${
                        !dayItem.isCurrentMonth
                          ? 'bg-gray-50/50 text-gray-400'
                          : isWeekend
                          ? 'bg-amber-50/20'
                          : 'bg-white'
                      } ${dayItem.isToday ? 'ring-2 ring-inset ring-[#00a854]/40 bg-emerald-50/20' : ''}`}
                    >
                      {/* Top Day Header */}
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center ${
                            dayItem.isToday
                              ? 'bg-[#00a854] text-white font-black shadow-xs'
                              : dayItem.isCurrentMonth
                              ? 'text-gray-800'
                              : 'text-gray-400'
                          }`}
                        >
                          {dayItem.date.getDate()}
                        </span>

                        {dayBookings.length > 0 && (
                          <span className="text-[10px] font-bold text-gray-400">
                            {dayBookings.length} hẹn
                          </span>
                        )}
                      </div>

                      {/* Event chips container */}
                      <div className="space-y-1 flex-1 overflow-hidden">
                        {dayBookings.slice(0, 3).map((b) => {
                          const config = getStatusConfig(b.status);
                          return (
                            <div
                              key={b.id}
                              onClick={() => {
                                setSelectedBooking(b);
                                setIsRescheduling(false);
                              }}
                              className={`px-2 py-1 rounded-lg text-[11px] font-bold truncate transition cursor-pointer active:scale-95 ${config.pillClass}`}
                              title={`${b.timeSlot || ''} • ${b.renterName} (${b.roomTitle}) - ${b.status}`}
                            >
                              <div className="flex items-center gap-1">
                                <span className="shrink-0 font-extrabold">{b.timeSlot?.split('-')[0] || ''}</span>
                                <span className="truncate">{b.renterName}</span>
                              </div>
                            </div>
                          );
                        })}

                        {dayBookings.length > 3 && (
                          <div
                            onClick={() => {
                              setSelectedBooking(dayBookings[3]);
                              setIsRescheduling(false);
                            }}
                            className="text-[10px] font-bold text-gray-500 hover:text-[#00a854] pl-1 cursor-pointer"
                          >
                            + {dayBookings.length - 3} lịch hẹn khác
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : viewMode === 'week' ? (
            /* 2. GOOGLE CALENDAR WEEK GRID VIEW */
            <div className="border border-gray-200 rounded-3xl overflow-hidden shadow-2xs bg-white overflow-x-auto">
              <div className="min-w-[700px]">
                {/* Day Header */}
                <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50 text-center divide-x divide-gray-200">
                  {weekGridDays.map((wd) => (
                    <div key={wd.dateString} className={`py-3 px-2 ${wd.isToday ? 'bg-emerald-50/70' : ''}`}>
                      <div className="text-[11px] font-bold text-gray-500">{wd.dayLabel}</div>
                      <div
                        className={`text-sm font-black mx-auto w-7 h-7 rounded-full flex items-center justify-center mt-0.5 ${
                          wd.isToday ? 'bg-[#00a854] text-white shadow-xs' : 'text-gray-900'
                        }`}
                      >
                        {wd.date.getDate()}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Day Columns */}
                <div className="grid grid-cols-7 divide-x divide-gray-200 min-h-[420px]">
                  {weekGridDays.map((wd) => {
                    const dayBookings = bookingsByDate[wd.dateString] || [];
                    return (
                      <div key={wd.dateString} className="p-2 space-y-2 bg-white">
                        {dayBookings.length === 0 ? (
                          <div className="h-full flex items-center justify-center py-10 text-gray-300 text-[11px] italic">
                            Trống
                          </div>
                        ) : (
                          dayBookings.map((b) => {
                            const config = getStatusConfig(b.status);
                            return (
                              <div
                                key={b.id}
                                onClick={() => {
                                  setSelectedBooking(b);
                                  setIsRescheduling(false);
                                }}
                                className={`p-2.5 rounded-xl border text-xs space-y-1 transition cursor-pointer hover:shadow-xs active:scale-98 ${config.pillClass}`}
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <span className="font-black text-gray-950 flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-gray-500" />
                                    {b.timeSlot}
                                  </span>
                                </div>
                                <div className="font-bold text-gray-900 truncate">{b.renterName}</div>
                                <div className="text-[10px] text-gray-600 truncate">{b.roomTitle}</div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* 3. AGENDA / LIST VIEW */
            <div className="space-y-3">
              {filteredBookings.length === 0 ? (
                <EmptyState
                  icon="calendar"
                  title="Không tìm thấy lịch hẹn nào"
                  description="Khi khách thuê đặt lịch xem phòng, các yêu cầu sẽ xuất hiện đầy đủ tại đây."
                />
              ) : (
                filteredBookings.map((b) => {
                  const config = getStatusConfig(b.status);
                  return (
                    <div
                      key={b.id}
                      className="p-4 sm:p-5 rounded-3xl bg-white border border-gray-200 hover:border-[#00a854]/40 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-black text-sm sm:text-base text-gray-950 flex items-center gap-1.5">
                            <User className="w-4 h-4 text-gray-500" />
                            {b.renterName}
                          </span>
                          {b.renterPhone && (
                            <span className="text-xs text-gray-500 font-mono">({b.renterPhone})</span>
                          )}
                          <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${config.badgeClass}`}>
                            {b.status}
                          </span>
                        </div>

                        <div className="text-xs text-gray-700 flex flex-wrap items-center gap-x-4 gap-y-1 pt-0.5">
                          <span className="flex items-center gap-1 font-semibold text-[#006d37]">
                            <Home className="w-3.5 h-3.5" />
                            {b.roomTitle}
                          </span>
                          <span className="flex items-center gap-1 text-gray-600">
                            <CalendarIcon className="w-3.5 h-3.5 text-gray-400" />
                            Ngày hẹn: <strong>{b.date}</strong>
                          </span>
                          <span className="flex items-center gap-1 text-gray-600">
                            <Clock className="w-3.5 h-3.5 text-gray-400" />
                            Khung giờ: <strong>{b.timeSlot}</strong>
                          </span>
                        </div>

                        {b.note && (
                          <p className="text-xs text-gray-500 italic bg-gray-50 p-2.5 rounded-xl border border-gray-100 mt-1.5">
                            💬 Lời nhắn từ khách: "{b.note}"
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                        {b.renterPhone && (
                          <a
                            href={`tel:${b.renterPhone}`}
                            className="px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-800 border border-gray-200 rounded-xl text-xs font-bold flex items-center gap-1 transition shadow-2xs"
                          >
                            <Phone className="w-3.5 h-3.5 text-emerald-600" /> Gọi khách
                          </a>
                        )}

                        <Link
                          to="/chu-tro/tin-nhan"
                          className="px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-800 border border-gray-200 rounded-xl text-xs font-bold flex items-center gap-1 transition shadow-2xs"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-blue-600" /> Nhắn tin
                        </Link>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedBooking(b);
                            setIsRescheduling(false);
                          }}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#006d37] border border-emerald-200 rounded-xl text-xs font-bold transition cursor-pointer"
                        >
                          Chi tiết & Xử lý →
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* GOOGLE CALENDAR EVENT DETAIL MODAL */}
        {selectedBooking && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 space-y-5 animate-scaleUp">
              {/* Header */}
              <div className="flex items-start justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-xs ${
                      getStatusConfig(selectedBooking.status).pillClass
                    }`}
                  >
                    <CalendarIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${getStatusConfig(selectedBooking.status).badgeClass}`}>
                      {selectedBooking.status}
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-gray-950 mt-0.5">
                      Chi Tiết Lịch Hẹn Xem Phòng
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedBooking(null)}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body Details */}
              <div className="space-y-3 text-xs">
                {/* Renter Card */}
                <div className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200/80 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={selectedBooking.renterAvatar || '/images/user-avatar.jpg'}
                      alt={selectedBooking.renterName}
                      className="w-10 h-10 rounded-full object-cover ring-2 ring-white shadow-xs"
                    />
                    <div>
                      <div className="font-bold text-gray-900 text-sm">{selectedBooking.renterName}</div>
                      <div className="text-gray-500 font-mono text-[11px]">
                        {selectedBooking.renterPhone || 'Chưa cung cấp SĐT'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {selectedBooking.renterPhone && (
                      <a
                        href={`tel:${selectedBooking.renterPhone}`}
                        className="p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition"
                        title="Gọi trực tiếp"
                      >
                        <Phone className="w-4 h-4" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedBooking(null);
                        navigate('/chu-tro/tin-nhan');
                      }}
                      className="p-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 transition"
                      title="Nhắn tin với khách"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Appointment Schedule & Room Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Thời Gian Hẹn</span>
                    <div className="font-black text-gray-900 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#00a854]" />
                      <span>{selectedBooking.timeSlot}</span>
                    </div>
                    <div className="text-gray-600 font-semibold">{selectedBooking.date}</div>
                  </div>

                  <div className="p-3 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Phòng Quan Tâm</span>
                    <div className="font-black text-[#006d37] truncate flex items-center gap-1.5">
                      <Home className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{selectedBooking.roomTitle}</span>
                    </div>
                    <div className="text-gray-500 truncate">{selectedBooking.roomNumber ? `Phòng: ${selectedBooking.roomNumber}` : 'Phòng trọ'}</div>
                  </div>
                </div>

                {/* Note from Renter */}
                {selectedBooking.note && (
                  <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-1">
                    <span className="text-[10px] font-bold text-amber-900 uppercase">Lời Nhắn Từ Khách Thuê</span>
                    <p className="text-xs text-amber-950 italic leading-relaxed">"{selectedBooking.note}"</p>
                  </div>
                )}

                {/* Reschedule Input Block */}
                {isRescheduling && (
                  <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 space-y-2 animate-fadeIn">
                    <span className="text-[11px] font-black text-blue-900">Đề xuất khung giờ hẹn mới cho khách:</span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={rescheduleInput}
                        onChange={(e) => setRescheduleInput(e.target.value)}
                        placeholder="Vd: 15:30 - 16:30 chiều nay..."
                        className="flex-1 px-3 py-2 bg-white rounded-xl border border-blue-300 text-xs outline-none focus:ring-2 focus:ring-blue-400"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (rescheduleInput.trim()) {
                            handleUpdateStatus(selectedBooking.id, 'Đã xác nhận', `Chủ trọ đề xuất đổi sang giờ: ${rescheduleInput.trim()}`);
                          }
                        }}
                        className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
                      >
                        Gửi
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsRescheduling(false)}
                        className="px-2.5 py-2 bg-white text-gray-500 rounded-xl text-xs font-bold border border-gray-200 transition"
                      >
                        Hủy
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-2 border-t border-gray-100 flex flex-wrap items-center justify-end gap-2">
                {selectedBooking.status === 'Chờ chủ trọ xác nhận' && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(selectedBooking.id, 'Đã xác nhận')}
                      className="px-4 py-2 bg-[#00a854] hover:bg-[#008f47] text-white rounded-xl text-xs font-black transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Xác nhận đón khách
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsRescheduling(true)}
                      className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      Đổi giờ hẹn
                    </button>

                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(selectedBooking.id, 'Đã hủy')}
                      className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      Từ chối
                    </button>
                  </>
                )}

                {selectedBooking.status === 'Đã xác nhận' && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(selectedBooking.id, 'Đã hoàn thành')}
                      className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      Đánh dấu đã xem phòng
                    </button>

                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(selectedBooking.id, 'Đã hủy')}
                      className="px-3 py-2 bg-gray-100 hover:bg-rose-50 hover:text-rose-600 text-gray-600 rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      Hủy lịch hẹn
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedBooking(null)}
                  className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
