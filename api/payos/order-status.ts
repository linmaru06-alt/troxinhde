import {
  getPayOSServerSupabase,
  hasSupabaseServiceRoleKey,
  syncPayOSOrderStatusIfNeeded,
} from '../_lib/payosServer.js';
import { getWalletSupabaseClient } from '../_lib/walletServer.js';

/**
 * Tra cứu trạng thái thực tế của đơn hàng từ Database Supabase + Đối soát chủ động với PayOS API
 * Endpoint: GET/POST /api/payos/order-status?orderCode=...
 *
 * Bảo đảm:
 * - Trạng thái hiển thị trên giao diện là trạng thái thật đã được xác minh từ PayOS & ghi nhận trong Database.
 * - Nếu đơn trong DB vẫn đang `pending`, tự động hỏi trực tiếp PayOS (`payos.paymentRequests.get`)
 *   để xác minh đã nhận đủ 100% tiền -> kích hoạt dịch vụ / cộng Xu nguyên tử ngay lập tức,
 *   không để khách chờ vô hạn nếu Webhook bị trễ mạng.
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

    const authHeader = req.headers?.authorization || req.headers?.Authorization;
    const supabase = hasSupabaseServiceRoleKey()
      ? getPayOSServerSupabase()
      : authHeader
      ? getWalletSupabaseClient(authHeader).supabase
      : getPayOSServerSupabase();

    let { data: tx, error } = await supabase
      .from('transactions')
      .select(
        'id, order_code, user_id, plan_id, room_id, amount, payment_method, status, paid_at, activated_at, created_at, metadata'
      )
      .eq('order_code', orderCode)
      .maybeSingle();

    // Fallback qua RPC SECURITY DEFINER `get_payment_status` nếu không có service_role và không có token
    if (!tx && !error) {
      const { data: rpcStatus } = await supabase.rpc('get_payment_status', {
        p_order_code: orderCode,
      });
      if (rpcStatus && rpcStatus.order_code) {
        tx = {
          id: '',
          order_code: rpcStatus.order_code,
          user_id: null,
          plan_id: rpcStatus.plan_id || null,
          room_id: null,
          amount: Number(rpcStatus.amount || 0),
          payment_method: rpcStatus.payment_method || 'payos',
          status: rpcStatus.status || 'pending',
          paid_at: rpcStatus.paid_at || null,
          activated_at: rpcStatus.activated_at || null,
          created_at: null,
          metadata: rpcStatus.metadata || {},
        } as any;
      }
    }

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

    let currentStatus = tx.status;
    let paidAt = tx.paid_at;
    let syncedFromPayOS = false;

    // Đối soát chủ động trực tiếp với PayOS nếu DB vẫn đang pending
    if (currentStatus === 'pending' && tx.id) {
      const syncRes = await syncPayOSOrderStatusIfNeeded({ supabase, tx });
      currentStatus = syncRes.status;
      syncedFromPayOS = syncRes.syncedFromPayOS;
      if (syncRes.paidAt) {
        paidAt = syncRes.paidAt;
      }
    }

    const isPaid = currentStatus === 'paid' || currentStatus === 'success';
    const meta = (tx.metadata || {}) as Record<string, any>;

    return res.status(200).json({
      found: true,
      orderCode: tx.order_code,
      amount: tx.amount,
      status: currentStatus,
      isPaid,
      syncedFromPayOS,
      paidAt,
      createdAt: tx.created_at,
      planId: tx.plan_id,
      serviceType: meta.service_type || (tx.plan_id === 'wallet_topup' ? 'wallet_topup' : 'listing_plan'),
      metadata: meta,
    });
  } catch (err: any) {
    return res.status(500).json({
      error: err?.message || 'Lỗi tra cứu trạng thái đơn hàng.',
    });
  }
}
