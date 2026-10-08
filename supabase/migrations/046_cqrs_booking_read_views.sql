-- ==============================================================================
-- TRỌ XINH — MIGRATION 046: CQRS DENORMALIZED READ VIEWS & METRICS (TRỤ CỘT 3)
-- Mục tiêu: Đưa tốc độ nạp lịch hẹn của Chủ trọ về < 10ms, triệt tiêu Nested Joins,
--           tổng hợp số liệu nguyên tử bằng Stored Procedure.
-- ==============================================================================

-- 1. Index hỗ trợ CQRS Query
CREATE INDEX IF NOT EXISTS idx_viewing_requests_cqrs_lookup
ON public.viewing_requests (owner_id, status, requested_date DESC);

-- 2. CQRS View dành riêng cho Chủ trọ (view_owner_bookings)
CREATE OR REPLACE VIEW public.view_owner_bookings AS
SELECT 
  vr.id,
  vr.room_id,
  COALESCE(r.title, r.name, 'Phòng trọ') AS room_title,
  COALESCE(r.price, 0) AS room_price,
  COALESCE(b.address, '') AS room_address,
  vr.renter_id,
  COALESCE(vr.renter_name, p.full_name, 'Khách thuê') AS renter_name,
  COALESCE(vr.contact_phone, vr.renter_phone, p.phone, '') AS renter_phone,
  COALESCE(p.avatar_url, '/images/user-avatar.jpg') AS renter_avatar,
  vr.owner_id,
  vr.requested_date,
  COALESCE(vr.requested_time, vr.time_slot, '') AS requested_time,
  vr.status,
  CASE 
    WHEN vr.status IN ('confirmed', 'approved') THEN 'Đã xác nhận'
    WHEN vr.status IN ('cancelled', 'rejected', 'cancelled_by_renter', 'cancelled_by_owner') THEN 'Đã hủy'
    WHEN vr.status = 'completed' THEN 'Đã hoàn thành'
    ELSE 'Chờ chủ trọ xác nhận'
  END AS display_status,
  CASE 
    WHEN vr.status IN ('confirmed', 'approved') THEN 'bg-emerald-100 text-emerald-800 border-emerald-200'
    WHEN vr.status IN ('cancelled', 'rejected', 'cancelled_by_renter', 'cancelled_by_owner') THEN 'bg-rose-100 text-rose-800 border-rose-200'
    WHEN vr.status = 'completed' THEN 'bg-purple-100 text-purple-800 border-purple-200'
    ELSE 'bg-amber-100 text-amber-800 border-amber-200'
  END AS status_badge_color,
  COALESCE(vr.message, vr.note, '') AS message,
  vr.owner_response_note,
  vr.created_at,
  (vr.requested_date = CURRENT_DATE) AS is_today,
  (vr.requested_date >= CURRENT_DATE AND vr.status IN ('pending', 'confirmed')) AS is_upcoming
FROM public.viewing_requests vr
LEFT JOIN public.rooms r ON vr.room_id = r.id
LEFT JOIN public.buildings b ON r.building_id = b.id
LEFT JOIN public.profiles p ON vr.renter_id = p.id;

-- Phân quyền đọc cho authenticated & anon
GRANT SELECT ON public.view_owner_bookings TO authenticated, anon;

-- 3. Stored Procedure nguyên tử tổng hợp số liệu Dashboard (get_owner_booking_metrics)
CREATE OR REPLACE FUNCTION public.get_owner_booking_metrics(p_owner_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_metrics JSONB;
BEGIN
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'pending', COUNT(*) FILTER (WHERE status = 'pending'),
    'confirmed', COUNT(*) FILTER (WHERE status IN ('confirmed', 'approved')),
    'cancelled', COUNT(*) FILTER (WHERE status IN ('cancelled', 'rejected')),
    'completed', COUNT(*) FILTER (WHERE status = 'completed'),
    'upcomingToday', COUNT(*) FILTER (WHERE requested_date = CURRENT_DATE AND status IN ('pending', 'confirmed'))
  ) INTO v_metrics
  FROM public.viewing_requests
  WHERE owner_id = p_owner_id;

  RETURN COALESCE(v_metrics, jsonb_build_object(
    'total', 0, 'pending', 0, 'confirmed', 0, 'cancelled', 0, 'completed', 0, 'upcomingToday', 0
  ));
END;
$$;

-- Phân quyền thực thi RPC
GRANT EXECUTE ON FUNCTION public.get_owner_booking_metrics(UUID) TO authenticated, anon;
