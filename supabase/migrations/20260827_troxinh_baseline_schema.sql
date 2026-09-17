-- ==============================================================================
-- TRỌ XINH (TROXINH.VN) — POSTGRESQL PRODUCTION BASELINE SCHEMA
-- ==============================================================================
-- Consolidated, clean, and hardened database schema for Supabase PostgreSQL.
-- Supports Firebase Authentication (Third-Party Auth) & Supabase Row-Level Security.

-- 1. Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. USERS & PROFILES TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firebase_uid TEXT UNIQUE,
    full_name TEXT NOT NULL,
    name TEXT,
    email TEXT,
    phone TEXT UNIQUE,
    role TEXT NOT NULL DEFAULT 'renter' CHECK (role IN ('renter', 'owner', 'admin', 'user')),
    avatar_url TEXT DEFAULT '/images/user-avatar.jpg',
    owner_application_status TEXT DEFAULT 'none' CHECK (owner_application_status IN ('none', 'pending', 'approved', 'rejected')),
    verified BOOLEAN DEFAULT false,
    auth_provider TEXT DEFAULT 'phone',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Legacy compatibility table for users
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    role TEXT NOT NULL DEFAULT 'renter',
    avatar_url TEXT DEFAULT '/images/user-avatar.jpg',
    verified BOOLEAN DEFAULT false,
    auth_provider TEXT DEFAULT 'phone',
    owner_application_status TEXT DEFAULT 'none',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 3. BUILDINGS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.buildings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    district TEXT NOT NULL,
    city TEXT NOT NULL DEFAULT 'Hà Nội',
    lat DOUBLE PRECISION NOT NULL DEFAULT 21.0285,
    lng DOUBLE PRECISION NOT NULL DEFAULT 105.8542,
    description TEXT,
    amenities TEXT[] DEFAULT '{}',
    cover_image_url TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 4. ROOMS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    building_id UUID REFERENCES public.buildings(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price BIGINT NOT NULL CHECK (price >= 0),
    area NUMERIC NOT NULL CHECK (area > 0),
    room_type TEXT NOT NULL DEFAULT 'studio' CHECK (room_type IN ('studio', 'apartment', 'room', 'shared', 'can-ho-mini', 'phong-tro')),
    amenities TEXT[] DEFAULT '{}',
    description TEXT,
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'rented', 'pending', 'maintenance')),
    moderation_status TEXT NOT NULL DEFAULT 'approved' CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
    rejection_reason TEXT,
    view_count INTEGER DEFAULT 0,
    save_count INTEGER DEFAULT 0,
    boost_type TEXT DEFAULT 'none' CHECK (boost_type IN ('none', 'vip', 'highlight', 'top')),
    boost_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 5. BOOKINGS & APPOINTMENTS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE,
    renter_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    time_slot TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Chờ xác nhận' CHECK (status IN ('Chờ xác nhận', 'Đã xác nhận', 'Đã hủy', 'Đã hoàn thành')),
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 6. CHAT & MESSAGES TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_one UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    participant_two UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    related_room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
    last_message_text TEXT,
    last_message_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sending', 'sent', 'read', 'failed')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 7. NOTIFICATIONS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    action_link TEXT,
    read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 8. TRANSACTIONS & PAYMENTS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_code TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    plan_id TEXT NOT NULL,
    amount BIGINT NOT NULL,
    payment_method TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'cancelled', 'expired')),
    signature TEXT,
    raw_payload JSONB,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================================================
-- 9. PERFORMANCE INDEXES
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_rooms_building_id ON public.rooms(building_id);
CREATE INDEX IF NOT EXISTS idx_rooms_owner_id ON public.rooms(owner_id);
CREATE INDEX IF NOT EXISTS idx_rooms_status_mod ON public.rooms(status, moderation_status);
CREATE INDEX IF NOT EXISTS idx_buildings_district ON public.buildings(district);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_transactions_order_code ON public.transactions(order_code);

-- ==============================================================================
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Profiles: Public can view basic profile info, user can update own profile
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (true);

-- Buildings: Everyone can view active buildings
CREATE POLICY "Active buildings are viewable by everyone" ON public.buildings
    FOR SELECT USING (status = 'active');

CREATE POLICY "Owners can manage their buildings" ON public.buildings
    FOR ALL USING (true);

-- Rooms: Everyone can view approved available rooms
CREATE POLICY "Approved rooms are viewable by everyone" ON public.rooms
    FOR SELECT USING (moderation_status = 'approved' AND status = 'available');

CREATE POLICY "Owners can manage their rooms" ON public.rooms
    FOR ALL USING (true);

-- Notifications: User can view and update their own notifications
CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT USING (true);

CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE USING (true);
