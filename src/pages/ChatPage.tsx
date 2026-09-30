import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { useRealtimeChat } from '../hooks/useRealtimeChat';
import {
  getConversations,
  getConversationMeta,
  saveConversationMeta,
  findOrCreateConversation,
  isSameUserId,
  KNOWN_USER_NAMES,
  markConversationAsRead,
  isConversationWithAdmin,
  getOrCreateAdminConversation,
  ADMIN_USER_ID,
} from '../lib/api/messages';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { getMarketplaceItemById } from '../lib/api/marketplace';
import { getRoommatePostById } from '../lib/api/roommates';
import { getItemAvailability } from '../lib/marketplaceStatus';
import { isValidReturnUrl } from '../lib/auth/redirectAfterAuth';
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
  Sparkles,
  Tag,
  Flag,
  MoreVertical,
  Search,
  X,
  Calendar,
  Users,
  Camera,
  Maximize2,
  Download,
  FileCheck,
} from 'lucide-react';
import { ReportModal } from '../components/modals/ReportModal';
import { hasUserReported, getReportedTargetIds } from '../lib/api/reports';
import { canMessage } from '../lib/api/blocksAndHides';

const ITEM_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m7.5 4.27 9 5.15'/%3E%3Cpath d='M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z'/%3E%3Cpath d='m3.3 7 8.7 5 8.7-5'/%3E%3Cpath d='M12 22V12'/%3E%3C/svg%3E";

function compressImageToBlob(file: File, maxWidth = 1200, quality = 0.8): Promise<Blob> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new window.Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              resolve(blob || file);
            },
            'image/jpeg',
            quality
          );
        } else {
          resolve(file);
        }
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
}

