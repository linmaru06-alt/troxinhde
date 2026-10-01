import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAppStore } from '../store/useAppStore';
import { Message } from '../types';
import { getMessages, sendMessage as sendMessageApi, markConversationAsRead } from '../lib/api/messages';

export interface UseRealtimeChatReturn {
  messages: Message[];
  isLoading: boolean;
  isReconnecting: boolean;
  sendMessage: (content: string) => Promise<void>;
  retryMessage: (failedMessage: Message) => Promise<void>;
  isOtherOnline: boolean;
  lastSeenText: string;
}

export function useRealtimeChat(conversationId?: string): UseRealtimeChatReturn {
  const { currentUser, showToast } = useAppStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  // Lưu trữ conversationId hiện tại vào ref để tránh stale closure trong realtime callback
  const activeConversationIdRef = useRef<string | undefined>(conversationId);
  useEffect(() => {
    activeConversationIdRef.current = conversationId;
  }, [conversationId]);

  // 1. Tải lịch sử tin nhắn thật từ Supabase / Local Storage khi mở conversation & đánh dấu đã đọc
  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    getMessages(conversationId)
      .then((data) => {
        if (isMounted) {
          setMessages(data || []);
          // Đánh dấu toàn bộ tin nhắn trong hội thoại là đã đọc
          if (currentUser?.id) {
            markConversationAsRead(conversationId, currentUser.id).then();
            // Cập nhật ngay trạng thái đã đọc cho các thông báo liên quan trong store
            useAppStore.setState((state) => ({
              notifications: (state.notifications || []).map((n) =>
                (n.ctaUrl && n.ctaUrl.includes(`/tin-nhan/${conversationId}`))
                  ? { ...n, read: true }
                  : n
              ),
            }));
          }
        }
      })
      .catch((err) => {
        console.warn('[useRealtimeChat] Lỗi tải tin nhắn:', err);
        if (isMounted) {
          setMessages([]);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [conversationId, currentUser?.id, showToast]);

  // 1.1 Tự động đồng bộ tin nhắn khi ứng dụng thức dậy từ chế độ ngủ (Resume Auto-Sync)
  useEffect(() => {
    if (!conversationId) return;

    const handleResume = () => {
      getMessages(conversationId)
        .then((latest) => {
          if (latest && latest.length > 0) {
            setMessages((prev) => {
              const existingIds = new Set(prev.map((m) => m.id));
              const sendingMsgs = prev.filter((m) => m.status === 'sending');
              const newIncoming = latest.filter((m) => !existingIds.has(m.id));
              if (newIncoming.length === 0) return prev;
              const merged = [...prev.filter((m) => m.status !== 'sending'), ...newIncoming, ...sendingMsgs];
              return merged.sort(
                (a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
              );
            });
          }
        })
        .catch(() => {});
    };

    window.addEventListener('troxinh:resume-sync', handleResume);
    return () => {
      window.removeEventListener('troxinh:resume-sync', handleResume);
    };
  }, [conversationId]);

  // 2. Lắng nghe tin nhắn mới qua Supabase Realtime Channel
  useEffect(() => {
    if (!conversationId || !isSupabaseConfigured) return;

    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: any) => {
          const newRow = payload.new;
          if (!newRow) return;

          // Chỉ nhận tin nhắn thuộc đúng conversation đang mở
          if (newRow.conversation_id !== activeConversationIdRef.current) return;

          const incomingMsg: Message = {
            id: newRow.id,
            conversation_id: newRow.conversation_id,
            sender_id: newRow.sender_id,
            content: newRow.content,
            is_read: Boolean(newRow.is_read),
            created_at: newRow.created_at || new Date().toISOString(),
            status: 'sent',
          };

          setMessages((prev) => {
            // Tránh trùng lặp nếu optimistic message đã được render trước đó
            const exists = prev.some(
              (m) =>
                m.id === incomingMsg.id ||
                (m.status === 'sending' &&
                  m.content === incomingMsg.content &&
                  m.sender_id === incomingMsg.sender_id)
            );

            if (exists) {
              return prev.map((m) =>
                m.content === incomingMsg.content &&
                m.sender_id === incomingMsg.sender_id &&
                m.status === 'sending'
                  ? incomingMsg
                  : m
              );
            }

            return [...prev, incomingMsg];
          });

          // Nếu tin nhắn do đối phương gửi và mình đang mở hội thoại này, tự động đánh dấu đã đọc
          if (currentUser?.id && incomingMsg.sender_id !== currentUser.id) {
            markConversationAsRead(conversationId, currentUser.id).then();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: any) => {
          const updatedRow = payload.new;
          if (!updatedRow) return;

          setMessages((prev) =>
            prev.map((m) =>
              m.id === updatedRow.id
                ? {
                    ...m,
                    is_read: Boolean(updatedRow.is_read),
                    content: updatedRow.content,
                  }
                : m
            )
          );
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setIsReconnecting(false);
        } else if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR') {
          setIsReconnecting(true);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  // 2.1 Lắng nghe tin nhắn mới tức thì đa tab & nội bộ qua BroadcastChannel & CustomEvent
  useEffect(() => {
    if (!conversationId) return;

    const handleIncomingSync = (payload: any) => {
      if (!payload || payload.type !== 'NEW_MESSAGE') return;
      if (payload.conversationId !== activeConversationIdRef.current) return;

      const incomingMsg: Message = payload.message || {
        id: `msg_sync_${Date.now()}`,
        conversation_id: payload.conversationId,
        sender_id: payload.senderId,
        content: payload.content,
        is_read: false,
        created_at: new Date().toISOString(),
        status: 'sent',
      };

      setMessages((prev) => {
        const exists = prev.some(
          (m) =>
            m.id === incomingMsg.id ||
            (m.status === 'sending' &&
              m.content === incomingMsg.content &&
              m.sender_id === incomingMsg.sender_id)
        );

        if (exists) {
          return prev.map((m) =>
            m.content === incomingMsg.content &&
            m.sender_id === incomingMsg.sender_id &&
            m.status === 'sending'
              ? incomingMsg
              : m
          );
        }

        return [...prev, incomingMsg];
      });

      // Nếu tin nhắn do đối phương gửi và mình đang mở hội thoại này, tự động đánh dấu đã đọc
      if (currentUser?.id && incomingMsg.sender_id !== currentUser.id) {
        markConversationAsRead(conversationId, currentUser.id).then();
      }
    };

    const handleCustomEvent = (e: Event) => {
      const ce = e as CustomEvent;
      if (ce.detail) {
        handleIncomingSync(ce.detail);
      }
    };

    window.addEventListener('troxinh:internal-message-sent', handleCustomEvent);

    let bc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        bc = new BroadcastChannel('troxinh_chat_sync');
        bc.onmessage = (event) => {
          handleIncomingSync(event.data);
        };
      } catch {}
    }

    return () => {
      window.removeEventListener('troxinh:internal-message-sent', handleCustomEvent);
      if (bc) {
        bc.close();
      }
    };
  }, [conversationId, currentUser?.id]);

  // 3. Quản lý trạng thái trực tuyến (Presence)
  useEffect(() => {
    if (!isSupabaseConfigured || !currentUser?.id) return;

    const presenceChannel = supabase.channel('online-users');

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        const activeIds = new Set<string>();
        Object.values(state).forEach((presences: any) => {
          presences.forEach((p: any) => {
            if (p.user_id) activeIds.add(p.user_id);
          });
        });
        setOnlineUserIds(activeIds);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && currentUser?.id) {
          await presenceChannel.track({
            user_id: currentUser.id,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(presenceChannel);
    };
  }, [currentUser?.id]);

  // 4. Hàm gửi tin nhắn với Optimistic Update và xử lý lỗi
  const sendMessage = useCallback(
    async (content: string) => {
      const cleanContent = content.trim();
      if (!conversationId || !cleanContent || !currentUser?.id) return;

      const tempId = `temp-${Date.now()}`;
      const tempMessage: Message = {
        id: tempId,
        conversation_id: conversationId,
        sender_id: currentUser.id,
        content: cleanContent,
        created_at: new Date().toISOString(),
        status: 'sending',
        sender: {
          id: currentUser.id,
          full_name: currentUser.name,
          name: currentUser.name,
          avatar_url: currentUser.avatarUrl,
        },
      };

      // Optimistic update vào giao diện ngay lập tức
      setMessages((prev) => [...prev, tempMessage]);

      try {
        const savedMessage = await sendMessageApi(
          conversationId,
          currentUser.id,
          cleanContent,
          currentUser.name
        );

        // Cập nhật trạng thái thành 'sent' và giữ sender_id đồng bộ với currentUser
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? {
                  ...savedMessage,
                  sender_id: currentUser.id,
                  status: 'sent',
                  sender: tempMessage.sender,
                }
              : m
          )
        );
      } catch (err: any) {
        console.warn('[useRealtimeChat] Lỗi khi gửi tin nhắn lên cloud, lưu local:', err);

        // Vẫn giữ tin nhắn ở trạng thái sent local để không làm gián đoạn trải nghiệm người dùng
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId ? { ...m, id: `msg_local_${Date.now()}`, status: 'sent' } : m
          )
        );
        throw err;
      }
    },
    [conversationId, currentUser]
  );

  // 5. Thử gửi lại tin nhắn lỗi
  const retryMessage = useCallback(
    async (failedMessage: Message) => {
      if (!conversationId || !currentUser?.id) return;

      // Đặt lại trạng thái sending
      setMessages((prev) =>
        prev.map((m) => (m.id === failedMessage.id ? { ...m, status: 'sending' } : m))
      );

      try {
        const saved = await sendMessageApi(
          conversationId,
          currentUser.id,
          failedMessage.content,
          currentUser.name,
          failedMessage.id
        );

        setMessages((prev) =>
          prev.map((m) => (m.id === failedMessage.id ? { ...saved, status: 'sent' } : m))
        );
      } catch (err: any) {
        setMessages((prev) =>
          prev.map((m) => (m.id === failedMessage.id ? { ...m, status: 'failed' } : m))
        );
        showToast('Gửi lại thất bại', 'Kiểm tra kết nối và thử lại sau.', 'error');
      }
    },
    [conversationId, currentUser, showToast]
  );

  const isOtherOnline = onlineUserIds.size > 0;
  const lastSeenText = isOtherOnline ? 'Đang trực tuyến' : 'Hoạt động gần đây';

  return {
    messages,
    isLoading,
    isReconnecting,
    sendMessage,
    retryMessage,
    isOtherOnline,
    lastSeenText,
  };
}
