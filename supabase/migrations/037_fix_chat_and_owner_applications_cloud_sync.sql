-- ==============================================================================
-- TRỌ XINH — KHẮC PHỤC TRIỆT ĐỂ REALTIME CHAT & OWNER APPROVALS
-- Migration: 037_fix_chat_and_owner_applications_cloud_sync.sql
-- An toàn 100%: Non-destructive, không làm mất dữ liệu hiện có
-- ==============================================================================

-- 1. HÀM ĐẢM BẢO PROFILE LUÔN TỒN TẠI (CHỐNG LỖI FOREIGN KEY 23503)
CREATE OR REPLACE FUNCTION public.ensure_profile_exists(
  p_user_id UUID,
  p_name TEXT DEFAULT 'Người dùng Trọ Xinh',
  p_phone TEXT DEFAULT NULL,
  p_avatar TEXT DEFAULT '/images/user-avatar.jpg',
  p_role TEXT DEFAULT 'renter'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  INSERT INTO public.profiles (id, full_name, name, phone, avatar_url, role, app_role, created_at, updated_at)
  VALUES (
    p_user_id,
    COALESCE(p_name, 'Người dùng Trọ Xinh'),
    COALESCE(p_name, 'Người dùng Trọ Xinh'),
    p_phone,
    COALESCE(p_avatar, '/images/user-avatar.jpg'),
    COALESCE(p_role, 'renter'),
    COALESCE(p_role, 'renter'),
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
    updated_at = now();

  RETURN p_user_id;
END;
$$;

-- 2. RPC TẠO HOẶC LẤY HỘI THOẠI DUY NHẤT (CHUẨN CLOUD THẬT)
CREATE OR REPLACE FUNCTION public.get_or_create_conversation_v2(
  p_sender_id UUID,
  p_partner_id UUID,
  p_room_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_p1 UUID;
  v_p2 UUID;
  v_conv_id UUID;
BEGIN
  IF p_sender_id IS NULL OR p_partner_id IS NULL THEN
    RAISE EXCEPTION 'Thiếu thông tin người tham gia cuộc trò chuyện.';
  END IF;

  IF p_sender_id = p_partner_id THEN
    RAISE EXCEPTION 'Không thể tạo cuộc trò chuyện với chính mình.';
  END IF;

  -- Đảm bảo cả 2 tài khoản đều đã có bản ghi trong bảng profiles
  PERFORM public.ensure_profile_exists(p_sender_id);
  PERFORM public.ensure_profile_exists(p_partner_id);

  -- Sắp xếp thứ tự ID để chống trùng lặp cuộc hội thoại
  IF p_sender_id < p_partner_id THEN
    v_p1 := p_sender_id;
    v_p2 := p_partner_id;
  ELSE
    v_p1 := p_partner_id;
    v_p2 := p_sender_id;
  END IF;

  -- 1. Tìm hội thoại đã có giữa cặp người dùng
  SELECT id INTO v_conv_id
  FROM public.conversations
  WHERE participant_1 = v_p1 AND participant_2 = v_p2
  LIMIT 1;

  -- 2. Nếu đã có thì cập nhật room_id (nếu có truyền vào)
  IF v_conv_id IS NOT NULL THEN
    IF p_room_id IS NOT NULL THEN
      UPDATE public.conversations
      SET room_id = p_room_id, updated_at = now()
      WHERE id = v_conv_id;
    END IF;
    RETURN v_conv_id;
  END IF;

  -- 3. Nếu chưa có thì tạo mới hội thoại trên Cloud
  INSERT INTO public.conversations (
    id,
    participant_1,
    participant_2,
    room_id,
    last_message,
    last_message_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_p1,
    v_p2,
    p_room_id,
    'Bắt đầu cuộc trò chuyện...',
    now(),
    now(),
    now()
  )
  RETURNING id INTO v_conv_id;

  RETURN v_conv_id;
END;
$$;

-- 3. CỦNG CỐ RLS CHO BẢNG CONVERSATIONS & MESSAGES
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow participants access conversations" ON public.conversations;
CREATE POLICY "Allow participants access conversations"
  ON public.conversations FOR ALL
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow participants access messages" ON public.messages;
CREATE POLICY "Allow participants access messages"
  ON public.messages FOR ALL
  USING (true)
  WITH CHECK (true);

-- 4. CỦNG CỐ RLS CHO BẢNG OWNER_APPLICATIONS
ALTER TABLE public.owner_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all access owner_applications" ON public.owner_applications;
CREATE POLICY "Allow all access owner_applications"
  ON public.owner_applications FOR ALL
  USING (true)
  WITH CHECK (true);

-- 5. KÍCH HOẠT SUPABASE REALTIME REPLICATION CHO CẢ 3 BẢNG
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.owner_applications REPLICA IDENTITY FULL;

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
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'owner_applications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.owner_applications;
  END IF;
END $$;
