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
  Plus,
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

  // Main navigation links: Room rental, Map, Roommate, Student Marketplace
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
    <header className="sticky top-0 z-40 bg-[#00a854] border-b border-emerald-600/30 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* 1. Left: Mobile Menu Toggle & Brand Logo */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Mobile Hamburger */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden w-9 h-9 rounded-full bg-white/90 hover:bg-white text-gray-950 flex items-center justify-center transition shadow-2xs"
              title="Menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* White Pill Logo with Black Text */}
            <Link
              to="/"
              className="flex items-center gap-2 px-3.5 py-1.5 bg-white rounded-full shadow-xs hover:shadow-md transition group"
            >
              <OptimizedImage
                src="/images/logo.png"
                alt="Trọ Xinh Logo"
                priority={true}
                loading="eager"
                width={28}
                height={28}
                className="w-7 h-7 rounded-lg object-cover ring-1 ring-emerald-500/20"
              />
              <div className="flex flex-col">
                <span className="text-base sm:text-lg font-black tracking-tight text-gray-950 leading-none">
                  Trọ Xinh
                </span>
                <span className="text-[9px] font-bold text-gray-500 tracking-wider uppercase mt-0.5">
                  TroXinh.vn
                </span>
              </div>
            </Link>

            {/* 2. Center: Desktop Main Navigation with Black Bold Text */}
            <nav className="hidden lg:flex items-center gap-1.5 ml-2">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const active = isActive(link.to);
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all duration-150 ${
                      active
                        ? 'bg-gray-950 text-white shadow-xs'
                        : 'text-gray-950 hover:bg-black/10 hover:text-black'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${active ? 'text-[#00a854]' : 'text-gray-900 stroke-[2.5]'}`} />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* 3. Right: Actions & User Menu */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Saved Rooms (White Circle Button, Black Icon) */}
            <Link
              to="/da-luu"
              className="w-9 h-9 rounded-full bg-white/90 hover:bg-white text-gray-950 flex items-center justify-center transition shadow-2xs relative"
              title="Phòng đã lưu"
            >
              <Heart className="w-4 h-4 text-gray-950 stroke-[2.5]" />
              {savedRoomIds.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center ring-2 ring-white">
                  {savedRoomIds.length}
                </span>
              )}
            </Link>

            {/* Notifications (White Circle Button, Black Icon) */}
            <Link
              to={currentUser?.role === 'owner' ? '/chu-tro/thong-bao' : '/thong-bao'}
              className="w-9 h-9 rounded-full bg-white/90 hover:bg-white text-gray-950 flex items-center justify-center transition shadow-2xs relative"
              title="Thông báo"
            >
              <Bell className="w-4 h-4 text-gray-950 stroke-[2.5]" />
              {unreadNotifs > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center ring-2 ring-white animate-pulse">
                  {unreadNotifs}
                </span>
              )}
            </Link>

            {/* Chat Pill (White Pill, Black Text) */}
            <Link
              to={currentUser?.role === 'owner' ? '/chu-tro/tin-nhan' : '/tin-nhan'}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 hover:bg-white text-gray-950 text-xs font-black transition shadow-2xs relative"
              title="Tin nhắn"
            >
              <MessageSquare className="w-4 h-4 text-gray-950 stroke-[2.5]" />
              <span>Tin nhắn</span>
              {unreadMessages > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 bg-rose-500 text-white text-[9px] font-black rounded-full">
                  {unreadMessages}
                </span>
              )}
            </Link>

            {/* Post / Landlord CTA Button (Black Pill, Bold) */}
            <button
              onClick={handlePostClick}
              className="flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-gray-950 hover:bg-black text-white text-xs font-black transition shadow-md"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>{currentUser?.role === 'owner' ? 'ĐĂNG PHÒNG' : 'ĐĂNG TIN'}</span>
            </button>

            {/* Auth Buttons / User Avatar */}
            {!currentUser ? (
              <div className="flex items-center gap-1.5">
                <Link
                  to="/dang-nhap"
                  className="px-3.5 py-1.5 rounded-full bg-white text-gray-950 text-xs font-black hover:bg-white/90 transition shadow-2xs"
                >
                  Đăng nhập
                </Link>
              </div>
            ) : (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={toggleAvatarDropdown}
                  className="flex items-center gap-1 p-0.5 rounded-full bg-white hover:ring-2 hover:ring-white transition shadow-2xs"
                  aria-expanded={isAvatarDropdownOpen}
                >
                  <OptimizedImage
                    src={currentUser.avatarUrl}
                    alt={currentUser.name}
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <ChevronDown className={`w-3.5 h-3.5 text-gray-950 pr-1 transition-transform ${isAvatarDropdownOpen ? 'rotate-180' : ''}`} />
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
                        <p className="text-xs font-black text-gray-900">{currentUser.name}</p>
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
                        className="flex items-center gap-2 px-4 py-2.5 text-xs text-gray-900 hover:bg-gray-50 font-bold"
                      >
                        <UserIcon className="w-4 h-4" />
                        <span>Trang cá nhân</span>
                      </Link>

                      {currentUser.role === 'owner' ? (
                        <Link
                          to="/chu-tro"
                          className="flex items-center gap-2 px-4 py-2.5 text-xs text-[#00a854] hover:bg-emerald-50 font-black"
                        >
                          <Building2 className="w-4 h-4" />
                          <span>Quản lý phòng & tòa nhà</span>
                        </Link>
                      ) : (
                        <Link
                          to="/nang-cap-chu-tro"
                          className="flex items-center gap-2 px-4 py-2.5 text-xs text-[#00a854] hover:bg-emerald-50 font-black"
                        >
                          <Building2 className="w-4 h-4" />
                          <span>Đăng ký làm chủ trọ</span>
                        </Link>
                      )}

                      {currentUser.role === 'admin' && (
                        <Link
                          to="/admin"
                          className="flex items-center gap-2 px-4 py-2.5 text-xs text-[#00a854] hover:bg-emerald-50 font-black"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          <span>Bảng quản trị</span>
                        </Link>
                      )}

                      <Link
                        to="/hop-dong-mau"
                        className="flex items-center gap-2 px-4 py-2.5 text-xs text-gray-900 hover:bg-gray-50 font-bold"
                      >
                        <FileText className="w-4 h-4" />
                        <span>Mẫu hợp đồng thuê</span>
                      </Link>

                      <div className="border-t border-gray-100 my-1" />

                      <button
                        onClick={logout}
                        className="w-full flex items-center gap-2 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 font-bold text-left"
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
                    <span className="font-black text-gray-950">Trọ Xinh Hà Nội</span>
                  </div>
                  <button onClick={() => setIsMobileMenuOpen(false)} className="text-gray-400 hover:text-gray-700 font-bold text-sm">
                    ✕
                  </button>
                </div>

                <div className="space-y-1 text-xs font-black text-gray-950">
                  <Link to="/" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-emerald-50">
                    <Compass className="w-4 h-4 text-[#00a854]" />
                    <span>Trang chủ</span>
                  </Link>
                  <Link to="/tim-phong" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-emerald-50">
                    <Compass className="w-4 h-4 text-[#00a854]" />
                    <span>Tìm phòng trọ</span>
                  </Link>
                  <Link to="/ban-do" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-emerald-50">
                    <MapPin className="w-4 h-4 text-[#00a854]" />
                    <span>Xem trên bản đồ</span>
                  </Link>
                  <Link to="/tim-ban-cung-phong" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-emerald-50">
                    <Users className="w-4 h-4 text-[#00a854]" />
                    <span>Tìm bạn cùng phòng</span>
                  </Link>
                  <Link to="/cho-do-cu" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-emerald-50">
                    <ShoppingBag className="w-4 h-4 text-[#00a854]" />
                    <span>Chợ đồ cũ sinh viên</span>
                  </Link>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 text-center">
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handlePostClick();
                  }}
                  className="w-full py-2.5 bg-gray-950 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md"
                >
                  <Plus className="w-4 h-4" /> ĐĂNG TIN PHÒNG TRỌ
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </header>
  );
};
