import {
  getServiceSupabase,
  resolveProfileByFirebaseUid,
  verifyFirebaseIdToken,
} from '../_lib/walletServer.js';

/**
 * Endpoint chỉ dành riêng cho tài khoản Demo Sandbox (is_demo_account = true)
 * Dùng để xác nhận đơn nạp giả lập có ghi audit log tách biệt khỏi luồng tiền thật.
 */
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Chỉ chấp nhận phương thức POST.' });
  }

  try {
    const authHeader = req.headers?.authorization || req.headers?.Authorization;
    const claims = await verifyFirebaseIdToken(authHeader);

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const orderCode = String(body.orderCode || '').trim().toUpperCase();
    if (!orderCode) {
      return res.status(400).json({ error: 'Thiếu mã đơn nạp Sandbox (orderCode).' });
    }

    const supabase = getServiceSupabase();
    const profile = await resolveProfileByFirebaseUid(supabase, claims.uid);

    if (!profile || (!profile.is_demo_account && !claims.isDemoClaim)) {
      return res.status(403).json({
        error: 'Chức năng nạp giả lập chỉ khả dụng cho tài khoản Demo Sandbox.',
      });
    }

    const { data: tx } = await supabase
      .from('transactions')
      .select('id, order_code, user_id, amount, status')
      .eq('order_code', orderCode)
      .eq('user_id', profile.id)
      .maybeSingle();

    if (!tx) {
      return res.status(404).json({ error: 'Không tìm thấy đơn nạp Sandbox.' });
    }

    const sandboxRef = `SANDBOX_${orderCode}`;
    const { data: rpcResult, error: rpcError } = await supabase.rpc('credit_wallet_from_topup', {
      p_order_code: orderCode,
      p_paid_amount: tx.amount,
      p_reference_id: sandboxRef,
      p_gateway: 'Sandbox Demo',
    });

    if (rpcError || !rpcResult?.success) {
      return res.status(400).json({
        error: rpcError?.message || rpcResult?.error || 'Không thể hoàn tất đơn Sandbox.',
      });
    }

    try {
      await supabase.from('audit_logs').insert({
        actor_id: profile.id,
        action: 'demo_wallet_topup',
        entity_type: 'transactions',
        entity_id: tx.id,
        details: {
          order_code: orderCode,
          amount_vnd: tx.amount,
          is_sandbox: true,
        },
        created_at: new Date().toISOString(),
      });
    } catch {
      // Bỏ qua nếu schema audit_logs khác
    }

    return res.status(200).json({
      success: true,
      sandbox: true,
      result: rpcResult,
    });
  } catch (err: any) {
    const message = err?.message || 'Lỗi xử lý đơn nạp Demo Sandbox.';
    const isAuthError = message.includes('Firebase') || message.includes('Bearer');
    return res.status(isAuthError ? 401 : 500).json({ error: message });
  }
}

