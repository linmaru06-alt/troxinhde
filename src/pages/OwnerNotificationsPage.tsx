import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useRealtimeNotifications } from '../hooks/useRealtimeNotifications';
import { DashboardSidebar } from '../components/layout/DashboardSidebar';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { NotificationItem } from '../types';
import {
  Bell,
  CheckCircle2,
  MessageSquare,
  AlertTriangle,
  XCircle,
  Sparkles,
  Calendar,
  CheckCheck,
  RefreshCw,
  Search,
  ChevronRight,
  Building2,
  X,
  Clock,
  ArrowRight,
} from 'lucide-react';

export const OwnerNotificationsPage: React.FC = () => {
  const { notifications, markAsRead, markAllAsRead, refetchNotifications } = useRealtimeNotifications();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'read' | 'approval' | 'booking'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNotif, setSelectedNotif] = useState<NotificationItem | null>(null);
  const navigate = useNavigate();

  const unreadCount = useMemo(() => notifications.filter((n) => !n.read).length, [notifications]);
  const readCount = useMemo(() => notifications.filter((n) => n.read).length, [notifications]);

  const filteredNotifs = useMemo(() => {
    return notifications.filter((n) => {
      // Tab filter
      if (activeTab === 'unread' && n.read) return false;
      if (activeTab === 'read' && !n.read) return false;
      if (activeTab === 'approval') {
        const isApprovalType =
          n.type === 'approval' ||
          n.type === 'owner_approved' ||
          n.type === 'room_approved' ||
          n.type === 'needs_info' ||
          n.type === 'supplement_required' ||
          n.type === 'rejected' ||
          n.type === 'owner_rejected';
        if (!isApprovalType) return false;
      }
      if (activeTab === 'booking') {
        const isBookingType = n.type === 'booking' || n.type === 'message' || n.type === 'chat_message';
        if (!isBookingType) return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = n.title?.toLowerCase().includes(q);
        const matchBody = n.body?.toLowerCase().includes(q);
        if (!matchTitle && !matchBody) return false;
      }

      return true;
    });
  }, [notifications, activeTab, searchQuery]);

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'approval':
      case 'owner_approved':
      case 'room_approved':
      case 'marketplace_approved':
        return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
      case 'needs_info':
      case 'supplement_required':
      case 'action_required':
        return <AlertTriangle className="w-5 h-5 text-amber-600" />;
      case 'message':
      case 'chat_message':
        return <MessageSquare className="w-5 h-5 text-blue-600" />;
      case 'booking':
        return <Calendar className="w-5 h-5 text-amber-600" />;
      case 'rejected':
      case 'owner_rejected':
      case 'marketplace_rejected':
        return <XCircle className="w-5 h-5 text-rose-600" />;
      default:
        return <Bell className="w-5 h-5 text-[#00a854]" />;
    }
  };

  const handleNotificationClick = (item: NotificationItem) => {
    markAsRead(item.id);
    setSelectedNotif(item);
  };

  return (
    <div className="flex bg-gray-50 min-h-[calc(100vh-4rem)]">
      <DashboardSidebar role="owner" />

      <main className="flex-1 p-4 sm:p-8 max-w-5xl space-y-6 overflow-y-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
          <div>
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <Link to="/chu-tro" className="hover:text-[#00a854]">Bảng điều khiển</Link>
              <span>/</span>
              <span className="font-bold text-gray-900">Trung tâm thông báo</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-950 tracking-tight flex items-center gap-2.5">
              <Bell className="w-7 h-7 text-[#00a854]" />
              Trung Tâm Thông Báo Chủ Trọ
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Lịch sử đầy đủ tất cả thông báo mới và cũ: kiểm duyệt tin, lịch hẹn xem phòng và tin nhắn khách thuê
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                setIsRefreshing(true);
                await refetchNotifications();
                setIsRefreshing(false);
              }}
              isLoading={isRefreshing}
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />}
            >
              Làm mới
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
              leftIcon={<CheckCheck className="w-4 h-4 text-[#00a854]" />}
            >
              Đọc tất cả ({unreadCount})
            </Button>
          </div>
        </div>

        {/* Filter Tabs & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            {[
              { key: 'all', label: `Tất cả (${notifications.length})` },
              { key: 'unread', label: `Chưa đọc (${unreadCount})` },
              { key: 'read', label: `Đã đọc (${readCount})` },
              { key: 'approval', label: 'Duyệt tin & Hồ sơ' },
              { key: 'booking', label: 'Lịch hẹn & Tin nhắn' },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key as any)}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition cursor-pointer whitespace-nowrap ${
                  activeTab === t.key
                    ? 'bg-[#00a854] text-white shadow-xs'
                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm thông báo..."
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-[#00a854]/20"
            />
          </div>
        </div>

        {/* Notifications List */}
        {filteredNotifs.length === 0 ? (
          <EmptyState
            icon="bell"
            title="Không tìm thấy thông báo phù hợp"
            description="Tất cả thông báo duyệt tin, lịch hẹn và tin nhắn sẽ được lưu giữ đầy đủ tại đây."
          />
        ) : (
          <div className="space-y-3">
            {filteredNotifs.map((item) => (
              <div
                key={item.id}
                onClick={() => handleNotificationClick(item)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 shadow-2xs ${
                  item.read
                    ? 'bg-white border-gray-200 hover:border-gray-300'
                    : 'bg-emerald-50/60 border-emerald-200 hover:border-emerald-300'
                }`}
              >
                <div className="p-2.5 bg-white rounded-xl shadow-2xs shrink-0 border border-gray-100 mt-0.5">
                  {getNotifIcon(item.type)}
                </div>

                <div className="flex-1 overflow-hidden space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className={`text-xs sm:text-sm leading-tight ${item.read ? 'font-bold text-gray-800' : 'font-black text-gray-950'}`}>
                      {item.title}
                    </h4>
                    <span className="text-[11px] text-gray-400 shrink-0 flex items-center gap-1 font-medium">
                      <Clock className="w-3 h-3" />
                      {new Date(item.createdAt).toLocaleDateString('vi-VN')} {new Date(item.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">{item.body}</p>

                  <div className="pt-1 flex items-center gap-3 text-xs font-bold text-[#006d37]">
                    <span>Bấm để xem chi tiết →</span>
                  </div>
                </div>

                {!item.read && <div className="w-2.5 h-2.5 rounded-full bg-[#00a854] shrink-0 mt-2" />}
              </div>
            ))}
          </div>
        )}

        {/* Modal Xem lại Chi tiết thông báo */}
        {selectedNotif && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4 animate-scaleUp">
              <div className="flex items-start justify-between pb-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-50 rounded-2xl border border-emerald-100 text-[#00a854]">
                    {getNotifIcon(selectedNotif.type)}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Thông báo hệ thống</span>
                    <h3 className="text-sm sm:text-base font-black text-gray-950 mt-0.5">
                      {selectedNotif.title}
                    </h3>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedNotif(null)}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="text-gray-400 text-[11px] flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Thời gian nhận: {new Date(selectedNotif.createdAt).toLocaleString('vi-VN')}</span>
                </div>

                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200/80 text-gray-800 leading-relaxed font-medium">
                  {selectedNotif.body}
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100 flex items-center justify-end gap-2">
                {(selectedNotif.actionLink || selectedNotif.ctaUrl || selectedNotif.type === 'owner_approved') && (
                  <button
                    type="button"
                    onClick={() => {
                      const link = selectedNotif.actionLink || selectedNotif.ctaUrl || (selectedNotif.type === 'owner_approved' ? '/chu-tro' : '/chu-tro');
                      setSelectedNotif(null);
                      navigate(link);
                    }}
                    className="px-4 py-2 bg-[#00a854] hover:bg-[#008f47] text-white rounded-xl text-xs font-black transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>{selectedNotif.ctaLabel || 'Truy cập ngay'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedNotif(null)}
                  className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
