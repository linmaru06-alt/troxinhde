-- ==============================================================================
-- TRỌ XINH — LÁ CHẮN BẢO MẬT DATABASE & PHÒNG NGỰ PHÂN QUYỀN BẤT BIẾN
-- Migration: 034_zero_trust_role_tampering_defense.sql
-- An toàn 100%: Chạy lại nhiều lần không mất dữ liệu hiện có
-- ==============================================================================

-- 1. BẢO VỆ CỘT PHÂN QUYỀN TRÊN BẢNG PROFILES KHỎI CLIENT-SIDE TAMPERING
CREATE OR REPLACE FUNCTION public.protect_sensitive_profile_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Nếu caller là SuperAdmin hoặc Service Role (Postgres/Supabase Admin) -> Cho phép
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;

  -- Người dùng thông thường KHÔNG ĐƯỢC PHÉP thay đổi vai trò hoặc trạng thái xác minh
  IF (NEW.role IS DISTINCT FROM OLD.role) OR
     (NEW.app_role IS DISTINCT FROM OLD.app_role) OR
     (NEW.admin_role IS DISTINCT FROM OLD.admin_role) OR
     (NEW.verified IS DISTINCT FROM OLD.verified) OR
     (NEW.phone_verified IS DISTINCT FROM OLD.phone_verified) OR
     (NEW.student_verified IS DISTINCT FROM OLD.student_verified) OR
     (NEW.email_verified IS DISTINCT FROM OLD.email_verified) OR
     (NEW.landlord_verified IS DISTINCT FROM OLD.landlord_verified) OR
     (NEW.owner_application_status IS DISTINCT FROM OLD.owner_application_status) THEN
    
    RAISE EXCEPTION 'Hành vi vi phạm bảo mật: Bạn không có quyền tự ý thay đổi vai trò hoặc trạng thái xác minh tài khoản!';
  END IF;

  RETURN NEW;
END;
$$;

-- 2. ĐÍNH KÈM TRIGGER VÀO BẢNG PROFILES (NẾU CHƯA CÓ)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_protect_profile_roles'
  ) THEN
    CREATE TRIGGER trg_protect_profile_roles
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.protect_sensitive_profile_fields();
  END IF;
END $$;

-- 3. CỦNG CỐ RLS BẢNG AUDIT LOGS — CHỈ ADMIN ĐỌC, CẤM CLIENT SỬA HOẶC XÓA
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can view audit logs"
  ON public.admin_audit_logs FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "System insert audit logs" ON public.admin_audit_logs;
CREATE POLICY "System insert audit logs"
  ON public.admin_audit_logs FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "No one can update audit logs" ON public.admin_audit_logs;
CREATE POLICY "No one can update audit logs"
  ON public.admin_audit_logs FOR UPDATE
  USING (false);

DROP POLICY IF EXISTS "No one can delete audit logs" ON public.admin_audit_logs;
CREATE POLICY "No one can delete audit logs"
  ON public.admin_audit_logs FOR DELETE
  USING (false);
