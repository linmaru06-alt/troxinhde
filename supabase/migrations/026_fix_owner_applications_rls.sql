-- =========================================================================
-- MIGRATION 026: KHẮC PHỤC RLS VÀ ĐỒNG BỘ ĐƠN ĐĂNG KÝ CHỦ TRỌ (OWNER_APPLICATIONS)
-- Hệ thống xác thực: Firebase Auth (Front-end sử dụng Anon Key + Firebase ID Token)
-- =========================================================================

-- 1. Đảm bảo bảng owner_applications tồn tại với đầy đủ các cột
CREATE TABLE IF NOT EXISTS public.owner_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    building_name TEXT NOT NULL DEFAULT '',
    address TEXT NOT NULL DEFAULT '',
    district TEXT NOT NULL DEFAULT '',
    total_rooms INTEGER DEFAULT 1,
    cccd_number TEXT NOT NULL DEFAULT '',
    cccd_image_url TEXT,
    legal_docs_note TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now(),
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT
);

-- Thêm các cột nếu bảng đã tồn tại từ trước mà thiếu cột
ALTER TABLE public.owner_applications ADD COLUMN IF NOT EXISTS building_name TEXT DEFAULT '';
ALTER TABLE public.owner_applications ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '';
ALTER TABLE public.owner_applications ADD COLUMN IF NOT EXISTS district TEXT DEFAULT '';
ALTER TABLE public.owner_applications ADD COLUMN IF NOT EXISTS total_rooms INTEGER DEFAULT 1;
ALTER TABLE public.owner_applications ADD COLUMN IF NOT EXISTS cccd_number TEXT DEFAULT '';
ALTER TABLE public.owner_applications ADD COLUMN IF NOT EXISTS cccd_image_url TEXT;
ALTER TABLE public.owner_applications ADD COLUMN IF NOT EXISTS legal_docs_note TEXT;
ALTER TABLE public.owner_applications ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.owner_applications ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE public.owner_applications ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 2. Đảm bảo trạng thái đơn trên bảng profiles hợp lệ
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS owner_application_status TEXT DEFAULT 'none';

-- 3. Cập nhật Row Level Security (RLS) cho bảng owner_applications
ALTER TABLE public.owner_applications ENABLE ROW LEVEL SECURITY;

-- Xóa các policy cũ có thể gây chặn (đặc biệt là policy dùng auth.uid() khi hệ thống dùng Firebase Auth)
DROP POLICY IF EXISTS "Public access owner_applications" ON public.owner_applications;
DROP POLICY IF EXISTS "Users manage own owner application" ON public.owner_applications;
DROP POLICY IF EXISTS "Users view own owner applications" ON public.owner_applications;
DROP POLICY IF EXISTS "Users submit owner applications" ON public.owner_applications;
DROP POLICY IF EXISTS "Admins manage owner applications" ON public.owner_applications;
DROP POLICY IF EXISTS "Users and admins view owner applications" ON public.owner_applications;
DROP POLICY IF EXISTS "Users insert own owner application" ON public.owner_applications;
DROP POLICY IF EXISTS "Public submit owner applications" ON public.owner_applications;
DROP POLICY IF EXISTS "Public view owner applications" ON public.owner_applications;
DROP POLICY IF EXISTS "Public update owner applications" ON public.owner_applications;

-- Policy 1: Cho phép người dùng gửi đơn đăng ký (INSERT)
CREATE POLICY "Public submit owner applications"
    ON public.owner_applications FOR INSERT
    WITH CHECK (true);

-- Policy 2: Cho phép đọc đơn đăng ký (SELECT)
CREATE POLICY "Public view owner applications"
    ON public.owner_applications FOR SELECT
    USING (true);

-- Policy 3: Cho phép cập nhật đơn đăng ký (UPDATE - duyệt / từ chối)
CREATE POLICY "Public update owner applications"
    ON public.owner_applications FOR UPDATE
    USING (true);

-- Policy 4: Cho phép xóa đơn nếu cần (DELETE)
CREATE POLICY "Public delete owner applications"
    ON public.owner_applications FOR DELETE
    USING (true);

-- 4. Bật Realtime cho bảng owner_applications
ALTER TABLE public.owner_applications REPLICA IDENTITY FULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = 'owner_applications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.owner_applications;
    END IF;
END $$;
