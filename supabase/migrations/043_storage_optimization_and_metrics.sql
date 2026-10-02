-- ==============================================================================
-- TRỌ XINH — CẤU HÌNH LƯU TRỮ SUPABASE STORAGE & METRICS ENGINE
-- Migration: 043_storage_optimization_and_metrics.sql
-- An toàn 100%: Chạy lại nhiều lần không mất dữ liệu hiện có
-- ==============================================================================

-- 1. ĐẢM BẢO BUCKET `room-images` CHẤP NHẬN ĐẦY ĐỦ WEBP VÀ GIỚI HẠN DUNG LƯỢNG
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'room-images',
    'room-images',
    true,
    10485760, -- 10MB tối đa
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- 2. ĐẢM BẢO BUCKET `avatars` CHẤP NHẬN WEBP
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    true,
    5242880, -- 5MB tối đa
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- 3. BẢNG THEO DÕI SỐ LIỆU TIẾT KIỆM BĂNG THÔNG LƯU TRỮ (STORAGE METRICS)
CREATE TABLE IF NOT EXISTS public.storage_upload_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  original_size_bytes BIGINT NOT NULL,
  compressed_size_bytes BIGINT NOT NULL,
  saved_percent NUMERIC(5, 2),
  mime_type TEXT DEFAULT 'image/webp',
  bucket_name TEXT DEFAULT 'room-images',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index tra cứu theo ngày và người dùng
CREATE INDEX IF NOT EXISTS idx_storage_metrics_created_user 
  ON public.storage_upload_metrics(created_at DESC, user_id);

-- 4. BẢO MẬT HÀNG (RLS) CHO BẢNG METRICS
ALTER TABLE public.storage_upload_metrics ENABLE ROW LEVEL SECURITY;

-- Cho phép người dùng ghi nhận số liệu sau khi nén ảnh thành công
DROP POLICY IF EXISTS "Allow authenticated insert upload metrics" ON public.storage_upload_metrics;
CREATE POLICY "Allow authenticated insert upload metrics"
  ON public.storage_upload_metrics FOR INSERT
  WITH CHECK (true);

-- Chỉ Quản trị viên (SuperAdmin) mới có quyền xem bảng số liệu băng thông
DROP POLICY IF EXISTS "Admins can view storage metrics" ON public.storage_upload_metrics;
CREATE POLICY "Admins can view storage metrics"
  ON public.storage_upload_metrics FOR SELECT
  USING (public.is_admin());
