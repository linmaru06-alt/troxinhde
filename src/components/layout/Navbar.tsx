import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { Button } from '../ui/Button';
import {
  Home,
  Search,
  MapPin,
  Users,
  ShoppingBag,
  ShieldCheck,
  Bell,
  MessageSquare,
  User as UserIcon,
  LogOut,
  LayoutDashboard,
  PlusCircle,
  Code,
  ChevronDown,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, notifications, threads, logout, loginAsRole } = useAppStore();
  const [showUserMenu, setShowUserMenu] = useState<boolean>(false);
  const [showRoleMenu, setShowRoleMenu] = useState<boolean>(false);

  const unreadNotifs = notifications.filter((n) => !n.read).length;
  const unreadMessages = threads.reduce((acc, t) => acc + (t.unreadCount || 0), 0);

  const navLinks = [
    { to: '/tim-kiem', label: 'Tìm phòng', icon: Search },
    { to: '/ban-do', label: 'Bản đồ', icon: MapPin },
    { to: '/roommate', label: 'Tìm bạn ghép', icon: Users },
    { to: '/cho-do-cu', label: 'Chợ đồ cũ', icon: ShoppingBag },
    { to: '/ve-chung-toi/kiem-duyet', label: 'Đã kiểm duyệt', icon: ShieldCheck },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18">
          {/* Logo & Brand */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-xl bg-linear-to-br from-[#006d37] to-[#27ae60] flex items-center justify-center text-white shadow-md shadow-[#006d37]/20 group-hover:scale-105 transition-transform">
                <Home className="w-6 h-6" />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-extrabold tracking-tight text-[#006d37] leading-none">
                  Trọ Xinh<span className="text-emerald-500">.vn</span>
                </span>
                <span className="text-[10px] font-medium text-gray-500 tracking-wider uppercase mt-0.5">
                  An Tâm Thuê Trọ
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const active = isActive(link.to);
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      active
                        ? 'bg-[#006d37]/10 text-[#006d37]'
                        : 'text-gray-600 hover:text-[#006d37] hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Action Menu */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Role Switcher Pill */}
            <div className="relative">
              <button
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold rounded-full bg-emerald-50 text-[#006d37] border border-emerald-200 hover:bg-emerald-100 transition"
              >
                <span>Role: {currentUser ? currentUser.role.toUpperCase() : 'KHÁCH'}</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {showRoleMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 py-1.5 z-50 text-xs animate-fadeIn">
                  <div className="px-3 py-1 text-[10px] text-gray-400 font-bold uppercase">Chuyển role demo:</div>
                  <button
                    onClick={() => { loginAsRole('renter'); setShowRoleMenu(false); }}
                    className="w-full text-left px-3 py-2 hover:bg-emerald-50 hover:text-[#006d37] flex items-center justify-between"
                  >
                    <span>Người thuê (Renter)</span>
                    {currentUser?.role === 'renter' && <span className="text-[#006d37]">✓</span>}
                  </button>
                  <button
                    onClick={() => { loginAsRole('owner'); setShowRoleMenu(false); }}
                    className="w-full text-left px-3 py-2 hover:bg-emerald-50 hover:text-[#006d37] flex items-center justify-between"
                  >
                    <span>Chủ trọ (Owner)</span>
                    {currentUser?.role === 'owner' && <span className="text-[#006d37]">✓</span>}
                  </button>
                  <button
                    onClick={() => { loginAsRole('admin'); setShowRoleMenu(false); }}
                    className="w-full text-left px-3 py-2 hover:bg-emerald-50 hover:text-[#006d37] flex items-center justify-between"
                  >
                    <span>Ban Quản Trị (Admin)</span>
                    {currentUser?.role === 'admin' && <span className="text-[#006d37]">✓</span>}
                  </button>
                  <button
                    onClick={() => { loginAsRole('guest'); setShowRoleMenu(false); }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 text-gray-500 flex items-center justify-between border-t border-gray-100"
                  >
                    <span>Khách (Chưa đăng nhập)</span>
                    {!currentUser && <span className="text-[#006d37]">✓</span>}
                  </button>
                </div>
              )}
            </div>

            {/* QA Debug shortcut */}
            <Link
              to="/debug"
              className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition hidden sm:flex"
              title="Trang Debug QA"
            >
              <Code className="w-4 h-4" />
            </Link>

            {currentUser ? (
              <>
                {/* Notification Bell */}
                <Link
                  to={currentUser.role === 'owner' ? '/chu-tro/thong-bao' : '/thong-bao'}
                  className="relative p-2 rounded-xl text-gray-600 hover:text-[#006d37] hover:bg-gray-100 transition"
                  aria-label="Thông báo"
                >
                  <Bell className="w-5 h-5" />
                  {unreadNotifs > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                      {unreadNotifs}
                    </span>
                  )}
                </Link>

                {/* Messages Inbox */}
                <Link
                  to={currentUser.role === 'owner' ? '/chu-tro/tin-nhan' : '/tin-nhan'}
                  className="relative p-2 rounded-xl text-gray-600 hover:text-[#006d37] hover:bg-gray-100 transition"
                  aria-label="Tin nhắn"
                >
                  <MessageSquare className="w-5 h-5" />
                  {unreadMessages > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-[#006d37] text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                      {unreadMessages}
                    </span>
                  )}
                </Link>

                {/* Owner CTA to Post Room */}
                {currentUser.role === 'owner' && (
                  <Link to="/chu-tro/phong/tao-moi" className="hidden sm:block">
                    <Button variant="primary" size="sm" leftIcon={<PlusCircle className="w-4 h-4" />}>
                      Đăng Phòng
                    </Button>
                  </Link>
                )}

                {/* User Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 p-1.5 rounded-full hover:bg-gray-100 transition"
                  >
                    <img
                      src={currentUser.avatarUrl}
                      alt={currentUser.name}
                      className="w-8 h-8 rounded-full object-cover ring-2 ring-[#006d37]/30"
                    />
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-fadeIn text-sm">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="font-bold text-gray-900 truncate">{currentUser.name}</p>
                        <p className="text-xs text-gray-500 truncate">{currentUser.phone}</p>
                        <span className="inline-block mt-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-[#006d37]">
                          {currentUser.role === 'owner' ? 'Chủ Trọ' : currentUser.role === 'admin' ? 'Quản Trị Viên' : 'Người Thuê'}
                        </span>
                      </div>

                      <div className="py-1">
                        {currentUser.role === 'owner' ? (
                          <>
                            <Link
                              to="/chu-tro"
                              onClick={() => setShowUserMenu(false)}
                              className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-gray-700 font-medium text-xs"
                            >
                              <LayoutDashboard className="w-4 h-4 text-[#006d37]" />
                              Bảng điều khiển chủ trọ
                            </Link>
                            <Link
                              to="/chu-tro/toa-nha"
                              onClick={() => setShowUserMenu(false)}
                              className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-gray-700 font-medium text-xs"
                            >
                              <Home className="w-4 h-4 text-[#006d37]" />
                              Quản lý tòa nhà
                            </Link>
                            <Link
                              to="/chu-tro/toi"
                              onClick={() => setShowUserMenu(false)}
                              className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-gray-700 font-medium text-xs"
                            >
                              <UserIcon className="w-4 h-4 text-[#006d37]" />
                              Hồ sơ chủ trọ
                            </Link>
                          </>
                        ) : currentUser.role === 'admin' ? (
                          <>
                            <Link
                              to="/admin"
                              onClick={() => setShowUserMenu(false)}
                              className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-gray-700 font-medium text-xs"
                            >
                              <ShieldCheck className="w-4 h-4 text-[#006d37]" />
                              Kiểm duyệt tin đăng
                            </Link>
                            <Link
                              to="/admin/nguoi-dung"
                              onClick={() => setShowUserMenu(false)}
                              className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-gray-700 font-medium text-xs"
                            >
                              <Users className="w-4 h-4 text-[#006d37]" />
                              Quản lý người dùng
                            </Link>
                          </>
                        ) : (
                          <>
                            <Link
                              to="/da-luu"
                              onClick={() => setShowUserMenu(false)}
                              className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-gray-700 font-medium text-xs"
                            >
                              <Search className="w-4 h-4 text-[#006d37]" />
                              Phòng đã lưu
                            </Link>
                            <Link
                              to="/toi"
                              onClick={() => setShowUserMenu(false)}
                              className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-gray-700 font-medium text-xs"
                            >
                              <UserIcon className="w-4 h-4 text-[#006d37]" />
                              Hồ sơ cá nhân
                            </Link>
                          </>
                        )}
                      </div>

                      <div className="border-t border-gray-100 pt-1">
                        <button
                          onClick={() => {
                            logout();
                            setShowUserMenu(false);
                          }}
                          className="flex items-center gap-2 w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 font-medium text-xs"
                        >
                          <LogOut className="w-4 h-4" />
                          Đăng xuất
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/dang-nhap">
                  <Button variant="ghost" size="sm">
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
