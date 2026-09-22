import { supabase, isSupabaseConfigured } from "../supabase";
import { Conversation, Message } from "../../types";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const KNOWN_DEMO_UUIDS: Record<string, string> = {
  demo_admin_uuid: "00000000-0000-0000-0000-000000000001",
  demo_admin_troxinh: "00000000-0000-0000-0000-000000000001",
  usr_admin_quan66934: "00000000-0000-0000-0000-000000000001",
  "admin@troxinh.vn": "00000000-0000-0000-0000-000000000001",

  demo_owner_uuid: "00000000-0000-0000-0000-000000000002",
  demo_owner_troxinh: "00000000-0000-0000-0000-000000000002",
  user_owner_1: "00000000-0000-0000-0000-000000000002",
  "chutro@troxinh.vn": "00000000-0000-0000-0000-000000000002",

  demo_renter_uuid: "00000000-0000-0000-0000-000000000003",
  demo_renter_troxinh: "00000000-0000-0000-0000-000000000003",
  user_renter_1: "00000000-0000-0000-0000-000000000003",
  user_renter_2: "00000000-0000-0000-0000-000000000003",
  "nguoithue@troxinh.vn": "00000000-0000-0000-0000-000000000003",
};

export const KNOWN_USER_NAMES: Record<
  string,
  { name: string; avatar: string }
> = {
  "00000000-0000-0000-0000-000000000001": {
    name: "Ban Quản Trị Trọ Xinh",
    avatar: "/images/user-avatar.jpg",
  },
  "00000000-0000-0000-0000-000000000002": {
    name: "Trần Quốc Tuấn (Chủ Trọ)",
    avatar: "/images/user-avatar.jpg",
  },
  "00000000-0000-0000-0000-000000000003": {
    name: "Nguyễn Văn An (Người Thuê)",
    avatar: "/images/user-avatar.jpg",
  },
  demo_admin_uuid: {
    name: "Ban Quản Trị Trọ Xinh",
    avatar: "/images/user-avatar.jpg",
  },
  demo_owner_uuid: {
    name: "Trần Quốc Tuấn (Chủ Trọ)",
    avatar: "/images/user-avatar.jpg",
  },
  demo_renter_uuid: {
    name: "Nguyễn Văn An (Người Thuê)",
    avatar: "/images/user-avatar.jpg",
  },
  user_owner_1: {
    name: "Trần Quốc Tuấn (Chủ Trọ)",
    avatar: "/images/user-avatar.jpg",
  },
  user_renter_1: {
    name: "Nguyễn Văn An (Người Thuê)",
    avatar: "/images/user-avatar.jpg",
  },
};

const LOCAL_CONVS_KEY = "troxinh_local_conversations";
const LOCAL_MSGS_KEY = "troxinh_local_messages";
const CONV_META_PREFIX = "troxinh_conv_meta_";

const inMemoryStore = new Map<string, string>();

function safeGetStorage(key: string): string | null {
  try {
    if (typeof localStorage !== "undefined" && localStorage) {
      return localStorage.getItem(key);
    }
  } catch {}
  return inMemoryStore.get(key) || null;
}

function safeSetStorage(key: string, value: string): void {
  try {
    if (typeof localStorage !== "undefined" && localStorage) {
      localStorage.setItem(key, value);
    }
  } catch {}
  inMemoryStore.set(key, value);
}

export interface ConversationMeta {
  other_name?: string;
  other_avatar?: string;
  last_item_id?: string;
  last_item_name?: string;
  last_item_price?: number;
  discussed_items?: string[];
  [key: string]: any;
}

export function clearLocalChatCache(): void {
  try {
    if (typeof localStorage !== "undefined" && localStorage) {
      localStorage.removeItem(LOCAL_CONVS_KEY);
    }
  } catch {}
  inMemoryStore.clear();
}

