-- ==============================================================================
-- MIGRATION 020: NÂNG CẤP HỆ THỐNG BÁO CÁO VI PHẠM & RÀNG BUỘC TOÀN VẸN
-- ==============================================================================
-- 1. Đối tượng báo cáo: tin_dang, nguoi_dung, tin_nhan
-- 2. Mã lý do: lua_dao, hang_cam, sai_mo_ta, spam, khong_phu_hop, khac
-- 3. Mã trạng thái: moi, dang_xu_ly, da_xu_ly, bac_bo
-- 4. Ràng buộc: Mỗi người chỉ báo cáo một đối tượng một lần
-- ==============================================================================

-- 1. Bổ sung các cột cần thiết nếu chưa có
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS target_owner_id UUID;
ALTER TABLE public.reports ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 2. Đảm bảo ràng buộc duy nhất (Unique Index): Mỗi người chỉ báo cáo 1 đối tượng 1 lần
CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_unique_reporter_target 
ON public.reports (reporter_id, target_type, target_id);

-- 3. Cập nhật CHECK constraint cho trạng thái (status)
ALTER TABLE public.reports DROP CONSTRAINT IF EXISTS reports_status_check;
ALTER TABLE public.reports ADD CONSTRAINT reports_status_check 
CHECK (status IN ('moi', 'dang_xu_ly', 'da_xu_ly', 'bac_bo', 'pending', 'resolved', 'dismissed'));

-- 4. Trigger tự động cập nhật updated_at
CREATE OR REPLACE FUNCTION public.handle_report_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_reports_updated_at ON public.reports;
CREATE TRIGGER trg_reports_updated_at
  BEFORE UPDATE ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_report_updated_at();

-- 5. RLS Policies
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own reports" ON public.reports;
CREATE POLICY "Users can insert own reports"
  ON public.reports FOR INSERT
  WITH CHECK (
    reporter_id IS NULL OR reporter_id = public.current_profile_id()
  );

DROP POLICY IF EXISTS "Admins can view and manage all reports" ON public.reports;
CREATE POLICY "Admins can view and manage all reports"
  ON public.reports FOR ALL
  USING (
    public.is_admin() OR reporter_id = public.current_profile_id()
  );
