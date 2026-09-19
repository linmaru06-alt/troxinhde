-- 010_unified_public_beta_schema.sql
-- Nâng cấp và thống nhất toàn diện Schema Database Trọ Xinh Public Beta
-- Hỗ trợ Firebase Third-Party Auth, Custom Claims và RLS đa phân quyền.

-- 1. BẬT TIỆN ÍCH EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. BẢNG PROFILES (THỐNG NHẤT BẢNG NGƯỜI DÙNG)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid TEXT UNIQUE,
  full_name TEXT NOT NULL DEFAULT 'Người Dùng Trọ Xinh',
  name TEXT, -- Alias đồng bộ ngược
  email TEXT,
  phone TEXT,
  avatar_url TEXT DEFAULT '/images/user-avatar.jpg',
  app_role TEXT NOT NULL DEFAULT 'renter' CHECK (app_role IN ('renter', 'owner', 'admin')),
  role TEXT DEFAULT 'renter',
  owner_application_status TEXT DEFAULT 'none' CHECK (owner_application_status IN ('none', 'pending', 'approved', 'rejected')),
  is_demo_account BOOLEAN DEFAULT false,
  school TEXT,
  year TEXT,
  bio TEXT,
  address TEXT,
  rating NUMERIC(3,2) DEFAULT 5.0,
  verified BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Đảm bảo có các cột cần thiết nếu bảng profiles đã tồn tại từ trước
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'firebase_uid') THEN
    ALTER TABLE public.profiles ADD COLUMN firebase_uid TEXT UNIQUE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'full_name') THEN
    ALTER TABLE public.profiles ADD COLUMN full_name TEXT NOT NULL DEFAULT 'Người Dùng Trọ Xinh';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'name') THEN
    ALTER TABLE public.profiles ADD COLUMN name TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'email') THEN
    ALTER TABLE public.profiles ADD COLUMN email TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'phone') THEN
    ALTER TABLE public.profiles ADD COLUMN phone TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'avatar_url') THEN
    ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT DEFAULT '/images/user-avatar.jpg';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'app_role') THEN
    ALTER TABLE public.profiles ADD COLUMN app_role TEXT NOT NULL DEFAULT 'renter';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role') THEN
    ALTER TABLE public.profiles ADD COLUMN role TEXT DEFAULT 'renter';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'is_demo_account') THEN
    ALTER TABLE public.profiles ADD COLUMN is_demo_account BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'owner_application_status') THEN
    ALTER TABLE public.profiles ADD COLUMN owner_application_status TEXT DEFAULT 'none';
  END IF;
END $$;

-- 3. HÀM POSTGRESQL HELPER CHO FIREBASE JWT & PHÂN QUYỀN RLS
CREATE OR REPLACE FUNCTION public.current_firebase_uid()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    auth.jwt() ->> 'sub',
    auth.jwt() ->> 'user_id'
  );
$$;

CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT id FROM public.profiles
  WHERE firebase_uid = public.current_firebase_uid()
     OR (email IS NOT NULL AND email = (auth.jwt() ->> 'email'))
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    auth.jwt() ->> 'app_role',
    (SELECT app_role FROM public.profiles WHERE id = public.current_profile_id() LIMIT 1),
    'guest'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT (
    public.current_app_role() = 'admin'
    OR (auth.jwt() ->> 'email' = 'admin@troxinh.vn')
    OR (auth.jwt() ->> 'sub' = 'demo_admin_troxinh')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT (
    public.current_app_role() = 'owner'
    OR public.is_admin()
    OR (auth.jwt() ->> 'sub' = 'demo_owner_troxinh')
  );
$$;

-- 4. BẢNG AUDIT LOGS (GHI LỊCH SỬ THAO TÁC QUẢN TRỊ VIÊN)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  admin_email TEXT,
  action TEXT NOT NULL,
  target_table TEXT NOT NULL,
  target_id TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. BẢNG TÒA NHÀ (BUILDINGS)
CREATE TABLE IF NOT EXISTS public.buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  district TEXT NOT NULL,
  city TEXT DEFAULT 'Hà Nội',
  total_rooms INTEGER DEFAULT 1,
  electricity_price NUMERIC DEFAULT 3500,
  water_price NUMERIC DEFAULT 100000,
  amenities JSONB DEFAULT '[]'::jsonb,
  images JSONB DEFAULT '[]'::jsonb,
  lat NUMERIC,
  lng NUMERIC,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Đảm bảo có các cột cần thiết nếu bảng buildings đã tồn tại từ trước
ALTER TABLE public.buildings ADD COLUMN IF NOT EXISTS total_rooms INTEGER DEFAULT 1;
ALTER TABLE public.buildings ADD COLUMN IF NOT EXISTS electricity_price NUMERIC DEFAULT 3500;
ALTER TABLE public.buildings ADD COLUMN IF NOT EXISTS water_price NUMERIC DEFAULT 100000;
ALTER TABLE public.buildings ADD COLUMN IF NOT EXISTS amenities JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.buildings ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.buildings ADD COLUMN IF NOT EXISTS lat NUMERIC;
ALTER TABLE public.buildings ADD COLUMN IF NOT EXISTS lng NUMERIC;
ALTER TABLE public.buildings ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.buildings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 6. BẢNG PHÒNG TRỌ (ROOMS)
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID REFERENCES public.buildings(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  name TEXT, -- Alias title
  room_number TEXT NOT NULL DEFAULT '101',
  price NUMERIC NOT NULL,
  deposit NUMERIC DEFAULT 0,
  electricity_price NUMERIC DEFAULT 3500,
  water_price NUMERIC DEFAULT 100000,
  area NUMERIC NOT NULL DEFAULT 20,
  room_type TEXT DEFAULT 'Phòng đơn',
  description TEXT,
  moderation_status TEXT DEFAULT 'approved' CHECK (moderation_status IN ('draft', 'pending', 'approved', 'rejected', 'hidden')),
  availability_status TEXT DEFAULT 'available' CHECK (availability_status IN ('available', 'reserved', 'rented')),
  status TEXT DEFAULT 'available',
  rejection_reason TEXT,
  amenities JSONB DEFAULT '[]'::jsonb,
  images JSONB DEFAULT '[]'::jsonb,
  is_boosted BOOLEAN DEFAULT false,
  boost_expires_at TIMESTAMPTZ,
  boost_badge TEXT,
  views_count INTEGER DEFAULT 0,
  saved_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Đảm bảo có các cột cần thiết nếu bảng rooms đã tồn tại từ trước (khắc phục lỗi CI thiếu availability_status)
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT '';
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS room_number TEXT NOT NULL DEFAULT '101';
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 0;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS deposit NUMERIC DEFAULT 0;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS electricity_price NUMERIC DEFAULT 3500;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS water_price NUMERIC DEFAULT 100000;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS area NUMERIC DEFAULT 20;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS room_type TEXT DEFAULT 'Phòng đơn';
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS moderation_status TEXT DEFAULT 'approved';
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS availability_status TEXT DEFAULT 'available';
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'available';
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS amenities JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS is_boosted BOOLEAN DEFAULT false;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS boost_expires_at TIMESTAMPTZ;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS boost_badge TEXT;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS saved_count INTEGER DEFAULT 0;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 7. BẢNG PHÒNG ĐÃ LƯU (SAVED_ROOMS)
CREATE TABLE IF NOT EXISTS public.saved_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, room_id)
);

-- 8. BẢNG YÊU CẦU ĐẶT LỊCH XEM PHÒNG (VIEWING_REQUESTS)
CREATE TABLE IF NOT EXISTS public.viewing_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  renter_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  requested_date DATE NOT NULL,
  time_slot TEXT NOT NULL,
  renter_phone TEXT NOT NULL,
  renter_name TEXT NOT NULL,
  note TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rescheduled', 'completed', 'cancelled', 'no_show')),
  owner_response_note TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Đảm bảo có các cột cần thiết nếu bảng viewing_requests đã tồn tại từ trước
ALTER TABLE public.viewing_requests ADD COLUMN IF NOT EXISTS time_slot TEXT DEFAULT '09:00 - 10:00';
ALTER TABLE public.viewing_requests ADD COLUMN IF NOT EXISTS renter_phone TEXT DEFAULT '';
ALTER TABLE public.viewing_requests ADD COLUMN IF NOT EXISTS renter_name TEXT DEFAULT '';
ALTER TABLE public.viewing_requests ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE public.viewing_requests ADD COLUMN IF NOT EXISTS owner_response_note TEXT;
ALTER TABLE public.viewing_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 9. BẢNG CUỘC TRÒ CHUYỆN & TIN NHẮN (CONVERSATIONS & MESSAGES)
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_1 UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  participant_2 UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. BẢNG THÔNG BÁO (NOTIFICATIONS)
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT DEFAULT 'system',
  cta_url TEXT,
  cta_label TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 11. BẢNG ĐÁNH GIÁ (REVIEWS)
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
  reviewer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  content TEXT,
  comment TEXT,
  cleanliness_rating INTEGER,
  owner_rating INTEGER,
  accuracy_rating INTEGER,
  location_rating INTEGER,
  rental_period TEXT,
  image_urls JSONB DEFAULT '[]'::jsonb,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Đảm bảo có các cột cần thiết nếu bảng reviews đã tồn tại từ trước (khắc phục lỗi thiếu reviewer_id / user_id)
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS reviewer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS comment TEXT;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS cleanliness_rating INTEGER;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS owner_rating INTEGER;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS accuracy_rating INTEGER;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS location_rating INTEGER;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS rental_period TEXT;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS image_urls JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS helpful_count INTEGER DEFAULT 0;