export function getConversationMeta(
  convId: string,
): ConversationMeta | null {
  try {
    const raw = safeGetStorage(`${CONV_META_PREFIX}${convId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveConversationMeta(
  convId: string,
  meta: Partial<ConversationMeta>,
) {
  try {
    const existing = getConversationMeta(convId) || {};
    const merged = { ...existing, ...meta };
    safeSetStorage(`${CONV_META_PREFIX}${convId}`, JSON.stringify(merged));
  } catch {}
}

function getLocalConversations(): Conversation[] {
  try {
    const raw = safeGetStorage(LOCAL_CONVS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalConversation(conv: Conversation) {
  try {
    const list = getLocalConversations().filter((c) => c.id !== conv.id);
    list.unshift(conv);
    safeSetStorage(LOCAL_CONVS_KEY, JSON.stringify(list));
    if (conv.other_name || conv.other_avatar) {
      saveConversationMeta(conv.id, {
        other_name: conv.other_name,
        other_avatar: conv.other_avatar,
      });
    }
  } catch {}
}

function getLocalMessages(conversationId: string): Message[] {
  try {
    const raw = safeGetStorage(`${LOCAL_MSGS_KEY}_${conversationId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalMessage(msg: Message) {
  try {
    const list = getLocalMessages(msg.conversation_id);
    list.push(msg);
    safeSetStorage(
      `${LOCAL_MSGS_KEY}_${msg.conversation_id}`,
      JSON.stringify(list),
    );
  } catch {}
}

/**
 * Kiểm tra xem 2 ID người dùng có trỏ về cùng một tài khoản hay không
 * (Bao gồm chuẩn hóa giữa UUID trong database và các ID demo/mock)
 */
export function isSameUserId(
  id1?: string | null,
  id2?: string | null,
): boolean {
  if (!id1 || !id2) return false;
  const clean1 = id1.trim();
  const clean2 = id2.trim();
  if (clean1 === clean2) return true;

  const DEMO_GROUPS: string[][] = [
    [
      "00000000-0000-0000-0000-000000000001",
      "demo_admin_uuid",
      "demo_admin_troxinh",
      "usr_admin_quan66934",
      "admin@troxinh.vn",
    ],
    [
      "00000000-0000-0000-0000-000000000002",
      "demo_owner_uuid",
      "demo_owner_troxinh",
      "user_owner_1",
      "chutro@troxinh.vn",
    ],
    [
      "00000000-0000-0000-0000-000000000003",
      "demo_renter_uuid",
      "demo_renter_troxinh",
      "user_renter_1",
      "user_renter_2",
      "nguoithue@troxinh.vn",
    ],
  ];

  for (const group of DEMO_GROUPS) {
    if (group.includes(clean1) && group.includes(clean2)) {
      return true;
    }
  }

  return false;
}

/**
 * Chuẩn hóa ID người dùng thành UUID hợp lệ để không gây lỗi SQL syntax trong PostgreSQL
 */
export async function resolveUserIdToUuid(userId: string): Promise<string> {
  if (!userId) return "";
  const trimmed = userId.trim();

  if (UUID_REGEX.test(trimmed)) {
    return trimmed;
  }

  if (KNOWN_DEMO_UUIDS[trimmed]) {
    return KNOWN_DEMO_UUIDS[trimmed];
  }

  if (isSupabaseConfigured) {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .or(`firebase_uid.eq.${trimmed},email.eq.${trimmed}`)
        .maybeSingle();

      if (profile?.id && UUID_REGEX.test(profile.id)) {
        return profile.id;
      }
    } catch (err) {
      console.warn(
        "[MessagesAPI] Không thể tra cứu profile UUID cho userId:",
        trimmed,
        err,
      );
    }
  }

  // Fallback an toàn về ID demo renter để không làm gãy câu lệnh SQL
  return "00000000-0000-0000-0000-000000000003";
}

/**
 * Lấy hoặc khởi tạo hội thoại duy nhất giữa 2 người dùng và phòng trọ
 * Luôn trả về conversation_id dạng UUID hợp lệ
 */
export async function getOrCreateConversation(
  tenantId: string,
  landlordId: string,
  roomId?: string,
  extra?: {
    otherName?: string;
    otherAvatar?: string;
    roomTitle?: string;
  },
): Promise<string> {
  if (!tenantId || !landlordId) {
    throw new Error("Thiếu thông tin người tham gia hội thoại.");
  }

  const cleanTenantId = await resolveUserIdToUuid(tenantId);
  const cleanLandlordId = await resolveUserIdToUuid(landlordId);

  if (cleanTenantId === cleanLandlordId) {
    throw new Error("Không thể tạo cuộc trò chuyện với chính mình.");
  }

  // Chỉ gắn room_id khi có định dạng UUID chuẩn hợp lệ
  const validRoomId =
    roomId && UUID_REGEX.test(roomId.trim()) ? roomId.trim() : null;

  // 1. Kiểm tra hội thoại đã tồn tại giữa 2 participant trong Supabase
  let existingId: string | null = null;
  if (isSupabaseConfigured) {
    try {
      let query = supabase
        .from("conversations")
        .select("id")
        .or(
          `and(participant_1.eq.${cleanTenantId},participant_2.eq.${cleanLandlordId}),and(participant_1.eq.${cleanLandlordId},participant_2.eq.${cleanTenantId})`,
        );

      if (validRoomId) {
        query = query.eq("room_id", validRoomId);
      }

      const { data: existing, error: queryErr } = await query.maybeSingle();
      if (!queryErr && existing?.id) {
        existingId = existing.id;
      }
    } catch (err) {
      console.warn(
        "[MessagesAPI] Lỗi khi tìm cuộc trò chuyện trên Supabase:",
        err,
      );
    }
  }

  if (existingId) {
    if (extra?.otherName || extra?.otherAvatar) {
      saveConversationMeta(existingId, {
        other_name: extra.otherName,
        other_avatar: extra.otherAvatar,
      });
    }
    return existingId;
  }

  // 2. Thử tạo mới trên Supabase
  if (isSupabaseConfigured) {
    try {
      const { data: created, error: insertErr } = await supabase
        .from("conversations")
        .insert({
          participant_1: cleanTenantId,
          participant_2: cleanLandlordId,
          room_id: validRoomId,
          last_message: "Bắt đầu cuộc trò chuyện...",
          last_message_at: new Date().toISOString(),
        })
        .select("id")
        .maybeSingle();

      if (!insertErr && created?.id) {
        if (extra?.otherName || extra?.otherAvatar) {
          saveConversationMeta(created.id, {
            other_name: extra.otherName,
            other_avatar: extra.otherAvatar,
          });
        }
        return created.id;
      }
      if (insertErr) {
        console.warn(
          "[MessagesAPI] Không thể insert trực tiếp Supabase (có thể do RLS/Auth):",
          insertErr.message,
        );
      }
    } catch (insertException) {
      console.warn(
        "[MessagesAPI] Ngoại lệ khi tạo cuộc trò chuyện:",
        insertException,
      );
    }
  }

  // 3. Fallback an toàn: Khởi tạo conversation ID chuẩn UUID
  // Đảm bảo người dùng luôn điều hướng mượt mà vào giao diện tin nhắn
  const fallbackId =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, "0")}`;

  // Tải trước thông tin hồ sơ đối phương để khung chat hiển thị tên và avatar đầy đủ
  let otherProfile: any = null;
  if (isSupabaseConfigured) {
    try {
      const { data: prof } = await supabase
        .from("profiles")
        .select("id, full_name, name, avatar_url, app_role, phone")
        .eq("id", cleanLandlordId)
        .maybeSingle();
      otherProfile = prof;
    } catch {}
  }

  const fallbackConversation: Conversation = {
    id: fallbackId,
    participant_1: cleanTenantId,
    participant_2: cleanLandlordId,
    room_id: validRoomId || undefined,
    last_message: "Bắt đầu cuộc trò chuyện...",
    last_message_at: new Date().toISOString(),
    unread_count_p1: 0,
    unread_count_p2: 0,
    created_at: new Date().toISOString(),
    other_name:
      extra?.otherName ||
      otherProfile?.full_name ||
      KNOWN_USER_NAMES[cleanLandlordId]?.name ||
      "Người dùng Trọ Xinh",
    other_avatar:
      extra?.otherAvatar ||
      otherProfile?.avatar_url ||
      KNOWN_USER_NAMES[cleanLandlordId]?.avatar ||
      "/images/user-avatar.jpg",
    p1: undefined,
    p2: {
      id: cleanLandlordId,
      full_name:
        extra?.otherName ||
        otherProfile?.full_name ||
        KNOWN_USER_NAMES[cleanLandlordId]?.name ||
        "Người dùng Trọ Xinh",
      name:
        extra?.otherName ||
        otherProfile?.name ||
        KNOWN_USER_NAMES[cleanLandlordId]?.name ||
        "Người dùng Trọ Xinh",
      avatar_url:
        extra?.otherAvatar ||
        otherProfile?.avatar_url ||
        KNOWN_USER_NAMES[cleanLandlordId]?.avatar ||
        "/images/user-avatar.jpg",
      phone: otherProfile?.phone,
    },
  };

  saveLocalConversation(fallbackConversation);
  return fallbackId;
}

/**
 * Lấy danh sách các cuộc trò chuyện của người dùng hiện tại
 */
export async function getConversations(
  userId: string,
): Promise<Conversation[]> {
  if (!userId) return [];
  const cleanUserId = await resolveUserIdToUuid(userId);
  let serverList: Conversation[] = [];

  if (isSupabaseConfigured && cleanUserId) {
    try {
      const { data, error } = await supabase
        .from("conversations")
        .select(
          `
          id,
          participant_1,
          participant_2,
          room_id,
          last_message,
          last_message_at,
          unread_count_p1,
          unread_count_p2,
          created_at,
          rooms(id, name, price),
          p1:profiles!participant_1(id, full_name, name, avatar_url, app_role, phone),
          p2:profiles!participant_2(id, full_name, name, avatar_url, app_role, phone)
        `,
        )
        .or(`participant_1.eq.${cleanUserId},participant_2.eq.${cleanUserId}`)
        .order("last_message_at", { ascending: false, nullsFirst: false });

      if (!error && data) {
        serverList = data as unknown as Conversation[];
      }
    } catch (error) {
      console.warn("[MessagesAPI] getConversations error:", error);
    }
  }

  // Kết hợp an toàn với các cuộc trò chuyện cục bộ trong phiên
  const localList = getLocalConversations().filter(
    (c) =>
      isSameUserId(c.participant_1, cleanUserId) ||
      isSameUserId(c.participant_2, cleanUserId),
  );

  const convMap = new Map<string, Conversation>();
  localList.forEach((c) => convMap.set(c.id, c));
  serverList.forEach((c) => {
    const existing = convMap.get(c.id);
    convMap.set(c.id, {
      ...c,
      other_name: c.other_name || existing?.other_name,
      other_avatar: c.other_avatar || existing?.other_avatar,
      p1: c.p1 || existing?.p1,
      p2: c.p2 || existing?.p2,
    });
  });

  const merged = Array.from(convMap.values()).map((c) => {
    const savedMeta = getConversationMeta(c.id);
    const isMe = isSameUserId(c.participant_1, cleanUserId);
    const otherId = isMe ? c.participant_2 : c.participant_1;
    const known = otherId ? KNOWN_USER_NAMES[otherId] : null;
    const other = isMe ? c.p2 : c.p1;

    const resolvedName =
      c.other_name ||
      savedMeta?.other_name ||
      other?.full_name ||
      other?.name ||
      known?.name ||
      (isMe ? "Chủ trọ / Người đăng" : "Khách liên hệ");

    const resolvedAvatar =
      c.other_avatar ||
      savedMeta?.other_avatar ||
      other?.avatar_url ||
      known?.avatar ||
      "/images/user-avatar.jpg";

    return {
      ...c,
      other_name: resolvedName,
      other_avatar: resolvedAvatar,
    };
  });

  return merged.sort(
    (a, b) =>
      new Date(b.last_message_at || b.created_at || 0).getTime() -
      new Date(a.last_message_at || a.created_at || 0).getTime(),
  );
}

/**
 * Lấy lịch sử tin nhắn của một cuộc trò chuyện
 */
export async function getMessages(conversationId: string): Promise<Message[]> {
  if (!conversationId) return [];

  let serverMessages: Message[] = [];
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select(
          `
          id,
          conversation_id,
          sender_id,
          content,
          is_read,
          created_at,
          sender:profiles!sender_id(id, full_name, name, avatar_url)
        `,
        )
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (!error && data) {
        serverMessages = data as unknown as Message[];
      }
    } catch (error) {
      console.warn("[MessagesAPI] getMessages error:", error);
    }
  }

  const localMessages = getLocalMessages(conversationId);
  const msgMap = new Map<string, Message>();
  localMessages.forEach((m) => msgMap.set(m.id, m));
  serverMessages.forEach((m) => msgMap.set(m.id, m));

  return Array.from(msgMap.values()).sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
}

/**
 * Gửi tin nhắn mới vào cuộc trò chuyện
 */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string,
  senderName?: string,
  messageId?: string,
): Promise<Message> {
  const cleanContent = content.trim();
  if (!cleanContent) {
    throw new Error("Nội dung tin nhắn không được để trống.");
  }

  const cleanSenderId = await resolveUserIdToUuid(senderId);
  const newMsgId =
    messageId ||
    (typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `msg_${Date.now()}`);

  const msgPayload: Message = {
    id: newMsgId,
    conversation_id: conversationId,
    sender_id: cleanSenderId,
    content: cleanContent,
    is_read: false,
    created_at: new Date().toISOString(),
    status: "sent",
  };

  let savedMessage: Message = msgPayload;

  // 1. Thử gửi lên Supabase
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from("messages")
        .upsert(
          {
            id: newMsgId,
            conversation_id: conversationId,
            sender_id: cleanSenderId,
            content: cleanContent,
            is_read: false,
          },
          { onConflict: "id" },
        )
        .select(
          `
          id,
          conversation_id,
          sender_id,
          content,
          is_read,
          created_at,
          sender:profiles!sender_id(id, full_name, name, avatar_url)
        `,
        )
        .maybeSingle();

      if (!error && data) {
        savedMessage = data as unknown as Message;
        // Cập nhật tin nhắn gần nhất vào bảng conversations
        supabase
          .from("conversations")
          .update({
            last_message: cleanContent,
            last_message_at: new Date().toISOString(),
          })
          .eq("id", conversationId)
          .then();
      }
    } catch (error) {
      console.warn("[MessagesAPI] sendMessage Supabase error:", error);
    }
  }

  // 2. Fallback lưu cục bộ trong phiên nếu Supabase RLS từ chối
  saveLocalMessage(savedMessage);

  // 3. Tự động gửi thông báo Realtime cho người nhận
  try {
    const localConvs = getLocalConversations();
    const conv = localConvs.find((c) => c.id === conversationId);
    let receiverId = "";
    if (conv) {
      receiverId = isSameUserId(conv.participant_1, cleanSenderId)
        ? conv.participant_2
        : conv.participant_1;
    }

    if (
      isSupabaseConfigured &&
      receiverId &&
      !isSameUserId(receiverId, cleanSenderId)
    ) {
      supabase
        .from("notifications")
        .insert({
          user_id: receiverId,
          title: `Tin nhắn từ ${senderName || "Người dùng"} 💬`,
          body:
            cleanContent.length > 80
              ? cleanContent.slice(0, 80) + "..."
              : cleanContent,
          type: "chat_message",
          cta_url: `/tin-nhan/${conversationId}`,
          cta_label: "Trả lời ngay",
          is_read: false,
        })
        .then();
    }
  } catch (notifErr) {
    console.warn("[MessagesAPI] Lỗi gửi thông báo tin nhắn:", notifErr);
  }

  return savedMessage;
}

export interface FindOrCreateConversationOptions {
  itemName?: string;
  itemPrice?: number;
  itemImage?: string;
  buyerName?: string;
  sellerName?: string;
  sellerAvatar?: string;
  initialMessage?: string;
}

export interface FindOrCreateConversationResult {
  id: string;
  conversationId: string;
  isNew: boolean;
  contextInserted: boolean;
  itemId: string;
  conversation?: Conversation;
  toString: () => string;
  valueOf: () => string;
}

export function formatItemContextMessage(
  itemName?: string,
  price?: number,
  _itemId?: string,
): string {
  const name = itemName ? `"${itemName}"` : "món đồ thanh lý của bạn";
  const priceText =
    price !== undefined
      ? price === 0
        ? " (Đồ tặng miễn phí)"
        : ` (${price.toLocaleString("vi-VN")} đ)`
      : "";
  return `👋 Xin chào! Tôi quan tâm đến ${name}${priceText}. Món này còn không bạn?`;
}

/**
 * Tìm hoặc khởi tạo cuộc hội thoại cho Chợ đồ cũ sinh viên trong hệ thống chat chung:
 * - Đã có hội thoại giữa người mua và người bán về món đồ đó -> trả về hội thoại cũ.
 * - Chưa có hội thoại giữa 2 người -> tạo mới cuộc trò chuyện và chèn tin nhắn ngữ cảnh món đồ.
 * - Đã có hội thoại giữa 2 người nhưng hỏi về món khác -> giữ nguyên hội thoại chung (theo cấu trúc cặp người dùng hiện có) và chèn thêm tin nhắn ngữ cảnh cho món đồ mới.
 * - Từ chối khi buyerId trùng với sellerId (không thể tự nhắn cho chính mình).
 */
export async function findOrCreateConversation(
  buyerId: string,
  sellerId: string,
  itemId: string,
  options?: FindOrCreateConversationOptions,
): Promise<FindOrCreateConversationResult> {
  // 1. Kiểm tra đầu vào
  if (!buyerId || !sellerId) {
    throw new Error("Thiếu thông tin người tham gia hội thoại.");
  }

  const cleanItemId = itemId ? itemId.trim() : "";
  if (!cleanItemId) {
    throw new Error("Thiếu thông tin món đồ cần trao đổi.");
  }

  // 2. Chặn tự nhắn tin cho chính mình (bao gồm cả chuẩn hóa UUID và tài khoản demo)
  if (isSameUserId(buyerId, sellerId)) {
    throw new Error("Không thể tự nhắn tin cho chính mình.");
  }

  const cleanBuyerId = await resolveUserIdToUuid(buyerId);
  const cleanSellerId = await resolveUserIdToUuid(sellerId);

  if (cleanBuyerId === cleanSellerId) {
    throw new Error("Không thể tự nhắn tin cho chính mình.");
  }

  // 3. Tìm cuộc trò chuyện hiện có giữa 2 người dùng (theo cấu trúc chat chung cặp người dùng)
  let existingId: string | null = null;
  let isNew = false;
  let contextInserted = false;

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from("conversations")
        .select("id, participant_1, participant_2, room_id, last_message, last_message_at")
        .or(
          `and(participant_1.eq.${cleanBuyerId},participant_2.eq.${cleanSellerId}),and(participant_1.eq.${cleanSellerId},participant_2.eq.${cleanBuyerId})`,
        )
        .order("last_message_at", { ascending: false, nullsFirst: false })
        .limit(1);

      if (!error && data && data.length > 0) {
        existingId = data[0].id;
      }
    } catch (err) {
      console.warn("[findOrCreateConversation] Lỗi tra cứu Supabase:", err);
    }
  }

  if (!existingId) {
    const localList = getLocalConversations();
    const found = localList.find(
      (c) =>
        (isSameUserId(c.participant_1, cleanBuyerId) && isSameUserId(c.participant_2, cleanSellerId)) ||
        (isSameUserId(c.participant_1, cleanSellerId) && isSameUserId(c.participant_2, cleanBuyerId)),
    );
    if (found) {
      existingId = found.id;
    }
  }

  // 4. Nếu chưa có hội thoại giữa 2 người -> Tạo mới
  if (!existingId) {
    isNew = true;

    // Thử tạo trên Supabase
    if (isSupabaseConfigured) {
      try {
        const { data: created, error: insertErr } = await supabase
          .from("conversations")
          .insert({
            participant_1: cleanBuyerId,
            participant_2: cleanSellerId,
            last_message: "Bắt đầu cuộc trò chuyện...",
            last_message_at: new Date().toISOString(),
          })
          .select("id")
          .maybeSingle();

        if (!insertErr && created?.id) {
          existingId = created.id;
        }
      } catch (insertEx) {
        console.warn("[findOrCreateConversation] Lỗi tạo conversation Supabase:", insertEx);
      }
    }

    if (!existingId) {
      existingId =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, "0")}`;
    }

    // Lưu metadata ngữ cảnh món đồ
    const initialMeta: ConversationMeta = {
      other_name: options?.sellerName || "Người bán",
      other_avatar: options?.sellerAvatar || "/images/user-avatar.jpg",
      last_item_id: cleanItemId,
      last_item_name: options?.itemName,
      last_item_price: options?.itemPrice,
      discussed_items: [cleanItemId],
    };
    saveConversationMeta(existingId, initialMeta);

    saveLocalConversation({
      id: existingId,
      participant_1: cleanBuyerId,
      participant_2: cleanSellerId,
      item_id: cleanItemId,
      last_message: "Bắt đầu cuộc trò chuyện...",
      last_message_at: new Date().toISOString(),
      unread_count_p1: 0,
      unread_count_p2: 0,
      created_at: new Date().toISOString(),
      other_name: options?.sellerName || "Người bán",
      other_avatar: options?.sellerAvatar || "/images/user-avatar.jpg",
    });

    // Chèn tin nhắn ngữ cảnh mở đầu
    const contextMsg =
      options?.initialMessage ||
      formatItemContextMessage(options?.itemName, options?.itemPrice, cleanItemId);
    await sendMessage(existingId, cleanBuyerId, contextMsg, options?.buyerName);
    contextInserted = true;
  } else {
    // 5. Nếu đã có hội thoại giữa 2 người:
    isNew = false;

    // Kiểm tra xem hội thoại này đã từng trao đổi về món đồ này chưa
    const meta = getConversationMeta(existingId) || {};
    const discussed: string[] = Array.isArray(meta.discussed_items)
      ? meta.discussed_items
      : meta.last_item_id
        ? [meta.last_item_id]
        : [];

    const isSameItem = meta.last_item_id === cleanItemId || discussed.includes(cleanItemId);

    if (isSameItem) {
      // CÙNG MÓN ĐỒ: Trả về hội thoại cũ, không tạo trùng, không chèn tin nhắn lặp lại
      contextInserted = false;
    } else {
      // MÓN ĐỒ KHÁC: Chèn ngữ cảnh món mới vào luồng hội thoại chung
      const contextMsg =
        options?.initialMessage ||
        formatItemContextMessage(options?.itemName, options?.itemPrice, cleanItemId);
      await sendMessage(existingId, cleanBuyerId, contextMsg, options?.buyerName);
      contextInserted = true;

      // Cập nhật metadata hội thoại với món đồ mới
      saveConversationMeta(existingId, {
        last_item_id: cleanItemId,
        last_item_name: options?.itemName,
        last_item_price: options?.itemPrice,
        discussed_items: Array.from(new Set([...discussed, cleanItemId])),
      });
    }
  }

  const finalConvId = existingId;
  const resultObj: FindOrCreateConversationResult = {
    id: finalConvId,
    conversationId: finalConvId,
    isNew,
    contextInserted,
    itemId: cleanItemId,
    toString() {
      return finalConvId;
    },
    valueOf() {
      return finalConvId;
    },
  };

  return resultObj;
}
