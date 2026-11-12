-- ==============================================================================
-- TRỌ XINH: 3 DỊCH VỤ TRẢ PHÍ ĐỘC LẬP, BẢNG K23, CREDIT ĐĂNG TIN & ATOMIC RPCS
-- Migration: 051_monetization_services_and_atomic_rpcs.sql
-- An toàn 100% Idempotent - Bảo toàn dữ liệu hiện có (Không DROP TABLE)
-- ==============================================================================

-- 1. MỞ RỘNG BẢNG ROOMS & USER_SUBSCRIPTIONS CHO DỊCH VỤ 1 & DỊCH VỤ 2
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS listing_plan_id TEXT;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS boost_type TEXT;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS boost_badge TEXT;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS is_boosted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.rooms ADD COLUMN IF NOT EXISTS free_repost_used BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS billing_cycle TEXT NOT NULL DEFAULT 'monthly';
ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS room_limit INT;
ALTER TABLE public.user_subscriptions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

-- 2. BẢNG LƯỢT ĐĂNG TIN LẺ CHO DỊCH VỤ 1 (single_15d = 30 Xu, single_30d = 50 Xu)
CREATE TABLE IF NOT EXISTS public.owner_listing_credits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    plan_id TEXT NOT NULL CHECK (plan_id IN ('single_15d', 'single_30d')),
    duration_days INT NOT NULL CHECK (duration_days IN (15, 30)),
    free_repost_remaining INT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'used', 'expired')),
    room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
    transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_owner_listing_credits_owner_status
    ON public.owner_listing_credits (owner_id, status, created_at ASC);

