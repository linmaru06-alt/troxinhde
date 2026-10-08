-- ==============================================================================
-- MIGRATION 029: CHẶN RÒ RỈ DỮ LIỆU CÁ NHÂN (PROFILES, CONVERSATIONS, TRANSACTIONS, AUDIT_LOGS)
-- ==============================================================================
-- Kiểm tra trên cloud (26/09/2026) cho thấy khách chưa đăng nhập đọc được:
--   - profiles: toàn bộ hồ sơ gồm SĐT, firebase_uid, trạng thái khóa (policy baseline USING (true));
--     đồng thời baseline cho phép bất kỳ ai INSERT/UPDATE mọi hồ sơ.
--   - conversations: ai nhắn với ai và nội dung tin nhắn cuối (policy 017 FOR ALL USING (true)).
--   - transactions: giao dịch chưa gắn người dùng (điều kiện "OR user_id IS NULL" của 013).
--   - audit_logs: nhật ký quản trị (policy 017 FOR ALL USING (true)).
--
-- Cách sửa:
--   1. Gỡ toàn bộ policy cũ của 4 bảng và tạo lại bộ policy đúng quyền.
--   2. Thông tin công khai của người khác (tên, ảnh, huy hiệu xác minh) lấy qua RPC
--      get_public_profiles, không bao gồm SĐT hay firebase_uid.
--   3. Trạng thái thanh toán tra theo mã đơn qua RPC get_payment_status (không kèm thông tin người mua).
--   4. Kiểm tra trùng SĐT khi đăng ký qua RPC is_phone_registered (chỉ trả về đúng/sai).
--
-- Chạy SAU migration 028 (dùng hàm normalize_vn_phone). Chạy lại an toàn, không đổi dữ liệu.
-- ==============================================================================

-- 0. HÀM NHẬN DIỆN NGƯỜI GỌI (SECURITY DEFINER để policy của profiles không đệ quy)
-- Giữ nguyên định nghĩa của migration 021 đang chạy trên cloud.
CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  SELECT id FROM public.profiles
  WHERE firebase_uid = COALESCE(auth.jwt() ->> 'sub', auth.jwt() ->> 'user_id')
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = public.current_profile_id()
      AND (app_role = 'admin' OR role = 'admin' OR admin_role = 'superadmin')
  );
$$;

-- Cột cần cho RPC công khai (môi trường dựng mới có thể thiếu)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS university TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS student_year TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banned_until TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

-- 1. RPC: HỒ SƠ CÔNG KHAI (chỉ các cột an toàn) -------------------------------------
DROP FUNCTION IF EXISTS public.get_public_profiles(UUID[]);
CREATE FUNCTION public.get_public_profiles(p_ids UUID[])
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  avatar_url TEXT,
  app_role TEXT,
  verified BOOLEAN,
  student_verified BOOLEAN,
  phone_verified BOOLEAN,
  is_banned BOOLEAN,
  university TEXT,
  student_year TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    p.id,
    COALESCE(NULLIF(p.full_name, ''), p.name),
    p.avatar_url,
    COALESCE(p.app_role, p.role),
    COALESCE(p.verified, false),
    COALESCE(p.student_verified, false),
    COALESCE(p.phone_verified, false),
    COALESCE(p.is_banned, false) AND (p.banned_until IS NULL OR p.banned_until > now()),
    p.university,
    p.student_year,
    p.created_at
  FROM public.profiles p
  WHERE p_ids IS NOT NULL
    AND p.id = ANY (p_ids[1:200]);
$$;

-- 2. RPC: KIỂM TRA SĐT ĐÃ ĐĂNG KÝ (chỉ trả về đúng/sai) ------------------------------
CREATE OR REPLACE FUNCTION public.is_phone_registered(p_phone TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT public.normalize_vn_phone(p_phone) IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE public.normalize_vn_phone(phone) = public.normalize_vn_phone(p_phone)
    );
$$;

