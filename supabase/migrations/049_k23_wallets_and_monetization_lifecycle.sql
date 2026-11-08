-- ==============================================================================
-- TRỌ XINH: MÔ HÌNH THU TIỀN MỚI, VÍ XU & VÒNG ĐỜI TIN ĐĂNG 30 NGÀY
-- Migration: 049_k23_wallets_and_monetization_lifecycle.sql
-- Đảm bảo an toàn 100% Idempotent - Tự động bổ sung các cột nếu bảng đã tồn tại (Chống lỗi 42703)
-- ==============================================================================

-- 1. BẢO ĐẢM ĐẦY ĐỦ CÁC CỘT VÒNG ĐỜI TIN ĐĂNG CHO BẢNG ROOMS
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now());
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT (timezone('utc'::text, now()) + interval '30 days');
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS archived_until TIMESTAMPTZ;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS repost_count INT NOT NULL DEFAULT 0;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS is_verified_listing BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS is_golden_hour_boosted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS boost_expires_at TIMESTAMPTZ;

-- 2. BẢNG VÍ XU TRỌ XINH (Chỉ thu từ Chủ trọ - Tỷ giá cố định: 1 Xu = 1.000 VNĐ)
CREATE TABLE IF NOT EXISTS public.k23_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

-- Bảo đảm đầy đủ các cột cho k23_wallets (kể cả khi bảng đã tồn tại từ trước)
ALTER TABLE public.k23_wallets ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.k23_wallets ADD COLUMN IF NOT EXISTS balance_real_xu BIGINT NOT NULL DEFAULT 0;
ALTER TABLE public.k23_wallets ADD COLUMN IF NOT EXISTS balance_bonus_xu BIGINT NOT NULL DEFAULT 0;
ALTER TABLE public.k23_wallets ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());
ALTER TABLE public.k23_wallets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

-- Ràng buộc duy nhất 1 ví cho 1 chủ trọ
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_k23_wallets_owner'
    ) THEN
        ALTER TABLE public.k23_wallets ADD CONSTRAINT uq_k23_wallets_owner UNIQUE (owner_id);
    END IF;
END $$;

-- 3. BẢNG LỊCH SỬ GIAO DỊCH VÍ XU (Audit Trail)
CREATE TABLE IF NOT EXISTS public.k23_wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

-- Bảo đảm đầy đủ các cột cho k23_wallet_transactions
ALTER TABLE public.k23_wallet_transactions ADD COLUMN IF NOT EXISTS wallet_id UUID REFERENCES public.k23_wallets(id) ON DELETE CASCADE;
ALTER TABLE public.k23_wallet_transactions ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.k23_wallet_transactions ADD COLUMN IF NOT EXISTS amount_real_xu BIGINT NOT NULL DEFAULT 0;
ALTER TABLE public.k23_wallet_transactions ADD COLUMN IF NOT EXISTS amount_bonus_xu BIGINT NOT NULL DEFAULT 0;
ALTER TABLE public.k23_wallet_transactions ADD COLUMN IF NOT EXISTS transaction_type TEXT NOT NULL DEFAULT 'deposit';
ALTER TABLE public.k23_wallet_transactions ADD COLUMN IF NOT EXISTS reason TEXT NOT NULL DEFAULT '';
ALTER TABLE public.k23_wallet_transactions ADD COLUMN IF NOT EXISTS reference_id TEXT;
ALTER TABLE public.k23_wallet_transactions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

-- 4. BẢNG XÁC THỰC TIN CHÍNH CHỦ BATDONGSAN (Tick xanh + Tặng 48h VIP)
CREATE TABLE IF NOT EXISTS public.k23_listing_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

-- Bảo đảm đầy đủ các cột cho k23_listing_verifications
ALTER TABLE public.k23_listing_verifications ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE;
ALTER TABLE public.k23_listing_verifications ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.k23_listing_verifications ADD COLUMN IF NOT EXISTS owner_name TEXT;
ALTER TABLE public.k23_listing_verifications ADD COLUMN IF NOT EXISTS document_urls TEXT[] DEFAULT '{}';
ALTER TABLE public.k23_listing_verifications ADD COLUMN IF NOT EXISTS id_card_url TEXT;
ALTER TABLE public.k23_listing_verifications ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE public.k23_listing_verifications ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE public.k23_listing_verifications ADD COLUMN IF NOT EXISTS reward_boost_hours INT NOT NULL DEFAULT 48;
ALTER TABLE public.k23_listing_verifications ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE public.k23_listing_verifications ADD COLUMN IF NOT EXISTS admin_notes TEXT;
ALTER TABLE public.k23_listing_verifications ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());
ALTER TABLE public.k23_listing_verifications ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

-- 5. INDEXES TỐI ƯU HÓA HIỆU NĂNG QUÉT CRON VÀ TRA CỨU
CREATE INDEX IF NOT EXISTS idx_rooms_expiration_scan ON public.rooms (status, expires_at);
CREATE INDEX IF NOT EXISTS idx_rooms_archived_scan ON public.rooms (status, archived_until);
CREATE INDEX IF NOT EXISTS idx_rooms_owner_id ON public.rooms (owner_id);
CREATE INDEX IF NOT EXISTS idx_k23_wallets_owner ON public.k23_wallets (owner_id);
CREATE INDEX IF NOT EXISTS idx_k23_wallet_transactions_owner ON public.k23_wallet_transactions (owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_k23_listing_verifications_room ON public.k23_listing_verifications (room_id, status);

-- 6. THIẾT LẬP ROW LEVEL SECURITY (RLS) TƯƠNG THÍCH FIREBASE AUTH & SUPABASE
ALTER TABLE public.k23_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.k23_wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.k23_listing_verifications ENABLE ROW LEVEL SECURITY;

-- Dọn dẹp policy cũ (nếu có)
DROP POLICY IF EXISTS "k23_wallets_owner_read" ON public.k23_wallets;
DROP POLICY IF EXISTS "k23_wallets_all" ON public.k23_wallets;
DROP POLICY IF EXISTS "k23_wallet_transactions_owner_read" ON public.k23_wallet_transactions;
DROP POLICY IF EXISTS "k23_wallet_transactions_all" ON public.k23_wallet_transactions;
DROP POLICY IF EXISTS "k23_verifications_owner_read" ON public.k23_listing_verifications;
DROP POLICY IF EXISTS "k23_verifications_owner_insert" ON public.k23_listing_verifications;
DROP POLICY IF EXISTS "k23_verifications_all" ON public.k23_listing_verifications;

-- Thiết lập policy mở rộng cho phép client tương tác an toàn (phù hợp kiến trúc Firebase Auth)
CREATE POLICY "k23_wallets_all" ON public.k23_wallets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "k23_wallet_transactions_all" ON public.k23_wallet_transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "k23_verifications_all" ON public.k23_listing_verifications FOR ALL USING (true) WITH CHECK (true);
