import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  Bell,
  Settings,
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
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'profile' | 'bookings' | 'blocked'>('profile');

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
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fadeIn">
      {/* 1. Header & Verification Status */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm flex flex-col md:flex-row gap-8 items-start relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-emerald-50 rounded-full blur-3xl -z-10 opacity-60"></div>
        
        {/* Avatar & Basic Info */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 flex-1 w-full text-center sm:text-left z-10">
          <AvatarUploader
            currentUrl={currentUser.avatarUrl}
            size="lg"
            folder="troxinh/avatars"
            onComplete={async (urls) => {
              if (urls[0] && currentUser) {
                const updatedUser = { ...currentUser, avatarUrl: urls[0] };
                setCurrentUser(updatedUser);
                
                // Đồng bộ lên Supabase để không bị mất khi F5
                try {
                  const { syncUserToSupabase } = await import('../lib/supabaseAuthSync');
                  syncUserToSupabase({
                    id: currentUser.id,
                    name: currentUser.name,
                    email: currentUser.email,
                    phone: currentUser.phone,
                    role: currentUser.role as any,
                    avatar_url: urls[0],
                    verified: currentUser.verified,
                  });
                } catch (err) {
                  console.warn('Lỗi khi đồng bộ ảnh đại diện:', err);
                }
              }
            }}
          />
          <div className="space-y-3 flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <h1 className="text-2xl font-black text-gray-950">{currentUser.name}</h1>
              <Badge variant={currentUser.role === 'owner' ? 'verified' : 'available'} size="sm" showIcon={false}>
                {currentUser.role === 'owner' ? '🏢 Chủ Trọ Đối Tác' : currentUser.role === 'admin' ? '🛡️ Admin' : '👤 Người Thuê'}
              </Badge>
            </div>
            
            <p className="text-sm text-gray-600 font-medium flex items-center justify-center sm:justify-start gap-1.5">
              <School className="w-4 h-4 text-[#00a854]" />
              {currentUser.school || 'Sinh viên đại học'} • {currentUser.year || 'Năm 3'}
            </p>

            {/* Explicit Verification Status Cards */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 mt-2">
              <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-bold ${currentUser.phoneVerified ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                <Phone className="w-3.5 h-3.5" />
                {currentUser.phone || 'Chưa cập nhật SĐT'}
                {currentUser.phoneVerified && <ShieldCheck className="w-4 h-4 text-emerald-600 ml-1" />}
              </div>
              
              {currentUser.email && (
                <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-bold ${currentUser.emailVerified ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                  <Mail className="w-3.5 h-3.5" />
                  {currentUser.email}
                  {currentUser.emailVerified && <ShieldCheck className="w-4 h-4 text-emerald-600 ml-1" />}
                </div>
              )}
              
              <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-bold ${currentUser.verified ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                <User className="w-3.5 h-3.5" />
                {currentUser.verified ? 'Đã xác minh thẻ Sinh viên' : 'Chưa xác minh thẻ SV'}
                {currentUser.verified && <CheckCircle2 className="w-4 h-4 text-emerald-600 ml-1" />}
              </div>
            </div>
          </div>
        </div>

        <div className="shrink-0 flex flex-row md:flex-col gap-3 w-full md:w-auto justify-center z-10">
           <Button variant="outline" size="sm" onClick={logout} leftIcon={<LogOut className="w-4 h-4" />}>
             Đăng xuất
           </Button>
        </div>
      </div>

      {/* 2. Horizontal Tab Navigation for "Tách rõ" */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-1.5 flex flex-wrap md:flex-nowrap items-center gap-1 sticky top-16 z-20">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'profile' ? 'bg-[#00a854] text-white shadow-xs' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <Settings className="w-4 h-4" /> Hồ Sơ & Bảo Mật
        </button>
        <button
          onClick={() => setActiveTab('bookings')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
            activeTab === 'bookings' ? 'bg-[#00a854] text-white shadow-xs' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          }`}
        >
          <Calendar className="w-4 h-4" /> Lịch Hẹn Xem Phòng
          {bookings.length > 0 && (
             <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${activeTab === 'bookings' ? 'bg-white text-[#00a854]' : 'bg-amber-100 text-amber-800'}`}>
               {bookings.length}
             </span>
          )}
        </button>
        <button
          onClick={() => navigate('/da-luu')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all text-gray-600 hover:bg-gray-50 hover:text-rose-600`}
        >
          <Heart className="w-4 h-4" /> Phòng Đã Lưu
          {savedRoomIds.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-100 text-rose-600">{savedRoomIds.length}</span>
          )}
        </button>
        <button
          onClick={() => navigate('/thong-bao')}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all text-gray-600 hover:bg-gray-50 hover:text-[#00a854]`}
        >
          <Bell className="w-4 h-4" /> Thông Báo
        </button>
      </div>

      {/* 3. Tab Contents */}
      <div className="space-y-6">
        {activeTab === 'profile' && (
          <div className="space-y-6 animate-fadeIn">
            <RolePermissionSection user={currentUser} />
            
            {/* Blocked Contacts */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 space-y-4 shadow-sm">
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
          </div>
        )}

        {activeTab === 'bookings' && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-black text-gray-950 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#00a854]" />
                  Lịch Hẹn Xem Phòng Trực Tiếp ({bookings.length})
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">Xác nhận 2 chiều và thông báo tự động với chủ trọ</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-2xl p-6 text-center space-y-4 border border-gray-200">
              <div className="w-12 h-12 bg-emerald-100 text-[#00a854] rounded-full flex items-center justify-center mx-auto">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900">Quản Lý Lịch Hẹn Xem Phòng</h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
                  Theo dõi trạng thái, xác nhận đổi giờ và quản lý tất cả lịch hẹn trực tiếp với chủ trọ.
                </p>
              </div>
              <Link to="/lich-hen" className="inline-block pt-2">
                <Button variant="primary" size="md">
                  Đi tới Lịch Hẹn Của Tôi
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

