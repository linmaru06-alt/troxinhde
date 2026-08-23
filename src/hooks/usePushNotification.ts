import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAppStore } from '../store/useAppStore';

export function usePushNotification() {
  const { currentUser, showToast } = useAppStore();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [showPrompt, setShowPrompt] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
      if (Notification.permission === 'granted') {
        setIsSubscribed(true);
      } else if (Notification.permission === 'default' && currentUser) {
        // Show non-intrusive prompt after 10s if logged in and not decided
        const timer = setTimeout(() => setShowPrompt(true), 10000);
        return () => clearTimeout(timer);
      }
    }
  }, [currentUser]);

  const requestPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
      showToast('Thiết bị không hỗ trợ thông báo đẩy', '', 'info');
      return false;
    }

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      setShowPrompt(false);

      if (perm === 'granted') {
        const registration = await navigator.serviceWorker.ready;
        const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;

        let subscription: PushSubscription | null = null;
        if (vapidPublicKey) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: vapidPublicKey,
          });
        }

        // Save subscription to Supabase push_subscriptions table
        if (currentUser?.id && isSupabaseConfigured && subscription) {
          const json = subscription.toJSON();
          await supabase.from('push_subscriptions').upsert({
            user_id: currentUser.id,
            endpoint: subscription.endpoint,
            p256dh: json.keys?.p256dh || '',
            auth: json.keys?.auth || '',
          });
        }

        setIsSubscribed(true);
        showToast('🔔 Đã bật thông báo đẩy thành công!', 'Bạn sẽ nhận được tin nhắn và phòng mới tức thì.', 'success');
        return true;
      }
      return false;
    } catch (err) {
      console.warn('Could not subscribe to Web Push:', err);
      return false;
    }
  };

  return {
    permission,
    isSubscribed,
    showPrompt,
    setShowPrompt,
    requestPermission,
  };
}
