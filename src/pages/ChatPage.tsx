import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { useRealtimeChat } from '../hooks/useRealtimeChat';
import { getConversations, isSameUserId, KNOWN_USER_NAMES } from '../lib/api/messages';
import { getMarketplaceItemById } from '../lib/api/marketplace';
import { formatCurrency } from '../components/ui/Cards';
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
  AlertTriangle,
  ShieldOff,
  ShieldCheck,
  ShieldAlert,
  ChevronRight,
  ShoppingBag,
  Tag,
} from 'lucide-react';
import { ReportModal } from '../components/modals/ReportModal';

const ITEM_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m7.5 4.27 9 5.15'/%3E%3Cpath d='M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z'/%3E%3Cpath d='m3.3 7 8.7 5 8.7-5'/%3E%3Cpath d='M12 22V12'/%3E%3C/svg%3E";

export const ChatPage: React.FC = () => {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();
  const { currentUser, showToast, blockedUserIds, blockUser, unblockUser, marketplaceItems } = useAppStore();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isConvLoading, setIsConvLoading] = useState<boolean>(true);
  const [activeConversationId, setActiveConversationId] = useState<string>(conversationId || '');
  const [inputText, setInputText] = useState<string>('');
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
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

  // Cuộn xuống tin nhắn mới nhất (chỉ cuộn trong container, tránh bị lướt cả trang web)
  useEffect(() => {
    const container = messagesEndRef.current?.parentElement;
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }
  }, [chatMessages.length]);

  const activeConversation =
    conversations.find((c) => c.id === activeConversationId) || conversations[0];

  const isP1Me = isSameUserId(activeConversation?.participant_1, currentUser?.id);

  const otherParticipant = isP1Me
    ? (activeConversation?.p2 || activeConversation?.p1)
    : (activeConversation?.p1 || activeConversation?.p2);

  const otherId = isP1Me
    ? activeConversation?.participant_2
    : activeConversation?.participant_1;

  const isBlocked = Boolean(otherId && blockedUserIds.includes(otherId));

  const knownOther = otherId ? KNOWN_USER_NAMES[otherId] : null;

  const otherName =
    activeConversation?.other_name ||
    otherParticipant?.full_name ||
    otherParticipant?.name ||
    knownOther?.name ||
    (isP1Me ? 'Chủ trọ / Người đăng' : 'Khách liên hệ');
  const otherAvatar =
    activeConversation?.other_avatar ||
    otherParticipant?.avatar_url ||
    knownOther?.avatar ||
    '/images/user-avatar.jpg';
  const otherPhone = otherParticipant?.phone;

  // 3. Xác định món đồ gắn kèm trong cuộc hội thoại (Chợ đồ cũ)
  const [remoteItem, setRemoteItem] = useState<any>(null);

  // Tìm tin nhắn ngữ cảnh món đồ gần nhất
  const latestContextMsg = chatMessages
    .slice()
    .reverse()
    .find((m) => m.type === 'item_context' || Boolean(m.item_id));

  let parsedContext: {
    itemId?: string;
    title?: string;
    price?: number;
    image?: string;
    status?: string;
  } | null = null;

  if (latestContextMsg?.content) {
    try {
      const p = JSON.parse(latestContextMsg.content);
      if (p && typeof p === 'object') parsedContext = p;
    } catch {}
  }

  const attachedItemId =
    activeConversation?.last_item_id ||
    latestContextMsg?.item_id ||
    parsedContext?.itemId ||
    null;

  const storeItem = attachedItemId
    ? marketplaceItems.find((m) => m.id === attachedItemId)
    : null;

  useEffect(() => {
    if (!attachedItemId) {
      setRemoteItem(null);
      return;
    }
    // Nếu trong store chưa có, fetch thêm từ Supabase API
    if (!storeItem) {
      getMarketplaceItemById(attachedItemId)
        .then((res) => {
          if (res) setRemoteItem(res);
        })
        .catch(() => {});
    }
  }, [attachedItemId, storeItem]);

  // Thông tin hiển thị thẻ ghim món đồ
  const pinnedTitle =
    storeItem?.name ||
    storeItem?.title ||
    remoteItem?.title ||
    parsedContext?.title ||
    'Món đồ thanh lý';

  const rawPrice =
    storeItem?.price ??
    remoteItem?.price ??
    parsedContext?.price;

  const isFree =
    storeItem?.pricingType === 'Miễn phí' ||
    remoteItem?.is_free ||
    rawPrice === 0;

  const pinnedPriceDisplay = isFree
    ? 'Tặng 0đ'
    : rawPrice !== undefined && rawPrice !== null && rawPrice > 0
      ? formatCurrency(rawPrice)
      : 'Tặng 0đ';

  const pinnedImage =
    storeItem?.images?.[0] ||
    remoteItem?.image_urls?.[0] ||
    parsedContext?.image ||
    '';

  // Xác định nhãn trạng thái (Đang bán / Đã bán / Đã ẩn)
  const isItemSold =
    storeItem?.status === 'Đã bán' ||
    remoteItem?.status === 'sold' ||
    remoteItem?.status === 'Đã bán' ||
    parsedContext?.status === 'Đã bán';

  const isItemHidden =
    storeItem?.status === 'Bị ẩn' ||
    storeItem?.status === 'Bị từ chối' ||
    remoteItem?.status === 'hidden' ||
    remoteItem?.status === 'rejected' ||
    Boolean((storeItem as any)?.isHidden);

  const itemStatusType: 'sold' | 'hidden' | 'available' = isItemSold
    ? 'sold'
    : isItemHidden
      ? 'hidden'
      : 'available';

  const quickReplies = [
    'Phòng này còn trống không ạ?',
    'Chiều nay mình có thể qua xem phòng được không?',
    'Cho mình hỏi giá điện nước đã bao gồm chưa ạ?',
  ];

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBlocked) {
      showToast('Không thể gửi tin nhắn', 'Bạn đã chặn người dùng này.', 'warning');
      return;
    }
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
    if (isBlocked) {
      showToast('Không thể gửi tin nhắn', 'Bạn đã chặn người dùng này.', 'warning');
      return;
    }
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
                const isMe = isSameUserId(c.participant_1, currentUser?.id);
                const other = isMe ? c.p2 : c.p1;
                const otherId = isMe ? c.participant_2 : c.participant_1;
                const known = otherId ? KNOWN_USER_NAMES[otherId] : null;
                const name =
                  c.other_name ||
                  other?.full_name ||
                  other?.name ||
                  known?.name ||
                  (isMe ? 'Chủ trọ / Người đăng' : 'Khách liên hệ');
                const avatar =
                  c.other_avatar ||
                  other?.avatar_url ||
                  known?.avatar ||
                  '/images/user-avatar.jpg';
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
                        {(() => {
                          const raw = c.last_message;
                          if (!raw) return 'Bắt đầu cuộc trò chuyện...';
                          const trimmed = raw.trim();
                          if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
                            try {
                              const parsed = JSON.parse(trimmed);
                              if (parsed.summary) return parsed.summary;
                              if (parsed.title) return `[Món đồ] ${parsed.title}`;
                            } catch {}
                          }
                          return raw;
                        })()}
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

                  {isBlocked ? (
                    <button
                      type="button"
                      onClick={() => otherId && unblockUser(otherId)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 text-[#006d37] hover:bg-emerald-100 text-xs font-bold transition cursor-pointer"
                      title="Bỏ chặn người này"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Bỏ chặn</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        if (!currentUser) {
                          showToast('Vui lòng đăng nhập', 'Bạn cần đăng nhập để thực hiện chặn liên hệ', 'warning');
                          return;
                        }
                        if (otherId && window.confirm(`Bạn có chắc muốn chặn liên hệ với ${otherName}? Sau khi chặn, hai bạn sẽ không thể gửi tin nhắn cho nhau.`)) {
                          blockUser(otherId, otherName);
                        }
                      }}
                      className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition tap-bounce min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
                      title="Chặn liên hệ người này"
                    >
                      <ShieldOff className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setShowReportModal(true)}
                    className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition tap-bounce min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
                    title="Báo cáo người dùng này"
                  >
                    <AlertTriangle className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Banner cảnh báo khi đã chặn */}
              {isBlocked && (
                <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between gap-3 text-xs text-amber-900">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Bạn đã chặn người dùng này. Hai bên không thể gửi tin nhắn cho nhau.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => otherId && unblockUser(otherId)}
                    className="font-bold text-[#006d37] hover:underline cursor-pointer shrink-0"
                  >
                    Bỏ chặn
                  </button>
                </div>
              )}

              {/* Thẻ ghim món đồ gắn kèm phía trên khung chat */}
              {attachedItemId && (
                <Link
                  to={`/cho-do-cu/${attachedItemId}`}
                  className="bg-white/95 backdrop-blur-xs border-b border-emerald-100 hover:border-[#006d37]/40 px-3 py-2 flex items-center justify-between gap-2.5 shadow-2xs hover:bg-emerald-50/50 transition-all group cursor-pointer shrink-0"
                  title="Bấm để xem chi tiết món đồ"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {/* Thumbnail ảnh sản phẩm (có placeholder fallback) */}
                    <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
                      <img
                        src={pinnedImage || ITEM_PLACEHOLDER}
                        alt={pinnedTitle}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = ITEM_PLACEHOLDER;
                        }}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>

                    {/* Tên & Giá sản phẩm */}
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-[#006d37] bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded shrink-0">
                          Món đồ
                        </span>
                        <h4 className="text-xs sm:text-sm font-bold text-gray-900 truncate group-hover:text-[#006d37] transition-colors">
                          {pinnedTitle}
                        </h4>
                      </div>
                      <p className="text-xs font-black text-[#006d37]">
                        {pinnedPriceDisplay}
                      </p>
                    </div>
                  </div>

                  {/* Nhãn trạng thái & Nút xem chi tiết */}
                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    {itemStatusType === 'sold' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        Đã bán
                      </span>
                    ) : itemStatusType === 'hidden' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-600 bg-gray-100 border border-gray-300 px-2 py-0.5 rounded-full shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                        Đã ẩn
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Đang bán
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#006d37] group-hover:translate-x-0.5 transition-transform shrink-0" />
                  </div>
                </Link>
              )}

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
                    const isMe = isSameUserId(msg.sender_id, currentUser?.id);
                    const msgSenderName = isMe
                      ? (currentUser?.name || 'Bạn')
                      : (msg.sender?.full_name || msg.sender?.name || (msg.sender_id ? KNOWN_USER_NAMES[msg.sender_id]?.name : undefined) || otherName);
                    const msgSenderAvatar = isMe
                      ? (currentUser?.avatarUrl || '/images/user-avatar.jpg')
                      : (msg.sender?.avatar_url || (msg.sender_id ? KNOWN_USER_NAMES[msg.sender_id]?.avatar : undefined) || otherAvatar);

                    const timeStr = msg.created_at
                      ? new Date(msg.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '';

                    // Tin nhắn hệ thống / ngữ cảnh món đồ (sender_id null hoặc type item_context/system):
                    // Hiển thị dạng dòng chữ giữa khung chat theo yêu cầu 5
                    const isSystemOrContext = !msg.sender_id || msg.type === 'item_context' || msg.type === 'system';

                    if (isSystemOrContext) {
                      let displayText = msg.content;
                      try {
                        const parsed = JSON.parse(msg.content);
                        if (parsed && typeof parsed === 'object') {
                          displayText =
                            parsed.summary ||
                            (parsed.title
                              ? `[Món đồ] ${parsed.title}${parsed.price !== undefined ? (parsed.price === 0 ? ' (Đồ tặng miễn phí)' : ` (${parsed.price.toLocaleString('vi-VN')} đ)`) : ''}`
                              : msg.content);
                        }
                      } catch {}

                      return (
                        <div key={msg.id} className="flex justify-center my-3 w-full">
                          <div className="bg-emerald-50/90 border border-emerald-200/90 text-emerald-800 text-xs px-3.5 py-1.5 rounded-full shadow-2xs max-w-[90%] text-center flex items-center justify-center gap-1.5">
                            <span className="font-semibold">{displayText}</span>
                            {timeStr && <span className="text-[10px] text-emerald-600/80">({timeStr})</span>}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={msg.id}
                        className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}
                      >
                        {isMe ? (
                          /* Phần mình nhắn: Nằm bên PHẢI, có tên người nhắn + bong bóng màu xanh + thời gian */
                          <div className="flex flex-col items-end max-w-[85%] sm:max-w-[70%]">
                            <span className="text-[11px] font-semibold text-[#006d37] mr-1 mb-1">
                              {msgSenderName}
                            </span>
                            <div className="bg-[#006d37] text-white rounded-2xl rounded-br-xs px-4 py-2.5 shadow-xs w-fit">
                              <p className="whitespace-pre-wrap break-words text-xs leading-relaxed">
                                {msg.content}
                              </p>
                              <div className="flex items-center justify-end gap-1.5 mt-1 text-[10px] text-emerald-100">
                                <span>{timeStr}</span>
                                {msg.status === 'sending' ? (
                                  <Clock className="w-2.5 h-2.5 animate-spin text-emerald-200" />
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
                                )}
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* Phần người nhận / đối phương gửi: Nằm bên TRÁI, có avatar + tên cụ thể + bong bóng trắng + thời gian */
                          <div className="flex items-start gap-2 max-w-[85%] sm:max-w-[70%]">
                            <img
                              src={msgSenderAvatar}
                              alt={msgSenderName}
                              className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-gray-200 mt-1"
                            />
                            <div className="flex flex-col items-start flex-1 min-w-0">
                              <span className="text-[11px] font-bold text-gray-800 ml-1 mb-1 truncate">
                                {msgSenderName}
                              </span>
                              <div className="bg-white text-gray-900 border border-gray-200 rounded-2xl rounded-tl-xs px-4 py-2.5 shadow-2xs w-fit">
                                <p className="whitespace-pre-wrap break-words text-xs leading-relaxed">
                                  {msg.content}
                                </p>
                                <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-gray-400">
                                  <span>{timeStr}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Form gửi tin nhắn hoặc thông báo chặn */}
              {isBlocked ? (
                <div
                  className="p-4 bg-gray-50 border-t border-gray-200 text-center space-y-1.5"
                  style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' }}
                >
                  <p className="text-xs text-gray-600 font-medium">
                    Bạn đã chặn liên hệ với người dùng này nên không thể gửi hoặc nhận tin nhắn mới.
                  </p>
                  <button
                    type="button"
                    onClick={() => otherId && unblockUser(otherId)}
                    className="text-xs font-bold text-[#006d37] hover:underline cursor-pointer"
                  >
                    Bấm vào đây để bỏ chặn và tiếp tục trò chuyện
                  </button>
                </div>
              ) : (
                <>
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
              )}
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

      {/* Report Modal */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        targetTitle={`Người dùng: ${otherName}`}
        targetId={otherId || ''}
        targetType="user"
      />
    </div>
  );
};

