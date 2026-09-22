-- ==============================================================================
-- 013_payments_security_and_rls.sql
-- Hoàn thiện bảo mật bảng transactions & user_subscriptions cho TroXinh
-- Đảm bảo chống tấn công nâng quyền & bảo vệ luồng thanh toán Webhook
-- ==============================================================================

-- 1. Bổ sung các cột cần thiết cho bảng transactions (nếu chưa có)
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_code TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    plan_id TEXT,
    room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
    amount BIGINT NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'vietqr',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'success', 'failed', 'cancelled', 'expired')),
    signature TEXT,
    raw_payload JSONB,
    paid_at TIMESTAMPTZ,
    activated_at TIMESTAMPTZ,
    idempotency_key TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Bổ sung các cột nếu bảng đã tồn tại từ trước mà thiếu cột
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS plan_id TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'vietqr';
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS signature TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS raw_payload JSONB;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- 2. Bổ sung bảng user_subscriptions (nếu chưa có)
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

-- 3. Tạo Indexes để tăng tốc độ truy vấn đơn hàng
CREATE INDEX IF NOT EXISTS idx_transactions_order_code ON public.transactions(order_code);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_expires_at ON public.user_subscriptions(expires_at);

-- 4. Bật Row Level Security (RLS)
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies cho bảng transactions
-- Người dùng chỉ được xem giao dịch của chính mình hoặc Admin được xem tất cả
DROP POLICY IF EXISTS "Users view own transactions" ON public.transactions;
CREATE POLICY "Users view own transactions"
    ON public.transactions FOR SELECT
    USING (
        user_id = public.current_profile_id()
        OR public.is_admin()
        OR user_id IS NULL
    );

-- Người dùng chỉ được tạo giao dịch mới ở trạng thái 'pending'
DROP POLICY IF EXISTS "Users insert pending transaction" ON public.transactions;
CREATE POLICY "Users insert pending transaction"
    ON public.transactions FOR INSERT
    WITH CHECK (
        (user_id = public.current_profile_id() OR public.is_admin() OR user_id IS NULL)
        AND status = 'pending'
    );

-- CHẶN KHÔNG CHO CLIENT THƯỜNG CẬP NHẬT TRẠNG THÁI GIAO DỊCH
-- Chỉ Quản trị viên (Admin) hoặc Service Role (Webhook) mới được phép cập nhật
DROP POLICY IF EXISTS "Only admin or service role can update transactions" ON public.transactions;
CREATE POLICY "Only admin or service role can update transactions"
    ON public.transactions FOR UPDATE
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 6. RLS Policies cho bảng user_subscriptions
-- Người dùng chỉ được xem gói dịch vụ của chính mình hoặc Admin được xem tất cả
DROP POLICY IF EXISTS "Users view own subscriptions" ON public.user_subscriptions;
CREATE POLICY "Users view own subscriptions"
    ON public.user_subscriptions FOR SELECT
    USING (
        user_id = public.current_profile_id()
        OR public.is_admin()
    );

-- Chỉ Admin hoặc Service Role (Webhook) mới được chèn/cập nhật gói đăng ký
DROP POLICY IF EXISTS "Only admin or service role can manage subscriptions" ON public.user_subscriptions;
CREATE POLICY "Only admin or service role can manage subscriptions"
    ON public.user_subscriptions FOR ALL
    USING (public.is_admin())
    WITH CHECK (public.is_admin());
