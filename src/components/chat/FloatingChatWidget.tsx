import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { useUIStore } from '../../store/useUIStore';
import { useRealtimeChat } from '../../hooks/useRealtimeChat';
import { getConversations } from '../../lib/api/messages';
import { Conversation } from '../../types';
import { AnimatePresence, motion } from 'framer-motion';
import {
  MessageSquare,
  Send,
  X,
  Minus,
  Maximize2,
  ChevronDown,
  Sparkles,
  CheckCheck,
  Loader2,
} from 'lucide-react';

const FALLBACK_CHAT_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv_demo_1',
    participant_1: 'user_owner_1',
    participant_2: 'user_renter_1',
    room_id: 'room_1',
    last_message: 'Em chào anh, phòng Studio P.305 chiều nay em qua xem được không ạ?',
    last_message_at: new Date(Date.now() - 10 * 60000).toISOString(),
    created_at: new Date(Date.now() - 3600000).toISOString(),
    unread_count_p1: 1,
    unread_count_p2: 0,
    p2: {
      id: 'user_renter_1',
      name: 'Nguyễn Thị Thùy Linh',
      full_name: 'Nguyễn Thị Thùy Linh',
      avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      phone: '0987654321',
      app_role: 'user',
    },
  },
  {
    id: 'conv_demo_2',
    participant_1: 'user_owner_1',
    participant_2: 'user_renter_2',
    room_id: 'room_2',
    last_message: 'Dạ anh cho em hỏi phòng có sẵn máy giặt và tủ lạnh chưa ạ?',
    last_message_at: new Date(Date.now() - 45 * 60000).toISOString(),
    created_at: new Date(Date.now() - 7200000).toISOString(),
    unread_count_p1: 0,
    unread_count_p2: 0,
    p2: {
      id: 'user_renter_2',
      name: 'Trần Văn Hoàng (ĐH Bách Khoa)',
      full_name: 'Trần Văn Hoàng (ĐH Bách Khoa)',
      avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      phone: '0912345678',
      app_role: 'user',
    },
  },
];

