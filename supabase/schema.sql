-- ==============================================================================
-- DATABASE SCHEMA CHO NỀN TẢNG TRỌ XINH (TROXINH.VN) - SUPABASE POSTGRESQL
-- ==============================================================================

-- 1. BẢNG NGƯỜI DÙNG (USERS)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('guest', 'user', 'owner', 'admin', 'renter')),
  avatar_url TEXT DEFAULT '/images/user-avatar.jpg',
  email VARCHAR(255),
  school VARCHAR(255),
  year VARCHAR(50),
  bio TEXT,
  address TEXT,
  rating NUMERIC(2,1) DEFAULT 5.0,
  verified BOOLEAN DEFAULT false,
  owner_application_status VARCHAR(50) DEFAULT 'none' CHECK (owner_application_status IN ('none', 'pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. BẢNG TÒA NHÀ (BUILDINGS)
CREATE TABLE IF NOT EXISTS public.buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  owner_name VARCHAR(255),
  owner_phone VARCHAR(20),
  owner_avatar TEXT,
  name VARCHAR(255) NOT NULL,
  address TEXT NOT NULL,
  district VARCHAR(100) NOT NULL,
  city VARCHAR(100) DEFAULT 'Hà Nội',
  lat NUMERIC(10, 7),
  lng NUMERIC(10, 7),
  total_rooms INT DEFAULT 1,
  available_rooms INT DEFAULT 1,
  electricity_price NUMERIC(10, 2) DEFAULT 3500,
  water_price NUMERIC(10, 2) DEFAULT 30000,
  internet_price NUMERIC(10, 2) DEFAULT 100000,
  cleaning_price NUMERIC(10, 2) DEFAULT 50000,
  rules TEXT[],
  cover_image TEXT,
  images TEXT[],
  rating NUMERIC(2,1) DEFAULT 5.0,
  verified BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. BẢNG PHÒNG TRỌ (ROOMS)
CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id UUID REFERENCES public.buildings(id) ON DELETE CASCADE,
  building_name VARCHAR(255),
  owner_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  owner_name VARCHAR(255),
  owner_phone VARCHAR(20),
  owner_avatar TEXT,
  title VARCHAR(255) NOT NULL,
  room_number VARCHAR(50),
  price NUMERIC(12, 2) NOT NULL,
  deposit NUMERIC(12, 2) DEFAULT 0,
  electricity_price NUMERIC(10, 2) DEFAULT 3500,
  water_price NUMERIC(10, 2) DEFAULT 30000,
  area NUMERIC(6, 2) NOT NULL,
  type VARCHAR(50) DEFAULT 'Phòng đơn' CHECK (type IN ('Phòng đơn', 'Studio', 'Phòng ghép', 'Căn hộ mini')),
  status VARCHAR(50) DEFAULT 'Còn trống' CHECK (status IN ('Còn trống', 'Đã cho thuê', 'Chờ duyệt', 'Bị từ chối')),
  verified BOOLEAN DEFAULT false,
  rejection_reason TEXT,
  amenities TEXT[],
  images TEXT[],
  distance_to_school_km NUMERIC(4, 2) DEFAULT 1.0,
  nearest_school VARCHAR(255),
  address TEXT NOT NULL,
  district VARCHAR(100) NOT NULL,
  description TEXT,
  views INT DEFAULT 0,
  saved_count INT DEFAULT 0,
  is_boosted BOOLEAN DEFAULT false,
  boost_expires_at TIMESTAMPTZ,
  boost_badge VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. BẢNG Ở GHÉP (ROOMMATE_POSTS)
CREATE TABLE IF NOT EXISTS public.roommate_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  user_name VARCHAR(255) NOT NULL,
  user_avatar TEXT,
  user_phone VARCHAR(20),
  gender VARCHAR(20) CHECK (gender IN ('Nam', 'Nữ', 'Tất cả')),
  target_gender VARCHAR(20) CHECK (target_gender IN ('Nam', 'Nữ', 'Tất cả')),
  school VARCHAR(255),
  district VARCHAR(100),
  location TEXT,
  budget NUMERIC(12, 2) NOT NULL,
  habits TEXT[],
  bio TEXT,
  images TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. BẢNG CHỢ ĐỒ CŨ SINH VIÊN (MARKETPLACE_ITEMS)
CREATE TABLE IF NOT EXISTS public.marketplace_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  user_name VARCHAR(255) NOT NULL,
  user_avatar TEXT,
  user_phone VARCHAR(20),
  name VARCHAR(255) NOT NULL,
  pricing_type VARCHAR(20) DEFAULT 'Giá rẻ' CHECK (pricing_type IN ('Giá rẻ', 'Miễn phí')),
  price NUMERIC(12, 2) DEFAULT 0,
  category VARCHAR(50) CHECK (category IN ('Nội thất', 'Đồ điện tử', 'Sách vở', 'Đồ gia dụng')),
  condition VARCHAR(50) DEFAULT 'Còn dùng tốt',
  images TEXT[],
  location TEXT,
  district VARCHAR(100),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. BẢNG TIN NHẮN (THREADS & MESSAGES)
CREATE TABLE IF NOT EXISTS public.threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participants JSONB NOT NULL,
  related_room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  related_room_title VARCHAR(255),
  last_message TEXT,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID REFERENCES public.threads(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  sender_name VARCHAR(255),
  sender_avatar TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. BẢNG THÔNG BÁO (NOTIFICATIONS)
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. BẢNG GIAO DỊCH & THANH TOÁN (TRANSACTIONS)
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  order_code VARCHAR(50) UNIQUE NOT NULL,
  plan_id VARCHAR(50),
  room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  amount NUMERIC(12, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'expired')),
  payment_method VARCHAR(50) DEFAULT 'vietqr',
  payos_payment_link_id TEXT,
  activated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. BẢNG GÓI THUÊ BAO CHỦ TRỌ (USER_SUBSCRIPTIONS)
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  plan_id VARCHAR(50) NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. BẢNG ĐẨY TIN PHÒNG TRỌ (ROOM_BOOSTS)
CREATE TABLE IF NOT EXISTS public.room_boosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
  boost_type VARCHAR(50) DEFAULT 'featured',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. KÍCH HOẠT REALTIME CHO SUPABASE
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;

-- 12. HIGH-PERFORMANCE DATABASE INDEXES
CREATE INDEX IF NOT EXISTS idx_rooms_district ON public.rooms(district);
CREATE INDEX IF NOT EXISTS idx_rooms_price ON public.rooms(price);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON public.rooms(status);
CREATE INDEX IF NOT EXISTS idx_rooms_verified ON public.rooms(verified);
CREATE INDEX IF NOT EXISTS idx_rooms_nearest_school ON public.rooms(nearest_school);
CREATE INDEX IF NOT EXISTS idx_rooms_created_at ON public.rooms(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_buildings_owner_id ON public.buildings(owner_id);
CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON public.messages(thread_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id, created_at DESC);