-- 3. HỆ THỐNG QUẢN LÝ PHÒNG TRỌ K23 (DỊCH VỤ 3 - ĐỘC LẬP HOÀN TOÀN)
-- Lưu ý: price_monthly và price_yearly lưu theo đơn vị XU NỘI BỘ (49 / 129 / 299 Xu; trả năm đóng 10 tặng 2)
CREATE TABLE IF NOT EXISTS public.k23_plans (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    price_monthly INT NOT NULL DEFAULT 0,
    price_quarterly INT,
    price_yearly INT NOT NULL DEFAULT 0,
    max_rooms INT NOT NULL DEFAULT 10,
    max_buildings INT NOT NULL DEFAULT 1,
    max_managers INT NOT NULL DEFAULT 1,
    features JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    display_order INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.k23_plans ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE public.k23_plans ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.k23_plans ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE public.k23_plans ADD COLUMN IF NOT EXISTS price_monthly INT NOT NULL DEFAULT 0;
ALTER TABLE public.k23_plans ADD COLUMN IF NOT EXISTS price_quarterly INT;
ALTER TABLE public.k23_plans ADD COLUMN IF NOT EXISTS price_yearly INT NOT NULL DEFAULT 0;
ALTER TABLE public.k23_plans ADD COLUMN IF NOT EXISTS max_rooms INT NOT NULL DEFAULT 10;
ALTER TABLE public.k23_plans ADD COLUMN IF NOT EXISTS max_buildings INT NOT NULL DEFAULT 1;
ALTER TABLE public.k23_plans ADD COLUMN IF NOT EXISTS max_managers INT NOT NULL DEFAULT 1;
ALTER TABLE public.k23_plans ADD COLUMN IF NOT EXISTS features JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.k23_plans ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.k23_plans ADD COLUMN IF NOT EXISTS display_order INT NOT NULL DEFAULT 1;

-- Vô hiệu hóa mã cũ (giữ dữ liệu lịch sử không làm gãy tham chiếu)
UPDATE public.k23_plans
SET is_active = FALSE, updated_at = timezone('utc'::text, now())
WHERE code IN ('starter', 'pro', 'enterprise');

-- Seed / cập nhật 3 gói chuẩn K23: Cơ Bản (49 Xu), Tiêu Chuẩn (129 Xu), Chuỗi (299 Xu)
INSERT INTO public.k23_plans (id, code, name, description, price_monthly, price_quarterly, price_yearly, max_rooms, max_buildings, max_managers, features, is_active, display_order)
VALUES
    (
        'plan_basic',
        'basic',
        'Cơ Bản',
        'Phù hợp cho chủ trọ quản lý 1 tòa nhà quy mô nhỏ với tối đa 10 phòng.',
        49,
        NULL,
        490,
        10,
        1,
        1,
        '["Quản lý tối đa 10 phòng", "Tối đa 1 tòa nhà cơ sở", "Chốt chỉ số điện nước hàng tháng", "Tính hóa đơn & tạo mã VietQR thu tiền", "Quản lý khách thuê & hợp đồng cơ bản"]'::jsonb,
        TRUE,
        1
    ),
    (
        'plan_standard',
        'standard',
        'Tiêu Chuẩn',
        'Đầy đủ công cụ vận hành cho chủ trọ quản lý tới 35 phòng và 3 tòa nhà.',
        129,
        NULL,
        1290,
        35,
        3,
        3,
        '["Quản lý tối đa 35 phòng", "Tối đa 3 tòa nhà cơ sở", "Cảnh báo chỉ số điện nước bất thường", "Tự động gạch nợ hóa đơn qua Webhook VietQR", "Cổng Web Khách Thuê tra cứu hóa đơn", "Báo cáo doanh thu & công nợ hàng tháng"]'::jsonb,
        TRUE,
        2
    ),
    (
        'plan_chain',
        'chain',
        'Chuỗi',
        'Dành cho hệ thống căn hộ dịch vụ, chung cư mini & chuỗi nhà trọ không giới hạn.',
        299,
        NULL,
        2990,
        -1,
        -1,
        99,
        '["Không giới hạn số phòng", "Không giới hạn số tòa nhà", "Phân quyền quản lý vận hành nhiều cơ sở", "Đối soát hóa đơn & báo cáo tài chính chuyên sâu", "Hỗ trợ kỹ thuật ưu tiên 24/7"]'::jsonb,
        TRUE,
        3
    )
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    price_monthly = EXCLUDED.price_monthly,
    price_quarterly = NULL,
    price_yearly = EXCLUDED.price_yearly,
    max_rooms = EXCLUDED.max_rooms,
    max_buildings = EXCLUDED.max_buildings,
    max_managers = EXCLUDED.max_managers,
    features = EXCLUDED.features,
    is_active = TRUE,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

-- Bảng gói K23 đang hoạt động của từng chủ trọ
CREATE TABLE IF NOT EXISTS public.k23_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    plan_code TEXT NOT NULL DEFAULT 'standard',
    billing_cycle TEXT NOT NULL DEFAULT 'monthly',
    status TEXT NOT NULL DEFAULT 'unsubscribed',
    trial_start_at TIMESTAMPTZ,
    trial_end_at TIMESTAMPTZ,
    has_used_trial BOOLEAN NOT NULL DEFAULT FALSE,
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    current_period_end TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    grace_period_end TIMESTAMPTZ,
    auto_renew BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.k23_subscriptions ADD COLUMN IF NOT EXISTS has_used_trial BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.k23_subscriptions ADD COLUMN IF NOT EXISTS grace_period_end TIMESTAMPTZ;
ALTER TABLE public.k23_subscriptions ADD COLUMN IF NOT EXISTS trial_start_at TIMESTAMPTZ;
ALTER TABLE public.k23_subscriptions ADD COLUMN IF NOT EXISTS trial_end_at TIMESTAMPTZ;
ALTER TABLE public.k23_subscriptions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

-- Đánh dấu đã từng dùng thử cho dữ liệu lịch sử có trial_start_at hoặc từng trialing
UPDATE public.k23_subscriptions
SET has_used_trial = TRUE
WHERE has_used_trial = FALSE
  AND (trial_start_at IS NOT NULL OR status = 'trialing');

CREATE TABLE IF NOT EXISTS public.k23_subscription_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_code TEXT UNIQUE NOT NULL,
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    plan_code TEXT NOT NULL,
    billing_cycle TEXT NOT NULL DEFAULT 'monthly',
    amount BIGINT NOT NULL DEFAULT 0,
    amount_xu BIGINT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    payment_method TEXT DEFAULT 'vietqr',
    payment_time TIMESTAMPTZ,
    transaction_ref TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.k23_subscription_orders ADD COLUMN IF NOT EXISTS amount_xu BIGINT NOT NULL DEFAULT 0;
ALTER TABLE public.k23_subscription_orders ADD COLUMN IF NOT EXISTS transaction_ref TEXT;

-- 4. SIẾT CHẶT RLS CHO TẤT CẢ BẢNG DỊCH VỤ TRẢ PHÍ
ALTER TABLE public.owner_listing_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.k23_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.k23_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.k23_subscription_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_listing_credits_select_own" ON public.owner_listing_credits;
CREATE POLICY "owner_listing_credits_select_own" ON public.owner_listing_credits
    FOR SELECT USING (
        owner_id = (SELECT public.current_profile_id())
        OR (SELECT public.is_admin())
    );

DROP POLICY IF EXISTS "k23_plans_public_read" ON public.k23_plans;
CREATE POLICY "k23_plans_public_read" ON public.k23_plans
    FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "k23_subscriptions_all" ON public.k23_subscriptions;
DROP POLICY IF EXISTS "k23_subscriptions_select_own" ON public.k23_subscriptions;
CREATE POLICY "k23_subscriptions_select_own" ON public.k23_subscriptions
    FOR SELECT USING (
        owner_id = (SELECT public.current_profile_id())
        OR (SELECT public.is_admin())
    );

DROP POLICY IF EXISTS "k23_subscription_orders_all" ON public.k23_subscription_orders;
DROP POLICY IF EXISTS "k23_subscription_orders_select_own" ON public.k23_subscription_orders;
CREATE POLICY "k23_subscription_orders_select_own" ON public.k23_subscription_orders
    FOR SELECT USING (
        owner_id = (SELECT public.current_profile_id())
        OR (SELECT public.is_admin())
    );

DROP POLICY IF EXISTS "user_subscriptions_all" ON public.user_subscriptions;
DROP POLICY IF EXISTS "user_subscriptions_select_own" ON public.user_subscriptions;
CREATE POLICY "user_subscriptions_select_own" ON public.user_subscriptions
    FOR SELECT USING (
        user_id = (SELECT public.current_profile_id())
        OR (SELECT public.is_admin())
    );

-- Bật Realtime cho k23_subscriptions, user_subscriptions, transactions
ALTER TABLE public.k23_subscriptions REPLICA IDENTITY FULL;
ALTER TABLE public.user_subscriptions REPLICA IDENTITY FULL;
ALTER TABLE public.transactions REPLICA IDENTITY FULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'k23_subscriptions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.k23_subscriptions;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'user_subscriptions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.user_subscriptions;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'transactions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
    END IF;
END $$;

-- 5. CẬP NHẬT TRIGGER TRANSACTIONS: TRÁNH KÍCH HOẠT TRÙNG LẶP VỚI ĐƠN RPC MỚI
CREATE OR REPLACE FUNCTION public.fn_auto_activate_subscription_on_paid()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
        NEW.paid_at := COALESCE(NEW.paid_at, now());
        NEW.activated_at := COALESCE(NEW.activated_at, now());

        -- Các đơn được xử lý bởi RPC fulfill_paid_service_order hoặc đơn nạp ví Xu / tiền tố mới sẽ do RPC tự kích hoạt chính xác
        IF COALESCE(NEW.metadata->>'fulfillment_mode', '') = 'rpc'
           OR NEW.plan_id = 'wallet_topup'
           OR NEW.order_code ~ '^(TXNAP|TXGOI|TXBST|TXK23|TXGHN|DEMO)' THEN
            RETURN NEW;
        END IF;

        IF NEW.user_id IS NOT NULL AND NEW.plan_id IS NOT NULL AND NEW.plan_id <> 'wallet_topup' THEN
            INSERT INTO public.user_subscriptions (user_id, plan_id, started_at, expires_at, transaction_id)
            VALUES (
                NEW.user_id,
                NEW.plan_id,
                now(),
                now() + INTERVAL '30 days',
                NEW.id
            );
        END IF;

        IF NEW.room_id IS NOT NULL THEN
            UPDATE public.rooms
            SET
                is_boosted = TRUE,
                boost_type = COALESCE(NEW.plan_id, 'vip'),
                boost_badge = 'Phòng Nổi Bật VIP'
            WHERE id = NEW.room_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. CÁC HÀM NỘI BỘ ATOMIC (KHÔNG CẤP QUYỀN TRỰC TIẾP CHO PUBLIC)
CREATE OR REPLACE FUNCTION public._internal_deduct_xu(
    p_owner_id UUID,
    p_amount_xu BIGINT,
    p_reason TEXT,
    p_reference_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_wallet RECORD;
    v_total BIGINT := 0;
    v_deduct_bonus BIGINT := 0;
    v_deduct_real BIGINT := 0;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
    IF p_owner_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
    END IF;
    IF p_amount_xu IS NULL OR p_amount_xu <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_AMOUNT');
    END IF;

    SELECT * INTO v_wallet
    FROM public.k23_wallets
    WHERE owner_id = p_owner_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'INSUFFICIENT_BALANCE', 'remaining_total', 0);
    END IF;

    v_total := COALESCE(v_wallet.balance_real_xu, 0) + COALESCE(v_wallet.balance_bonus_xu, 0);
    IF v_total < p_amount_xu THEN
        RETURN jsonb_build_object('success', false, 'error', 'INSUFFICIENT_BALANCE', 'remaining_total', v_total);
    END IF;

    v_deduct_bonus := LEAST(COALESCE(v_wallet.balance_bonus_xu, 0), p_amount_xu);
    v_deduct_real := p_amount_xu - v_deduct_bonus;

    UPDATE public.k23_wallets
    SET balance_bonus_xu = balance_bonus_xu - v_deduct_bonus,
        balance_real_xu = balance_real_xu - v_deduct_real,
        updated_at = v_now
    WHERE id = v_wallet.id;

    INSERT INTO public.k23_wallet_transactions (
        wallet_id, owner_id, amount_real_xu, amount_bonus_xu,
        transaction_type, reason, reference_id, created_at
    )
    VALUES (
        v_wallet.id, p_owner_id, -v_deduct_real, -v_deduct_bonus,
        'spend', COALESCE(NULLIF(p_reason, ''), 'Thanh toán dịch vụ Trọ Xinh'), p_reference_id, v_now
    );

    RETURN jsonb_build_object(
        'success', true,
        'deducted_bonus', v_deduct_bonus,
        'deducted_real', v_deduct_real,
        'remaining_total', v_total - p_amount_xu
    );
END;
$$;

REVOKE ALL ON FUNCTION public._internal_deduct_xu(UUID, BIGINT, TEXT, TEXT) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public._internal_activate_listing_purchase(
    p_user_id UUID,
    p_plan_id TEXT,
    p_billing_cycle TEXT,
    p_transaction_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
    v_plan TEXT := lower(btrim(COALESCE(p_plan_id, '')));
    v_cycle TEXT := CASE WHEN lower(btrim(COALESCE(p_billing_cycle, 'monthly'))) = 'yearly' THEN 'yearly' ELSE 'monthly' END;
    v_days INT;
    v_room_limit INT;
    v_credit_id UUID;
    v_expires_at TIMESTAMPTZ;
    v_existing_sub RECORD;
BEGIN
    IF v_plan = 'basic' THEN
        v_plan := 'featured';
    END IF;

    IF v_plan IN ('single_15d', 'single_30d') THEN
        v_days := CASE WHEN v_plan = 'single_30d' THEN 30 ELSE 15 END;
        INSERT INTO public.owner_listing_credits (
            owner_id, plan_id, duration_days, free_repost_remaining, status, transaction_id, created_at
        )
        VALUES (
            p_user_id,
            v_plan,
            v_days,
            CASE WHEN v_plan = 'single_30d' THEN 1 ELSE 0 END,
            'available',
            p_transaction_id,
            v_now
        )
        RETURNING id INTO v_credit_id;

        RETURN jsonb_build_object(
            'success', true,
            'service_type', 'listing_plan',
            'kind', 'single_credit',
            'plan_id', v_plan,
            'credit_id', v_credit_id,
            'duration_days', v_days
        );
    END IF;

    IF v_plan NOT IN ('featured', 'pro') THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_LISTING_PLAN');
    END IF;

    v_days := CASE WHEN v_cycle = 'yearly' THEN 365 ELSE 30 END;
    v_room_limit := CASE WHEN v_plan = 'pro' THEN -1 ELSE 10 END;

    SELECT * INTO v_existing_sub
    FROM public.user_subscriptions
    WHERE user_id = p_user_id
    ORDER BY expires_at DESC
    LIMIT 1
    FOR UPDATE;

    IF FOUND AND v_existing_sub.plan_id = v_plan AND v_existing_sub.expires_at > v_now AND v_existing_sub.status = 'active' THEN
        v_expires_at := v_existing_sub.expires_at + (v_days || ' days')::interval;
        UPDATE public.user_subscriptions
        SET expires_at = v_expires_at,
            billing_cycle = v_cycle,
            auto_renew = TRUE,
            room_limit = v_room_limit,
            transaction_id = COALESCE(p_transaction_id, transaction_id),
            updated_at = v_now
        WHERE id = v_existing_sub.id;
    ELSE
        v_expires_at := v_now + (v_days || ' days')::interval;
        INSERT INTO public.user_subscriptions (
            user_id, plan_id, billing_cycle, status, auto_renew, room_limit, started_at, expires_at, transaction_id, updated_at
        )
        VALUES (
            p_user_id, v_plan, v_cycle, 'active', TRUE, v_room_limit, v_now, v_expires_at, p_transaction_id, v_now
        );
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'service_type', 'listing_plan',
        'kind', 'subscription',
        'plan_id', v_plan,
        'billing_cycle', v_cycle,
        'room_limit', v_room_limit,
        'expires_at', v_expires_at
    );
END;
$$;

REVOKE ALL ON FUNCTION public._internal_activate_listing_purchase(UUID, TEXT, TEXT, UUID) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public._internal_activate_boost_purchase(
    p_user_id UUID,
    p_room_id UUID,
    p_boost_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
    v_boost TEXT := lower(btrim(COALESCE(p_boost_id, '')));
    v_days INT;
    v_golden BOOLEAN := FALSE;
    v_badge TEXT;
    v_room RECORD;
    v_base_time TIMESTAMPTZ;
    v_expires_at TIMESTAMPTZ;
BEGIN
    SELECT * INTO v_room
    FROM public.rooms
    WHERE id = p_room_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'ROOM_NOT_FOUND');
    END IF;
    IF v_room.owner_id IS DISTINCT FROM p_user_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'FORBIDDEN_ROOM_OWNER');
    END IF;

    IF v_boost = 'single' THEN
        v_days := 1; v_golden := FALSE; v_badge := 'Đẩy Nhanh';
    ELSIF v_boost = '3days' THEN
        v_days := 3; v_golden := FALSE; v_badge := 'Tin Nổi Bật';
    ELSIF v_boost = '7days' THEN
        v_days := 7; v_golden := TRUE; v_badge := 'Giờ Vàng';
    ELSIF v_boost = '30days' THEN
        v_days := 30; v_golden := TRUE; v_badge := 'VIP Toàn Diện';
    ELSE
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_BOOST_PACKAGE');
    END IF;

    v_base_time := CASE
        WHEN COALESCE(v_room.is_boosted, FALSE) AND v_room.boost_expires_at IS NOT NULL AND v_room.boost_expires_at > v_now
        THEN v_room.boost_expires_at
        ELSE v_now
    END;
    v_expires_at := v_base_time + (v_days || ' days')::interval;

    UPDATE public.rooms
    SET is_boosted = TRUE,
        boost_type = v_boost,
        boost_badge = v_badge,
        is_golden_hour_boosted = v_golden OR COALESCE(is_golden_hour_boosted, FALSE),
        boost_expires_at = v_expires_at,
        updated_at = v_now
    WHERE id = p_room_id;

    RETURN jsonb_build_object(
        'success', true,
        'service_type', 'boost',
        'room_id', p_room_id,
        'boost_id', v_boost,
        'days', v_days,
        'boost_expires_at', v_expires_at
    );
