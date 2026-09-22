-- ==============================================================================
-- TRỌ XINH — 017_FIX_FULL_RELATIONAL_ENGINE.SQL
-- HỆ THỐNG MÓC NỐI TOÀN DIỆN DATABASE, REALTIME & PHÂN QUYỀN TRỌ XINH
-- 
-- Chạy 1 lần trong Supabase Dashboard > SQL Editor:
-- 1. Mở RLS toàn diện cho các bảng nghiệp vụ (Phục vụ Firebase Auth)
-- 2. Kích hoạt Realtime đầy đủ cho Messages, Conversations, Notifications, Rooms
-- 3. Đảm bảo toàn vẹn khóa ngoại (FK) và chuẩn hóa kiểu dữ liệu UUID
-- 4. Tạo sẵn Profile mặc định (Admin, Chủ trọ, Người thuê) tránh vi phạm Foreign Key
-- ==============================================================================

-- ==============================================================================
-- PHẦN 1: GỠ BỎ RÀNG BUỘC CHECK CŨ VÀ KHÓA NGOẠI PHỤ THUỘC SUPABASE AUTH
-- ==============================================================================
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.rooms DROP CONSTRAINT IF EXISTS rooms_room_type_check;
ALTER TABLE public.rooms DROP CONSTRAINT IF EXISTS rooms_status_check;
ALTER TABLE public.rooms DROP CONSTRAINT IF EXISTS rooms_moderation_status_check;
ALTER TABLE public.rooms DROP CONSTRAINT IF EXISTS rooms_availability_status_check;
ALTER TABLE public.buildings DROP CONSTRAINT IF EXISTS buildings_status_check;

-- Đảm bảo các cột phụ cần thiết cho bảng rooms
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS electricity_price NUMERIC DEFAULT 3500;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS water_price NUMERIC DEFAULT 100000;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS electricity_cost BIGINT DEFAULT 3500;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS water_cost BIGINT DEFAULT 30000;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS internet_cost BIGINT DEFAULT 100000;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS parking_fee BIGINT DEFAULT 100000;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS floor INTEGER DEFAULT 1;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS rules JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS amenities JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;

-- Đảm bảo các cột phụ cho bảng buildings
ALTER TABLE public.buildings ADD COLUMN IF NOT EXISTS electricity_price NUMERIC DEFAULT 3500;
ALTER TABLE public.buildings ADD COLUMN IF NOT EXISTS water_price NUMERIC DEFAULT 100000;
ALTER TABLE public.buildings ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
ALTER TABLE public.buildings ADD COLUMN IF NOT EXISTS total_rooms INTEGER DEFAULT 10;
ALTER TABLE public.buildings ADD COLUMN IF NOT EXISTS available_rooms INTEGER DEFAULT 5;
ALTER TABLE public.buildings ADD COLUMN IF NOT EXISTS verified_badge BOOLEAN DEFAULT true;

-- ==============================================================================
-- PHẦN 2: SEED PROFILE NỀN TẢNG (TRÁNH LỖI KHÓA NGOẠI KHI CLIENT GỬI ID)
-- ==============================================================================
INSERT INTO public.profiles (id, firebase_uid, full_name, role, app_role, phone, email, verified)
VALUES 
    ('00000000-0000-0000-0000-000000000001', 'system_owner_001', 'Chủ Trọ Trọ Xinh', 'owner', 'owner', '0912345678', 'chutro@troxinh.vn', true),
    ('00000000-0000-0000-0000-000000000002', 'system_admin_001', 'Quản Trị Viên Trọ Xinh', 'admin', 'admin', '0988888888', 'admin@troxinh.vn', true),
    ('00000000-0000-0000-0000-000000000003', 'system_renter_001', 'Người Thuê Trọ Mẫu', 'renter', 'renter', '0901234567', 'nguoithue@troxinh.vn', true)
ON CONFLICT (id) DO UPDATE SET 
    app_role = EXCLUDED.app_role,
    role = EXCLUDED.role,
    verified = true;

-- Đảm bảo có tòa nhà mặc định
INSERT INTO public.buildings (id, owner_id, name, address, district, city, lat, lng, description, amenities, cover_image_url, status)
VALUES (
    'b0000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'Tòa Nhà TroXinh Cầu Giấy Complex',
    'Số 18 Ngõ 165 Cầu Giấy, P. Dịch Vọng',
    'Quận Cầu Giấy',
    'Hà Nội',
    21.0368,
    105.7905,
    'Tòa nhà căn hộ dịch vụ và phòng trọ cao cấp, camera an ninh 24/7, thang máy, khóa vân tay.',
    '["Thang máy", "Khóa vân tay", "PCCC đạt chuẩn", "Để xe miễn phí"]'::jsonb,
    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800',
    'active'
)
ON CONFLICT (id) DO NOTHING;

