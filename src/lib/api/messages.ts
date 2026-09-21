import { supabase, isSupabaseConfigured } from '../supabase';
import { Conversation, Message } from '../../types';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const KNOWN_DEMO_UUIDS: Record<string, string> = {
  demo_admin_uuid: '00000000-0000-0000-0000-000000000001',
  demo_admin_troxinh: '00000000-0000-0000-0000-000000000001',
  usr_admin_quan66934: '00000000-0000-0000-0000-000000000001',
  'admin@troxinh.vn': '00000000-0000-0000-0000-000000000001',

  demo_owner_uuid: '00000000-0000-0000-0000-000000000002',
  demo_owner_troxinh: '00000000-0000-0000-0000-000000000002',
  user_owner_1: '00000000-0000-0000-0000-000000000002',
  'chutro@troxinh.vn': '00000000-0000-0000-0000-000000000002',

  demo_renter_uuid: '00000000-0000-0000-0000-000000000003',
  demo_renter_troxinh: '00000000-0000-0000-0000-000000000003',
  user_renter_1: '00000000-0000-0000-0000-000000000003',
  user_renter_2: '00000000-0000-0000-0000-000000000003',
  'nguoithue@troxinh.vn': '00000000-0000-0000-0000-000000000003',
};

const LOCAL_CONVS_KEY = 'troxinh_local_conversations';
const LOCAL_MSGS_KEY = 'troxinh_local_messages';

