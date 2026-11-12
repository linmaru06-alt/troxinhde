import {
  getServiceSupabase,
  resolveProfileByFirebaseUid,
  verifyFirebaseIdToken,
} from '../_lib/walletServer.js';

/**
 * Endpoint xác nhận đơn thanh toán dịch vụ dành RIÊNG cho tài khoản Demo Sandbox (is_demo_account = true)
 * Tuyệt đối không cho tài khoản thường gọi để tự kích hoạt dịch vụ.
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
      return res.status(400).json({ error: 'Thiếu mã đơn thanh toán Sandbox (orderCode).' });
    }

    const supabase = getServiceSupabase();
    const profile = await resolveProfileByFirebaseUid(supabase, claims.uid);

    if (!profile || (!profile.is_demo_account && !claims.isDemoClaim)) {
      return res.status(403).json({
        error: 'Xác nhận giả lập chỉ khả dụng cho tài khoản Demo Sandbox.',
      });
    }

    const { data: tx } = await supabase
      .from('transactions')
      .select('id, order_code, user_id, amount, plan_id, metadata, status')
      .eq('order_code', orderCode)
      .eq('user_id', profile.id)
      .maybeSingle();

    if (!tx) {
      return res.status(404).json({ error: 'Không tìm thấy đơn thanh toán Sandbox.' });
    }

    const sandboxRef = `SANDBOX_${orderCode}`;
    const { data: rpcResult, error: rpcError } = await supabase.rpc('fulfill_paid_service_order', {
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
        admin_id: profile.id,
        admin_email: claims.email || null,
        admin_role: profile.app_role || 'owner',
        action: 'demo_service_order_confirm',
        entity_type: 'system',
        entity_id: String(tx.id),
        data_after: {
          order_code: orderCode,
          plan_id: tx.plan_id,
          amount_vnd: tx.amount,
          service_type: tx.metadata?.service_type || null,
          is_sandbox: true,
        },
        reason: 'Xác nhận đơn dịch vụ trên tài khoản Demo Sandbox',
        is_demo_admin: true,
        created_at: new Date().toISOString(),
      });
    } catch {
      // Không chặn luồng demo nếu audit_logs khác schema
    }

    return res.status(200).json({
      success: true,
      sandbox: true,
      result: rpcResult,
    });
  } catch (err: any) {
    const message = err?.message || 'Lỗi xử lý đơn Demo Sandbox.';
    const isAuthError = message.includes('Firebase') || message.includes('Bearer');
    const isConfigError = message.includes('SUPABASE_SERVICE_ROLE_KEY');
    return res.status(isAuthError ? 401 : isConfigError ? 503 : 500).json({
      error: isConfigError
        ? 'Máy chủ chưa cấu hình SUPABASE_SERVICE_ROLE_KEY để chạy đối soát Demo Sandbox. Hãy dùng phương thức Xu nội bộ hoặc cấu hình env trên Vercel.'
        : message,
    });
  }
}

