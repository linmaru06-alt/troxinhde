-- ==============================================================================
-- TRỌ XINH: ĐƠN NẠP VÍ XU 3 BƯỚC, ATOMIC WEBHOOK RPC & SIẾT CHẶT RLS VÍ XU
-- Migration: 050_wallet_topup_orders_and_secure_rls.sql
-- An toàn 100% Idempotent - Bảo toàn toàn bộ dữ liệu hiện có (Không DROP TABLE)
-- ==============================================================================

-- 1. MỞ RỘNG BẢNG TRANSACTIONS CHO ĐƠN NẠP VÍ XU (expires_at, metadata & trạng thái 'paid'/'cancelled')
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Nới lỏng CHECK constraint cũ (005_payments.sql từng thiếu 'paid' và 'cancelled')
ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_status_check;
ALTER TABLE public.transactions
    ADD CONSTRAINT transactions_status_check
    CHECK (status IN ('pending', 'paid', 'success', 'failed', 'cancelled', 'expired')) NOT VALID;

CREATE INDEX IF NOT EXISTS idx_transactions_wallet_pending_exp
    ON public.transactions (plan_id, status, expires_at)
    WHERE plan_id = 'wallet_topup' AND status = 'pending';

-- Không tự tạo bản ghi gói tháng user_subscriptions khi đơn nạp Ví Xu (plan_id = 'wallet_topup') chuyển sang paid
CREATE OR REPLACE FUNCTION public.fn_auto_activate_subscription_on_paid()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'paid' AND (OLD.status IS NULL OR OLD.status != 'paid') THEN
        NEW.paid_at := COALESCE(NEW.paid_at, now());
        NEW.activated_at := COALESCE(NEW.activated_at, now());

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
                is_boosted = true,
                boost_type = COALESCE(NEW.plan_id, 'vip'),
                boost_badge = 'Phòng Nổi Bật VIP'
            WHERE id = NEW.room_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. RÀNG BUỘC AN TOÀN CHO SỐ DƯ VÍ & CHỐNG CỘNG TRÙNG MÃ THAM CHIẾU NGÂN HÀNG
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_k23_wallets_non_negative'
    ) THEN
        ALTER TABLE public.k23_wallets
            ADD CONSTRAINT chk_k23_wallets_non_negative
            CHECK (balance_real_xu >= 0 AND balance_bonus_xu >= 0) NOT VALID;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_k23_wallet_tx_deposit_ref
    ON public.k23_wallet_transactions (reference_id)
    WHERE reference_id IS NOT NULL AND transaction_type = 'deposit';

-- 3. SIẾT CHẶT RLS CHO BẢNG VÍ XU & SỔ CÁI GIAO DỊCH XU
-- Chặn tuyệt đối client thường tự INSERT/UPDATE/DELETE số dư Xu thật
ALTER TABLE public.k23_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.k23_wallet_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "k23_wallets_all" ON public.k23_wallets;
DROP POLICY IF EXISTS "k23_wallets_owner_read" ON public.k23_wallets;
DROP POLICY IF EXISTS "k23_wallets_owner_select" ON public.k23_wallets;
CREATE POLICY "k23_wallets_owner_select" ON public.k23_wallets
    FOR SELECT USING (
        owner_id = (SELECT public.current_profile_id())
        OR (SELECT public.is_admin())
    );

DROP POLICY IF EXISTS "k23_wallet_transactions_all" ON public.k23_wallet_transactions;
DROP POLICY IF EXISTS "k23_wallet_transactions_owner_read" ON public.k23_wallet_transactions;
DROP POLICY IF EXISTS "k23_wallet_tx_owner_select" ON public.k23_wallet_transactions;
CREATE POLICY "k23_wallet_tx_owner_select" ON public.k23_wallet_transactions
    FOR SELECT USING (
        owner_id = (SELECT public.current_profile_id())
        OR (SELECT public.is_admin())
    );

-- 4. BẬT REALTIME CHO BẢNG K23_WALLETS & K23_WALLET_TRANSACTIONS
ALTER TABLE public.k23_wallets REPLICA IDENTITY FULL;
ALTER TABLE public.k23_wallet_transactions REPLICA IDENTITY FULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'k23_wallets'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.k23_wallets;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'k23_wallet_transactions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.k23_wallet_transactions;
    END IF;
END $$;

