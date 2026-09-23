-- ==============================================================================
-- Migration 018: Quản lý Hội thoại Chợ đồ cũ qua Hàm Postgres SECURITY DEFINER & Chống trùng lặp
-- ==============================================================================

-- 1. Bổ sung các cột mới cho conversations và messages (nếu chưa có)
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS last_item_id UUID REFERENCES public.marketplace_items(id) ON DELETE SET NULL;

ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'text';

ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS item_id UUID REFERENCES public.marketplace_items(id) ON DELETE SET NULL;

-- 2. Gộp các hội thoại bị trùng cặp người dùng trước khi tạo UNIQUE index
-- Chuyển toàn bộ tin nhắn từ các cuộc hội thoại trùng về một hội thoại chính, sau đó xóa các bản ghi thừa
DO $$
DECLARE
  r RECORD;
  i INT;
BEGIN
  FOR r IN
    SELECT 
      LEAST(participant_1, participant_2) AS p1,
      GREATEST(participant_1, participant_2) AS p2,
      array_agg(id ORDER BY created_at DESC) AS conv_ids
    FROM public.conversations
    GROUP BY LEAST(participant_1, participant_2), GREATEST(participant_1, participant_2)
    HAVING count(*) > 1
  LOOP
    -- conv_ids[1] là hội thoại giữ lại (primary)
    FOR i IN 2..array_length(r.conv_ids, 1) LOOP
      -- Chuyển tin nhắn sang hội thoại chính
      UPDATE public.messages 
      SET conversation_id = r.conv_ids[1] 
      WHERE conversation_id = r.conv_ids[i];

      -- Xóa cuộc hội thoại trùng thừa
      DELETE FROM public.conversations 
      WHERE id = r.conv_ids[i];
    END LOOP;
  END LOOP;
END $$;

-- 3. Ràng buộc không cho tự tạo hội thoại với chính mình (CHECK participant_1 <> participant_2)
ALTER TABLE public.conversations 
DROP CONSTRAINT IF EXISTS check_participants_distinct;

ALTER TABLE public.conversations 
ADD CONSTRAINT check_participants_distinct 
CHECK (participant_1 <> participant_2);

-- 4. Ràng buộc UNIQUE INDEX cho cặp người dùng trên bảng conversations
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_user_pair 
ON public.conversations (LEAST(participant_1, participant_2), GREATEST(participant_1, participant_2));

-- 5. Index tối ưu hiệu năng
CREATE INDEX IF NOT EXISTS idx_messages_item_id ON public.messages(item_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_item_id ON public.conversations(last_item_id);

-- 6. Hàm Helper lấy Profile ID từ Firebase JWT hiện tại (Đã có trong 010, tạo mới nếu chưa có)
CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT id FROM public.profiles
  WHERE firebase_uid = COALESCE(auth.jwt() ->> 'sub', auth.jwt() ->> 'user_id')
     OR (email IS NOT NULL AND email = (auth.jwt() ->> 'email'))
  LIMIT 1;
$$;

-- 7. HÀM POSTGRES CHÍNH: find_or_create_conversation(p_item_id UUID)
-- Chạy SECURITY DEFINER trong 1 giao dịch trọn vẹn:
-- - Tự xác thực người gọi qua Firebase JWT
-- - Lấy thông tin người bán từ marketplace_items
-- - Từ chối món không tồn tại / tự nhắn chính mình
-- - Khóa dòng hội thoại (FOR UPDATE) để chống chèn trùng lặp
-- - Chèn tin nhắn hệ thống (type: 'item_context', sender_id: NULL) và cập nhật last_item_id
CREATE OR REPLACE FUNCTION public.find_or_create_conversation(p_item_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_caller_id UUID;
  v_seller_id UUID;
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
  SELECT seller_id, title, price, images
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

  -- 4. Sắp xếp cặp ID để đảm bảo tính nhất quán (deterministic pair)
  v_p1 := LEAST(v_caller_id, v_seller_id);
  v_p2 := GREATEST(v_caller_id, v_seller_id);

  v_summary := '[Món đồ] ' || COALESCE(v_title, 'Món đồ thanh lý') || 
               CASE 
                 WHEN v_price = 0 THEN ' (Đồ tặng miễn phí)' 
                 WHEN v_price IS NOT NULL THEN ' (' || to_char(v_price, 'FM999,999,999,999') || ' đ)'
                 ELSE '' 
               END;

  -- 5. Khóa dòng và tìm cuộc hội thoại đã có giữa 2 người (FOR UPDATE)
  SELECT id, last_item_id
  INTO v_conv_id, v_last_item_id
  FROM public.conversations
  WHERE participant_1 = v_p1 AND participant_2 = v_p2
  FOR UPDATE;

  -- Nếu chưa có hội thoại -> Tạo mới có xử lý ON CONFLICT
  IF NOT FOUND THEN
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

  -- 6. Chèn tin nhắn ngữ cảnh món đồ khi là hội thoại mới hoặc last_item_id khác món đang hỏi
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

  -- 7. Trả về kết quả JSON cho frontend
  RETURN jsonb_build_object(
    'conversationId', v_conv_id,
    'isNew', v_is_new,
    'contextInserted', v_context_inserted,
    'itemId', p_item_id,
    'lastItemId', p_item_id
  );
END;
$$;

-- 8. CẤU HÌNH ROW LEVEL SECURITY (RLS) CHUẨN XÁC
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 8.1. RLS cho conversations
DROP POLICY IF EXISTS "Public access conversations" ON public.conversations;
DROP POLICY IF EXISTS "Participants view conversations" ON public.conversations;

CREATE POLICY "Participants view conversations" ON public.conversations
  FOR SELECT USING (
    participant_1 = public.current_profile_id() 
    OR participant_2 = public.current_profile_id()
    OR public.current_profile_id() IS NULL -- Hỗ trợ demo / guest view
  );

CREATE POLICY "Participants update conversations" ON public.conversations
  FOR UPDATE USING (
    participant_1 = public.current_profile_id() 
    OR participant_2 = public.current_profile_id()
  );

-- 8.2. RLS cho messages
-- Ngăn chặn client tự chèn tin nhắn sender_id = NULL hoặc type = 'item_context'
DROP POLICY IF EXISTS "Public access messages" ON public.messages;
DROP POLICY IF EXISTS "Users can insert own text messages" ON public.messages;
DROP POLICY IF EXISTS "Participants view messages" ON public.messages;

CREATE POLICY "Participants view messages" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND (
          c.participant_1 = public.current_profile_id() 
          OR c.participant_2 = public.current_profile_id()
          OR public.current_profile_id() IS NULL
        )
    )
  );

-- Client chỉ được phép gửi tin nhắn khi:
-- 1. sender_id bắt buộc NOT NULL và bằng đúng profile của người gọi
-- 2. type bắt buộc là 'text'
-- 3. Là người tham gia cuộc hội thoại
CREATE POLICY "Users can insert own text messages" ON public.messages
  FOR INSERT WITH CHECK (
    sender_id IS NOT NULL 
    AND sender_id = public.current_profile_id()
    AND (type = 'text' OR type IS NULL)
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = messages.conversation_id
        AND (c.participant_1 = sender_id OR c.participant_2 = sender_id)
    )
  );
