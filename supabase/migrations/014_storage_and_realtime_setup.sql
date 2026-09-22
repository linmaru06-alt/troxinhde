-- ==============================================================================
-- 014_storage_and_realtime_setup.sql
-- Cấu hình tự động Storage Buckets (Ảnh phòng, Avatar, Tài liệu)
-- & Kích hoạt Realtime Replication cho Tin nhắn, Hội thoại, Thông báo, Phòng trọ
-- ==============================================================================

-- ==============================================================================
-- PHẦN 1: KHỞI TẠO STORAGE BUCKETS
-- ==============================================================================

-- 1. Tạo bucket `room-images` (Public: Lưu trữ ảnh phòng trọ, tòa nhà, chợ đồ cũ)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'room-images',
    'room-images',
    true,
    10485760, -- 10MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic'];

-- 2. Tạo bucket `avatars` (Public: Lưu ảnh đại diện người dùng)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    true,
    5242880, -- 5MB
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- 3. Tạo bucket `documents` (Private: Lưu CCCD, hợp đồng, giấy tờ kinh doanh)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'documents',
    'documents',
    false,
    15728640, -- 15MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 15728640,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

-- ==============================================================================
-- PHẦN 2: PHÂN QUYỀN TRUY CẬP (STORAGE RLS POLICIES)
-- ==============================================================================

-- Cho phép mọi người (kể cả khách vãng lai) đọc và xem ảnh công khai
DROP POLICY IF EXISTS "Public Access Room Images" ON storage.objects;
CREATE POLICY "Public Access Room Images"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'room-images');

DROP POLICY IF EXISTS "Public Access Avatars" ON storage.objects;
CREATE POLICY "Public Access Avatars"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');

-- Cho phép người dùng tải ảnh lên bucket room-images
DROP POLICY IF EXISTS "Allow Upload Room Images" ON storage.objects;
CREATE POLICY "Allow Upload Room Images"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'room-images');

-- Cho phép người dùng cập nhật hoặc xóa ảnh do chính mình tải lên trong room-images
DROP POLICY IF EXISTS "Allow Manage Room Images" ON storage.objects;
CREATE POLICY "Allow Manage Room Images"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'room-images');

DROP POLICY IF EXISTS "Allow Delete Room Images" ON storage.objects;
CREATE POLICY "Allow Delete Room Images"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'room-images');

-- Cho phép người dùng tải lên avatar
DROP POLICY IF EXISTS "Allow Upload Avatars" ON storage.objects;
CREATE POLICY "Allow Upload Avatars"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Allow Manage Avatars" ON storage.objects;
CREATE POLICY "Allow Manage Avatars"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'avatars');

-- Bảo vệ tài liệu riêng tư (documents): Chỉ chủ sở hữu file hoặc Admin mới được xem
DROP POLICY IF EXISTS "Private Access Documents" ON storage.objects;
CREATE POLICY "Private Access Documents"
    ON storage.objects FOR SELECT
    USING (
        bucket_id = 'documents'
        AND (
            public.is_admin()
            OR auth.uid()::text = (storage.foldername(name))[1]
            OR (SELECT app_role FROM public.profiles WHERE id = public.current_profile_id() LIMIT 1) = 'admin'
        )
    );

DROP POLICY IF EXISTS "Allow Upload Documents" ON storage.objects;
CREATE POLICY "Allow Upload Documents"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'documents');

-- ==============================================================================
-- PHẦN 3: KÍCH HOẠT SUPABASE REALTIME REPLICATION
-- ==============================================================================

-- Bật Replica Identity FULL để gửi payload hoàn chỉnh khi UPDATE/DELETE
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.rooms REPLICA IDENTITY FULL;

-- Thêm an toàn các bảng vào publication supabase_realtime
DO $$
BEGIN
    -- 1. Bảng messages (Tin nhắn)
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    END IF;

    -- 2. Bảng conversations (Cuộc trò chuyện)
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'conversations'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
    END IF;

    -- 3. Bảng notifications (Thông báo người dùng)
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;

    -- 4. Bảng rooms (Trạng thái phòng trọ)
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'rooms'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
    END IF;
END $$;
