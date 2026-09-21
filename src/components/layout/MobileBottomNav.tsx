import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import {
  Home,
  Compass,
  Heart,
  User as UserIcon,
  LayoutDashboard,
  Building2,
  MessageSquare,
  ShieldCheck,
  BarChart3,
  Calendar,
  Users,
} from 'lucide-react';

interface NavLinkItem {
  to: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

export const MobileBottomNav: React.FC = () => {
  const { currentUser, notifications = [], savedRoomIds = [], bookings = [] } = useAppStore();
  const location = useLocation();

  const unreadNotifs = (notifications || []).filter((n) => !n.read).length;
  const unreadMessages = (notifications || []).filter(
    (n) => !n.read && (n.type === 'chat_message' || n.type === 'message')
  ).length;

  // Hidden on specific fullscreen auth pages
  if (['/dang-nhap', '/dang-ky', '/quen-mat-khau', '/xac-thuc-otp'].includes(location.pathname)) {
    return null;
  }

  // Check if viewing room detail page with mobile bottom CTA active
  const isRoomDetailPage = location.pathname.startsWith('/phong/');

  // 1. Renter / Guest Tabs (5 items): Trang chủ · Tìm phòng · Đã lưu · Tin nhắn · Tài khoản
  const userTabs: NavLinkItem[] = [
    { to: '/', label: 'Trang chủ', icon: Home },
    { to: '/tim-kiem', label: 'Tìm phòng', icon: Compass },
    { to: '/da-luu', label: 'Đã lưu', icon: Heart, badge: (savedRoomIds || []).length },
    { to: '/tin-nhan', label: 'Tin nhắn', icon: MessageSquare, badge: unreadMessages },
    { to: currentUser ? '/toi' : '/dang-nhap', label: 'Tài khoản', icon: UserIcon },
  ];

  // 2. Owner tabs (5 items): Tổng quan · Phòng · Lịch hẹn · Tin nhắn · Tài khoản
  const ownerTabs: NavLinkItem[] = [
    { to: '/chu-tro', label: 'Tổng quan', icon: LayoutDashboard },
    { to: '/chu-tro/toa-nha', label: 'Phòng', icon: Building2 },
    { to: '/lich-hen', label: 'Lịch hẹn', icon: Calendar, badge: (bookings || []).length },
    { to: '/tin-nhan', label: 'Tin nhắn', icon: MessageSquare, badge: unreadMessages },
    { to: '/chu-tro/toi', label: 'Tài khoản', icon: UserIcon },
  ];

  // 3. Admin tabs (5 items): Kiểm duyệt · Người dùng · Thống kê · Tin nhắn · Tài khoản
  const adminTabs: NavLinkItem[] = [
    { to: '/admin', label: 'Kiểm duyệt', icon: ShieldCheck, badge: unreadNotifs },
    { to: '/admin/nguoi-dung', label: 'Người dùng', icon: Users },
    { to: '/admin/thong-ke', label: 'Thống kê', icon: BarChart3 },
    { to: '/tin-nhan', label: 'Tin nhắn', icon: MessageSquare, badge: unreadMessages },
    { to: '/toi', label: 'Tài khoản', icon: UserIcon },
  ];

  const currentTabs =
    currentUser?.role === 'owner' ? ownerTabs : currentUser?.role === 'admin' ? adminTabs : userTabs;

  return (
    <nav
      className="lg:hidden fixed left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200/80 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] transition-[bottom] duration-200"
      style={{
        bottom: isRoomDetailPage ? 'calc(4.25rem + env(safe-area-inset-bottom, 0px))' : '0px',
        paddingBottom: isRoomDetailPage ? '0px' : 'env(safe-area-inset-bottom, 0px)',
      }}
      aria-label="Thanh điều hướng dưới"
    >
      <div className="grid grid-cols-5 h-14 max-w-lg mx-auto px-1">
        {currentTabs.map((tab, idx) => {
          const Icon = tab.icon;
          const isActive =
            location.pathname === tab.to ||
            (tab.to === '/tim-kiem' && (location.pathname === '/tim-phong' || location.pathname === '/tim-kiem')) ||
            (tab.to === '/lich-hen' && location.pathname.startsWith('/lich-hen'));
          return (
            <Link
              key={`${tab.to}-${idx}`}
              to={tab.to}
              aria-label={tab.label}
              className={`flex flex-col items-center justify-center gap-0.5 transition-all relative tap-bounce select-none min-h-[48px] py-1 ${
                isActive ? 'text-[#00a854]' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110 stroke-[2.5px]' : 'stroke-[1.75px]'}`} />
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-4 h-4 px-1 bg-rose-600 text-white text-[9px] font-black rounded-full flex items-center justify-center ring-2 ring-white shadow-xs animate-pulse">
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10.5px] transition-all tracking-tight ${isActive ? 'font-black text-[#00a854]' : 'font-medium'}`}>
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute bottom-1 w-1 h-1 bg-[#00a854] rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
