-- ==============================================================================
-- TRỌ XINH — MIGRATION 045: CHỐNG ĐẶT TRÙNG LỊCH VÀ KHÓA XUNG ĐỘT NGUYÊN TỬ (TRỤ CỘT 2)
-- Mục tiêu: Loại bỏ hoàn toàn 100% tình trạng Double-Booking bằng Partial Unique Index
--           và Stored Procedure Transaction nguyên tử book_viewing_slot_atomic
-- ==============================================================================

-- 1. Partial Unique Index: Bất khả xâm phạm về mặt toán học tại tầng lưu trữ
-- Chỉ các yêu cầu có trạng thái 'pending' hoặc 'confirmed' mới bị ràng buộc duy nhất theo (room_id, requested_date, requested_time).
-- Lịch đã hủy ('cancelled') hoặc đã xem xong ('completed') sẽ được tự động giải phóng slot.
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_viewing_slot 
ON public.viewing_requests (room_id, requested_date, requested_time) 
WHERE status IN ('pending', 'confirmed');

-- 2. Stored Procedure nguyên tử: book_viewing_slot_atomic
-- Kiểm tra xung đột, kiểm tra giới hạn chống bot spam (tối đa 5 lịch pending/user), và ghi nhận nguyên tử
CREATE OR REPLACE FUNCTION public.book_viewing_slot_atomic(
  p_room_id UUID,
  p_renter_id UUID,
  p_owner_id UUID,
  p_requested_date DATE,
  p_requested_time TEXT,
  p_contact_phone TEXT,
  p_message TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_conflict_count INT;
  v_user_pending_count INT;
  v_new_id UUID;
BEGIN
  -- 1. Anti-Hoarding: Giới hạn tối đa 5 lịch hẹn đang chờ xử lý cho 1 tài khoản khách thuê
  SELECT COUNT(*) INTO v_user_pending_count
  FROM public.viewing_requests
  WHERE renter_id = p_renter_id
    AND status = 'pending';

  IF v_user_pending_count >= 5 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'MAX_PENDING_LIMIT_REACHED',
      'message', 'Bạn đang có 5 lịch hẹn chờ xác nhận. Vui lòng chờ chủ trọ duyệt hoặc hủy bớt trước khi đặt thêm!'
    );
  END IF;

  -- 2. Kiểm tra va chạm khung giờ (Chỉ tính các lịch đang chờ hoặc đã duyệt)
  SELECT COUNT(*) INTO v_conflict_count
  FROM public.viewing_requests
  WHERE room_id = p_room_id
    AND requested_date = p_requested_date
    AND requested_time = p_requested_time
    AND status IN ('pending', 'confirmed');

  IF v_conflict_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'SLOT_ALREADY_BOOKED',
      'message', 'Khung giờ này vừa có người đặt trước. Vui lòng chọn khung giờ khác!'
    );
  END IF;

  -- 3. Thực hiện ghi nguyên tử
  INSERT INTO public.viewing_requests (
    room_id,
    renter_id,
    owner_id,
    requested_date,
    requested_time,
    contact_phone,
    message,
    status
  ) VALUES (
    p_room_id,
    p_renter_id,
    p_owner_id,
    p_requested_date,
    p_requested_time,
    p_contact_phone,
    p_message,
    'pending'
  )
  RETURNING id INTO v_new_id;

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', v_new_id,
    'message', 'Đặt lịch xem phòng thành công!'
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'SLOT_ALREADY_BOOKED',
      'message', 'Khung giờ này vừa có người đặt trước. Vui lòng chọn khung giờ khác!'
    );
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'SERVER_ERROR',
      'message', SQLERRM
    );
END;
$$;
