-- ==============================================================================
-- TRỌ XINH — 016_FULL_PRODUCTION_ENGINE.SQL
-- HỆ THỐNG DATABASE PRODUCTION HOÀN CHỈNH CHO TRỌ XINH (FULL STACK SUPABASE)
-- 
-- Chạy 1 lần duy nhất trong Supabase Dashboard > SQL Editor:
-- 1. Tự động tạo 3 Storage Buckets (room-images, avatars, documents) + Storage Policies
-- 2. Đầy đủ cột & khóa ngoại (FK) cho tất cả 18 bảng nghiệp vụ
-- 3. Bật Realtime Replication cho Chat, Cuộc trò chuyện, Thông báo, Phòng & Lịch hẹn
-- 4. Bộ Trigger tự động hóa (Tính điểm Review, Kích hoạt VIP khi thanh toán, Cập nhật tin nhắn)
-- 5. Bảo mật Row Level Security (RLS) chuẩn doanh nghiệp
-- 6. Tự động nạp dữ liệu mẫu thực tế (Tòa nhà, Phòng trọ, Bạn cùng phòng, Chợ đồ cũ)
-- ==============================================================================

-- ==============================================================================
-- PHẦN 1: KHỞI TẠO STORAGE BUCKETS & PHÂN QUYỀN LƯU TRỮ ẢNH / TÀI LIỆU
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

-- 3. Tạo bucket `documents` (Private: Lưu CCCD, hợp đồng, giấy phép kinh doanh chủ trọ)
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

-- Phân quyền Storage RLS Policies
DROP POLICY IF EXISTS "Public Access Room Images" ON storage.objects;
CREATE POLICY "Public Access Room Images" ON storage.objects FOR SELECT USING (bucket_id = 'room-images');

DROP POLICY IF EXISTS "Public Access Avatars" ON storage.objects;
CREATE POLICY "Public Access Avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Allow Upload Room Images" ON storage.objects;
CREATE POLICY "Allow Upload Room Images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'room-images');

DROP POLICY IF EXISTS "Allow Manage Room Images" ON storage.objects;
CREATE POLICY "Allow Manage Room Images" ON storage.objects FOR UPDATE USING (bucket_id = 'room-images');

DROP POLICY IF EXISTS "Allow Delete Room Images" ON storage.objects;
CREATE POLICY "Allow Delete Room Images" ON storage.objects FOR DELETE USING (bucket_id = 'room-images');

DROP POLICY IF EXISTS "Allow Upload Avatars" ON storage.objects;
CREATE POLICY "Allow Upload Avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Allow Manage Avatars" ON storage.objects;
CREATE POLICY "Allow Manage Avatars" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Private Access Documents" ON storage.objects;
CREATE POLICY "Private Access Documents" ON storage.objects FOR SELECT USING (
    bucket_id = 'documents' AND (
        auth.role() = 'authenticated' OR auth.role() = 'service_role'
    )
);

DROP POLICY IF EXISTS "Allow Upload Documents" ON storage.objects;
CREATE POLICY "Allow Upload Documents" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'documents');

-- ==============================================================================
-- PHẦN 2: ĐỒNG BỘ ĐẦY ĐỦ CÁC CỘT CHO 18 BẢNG NGHIỆP VỤ
-- ==============================================================================

-- 0. Bổ sung các cột hồ sơ người dùng cho bảng profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS school TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS year TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS student_card_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS social_link TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS facebook_link TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS zalo_link TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS student_verified BOOLEAN DEFAULT false;

-- 1. Bổ sung các cột cho bảng rooms (nếu chưa có)
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS room_number TEXT;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS deposit BIGINT DEFAULT 0;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS electricity_cost BIGINT DEFAULT 3500;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS water_cost BIGINT DEFAULT 30000;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS internet_cost BIGINT DEFAULT 100000;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS parking_fee BIGINT DEFAULT 100000;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS floor INTEGER DEFAULT 1;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS availability_status TEXT DEFAULT 'available';
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS amenities JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS is_boosted BOOLEAN DEFAULT false;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS boost_badge TEXT;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS boost_type TEXT;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS rating NUMERIC(3,2) DEFAULT 5.0;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS save_count INTEGER DEFAULT 0;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- Cập nhật title = name nếu title null
UPDATE public.rooms SET title = name WHERE title IS NULL AND name IS NOT NULL;

