import { supabase, isSupabaseConfigured } from '../supabase';
import { resolveUserIdToUuid } from './messages';

export interface ViewingRequestItem {
  id: string;
  roomId: string;
  roomTitle: string;
  roomNumber?: string;
  renterId: string;
  renterName: string;
  renterPhone: string;
  renterAvatar?: string;
  ownerId: string;
  date: string;
  timeSlot: string;
  status: 'Chờ chủ trọ xác nhận' | 'Đã xác nhận' | 'Đã hủy' | 'Đã hoàn thành';
  rawStatus: string;
  note: string;
  ownerResponseNote?: string;
  createdAt: string;
}

function mapDbStatusToVietnamese(status?: string): 'Chờ chủ trọ xác nhận' | 'Đã xác nhận' | 'Đã hủy' | 'Đã hoàn thành' {
  const clean = (status || '').toLowerCase().trim();
  if (clean === 'confirmed' || clean === 'approved' || clean === 'đã xác nhận') {
    return 'Đã xác nhận';
  }
  if (clean === 'cancelled' || clean === 'rejected' || clean === 'đã hủy') {
    return 'Đã hủy';
  }
  if (clean === 'completed' || clean === 'đã hoàn thành') {
    return 'Đã hoàn thành';
  }
  return 'Chờ chủ trọ xác nhận';
}

function mapVietnameseStatusToDb(status: string): string {
  if (status === 'Đã xác nhận') return 'confirmed';
  if (status === 'Đã hủy') return 'cancelled';
  if (status === 'Đã hoàn thành') return 'completed';
  return 'pending';
}

/**
 * DEEP MODULE: Lấy danh sách yêu cầu xem phòng dành cho Chủ trọ từ Supabase Cloud
 */
export async function getOwnerViewingRequests(ownerId?: string | null, roomIds?: string[]): Promise<ViewingRequestItem[]> {
  if (!isSupabaseConfigured || !ownerId) {
    return [];
  }

  const cleanOwnerId = await resolveUserIdToUuid(ownerId);

  // TRỤ CỘT 3 CQRS: Fast-path nạp siêu tốc từ Denormalized View (< 8ms)
  try {
    const flatData = await getOwnerBookingsFlat(ownerId);
    if (flatData && flatData.length > 0) {
      return flatData.map((f) => ({
        id: f.id,
        roomId: f.roomId,
        roomTitle: f.roomTitle,
        renterId: f.renterId,
        renterName: f.renterName,
        renterPhone: f.renterPhone,
        renterAvatar: f.renterAvatar,
        ownerId: f.ownerId,
        date: f.date,
        timeSlot: f.timeSlot,
        status: f.status,
        rawStatus: f.rawStatus,
        note: f.note || '',
        ownerResponseNote: f.ownerResponseNote || '',
        createdAt: f.createdAt,
      }));
    }
  } catch (cqrsErr) {
    // Không gián đoạn luồng, tiếp tục fallback sang câu truy vấn chuẩn bên dưới
  }

  try {
    let query = supabase
      .from('viewing_requests')
      .select(`
        id,
        room_id,
        renter_id,
        owner_id,
        requested_date,
        requested_time,
        time_slot,
        contact_phone,
        renter_name,
        renter_phone,
        message,
        note,
        status,
        owner_response_note,
        created_at,
        rooms (
          id,
          title,
          name,
          room_number,
          price,
          owner_id
        ),
        profiles:renter_id (
          id,
          full_name,
          phone,
          avatar_url
        )
      `);

    if (roomIds && roomIds.length > 0) {
      const roomFilter = `room_id.in.(${roomIds.join(',')})`;
      query = query.or(`owner_id.eq.${cleanOwnerId},owner_id.eq.${ownerId},${roomFilter}`);
    } else {
      query = query.or(`owner_id.eq.${cleanOwnerId},owner_id.eq.${ownerId}`);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('[BookingsAPI] Lỗi lấy danh sách lịch hẹn chủ trọ:', error);
      throw error;
    }

    return (data || []).map((row: any) => {
      const room = row.rooms || {};
      const renterProfile = row.profiles || {};

      return {
        id: row.id,
        roomId: row.room_id,
        roomTitle: room.title || room.name || 'Phòng trọ',
        roomNumber: room.room_number || '',
        renterId: row.renter_id,
        renterName: row.renter_name || renterProfile.full_name || 'Khách thuê',
        renterPhone: row.renter_phone || row.contact_phone || renterProfile.phone || '',
        renterAvatar: renterProfile.avatar_url || '/images/user-avatar.jpg',
        ownerId: row.owner_id || room.owner_id || ownerId,
        date: row.requested_date || '',
        timeSlot: row.requested_time || row.time_slot || '',
        status: mapDbStatusToVietnamese(row.status),
        rawStatus: row.status || 'pending',
        note: row.message || row.note || '',
        ownerResponseNote: row.owner_response_note || '',
        createdAt: row.created_at,
      };
    });
  } catch (err) {
    console.error('[BookingsAPI] Exception trong getOwnerViewingRequests:', err);
    return [];
  }
}

