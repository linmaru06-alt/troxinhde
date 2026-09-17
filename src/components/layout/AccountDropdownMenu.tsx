import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User } from '../../types';
import {
  Heart,
  Bookmark,
  Clock,
  Star,
  MapPin,
  ShieldCheck,
  Store,
  Sparkles,
  TicketPercent,
  Settings,
  Headphones,
  ChevronRight,
  LogOut,
  X,
  User as UserIcon,
  Building2,
} from 'lucide-react';

interface AccountDropdownMenuProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  openAuthModal: (mode: 'login' | 'register') => void;
  logout: () => void;
}

// Mascot Vịt Vàng Trọ Xinh Cute chuẩn phong cách Chợ Tốt
const YellowDuckMascot: React.FC<{ className?: string }> = ({ className = 'w-16 h-16' }) => (
  <svg viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Body / Head */}
    <circle cx="60" cy="65" r="45" fill="#FFBA00" />
    <circle cx="60" cy="55" r="38" fill="#FFC820" />
    {/* Chùm tóc trên đầu */}
    <path
      d="M58 18C58 14 62 10 66 12C70 14 68 20 62 24"
      stroke="#FF9500"
      strokeWidth="4"
      strokeLinecap="round"
    />
    <path
      d="M52 22C52 18 55 15 58 16C61 17 60 22 56 25"
      stroke="#FF9500"
      strokeWidth="3.5"
      strokeLinecap="round"
    />
    {/* Eyes */}
    <ellipse cx="44" cy="48" rx="4.5" ry="6" fill="#1E1E1E" />
    <circle cx="46" cy="46" r="2" fill="#FFFFFF" />
    <ellipse cx="76" cy="48" rx="4.5" ry="6" fill="#1E1E1E" />
    <circle cx="78" cy="46" r="2" fill="#FFFFFF" />
    {/* Má hồng */}
    <circle cx="34" cy="58" r="7" fill="#FF5E3A" opacity="0.35" />
    <circle cx="86" cy="58" r="7" fill="#FF5E3A" opacity="0.35" />
    {/* Mỏ vịt cam tươi */}
    <ellipse cx="60" cy="62" rx="16" ry="10" fill="#FF5722" />
    <path d="M47 62C53 66 67 66 73 62" stroke="#D84315" strokeWidth="2.5" strokeLinecap="round" />
    <ellipse cx="60" cy="59" rx="14" ry="7" fill="#FF7043" />
    {/* Chấm sáng mỏ */}
    <ellipse cx="56" cy="58" rx="4" ry="2" fill="#FFA270" opacity="0.6" />
    {/* Cổ áo chấm bi xinh xắn */}
    <path
      d="M32 92C40 85 80 85 88 92C84 105 36 105 32 92Z"
      fill="#FF4500"
    />
    <circle cx="48" cy="94" r="2.5" fill="#FFFFFF" />
    <circle cx="60" cy="96" r="2.5" fill="#FFFFFF" />
    <circle cx="72" cy="94" r="2.5" fill="#FFFFFF" />
  </svg>
);

