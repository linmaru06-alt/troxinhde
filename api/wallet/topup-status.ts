import {
  getServiceSupabase,
  resolveProfileByFirebaseUid,
  verifyFirebaseIdToken,
} from '../_lib/walletServer.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Chỉ chấp nhận phương thức GET.' });
  }

  try {
    const authHeader = req.headers?.authorization || req.headers?.Authorization;
    const claims = await verifyFirebaseIdToken(authHeader);

    const orderCode = String(req.query?.orderCode || '').trim().toUpperCase();
    if (!orderCode) {
      return res.status(400).json({ error: 'Thiếu mã đơn nạp Xu (orderCode).' });
    }

    const supabase = getServiceSupabase();
    const profile = await resolveProfileByFirebaseUid(supabase, claims.uid);
    if (!profile) {
      return res.status(404).json({ error: 'Không tìm thấy hồ sơ người dùng.' });
    }

    const { data: tx, error: txError } = await supabase
      .from('transactions')
      .select('id, order_code, user_id, amount, payment_method, status, expires_at, paid_at, activated_at, metadata')
      .eq('order_code', orderCode)
      .eq('user_id', profile.id)
      .maybeSingle();

    if (txError) {
      return res.status(500).json({ error: `Lỗi tra cứu đơn nạp: ${txError.message}` });
    }
    if (!tx) {
      return res.status(404).json({ error: 'Không tìm thấy đơn nạp Xu tương ứng.' });
    }

    let currentStatus = tx.status;
    if (
      currentStatus === 'pending' &&
      tx.expires_at &&
      new Date(tx.expires_at).getTime() <= Date.now()
    ) {
      currentStatus = 'expired';
      await supabase
        .from('transactions')
        .update({ status: 'expired' })
        .eq('id', tx.id)
        .eq('status', 'pending');
    }

    const { data: wallet } = await supabase
      .from('k23_wallets')
      .select('id, owner_id, balance_real_xu, balance_bonus_xu, updated_at')
      .eq('owner_id', profile.id)
      .maybeSingle();

    return res.status(200).json({
      success: true,
      orderCode: tx.order_code,
      status: currentStatus,
      amount: tx.amount,
      paymentMethod: tx.payment_method,
      paidAt: tx.paid_at,
      expiresAt: tx.expires_at,
      metadata: tx.metadata || {},
      wallet: wallet
        ? {
            id: wallet.id,
            owner_id: wallet.owner_id,
            balance_real_xu: wallet.balance_real_xu || 0,
            balance_bonus_xu: wallet.balance_bonus_xu || 0,
            total_xu: (wallet.balance_real_xu || 0) + (wallet.balance_bonus_xu || 0),
            updated_at: wallet.updated_at,
          }
        : null,
    });
  } catch (err: any) {
    const message = err?.message || 'Không thể kiểm tra trạng thái đơn nạp.';
    const isAuthError = message.includes('Firebase') || message.includes('Bearer');
    return res.status(isAuthError ? 401 : 500).json({ error: message });
  }
}

