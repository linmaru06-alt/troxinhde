-- ==============================================================================
-- MIGRATION 028: TOÀN VẸN XÁC MINH TÀI KHOẢN (SĐT, THẺ SINH VIÊN, VAI TRÒ)
-- ==============================================================================
-- Mục tiêu:
-- 1. Client không tự đặt được các cột xác minh (verified, student_verified, phone_verified,
--    email_verified, landlord_verified, rating) và không tự tạo hồ sơ với vai trò admin.
-- 2. phone_verified chỉ bật khi số điện thoại khớp claim phone_number trong Firebase ID token
--    (tức Firebase đã xác thực OTP thật).
-- 3. Xác minh sinh viên đi qua hàng chờ admin duyệt (bảng student_verifications riêng,
--    không để ảnh giấy tờ trong bảng profiles).
--
-- Chạy lại an toàn nhiều lần, không xóa và không tự sửa dữ liệu hiện có.
-- ==============================================================================

-- 1. CỘT CẦN THIẾT TRÊN PROFILES ------------------------------------------------
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS student_verified BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS landlord_verified BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rating NUMERIC;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS owner_application_status TEXT DEFAULT 'none';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS owner_rejection_reason TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS app_role TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS admin_role TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 2. CHUẨN HÓA SỐ ĐIỆN THOẠI VIỆT NAM ----------------------------------------------
-- '+84 912 345 678' / '84912345678' / '0912345678' -> '0912345678'
CREATE OR REPLACE FUNCTION public.normalize_vn_phone(p_phone TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  v_digits TEXT;
BEGIN
  IF p_phone IS NULL THEN
    RETURN NULL;
  END IF;
  v_digits := regexp_replace(p_phone, '\D', '', 'g');
  IF v_digits = '' THEN
    RETURN NULL;
  END IF;
  IF left(v_digits, 2) = '84' AND length(v_digits) >= 11 THEN
    v_digits := '0' || substr(v_digits, 3);
  END IF;
  RETURN v_digits;
END;
$$;

-- Số điện thoại đã được Firebase xác thực trong phiên hiện tại (NULL nếu chưa có)
CREATE OR REPLACE FUNCTION public.current_verified_phone()
RETURNS TEXT
LANGUAGE sql
STABLE
SET search_path = public, auth, pg_temp
AS $$
  SELECT public.normalize_vn_phone(auth.jwt() ->> 'phone_number');
$$;

-- 3. TRIGGER BẢO VỆ CỘT XÁC MINH & VAI TRÒ -----------------------------------------
-- Chỉ áp dụng cho truy vấn trực tiếp từ client (anon/authenticated). Admin và các RPC
-- SECURITY DEFINER (duyệt thẻ SV, đồng bộ SĐT, admin_*) không bị ảnh hưởng.
-- Client cũ còn gửi các cột này sẽ không lỗi: giá trị bị giữ nguyên như trong DB.
CREATE OR REPLACE FUNCTION public.profiles_protect_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_verified_phone TEXT;
  v_email TEXT;
  v_email_verified BOOLEAN;
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

  IF COALESCE(public.is_admin(), false) THEN
    RETURN NEW;
  END IF;

  v_verified_phone := public.current_verified_phone();
  v_email := lower(auth.jwt() ->> 'email');
  v_email_verified := COALESCE((auth.jwt() ->> 'email_verified')::boolean, false);

  IF TG_OP = 'INSERT' THEN
    NEW.verified := false;
    NEW.student_verified := false;
    NEW.landlord_verified := false;
    NEW.admin_role := NULL;
    NEW.phone_verified := v_verified_phone IS NOT NULL
      AND v_verified_phone = public.normalize_vn_phone(NEW.phone);
    NEW.email_verified := v_email_verified;

    -- Không tự tạo hồ sơ admin (trừ tài khoản super-admin đã khai báo sẵn trong ứng dụng)
    IF NEW.app_role = 'admin' OR NEW.role = 'admin' THEN
      IF NOT (v_email_verified AND v_email IN ('quan66934@gmail.com', 'admin@troxinh.vn')) THEN
        NEW.app_role := 'renter';
        NEW.role := 'renter';
      END IF;
    END IF;

    IF COALESCE(NEW.owner_application_status, 'none') NOT IN ('none', 'pending')
       AND NOT (NEW.owner_application_status = 'approved' AND NEW.role = 'owner') THEN
      NEW.owner_application_status := 'none';
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE: các cột xác minh chỉ đổi qua quy trình xác minh
  NEW.verified := OLD.verified;
  NEW.student_verified := OLD.student_verified;
  NEW.landlord_verified := OLD.landlord_verified;
  NEW.rating := OLD.rating;
  NEW.admin_role := OLD.admin_role;
  NEW.email_verified := COALESCE(OLD.email_verified, false) OR v_email_verified;

  IF public.normalize_vn_phone(NEW.phone) IS DISTINCT FROM public.normalize_vn_phone(OLD.phone) THEN
    -- Đổi số điện thoại: chỉ giữ trạng thái xác minh nếu số mới là số Firebase đã xác thực
    NEW.phone_verified := v_verified_phone IS NOT NULL
      AND v_verified_phone = public.normalize_vn_phone(NEW.phone);
  ELSE
    NEW.phone_verified := OLD.phone_verified;
  END IF;

  -- Người dùng chỉ được chuyển đơn chủ trọ sang 'pending' (nộp đơn); duyệt/từ chối là việc của admin
  IF NEW.owner_application_status IS DISTINCT FROM OLD.owner_application_status THEN
    IF NOT (NEW.owner_application_status = 'pending'
            AND COALESCE(OLD.owner_application_status, 'none') IN ('none', 'rejected', 'pending')) THEN
      NEW.owner_application_status := OLD.owner_application_status;
    END IF;
  END IF;
  NEW.owner_rejection_reason := OLD.owner_rejection_reason;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_protect_verification ON public.profiles;
CREATE TRIGGER trg_profiles_protect_verification
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_protect_verification();

-- 4. RPC: ĐỒNG BỘ SỐ ĐIỆN THOẠI ĐÃ XÁC THỰC QUA FIREBASE ------------------------------
CREATE OR REPLACE FUNCTION public.sync_my_phone_verification()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_caller UUID;
  v_phone TEXT;
BEGIN
  v_caller := public.current_profile_id();
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Vui lòng đăng nhập để xác minh số điện thoại' USING ERRCODE = '42501';
  END IF;

  v_phone := public.current_verified_phone();
  IF v_phone IS NULL THEN
    RAISE EXCEPTION 'Số điện thoại chưa được xác thực OTP. Vui lòng xác thực lại' USING ERRCODE = 'P0001';
  END IF;

  -- Firebase bảo đảm một số chỉ thuộc một tài khoản: bỏ cờ xác minh của hồ sơ khác cùng số
  UPDATE public.profiles
  SET phone_verified = false, updated_at = now()
  WHERE id <> v_caller
    AND phone_verified IS TRUE
    AND public.normalize_vn_phone(phone) = v_phone;

  UPDATE public.profiles
  SET phone = v_phone,
      phone_verified = true,
      updated_at = now()
  WHERE id = v_caller;

  RETURN jsonb_build_object('phone', v_phone, 'phone_verified', true);
END;
$$;

-- 5. HÀNG CHỜ XÁC MINH SINH VIÊN ------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.student_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  card_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reject_reason TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_student_verifications_profile ON public.student_verifications (profile_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_student_verifications_status ON public.student_verifications (status, submitted_at);
-- Mỗi người chỉ có tối đa 1 hồ sơ đang chờ duyệt
CREATE UNIQUE INDEX IF NOT EXISTS uq_student_verifications_one_pending
  ON public.student_verifications (profile_id) WHERE status = 'pending';

ALTER TABLE public.student_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "student_verifications_select_own" ON public.student_verifications;
CREATE POLICY "student_verifications_select_own" ON public.student_verifications
  FOR SELECT USING (profile_id = (SELECT public.current_profile_id()));

DROP POLICY IF EXISTS "student_verifications_select_admin" ON public.student_verifications;
CREATE POLICY "student_verifications_select_admin" ON public.student_verifications
  FOR SELECT USING ((SELECT public.is_admin()));
-- Không có policy INSERT/UPDATE/DELETE: mọi thay đổi đi qua RPC bên dưới.

-- 6. RPC: NGƯỜI DÙNG GỬI ẢNH THẺ ĐỂ XÁC MINH ------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_student_verification(p_card_path TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_caller UUID;
  v_row public.student_verifications%ROWTYPE;
BEGIN
  v_caller := public.current_profile_id();
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Vui lòng đăng nhập để gửi xác minh sinh viên' USING ERRCODE = '42501';
  END IF;

  IF p_card_path IS NULL OR p_card_path !~ '^student_cards/[A-Za-z0-9._-]+$' THEN
    RAISE EXCEPTION 'Ảnh thẻ không hợp lệ. Vui lòng tải ảnh lên lại' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = v_caller AND student_verified IS TRUE) THEN
    RAISE EXCEPTION 'Tài khoản đã được xác minh sinh viên' USING ERRCODE = 'P0001';
  END IF;

  -- Đã có hồ sơ chờ duyệt: thay ảnh mới, giữ nguyên vị trí trong hàng chờ
  UPDATE public.student_verifications
  SET card_path = p_card_path
  WHERE profile_id = v_caller AND status = 'pending'
  RETURNING * INTO v_row;

  IF NOT FOUND THEN
    INSERT INTO public.student_verifications (profile_id, card_path)
    VALUES (v_caller, p_card_path)
    RETURNING * INTO v_row;
  END IF;

  RETURN to_jsonb(v_row);
END;
$$;

-- 7. RPC: ADMIN DUYỆT / TỪ CHỐI THẺ SINH VIÊN ----------------------------------------
CREATE OR REPLACE FUNCTION public.admin_review_student_verification(
  p_verification_id UUID,
  p_approve BOOLEAN,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_admin_id UUID;
  v_row public.student_verifications%ROWTYPE;
BEGIN
  IF NOT COALESCE(public.is_admin(), false) THEN
    RAISE EXCEPTION 'Chỉ Quản trị viên mới có quyền thực hiện thao tác này' USING ERRCODE = '42501';
  END IF;

  IF NOT p_approve AND (p_reason IS NULL OR btrim(p_reason) = '') THEN
    RAISE EXCEPTION 'Vui lòng nhập lý do từ chối' USING ERRCODE = '22023';
  END IF;

  v_admin_id := public.current_profile_id();

  SELECT * INTO v_row FROM public.student_verifications WHERE id = p_verification_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy hồ sơ xác minh' USING ERRCODE = 'P0002';
  END IF;
  IF v_row.status <> 'pending' THEN
    RAISE EXCEPTION 'Hồ sơ này đã được xử lý trước đó' USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.student_verifications
  SET status = CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END,
      reject_reason = CASE WHEN p_approve THEN NULL ELSE btrim(p_reason) END,
      reviewed_by = v_admin_id,
      reviewed_at = now()
  WHERE id = p_verification_id
  RETURNING * INTO v_row;

  IF p_approve THEN
    UPDATE public.profiles
    SET student_verified = true, verified = true, updated_at = now()
    WHERE id = v_row.profile_id;
  END IF;

  BEGIN
    INSERT INTO public.notifications (user_id, type, title, body, cta_url, cta_label, is_read, created_at)
    VALUES (
      v_row.profile_id,
      CASE WHEN p_approve THEN 'approval' ELSE 'rejected' END,
      CASE WHEN p_approve THEN 'Đã xác minh sinh viên 🎓' ELSE 'Xác minh sinh viên chưa được duyệt' END,
      CASE WHEN p_approve
        THEN 'Tài khoản của bạn đã nhận huy hiệu Đã xác minh sinh viên.'
        ELSE 'Lý do: ' || btrim(p_reason) || '. Bạn có thể tải ảnh thẻ khác và gửi lại.'
      END,
      '/toi', 'Xem hồ sơ', false, now()
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Không thể tạo thông báo xác minh sinh viên: %', SQLERRM;
  END;

  BEGIN
    INSERT INTO public.audit_logs (admin_id, admin_role, action, entity_type, entity_id, reason, created_at)
    VALUES (
      v_admin_id, 'admin',
      CASE WHEN p_approve THEN 'approve_student_verification' ELSE 'reject_student_verification' END,
      'student_verification', p_verification_id::text, NULLIF(btrim(COALESCE(p_reason, '')), ''), now()
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Không thể ghi audit log xác minh sinh viên: %', SQLERRM;
  END;

  RETURN to_jsonb(v_row);
END;
$$;

REVOKE ALL ON FUNCTION public.sync_my_phone_verification() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_student_verification(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_review_student_verification(UUID, BOOLEAN, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_my_phone_verification() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_student_verification(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_student_verification(UUID, BOOLEAN, TEXT) TO anon, authenticated;
GRANT SELECT ON public.student_verifications TO anon, authenticated;