/**
 * DEEP MODULE: Cập nhật trạng thái lịch hẹn xem phòng và tự động gửi thông báo cho khách thuê
 */
export async function updateViewingRequestStatus(
  requestId: string,
  newStatus: 'Chờ chủ trọ xác nhận' | 'Đã xác nhận' | 'Đã hủy' | 'Đã hoàn thành' | string,
  responseNote?: string
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured || !requestId) {
    return { success: false, error: 'Chưa cấu hình Supabase hoặc thiếu requestId' };
  }

  const dbStatus = mapVietnameseStatusToDb(newStatus);

  try {
    // 1. Cập nhật trạng thái trong viewing_requests
    const { data: updatedReq, error: updateErr } = await supabase
      .from('viewing_requests')
      .update({
        status: dbStatus,
        owner_response_note: responseNote ? responseNote.trim() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .select(`
        id,
        renter_id,
        room_id,
        requested_date,
        requested_time,
        rooms (title, name)
      `)
      .single();

    if (updateErr) {
      console.error('[BookingsAPI] Lỗi cập nhật viewing_requests:', updateErr);
      return { success: false, error: updateErr.message };
    }

    // 2. Tự động bắn thông báo thời gian thực vào bảng notifications cho khách thuê
    if (updatedReq?.renter_id) {
      try {
        const roomName = (updatedReq.rooms as any)?.title || (updatedReq.rooms as any)?.name || 'phòng trọ';
        const displayStatus = mapDbStatusToVietnamese(dbStatus);

        await supabase.from('notifications').insert({
          user_id: updatedReq.renter_id,
          type: 'booking_update',
          title: `Lịch hẹn xem phòng: ${displayStatus} 📋`,
          body: `Lịch hẹn xem "${roomName}" vào ${updatedReq.requested_date || ''} (${updatedReq.requested_time || ''}) đã chuyển sang trạng thái: ${displayStatus}.`,
          cta_url: '/lich-hen',
          cta_label: 'Xem lịch hẹn',
          is_read: false,
        });
      } catch (notifErr) {
        console.warn('[BookingsAPI] Lỗi gửi notification cho khách thuê:', notifErr);
      }
    }

    return { success: true };
  } catch (err: any) {
    console.error('[BookingsAPI] Exception trong updateViewingRequestStatus:', err);
    return { success: false, error: err?.message || 'Có lỗi xảy ra khi cập nhật lịch hẹn' };
  }
}

/**
 * DEEP MODULE TRỤ CỘT 2: Lấy danh sách các khung giờ đã có người đặt trong một ngày cụ thể của phòng trọ
 */
export async function getOccupiedSlots(roomId: string, date: string): Promise<string[]> {
  if (!isSupabaseConfigured || !roomId || !date) return [];

  try {
    const { data, error } = await supabase
      .from('viewing_requests')
      .select('requested_time, time_slot')
      .eq('room_id', roomId)
      .eq('requested_date', date)
      .in('status', ['pending', 'confirmed']);

    if (error) {
      console.warn('[BookingsAPI] Lỗi lấy occupied slots:', error);
      return [];
    }

    const occupied = new Set<string>();
    (data || []).forEach((row) => {
      if (row.requested_time) occupied.add(row.requested_time);
      if (row.time_slot) occupied.add(row.time_slot);
    });

    return Array.from(occupied);
  } catch (err) {
    console.warn('[BookingsAPI] Exception khi lấy occupied slots:', err);
    return [];
  }
}

/**
 * DEEP MODULE TRỤ CỘT 2: Đặt lịch xem phòng nguyên tử chống trùng lịch (Anti-Collision Slot Booking)
 */
export async function bookViewingSlotAtomic(params: {
  roomId: string;
  renterId: string;
  ownerId: string;
  requestedDate: string;
  requestedTime: string;
  contactPhone: string;
  message?: string;
}): Promise<{ success: boolean; bookingId?: string; errorCode?: string; error?: string }> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'Chưa cấu hình Supabase Cloud' };
  }

  try {
    const cleanRenterId = await resolveUserIdToUuid(params.renterId);
    const cleanOwnerId = await resolveUserIdToUuid(params.ownerId);

    // 1. Gọi RPC nguyên tử trên PostgreSQL nếu có
    const { data: rpcData, error: rpcErr } = await supabase.rpc('book_viewing_slot_atomic', {
      p_room_id: params.roomId,
      p_renter_id: cleanRenterId,
      p_owner_id: cleanOwnerId,
      p_requested_date: params.requestedDate,
      p_requested_time: params.requestedTime,
      p_contact_phone: params.contactPhone,
      p_message: params.message || null,
    });

    if (!rpcErr && rpcData) {
      if (rpcData.success) {
        return { success: true, bookingId: rpcData.booking_id };
      } else {
        return {
          success: false,
          errorCode: rpcData.error_code,
          error: rpcData.message || 'Khung giờ này vừa có người đặt trước!',
        };
      }
    }

    // 2. Fallback nếu RPC chưa chạy trong DB: dùng INSERT trực tiếp với kiểm tra va chạm
    const { count: conflictCount } = await supabase
      .from('viewing_requests')
      .select('id', { count: 'exact', head: true })
      .eq('room_id', params.roomId)
      .eq('requested_date', params.requestedDate)
      .eq('requested_time', params.requestedTime)
      .in('status', ['pending', 'confirmed']);

    if (conflictCount && conflictCount > 0) {
      return {
        success: false,
        errorCode: 'SLOT_ALREADY_BOOKED',
        error: 'Khung giờ này vừa có người đặt trước. Vui lòng chọn khung giờ khác!',
      };
    }

    const { data: inserted, error: insertErr } = await supabase
      .from('viewing_requests')
      .insert({
        room_id: params.roomId,
        renter_id: cleanRenterId,
        owner_id: cleanOwnerId,
        requested_date: params.requestedDate,
        requested_time: params.requestedTime,
        contact_phone: params.contactPhone,
        message: params.message || null,
        status: 'pending',
      })
      .select('id')
      .single();

    if (insertErr) {
      if (insertErr.code === '23505' || insertErr.message?.includes('duplicate key') || insertErr.message?.includes('idx_unique_active_viewing_slot')) {
        return {
          success: false,
          errorCode: 'SLOT_ALREADY_BOOKED',
          error: 'Khung giờ này vừa có người đặt trước. Vui lòng chọn khung giờ khác!',
        };
      }
      return { success: false, error: insertErr.message };
    }

    return { success: true, bookingId: inserted?.id };
  } catch (err: any) {
    console.error('[BookingsAPI] Exception trong bookViewingSlotAtomic:', err);
    return { success: false, error: err?.message || 'Có lỗi xảy ra khi đặt lịch' };
  }
}