END;
$$;

REVOKE ALL ON FUNCTION public._internal_activate_boost_purchase(UUID, UUID, TEXT) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public._internal_activate_k23_purchase(
    p_owner_id UUID,
    p_plan_code TEXT,
    p_billing_cycle TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
    v_raw TEXT := lower(btrim(COALESCE(p_plan_code, 'standard')));
    v_code TEXT;
    v_cycle TEXT := CASE WHEN lower(btrim(COALESCE(p_billing_cycle, 'monthly'))) = 'yearly' THEN 'yearly' ELSE 'monthly' END;
    v_days INT;
    v_existing RECORD;
    v_period_start TIMESTAMPTZ;
    v_period_end TIMESTAMPTZ;
    v_grace_end TIMESTAMPTZ;
    v_sub RECORD;
BEGIN
    v_code := CASE
        WHEN v_raw = 'basic' THEN 'basic'
        WHEN v_raw IN ('chain', 'enterprise') THEN 'chain'
        WHEN v_raw IN ('standard', 'pro') THEN 'standard'
        ELSE NULL
    END;

    IF v_code IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_K23_PLAN');
    END IF;

    v_days := CASE WHEN v_cycle = 'yearly' THEN 365 ELSE 30 END;

    SELECT * INTO v_existing
    FROM public.k23_subscriptions
    WHERE owner_id = p_owner_id
    FOR UPDATE;

    v_period_start := v_now;
    IF FOUND AND v_existing.status = 'active' AND v_existing.plan_code = v_code AND v_existing.current_period_end > v_now THEN
        v_period_end := v_existing.current_period_end + (v_days || ' days')::interval;
    ELSE
        v_period_end := v_now + (v_days || ' days')::interval;
    END IF;
    v_grace_end := v_period_end + interval '7 days';

    INSERT INTO public.k23_subscriptions (
        owner_id, plan_code, billing_cycle, status,
        has_used_trial, current_period_start, current_period_end, grace_period_end,
        auto_renew, created_at, updated_at
    )
    VALUES (
        p_owner_id, v_code, v_cycle, 'active',
        COALESCE(v_existing.has_used_trial, FALSE), v_period_start, v_period_end, v_grace_end,
        TRUE, v_now, v_now
    )
    ON CONFLICT (owner_id) DO UPDATE SET
        plan_code = EXCLUDED.plan_code,
        billing_cycle = EXCLUDED.billing_cycle,
        status = 'active',
        current_period_start = v_period_start,
        current_period_end = v_period_end,
        grace_period_end = v_grace_end,
        auto_renew = TRUE,
        updated_at = v_now
    RETURNING * INTO v_sub;

    RETURN jsonb_build_object(
        'success', true,
        'service_type', 'k23',
        'plan_code', v_code,
        'billing_cycle', v_cycle,
        'current_period_end', v_period_end,
        'subscription', row_to_json(v_sub)
    );
END;
$$;

REVOKE ALL ON FUNCTION public._internal_activate_k23_purchase(UUID, TEXT, TEXT) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public._internal_activate_repost_purchase(
    p_owner_id UUID,
    p_room_id UUID,
    p_duration_days INT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
    v_days INT := CASE WHEN p_duration_days = 15 THEN 15 ELSE 30 END;
    v_room RECORD;
    v_expires_at TIMESTAMPTZ;
    v_archived_until TIMESTAMPTZ;
BEGIN
    SELECT * INTO v_room
    FROM public.rooms
    WHERE id = p_room_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'ROOM_NOT_FOUND');
    END IF;
    IF v_room.owner_id IS DISTINCT FROM p_owner_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'FORBIDDEN_ROOM_OWNER');
    END IF;

    v_expires_at := v_now + (v_days || ' days')::interval;
    v_archived_until := v_expires_at + interval '60 days';

    UPDATE public.rooms
    SET status = 'Còn trống',
        availability_status = 'available',
        published_at = v_now,
        expires_at = v_expires_at,
        archived_until = v_archived_until,
        repost_count = COALESCE(repost_count, 0) + 1,
        updated_at = v_now
    WHERE id = p_room_id;

    RETURN jsonb_build_object(
        'success', true,
        'service_type', 'repost',
        'room_id', p_room_id,
        'duration_days', v_days,
        'expires_at', v_expires_at
    );
