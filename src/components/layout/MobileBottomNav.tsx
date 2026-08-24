import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import {
  Home,
  Compass,
  MapPin,
  Heart,
  User as UserIcon,
  LayoutDashboard,
  Building2,
  Bell,
  MessageSquare,
  ShieldCheck,
  BarChart3,
  Calendar,
} from 'lucide-react';

interface NavLinkItem {
  to: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

export const MobileBottomNav: React.FC = () => {
  const { currentUser, notifications, threads, savedRoomIds, bookings } = useAppStore();
  const location = useLocation();

  const unreadNotifs = notifications.filter((n) => !n.read).length;
  const unreadMessages = threads.reduce((acc, t) => acc + (t.unreadCount || 0), 0);

  // Hidden on specific fullscreen auth pages
  if (['/dang-nhap', '/dang-ky', '/quen-mat-khau', '/xac-thuc-otp'].includes(location.pathname)) {
    return null;
  }

  // Renter / Standard User / Guest tabs (Strict 5 items)
  const userTabs: NavLinkItem[] = [
    { to: '/', label: 'Trang chủ', icon: Home },
    { to: '/tim-phong', label: 'Tìm phòng', icon: Compass },
    { to: '/ban-do', label: 'Bản đồ', icon: MapPin },
    { to: '/toi', label: 'Lịch hẹn', icon: Calendar, badge: bookings.length },
    { to: currentUser ? '/toi' : '/dang-nhap', label: 'Tài khoản', icon: UserIcon },
  ];

  // Owner tabs (Strict 5 items)
  const ownerTabs: NavLinkItem[] = [
    { to: '/chu-tro', label: 'Tổng quan', icon: LayoutDashboard },
    { to: '/chu-tro/toa-nha', label: 'Phòng trọ', icon: Building2 },
    { to: '/chu-tro', label: 'Lịch hẹn', icon: Calendar, badge: bookings.length },
    { to: '/tin-nhan', label: 'Tin nhắn', icon: MessageSquare, badge: unreadMessages },
    { to: '/chu-tro/toi', label: 'Tài khoản', icon: UserIcon },
  ];

  // Admin tabs (Strict 5 items)
  const adminTabs: NavLinkItem[] = [
    { to: '/admin', label: 'Kiểm duyệt', icon: ShieldCheck, badge: unreadNotifs },
    { to: '/admin/don-chu-tro', label: 'Chủ trọ', icon: Building2 },
    { to: '/admin/thong-ke', label: 'Thống kê', icon: BarChart3 },
    { to: '/tin-nhan', label: 'Tin nhắn', icon: MessageSquare, badge: unreadMessages },
    { to: '/toi', label: 'Tài khoản', icon: UserIcon },
  ];

  const currentTabs =
    currentUser?.role === 'owner' ? ownerTabs : currentUser?.role === 'admin' ? adminTabs : userTabs;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-lg">
      <div className="grid grid-cols-5 h-16 max-w-lg mx-auto">
        {currentTabs.map((tab, idx) => {
          const Icon = tab.icon;
          const isActive = location.pathname === tab.to || (tab.to === '/tim-phong' && location.pathname === '/tim-kiem');
          return (
            <Link
              key={`${tab.to}-${idx}`}
              to={tab.to}
              className={`flex flex-col items-center justify-center gap-1 transition-colors relative ${
                isActive ? 'text-[#00a854]' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 bg-rose-500 text-white text-[9px] font-black rounded-full flex items-center justify-center ring-2 ring-white">
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] ${isActive ? 'font-black text-[#00a854]' : 'font-semibold'}`}>
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute bottom-1 w-1.5 h-1.5 bg-[#00a854] rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
