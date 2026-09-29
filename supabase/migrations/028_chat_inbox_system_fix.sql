-- ==============================================================================
-- Migration 028: Sửa lỗi hệ thống Tin nhắn & Hộp thư (Frontend & Backend)
-- ==============================================================================
-- 1. Chuẩn hóa cột unread_count_p1, unread_count_p2, last_message, updated_at trên conversations
-- 2. Đảm bảo RLS cho phép người dùng tạo & cập nhật hội thoại an toàn
-- 3. Tạo RPC get_or_create_conversation cho phòng trọ, ở ghép và trò chuyện chung
-- 4. Tạo RPC mark_conversation_read đánh dấu đã đọc & xóa thông báo tin nhắn
-- 5. Trigger tự động tính unread_count, cập nhật last_message & bắn notification cho người nhận
-- 6. Đảm bảo publication Realtime cho conversations, messages và notifications
-- ==============================================================================

-- 1. CỘT DỮ LIỆU BẢO ĐẢM
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS unread_count_p1 INTEGER DEFAULT 0;

ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS unread_count_p2 INTEGER DEFAULT 0;

ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS last_message TEXT;

ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;

ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'text';

ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS item_id UUID;

-- 2. RLS POLICIES CHO CONVERSATIONS
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- 2.1. Policy INSERT cho conversations (khắc phục lỗi không thể mở chat trực tiếp)
DROP POLICY IF EXISTS "Participants can insert conversations" ON public.conversations;
CREATE POLICY "Participants can insert conversations" ON public.conversations
  FOR INSERT WITH CHECK (
    public.current_profile_id() IS NOT NULL
    AND (participant_1 = public.current_profile_id() OR participant_2 = public.current_profile_id())
    AND participant_1 <> participant_2
    AND NOT public.is_blocked_between(participant_1, participant_2)
  );

-- 2.2. Policy UPDATE cho conversations
DROP POLICY IF EXISTS "Participants update conversations" ON public.conversations;
CREATE POLICY "Participants update conversations" ON public.conversations
  FOR UPDATE USING (
    public.current_profile_id() IS NOT NULL
    AND (
      participant_1 = public.current_profile_id()
      OR participant_2 = public.current_profile_id()
      OR public.is_admin()
    )
  )
  WITH CHECK (
    public.current_profile_id() IS NOT NULL
    AND (
      participant_1 = public.current_profile_id()
      OR participant_2 = public.current_profile_id()
      OR public.is_admin()
    )
  );

-- 3. RLS POLICIES CHO MESSAGES
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Dọn dẹp policy cũ từ 021 không có kiểm tra chặn
DROP POLICY IF EXISTS "Users can insert own text messages" ON public.messages;

-- Policy INSERT có kiểm tra quan hệ chặn và hỗ trợ các kiểu tin nhắn (text, item_context, system)
DROP POLICY IF EXISTS "Participants can insert messages if not blocked" ON public.messages;
CREATE POLICY "Participants can insert messages if not blocked"
  ON public.messages FOR INSERT
  WITH CHECK (
    sender_id IS NULL OR (
      sender_id = public.current_profile_id()
      AND EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE c.id = conversation_id
          AND (c.participant_1 = public.current_profile_id() OR c.participant_2 = public.current_profile_id())
          AND NOT public.is_blocked_between(c.participant_1, c.participant_2)
      )
    )
  );

-- Policy UPDATE cho messages (cho phép đánh dấu đã đọc is_read)
DROP POLICY IF EXISTS "Participants can update messages" ON public.messages;
CREATE POLICY "Participants can update messages" ON public.messages
  FOR UPDATE USING (
    public.current_profile_id() IS NOT NULL
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1 FROM public.conversations c
        WHERE c.id = messages.conversation_id
          AND (c.participant_1 = public.current_profile_id() OR c.participant_2 = public.current_profile_id())
      )
    )
  );