-- 5. CẬP NHẬT RPC TRA CỨU TRẠNG THÁI ĐƠN (Bổ sung expires_at & metadata cho Step 3)
CREATE OR REPLACE FUNCTION public.get_payment_status(p_order_code TEXT)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object(
    'status', t.status,
    'plan_id', t.plan_id,
    'amount', t.amount,
    'paid_at', t.paid_at,
    'activated_at', t.activated_at,
    'expires_at', t.expires_at,
    'metadata', t.metadata,
    'order_code', t.order_code,
    'payment_method', t.payment_method
  )
  FROM public.transactions t
  WHERE t.order_code = p_order_code
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_payment_status(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_payment_status(TEXT) TO anon, authenticated;

-- 6. RPC ATOMIC CỘNG XU TỪ WEBHOOK IPN (CHỈ SERVICE_ROLE ĐƯỢC PHÉP GỌI)
CREATE OR REPLACE FUNCTION public.credit_wallet_from_topup(
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
    v_wallet RECORD;
    v_real_xu BIGINT;
    v_bonus_xu BIGINT;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
    v_existing_ref UUID;
BEGIN
    -- Khóa dòng đơn hàng để chống race condition khi 2 webhook đến cùng lúc
    SELECT * INTO v_tx
    FROM public.transactions
    WHERE order_code = p_order_code
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'ORDER_NOT_FOUND');
    END IF;

    IF v_tx.user_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'MISSING_ORDER_OWNER');
    END IF;

    IF v_tx.status IN ('paid', 'success') THEN
        RETURN jsonb_build_object(
            'success', true,
            'already_processed', true,
            'order_code', p_order_code
        );
    END IF;

    IF p_reference_id IS NOT NULL AND btrim(p_reference_id) <> '' THEN
        SELECT id INTO v_existing_ref
        FROM public.k23_wallet_transactions
        WHERE reference_id = p_reference_id
          AND transaction_type = 'deposit'
        LIMIT 1;

        IF FOUND THEN
            RETURN jsonb_build_object(
                'success', true,
                'already_processed', true,
                'order_code', p_order_code,
                'reference_id', p_reference_id
            );
        END IF;
    END IF;

    IF p_paid_amount < v_tx.amount THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'INSUFFICIENT_AMOUNT',
            'expected_amount', v_tx.amount,
            'paid_amount', p_paid_amount
        );
    END IF;

    -- Tính Xu từ metadata đã khóa khi tạo đơn hoặc quy tắc bậc thang chuẩn
    v_real_xu := COALESCE((v_tx.metadata->>'real_xu')::BIGINT, FLOOR(v_tx.amount / 1000));
    v_bonus_xu := COALESCE(
        (v_tx.metadata->>'bonus_xu')::BIGINT,
        CASE
            WHEN v_tx.amount >= 2000000 THEN FLOOR(v_real_xu * 0.125)
            WHEN v_tx.amount >= 500000 THEN FLOOR(v_real_xu * 0.10)
            ELSE 0
        END
    );

    -- Cập nhật trạng thái đơn sang paid
    UPDATE public.transactions
    SET status = 'paid',
        trans_id = COALESCE(NULLIF(p_reference_id, ''), trans_id),
        idempotency_key = COALESCE(NULLIF(p_reference_id, ''), idempotency_key),
        paid_at = v_now,
        activated_at = v_now
    WHERE id = v_tx.id;

    -- Cộng Xu nguyên tử vào ví (khởi tạo nếu chưa có)
    INSERT INTO public.k23_wallets (owner_id, balance_real_xu, balance_bonus_xu, created_at, updated_at)
    VALUES (v_tx.user_id, v_real_xu, v_bonus_xu, v_now, v_now)
    ON CONFLICT (owner_id) DO UPDATE
    SET balance_real_xu = public.k23_wallets.balance_real_xu + EXCLUDED.balance_real_xu,
        balance_bonus_xu = public.k23_wallets.balance_bonus_xu + EXCLUDED.balance_bonus_xu,
        updated_at = v_now
    RETURNING * INTO v_wallet;

    -- Ghi sổ cái biến động Xu
    INSERT INTO public.k23_wallet_transactions (
        wallet_id,
        owner_id,
        amount_real_xu,
        amount_bonus_xu,
        transaction_type,
        reason,
        reference_id,
        created_at
    )
    VALUES (
        v_wallet.id,
        v_tx.user_id,
        v_real_xu,
        v_bonus_xu,
        'deposit',
        format(
            'Nạp %s Xu qua %s (Đơn #%s%s)',
            v_real_xu,
            COALESCE(NULLIF(p_gateway, ''), 'VietQR'),
            p_order_code,
            CASE WHEN v_bonus_xu > 0 THEN format(', tặng +%s Xu thưởng', v_bonus_xu) ELSE '' END
        ),
        NULLIF(p_reference_id, ''),
        v_now
    )
    ON CONFLICT DO NOTHING;

    -- Tạo thông báo in-app cho người dùng
    BEGIN
        INSERT INTO public.notifications (user_id, type, title, message, link, read, created_at)
        VALUES (
            v_tx.user_id,
            'system',
            'Nạp Trọ Xinh Xu thành công!',
            format(
                'Đơn #%s đã được đối soát. Ví của bạn vừa nhận +%s Xu thật%s.',
                p_order_code,
                v_real_xu,
                CASE WHEN v_bonus_xu > 0 THEN format(' và +%s Xu thưởng', v_bonus_xu) ELSE '' END
            ),
            '/vi-xu',
            false,
            v_now
        );
    EXCEPTION WHEN OTHERS THEN
        -- Bỏ qua nếu bảng notifications có schema khác
        NULL;
    END;

    RETURN jsonb_build_object(
        'success', true,
        'already_processed', false,
        'order_code', p_order_code,
        'wallet_id', v_wallet.id,
        'owner_id', v_tx.user_id,
        'real_xu', v_real_xu,
        'bonus_xu', v_bonus_xu,
        'total_xu', v_wallet.balance_real_xu + v_wallet.balance_bonus_xu
    );
