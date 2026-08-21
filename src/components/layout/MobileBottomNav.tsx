import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import {
  Compass,
  MapPin,
  Heart,
  Users,
  User as UserIcon,
  LayoutDashboard,
  Building2,
  Bell,
  MessageSquare,
  ShieldCheck,
  BarChart3,
  Code,
} from 'lucide-react';

interface NavLinkItem {
  to: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

export const MobileBottomNav: React.FC = () => {
  const { currentUser, notifications, threads, savedRoomIds } = useAppStore();
  const location = useLocation();

  const unreadNotifs = notifications.filter((n) => !n.read).length;
  const unreadMessages = threads.reduce((acc, t) => acc + (t.unreadCount || 0), 0);

  // Hidden on specific fullscreen auth pages
  if (['/dang-nhap', '/dang-ky', '/quen-mat-khau', '/xac-thuc-otp'].includes(location.pathname)) {
    return null;
  }

  // Renter / Standard User / Guest tabs
  const userTabs: NavLinkItem[] = [
    { to: '/tim-kiem', label: 'Khám phá', icon: Compass },
    { to: '/ban-do', label: 'Bản đồ', icon: MapPin },
    { to: '/da-luu', label: 'Đã lưu', icon: Heart, badge: savedRoomIds.length },
    { to: '/roommate', label: 'Ở ghép', icon: Users },
    { to: currentUser ? '/toi' : '/dang-nhap', label: 'Tôi', icon: UserIcon },
  ];

  // Owner tabs
  const ownerTabs: NavLinkItem[] = [
    { to: '/chu-tro', label: 'Tổng quan', icon: LayoutDashboard },
    { to: '/chu-tro/toa-nha', label: 'Tòa nhà', icon: Building2 },
    { to: '/chu-tro/tin-nhan', label: 'Tin nhắn', icon: MessageSquare, badge: unreadMessages },
    { to: '/chu-tro/thong-bao', label: 'Thông báo', icon: Bell, badge: unreadNotifs },
    { to: '/chu-tro/toi', label: 'Tôi', icon: UserIcon },
  ];

  // Admin tabs
  const adminTabs: NavLinkItem[] = [
    { to: '/admin', label: 'Kiểm duyệt', icon: ShieldCheck, badge: unreadNotifs },
    { to: '/admin/nguoi-dung', label: 'Người dùng', icon: Users },
    { to: '/admin/thong-ke', label: 'Thống kê', icon: BarChart3 },
    { to: '/debug', label: 'Debug QA', icon: Code },
  ];

  const currentTabs =
    currentUser?.role === 'owner' ? ownerTabs : currentUser?.role === 'admin' ? adminTabs : userTabs;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-lg">
      <div className="grid grid-cols-5 h-16 max-w-lg mx-auto">
        {currentTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = location.pathname === tab.to;
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={`flex flex-col items-center justify-center gap-1 transition-colors relative ${
                isActive ? 'text-[#006d37]' : 'text-gray-500 hover:text-gray-900'
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
              <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute bottom-1 w-1 h-1 bg-[#006d37] rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
