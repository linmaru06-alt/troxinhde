import React, { useRef } from 'react';
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
  Home,
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
  Sparkles,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, savedRoomIds, threads, logout } = useAppStore();
  const { isAvatarDropdownOpen, toggleAvatarDropdown, closeAllDropdowns } = useUIStore();
  const { unreadCount: unreadNotifs } = useRealtimeNotifications();

  const dropdownRef = useRef<HTMLDivElement>(null);
  useOutsideClick(dropdownRef, closeAllDropdowns, isAvatarDropdownOpen);

  const unreadMessages = threads.reduce((acc, t) => acc + (t.unreadCount || 0), 0);

  const navLinks = [
    { to: '/tim-kiem', label: 'Tìm Phòng', icon: Compass },
    { to: '/ban-do', label: 'Bản Đồ', icon: MapPin },
    { to: '/roommate', label: 'Ở Ghép', icon: Users },
    { to: '/cho-do-cu', label: 'Chợ Đồ Cũ', icon: ShoppingBag },
    { to: '/ve-chung-toi/kiem-duyet', label: 'Kiểm Duyệt 100%', icon: ShieldCheck },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200/80 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18">
          {/* Logo & Brand */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2.5 group">
              <OptimizedImage
                src="/images/logo.png"
                alt="Trọ Xinh Logo"
                priority={true}
                loading="eager"
                width={40}
                height={40}
                className="w-10 h-10 rounded-2xl object-cover ring-2 ring-emerald-500/20 shadow-md group-hover:scale-105 transition-transform duration-200"
              />
              <div className="flex flex-col">
                <span className="text-xl font-black tracking-tight text-[#006d37] leading-none">
                  Trọ Xinh
                </span>
                <span className="text-[10px] font-bold text-gray-500 tracking-wider uppercase mt-0.5">
                  TroXinh.vn
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const active = isActive(link.to);
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-150 ${
                      active
                        ? 'bg-emerald-50 text-[#006d37] shadow-xs'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/70'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${active ? 'text-[#006d37]' : 'text-gray-400'}`} />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Action Icons & User Menu */}
          <div className="flex items-center gap-3">
            {/* Heart Saved Rooms */}
            <Link
              to="/da-luu"
              className="relative p-2 rounded-xl text-gray-600 hover:text-rose-600 hover:bg-rose-50 transition"
              title="Phòng đã lưu"
            >
              <Heart className="w-5 h-5" />
              {savedRoomIds.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                  {savedRoomIds.length}
                </span>
              )}
            </Link>

            {/* Notifications & Chat (when authenticated) */}
            {currentUser && (
              <>
                <Link
                  to={currentUser.role === 'owner' ? '/chu-tro/thong-bao' : '/thong-bao'}
                  className="relative p-2 rounded-xl text-gray-600 hover:text-[#006d37] hover:bg-emerald-50 transition"
                  title="Thông báo"
                >
                  <Bell className="w-5 h-5" />
                  {unreadNotifs > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white animate-pulse">
                      {unreadNotifs}
                    </span>
                  )}
                </Link>

                <Link
                  to={currentUser.role === 'owner' ? '/chu-tro/tin-nhan' : '/tin-nhan'}
                  className="relative p-2 rounded-xl text-gray-600 hover:text-[#006d37] hover:bg-emerald-50 transition"
                  title="Tin nhắn"
                >
                  <MessageSquare className="w-5 h-5" />
                  {unreadMessages > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#006d37] text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                      {unreadMessages}
                    </span>
                  )}
                </Link>
              </>
            )}

            {/* Progressive Role Action Buttons */}
            {currentUser?.role === 'owner' && (
              <Link to="/chu-tro" className="hidden sm:block">
                <Button variant="secondary" size="sm" leftIcon={<Building2 className="w-4 h-4" />}>
                  Quản Lý Nhà Trọ
                </Button>
              </Link>
            )}

            {currentUser?.role === 'admin' && (
              <Link to="/admin" className="hidden sm:block">
                <Button variant="primary" size="sm" leftIcon={<ShieldCheck className="w-4 h-4" />}>
                  Bảng Quản Trị
                </Button>
              </Link>
            )}

            {currentUser && currentUser.role === 'user' && (
              <Link to="/nang-cap-chu-tro" className="hidden sm:block">
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<PlusCircle className="w-4 h-4 text-[#006d37]" />}
                >
                  {currentUser.ownerApplicationStatus === 'pending' ? 'Hồ Sơ Đang Duyệt ⏳' : 'Đăng Phòng / Làm Chủ Trọ'}
                </Button>
              </Link>
            )}

            {/* User Dropdown / Login Button */}
            {currentUser ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={toggleAvatarDropdown}
                  className="flex items-center gap-2 p-1.5 rounded-2xl hover:bg-gray-100 transition border border-gray-200/80"
                  aria-expanded={isAvatarDropdownOpen}
                >
                  <OptimizedImage
                    src={currentUser.avatarUrl}
                    alt={currentUser.name}
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-xl object-cover ring-1 ring-gray-200"
                  />
                  <div className="hidden md:flex flex-col text-left">
                    <span className="text-xs font-bold text-gray-900 leading-tight">
                      {currentUser.name}
                    </span>
                    <span className="text-[10px] text-gray-500">
                      {currentUser.role === 'owner' ? 'Chủ Trọ Đối Tác' : currentUser.role === 'admin' ? 'Admin Quản Trị' : 'Người Thuê'}
                    </span>
                  </div>
                  <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${isAvatarDropdownOpen ? 'rotate-180' : ''}`} />
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
                            {currentUser.role === 'owner' ? '🏢 Chủ Trọ' : currentUser.role === 'admin' ? '🛡️ Quản Trị Viên' : '👤 Người Thuê'}
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

                      {currentUser.role === 'user' && (
                        <Link
                          to="/nang-cap-chu-tro"
                          className="flex items-center gap-2 px-4 py-2.5 text-xs text-[#006d37] hover:bg-emerald-50 font-bold"
                        >
                          <Building2 className="w-4 h-4" />
                          <span>Nâng cấp lên Chủ Trọ</span>
                        </Link>
                      )}

                      {currentUser.role === 'owner' && (
                        <Link
                          to="/chu-tro"
                          className="flex items-center gap-2 px-4 py-2.5 text-xs text-[#006d37] hover:bg-emerald-50 font-bold"
                        >
                          <Building2 className="w-4 h-4" />
                          <span>Bảng Quản Trị Tòa Nhà</span>
                        </Link>
                      )}

                      {currentUser.role === 'admin' && (
                        <Link
                          to="/admin"
                          className="flex items-center gap-2 px-4 py-2.5 text-xs text-[#006d37] hover:bg-emerald-50 font-bold"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          <span>Duyệt Tin & Hồ Sơ</span>
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
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/dang-nhap">
                  <Button variant="outline" size="sm">
                    Đăng Nhập
                  </Button>
                </Link>
                <Link to="/dang-ky">
                  <Button variant="primary" size="sm">
                    Đăng Ký
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
