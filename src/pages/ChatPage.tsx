import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { useRealtimeChat } from '../hooks/useRealtimeChat';
import { Button } from '../components/ui/Button';
import { formatPrice } from '../components/ui/Cards';
import {
  MessageSquare,
  Send,
  ArrowLeft,
  Home,
  Check,
  CheckCheck,
  Clock,
  Sparkles,
  Phone,
  AlertCircle,
  RotateCcw,
} from 'lucide-react';

export const ChatPage: React.FC = () => {
  const { threadId } = useParams<{ threadId?: string }>();
  const { threads, currentUser } = useAppStore();

  const [activeThreadId, setActiveThreadId] = useState<string>(threadId || threads[0]?.id || '');
  const [inputText, setInputText] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Supabase Real-time Chat & Presence Hook
  const {
    messages: threadMessages,
    sendMessage: realtimeSendMessage,
    isOtherOnline,
    lastSeenText,
  } = useRealtimeChat(activeThreadId);

  useEffect(() => {
    if (threadId) {
      setActiveThreadId(threadId);
    }
  }, [threadId]);

  const activeThread = threads.find((t) => t.id === activeThreadId) || threads[0];
  const otherParticipant = activeThread?.participants.find((p) => p.id !== currentUser?.id) || activeThread?.participants[1];

  const quickReplies = [
    'Phòng này còn trống không ạ?',
    'Chiều nay mình có thể qua xem phòng được không?',
    'Cho mình hỏi giá điện nước đã bao gồm chưa ạ?',
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [threadMessages.length]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeThreadId) return;
    const textToSend = inputText;
    setInputText('');
    await realtimeSendMessage(textToSend);
  };

  const handleQuickReply = async (text: string) => {
    if (!activeThreadId) return;
    await realtimeSendMessage(text);
  };

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-2 sm:py-4">
      <div className="h-[calc(100dvh-7rem)] sm:h-[calc(100vh-8.5rem)] bg-white rounded-3xl border border-gray-200 shadow-md flex overflow-hidden">
        {/* Left: Threads List (Hide on mobile if viewing thread) */}
        <aside
          className={`w-full md:w-80 border-r border-gray-200 flex flex-col shrink-0 ${
            threadId ? 'hidden md:flex' : 'flex'
          }`}
        >
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-[#006d37]" />
              Hộp Thư Tin Nhắn
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {threads.map((t) => {
              const other = t.participants.find((p) => p.id !== currentUser?.id) || t.participants[1];
              const isActive = t.id === activeThreadId;
              return (
                <div
                  key={t.id}
                  onClick={() => setActiveThreadId(t.id)}
                  className={`p-4 flex items-start gap-3 cursor-pointer transition tap-bounce ${
                    isActive ? 'bg-emerald-50/70 border-l-4 border-[#006d37]' : 'hover:bg-gray-50'
                  }`}
                >
                  <img
                    src={other?.avatar}
                    alt={other?.name}
                    className="w-10 h-10 rounded-full object-cover shrink-0 ring-2 ring-gray-100"
                  />
                  <div className="flex-1 overflow-hidden space-y-0.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-gray-900 truncate">{other?.name}</h4>
                      <span className="text-[10px] text-gray-400">
                        {new Date(t.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {t.relatedRoomTitle && (
                      <p className="text-[10px] text-[#006d37] font-semibold truncate flex items-center gap-1">
                        <Home className="w-3 h-3" /> {t.relatedRoomTitle}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 truncate leading-snug">{t.lastMessage}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Right: Active Chat Area */}
        <main className={`flex-1 flex flex-col bg-gray-50/50 ${!threadId && 'hidden md:flex'}`}>
          {activeThread ? (
            <>
              {/* Header */}
              <div className="p-3 bg-white border-b border-gray-200 flex items-center justify-between z-10 shadow-2xs">
                <div className="flex items-center gap-3">
                  <Link to="/tin-nhan" className="md:hidden p-2 rounded-xl hover:bg-gray-100 text-gray-600 tap-bounce min-h-[40px] min-w-[40px] flex items-center justify-center">
                    <ArrowLeft className="w-5 h-5" />
                  </Link>
                  <div className="relative">
                    <img
                      src={otherParticipant?.avatar}
                      alt={otherParticipant?.name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <span
                      className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                        isOtherOnline ? 'bg-emerald-500' : 'bg-gray-400'
                      }`}
                    />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 leading-none">{otherParticipant?.name}</h3>
                    <span className="text-[10px] text-gray-500 mt-0.5 block">{lastSeenText}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <a
                    href="tel:0888110789"
                    className="p-2 text-[#006d37] hover:bg-emerald-50 rounded-xl transition tap-bounce min-h-[40px] min-w-[40px] flex items-center justify-center"
                    title="Gọi điện"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                  {activeThread.relatedRoomTitle && (
                    <Link
                      to={`/phong/${activeThread.relatedRoomId}`}
                      className="hidden sm:flex items-center gap-1 text-xs text-[#006d37] font-bold bg-emerald-50 px-3 py-1.5 rounded-xl hover:bg-emerald-100 transition"
                    >
                      <Home className="w-3.5 h-3.5" /> Xem phòng
                    </Link>
                  )}
                </div>
              </div>

              {/* Messages Scroll Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {threadMessages.map((msg) => {
                  const isMe = msg.senderId === currentUser?.id;
                  return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2.5 text-xs shadow-2xs leading-relaxed ${
                          isMe
                            ? 'bg-[#00a854] text-white rounded-br-none'
                            : 'bg-white text-gray-900 border border-gray-100 rounded-bl-none'
                        }`}
                      >
                        <p>{msg.text}</p>
                        <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${isMe ? 'text-emerald-100' : 'text-gray-400'}`}>
                          <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {isMe && (
                            msg.status === 'sending' ? (
                              <Clock className="w-2.5 h-2.5 animate-spin" />
                            ) : msg.status === 'failed' ? (
                              <button
                                onClick={() => realtimeSendMessage(msg.text)}
                                className="inline-flex items-center gap-0.5 text-rose-200 hover:text-white font-bold"
                                title="Thử gửi lại"
                              >
                                <AlertCircle className="w-3 h-3 text-rose-300" />
                                <span className="underline">Thử lại</span>
                              </button>
                            ) : (
                              <CheckCheck className="w-3 h-3 text-emerald-200" />
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Reply Chips */}
              <div className="px-3 py-2 bg-white border-t border-gray-100 flex items-center gap-2 overflow-x-auto no-scrollbar">
                <span className="text-[10px] font-bold text-gray-400 uppercase shrink-0">Gợi ý:</span>
                {quickReplies.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => handleQuickReply(r)}
                    className="text-xs px-3 py-1.5 min-h-[32px] bg-gray-100 hover:bg-emerald-50 hover:text-[#006d37] rounded-xl transition shrink-0 font-medium tap-bounce"
                  >
                    {r}
                  </button>
                ))}
              </div>

              {/* Message Input Box */}
              <form onSubmit={handleSend} className="p-2.5 bg-white border-t border-gray-200 flex items-center gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Nhập tin nhắn của bạn..."
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 min-h-[44px] text-base sm:text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#006d37] touch-manipulation"
                />
                <Button type="submit" variant="primary" size="md" className="shrink-0 min-h-[44px] min-w-[44px] rounded-2xl">
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-center p-8 text-gray-400">
              <p className="text-sm">Chọn một cuộc trò chuyện để bắt đầu nhắn tin</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
