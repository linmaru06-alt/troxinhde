-- ==============================================================================
-- MIGRATION 023: TỰ ĐỘNG KIỂM DUYỆT VÀ ẨN TIN ĐĂNG KHI ĐẠT NGƯỠNG BÁO CÁO (AUTO-MODERATION)
-- ==============================================================================
-- 1. Hằng số ngưỡng: 3 người báo cáo khác nhau (c_auto_moderation_threshold = 3)
-- 2. Chỉ tính các báo cáo có trạng thái 'moi' hoặc 'dang_xu_ly'
-- 3. 3 báo cáo từ cùng 1 người chỉ tính là 1 (COUNT(DISTINCT reporter_id) = 1) -> Không kích hoạt
-- 4. Khi đạt ngưỡng: chuyển status = 'pending', moderation_status = 'pending', ẩn khỏi chợ
-- 5. Gửi thông báo cho người đăng: "tin đang được xem xét lại"
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_auto_moderation_on_reports()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  -- Hằng số ngưỡng tự động kiểm duyệt: dễ dàng điều chỉnh tại đây
  c_auto_moderation_threshold CONSTANT INTEGER := 3;
  v_distinct_reporters INTEGER;
  v_target_uuid UUID;
  v_item_title TEXT;
  v_owner_id UUID;
  v_updated_id UUID;
BEGIN
  -- Chỉ áp dụng cho đối tượng tin đăng
  IF NEW.target_type <> 'tin_dang' THEN
    RETURN NEW;
  END IF;

  -- Kiểm tra target_id có đúng định dạng UUID hay không
  IF NEW.target_id IS NULL OR NEW.target_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN NEW;
  END IF;

  v_target_uuid := NEW.target_id::uuid;

  -- Đếm số lượng người báo cáo khác nhau có báo cáo ở trạng thái 'moi' hoặc 'dang_xu_ly'
  SELECT COUNT(DISTINCT reporter_id)
  INTO v_distinct_reporters
  FROM public.reports
  WHERE target_type = 'tin_dang'
    AND target_id = NEW.target_id
    AND status IN ('moi', 'dang_xu_ly')
    AND reporter_id IS NOT NULL;

  -- Nếu số người báo cáo khác nhau đạt hoặc vượt ngưỡng
  IF v_distinct_reporters >= c_auto_moderation_threshold THEN
    -- Cập nhật tin đăng sang trạng thái chờ duyệt lại (ẩn khỏi chợ)
    -- Chỉ thực hiện nếu tin chưa ở trạng thái pending để đảm bảo tính bất biến (idempotent)
    UPDATE public.marketplace_items
    SET status = 'pending',
        moderation_status = 'pending',
        updated_at = now()
    WHERE id = v_target_uuid
      AND (status <> 'pending' OR moderation_status <> 'pending')
    RETURNING id, title, user_id INTO v_updated_id, v_item_title, v_owner_id;

    -- Nếu tin vừa được chuyển trạng thái sang chờ duyệt lại -> Gửi thông báo cho người đăng
    IF v_updated_id IS NOT NULL AND v_owner_id IS NOT NULL THEN
      BEGIN
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
          v_owner_id,
          'moderation',
          'Tin đăng đang được xem xét lại',
          'Tin đăng "' || COALESCE(v_item_title, 'của bạn') || '" của bạn đang được xem xét lại do nhận được nhiều phản ánh từ cộng đồng và đã tạm thời được ẩn khỏi chợ.',
          '/cho-do-cu/' || NEW.target_id || '?edit=true',
          'Sửa tin & gửi duyệt lại',
          false,
          now()
        );
      EXCEPTION
        WHEN OTHERS THEN
          -- Ghi log cảnh báo nếu có lỗi bảng thông báo, không làm rollback giao dịch báo cáo
          RAISE WARNING 'Không thể tạo thông báo kiểm duyệt tự động: %', SQLERRM;
      END;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Đăng ký trigger sau khi chèn mới hoặc cập nhật trạng thái báo cáo
DROP TRIGGER IF EXISTS trg_auto_moderation_reports ON public.reports;
CREATE TRIGGER trg_auto_moderation_reports
  AFTER INSERT OR UPDATE OF status ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_auto_moderation_on_reports();