-- 3. RPC: TRẠNG THÁI THANH TOÁN THEO MÃ ĐƠN (không kèm người mua) -------------------
CREATE OR REPLACE FUNCTION public.get_payment_status(p_order_code TEXT)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object(
    'status', t.status,
    'plan_id', t.plan_id,
    'amount', t.amount,
    'paid_at', t.paid_at,
    'activated_at', t.activated_at
  )
  FROM public.transactions t
  WHERE t.order_code = p_order_code
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_profiles(UUID[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_phone_registered(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_payment_status(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_profiles(UUID[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_phone_registered(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_payment_status(TEXT) TO anon, authenticated;

-- 4. GỠ TOÀN BỘ POLICY CŨ CỦA 4 BẢNG ------------------------------------------------
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tablename, policyname FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('profiles', 'conversations', 'transactions', 'audit_logs')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 5. PROFILES: chỉ chính chủ và admin đọc/sửa; người khác dùng get_public_profiles ----
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT USING (firebase_uid = COALESCE(auth.jwt() ->> 'sub', auth.jwt() ->> 'user_id'));

CREATE POLICY "profiles_select_admin" ON public.profiles
  FOR SELECT USING ((SELECT public.is_admin()));

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT WITH CHECK (
    firebase_uid = COALESCE(auth.jwt() ->> 'sub', auth.jwt() ->> 'user_id')
    OR (SELECT public.is_admin())
  );

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE
  USING (
    firebase_uid = COALESCE(auth.jwt() ->> 'sub', auth.jwt() ->> 'user_id')
    OR (SELECT public.is_admin())
  )
  WITH CHECK (
    firebase_uid = COALESCE(auth.jwt() ->> 'sub', auth.jwt() ->> 'user_id')
    OR (SELECT public.is_admin())
  );

CREATE POLICY "profiles_delete_admin" ON public.profiles
  FOR DELETE USING ((SELECT public.is_admin()));

-- 6. CONVERSATIONS: chỉ hai người tham gia (và admin) -------------------------------
CREATE POLICY "conversations_select_participants" ON public.conversations
  FOR SELECT USING (
    (SELECT public.current_profile_id()) IN (participant_1, participant_2)
    OR (SELECT public.is_admin())
  );

CREATE POLICY "conversations_insert_participants" ON public.conversations
  FOR INSERT WITH CHECK ((SELECT public.current_profile_id()) IN (participant_1, participant_2));

CREATE POLICY "conversations_update_participants" ON public.conversations
  FOR UPDATE
  USING (
    (SELECT public.current_profile_id()) IN (participant_1, participant_2)
    OR (SELECT public.is_admin())
  )
  WITH CHECK (
    (SELECT public.current_profile_id()) IN (participant_1, participant_2)
    OR (SELECT public.is_admin())
  );

CREATE POLICY "conversations_delete_admin" ON public.conversations
  FOR DELETE USING ((SELECT public.is_admin()));

-- 7. TRANSACTIONS: giữ nguyên quy tắc ghi của 013, bỏ quyền đọc giao dịch không chủ ----
CREATE POLICY "transactions_select_own" ON public.transactions
  FOR SELECT USING (
    user_id = (SELECT public.current_profile_id())
    OR (SELECT public.is_admin())
  );

CREATE POLICY "transactions_insert_pending" ON public.transactions
  FOR INSERT WITH CHECK (
    (user_id = (SELECT public.current_profile_id()) OR (SELECT public.is_admin()) OR user_id IS NULL)
    AND status = 'pending'
  );

CREATE POLICY "transactions_update_admin" ON public.transactions
  FOR UPDATE
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

-- 8. AUDIT_LOGS: nhật ký quản trị chỉ admin xem; bài tìm bạn ở ghép (đang lưu tạm tại đây)
--    vẫn đọc/ghi/xóa được để không làm gãy tính năng tìm bạn ở ghép.
CREATE POLICY "audit_logs_select" ON public.audit_logs
  FOR SELECT USING (
    (SELECT public.is_admin())
    OR (entity_type = 'roommate_post' AND action = 'create_roommate_post')
  );

CREATE POLICY "audit_logs_insert" ON public.audit_logs
  FOR INSERT WITH CHECK (
    (SELECT public.is_admin())
    OR (entity_type = 'roommate_post' AND action = 'create_roommate_post')
  );

CREATE POLICY "audit_logs_delete" ON public.audit_logs
  FOR DELETE USING (
    (SELECT public.is_admin())
    OR (entity_type = 'roommate_post' AND action = 'create_roommate_post')
  );
-- Không có policy UPDATE: nhật ký không được sửa.
