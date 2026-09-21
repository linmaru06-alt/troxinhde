import React from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { RolePermissionSection } from '../components/profile/RolePermissionSection';
import { AvatarUploader } from '../components/ui/AvatarUploader';
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
  ShieldCheck,
  ShieldOff,
  Building2,
  ArrowRight,
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  AlertCircle,
} from 'lucide-react';

export const RenterProfilePage: React.FC = () => {
  const {
    currentUser,
    setCurrentUser,
    savedRoomIds,
    bookings,
    updateBookingStatus,
    logout,
    blockedUserIds,
    unblockUser,
    roommates,
  } = useAppStore();

  if (!currentUser) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-bold text-gray-900">Vui lòng đăng nhập để xem trang cá nhân</h2>
        <Link to="/dang-nhap" className="text-[#00a854] font-black mt-2 inline-block hover:underline">
          Đăng nhập ngay →
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      {/* Profile Header Card */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-md space-y-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-6 border-b border-gray-100 text-center sm:text-left">
          <AvatarUploader
            currentUrl={currentUser.avatarUrl}
            size="lg"
            folder="troxinh/avatars"
            onComplete={(urls) => {
              if (urls[0] && currentUser) {
                setCurrentUser({ ...currentUser, avatarUrl: urls[0] });
              }
            }}
          />
          <div className="space-y-1.5 flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h1 className="text-2xl font-black text-gray-950">{currentUser.name}</h1>
              {currentUser.verified && <Badge variant="verified" size="sm">Đã xác thực SV</Badge>}
              <Badge variant={currentUser.role === 'owner' ? 'verified' : 'available'} size="sm" showIcon={false}>
                {currentUser.role === 'owner' ? '🏢 Chủ Trọ Đối Tác' : currentUser.role === 'admin' ? '🛡️ Admin' : '👤 Người Thuê'}
              </Badge>
            </div>
            <p className="text-xs text-gray-500 font-medium flex items-center justify-center sm:justify-start gap-1">
              <School className="w-3.5 h-3.5 text-[#00a854]" />
              {currentUser.school || 'Sinh viên đại học'} • {currentUser.year || 'Năm 3'}
            </p>
            <div className="flex flex-col gap-1.5 mt-2">
              <p className="text-xs text-gray-500 font-medium flex items-center justify-center sm:justify-start gap-1">
                <Phone className="w-3.5 h-3.5 text-gray-400" />
                {currentUser.phone || 'Chưa cập nhật SĐT'}
                {currentUser.phoneVerified && (
                  <span title="Đã xác minh" className="inline-flex">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" aria-hidden="true" />
                  </span>
                )}
              </p>
              {currentUser.email && (
                <p className="text-xs text-gray-500 font-medium flex items-center justify-center sm:justify-start gap-1">
                  <Mail className="w-3.5 h-3.5 text-gray-400" />
                  {currentUser.email}
                  {currentUser.emailVerified && (
                    <span title="Đã xác minh" className="inline-flex">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" aria-hidden="true" />
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>

          <button onClick={logout} className="text-xs font-bold text-rose-600 hover:underline flex items-center gap-1">
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
              <div className="p-2.5 bg-emerald-100 text-[#00a854] rounded-xl">
                <Heart className="w-5 h-5" />
              </div>
              <div className="text-left">
                <span className="text-xs text-gray-500 font-bold">Phòng đã lưu</span>
                <h4 className="text-lg font-black text-[#00a854]">{savedRoomIds.length} phòng</h4>
              </div>
            </div>
          </Link>

          <Link
            to="/tin-nhan"
            className="p-4 bg-blue-50/60 hover:bg-blue-50 rounded-2xl border border-blue-100 flex items-center justify-between transition group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div className="text-left">
                <span className="text-xs text-gray-500 font-bold">Hộp thư tin nhắn</span>
                <h4 className="text-lg font-black text-blue-700">Hội thoại</h4>
              </div>
            </div>
          </Link>

          <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="text-left">
                <span className="text-xs text-gray-500 font-bold">Lịch hẹn xem phòng</span>
                <h4 className="text-lg font-black text-amber-800">{bookings.length} lịch hẹn</h4>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bookings Section (Khu vực quản lý lịch hẹn 2 chiều của người thuê) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 space-y-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-black text-gray-950 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#00a854]" />
              Lịch Hẹn Xem Phòng Trực Tiếp ({bookings.length})
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Xác nhận 2 chiều và thông báo tự động với chủ trọ</p>
          </div>

          <Link to="/tim-phong">
            <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
              Tìm thêm phòng
            </Button>
          </Link>
        </div>

        {bookings.length === 0 ? (
          <div className="text-center py-8 text-xs text-gray-400 space-y-2">
            <p>Bạn chưa có lịch hẹn xem phòng nào.</p>
            <Link to="/tim-phong" className="text-[#00a854] font-bold hover:underline">
              Khám phá phòng trọ có thể đặt lịch ngay →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((b) => {
              const isConfirmed = b.status === 'Đã xác nhận';
              const isCancelled = b.status === 'Đã hủy';
              return (
                <div
                  key={b.id}
                  className="p-5 rounded-2xl bg-gray-50/80 border border-gray-200/90 space-y-3 hover:border-emerald-300 transition"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <Link to={`/phong/${b.roomId}`} className="text-sm font-black text-gray-950 hover:text-[#00a854]">
                        {b.roomTitle}
                      </Link>
                      <div className="flex items-center gap-2 text-xs text-gray-600 mt-1 font-medium">
                        <span className="flex items-center gap-1 font-bold text-gray-900">
                          <Calendar className="w-3.5 h-3.5 text-[#00a854]" /> {b.date}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 font-bold text-gray-900">
                          <Clock className="w-3.5 h-3.5 text-[#00a854]" /> {b.timeSlot}
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isConfirmed ? (
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-black rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Đã xác nhận
                        </span>
                      ) : isCancelled ? (
                        <span className="px-3 py-1 bg-rose-100 text-rose-800 text-xs font-black rounded-full flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" /> Đã hủy
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-black rounded-full flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-amber-600" /> Chờ chủ trọ xác nhận
                        </span>
                      )}
                    </div>
                  </div>

                  {b.note && (
                    <p className="text-[11px] text-gray-500 italic bg-white p-2.5 rounded-xl border border-gray-100">
                      Ghi chú: "{b.note}"
                    </p>
                  )}

                  <div className="pt-2 border-t border-gray-200/60 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Link to="/hop-dong-mau" target="_blank" className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" /> Xem mẫu hợp đồng
                      </Link>
                    </div>

                    {!isCancelled && (
                      <button
                        onClick={() => updateBookingStatus(b.id, 'Đã hủy')}
                        className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline"
                      >
                        Hủy lịch hẹn này
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Blocked Contacts Management Section */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 space-y-4 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-black text-gray-950 flex items-center gap-2">
              <ShieldOff className="w-5 h-5 text-amber-600" />
              Liên Hệ Đang Chặn ({blockedUserIds.length})
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Danh sách tài khoản bạn đã chặn trong tính năng tìm bạn ở ghép và tin nhắn
            </p>
          </div>
        </div>

        {blockedUserIds.length === 0 ? (
          <p className="text-xs text-gray-400 py-2">Bạn chưa chặn liên hệ nào.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {blockedUserIds.map((userId) => {
              const matchedRoommate = roommates.find((r) => r.userId === userId);
              const displayName = matchedRoommate?.userName || `Người dùng #${userId.slice(0, 8)}`;
              return (
                <div key={userId} className="py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center font-bold text-xs shrink-0">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-bold text-gray-900 truncate">{displayName}</h4>
                      <p className="text-[11px] text-gray-400 truncate">ID: {userId.slice(0, 12)}...</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => unblockUser(userId)}
                    leftIcon={<ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />}
                  >
                    Bỏ chặn
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Role & Permissions Section */}
      <RolePermissionSection user={currentUser} />
    </div>
  );
};
