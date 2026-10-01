-- ==============================================================================
-- TRỌ XINH — MIGRATION 038: INTER-ACCOUNT REALTIME CONNECTIVITY
-- Kết nối trực tiếp đa người dùng: Lịch hẹn xem phòng, Báo cáo vi phạm, Chuông thông báo
-- An toàn 100%: Non-destructive, không làm mất dữ liệu hiện có
-- ==============================================================================

-- 1. ĐẢM BẢO DEFAULT UUID VÀ CỘT HỖ TRỢ CHO CÁC BẢNG TƯƠNG TÁC
ALTER TABLE public.viewing_requests ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.reports ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.notifications ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Bổ sung an toàn các cột hỗ trợ UI Realtime nếu bảng trên Supabase chưa có
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS body text;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS cta_url text;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS cta_label text;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS priority text DEFAULT 'normal';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS is_read boolean DEFAULT false;

ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS target_owner_id uuid;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS content_snapshot text;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS admin_notes text;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS resolved_by uuid;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS resolved_at timestamptz;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS auto_moderated boolean DEFAULT false;

-- 2. CẤU HÌNH RLS CHO BẢNG VIEWING_REQUESTS (ĐẶT LỊCH XEM PHÒNG)
ALTER TABLE public.viewing_requests ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "viewing_requests_public_select" ON public.viewing_requests;
  DROP POLICY IF EXISTS "viewing_requests_public_insert" ON public.viewing_requests;
  DROP POLICY IF EXISTS "viewing_requests_public_update" ON public.viewing_requests;
  DROP POLICY IF EXISTS "viewing_requests_admin_all" ON public.viewing_requests;
END $$;

CREATE POLICY "viewing_requests_public_select"
ON public.viewing_requests
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "viewing_requests_public_insert"
ON public.viewing_requests
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "viewing_requests_public_update"
ON public.viewing_requests
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 3. CẤU HÌNH RLS CHO BẢNG REPORTS (BÁO CÁO VI PHẠM)
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "reports_public_select" ON public.reports;
  DROP POLICY IF EXISTS "reports_public_insert" ON public.reports;
  DROP POLICY IF EXISTS "reports_admin_update" ON public.reports;
END $$;

CREATE POLICY "reports_public_select"
ON public.reports
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "reports_public_insert"
ON public.reports
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "reports_admin_update"
ON public.reports
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 4. CẤU HÌNH RLS CHO BẢNG NOTIFICATIONS (THÔNG BÁO)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "notifications_public_select" ON public.notifications;
  DROP POLICY IF EXISTS "notifications_public_insert" ON public.notifications;
  DROP POLICY IF EXISTS "notifications_public_update" ON public.notifications;
END $$;

CREATE POLICY "notifications_public_select"
ON public.notifications
FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "notifications_public_insert"
ON public.notifications
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "notifications_public_update"
ON public.notifications
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 5. BẬT REPLICA IDENTITY FULL ĐỂ REALTIME NHẬN ĐẦY ĐỦ DỮ LIỆU CŨ VÀ MỚI
ALTER TABLE public.viewing_requests REPLICA IDENTITY FULL;
ALTER TABLE public.reports REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.owner_applications REPLICA IDENTITY FULL;

-- 6. THÊM CÁC BẢNG VÀO PUBLICATION SUPABASE_REALTIME
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.viewing_requests;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.reports;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.owner_applications;
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;
