import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { useUIStore } from '../store/useUIStore';
import { DashboardSidebar } from '../components/layout/DashboardSidebar';
import { useRealtimeChat } from '../hooks/useRealtimeChat';
import { getConversations } from '../lib/api/messages';
import { Conversation } from '../types';
import { Button } from '../components/ui/Button';
import {
  MessageSquare,
  Send,
  CheckCheck,
  Phone,
  Loader2,
  Sparkles,
  ExternalLink,
  Users,
} from 'lucide-react';

export const OwnerChatPage: React.FC = () => {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const { currentUser } = useAppStore();
  const { openFloatingChat } = useUIStore();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isConvLoading, setIsConvLoading] = useState<boolean>(true);
  const [activeConversationId, setActiveConversationId] = useState<string>(conversationId || '');
  const [inputText, setInputText] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Tải danh sách conversations từ Supabase
  useEffect(() => {
    if (!currentUser?.id) {
      setIsConvLoading(false);
      return;
    }

    let isMounted = true;
    setIsConvLoading(true);

    getConversations(currentUser.id)
      .then((data) => {
        if (!isMounted) return;
        setConversations(data);
        if (!activeConversationId && data.length > 0) {
          setActiveConversationId(conversationId || data[0].id);
        }
      })
      .catch((err) => {
        console.warn('[OwnerChatPage] Lỗi tải conversations:', err);
      })
      .finally(() => {
        if (isMounted) setIsConvLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [currentUser?.id, conversationId]);

  // 2. Realtime Chat hook
  const {
    messages,
    isLoading: isMessagesLoading,
    sendMessage,
    isOtherOnline,
  } = useRealtimeChat(activeConversationId);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const activeConversation =
    conversations.find((c) => c.id === activeConversationId) || conversations[0];

  const isP1Me = activeConversation?.participant_1 === currentUser?.id;
  const otherParticipant = isP1Me ? activeConversation?.p2 : activeConversation?.p1;
  const otherName = otherParticipant?.full_name || otherParticipant?.name || 'Khách thuê Trọ Xinh';
  const otherAvatar = otherParticipant?.avatar_url || '/images/user-avatar.jpg';
  const otherPhone = otherParticipant?.phone;

  const quickReplies = [
    'Phòng này hiện vẫn còn trống bạn nhé!',
    'Bạn có thể qua xem phòng vào lúc mấy giờ hôm nay?',
    'Giá thuê đã bao gồm tiền phòng, điện 3.8k/số, nước 100k/người ạ.',
    'Bạn cần mình giữ phòng cọc trước không ạ?',
  ];

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = inputText.trim();
    if (!content || !activeConversationId) return;

    setInputText('');
    await sendMessage(content);

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversationId
          ? { ...c, last_message: content, last_message_at: new Date().toISOString() }
          : c
      )
    );
  };

  const handleQuickReply = async (text: string) => {
    if (!activeConversationId) return;
    await sendMessage(text);
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversationId
          ? { ...c, last_message: text, last_message_at: new Date().toISOString() }
          : c
      )
    );
  };

  return (
    <div className="flex bg-gray-50 min-h-[calc(100vh-4rem)]">
      {/* Sidebar giữ nguyên vẹn */}
      <DashboardSidebar role="owner" />

      <main className="flex-1 p-4 sm:p-6 max-w-6xl space-y-4 overflow-y-auto">
        {/* Breadcrumb & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <Link to="/chu-tro" className="hover:text-[#006d37]">Bảng điều khiển</Link>
              <span>/</span>
              <span className="font-bold text-gray-900">Tin nhắn khách thuê</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-950">
              Hộp Thư Tin Nhắn Khách Thuê
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => openFloatingChat(activeConversationId)}
              leftIcon={<ExternalLink className="w-3.5 h-3.5" />}
            >
              Mở Box Chat Thu Nhỏ FB
            </Button>
          </div>
        </div>

        {/* Chat Layout Container */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-md overflow-hidden grid grid-cols-1 md:grid-cols-12 h-[calc(100vh-14rem)] min-h-[500px]">
          {/* Left: Conversations List (4 cols) */}
          <div className="md:col-span-5 lg:col-span-4 border-r border-gray-200 flex flex-col h-full bg-gray-50/50">
            <div className="p-3.5 border-b border-gray-200 bg-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#006d37]" />
                <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Khách đang liên hệ ({conversations.length})
                </h3>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
              {isConvLoading ? (
                <div className="p-8 text-center text-gray-400 space-y-2">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#006d37]" />
                  <p className="text-xs">Đang tải danh sách hội thoại...</p>
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-8 text-center text-gray-400 space-y-2">
                  <MessageSquare className="w-8 h-8 mx-auto text-gray-300" />
                  <p className="text-xs font-bold text-gray-700">Chưa có tin nhắn</p>
                  <p className="text-[11px]">Khách thuê liên hệ từ trang phòng sẽ hiển thị tại đây.</p>
                </div>
              ) : (
                conversations.map((c) => {
                  const p2 = c.participant_1 === currentUser?.id ? c.p2 : c.p1;
                  const name = p2?.full_name || p2?.name || 'Khách thuê';
                  const isSelected = c.id === activeConversationId;
                  return (
                    <div
                      key={c.id}
                      onClick={() => setActiveConversationId(c.id)}
                      className={`p-3 flex items-center gap-3 transition cursor-pointer hover:bg-white ${
                        isSelected ? 'bg-emerald-50/80 border-l-4 border-[#006d37]' : ''
                      }`}
                    >
                      <div className="relative shrink-0">
                        <img
                          src={p2?.avatar_url || '/images/user-avatar.jpg'}
                          alt={name}
                          className="w-10 h-10 rounded-full object-cover ring-1 ring-gray-200"
                        />
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-gray-900 truncate">{name}</h4>
                          <span className="text-[10px] text-gray-400">
                            {c.last_message_at
                              ? new Date(c.last_message_at).toLocaleTimeString('vi-VN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : ''}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-500 truncate mt-0.5">
                          {c.last_message || 'Bấm để nhắn tin trực tiếp...'}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right: Message Window (8 cols) */}
          <div className="md:col-span-7 lg:col-span-8 flex flex-col h-full bg-white">
            {/* Chat Header */}
            <div className="p-3.5 border-b border-gray-200 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <img
                    src={otherAvatar}
                    alt={otherName}
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-[#006d37]/20"
                  />
                  <span
                    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ring-2 ring-white ${
                      isOtherOnline ? 'bg-emerald-500' : 'bg-gray-300'
                    }`}
                  />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">{otherName}</h3>
                  <p className="text-[11px] text-emerald-600 font-medium">
                    {isOtherOnline ? 'Đang trực tuyến' : 'Khách quan tâm phòng'}
                  </p>
                </div>
              </div>

              {otherPhone && (
                <a
                  href={`tel:${otherPhone}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-[#006d37] hover:bg-emerald-100 text-xs font-bold transition"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>{otherPhone}</span>
                </a>
              )}
            </div>

            {/* Chat Body */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#f8fafc]">
              {isMessagesLoading ? (
                <div className="flex items-center justify-center h-full text-gray-400 gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-[#006d37]" />
                  <span className="text-xs">Đang đồng bộ tin nhắn...</span>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-2 text-gray-400">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#006d37] flex items-center justify-center">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-bold text-gray-800">Chưa có tin nhắn trong hội thoại này</p>
                  <p className="text-xs text-gray-500 max-w-xs">
                    Hãy gửi lời chào hoặc giải đáp thắc mắc về phòng trọ cho khách thuê.
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.sender_id === currentUser?.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                          isMe
                            ? 'bg-[#006d37] text-white rounded-br-xs shadow-xs'
                            : 'bg-white text-gray-900 rounded-bl-xs border border-gray-200 shadow-xs'
                        }`}
                      >
                        <p className="whitespace-pre-line">{msg.content}</p>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-1 px-1">
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

            {/* Quick Replies */}
            <div className="px-3 py-2 bg-white border-t border-gray-100 flex items-center gap-2 overflow-x-auto no-scrollbar">
              <span className="text-[10px] font-bold text-gray-400 uppercase shrink-0">Gợi ý nhanh:</span>
              {quickReplies.map((qr, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleQuickReply(qr)}
                  className="shrink-0 text-xs bg-gray-100 hover:bg-emerald-50 hover:text-[#006d37] text-gray-700 px-3 py-1 rounded-full border border-gray-200 transition font-medium cursor-pointer"
                >
                  {qr}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <form onSubmit={handleSend} className="p-3 bg-white border-t border-gray-200 flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Nhập tin nhắn phản hồi khách thuê..."
                className="flex-1 bg-gray-100 border border-transparent rounded-full px-4 py-2.5 text-xs sm:text-sm text-gray-900 focus:bg-white focus:ring-2 focus:ring-[#006d37]/50 focus:border-[#006d37] focus:outline-none"
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="w-10 h-10 rounded-full bg-[#006d37] hover:bg-emerald-700 disabled:opacity-40 text-white flex items-center justify-center shrink-0 transition shadow-xs cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};
