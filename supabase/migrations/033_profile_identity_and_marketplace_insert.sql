-- ==============================================================================
-- MIGRATION 033: ĐỊNH DANH HỒ SƠ THỐNG NHẤT & CHỐT QUYỀN ĐĂNG TIN CHỢ ĐỒ CŨ
-- ==============================================================================
-- Bối cảnh:
--   * Luồng OTP cũ tự sinh mã trên trình duyệt và lưu hồ sơ với firebase_uid tạm
--     (phone_..., usr_phone_..., user_...). Khi đăng nhập bằng Firebase thật, hồ sơ cũ không
--     khớp Firebase UID nên ứng dụng giữ một id không phải UUID và không đăng tin được.
--   * Form đơn chủ trọ gán số mẫu 0987654321 cho người chưa có số, khiến nhiều người dùng chung
--     một số (ví dụ "Quỳnh Giang" và "Lina").
--   * Policy INSERT của marketplace_items đang là WITH CHECK (true) (migration 029): ai cũng
--     đăng tin được dưới seller_id của người khác.
--
-- Nội dung:
--   1. Bảng phone_dedup_backup lưu số điện thoại cũ trước khi gỡ trùng (có thể khôi phục).
--   2. Số 0987654321: giữ cho hồ sơ "Lina", gỡ khỏi các hồ sơ và đơn chủ trọ khác.
--      Không xác định được đúng một hồ sơ Lina thì KHÔNG đổi dữ liệu và chỉ báo NOTICE.
--   3. Chỉ mục duy nhất theo số đã chuẩn hóa (chỉ tạo khi không còn số trùng).
--   4. RPC claim_profile_by_verified_phone: gắn hồ sơ cũ với Firebase UID thật khi số điện thoại
--      khớp claim phone_number mà Firebase đã xác thực trong token.
--   5. marketplace_items INSERT: seller_id phải là hồ sơ của người gọi (hoặc admin).
--
-- Chạy SAU 031 (normalize_vn_phone, current_verified_phone) và 032 (current_profile_id, is_admin).
-- Chạy lại an toàn nhiều lần; không xóa dòng dữ liệu nào.
-- ==============================================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_demo_account BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false;

