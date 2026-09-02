import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAppStore } from '../store/useAppStore';
import { Message } from '../types';

export interface UseRealtimeChatReturn {
  messages: Message[];
  sendMessage: (text: string) => Promise<void>;
  isOtherOnline: boolean;
  lastSeenText: string;
}

export function useRealtimeChat(threadId?: string): UseRealtimeChatReturn {
  const { messages: storeMessages, currentUser, sendMessage: storeSendMessage, showToast } = useAppStore();
  const [messages, setMessages] = useState<Message[]>([]);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  // Filter messages for current thread
  useEffect(() => {
    if (!threadId) {
      setMessages([]);
      return;
    }
    const currentThreadMsgs = (storeMessages || []).filter((m) => m.threadId === threadId);
    setMessages(currentThreadMsgs);
  }, [threadId, storeMessages]);

  // 1. Supabase Realtime Message Subscription
  useEffect(() => {
    if (!threadId || !isSupabaseConfigured) return;

    const channel = supabase
      .channel(`conversation:${threadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload: any) => {
          const newRow = payload.new;
          if (!newRow) return;

          const rowThreadId = newRow.conversation_id || newRow.thread_id;
          if (rowThreadId !== threadId) return;

          const incomingMsg: Message = {
            id: newRow.id || `msg_${Date.now()}`,
            threadId: rowThreadId,
            senderId: newRow.sender_id,
            senderName: newRow.sender_name || 'Người dùng',
            senderAvatar: newRow.sender_avatar || '/images/user-avatar.jpg',
            text: newRow.content || newRow.text || '',
            createdAt: newRow.created_at || new Date().toISOString(),
            status: 'sent',
          };

          setMessages((prev) => {
            // Avoid duplicate if optimistic temp already added
            if (prev.some((m) => m.id === incomingMsg.id || (m.text === incomingMsg.text && m.senderId === incomingMsg.senderId))) {
              return prev.map((m) => (m.text === incomingMsg.text && m.senderId === incomingMsg.senderId ? incomingMsg : m));
            }
            return [...prev, incomingMsg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [threadId]);

  // 2. Supabase Presence Channel (Online Status)
  useEffect(() => {
    if (!isSupabaseConfigured || !currentUser) {
      // Default to online in mock mode for great demo experience
      setOnlineUserIds(new Set(['user_1', 'user_owner_1', 'user_renter_1', 'admin_1']));
      return;
    }

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
  }, [currentUser]);

  // 3. Send Message with Schema (conversation_id & content), Optimistic UI & Error Retry
  const sendMessage = useCallback(
    async (text: string) => {
      if (!threadId || !text.trim() || !currentUser) return;

      const tempId = `temp-${Date.now()}`;
      const tempMessage: Message = {
        id: tempId,
        threadId,
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderAvatar: currentUser.avatarUrl,
        text: text.trim(),
        createdAt: new Date().toISOString(),
        status: 'sending',
      };

      // Optimistic local update
      setMessages((prev) => [...prev, tempMessage]);

      if (isSupabaseConfigured) {
        try {
          // Send with standard conversation_id & content schema
          let insertPayload: Record<string, any> = {
            conversation_id: threadId,
            sender_id: currentUser.id,
            content: text.trim(),
            created_at: new Date().toISOString(),
          };

          let { error, data } = await supabase.from('messages').insert(insertPayload).select().maybeSingle();

          // Fallback if legacy column schema
          if (error && (error.message?.includes('conversation_id') || error.message?.includes('content'))) {
            const fallbackRes = await supabase.from('messages').insert({
              thread_id: threadId,
              sender_id: currentUser.id,
              text: text.trim(),
              created_at: new Date().toISOString(),
            }).select().maybeSingle();
            error = fallbackRes.error;
            data = fallbackRes.data;
          }

          if (error) {
            // Mark message as failed with retry UI instead of silent dropping
            setMessages((prev) =>
              prev.map((m) => (m.id === tempId ? { ...m, status: 'failed' } : m))
            );
            showToast('Gửi tin nhắn thất bại', 'Vui lòng bấm Thử lại để gửi lại tin nhắn', 'warning');
          } else {
            // Confirm sent after Supabase verification
            setMessages((prev) =>
              prev.map((m) =>
                m.id === tempId
                  ? {
                      ...m,
                      id: data?.id || m.id,
                      status: 'sent',
                    }
                  : m
              )
            );
            storeSendMessage(threadId, text.trim());
          }
        } catch {
          setMessages((prev) =>
            prev.map((m) => (m.id === tempId ? { ...m, status: 'failed' } : m))
          );
          showToast('Lỗi kết nối', 'Không thể gửi tin nhắn. Hãy kiểm tra mạng và thử lại.', 'error');
        }
      } else {
        // Offline / dev mode: mark sent locally
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, status: 'sent' } : m))
        );
        storeSendMessage(threadId, text.trim());
      }
    },
    [threadId, currentUser, storeSendMessage, showToast]
  );

  const isOtherOnline = onlineUserIds.size > 0;
  const lastSeenText = isOtherOnline ? 'Đang trực tuyến' : 'Hoạt động 5 phút trước';

  return {
    messages,
    sendMessage,
    isOtherOnline,
    lastSeenText,
  };
}
