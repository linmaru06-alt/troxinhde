import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAppStore } from '../store/useAppStore';
import { Message } from '../types';
import { getMessages, sendMessage as sendMessageApi } from '../lib/api/messages';

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

  // 1. Tải lịch sử tin nhắn thật từ Supabase khi mở conversation
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
          setMessages(data);
        }
      })
      .catch((err) => {
        console.error('[useRealtimeChat] Lỗi tải tin nhắn:', err);
        if (isMounted) {
          showToast('Không thể tải lịch sử tin nhắn', 'Vui lòng kiểm tra kết nối mạng.', 'error');
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
  }, [conversationId, showToast]);

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
        const savedMessage = await sendMessageApi(conversationId, currentUser.id, cleanContent);

        // Cập nhật trạng thái thành 'sent' và gắn ID thật từ Supabase
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? {
                  ...savedMessage,
                  status: 'sent',
                  sender: tempMessage.sender,
                }
              : m
          )
        );
      } catch (err: any) {
        console.error('[useRealtimeChat] Lỗi khi gửi tin nhắn:', err);

        // Đánh dấu tin nhắn bị lỗi, hiển thị nút Thử lại
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, status: 'failed' } : m))
        );

        showToast(
          'Không thể gửi tin nhắn',
          err?.message || 'Vui lòng bấm Thử lại để gửi lại tin nhắn.',
          'warning'
        );
      }
    },
    [conversationId, currentUser, showToast]
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
          failedMessage.content
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
