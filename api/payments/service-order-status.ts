import {
  getWalletSupabaseClient,
  resolveProfileByFirebaseUid,
  verifyFirebaseIdToken,
} from '../_lib/walletServer.js';
import { XU_TO_VND_RATE, buildPaymentQrAndReceiver } from '../_lib/monetizationServer.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Chỉ chấp nhận phương thức GET.' });
  }

  try {
    const authHeader = req.headers?.authorization || req.headers?.Authorization;
    const claims = await verifyFirebaseIdToken(authHeader);

    const orderCode = String(req.query?.orderCode || '').trim().toUpperCase();
    if (!orderCode) {
      return res.status(400).json({ error: 'Thiếu mã đơn thanh toán (orderCode).' });
    }

    const { supabase, isServiceRole } = getWalletSupabaseClient(authHeader);
    const profile = await resolveProfileByFirebaseUid(supabase, claims.uid);
    if (!profile) {
      return res.status(404).json({ error: 'Không tìm thấy hồ sơ người dùng.' });
    }

    const { data: tx, error: txErr } = await supabase
      .from('transactions')
      .select('id, order_code, user_id, plan_id, room_id, amount, payment_method, status, expires_at, paid_at, activated_at, metadata, created_at')
      .eq('order_code', orderCode)
      .eq('user_id', profile.id)
      .maybeSingle();

    if (txErr) {
      return res.status(500).json({ error: `Lỗi tra cứu đơn thanh toán: ${txErr.message}` });
    }

    if (!tx) {
      return res.status(404).json({ error: 'Không tìm thấy đơn thanh toán tương ứng.' });
    }

    const fallbackExpiresAt = tx.created_at
      ? new Date(new Date(tx.created_at).getTime() + 15 * 60 * 1000).toISOString()
      : new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const resolvedExpiresAt = tx.expires_at || fallbackExpiresAt;

    let currentStatus = tx.status;
    if (
      currentStatus === 'pending' &&
      resolvedExpiresAt &&
      new Date(resolvedExpiresAt).getTime() <= Date.now()
    ) {
      currentStatus = 'expired';
      if (isServiceRole) {
        await supabase
          .from('transactions')
          .update({ status: 'expired' })
          .eq('id', tx.id)
          .eq('status', 'pending');
      }
    }

    const method = tx.payment_method === 'momo' ? 'momo' : 'vietqr';
    const meta = (tx.metadata || {}) as Record<string, any>;
    const amountXu = Number(meta.amount_xu ?? Math.round((tx.amount || 0) / XU_TO_VND_RATE));
    const { qrCode, deeplink, receiverInfo } = buildPaymentQrAndReceiver(method, tx.amount, tx.order_code);

    return res.status(200).json({
      success: true,
      orderCode: tx.order_code,
      status: currentStatus,
      amount: tx.amount,
      amountXu,
      paymentMethod: method,
      paidAt: tx.paid_at,
      activatedAt: tx.activated_at,
      expiresAt: resolvedExpiresAt,
      metadata: meta,
      order: {
        id: tx.id,
        orderCode: tx.order_code,
        serviceType: meta.service_type || 'listing_plan',
        planId: tx.plan_id,
        roomId: tx.room_id,
        amountXu,
        amountVnd: tx.amount,
        method,
        status: currentStatus,
        expiresAt: resolvedExpiresAt,
        isSandbox: Boolean(meta.is_sandbox ?? profile.is_demo_account),
        qrCode,
        deeplink,
        transferContent: tx.order_code,
        receiverInfo,
      },
    });
  } catch (err: any) {
    const message = err?.message || 'Không thể kiểm tra trạng thái đơn hàng.';
    const isAuthError = message.includes('Firebase') || message.includes('Bearer');
    return res.status(isAuthError ? 401 : 500).json({ error: message });
  }
}

