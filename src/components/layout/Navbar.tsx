import React, { useRef, useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { useUIStore } from '../../store/useUIStore';
import { useOutsideClick } from '../../hooks/useOutsideClick';
import { useRealtimeNotifications } from '../../hooks/useRealtimeNotifications';
import { OptimizedImage } from '../ui/OptimizedImage';
import { AnimatePresence, motion } from 'framer-motion';
import { AccountDropdownMenu } from './AccountDropdownMenu';
import {
  Compass,
  MapPin,
  Heart,
  Users,
  ShoppingBag,
  Bell,
  MessageSquare,
  User as UserIcon,
  ChevronDown,
  Menu,
  Plus,
  Search,
  X,
  ShieldCheck,
} from 'lucide-react';

const HANOI_DISTRICTS = [
  'Toàn bộ Hà Nội',
  'Quận Cầu Giấy',
  'Quận Đống Đa',
  'Quận Thanh Xuân',
  'Quận Hai Bà Trưng',
  'Quận Nam Từ Liêm',
  'Quận Bắc Từ Liêm',
  'Quận Hà Đông',
  'Quận Ba Đình',
  'Quận Hoàng Mai',
  'Quận Tây Hồ',
  'Quận Long Biên',
];

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout, savedRoomIds = [] } = useAppStore();
  const { openAuthModal } = useUIStore();
  const { unreadCount: unreadNotifs, notifications } = useRealtimeNotifications();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Search & District State (cho thanh Header Chợ Tốt chạy theo khi cuộn)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');

  // Dropdown states cho thanh Sticky Header (Chợ Tốt Style)
  const [isStickyAvatarOpen, setIsStickyAvatarOpen] = useState(false);
  const [isStickyDistrictOpen, setIsStickyDistrictOpen] = useState(false);
  const stickyDropdownRef = useRef<HTMLDivElement>(null);
  const stickyDistrictDropdownRef = useRef<HTMLDivElement>(null);

  useOutsideClick(stickyDropdownRef, () => setIsStickyAvatarOpen(false), isStickyAvatarOpen);
  useOutsideClick(stickyDistrictDropdownRef, () => setIsStickyDistrictOpen(false), isStickyDistrictOpen);

  // Dropdown states cho thanh Header ban đầu ở đỉnh trang (Top Navbar)
  const [isTopAvatarOpen, setIsTopAvatarOpen] = useState(false);
  const topDropdownRef = useRef<HTMLDivElement>(null);
  useOutsideClick(topDropdownRef, () => setIsTopAvatarOpen(false), isTopAvatarOpen);

  // Lắng nghe sự kiện vuốt/cuộn trang toàn diện (Window, Document, Body)
  useEffect(() => {
    const handleScroll = () => {
      const scrollPos =
        window.pageYOffset ||
        document.documentElement.scrollTop ||
        document.body.scrollTop ||
        window.scrollY ||
        0;
      setIsScrolled(scrollPos > 30);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Đồng bộ giá trị tìm kiếm từ URL query nếu có
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get('q');
    const khuVuc = params.get('khuVuc');
    if (q !== null) setSearchQuery(q);
    if (khuVuc !== null) setSelectedDistrict(khuVuc);
  }, [location.search]);

  const unreadMessages = (notifications || []).filter(
    (n) => !n.read && (n.type === 'chat_message' || n.type === 'message')
  ).length;

  // Main navigation links: Room rental, Map, Roommate, Student Marketplace
  const navLinks = [
    { to: '/tim-phong', label: 'Tìm phòng' },
    { to: '/ban-do', label: 'Xem bản đồ' },
    { to: '/tim-ban-cung-phong', label: 'Tìm bạn cùng phòng' },
    { to: '/cho-do-cu', label: 'Chợ đồ cũ sinh viên' },
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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    if (selectedDistrict && selectedDistrict !== 'Toàn bộ Hà Nội') {
      params.set('khuVuc', selectedDistrict);
    }
    navigate(`/tim-kiem?${params.toString()}`);
  };

  const handleSelectDistrict = (district: string) => {
    const isAll = district === 'Toàn bộ Hà Nội';
    setSelectedDistrict(isAll ? '' : district);
    setIsStickyDistrictOpen(false);

    const params = new URLSearchParams(location.search);
    if (isAll) {
      params.delete('khuVuc');
    } else {
      params.set('khuVuc', district);
    }
    navigate(`/tim-kiem?${params.toString()}`);
  };

  return (
    <>
      {/* =========================================================================
          THANH 1: TOP NAVBAR (Màu xanh thương hiệu ban đầu ở đầu trang)
          Hiển thị tự nhiên khi chưa cuộn trang
      ========================================================================= */}
      <header className="relative w-full z-40 bg-[#00a854] border-b border-emerald-600/30 shadow-xs text-white">
        <div className="w-full px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* 1. Left: Hamburger + Pill Logo */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Mở menu danh mục"
                className="w-9 h-9 rounded-full bg-white/90 hover:bg-white text-gray-950 flex items-center justify-center transition shadow-2xs cursor-pointer"
                title="Menu danh mục"
              >
                <Menu className="w-5 h-5" />
              </button>

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
                <span className="text-base sm:text-lg font-black tracking-tight text-gray-950 leading-none">
                  Trọ Xinh
                </span>
              </Link>
            </div>

            {/* 2. Center: Desktop Main Navigation Tabs */}
            <nav className="hidden lg:flex items-center gap-3 text-xs font-bold">
              {navLinks.map((link) => {
                const active = isActive(link.to);
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black transition shadow-2xs ${
                      active
                        ? 'bg-white text-gray-950 shadow-md'
                        : 'bg-white/90 hover:bg-white text-gray-900/80 hover:text-gray-950'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            {/* 3. Right: Actions & User Menu */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Heart Saved Rooms */}
              <Link
                to="/da-luu"
                aria-label="Phòng đã lưu"
                className="hidden sm:flex w-9 h-9 rounded-full bg-white/90 hover:bg-white text-gray-950 items-center justify-center transition shadow-2xs relative"
                title="Phòng đã lưu"
              >
                <Heart className="w-4 h-4 text-gray-950 stroke-[2.5]" />
                {savedRoomIds.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center ring-2 ring-white">
                    {savedRoomIds.length}
                  </span>
                )}
              </Link>

              {/* Notification Bell */}
              <Link
                to={currentUser?.role === 'owner' ? '/chu-tro/thong-bao' : '/thong-bao'}
                aria-label="Thông báo"
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

              {/* Chat / Liên hệ Pill */}
              <Link
                to="/tin-nhan"
                aria-label="Tin nhắn liên hệ"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/90 hover:bg-white text-gray-950 text-xs font-black transition shadow-2xs relative"
                title="Tin nhắn / Liên hệ"
              >
                <MessageSquare className="w-4 h-4 text-gray-950 stroke-[2.5]" />
                <span>Liên hệ</span>
                {unreadMessages > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.2 bg-rose-500 text-white text-[9px] font-black rounded-full">
                    {unreadMessages}
                  </span>
                )}
              </Link>

              {/* ĐĂNG TIN */}
              <button
                onClick={handlePostClick}
                className="hidden sm:flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-gray-950 hover:bg-black text-white text-xs font-black transition shadow-md cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span>ĐĂNG TIN</span>
              </button>

              {/* NÚT QUẢN TRỊ KHI LÀ ADMIN */}
              {currentUser?.role === 'admin' && (
                <Link
                  to="/admin"
                  className="hidden sm:flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-purple-800 hover:bg-purple-900 text-white text-xs font-black transition shadow-md cursor-pointer"
                  title="Bảng điều khiển quản trị viên"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>QUẢN TRỊ</span>
                </Link>
              )}

              {/* Ô Tài Khoản & Dropdown Menu Chợ Tốt */}
              <div className="relative" ref={topDropdownRef}>
                {currentUser ? (
                  <button
                    onClick={() => setIsTopAvatarOpen(!isTopAvatarOpen)}
                    className="flex items-center gap-1 p-0.5 rounded-full bg-white hover:ring-2 hover:ring-white transition shadow-2xs cursor-pointer"
                    aria-expanded={isTopAvatarOpen}
                    title="Tài khoản cá nhân"
                  >
                    <OptimizedImage
                      src={currentUser.avatarUrl}
                      alt={currentUser.name}
                      width={32}
                      height={32}
                      className="w-8 h-8 rounded-full object-cover ring-1 ring-white/60"
                    />
                    {currentUser.isDemoAccount && (
                      <span className="bg-amber-400 text-amber-950 text-[9px] font-black px-1.5 py-0.5 rounded-md leading-none uppercase tracking-wide">
                        DEMO
                      </span>
                    )}
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-gray-950 pr-1 transition-transform ${
                        isTopAvatarOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsTopAvatarOpen(!isTopAvatarOpen)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white text-gray-950 text-xs font-black hover:bg-white/90 transition shadow-2xs cursor-pointer min-h-[36px]"
                    title="Tài khoản & Đăng nhập"
                    aria-expanded={isTopAvatarOpen}
                  >
                    <UserIcon className="w-3.5 h-3.5 text-gray-950" />
                    <span>Tài khoản</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-gray-950 transition-transform ${
                        isTopAvatarOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                )}

                <AccountDropdownMenu
                  isOpen={isTopAvatarOpen}
                  onClose={() => setIsTopAvatarOpen(false)}
                  currentUser={currentUser}
                  openAuthModal={openAuthModal}
                  logout={logout}
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* =========================================================================
          THANH 2: STICKY HEADER CHỢ TỐT STYLE CHẠY THEO KHI VUỐT TRANG XUỐNG
          (Fixed top-0, tự động trượt xuống mượt mà khi cuộn trang > 30px)
      ========================================================================= */}
      <div
        className={`fixed top-0 left-0 right-0 z-50 w-full bg-white/98 backdrop-blur-md border-b border-gray-200/90 text-gray-900 transition-all duration-300 ease-in-out transform ${
          isScrolled
            ? 'translate-y-0 opacity-100 shadow-md pointer-events-auto'
            : '-translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="w-full px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-2 sm:gap-3">
            {/* 1. Left: Hamburger + Logo Trọ Xinh */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Mở menu danh mục"
                className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-950 flex items-center justify-center transition shadow-2xs cursor-pointer"
                title="Menu danh mục"
              >
                <Menu className="w-5 h-5" />
              </button>

              <Link
                to="/"
                className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 bg-white hover:bg-gray-50 rounded-full transition group shrink-0"
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
                <span className="text-base sm:text-lg font-black tracking-tight text-[#00a854] leading-none hidden xs:inline">
                  Trọ Xinh
                </span>
              </Link>
            </div>

            {/* 2. Dropdown Chọn khu vực (Chợ Tốt Style) */}
            <div className="relative shrink-0 hidden md:block" ref={stickyDistrictDropdownRef}>
              <button
                type="button"
                onClick={() => setIsStickyDistrictOpen(!isStickyDistrictOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200/80 rounded-full text-xs font-bold text-gray-800 transition cursor-pointer"
                title="Chọn khu vực tìm kiếm"
              >
                <MapPin className="w-3.5 h-3.5 text-[#00a854] fill-emerald-500/20" />
                <span className="truncate max-w-[115px]">
                  {selectedDistrict || 'Chọn khu vực'}
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-gray-500 transition-transform ${
                    isStickyDistrictOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              <AnimatePresence>
                {isStickyDistrictOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-gray-200 py-2 z-50 max-h-72 overflow-y-auto"
                  >
                    <div className="px-3 py-1.5 text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">
                      Khu Vực Hà Nội
                    </div>
                    {HANOI_DISTRICTS.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => handleSelectDistrict(d)}
                        className={`w-full text-left px-3.5 py-2 text-xs transition flex items-center justify-between cursor-pointer ${
                          selectedDistrict === d || (!selectedDistrict && d === 'Toàn bộ Hà Nội')
                            ? 'bg-emerald-50 text-[#00a854] font-bold'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <span>{d}</span>
                        {(selectedDistrict === d || (!selectedDistrict && d === 'Toàn bộ Hà Nội')) && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#00a854]" />
                        )}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 3. Center: Thanh tìm kiếm nhanh (Input + Nút kính lúp tròn màu vàng) */}
            <form onSubmit={handleSearchSubmit} className="flex-1 max-w-xl mx-1 sm:mx-2 min-w-[140px]">
              <div className="relative flex items-center bg-gray-100 hover:bg-gray-100/90 focus-within:bg-white focus-within:ring-2 focus-within:ring-[#00a854]/40 focus-within:border-[#00a854] rounded-full pl-3 sm:pl-3.5 pr-1 py-1 border border-transparent transition shadow-2xs">
                <Search className="w-4 h-4 text-gray-400 shrink-0 mr-1.5 hidden xs:block" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Tìm phòng trọ, trường ĐH, khu vực..."
                  className="w-full bg-transparent text-xs text-gray-900 placeholder-gray-400 focus:outline-none pr-1"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="text-gray-400 hover:text-gray-600 mr-1 p-0.5 cursor-pointer"
                    title="Xóa tìm kiếm"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                {/* Nút kính lúp tròn màu xanh thương hiệu Trọ Xinh */}
                <button
                  type="submit"
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#00a854] hover:bg-[#008f47] text-white flex items-center justify-center shrink-0 transition shadow-xs cursor-pointer"
                  title="Tìm kiếm"
                >
                  <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                </button>
              </div>
            </form>

            {/* 4. Right: Hành động (Tim, Chuông, Liên hệ, Đăng tin, Tài khoản) */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Icon Trái tim (Phòng đã lưu) */}
              <Link
                to="/da-luu"
                aria-label="Phòng đã lưu"
                className="hidden lg:flex w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-800 items-center justify-center transition relative"
                title="Phòng đã lưu"
              >
                <Heart className="w-4 h-4 text-gray-800 stroke-[2.2]" />
                {savedRoomIds.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center ring-2 ring-white">
                    {savedRoomIds.length}
                  </span>
                )}
              </Link>

              {/* Icon Chuông thông báo */}
              <Link
                to={currentUser?.role === 'owner' ? '/chu-tro/thong-bao' : '/thong-bao'}
                aria-label="Thông báo"
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-800 flex items-center justify-center transition relative"
                title="Thông báo"
              >
                <Bell className="w-4 h-4 text-gray-800 stroke-[2.2]" />
                {unreadNotifs > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center ring-2 ring-white animate-pulse">
                    {unreadNotifs}
                  </span>
                )}
              </Link>

              {/* Nút Liên hệ */}
              <Link
                to="/tin-nhan"
                aria-label="Tin nhắn liên hệ"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 hover:bg-gray-100 text-gray-900 text-xs font-bold transition shadow-2xs relative"
                title="Tin nhắn / Liên hệ"
              >
                <MessageSquare className="w-4 h-4 text-gray-800 stroke-[2.2]" />
                <span>Liên hệ</span>
                {unreadMessages > 0 && (
                  <span className="ml-0.5 px-1.5 py-0.2 bg-rose-500 text-white text-[9px] font-black rounded-full">
                    {unreadMessages}
                  </span>
                )}
              </Link>

              {/* Nút ĐĂNG TIN (Màu xanh Trọ Xinh nổi bật) */}
              <button
                onClick={handlePostClick}
                className="flex items-center gap-1 px-3 sm:px-4 py-1.5 rounded-full bg-[#00a854] hover:bg-[#008f47] text-white text-xs font-black transition shadow-xs cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
                <span className="hidden xs:inline">ĐĂNG TIN</span>
                <span className="xs:hidden">Đăng</span>
              </button>

              {/* Ô Tài Khoản & Dropdown Menu Chợ Tốt */}
              <div className="relative" ref={stickyDropdownRef}>
                {currentUser ? (
                  <button
                    onClick={() => setIsStickyAvatarOpen(!isStickyAvatarOpen)}
                    className="flex items-center gap-1 p-0.5 rounded-full hover:ring-2 hover:ring-gray-300 transition shadow-2xs cursor-pointer"
                    aria-expanded={isStickyAvatarOpen}
                    title="Tài khoản cá nhân"
                  >
                    <OptimizedImage
                      src={currentUser.avatarUrl}
                      alt={currentUser.name}
                      width={32}
                      height={32}
                      className="w-8 h-8 rounded-full object-cover ring-1 ring-gray-200"
                    />
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-gray-700 pr-0.5 transition-transform ${
                        isStickyAvatarOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsStickyAvatarOpen(!isStickyAvatarOpen)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 hover:bg-gray-100 text-gray-900 text-xs font-bold transition cursor-pointer min-h-[34px]"
                    title="Tài khoản & Đăng nhập"
                    aria-expanded={isStickyAvatarOpen}
                  >
                    <UserIcon className="w-3.5 h-3.5 text-gray-700" />
                    <span className="hidden sm:inline">Tài khoản</span>
                    <ChevronDown
                      className={`w-3 h-3 text-gray-500 transition-transform ${
                        isStickyAvatarOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                )}

                <AccountDropdownMenu
                  isOpen={isStickyAvatarOpen}
                  onClose={() => setIsStickyAvatarOpen(false)}
                  currentUser={currentUser}
                  openAuthModal={openAuthModal}
                  logout={logout}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MOBILE DRAWER MENU (Chung cho cả 2 trạng thái)
      ========================================================================= */}
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
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    aria-label="Đóng menu"
                    className="text-gray-400 hover:text-gray-700 font-bold text-sm min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer"
                  >
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
                  className="w-full py-2.5 bg-[#00a854] hover:bg-[#008f47] text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[3]" /> ĐĂNG TIN PHÒNG TRỌ
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