END;
$$;

REVOKE ALL ON FUNCTION public._internal_activate_repost_purchase(UUID, UUID, INT) FROM PUBLIC;

-- 7. CÁC RPC CÔNG KHAI CHO CHỦ TRỌ ĐÃ XÁC THỰC (AUTHENTICATED)

-- 7.1. Kiểm tra hạn mức đăng phòng (2 phòng miễn phí -> gói/credit Dịch vụ 1)
CREATE OR REPLACE FUNCTION public.get_owner_listing_quota()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_profile_id UUID := public.current_profile_id();
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
    v_room_count INT := 0;
    v_sub RECORD;
    v_credit_count INT := 0;
    v_active_limit INT := 2;
    v_can_create BOOLEAN := FALSE;
BEGIN
    IF v_profile_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
    END IF;

    SELECT COUNT(*)::INT INTO v_room_count
    FROM public.rooms
    WHERE owner_id = v_profile_id;

    SELECT * INTO v_sub
    FROM public.user_subscriptions
    WHERE user_id = v_profile_id
      AND status = 'active'
      AND expires_at > v_now
    ORDER BY expires_at DESC
    LIMIT 1;

    SELECT COUNT(*)::INT INTO v_credit_count
    FROM public.owner_listing_credits
    WHERE owner_id = v_profile_id
      AND status = 'available';

    IF FOUND AND v_sub.plan_id = 'pro' THEN
        v_active_limit := -1;
        v_can_create := TRUE;
    ELSIF FOUND AND v_sub.plan_id IN ('featured', 'basic') THEN
        v_active_limit := COALESCE(v_sub.room_limit, 10);
        v_can_create := (v_room_count < v_active_limit) OR (v_credit_count > 0);
    ELSE
        v_active_limit := 2;
        v_can_create := (v_room_count < 2) OR (v_credit_count > 0);
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'free_quota', 2,
        'room_count', v_room_count,
        'free_remaining', GREATEST(0, 2 - v_room_count),
        'active_plan_id', COALESCE(v_sub.plan_id, 'free'),
        'active_plan_limit', v_active_limit,
        'active_plan_expires_at', v_sub.expires_at,
        'auto_renew', COALESCE(v_sub.auto_renew, FALSE),
        'available_single_credits', v_credit_count,
        'can_create_room', v_can_create
    );
