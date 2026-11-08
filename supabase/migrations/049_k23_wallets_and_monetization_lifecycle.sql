-- Migration 049: Mô hình thu tiền mới & Vòng đời tin đăng 30 ngày Trọ Xinh (K23 Monetization Engine)
-- Tài liệu kiến trúc: K23-MONETIZATION-EXECUTION-PLAN.md & PDF 06/11/2026

-- 1. Bổ sung các cột Vòng đời tin đăng và Đẩy tin VIP cho bảng rooms
ALTER TABLE public.rooms 
ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ DEFAULT (timezone('utc'::text, now()) + interval '30 days'),
ADD COLUMN IF NOT EXISTS archived_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS repost_count INT NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_verified_listing BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS is_golden_hour_boosted BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS boost_expires_at TIMESTAMPTZ;

-- 2. Bảng Ví Xu Trọ Xinh (Chỉ thu từ Chủ Trọ - Tỷ giá cố định: 1 Xu = 1.000 VNĐ)
CREATE TABLE IF NOT EXISTS public.k23_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    balance_real_xu BIGINT NOT NULL DEFAULT 0,
    balance_bonus_xu BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_k23_wallets_owner UNIQUE (owner_id),
    CONSTRAINT chk_k23_wallets_positive_balances CHECK (balance_real_xu >= 0 AND balance_bonus_xu >= 0)
);

-- 3. Bảng Lịch sử biến động số dư Ví Xu (Audit Trail)
CREATE TABLE IF NOT EXISTS public.k23_wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID REFERENCES public.k23_wallets(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount_real_xu BIGINT NOT NULL DEFAULT 0,
    amount_bonus_xu BIGINT NOT NULL DEFAULT 0,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('deposit', 'spend', 'reward', 'refund')),
    reason TEXT NOT NULL,
    reference_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Bảng Hồ sơ Xác thực tin chính chủ kiểu Batdongsan (Tick xanh + Tặng 48h VIP)
CREATE TABLE IF NOT EXISTS public.k23_listing_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    owner_name TEXT,
    document_urls TEXT[] DEFAULT '{}',
    id_card_url TEXT,
    video_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reward_boost_hours INT NOT NULL DEFAULT 48,
    verified_at TIMESTAMPTZ,
    admin_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Indexes tăng tốc độ quét Cron và tra cứu ví
CREATE INDEX IF NOT EXISTS idx_rooms_expiration_scan ON public.rooms (status, expires_at);
CREATE INDEX IF NOT EXISTS idx_rooms_archived_scan ON public.rooms (status, archived_until);
CREATE INDEX IF NOT EXISTS idx_k23_wallets_owner ON public.k23_wallets (owner_id);
CREATE INDEX IF NOT EXISTS idx_k23_wallet_transactions_owner ON public.k23_wallet_transactions (owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_k23_listing_verifications_room ON public.k23_listing_verifications (room_id, status);

-- 6. Kích hoạt Row Level Security (RLS)
ALTER TABLE public.k23_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.k23_wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.k23_listing_verifications ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies
-- Ví Xu: Chủ trọ xem ví của chính mình
CREATE POLICY "k23_wallets_owner_read" ON public.k23_wallets
    FOR SELECT TO authenticated
    USING (owner_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = k23_wallets.owner_id AND firebase_uid = auth.uid()::text
    ));

-- Giao dịch Ví: Chủ trọ xem lịch sử giao dịch của mình
CREATE POLICY "k23_wallet_transactions_owner_read" ON public.k23_wallet_transactions
    FOR SELECT TO authenticated
    USING (owner_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = k23_wallet_transactions.owner_id AND firebase_uid = auth.uid()::text
    ));

-- Hồ sơ xác thực tin: Chủ trọ xem và gửi đơn của mình
CREATE POLICY "k23_verifications_owner_read" ON public.k23_listing_verifications
    FOR SELECT TO authenticated
    USING (owner_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = k23_listing_verifications.owner_id AND firebase_uid = auth.uid()::text
    ));

CREATE POLICY "k23_verifications_owner_insert" ON public.k23_listing_verifications
    FOR INSERT TO authenticated
    WITH CHECK (owner_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = k23_listing_verifications.owner_id AND firebase_uid = auth.uid()::text
    ));