-- 1. SAO LƯU SỐ ĐIỆN THOẠI TRƯỚC KHI GỠ TRÙNG ---------------------------------------
CREATE TABLE IF NOT EXISTS public.phone_dedup_backup (
  id BIGSERIAL PRIMARY KEY,
  source_table TEXT NOT NULL,
  row_id TEXT NOT NULL,
  old_phone TEXT,
  kept_profile_id UUID,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.phone_dedup_backup ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "phone_dedup_backup_select_admin" ON public.phone_dedup_backup;
CREATE POLICY "phone_dedup_backup_select_admin" ON public.phone_dedup_backup
  FOR SELECT USING ((SELECT public.is_admin()));
-- Không có policy INSERT/UPDATE/DELETE: chỉ migration ghi vào bảng này.

GRANT SELECT ON public.phone_dedup_backup TO authenticated;

-- 2. SỐ 0987654321: GIỮ CHO HỒ SƠ LINA -----------------------------------------------
DO $$
DECLARE
  v_phone CONSTANT TEXT := '0987654321';
  v_reason CONSTANT TEXT := 'Số 0987654321 dùng chung: giữ cho hồ sơ Lina theo yêu cầu chủ dự án';
  v_has_app_phone BOOLEAN;
  v_lina_ids UUID[];
  v_lina UUID;
  v_count INTEGER;
BEGIN
  v_has_app_phone := EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'owner_applications' AND column_name = 'phone'
  );

  -- Hồ sơ Lina: tên chứa "Lina" và đang gắn với số này (trên hồ sơ hoặc trên đơn chủ trọ của chính hồ sơ đó)
  IF v_has_app_phone THEN
    SELECT array_agg(DISTINCT p.id) INTO v_lina_ids
    FROM public.profiles p
    WHERE (COALESCE(p.full_name, '') || ' ' || COALESCE(p.name, '')) ~* '\mlina\M'
      AND (
        public.normalize_vn_phone(p.phone) = v_phone
        OR EXISTS (
          SELECT 1 FROM public.owner_applications oa
          WHERE oa.user_id = p.id AND public.normalize_vn_phone(oa.phone) = v_phone
        )
      );
  ELSE
    SELECT array_agg(DISTINCT p.id) INTO v_lina_ids
    FROM public.profiles p
    WHERE (COALESCE(p.full_name, '') || ' ' || COALESCE(p.name, '')) ~* '\mlina\M'
      AND public.normalize_vn_phone(p.phone) = v_phone;
  END IF;

  IF v_lina_ids IS NULL OR array_length(v_lina_ids, 1) <> 1 THEN
    RAISE NOTICE '[033] Không xác định được đúng một hồ sơ Lina gắn với số % (tìm thấy % hồ sơ). Bỏ qua bước gỡ trùng, dữ liệu giữ nguyên.',
      v_phone, COALESCE(array_length(v_lina_ids, 1), 0);
    RETURN;
  END IF;

  v_lina := v_lina_ids[1];
  RAISE NOTICE '[033] Giữ số % cho hồ sơ Lina %', v_phone, v_lina;

  -- 2a. Hồ sơ khác đang giữ số này
  INSERT INTO public.phone_dedup_backup (source_table, row_id, old_phone, kept_profile_id, reason)
  SELECT 'profiles', p.id::text, p.phone, v_lina, v_reason
  FROM public.profiles p
  WHERE public.normalize_vn_phone(p.phone) = v_phone
    AND p.id <> v_lina;

  UPDATE public.profiles
  SET phone = NULL, phone_verified = false, updated_at = now()
  WHERE public.normalize_vn_phone(phone) = v_phone
    AND id <> v_lina;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE '[033] Đã gỡ số % khỏi % hồ sơ khác (đã sao lưu trong phone_dedup_backup)', v_phone, v_count;

  -- 2b. Đơn chủ trọ của người khác đang ghi số này (số mẫu do form cũ tự điền)
  IF v_has_app_phone THEN
    INSERT INTO public.phone_dedup_backup (source_table, row_id, old_phone, kept_profile_id, reason)
    SELECT 'owner_applications', oa.id::text, oa.phone, v_lina, v_reason
    FROM public.owner_applications oa
    WHERE public.normalize_vn_phone(oa.phone) = v_phone
      AND oa.user_id IS DISTINCT FROM v_lina;

    -- Cột phone của owner_applications là NOT NULL: dùng chuỗi rỗng (trang admin hiển thị "Chưa cung cấp")
    UPDATE public.owner_applications
    SET phone = ''
    WHERE public.normalize_vn_phone(phone) = v_phone
      AND user_id IS DISTINCT FROM v_lina;
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RAISE NOTICE '[033] Đã gỡ số % khỏi % đơn chủ trọ của người khác (đã sao lưu)', v_phone, v_count;
  END IF;
END $$;

-- 3. MỖI SỐ ĐIỆN THOẠI CHỈ THUỘC MỘT HỒ SƠ (THEO DẠNG ĐÃ CHUẨN HÓA) ---------------------
DO $$
DECLARE
  v_groups INTEGER;
BEGIN
  SELECT count(*) INTO v_groups
  FROM (
    SELECT public.normalize_vn_phone(phone)
    FROM public.profiles
    WHERE public.normalize_vn_phone(phone) IS NOT NULL
    GROUP BY public.normalize_vn_phone(phone)
    HAVING count(*) > 1
  ) d;

  IF v_groups > 0 THEN
    RAISE NOTICE '[033] Còn % số điện thoại trùng giữa các hồ sơ (khác định dạng 0.../84...). Chưa tạo chỉ mục duy nhất; cần xử lý thủ công rồi chạy lại migration.', v_groups;
  ELSE
    CREATE UNIQUE INDEX IF NOT EXISTS uq_profiles_phone_normalized
      ON public.profiles (public.normalize_vn_phone(phone))
      WHERE phone IS NOT NULL;
  END IF;
