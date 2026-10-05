-- ==============================================================================
-- TRỌ XINH — MIGRATION 047: MÁY TRẠNG THÁI HỮU HẠN & AUDIT TRAIL (TRỤ CỘT 4)
-- Mục tiêu: Quản lý vòng đời lịch hẹn chặt chẽ (FSM), ghi vết bất biến (Audit Trail),
--           tự động sinh thông báo nguyên tử bằng Database Outbox Trigger.
-- ==============================================================================

-- 1. Bảng lưu vết lịch sử chuyển đổi trạng thái (Append-Only Audit Log)
CREATE TABLE IF NOT EXISTS public.booking_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.viewing_requests(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  actor_id UUID,
  actor_role TEXT NOT NULL CHECK (actor_role IN ('renter', 'owner', 'system', 'admin')),
  actor_name TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index tăng tốc truy vấn lịch sử theo từng lịch hẹn
CREATE INDEX IF NOT EXISTS idx_booking_audit_booking_id 
ON public.booking_audit_logs (booking_id, created_at ASC);

-- Kích hoạt RLS bảo vệ bảng Audit Log
ALTER TABLE public.booking_audit_logs ENABLE ROW LEVEL SECURITY;

-- Cho phép đọc lịch sử audit công khai hoặc người liên quan
CREATE POLICY "booking_audit_logs_read_policy" 
ON public.booking_audit_logs 
FOR SELECT 
USING (true);

-- Cấm client sửa hoặc xóa bản ghi nhật ký (Append-Only)
CREATE POLICY "booking_audit_logs_insert_policy" 
ON public.booking_audit_logs 
FOR INSERT 
WITH CHECK (true);

-- 2. Stored Procedure thực thi chuyển trạng thái FSM nguyên tử
CREATE OR REPLACE FUNCTION public.transition_booking_status(
  p_booking_id UUID,
  p_next_status TEXT,
  p_actor_id UUID,
  p_actor_role TEXT,
  p_actor_name TEXT DEFAULT NULL,
  p_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_status TEXT;
  v_is_valid BOOLEAN := FALSE;
BEGIN
  -- Lấy trạng thái hiện tại của lịch hẹn
  SELECT status INTO v_current_status
  FROM public.viewing_requests
  WHERE id = p_booking_id;

  IF v_current_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Không tìm thấy lịch hẹn');
  END IF;

  -- Chuẩn hóa trạng thái
  v_current_status := lower(trim(v_current_status));
  p_next_status := lower(trim(p_next_status));

  -- Bảng ma trận chuyển trạng thái hợp lệ (FSM Validation Matrix)
  IF v_current_status = 'pending' AND p_next_status IN ('confirmed', 'rescheduled', 'cancelled', 'cancelled_by_renter', 'cancelled_by_owner', 'expired') THEN
    v_is_valid := TRUE;
  ELSIF v_current_status = 'rescheduled' AND p_next_status IN ('confirmed', 'cancelled', 'cancelled_by_renter') THEN
    v_is_valid := TRUE;
  ELSIF v_current_status = 'confirmed' AND p_next_status IN ('completed', 'cancelled', 'cancelled_by_renter', 'cancelled_by_owner') THEN
    v_is_valid := TRUE;
  ELSIF v_current_status = p_next_status THEN
    v_is_valid := TRUE;
  END IF;

  IF NOT v_is_valid THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_STATE_TRANSITION',
      'message', format('Không thể chuyển trạng thái từ "%s" sang "%s"', v_current_status, p_next_status)
    );
  END IF;

  -- 1. Cập nhật bảng chính
  UPDATE public.viewing_requests
  SET 
    status = p_next_status,
    owner_response_note = COALESCE(p_note, owner_response_note),
    updated_at = NOW()
  WHERE id = p_booking_id;

  -- 2. Ghi nhật ký sự kiện bất biến vào audit log
  INSERT INTO public.booking_audit_logs (
    booking_id,
    from_status,
    to_status,
    actor_id,
    actor_role,
    actor_name,
    note
  ) VALUES (
    p_booking_id,
    v_current_status,
    p_next_status,
    p_actor_id,
    p_actor_role,
    p_actor_name,
    p_note
  );

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', p_booking_id,
    'from_status', v_current_status,
    'to_status', p_next_status
  );
END;
$$;

-- Phân quyền thực thi RPC
GRANT EXECUTE ON FUNCTION public.transition_booking_status(UUID, TEXT, UUID, TEXT, TEXT, TEXT) TO authenticated, anon;

-- 3. Database Outbox Trigger: Tự động bắn thông báo khi có Audit Log mới
CREATE OR REPLACE FUNCTION public.trg_booking_outbox_notify_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_booking RECORD;
  v_target_user_id UUID;
  v_title TEXT;
  v_body TEXT;
BEGIN
  -- Lấy thông tin lịch hẹn và phòng
  SELECT vr.*, COALESCE(r.title, r.name, 'phòng trọ') AS room_title
  INTO v_booking
  FROM public.viewing_requests vr
  LEFT JOIN public.rooms r ON vr.room_id = r.id
  WHERE vr.id = NEW.booking_id;

  IF v_booking.id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Xác định người nhận và nội dung thông báo
  IF NEW.actor_role IN ('owner', 'system') THEN
    -- Gửi cho khách thuê
    v_target_user_id := v_booking.renter_id;
    IF NEW.to_status = 'confirmed' THEN
      v_title := 'Lịch hẹn xem phòng đã được xác nhận! ✅';
      v_body := format('Chủ nhà đã đồng ý lịch xem phòng "%s" vào %s (%s).', v_booking.room_title, v_booking.requested_date, v_booking.requested_time);
    ELSIF NEW.to_status LIKE 'cancelled%' THEN
      v_title := 'Lịch hẹn xem phòng đã bị hủy ❌';
      v_body := format('Lịch xem phòng "%s" đã bị hủy. Lời nhắn: %s', v_booking.room_title, COALESCE(NEW.note, 'Không có lời nhắn'));
    END IF;
  ELSIF NEW.actor_role = 'renter' THEN
    -- Gửi cho chủ trọ
    v_target_user_id := v_booking.owner_id;
    IF NEW.to_status LIKE 'cancelled%' THEN
      v_title := 'Khách thuê đã hủy lịch xem phòng ⚠️';
      v_body := format('Khách thuê đã hủy lịch xem phòng "%s" vào %s (%s). Lý do: %s', v_booking.room_title, v_booking.requested_date, v_booking.requested_time, COALESCE(NEW.note, 'Bận đột xuất'));
    END IF;
  END IF;

  -- Chèn thông báo nếu có người nhận hợp lệ
  IF v_target_user_id IS NOT NULL AND v_title IS NOT NULL THEN
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      body,
      cta_url,
      cta_label,
      is_read
    ) VALUES (
      v_target_user_id,
      'booking_status_change',
      v_title,
      v_body,
      '/lich-hen',
      'Xem chi tiết',
      FALSE
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_booking_outbox_notify ON public.booking_audit_logs;
CREATE TRIGGER trg_booking_outbox_notify
AFTER INSERT ON public.booking_audit_logs
FOR EACH ROW
EXECUTE FUNCTION public.trg_booking_outbox_notify_fn();
