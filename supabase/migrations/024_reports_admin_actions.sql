-- ==============================================================================
-- MIGRATION 024: METADATA XỬ LÝ BÁO CÁO & BẢO MẬT PHÂN QUYỀN THAO TÁC QUẢN TRỊ
-- ==============================================================================
-- 1. Bổ sung các cột metadata xử lý báo cáo: resolved_by, resolved_at, admin_notes
-- 2. Tối ưu chỉ mục truy vấn
-- 3. RLS cho bảng reports: Chặn người dùng thường tự sửa trạng thái báo cáo (chỉ Admin được UPDATE)
-- 4. Chặn admin tự khóa chính mình hoặc khóa tài khoản admin khác (Trigger & RPC)
-- 5. Bộ RPC SECURITY DEFINER bắt buộc public.is_admin() cho mọi thao tác quản trị
-- ==============================================================================

-- 1. Bổ sung các cột metadata xử lý báo cáo
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- 2. Chỉ mục tối ưu truy vấn báo cáo theo trạng thái, đối tượng và người xử lý
CREATE INDEX IF NOT EXISTS idx_reports_status_created_at ON public.reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_target ON public.reports (target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_reports_resolved_by ON public.reports (resolved_by);
CREATE INDEX IF NOT EXISTS idx_reports_target_owner_id ON public.reports (target_owner_id);

-- 3. BẢO VỆ RLS BẢNG REPORTS:
-- - SELECT: Admin xem tất cả, User chỉ xem báo cáo do mình gửi
-- - INSERT: User được tạo báo cáo của mình
-- - UPDATE: CHỈ ADMIN ĐƯỢC PHÉP CẬP NHẬT TRẠNG THÁI / GHI CHÚ BÁO CÁO
-- - DELETE: CHỈ ADMIN ĐƯỢC PHÉP XÓA BÁO CÁO
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view and manage all reports" ON public.reports;
DROP POLICY IF EXISTS "Users view own reports or admins view all" ON public.reports;
DROP POLICY IF EXISTS "Users can insert own reports" ON public.reports;
DROP POLICY IF EXISTS "Admins only update reports" ON public.reports;
DROP POLICY IF EXISTS "Admins only delete reports" ON public.reports;

CREATE POLICY "Users view own reports or admins view all" ON public.reports
  FOR SELECT USING (
    public.is_admin() OR reporter_id = public.current_profile_id()
  );

CREATE POLICY "Users can insert own reports" ON public.reports
  FOR INSERT WITH CHECK (
    reporter_id IS NULL OR reporter_id = public.current_profile_id()
  );

CREATE POLICY "Admins only update reports" ON public.reports
  FOR UPDATE USING (
    public.is_admin()
  ) WITH CHECK (
    public.is_admin()
  );

CREATE POLICY "Admins only delete reports" ON public.reports
  FOR DELETE USING (
    public.is_admin()
  );

-- 4. BẢO VỆ PROFILES: CHẶN TỰ KHÓA MÌNH & CHẶN KHÓA ADMIN KHÁC (TẦNG TRIGGER)
CREATE OR REPLACE FUNCTION public.protect_profile_system_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  IF (NEW.app_role IS DISTINCT FROM OLD.app_role) OR
     (NEW.role IS DISTINCT FROM OLD.role) OR
     (NEW.admin_role IS DISTINCT FROM OLD.admin_role) OR
     (NEW.is_banned IS DISTINCT FROM OLD.is_banned) OR
     (NEW.banned_until IS DISTINCT FROM OLD.banned_until) OR
     (NEW.banned_reason IS DISTINCT FROM OLD.banned_reason) THEN
    
    -- 1. Bắt buộc quyền Quản trị viên
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Bạn không có quyền sửa đổi các trường hệ thống của tài khoản' USING ERRCODE = '42501';
    END IF;

    -- 2. Quy tắc bảo vệ: Không cho phép Admin tự khóa chính mình
    IF (NEW.is_banned IS TRUE AND (OLD.is_banned IS NOT TRUE OR OLD.is_banned IS NULL)) THEN
      IF OLD.id = public.current_profile_id() THEN
        RAISE EXCEPTION 'Quản trị viên không thể tự khóa tài khoản của chính mình' USING ERRCODE = '42501';
      END IF;

      -- 3. Quy tắc bảo vệ: Không cho phép khóa tài khoản Admin khác
      IF (OLD.app_role = 'admin' OR OLD.role = 'admin' OR OLD.admin_role = 'superadmin' OR OLD.admin_role = 'super_admin') THEN
        RAISE EXCEPTION 'Không thể khóa tài khoản của một Quản trị viên khác' USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_system_columns ON public.profiles;
CREATE TRIGGER trg_protect_profile_system_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_system_columns();

-- 5. BỘ RPC QUẢN TRỊ BẢO MẬT (CHẶN 100% Ở TẦNG DATABASE CHO MỌI THAO TÁC)

-- 5.1. RPC KHÓA NGƯỜI DÙNG (admin_ban_user)
CREATE OR REPLACE FUNCTION public.admin_ban_user(
  p_user_id UUID,
  p_reason TEXT,
  p_duration_days INTEGER DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_admin_id UUID;
  v_target_profile RECORD;
  v_banned_until TIMESTAMPTZ;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Chỉ Quản trị viên mới có quyền thực hiện thao tác này' USING ERRCODE = '42501';
  END IF;

  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'Ghi chú lý do khóa tài khoản là bắt buộc' USING ERRCODE = '22023';
  END IF;

  v_admin_id := public.current_profile_id();

  IF p_user_id = v_admin_id THEN
    RAISE EXCEPTION 'Quản trị viên không thể tự khóa tài khoản của chính mình' USING ERRCODE = '42501';
  END IF;

  SELECT id, full_name, role, app_role, admin_role, is_banned
  INTO v_target_profile
  FROM public.profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy người dùng cần khóa' USING ERRCODE = 'P0002';
  END IF;

  IF (v_target_profile.app_role = 'admin' OR v_target_profile.role = 'admin' OR v_target_profile.admin_role = 'superadmin' OR v_target_profile.admin_role = 'super_admin') THEN
    RAISE EXCEPTION 'Không thể khóa tài khoản của một Quản trị viên khác' USING ERRCODE = '42501';
  END IF;

  v_banned_until := now() + (COALESCE(p_duration_days, 30) || ' days')::interval;

  UPDATE public.profiles
  SET is_banned = true,
      banned_reason = trim(p_reason),
      banned_until = v_banned_until,
      updated_at = now()
  WHERE id = p_user_id;

  UPDATE public.roommate_posts
  SET status = 'closed',
      updated_at = now()
  WHERE poster_id = p_user_id;

  UPDATE public.reports
  SET status = 'da_xu_ly',
      admin_notes = trim(p_reason),
      resolved_by = v_admin_id,
      resolved_at = now(),
      updated_at = now()
  WHERE target_id = p_user_id::text OR target_owner_id = p_user_id;

  INSERT INTO public.audit_logs (
    admin_id, admin_role, action, entity_type, entity_id, reason, data_after, created_at
  ) VALUES (
    v_admin_id, 'admin', 'admin_ban_reported_user', 'user', p_user_id::text, trim(p_reason),
    jsonb_build_object('is_banned', true, 'banned_reason', trim(p_reason), 'banned_until', v_banned_until),
    now()
  );

  RETURN jsonb_build_object('success', true, 'user_id', p_user_id, 'banned_until', v_banned_until);
END;
$$;

-- 5.2. RPC MỞ KHÓA NGƯỜI DÙNG (admin_unban_user)
CREATE OR REPLACE FUNCTION public.admin_unban_user(
  p_user_id UUID,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_admin_id UUID;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Chỉ Quản trị viên mới có quyền thực hiện thao tác này' USING ERRCODE = '42501';
  END IF;

  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'Ghi chú lý do mở khóa tài khoản là bắt buộc' USING ERRCODE = '22023';
  END IF;

  v_admin_id := public.current_profile_id();

  UPDATE public.profiles
  SET is_banned = false,
      banned_reason = NULL,
      banned_until = NULL,
      updated_at = now()
  WHERE id = p_user_id;

  INSERT INTO public.audit_logs (
    admin_id, admin_role, action, entity_type, entity_id, reason, data_after, created_at
  ) VALUES (
    v_admin_id, 'admin', 'admin_unban_reported_user', 'user', p_user_id::text, trim(p_reason),
    jsonb_build_object('is_banned', false, 'unban_reason', trim(p_reason)),
    now()
  );

  RETURN jsonb_build_object('success', true, 'user_id', p_user_id);
END;
$$;

-- 5.3. RPC ẨN TIN ĐĂNG BỊ BÁO CÁO (admin_hide_reported_listing)
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

-- 5.4. RPC KHÔI PHỤC TIN ĐĂNG (admin_restore_reported_listing)
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
      updated_at = now()
  WHERE id = p_target_id
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

-- 5.5. RPC BÁC BỎ BÁO CÁO (admin_dismiss_reports)
CREATE OR REPLACE FUNCTION public.admin_dismiss_reports(
  p_target_type TEXT,
  p_target_id TEXT,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_admin_id UUID;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Chỉ Quản trị viên mới có quyền thực hiện thao tác này' USING ERRCODE = '42501';
  END IF;

  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'Ghi chú lý do bác bỏ là bắt buộc' USING ERRCODE = '22023';
  END IF;

  v_admin_id := public.current_profile_id();

  UPDATE public.reports
  SET status = 'bac_bo',
      admin_notes = trim(p_reason),
      resolved_by = v_admin_id,
      resolved_at = now(),
      updated_at = now()
  WHERE target_type = p_target_type AND target_id = p_target_id;

  INSERT INTO public.audit_logs (
    admin_id, admin_role, action, entity_type, entity_id, reason, created_at
  ) VALUES (
    v_admin_id, 'admin', 'admin_dismiss_reports', 'report', p_target_type || ':' || p_target_id, trim(p_reason), now()
  );

  RETURN jsonb_build_object('success', true, 'target_id', p_target_id);
END;
$$;
