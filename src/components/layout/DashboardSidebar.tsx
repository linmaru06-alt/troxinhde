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
  Calendar,
  History,
  Activity,
  CreditCard,
  Crown,
  ShieldAlert,
  Zap,
  Receipt,
  Sparkles,
  FileText,
  Coins,
  Rocket,
  ChevronRight,
} from 'lucide-react';

import { deduplicateChatNotifications } from '../../utils/formatters';

interface NavLinkItem {
  to: string;
  label: string;
  icon: React.ElementType;
  badge?: number;
  badgeText?: string;
  isVip?: boolean;
}

interface NavSection {
  title?: string;
  items: NavLinkItem[];
}

export const DashboardSidebar: React.FC<{ role: 'owner' | 'admin' }> = ({ role }) => {
  const { logout, currentUser, wallet, notifications = [], ownerApplications = [], bookings = [] } = useAppStore();

  const cleanNotifs = deduplicateChatNotifications(notifications || []);
  const unreadNotifs = (cleanNotifs || []).filter((n) => !n?.read).length;
  const unreadMessages = (cleanNotifs || []).filter(
    (n) => !n?.read && (n?.type === 'chat_message' || n?.type === 'message')
  ).length;
  const pendingOwnerApps = (ownerApplications || []).filter((a) => a?.status === 'pending').length;
  const pendingBookings = (bookings || []).filter((b) => b?.status === 'Chờ chủ trọ xác nhận').length;

  const ownerSections: NavSection[] = [
    {
      title: 'VẬN HÀNH & PHÒNG ỐC',
      items: [
        { to: '/chu-tro', label: 'Tổng quan & Vận hành', icon: LayoutDashboard },
        { to: '/chu-tro/toa-nha', label: 'Tòa nhà & Biểu phí', icon: Building2 },
        { to: '/chu-tro/phong/tao-moi', label: 'Đăng phòng mới', icon: PlusCircle },
        { to: '/chu-tro/chot-so', label: 'Chốt điện nước', icon: Zap, badgeText: 'K23' },
        { to: '/chu-tro/hoa-don', label: 'Hóa đơn tiền phòng', icon: Receipt, badgeText: 'VietQR' },
        { to: '/chu-tro/hop-dong', label: 'Sổ khách & Hợp đồng', icon: FileText, badgeText: 'K23' },
        { to: '/chu-tro/lich-hen', label: 'Lịch hẹn xem phòng', icon: Calendar, badge: pendingBookings },
      ],
    },
    {
      title: 'TÀI CHÍNH & GÓI DỊCH VỤ',
      items: [
        {
          to: '/chu-tro/vi-xu',
          label: 'Ví Xu Trọ Xinh',
          icon: Coins,
          badgeText: `${wallet?.total_xu ?? 0} Xu`,
        },
        { to: '/chu-tro/quan-ly-goi-k23', label: 'Gói quản lý K23', icon: Crown, isVip: true },
        { to: '/chu-tro/goi-dich-vu', label: 'Bảng giá & Nâng cấp', icon: Sparkles },
        { to: '/chu-tro/day-tin', label: 'Đẩy tin VIP phòng', icon: Rocket },
        { to: '/demo-hoa-don', label: 'Demo 1 tháng K23', icon: Sparkles, badgeText: 'MẪU' },
      ],
    },
    {
      title: 'TƯƠNG TÁC & HỆ THỐNG',
      items: [
        { to: '/chu-tro/tin-nhan', label: 'Tin nhắn khách thuê', icon: MessageSquare, badge: unreadMessages },
        { to: '/chu-tro/thong-bao', label: 'Trung tâm thông báo', icon: Bell, badge: unreadNotifs },
        { to: '/chu-tro/toi', label: 'Hồ sơ chủ trọ', icon: User },
      ],
    },
  ];

  const adminSections: NavSection[] = [
    {
      title: 'ĐIỀU HÀNH & KIỂM DUYỆT',
      items: [
        { to: '/admin', label: 'Tổng quan điều hành', icon: LayoutDashboard },
        { to: '/admin/bao-cao', label: 'Báo cáo vi phạm', icon: ShieldAlert },
        { to: '/admin/kiem-duyet', label: 'Kiểm duyệt nội dung', icon: ShieldCheck },
        { to: '/admin/don-chu-tro', label: 'Đơn xin chủ trọ', icon: Building2, badge: pendingOwnerApps },
        { to: '/admin/nguoi-dung', label: 'Quản lý người dùng', icon: Users },
      ],
    },
    {
      title: 'HỆ THỐNG & TÀI CHÍNH',
      items: [
        { to: '/admin/lich-hen', label: 'Theo dõi lịch hẹn', icon: Calendar },
        { to: '/admin/tai-chinh', label: 'Tài chính & Doanh thu', icon: CreditCard },
        { to: '/admin/thong-ke', label: 'Báo cáo thống kê', icon: BarChart3 },
        { to: '/admin/nhat-ky', label: 'Nhật ký Audit Logs', icon: History },
        { to: '/admin/he-thong', label: 'Trạng thái hệ thống', icon: Activity },
      ],
    },
  ];

  const sections = role === 'owner' ? ownerSections : adminSections;

  return (
    <aside className="w-64 bg-white border-r border-gray-200 sticky top-16 h-[calc(100vh-4rem)] p-3.5 flex flex-col justify-between hidden md:flex shrink-0 z-20 overflow-y-auto scrollbar-thin">
      <div className="space-y-4">
        {/* User Mini Profile Card */}
        <div className="flex items-center gap-3 p-3 bg-gradient-to-br from-emerald-50/80 to-teal-50/50 border border-emerald-100 rounded-2xl">
          <img
            src={currentUser?.avatarUrl || '/images/user-avatar.jpg'}
            alt={currentUser?.name || 'Chủ trọ'}
            className="w-10 h-10 rounded-full object-cover ring-2 ring-[#006d37]/30 shadow-xs"
          />
          <div className="overflow-hidden flex-1">
            <h4 className="text-xs font-bold text-gray-900 truncate">{currentUser?.name || 'Chủ Trọ'}</h4>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span className="text-[10px] font-bold text-[#006d37] uppercase tracking-wider">
                {role === 'owner' ? 'Chủ Nhà Chuẩn' : 'Quản Trị Viên'}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Sections */}
        <nav className="space-y-4">
          {sections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-1">
              {section.title && (
                <div className="px-3 pb-1 text-[10px] font-black uppercase tracking-wider text-gray-400">
                  {section.title}
                </div>
              )}
              {section.items.map((link) => {
                const Icon = link.icon;
                return (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.to === '/chu-tro' || link.to === '/admin'}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all group ${
                        isActive
                          ? 'bg-[#006d37] text-white shadow-xs'
                          : 'text-gray-600 hover:text-[#006d37] hover:bg-emerald-50/60'
                      }`
                    }
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-105" />
                      <span className="truncate">{link.label}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-1">
                      {link.badgeText && (
                        <span className="px-1.5 py-0.5 text-[9px] font-black rounded-md bg-emerald-700/80 text-white uppercase tracking-wider shadow-xs">
                          {link.badgeText}
                        </span>
                      )}
                      {link.isVip && (
                        <span className="px-1.5 py-0.5 text-[9px] font-black rounded-md bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 uppercase tracking-wider shadow-xs">
                          VIP
                        </span>
                      )}
                      {link.badge !== undefined && link.badge > 0 && (
                        <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-rose-500 text-white min-w-4 text-center">
                          {link.badge}
                        </span>
                      )}
                    </div>
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* Bottom links */}
      <div className="space-y-1 pt-3 mt-4 border-t border-gray-100">
        <Link
          to="/"
          className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition"
        >
          <Home className="w-4 h-4" />
          <span>Về trang chủ</span>
        </Link>
        <button
          onClick={logout}
          className="flex items-center gap-2.5 w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-rose-600 hover:bg-rose-50 transition cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
};
