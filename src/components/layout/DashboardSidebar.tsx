import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import {
  LayoutDashboard,
  Building2,
  PlusCircle,
  MessageSquare,
  Bell,
  User,
  ShieldCheck,
  Users,
  BarChart3,
  LogOut,
  Home,
  Crown,
} from 'lucide-react';

interface NavLinkItem {
  to: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

export const DashboardSidebar: React.FC<{ role: 'owner' | 'admin' }> = ({ role }) => {
  const { logout, currentUser, notifications, ownerApplications } = useAppStore();

  const unreadNotifs = notifications.filter((n) => !n.read).length;
  const unreadMessages = 0;
  const pendingOwnerApps = ownerApplications.filter((a) => a.status === 'pending').length;

  const ownerLinks: NavLinkItem[] = [
    { to: '/chu-tro', label: 'Tổng quan & Phòng', icon: LayoutDashboard },
    { to: '/chu-tro/toa-nha', label: 'Tòa nhà của tôi', icon: Building2 },
    { to: '/chu-tro/phong/tao-moi', label: 'Đăng phòng mới', icon: PlusCircle },
    { to: '/chu-tro/quan-ly-goi', label: 'Gói dịch vụ & Hóa đơn', icon: Crown },
    { to: '/chu-tro/tin-nhan', label: 'Tin nhắn khách thuê', icon: MessageSquare, badge: unreadMessages },
    { to: '/chu-tro/thong-bao', label: 'Trung tâm thông báo', icon: Bell, badge: unreadNotifs },
    { to: '/chu-tro/toi', label: 'Hồ sơ chủ trọ', icon: User },
  ];

  const adminLinks: NavLinkItem[] = [
    { to: '/admin', label: 'Kiểm duyệt tin đăng', icon: ShieldCheck },
    { to: '/admin/don-chu-tro', label: 'Đơn Chủ trọ', icon: Building2, badge: pendingOwnerApps },
    { to: '/admin/nguoi-dung', label: 'Quản lý người dùng', icon: Users },
    { to: '/admin/thong-ke', label: 'Báo cáo thống kê', icon: BarChart3 },
  ];

  const links = role === 'owner' ? ownerLinks : adminLinks;

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between hidden md:flex shrink-0">
      <div>
        {/* User Badge */}
        <div className="flex items-center gap-3 p-3 bg-emerald-50/70 rounded-2xl mb-6">
          <img
            src={currentUser?.avatarUrl}
            alt={currentUser?.name}
            className="w-10 h-10 rounded-full object-cover ring-2 ring-[#006d37]/40"
          />
          <div className="overflow-hidden">
            <h4 className="text-xs font-bold text-gray-900 truncate">{currentUser?.name}</h4>
            <span className="text-[10px] font-bold text-[#006d37] uppercase">
              {role === 'owner' ? 'Chủ Trọ Đối Tác' : 'Quản Trị Viên'}
            </span>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="space-y-1">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/chu-tro' || link.to === '/admin'}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-[#006d37] text-white shadow-xs'
                      : 'text-gray-600 hover:text-[#006d37] hover:bg-emerald-50/50'
                  }`
                }
              >
                <div className="flex items-center gap-2.5">
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </div>
                {link.badge !== undefined && link.badge > 0 && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-500 text-white">
                    {link.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Bottom links */}
      <div className="space-y-1 pt-4 border-t border-gray-100">
        <Link
          to="/"
          className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition"
        >
          <Home className="w-4 h-4" />
          <span>Về trang chủ</span>
        </Link>
        <button
          onClick={logout}
          className="flex items-center gap-2.5 w-full text-left px-3.5 py-2 rounded-xl text-xs font-medium text-rose-600 hover:bg-rose-50 transition"
        >
          <LogOut className="w-4 h-4" />
          <span>Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
};
