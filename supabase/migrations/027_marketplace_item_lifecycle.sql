-- ==============================================================================
-- MIGRATION 027: VÒNG ĐỜI TIN CHỢ ĐỒ CŨ (ĐÃ BÁN / ĐÃ ĐÓNG / MỞ LẠI / SỬA / XÓA MỀM)
-- ==============================================================================
-- Mục tiêu:
-- 1. Chuẩn hóa trạng thái tin: available | sold | closed | pending | rejected | hidden | deleted
--    và moderation_status: pending | approved | rejected.
-- 2. Chủ tin duy nhất là seller_id (không dùng user_id trên marketplace_items).
-- 3. Client không được tự đổi trạng thái/kiểm duyệt: tin mới luôn vào hàng chờ duyệt,
--    UPDATE/DELETE trực tiếp chỉ dành cho admin.
-- 4. Người bán thao tác qua RPC SECURITY DEFINER có kiểm tra quyền và chuyển trạng thái hợp lệ.
-- 5. Xóa tin là xóa mềm (status = 'deleted') để giữ lịch sử hội thoại và báo cáo.
-- 6. Sửa các hàm 023/024 đã chạy trên cloud nhưng còn đọc cột user_id không tồn tại.
--
-- Chạy lại an toàn nhiều lần, không xóa dữ liệu.
-- Thứ tự áp dụng: sau 021-026. Migration này gỡ và tạo lại toàn bộ policy của marketplace_items.
-- ==============================================================================

-- 1. CỘT DỮ LIỆU ---------------------------------------------------------------
ALTER TABLE public.marketplace_items ADD COLUMN IF NOT EXISTS seller_id UUID;
ALTER TABLE public.marketplace_items ADD COLUMN IF NOT EXISTS moderation_status TEXT;
ALTER TABLE public.marketplace_items ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE public.marketplace_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.marketplace_items ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.marketplace_items ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.marketplace_items ADD COLUMN IF NOT EXISTS image_urls JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.marketplace_items ADD COLUMN IF NOT EXISTS delivery_methods JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.marketplace_items ADD COLUMN IF NOT EXISTS is_negotiable BOOLEAN DEFAULT false;
ALTER TABLE public.marketplace_items ADD COLUMN IF NOT EXISTS show_phone BOOLEAN DEFAULT true;
ALTER TABLE public.marketplace_items ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;
ALTER TABLE public.marketplace_items ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Môi trường cũ (017) có thể chỉ có cột user_id: chép sang seller_id, giữ nguyên cột cũ
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'marketplace_items' AND column_name = 'user_id'
  ) THEN
    EXECUTE 'UPDATE public.marketplace_items SET seller_id = user_id WHERE seller_id IS NULL AND user_id IS NOT NULL';
  END IF;
END $$;

-- 2. CHUẨN HÓA TRẠNG THÁI -------------------------------------------------------
-- Gỡ các CHECK cũ trên status/moderation_status (vd: 004 chỉ cho 'available','sold','given').
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.marketplace_items'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE public.marketplace_items DROP CONSTRAINT %I', r.conname);
  END LOOP;
END $$;

UPDATE public.marketplace_items
SET status = CASE status
    WHEN 'given' THEN 'sold'
    WHEN 'Đã bán' THEN 'sold'
    WHEN 'Đã đóng' THEN 'closed'
    WHEN 'Còn hàng' THEN 'available'
    WHEN 'Đã duyệt' THEN 'available'
    WHEN 'approved' THEN 'available'
    WHEN 'Chờ duyệt' THEN 'pending'
    WHEN 'Bị từ chối' THEN 'rejected'
    WHEN 'Đã ẩn' THEN 'hidden'
    ELSE status
  END
WHERE status IN ('given', 'Đã bán', 'Đã đóng', 'Còn hàng', 'Đã duyệt', 'approved', 'Chờ duyệt', 'Bị từ chối', 'Đã ẩn');

UPDATE public.marketplace_items SET status = 'available' WHERE status IS NULL;

UPDATE public.marketplace_items
SET moderation_status = CASE
    WHEN status = 'pending' THEN 'pending'
    WHEN status = 'rejected' THEN 'rejected'
    ELSE 'approved'
  END
WHERE moderation_status IS NULL OR moderation_status NOT IN ('pending', 'approved', 'rejected');