-- 4. HÀM RPC: GET_OR_CREATE_CONVERSATION
-- Dùng cho phòng trọ, ở ghép và kết nối trực tiếp
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(
  p_partner_id UUID,
  p_room_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_p1 UUID;
  v_p2 UUID;
  v_conv_id UUID;
  v_partner_banned BOOLEAN;
BEGIN
  v_caller_id := public.current_profile_id();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Vui lòng đăng nhập để mở cuộc trò chuyện.' USING ERRCODE = '42501';
  END IF;

  IF p_partner_id IS NULL THEN
    RAISE EXCEPTION 'Thiếu thông tin người nhận.' USING ERRCODE = 'P0001';
  END IF;

  IF v_caller_id = p_partner_id THEN
    RAISE EXCEPTION 'Không thể tự trò chuyện với chính mình.' USING ERRCODE = 'P0002';
  END IF;

  -- Sắp xếp thứ tự ID để chống trùng lặp cặp người dùng
  IF v_caller_id < p_partner_id THEN
    v_p1 := v_caller_id;
    v_p2 := p_partner_id;
  ELSE
    v_p1 := p_partner_id;
    v_p2 := v_caller_id;
  END IF;

  -- Kiểm tra quan hệ chặn 2 chiều
  IF public.is_blocked_between(v_p1, v_p2) THEN
    RAISE EXCEPTION 'Không thể gửi tin nhắn trong cuộc trò chuyện này' USING ERRCODE = 'P0005';
  END IF;

  -- Kiểm tra người nhận có bị tạm khóa/cấm tài khoản không
  SELECT is_banned INTO v_partner_banned
  FROM public.profiles
  WHERE id = p_partner_id;

  IF v_partner_banned IS TRUE THEN
    RAISE EXCEPTION 'Tài khoản người dùng hiện đang bị tạm khóa hoặc ngừng hoạt động.' USING ERRCODE = 'P0004';
  END IF;

  -- 1. Tìm cuộc hội thoại đã có giữa cặp người dùng (sử dụng FOR UPDATE để tránh race-condition)
  SELECT id INTO v_conv_id
  FROM public.conversations
  WHERE participant_1 = v_p1 AND participant_2 = v_p2
  FOR UPDATE;

  IF v_conv_id IS NOT NULL THEN
    -- Nếu có room_id mà cuộc hội thoại hiện chưa gán thì cập nhật liên kết phòng
    IF p_room_id IS NOT NULL THEN
      UPDATE public.conversations
      SET room_id = COALESCE(room_id, p_room_id),
          updated_at = now()
      WHERE id = v_conv_id;
    END IF;
    RETURN v_conv_id;
  END IF;

  -- 2. Nếu chưa có -> Tạo mới
  INSERT INTO public.conversations (
    participant_1,
    participant_2,
    room_id,
    last_message,
    last_message_at,
    unread_count_p1,
    unread_count_p2,
    created_at,
    updated_at
  )
  VALUES (
    v_p1,
    v_p2,
    p_room_id,
    'Bắt đầu cuộc trò chuyện...',
    now(),
    0,
    0,
    now(),
    now()
  )
  ON CONFLICT (LEAST(participant_1, participant_2), GREATEST(participant_1, participant_2))
  DO UPDATE SET updated_at = now()
  RETURNING id INTO v_conv_id;

  RETURN v_conv_id;
END;
$$;

-- 5. HÀM RPC: MARK_CONVERSATION_READ
-- Đánh dấu toàn bộ tin nhắn trong hội thoại là đã đọc, đặt lại unread_count = 0, xóa thông báo chưa đọc
CREATE OR REPLACE FUNCTION public.mark_conversation_read(p_conversation_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_p1 UUID;
  v_p2 UUID;
BEGIN
  v_user_id := public.current_profile_id();
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  SELECT participant_1, participant_2
  INTO v_p1, v_p2
  FROM public.conversations
  WHERE id = p_conversation_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Chỉ người tham gia hội thoại (hoặc admin) mới được thao tác
  IF v_user_id <> v_p1 AND v_user_id <> v_p2 AND NOT public.is_admin() THEN
    RETURN;
  END IF;

  -- 1. Đánh dấu tất cả tin nhắn gửi cho mình thành đã đọc (is_read = true)
  UPDATE public.messages
  SET is_read = true
  WHERE conversation_id = p_conversation_id
    AND (sender_id IS NULL OR sender_id <> v_user_id)
    AND (is_read = false OR is_read IS NULL);

  -- 2. Đặt lại bộ đếm unread_count tương ứng của mình về 0
  IF v_user_id = v_p1 THEN
    UPDATE public.conversations
    SET unread_count_p1 = 0,
        updated_at = now()
    WHERE id = p_conversation_id;
  ELSIF v_user_id = v_p2 THEN
    UPDATE public.conversations
    SET unread_count_p2 = 0,
        updated_at = now()
    WHERE id = p_conversation_id;
  END IF;

  -- 3. Đánh dấu các thông báo liên quan đến hội thoại này là đã đọc
  UPDATE public.notifications
  SET is_read = true
  WHERE user_id = v_user_id
    AND (is_read = false OR is_read IS NULL)
    AND (
      cta_url LIKE '%' || p_conversation_id::text || '%'
      OR (type = 'chat_message' AND cta_url LIKE '%/tin-nhan/%')
    );
END;
$$;

-- 6. TRIGGER TỰ ĐỘNG XỬ LÝ KHI CÓ TIN NHẮN MỚI
-- Cập nhật conversations.last_message, last_message_at, tăng unread_count và tạo thông báo cho người nhận
CREATE OR REPLACE FUNCTION public.handle_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_p1 UUID;
  v_p2 UUID;
  v_receiver_id UUID;
  v_sender_name TEXT;
  v_preview TEXT;
BEGIN
  -- Lấy thông tin người tham gia hội thoại
  SELECT participant_1, participant_2
  INTO v_p1, v_p2
  FROM public.conversations
  WHERE id = NEW.conversation_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Xác định người nhận
  IF NEW.sender_id = v_p1 THEN
    v_receiver_id := v_p2;
  ELSIF NEW.sender_id = v_p2 THEN
    v_receiver_id := v_p1;
  ELSE
    -- Tin nhắn hệ thống (sender_id IS NULL)
    v_receiver_id := NULL;
  END IF;

  -- Rút gọn nội dung xem trước
  IF NEW.type = 'item_context' THEN
    v_preview := '[Món đồ] Đã gửi thông tin món đồ';
  ELSIF NEW.content IS NOT NULL AND LENGTH(TRIM(NEW.content)) > 0 THEN
    v_preview := LEFT(TRIM(NEW.content), 80);
    IF LENGTH(TRIM(NEW.content)) > 80 THEN
      v_preview := v_preview || '...';
    END IF;
  ELSE
    v_preview := 'Tin nhắn mới';
  END IF;

  -- Cập nhật cuộc hội thoại: last_message, last_message_at, và tăng unread_count người nhận
  IF NEW.sender_id = v_p1 THEN
    UPDATE public.conversations
    SET last_message = v_preview,
        last_message_at = NEW.created_at,
        unread_count_p2 = COALESCE(unread_count_p2, 0) + 1,
        updated_at = now()
    WHERE id = NEW.conversation_id;
  ELSIF NEW.sender_id = v_p2 THEN
    UPDATE public.conversations
    SET last_message = v_preview,
        last_message_at = NEW.created_at,
        unread_count_p1 = COALESCE(unread_count_p1, 0) + 1,
        updated_at = now()
    WHERE id = NEW.conversation_id;
  ELSE
    -- Tin nhắn hệ thống
    UPDATE public.conversations
    SET last_message = v_preview,
        last_message_at = NEW.created_at,
        updated_at = now()
    WHERE id = NEW.conversation_id;
  END IF;

  -- Tự động chèn thông báo cho người nhận (nếu có người nhận hợp lệ và có sender)
  IF v_receiver_id IS NOT NULL AND NEW.sender_id IS NOT NULL THEN
    SELECT COALESCE(full_name, name, 'Người dùng')
    INTO v_sender_name
    FROM public.profiles
    WHERE id = NEW.sender_id;

    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      body,
      cta_url,
      cta_label,
      is_read,
      created_at
    )
    VALUES (
      v_receiver_id,
      'chat_message',
      'Tin nhắn từ ' || COALESCE(v_sender_name, 'Người dùng') || ' 💬',
      v_preview,
      '/tin-nhan/' || NEW.conversation_id::text,
      'Trả lời ngay',
      false,
      now()
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_handle_new_message ON public.messages;
CREATE TRIGGER trg_handle_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_message();

-- 7. BẢO ĐẢM PUBLICATION SUPABASE REALTIME
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'conversations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;