export const FloatingChatWidget: React.FC = () => {
  return null;
  const navigate = useNavigate();
  const { currentUser } = useAppStore();
  const {
    isFloatingChatOpen,
    isFloatingChatMinimized,
    floatingChatConversationId,
    openFloatingChat,
    closeFloatingChat,
    minimizeFloatingChat,
  } = useUIStore();

  const [conversations, setConversations] = useState<Conversation[]>(FALLBACK_CHAT_CONVERSATIONS);
  const [activeConvId, setActiveConvId] = useState<string>(
    floatingChatConversationId || FALLBACK_CHAT_CONVERSATIONS[0].id
  );
  const [inputText, setInputText] = useState<string>('');
  const [showConvList, setShowConvList] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync activeConvId when store updates
  useEffect(() => {
    if (floatingChatConversationId) {
      setActiveConvId(floatingChatConversationId);
    }
  }, [floatingChatConversationId]);

  // Fetch conversations
  useEffect(() => {
    if (!currentUser?.id) return;
    let isMounted = true;

    getConversations(currentUser.id)
      .then((data) => {
        if (!isMounted) return;
        if (data && data.length > 0) {
          setConversations(data);
          if (!activeConvId) {
            setActiveConvId(data[0].id);
          }
        } else {
          setConversations(FALLBACK_CHAT_CONVERSATIONS);
        }
      })
      .catch((err) => {
        console.warn('[FloatingChat] Error fetching conversations, use fallback:', err);
        if (isMounted) {
          setConversations(FALLBACK_CHAT_CONVERSATIONS);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [currentUser?.id, activeConvId]);

  // Realtime hook for active conversation
  const {
    messages,
    isLoading,
    sendMessage,
    isOtherOnline,
  } = useRealtimeChat(activeConvId || (conversations[0]?.id));

  // Scroll to bottom on message updates
  useEffect(() => {
    if (!isFloatingChatMinimized && isFloatingChatOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, isFloatingChatMinimized, isFloatingChatOpen]);

  if (!isFloatingChatOpen || !currentUser) {
    return null;
  }

  const activeConversation =
    conversations.find((c) => c.id === activeConvId) || conversations[0];

  const isP1Me = activeConversation?.participant_1 === currentUser.id;
  const otherParticipant = isP1Me ? activeConversation?.p2 : activeConversation?.p1;
  const otherName = otherParticipant?.full_name || otherParticipant?.name || 'Khách thuê Trọ Xinh';
  const otherAvatar = otherParticipant?.avatar_url || '/images/user-avatar.jpg';

  const quickReplies = [
    'Phòng này còn trống không ạ?',
    'Mình có thể qua xem phòng trực tiếp được không?',
    'Giá điện nước và dịch vụ tính thế nào ạ?',
  ];

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = inputText.trim();
    if (!content || !activeConvId) return;

    setInputText('');
    await sendMessage(content);
  };

  const handleQuickReply = async (text: string) => {
    if (!activeConvId) return;
    await sendMessage(text);
  };

  const handleOpenFullPage = () => {
    closeFloatingChat();
    navigate(activeConvId ? `/tin-nhan/${activeConvId}` : '/tin-nhan');
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end pointer-events-auto select-none font-sans">
      <AnimatePresence>
        {isFloatingChatMinimized ? (
          /* Minimized Bubble Pill (Facebook Messenger style) */
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            onClick={() => minimizeFloatingChat(false)}
            className="flex items-center gap-2 bg-[#006d37] hover:bg-emerald-700 text-white px-4 py-2.5 rounded-full shadow-2xl cursor-pointer border border-white/20 transition group"
          >
            <div className="relative">
              <img
                src={otherAvatar}
                alt={otherName}
                className="w-7 h-7 rounded-full object-cover ring-1 ring-white"
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-1 ring-white" />
            </div>
            <div className="text-left">
              <p className="text-xs font-bold leading-tight truncate max-w-[120px]">{otherName}</p>
              <p className="text-[10px] text-emerald-100/90 leading-none">Nhắn tin ngay</p>
            </div>
            <MessageSquare className="w-4 h-4 ml-1 text-emerald-200 group-hover:scale-110 transition-transform" />
          </motion.div>
        ) : (
          /* Full Docked Chat Window */
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.18 }}
            className="w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-300 flex flex-col overflow-hidden h-[480px]"
          >
            {/* 1. Messenger Header */}
            <div className="bg-[#006d37] text-white px-3.5 py-2.5 flex items-center justify-between shadow-xs">
              <div
                onClick={() => setShowConvList(!showConvList)}
                className="flex items-center gap-2.5 cursor-pointer hover:opacity-95 transition min-w-0"
              >
                <div className="relative shrink-0">
                  <img
                    src={otherAvatar}
                    alt={otherName}
                    className="w-8 h-8 rounded-full object-cover ring-2 ring-white/40"
                  />
                  <span
                    className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-1 ring-white ${
                      isOtherOnline ? 'bg-emerald-400' : 'bg-gray-300'
                    }`}
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <h4 className="text-xs font-bold truncate max-w-[130px] sm:max-w-[160px]">
                      {otherName}
                    </h4>
                    <ChevronDown className="w-3.5 h-3.5 text-emerald-200 shrink-0" />
                  </div>
                  <p className="text-[10px] text-emerald-100/80">
                    {isOtherOnline ? 'Đang hoạt động' : 'Khách quan tâm'}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1 text-white">
                <button
                  type="button"
                  onClick={() => minimizeFloatingChat(true)}
                  className="p-1 hover:bg-white/20 rounded-lg transition"
                  title="Thu nhỏ"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleOpenFullPage}
                  className="p-1 hover:bg-white/20 rounded-lg transition"
                  title="Mở toàn màn hình"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={closeFloatingChat}
                  className="p-1 hover:bg-rose-500 rounded-lg transition"
                  title="Đóng box chat"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 2. Conversations Dropdown (if toggled) */}
            {showConvList && (
              <div className="bg-gray-50 border-b border-gray-200 max-h-48 overflow-y-auto divide-y divide-gray-100 z-10">
                <div className="p-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Chọn cuộc trò chuyện
                </div>
                {conversations.map((c) => {
                  const p2 = c.participant_1 === currentUser.id ? c.p2 : c.p1;
                  const name = p2?.full_name || p2?.name || 'Người dùng';
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setActiveConvId(c.id);
                        setShowConvList(false);
                      }}
                      className={`w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-emerald-50/60 transition ${
                        c.id === activeConvId ? 'bg-emerald-50 font-bold text-[#006d37]' : 'text-gray-700'
                      }`}
                    >
                      <img
                        src={p2?.avatar_url || '/images/user-avatar.jpg'}
                        alt={name}
                        className="w-6 h-6 rounded-full object-cover"
                      />
                      <span className="text-xs truncate">{name}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* 3. Messages Body */}
            <div className="flex-1 p-3 overflow-y-auto space-y-2.5 bg-[#f0f2f5] text-xs">
              {isLoading ? (
                <div className="flex items-center justify-center h-full text-gray-400 gap-1.5">
                  <Loader2 className="w-4 h-4 animate-spin text-[#006d37]" />
                  <span>Đang tải tin nhắn...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-[#006d37] flex items-center justify-center mx-auto">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <p className="font-bold text-gray-800">Bắt đầu trò chuyện</p>
                  <p className="text-[11px] text-gray-500">
                    Gửi tin nhắn hoặc chọn các mẫu câu hỏi nhanh bên dưới.
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.sender_id === currentUser.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[78%] px-3 py-2 rounded-2xl text-xs leading-relaxed ${
                          isMe
                            ? 'bg-[#006d37] text-white rounded-br-xs shadow-2xs'
                            : 'bg-white text-gray-900 rounded-bl-xs border border-gray-200 shadow-2xs'
                        }`}
                      >
                        <p className="whitespace-pre-line">{msg.content}</p>
                      </div>
                      <div className="flex items-center gap-1 text-[9px] text-gray-400 mt-0.5 px-1">
                        <span>
                          {new Date(msg.created_at).toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {isMe && <CheckCheck className="w-3 h-3 text-[#006d37]" />}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* 4. Quick Replies Bar */}
            <div className="px-2.5 py-1.5 bg-white border-t border-gray-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              {quickReplies.map((qr, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleQuickReply(qr)}
                  className="shrink-0 text-[10px] bg-gray-100 hover:bg-emerald-50 hover:text-[#006d37] text-gray-700 px-2.5 py-1 rounded-full border border-gray-200 transition"
                >
                  {qr}
                </button>
              ))}
            </div>

            {/* 5. Message Input Bar */}
            <form onSubmit={handleSend} className="p-2.5 bg-white border-t border-gray-200 flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Nhập tin nhắn..."
                className="flex-1 bg-gray-100 border border-transparent rounded-full px-3.5 py-1.5 text-xs text-gray-900 focus:bg-white focus:ring-2 focus:ring-[#006d37]/50 focus:border-[#006d37] focus:outline-none"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="w-8 h-8 rounded-full bg-[#006d37] hover:bg-emerald-700 disabled:opacity-40 text-white flex items-center justify-center shrink-0 transition shadow-xs cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