END;
$$;

REVOKE ALL ON FUNCTION public.get_owner_listing_quota() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_owner_listing_quota() TO authenticated;

-- 7.2. Tiêu thụ 1 credit tin lẻ khi đăng phòng thứ 3+ (nếu không có gói unlimited/featured còn slot)
CREATE OR REPLACE FUNCTION public.consume_listing_credit_for_room(p_room_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_profile_id UUID := public.current_profile_id();
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
    v_room RECORD;
    v_room_count INT := 0;
    v_sub RECORD;
    v_credit RECORD;
    v_expires_at TIMESTAMPTZ;
BEGIN
    IF v_profile_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
    END IF;

    SELECT * INTO v_room FROM public.rooms WHERE id = p_room_id FOR UPDATE;
    IF NOT FOUND OR v_room.owner_id IS DISTINCT FROM v_profile_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'FORBIDDEN_ROOM_OWNER');
    END IF;

    SELECT COUNT(*)::INT INTO v_room_count
    FROM public.rooms
    WHERE owner_id = v_profile_id;

    IF v_room_count <= 2 THEN
        RETURN jsonb_build_object('success', true, 'consumed', false, 'reason', 'FREE_QUOTA');
    END IF;

    SELECT * INTO v_sub
    FROM public.user_subscriptions
    WHERE user_id = v_profile_id
      AND status = 'active'
      AND expires_at > v_now
    ORDER BY expires_at DESC
    LIMIT 1;

    IF FOUND AND (
        v_sub.plan_id = 'pro'
        OR (v_sub.plan_id IN ('featured', 'basic') AND v_room_count <= COALESCE(v_sub.room_limit, 10))
    ) THEN
        UPDATE public.rooms
        SET listing_plan_id = v_sub.plan_id,
            updated_at = v_now
        WHERE id = p_room_id;

        RETURN jsonb_build_object('success', true, 'consumed', false, 'reason', 'SUBSCRIPTION_PLAN', 'plan_id', v_sub.plan_id);
    END IF;

    SELECT * INTO v_credit
    FROM public.owner_listing_credits
    WHERE owner_id = v_profile_id
      AND status = 'available'
    ORDER BY created_at ASC
    LIMIT 1
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'QUOTA_EXCEEDED');
    END IF;

    v_expires_at := v_now + (v_credit.duration_days || ' days')::interval;

    UPDATE public.owner_listing_credits
    SET status = 'used',
        room_id = p_room_id,
        used_at = v_now
    WHERE id = v_credit.id;

    UPDATE public.rooms
    SET listing_plan_id = v_credit.plan_id,
        published_at = v_now,
        expires_at = v_expires_at,
        archived_until = v_expires_at + interval '60 days',
        updated_at = v_now
    WHERE id = p_room_id;

    RETURN jsonb_build_object(
        'success', true,
        'consumed', true,
        'credit_id', v_credit.id,
        'plan_id', v_credit.plan_id,
        'duration_days', v_credit.duration_days,
        'expires_at', v_expires_at
    );
END;
$$;