-- 12. BẢNG BÁO CÁO VI PHẠM (REPORTS)
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Đảm bảo có các cột cần thiết nếu bảng reports đã tồn tại từ trước
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- 13. BẢNG ĐƠN ĐĂNG KÝ CHỦ TRỌ (OWNER_APPLICATIONS)
CREATE TABLE IF NOT EXISTS public.owner_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  building_name TEXT NOT NULL,
  address TEXT NOT NULL,
  district TEXT NOT NULL,
  total_rooms INTEGER NOT NULL DEFAULT 1,
  cccd_number TEXT NOT NULL,
  cccd_image_url TEXT,
  legal_docs_note TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);

-- Đảm bảo có các cột cần thiết nếu bảng owner_applications đã tồn tại từ trước
ALTER TABLE public.owner_applications ADD COLUMN IF NOT EXISTS building_name TEXT DEFAULT '';
ALTER TABLE public.owner_applications ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '';
ALTER TABLE public.owner_applications ADD COLUMN IF NOT EXISTS total_rooms INTEGER DEFAULT 1;
ALTER TABLE public.owner_applications ADD COLUMN IF NOT EXISTS cccd_number TEXT DEFAULT '';
ALTER TABLE public.owner_applications ADD COLUMN IF NOT EXISTS legal_docs_note TEXT;
ALTER TABLE public.owner_applications ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
ALTER TABLE public.owner_applications ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- =================================================================
-- 14. THIẾT LẬP TOÀN BỘ ROW LEVEL SECURITY (RLS) POLICIES
-- =================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viewing_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_applications ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
DROP POLICY IF EXISTS "Profiles are readable by everyone" ON public.profiles;
CREATE POLICY "Profiles are readable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert or update their own profile" ON public.profiles;
CREATE POLICY "Users can insert or update their own profile"
  ON public.profiles FOR ALL
  USING (firebase_uid = public.current_firebase_uid() OR public.is_admin())
  WITH CHECK (firebase_uid = public.current_firebase_uid() OR public.is_admin());

-- Buildings Policies
DROP POLICY IF EXISTS "Active buildings are public" ON public.buildings;
CREATE POLICY "Active buildings are public"
  ON public.buildings FOR SELECT
  USING (status = 'active' OR owner_id = public.current_profile_id() OR public.is_admin());

DROP POLICY IF EXISTS "Owners manage own buildings" ON public.buildings;
CREATE POLICY "Owners manage own buildings"
  ON public.buildings FOR ALL
  USING (owner_id = public.current_profile_id() OR public.is_admin())
  WITH CHECK (owner_id = public.current_profile_id() OR public.is_admin());