export const AccountDropdownMenu: React.FC<AccountDropdownMenuProps> = ({
  isOpen,
  onClose,
  currentUser,
  openAuthModal,
  logout,
}) => {
  const navigate = useNavigate();
  const [showPromoBadge, setShowPromoBadge] = useState<boolean>(true);

  if (!isOpen) return null;

  const handleAction = (callback: () => void) => {
    callback();
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.96 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="absolute right-0 mt-2 w-[320px] sm:w-[350px] bg-[#f8f9fa] rounded-3xl shadow-2xl border border-gray-200/90 z-50 overflow-hidden text-gray-900 font-sans"
        style={{ maxHeight: 'calc(100vh - 80px)' }}
      >
        <div className="overflow-y-auto max-h-[calc(100vh-90px)] p-3 space-y-3.5 scrollbar-thin">
          {/* 1. KHỐI HEADER TRÊN CÙNG: ĐĂNG KÝ / ĐĂNG NHẬP HOẶC THÔNG TIN TÀI KHOẢN */}
          {!currentUser ? (
            <div className="bg-white rounded-2xl p-4 shadow-2xs border border-gray-100 relative overflow-hidden">
              <div className="flex items-start justify-between">
                <div className="space-y-0.5 max-w-[200px]">
                  <h3 className="text-sm font-black text-gray-950 tracking-tight leading-snug">
                    Thuê thì hời, bán thì lời.
                  </h3>
                  <p className="text-xs text-gray-500 font-medium">Đăng nhập cái đã!</p>
                </div>
                {/* Mascot Vịt Vàng góc phải */}
                <div className="relative -mt-1 -mr-1 shrink-0">
                  <YellowDuckMascot className="w-14 h-14" />
                </div>
              </div>

              {/* 2 nút Đăng ký & Đăng nhập */}
              <div className="grid grid-cols-2 gap-2 mt-3.5">
                <button
                  type="button"
                  onClick={() =>
                    handleAction(() => {
                      openAuthModal('register');
                    })
                  }
                  className="w-full py-2 px-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-gray-900 transition shadow-2xs cursor-pointer text-center"
                >
                  Tạo tài khoản
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleAction(() => {
                      openAuthModal('login');
                    })
                  }
                  className="w-full py-2 px-3 rounded-xl bg-[#00a854] hover:bg-[#008f47] text-xs font-black text-white transition shadow-xs cursor-pointer text-center"
                >
                  Đăng nhập
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-4 shadow-2xs border border-gray-100 space-y-3">
              <div className="flex items-center gap-3">
                <img
                  src={currentUser.avatarUrl || '/images/user-avatar.jpg'}
                  alt={currentUser.name}
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-[#006d37]/30 shrink-0"
                />
                <div className="overflow-hidden flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h3 className="text-sm font-black text-gray-900 truncate">{currentUser.name}</h3>
                    {currentUser.isDemoAccount && (
                      <span className="bg-amber-100 border border-amber-300 text-amber-900 text-[10px] font-black px-1.5 py-0.5 rounded-md">
                        ⚠️ Demo
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-0.5 mt-1">
                    <p className="text-xs text-gray-500 font-mono flex items-center gap-1">
                      {currentUser.phone || 'Thành viên Trọ Xinh'}
                      {currentUser.phoneVerified && (
                        <span title="SĐT đã xác minh">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" aria-hidden="true" />
                        </span>
                      )}
                    </p>
                    {currentUser.email && (
                      <p className="text-xs text-gray-500 font-mono flex items-center gap-1">
                        {currentUser.email}
                        {currentUser.emailVerified && (
                          <span title="Email đã xác minh">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" aria-hidden="true" />
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                  <span
                    className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                      currentUser.role === 'owner'
                        ? 'bg-emerald-100 text-emerald-800'
                        : currentUser.role === 'admin'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {currentUser.role === 'owner'
                      ? '🏢 Chủ trọ đối tác'
                      : currentUser.role === 'admin'
                      ? '🛡️ Quản trị viên'
                      : '👤 Khách thuê'}
                  </span>
                </div>
              </div>

              {currentUser.isDemoAccount && (
                <div className="p-2 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 leading-tight flex items-start gap-1.5">
                  <span className="shrink-0 text-xs">⚠️</span>
                  <span>Bạn đang dùng <strong>Tài khoản Demo</strong> để trải nghiệm tính năng.</span>
                </div>
              )}

              <div className="pt-2 border-t border-gray-100 grid grid-cols-2 gap-2">
                <Link
                  to={currentUser.role === 'owner' ? '/chu-tro/toi' : '/toi'}
                  onClick={onClose}
                  className="text-center py-1.5 px-2 bg-gray-50 hover:bg-gray-100 text-xs font-bold text-gray-800 rounded-xl transition"
                >
                  Trang cá nhân
                </Link>
                {currentUser.role === 'owner' ? (
                  <Link
                    to="/chu-tro"
                    onClick={onClose}
                    className="text-center py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-xs font-bold text-[#006d37] rounded-xl transition"
                  >
                    Quản lý phòng
                  </Link>
                ) : (
                  <Link
                    to="/nang-cap-chu-tro"
                    onClick={onClose}
                    className="text-center py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-xs font-bold text-[#006d37] rounded-xl transition"
                  >
                    Đăng ký Chủ trọ
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* 2. NHÓM "TIỆN ÍCH" */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-gray-500 px-1 block">Tiện ích</span>
            <div className="bg-white rounded-2xl shadow-2xs border border-gray-100 divide-y divide-gray-50 overflow-hidden">
              <Link
                to="/da-luu"
                onClick={onClose}
                className="flex items-center justify-between px-3.5 py-3 text-xs font-bold text-gray-800 hover:bg-gray-50/80 transition"
              >
                <div className="flex items-center gap-3">
                  <Heart className="w-4 h-4 text-gray-600 stroke-[2.2]" />
                  <span>Tin đã lưu</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </Link>

              <Link
                to="/tim-kiem"
                onClick={onClose}
                className="flex items-center justify-between px-3.5 py-3 text-xs font-bold text-gray-800 hover:bg-gray-50/80 transition"
              >
                <div className="flex items-center gap-3">
                  <Bookmark className="w-4 h-4 text-gray-600 stroke-[2.2]" />
                  <span>Tìm kiếm đã lưu</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </Link>

              <Link
                to="/da-luu"
                onClick={onClose}
                className="flex items-center justify-between px-3.5 py-3 text-xs font-bold text-gray-800 hover:bg-gray-50/80 transition"
              >
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-gray-600 stroke-[2.2]" />
                  <span>Lịch sử xem tin</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </Link>

              <Link
                to="/ve-chung-toi"
                onClick={onClose}
                className="flex items-center justify-between px-3.5 py-3 text-xs font-bold text-gray-800 hover:bg-gray-50/80 transition"
              >
                <div className="flex items-center gap-3">
                  <Star className="w-4 h-4 text-gray-600 stroke-[2.2]" />
                  <span>Đánh giá từ tôi</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </Link>

              <Link
                to="/ban-do"
                onClick={onClose}
                className="flex items-center justify-between px-3.5 py-3 text-xs font-bold text-gray-800 hover:bg-gray-50/80 transition"
              >
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-gray-600 stroke-[2.2]" />
                  <span>Đánh giá khu vực</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="bg-[#ff3b5c] text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                    Tính năng mới
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </Link>
            </div>
          </div>

          {/* 3. NHÓM "DỊCH VỤ TRẢ PHÍ" */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-gray-500 px-1 block">Dịch vụ trả phí</span>
            <div className="bg-white rounded-2xl shadow-2xs border border-gray-100 divide-y divide-gray-50 overflow-hidden">
              <Link
                to="/chu-tro/quan-ly-goi"
                onClick={onClose}
                className="flex items-center justify-between px-3.5 py-3 text-xs font-bold text-gray-800 hover:bg-gray-50/80 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-100 text-[#00a854] flex items-center justify-center font-black text-[10px]">
                    ĐT
                  </div>
                  <span>Đồng Tốt / Trọ Xinh Xu</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </Link>

              <Link
                to="/chu-tro/quan-ly-goi"
                onClick={onClose}
                className="flex items-center justify-between px-3.5 py-3 text-xs font-bold text-gray-800 hover:bg-gray-50/80 transition"
              >
                <div className="flex items-center gap-3">
                  <span className="px-1.5 py-0.5 bg-gray-950 text-white rounded text-[9px] font-black tracking-wider">
                    PRO
                  </span>
                  <span>Gói PRO</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </Link>

              <Link
                to="/chu-tro"
                onClick={onClose}
                className="flex items-center justify-between px-3.5 py-3 text-xs font-bold text-gray-800 hover:bg-gray-50/80 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                  <span>Kênh Đối Tác</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </Link>

              <Link
                to="/chu-tro/quan-ly-goi"
                onClick={onClose}
                className="flex items-center justify-between px-3.5 py-3 text-xs font-bold text-gray-800 hover:bg-gray-50/80 transition"
              >
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-gray-600 stroke-[2.2]" />
                  <span>Lịch sử giao dịch</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </Link>

              <Link
                to="/chu-tro/toa-nha"
                onClick={onClose}
                className="flex items-center justify-between px-3.5 py-3 text-xs font-bold text-gray-800 hover:bg-gray-50/80 transition"
              >
                <div className="flex items-center gap-3">
                  <Store className="w-4 h-4 text-gray-600 stroke-[2.2]" />
                  <span>Cửa hàng / chuyên trang</span>
                </div>
                <span className="bg-gray-100 hover:bg-gray-200 text-gray-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Tạo ngay
                </span>
              </Link>
            </div>
          </div>

          {/* 4. NHÓM "ƯU ĐÃI, KHUYẾN MÃI" */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-gray-500 px-1 block">Ưu đãi, khuyến mãi</span>
            <div className="bg-white rounded-2xl shadow-2xs border border-gray-100 divide-y divide-gray-50 overflow-hidden">
              <Link
                to="/ve-chung-toi"
                onClick={onClose}
                className="flex items-center justify-between px-3.5 py-3 text-xs font-bold text-gray-800 hover:bg-gray-50/80 transition"
              >
                <div className="flex items-center gap-3">
                  <Sparkles className="w-4 h-4 text-gray-600 stroke-[2.2]" />
                  <span>Trọ Xinh ưu đãi</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </Link>

              <Link
                to="/ve-chung-toi"
                onClick={onClose}
                className="flex items-center justify-between px-3.5 py-3 text-xs font-bold text-gray-800 hover:bg-gray-50/80 transition"
              >
                <div className="flex items-center gap-3">
                  <TicketPercent className="w-4 h-4 text-gray-600 stroke-[2.2]" />
                  <span>Ưu đãi của tôi</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </Link>
            </div>
          </div>

          {/* 5. NHÓM "KHÁC" */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-gray-500 px-1 block">Khác</span>
            <div className="bg-white rounded-2xl shadow-2xs border border-gray-100 divide-y divide-gray-50 overflow-hidden">
              <Link
                to={currentUser?.role === 'owner' ? '/chu-tro/toi' : '/toi'}
                onClick={onClose}
                className="flex items-center justify-between px-3.5 py-3 text-xs font-bold text-gray-800 hover:bg-gray-50/80 transition"
              >
                <div className="flex items-center gap-3">
                  <Settings className="w-4 h-4 text-gray-600 stroke-[2.2]" />
                  <span>Cài đặt tài khoản</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </Link>

              <Link
                to="/ve-chung-toi/an-toan"
                onClick={onClose}
                className="flex items-center justify-between px-3.5 py-3 text-xs font-bold text-gray-800 hover:bg-gray-50/80 transition"
              >
                <div className="flex items-center gap-3">
                  <Headphones className="w-4 h-4 text-gray-600 stroke-[2.2]" />
                  <span>Trợ giúp</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </Link>

              {currentUser && (
                <button
                  type="button"
                  onClick={() =>
                    handleAction(() => {
                      logout();
                    })
                  }
                  className="w-full flex items-center justify-between px-3.5 py-3 text-xs font-bold text-rose-600 hover:bg-rose-50 transition cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3">
                    <LogOut className="w-4 h-4 text-rose-600 stroke-[2.2]" />
                    <span>Đăng xuất</span>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Floating Sticker Ưu Đãi Vịt Vàng ở góc dưới (như ảnh Chợ Tốt) */}
        {showPromoBadge && (
          <div className="sticky bottom-2 right-2 flex justify-end px-3 pb-1 pointer-events-auto">
            <div className="bg-white/95 backdrop-blur-xs rounded-2xl p-2 shadow-lg border border-emerald-200 flex items-center gap-2 relative animate-bounce-subtle">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPromoBadge(false);
                }}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-gray-900 text-white rounded-full flex items-center justify-center text-[10px] hover:bg-black cursor-pointer"
                title="Đóng"
              >
                <X className="w-2.5 h-2.5" />
              </button>
              <YellowDuckMascot className="w-8 h-8 shrink-0" />
              <div className="pr-1 text-left">
                <div className="text-[10px] font-black text-[#00a854] leading-tight">TRỌ XINH ƯU ĐÃI</div>
                <div className="text-[9px] text-gray-500 font-medium">Nhận mã giảm cọc ngay</div>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
