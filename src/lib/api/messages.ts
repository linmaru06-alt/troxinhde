import { supabase, isSupabaseConfigured } from "../supabase";
import { Conversation, Message } from "../../types";
import { getPublicProfiles } from "./publicProfiles";
import {
  UUID_REGEX,
  KNOWN_DEMO_UUIDS,
  KNOWN_USER_NAMES,
  DEMO_GROUPS,
  resolveDemoAlias,
  isDemoUser,
  isSameUserId,
} from "../demoAliases";

export { isSameUserId, isDemoUser, resolveDemoAlias, KNOWN_USER_NAMES, KNOWN_DEMO_UUIDS, DEMO_GROUPS };

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

export const MARKETPLACE_CONVERSATION_RATE_LIMIT = 10;
export const MARKETPLACE_CONVERSATION_RATE_WINDOW_MS = 60 * 60 * 1000; // 1 giờ
export const MARKETPLACE_RATE_LIMIT_ERROR_MSG = "Bạn thao tác quá nhanh, thử lại sau";
export const SELLER_BANNED_ERROR_MSG = "Tài khoản người bán hiện đang bị tạm khóa hoặc ngừng hoạt động.";

export function checkMarketplaceConversationRateLimit(
  buyerId: string,
  now: number = Date.now(),
): void {
  if (!buyerId) return;
  const cleanId = resolveDemoAlias(buyerId) || buyerId;
  const key = `troxinh_mp_conv_rate_${cleanId}`;
  let timestamps: number[] = [];
  try {
    const raw = safeGetStorage(key);
    if (raw) {
      timestamps = JSON.parse(raw);
    }
  } catch {}

  const windowStart = now - MARKETPLACE_CONVERSATION_RATE_WINDOW_MS;
  const recent = timestamps.filter((t) => typeof t === "number" && t > windowStart);
  if (recent.length >= MARKETPLACE_CONVERSATION_RATE_LIMIT) {
    throw new Error(MARKETPLACE_RATE_LIMIT_ERROR_MSG);
  }
}

export function recordMarketplaceNewConversation(
  buyerId: string,
  now: number = Date.now(),
): void {
  if (!buyerId) return;
  const cleanId = resolveDemoAlias(buyerId) || buyerId;
  const key = `troxinh_mp_conv_rate_${cleanId}`;
  let timestamps: number[] = [];
  try {
    const raw = safeGetStorage(key);
    if (raw) {
      timestamps = JSON.parse(raw);
    }
  } catch {}

  const windowStart = now - MARKETPLACE_CONVERSATION_RATE_WINDOW_MS;
  const recent = timestamps.filter((t) => typeof t === "number" && t > windowStart);
  recent.push(now);
  safeSetStorage(key, JSON.stringify(recent));
}

