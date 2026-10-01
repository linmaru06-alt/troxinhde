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
export async function getOwnerViewingRequests(ownerId?: string | null): Promise<ViewingRequestItem[]> {
  if (!isSupabaseConfigured || !ownerId) {
    return [];
  }

  const cleanOwnerId = await resolveUserIdToUuid(ownerId);

  try {
    const { data, error } = await supabase
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
      `)
      .or(`owner_id.eq.${cleanOwnerId},owner_id.eq.${ownerId}`)
      .order('created_at', { ascending: false });

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
        ownerId: row.owner_id,
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
