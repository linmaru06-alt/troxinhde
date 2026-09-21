import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore, SUBSCRIPTION_PLANS } from '../store/useAppStore';
import { useRealtimeRoomStatus } from '../hooks/useRealtimeRoomStatus';
import { BookingRequest } from '../types';
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
} from 'lucide-react';

import { supabase, isSupabaseConfigured } from '../lib/supabase';

export const OwnerDashboardPage: React.FC = () => {
  const {
    rooms,
    buildings,
    currentUser,
    ownerSubscription,
    bookings,
    updateBookingStatus,
    updateRoomStatus,
    showToast,
  } = useAppStore();
  const [selectedStatusTab, setSelectedStatusTab] = useState<'all' | 'Còn trống' | 'Đã cho thuê' | 'Chờ duyệt'>('all');
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [rescheduleTime, setRescheduleTime] = useState<string>('');

  // Supabase Real-time Room Status Subscription
  useRealtimeRoomStatus();

  const handleUpdateRoomStatus = (roomId: string, status: any) => {
    updateRoomStatus(roomId, status);
    if (isSupabaseConfigured && roomId.length === 36) {
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

  const handleUpdateBookingStatus = (bookingId: string, status: any, note?: string) => {
    updateBookingStatus(bookingId, status);
    if (isSupabaseConfigured && bookingId.length === 36) {
      const updates: any = {
        updated_at: new Date().toISOString(),
      };
      
      if (status === 'Đã xác nhận') updates.status = 'confirmed';
      else if (status === 'Đổi giờ') {
        updates.status = 'rescheduled';
        updates.owner_response_note = note;
      }
      else updates.status = 'cancelled';

      supabase
        .from('viewing_requests')
        .update(updates)
        .eq('id', bookingId)
        .then();
    }
  };

  const myRooms = rooms.filter((r) => r.ownerId === currentUser?.id || r.ownerId === 'user_owner_1');
  const currentPlan =
    SUBSCRIPTION_PLANS.find((p) => p.id === ownerSubscription.planId) || SUBSCRIPTION_PLANS[0];

  const totalRooms = myRooms.length;
  const availableRooms = myRooms.filter((r) => r.status === 'Còn trống').length;
  const rentedRooms = myRooms.filter((r) => r.status === 'Đã cho thuê').length;
  const pendingRooms = myRooms.filter((r) => r.status === 'Chờ duyệt').length;

  const filteredRooms = myRooms.filter((r) => {
    if (selectedStatusTab === 'all') return true;
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
                  {totalRooms}/{currentPlan.roomLimit === 999 ? '∞' : currentPlan.roomLimit} phòng
                </span>
              </div>
              <p className="text-xs text-emerald-100/90 mt-0.5">
                Hạn sử dụng đến: {new Date(ownerSubscription.expiresAt).toLocaleDateString('vi-VN')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/chu-tro/quan-ly-goi">
              <button className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition">
                Quản lý gói & Hóa đơn
              </button>
            </Link>
            <Link to="/nang-cap">
              <button className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-amber-950 text-xs font-black transition shadow-xs">
                Nâng cấp gói ⭐
              </button>
            </Link>
          </div>
        </div>

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-950 tracking-tight">
              Bảng Điều Khiển Chủ Trọ
            </h1>
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

        {/* 4 Stat Cards Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-3xl border border-gray-200 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-500 font-bold">
              <span>Tổng số phòng</span>
              <Building2 className="w-4 h-4 text-gray-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-gray-950">{totalRooms}</div>
            <p className="text-[11px] text-emerald-600 font-bold">↑ 2 tòa nhà đang vận hành</p>
          </div>

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

          <div className="bg-white p-5 rounded-3xl border border-amber-200 shadow-xs space-y-2 bg-amber-50/40">
            <div className="flex items-center justify-between text-xs text-amber-800 font-bold">
              <span>Lịch hẹn xem phòng</span>
              <Calendar className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-700">{bookings.length}</div>
            <p className="text-[11px] text-gray-500 font-medium">Khách hẹn trực tiếp</p>
          </div>
        </div>

        {/* 🌟 2-WAY BOOKING APPOINTMENTS SECTION FOR LANDLORD */}
        {bookings.length > 0 && (
          <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h3 className="text-base font-black text-gray-950 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#00a854]" />
                  Khách Đặt Lịch Xem Phòng Trực Tiếp ({bookings.length})
                </h3>
                <p className="text-xs text-gray-500">Xác nhận để khách chuẩn bị đến xem phòng đúng giờ</p>
              </div>
            </div>

            <div className="space-y-3">
              {bookings.map((b: BookingRequest) => {
                const currentStatus: BookingRequest['status'] = b.status;
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

                    {currentStatus === 'Chờ chủ trọ xác nhận' && (
                      <>
                        <button
                          onClick={() => handleUpdateBookingStatus(b.id, 'Đã xác nhận')}
                          className="px-3 py-1.5 bg-[#00a854] hover:bg-[#008f47] text-white rounded-xl text-xs font-black transition shadow-xs flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Xác nhận đón
                        </button>
                        <button
                          onClick={() => {
                            setRescheduleId(b.id);
                            setRescheduleTime(b.timeSlot);
                          }}
                          className="px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold transition"
                        >
                          Đổi giờ
                        </button>
                        <button
                          onClick={() => handleUpdateBookingStatus(b.id, 'Đã hủy')}
                          className="px-3 py-1.5 bg-gray-100 hover:bg-rose-50 hover:text-rose-600 text-gray-600 rounded-xl text-xs font-bold transition"
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
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shrink-0 transition"
                      >Gửi đề xuất</button>
                      <button 
                        onClick={() => setRescheduleId(null)} 
                        className="px-3 py-2 bg-white text-gray-600 text-xs font-bold rounded-lg border border-gray-200 shrink-0 hover:bg-gray-50 transition"
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
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setSelectedStatusTab(tab.key as any)}
                  className={`px-3.5 py-2 text-xs font-bold rounded-2xl transition ${
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
            {filteredRooms.map((room) => (
              <div
                key={room.id}
                className="p-4 rounded-3xl border border-gray-200 hover:border-[#00a854]/40 bg-white transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-2xs"
              >
                <div className="flex items-center gap-4">
                  <img
                    src={room.images[0]}
                    alt={room.title}
                    className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl object-cover shrink-0"
                  />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-sm text-gray-950">{room.roomNumber} - {room.title}</span>
                    </div>
                    <p className="text-xs text-gray-500">{room.buildingName} • {room.area} m²</p>
                    <div className="text-xs font-black text-[#00a854]">
                      {formatPrice(room.price)}
                    </div>
                  </div>
                </div>

                {/* Status selector & Actions */}
                <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                  <select
                    value={room.status}
                    onChange={(e) => handleUpdateRoomStatus(room.id, e.target.value as any)}
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
        </div>
      </main>
    </div>
  );
};
