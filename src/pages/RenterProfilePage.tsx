import React from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { RolePermissionSection } from '../components/profile/RolePermissionSection';
import {
  User,
  Phone,
  Mail,
  School,
  MapPin,
  Heart,
  Calendar,
  MessageSquare,
  LogOut,
  Edit,
  ShieldCheck,
  Building2,
  ArrowRight,
  Clock,
} from 'lucide-react';

export const RenterProfilePage: React.FC = () => {
  const { currentUser, savedRoomIds, bookings, logout } = useAppStore();

  if (!currentUser) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-bold">Vui lòng đăng nhập để xem trang cá nhân</h2>
        <Link to="/dang-nhap" className="text-[#006d37] font-semibold mt-2 inline-block">Đăng nhập ngay →</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      {/* Profile Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-md space-y-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-6 border-b border-gray-100 text-center sm:text-left">
          <img
            src={currentUser.avatarUrl}
            alt={currentUser.name}
            className="w-24 h-24 rounded-full object-cover ring-4 ring-emerald-100 shadow-md"
          />
          <div className="space-y-1.5 flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h1 className="text-2xl font-black text-gray-900">{currentUser.name}</h1>
              {currentUser.verified && <Badge variant="verified" size="sm">Đã xác thực SV</Badge>}
              <Badge variant={currentUser.role === 'owner' ? 'verified' : 'available'} size="sm" showIcon={false}>
                {currentUser.role === 'owner' ? '🏢 Chủ Trọ Đối Tác' : currentUser.role === 'admin' ? '🛡️ Admin' : '👤 Người Thuê'}
              </Badge>
            </div>
            <p className="text-xs text-gray-500 flex items-center justify-center sm:justify-start gap-1">
              <School className="w-3.5 h-3.5 text-[#006d37]" />
              {currentUser.school || 'Sinh viên đại học'} • {currentUser.year || 'Năm 3'}
            </p>
            <p className="text-xs text-gray-500 flex items-center justify-center sm:justify-start gap-1">
              <Phone className="w-3.5 h-3.5 text-gray-400" />
              {currentUser.phone}
            </p>
          </div>

          <button onClick={logout} className="text-xs font-semibold text-rose-600 hover:underline flex items-center gap-1">
            <LogOut className="w-4 h-4" /> Đăng xuất
          </button>
        </div>

        {/* Quick Links Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            to="/da-luu"
            className="p-4 bg-emerald-50/60 hover:bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-between transition group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-100 text-[#006d37] rounded-xl">
                <Heart className="w-5 h-5" />
              </div>
              <div className="text-left">
                <span className="text-xs text-gray-500 font-medium">Phòng đã lưu</span>
                <h4 className="text-lg font-black text-[#006d37]">{savedRoomIds.length} phòng</h4>
              </div>
            </div>
          </Link>

          <Link
            to="/tin-nhan"
            className="p-4 bg-blue-50/60 hover:bg-blue-50 rounded-2xl border border-blue-100 flex items-center justify-between transition group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-100 text-[#006492] rounded-xl">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div className="text-left">
                <span className="text-xs text-gray-500 font-medium">Hộp thư tin nhắn</span>
                <h4 className="text-lg font-black text-[#006492]">Hội thoại</h4>
              </div>
            </div>
          </Link>

          <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-100 text-[#904d00] rounded-xl">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="text-left">
                <span className="text-xs text-gray-500 font-medium">Lịch hẹn xem phòng</span>
                <h4 className="text-lg font-black text-[#904d00]">{bookings.length} lịch hẹn</h4>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Role & Permissions Section */}
      <RolePermissionSection user={currentUser} />

      {/* Bookings Section */}
      {bookings.length > 0 && (
        <div className="bg-white rounded-3xl p-6 border border-gray-200 space-y-4 shadow-xs">
          <h3 className="text-base font-bold text-gray-900">Lịch Hẹn Xem Phòng Của Bạn</h3>
          <div className="space-y-3">
            {bookings.map((b) => (
              <div key={b.id} className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-gray-900">{b.roomTitle}</h4>
                  <p className="text-xs text-gray-500">
                    Ngày: {b.date} • Khung giờ: {b.timeSlot}
                  </p>
                </div>
                <Badge variant="pending" size="sm">{b.status}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