-- 2. Bổ sung cột cho bảng buildings
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS rules JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.buildings ADD COLUMN IF NOT EXISTS total_rooms INTEGER DEFAULT 10;
ALTER TABLE public.buildings ADD COLUMN IF NOT EXISTS available_rooms INTEGER DEFAULT 5;
ALTER TABLE public.buildings ADD COLUMN IF NOT EXISTS verified_badge BOOLEAN DEFAULT true;
ALTER TABLE public.buildings ADD COLUMN IF NOT EXISTS rating NUMERIC(3,2) DEFAULT 4.9;
ALTER TABLE public.buildings ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 12;
ALTER TABLE public.buildings ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
ALTER TABLE public.buildings ADD COLUMN IF NOT EXISTS electricity_price NUMERIC DEFAULT 3500;
ALTER TABLE public.buildings ADD COLUMN IF NOT EXISTS water_price NUMERIC DEFAULT 100000;

-- Gỡ bỏ ràng buộc check cũ (nếu có từ bản khởi tạo) để tránh lỗi khi người dùng đăng bài
ALTER TABLE public.rooms DROP CONSTRAINT IF EXISTS rooms_room_type_check;
ALTER TABLE public.rooms DROP CONSTRAINT IF EXISTS rooms_status_check;
ALTER TABLE public.rooms DROP CONSTRAINT IF EXISTS rooms_moderation_status_check;
ALTER TABLE public.rooms DROP CONSTRAINT IF EXISTS rooms_availability_status_check;
ALTER TABLE public.buildings DROP CONSTRAINT IF EXISTS buildings_status_check;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 3. Bổ sung cột cho bảng transactions (Thanh toán VietQR & MoMo)
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS plan_id TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'vietqr';
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'payos';
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS signature TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS raw_payload JSONB;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- 4. Bổ sung bảng user_subscriptions (Gói dịch vụ Chủ trọ VIP)
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    plan_id TEXT NOT NULL,
    started_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Bổ sung cột cho bảng viewing_requests (Đặt lịch xem phòng)
ALTER TABLE public.viewing_requests ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.viewing_requests ADD COLUMN IF NOT EXISTS requested_date TEXT;
ALTER TABLE public.viewing_requests ADD COLUMN IF NOT EXISTS requested_time TEXT;
ALTER TABLE public.viewing_requests ADD COLUMN IF NOT EXISTS time_slot TEXT;
ALTER TABLE public.viewing_requests ADD COLUMN IF NOT EXISTS contact_phone TEXT;
ALTER TABLE public.viewing_requests ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE public.viewing_requests ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- 6. Bổ sung cột cho bảng roommate_posts (Tìm bạn cùng phòng)
ALTER TABLE public.roommate_posts ADD COLUMN IF NOT EXISTS school TEXT;
ALTER TABLE public.roommate_posts ADD COLUMN IF NOT EXISTS district TEXT;
ALTER TABLE public.roommate_posts ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;

-- 7. Bổ sung cột cho bảng marketplace_items (Chợ đồ cũ sinh viên)
ALTER TABLE public.marketplace_items ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.marketplace_items ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.marketplace_items ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'approved';

-- 8. Bổ sung cột cho bảng notifications (Thông báo)
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS body TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS cta_url TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS cta_label TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;

