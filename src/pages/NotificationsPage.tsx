import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import {
  Bell,
  CheckCircle2,
  MessageSquare,
  AlertTriangle,
  XCircle,
  Sparkles,
  Calendar,
  CheckCheck,
} from 'lucide-react';

export const NotificationsPage: React.FC = () => {
  const { notifications, markNotificationRead, markAllNotificationsRead } = useAppStore();
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'system'>('all');

  const filteredNotifs = notifications.filter((n) => {
    if (activeTab === 'unread') return !n.read;
    if (activeTab === 'system') return n.type === 'system' || n.type === 'approval';
    return true;
  });

  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'approval':
        return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
      case 'message':
        return <MessageSquare className="w-5 h-5 text-blue-600" />;
      case 'booking':
        return <Calendar className="w-5 h-5 text-amber-600" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-rose-600" />;
      default:
        return <Bell className="w-5 h-5 text-[#006d37]" />;
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            <Bell className="w-6 h-6 text-[#006d37]" />
            Trung Tâm Thông Báo
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">Cập nhật trạng thái duyệt tin, tin nhắn và lịch hẹn</p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={markAllNotificationsRead}
          leftIcon={<CheckCheck className="w-4 h-4 text-[#006d37]" />}
        >
          Đọc tất cả
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2">
        {[
          { key: 'all', label: 'Tất cả thông báo' },
          { key: 'unread', label: 'Chưa đọc' },
          { key: 'system', label: 'Hệ thống & Kiểm duyệt' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key as any)}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition ${
              activeTab === t.key
                ? 'bg-[#006d37] text-white shadow-xs'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* List */}
      {filteredNotifs.length === 0 ? (
        <EmptyState
          icon="bell"
          title="Không có thông báo mới"
          description="Tất cả cập nhật về tin đăng và tin nhắn của bạn sẽ xuất hiện tại đây."
        />
      ) : (
        <div className="space-y-3">
          {filteredNotifs.map((item) => (
            <div
              key={item.id}
              onClick={() => markNotificationRead(item.id)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                item.read
                  ? 'bg-white border-gray-200 opacity-80'
                  : 'bg-emerald-50/50 border-emerald-200 shadow-xs'
              }`}
            >
              <div className="p-2 bg-white rounded-xl shadow-xs shrink-0 border border-gray-100">
                {getNotifIcon(item.type)}
              </div>

              <div className="flex-1 overflow-hidden space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs sm:text-sm font-bold text-gray-900 leading-tight">
                    {item.title}
                  </h4>
                  <span className="text-[11px] text-gray-400 shrink-0">
                    {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                  </span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">{item.body}</p>

                {item.actionLink && (
                  <Link
                    to={item.actionLink}
                    className="inline-block text-xs font-bold text-[#006d37] hover:underline pt-1"
                  >
                    Xem chi tiết →
                  </Link>
                )}
              </div>

              {!item.read && <div className="w-2.5 h-2.5 rounded-full bg-[#006d37] shrink-0 mt-1.5" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
