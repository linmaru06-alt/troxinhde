import { useEffect, useMemo } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAppStore } from '../store/useAppStore';
import { NotificationItem } from '../types';
import { resolveUserIdToUuid, isSameUserId } from '../lib/api/messages';

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

  useEffect(() => {
    if (!currentUser?.id || !isSupabaseConfigured) return;

    let isMounted = true;
    let channel: any = null;
    const cleanUserIdPromise = resolveUserIdToUuid(currentUser.id);

    const fetchInitialNotifications = async () => {
      try {
        const cleanUserId = await cleanUserIdPromise;
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', cleanUserId || currentUser.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (!error && data && isMounted) {
          useAppStore.setState((state) => {
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
    };

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

            // Hiển thị Toast thông báo tương tác
            showToast(
              notif.title,
              notif.body,
              notif.type === 'approval' || notif.type === 'owner_approved' ? 'success' : 'info'
            );
          }
        )
        .subscribe();
    };

    fetchInitialNotifications();
    subscribeChannel();

    return () => {
      isMounted = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [currentUser?.id, showToast]);

  return {
    notifications: storeNotifications,
    unreadCount,
    markAsRead: markNotificationRead,
    markAllAsRead: markAllNotificationsRead,
  };
}