export function clearMarketplaceConversationRateLimits(): void {
  inMemoryStore.forEach((_, key) => {
    if (key.startsWith("troxinh_mp_conv_rate_")) {
      inMemoryStore.delete(key);
      try {
        if (typeof localStorage !== "undefined" && localStorage) {
          localStorage.removeItem(key);
        }
      } catch {}
    }
  });
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

export const ADMIN_USER_ID = "00000000-0000-0000-0000-000000000001";

/**
 * Kiểm tra xem một cuộc hội thoại có phải là với Admin / Ban Quản Trị hay không
 */
export function isConversationWithAdmin(
  c?: Conversation | null,
  currentUserId?: string
): boolean {
  if (!c) return false;
  try {
    const isMe = isSameUserId(c.participant_1, currentUserId);
    const other = isMe ? c.p2 : c.p1;
    const otherId = isMe ? c.participant_2 : c.participant_1;

    if (
      otherId === ADMIN_USER_ID ||
      otherId === "usr_admin_quan66934" ||
      otherId === "demo_admin_uuid" ||
      otherId === "demo_admin_troxinh"
    ) {
      return true;
    }
    if (other?.app_role === "admin" || (other as any)?.role === "admin") {
      return true;
    }
    const name = String(
      c.other_name ||
      other?.full_name ||
      other?.name ||
      ""
    ).toLowerCase();
    if (
      name.includes("ban quản trị") ||
      name.includes("bqt trọ xinh") ||
      name.includes("quản trị viên")
    ) {
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

/**
 * Khởi tạo hoặc tìm cuộc hội thoại trực tiếp với Ban Quản Trị Trọ Xinh
 */
export async function getOrCreateAdminConversation(userId: string): Promise<string> {
  return getOrCreateConversation(userId, ADMIN_USER_ID, undefined, {
    otherName: "Ban Quản Trị Trọ Xinh",
    otherAvatar: "/images/logo.png",
  });
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
 * Chuẩn hóa ID người dùng thành UUID hợp lệ để không gây lỗi SQL syntax trong PostgreSQL
 */
export async function resolveUserIdToUuid(userId: string): Promise<string> {
  if (!userId) return "";
  const trimmed = userId.trim();

  // 1. Đã là UUID chuẩn -> trả về ngay
  if (UUID_REGEX.test(trimmed)) {
    return trimmed;
  }

  // 2. Demo alias (usr_admin_quan66934, usr_renter_..., usr_owner_...) -> lấy UUID tương ứng
  const demoUuid = resolveDemoAlias(trimmed);
  if (demoUuid) {
    return demoUuid;
  }

  // 3. Nếu là currentUser trong Zustand store đã có profile id là UUID -> lấy ngay (0ms)
  try {
    const { useAppStore } = await import("../../store/useAppStore");
    const current = useAppStore.getState().currentUser;
    if (current?.id && UUID_REGEX.test(current.id)) {
      if (current.id === trimmed || current.firebaseUid === trimmed || isSameUserId(current.id, trimmed)) {
        return current.id;
      }
    }
  } catch {}

  // 4. Tra cứu trên bảng profiles bằng firebase_uid (LƯU Ý: profiles KHÔNG CÓ cột email)
  if (isSupabaseConfigured) {
    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("id")
        .eq("firebase_uid", trimmed)
        .maybeSingle();

      if (!error && profile?.id && UUID_REGEX.test(profile.id)) {
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

  // 5. Fallback an toàn: Sinh UUID xác định (deterministic) từ chuỗi ID để không bao giờ bị trùng đối tác
  //    Đồng thời không làm gãy câu lệnh PostgreSQL UUID
  let hash = 0;
  for (let i = 0; i < trimmed.length; i++) {
    hash = (hash << 5) - hash + trimmed.charCodeAt(i);
    hash |= 0;
  }
  const hexPart = Math.abs(hash).toString(16).padStart(12, "0").slice(0, 12);
  return `00000000-0000-4000-8000-${hexPart}`;
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

  // Sắp xếp thứ tự ID để chống trùng
  const [p1, p2] = cleanTenantId < cleanLandlordId ? [cleanTenantId, cleanLandlordId] : [cleanLandlordId, cleanTenantId];

  // Chỉ gắn room_id khi có định dạng UUID chuẩn hợp lệ
  const validRoomId =
    roomId && UUID_REGEX.test(roomId.trim()) ? roomId.trim() : null;

  // 1. Đảm bảo hồ sơ 2 bên tồn tại trên Supabase trước khi tạo hội thoại
  if (isSupabaseConfigured) {
    try {
      await Promise.all([
        supabase.rpc("ensure_profile_exists", {
          p_user_id: cleanTenantId,
          p_name: "Khách thuê Trọ Xinh",
        }),
        supabase.rpc("ensure_profile_exists", {
          p_user_id: cleanLandlordId,
          p_name: extra?.otherName || "Chủ trọ / Người bán",
        }),
      ]);
    } catch {}
  }

  // 2. Thử gọi Postgres RPC get_or_create_conversation_v2 (v2 hỗ trợ sender_id trực tiếp)
  if (isSupabaseConfigured) {
    try {
      const { data: convId, error: rpcV2Err } = await supabase.rpc("get_or_create_conversation_v2", {
        p_sender_id: cleanTenantId,
        p_partner_id: cleanLandlordId,
        p_room_id: validRoomId,
      });

      if (!rpcV2Err && convId) {
        saveConversationMeta(convId, {
          other_name: extra?.otherName,
          other_avatar: extra?.otherAvatar,
          partner_id: cleanLandlordId,
          room_title: extra?.roomTitle,
        });
        return convId;
      }
    } catch (errV2) {
      console.warn("[MessagesAPI] RPC get_or_create_conversation_v2 thử nghiệm:", errV2);
    }

    // 2b. Fallback gọi RPC v1 get_or_create_conversation
    try {
      const { data: convId, error: rpcErr } = await supabase.rpc("get_or_create_conversation", {
        p_partner_id: cleanLandlordId,
        p_room_id: validRoomId,
      });

      if (!rpcErr && convId) {
        saveConversationMeta(convId, {
          other_name: extra?.otherName,
          other_avatar: extra?.otherAvatar,
          partner_id: cleanLandlordId,
          room_title: extra?.roomTitle,
        });
        return convId;
      }

      if (rpcErr) {
        if (rpcErr.message?.includes('P0005') || rpcErr.message?.includes('Không thể gửi tin nhắn')) {
          throw new Error("Không thể gửi tin nhắn trong cuộc trò chuyện này");
        }
        if (rpcErr.message?.includes('P0004') || rpcErr.message?.includes('tạm khóa')) {
          throw new Error("Tài khoản người dùng hiện đang bị tạm khóa hoặc ngừng hoạt động.");
        }
      }
    } catch (err: any) {
      if (err?.message?.includes("Không thể gửi tin nhắn") || err?.message?.includes("tạm khóa")) {
        throw err;
      }
    }
  }

  // 3. Kiểm tra hội thoại đã tồn tại giữa 2 participant trong Supabase
  let existingId: string | null = null;
  if (isSupabaseConfigured) {
    try {
      let query = supabase
        .from("conversations")
        .select("id")
        .or(
          `and(participant_1.eq.${p1},participant_2.eq.${p2}),and(participant_1.eq.${p2},participant_2.eq.${p1})`,
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
    saveConversationMeta(existingId, {
      other_name: extra?.otherName,
      other_avatar: extra?.otherAvatar,
      partner_id: cleanLandlordId,
      room_title: extra?.roomTitle,
    });
    return existingId;
  }

  // 4. Thử tạo mới trực tiếp trên Supabase
  if (isSupabaseConfigured) {
    try {
      const { data: created, error: insertErr } = await supabase
        .from("conversations")
        .insert({
          participant_1: p1,
          participant_2: p2,
          room_id: validRoomId,
          last_message: "Bắt đầu cuộc trò chuyện...",
          last_message_at: new Date().toISOString(),
        })
        .select("id")
        .maybeSingle();

      if (!insertErr && created?.id) {
        saveConversationMeta(created.id, {
          other_name: extra?.otherName,
          other_avatar: extra?.otherAvatar,
          partner_id: cleanLandlordId,
          room_title: extra?.roomTitle,
        });
        return created.id;
      }
      if (insertErr) {
        // Nếu trùng do race condition
        const { data: retryData } = await supabase
          .from("conversations")
          .select("id")
          .or(
            `and(participant_1.eq.${p1},participant_2.eq.${p2}),and(participant_1.eq.${p2},participant_2.eq.${p1})`,
          )
          .maybeSingle();
        if (retryData?.id) {
          return retryData.id;
        }
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
  const fallbackId =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, "0")}`;

  let otherProfile: any = null;
  if (isSupabaseConfigured) {
    const profiles = await getPublicProfiles([cleanLandlordId]);
    otherProfile = profiles.get(cleanLandlordId) || null;
  }

  const fallbackConversation: Conversation = {
    id: fallbackId,
    participant_1: p1,
    participant_2: p2,
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

  const candidateIds = Array.from(
    new Set([cleanUserId, userId].filter((id) => id && UUID_REGEX.test(id.trim())))
  );

  if (isSupabaseConfigured && candidateIds.length > 0) {
    try {
      const orFilter = candidateIds
        .flatMap((id) => [`participant_1.eq.${id}`, `participant_2.eq.${id}`])
        .join(",");

      const { data, error } = await supabase
        .from("conversations")
        .select(
          `
          id,
          participant_1,
          participant_2,
          room_id,
          item_id,
          last_item_id,
          last_message,
          last_message_at,
          unread_count_p1,
          unread_count_p2,
          created_at,
          rooms(id, name, price)
        `,
        )
        .or(orFilter)
        .order("last_message_at", { ascending: false, nullsFirst: false });

      if (!error && data) {
        serverList = data as unknown as Conversation[];
        // Hồ sơ người dùng lấy qua RPC công khai (không phụ thuộc RLS join)
        const allParticipantIds = serverList.flatMap((c: any) => [
          c.participant_1,
          c.participant_2,
        ]);
        const profiles = await getPublicProfiles(allParticipantIds);
        if (profiles.size > 0) {
          serverList = serverList.map((c: any) => ({
            ...c,
            p1: profiles.get(c.participant_1) || null,
            p2: profiles.get(c.participant_2) || null,
          }));
        }
      }
    } catch (error) {
      console.warn("[MessagesAPI] getConversations error:", error);
    }
  }

  // Kết hợp an toàn với các cuộc trò chuyện cục bộ trong phiên
  const localList = getLocalConversations().filter(
    (c) =>
      candidateIds.some((uid) => isSameUserId(c.participant_1, uid) || isSameUserId(c.participant_2, uid))
  );

  const convMap = new Map<string, Conversation>();
  localList.forEach((c) => convMap.set(c.id, c));
  serverList.forEach((c) => {
    const existing = convMap.get(c.id);
    convMap.set(c.id, {
      ...c,
      other_name: existing?.other_name || c.other_name,
      other_avatar: existing?.other_avatar || c.other_avatar,
    });
  });

  const merged = Array.from(convMap.values()).map((c) => {
    const isMe = candidateIds.some((uid) => isSameUserId(c.participant_1, uid));
    const other = isMe ? c.p2 : c.p1;
    const otherId = isMe ? c.participant_2 : c.participant_1;
    const known = KNOWN_USER_NAMES[otherId];
    const savedMeta = getConversationMeta(c.id);
    const unreadCount = isMe ? (c.unread_count_p1 || 0) : (c.unread_count_p2 || 0);

    const resolvedName =
      c.other_name ||
      savedMeta?.other_name ||
      other?.full_name ||
      other?.name ||
      known?.name ||
      (isMe ? "Chủ trọ / Người bán" : "Khách liên hệ");

    const resolvedAvatar =
      c.other_avatar ||
      savedMeta?.other_avatar ||
      other?.avatar_url ||
      known?.avatar ||
      "/images/user-avatar.jpg";

    return {
      ...c,
      unread_count: unreadCount,
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
 * Đánh dấu toàn bộ tin nhắn trong cuộc trò chuyện là đã đọc
 * Đặt lại unread_count = 0 và cập nhật thông báo
 */
export async function markConversationAsRead(
  conversationId: string,
  userId?: string,
): Promise<void> {
  if (!conversationId) return;

  if (isSupabaseConfigured && UUID_REGEX.test(conversationId.trim())) {
    try {
      const { error } = await supabase.rpc("mark_conversation_read", {
        p_conversation_id: conversationId,
      });
      if (error) {
        // Fallback cập nhật trực tiếp nếu RPC chưa có
        await supabase
          .from("messages")
          .update({ is_read: true })
          .eq("conversation_id", conversationId)
          .eq("is_read", false);
      }
    } catch (err) {
      console.warn("[MessagesAPI] Ngoại lệ markConversationAsRead:", err);
    }
  }

  // Cập nhật bộ nhớ cục bộ nếu có
  try {
    const localConvs = getLocalConversations();
    const updated = localConvs.map((c) => {
      if (c.id === conversationId) {
        return {
          ...c,
          unread_count_p1: 0,
          unread_count_p2: 0,
          unread_count: 0,
        };
      }
      return c;
    });
    safeSetStorage(LOCAL_CONVS_KEY, JSON.stringify(updated));
  } catch {}
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
          type,
          item_id,
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
  senderId: string | null,
  content: string,
  senderName?: string,
  messageId?: string,
  type: "text" | "item_context" | "system" = "text",
  itemId?: string | null,
): Promise<Message> {
  const cleanContent = content.trim();
  if (!cleanContent) {
    throw new Error("Nội dung tin nhắn không được để trống.");
  }

  let cleanSenderId = senderId ? await resolveUserIdToUuid(senderId) : null;
  if (!cleanSenderId || !UUID_REGEX.test(cleanSenderId)) {
    try {
      const { useAppStore } = await import("../../store/useAppStore");
      const current = useAppStore.getState().currentUser;
      if (current?.id && UUID_REGEX.test(current.id)) {
        cleanSenderId = current.id;
      }
    } catch {}
  }

  if (!cleanSenderId || !UUID_REGEX.test(cleanSenderId)) {
    throw new Error("Không thể xác định danh tính người gửi. Vui lòng đăng nhập lại.");
  }

  const cleanConvId = conversationId?.trim();
  if (!cleanConvId || !UUID_REGEX.test(cleanConvId)) {
    throw new Error("Mã cuộc trò chuyện không hợp lệ.");
  }

  const newMsgId =
    messageId && UUID_REGEX.test(messageId.trim())
      ? messageId.trim()
      : typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, "0")}`;

  const msgPayload: Message = {
    id: newMsgId,
    conversation_id: cleanConvId,
    sender_id: cleanSenderId,
    content: cleanContent,
    type,
    item_id: itemId || null,
    is_read: false,
    created_at: new Date().toISOString(),
    status: "sent",
  };

  let savedMessage: Message = msgPayload;

  // 1. Thử gửi lên Supabase Cloud
  if (isSupabaseConfigured) {
    try {
      // Đảm bảo người gửi đã có hồ sơ trong bảng profiles
      if (cleanSenderId) {
        try {
          await supabase.rpc("ensure_profile_exists", {
            p_user_id: cleanSenderId,
            p_name: senderName || "Người dùng Trọ Xinh",
          });
        } catch {}
      }

      // Đảm bảo cuộc trò chuyện tồn tại trên Supabase Cloud
      const { data: convExists } = await supabase
        .from("conversations")
        .select("id, participant_1, participant_2")
        .eq("id", cleanConvId)
        .maybeSingle();

      if (!convExists && cleanSenderId) {
        const meta = getConversationMeta(cleanConvId);
        const partnerId = meta?.partner_id && UUID_REGEX.test(meta.partner_id)
          ? meta.partner_id
          : "00000000-0000-0000-0000-000000000001"; // Fallback về Admin BQT
        try {
          await supabase.rpc("ensure_profile_exists", {
            p_user_id: partnerId,
            p_name: meta?.other_name || "Đối tác Trọ Xinh",
          });
        } catch {}

        const [p1, p2] = cleanSenderId < partnerId ? [cleanSenderId, partnerId] : [partnerId, cleanSenderId];
        await supabase.from("conversations").insert({
          id: cleanConvId,
          participant_1: p1,
          participant_2: p2,
          last_message: cleanContent,
          last_message_at: new Date().toISOString(),
        });
      }

      const { data, error } = await supabase
        .from("messages")
        .upsert(
          {
            id: newMsgId,
            conversation_id: cleanConvId,
            sender_id: cleanSenderId,
            content: cleanContent,
            type,
            item_id: itemId || null,
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
          type,
          item_id,
          is_read,
          created_at
        `,
        )
        .maybeSingle();

      if (error) {
        if (error.message?.includes('P0005') || error.message?.includes('Không thể gửi tin nhắn') || error.message?.includes('blocked')) {
          throw new Error("Không thể gửi tin nhắn trong cuộc trò chuyện này");
        }
        if (error.message?.includes('No suitable key') || (error as any).code === 'PGRST301') {
          throw new Error("Supabase chưa bật Firebase Third-Party Auth. Vui lòng thêm Firebase Project ID (troxinh-eb) vào Supabase Dashboard.");
        }
        if (!isDemoUser(cleanSenderId) && !isDemoUser(cleanConvId)) {
          throw new Error(`Lỗi gửi tin nhắn Supabase: ${error.message}`);
        }
      } else if (data) {
        savedMessage = { ...msgPayload, ...(data as any) };
        supabase
          .from("conversations")
          .update({
            last_message: cleanContent,
            last_message_at: new Date().toISOString(),
          })
          .eq("id", cleanConvId)
          .then();
      }
    } catch (error: any) {
      if (error?.message?.includes("Không thể gửi tin nhắn")) {
        throw error;
      }
      if (!isDemoUser(cleanSenderId) && !isDemoUser(conversationId)) {
        throw error;
      }
      console.warn("[MessagesAPI] sendMessage Supabase error:", error);
    }
  }

  // 2. Fallback lưu cục bộ nếu là chế độ demo/test
  if (!isSupabaseConfigured || isDemoUser(cleanSenderId) || isDemoUser(conversationId)) {
    saveLocalMessage(savedMessage);
  }

  // 3. Xác định người nhận và gửi thông báo 2 chiều
  let receiverId = "";
  try {
    const meta = getConversationMeta(conversationId);
    const localConvs = getLocalConversations();
    const conv = localConvs.find((c) => c.id === conversationId);
    if (conv) {
      receiverId = isSameUserId(conv.participant_1, cleanSenderId)
        ? conv.participant_2
        : conv.participant_1;
    }
    if (!receiverId && meta?.partner_id && !isSameUserId(meta.partner_id, cleanSenderId)) {
      receiverId = meta.partner_id;
    }

    if (!receiverId && UUID_REGEX.test(conversationId.trim()) && isSupabaseConfigured) {
      const { data: dbConv } = await supabase
        .from("conversations")
        .select("participant_1, participant_2")
        .eq("id", conversationId)
        .maybeSingle();

      if (dbConv) {
        receiverId = isSameUserId(dbConv.participant_1, cleanSenderId)
          ? dbConv.participant_2
          : dbConv.participant_1;
      }
    }

    if (
      receiverId &&
      cleanSenderId &&
      !isSameUserId(receiverId, cleanSenderId) &&
      isSupabaseConfigured
    ) {
      const ctaUrl = `/tin-nhan/${conversationId}`;
      const shortBody =
        cleanContent.length > 80
          ? cleanContent.slice(0, 80) + "..."
          : cleanContent;
      const notifTitle = `Tin nhắn từ ${senderName || "Người dùng"} 💬`;

      // Kiểm tra xem đã có thông báo chưa đọc của hội thoại này chưa
      supabase
        .from("notifications")
        .select("id")
        .eq("user_id", receiverId)
        .eq("cta_url", ctaUrl)
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
        .then(({ data: existingNotif }) => {
          if (existingNotif?.id) {
            // Cập nhật thông báo hiện tại (nội dung mới nhất) thay vì tạo mới tràn màn hình
            supabase
              .from("notifications")
              .update({
                title: notifTitle,
                body: shortBody,
                created_at: new Date().toISOString(),
              })
              .eq("id", existingNotif.id)
              .then();
          } else {
            // Chỉ tạo 1 thông báo duy nhất
            supabase
              .from("notifications")
              .insert({
                user_id: receiverId,
                title: notifTitle,
                body: shortBody,
                type: "chat_message",
                cta_url: ctaUrl,
                cta_label: "Trả lời ngay",
                is_read: false,
              })
              .then();
          }
        });
    }
  } catch (notifErr) {
    console.warn("[MessagesAPI] Lỗi gửi thông báo tin nhắn:", notifErr);
  }

  // 4. Phát sóng thời gian thực đa luồng (BroadcastChannel + CustomEvent) để cả 2 phía nhận được tin nhắn và chuông/toast ngay lập tức
  try {
    const syncPayload = {
      type: "NEW_MESSAGE",
      conversationId,
      message: savedMessage,
      senderId: cleanSenderId,
      senderName: senderName || "Người dùng",
      receiverId,
      content: cleanContent,
    };

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("troxinh:internal-message-sent", {
          detail: syncPayload,
        }),
      );
      window.dispatchEvent(
        new CustomEvent("troxinh:conversation-updated", {
          detail: {
            id: conversationId,
            last_message: cleanContent,
            last_message_at: savedMessage.created_at,
          },
        }),
      );

      if (typeof BroadcastChannel !== "undefined") {
        const bc = new BroadcastChannel("troxinh_chat_sync");
        bc.postMessage(syncPayload);
        bc.close();
      }
    }
  } catch (syncErr) {
    console.warn("[MessagesAPI] Lỗi broadcast tin nhắn 2 chiều:", syncErr);
  }

  return savedMessage;
}

export interface FindOrCreateConversationOptions {
  mockItem?: {
    id: string;
    title: string;
    price: number;
    user_id?: string;
    sellerId?: string;
    images?: string[];
    sellerIsBanned?: boolean;
    is_banned?: boolean;
  };
  currentUserId?: string;
  isTestEnv?: boolean;
  sellerIsBanned?: boolean;
  isBlocked?: boolean;
  blockedUserIds?: string[];
  now?: number;
}

export interface FindOrCreateConversationResult {
  id: string;
  conversationId: string;
  isNew: boolean;
  contextInserted: boolean;
  itemId: string;
  lastItemId?: string | null;
  conversation?: Conversation;
}

/**
 * Định dạng thẻ tóm tắt ngữ cảnh món đồ (không mạo danh người mua, không có câu hỏi thừa)
 */
export function formatItemContextSummary(
  itemName?: string,
  price?: number,
): string {
  const name = itemName ? `"${itemName}"` : "Món đồ thanh lý";
  const priceText =
    price !== undefined
      ? price === 0
        ? " (Đồ tặng miễn phí)"
        : ` (${price.toLocaleString("vi-VN")} đ)`
      : "";
  return `[Món đồ] ${name}${priceText}`;
}

/**
 * Tìm hoặc khởi tạo cuộc hội thoại cho Chợ đồ cũ sinh viên trong hệ thống chat chung:
 * 1. Giới hạn tần suất: mỗi người mở tối đa 10 hội thoại mới về chợ đồ cũ trong 1 giờ.
 *    Vượt quá báo: "Bạn thao tác quá nhanh, thử lại sau".
 * 2. Người bán bị khóa tài khoản hoặc ngừng hoạt động thì không mở được hội thoại mới
 *    và hiển thị thông báo rõ ràng.
 * 3. Không gửi tin nhắn thay mặt người mua: Ngữ cảnh món đồ là tin nhắn hệ thống (type: 'item_context', lưu item_id),
 *    hiển thị dạng thẻ, bỏ câu "Món này còn không bạn?".
 * 4. Chèn ngữ cảnh khi last_item_id khác itemId đang hỏi (kể cả quay lại món đã hỏi trước đó), không dựa vào discussed_items.
 * 5. Không tin dữ liệu từ client: lấy tên, giá, ảnh, người bán từ DB theo itemId;
 *    báo lỗi nếu sellerId không phải chủ món đồ hoặc món không tồn tại;
 *    buyerId phải là người dùng đang đăng nhập.
 * 6. Chống trùng: sắp xếp cặp id trước khi lưu (p1 < p2), ràng buộc unique cho cặp người dùng;
 *    insert bị trùng do race condition thì tự động lấy hội thoại đã có.
 * 7. Fallback safeStorage chỉ dùng khi ở chế độ demo/test; môi trường thật lỗi Supabase thì ném lỗi rõ ràng.
 * 8. Trả về object thuần { id, conversationId, isNew, contextInserted, itemId, lastItemId }.
 */
export async function findOrCreateConversation(
  buyerId: string,
  sellerId: string,
  itemId: string,
  options?: FindOrCreateConversationOptions,
): Promise<FindOrCreateConversationResult> {
  // 1. Kiểm tra đầu vào cơ bản
  if (!buyerId || !sellerId) {
    throw new Error("Thiếu thông tin người tham gia hội thoại.");
  }

  const cleanItemId = itemId ? itemId.trim() : "";
  if (!cleanItemId) {
    throw new Error("Thiếu thông tin món đồ cần trao đổi.");
  }

  // 2. Chặn tự nhắn tin cho chính mình
  if (isSameUserId(buyerId, sellerId)) {
    throw new Error("Không thể tự nhắn tin cho chính mình.");
  }

  const cleanBuyerId = await resolveUserIdToUuid(buyerId);
  const cleanSellerId = await resolveUserIdToUuid(sellerId);

  if (cleanBuyerId === cleanSellerId) {
    throw new Error("Không thể tự nhắn tin cho chính mình.");
  }

  // 3. Kiểm tra tài khoản người bán bị khóa
  if (
    options?.sellerIsBanned ||
    options?.mockItem?.sellerIsBanned ||
    options?.mockItem?.is_banned
  ) {
    throw new Error(SELLER_BANNED_ERROR_MSG);
  }

  if (isSupabaseConfigured && cleanSellerId) {
    // is_banned từ RPC công khai đã tính cả thời hạn khóa; máy chủ vẫn kiểm tra lại khi tạo hội thoại
    const profiles = await getPublicProfiles([cleanSellerId]);
    if (profiles.get(cleanSellerId)?.is_banned) {
      throw new Error(SELLER_BANNED_ERROR_MSG);
    }
  }

  // 3.1. Kiểm tra quan hệ chặn liên hệ 2 chiều
  if (
    options?.isBlocked ||
    (options?.blockedUserIds && (options.blockedUserIds.includes(cleanSellerId) || options.blockedUserIds.includes(cleanBuyerId)))
  ) {
    throw new Error("Không thể gửi tin nhắn trong cuộc trò chuyện này");
  }

  const isDemoOrTest = options?.isTestEnv || isDemoUser(cleanBuyerId) || isDemoUser(cleanSellerId);

  // 4. YÊU CẦU 2: GỌI HÀM POSTGRES RPC TRÊN SUPABASE (SECURITY DEFINER)
  // Trong môi trường thật, toàn bộ transaction (xác thực, kiểm tra chủ món đồ, chống trùng, khóa dòng, chèn tin)
  // được thực thi trong 1 giao dịch nguyên tử (atomic transaction) trên Postgres.
  if (isSupabaseConfigured && !isDemoOrTest) {
    try {
      const { data, error } = await supabase.rpc("find_or_create_conversation", {
        p_item_id: cleanItemId,
      });

      if (error) {
        if (error.message?.includes('P0005') || error.message?.includes('Không thể gửi tin nhắn')) {
          throw new Error("Không thể gửi tin nhắn trong cuộc trò chuyện này");
        }
        throw new Error(error.message || "Lỗi xử lý cuộc trò chuyện từ cơ sở dữ liệu.");
      }

      if (data && typeof data === "object") {
        const convId = data.conversationId || data.id;
        const isNewConv = Boolean(data.isNew);
        if (isNewConv) {
          recordMarketplaceNewConversation(cleanBuyerId, options?.now);
        }
        return {
          id: convId,
          conversationId: convId,
          isNew: isNewConv,
          contextInserted: Boolean(data.contextInserted),
          itemId: data.itemId || cleanItemId,
          lastItemId: data.lastItemId || cleanItemId,
        };
      }
    } catch (rpcErr: any) {
      // Môi trường thật lỗi Supabase thì ném lỗi rõ ràng, không fallback che giấu
      throw rpcErr;
    }
  }

  // 4. LUỒNG CHẾ ĐỘ DEMO / TEST (Khi chưa cấu hình Supabase hoặc chạy trong môi trường kiểm thử)
  let itemTitle = "Món đồ thanh lý";
  let itemPrice = 0;
  let itemImage = "";

  if (options?.mockItem) {
    const mockOwner = options.mockItem.user_id || options.mockItem.sellerId;
    if (mockOwner && !isSameUserId(mockOwner, cleanSellerId)) {
      throw new Error("Người bán không phải là chủ sở hữu của món đồ này.");
    }
    itemTitle = options.mockItem.title || itemTitle;
    itemPrice = options.mockItem.price || 0;
    itemImage = options.mockItem.images?.[0] || "";
  } else if (!isDemoOrTest) {
    throw new Error("Món đồ không tồn tại hoặc đã bị xóa.");
  }

  const [p1, p2] = cleanBuyerId < cleanSellerId ? [cleanBuyerId, cleanSellerId] : [cleanSellerId, cleanBuyerId];
  let existingConvId: string | null = null;
  let currentLastItemId: string | null = null;
  let isNew = false;
  let contextInserted = false;

  const localList = getLocalConversations();
  const found = localList.find(
    (c) =>
      (isSameUserId(c.participant_1, p1) && isSameUserId(c.participant_2, p2)) ||
      (isSameUserId(c.participant_1, p2) && isSameUserId(c.participant_2, p1)),
  );
  if (found) {
    existingConvId = found.id;
    const meta = getConversationMeta(found.id);
    currentLastItemId = (found as any).last_item_id || meta?.last_item_id || null;
  }

  if (!existingConvId) {
    // Kiểm tra giới hạn: mỗi người mở tối đa 10 hội thoại mới trong 1 giờ
    checkMarketplaceConversationRateLimit(cleanBuyerId, options?.now);

    isNew = true;
    existingConvId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, "0")}`;
    currentLastItemId = cleanItemId;

    saveLocalConversation({
      id: existingConvId,
      participant_1: p1,
      participant_2: p2,
      item_id: cleanItemId,
      last_item_id: cleanItemId,
      last_message: formatItemContextSummary(itemTitle, itemPrice),
      last_message_at: new Date().toISOString(),
      unread_count_p1: 0,
      unread_count_p2: 0,
      created_at: new Date().toISOString(),
    });

    recordMarketplaceNewConversation(cleanBuyerId, options?.now);
  }

  const shouldInsertContext = isNew || (currentLastItemId !== cleanItemId);

  if (shouldInsertContext) {
    const cardContent = JSON.stringify({
      type: "item_context",
      itemId: cleanItemId,
      title: itemTitle,
      price: itemPrice,
      image: itemImage,
      summary: formatItemContextSummary(itemTitle, itemPrice),
    });

    await sendMessage(
      existingConvId,
      null,
      cardContent,
      "Hệ thống",
      undefined,
      "item_context",
      cleanItemId,
    );
    contextInserted = true;
    currentLastItemId = cleanItemId;

    saveConversationMeta(existingConvId, {
      last_item_id: cleanItemId,
      last_item_name: itemTitle,
      last_item_price: itemPrice,
      partner_id: cleanSellerId,
      other_name: "Người bán đồ cũ",
    });
  }

  return {
    id: existingConvId,
    conversationId: existingConvId,
    isNew,
    contextInserted,
    itemId: cleanItemId,
    lastItemId: currentLastItemId,
  };
}