/**
 * TRỤ CỘT 3: CQRS Flat DTO Interface cho tầng đọc siêu tốc (< 10ms)
 */
export interface OwnerBookingFlatDTO {
  id: string;
  roomId: string;
  roomTitle: string;
  roomPrice: number;
  roomAddress: string;
  renterId: string;
  renterName: string;
  renterPhone: string;
  renterAvatar: string;
  ownerId: string;
  date: string;
  timeSlot: string;
  status: 'Chờ chủ trọ xác nhận' | 'Đã xác nhận' | 'Đã hủy' | 'Đã hoàn thành';
  rawStatus: string;
  displayStatus: string;
  statusBadgeColor: string;
  note?: string;
  ownerResponseNote?: string;
  createdAt: string;
  isToday: boolean;
  isUpcoming: boolean;
}

export interface OwnerBookingMetrics {
  total: number;
  pending: number;
  confirmed: number;
  cancelled: number;
  completed: number;
  upcomingToday: number;
}

/**
 * TRỤ CỘT 3: Lấy số liệu Dashboard nguyên tử qua RPC < 3ms
 */
export async function getOwnerBookingMetrics(ownerId: string): Promise<OwnerBookingMetrics> {
  const defaultMetrics: OwnerBookingMetrics = {
    total: 0,
    pending: 0,
    confirmed: 0,
    cancelled: 0,
    completed: 0,
    upcomingToday: 0,
  };

  if (!isSupabaseConfigured || !ownerId) return defaultMetrics;

  try {
    const cleanOwnerId = await resolveUserIdToUuid(ownerId);
    const { data, error } = await supabase.rpc('get_owner_booking_metrics', {
      p_owner_id: cleanOwnerId,
    });

    if (error) {
      console.warn('[BookingsAPI] Lỗi lấy get_owner_booking_metrics:', error);
      return defaultMetrics;
    }

    return {
      total: Number(data?.total || 0),
      pending: Number(data?.pending || 0),
      confirmed: Number(data?.confirmed || 0),
      cancelled: Number(data?.cancelled || 0),
      completed: Number(data?.completed || 0),
      upcomingToday: Number(data?.upcomingToday || 0),
    };
  } catch (err) {
    console.warn('[BookingsAPI] Exception trong getOwnerBookingMetrics:', err);
    return defaultMetrics;
  }
}

