import { supabase, isSupabaseConfigured } from '../supabase';
import { Conversation, Message } from '../../types';

/**
 * Lấy hoặc khởi tạo hội thoại duy nhất giữa người thuê, chủ trọ và phòng trọ
 * Trả về conversation_id dạng UUID từ Supabase
 */
export async function getOrCreateConversation(
  tenantId: string,
  landlordId: string,
  roomId?: string
): Promise<string> {
  if (!isSupabaseConfigured) {
    throw new Error('Cơ sở dữ liệu Supabase chưa được cấu hình.');
  }

  if (!tenantId || !landlordId) {
    throw new Error('Thiếu thông tin người tham gia hội thoại.');
  }

  if (tenantId === landlordId) {
    throw new Error('Không thể tạo cuộc trò chuyện với chính mình.');
  }

  // 1. Kiểm tra hội thoại đã tồn tại giữa 2 participant (hỗ trợ cả p1 và p2 hoán đổi vị trí)
  let query = supabase
    .from('conversations')
    .select('id')
    .or(
      `and(participant_1.eq.${tenantId},participant_2.eq.${landlordId}),and(participant_1.eq.${landlordId},participant_2.eq.${tenantId})`
    );

  if (roomId) {
    query = query.eq('room_id', roomId);
  }

  const { data: existing, error: queryErr } = await query.maybeSingle();

  if (queryErr) {
    console.warn('[MessagesAPI] Lỗi khi tìm cuộc trò chuyện cũ:', queryErr);
  }

  if (existing?.id) {
    return existing.id;
  }

  // 2. Chưa có -> Tạo mới và nhận UUID do Supabase sinh
  const { data: created, error: insertErr } = await supabase
    .from('conversations')
    .insert({
      participant_1: tenantId,
      participant_2: landlordId,
      room_id: roomId || null,
      last_message: 'Bắt đầu cuộc trò chuyện...',
      last_message_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (insertErr) {
    console.error('[MessagesAPI] Lỗi khi tạo conversation mới:', insertErr);
    // Nếu có race condition hoặc đã được tạo cùng lúc -> query lại
    const { data: retry } = await query.maybeSingle();
    if (retry?.id) return retry.id;
    throw insertErr;
  }

  return created.id;
}

/**
 * Lấy danh sách các cuộc trò chuyện của người dùng hiện tại
 */
export async function getConversations(userId: string): Promise<Conversation[]> {
  if (!isSupabaseConfigured || !userId) return [];

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
    .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
    .order('last_message_at', { ascending: false, nullsFirst: false });

  if (error) {
    console.error('[MessagesAPI] getConversations error:', error);
    throw error;
  }

  return (data as unknown as Conversation[]) || [];
}

/**
 * Lấy lịch sử tin nhắn của một cuộc trò chuyện
 */
export async function getMessages(conversationId: string): Promise<Message[]> {
  if (!isSupabaseConfigured || !conversationId) return [];

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

  if (error) {
    console.error('[MessagesAPI] getMessages error:', error);
    throw error;
  }

  return (data as unknown as Message[]) || [];
}

/**
 * Gửi tin nhắn mới vào cuộc trò chuyện
 */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string
): Promise<Message> {
  if (!isSupabaseConfigured) {
    throw new Error('Cơ sở dữ liệu Supabase chưa được cấu hình.');
  }

  const cleanContent = content.trim();
  if (!cleanContent) {
    throw new Error('Nội dung tin nhắn không được để trống.');
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
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
    .single();

  if (error) {
    console.error('[MessagesAPI] sendMessage error:', error);
    throw error;
  }

  // Cập nhật tin nhắn gần nhất vào bảng conversations
  try {
    await supabase
      .from('conversations')
      .update({
        last_message: cleanContent,
        last_message_at: new Date().toISOString(),
      })
      .eq('id', conversationId);
  } catch (updateErr) {
    console.warn('[MessagesAPI] Không thể cập nhật last_message cho conversation:', updateErr);
  }

  return data as unknown as Message;
}
