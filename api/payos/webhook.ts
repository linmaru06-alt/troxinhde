import {
  fulfillPaidPayOSTransaction,
  getPayOSClient,
  getPayOSServerSupabase,
  hasSupabaseServiceRoleKey,
} from '../_lib/payosServer.js';

/**
 * Webhook tiếp nhận thông báo thanh toán từ PayOS
 * Endpoint: POST /api/payos/webhook
 *
 * Luồng xử lý:
 * 1. Xác minh tính toàn vẹn chữ ký HMAC-SHA256 của PayOS qua thư viện @payos/node.
 * 2. Chống xử lý trùng lặp (Idempotency): Nếu đơn hàng đã được đánh dấu PAID/SUCCESS, bỏ qua không xử lý lại.
 * 3. Nếu thanh toán thành công (code === "00") và đủ số tiền:
 *    Gọi RPC nguyên tử cộng Xu (`credit_wallet_from_topup`) hoặc kích hoạt dịch vụ (`fulfill_paid_service_order`),
 *    sau đó lưu thông tin đối soát PayOS vào bảng transactions.
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

    // Kiểm tra quyền Service Role để tránh nuốt mất Webhook do RLS chặn
    if (!hasSupabaseServiceRoleKey()) {
      console.error(
        '[PayOS Webhook] CRITICAL: Chưa cấu hình SUPABASE_SERVICE_ROLE_KEY trên Vercel! Trả 500 để PayOS retry sau khi cấu hình.'
      );
      return res.status(500).json({
        error: -1,
        message: 'Máy chủ chưa cấu hình SUPABASE_SERVICE_ROLE_KEY để đối soát thanh toán.',
      });
    }

    const supabase = getPayOSServerSupabase();
    const orderCodeStr = String(orderCode);

    // 2. Tra cứu đơn hàng trong Supabase
    let { data: tx, error: fetchErr } = await supabase
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

    // Tra cứu bổ sung qua metadata.order_code_num nếu mã đơn lưu dưới dạng TXNAP...
    if (!tx) {
      const { data: txMeta } = await supabase
        .from('transactions')
        .select('id, order_code, user_id, plan_id, room_id, amount, status, metadata')
        .contains('metadata', { order_code_num: Number(orderCode) })
        .maybeSingle();
      if (txMeta) {
        tx = txMeta;
      }
    }

    if (!tx) {
      console.warn(`[PayOS Webhook] Không tìm thấy đơn hàng #${orderCodeStr} trong bảng transactions.`);
      return res.status(200).json({
        error: 0,
        message: `Đơn hàng #${orderCodeStr} không tồn tại trên hệ thống. Đã ghi nhận.`,
      });
    }

    const actualOrderCode = tx.order_code || orderCodeStr;

    // 3. CHỐNG XỬ LÝ TRÙNG LẶP (Idempotency Check)
    if (tx.status === 'paid' || tx.status === 'success') {
      console.log(`[PayOS Webhook] Đơn hàng #${actualOrderCode} đã ở trạng thái PAID trước đó. Bỏ qua xử lý trùng.`);
      return res.status(200).json({
        error: 0,
        message: 'Đơn hàng này đã được ghi nhận thanh toán thành công trước đó (Idempotent OK).',
        orderCode,
      });
    }

    // 4. Kiểm tra mã phản hồi thanh toán thành công từ PayOS (code === "00")
    if (code === '00' || webhookData.code === '00') {
      const fulfillRes = await fulfillPaidPayOSTransaction({
        supabase,
        tx,
        paidAmount: Number(amount || 0),
        referenceId: reference || `PAYOS_${orderCode}`,
        payosCode: code || webhookData.code || '00',
        rawPayload: body,
        signature: body.signature || null,
        source: 'webhook',
      });

      if (!fulfillRes.success) {
        if (fulfillRes.insufficientAmount) {
          return res.status(200).json({
            error: 0,
            message: fulfillRes.error || 'Số tiền chuyển khoản chưa đủ giá trị đơn hàng.',
            orderCode,
          });
        }
        return res.status(500).json({
          error: -1,
          message: fulfillRes.error || 'Không thể hoàn tất kích hoạt đơn hàng trong DB.',
        });
      }

      console.log(
        `[PayOS Webhook] Hoàn tất đơn hàng #${actualOrderCode} thành công (fulfilledBy=${fulfillRes.fulfilledBy}).`
      );
      return res.status(200).json({
        error: 0,
        message: 'Cập nhật trạng thái đơn hàng & kích hoạt quyền lợi thành công (PAID).',
        orderCode,
        fulfilledBy: fulfillRes.fulfilledBy,
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
