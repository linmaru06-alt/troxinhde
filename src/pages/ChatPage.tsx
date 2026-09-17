import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { useRealtimeChat } from '../hooks/useRealtimeChat';
import { getConversations } from '../lib/api/messages';
import { Conversation } from '../types';
import { Button } from '../components/ui/Button';
import {
  MessageSquare,
  Send,
  ArrowLeft,
  Home,
  CheckCheck,
  Clock,
  Phone,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export const ChatPage: React.FC = () => {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();
  const { currentUser, showToast } = useAppStore();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isConvLoading, setIsConvLoading] = useState<boolean>(true);
  const [activeConversationId, setActiveConversationId] = useState<string>(conversationId || '');
  const [inputText, setInputText] = useState<string>('');
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Theo dõi viewport chiều cao cho bàn phím ảo trên di động
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;

    const updateHeight = () => {
      if (window.visualViewport) {
        setViewportHeight(window.visualViewport.height);
      }
    };

    window.visualViewport.addEventListener('resize', updateHeight);
    window.visualViewport.addEventListener('scroll', updateHeight);
    updateHeight();

    return () => {
      window.visualViewport?.removeEventListener('resize', updateHeight);
      window.visualViewport?.removeEventListener('scroll', updateHeight);
    };
  }, []);

  // 1. Tải danh sách conversations thật từ Supabase
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
          const firstId = conversationId || data[0].id;
          setActiveConversationId(firstId);
        }
      })
      .catch((err) => {
        console.error('[ChatPage] Lỗi tải conversations:', err);
        if (isMounted) {
          showToast('Lỗi tải danh sách hội thoại', 'Vui lòng tải lại trang.', 'error');
        }
      })
      .finally(() => {
        if (isMounted) setIsConvLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [currentUser?.id, conversationId, showToast]);

  // Đồng bộ activeConversationId từ URL param
  useEffect(() => {
    if (conversationId) {
      setActiveConversationId(conversationId);
    }
  }, [conversationId]);

  // 2. Kết nối Hook Supabase Realtime Chat theo activeConversationId
  const {
    messages: chatMessages,
    isLoading: isMessagesLoading,
    isReconnecting,
    sendMessage: realtimeSendMessage,
    retryMessage,
    isOtherOnline,
    lastSeenText,
  } = useRealtimeChat(activeConversationId);

  // Cuộn xuống tin nhắn mới nhất
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages.length]);

  const activeConversation =
    conversations.find((c) => c.id === activeConversationId) || conversations[0];

  const isP1Me = activeConversation?.participant_1 === currentUser?.id;
  const otherParticipant = isP1Me ? activeConversation?.p2 : activeConversation?.p1;
  const otherName = otherParticipant?.full_name || otherParticipant?.name || 'Người dùng Trọ Xinh';
  const otherAvatar = otherParticipant?.avatar_url || '/images/user-avatar.jpg';
  const otherPhone = otherParticipant?.phone;

  const quickReplies = [
    'Phòng này còn trống không ạ?',
    'Chiều nay mình có thể qua xem phòng được không?',
    'Cho mình hỏi giá điện nước đã bao gồm chưa ạ?',
  ];

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = inputText.trim();
    if (!content || !activeConversationId) return;

    setInputText('');
    await realtimeSendMessage(content);

    // Cập nhật preview tin nhắn cuối trong danh sách conversations
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
    await realtimeSendMessage(text);
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversationId
          ? { ...c, last_message: text, last_message_at: new Date().toISOString() }
          : c
      )
    );
  };

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
    navigate(`/tin-nhan/${id}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-2 sm:py-4">
      <div
        className="bg-white rounded-3xl border border-gray-200 shadow-md flex overflow-hidden"
        style={{
          height: viewportHeight
            ? `${Math.max(320, viewportHeight - 110)}px`
            : 'calc(100dvh - 7.5rem)',
        }}
      >
        {/* Cột trái: Danh sách cuộc trò chuyện thật từ Supabase */}
        <aside
          className={`w-full md:w-80 border-r border-gray-200 flex flex-col shrink-0 ${
            conversationId ? 'hidden md:flex' : 'flex'
          }`}
        >
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-[#006d37]" />
              Hộp Thư Tin Nhắn
            </h2>
            {isReconnecting && (
              <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full animate-pulse font-medium">
                Đang kết nối lại...
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {isConvLoading ? (
              <div className="p-8 text-center text-gray-400 space-y-2">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#006d37]" />
                <p className="text-xs">Đang tải cuộc trò chuyện...</p>
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-gray-400 space-y-2">
                <MessageSquare className="w-8 h-8 mx-auto text-gray-300" />
                <p className="text-xs font-semibold">Chưa có tin nhắn nào</p>
                <p className="text-[11px] text-gray-400">
                  Hãy bấm "Nhắn tin" trên trang chi tiết phòng để bắt đầu trò chuyện.
                </p>
              </div>
            ) : (
              conversations.map((c) => {
                const isMe = c.participant_1 === currentUser?.id;
                const other = isMe ? c.p2 : c.p1;
                const name = other?.full_name || other?.name || 'Chủ trọ';
                const avatar = other?.avatar_url || '/images/user-avatar.jpg';
                const isActive = c.id === activeConversationId;

                return (
                  <div
                    key={c.id}
                    onClick={() => handleSelectConversation(c.id)}
                    className={`p-4 flex items-start gap-3 cursor-pointer transition tap-bounce ${
                      isActive ? 'bg-emerald-50/70 border-l-4 border-[#006d37]' : 'hover:bg-gray-50'
                    }`}
                  >
                    <img
                      src={avatar}
                      alt={name}
                      className="w-10 h-10 rounded-full object-cover shrink-0 ring-2 ring-gray-100"
                    />
                    <div className="flex-1 overflow-hidden space-y-0.5">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-gray-900 truncate">{name}</h4>
                        {c.last_message_at && (
                          <span className="text-[10px] text-gray-400">
                            {new Date(c.last_message_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        )}
                      </div>
                      {(c.rooms?.name || c.rooms?.title) && (
                        <p className="text-[10px] text-[#006d37] font-semibold truncate flex items-center gap-1">
                          <Home className="w-3 h-3 shrink-0" /> {c.rooms.name || c.rooms.title}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 truncate leading-snug">
                        {c.last_message || 'Bắt đầu cuộc trò chuyện...'}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Cột phải: Vùng trò chuyện chi tiết */}
        <main className={`flex-1 flex flex-col bg-gray-50/50 ${!conversationId && 'hidden md:flex'}`}>
          {activeConversation ? (
            <>
              {/* Header của đoạn chat */}
              <div className="p-3 bg-white border-b border-gray-200 flex items-center justify-between z-10 shadow-2xs">
                <div className="flex items-center gap-3">
                  <Link
                    to="/tin-nhan"
                    className="md:hidden p-2 rounded-xl hover:bg-gray-100 text-gray-600 tap-bounce min-h-[40px] min-w-[40px] flex items-center justify-center"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Link>
                  <div className="relative">
                    <img
                      src={otherAvatar}
                      alt={otherName}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <span
                      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                        isOtherOnline ? 'bg-emerald-500' : 'bg-gray-400'
                      }`}
                    />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 leading-none">{otherName}</h3>
                    <span className="text-[10px] text-gray-500 mt-0.5 block">{lastSeenText}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Số điện thoại: chỉ hiển thị khi có số điện thoại thật của chủ trọ */}
                  {otherPhone ? (
                    <a
                      href={`tel:${otherPhone}`}
                      className="p-2 text-[#006d37] hover:bg-emerald-50 rounded-xl transition tap-bounce min-h-[40px] min-w-[40px] flex items-center justify-center"
                      title={`Gọi điện thoại: ${otherPhone}`}
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                  ) : (
                    <div
                      className="text-[11px] text-gray-500 bg-gray-100 px-3 py-1.5 rounded-xl flex items-center gap-1 cursor-default font-medium"
                      title="Chủ nhà ưu tiên liên hệ qua ứng dụng"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
                      <span>Liên hệ qua tin nhắn</span>
                    </div>
                  )}

                  {activeConversation.room_id && (activeConversation.rooms?.name || activeConversation.rooms?.title) && (
                    <Link
                      to={`/phong/${activeConversation.room_id}`}
                      className="hidden sm:flex items-center gap-1 text-xs text-[#006d37] font-bold bg-emerald-50 px-3 py-1.5 rounded-xl hover:bg-emerald-100 transition"
                    >
                      <Home className="w-3.5 h-3.5" /> Xem phòng
                    </Link>
                  )}
                </div>
              </div>

              {/* Vùng hiển thị tin nhắn (Scroll Area) */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {isMessagesLoading ? (
                  <div className="py-12 text-center text-gray-400 space-y-2">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#006d37]" />
                    <p className="text-xs">Đang tải tin nhắn...</p>
                  </div>
                ) : chatMessages.length === 0 ? (
                  <div className="py-12 text-center text-gray-400 space-y-2">
                    <p className="text-xs">Chưa có tin nhắn nào trong cuộc trò chuyện này.</p>
                    <p className="text-[11px]">Hãy gửi tin nhắn đầu tiên để kết nối!</p>
                  </div>
                ) : (
                  chatMessages.map((msg) => {
                    const isMe = msg.sender_id === currentUser?.id;
                    return (
                      <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 text-xs shadow-2xs leading-relaxed ${
                            isMe
                              ? 'bg-[#00a854] text-white rounded-br-none'
                              : 'bg-white text-gray-900 border border-gray-100 rounded-bl-none'
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                          <div
                            className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                              isMe ? 'text-emerald-100' : 'text-gray-400'
                            }`}
                          >
                            <span>
                              {new Date(msg.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            {isMe &&
                              (msg.status === 'sending' ? (
                                <Clock className="w-2.5 h-2.5 animate-spin" />
                              ) : msg.status === 'failed' ? (
                                <button
                                  type="button"
                                  onClick={() => retryMessage(msg)}
                                  className="inline-flex items-center gap-0.5 text-rose-200 hover:text-white font-bold cursor-pointer"
                                  title="Thử gửi lại tin nhắn này"
                                >
                                  <AlertCircle className="w-3 h-3 text-rose-300" />
                                  <span className="underline">Thử lại</span>
                                </button>
                              ) : (
                                <CheckCheck className="w-3 h-3 text-emerald-200" />
                              ))}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Gợi ý tin nhắn phản hồi nhanh */}
              <div className="px-3 py-2 bg-white border-t border-gray-100 flex items-center gap-2 overflow-x-auto no-scrollbar">
                <span className="text-[10px] font-bold text-gray-400 uppercase shrink-0">Gợi ý:</span>
                {quickReplies.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => handleQuickReply(r)}
                    className="text-xs px-3 py-1.5 min-h-[32px] bg-gray-100 hover:bg-emerald-50 hover:text-[#006d37] rounded-xl transition shrink-0 font-medium tap-bounce cursor-pointer"
                  >
                    {r}
                  </button>
                ))}
              </div>

              {/* Hộp nhập tin nhắn */}
              <form
                onSubmit={handleSend}
                className="p-2.5 bg-white border-t border-gray-200 flex items-center gap-2"
                style={{ paddingBottom: 'max(0.625rem, env(safe-area-inset-bottom, 0px))' }}
              >
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Nhập tin nhắn của bạn..."
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 min-h-[44px] text-base sm:text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#006d37] touch-manipulation"
                />
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={!inputText.trim()}
                  aria-label="Gửi tin nhắn"
                  className="shrink-0 min-h-[44px] min-w-[44px] rounded-2xl cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center p-8 text-gray-400">
              <div className="space-y-2 max-w-xs">
                <MessageSquare className="w-12 h-12 mx-auto text-gray-300" />
                <p className="text-sm font-semibold text-gray-700">Chưa chọn cuộc trò chuyện nào</p>
                <p className="text-xs text-gray-400">
                  Chọn một cuộc trò chuyện từ danh sách bên trái hoặc nhắn tin từ trang chi tiết phòng.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

