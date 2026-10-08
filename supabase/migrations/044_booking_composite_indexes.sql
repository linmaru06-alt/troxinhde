-- ==============================================================================
-- TRỌ XINH — MIGRATION 044: COMPOSITE INDEXES CHO HỆ THỐNG ĐẶT LỊCH (TRỤ CỘT 1)
-- Mục tiêu: Tối ưu hóa truy vấn Index-Only Scan, giảm thiểu I/O đĩa xuống < 1ms
-- ==============================================================================

-- 1. Tối ưu truy vấn danh sách lịch hẹn của khách thuê theo thời gian tạo
CREATE INDEX IF NOT EXISTS idx_viewing_requests_renter_ordered 
ON public.viewing_requests (renter_id, created_at DESC);

-- 2. Tối ưu truy vấn lịch hẹn của chủ trọ theo trạng thái và thời gian tạo
CREATE INDEX IF NOT EXISTS idx_viewing_requests_owner_status_ordered 
ON public.viewing_requests (owner_id, status, created_at DESC);

-- 3. Tối ưu tìm kiếm slot trống theo phòng và khung giờ
CREATE INDEX IF NOT EXISTS idx_viewing_requests_room_slot 
ON public.viewing_requests (room_id, requested_date, requested_time, status);

-- 4. Tối ưu lọc theo ngày hẹn và giờ hẹn
CREATE INDEX IF NOT EXISTS idx_viewing_requests_date_time 
ON public.viewing_requests (requested_date, requested_time);

-- 5. Bổ sung index cho room_id trên bảng viewing_requests nếu chưa có
CREATE INDEX IF NOT EXISTS idx_viewing_requests_room_id 
ON public.viewing_requests (room_id);
