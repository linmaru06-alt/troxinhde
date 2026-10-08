-- ==============================================================================
-- TRỌ XINH — HỆ THỐNG GHI NHẬN CẢNH BÁO BẢO MẬT & CLICKJACKING LOGS
-- Migration: 042_security_events_and_monitoring.sql
-- An toàn 100%: Chạy lại nhiều lần không mất dữ liệu hiện có
-- ==============================================================================

-- 1. BẢNG GHI NHẬN SỰ KIỆN BẢO MẬT (SECURITY EVENTS)
CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL, -- 'clickjacking_attempt', 'csp_violation', 'tampering_detected'
  severity TEXT NOT NULL DEFAULT 'warning', -- 'info', 'warning', 'critical'
  client_ip TEXT,
  user_agent TEXT,
  target_url TEXT,
  referrer TEXT,
  payload JSONB,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. TẠO INDEX TỐI ƯU TRA CỨU LOG THEO LOẠI SỰ KIỆN VÀ THỜI GIAN
CREATE INDEX IF NOT EXISTS idx_security_events_type_created 
  ON public.security_events(event_type, created_at DESC);

-- 3. KÍCH HOẠT VÀ SIẾT CHẶT BẢO MẬT HÀNG (RLS)
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

-- 3.1. Cho phép Client ẩn danh gửi báo cáo cảnh báo sự cố bảo mật lên hệ thống
DROP POLICY IF EXISTS "Allow anonymous security event reporting" ON public.security_events;
CREATE POLICY "Allow anonymous security event reporting"
  ON public.security_events FOR INSERT
  WITH CHECK (true);

-- 3.2. Chỉ Quản trị viên (SuperAdmin) mới có quyền đọc và theo dõi các cảnh báo bảo mật này
DROP POLICY IF EXISTS "Admins can view security events" ON public.security_events;
CREATE POLICY "Admins can view security events"
  ON public.security_events FOR SELECT
  USING (public.is_admin());

-- 3.3. Cấm tuyệt đối mọi hành vi chỉnh sửa hoặc xóa sự kiện bảo mật (Bảo toàn lịch sử vết kiểm toán)
DROP POLICY IF EXISTS "No one can update security events" ON public.security_events;
CREATE POLICY "No one can update security events"
  ON public.security_events FOR UPDATE
  USING (false);

DROP POLICY IF EXISTS "No one can delete security events" ON public.security_events;
CREATE POLICY "No one can delete security events"
  ON public.security_events FOR DELETE
  USING (false);
