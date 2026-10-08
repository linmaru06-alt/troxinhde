import { useEffect, useMemo, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAppStore } from '../store/useAppStore';
import { NotificationItem } from '../types';
import { resolveUserIdToUuid, isSameUserId } from '../lib/api/messages';
import { deduplicateChatNotifications } from '../utils/formatters';

/**
 * Âm thanh chuông báo tin nhắn/thông báo tinh tế qua Web Audio API (Zero dependencies, 0kb bundle)
 */
function playNotificationSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    // Nốt thứ nhất (E5 - 659.25Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.08, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.15);

    // Nốt thứ hai (A5 - 880Hz) - âm sắc trong trẻo chuẩn messaging
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.08);
    gain2.gain.setValueAtTime(0.08, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.35);
  } catch {}
}

export function useRealtimeNotifications() {
  const {
    notifications: storeNotifications,
    currentUser,
    markNotificationRead,
    markAllNotificationsRead,
    showToast,
  } = useAppStore();

  const cleanStoreNotifications = useMemo(() => {
    return deduplicateChatNotifications(storeNotifications || []);
  }, [storeNotifications]);

  const unreadCount = useMemo(() => {
    return cleanStoreNotifications.filter((n) => !n.read).length;
  }, [cleanStoreNotifications]);

  const fetchInitialNotifications = useCallback(async () => {
    if (!currentUser?.id || !isSupabaseConfigured) return;
    try {
      const cleanUserId = await resolveUserIdToUuid(currentUser.id);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', cleanUserId || currentUser.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        useAppStore.setState(() => {
          const cloudNotifs: NotificationItem[] = data.map((n) => ({
            id: n.id,
            userId: n.user_id,
            title: n.title,
            body: n.body || n.content || '',
            type: n.type || 'system',
            read: n.is_read || false,
            ctaUrl: n.cta_url || n.action_link,
            ctaLabel: n.cta_label || 'Xem ngay',
            priority: n.priority || 'normal',
            createdAt: n.created_at,
          }));
          return { notifications: cloudNotifs };
        });
      }
    } catch (err) {
      console.warn('Lỗi tải thông báo ban đầu:', err);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (!currentUser?.id || !isSupabaseConfigured) return;

    let isMounted = true;
    let channel: any = null;

    const subscribeChannel = async () => {
      const cleanUserId = await resolveUserIdToUuid(currentUser.id);
      if (!isMounted) return;

      channel = supabase
        .channel(`user-notifications-${cleanUserId || currentUser.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: cleanUserId ? `user_id=eq.${cleanUserId}` : undefined,
          },
          (payload: any) => {
            const newRow = payload.new;
            if (!newRow) return;

            // Kiểm tra bảo mật đúng người nhận
            if (!isSameUserId(newRow.user_id, currentUser.id)) return;

            const notif: NotificationItem = {
              id: newRow.id || `notif_${Date.now()}`,
              userId: newRow.user_id || currentUser.id,
              title: newRow.title || 'Thông báo mới',
              body: newRow.body || newRow.content || '',
              type: newRow.type || 'system',
              read: false,
              ctaUrl: newRow.cta_url || newRow.action_link,
              ctaLabel: newRow.cta_label || 'Xem ngay',
              priority: newRow.priority || 'normal',
              createdAt: newRow.created_at || new Date().toISOString(),
            };

            // Thêm thông báo mới vào store để thanh điều hướng và trang thông báo cập nhật ngay lập tức
            useAppStore.setState((state) => {
              const exists = (state.notifications || []).some((n) => n.id === notif.id);
              if (exists) return state;
              return {
                notifications: [notif, ...(state.notifications || [])],
              };
            });

            // Nếu là tin nhắn chat: Kiểm tra xem người dùng có đang mở chính cuộc trò chuyện này không
            const isChatMessage = notif.type === 'chat_message';
            const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
            const isViewingSameChat =
              isChatMessage &&
              notif.ctaUrl &&
              currentPath.startsWith(notif.ctaUrl);

            // Chỉ hiển thị Toast và phát âm thanh khi người dùng đang ở trang khác
            if (!isViewingSameChat) {
              playNotificationSound();
              showToast(
                notif.title,
                notif.body,
                notif.type === 'approval' || notif.type === 'owner_approved' ? 'success' : 'info'
              );
            }
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'conversations',
          },
          (payload: any) => {
            const updatedConv = payload.new;
            if (!updatedConv) return;

            // Nếu cuộc hội thoại liên quan đến người dùng hiện tại -> Phát event cho ChatPage tự động cập nhật
            if (
              isSameUserId(updatedConv.participant_1, currentUser.id) ||
              isSameUserId(updatedConv.participant_2, currentUser.id)
            ) {
              window.dispatchEvent(
                new CustomEvent('troxinh:conversation-updated', { detail: updatedConv })
              );
            }
          }
        )
        .subscribe();
    };

    fetchInitialNotifications();
    subscribeChannel();

    // Cơ chế Bù Đắp Tin Nhắn Khi Tỉnh Giấc (Resume Auto-Sync)
    const handleVisibilityOrOnline = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        fetchInitialNotifications();
        window.dispatchEvent(new CustomEvent('troxinh:resume-sync'));
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityOrOnline);
    window.addEventListener('online', handleVisibilityOrOnline);

    return () => {
      isMounted = false;
      window.removeEventListener('visibilitychange', handleVisibilityOrOnline);
      window.removeEventListener('online', handleVisibilityOrOnline);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [currentUser?.id, fetchInitialNotifications, showToast]);

  // Lắng nghe tin nhắn mới 2 chiều qua BroadcastChannel & CustomEvent để phát chuông và hiển thị thông báo
  useEffect(() => {
    if (!currentUser?.id) return;

    const handleSyncNotification = (payload: any) => {
      if (!payload || payload.type !== 'NEW_MESSAGE') return;

      // Không tự thông báo tin nhắn do chính mình gửi đi
      if (payload.senderId && isSameUserId(payload.senderId, currentUser.id)) return;

      // Kiểm tra nếu có receiverId rõ ràng thì chỉ thông báo cho đúng người nhận
      if (payload.receiverId && !isSameUserId(payload.receiverId, currentUser.id)) {
        return;
      }

      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      const isViewingChat = currentPath.includes(`/tin-nhan/${payload.conversationId}`);

      const notifItem: NotificationItem = {
        id: `notif_msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        userId: currentUser.id,
        title: `Tin nhắn từ ${payload.senderName || 'Người dùng'} 💬`,
        body: payload.content || '',
        type: 'chat_message',
        read: isViewingChat,
        ctaUrl: `/tin-nhan/${payload.conversationId}`,
        ctaLabel: 'Trả lời ngay',
        priority: 'high',
        createdAt: new Date().toISOString(),
      };

      // Đưa thông báo vào Store (cập nhật thông báo cũ của cuộc trò chuyện nếu chưa đọc)
      useAppStore.setState((state) => {
        const prev = state.notifications || [];
        const existingIdx = prev.findIndex(
          (n) => (n.type === 'chat_message' || n.type === 'message') && n.ctaUrl === notifItem.ctaUrl && !n.read
        );
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = {
            ...updated[existingIdx],
            title: notifItem.title,
            body: notifItem.body,
            createdAt: notifItem.createdAt,
            read: isViewingChat,
          };
          return { notifications: updated };
        }
        return {
          notifications: [notifItem, ...prev.filter((n) => n.id !== notifItem.id)],
        };
      });

      // Nếu đang không mở cuộc trò chuyện này: Phát âm thanh chuông + Hiện Toast thông báo nổi
      if (!isViewingChat) {
        playNotificationSound();
        showToast(
          notifItem.title,
          notifItem.body.length > 80 ? notifItem.body.slice(0, 80) + '...' : notifItem.body,
          'info'
        );
      }

      // Kích hoạt cập nhật danh sách cuộc trò chuyện ở thanh bên ChatPage
      window.dispatchEvent(
        new CustomEvent('troxinh:conversation-updated', {
          detail: {
            id: payload.conversationId,
            last_message: payload.content,
            last_message_at: new Date().toISOString(),
          },
        })
      );
    };

    const handleCustomMsg = (e: Event) => {
      const ce = e as CustomEvent;
      if (ce.detail) {
        handleSyncNotification(ce.detail);
      }
    };

    window.addEventListener('troxinh:internal-message-sent', handleCustomMsg);

    let bc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        bc = new BroadcastChannel('troxinh_chat_sync');
        bc.onmessage = (event) => {
          handleSyncNotification(event.data);
        };
      } catch {}
    }

    return () => {
      window.removeEventListener('troxinh:internal-message-sent', handleCustomMsg);
      if (bc) {
        bc.close();
      }
    };
  }, [currentUser?.id, showToast]);

  return {
    notifications: storeNotifications,
    unreadCount,
    markAsRead: markNotificationRead,
    markAllAsRead: markAllNotificationsRead,
    refetchNotifications: fetchInitialNotifications,
  };
}