UPDATE public.marketplace_items
SET closed_at = COALESCE(updated_at, created_at, now())
WHERE status IN ('sold', 'closed') AND closed_at IS NULL;

ALTER TABLE public.marketplace_items ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE public.marketplace_items ALTER COLUMN moderation_status SET DEFAULT 'pending';

-- NOT VALID: áp dụng cho mọi ghi mới, không chặn migration nếu còn dữ liệu lạ chưa chuẩn hóa.
ALTER TABLE public.marketplace_items
  ADD CONSTRAINT marketplace_items_status_check
  CHECK (status IN ('available', 'sold', 'closed', 'pending', 'rejected', 'hidden', 'deleted')) NOT VALID;

ALTER TABLE public.marketplace_items
  ADD CONSTRAINT marketplace_items_moderation_status_check
  CHECK (moderation_status IN ('pending', 'approved', 'rejected')) NOT VALID;

CREATE INDEX IF NOT EXISTS idx_marketplace_items_seller_id ON public.marketplace_items (seller_id);
CREATE INDEX IF NOT EXISTS idx_marketplace_items_status ON public.marketplace_items (status, moderation_status);

-- 3. TRIGGER BẢO VỆ TRẠNG THÁI ---------------------------------------------------
-- Chỉ áp dụng cho truy vấn trực tiếp từ client (PostgREST chạy với vai trò anon/authenticated).
-- RPC SECURITY DEFINER (027, 023, 024...) chạy dưới vai trò chủ hàm nên tự kiểm tra quyền riêng.
-- Tên trigger bắt đầu bằng "trg_marketplace" để chạy trước trg_sync_marketplace_item_seller (021),
-- vì Postgres chạy trigger BEFORE theo thứ tự tên.
CREATE OR REPLACE FUNCTION public.marketplace_items_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller UUID;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    NEW.updated_at := now();
  END IF;

  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

  IF COALESCE(public.is_admin(), false) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_caller := public.current_profile_id();
    IF v_caller IS NULL THEN
      RAISE EXCEPTION 'Vui lòng đăng nhập để đăng tin' USING ERRCODE = '42501';
    END IF;
    IF NEW.seller_id IS DISTINCT FROM v_caller THEN
      RAISE EXCEPTION 'Không thể đăng tin thay cho người khác' USING ERRCODE = '42501';
    END IF;

    -- Tin mới luôn vào hàng chờ duyệt, client không tự công khai được
    NEW.status := 'pending';
    NEW.moderation_status := 'pending';
    NEW.rejection_reason := NULL;
    NEW.closed_at := NULL;
    NEW.deleted_at := NULL;
    NEW.created_at := now();
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Vui lòng dùng chức năng quản lý tin để thay đổi tin đăng' USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS trg_marketplace_items_guard ON public.marketplace_items;
CREATE TRIGGER trg_marketplace_items_guard
  BEFORE INSERT OR UPDATE ON public.marketplace_items
  FOR EACH ROW
  EXECUTE FUNCTION public.marketplace_items_guard();

-- 4. RLS -------------------------------------------------------------------------
ALTER TABLE public.marketplace_items ENABLE ROW LEVEL SECURITY;

-- Gỡ toàn bộ policy cũ (007, 017 "Public access" FOR ALL USING true, 021...) rồi tạo lại.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'marketplace_items'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.marketplace_items', r.policyname);
  END LOOP;
END $$;

-- Khách và mọi người: chỉ thấy tin đã duyệt (đang bán, đã bán, đã đóng)
CREATE POLICY "marketplace_items_select_public" ON public.marketplace_items
  FOR SELECT
  USING (status IN ('available', 'sold', 'closed') AND moderation_status = 'approved');

-- Người bán: thấy mọi tin của mình trừ tin đã xóa
CREATE POLICY "marketplace_items_select_owner" ON public.marketplace_items
  FOR SELECT
  USING (seller_id = (SELECT public.current_profile_id()) AND status <> 'deleted');

-- Admin: thấy toàn bộ
CREATE POLICY "marketplace_items_select_admin" ON public.marketplace_items
  FOR SELECT
  USING ((SELECT public.is_admin()));

CREATE POLICY "marketplace_items_insert_owner" ON public.marketplace_items
  FOR INSERT
  WITH CHECK (seller_id = (SELECT public.current_profile_id()) OR (SELECT public.is_admin()));

