-- ==============================================================================
-- 015_pending_sync_all.sql
-- FILE HỢP NHẤT TOÀN BỘ CÁC BỔ SUNG CẦN ĐƯA LÊN SUPABASE CLOUD CHO TRỌ XINH
-- Bao gồm:
-- 1. Migration 009: High-Performance Indexes
-- 2. Migration 013: Payment Security, Transactions Columns & RLS
-- 3. Migration 014: Storage Buckets (room-images, avatars, documents) & Realtime
-- ==============================================================================

-- ==============================================================================
-- PHẦN 1: CHỈ MỤC HIỆU NĂNG CAO (MIGRATION 009)
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_buildings_district ON public.buildings(district);
CREATE INDEX IF NOT EXISTS idx_buildings_owner_id ON public.buildings(owner_id);
CREATE INDEX IF NOT EXISTS idx_rooms_building_id ON public.rooms(building_id);
CREATE INDEX IF NOT EXISTS idx_rooms_owner_id ON public.rooms(owner_id);
CREATE INDEX IF NOT EXISTS idx_rooms_price ON public.rooms(price);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON public.rooms(status);
CREATE INDEX IF NOT EXISTS idx_rooms_moderation_status ON public.rooms(moderation_status);
CREATE INDEX IF NOT EXISTS idx_rooms_created_at ON public.rooms(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id, created_at ASC);

ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id, created_at DESC);

-- ==============================================================================
-- PHẦN 2: BẢO MẬT THANH TOÁN & RLS TRANSACTIONS (MIGRATION 013)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_code TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    plan_id TEXT,
    room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
    amount BIGINT NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'vietqr',
    provider TEXT NOT NULL DEFAULT 'payos',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'success', 'failed', 'cancelled', 'expired')),
    signature TEXT,
    raw_payload JSONB,
    paid_at TIMESTAMPTZ,
    activated_at TIMESTAMPTZ,
    idempotency_key TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Bổ sung an toàn các cột nếu bảng transactions đã tồn tại
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

CREATE TABLE IF NOT EXISTS public.user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    plan_id TEXT NOT NULL,
    started_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS plan_id TEXT;
ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());
ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_order_code ON public.transactions(order_code);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_expires_at ON public.user_subscriptions(expires_at);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own transactions" ON public.transactions;
CREATE POLICY "Users view own transactions"
    ON public.transactions FOR SELECT
    USING (
        user_id = public.current_profile_id()
        OR public.is_admin()
        OR user_id IS NULL
    );

DROP POLICY IF EXISTS "Users insert pending transaction" ON public.transactions;
CREATE POLICY "Users insert pending transaction"
    ON public.transactions FOR INSERT
    WITH CHECK (
        (user_id = public.current_profile_id() OR public.is_admin() OR user_id IS NULL)
        AND status = 'pending'
    );

DROP POLICY IF EXISTS "Only admin or service role can update transactions" ON public.transactions;
CREATE POLICY "Only admin or service role can update transactions"
    ON public.transactions FOR UPDATE
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Users view own subscriptions" ON public.user_subscriptions;
CREATE POLICY "Users view own subscriptions"
    ON public.user_subscriptions FOR SELECT
    USING (
        user_id = public.current_profile_id()
        OR public.is_admin()
    );

DROP POLICY IF EXISTS "Only admin or service role can modify subscriptions" ON public.user_subscriptions;
CREATE POLICY "Only admin or service role can modify subscriptions"
    ON public.user_subscriptions FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- ==============================================================================
-- PHẦN 3: STORAGE BUCKETS & REALTIME REPLICATION (MIGRATION 014)
-- ==============================================================================
-- 1. Bucket room-images (Public 10MB)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'room-images',
    'room-images',
    true,
    10485760,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic'];

-- 2. Bucket avatars (Public 5MB)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    true,
    5242880,
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- 3. Bucket documents (Private 15MB)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'documents',
    'documents',
    false,
    15728640,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 15728640,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

-- RLS Policies cho Storage
DROP POLICY IF EXISTS "Public Access Room Images" ON storage.objects;
CREATE POLICY "Public Access Room Images"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'room-images');

DROP POLICY IF EXISTS "Public Access Avatars" ON storage.objects;
CREATE POLICY "Public Access Avatars"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Allow Upload Room Images" ON storage.objects;
CREATE POLICY "Allow Upload Room Images"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'room-images');

DROP POLICY IF EXISTS "Allow Manage Room Images" ON storage.objects;
CREATE POLICY "Allow Manage Room Images"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'room-images');

DROP POLICY IF EXISTS "Allow Delete Room Images" ON storage.objects;
CREATE POLICY "Allow Delete Room Images"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'room-images');

DROP POLICY IF EXISTS "Allow Upload Avatars" ON storage.objects;
CREATE POLICY "Allow Upload Avatars"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Allow Manage Avatars" ON storage.objects;
CREATE POLICY "Allow Manage Avatars"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'avatars');

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

-- Kích hoạt Realtime Replication
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.rooms REPLICA IDENTITY FULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'conversations'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'rooms'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
    END IF;
END $$;