REVOKE ALL ON FUNCTION public.consume_listing_credit_for_room(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_listing_credit_for_room(UUID) TO authenticated;

-- 7.3. Mua Dịch vụ 1 (Gói đăng phòng) bằng Xu nội bộ
CREATE OR REPLACE FUNCTION public.purchase_listing_plan_with_xu(
    p_plan_id TEXT,
    p_billing_cycle TEXT DEFAULT 'monthly',
    p_coupon_code TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_profile_id UUID := public.current_profile_id();
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
    v_plan TEXT := lower(btrim(COALESCE(p_plan_id, '')));
    v_cycle TEXT := CASE WHEN lower(btrim(COALESCE(p_billing_cycle, 'monthly'))) = 'yearly' THEN 'yearly' ELSE 'monthly' END;
    v_base_xu BIGINT;
    v_discount INT := 0;
    v_final_xu BIGINT;
    v_code TEXT := upper(btrim(COALESCE(p_coupon_code, '')));
    v_order_code TEXT;
    v_deduct JSONB;
    v_tx_id UUID;
    v_act JSONB;
BEGIN
    IF v_profile_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
    END IF;

    IF v_plan = 'basic' THEN v_plan := 'featured'; END IF;

    IF v_plan = 'single_15d' THEN
        v_base_xu := 30; v_cycle := 'monthly';
    ELSIF v_plan = 'single_30d' THEN
        v_base_xu := 50; v_cycle := 'monthly';
    ELSIF v_plan = 'featured' THEN
        v_base_xu := CASE WHEN v_cycle = 'yearly' THEN 1430 ELSE 149 END;
    ELSIF v_plan = 'pro' THEN
        v_base_xu := CASE WHEN v_cycle = 'yearly' THEN 4320 ELSE 450 END;
    ELSE
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_LISTING_PLAN');
    END IF;

    IF v_code IN ('TROXINH50', 'TROXINH') THEN v_discount := 50;
    ELSIF v_code = 'CHUTROVIP' THEN v_discount := 25;
    ELSIF v_code IN ('SINHVIEN', 'CHUTRO') THEN v_discount := 20;
    ELSIF v_code = 'BANMOI' THEN v_discount := 10;
    END IF;

    v_final_xu := CASE
        WHEN v_discount > 0 THEN GREATEST(1, ROUND(v_base_xu * (100.0 - v_discount) / 100.0)::BIGINT)
        ELSE v_base_xu
    END;

    v_order_code := 'TXGOI' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

    v_deduct := public._internal_deduct_xu(
        v_profile_id,
        v_final_xu,
        format('Mua gói đăng phòng %s (%s)', v_plan, v_cycle),
        v_order_code
    );

    IF NOT COALESCE((v_deduct->>'success')::BOOLEAN, FALSE) THEN
        RETURN v_deduct || jsonb_build_object('required_xu', v_final_xu);
    END IF;

    INSERT INTO public.transactions (
        user_id, order_code, plan_id, amount, status, payment_method, paid_at, activated_at, metadata, created_at
    )
    VALUES (
        v_profile_id,
        v_order_code,
        v_plan,
        v_final_xu * 1000,
        'paid',
        'wallet_xu',
        v_now,
        v_now,
        jsonb_build_object(
            'service_type', 'listing_plan',
            'fulfillment_mode', 'rpc',
            'plan_id', v_plan,
            'billing_cycle', v_cycle,
            'coupon_code', v_code,
            'discount_percent', v_discount,
            'amount_xu', v_final_xu
        ),
        v_now
    )
    RETURNING id INTO v_tx_id;

    v_act := public._internal_activate_listing_purchase(v_profile_id, v_plan, v_cycle, v_tx_id);

    RETURN jsonb_build_object(
        'success', true,
        'order_code', v_order_code,
        'transaction_id', v_tx_id,
        'amount_xu', v_final_xu,
        'remaining_total', (v_deduct->>'remaining_total')::BIGINT,
        'activation', v_act
    );
END;
$$;

REVOKE ALL ON FUNCTION public.purchase_listing_plan_with_xu(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purchase_listing_plan_with_xu(TEXT, TEXT, TEXT) TO authenticated;

-- 7.4. Mua Dịch vụ 2 (Đẩy tin phòng) bằng Xu nội bộ
CREATE OR REPLACE FUNCTION public.purchase_room_boost_with_xu(
    p_room_id UUID,
    p_boost_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_profile_id UUID := public.current_profile_id();
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
    v_boost TEXT := lower(btrim(COALESCE(p_boost_id, '')));
    v_xu BIGINT;
    v_room RECORD;
    v_order_code TEXT;
    v_deduct JSONB;
    v_act JSONB;
    v_tx_id UUID;
BEGIN
    IF v_profile_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
    END IF;

    IF v_boost = 'single' THEN v_xu := 15;
    ELSIF v_boost = '3days' THEN v_xu := 29;
    ELSIF v_boost = '7days' THEN v_xu := 59;
    ELSIF v_boost = '30days' THEN v_xu := 199;
    ELSE
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_BOOST_PACKAGE');
    END IF;

    SELECT * INTO v_room FROM public.rooms WHERE id = p_room_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'ROOM_NOT_FOUND');
    END IF;
    IF v_room.owner_id IS DISTINCT FROM v_profile_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'FORBIDDEN_ROOM_OWNER');
    END IF;

    v_order_code := 'TXBST' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

    v_deduct := public._internal_deduct_xu(
        v_profile_id,
        v_xu,
        format('Đẩy tin phòng "%s" (%s)', COALESCE(v_room.title, v_room.room_number, p_room_id::text), v_boost),
        v_order_code
    );

    IF NOT COALESCE((v_deduct->>'success')::BOOLEAN, FALSE) THEN
        RETURN v_deduct || jsonb_build_object('required_xu', v_xu);
    END IF;

    v_act := public._internal_activate_boost_purchase(v_profile_id, p_room_id, v_boost);

    INSERT INTO public.transactions (
        user_id, order_code, plan_id, room_id, amount, status, payment_method, paid_at, activated_at, metadata, created_at
    )
    VALUES (
        v_profile_id,
        v_order_code,
        'boost_' || v_boost,
        p_room_id,
        v_xu * 1000,
        'paid',
        'wallet_xu',
        v_now,
        v_now,
        jsonb_build_object(
            'service_type', 'boost',
            'fulfillment_mode', 'rpc',
            'boost_id', v_boost,
            'room_id', p_room_id,
            'amount_xu', v_xu
        ),
        v_now
    )
    RETURNING id INTO v_tx_id;

    RETURN jsonb_build_object(
        'success', true,
        'order_code', v_order_code,
        'transaction_id', v_tx_id,
        'amount_xu', v_xu,
        'remaining_total', (v_deduct->>'remaining_total')::BIGINT,
        'activation', v_act
    );
END;
$$;

REVOKE ALL ON FUNCTION public.purchase_room_boost_with_xu(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purchase_room_boost_with_xu(UUID, TEXT) TO authenticated;

-- 7.5. Mua Dịch vụ 3 (Hệ thống K23) bằng Xu nội bộ (Trả năm: đóng 10 tặng 2)
CREATE OR REPLACE FUNCTION public.purchase_k23_plan_with_xu(
    p_plan_code TEXT,
    p_billing_cycle TEXT DEFAULT 'monthly'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_profile_id UUID := public.current_profile_id();
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
    v_raw TEXT := lower(btrim(COALESCE(p_plan_code, 'standard')));
    v_code TEXT;
    v_cycle TEXT := CASE WHEN lower(btrim(COALESCE(p_billing_cycle, 'monthly'))) = 'yearly' THEN 'yearly' ELSE 'monthly' END;
    v_monthly_xu BIGINT;
    v_final_xu BIGINT;
    v_order_code TEXT;
    v_deduct JSONB;
    v_act JSONB;
    v_tx_id UUID;
BEGIN
    IF v_profile_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
    END IF;

    v_code := CASE
        WHEN v_raw = 'basic' THEN 'basic'
        WHEN v_raw IN ('chain', 'enterprise') THEN 'chain'
        WHEN v_raw IN ('standard', 'pro') THEN 'standard'
        ELSE NULL
    END;

    IF v_code IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_K23_PLAN');
    END IF;

    v_monthly_xu := CASE v_code WHEN 'basic' THEN 49 WHEN 'standard' THEN 129 ELSE 299 END;
    v_final_xu := CASE WHEN v_cycle = 'yearly' THEN v_monthly_xu * 10 ELSE v_monthly_xu END;

    v_order_code := 'TXK23' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

    v_deduct := public._internal_deduct_xu(
        v_profile_id,
        v_final_xu,
        format('Đăng ký K23 gói %s (%s)', v_code, CASE WHEN v_cycle = 'yearly' THEN '1 năm - đóng 10 tặng 2' ELSE '1 tháng' END),
        v_order_code
    );

    IF NOT COALESCE((v_deduct->>'success')::BOOLEAN, FALSE) THEN
        RETURN v_deduct || jsonb_build_object('required_xu', v_final_xu);
    END IF;

    v_act := public._internal_activate_k23_purchase(v_profile_id, v_code, v_cycle);

    INSERT INTO public.k23_subscription_orders (
        order_code, owner_id, plan_code, billing_cycle, amount, amount_xu, status, payment_method, payment_time, transaction_ref, created_at
    )
    VALUES (
        v_order_code, v_profile_id, v_code, v_cycle, v_final_xu * 1000, v_final_xu, 'paid', 'wallet_xu', v_now, v_order_code, v_now
    );

    INSERT INTO public.transactions (
        user_id, order_code, plan_id, amount, status, payment_method, paid_at, activated_at, metadata, created_at
    )
    VALUES (
        v_profile_id,
        v_order_code,
        'k23_' || v_code,
        v_final_xu * 1000,
        'paid',
        'wallet_xu',
        v_now,
        v_now,
        jsonb_build_object(
            'service_type', 'k23',
            'fulfillment_mode', 'rpc',
            'plan_code', v_code,
            'billing_cycle', v_cycle,
            'amount_xu', v_final_xu
        ),
        v_now
    )
    RETURNING id INTO v_tx_id;

    RETURN jsonb_build_object(
        'success', true,
        'order_code', v_order_code,
        'transaction_id', v_tx_id,
        'amount_xu', v_final_xu,
        'remaining_total', (v_deduct->>'remaining_total')::BIGINT,
        'activation', v_act
    );
END;
$$;

REVOKE ALL ON FUNCTION public.purchase_k23_plan_with_xu(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purchase_k23_plan_with_xu(TEXT, TEXT) TO authenticated;

-- 7.6. Kích hoạt dùng thử K23: 30 ngày gói Tiêu Chuẩn (0 Xu, duy nhất 1 lần/chủ trọ)
CREATE OR REPLACE FUNCTION public.activate_k23_trial()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_profile_id UUID := public.current_profile_id();
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
    v_trial_end TIMESTAMPTZ := v_now + interval '30 days';
    v_grace_end TIMESTAMPTZ := v_trial_end + interval '7 days';
    v_existing RECORD;
    v_sub RECORD;
BEGIN
    IF v_profile_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
    END IF;

    SELECT * INTO v_existing
    FROM public.k23_subscriptions
    WHERE owner_id = v_profile_id
    FOR UPDATE;

    IF FOUND THEN
        IF v_existing.has_used_trial OR v_existing.trial_start_at IS NOT NULL THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'TRIAL_ALREADY_USED',
                'message', 'Mỗi chủ trọ chỉ được dùng thử miễn phí 30 ngày gói Tiêu Chuẩn một lần.'
            );
        END IF;

        IF v_existing.status = 'active' AND v_existing.current_period_end > v_now THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'ALREADY_ACTIVE_SUBSCRIPTION',
                'message', 'Bạn đang sử dụng gói K23 trả phí còn hiệu lực.'
            );
        END IF;
    END IF;

    INSERT INTO public.k23_subscriptions (
        owner_id, plan_code, billing_cycle, status,
        trial_start_at, trial_end_at, has_used_trial,
        current_period_start, current_period_end, grace_period_end,
        auto_renew, created_at, updated_at
    )
    VALUES (
        v_profile_id, 'standard', 'monthly', 'trialing',
        v_now, v_trial_end, TRUE,
        v_now, v_trial_end, v_grace_end,
        FALSE, v_now, v_now
    )
    ON CONFLICT (owner_id) DO UPDATE SET
        plan_code = 'standard',
        billing_cycle = 'monthly',
        status = 'trialing',
        trial_start_at = v_now,
        trial_end_at = v_trial_end,
        has_used_trial = TRUE,
        current_period_start = v_now,
        current_period_end = v_trial_end,
        grace_period_end = v_grace_end,
        auto_renew = FALSE,
        updated_at = v_now
    RETURNING * INTO v_sub;

    RETURN jsonb_build_object(
        'success', true,
        'subscription', row_to_json(v_sub)
    );
END;
$$;

REVOKE ALL ON FUNCTION public.activate_k23_trial() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.activate_k23_trial() TO authenticated;

-- 7.7. Gia hạn / đăng lại tin hết hạn bằng Xu (hoặc miễn phí lần đầu / quyền từ Tin lẻ 30 ngày)
CREATE OR REPLACE FUNCTION public.repost_room_with_xu(
    p_room_id UUID,
    p_duration_days INT DEFAULT 30
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_profile_id UUID := public.current_profile_id();
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
    v_days INT := CASE WHEN p_duration_days = 15 THEN 15 ELSE 30 END;
    v_room RECORD;
    v_is_free BOOLEAN := FALSE;
    v_xu BIGINT;
    v_order_code TEXT;
    v_deduct JSONB;
    v_act JSONB;
    v_tx_id UUID;
BEGIN
    IF v_profile_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
    END IF;

    SELECT * INTO v_room FROM public.rooms WHERE id = p_room_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'ROOM_NOT_FOUND');
    END IF;
    IF v_room.owner_id IS DISTINCT FROM v_profile_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'FORBIDDEN_ROOM_OWNER');
    END IF;

    -- Miễn phí nếu lần đầu gia hạn hoặc có quyền tặng từ Tin lẻ 30 ngày
    v_is_free := (COALESCE(v_room.repost_count, 0) = 0);

    IF NOT v_is_free AND NOT COALESCE(v_room.free_repost_used, FALSE) THEN
        IF EXISTS (
            SELECT 1 FROM public.owner_listing_credits
            WHERE room_id = p_room_id AND owner_id = v_profile_id AND free_repost_remaining > 0
        ) THEN
            v_is_free := TRUE;
            UPDATE public.owner_listing_credits
            SET free_repost_remaining = GREATEST(0, free_repost_remaining - 1)
            WHERE room_id = p_room_id AND owner_id = v_profile_id AND free_repost_remaining > 0;
            UPDATE public.rooms SET free_repost_used = TRUE WHERE id = p_room_id;
        END IF;
    END IF;

    IF v_is_free THEN
        v_act := public._internal_activate_repost_purchase(v_profile_id, p_room_id, 30);
        RETURN jsonb_build_object(
            'success', true,
            'free_repost', true,
            'amount_xu', 0,
            'activation', v_act
        );
    END IF;

    v_xu := CASE WHEN v_days = 15 THEN 30 ELSE 50 END;
    v_order_code := 'TXGHN' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

    v_deduct := public._internal_deduct_xu(
        v_profile_id,
        v_xu,
        format('Đăng lại tin "%s" (%s ngày)', COALESCE(v_room.title, v_room.room_number, p_room_id::text), v_days),
        v_order_code
    );

    IF NOT COALESCE((v_deduct->>'success')::BOOLEAN, FALSE) THEN
        RETURN v_deduct || jsonb_build_object('required_xu', v_xu);
    END IF;

    v_act := public._internal_activate_repost_purchase(v_profile_id, p_room_id, v_days);

    INSERT INTO public.transactions (
        user_id, order_code, plan_id, room_id, amount, status, payment_method, paid_at, activated_at, metadata, created_at
    )
    VALUES (
        v_profile_id,
        v_order_code,
        'repost_' || v_days || 'd',
        p_room_id,
        v_xu * 1000,
        'paid',
        'wallet_xu',
        v_now,
        v_now,
        jsonb_build_object(
            'service_type', 'repost',
            'fulfillment_mode', 'rpc',
            'room_id', p_room_id,
            'duration_days', v_days,
            'amount_xu', v_xu
        ),
        v_now
    )
    RETURNING id INTO v_tx_id;

    RETURN jsonb_build_object(
        'success', true,
        'free_repost', false,
        'order_code', v_order_code,
        'transaction_id', v_tx_id,
        'amount_xu', v_xu,
        'remaining_total', (v_deduct->>'remaining_total')::BIGINT,
        'activation', v_act
    );
END;
$$;

REVOKE ALL ON FUNCTION public.repost_room_with_xu(UUID, INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.repost_room_with_xu(UUID, INT) TO authenticated;

-- 7.8. Tắt tự động gia hạn gói đăng phòng (Dịch vụ 1)
CREATE OR REPLACE FUNCTION public.cancel_owner_listing_auto_renew()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_profile_id UUID := public.current_profile_id();
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
    IF v_profile_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
    END IF;

    UPDATE public.user_subscriptions
    SET auto_renew = FALSE, updated_at = v_now
    WHERE user_id = v_profile_id AND status = 'active';

    RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.cancel_owner_listing_auto_renew() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_owner_listing_auto_renew() TO authenticated;

-- 8. RPC XÁC NHẬN THANH TOÁN TỪ WEBHOOK IPN / DEMO SANDBOX SERVER (CHỈ SERVICE_ROLE)
CREATE OR REPLACE FUNCTION public.fulfill_paid_service_order(
    p_order_code TEXT,
    p_paid_amount BIGINT,
    p_reference_id TEXT,
    p_gateway TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_tx RECORD;
    v_meta JSONB;
    v_service_type TEXT;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
    v_act JSONB;
BEGIN
    SELECT * INTO v_tx
    FROM public.transactions
    WHERE order_code = upper(btrim(p_order_code))
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'ORDER_NOT_FOUND');
    END IF;

    IF v_tx.status IN ('paid', 'success') THEN
        RETURN jsonb_build_object('success', true, 'already_processed', true, 'order_code', v_tx.order_code);
    END IF;

    IF p_paid_amount < v_tx.amount THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'INSUFFICIENT_AMOUNT',
            'expected_amount', v_tx.amount,
            'paid_amount', p_paid_amount
        );
    END IF;

    v_meta := COALESCE(v_tx.metadata, '{}'::jsonb);
    v_service_type := COALESCE(v_meta->>'service_type', '');

    IF v_service_type = '' THEN
        IF v_tx.order_code LIKE 'TXGOI%' THEN v_service_type := 'listing_plan';
        ELSIF v_tx.order_code LIKE 'TXBST%' THEN v_service_type := 'boost';
        ELSIF v_tx.order_code LIKE 'TXK23%' THEN v_service_type := 'k23';
        ELSIF v_tx.order_code LIKE 'TXGHN%' THEN v_service_type := 'repost';
        END IF;
    END IF;

    IF v_service_type = 'listing_plan' THEN
        v_act := public._internal_activate_listing_purchase(
            v_tx.user_id,
            COALESCE(v_meta->>'plan_id', v_tx.plan_id),
            COALESCE(v_meta->>'billing_cycle', 'monthly'),
            v_tx.id
        );
    ELSIF v_service_type = 'boost' THEN
        v_act := public._internal_activate_boost_purchase(
            v_tx.user_id,
            COALESCE((v_meta->>'room_id')::UUID, v_tx.room_id),
            COALESCE(v_meta->>'boost_id', replace(COALESCE(v_tx.plan_id, ''), 'boost_', ''))
        );
    ELSIF v_service_type = 'k23' THEN
        v_act := public._internal_activate_k23_purchase(
            v_tx.user_id,
            COALESCE(v_meta->>'plan_code', replace(COALESCE(v_tx.plan_id, ''), 'k23_', '')),
            COALESCE(v_meta->>'billing_cycle', 'monthly')
        );
        UPDATE public.k23_subscription_orders
        SET status = 'paid',
            payment_time = v_now,
            transaction_ref = COALESCE(NULLIF(p_reference_id, ''), v_tx.order_code),
            payment_method = COALESCE(NULLIF(p_gateway, ''), payment_method)
        WHERE order_code = v_tx.order_code;
    ELSIF v_service_type = 'repost' THEN
        v_act := public._internal_activate_repost_purchase(
            v_tx.user_id,
            COALESCE((v_meta->>'room_id')::UUID, v_tx.room_id),
            COALESCE((v_meta->>'duration_days')::INT, 30)
        );
    ELSE
        RETURN jsonb_build_object('success', false, 'error', 'UNKNOWN_SERVICE_TYPE');
    END IF;

    IF NOT COALESCE((v_act->>'success')::BOOLEAN, FALSE) THEN
        RETURN v_act;
    END IF;

    UPDATE public.transactions
    SET status = 'paid',
        trans_id = COALESCE(NULLIF(p_reference_id, ''), trans_id),
        idempotency_key = COALESCE(NULLIF(p_reference_id, ''), idempotency_key),
        paid_at = v_now,
        activated_at = v_now
    WHERE id = v_tx.id;

    BEGIN
        INSERT INTO public.notifications (user_id, type, title, message, link, read, created_at)
        VALUES (
            v_tx.user_id,
            'system',
            'Thanh toán dịch vụ Trọ Xinh thành công!',
            format('Đơn hàng #%s đã được xác nhận qua %s và kích hoạt tự động.', v_tx.order_code, COALESCE(NULLIF(p_gateway, ''), 'VietQR')),
            CASE
                WHEN v_service_type = 'k23' THEN '/chu-tro/quan-ly-goi-k23'
                WHEN v_service_type = 'boost' THEN '/chu-tro'
                ELSE '/chu-tro/quan-ly-goi'
            END,
            false,
            v_now
        );
    EXCEPTION WHEN OTHERS THEN
        NULL;
    END;

    RETURN jsonb_build_object(
        'success', true,
        'already_processed', false,
        'order_code', v_tx.order_code,
        'service_type', v_service_type,
        'activation', v_act
    );
END;
$$;

REVOKE ALL ON FUNCTION public.fulfill_paid_service_order(TEXT, BIGINT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fulfill_paid_service_order(TEXT, BIGINT, TEXT, TEXT) TO service_role;