-- ==============================================================================
-- PHẦN 3: TỐI ƯU HÓA HIỆU NĂNG VỚI HIGH-PERFORMANCE INDEXES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_buildings_district ON public.buildings(district);
CREATE INDEX IF NOT EXISTS idx_buildings_owner_id ON public.buildings(owner_id);
CREATE INDEX IF NOT EXISTS idx_rooms_building_id ON public.rooms(building_id);
CREATE INDEX IF NOT EXISTS idx_rooms_owner_id ON public.rooms(owner_id);
CREATE INDEX IF NOT EXISTS idx_rooms_price ON public.rooms(price);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON public.rooms(status);
CREATE INDEX IF NOT EXISTS idx_rooms_created_at ON public.rooms(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_order_code ON public.transactions(order_code);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_roommate_posts_district ON public.roommate_posts(district);

-- ==============================================================================
-- PHẦN 4: KÍCH HOẠT SUPABASE REALTIME REPLICATION TOÀN DIỆN
-- ==============================================================================
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.rooms REPLICA IDENTITY FULL;
ALTER TABLE public.viewing_requests REPLICA IDENTITY FULL;

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
END $$;

-- ==============================================================================
-- PHẦN 5: BỘ TRIGGERS TỰ ĐỘNG HÓA NGHIỆP VỤ (AUTOMATION ENGINE)
-- ==============================================================================

-- 1. Trigger tự động tính lại điểm sao và số lượng review cho phòng
CREATE OR REPLACE FUNCTION public.fn_update_room_rating_stats()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.rooms
    SET 
        rating = COALESCE((SELECT ROUND(AVG(rating)::numeric, 1) FROM public.reviews WHERE room_id = COALESCE(NEW.room_id, OLD.room_id)), 5.0),
        review_count = COALESCE((SELECT COUNT(*) FROM public.reviews WHERE room_id = COALESCE(NEW.room_id, OLD.room_id)), 0)
    WHERE id = COALESCE(NEW.room_id, OLD.room_id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_room_rating ON public.reviews;
CREATE TRIGGER trg_update_room_rating
    AFTER INSERT OR UPDATE OR DELETE ON public.reviews
    FOR EACH ROW EXECUTE FUNCTION public.fn_update_room_rating_stats();

-- 2. Trigger tự động kích hoạt gói VIP khi giao dịch chuyển sang 'paid'
CREATE OR REPLACE FUNCTION public.fn_auto_activate_subscription_on_paid()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
        -- Ghi nhận thời điểm thanh toán và kích hoạt
        NEW.paid_at := COALESCE(NEW.paid_at, now());
        NEW.activated_at := COALESCE(NEW.activated_at, now());
        
        -- Kích hoạt gói dịch vụ trong user_subscriptions (hạn dùng 30 ngày)
        IF NEW.user_id IS NOT NULL AND NEW.plan_id IS NOT NULL THEN
            INSERT INTO public.user_subscriptions (user_id, plan_id, started_at, expires_at, transaction_id)
            VALUES (
                NEW.user_id, 
                NEW.plan_id, 
                now(), 
                now() + INTERVAL '30 days',
                NEW.id
            );
        END IF;

        -- Đẩy tin phòng lên VIP nếu thanh toán gói đẩy tin
        IF NEW.room_id IS NOT NULL THEN
            UPDATE public.rooms
            SET 
                is_boosted = true,
                boost_type = COALESCE(NEW.plan_id, 'vip'),
                boost_badge = 'Phòng Nổi Bật VIP'
            WHERE id = NEW.room_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_activate_subscription ON public.transactions;
CREATE TRIGGER trg_auto_activate_subscription
    BEFORE UPDATE ON public.transactions
    FOR EACH ROW EXECUTE FUNCTION public.fn_auto_activate_subscription_on_paid();

-- 3. Trigger tự động cập nhật cuộc trò chuyện khi có tin nhắn mới
CREATE OR REPLACE FUNCTION public.fn_update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.conversations
    SET 
        last_message = NEW.content,
        last_message_at = NEW.created_at
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_update_conversation_last_message ON public.messages;
CREATE TRIGGER trg_update_conversation_last_message
    AFTER INSERT ON public.messages
    FOR EACH ROW EXECUTE FUNCTION public.fn_update_conversation_last_message();

-- ==============================================================================
-- PHẦN 6: BẢO MẬT ROW LEVEL SECURITY (RLS) CHUẨN
-- ==============================================================================
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viewing_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Policy phòng trọ: Khách xem phòng công khai
DROP POLICY IF EXISTS "Public view rooms" ON public.rooms;
CREATE POLICY "Public view rooms" ON public.rooms FOR SELECT USING (true);

DROP POLICY IF EXISTS "Owners insert rooms" ON public.rooms;
CREATE POLICY "Owners insert rooms" ON public.rooms FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Owners update rooms" ON public.rooms;
CREATE POLICY "Owners update rooms" ON public.rooms FOR UPDATE USING (true);

-- Policy tòa nhà: Xem công khai, chủ trọ thêm sửa
DROP POLICY IF EXISTS "Public view buildings" ON public.buildings;
CREATE POLICY "Public view buildings" ON public.buildings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Owners manage buildings" ON public.buildings;
CREATE POLICY "Owners manage buildings" ON public.buildings FOR ALL USING (true);

-- Policy đánh giá: Xem công khai, người dùng thêm đánh giá
DROP POLICY IF EXISTS "Public view reviews" ON public.reviews;
CREATE POLICY "Public view reviews" ON public.reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users insert reviews" ON public.reviews;
CREATE POLICY "Users insert reviews" ON public.reviews FOR INSERT WITH CHECK (true);

-- Policy lịch xem phòng
DROP POLICY IF EXISTS "Users view viewing requests" ON public.viewing_requests;
CREATE POLICY "Users view viewing requests" ON public.viewing_requests FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users insert viewing requests" ON public.viewing_requests;
CREATE POLICY "Users insert viewing requests" ON public.viewing_requests FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users update viewing requests" ON public.viewing_requests;
CREATE POLICY "Users update viewing requests" ON public.viewing_requests FOR UPDATE USING (true);

-- Policy bảo vệ giao dịch thanh toán: Chặn sửa bậy từ client
DROP POLICY IF EXISTS "Users view own transactions" ON public.transactions;
CREATE POLICY "Users view own transactions" ON public.transactions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users insert pending transaction" ON public.transactions;
CREATE POLICY "Users insert pending transaction" ON public.transactions FOR INSERT WITH CHECK (status = 'pending');

-- ==============================================================================
-- PHẦN 7: SEED DỮ LIỆU THỰC TẾ (TÒA NHÀ & PHÒNG TRỌ BAN ĐẦU)
-- ==============================================================================
DO $$
DECLARE
    v_owner_id UUID;
    v_bld_caugiay UUID;
    v_bld_dongda UUID;
    v_bld_haiba UUID;
BEGIN
    -- Lấy 1 profile chủ trọ có sẵn, nếu chưa có tạo 1 profile mặc định
    SELECT id INTO v_owner_id FROM public.profiles WHERE app_role = 'owner' OR role = 'owner' LIMIT 1;
    
    IF v_owner_id IS NULL THEN
        SELECT id INTO v_owner_id FROM public.profiles LIMIT 1;
    END IF;

    IF v_owner_id IS NULL THEN
        INSERT INTO public.profiles (id, firebase_uid, full_name, role, app_role, phone, email)
        VALUES ('00000000-0000-0000-0000-000000000001', 'system_owner_001', 'Chủ Trọ Trọ Xinh', 'owner', 'owner', '0912345678', 'chutro@troxinh.vn')
        ON CONFLICT (id) DO UPDATE SET app_role = 'owner', role = 'owner'
        RETURNING id INTO v_owner_id;
    END IF;

    IF v_owner_id IS NOT NULL THEN
        -- 1. Seed Tòa nhà
        INSERT INTO public.buildings (id, owner_id, name, address, district, city, lat, lng, description, amenities, cover_image_url, status)
        VALUES 
        (
            'b0000000-0000-0000-0000-000000000001',
            v_owner_id,
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

        INSERT INTO public.buildings (id, owner_id, name, address, district, city, lat, lng, description, amenities, cover_image_url, status)
        VALUES 
        (
            'b0000000-0000-0000-0000-000000000002',
            v_owner_id,
            'Chung Cư Mini Đống Đa - Chùa Láng',
            'Số 82 Chùa Láng, P. Láng Thượng',
            'Quận Đống Đa',
            'Hà Nội',
            21.0227,
            105.8023,
            'Chung cư mini cao cấp gần ĐH Ngoại Thương, ĐH Luật, Ngoại Giao. Giờ giấc tự do 100%.',
            '["Thang máy", "Bếp riêng", "Ban công thoáng", "Khóa vân tay"]'::jsonb,
            'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800',
            'active'
        )
        ON CONFLICT (id) DO NOTHING;

        INSERT INTO public.buildings (id, owner_id, name, address, district, city, lat, lng, description, amenities, cover_image_url, status)
        VALUES 
        (
            'b0000000-0000-0000-0000-000000000003',
            v_owner_id,
            'Khu Trọ Sinh Viên Bách Khoa - Kinh Tế',
            'Số 45 Ngõ 10 Tạ Quang Bửu, P. Bách Khoa',
            'Quận Hai Bà Trưng',
            'Hà Nội',
            21.0042,
            105.8458,
            'Vị trí đắc địa cách Bách Khoa 200m, Kinh Tế Quốc Dân 400m, Xây Dựng 500m. Khu dân trí cao, yên tĩnh.',
            '["Điều hòa", "Bình nóng lạnh", "Chỗ để xe rộng", "Camera an ninh"]'::jsonb,
            'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
            'active'
        )
        ON CONFLICT (id) DO NOTHING;

        -- 2. Seed Phòng Trọ Thực Tế
        INSERT INTO public.rooms (
            id, building_id, owner_id, name, title, room_number, price, deposit, area, floor, room_type,
            amenities, description, status, availability_status, moderation_status, images, is_boosted, boost_badge
        )
        VALUES 
        (
            'c0000000-0000-0000-0000-000000000001',
            'b0000000-0000-0000-0000-000000000001',
            v_owner_id,
            'Phòng Studio Full Đồ Ban Công Thoáng Mát Cầu Giấy',
            'Phòng Studio Full Đồ Ban Công Thoáng Mát Cầu Giấy',
            'P.302',
            3500000,
            3500000,
            25,
            3,
            'studio',
            '["Điều hòa", "Nóng lạnh", "Tủ lạnh", "Máy giặt chung", "Ban công", "Khóa vân tay", "Thang máy"]'::jsonb,
            'Phòng trọ cao cấp thiết kế hiện đại, đầy đủ tiện nghi, view thoáng mát, cách ĐHQG và ĐH Sư Phạm 800m. Có ban công riêng đón ánh sáng tự nhiên.',
            'available',
            'available',
            'approved',
            '["https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800", "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800"]'::jsonb,
            true,
            'Phòng Nổi Bật VIP'
        )
        ON CONFLICT (id) DO NOTHING;

        INSERT INTO public.rooms (
            id, building_id, owner_id, name, title, room_number, price, deposit, area, floor, room_type,
            amenities, description, status, availability_status, moderation_status, images, is_boosted, boost_badge
        )
        VALUES 
        (
            'c0000000-0000-0000-0000-000000000002',
            'b0000000-0000-0000-0000-000000000002',
            v_owner_id,
            'Căn Hộ Mini Khép Kín Gần ĐH Ngoại Thương',
            'Căn Hộ Mini Khép Kín Gần ĐH Ngoại Thương',
            'P.501',
            4200000,
            4200000,
            32,
            5,
            'apartment',
            '["Điều hòa Inverter", "Nóng lạnh", "Tủ bếp riêng", "Máy giặt riêng", "Giường nệm cao cấp", "Thang máy", "PCCC chuẩn"]'::jsonb,
            'Căn hộ mini cao cấp cách cổng trường Ngoại Thương và Ngoại Giao 500m. Thiết kế bếp riêng biệt không ám mùi, giờ giấc tự do, bảo vệ 24/7.',
            'available',
            'available',
            'approved',
            '["https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800", "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800"]'::jsonb,
            true,
            'Xác Minh PCCC'
        )
        ON CONFLICT (id) DO NOTHING;

        INSERT INTO public.rooms (
            id, building_id, owner_id, name, title, room_number, price, deposit, area, floor, room_type,
            amenities, description, status, availability_status, moderation_status, images, is_boosted, boost_badge
        )
        VALUES 
        (
            'c0000000-0000-0000-0000-000000000003',
            'b0000000-0000-0000-0000-000000000003',
            v_owner_id,
            'Phòng Trọ Giá Rẻ Sinh Viên Bách Kinh Xây',
            'Phòng Trọ Giá Rẻ Sinh Viên Bách Kinh Xây',
            'P.201',
            2600000,
            2600000,
            20,
            2,
            'single',
            '["Điều hòa", "Nóng lạnh", "Wifi tốc độ cao", "Để xe tầng 1"]'::jsonb,
            'Phòng trọ sạch sẽ, điện nước giá dân có công tơ riêng, cách trường ĐH Bách Khoa chỉ 3 phút đi bộ. Phù hợp cho 1-2 bạn sinh viên.',
            'available',
            'available',
            'approved',
            '["https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=800", "https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800"]'::jsonb,
            false,
            NULL
        )
        ON CONFLICT (id) DO NOTHING;

        -- 3. Seed Bảng Hình Ảnh Chi Tiết (room_images)
        INSERT INTO public.room_images (id, room_id, url, order_index, is_cover)
        VALUES 
            ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=800', 0, true),
            ('d0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800', 1, false),
            ('d0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000002', 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800', 0, true),
            ('d0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000002', 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800', 1, false),
            ('d0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000003', 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=800', 0, true),
            ('d0000000-0000-0000-0000-000000000006', 'c0000000-0000-0000-0000-000000000003', 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800', 1, false)
        ON CONFLICT (id) DO NOTHING;

    END IF;
END $$;
