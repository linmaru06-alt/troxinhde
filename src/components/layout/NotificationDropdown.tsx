import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { NotificationItem } from '../../types';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  XCircle,
  Calendar,
  MessageSquare,
  Sparkles,
  ChevronRight,
  Clock,
  Building2,
  AlertTriangle,
  HelpCircle,
} from 'lucide-react';

import { deduplicateChatNotifications } from '../../utils/formatters';

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  align?: 'right' | 'left';
}

const getNotificationIcon = (type: NotificationItem['type']) => {
  switch (type) {
    case 'approval':
    case 'owner_approved':
    case 'room_approved':
    case 'marketplace_approved':
      return (
        <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-5 h-5" />
        </div>
      );
    case 'needs_info':
    case 'supplement_required':
    case 'action_required':
      return (
        <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
      );
    case 'rejected':
    case 'owner_rejected':
    case 'marketplace_rejected':
      return (
        <div className="w-9 h-9 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
          <XCircle className="w-5 h-5" />
        </div>
      );
    case 'booking':
      return (
        <div className="w-9 h-9 rounded-full bg-blue-100 text-[#1877F2] flex items-center justify-center shrink-0">
          <Calendar className="w-5 h-5" />
        </div>
      );
    case 'message':
    case 'chat_message':
      return (
        <div className="w-9 h-9 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center shrink-0">
          <MessageSquare className="w-5 h-5" />
        </div>
      );
    default:
      return (
        <div className="w-9 h-9 rounded-full bg-emerald-100 text-[#006d37] flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5" />
        </div>
      );
  }
};

const formatTimeAgo = (isoString?: string) => {
  if (!isoString) return 'Vừa xong';
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ngày trước`;
  return new Date(isoString).toLocaleDateString('vi-VN');
};

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  isOpen,
  onClose,
  align = 'right',
}) => {
  const navigate = useNavigate();
  const {
    notifications = [],
    markNotificationRead,
    markAllNotificationsRead,
    currentUser,
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');

  // Khử trùng lặp thông báo tin nhắn và lọc theo quyền
  const deduplicatedNotifs = deduplicateChatNotifications(notifications);
  const userNotifs = deduplicatedNotifs.filter((n) => {
    if (currentUser?.role === 'admin') {
      return n.userId === 'user_admin_1' || n.userId === 'admin' || !n.userId || n.userId === currentUser?.id;
    }
    if (currentUser?.role === 'owner') {
      return n.userId === 'user_owner_1' || n.userId === currentUser?.id || !n.userId;
    }
    return n.userId === currentUser?.id || n.userId === 'user_renter_1' || !n.userId;
  });

  const displayedNotifs = userNotifs.filter((n) => {
    if (activeTab === 'unread') return !n.read;
    return true;
  });

  const unreadCount = userNotifs.filter((n) => !n.read).length;

  const handleItemClick = (notif: NotificationItem) => {
    markNotificationRead(notif.id);
    onClose();
    if (notif.actionLink) {
      navigate(notif.actionLink);
    }
  };

  const handleMarkAllRead = (e: React.MouseEvent) => {
    e.stopPropagation();
    markAllNotificationsRead();
  };

  const fullNotifPage = currentUser?.role === 'owner' ? '/chu-tro/thong-bao' : '/thong-bao';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 8, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.96 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className={`absolute ${
            align === 'right' ? 'right-0' : 'left-0'
          } mt-2 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-gray-200 py-3 z-50 text-gray-900 overflow-hidden`}
        >
          {/* Header */}
          <div className="px-4 pb-2 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-gray-900">Thông báo</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black">
                  {unreadCount} mới
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-xs font-semibold text-[#006d37] hover:text-emerald-700 flex items-center gap-1 transition cursor-pointer"
                title="Đánh dấu tất cả là đã đọc"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Đã đọc</span>
              </button>
            )}
          </div>

          {/* Facebook Style Tabs: Tất cả / Chưa đọc */}
          <div className="px-4 py-2 flex items-center gap-2 border-b border-gray-100 bg-gray-50/50">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-emerald-100 text-[#006d37]'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              Tất cả ({userNotifs.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('unread')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                activeTab === 'unread'
                  ? 'bg-emerald-100 text-[#006d37]'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              Chưa đọc ({unreadCount})
            </button>
          </div>

          {/* Notifications List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-gray-50">
            {displayedNotifs.length === 0 ? (
              <div className="py-10 px-4 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto">
                  <Bell className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-gray-700">Không có thông báo nào</p>
                <p className="text-[11px] text-gray-400">
                  {activeTab === 'unread'
                    ? 'Bạn đã đọc tất cả thông báo!'
                    : 'Các thông báo duyệt phòng, tin nhắn sẽ hiển thị tại đây.'}
                </p>
              </div>
            ) : (
              displayedNotifs.slice(0, 10).map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleItemClick(item)}
                  className={`px-4 py-3 hover:bg-gray-50 transition cursor-pointer flex items-start gap-3 relative ${
                    !item.read ? 'bg-emerald-50/40' : ''
                  }`}
                >
                  {/* Category Icon */}
                  {getNotificationIcon(item.type)}

                  {/* Body Info */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs leading-snug ${!item.read ? 'font-bold text-gray-900' : 'text-gray-700'}`}>
                      {item.title}
                    </p>
                    {item.body && (
                      <p className="text-[11px] text-gray-500 line-clamp-2 mt-0.5 leading-relaxed">
                        {item.body}
                      </p>
                    )}

                    {/* NÚT HÀNH ĐỘNG ĐẶC BIỆT: DUYỆT CHỦ TRỌ / CẦN BỔ SUNG */}
                    {(item.type === 'owner_approved' ||
                      item.actionType === 'switch_to_owner' ||
                      (item.actionLink === '/chu-tro' && item.title.toLowerCase().includes('chủ trọ'))) && (
                      <div className="mt-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            markNotificationRead(item.id);
                            onClose();
                            navigate('/chu-tro');
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#00a854] hover:bg-[#008f47] text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
                        >
                          <Building2 className="w-3.5 h-3.5" />
                          <span>Chuyển sang giao diện Chủ trọ</span>
                        </button>
                      </div>
                    )}

                    {(item.type === 'needs_info' ||
                      item.type === 'supplement_required' ||
                      item.actionType === 'update_owner_application' ||
                      item.title.toLowerCase().includes('cần bổ sung thông tin')) && (
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            markNotificationRead(item.id);
                            onClose();
                            navigate(item.actionLink || '/dang-ky-chu-tro');
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#00a854] hover:bg-[#008f47] text-white text-xs font-bold transition shadow-xs cursor-pointer active:scale-95"
                        >
                          <span>Cập nhật ngay</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            markNotificationRead(item.id);
                          }}
                          className="text-[11px] text-gray-400 hover:text-gray-600 font-semibold px-2 py-1 transition cursor-pointer hover:underline"
                        >
                          Để sau
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mt-1">
                      <Clock className="w-3 h-3" />
                      <span>{formatTimeAgo(item.createdAt)}</span>
                    </div>
                  </div>

                  {/* Unread blue dot */}
                  {!item.read && (
                    <span className="w-2.5 h-2.5 rounded-full bg-[#1877F2] shrink-0 mt-1.5" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer: Xem tất cả thông báo */}
          <div className="px-4 pt-2 border-t border-gray-100 text-center">
            <Link
              to={fullNotifPage}
              onClick={onClose}
              className="inline-flex items-center gap-1 text-xs font-bold text-[#006d37] hover:underline py-1"
            >
              <span>Xem tất cả thông báo</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
