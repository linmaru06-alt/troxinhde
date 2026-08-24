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
  Sparkles,
  FileText,
  CreditCard,
  Grid,
  Search,
  Plus,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, savedRoomIds, threads, logout } = useAppStore();
  const { isAvatarDropdownOpen, toggleAvatarDropdown, closeAllDropdowns } = useUIStore();
  const { unreadCount: unreadNotifs } = useRealtimeNotifications();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const roleDropdownRef = useRef<HTMLDivElement>(null);
  useOutsideClick(roleDropdownRef, () => setIsRoleDropdownOpen(false), isRoleDropdownOpen);

  const dropdownRef = useRef<HTMLDivElement>(null);
  useOutsideClick(dropdownRef, closeAllDropdowns, isAvatarDropdownOpen);

  const unreadMessages = threads.reduce((acc, t) => acc + (t.unreadCount || 0), 0);

  // Chợ Tốt inspired Category Navigation links
  const navTabs = [
    { to: '/', label: 'Trọ Xinh' },
    { to: '/tim-phong', label: 'Tìm phòng' },
    { to: '/ban-do', label: 'Xem bản đồ' },
    { to: '/trust/da-kiem-duyet', label: 'Xác minh' },
    { to: '/bang-gia', label: 'Bảng giá' },
  ];

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path === '/tim-phong' && (location.pathname === '/tim-phong' || location.pathname === '/tim-kiem')) return true;
    return path !== '/' && location.pathname === path;
  };

  const handlePostRoom = () => {
    if (currentUser?.role === 'owner') {
      navigate('/chu-tro/phong/tao-moi');
    } else {
      navigate('/nang-cap-chu-tro');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#ffba00] border-b border-amber-400/40 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Left: Hamburger + Pill Logo + Role Switcher */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Hamburger Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="w-9 h-9 rounded-full bg-white/80 hover:bg-white text-gray-800 flex items-center justify-center transition shadow-2xs"
              title="Menu danh mục"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Chợ Tốt Style White Pill Logo */}
            <Link
              to="/"
              className="flex items-center gap-1.5 px-3 py-1 bg-white rounded-full shadow-xs hover:shadow-md transition group"
            >
              <OptimizedImage
                src="/images/logo.png"
                alt="Trọ Xinh Logo"
                priority={true}
                loading="eager"
                width={26}
                height={26}
                className="w-6 h-6 rounded-lg object-cover"
              />
              <span className="text-base sm:text-lg font-black tracking-tight text-[#006d37] group-hover:scale-105 transition-transform">
                trọ<span className="text-[#ffba00] bg-[#006d37] px-1 rounded-sm ml-0.5 text-white">XINH</span>
              </span>
            </Link>

            {/* Role Dropdown: Dành cho chủ trọ ▾ */}
            <div className="relative hidden md:block" ref={roleDropdownRef}>
              <button
                onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                className="flex items-center gap-1 text-xs font-bold text-gray-900 hover:text-black px-2 py-1 rounded-lg hover:bg-black/5 transition"
              >
                <span>{currentUser?.role === 'owner' ? 'Dành cho chủ trọ' : 'Dành cho người thuê'}</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isRoleDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isRoleDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="absolute left-0 mt-1.5 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 p-1.5 z-50 text-xs font-bold text-gray-800"
                  >
                    <Link
                      to="/tim-phong"
                      onClick={() => setIsRoleDropdownOpen(false)}
                      className="flex items-center gap-2 p-2 rounded-xl hover:bg-emerald-50 hover:text-[#006d37]"
                    >
                      <Compass className="w-4 h-4 text-[#006d37]" />
                      <span>Dành cho người thuê</span>
                    </Link>
                    <Link
                      to="/chu-tro"
                      onClick={() => setIsRoleDropdownOpen(false)}
                      className="flex items-center gap-2 p-2 rounded-xl hover:bg-emerald-50 hover:text-[#006d37]"
                    >
                      <Building2 className="w-4 h-4 text-[#006d37]" />
                      <span>Dành cho chủ trọ</span>
                    </Link>
                    <Link
                      to="/bang-gia"
                      onClick={() => setIsRoleDropdownOpen(false)}
                      className="flex items-center gap-2 p-2 rounded-xl hover:bg-emerald-50 hover:text-[#006d37]"
                    >
                      <CreditCard className="w-4 h-4 text-[#006d37]" />
                      <span>Bảng giá dịch vụ</span>
                    </Link>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Center: Main Category Tabs */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-bold text-gray-800">
            {navTabs.map((tab) => {
              const active = isActive(tab.to);
              return (
                <Link
                  key={tab.to}
                  to={tab.to}
                  className={`py-1 transition-all ${
                    active
                      ? 'text-gray-900 border-b-2 border-gray-900 font-extrabold'
                      : 'text-gray-800 hover:text-black opacity-85 hover:opacity-100'
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Action Icons & Pill Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Heart Saved Rooms */}
            <Link
              to="/da-luu"
              className="w-9 h-9 rounded-full bg-white/90 hover:bg-white text-gray-800 flex items-center justify-center transition shadow-2xs relative"
              title="Phòng đã lưu"
            >
              <Heart className="w-4 h-4 text-gray-700 hover:text-rose-600" />
              {savedRoomIds.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center ring-2 ring-white">
                  {savedRoomIds.length}
                </span>
              )}
            </Link>

            {/* Notification Bell */}
            <Link
              to={currentUser?.role === 'owner' ? '/chu-tro/thong-bao' : '/thong-bao'}
              className="w-9 h-9 rounded-full bg-white/90 hover:bg-white text-gray-800 flex items-center justify-center transition shadow-2xs relative"
              title="Thông báo"
            >
              <Bell className="w-4 h-4 text-gray-700" />
              {unreadNotifs > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center ring-2 ring-white animate-pulse">
                  {unreadNotifs}
                </span>
              )}
            </Link>

            {/* Chat / Liên hệ Pill */}
            <Link
              to={currentUser?.role === 'owner' ? '/chu-tro/tin-nhan' : '/tin-nhan'}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 hover:bg-white text-gray-800 text-xs font-bold transition shadow-2xs relative"
              title="Liên hệ / Tin nhắn"
            >
              <MessageSquare className="w-4 h-4 text-gray-700" />
              <span>Liên hệ</span>
              {unreadMessages > 0 && (
                <span className="ml-0.5 px-1.5 py-0.2 bg-[#006d37] text-white text-[9px] font-bold rounded-full">
                  {unreadMessages}
                </span>
              )}
            </Link>

            {/* Login Pill (if not logged in) */}
            {!currentUser && (
              <Link
                to="/dang-nhap"
                className="px-3.5 py-1.5 rounded-full bg-white text-gray-900 text-xs font-bold hover:bg-white/90 transition shadow-2xs"
              >
                Đăng nhập
              </Link>
            )}

            {/* ĐĂNG TIN - Black Pill Button (Chợ Tốt Signature) */}
            <button
              onClick={handlePostRoom}
              className="flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-gray-950 hover:bg-black text-[#ffba00] hover:text-white text-xs font-black transition shadow-md"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>ĐĂNG TIN</span>
            </button>

            {/* User Avatar Dropdown */}
            {currentUser && (
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
                  <ChevronDown className={`w-3.5 h-3.5 text-gray-700 pr-1 transition-transform ${isAvatarDropdownOpen ? 'rotate-180' : ''}`} />
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

      {/* Drawer Side Navigation for Mobile Menu */}
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
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 px-2">Danh mục chính</p>
                  <Link to="/" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-amber-50">
                    <span>🏠</span> Trang chủ Trọ Xinh
                  </Link>
                  <Link to="/tim-phong" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-amber-50">
                    <span>🧭</span> Tìm phòng trọ
                  </Link>
                  <Link to="/ban-do" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-amber-50">
                    <span>🗺️</span> Xem trên bản đồ
                  </Link>
                  <Link to="/trust/da-kiem-duyet" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-amber-50">
                    <span>🛡️</span> Quy trình xác minh
                  </Link>
                  <Link to="/bang-gia" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-amber-50">
                    <span>💳</span> Bảng giá gói chủ trọ
                  </Link>
                </div>

                <div className="space-y-1 text-xs font-bold text-gray-800 pt-2 border-t border-gray-100">
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 px-2">Tiện ích sinh viên</p>
                  <Link to="/tim-ban-cung-phong" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-amber-50">
                    <span>👥</span> Tìm bạn cùng phòng
                  </Link>
                  <Link to="/cho-do-cu" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-amber-50">
                    <span>🛍️</span> Chợ đồ cũ sinh viên
                  </Link>
                  <Link to="/hop-dong-mau" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-amber-50">
                    <span>📄</span> Mẫu hợp đồng thuê trọ
                  </Link>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 text-center">
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    handlePostRoom();
                  }}
                  className="w-full py-2.5 bg-gray-950 text-[#ffba00] font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md"
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
