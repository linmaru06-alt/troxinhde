import { getPayOSServerSupabase } from '../_lib/payosServer.js';

/**
 * Tra cứu trạng thái thực tế của đơn hàng từ Database Supabase
 * Endpoint: GET/POST /api/payos/order-status?orderCode=...
 * 
 * Đảm bảo: Trạng thái hiển thị trên giao diện "Thanh toán thành công"
 * là trạng thái thật do Webhook PayOS đã cập nhật vào Database,
 * hoàn toàn không tin tưởng trạng thái giả lập từ phía client.
 */
export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    let orderCode = '';
    if (req.method === 'GET') {
      orderCode = String(req.query?.orderCode || '').trim();
    } else if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
      orderCode = String(body.orderCode || req.query?.orderCode || '').trim();
    }

    if (!orderCode) {
      return res.status(400).json({ error: 'Thiếu mã đơn hàng (orderCode).' });
    }

    const supabase = getPayOSServerSupabase();

    const { data: tx, error } = await supabase
      .from('transactions')
      .select('id, order_code, user_id, plan_id, room_id, amount, payment_method, status, paid_at, created_at, metadata')
      .eq('order_code', orderCode)
      .maybeSingle();

    if (error) {
      console.error('[PayOS Order Status] Lỗi tra cứu đơn:', error);
      return res.status(500).json({ error: 'Lỗi truy vấn cơ sở dữ liệu.' });
    }

    if (!tx) {
      return res.status(404).json({
        found: false,
        error: `Không tìm thấy đơn hàng #${orderCode} trong hệ thống.`,
      });
    }

    const isPaid = tx.status === 'paid' || tx.status === 'success';

    return res.status(200).json({
      found: true,
      orderCode: tx.order_code,
      amount: tx.amount,
      status: tx.status,
      isPaid,
      paidAt: tx.paid_at,
      createdAt: tx.created_at,
      planId: tx.plan_id,
      metadata: tx.metadata || {},
    });
  } catch (err: any) {
    return res.status(500).json({
      error: err?.message || 'Lỗi tra cứu trạng thái đơn hàng.',
    });
  }
}