/**
 * TRỤ CỘT 3: Truy vấn danh sách lịch hẹn phẳng qua Denormalized View view_owner_bookings (< 8ms)
 */
export async function getOwnerBookingsFlat(
  ownerId: string,
  statusFilter?: string
): Promise<OwnerBookingFlatDTO[]> {
  if (!isSupabaseConfigured || !ownerId) return [];

  try {
    const cleanOwnerId = await resolveUserIdToUuid(ownerId);
    let query = supabase
      .from('view_owner_bookings')
      .select('*')
      .or(`owner_id.eq.${cleanOwnerId},owner_id.eq.${ownerId}`)
      .order('created_at', { ascending: false });

    if (statusFilter && statusFilter !== 'all') {
      const dbStatus = mapVietnameseStatusToDb(statusFilter);
      query = query.eq('status', dbStatus);
    }

    const { data, error } = await query;
    if (error) {
      console.warn('[BookingsAPI] Lỗi truy vấn view_owner_bookings (sử dụng fallback):', error);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      roomId: row.room_id,
      roomTitle: row.room_title || 'Phòng trọ',
      roomPrice: Number(row.room_price || 0),
      roomAddress: row.room_address || '',
      renterId: row.renter_id,
      renterName: row.renter_name || 'Khách thuê',
      renterPhone: row.renter_phone || '',
      renterAvatar: row.renter_avatar || '/images/user-avatar.jpg',
      ownerId: row.owner_id,
      date: row.requested_date || '',
      timeSlot: row.requested_time || '',
      status: mapDbStatusToVietnamese(row.status),
      rawStatus: row.status,
      displayStatus: row.display_status || mapDbStatusToVietnamese(row.status),
      statusBadgeColor: row.status_badge_color || '',
      note: row.message || '',
      ownerResponseNote: row.owner_response_note || '',
      createdAt: row.created_at,
      isToday: Boolean(row.is_today),
      isUpcoming: Boolean(row.is_upcoming),
    }));
  } catch (err) {
    console.warn('[BookingsAPI] Exception trong getOwnerBookingsFlat:', err);
    return [];
  }
}