END;
$$;

REVOKE ALL ON FUNCTION public.credit_wallet_from_topup(TEXT, BIGINT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.credit_wallet_from_topup(TEXT, BIGINT, TEXT, TEXT) TO service_role;

-- 7. RPC AN TOÀN CHI TIÊU XU (Ưu tiên trừ Xu thưởng trước, Xu thật sau)
-- Cho phép người dùng đã đăng nhập Firebase tự trừ Xu đúng số dư khi mua đẩy tin / gia hạn
CREATE OR REPLACE FUNCTION public.spend_wallet_xu(
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
    v_profile_id UUID := public.current_profile_id();
    v_wallet RECORD;
    v_deduct_bonus BIGINT := 0;
    v_deduct_real BIGINT := 0;
    v_total BIGINT := 0;
    v_now TIMESTAMPTZ := timezone('utc'::text, now());
BEGIN
    IF v_profile_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
    END IF;

    IF p_amount_xu IS NULL OR p_amount_xu <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_AMOUNT');
    END IF;

    SELECT * INTO v_wallet
    FROM public.k23_wallets
    WHERE owner_id = v_profile_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'WALLET_NOT_FOUND',
            'remaining_total', 0
        );
    END IF;

    v_total := COALESCE(v_wallet.balance_real_xu, 0) + COALESCE(v_wallet.balance_bonus_xu, 0);
    IF v_total < p_amount_xu THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'INSUFFICIENT_BALANCE',
            'remaining_total', v_total
        );
    END IF;

    v_deduct_bonus := LEAST(COALESCE(v_wallet.balance_bonus_xu, 0), p_amount_xu);
    v_deduct_real := p_amount_xu - v_deduct_bonus;

    UPDATE public.k23_wallets
    SET balance_bonus_xu = balance_bonus_xu - v_deduct_bonus,
        balance_real_xu = balance_real_xu - v_deduct_real,
        updated_at = v_now
    WHERE id = v_wallet.id;

    INSERT INTO public.k23_wallet_transactions (
        wallet_id,
        owner_id,
        amount_real_xu,
        amount_bonus_xu,
        transaction_type,
        reason,
        reference_id,
        created_at
    )
    VALUES (
        v_wallet.id,
        v_profile_id,
        -v_deduct_real,
        -v_deduct_bonus,
        'spend',
        COALESCE(NULLIF(p_reason, ''), 'Thanh toán dịch vụ Trọ Xinh'),
        p_reference_id,
        v_now
    );

    RETURN jsonb_build_object(
        'success', true,
        'deducted_bonus', v_deduct_bonus,
        'deducted_real', v_deduct_real,
        'remaining_total', v_total - p_amount_xu
    );
END;
$$;

REVOKE ALL ON FUNCTION public.spend_wallet_xu(BIGINT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.spend_wallet_xu(BIGINT, TEXT, TEXT) TO authenticated;

