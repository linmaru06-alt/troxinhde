import { getPayOSClient, getPayOSServerSupabase } from '../_lib/payosServer.js';

/**
 * Webhook tiếp nhận thông báo thanh toán từ PayOS
 * Endpoint: POST /api/payos/webhook
 * 
 * Luồng xử lý:
 * 1. Xác minh tính toàn vẹn chữ ký HMAC-SHA256 của PayOS qua thư viện @payos/node.
 * 2. Chống xử lý trùng lặp (Idempotency): Nếu đơn hàng đã được đánh dấu PAID/SUCCESS, bỏ qua không xử lý lại.
 * 3. Nếu thanh toán thành công (code === "00"): Cập nhật trạng thái đơn thành 'paid' và kích hoạt quyền lợi dịch vụ.
 */
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: -1,
      message: 'Chỉ chấp nhận phương thức POST từ PayOS Webhook.',
    });
  }

  try {
    const payos = getPayOSClient();
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};

    // 1. Xác minh chữ ký số PayOS
    let webhookData;
    try {
      webhookData = await payos.webhooks.verify(body);
    } catch (sigErr: any) {
      console.error('[PayOS Webhook] Lỗi xác minh chữ ký PayOS:', sigErr?.message);
      return res.status(400).json({
        error: -1,
        message: 'Chữ ký PayOS không hợp lệ hoặc dữ liệu bị thay đổi (Invalid Signature).',
      });
    }

    if (!webhookData) {
      return res.status(400).json({
        error: -1,
        message: 'Dữ liệu Webhook PayOS không hợp lệ.',
      });
    }

    const { orderCode, amount, reference, code, desc } = webhookData;

    // Trường hợp kiểm tra / xác thực Webhook URL từ PayOS Dashboard (Test Ping)
    const isTestWebhook =
      !orderCode ||
      orderCode === 123 ||
      String(desc || '').toLowerCase().includes('test') ||
      String(body.desc || '').toLowerCase().includes('test');

    if (isTestWebhook) {
      console.log('[PayOS Webhook] Nhận gói tin kiểm tra Webhook từ PayOS:', webhookData);
      return res.status(200).json({
        error: 0,
        message: 'Xác thực Webhook PayOS thành công (Test ping ok).',
        data: webhookData,
      });
    }

    const supabase = getPayOSServerSupabase();
    const orderCodeStr = String(orderCode);

    // 2. Tra cứu đơn hàng trong Supabase
    const { data: tx, error: fetchErr } = await supabase
      .from('transactions')
      .select('id, order_code, user_id, plan_id, room_id, amount, status, metadata')
      .eq('order_code', orderCodeStr)
      .maybeSingle();

    if (fetchErr) {
      console.error('[PayOS Webhook] Lỗi truy vấn cơ sở dữ liệu Supabase:', fetchErr);
      return res.status(500).json({
        error: -1,
        message: 'Lỗi truy vấn cơ sở dữ liệu máy chủ.',
      });
    }

    if (!tx) {
      console.warn(`[PayOS Webhook] Không tìm thấy đơn hàng #${orderCodeStr} trong bảng transactions.`);
      // Trả về 200 để PayOS không retry dồn dập
      return res.status(200).json({
        error: 0,
        message: `Đơn hàng #${orderCodeStr} không tồn tại trên hệ thống. Đã ghi nhận.`,
      });
    }

    // 3. CHỐNG XỬ LÝ TRÙNG LẶP (Idempotency Check)
    // Nếu đơn hàng đã được cập nhật thành 'paid' hoặc 'success' trước đó -> ghi nhận 1 lần duy nhất
    if (tx.status === 'paid' || tx.status === 'success') {
      console.log(`[PayOS Webhook] Đơn hàng #${orderCodeStr} đã ở trạng thái PAID trước đó. Bỏ qua xử lý trùng.`);
      return res.status(200).json({
        error: 0,
        message: 'Đơn hàng này đã được ghi nhận thanh toán thành công trước đó (Idempotent OK).',
        orderCode,
      });
    }

    // 4. Kiểm tra mã phản hồi thanh toán thành công từ PayOS (code === "00")
    if (code === '00' || webhookData.code === '00') {
      const nowIso = new Date().toISOString();

      // Cập nhật trạng thái đơn hàng sang 'paid' trong bảng transactions
      const { error: updateErr } = await supabase
        .from('transactions')
        .update({
          status: 'paid',
          paid_at: nowIso,
          signature: body.signature || null,
          raw_payload: body,
          metadata: {
            ...(tx.metadata || {}),
            payos_reference: reference || null,
            payos_amount: amount,
            payos_code: code,
            paid_at: nowIso,
          },
        })
        .eq('id', tx.id);

      if (updateErr) {
        console.error('[PayOS Webhook] Lỗi cập nhật trạng thái đơn hàng sang PAID:', updateErr);
        return res.status(500).json({
          error: -1,
          message: 'Lỗi cập nhật trạng thái giao dịch trong DB.',
        });
      }

      // Kích hoạt dịch vụ tương ứng (Nếu có RPC fulfill_paid_service_order)
      try {
        await supabase.rpc('fulfill_paid_service_order', {
          p_order_code: orderCodeStr,
          p_paid_amount: amount || tx.amount,
          p_reference_id: reference || `PAYOS_${orderCode}`,
          p_gateway: 'PayOS',
        });
      } catch (rpcErr) {
        console.warn('[PayOS Webhook] fulfill_paid_service_order rpc skipped/unhandled:', rpcErr);
      }

      console.log(`[PayOS Webhook] Đã cập nhật thành công đơn hàng #${orderCodeStr} sang PAID.`);
      return res.status(200).json({
        error: 0,
        message: 'Cập nhật trạng thái đơn hàng thành công (PAID).',
        orderCode,
      });
    }

    // Nếu mã phản hồi khác '00' (thất bại hoặc hủy)
    return res.status(200).json({
      error: 0,
      message: `Đơn hàng #${orderCodeStr} nhận mã trạng thái ${code}, không cập nhật PAID.`,
      orderCode,
    });
  } catch (err: any) {
    console.error('[PayOS Webhook] Xảy ra ngoại lệ:', err);
    return res.status(500).json({
      error: -1,
      message: err?.message || 'Lỗi máy chủ nội bộ khi xử lý Webhook PayOS.',
    });
  }
}

