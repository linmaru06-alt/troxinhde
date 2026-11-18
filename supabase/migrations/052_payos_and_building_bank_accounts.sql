-- ==============================================================================
-- TRỌ XINH: TỐI ƯU PAYOS METADATA INDEX, TÀI KHOẢN NGÂN HÀNG TÒA NHÀ & CỔNG KHÁCH THUÊ
-- Migration: 052_payos_and_building_bank_accounts.sql
-- An toàn 100% Idempotent - Bảo toàn toàn bộ dữ liệu hiện có (Không DROP TABLE)
-- ==============================================================================

-- 1. BỔ SUNG CỘT TÀI KHOẢN NGÂN HÀNG NHẬN TIỀN PHÒNG TRÊN BẢNG BUILDINGS
ALTER TABLE public.buildings ADD COLUMN IF NOT EXISTS bank_id TEXT DEFAULT 'TCB';
ALTER TABLE public.buildings ADD COLUMN IF NOT EXISTS bank_account_no TEXT;
ALTER TABLE public.buildings ADD COLUMN IF NOT EXISTS bank_account_name TEXT;

-- 2. CHỈ MỤC TĂNG TỐC TRA CỨU ĐƠN PAYOS THEO MÃ SỐ NGUYÊN (payos_order_code)
CREATE INDEX IF NOT EXISTS idx_transactions_payos_order_code
    ON public.transactions ((metadata->>'payos_order_code'))
    WHERE metadata ? 'payos_order_code';

-- 3. BẬT REALTIME CHO BẢNG HÓA ĐƠN TIỀN PHÒNG (invoices) ĐỂ CỔNG KHÁCH THUÊ TỰ NHẢY "ĐÃ THANH TOÁN"
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'invoices'
    ) THEN
        ALTER TABLE public.invoices REPLICA IDENTITY FULL;

        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime'
              AND schemaname = 'public'
              AND tablename = 'invoices'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.invoices;
        END IF;
    END IF;
END $$;

-- 4. RPC TRA CỨU AN TOÀN HÓA ĐƠN CHO CỔNG KHÁCH THUÊ (/cong-khach-thue)
-- Chỉ trả về hóa đơn khớp chính xác SĐT khách thuê (tối thiểu 8 chữ số) hoặc khớp chính xác mã hóa đơn
CREATE OR REPLACE FUNCTION public.lookup_tenant_invoices(p_query TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_clean TEXT := btrim(COALESCE(p_query, ''));
    v_digits TEXT := regexp_replace(v_clean, '[^0-9]', '', 'g');
    v_result JSONB;
BEGIN
    IF length(v_clean) < 4 THEN
        RETURN '[]'::jsonb;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'invoices'
    ) THEN
        RETURN '[]'::jsonb;
    END IF;

    SELECT COALESCE(jsonb_agg(row_data), '[]'::jsonb)
    INTO v_result
    FROM (
        SELECT jsonb_build_object(
            'id', i.id,
            'room_id', i.room_id,
            'tenant_id', i.tenant_id,
            'owner_id', i.owner_id,
            'billing_month', i.billing_month,
            'billing_year', i.billing_year,
            'invoice_code', i.invoice_code,
            'total_amount', i.total_amount,
            'paid_amount', COALESCE(i.paid_amount, 0),
            'status', i.status,
            'due_date', i.due_date,
            'paid_at', i.paid_at,
            'payment_method', i.payment_method,
            'notes', i.notes,
            'created_at', i.created_at,
            'room', CASE WHEN r.id IS NOT NULL THEN jsonb_build_object(
                'id', r.id,
                'room_number', r.room_number,
                'title', r.title,
                'building_id', r.building_id,
                'price', r.price
            ) ELSE NULL END,
            'tenant', CASE WHEN tn.id IS NOT NULL THEN jsonb_build_object(
                'id', tn.id,
                'full_name', tn.full_name,
                'phone', tn.phone
            ) ELSE NULL END,
            'building_info', CASE WHEN b.id IS NOT NULL THEN jsonb_build_object(
                'id', b.id,
                'name', b.name,
                'address', b.address,
                'bank_id', b.bank_id,
                'bank_account_no', b.bank_account_no,
                'bank_account_name', b.bank_account_name
            ) ELSE NULL END,
            'items', COALESCE(
                (
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'id', it.id,
                            'invoice_id', it.invoice_id,
                            'item_type', it.item_type,
                            'description', it.description,
                            'quantity', it.quantity,
                            'unit_price', it.unit_price,
                            'amount', it.amount
                        )
                    )
                    FROM public.invoice_items it
                    WHERE it.invoice_id = i.id
                ),
                '[]'::jsonb
            )
        ) AS row_data
        FROM public.invoices i
        LEFT JOIN public.rooms r ON r.id = i.room_id
        LEFT JOIN public.buildings b ON b.id = r.building_id
        LEFT JOIN public.tenants tn ON tn.id = i.tenant_id
        WHERE
            upper(i.invoice_code) = upper(v_clean)
            OR (
                length(v_digits) >= 8
                AND regexp_replace(COALESCE(tn.phone, ''), '[^0-9]', '', 'g') = v_digits
            )
        ORDER BY i.billing_year DESC, i.billing_month DESC, i.created_at DESC
        LIMIT 24
    ) sub;

    RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.lookup_tenant_invoices(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.lookup_tenant_invoices(TEXT) TO anon, authenticated;

