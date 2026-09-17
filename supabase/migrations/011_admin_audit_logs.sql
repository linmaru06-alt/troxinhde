-- ==============================================================================
-- MIGRATION: 011_admin_audit_logs.sql
-- MỤC TIÊU: Tạo bảng audit_logs ghi vết lịch sử quản trị, bổ sung cột phân quyền
--           và trạng thái khóa tài khoản, xác minh chủ trọ trên bảng profiles.
-- ==============================================================================

-- 1. TẠO BẢNG AUDIT_LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  admin_email TEXT,
  admin_role TEXT DEFAULT 'moderator',
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL, -- 'room' | 'user' | 'report' | 'owner_application' | 'booking' | 'system'
  entity_id TEXT,
  data_before JSONB,
  data_after JSONB,
  reason TEXT,
  is_demo_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index tối ưu truy vấn audit logs theo thời gian và đối tượng
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin_id ON public.audit_logs(admin_id);

-- 2. BỔ SUNG CỘT CHO BẢNG PROFILES NẾU CHƯA CÓ
DO $$
BEGIN
  -- Cột trạng thái khóa tài khoản
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'is_banned') THEN
    ALTER TABLE public.profiles ADD COLUMN is_banned BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'banned_until') THEN
    ALTER TABLE public.profiles ADD COLUMN banned_until TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'banned_reason') THEN
    ALTER TABLE public.profiles ADD COLUMN banned_reason TEXT;
  END IF;

  -- Cột xác minh chủ trọ chính thức
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'landlord_verified') THEN
    ALTER TABLE public.profiles ADD COLUMN landlord_verified BOOLEAN DEFAULT false;
  END IF;

  -- Cột phân vai trò quản trị viên
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'admin_role') THEN
    ALTER TABLE public.profiles ADD COLUMN admin_role TEXT DEFAULT 'moderator';
  END IF;
END $$;

-- 3. BẢO MẬT & ROW LEVEL SECURITY CHO AUDIT_LOGS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Cấm mọi hành vi UPDATE hoặc DELETE trên audit_logs (bảo đảm tính toàn vẹn bất biến)
DROP POLICY IF EXISTS "No one can update audit_logs" ON public.audit_logs;
CREATE POLICY "No one can update audit_logs"
  ON public.audit_logs FOR UPDATE
  USING (false);

DROP POLICY IF EXISTS "No one can delete audit_logs" ON public.audit_logs;
CREATE POLICY "No one can delete audit_logs"
  ON public.audit_logs FOR DELETE
  USING (false);

-- Cho phép INSERT audit log từ client authenticated (kèm service role)
DROP POLICY IF EXISTS "Authenticated admins can insert audit_logs" ON public.audit_logs;
CREATE POLICY "Authenticated admins can insert audit_logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (true);

-- Cho phép SELECT audit log cho người dùng có quyền quản trị
DROP POLICY IF EXISTS "Admins can view audit_logs" ON public.audit_logs;
CREATE POLICY "Admins can view audit_logs"
  ON public.audit_logs FOR SELECT
  USING (true);
