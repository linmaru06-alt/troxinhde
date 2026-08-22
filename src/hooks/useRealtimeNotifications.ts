import { useState, useEffect, useMemo } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAppStore } from '../store/useAppStore';
import { NotificationItem } from '../types';

export function useRealtimeNotifications() {
  const {
    notifications: storeNotifications,
    currentUser,
    markNotificationRead,
    markAllNotificationsRead,
    showToast,
  } = useAppStore();

  const unreadCount = useMemo(() => {
    return storeNotifications.filter((n) => !n.read).length;
  }, [storeNotifications]);

  useEffect(() => {
    if (!currentUser?.id || !isSupabaseConfigured) return;

    const channel = supabase
      .channel('user-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUser.id}`,
        },
        (payload: any) => {
          const newRow = payload.new;
          if (!newRow) return;

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

          // Trigger interactive Toast notification
          showToast(notif.title, notif.body, notif.type === 'approval' || notif.type === 'owner_approved' ? 'success' : 'info');
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.id, showToast]);

  return {
    notifications: storeNotifications,
    unreadCount,
    markAsRead: markNotificationRead,
    markAllAsRead: markAllNotificationsRead,
  };
}