END $$;

-- 4. RPC: GẮN HỒ SƠ CŨ VỚI FIREBASE UID QUA SỐ ĐIỆN THOẠI ĐÃ XÁC THỰC -------------------
-- Chỉ nhận hồ sơ chưa gắn tài khoản Firebase thật (firebase_uid rỗng hoặc là mã tạm của luồng
-- OTP cũ) và có đúng một hồ sơ khớp số; không bao giờ lấy hồ sơ của tài khoản Firebase khác.
CREATE OR REPLACE FUNCTION public.claim_profile_by_verified_phone()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_uid TEXT;
  v_phone TEXT;
  v_ids UUID[];
BEGIN
  v_uid := NULLIF(COALESCE(auth.jwt() ->> 'sub', auth.jwt() ->> 'user_id'), '');
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Vui lòng đăng nhập để liên kết hồ sơ' USING ERRCODE = '42501';
  END IF;

  -- Đã có hồ sơ gắn với Firebase UID này
  SELECT array_agg(id) INTO v_ids FROM public.profiles WHERE firebase_uid = v_uid;
  IF v_ids IS NOT NULL THEN
    RETURN v_ids[1];
  END IF;

  v_phone := public.current_verified_phone();
  IF v_phone IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT array_agg(id) INTO v_ids
  FROM public.profiles
  WHERE public.normalize_vn_phone(phone) = v_phone
    AND COALESCE(is_demo_account, false) = false
    AND (
      firebase_uid IS NULL
      OR firebase_uid = ''
      OR firebase_uid = id::text
      OR firebase_uid ~ '^(phone_|usr_phone_|user_)'
    );

  IF v_ids IS NULL OR array_length(v_ids, 1) <> 1 THEN
    RETURN NULL;
  END IF;

  UPDATE public.profiles
  SET firebase_uid = v_uid,
      phone = v_phone,
      phone_verified = true,
      updated_at = now()
  WHERE id = v_ids[1];

  BEGIN
    INSERT INTO public.audit_logs (admin_id, admin_role, action, entity_type, entity_id, reason, created_at)
    VALUES (
      v_ids[1], 'system', 'claim_profile_by_verified_phone', 'profile', v_ids[1]::text,
      'Liên kết hồ sơ cũ với Firebase UID qua số điện thoại đã xác thực OTP', now()
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Không thể ghi audit log liên kết hồ sơ: %', SQLERRM;
  END;

  RETURN v_ids[1];
END;
$$;

REVOKE ALL ON FUNCTION public.claim_profile_by_verified_phone() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_profile_by_verified_phone() TO anon, authenticated;

-- 5. MARKETPLACE_ITEMS: CHỈ ĐĂNG TIN DƯỚI HỒ SƠ CỦA CHÍNH MÌNH ---------------------------
-- Gỡ mọi policy INSERT/ALL hiện có (029 đặt WITH CHECK (true)) rồi tạo lại policy chặt.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'marketplace_items'
      AND cmd IN ('INSERT', 'ALL')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.marketplace_items', r.policyname);
  END LOOP;
END $$;

CREATE POLICY "marketplace_items_insert_owner" ON public.marketplace_items
  FOR INSERT
  WITH CHECK (
    seller_id = (SELECT public.current_profile_id())
    OR (SELECT public.is_admin())
  );

-- ==============================================================================
-- KIỂM TRA SAU KHI CHẠY (SQL Editor):
--   SELECT * FROM public.phone_dedup_backup ORDER BY id DESC;
--   SELECT policyname, cmd, with_check FROM pg_policies WHERE tablename = 'marketplace_items';
--   SELECT indexname FROM pg_indexes WHERE indexname = 'uq_profiles_phone_normalized';
-- KHÔI PHỤC SỐ ĐÃ GỠ (nếu cần):
--   UPDATE public.profiles p SET phone = b.old_phone FROM public.phone_dedup_backup b
--   WHERE b.source_table = 'profiles' AND b.row_id = p.id::text;
-- ==============================================================================
