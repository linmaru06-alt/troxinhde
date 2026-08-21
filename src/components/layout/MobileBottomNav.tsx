import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import {
  Compass,
  MapPin,
  Heart,
  Users,
  User as UserIcon,
  LayoutDashboard,
  Building2,
  MessageSquare,
  Bell,
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
  const { currentUser, notifications, threads } = useAppStore();
  const location = useLocation();

  const unreadNotifs = notifications.filter((n) => !n.read).length;
  const unreadMessages = threads.reduce((acc, t) => acc + (t.unreadCount || 0), 0);

  // Hidden on specific fullscreen auth pages if needed
  if (['/dang-nhap', '/dang-ky', '/quen-mat-khau', '/xac-thuc-otp'].includes(location.pathname)) {
    return null;
  }

  // Renter / Guest tabs
  const renterTabs: NavLinkItem[] = [
    { to: '/tim-kiem', label: 'Khám phá', icon: Compass },
    { to: '/ban-do', label: 'Bản đồ', icon: MapPin },
    { to: '/da-luu', label: 'Đã lưu', icon: Heart },
    { to: '/roommate', label: 'Cộng đồng', icon: Users },
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
    { to: '/admin', label: 'Kiểm duyệt', icon: ShieldCheck },
    { to: '/admin/nguoi-dung', label: 'Người dùng', icon: Users },
    { to: '/admin/thong-ke', label: 'Thống kê', icon: BarChart3 },
    { to: '/debug', label: 'Debug QA', icon: Code },
  ];

  const tabs =
    currentUser?.role === 'owner'
      ? ownerTabs
      : currentUser?.role === 'admin'
      ? adminTabs
      : renterTabs;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-gray-200 py-1.5 px-2 safe-area-pb">
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                `relative flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'text-[#006d37] font-bold scale-105'
                    : 'text-gray-500 font-medium hover:text-gray-900'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="relative">
                    <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.4]' : 'stroke-[1.8]'}`} />
                    {tab.badge !== undefined && tab.badge > 0 && (
                      <span className="absolute -top-1 -right-2 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {tab.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] mt-1 tracking-tight leading-none">{tab.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </div>
  );
};