export const ChatPage: React.FC = () => {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const { currentUser, showToast, blockedUserIds, blockUser, unblockUser, marketplaceItems, rooms = [] } = useAppStore();

  // Đọc tham số Deep Link cho Chợ đồ cũ & Ở ghép
  const rawNguoiBan = searchParams.get('nguoiBan') || searchParams.get('sellerId');
  const rawMonDo = searchParams.get('monDo') || searchParams.get('itemId');
  const rawRoommateId = searchParams.get('roommateId') || searchParams.get('oGhep');
  const hasDeepLinkParams = searchParams.has('nguoiBan') || searchParams.has('monDo');

  const [inboxFilter, setInboxFilter] = useState<'all' | 'unread' | 'rooms' | 'marketplace' | 'roommates'>('all');

  const [deepLinkState, setDeepLinkState] = useState<{
    isLoading: boolean;
    error: {
      title: string;
      message: string;
    } | null;
  }>({
    isLoading: Boolean(hasDeepLinkParams),
    error: null,
  });

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isConvLoading, setIsConvLoading] = useState<boolean>(true);
  const [activeConversationId, setActiveConversationId] = useState<string>(conversationId || '');
  const [inputText, setInputText] = useState<string>('');
  const [convSearch, setConvSearch] = useState<string>('');
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const [hideQuickReplies, setHideQuickReplies] = useState<boolean>(false);
  const [isSendingQuickReply, setIsSendingQuickReply] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Đặt lại hiển thị gợi ý khi chuyển sang cuộc trò chuyện khác
  useEffect(() => {
    setHideQuickReplies(false);
    setIsSendingQuickReply(false);
  }, [activeConversationId]);

  // 0. Kiểm tra đăng nhập khi vào /tin-nhan: Nếu chưa đăng nhập -> Chuyển sang /dang-nhap kèm returnUrl an toàn
  useEffect(() => {
    if (!currentUser) {
      const currentTarget = location.pathname + location.search;
      if (isValidReturnUrl(currentTarget)) {
        navigate(`/dang-nhap?returnUrl=${encodeURIComponent(currentTarget)}`, { replace: true });
      } else {
        navigate('/dang-nhap', { replace: true });
      }
    }
  }, [currentUser, location.pathname, location.search, navigate]);

  // 0.1 Xử lý Deep Link /tin-nhan?nguoiBan=...&monDo=...
  useEffect(() => {
    if (!currentUser?.id || !hasDeepLinkParams) return;

    let isMounted = true;

    const resolveDeepLink = async () => {
      setDeepLinkState({ isLoading: true, error: null });

      // 1. Kiểm tra thiếu tham số
      if (!rawNguoiBan || !rawMonDo) {
        if (!isMounted) return;
        setDeepLinkState({
          isLoading: false,
          error: {
            title: 'Liên kết không đầy đủ thông tin',
            message: 'Đường dẫn trò chuyện thiếu mã người bán hoặc mã món đồ cần kết nối.',
          },
        });
        return;
      }

      const sellerId = rawNguoiBan.trim();
      const itemId = rawMonDo.trim();

      // 2. Chặn tự nhắn tin cho chính mình
      if (isSameUserId(sellerId, currentUser.id)) {
        if (!isMounted) return;
        setDeepLinkState({
          isLoading: false,
          error: {
            title: 'Không thể tự nhắn tin cho chính mình',
            message: 'Đây là món đồ do tài khoản của bạn đăng bán. Bạn có thể kiểm tra danh sách tin nhắn từ người mua khác ở bên trái.',
          },
        });
        return;
      }

      // 3. Kiểm tra món đồ trong DB hoặc store
      let matchedItem: any = marketplaceItems.find((m) => m.id === itemId);
      if (!matchedItem) {
        try {
          matchedItem = await getMarketplaceItemById(itemId);
        } catch (fetchErr) {
          console.warn('[ChatPage] Không thể tra cứu món đồ qua API:', fetchErr);
        }
      }

      // Món đồ không tồn tại
      if (!matchedItem) {
        if (!isMounted) return;
        setDeepLinkState({
          isLoading: false,
          error: {
            title: 'Món đồ không tồn tại hoặc đã bị xóa',
            message: 'Món đồ bạn đang tìm kiếm không còn tồn tại trên hệ thống hoặc đã được người bán gỡ xuống.',
          },
        });
        return;
      }

      // Kiểm tra người bán có khớp với món đồ không (nếu có thông tin)
      const itemSellerId = matchedItem.seller_id || matchedItem.userId || matchedItem.sellerId;
      if (itemSellerId && !isSameUserId(itemSellerId, sellerId)) {
        if (!isMounted) return;
        setDeepLinkState({
          isLoading: false,
          error: {
            title: 'Thông tin người bán không chính xác',
            message: 'Người bán trong liên kết không trùng khớp với người đăng món đồ này.',
          },
        });
        return;
      }

      // 4. Mở hoặc khởi tạo hội thoại
      try {
        const result = await findOrCreateConversation(
          currentUser.id,
          sellerId,
          itemId,
          {
            mockItem: {
              id: itemId,
              title: matchedItem.title || matchedItem.name,
              price: matchedItem.price,
              user_id: itemSellerId || sellerId,
              images: matchedItem.image_urls || matchedItem.images,
            },
            currentUserId: currentUser.id,
          }
        );

        if (!isMounted) return;
        setDeepLinkState({ isLoading: false, error: null });

        // Cập nhật danh sách conversations và chuyển hướng về URL chuẩn
        const updatedList = await getConversations(currentUser.id);
        if (isMounted) {
          setConversations(updatedList);
          setActiveConversationId(result.conversationId);
          navigate(`/tin-nhan/${result.conversationId}`, { replace: true });
        }
      } catch (convErr: any) {
        console.error('[ChatPage] Lỗi khởi tạo cuộc trò chuyện qua deep link:', convErr);
        if (!isMounted) return;
        setDeepLinkState({
          isLoading: false,
          error: {
            title: 'Không thể kết nối cuộc trò chuyện',
            message: convErr?.message || 'Đã có lỗi xảy ra khi tạo cuộc trò chuyện với người bán. Vui lòng thử lại sau.',
          },
        });
      }
    };

    resolveDeepLink();

    return () => {
      isMounted = false;
    };
  }, [currentUser?.id, hasDeepLinkParams, rawNguoiBan, rawMonDo, marketplaceItems, navigate]);

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
        if (!activeConversationId && data.length > 0 && !hasDeepLinkParams) {
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

  // 1.1 Lắng nghe thay đổi danh sách cuộc trò chuyện qua Supabase Realtime & Custom Events
  useEffect(() => {
    if (!currentUser?.id) return;

    let isMounted = true;

    const handleSync = async () => {
      if (!isMounted) return;
      try {
        const updated = await getConversations(currentUser.id);
        if (isMounted) {
          setConversations(updated);
        }
      } catch (err) {
        console.warn('[ChatPage] Lỗi Realtime sync conversations:', err);
      }
    };

    let channel: any = null;
    if (isSupabaseConfigured) {
      channel = supabase
        .channel(`user-conversations-sync-${currentUser.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'conversations',
          },
          () => {
            handleSync();
          }
        )
        .subscribe();
    }

    // Lắng nghe sự kiện cập nhật hội thoại tức thì từ hook toàn cục (0ms reordering)
    const handleConvUpdated = (e: any) => {
      const conv = e?.detail;
      if (!conv || !isMounted) return;
      setConversations((prev) => {
        const existingIdx = prev.findIndex((c) => c.id === conv.id);
        if (existingIdx >= 0) {
          const updatedItem = { ...prev[existingIdx], ...conv };
          const without = prev.filter((c) => c.id !== conv.id);
          return [updatedItem, ...without];
        } else {
          handleSync();
          return prev;
        }
      });
    };

    window.addEventListener('troxinh:conversation-updated', handleConvUpdated);
    window.addEventListener('troxinh:resume-sync', handleSync);

    return () => {
      isMounted = false;
      window.removeEventListener('troxinh:conversation-updated', handleConvUpdated);
      window.removeEventListener('troxinh:resume-sync', handleSync);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [currentUser?.id]);

  // 1.2 Đánh dấu đã đọc khi activeConversationId thay đổi
  useEffect(() => {
    if (!activeConversationId || !currentUser?.id) return;

    // Đặt unread_count của conversation này về 0 ngay lập tức trong state
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversationId
          ? { ...c, unread_count: 0, unread_count_p1: 0, unread_count_p2: 0 }
          : c
      )
    );

    markConversationAsRead(activeConversationId, currentUser.id).then();
    useAppStore.setState((state) => ({
      notifications: (state.notifications || []).map((n) =>
        (n.ctaUrl && n.ctaUrl.includes(`/tin-nhan/${activeConversationId}`))
          ? { ...n, read: true }
          : n
      ),
    }));
  }, [activeConversationId, currentUser?.id]);

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
  const [canMessageOther, setCanMessageOther] = useState<boolean>(true);

  useEffect(() => {
    if (!otherId || !currentUser?.id) {
      setCanMessageOther(true);
      return;
    }
    if (isBlocked) {
      setCanMessageOther(false);
      return;
    }

    let isMounted = true;
    canMessage(otherId).then((allowed) => {
      if (isMounted) {
        setCanMessageOther(allowed);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [otherId, currentUser?.id, isBlocked]);

  const knownOther = otherId ? KNOWN_USER_NAMES[otherId] : null;

  const isChatWithAdmin = Boolean(
    activeConversation && isConversationWithAdmin(activeConversation, currentUser?.id)
  );

  const otherName = isChatWithAdmin
    ? 'Ban Quản Trị Trọ Xinh'
    : (activeConversation?.other_name ||
      otherParticipant?.full_name ||
      otherParticipant?.name ||
      knownOther?.name ||
      (isP1Me ? 'Chủ trọ / Người đăng' : 'Khách liên hệ'));

  const otherAvatar = isChatWithAdmin
    ? '/images/logo.png'
    : (activeConversation?.other_avatar ||
      otherParticipant?.avatar_url ||
      knownOther?.avatar ||
      '/images/user-avatar.jpg');

  const otherPhone = isChatWithAdmin ? '0888110789' : otherParticipant?.phone;

  // Header menu "..." và Báo cáo tin nhắn
  const [isHeaderMenuOpen, setIsHeaderMenuOpen] = useState<boolean>(false);
  const [reportingMessage, setReportingMessage] = useState<any | null>(null);
  const [hasReportedUser, setHasReportedUser] = useState<boolean>(false);
  const [reportedMessageIds, setReportedMessageIds] = useState<Set<string>>(new Set());
  const headerMenuRef = useRef<HTMLDivElement>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);

  // Helper cắt gọn tiêu đề hiển thị tin nhắn tối đa 80 ký tự, xử lý tin rỗng / ảnh
  const formatMessagePreview = (msg: any): string => {
    if (!msg) return '';
    if (msg.type === 'image' || (!msg.content?.trim() && msg.image_url)) {
      return '[Hình ảnh]';
    }
    const text = (msg.content || '').trim();
    if (!text) return '[Hình ảnh]';
    if (/^https?:\/\/.*\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(text)) {
      return '[Hình ảnh]';
    }
    if (text.startsWith('{') && text.includes('"type":"offer"')) {
      return '[Đề xuất trả giá]';
    }
    if (text.length <= 80) return text;
    return text.slice(0, 80) + '...';
  };

  // Tải một lần danh sách id các tin nhắn đã báo cáo trong hệ thống của người dùng hiện tại
  useEffect(() => {
    if (currentUser?.id) {
      setReportedMessageIds(getReportedTargetIds(currentUser.id, 'tin_nhan'));
    } else {
      setReportedMessageIds(new Set());
    }
  }, [currentUser?.id, activeConversationId]);

  // Kiểm tra người dùng hiện tại đã báo cáo đối phương hay chưa
  useEffect(() => {
    if (currentUser?.id && otherId) {
      setHasReportedUser(hasUserReported(currentUser.id, 'nguoi_dung', otherId));
    } else {
      setHasReportedUser(false);
    }
  }, [currentUser?.id, otherId, showReportModal]);

  // Đóng menu "..." khi chuyển sang hội thoại khác
  useEffect(() => {
    setIsHeaderMenuOpen(false);
  }, [activeConversationId]);

  // Đóng menu "..." khi bấm ra ngoài hoặc nhấn phím Esc
  useEffect(() => {
    if (!isHeaderMenuOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (headerMenuRef.current && !headerMenuRef.current.contains(e.target as Node)) {
        setIsHeaderMenuOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsHeaderMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isHeaderMenuOpen]);

  // Bộ nhận diện cử chỉ Nhấn giữ (Long press) trên Mobile
  const handleTouchStart = (e: React.TouchEvent, msg: any) => {
    // Chỉ kích hoạt nếu tin nhắn có sender_id và không phải của mình, chưa báo cáo
    if (!msg?.sender_id || isSameUserId(msg.sender_id, currentUser?.id)) return;
    if (msg.id && reportedMessageIds.has(msg.id)) return;

    const touch = e.touches[0];
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };

    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
    longPressTimerRef.current = setTimeout(() => {
      if (navigator.vibrate) {
        try {
          navigator.vibrate(40);
        } catch {}
      }
      handleTriggerReportMessage(msg);
    }, 550);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPosRef.current || !longPressTimerRef.current) return;
    const touch = e.touches[0];
    const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
    const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);
    if (dx > 10 || dy > 10) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    touchStartPosRef.current = null;
  };

  const handleTriggerReportMessage = (msg: any) => {
    // 1. Tin nhắn không có sender_id (tin hệ thống, bot, tin lỗi) -> Không cho báo cáo
    if (!msg || !msg.sender_id) {
      showToast('Không thể báo cáo', 'Tin nhắn này không có người gửi xác định để báo cáo.', 'info');
      return;
    }

    // 2. Chặn tuyệt đối nếu là tin nhắn của chính mình
    if (isSameUserId(msg.sender_id, currentUser?.id)) {
      showToast('Không thể báo cáo', 'Bạn không thể báo cáo tin nhắn của chính mình.', 'info');
      return;
    }

    if (!currentUser) {
      showToast('Vui lòng đăng nhập', 'Bạn cần đăng nhập để gửi báo cáo', 'warning');
      navigate(`/dang-nhap?returnUrl=${encodeURIComponent(location.pathname + location.search)}`);
      return;
    }

    // 3. Kiểm tra danh sách đã báo cáo
    if (msg.id && reportedMessageIds.has(msg.id)) {
      showToast('Đã gửi báo cáo', 'Tin nhắn này đã được bạn gửi báo cáo trước đó.', 'info');
      return;
    }

    setReportingMessage(msg);
  };

  // 3. Xác định món đồ gắn kèm trong cuộc hội thoại (Chợ đồ cũ)
  const [remoteItem, setRemoteItem] = useState<any>(null);
  // Món đồ đã xóa hoặc người xem không còn quyền xem (bị ẩn/chờ duyệt lại)
  const [remoteItemMissing, setRemoteItemMissing] = useState<boolean>(false);

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

  const savedMeta = activeConversationId ? getConversationMeta(activeConversationId) : null;

  const attachedItemId =
    activeConversation?.item_id ||
    activeConversation?.last_item_id ||
    savedMeta?.last_item_id ||
    latestContextMsg?.item_id ||
    parsedContext?.itemId ||
    null;

  const attachedRoomId = activeConversation?.room_id || null;
  const attachedRoom: any = attachedRoomId
    ? (rooms || []).find((r) => r.id === attachedRoomId) || activeConversation?.rooms
    : activeConversation?.rooms;

  const attachedRoommateId =
    rawRoommateId ||
    savedMeta?.roommate_id ||
    (activeConversation as any)?.roommate_id ||
    null;

  const [roommatePost, setRoommatePost] = useState<any>(savedMeta?.roommate_post || null);

  useEffect(() => {
    if (!attachedRoommateId) {
      setRoommatePost(null);
      return;
    }
    if (savedMeta?.roommate_post && savedMeta.roommate_post.id === attachedRoommateId) {
      setRoommatePost(savedMeta.roommate_post);
      return;
    }
    let cancelled = false;
    getRoommatePostById(attachedRoommateId)
      .then((res) => {
        if (cancelled) return;
        if (res) {
          setRoommatePost(res);
          if (activeConversationId) {
            saveConversationMeta(activeConversationId, {
              roommate_id: res.id,
              roommate_post: res,
            });
          }
        }
      })
      .catch((err) => console.warn('[ChatPage] Không thể tải thông tin bài ở ghép:', err));

    return () => {
      cancelled = true;
    };
  }, [attachedRoommateId, activeConversationId, savedMeta]);

  const storeItem = attachedItemId
    ? marketplaceItems.find((m) => m.id === attachedItemId)
    : null;

  useEffect(() => {
    setRemoteItemMissing(false);
    if (!attachedItemId) {
      setRemoteItem(null);
      return;
    }
    // Nếu trong store chưa có, fetch thêm từ Supabase API
    if (!storeItem) {
      let cancelled = false;
      getMarketplaceItemById(attachedItemId)
        .then((res) => {
          if (cancelled) return;
          if (res) setRemoteItem(res);
          else setRemoteItemMissing(true);
        })
        .catch((err) => console.warn('[ChatPage] Không thể tải trạng thái món đồ:', err));
      return () => {
        cancelled = true;
      };
    }
  }, [attachedItemId, storeItem]);

  // Thông tin hiển thị thẻ ghim món đồ
  const pinnedTitle =
    storeItem?.name ||
    storeItem?.title ||
    remoteItem?.title ||
    remoteItem?.name ||
    savedMeta?.last_item_name ||
    parsedContext?.title ||
    'Món đồ thanh lý';

  const rawPrice =
    storeItem?.price ??
    remoteItem?.price ??
    savedMeta?.last_item_price ??
    parsedContext?.price;

  const isFree =
    storeItem?.pricingType === 'Miễn phí' ||
    remoteItem?.pricingType === 'Miễn phí' ||
    rawPrice === 0;

  const pinnedPriceDisplay = isFree
    ? 'Tặng 0đ'
    : rawPrice !== undefined && rawPrice !== null && rawPrice > 0
      ? formatCurrency(rawPrice)
      : 'Tặng 0đ';

  const pinnedImage =
    storeItem?.images?.[0] ||
    remoteItem?.image_urls?.[0] ||
    (Array.isArray(remoteItem?.images) ? remoteItem?.images[0] : null) ||
    parsedContext?.image ||
    '';

  // Xác định nhãn trạng thái (Đang bán / Đã bán / Đã đóng / Không khả dụng)
  const pinnedItemSource = storeItem || remoteItem;
  const pinnedAvailability = pinnedItemSource
    ? getItemAvailability(pinnedItemSource)
    : remoteItemMissing
      ? 'hidden'
      : 'available';

  const itemStatusType: 'sold' | 'closed' | 'hidden' | 'available' =
    pinnedAvailability === 'sold' || pinnedAvailability === 'closed' || pinnedAvailability === 'available'
      ? pinnedAvailability
      : 'hidden';

  // 1. Kiểm tra tin nhắn thật từ cả hai phía (bỏ qua tin hệ thống và item_context)
  const hasAnyRealMessage = chatMessages.some((m) => {
    if (!m.sender_id) return false;
    if (m.type === 'system' || m.type === 'item_context') return false;
    return true;
  });

  // 2. Xác định chủ món đồ: Chỉ hiện gợi ý cho người mua, không hiện cho chủ món đồ
  const itemSellerId =
    storeItem?.userId ||
    storeItem?.sellerId ||
    remoteItem?.seller_id ||
    remoteItem?.user_id ||
    (parsedContext as any)?.sellerId;

  const isOwnerOfItem = Boolean(
    itemSellerId && currentUser?.id && isSameUserId(itemSellerId, currentUser.id)
  );

  const roomOwnerId =
    attachedRoom?.owner_id ||
    attachedRoom?.ownerId ||
    attachedRoom?.landlord_id ||
    attachedRoom?.poster_id;
  const isOwnerOfRoom = Boolean(
    roomOwnerId && currentUser?.id && isSameUserId(roomOwnerId, currentUser.id)
  );

  const [isTransacting, setIsTransacting] = useState<boolean>(false);
  const [showOfferModal, setShowOfferModal] = useState<boolean>(false);
  const [offerPriceInput, setOfferPriceInput] = useState<string>('');
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleMarkTransacted = async (type: 'room' | 'item') => {
    if (!currentUser) return;
    setIsHeaderMenuOpen(false);

    if (type === 'room' && attachedRoomId) {
      if (!window.confirm('Xác nhận đánh dấu phòng này đã được cho thuê thành công?')) {
        return;
      }
      setIsTransacting(true);
      try {
        if (isSupabaseConfigured) {
          await supabase
            .from('rooms')
            .update({ status: 'Đã cho thuê', availability_status: 'rented' })
            .eq('id', attachedRoomId);
        }
        useAppStore.setState((state) => ({
          rooms: (state.rooms || []).map((r) =>
            r.id === attachedRoomId ? { ...r, status: 'Đã cho thuê' } : r
          ),
        }));
        await realtimeSendMessage('🎉 Chúc mừng! Phòng trọ này đã được chủ nhà xác nhận cho thuê thành công.');
        showToast('Cập nhật thành công', 'Phòng trọ đã được chuyển sang trạng thái Đã cho thuê.', 'success');
      } catch (err: any) {
        console.error('[ChatPage] Lỗi cập nhật trạng thái phòng:', err);
        showToast('Lỗi', 'Không thể cập nhật trạng thái phòng trọ.', 'error');
      } finally {
        setIsTransacting(false);
      }
    } else if (type === 'item' && attachedItemId) {
      if (!window.confirm('Xác nhận đánh dấu món đồ này đã được bán thành công?')) {
        return;
      }
      setIsTransacting(true);
      try {
        if (isSupabaseConfigured) {
          await supabase
            .from('marketplace_items')
            .update({ status: 'sold', updated_at: new Date().toISOString() })
            .eq('id', attachedItemId);
        }
        setRemoteItem((prev: any) => (prev ? { ...prev, status: 'sold' } : { status: 'sold' }));
        useAppStore.setState((state) => ({
          marketplaceItems: (state.marketplaceItems || []).map((m) =>
            m.id === attachedItemId ? { ...m, status: 'Đã bán' } : m
          ),
        }));
        await realtimeSendMessage('🎉 Chúc mừng! Món đồ này đã được người bán xác nhận giao dịch thành công.');
        showToast('Cập nhật thành công', 'Món đồ đã được đánh dấu là Đã bán.', 'success');
      } catch (err: any) {
        console.error('[ChatPage] Lỗi cập nhật trạng thái món đồ:', err);
        showToast('Lỗi', 'Không thể cập nhật trạng thái món đồ.', 'error');
      } finally {
        setIsTransacting(false);
      }
    }
  };

  const handleSendOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNum = parseInt(offerPriceInput.replace(/\D/g, ''), 10);
    if (!cleanNum || cleanNum <= 0) {
      showToast('Giá chưa hợp lệ', 'Vui lòng nhập số tiền bạn muốn đề xuất.', 'warning');
      return;
    }
    if (rawPrice && cleanNum >= rawPrice) {
      showToast('Đề xuất trả giá', 'Giá trả nên thấp hơn giá đang bán của món đồ.', 'warning');
      return;
    }
    const offerPayload = JSON.stringify({
      type: 'offer',
      itemId: attachedItemId,
      itemTitle: pinnedTitle,
      originalPrice: rawPrice || 0,
      offeredPrice: cleanNum,
      buyerId: currentUser?.id,
      buyerName: (currentUser as any)?.full_name || currentUser?.name || 'Khách hỏi mua',
    });

    try {
      await realtimeSendMessage(offerPayload);
      setShowOfferModal(false);
      setOfferPriceInput('');
      showToast('Đã gửi đề xuất', 'Đề xuất trả giá của bạn đã được gửi tới người bán.', 'success');
    } catch (err: any) {
      showToast('Gửi đề xuất thất bại', err?.message || 'Vui lòng thử lại sau', 'error');
    }
  };

  const handleUploadAndSendImage = async (file: File) => {
    if (!file || !currentUser?.id || !activeConversationId) return;
    if (!file.type.startsWith('image/')) {
      showToast('File không hợp lệ', 'Vui lòng chỉ gửi tệp hình ảnh.', 'warning');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast('Ảnh quá lớn', 'Kích thước ảnh tối đa là 10MB.', 'warning');
      return;
    }

    setIsUploadingImage(true);
    try {
      const compressedBlob = await compressImageToBlob(file);
      let imageUrl = '';
      if (isSupabaseConfigured) {
        const fileExt = file.name.split('.').pop() || 'jpg';
        const fileName = `chat_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${currentUser.id}/${fileName}`;
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from('room-images')
          .upload(filePath, compressedBlob, { contentType: file.type, upsert: true });

        if (!uploadErr && uploadData?.path) {
          const { data: pubData } = supabase.storage.from('room-images').getPublicUrl(uploadData.path);
          if (pubData?.publicUrl) imageUrl = pubData.publicUrl;
        }
      }

      if (!imageUrl) {
        imageUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(compressedBlob);
        });
      }

      await realtimeSendMessage(imageUrl);
      showToast('Đã gửi ảnh', 'Hình ảnh thực tế đã được gửi thành công.', 'success');
    } catch (err: any) {
      console.error('[ChatPage] Lỗi gửi ảnh:', err);
      showToast('Lỗi gửi ảnh', err?.message || 'Không thể tải ảnh lên. Vui lòng thử lại.', 'error');
    } finally {
      setIsUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  // 5. Kiểm tra deliveryMethods: Nếu tin đăng có dữ liệu và không bao gồm tai_truong thì ẩn gợi ý "Mình nhận ở trường/KTX được không?"
  const itemDeliveryMethods: string[] =
    storeItem?.deliveryMethods ||
    remoteItem?.deliveryMethods ||
    remoteItem?.delivery_methods ||
    [];

  const hasDeliveryMethods =
    Array.isArray(itemDeliveryMethods) && itemDeliveryMethods.length > 0;
  const allowsTaiTruong =
    !hasDeliveryMethods || itemDeliveryMethods.includes('tai_truong');

  // Danh sách nút gợi ý cho Chợ đồ cũ
  const itemQuickReplies = [
    'Món này còn không bạn?',
    'Có bớt được không?',
    ...(allowsTaiTruong ? ['Mình nhận ở trường/KTX được không?'] : []),
  ];

  // Gợi ý cho phòng trọ thông thường
  const roomQuickReplies = [
    'Phòng này còn trống không ạ?',
    'Chiều nay mình có thể qua xem phòng được không?',
    'Cho mình hỏi giá điện nước đã bao gồm chưa ạ?',
  ];

  // Gợi ý cho bài đăng tìm bạn ở ghép
  const roommateQuickReplies = [
    'Chào bạn, bạn đã tìm được phòng trọ ưng ý chưa?',
    'Mình cũng đang tìm bạn ở ghép khu này, bạn học trường nào vậy?',
    'Giờ giấc sinh hoạt và thói quen của bạn thế nào ạ?',
    'Cuối tuần này chúng mình gặp nhau uống nước trao đổi nhé!',
  ];

  // Gợi ý khi nhắn tin với Ban Quản Trị Trọ Xinh
  const adminQuickReplies = [
    'Em cần hỗ trợ tìm phòng trọ tại Hà Nội',
    'Em muốn tư vấn về quy trình kiểm duyệt & cọc an toàn',
    'Em cần báo cáo sự cố bài đăng hoặc chủ trọ',
    'Em muốn đăng ký tài khoản chủ trọ đối tác',
  ];

  const currentQuickReplies = isChatWithAdmin
    ? adminQuickReplies
    : attachedItemId
    ? itemQuickReplies
    : roommatePost
    ? roommateQuickReplies
    : roomQuickReplies;

  const isPosterOfRoommate = Boolean(
    roommatePost?.userId && currentUser?.id && isSameUserId(roommatePost.userId, currentUser.id)
  );

  // Điều kiện hiển thị gợi ý:
  // - Khi chat với Admin: luôn gợi ý nếu chưa ẩn
  // - Khi chat với người dùng: chỉ hiện khi chưa có tin nhắn thật và chưa bị ẩn
  const shouldShowQuickReplies =
    (isChatWithAdmin
      ? !hideQuickReplies
      : (!hasAnyRealMessage && !isOwnerOfItem && !isPosterOfRoommate && !hideQuickReplies)) &&
    currentQuickReplies.length > 0;

  const renderOfferCard = (offerData: any, isFromMe: boolean) => {
    const origPrice = Number(offerData.originalPrice || 0);
    const offerPrice = Number(offerData.offeredPrice || 0);
    const discountPercent =
      origPrice > 0 && offerPrice < origPrice
        ? Math.round(((origPrice - offerPrice) / origPrice) * 100)
        : 0;

    return (
      <div className="bg-amber-50/95 border border-amber-200/90 rounded-2xl p-3.5 max-w-[280px] sm:max-w-xs shadow-xs text-gray-900">
        <div className="flex items-center gap-1.5 mb-2 pb-2 border-b border-amber-200/60 text-amber-900">
          <Tag className="w-4 h-4 text-amber-600 shrink-0" />
          <span className="text-xs font-bold uppercase tracking-wide">Đề xuất trả giá</span>
          {discountPercent > 0 && (
            <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-200 text-amber-900">
              Giảm {discountPercent}%
            </span>
          )}
        </div>
        <p className="text-xs font-semibold text-gray-900 line-clamp-1 mb-1.5" title={offerData.itemTitle}>
          {offerData.itemTitle || 'Món đồ trên chợ'}
        </p>
        <div className="flex items-baseline gap-2 mb-3">
          {origPrice > 0 && (
            <span className="text-xs text-gray-400 line-through">
              {formatCurrency(origPrice)}
            </span>
          )}
          <span className="text-base font-extrabold text-[#006d37]">
            {formatCurrency(offerPrice)}
          </span>
        </div>
        {!isFromMe ? (
          <div className="flex items-center gap-2 pt-2 border-t border-amber-200/60">
            <button
              type="button"
              onClick={async () => {
                await realtimeSendMessage(
                  `✅ Mình đồng ý với mức giá đề xuất ${formatCurrency(offerPrice)}. Bạn có thể qua xem hoặc chốt đơn nhé!`
                );
                showToast('Đã đồng ý', 'Bạn đã chấp thuận mức giá đề xuất của người mua.', 'success');
              }}
              className="flex-1 py-1.5 px-2 bg-[#006d37] hover:bg-[#005a2d] text-white text-[11px] font-bold rounded-xl transition-all shadow-2xs cursor-pointer text-center"
            >
              Đồng ý giá
            </button>
            <button
              type="button"
              onClick={async () => {
                await realtimeSendMessage(
                  `Cảm ơn bạn đã quan tâm. Rất tiếc mình chưa thể bán với giá ${formatCurrency(offerPrice)} được ạ.`
                );
                showToast('Đã từ chối', 'Bạn đã từ chối mức giá đề xuất.', 'info');
              }}
              className="py-1.5 px-2 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 text-[11px] font-medium rounded-xl transition-all cursor-pointer text-center"
            >
              Từ chối
            </button>
          </div>
        ) : (
          <div className="text-[11px] text-gray-500 italic pt-1 border-t border-amber-200/40 text-center">
            Đang chờ người bán phản hồi...
          </div>
        )}
      </div>
    );
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isBlocked) {
      showToast('Không thể gửi tin nhắn', 'Bạn đã chặn người dùng này.', 'warning');
      return;
    }
    if (!canMessageOther) {
      showToast('Thông báo', 'Không thể gửi tin nhắn trong cuộc trò chuyện này.', 'warning');
      return;
    }
    const content = inputText.trim();
    if (!content || !activeConversationId) return;

    setInputText('');
    setHideQuickReplies(true);
    await realtimeSendMessage(content);

    // Cập nhật preview tin nhắn cuối và đẩy cuộc hội thoại lên đầu danh sách (Reorder)
    setConversations((prev) => {
      const target = prev.find((c) => c.id === activeConversationId);
      if (!target) return prev;
      const updated = {
        ...target,
        last_message: content,
        last_message_at: new Date().toISOString(),
      };
      return [updated, ...prev.filter((c) => c.id !== activeConversationId)];
    });
  };

  // 3. Chỉ ẩn gợi ý sau khi gửi thành công; gửi lỗi thì hiện lại kèm thông báo lỗi. Vô hiệu hóa nút trong lúc đang gửi.
  const handleQuickReply = async (text: string) => {
    if (isBlocked) {
      showToast('Không thể gửi tin nhắn', 'Bạn đã chặn người dùng này.', 'warning');
      return;
    }
    if (!canMessageOther) {
      showToast('Thông báo', 'Không thể gửi tin nhắn trong cuộc trò chuyện này.', 'warning');
      return;
    }
    if (!activeConversationId || isSendingQuickReply) return;

    setIsSendingQuickReply(true);

    try {
      await realtimeSendMessage(text);
      // Gửi thành công -> Ẩn gợi ý & đẩy lên đầu danh sách
      setHideQuickReplies(true);
      setConversations((prev) => {
        const target = prev.find((c) => c.id === activeConversationId);
        if (!target) return prev;
        const updated = {
          ...target,
          last_message: text,
          last_message_at: new Date().toISOString(),
        };
        return [updated, ...prev.filter((c) => c.id !== activeConversationId)];
      });
    } catch (err: any) {
      console.error('[ChatPage] Lỗi gửi gợi ý tin nhắn:', err);
      // Gửi lỗi -> Hiện lại kèm thông báo lỗi
      setHideQuickReplies(false);
      showToast(
        'Gửi tin nhắn thất bại',
        err?.message || 'Không thể gửi tin nhắn nhanh. Vui lòng thử lại.',
        'error'
      );
    } finally {
      setIsSendingQuickReply(false);
    }
  };

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
    navigate(`/tin-nhan/${id}`);

    // Xóa ngay trạng thái chưa đọc trong UI cho cuộc hội thoại này
    setConversations((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, unread_count: 0, unread_count_p1: 0, unread_count_p2: 0 }
          : c
      )
    );

    if (currentUser?.id) {
      markConversationAsRead(id, currentUser.id).then();
      useAppStore.setState((state) => ({
        notifications: (state.notifications || []).map((n) =>
          (n.ctaUrl && n.ctaUrl.includes(`/tin-nhan/${id}`))
            ? { ...n, read: true }
            : n
        ),
      }));
    }
  };

  const filterCounts = React.useMemo(() => {
    let unread = 0;
    let roomsCount = 0;
    let marketplaceCount = 0;
    let roommatesCount = 0;

    conversations.forEach((c) => {
      const isMe = isSameUserId(c.participant_1, currentUser?.id);
      const unreadCount = c.unread_count ?? (isMe ? (c.unread_count_p1 || 0) : (c.unread_count_p2 || 0));
      if (unreadCount > 0) unread++;

      const meta = getConversationMeta(c.id);
      if (c.room_id || c.rooms) roomsCount++;
      if (c.item_id || c.last_item_id || meta?.last_item_id) marketplaceCount++;
      if ((c as any).roommate_id || meta?.roommate_id) roommatesCount++;
    });

    return {
      all: conversations.length,
      unread,
      rooms: roomsCount,
      marketplace: marketplaceCount,
      roommates: roommatesCount,
    };
  }, [conversations, currentUser?.id]);

  const filteredConversations = conversations.filter((c) => {
    // 1. Lọc theo ô tìm kiếm
    if (convSearch.trim()) {
      const q = convSearch.toLowerCase().trim();
      const isMe = isSameUserId(c.participant_1, currentUser?.id);
      const other = isMe ? c.p2 : c.p1;
      const otherId = isMe ? c.participant_2 : c.participant_1;
      const known = otherId ? KNOWN_USER_NAMES[otherId] : null;
      const name = (c.other_name || other?.full_name || other?.name || known?.name || '').toLowerCase();
      const room = (c.rooms?.name || c.rooms?.title || '').toLowerCase();
      const lastMsg = (c.last_message || '').toLowerCase();
      if (!name.includes(q) && !room.includes(q) && !lastMsg.includes(q)) {
        return false;
      }
    }

    // 2. Lọc theo tab danh mục
    const isMe = isSameUserId(c.participant_1, currentUser?.id);
    const unreadCount = c.unread_count ?? (isMe ? (c.unread_count_p1 || 0) : (c.unread_count_p2 || 0));
    const meta = getConversationMeta(c.id);
    const hasRoom = Boolean(c.room_id || c.rooms);
    const hasItem = Boolean(c.item_id || c.last_item_id || meta?.last_item_id);
    const hasRoommate = Boolean((c as any).roommate_id || meta?.roommate_id);

    if (inboxFilter === 'unread') return unreadCount > 0;
    if (inboxFilter === 'rooms') return hasRoom;
    if (inboxFilter === 'marketplace') return hasItem;
    if (inboxFilter === 'roommates') return hasRoommate;
    return true;
  });

  const isCurrentUserAdmin =
    currentUser?.role === 'admin' || (currentUser as any)?.app_role === 'admin';

  // 1. Cuộc trò chuyện với Ban Quản Trị Trọ Xinh (Ghim ở Phần 1)
  const adminConversation = useMemo(() => {
    return conversations.find((c) => isConversationWithAdmin(c, currentUser?.id));
  }, [conversations, currentUser?.id]);

  // 2. Những đoạn chat nhắn tin với những người đã nhắn (Phần 2, loại trừ Admin)
  const otherConversations = useMemo(() => {
    return filteredConversations.filter((c) => !isConversationWithAdmin(c, currentUser?.id));
  }, [filteredConversations, currentUser?.id]);

  const [isOpeningAdminChat, setIsOpeningAdminChat] = useState<boolean>(false);

  const handleSelectAdminChat = async () => {
    if (adminConversation) {
      handleSelectConversation(adminConversation.id);
      return;
    }
    if (!currentUser?.id) {
      showToast('Vui lòng đăng nhập', 'Bạn cần đăng nhập để chat với Ban Quản Trị', 'warning');
      return;
    }
    setIsOpeningAdminChat(true);
    try {
      const convId = await getOrCreateAdminConversation(currentUser.id);
      const updatedList = await getConversations(currentUser.id);
      setConversations(updatedList);
      handleSelectConversation(convId);
    } catch (err: any) {
      console.error('[ChatPage] Lỗi mở hội thoại với Admin:', err);
      showToast('Không thể kết nối', err?.message || 'Vui lòng thử lại sau.', 'error');
    } finally {
      setIsOpeningAdminChat(false);
    }
  };

  const adminUnreadCount = useMemo(() => {
    if (!adminConversation) return 0;
    const isMe = isSameUserId(adminConversation.participant_1, currentUser?.id);
    return adminConversation.unread_count ?? (isMe ? (adminConversation.unread_count_p1 || 0) : (adminConversation.unread_count_p2 || 0));
  }, [adminConversation, currentUser?.id]);

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
            (conversationId || hasDeepLinkParams) ? 'hidden md:flex' : 'flex'
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

          {/* Ô tìm kiếm cuộc trò chuyện */}
          <div className="p-2.5 border-b border-gray-100 bg-gray-50/50">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={convSearch}
                onChange={(e) => setConvSearch(e.target.value)}
                placeholder="Tìm cuộc trò chuyện..."
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#006d37] text-gray-900 placeholder:text-gray-400"
              />
              {convSearch && (
                <button
                  type="button"
                  onClick={() => setConvSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Thanh Tab phân loại danh bạ hộp thư */}
          <div className="px-2.5 py-2 border-b border-gray-100 bg-gray-50/70 flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth">
            {[
              { id: 'all' as const, label: 'Tất cả', count: filterCounts.all },
              { id: 'unread' as const, label: 'Chưa đọc', count: filterCounts.unread, isAlert: true },
              { id: 'rooms' as const, label: 'Phòng trọ', count: filterCounts.rooms, icon: Home },
              { id: 'marketplace' as const, label: 'Đồ cũ', count: filterCounts.marketplace, icon: ShoppingBag },
              { id: 'roommates' as const, label: 'Ở ghép', count: filterCounts.roommates, icon: Users },
            ].map((tab) => {
              const isActive = inboxFilter === tab.id;
              const IconComp = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setInboxFilter(tab.id)}
                  className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold flex items-center gap-1 shrink-0 transition-all cursor-pointer select-none tap-bounce ${
                    isActive
                      ? 'bg-[#006d37] text-white shadow-2xs font-bold'
                      : 'bg-white hover:bg-gray-100 text-gray-600 border border-gray-200/80'
                  }`}
                >
                  {IconComp && <IconComp className="w-3 h-3" />}
                  <span>{tab.label}</span>
                  {tab.count > 0 && (
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold leading-none ${
                        isActive
                          ? 'bg-white/25 text-white'
                          : tab.isAlert
                          ? 'bg-rose-500 text-white'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {tab.count > 99 ? '99+' : tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex-1 overflow-y-auto">
            {isConvLoading ? (
              <div className="p-8 text-center text-gray-400 space-y-2">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#006d37]" />
                <p className="text-xs">Đang tải cuộc trò chuyện...</p>
              </div>
            ) : (
              <>
                {/* ========================================================
                    PHẦN 1: GHIM NHẮN TIN VỚI ADMIN / BAN QUẢN TRỊ TRỌ XINH
                ======================================================== */}
                {!isCurrentUserAdmin && (
                  <div className="bg-white border-b-2 border-emerald-100/90 shrink-0">
                    <div className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-50 via-emerald-50/80 to-teal-50/40 border-b border-emerald-100 flex items-center justify-between text-[11px] font-bold text-[#006d37]">
                      <span className="flex items-center gap-1.5">
                        <span className="text-xs">📌</span>
                        <span>HỖ TRỢ BAN QUẢN TRỊ</span>
                      </span>
                      <span className="text-[10px] bg-emerald-100 text-[#006d37] px-2 py-0.5 rounded-full font-semibold border border-emerald-200 shadow-2xs">
                        CSKH 24/7
                      </span>
                    </div>

                    <div
                      onClick={handleSelectAdminChat}
                      className={`p-3.5 flex items-start gap-3 cursor-pointer transition tap-bounce relative ${
                        adminConversation && adminConversation.id === activeConversationId
                          ? 'bg-emerald-50/90 border-l-4 border-[#006d37]'
                          : adminUnreadCount > 0
                          ? 'bg-emerald-50/40 hover:bg-emerald-50/70'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="relative shrink-0">
                        <img
                          src="/images/logo.png"
                          alt="Trọ Xinh"
                          className="w-10 h-10 rounded-xl object-cover ring-2 ring-emerald-500/40 shadow-xs"
                        />
                        <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white ring-1 ring-emerald-600/30" />
                      </div>

                      <div className="flex-1 overflow-hidden space-y-0.5">
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <h4 className={`text-xs truncate ${adminUnreadCount > 0 ? 'font-black text-gray-900' : 'font-bold text-gray-900'}`}>
                              Ban Quản Trị Trọ Xinh
                            </h4>
                            <span className="text-[9px] bg-[#006d37] text-white px-1.5 py-0.2 rounded font-bold uppercase shrink-0">
                              BQT
                            </span>
                          </div>
                          {adminConversation?.last_message_at && (
                            <span className={`text-[10px] shrink-0 ${adminUnreadCount > 0 ? 'text-[#006d37] font-bold' : 'text-gray-400'}`}>
                              {new Date(adminConversation.last_message_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          )}
                        </div>

                        <p className="text-[10px] text-[#006d37] font-semibold truncate flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-[#006d37] shrink-0" />
                          Hỗ trợ tìm phòng, cọc an toàn &amp; khiếu nại
                        </p>

                        <div className="flex items-center justify-between gap-1">
                          <p className={`text-xs truncate leading-snug flex-1 ${adminUnreadCount > 0 ? 'font-bold text-gray-900' : 'text-gray-500'}`}>
                            {isOpeningAdminChat
                              ? 'Đang kết nối tới Ban Quản Trị...'
                              : adminConversation?.last_message
                              ? adminConversation.last_message
                              : 'Bấm vào đây để chat trực tiếp với BQT Trọ Xinh...'}
                          </p>
                          {adminUnreadCount > 0 && (
                            <span className="inline-flex items-center justify-center min-w-[18px] h-4.5 px-1.5 text-[10px] font-bold bg-[#006d37] text-white rounded-full shadow-xs shrink-0 animate-scaleUp">
                              {adminUnreadCount > 99 ? '99+' : adminUnreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ========================================================
                    PHẦN 2: NHỮNG ĐOẠN CHAT NHẮN TIN VỚI NHỮNG NGƯỜI ĐÃ NHẮN
                ======================================================== */}
                <div>
                  <div className="px-3.5 py-1.5 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between text-[11px] font-bold text-gray-500">
                    <span className="flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
                      <span>ĐOẠN CHAT GẦN ĐÂY</span>
                    </span>
                    <span className="text-[10px] text-gray-400 font-medium">
                      {otherConversations.length} cuộc trò chuyện
                    </span>
                  </div>

                  {otherConversations.length === 0 ? (
                    <div className="p-8 text-center text-gray-400 space-y-2">
                      <MessageSquare className="w-7 h-7 mx-auto text-gray-300" />
                      <p className="text-xs font-semibold">Chưa có tin nhắn nào khác</p>
                      <p className="text-[11px] text-gray-400 leading-relaxed">
                        {inboxFilter !== 'all'
                          ? 'Không có tin nhắn nào trong mục lọc này.'
                          : 'Các cuộc trò chuyện với chủ trọ, bạn ở ghép hoặc người mua/bán đồ sẽ xuất hiện ở đây.'}
                      </p>
                      {inboxFilter !== 'all' && (
                        <button
                          type="button"
                          onClick={() => {
                            setInboxFilter('all');
                            setConvSearch('');
                          }}
                          className="text-xs font-bold text-[#006d37] hover:underline cursor-pointer pt-1 block mx-auto"
                        >
                          Xem tất cả cuộc trò chuyện
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {otherConversations.map((c) => {
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
                        const unreadCount = c.unread_count ?? (isMe ? (c.unread_count_p1 || 0) : (c.unread_count_p2 || 0));
                        const hasUnread = unreadCount > 0;
                        const cMeta = getConversationMeta(c.id);

                        return (
                          <div
                            key={c.id}
                            onClick={() => handleSelectConversation(c.id)}
                            className={`p-3.5 flex items-start gap-3 cursor-pointer transition tap-bounce relative ${
                              isActive
                                ? 'bg-emerald-50/80 border-l-4 border-[#006d37]'
                                : hasUnread
                                ? 'bg-emerald-50/30 hover:bg-emerald-50/50'
                                : 'hover:bg-gray-50'
                            }`}
                          >
                            <div className="relative shrink-0">
                              <img
                                src={avatar}
                                alt={name}
                                className="w-10 h-10 rounded-full object-cover ring-2 ring-gray-100"
                              />
                              {hasUnread && (
                                <span className="absolute -top-1 -right-1 w-3 h-3 bg-[#006d37] rounded-full border-2 border-white ring-1 ring-[#006d37]/20" />
                              )}
                            </div>
                            <div className="flex-1 overflow-hidden space-y-0.5">
                              <div className="flex items-center justify-between gap-1">
                                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                  <h4 className={`text-xs truncate ${hasUnread ? 'font-black text-gray-900' : 'font-bold text-gray-800'}`}>
                                    {name}
                                  </h4>
                                  {otherId && blockedUserIds.includes(otherId) && (
                                    <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.2 rounded font-bold shrink-0">
                                      Đã chặn
                                    </span>
                                  )}
                                </div>
                                {c.last_message_at && (
                                  <span className={`text-[10px] shrink-0 ${hasUnread ? 'text-[#006d37] font-bold' : 'text-gray-400'}`}>
                                    {new Date(c.last_message_at).toLocaleTimeString([], {
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </span>
                                )}
                              </div>
                              {(c.rooms?.name || c.rooms?.title) ? (
                                <p className="text-[10px] text-[#006d37] font-semibold truncate flex items-center gap-1">
                                  <Home className="w-3 h-3 shrink-0" /> {c.rooms.name || c.rooms.title}
                                </p>
                              ) : (c.item_id || c.last_item_id || cMeta?.last_item_name) ? (
                                <p className="text-[10px] text-amber-700 font-semibold truncate flex items-center gap-1">
                                  <ShoppingBag className="w-3 h-3 shrink-0 text-amber-600" /> {cMeta?.last_item_name || 'Đồ cũ thanh lý'}
                                </p>
                              ) : ((c as any).roommate_id || cMeta?.roommate_id) ? (
                                <p className="text-[10px] text-indigo-700 font-semibold truncate flex items-center gap-1">
                                  <Users className="w-3 h-3 shrink-0 text-indigo-600" /> Tìm bạn ở ghép
                                </p>
                              ) : null}
                              <div className="flex items-center justify-between gap-1">
                                <p className={`text-xs truncate leading-snug flex-1 ${hasUnread ? 'font-bold text-gray-900' : 'text-gray-500'}`}>
                                  {(() => {
                                    const raw = c.last_message;
                                    if (!raw) return 'Bắt đầu cuộc trò chuyện...';
                                    const trimmed = raw.trim();
                                    // Đảm bảo tin cảnh báo an toàn không hiển thị ở dòng xem trước tin cuối trong sidebar
                                    if (trimmed.includes('Nên gặp ở nơi công cộng') || trimmed.includes('kiểm tra đồ trước khi chuyển tiền')) {
                                      return 'Bắt đầu cuộc trò chuyện...';
                                    }
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
                                {hasUnread && (
                                  <span className="inline-flex items-center justify-center min-w-[18px] h-4.5 px-1.5 text-[10px] font-bold bg-[#006d37] text-white rounded-full shadow-xs shrink-0 animate-scaleUp">
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </aside>

        {/* Cột phải: Vùng trò chuyện chi tiết */}
        <main className={`flex-1 flex flex-col bg-gray-50/50 ${(!conversationId && !hasDeepLinkParams) ? 'hidden md:flex' : 'flex'}`}>
          {deepLinkState.isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8 text-center bg-gray-50/50">
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-emerald-100 shadow-md max-w-sm w-full space-y-4 text-center animate-scaleUp">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 text-[#006d37] flex items-center justify-center">
                  <Loader2 className="w-7 h-7 animate-spin" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Đang mở cuộc trò chuyện...</h3>
                  <p className="text-xs text-gray-500 mt-1">Đang chuẩn bị cuộc trao đổi về món đồ thanh lý.</p>
                </div>
              </div>
            </div>
          ) : deepLinkState.error ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-gray-50/50">
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-amber-200/80 shadow-md max-w-md w-full space-y-4 text-center animate-scaleUp">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <AlertCircle className="w-7 h-7" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-base font-bold text-gray-900">{deepLinkState.error.title}</h3>
                  <p className="text-xs text-gray-600 leading-relaxed">{deepLinkState.error.message}</p>
                </div>
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
                  <Link
                    to="/cho-do-cu"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-[#006d37] text-white text-xs font-bold hover:bg-[#005a2e] transition shadow-xs cursor-pointer"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Về Chợ Đồ Cũ</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setDeepLinkState({ isLoading: false, error: null });
                      navigate('/tin-nhan', { replace: true });
                    }}
                    className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 rounded-2xl bg-gray-100 text-gray-700 text-xs font-semibold hover:bg-gray-200 transition cursor-pointer"
                  >
                    Hộp thư tin nhắn
                  </button>
                </div>
              </div>
            </div>
          ) : activeConversation ? (
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

                  {/* Nút Chặn / Bỏ chặn giữ ở header bên ngoài */}
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

                  {/* Menu "..." tùy chọn hội thoại (CHỈ CÓ Báo cáo người này, bỏ Chặn/Bỏ chặn lần này) */}
                  <div className="relative" ref={headerMenuRef}>
                    <button
                      type="button"
                      onClick={() => setIsHeaderMenuOpen((prev) => !prev)}
                      className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition tap-bounce min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
                      title="Tùy chọn cuộc trò chuyện"
                      aria-label="Tùy chọn cuộc trò chuyện"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {isHeaderMenuOpen && (
                      <div className="absolute right-0 top-full mt-1.5 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-1.5 z-50 animate-fadeIn text-xs divide-y divide-gray-100">
                        {/* Nút đánh dấu đã cho thuê phòng cho chủ nhà */}
                        {isOwnerOfRoom && attachedRoomId && attachedRoom?.status !== 'Đã cho thuê' && (
                          <div className="py-1">
                            <button
                              type="button"
                              disabled={isTransacting}
                              onClick={() => handleMarkTransacted('room')}
                              className="w-full px-3.5 py-2.5 text-left flex items-center gap-2.5 text-emerald-700 hover:bg-emerald-50 transition cursor-pointer font-bold disabled:opacity-50"
                            >
                              <CheckCheck className="w-4 h-4 text-[#006d37] shrink-0" />
                              <span>Đánh dấu đã cho thuê phòng</span>
                            </button>
                          </div>
                        )}

                        {/* Nút đánh dấu đã bán đồ cho người bán */}
                        {isOwnerOfItem && attachedItemId && itemStatusType !== 'sold' && (
                          <div className="py-1">
                            <button
                              type="button"
                              disabled={isTransacting}
                              onClick={() => handleMarkTransacted('item')}
                              className="w-full px-3.5 py-2.5 text-left flex items-center gap-2.5 text-emerald-700 hover:bg-emerald-50 transition cursor-pointer font-bold disabled:opacity-50"
                            >
                              <CheckCheck className="w-4 h-4 text-[#006d37] shrink-0" />
                              <span>Đánh dấu đã bán món đồ</span>
                            </button>
                          </div>
                        )}

                        {/* Mục Báo cáo người này */}
                        <div className="py-1">
                          <button
                            type="button"
                            disabled={hasReportedUser}
                            onClick={() => {
                              setIsHeaderMenuOpen(false);
                              if (!currentUser) {
                                showToast('Vui lòng đăng nhập', 'Bạn cần đăng nhập để gửi báo cáo', 'warning');
                                navigate(`/dang-nhap?returnUrl=${encodeURIComponent(location.pathname + location.search)}`);
                                return;
                              }
                              if (hasReportedUser) {
                                showToast('Đã gửi báo cáo', 'Bạn đã gửi báo cáo cho người dùng này rồi.', 'info');
                                return;
                              }
                              setShowReportModal(true);
                            }}
                            className={`w-full px-3.5 py-2.5 text-left flex items-center gap-2.5 transition cursor-pointer ${
                              hasReportedUser
                                ? 'text-gray-400 bg-gray-50 cursor-not-allowed'
                                : 'text-rose-600 hover:bg-rose-50 font-medium'
                            }`}
                          >
                            <Flag className="w-4 h-4 shrink-0" />
                            <span>{hasReportedUser ? 'Đã báo cáo người này' : 'Báo cáo người này'}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
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

              {/* Thẻ ghim thông tin hỗ trợ BQT Trọ Xinh */}
              {isChatWithAdmin && (
                <div className="bg-gradient-to-r from-emerald-50 via-teal-50/50 to-emerald-50 border-b border-emerald-200/90 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-2xs shrink-0 z-10">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-900 leading-tight flex items-center gap-1.5">
                        <span>Kênh Hỗ Trợ Chính Thức Trọ Xinh</span>
                        <span className="text-[10px] text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded font-semibold border border-emerald-200">
                          CSKH 24/7
                        </span>
                      </h4>
                      <p className="text-[11px] text-emerald-900/80 leading-snug">
                        Giải đáp tìm phòng trọ, cọc an toàn, hợp đồng mẫu &amp; giải quyết sự cố, khiếu nại.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a
                      href="tel:0888110789"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#006d37] hover:bg-[#005a2e] text-white text-xs font-bold rounded-xl transition shadow-2xs tap-bounce"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Hotline: 0888 110 789</span>
                    </a>
                  </div>
                </div>
              )}

              {/* Thẻ ghim món đồ gắn kèm phía trên khung chat */}
              {!isChatWithAdmin && attachedItemId && (
                <Link
                  to={`/cho-do-cu/${attachedItemId}`}
                  className="bg-white/95 backdrop-blur-xs border-b border-emerald-100 hover:border-[#006d37]/40 px-3 py-2 sm:px-4 sm:py-2.5 flex items-center justify-between gap-2.5 shadow-2xs hover:bg-emerald-50/40 transition-all group cursor-pointer shrink-0 z-10"
                  title="Bấm để xem chi tiết món đồ"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {/* Thumbnail ảnh sản phẩm (có placeholder fallback khi ảnh lỗi) */}
                    <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
                      <img
                        src={pinnedImage || ITEM_PLACEHOLDER}
                        alt={pinnedTitle}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (target.src !== ITEM_PLACEHOLDER) {
                            target.src = ITEM_PLACEHOLDER;
                          }
                        }}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>

                    {/* Tên & Giá sản phẩm */}
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] sm:text-[10px] font-bold text-[#006d37] bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded shrink-0">
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

                  {/* Nhãn trạng thái (Đang bán / Đã bán / Đã ẩn) & Nút Trả giá & Nút xem chi tiết */}
                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    {!isOwnerOfItem && itemStatusType === 'available' && rawPrice && rawPrice > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowOfferModal(true);
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1.5 rounded-xl transition shadow-2xs tap-bounce shrink-0 cursor-pointer"
                        title="Đề xuất mức giá bạn muốn mua"
                      >
                        <Tag className="w-3.5 h-3.5 text-amber-600" />
                        <span>Trả giá</span>
                      </button>
                    )}
                    {itemStatusType === 'sold' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                        Đã bán
                      </span>
                    ) : itemStatusType === 'closed' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold text-slate-700 bg-slate-100 border border-slate-300 px-2 py-0.5 rounded-full shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                        Đã đóng
                      </span>
                    ) : itemStatusType === 'hidden' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold text-gray-600 bg-gray-100 border border-gray-300 px-2 py-0.5 rounded-full shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                        Không khả dụng
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Đang bán
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#006d37] group-hover:translate-x-0.5 transition-transform shrink-0" />
                  </div>
                </Link>
              )}

              {/* Thẻ ghim Phòng trọ gắn kèm phía trên khung chat */}
              {!isChatWithAdmin && !attachedItemId && attachedRoom && (attachedRoom.name || attachedRoom.title) && (
                <div className="bg-white/95 backdrop-blur-xs border-b border-emerald-100 hover:border-[#006d37]/40 px-3 py-2 sm:px-4 sm:py-2.5 flex items-center justify-between gap-2.5 shadow-2xs hover:bg-emerald-50/40 transition-all group shrink-0 z-10">
                  <Link
                    to={`/phong/${attachedRoom.id || attachedRoomId}`}
                    className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                    title="Bấm để xem chi tiết phòng trọ"
                  >
                    {/* Thumbnail ảnh phòng */}
                    <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
                      <img
                        src={attachedRoom.images?.[0] || '/images/room-placeholder.jpg'}
                        alt={attachedRoom.name || attachedRoom.title || 'Phòng trọ'}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          if (target.src !== ITEM_PLACEHOLDER) {
                            target.src = ITEM_PLACEHOLDER;
                          }
                        }}
                      />
                    </div>

                    {/* Tên & Giá phòng */}
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] sm:text-[10px] font-bold text-[#006d37] bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded shrink-0">
                          Phòng trọ
                        </span>
                        <h4 className="text-xs sm:text-sm font-bold text-gray-900 truncate group-hover:text-[#006d37] transition-colors">
                          {attachedRoom.name || attachedRoom.title || 'Phòng trọ cho thuê'}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-black text-[#006d37]">
                          {formatCurrency(attachedRoom.price || 0)}/tháng
                        </span>
                        {attachedRoom.district && (
                          <span className="text-[11px] text-gray-500 truncate hidden sm:inline">
                            • {attachedRoom.district}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>

                  {/* Nút đặt lịch hẹn xem phòng & Xem chi tiết */}
                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <Link
                      to={`/dat-lich/${attachedRoom.id || attachedRoomId}`}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-[#006d37] hover:bg-[#005a2e] px-2.5 py-1.5 rounded-xl transition shadow-2xs tap-bounce"
                      title="Đặt lịch hẹn xem phòng trực tiếp"
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Hẹn xem phòng</span>
                    </Link>
                    <Link
                      to="/bien-ban-dat-coc"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-1.5 rounded-xl transition shadow-2xs"
                      title="Xem mẫu biên bản đặt cọc giữ chỗ pháp lý"
                    >
                      <FileCheck className="w-3.5 h-3.5 text-[#006d37]" />
                      <span className="hidden md:inline">Mẫu cọc</span>
                    </Link>
                    <Link
                      to={`/phong/${attachedRoom.id || attachedRoomId}`}
                      className="p-1.5 text-gray-400 group-hover:text-[#006d37] group-hover:translate-x-0.5 transition-transform"
                      title="Xem chi tiết"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              )}

              {/* Thẻ ghim Bạn ở ghép gắn kèm phía trên khung chat */}
              {!isChatWithAdmin && !attachedItemId && (!attachedRoom || (!attachedRoom.name && !attachedRoom.title)) && roommatePost && (
                <div className="bg-white/95 backdrop-blur-xs border-b border-indigo-100 hover:border-indigo-300 px-3 py-2 sm:px-4 sm:py-2.5 flex items-center justify-between gap-2.5 shadow-2xs hover:bg-indigo-50/30 transition-all group shrink-0 z-10">
                  <Link
                    to={`/roommate/${roommatePost.id}`}
                    className="flex items-center gap-2.5 min-w-0 flex-1 cursor-pointer"
                    title="Bấm để xem chi tiết bài đăng tìm bạn ở ghép"
                  >
                    {/* Thumbnail ảnh đại diện */}
                    <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-xl overflow-hidden bg-indigo-50 border border-indigo-200 shrink-0">
                      <img
                        src={roommatePost.userAvatar || '/images/user-avatar.jpg'}
                        alt={roommatePost.userName || 'Bạn cùng phòng'}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/images/user-avatar.jpg';
                        }}
                      />
                    </div>

                    {/* Tên, trường & ngân sách */}
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] sm:text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded shrink-0">
                          Tìm ở ghép
                        </span>
                        <h4 className="text-xs sm:text-sm font-bold text-gray-900 truncate group-hover:text-indigo-700 transition-colors">
                          {roommatePost.userName || roommatePost.title || 'Tìm bạn ở ghép'}
                        </h4>
                        {roommatePost.userGender && (
                          <span className="text-[9px] sm:text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.2 rounded font-medium shrink-0">
                            {roommatePost.userGender}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-black text-indigo-600">
                          {formatCurrency(roommatePost.budgetShare || 0)}/tháng
                        </span>
                        {roommatePost.userSchool && (
                          <span className="text-[11px] text-gray-500 truncate hidden sm:inline">
                            • {roommatePost.userSchool}
                          </span>
                        )}
                        {roommatePost.district && (
                          <span className="text-[11px] text-gray-400 truncate hidden md:inline">
                            • {roommatePost.district}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>

                  {/* Nút Xem bài đăng & Xem chi tiết */}
                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <Link
                      to={`/roommate/${roommatePost.id}`}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2.5 py-1.5 rounded-xl transition shadow-2xs tap-bounce"
                      title="Xem bài đăng tìm bạn ở ghép"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Xem bài đăng</span>
                    </Link>
                    <Link
                      to={`/roommate/${roommatePost.id}`}
                      className="p-1.5 text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-transform"
                      title="Xem chi tiết"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              )}

              {/* Vùng hiển thị tin nhắn (Scroll Area) */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {/* Tin nhắn hệ thống hướng dẫn an toàn ở đầu hội thoại món đồ */}
                {attachedItemId && (
                  <div className="flex justify-center my-1.5 w-full">
                    <div className="bg-amber-50 border border-amber-200 text-amber-900 text-xs px-3.5 py-1.5 rounded-full shadow-2xs max-w-[92%] sm:max-w-[85%] text-center flex items-center justify-center gap-1.5 animate-fadeIn">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="font-medium text-xs">
                        Nên gặp ở nơi công cộng trong trường và kiểm tra đồ trước khi chuyển tiền.
                      </span>
                    </div>
                  </div>
                )}

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

                    const isImage = (msg as any).type === 'image' || (!msg.content?.includes('\n') && (/^https?:\/\/.*\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(msg.content?.trim() || '') || msg.content?.startsWith('data:image/')));

                    let offerData: any = null;
                    if (msg.content && msg.content.includes('"type":"offer"')) {
                      try {
                        const parsed = JSON.parse(msg.content);
                        if (parsed.type === 'offer') offerData = parsed;
                      } catch {}
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
                            {offerData ? (
                              <div className="w-fit">
                                {renderOfferCard(offerData, isMe)}
                                <div className="flex items-center justify-end gap-1.5 mt-1 text-[10px] text-gray-400">
                                  <span>{timeStr}</span>
                                  {msg.status === 'sending' ? (
                                    <Clock className="w-2.5 h-2.5 animate-spin text-gray-400" />
                                  ) : (
                                    <CheckCheck className="w-3 h-3 text-[#006d37]" />
                                  )}
                                </div>
                              </div>
                            ) : isImage ? (
                              <div className="w-fit">
                                <div
                                  onClick={() => setLightboxImage(msg.content)}
                                  className="relative rounded-2xl overflow-hidden cursor-pointer group/img max-w-[240px] sm:max-w-xs shadow-xs border border-gray-200"
                                  title="Bấm để xem ảnh phóng to"
                                >
                                  <img
                                    src={msg.content}
                                    alt="Ảnh đính kèm"
                                    className="w-full max-h-64 object-cover rounded-2xl group-hover/img:scale-102 transition-transform duration-200"
                                  />
                                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white">
                                    <Maximize2 className="w-5 h-5 drop-shadow" />
                                  </div>
                                </div>
                                <div className="flex items-center justify-end gap-1.5 mt-1 text-[10px] text-gray-400">
                                  <span>{timeStr}</span>
                                  {msg.status === 'sending' ? (
                                    <Clock className="w-2.5 h-2.5 animate-spin text-gray-400" />
                                  ) : (
                                    <CheckCheck className="w-3 h-3 text-[#006d37]" />
                                  )}
                                </div>
                              </div>
                            ) : (
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
                            )}
                          </div>
                        ) : (
                          /* Phần người nhận / đối phương gửi: Nằm bên TRÁI, có avatar + tên cụ thể + bong bóng trắng + thời gian + báo cáo */
                          (() => {
                            const canReportThisMessage = Boolean(msg.id && msg.sender_id && !isMe);
                            const isMessageReported = Boolean(msg.id && reportedMessageIds.has(msg.id));

                            return (
                              <div className="flex items-start gap-2 max-w-[85%] sm:max-w-[70%] group relative">
                                <img
                                  src={msgSenderAvatar}
                                  alt={msgSenderName}
                                  className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-gray-200 mt-1"
                                />
                                <div className="flex flex-col items-start flex-1 min-w-0">
                                  <span className="text-[11px] font-bold text-gray-800 ml-1 mb-1 truncate">
                                    {msgSenderName}
                                  </span>
                                  <div className="flex items-center gap-1.5 w-full">
                                    <div
                                      onTouchStart={(e) => canReportThisMessage && !isMessageReported && handleTouchStart(e, msg)}
                                      onTouchMove={handleTouchMove}
                                      onTouchEnd={handleTouchEnd}
                                      onTouchCancel={handleTouchEnd}
                                      onContextMenu={(e) => {
                                        if (canReportThisMessage) e.preventDefault();
                                      }}
                                      className={`rounded-2xl rounded-tl-xs shadow-2xs w-fit select-none active:scale-[0.99] transition-transform ${
                                        offerData || isImage ? '' : 'bg-white text-gray-900 border border-gray-200 px-4 py-2.5'
                                      }`}
                                      title={
                                        isMessageReported
                                          ? 'Tin nhắn này đã được báo cáo'
                                          : canReportThisMessage
                                          ? 'Nhấn giữ trên điện thoại hoặc di chuột để báo cáo tin nhắn này'
                                          : undefined
                                      }
                                    >
                                      {offerData ? (
                                        renderOfferCard(offerData, isMe)
                                      ) : isImage ? (
                                        <div
                                          onClick={() => setLightboxImage(msg.content)}
                                          className="relative rounded-2xl overflow-hidden cursor-pointer group/img max-w-[240px] sm:max-w-xs shadow-xs border border-gray-200"
                                          title="Bấm để xem ảnh phóng to"
                                        >
                                          <img
                                            src={msg.content}
                                            alt="Ảnh đính kèm"
                                            className="w-full max-h-64 object-cover rounded-2xl group-hover/img:scale-102 transition-transform duration-200"
                                          />
                                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white">
                                            <Maximize2 className="w-5 h-5 drop-shadow" />
                                          </div>
                                        </div>
                                      ) : (
                                        <p className="whitespace-pre-wrap break-words text-xs leading-relaxed select-text">
                                          {msg.content}
                                        </p>
                                      )}
                                      <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-gray-400">
                                        <span>{timeStr}</span>
                                      </div>
                                    </div>

                                    {/* Dấu hiệu Đã báo cáo hoặc Nút icon Flag */}
                                    {isMessageReported ? (
                                      <span
                                        className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-500 bg-rose-50 border border-rose-200/80 px-2 py-0.5 rounded-lg select-none shrink-0"
                                        title="Bạn đã gửi báo cáo cho tin nhắn này"
                                      >
                                        <Flag className="w-3 h-3 fill-rose-500 text-rose-500" />
                                        <span>Đã báo cáo</span>
                                      </span>
                                    ) : canReportThisMessage ? (
                                      <button
                                        type="button"
                                        onClick={() => handleTriggerReportMessage(msg)}
                                        className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer shrink-0"
                                        title="Báo cáo tin nhắn này"
                                        aria-label="Báo cáo tin nhắn này"
                                      >
                                        <Flag className="w-3.5 h-3.5" />
                                      </button>
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                            );
                          })()
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
              ) : !canMessageOther ? (
                <div
                  className="p-4 bg-gray-50 border-t border-gray-200 text-center space-y-1"
                  style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))' }}
                >
                  <p className="text-xs text-gray-500 font-medium">
                    Không thể gửi tin nhắn trong cuộc trò chuyện này.
                  </p>
                </div>
              ) : (
                <>
                  {/* 6. Gợi ý tin nhắn phản hồi nhanh: Không tràn ngang trên mobile, có thể xuống dòng (flex-wrap) */}
                  {shouldShowQuickReplies && (
                    <div className="px-3 py-2 bg-white border-t border-gray-100 flex flex-wrap items-center gap-1.5 sm:gap-2 animate-fadeIn">
                      <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wide shrink-0 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-[#006d37]" /> Gợi ý:
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 flex-1">
                        {currentQuickReplies.map((r, i) => (
                          <button
                            key={i}
                            type="button"
                            disabled={isSendingQuickReply}
                            onClick={() => handleQuickReply(r)}
                            className="text-xs px-2.5 sm:px-3 py-1.5 min-h-[32px] bg-emerald-50/80 hover:bg-[#006d37] text-[#006d37] hover:text-white border border-emerald-200/80 rounded-xl transition-all font-medium tap-bounce cursor-pointer shadow-2xs disabled:opacity-50 disabled:cursor-not-allowed whitespace-normal text-left sm:text-center leading-tight"
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Hộp nhập tin nhắn */}
                  <form
                    onSubmit={handleSend}
                    className="p-2.5 bg-white border-t border-gray-200 flex items-center gap-1.5 sm:gap-2"
                    style={{ paddingBottom: 'max(0.625rem, env(safe-area-inset-bottom, 0px))' }}
                  >
                    {/* Input chọn ảnh ẩn */}
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadAndSendImage(file);
                      }}
                    />

                    {/* Nút đính kèm ảnh */}
                    <button
                      type="button"
                      disabled={isUploadingImage}
                      onClick={() => imageInputRef.current?.click()}
                      className="p-2 text-gray-500 hover:text-[#006d37] hover:bg-emerald-50 rounded-2xl transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                      title="Gửi hình ảnh thực tế"
                      aria-label="Gửi hình ảnh"
                    >
                      {isUploadingImage ? (
                        <Loader2 className="w-5 h-5 animate-spin text-[#006d37]" />
                      ) : (
                        <Camera className="w-5 h-5" />
                      )}
                    </button>

                    <input
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onPaste={(e) => {
                        const items = e.clipboardData?.items;
                        if (items) {
                          for (let i = 0; i < items.length; i++) {
                            if (items[i].type.startsWith('image/')) {
                              const file = items[i].getAsFile();
                              if (file) {
                                e.preventDefault();
                                handleUploadAndSendImage(file);
                                break;
                              }
                            }
                          }
                        }
                      }}
                      placeholder="Nhập tin nhắn (hỗ trợ dán ảnh Ctrl+V)..."
                      className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-3.5 sm:px-4 py-2.5 min-h-[44px] text-base sm:text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#006d37] touch-manipulation"
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

      {/* Report User Modal */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        targetTitle={`Người dùng: ${otherName}`}
        targetId={otherId || ''}
        targetType="nguoi_dung"
        targetOwnerId={otherId || ''}
        onSuccess={() => setHasReportedUser(true)}
      />

      {/* Report Message Modal */}
      {reportingMessage && (
        <ReportModal
          isOpen={Boolean(reportingMessage)}
          onClose={() => setReportingMessage(null)}
          targetTitle={`Tin nhắn: "${formatMessagePreview(reportingMessage)}"`}
          targetId={reportingMessage.id}
          targetType="tin_nhan"
          targetOwnerId={reportingMessage.sender_id}
          contentSnapshot={reportingMessage.content || (reportingMessage.type === 'image' ? '[Hình ảnh]' : '')}
          onSuccess={() => {
            if (reportingMessage?.id) {
              setReportedMessageIds((prev) => new Set(prev).add(reportingMessage.id));
            }
            setReportingMessage(null);
            showToast('Đã gửi báo cáo tin nhắn', 'Cảm ơn bạn đã phản ánh tin nhắn vi phạm.', 'success');
          }}
        />
      )}

      {/* Modal Đề Xuất Trả Giá (Chợ đồ cũ) */}
      {showOfferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 rounded-xl text-amber-700">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Đề xuất trả giá</h3>
                  <p className="text-xs text-gray-500 line-clamp-1">{pinnedTitle}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowOfferModal(false)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-emerald-50/60 p-3 rounded-2xl border border-emerald-100 flex justify-between items-center text-xs">
              <span className="text-gray-600">Giá người bán niêm yết:</span>
              <span className="font-bold text-[#006d37]">{formatCurrency(rawPrice || 0)}</span>
            </div>

            <form onSubmit={handleSendOffer} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Số tiền bạn muốn trả (VND):
                </label>
                <input
                  type="text"
                  autoFocus
                  value={offerPriceInput}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setOfferPriceInput(val ? parseInt(val, 10).toLocaleString('vi-VN') : '');
                  }}
                  placeholder="Ví dụ: 150.000"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-base font-bold text-[#006d37] focus:outline-none focus:ring-2 focus:ring-[#006d37]"
                />
              </div>

              {rawPrice && rawPrice > 0 && (
                <div className="flex gap-2">
                  {[0.9, 0.85, 0.8].map((ratio) => {
                    const calcPrice = Math.round((rawPrice * ratio) / 1000) * 1000;
                    const percent = Math.round((1 - ratio) * 100);
                    return (
                      <button
                        key={ratio}
                        type="button"
                        onClick={() => setOfferPriceInput(calcPrice.toLocaleString('vi-VN'))}
                        className="flex-1 py-1 px-2 text-[11px] font-semibold bg-gray-100 hover:bg-emerald-100 hover:text-[#006d37] rounded-xl transition-colors cursor-pointer"
                      >
                        -{percent}%
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="flex-1 rounded-2xl cursor-pointer"
                  onClick={() => setShowOfferModal(false)}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1 rounded-2xl cursor-pointer"
                  disabled={!offerPriceInput.trim()}
                >
                  Gửi trả giá
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Phóng To Ảnh (Lightbox) */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-fadeIn"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
              <a
                href={lightboxImage}
                download="anh_chat.jpg"
                target="_blank"
                rel="noreferrer"
                className="p-2 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors cursor-pointer"
                title="Mở ảnh kích thước gốc"
              >
                <Download className="w-5 h-5" />
              </a>
              <button
                type="button"
                onClick={() => setLightboxImage(null)}
                className="p-2 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors cursor-pointer"
                title="Đóng (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <img
              src={lightboxImage}
              alt="Ảnh phóng to"
              className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
            />
          </div>
        </div>
      )}
    </div>
  );
};

