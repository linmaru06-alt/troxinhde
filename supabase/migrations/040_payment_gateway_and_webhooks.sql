-- ==============================================================================
-- MIGRATION 040: CỔNG THANH TOÁN DOANH NGHIỆP PAYOS & MOMO WEBHOOK AUTOMATION
-- ==============================================================================

-- 1. BẢNG TRANSACTIONS: ĐẢM BẢO CẤU TRÚC HỢP NHẤT
-- Cho phép user_id là NULL để hỗ trợ khách vãng lai khởi tạo đơn trước khi gắn tài khoản
ALTER TABLE public.transactions ALTER COLUMN user_id DROP NOT NULL;

-- Bổ sung các trường tra soát của PayOS & MoMo Gateway
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS trans_id TEXT;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'vietqr';
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- Đảm bảo index tra cứu nhanh theo order_code
CREATE INDEX IF NOT EXISTS idx_transactions_order_code ON public.transactions(order_code);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON public.transactions(status);

-- 2. CẬP NHẬT RLS POLICIES CHO TRANSACTIONS (BẢO MẬT & CHỐNG HACK TIỀN)
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- 2.1. Quyền đọc giao dịch (SELECT): Chủ sở hữu, Admin hoặc đơn vãng lai
DROP POLICY IF EXISTS "transactions_select_own" ON public.transactions;
DROP POLICY IF EXISTS "Users view own transactions" ON public.transactions;
CREATE POLICY "transactions_select_own" ON public.transactions
  FOR SELECT USING (
    user_id = (SELECT public.current_profile_id())
    OR (SELECT public.is_admin())
    OR user_id IS NULL
  );

-- 2.2. Quyền tạo giao dịch mới (INSERT): Chỉ cho phép tạo ở trạng thái 'pending'
DROP POLICY IF EXISTS "transactions_insert_pending" ON public.transactions;
DROP POLICY IF EXISTS "Users insert pending transaction" ON public.transactions;
CREATE POLICY "transactions_insert_pending" ON public.transactions
  FOR INSERT WITH CHECK (
    (user_id = (SELECT public.current_profile_id()) OR (SELECT public.is_admin()) OR user_id IS NULL)
    AND status = 'pending'
  );

-- 2.3. Quyền cập nhật giao dịch (UPDATE): TUYỆT ĐỐI CHẶN CLIENT THƯỜNG
-- Chỉ Admin hoặc Edge Functions chạy qua Service Role (Webhook) mới được đổi sang 'paid'/'success'
DROP POLICY IF EXISTS "transactions_update_admin" ON public.transactions;
DROP POLICY IF EXISTS "Only admin or service role can update transactions" ON public.transactions;
CREATE POLICY "transactions_update_admin" ON public.transactions
  FOR UPDATE
  USING ((SELECT public.is_admin()))
  WITH CHECK ((SELECT public.is_admin()));

-- 3. RPC AN TOÀN TRA CỨU TRẠNG THÁI GIAO DỊCH REAL-TIME CHO POLLING CLIENT
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
    'order_code', t.order_code,
    'payment_method', t.payment_method
  )
  FROM public.transactions t
  WHERE t.order_code = p_order_code
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_payment_status(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_payment_status(TEXT) TO anon, authenticated;

-- 4. BẬT REALTIME CHO BẢNG TRANSACTIONS ĐỂ CLIENT NHẬN TÍN HIỆU NGAY
ALTER TABLE public.transactions REPLICA IDENTITY FULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
          AND schemaname = 'public' 
          AND tablename = 'transactions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
    END IF;
END $$;
