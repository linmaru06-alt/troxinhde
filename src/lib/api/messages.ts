import { supabase, isSupabaseConfigured } from '../supabase';

export async function getConversations(userId: string) {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from('conversations')
    .select(`
      *,
      rooms(id, title, price, images),
      p1:profiles!participant_1(id, full_name, avatar_url, app_role, phone),
      p2:profiles!participant_2(id, full_name, avatar_url, app_role, phone)
    `)
    .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
    .order('last_message_at', { ascending: false, nullsFirst: false });

  if (error) throw error;
  return data || [];
}

export async function getMessages(conversationId: string) {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      sender:profiles!sender_id(id, full_name, avatar_url)
    `)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function sendMessage(conversationId: string, senderId: string, content: string) {
  if (!isSupabaseConfigured) {
    return { id: `msg_${Date.now()}`, conversation_id: conversationId, sender_id: senderId, content, created_at: new Date().toISOString() };
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      content,
      is_read: false,
    })
    .select()
    .single();

  if (error) throw error;

  // Update conversation's last message
  await supabase
    .from('conversations')
    .update({
      last_message: content,
      last_message_at: new Date().toISOString(),
    })
    .eq('id', conversationId);

  return data;
}

export async function createConversation(p1: string, p2: string, roomId?: string) {
  if (!isSupabaseConfigured) {
    return { id: `conv_${Date.now()}`, participant_1: p1, participant_2: p2, room_id: roomId };
  }

  const { data, error } = await supabase
    .from('conversations')
    .upsert(
      {
        participant_1: p1,
        participant_2: p2,
        room_id: roomId || null,
      },
      { onConflict: 'participant_1,participant_2,room_id' }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}
