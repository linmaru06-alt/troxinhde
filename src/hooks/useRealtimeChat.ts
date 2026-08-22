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
    const currentThreadMsgs = storeMessages.filter((m) => m.threadId === threadId);
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
          filter: `thread_id=eq.${threadId}`,
        },
        (payload: any) => {
          const newRow = payload.new;
          if (!newRow) return;

          const incomingMsg: Message = {
            id: newRow.id || `msg_${Date.now()}`,
            threadId: newRow.thread_id || threadId,
            senderId: newRow.sender_id,
            senderName: newRow.sender_name || 'Người dùng',
            senderAvatar: newRow.sender_avatar || '/images/user-avatar.jpg',
            text: newRow.text || newRow.content || '',
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

  // 3. Send Message with Optimistic UI & Supabase sync
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

      // Optimistic local update & store update
      setMessages((prev) => [...prev, tempMessage]);
      storeSendMessage(threadId, text.trim());

      if (isSupabaseConfigured) {
        try {
          const { error } = await supabase.from('messages').insert({
            thread_id: threadId,
            sender_id: currentUser.id,
            sender_name: currentUser.name,
            sender_avatar: currentUser.avatarUrl,
            text: text.trim(),
            created_at: new Date().toISOString(),
          });

          if (error) {
            setMessages((prev) => prev.filter((m) => m.id !== tempId));
            showToast('Gửi tin nhắn thất bại', 'Vui lòng thử lại sau', 'warning');
          } else {
            setMessages((prev) =>
              prev.map((m) => (m.id === tempId ? { ...m, status: 'sent' } : m))
            );
          }
        } catch {
          // Graceful fallback in offline mode
        }
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
