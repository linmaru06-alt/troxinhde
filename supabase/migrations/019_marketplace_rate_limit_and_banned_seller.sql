-- ==============================================================================
-- MIGRATION 019: BỔ SUNG GIỚI HẠN TẦN SUẤT HỘI THOẠI MỚI & KIỂM TRA NGƯỜI BÁN BỊ KHÓA
-- ==============================================================================
-- 1. Giới hạn: Mỗi người dùng mở tối đa 10 cuộc hội thoại mới về chợ đồ cũ trong 1 giờ.
--    Nếu vượt quá 10 cuộc hội thoại mới trong 1 giờ, báo: "Bạn thao tác quá nhanh, thử lại sau"
-- 2. Kiểm tra tài khoản người bán: Nếu người bán bị khóa (is_banned = true),
--    từ chối tạo hội thoại và báo: "Tài khoản người bán hiện đang bị tạm khóa hoặc ngừng hoạt động"
-- ==============================================================================

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

  -- 5. Sắp xếp cặp ID để đảm bảo tính nhất quán (deterministic pair)
  v_p1 := LEAST(v_caller_id, v_seller_id);
  v_p2 := GREATEST(v_caller_id, v_seller_id);

  v_summary := '[Món đồ] ' || COALESCE(v_title, 'Món đồ thanh lý') || 
               CASE 
                 WHEN v_price = 0 THEN ' (Đồ tặng miễn phí)' 
                 WHEN v_price IS NOT NULL THEN ' (' || to_char(v_price, 'FM999,999,999,999') || ' đ)'
                 ELSE '' 
               END;

  -- 6. Khóa dòng và tìm cuộc hội thoại đã có giữa 2 người (FOR UPDATE)
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

  -- 7. Chèn tin nhắn ngữ cảnh món đồ khi là hội thoại mới hoặc last_item_id khác món đang hỏi
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

  -- 8. Trả về kết quả JSON cho frontend
  RETURN jsonb_build_object(
    'conversationId', v_conv_id,
    'isNew', v_is_new,
    'contextInserted', v_context_inserted,
    'itemId', p_item_id,
    'lastItemId', p_item_id
  );
END;
$$;