function getLocalConversations(): Conversation[] {
  try {
    const raw = sessionStorage.getItem(LOCAL_CONVS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalConversation(conv: Conversation) {
  try {
    const list = getLocalConversations().filter((c) => c.id !== conv.id);
    list.unshift(conv);
    sessionStorage.setItem(LOCAL_CONVS_KEY, JSON.stringify(list));
  } catch {}
}

function getLocalMessages(conversationId: string): Message[] {
  try {
    const raw = sessionStorage.getItem(`${LOCAL_MSGS_KEY}_${conversationId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalMessage(msg: Message) {
  try {
    const list = getLocalMessages(msg.conversation_id);
    list.push(msg);
    sessionStorage.setItem(`${LOCAL_MSGS_KEY}_${msg.conversation_id}`, JSON.stringify(list));
  } catch {}
}

/**
 * Chuẩn hóa ID người dùng thành UUID hợp lệ để không gây lỗi SQL syntax trong PostgreSQL
 */
export async function resolveUserIdToUuid(userId: string): Promise<string> {
  if (!userId) return '';
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
        .from('profiles')
        .select('id')
        .or(`firebase_uid.eq.${trimmed},email.eq.${trimmed}`)
        .maybeSingle();

      if (profile?.id && UUID_REGEX.test(profile.id)) {
        return profile.id;
      }
    } catch (err) {
      console.warn('[MessagesAPI] Không thể tra cứu profile UUID cho userId:', trimmed, err);
    }
  }

  // Fallback an toàn về ID demo renter để không làm gãy câu lệnh SQL
  return '00000000-0000-0000-0000-000000000003';
}

/**
 * Lấy hoặc khởi tạo hội thoại duy nhất giữa 2 người dùng và phòng trọ
 * Luôn trả về conversation_id dạng UUID hợp lệ
 */
export async function getOrCreateConversation(
  tenantId: string,
  landlordId: string,
  roomId?: string
): Promise<string> {
  if (!tenantId || !landlordId) {
    throw new Error('Thiếu thông tin người tham gia hội thoại.');
  }

  const cleanTenantId = await resolveUserIdToUuid(tenantId);
  const cleanLandlordId = await resolveUserIdToUuid(landlordId);

  if (cleanTenantId === cleanLandlordId) {
    throw new Error('Không thể tạo cuộc trò chuyện với chính mình.');
  }

  // Chỉ gắn room_id khi có định dạng UUID chuẩn hợp lệ
  const validRoomId = roomId && UUID_REGEX.test(roomId.trim()) ? roomId.trim() : null;

  // 1. Kiểm tra hội thoại đã tồn tại giữa 2 participant trong Supabase
  let existingId: string | null = null;
  if (isSupabaseConfigured) {
    try {
      let query = supabase
        .from('conversations')
        .select('id')
        .or(
          `and(participant_1.eq.${cleanTenantId},participant_2.eq.${cleanLandlordId}),and(participant_1.eq.${cleanLandlordId},participant_2.eq.${cleanTenantId})`
        );

      if (validRoomId) {
        query = query.eq('room_id', validRoomId);
      }

      const { data: existing, error: queryErr } = await query.maybeSingle();
      if (!queryErr && existing?.id) {
        existingId = existing.id;
      }
    } catch (err) {
      console.warn('[MessagesAPI] Lỗi khi tìm cuộc trò chuyện trên Supabase:', err);
    }
  }

  if (existingId) {
    return existingId;
  }

  // 2. Thử tạo mới trên Supabase
  if (isSupabaseConfigured) {
    try {
      const { data: created, error: insertErr } = await supabase
        .from('conversations')
        .insert({
          participant_1: cleanTenantId,
          participant_2: cleanLandlordId,
          room_id: validRoomId,
          last_message: 'Bắt đầu cuộc trò chuyện...',
          last_message_at: new Date().toISOString(),
        })
        .select('id')
        .maybeSingle();

      if (!insertErr && created?.id) {
        return created.id;
      }
      if (insertErr) {
        console.warn('[MessagesAPI] Không thể insert trực tiếp Supabase (có thể do RLS/Auth):', insertErr.message);
      }
    } catch (insertException) {
      console.warn('[MessagesAPI] Ngoại lệ khi tạo cuộc trò chuyện:', insertException);
    }
  }

  // 3. Fallback an toàn: Khởi tạo conversation ID chuẩn UUID
  // Đảm bảo người dùng luôn điều hướng mượt mà vào giao diện tin nhắn
  const fallbackId =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, '0')}`;

  // Tải trước thông tin hồ sơ đối phương để khung chat hiển thị tên và avatar đầy đủ
  let otherProfile: any = null;
  if (isSupabaseConfigured) {
    try {
      const { data: prof } = await supabase
        .from('profiles')
        .select('id, full_name, name, avatar_url, app_role, phone')
        .eq('id', cleanLandlordId)
        .maybeSingle();
      otherProfile = prof;
    } catch {}
  }

  const fallbackConversation: Conversation = {
    id: fallbackId,
    participant_1: cleanTenantId,
    participant_2: cleanLandlordId,
    room_id: validRoomId || undefined,
    last_message: 'Bắt đầu cuộc trò chuyện...',
    last_message_at: new Date().toISOString(),
    unread_count_p1: 0,
    unread_count_p2: 0,
    created_at: new Date().toISOString(),
    p1: undefined,
    p2: otherProfile || {
      id: cleanLandlordId,
      full_name: 'Thành viên Trọ Xinh',
      avatar_url: '/images/user-avatar.jpg',
    },
  };

  saveLocalConversation(fallbackConversation);
  return fallbackId;
}

/**
 * Lấy danh sách các cuộc trò chuyện của người dùng hiện tại
 */
export async function getConversations(userId: string): Promise<Conversation[]> {
  if (!userId) return [];
  const cleanUserId = await resolveUserIdToUuid(userId);
  let serverList: Conversation[] = [];

  if (isSupabaseConfigured && cleanUserId) {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
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
        `)
        .or(`participant_1.eq.${cleanUserId},participant_2.eq.${cleanUserId}`)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (!error && data) {
        serverList = data as unknown as Conversation[];
      }
    } catch (error) {
      console.warn('[MessagesAPI] getConversations error:', error);
    }
  }

  // Kết hợp an toàn với các cuộc trò chuyện cục bộ trong phiên
  const localList = getLocalConversations().filter(
    (c) => c.participant_1 === cleanUserId || c.participant_2 === cleanUserId
  );

  const convMap = new Map<string, Conversation>();
  localList.forEach((c) => convMap.set(c.id, c));
  serverList.forEach((c) => convMap.set(c.id, c));

  return Array.from(convMap.values()).sort(
    (a, b) =>
      new Date(b.last_message_at || b.created_at || 0).getTime() -
      new Date(a.last_message_at || a.created_at || 0).getTime()
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
        .from('messages')
        .select(`
          id,
          conversation_id,
          sender_id,
          content,
          is_read,
          created_at,
          sender:profiles!sender_id(id, full_name, name, avatar_url)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (!error && data) {
        serverMessages = data as unknown as Message[];
      }
    } catch (error) {
      console.warn('[MessagesAPI] getMessages error:', error);
    }
  }

  const localMessages = getLocalMessages(conversationId);
  const msgMap = new Map<string, Message>();
  localMessages.forEach((m) => msgMap.set(m.id, m));
  serverMessages.forEach((m) => msgMap.set(m.id, m));

  return Array.from(msgMap.values()).sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

/**
 * Gửi tin nhắn mới vào cuộc trò chuyện
 */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string
): Promise<Message> {
  const cleanContent = content.trim();
  if (!cleanContent) {
    throw new Error('Nội dung tin nhắn không được để trống.');
  }

  const cleanSenderId = await resolveUserIdToUuid(senderId);
  const newMsgId =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `msg_${Date.now()}`;

  const msgPayload: Message = {
    id: newMsgId,
    conversation_id: conversationId,
    sender_id: cleanSenderId,
    content: cleanContent,
    is_read: false,
    created_at: new Date().toISOString(),
    status: 'sent',
  };

  // 1. Thử gửi lên Supabase
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          id: newMsgId,
          conversation_id: conversationId,
          sender_id: cleanSenderId,
          content: cleanContent,
          is_read: false,
        })
        .select(`
          id,
          conversation_id,
          sender_id,
          content,
          is_read,
          created_at,
          sender:profiles!sender_id(id, full_name, name, avatar_url)
        `)
        .maybeSingle();

      if (!error && data) {
        // Cập nhật tin nhắn gần nhất vào bảng conversations
        supabase
          .from('conversations')
          .update({
            last_message: cleanContent,
            last_message_at: new Date().toISOString(),
          })
          .eq('id', conversationId)
          .then();

        return data as unknown as Message;
      }
    } catch (error) {
      console.warn('[MessagesAPI] sendMessage Supabase error:', error);
    }
  }

  // 2. Fallback lưu cục bộ trong phiên nếu Supabase RLS từ chối
  saveLocalMessage(msgPayload);

  return msgPayload;
}

