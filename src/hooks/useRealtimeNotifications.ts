import { useEffect, useMemo, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAppStore } from '../store/useAppStore';
import { NotificationItem } from '../types';
import { resolveUserIdToUuid, isSameUserId } from '../lib/api/messages';

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

  const unreadCount = useMemo(() => {
    return (storeNotifications || []).filter((n) => !n.read).length;
  }, [storeNotifications]);

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

  return {
    notifications: storeNotifications,
    unreadCount,
    markAsRead: markNotificationRead,
    markAllAsRead: markAllNotificationsRead,
    refetchNotifications: fetchInitialNotifications,
  };
}