-- Rooms Policies
DROP POLICY IF EXISTS "Approved rooms are public" ON public.rooms;
CREATE POLICY "Approved rooms are public"
  ON public.rooms FOR SELECT
  USING (
    (moderation_status = 'approved' AND availability_status != 'rented')
    OR owner_id = public.current_profile_id()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Owners manage own rooms" ON public.rooms;
CREATE POLICY "Owners manage own rooms"
  ON public.rooms FOR ALL
  USING (owner_id = public.current_profile_id() OR public.is_admin())
  WITH CHECK (owner_id = public.current_profile_id() OR public.is_admin());

-- Saved Rooms Policies
DROP POLICY IF EXISTS "Users manage own saved rooms" ON public.saved_rooms;
CREATE POLICY "Users manage own saved rooms"
  ON public.saved_rooms FOR ALL
  USING (user_id = public.current_profile_id() OR public.is_admin())
  WITH CHECK (user_id = public.current_profile_id() OR public.is_admin());

-- Viewing Requests Policies
DROP POLICY IF EXISTS "Users view their own viewing requests" ON public.viewing_requests;
CREATE POLICY "Users view their own viewing requests"
  ON public.viewing_requests FOR SELECT
  USING (
    renter_id = public.current_profile_id()
    OR owner_id = public.current_profile_id()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Renters can create viewing requests" ON public.viewing_requests;
CREATE POLICY "Renters can create viewing requests"
  ON public.viewing_requests FOR INSERT
  WITH CHECK (
    renter_id = public.current_profile_id()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Owners and Renters update viewing requests" ON public.viewing_requests;
CREATE POLICY "Owners and Renters update viewing requests"
  ON public.viewing_requests FOR UPDATE
  USING (
    renter_id = public.current_profile_id()
    OR owner_id = public.current_profile_id()
    OR public.is_admin()
  );

-- Conversations Policies
DROP POLICY IF EXISTS "Participants access conversations" ON public.conversations;
CREATE POLICY "Participants access conversations"
  ON public.conversations FOR ALL
  USING (
    participant_1 = public.current_profile_id()
    OR participant_2 = public.current_profile_id()
    OR public.is_admin()
  );

-- Messages Policies
DROP POLICY IF EXISTS "Conversation participants access messages" ON public.messages;
CREATE POLICY "Conversation participants access messages"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
        AND (conversations.participant_1 = public.current_profile_id() OR conversations.participant_2 = public.current_profile_id())
    )
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Users can send messages in their conversations" ON public.messages;
CREATE POLICY "Users can send messages in their conversations"
  ON public.messages FOR INSERT
  WITH CHECK (
    sender_id = public.current_profile_id()
    OR public.is_admin()
  );

-- Notifications Policies
DROP POLICY IF EXISTS "Users access own notifications" ON public.notifications;
CREATE POLICY "Users access own notifications"
  ON public.notifications FOR ALL
  USING (user_id = public.current_profile_id() OR public.is_admin())
  WITH CHECK (user_id = public.current_profile_id() OR public.is_admin());

-- Reviews Policies
DROP POLICY IF EXISTS "Reviews are public" ON public.reviews;
CREATE POLICY "Reviews are public"
  ON public.reviews FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users create reviews for visited rooms" ON public.reviews;
CREATE POLICY "Users create reviews for visited rooms"
  ON public.reviews FOR INSERT
  WITH CHECK (
    reviewer_id = public.current_profile_id()
    OR user_id = public.current_profile_id()
    OR public.is_admin()
  );

-- Reports Policies
DROP POLICY IF EXISTS "Users can create reports" ON public.reports;
CREATE POLICY "Users can create reports"
  ON public.reports FOR INSERT
  WITH CHECK (
    reporter_id = public.current_profile_id()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Admins manage reports" ON public.reports;
CREATE POLICY "Admins manage reports"
  ON public.reports FOR ALL
  USING (public.is_admin());

-- Owner Applications Policies
DROP POLICY IF EXISTS "Users view own owner applications" ON public.owner_applications;
CREATE POLICY "Users view own owner applications"
  ON public.owner_applications FOR SELECT
  USING (user_id = public.current_profile_id() OR public.is_admin());

DROP POLICY IF EXISTS "Users submit owner applications" ON public.owner_applications;
CREATE POLICY "Users submit owner applications"
  ON public.owner_applications FOR INSERT
  WITH CHECK (user_id = public.current_profile_id() OR public.is_admin());

DROP POLICY IF EXISTS "Admins manage owner applications" ON public.owner_applications;
CREATE POLICY "Admins manage owner applications"
  ON public.owner_applications FOR ALL
  USING (public.is_admin());

-- Audit Logs Policies (Chỉ Admin mới có quyền xem và ghi log)
DROP POLICY IF EXISTS "Admins access audit logs" ON public.audit_logs;
CREATE POLICY "Admins access audit logs"
  ON public.audit_logs FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- =================================================================
-- 15. SEED DỮ LIỆU BAN ĐẦU CHO 3 TÀI KHOẢN DEMO
-- =================================================================
INSERT INTO public.profiles (
  id,
  firebase_uid,
  full_name,
  email,
  phone,
  app_role,
  role,
  is_demo_account,
  owner_application_status,
  avatar_url
) VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'demo_admin_troxinh',
    'Ban Quản Trị Trọ Xinh',
    'admin@troxinh.vn',
    '0999000001',
    'admin',
    'admin',
    true,
    'approved',
    '/images/user-avatar.jpg'
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'demo_owner_troxinh',
    'Trần Quốc Tuấn (Chủ Trọ)',
    'chutro@troxinh.vn',
    '0999000002',
    'owner',
    'owner',
    true,
    'approved',
    '/images/user-avatar.jpg'
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    'demo_renter_troxinh',
    'Nguyễn Văn An (Người Thuê)',
    'nguoithue@troxinh.vn',
    '0999000003',
    'renter',
    'renter',
    true,
    'none',
    '/images/user-avatar.jpg'
  )
ON CONFLICT (id) DO UPDATE
SET
  firebase_uid = EXCLUDED.firebase_uid,
  app_role = EXCLUDED.app_role,
  role = EXCLUDED.role,
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  is_demo_account = true,
  owner_application_status = EXCLUDED.owner_application_status,
  avatar_url = EXCLUDED.avatar_url;

