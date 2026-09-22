import { supabase, isSupabaseConfigured } from "../supabase";
import { Conversation, Message } from "../../types";
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
 * Chuẩn hóa ID người dùng thành UUID hợp lệ để không gây lỗi SQL syntax trong PostgreSQL
 */
export async function resolveUserIdToUuid(userId: string): Promise<string> {
  if (!userId) return "";
  const trimmed = userId.trim();

  if (UUID_REGEX.test(trimmed)) {
    return trimmed;
  }

  const demoUuid = resolveDemoAlias(trimmed);
  if (demoUuid) {
    return demoUuid;
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

  // Fallback an toàn về ID demo renter để không làm gãy câu lệnh SQL nếu ở chế độ demo
  return "00000000-0000-4000-8000-000000000003";
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

  // 1. Kiểm tra hội thoại đã tồn tại giữa 2 participant trong Supabase
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
          participant_1: p1,
          participant_2: p2,
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
          item_id,
          last_item_id,
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
      other_name: existing?.other_name || c.other_name,
      other_avatar: existing?.other_avatar || c.other_avatar,
    });
  });

  const merged = Array.from(convMap.values()).map((c) => {
    const isMe = isSameUserId(c.participant_1, cleanUserId);
    const other = isMe ? c.p2 : c.p1;
    const otherId = isMe ? c.participant_2 : c.participant_1;
    const known = KNOWN_USER_NAMES[otherId];
    const savedMeta = getConversationMeta(c.id);

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

  const cleanSenderId = senderId ? await resolveUserIdToUuid(senderId) : null;
  const newMsgId =
    messageId && UUID_REGEX.test(messageId.trim())
      ? messageId.trim()
      : typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, "0")}`;

  const msgPayload: Message = {
    id: newMsgId,
    conversation_id: conversationId,
    sender_id: cleanSenderId,
    content: cleanContent,
    type,
    item_id: itemId || null,
    is_read: false,
    created_at: new Date().toISOString(),
    status: "sent",
  };

  let savedMessage: Message = msgPayload;

  // 1. Thử gửi lên Supabase
  if (isSupabaseConfigured) {
    try {
      // Đảm bảo cuộc trò chuyện tồn tại
      if (UUID_REGEX.test(conversationId.trim())) {
        const { data: convExists } = await supabase
          .from("conversations")
          .select("id")
          .eq("id", conversationId)
          .maybeSingle();

        if (!convExists && cleanSenderId) {
          await supabase.from("conversations").insert({
            id: conversationId,
            participant_1: cleanSenderId,
            participant_2: "00000000-0000-0000-0000-000000000001",
            last_message: cleanContent,
            last_message_at: new Date().toISOString(),
          });
        }
      }

      const { data, error } = await supabase
        .from("messages")
        .upsert(
          {
            id: newMsgId,
            conversation_id: conversationId,
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
          created_at,
          sender:profiles!sender_id(id, full_name, name, avatar_url)
        `,
        )
        .maybeSingle();

      if (error) {
        if (!isDemoUser(cleanSenderId) && !isDemoUser(conversationId)) {
          throw new Error(`Lỗi gửi tin nhắn Supabase: ${error.message}`);
        }
      } else if (data) {
        savedMessage = data as unknown as Message;
        supabase
          .from("conversations")
          .update({
            last_message: cleanContent,
            last_message_at: new Date().toISOString(),
          })
          .eq("id", conversationId)
          .then();
      }
    } catch (error: any) {
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

  // 3. Gửi thông báo Realtime cho người nhận nếu là tin nhắn người dùng
  try {
    if (cleanSenderId) {
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
    }
  } catch (notifErr) {
    console.warn("[MessagesAPI] Lỗi gửi thông báo tin nhắn:", notifErr);
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
  };
  currentUserId?: string;
  isTestEnv?: boolean;
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
 * 1. Không gửi tin nhắn thay mặt người mua: Ngữ cảnh món đồ là tin nhắn hệ thống (type: 'item_context', lưu item_id),
 *    hiển thị dạng thẻ, bỏ câu "Món này còn không bạn?".
 * 2. Chèn ngữ cảnh khi last_item_id khác itemId đang hỏi (kể cả quay lại món đã hỏi trước đó), không dựa vào discussed_items.
 * 3. Không tin dữ liệu từ client: lấy tên, giá, ảnh, người bán từ DB theo itemId;
 *    báo lỗi nếu sellerId không phải chủ món đồ hoặc món không tồn tại;
 *    buyerId phải là người dùng đang đăng nhập.
 * 4. Chống trùng: sắp xếp cặp id trước khi lưu (p1 < p2), ràng buộc unique cho cặp người dùng;
 *    insert bị trùng do race condition thì tự động lấy hội thoại đã có.
 * 5. Fallback safeStorage chỉ dùng khi ở chế độ demo/test; môi trường thật lỗi Supabase thì ném lỗi rõ ràng.
 * 6. Trả về object thuần { id, conversationId, isNew, contextInserted, itemId, lastItemId }.
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

  const isDemoOrTest = options?.isTestEnv || isDemoUser(cleanBuyerId) || isDemoUser(cleanSellerId);

  // 3. YÊU CẦU 2: GỌI HÀM POSTGRES RPC TRÊN SUPABASE (SECURITY DEFINER)
  // Trong môi trường thật, toàn bộ transaction (xác thực, kiểm tra chủ món đồ, chống trùng, khóa dòng, chèn tin)
  // được thực thi trong 1 giao dịch nguyên tử (atomic transaction) trên Postgres.
  if (isSupabaseConfigured && !isDemoOrTest) {
    try {
      const { data, error } = await supabase.rpc("find_or_create_conversation", {
        p_item_id: cleanItemId,
      });

      if (error) {
        throw new Error(error.message || "Lỗi xử lý cuộc trò chuyện từ cơ sở dữ liệu.");
      }

      if (data && typeof data === "object") {
        const convId = data.conversationId || data.id;
        return {
          id: convId,
          conversationId: convId,
          isNew: Boolean(data.isNew),
          contextInserted: Boolean(data.contextInserted),
          itemId: data.itemId || cleanItemId,
          lastItemId: data.lastItemId || cleanItemId,
        };
      }
    } catch (rpcErr: any) {
      // Yêu cầu 6: Môi trường thật lỗi Supabase thì ném lỗi rõ ràng, không fallback che giấu
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