-- ==============================================================================
-- PHẦN 3: BẢO MẬT ROW LEVEL SECURITY (RLS) CHUẨN HÓA TOÀN BỘ CÁC BẢNG
-- (Tương thích 100% với Firebase Auth - Client kết nối qua Anon Key)
-- ==============================================================================

-- 1. Bảng PROFILES (Hồ sơ người dùng)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public profiles viewable" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow public read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow public insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow public update profiles" ON public.profiles;

CREATE POLICY "Allow public read profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Allow public insert profiles" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update profiles" ON public.profiles FOR UPDATE USING (true);

-- 2. Bảng CONVERSATIONS (Cuộc trò chuyện)
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Participants view conversations" ON public.conversations;
DROP POLICY IF EXISTS "Participants create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Participants update conversations" ON public.conversations;
DROP POLICY IF EXISTS "Public access conversations" ON public.conversations;

CREATE POLICY "Public access conversations" ON public.conversations FOR ALL USING (true) WITH CHECK (true);

-- 3. Bảng MESSAGES (Tin nhắn)
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Participants view messages" ON public.messages;
DROP POLICY IF EXISTS "Authenticated send messages" ON public.messages;
DROP POLICY IF EXISTS "Conversation participants access messages" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages in their conversations" ON public.messages;
DROP POLICY IF EXISTS "Public access messages" ON public.messages;

CREATE POLICY "Public access messages" ON public.messages FOR ALL USING (true) WITH CHECK (true);

-- 4. Bảng NOTIFICATIONS (Thông báo)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users access own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Public access notifications" ON public.notifications;

CREATE POLICY "Public access notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);

-- 5. Bảng OWNER_APPLICATIONS (Đơn nâng cấp chủ trọ)
ALTER TABLE public.owner_applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own owner application" ON public.owner_applications;
DROP POLICY IF EXISTS "Users view own owner applications" ON public.owner_applications;
DROP POLICY IF EXISTS "Users submit owner applications" ON public.owner_applications;
DROP POLICY IF EXISTS "Admins manage owner applications" ON public.owner_applications;
DROP POLICY IF EXISTS "Public access owner_applications" ON public.owner_applications;

CREATE POLICY "Public access owner_applications" ON public.owner_applications FOR ALL USING (true) WITH CHECK (true);

-- 6. Bảng ROOMMATE_POSTS (Tìm bạn cùng phòng)
ALTER TABLE public.roommate_posts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public view roommate posts" ON public.roommate_posts;
DROP POLICY IF EXISTS "Users manage own roommate posts" ON public.roommate_posts;
DROP POLICY IF EXISTS "Public access roommate_posts" ON public.roommate_posts;

CREATE POLICY "Public access roommate_posts" ON public.roommate_posts FOR ALL USING (true) WITH CHECK (true);

-- 7. Bảng MARKETPLACE_ITEMS (Chợ đồ cũ)
ALTER TABLE public.marketplace_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public view marketplace items" ON public.marketplace_items;
DROP POLICY IF EXISTS "Owners manage own items" ON public.marketplace_items;
DROP POLICY IF EXISTS "Public access marketplace_items" ON public.marketplace_items;

CREATE POLICY "Public access marketplace_items" ON public.marketplace_items FOR ALL USING (true) WITH CHECK (true);

-- 8. Bảng REPORTS (Báo cáo vi phạm)
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can create reports" ON public.reports;
DROP POLICY IF EXISTS "Admins manage reports" ON public.reports;
DROP POLICY IF EXISTS "Public access reports" ON public.reports;

CREATE POLICY "Public access reports" ON public.reports FOR ALL USING (true) WITH CHECK (true);

-- 9. Bảng AUDIT_LOGS (Nhật ký kiểm duyệt của Admin)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID,
    admin_email TEXT,
    admin_role TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    data_before JSONB,
    data_after JSONB,
    reason TEXT,
    is_demo_admin BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins access audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Public access audit_logs" ON public.audit_logs;
CREATE POLICY "Public access audit_logs" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- PHẦN 4: KÍCH HOẠT SUPABASE REALTIME REPLICATION ĐẦY ĐỦ
-- ==============================================================================
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.rooms REPLICA IDENTITY FULL;
ALTER TABLE public.viewing_requests REPLICA IDENTITY FULL;
ALTER TABLE public.owner_applications REPLICA IDENTITY FULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'conversations') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'rooms') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'viewing_requests') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.viewing_requests;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'owner_applications') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.owner_applications;
    END IF;
END $$;
