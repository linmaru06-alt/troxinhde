/**
 * Vercel Cron Job: Quét và cập nhật vòng đời tin đăng 30 ngày Trọ Xinh
 * Tần suất chạy: 00:00 hàng ngày (schedule: "0 0 * * *")
 * 
 * Nghiệp vụ:
 * 1. Quét tin sắp hết hạn trong 3 ngày (expires_at <= NOW() + 3 ngày): Tạo bản ghi cảnh báo/nhắc nhở
 * 2. Quét tin đã hết hạn (expires_at <= NOW()): Chuyển status = 'Hết hạn', giữ URL (noindex, follow), mở thời hạn lưu trữ 60 ngày
 * 3. Quét tin quá hạn lưu trữ (archived_until <= NOW()): Xoá hoặc đánh dấu đã lưu trữ vĩnh viễn
 */

import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  // 1. Kiểm tra Authorization header nếu có CRON_SECRET được cấu hình
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers ? (req.headers.authorization || req.headers.Authorization) : null;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized: Invalid CRON_SECRET token' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({
      error: 'Supabase configuration missing (SUPABASE_URL or SUPABASE_KEY)',
      timestamp: new Date().toISOString()
    });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const now = new Date();
  const nowIso = now.toISOString();

  // Mốc 3 ngày tới để gửi nhắc nhở
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();

  const results = {
    timestamp: nowIso,
    remindersSent: 0,
    listingsExpired: 0,
    listingsPurged: 0,
    errors: [] as string[]
  };

  try {
    // A. Quét tin đã hết hạn (expires_at <= NOW() và status đang hoạt động)
    const { data: expiredRooms, error: expireError } = await supabase
      .from('rooms')
      .select('id, title, room_number, owner_id, expires_at')
      .in('status', ['Còn trống', 'Đang hiển thị', 'active', 'available'])
      .lte('expires_at', nowIso);

    if (expireError) {
      results.errors.push(`Lỗi quét tin hết hạn: ${expireError.message}`);
    } else if (expiredRooms && expiredRooms.length > 0) {
      // 60 ngày lưu trữ
      const archivedUntil = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString();
      const expiredIds = expiredRooms.map(r => r.id);

      const { error: updateExpireError } = await supabase
        .from('rooms')
        .update({
          status: 'Hết hạn',
          archived_until: archivedUntil,
          updated_at: nowIso
        })
        .in('id', expiredIds);

      if (updateExpireError) {
        results.errors.push(`Lỗi cập nhật tin hết hạn: ${updateExpireError.message}`);
      } else {
        results.listingsExpired = expiredRooms.length;

        // Lưu thông báo in-app cho từng chủ trọ
        const notifications = expiredRooms.map(room => ({
          user_id: room.owner_id,
          title: 'Tin đăng của bạn đã hết hạn hiển thị (30 ngày)',
          content: `Tin phòng "${room.title || room.room_number}" đã hết hạn. Tin sẽ được lưu trữ 60 ngày để bạn đăng lại miễn phí hoặc bất kỳ lúc nào.`,
          type: 'listing_expired',
          reference_id: room.id,
          created_at: nowIso
        }));

        await supabase.from('notifications').insert(notifications).catch(() => null);
      }
    }

    // B. Quét tin sắp hết hạn trong 3 ngày tới (expires_at <= NOW() + 3d và chưa được nhắc)
    const { data: soonExpiringRooms, error: soonError } = await supabase
      .from('rooms')
      .select('id, title, room_number, owner_id, expires_at')
      .in('status', ['Còn trống', 'Đang hiển thị', 'active', 'available'])
      .gt('expires_at', nowIso)
      .lte('expires_at', threeDaysFromNow);

    if (soonError) {
      results.errors.push(`Lỗi quét tin sắp hết hạn: ${soonError.message}`);
    } else if (soonExpiringRooms && soonExpiringRooms.length > 0) {
      results.remindersSent = soonExpiringRooms.length;
      
      const reminderNotifs = soonExpiringRooms.map(room => ({
        user_id: room.owner_id,
        title: 'Tin đăng sắp hết hạn sau 3 ngày',
        content: `Tin "${room.title || room.room_number}" sẽ hết hạn vào ${new Date(room.expires_at).toLocaleDateString('vi-VN')}. Hãy kiểm tra phòng đã cho thuê chưa hoặc chuẩn bị đăng lại!`,
        type: 'listing_expiring_soon',
        reference_id: room.id,
        created_at: nowIso
      }));

      await supabase.from('notifications').insert(reminderNotifs).catch(() => null);
    }

    // C. Quét tin quá hạn lưu trữ 60 ngày (archived_until <= NOW() và status = 'Hết hạn')
    const { data: purgedRooms, error: purgeError } = await supabase
      .from('rooms')
      .select('id')
      .eq('status', 'Hết hạn')
      .lte('archived_until', nowIso);

    if (purgeError) {
      results.errors.push(`Lỗi quét tin quá hạn lưu trữ: ${purgeError.message}`);
    } else if (purgedRooms && purgedRooms.length > 0) {
      const purgedIds = purgedRooms.map(r => r.id);
      const { error: updatePurgeError } = await supabase
        .from('rooms')
        .update({
          status: 'Đã lưu trữ',
          updated_at: nowIso
        })
        .in('id', purgedIds);

      if (updatePurgeError) {
        results.errors.push(`Lỗi chuyển trạng thái tin quá hạn lưu trữ: ${updatePurgeError.message}`);
      } else {
        results.listingsPurged = purgedRooms.length;
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Vercel Cron: Quét vòng đời tin đăng 30 ngày hoàn tất thành công.',
      data: results
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: `Ngoại lệ xử lý Cron: ${error?.message || error}`,
      data: results
    });
  }
}

