-- ==============================================================================
-- MIGRATION 022: USER BLOCKS, HIDDEN MARKETPLACE ITEMS & CAN_MESSAGE RPC
-- ==============================================================================
-- 1. Bảng public.user_blocks: Quản lý danh sách người dùng bị chặn.
--    - BẢO MẬT & QUYỀN RIÊNG TƯ: Chỉ người chặn (blocker_id) hoặc admin mới xem được.
--      Tuyệt đối KHÔNG cho người bị chặn (blocked_id) xem bảng này.
-- 2. Bảng public.user_hidden_items: Quản lý tin chợ đồ cũ đã ẩn của người dùng.
--    - item_id ON DELETE CASCADE: Khi tin bị xóa thì dòng ẩn tự động mất theo.
-- 3. Hàm RPC is_blocked_between: Kiểm tra quan hệ chặn 2 chiều (STABLE, SECURITY DEFINER).
-- 4. Hàm RPC can_message: Kiểm tra xem 2 người có thể nhắn tin cho nhau không.
-- 5. Cập nhật find_or_create_conversation & messages RLS: Chặn tạo hội thoại và gửi tin.
-- ==============================================================================

-- 1. BẢNG USER_BLOCKS
CREATE TABLE IF NOT EXISTS public.user_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_user_blocks UNIQUE (blocker_id, blocked_id),
  CONSTRAINT chk_user_blocks_not_self CHECK (blocker_id <> blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON public.user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON public.user_blocks(blocked_id);

-- RLS USER_BLOCKS: Chỉ người chặn và Admin được xem/thêm/xóa
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Blocker or admin can view blocks" ON public.user_blocks;
CREATE POLICY "Blocker or admin can view blocks"
  ON public.user_blocks FOR SELECT
  USING (
    blocker_id = public.current_profile_id()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Blocker can insert block" ON public.user_blocks;
CREATE POLICY "Blocker can insert block"
  ON public.user_blocks FOR INSERT
  WITH CHECK (
    (blocker_id = public.current_profile_id() OR public.is_admin())
    AND blocker_id <> blocked_id
  );

DROP POLICY IF EXISTS "Blocker or admin can delete block" ON public.user_blocks;
CREATE POLICY "Blocker or admin can delete block"
  ON public.user_blocks FOR DELETE
  USING (
    blocker_id = public.current_profile_id()
    OR public.is_admin()
  );

-- 2. BẢNG USER_HIDDEN_ITEMS (Chợ đồ cũ)
CREATE TABLE IF NOT EXISTS public.user_hidden_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.marketplace_items(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_user_hidden_items UNIQUE (user_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_user_hidden_items_user ON public.user_hidden_items(user_id);
CREATE INDEX IF NOT EXISTS idx_user_hidden_items_item ON public.user_hidden_items(item_id);

-- RLS USER_HIDDEN_ITEMS: Chỉ chủ sở hữu hoặc admin
ALTER TABLE public.user_hidden_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User or admin view hidden items" ON public.user_hidden_items;
CREATE POLICY "User or admin view hidden items"
  ON public.user_hidden_items FOR SELECT
  USING (
    user_id = public.current_profile_id()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "User or admin insert hidden items" ON public.user_hidden_items;
CREATE POLICY "User or admin insert hidden items"
  ON public.user_hidden_items FOR INSERT
  WITH CHECK (
    user_id = public.current_profile_id()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "User or admin delete hidden items" ON public.user_hidden_items;
CREATE POLICY "User or admin delete hidden items"
  ON public.user_hidden_items FOR DELETE
  USING (
    user_id = public.current_profile_id()
    OR public.is_admin()
  );

-- 3. HÀM IS_BLOCKED_BETWEEN: Kiểm tra xem giữa 2 user có ai chặn ai không
CREATE OR REPLACE FUNCTION public.is_blocked_between(p_uid1 UUID, p_uid2 UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_blocks
    WHERE (blocker_id = p_uid1 AND blocked_id = p_uid2)
       OR (blocker_id = p_uid2 AND blocked_id = p_uid1)
  );
$$;

-- 4. HÀM CAN_MESSAGE: RPC trả về quyền gửi tin nhắn cho đúng cặp đang mở hội thoại
CREATE OR REPLACE FUNCTION public.can_message(p_other_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_me UUID;
BEGIN
  v_me := public.current_profile_id();
  IF v_me IS NULL OR p_other_id IS NULL THEN
    RETURN false;
  END IF;

  IF v_me = p_other_id THEN
    RETURN false;
  END IF;

  RETURN NOT public.is_blocked_between(v_me, p_other_id);
END;
$$;

-- 5. CẬP NHẬT FUNCTION FIND_OR_CREATE_CONVERSATION
-- Thêm kiểm tra chặn liên hệ 2 chiều với thông báo trung lập
CREATE OR REPLACE FUNCTION public.find_or_create_conversation(p_item_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_caller_id UUID;
  v_seller_id UUID;
  v_seller_is_banned BOOLEAN;
  v_seller_banned_until TIMESTAMPTZ;
  v_new_conv_count INTEGER;
  v_title TEXT;
  v_price BIGINT;
  v_images JSONB;
  v_p1 UUID;
  v_p2 UUID;
  v_conv_id UUID;
  v_last_item_id UUID;
  v_is_new BOOLEAN := false;
  v_context_inserted BOOLEAN := false;
  v_summary TEXT;
  v_card_content TEXT;
BEGIN
  -- 1. Lấy caller profile id từ phiên đăng nhập Firebase qua JWT
  v_caller_id := public.current_profile_id();

  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Vui lòng đăng nhập để bắt đầu trò chuyện' USING ERRCODE = '42501';
  END IF;

  -- 2. Lấy thông tin người bán và món đồ từ DB theo p_item_id
  SELECT user_id, title, price, images
  INTO v_seller_id, v_title, v_price, v_images
  FROM public.marketplace_items
  WHERE id = p_item_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Món đồ không tồn tại hoặc đã bị xóa' USING ERRCODE = 'P0002';
  END IF;

  IF v_seller_id IS NULL THEN
    RAISE EXCEPTION 'Món đồ thiếu thông tin người bán hợp lệ' USING ERRCODE = 'P0002';
  END IF;

  -- 3. Từ chối tự nhắn tin cho chính mình
  IF v_caller_id = v_seller_id THEN
    RAISE EXCEPTION 'Không thể tự nhắn tin cho chính mình' USING ERRCODE = 'P0001';
  END IF;

  -- 4. Kiểm tra tài khoản người bán có bị khóa không
  SELECT is_banned, banned_until
  INTO v_seller_is_banned, v_seller_banned_until
  FROM public.profiles
  WHERE id = v_seller_id;

  IF v_seller_is_banned IS TRUE AND (v_seller_banned_until IS NULL OR v_seller_banned_until > now()) THEN
    RAISE EXCEPTION 'Tài khoản người bán hiện đang bị tạm khóa hoặc ngừng hoạt động' USING ERRCODE = 'P0004';
  END IF;

  -- 5. KIỂM TRA CHẶN LIÊN HỆ 2 CHIỀU (Thông báo trung lập, bảo vệ quyền riêng tư)
  IF public.is_blocked_between(v_caller_id, v_seller_id) THEN
    RAISE EXCEPTION 'Không thể gửi tin nhắn trong cuộc trò chuyện này' USING ERRCODE = 'P0005';
  END IF;

  -- 6. Sắp xếp cặp ID để đảm bảo tính nhất quán (deterministic pair)
  v_p1 := LEAST(v_caller_id, v_seller_id);
  v_p2 := GREATEST(v_caller_id, v_seller_id);

  v_summary := '[Món đồ] ' || COALESCE(v_title, 'Món đồ thanh lý') || 
               CASE 
                 WHEN v_price = 0 THEN ' (Đồ tặng miễn phí)' 
                 WHEN v_price IS NOT NULL THEN ' (' || to_char(v_price, 'FM999,999,999,999') || ' đ)'
                 ELSE '' 
               END;

  -- 7. Khóa dòng và tìm cuộc hội thoại đã có giữa 2 người (FOR UPDATE)
  SELECT id, last_item_id
  INTO v_conv_id, v_last_item_id
  FROM public.conversations
  WHERE participant_1 = v_p1 AND participant_2 = v_p2
  FOR UPDATE;

  -- Nếu chưa có hội thoại -> Kiểm tra rate limit và Tạo mới
  IF NOT FOUND THEN
    -- Giới hạn: Mỗi người mở tối đa 10 hội thoại mới trong 1 giờ
    SELECT count(*)
    INTO v_new_conv_count
    FROM public.conversations
    WHERE (participant_1 = v_caller_id OR participant_2 = v_caller_id)
      AND created_at > (now() - interval '1 hour');

    IF v_new_conv_count >= 10 THEN
      RAISE EXCEPTION 'Bạn thao tác quá nhanh, thử lại sau' USING ERRCODE = 'P0003';
    END IF;

    INSERT INTO public.conversations (
      participant_1, 
      participant_2, 
      last_item_id, 
      last_message, 
      last_message_at,
      updated_at
    )
    VALUES (
      v_p1, 
      v_p2, 
      p_item_id, 
      v_summary, 
      now(),
      now()
    )
    ON CONFLICT (LEAST(participant_1, participant_2), GREATEST(participant_1, participant_2))
    DO UPDATE SET 
      updated_at = now()
    RETURNING id, last_item_id INTO v_conv_id, v_last_item_id;

    v_is_new := true;
  END IF;

  -- Khóa lại dòng hội thoại
  SELECT last_item_id INTO v_last_item_id
  FROM public.conversations
  WHERE id = v_conv_id
  FOR UPDATE;

  -- 8. Chèn tin nhắn ngữ cảnh món đồ khi là hội thoại mới hoặc last_item_id khác món đang hỏi
  IF v_is_new OR v_last_item_id IS DISTINCT FROM p_item_id THEN
    v_card_content := jsonb_build_object(
      'type', 'item_context',
      'itemId', p_item_id,
      'title', v_title,
      'price', v_price,
      'image', COALESCE(v_images->>0, ''),
      'summary', v_summary
    )::text;

    -- Chèn tin nhắn hệ thống (sender_id = NULL)
    INSERT INTO public.messages (
      conversation_id,
      sender_id,
      content,
      type,
      item_id,
      is_read,
      created_at
    )
    VALUES (
      v_conv_id,
      NULL,
      v_card_content,
      'item_context',
      p_item_id,
      false,
      now()
    );

    -- Cập nhật last_item_id và last_message vào conversations
    UPDATE public.conversations
    SET last_item_id = p_item_id,
        last_message = v_summary,
        last_message_at = now(),
        updated_at = now()
    WHERE id = v_conv_id;

    v_context_inserted := true;
  END IF;

  -- 9. Trả về kết quả JSON cho frontend
  RETURN jsonb_build_object(
    'conversationId', v_conv_id,
    'isNew', v_is_new,
    'contextInserted', v_context_inserted,
    'itemId', p_item_id,
    'lastItemId', p_item_id
  );
END;
$$;

-- 6. CẬP NHẬT RLS CHO MESSAGES INSERT ĐỂ NGĂN GỬI TIN NẾU BỊ CHẶN
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
