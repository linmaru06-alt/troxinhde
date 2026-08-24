import React, { useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { useUIStore } from '../../store/useUIStore';
import { useOutsideClick } from '../../hooks/useOutsideClick';
import { useRealtimeNotifications } from '../../hooks/useRealtimeNotifications';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { OptimizedImage } from '../ui/OptimizedImage';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Compass,
  MapPin,
  Heart,
  Users,
  ShoppingBag,
  Bell,
  MessageSquare,
  User as UserIcon,
  ShieldCheck,
  Building2,
  LogOut,
  ChevronDown,
  PlusCircle,
  Menu,
  FileText,
  CreditCard,
  Sparkles,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, savedRoomIds, threads, logout } = useAppStore();
  const { isAvatarDropdownOpen, toggleAvatarDropdown, closeAllDropdowns } = useUIStore();
  const { unreadCount: unreadNotifs } = useRealtimeNotifications();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  useOutsideClick(dropdownRef, closeAllDropdowns, isAvatarDropdownOpen);

  const unreadMessages = threads.reduce((acc, t) => acc + (t.unreadCount || 0), 0);

  // Main navigation links: Replaced "Xác minh" & "Bảng giá" with "Tìm bạn cùng phòng" & "Chợ đồ cũ sinh viên"
  const navLinks = [
    { to: '/tim-phong', label: 'Tìm phòng', icon: Compass },
    { to: '/ban-do', label: 'Xem bản đồ', icon: MapPin },
    { to: '/tim-ban-cung-phong', label: 'Tìm bạn cùng phòng', icon: Users },
    { to: '/cho-do-cu', label: 'Chợ đồ cũ sinh viên', icon: ShoppingBag },
  ];

  const isActive = (path: string) => {
    if (path === '/tim-phong' && (location.pathname === '/tim-phong' || location.pathname === '/tim-kiem')) return true;
    return location.pathname === path;
  };

  const handlePostClick = () => {
    if (currentUser?.role === 'owner') {
      navigate('/chu-tro/phong/tao-moi');
    } else {
      navigate('/nang-cap-chu-tro');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200/80 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18">
          {/* 1. Left: Mobile Menu Toggle & Brand Logo */}
          <div className="flex items-center gap-3 sm:gap-6">
            {/* Mobile Hamburger */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-gray-700 hover:bg-gray-100 transition"
              title="Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Original Brand Logo & Text */}
            <Link to="/" className="flex items-center gap-2.5 group">
              <OptimizedImage
                src="/images/logo.png"
                alt="Trọ Xinh Logo"
                priority={true}
                loading="eager"
                width={38}
                height={38}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl object-cover ring-2 ring-emerald-500/20 shadow-md group-hover:scale-105 transition-transform duration-200"
              />
              <div className="flex flex-col">
                <span className="text-lg sm:text-xl font-black tracking-tight text-[#006d37] leading-none">
                  Trọ Xinh
                </span>
                <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase mt-0.5">
                  TroXinh.vn
                </span>
              </div>
            </Link>

            {/* 2. Center: Desktop Main Navigation */}
            <nav className="hidden lg:flex items-center gap-1 ml-4">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const active = isActive(link.to);
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-150 ${
                      active
                        ? 'bg-emerald-50 text-[#006d37]'
                        : 'text-gray-600 hover:text-[#006d37] hover:bg-gray-50'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${active ? 'text-[#006d37]' : 'text-gray-400'}`} />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* 3. Right: Actions & User Menu */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Saved Rooms */}
            <Link
              to="/da-luu"
              className="p-2.5 rounded-xl text-gray-600 hover:text-rose-600 hover:bg-gray-50 transition relative"
              title="Phòng đã lưu"
            >
              <Heart className="w-4 h-4" />
              {savedRoomIds.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center ring-2 ring-white">
                  {savedRoomIds.length}
                </span>
              )}
            </Link>

            {/* Notifications */}
            <Link
              to={currentUser?.role === 'owner' ? '/chu-tro/thong-bao' : '/thong-bao'}
              className="p-2.5 rounded-xl text-gray-600 hover:text-[#006d37] hover:bg-gray-50 transition relative"
              title="Thông báo"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifs > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center ring-2 ring-white animate-pulse">
                  {unreadNotifs}
                </span>
              )}
            </Link>

            {/* Chat */}
            <Link
              to={currentUser?.role === 'owner' ? '/chu-tro/tin-nhan' : '/tin-nhan'}
              className="hidden sm:flex p-2.5 rounded-xl text-gray-600 hover:text-[#006d37] hover:bg-gray-50 transition relative"
              title="Tin nhắn"
            >
              <MessageSquare className="w-4 h-4" />
              {unreadMessages > 0 && (
                <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#006d37] text-white text-[9px] font-black rounded-full flex items-center justify-center ring-2 ring-white">
                  {unreadMessages}
                </span>
              )}
            </Link>

            {/* Post / Landlord CTA Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handlePostClick}
              leftIcon={<PlusCircle className="w-4 h-4 text-[#006d37]" />}
              className="hidden md:inline-flex text-xs font-bold text-[#006d37] border-emerald-300 hover:bg-emerald-50"
            >
              {currentUser?.role === 'owner' ? 'Đăng Phòng Mới' : 'Đăng Tin Cho Thuê'}
            </Button>

            {/* Auth Buttons / User Avatar */}
            {!currentUser ? (
              <div className="flex items-center gap-2">
                <Link to="/dang-nhap">
                  <Button variant="ghost" size="sm" className="text-xs font-bold">
                    Đăng Nhập
                  </Button>
                </Link>
                <Link to="/dang-ky" className="hidden sm:inline-block">
                  <Button variant="primary" size="sm" className="text-xs font-bold">
                    Đăng Ký
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={toggleAvatarDropdown}
                  className="flex items-center gap-2 p-1.5 rounded-2xl hover:bg-gray-100 transition ring-1 ring-gray-200"
                  aria-expanded={isAvatarDropdownOpen}
                >
                  <OptimizedImage
                    src={currentUser.avatarUrl}
                    alt={currentUser.name}
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-xl object-cover ring-1 ring-emerald-300"
                  />
                  <div className="hidden sm:flex flex-col text-left">
                    <span className="text-xs font-bold text-gray-900 leading-tight truncate max-w-[90px]">
                      {currentUser.name}
                    </span>
                    <span className="text-[10px] text-gray-500 leading-none capitalize">
                      {currentUser.role === 'owner' ? 'Chủ trọ' : currentUser.role === 'admin' ? 'Quản trị' : 'Người thuê'}
                    </span>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-150 ${isAvatarDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                <AnimatePresence>
                  {isAvatarDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.95 }}
                      transition={{ duration: 0.15, ease: 'easeOut' }}
                      className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-200 py-2 z-50 overflow-hidden"
                      onClick={closeAllDropdowns}
                    >
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-xs font-bold text-gray-900">{currentUser.name}</p>
                        <p className="text-[11px] text-gray-500">{currentUser.phone}</p>
                        <div className="mt-1">
                          <Badge
                            variant={currentUser.role === 'owner' ? 'verified' : currentUser.role === 'admin' ? 'primary' : 'available'}
                            size="sm"
                            showIcon={false}
                          >
                            {currentUser.role === 'owner' ? '🏢 Chủ trọ' : currentUser.role === 'admin' ? '🛡️ Quản trị viên' : '👤 Người thuê'}
                          </Badge>
                        </div>
                      </div>

                      <Link
                        to={currentUser.role === 'owner' ? '/chu-tro/toi' : '/toi'}
                        className="flex items-center gap-2 px-4 py-2.5 text-xs text-gray-700 hover:bg-gray-50 hover:text-[#006d37] font-semibold"
                      >
                        <UserIcon className="w-4 h-4" />
                        <span>Trang cá nhân</span>
                      </Link>

                      {currentUser.role === 'owner' ? (
                        <Link
                          to="/chu-tro"
                          className="flex items-center gap-2 px-4 py-2.5 text-xs text-[#006d37] hover:bg-emerald-50 font-bold"
                        >
                          <Building2 className="w-4 h-4" />
                          <span>Quản lý phòng & tòa nhà</span>
                        </Link>
                      ) : (
                        <Link
                          to="/nang-cap-chu-tro"
                          className="flex items-center gap-2 px-4 py-2.5 text-xs text-[#006d37] hover:bg-emerald-50 font-bold"
                        >
                          <Building2 className="w-4 h-4" />
                          <span>Đăng ký làm chủ trọ</span>
                        </Link>
                      )}

                      {currentUser.role === 'admin' && (
                        <Link
                          to="/admin"
                          className="flex items-center gap-2 px-4 py-2.5 text-xs text-[#006d37] hover:bg-emerald-50 font-bold"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          <span>Bảng quản trị</span>
                        </Link>
                      )}

                      <Link
                        to="/hop-dong-mau"
                        className="flex items-center gap-2 px-4 py-2.5 text-xs text-gray-700 hover:bg-gray-50 font-semibold"
                      >
                        <FileText className="w-4 h-4" />
                        <span>Mẫu hợp đồng thuê</span>
                      </Link>

                      <div className="border-t border-gray-100 my-1" />

                      <button
                        onClick={logout}
                        className="w-full flex items-center gap-2 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 font-semibold text-left"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Đăng xuất</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            />

            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-72 bg-white h-full shadow-2xl z-10 flex flex-col justify-between p-4 overflow-y-auto"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <OptimizedImage src="/images/logo.png" alt="Logo" width={28} height={28} className="w-7 h-7 rounded-lg" />
                    <span className="font-black text-[#006d37]">Trọ Xinh Hà Nội</span>
                  </div>
                  <button onClick={() => setIsMobileMenuOpen(false)} className="text-gray-400 hover:text-gray-700 font-bold text-sm">
                    ✕
                  </button>
                </div>

                <div className="space-y-1 text-xs font-bold text-gray-800">
                  <Link to="/" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-emerald-50 hover:text-[#006d37]">
                    <Compass className="w-4 h-4 text-[#006d37]" />
                    <span>Trang chủ</span>
                  </Link>
                  <Link to="/tim-phong" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-emerald-50 hover:text-[#006d37]">
                    <Compass className="w-4 h-4 text-[#006d37]" />
                    <span>Tìm phòng trọ</span>
                  </Link>
                  <Link to="/ban-do" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-emerald-50 hover:text-[#006d37]">
                    <MapPin className="w-4 h-4 text-[#006d37]" />
                    <span>Xem trên bản đồ</span>
                  </Link>
                  <Link to="/tim-ban-cung-phong" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-emerald-50 hover:text-[#006d37]">
                    <Users className="w-4 h-4 text-[#006d37]" />
                    <span>Tìm bạn cùng phòng</span>
                  </Link>
                  <Link to="/cho-do-cu" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-emerald-50 hover:text-[#006d37]">
                    <ShoppingBag className="w-4 h-4 text-[#006d37]" />
                    <span>Chợ đồ cũ sinh viên</span>
                  </Link>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 text-center">
                <Button
                  variant="primary"
                  size="md"
                  fullWidth
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handlePostClick();
                  }}
                  leftIcon={<PlusCircle className="w-4 h-4" />}
                >
                  Đăng Tin Cho Thuê
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </header>
  );
};