CREATE POLICY "marketplace_items_update_admin" ON public.marketplace_items
  FOR UPDATE
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "marketplace_items_delete_admin" ON public.marketplace_items
  FOR DELETE
  USING ((SELECT public.is_admin()));

-- 5. RPC: ĐỔI TRẠNG THÁI BÁN (sold / closed / available = mở lại) -------------------
CREATE OR REPLACE FUNCTION public.marketplace_set_item_status(p_item_id UUID, p_status TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_caller UUID;
  v_item public.marketplace_items%ROWTYPE;
BEGIN
  v_caller := public.current_profile_id();
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Vui lòng đăng nhập để quản lý tin đăng' USING ERRCODE = '42501';
  END IF;

  IF p_status IS NULL OR p_status NOT IN ('sold', 'closed', 'available') THEN
    RAISE EXCEPTION 'Trạng thái tin đăng không hợp lệ' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_item FROM public.marketplace_items WHERE id = p_item_id FOR UPDATE;
  IF NOT FOUND OR v_item.status = 'deleted' THEN
    RAISE EXCEPTION 'Tin đăng không tồn tại hoặc đã bị xóa' USING ERRCODE = 'P0002';
  END IF;

  IF v_item.seller_id IS DISTINCT FROM v_caller AND NOT COALESCE(public.is_admin(), false) THEN
    RAISE EXCEPTION 'Bạn không có quyền thay đổi tin đăng này' USING ERRCODE = '42501';
  END IF;

  IF v_item.status = p_status THEN
    RETURN to_jsonb(v_item);
  END IF;

  IF v_item.status NOT IN ('available', 'sold', 'closed') OR v_item.moderation_status IS DISTINCT FROM 'approved' THEN
    RAISE EXCEPTION 'Tin đăng chưa được duyệt hoặc đang bị tạm ẩn nên chưa thể đổi trạng thái' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.marketplace_items
  SET status = p_status,
      closed_at = CASE WHEN p_status = 'available' THEN NULL ELSE now() END,
      updated_at = now()
  WHERE id = p_item_id
  RETURNING * INTO v_item;

  RETURN to_jsonb(v_item);
END;
$$;

-- 6. RPC: SỬA NỘI DUNG TIN (người bán sửa -> chờ duyệt lại) --------------------------
CREATE OR REPLACE FUNCTION public.marketplace_update_item(p_item_id UUID, p_changes JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_caller UUID;
  v_is_admin BOOLEAN;
  v_item public.marketplace_items%ROWTYPE;
  v_title TEXT;
  v_price NUMERIC;
  v_is_free BOOLEAN;
  v_category TEXT;
  v_condition TEXT;
  v_district TEXT;
  v_location TEXT;
  v_description TEXT;
  v_images JSONB;
  v_delivery JSONB;
  v_is_negotiable BOOLEAN;
  v_show_phone BOOLEAN;
BEGIN
  v_caller := public.current_profile_id();
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Vui lòng đăng nhập để sửa tin đăng' USING ERRCODE = '42501';
  END IF;

  IF p_changes IS NULL OR jsonb_typeof(p_changes) <> 'object' THEN
    RAISE EXCEPTION 'Dữ liệu cập nhật không hợp lệ' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_item FROM public.marketplace_items WHERE id = p_item_id FOR UPDATE;
  IF NOT FOUND OR v_item.status = 'deleted' THEN
    RAISE EXCEPTION 'Tin đăng không tồn tại hoặc đã bị xóa' USING ERRCODE = 'P0002';
  END IF;

  v_is_admin := COALESCE(public.is_admin(), false);
  IF v_item.seller_id IS DISTINCT FROM v_caller AND NOT v_is_admin THEN
    RAISE EXCEPTION 'Bạn không có quyền sửa tin đăng này' USING ERRCODE = '42501';
  END IF;

  IF NOT v_is_admin AND v_item.status NOT IN ('available', 'pending', 'rejected') THEN
    RAISE EXCEPTION 'Tin đã bán hoặc đã đóng. Hãy mở lại tin trước khi chỉnh sửa' USING ERRCODE = 'P0001';
  END IF;

  -- Chỉ cập nhật các khóa có trong p_changes
  v_title := CASE WHEN p_changes ? 'title' THEN btrim(p_changes->>'title') ELSE v_item.title END;
  IF v_title IS NULL OR length(v_title) < 1 OR length(v_title) > 120 THEN
    RAISE EXCEPTION 'Tên món đồ phải từ 1 đến 120 ký tự' USING ERRCODE = '22023';
  END IF;

  IF p_changes ? 'price' THEN
    IF jsonb_typeof(p_changes->'price') <> 'number' THEN
      RAISE EXCEPTION 'Giá bán không hợp lệ' USING ERRCODE = '22023';
    END IF;
    v_price := (p_changes->>'price')::numeric;
  ELSE
    v_price := COALESCE(v_item.price, 0);
  END IF;
  IF v_price < 0 OR v_price > 1000000000 THEN
    RAISE EXCEPTION 'Giá bán phải từ 0 đến 1.000.000.000đ' USING ERRCODE = '22023';
  END IF;

  v_is_free := CASE WHEN p_changes ? 'is_free' THEN (p_changes->>'is_free')::boolean ELSE COALESCE(v_item.is_free, false) END;
  IF v_is_free THEN
    v_price := 0;
  END IF;

  v_category := CASE WHEN p_changes ? 'category' THEN p_changes->>'category' ELSE v_item.category END;
  IF v_category IS NOT NULL AND v_category NOT IN ('furniture', 'electronics', 'books', 'household', 'other') THEN
    RAISE EXCEPTION 'Danh mục không hợp lệ' USING ERRCODE = '22023';
  END IF;

  v_condition := CASE WHEN p_changes ? 'condition' THEN p_changes->>'condition' ELSE v_item.condition END;
  IF v_condition IS NOT NULL AND v_condition NOT IN ('new90', 'used', 'needs_repair') THEN
    RAISE EXCEPTION 'Tình trạng món đồ không hợp lệ' USING ERRCODE = '22023';
  END IF;

  v_district := CASE WHEN p_changes ? 'district' THEN btrim(p_changes->>'district') ELSE v_item.district END;
  v_location := CASE WHEN p_changes ? 'location' THEN btrim(p_changes->>'location') ELSE v_item.location END;
  v_description := CASE WHEN p_changes ? 'description' THEN btrim(p_changes->>'description') ELSE v_item.description END;
  IF length(COALESCE(v_district, '')) > 100 OR length(COALESCE(v_location, '')) > 200 THEN
    RAISE EXCEPTION 'Khu vực hoặc địa chỉ quá dài' USING ERRCODE = '22023';
  END IF;
  IF length(COALESCE(v_description, '')) > 3000 THEN
    RAISE EXCEPTION 'Mô tả tối đa 3000 ký tự' USING ERRCODE = '22023';
  END IF;

  v_images := CASE WHEN p_changes ? 'image_urls' THEN p_changes->'image_urls' ELSE v_item.image_urls END;
  IF v_images IS NULL OR jsonb_typeof(v_images) <> 'array'
     OR jsonb_array_length(v_images) < 1 OR jsonb_array_length(v_images) > 10
     OR EXISTS (SELECT 1 FROM jsonb_array_elements(v_images) e WHERE jsonb_typeof(e) <> 'string') THEN
    RAISE EXCEPTION 'Tin đăng cần từ 1 đến 10 ảnh hợp lệ' USING ERRCODE = '22023';
  END IF;

  v_delivery := CASE WHEN p_changes ? 'delivery_methods' THEN p_changes->'delivery_methods' ELSE COALESCE(v_item.delivery_methods, '[]'::jsonb) END;
  IF jsonb_typeof(v_delivery) <> 'array' THEN
    RAISE EXCEPTION 'Cách nhận đồ không hợp lệ' USING ERRCODE = '22023';
  END IF;

  v_is_negotiable := CASE WHEN p_changes ? 'is_negotiable' THEN (p_changes->>'is_negotiable')::boolean ELSE COALESCE(v_item.is_negotiable, false) END;
  v_show_phone := CASE WHEN p_changes ? 'show_phone' THEN (p_changes->>'show_phone')::boolean ELSE COALESCE(v_item.show_phone, true) END;

  UPDATE public.marketplace_items
  SET title = v_title,
      price = v_price,
      is_free = v_is_free,
      category = v_category,
      condition = v_condition,
      district = v_district,
      location = v_location,
      description = v_description,
      image_urls = v_images,
      images = v_images,
      delivery_methods = v_delivery,
      is_negotiable = v_is_negotiable,
      show_phone = v_show_phone,
      -- Người bán sửa nội dung thì tin phải được duyệt lại; admin sửa giữ nguyên trạng thái
      status = CASE WHEN v_is_admin AND v_item.seller_id IS DISTINCT FROM v_caller THEN v_item.status ELSE 'pending' END,
      moderation_status = CASE WHEN v_is_admin AND v_item.seller_id IS DISTINCT FROM v_caller THEN v_item.moderation_status ELSE 'pending' END,
      rejection_reason = CASE WHEN v_is_admin AND v_item.seller_id IS DISTINCT FROM v_caller THEN v_item.rejection_reason ELSE NULL END,
      closed_at = CASE WHEN v_is_admin AND v_item.seller_id IS DISTINCT FROM v_caller THEN v_item.closed_at ELSE NULL END,
      updated_at = now()
  WHERE id = p_item_id
  RETURNING * INTO v_item;

  RETURN to_jsonb(v_item);
END;
$$;

-- 7. RPC: XÓA MỀM TIN ĐĂNG (giữ hội thoại, tin nhắn và báo cáo liên quan) -----------
CREATE OR REPLACE FUNCTION public.marketplace_delete_item(p_item_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_caller UUID;
  v_item public.marketplace_items%ROWTYPE;
BEGIN
  v_caller := public.current_profile_id();
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Vui lòng đăng nhập để xóa tin đăng' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_item FROM public.marketplace_items WHERE id = p_item_id FOR UPDATE;
  IF NOT FOUND OR v_item.status = 'deleted' THEN
    RAISE EXCEPTION 'Tin đăng không tồn tại hoặc đã bị xóa' USING ERRCODE = 'P0002';
  END IF;

  IF v_item.seller_id IS DISTINCT FROM v_caller AND NOT COALESCE(public.is_admin(), false) THEN
    RAISE EXCEPTION 'Bạn không có quyền xóa tin đăng này' USING ERRCODE = '42501';
  END IF;

  UPDATE public.marketplace_items
  SET status = 'deleted',
      deleted_at = now(),
      updated_at = now()
  WHERE id = p_item_id;

  RETURN jsonb_build_object('id', p_item_id, 'status', 'deleted');
END;
$$;

REVOKE ALL ON FUNCTION public.marketplace_set_item_status(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.marketplace_update_item(UUID, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.marketplace_delete_item(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.marketplace_set_item_status(UUID, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.marketplace_update_item(UUID, JSONB) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.marketplace_delete_item(UUID) TO anon, authenticated;

-- 8. SỬA HÀM 023/024 ĐÃ CHẠY TRÊN CLOUD --------------------------------------------
-- Bản cũ dùng "RETURNING user_id" trên marketplace_items (cột không tồn tại) nên lỗi khi chạy.
-- Tạo lại với seller_id và bỏ qua tin đã xóa mềm. Nội dung còn lại giữ nguyên 023/024.

CREATE OR REPLACE FUNCTION public.handle_auto_moderation_on_reports()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  c_auto_moderation_threshold CONSTANT INTEGER := 3;
  v_distinct_reporters INTEGER;
  v_target_uuid UUID;
  v_item_title TEXT;
  v_owner_id UUID;
  v_updated_id UUID;
BEGIN
  IF NEW.target_type <> 'tin_dang' THEN
    RETURN NEW;
  END IF;

  IF NEW.target_id IS NULL OR NEW.target_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN NEW;
  END IF;

  v_target_uuid := NEW.target_id::uuid;

  SELECT COUNT(DISTINCT reporter_id)
  INTO v_distinct_reporters
  FROM public.reports
  WHERE target_type = 'tin_dang'
    AND target_id = NEW.target_id
    AND status IN ('moi', 'dang_xu_ly')
    AND reporter_id IS NOT NULL;

  IF v_distinct_reporters >= c_auto_moderation_threshold THEN
    UPDATE public.marketplace_items
    SET status = 'pending',
        moderation_status = 'pending',
        updated_at = now()
    WHERE id = v_target_uuid
      AND status <> 'deleted'
      AND (status <> 'pending' OR moderation_status <> 'pending')
    RETURNING id, title, seller_id INTO v_updated_id, v_item_title, v_owner_id;

    IF v_updated_id IS NOT NULL AND v_owner_id IS NOT NULL THEN
      BEGIN
        INSERT INTO public.notifications (
          user_id, type, title, body, cta_url, cta_label, is_read, created_at
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
          RAISE WARNING 'Không thể tạo thông báo kiểm duyệt tự động: %', SQLERRM;
      END;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_hide_reported_listing(
  p_target_id UUID,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_admin_id UUID;
  v_seller_id UUID;
  v_item_title TEXT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Chỉ Quản trị viên mới có quyền thực hiện thao tác này' USING ERRCODE = '42501';
  END IF;

  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'Ghi chú lý do xử lý là bắt buộc' USING ERRCODE = '22023';
  END IF;

  v_admin_id := public.current_profile_id();

  UPDATE public.marketplace_items
  SET status = 'pending',
      moderation_status = 'pending',
      rejection_reason = trim(p_reason),
      updated_at = now()
  WHERE id = p_target_id
    AND status <> 'deleted'
  RETURNING seller_id, title INTO v_seller_id, v_item_title;

  UPDATE public.reports
  SET status = 'da_xu_ly',
      admin_notes = trim(p_reason),
      resolved_by = v_admin_id,
      resolved_at = now(),
      updated_at = now()
  WHERE target_id = p_target_id::text;

  IF v_seller_id IS NOT NULL THEN
    INSERT INTO public.notifications (
      user_id, type, title, body, cta_url, cta_label, is_read, created_at
    ) VALUES (
      v_seller_id, 'moderation', 'Tin đăng của bạn đã bị ẩn do có vi phạm ⚠️',
      'Tin đăng "' || COALESCE(v_item_title, 'của bạn') || '" đã bị ẩn khỏi chợ. Ghi chú kiểm duyệt: ' || trim(p_reason),
      '/cho-do-cu/' || p_target_id || '?edit=true', 'Chỉnh sửa & Gửi duyệt lại', false, now()
    );
  END IF;

  INSERT INTO public.audit_logs (
    admin_id, admin_role, action, entity_type, entity_id, reason, created_at
  ) VALUES (
    v_admin_id, 'admin', 'admin_hide_reported_listing', 'marketplace_item', p_target_id::text, trim(p_reason), now()
  );

  RETURN jsonb_build_object('success', true, 'target_id', p_target_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_restore_reported_listing(
  p_target_id UUID,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_admin_id UUID;
  v_seller_id UUID;
  v_item_title TEXT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Chỉ Quản trị viên mới có quyền thực hiện thao tác này' USING ERRCODE = '42501';
  END IF;

  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'Ghi chú lý do khôi phục là bắt buộc' USING ERRCODE = '22023';
  END IF;

  v_admin_id := public.current_profile_id();

  UPDATE public.marketplace_items
  SET status = 'available',
      moderation_status = 'approved',
      rejection_reason = NULL,
      closed_at = NULL,
      updated_at = now()
  WHERE id = p_target_id
    AND status <> 'deleted'
  RETURNING seller_id, title INTO v_seller_id, v_item_title;

  UPDATE public.reports
  SET status = 'da_xu_ly',
      admin_notes = trim(p_reason),
      resolved_by = v_admin_id,
      resolved_at = now(),
      updated_at = now()
  WHERE target_id = p_target_id::text;

  IF v_seller_id IS NOT NULL THEN
    INSERT INTO public.notifications (
      user_id, type, title, body, cta_url, cta_label, is_read, created_at
    ) VALUES (
      v_seller_id, 'approval', 'Tin đăng của bạn đã được khôi phục công khai 🎉',
      'Tin đăng "' || COALESCE(v_item_title, 'của bạn') || '" đã được kiểm tra và hiển thị lại bình thường. Ghi chú: ' || trim(p_reason),
      '/cho-do-cu/' || p_target_id, 'Xem tin đăng', false, now()
    );
  END IF;

  INSERT INTO public.audit_logs (
    admin_id, admin_role, action, entity_type, entity_id, reason, created_at
  ) VALUES (
    v_admin_id, 'admin', 'admin_restore_reported_listing', 'marketplace_item', p_target_id::text, trim(p_reason), now()
  );

  RETURN jsonb_build_object('success', true, 'target_id', p_target_id);
END;
$$;
