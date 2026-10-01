import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAppStore } from '../store/useAppStore';

// Ghi nhớ trên trình duyệt lựa chọn với hộp hỏi bật thông báo (chỉ là tùy chọn giao diện;
// quyền thông báo thật do trình duyệt quản lý):
//   - Bấm "Bật thông báo": không hỏi lại.
//   - Bấm "Để sau" / đóng: hỏi lại đúng 1 lần sau 20 giây, sau đó không hỏi nữa.
const PUSH_PROMPT_STATE_KEY = 'troxinh_push_prompt_state';
const PUSH_PROMPT_MAX_SHOWS = 2;
const PUSH_PROMPT_FIRST_DELAY_MS = 10000;
const PUSH_PROMPT_RETRY_DELAY_MS = 20000;

type PushPromptState = { enabled: boolean; dismissCount: number };

function readPushPromptState(): PushPromptState {
  try {
    const raw = localStorage.getItem(PUSH_PROMPT_STATE_KEY);
    if (!raw) return { enabled: false, dismissCount: 0 };
    const parsed = JSON.parse(raw);
    return { enabled: Boolean(parsed.enabled), dismissCount: Number(parsed.dismissCount) || 0 };
  } catch {
    return { enabled: false, dismissCount: 0 };
  }
}

function writePushPromptState(state: PushPromptState) {
  try {
    localStorage.setItem(PUSH_PROMPT_STATE_KEY, JSON.stringify({ ...state, at: new Date().toISOString() }));
  } catch {
    // Trình duyệt chặn lưu trữ: chỉ áp dụng trong phiên hiện tại
  }
}

export function usePushNotification() {
  const { currentUser, showToast } = useAppStore();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [showPrompt, setShowPrompt] = useState<boolean>(false);
  const [promptState, setPromptState] = useState<PushPromptState>(readPushPromptState);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermission(Notification.permission);
      if (Notification.permission === 'granted') {
        setIsSubscribed(true);
      } else if (
        Notification.permission === 'default' &&
        currentUser &&
        !promptState.enabled &&
        promptState.dismissCount < PUSH_PROMPT_MAX_SHOWS
      ) {
        // Lần đầu hỏi sau 10 giây; nếu người dùng bấm "Để sau" thì hỏi lại 1 lần sau 20 giây
        const delay = promptState.dismissCount === 0 ? PUSH_PROMPT_FIRST_DELAY_MS : PUSH_PROMPT_RETRY_DELAY_MS;
        const timer = setTimeout(() => setShowPrompt(true), delay);
        return () => clearTimeout(timer);
      }
    }
  }, [currentUser, promptState]);

  const requestPermission = async () => {
    // Người dùng đã bấm bật: ẩn và không hỏi lại, kể cả khi thiết bị không hỗ trợ
    const nextState = { ...promptState, enabled: true };
    writePushPromptState(nextState);
    setPromptState(nextState);
    setShowPrompt(false);

    if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
      showToast('Thiết bị không hỗ trợ thông báo đẩy', '', 'info');
      return false;
    }

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm === 'denied') {
        showToast(
          'Thông báo đang bị chặn',
          'Bạn có thể bật lại bất cứ lúc nào trong phần cài đặt trang web của trình duyệt.',
          'info'
        );
        return false;
      }

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
      showToast('Chưa bật được thông báo', 'Trình duyệt chưa cho phép đăng ký thông báo. Vui lòng thử lại sau.', 'error');
      return false;
    }
  };

  // "Để sau" / đóng: ẩn; nếu mới là lần đầu thì effect phía trên hẹn hỏi lại sau 20 giây
  const dismissPrompt = () => {
    const nextState = { ...promptState, dismissCount: promptState.dismissCount + 1 };
    writePushPromptState(nextState);
    setPromptState(nextState);
    setShowPrompt(false);
  };

  // Lần hỏi cuối cùng (sau lần "Để sau" đầu tiên)
  const isLastPrompt = promptState.dismissCount >= PUSH_PROMPT_MAX_SHOWS - 1;

  return {
    permission,
    isSubscribed,
    showPrompt,
    setShowPrompt,
    dismissPrompt,
    isLastPrompt,
    requestPermission,
  };
}
