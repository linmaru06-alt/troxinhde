import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { supabase } from '../lib/supabase';
import { getOwnerViewingRequests, updateViewingRequestStatus, ViewingRequestItem } from '../lib/api/bookings';
import { DashboardSidebar } from '../components/layout/DashboardSidebar';
import { EmptyState } from '../components/ui/EmptyState';
import {
  Calendar,
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
} from 'lucide-react';

export const OwnerBookingsPage: React.FC = () => {
  const { currentUser, showToast } = useAppStore();
  const [bookings, setBookings] = useState<ViewingRequestItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const loadBookings = useCallback(async (silent = false) => {
    if (!currentUser?.id) {
      setIsLoading(false);
      return;
    }
    if (!silent) setIsLoading(true);
    try {
      const data = await getOwnerViewingRequests(currentUser.id);
      setBookings(data);
    } catch (err) {
      console.error('[OwnerBookingsPage] Lỗi tải lịch hẹn từ Supabase Cloud:', err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    loadBookings();

    if (!currentUser?.id) return;

    // Lắng nghe Realtime: khi có khách thuê đặt lịch mới hoặc hủy lịch
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

  const pendingCount = bookings.filter((b) => b.status === 'Chờ chủ trọ xác nhận').length;
  const confirmedCount = bookings.filter((b) => b.status === 'Đã xác nhận').length;
  const cancelledCount = bookings.filter((b) => b.status === 'Đã hủy').length;

  const filteredBookings = bookings.filter((b) => {
    if (selectedStatus !== 'all' && b.status !== selectedStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = b.renterName?.toLowerCase().includes(q);
      const matchPhone = b.renterPhone?.toLowerCase().includes(q);
      const matchRoom = b.roomTitle?.toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchRoom) return false;
    }
    return true;
  });

  const handleUpdateStatus = async (id: string, status: 'Chờ chủ trọ xác nhận' | 'Đã xác nhận' | 'Đã hủy' | 'Đã hoàn thành') => {
    const res = await updateViewingRequestStatus(id, status);
    if (res.success) {
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status } : b))
      );
      showToast(
        status === 'Đã xác nhận' ? 'Đã xác nhận lịch hẹn! ✅' : 'Đã cập nhật trạng thái',
        `Khách thuê sẽ nhận được thông báo về lịch hẹn của họ.`,
        status === 'Đã xác nhận' ? 'success' : 'info'
      );
    } else {
      showToast('Không thể cập nhật lịch hẹn', res.error || 'Vui lòng thử lại', 'error');
    }
  };

  return (
    <div className="flex bg-gray-50 min-h-[calc(100vh-4rem)]">
      <DashboardSidebar role="owner" />

      <main className="flex-1 p-4 sm:p-8 max-w-6xl space-y-6 overflow-y-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
          <div>
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <Link to="/chu-tro" className="hover:text-[#006d37]">Bảng điều khiển</Link>
              <span>/</span>
              <span className="font-bold text-gray-900">Lịch hẹn xem phòng</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-950 tracking-tight flex items-center gap-2.5">
              <Calendar className="w-7 h-7 text-[#00a854]" />
              Quản Lý Lịch Hẹn Xem Phòng
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Theo dõi và xác nhận các yêu cầu hẹn xem phòng trực tiếp từ khách thuê Trọ Xinh (Đồng bộ Cloud Realtime)
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadBookings()}
            disabled={isLoading}
            className="self-start sm:self-auto px-3.5 py-2 bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-2xl text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-2xs disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-xs space-y-1">
            <span className="text-xs text-gray-500 font-bold">Tổng số lịch hẹn</span>
            <div className="text-2xl sm:text-3xl font-black text-gray-950">{bookings.length}</div>
            <p className="text-[11px] text-gray-400">Từ tất cả các tin đăng của bạn</p>
          </div>

          <div className="bg-amber-50/70 p-5 rounded-3xl border border-amber-200 shadow-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-amber-900 font-bold">Cần bạn xác nhận ngay</span>
              {pendingCount > 0 && (
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
              )}
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-700">{pendingCount}</div>
            <p className="text-[11px] text-amber-700 font-medium">Khách đang chờ bạn phản hồi</p>
          </div>

          <div className="bg-emerald-50/70 p-5 rounded-3xl border border-emerald-200 shadow-xs space-y-1">
            <span className="text-xs text-emerald-900 font-bold">Đã xác nhận đón khách</span>
            <div className="text-2xl sm:text-3xl font-black text-[#00a854]">{confirmedCount}</div>
            <p className="text-[11px] text-emerald-700 font-medium">Sắp tới ngày hẹn xem</p>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="bg-white rounded-3xl p-5 border border-gray-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Status Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
              {[
                { key: 'all', label: `Tất cả (${bookings.length})` },
                { key: 'Chờ chủ trọ xác nhận', label: `Chờ duyệt (${pendingCount})` },
                { key: 'Đã xác nhận', label: `Đã xác nhận (${confirmedCount})` },
                { key: 'Đã hủy', label: `Đã hủy (${cancelledCount})` },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setSelectedStatus(tab.key)}
                  className={`px-3.5 py-2 text-xs font-bold rounded-2xl transition whitespace-nowrap cursor-pointer ${
                    selectedStatus === tab.key
                      ? 'bg-[#00a854] text-white shadow-xs'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm tên, SĐT, phòng..."
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-[#00a854]/20 focus:border-[#00a854] outline-none"
              />
            </div>
          </div>

          {/* Bookings List */}
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-[#00a854] animate-spin" />
              <p className="text-xs text-gray-500 font-medium">Đang đồng bộ danh sách lịch hẹn từ Cloud...</p>
            </div>
          ) : filteredBookings.length === 0 ? (
            <EmptyState
              icon="calendar"
              title="Không tìm thấy lịch hẹn phù hợp"
              description="Khi khách đặt lịch xem phòng, yêu cầu sẽ hiển thị đầy đủ tại đây."
            />
          ) : (
            <div className="space-y-3 pt-2">
              {filteredBookings.map((b) => (
                <div
                  key={b.id}
                  className="p-4 sm:p-5 rounded-2xl bg-gray-50/80 border border-gray-200 hover:border-gray-300 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
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
                      <span
                        className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                          b.status === 'Đã xác nhận'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : b.status === 'Đã hủy'
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {b.status}
                      </span>
                    </div>

                    <div className="text-xs text-gray-700 flex flex-wrap items-center gap-x-4 gap-y-1 pt-0.5">
                      <span className="flex items-center gap-1 font-semibold text-[#006d37]">
                        <Home className="w-3.5 h-3.5" />
                        {b.roomTitle}
                      </span>
                      <span className="flex items-center gap-1 text-gray-600">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        Ngày hẹn: <strong>{b.date}</strong>
                      </span>
                      <span className="flex items-center gap-1 text-gray-600">
                        <Clock className="w-3.5 h-3.5 text-gray-400" />
                        Khung giờ: <strong>{b.timeSlot}</strong>
                      </span>
                    </div>

                    {b.note && (
                      <p className="text-xs text-gray-500 italic bg-white p-2.5 rounded-xl border border-gray-100 mt-1.5">
                        💬 Lời nhắn từ khách: "{b.note}"
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-200/60">
                    {b.renterPhone && (
                      <a
                        href={`tel:${b.renterPhone}`}
                        className="px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-800 border border-gray-200 rounded-xl text-xs font-bold flex items-center gap-1 transition shadow-2xs"
                      >
                        <Phone className="w-3.5 h-3.5 text-emerald-600" /> Gọi khách
                      </a>
                    )}

                    <Link
                      to="/tin-nhan"
                      className="px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-800 border border-gray-200 rounded-xl text-xs font-bold flex items-center gap-1 transition shadow-2xs"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-blue-600" /> Nhắn tin
                    </Link>

                    {b.status === 'Chờ chủ trọ xác nhận' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(b.id, 'Đã xác nhận')}
                          className="px-3.5 py-1.5 bg-[#00a854] hover:bg-[#008f47] text-white rounded-xl text-xs font-black transition shadow-xs flex items-center gap-1 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Xác nhận đón
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateStatus(b.id, 'Đã hủy')}
                          className="px-3 py-1.5 bg-white hover:bg-rose-50 hover:text-rose-600 text-gray-600 border border-gray-200 rounded-xl text-xs font-bold transition cursor-pointer"
                        >
                          Từ chối
                        </button>
                      </>
                    )}

                    {b.status === 'Đã xác nhận' && (
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(b.id, 'Đã hủy')}
                        className="px-3 py-1.5 bg-gray-100 hover:bg-rose-50 text-gray-500 hover:text-rose-600 rounded-xl text-xs font-semibold transition cursor-pointer"
                      >
                        Hủy lịch hẹn
                      </button>
                    )}
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
