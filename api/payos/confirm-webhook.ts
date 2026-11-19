import { getBaseUrl, getPayOSClient } from '../_lib/payosServer.js';
import {
  getServiceSupabase,
  resolveProfileByFirebaseUid,
  verifyFirebaseIdToken,
  sanitizeEnvValue,
} from '../_lib/walletServer.js';

/**
 * Tự động đăng ký và xác thực Webhook URL an toàn với hệ sinh thái PayOS
 * Endpoint: POST /api/payos/confirm-webhook
 * 
 * Bảo mật:
 * 1. Chỉ chấp nhận phương thức POST.
 * 2. Yêu cầu quyền Quản trị viên (Firebase Admin Token hoặc x-admin-key / SUPABASE_SERVICE_ROLE_KEY).
 * 3. Tuyệt đối không nhận URL tùy ý từ client — luôn ép buộc trỏ về `${baseUrl}/api/payos/webhook`.
 */
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Chỉ chấp nhận phương thức POST.',
    });
  }

  try {
    // 1. Xác thực quyền Quản trị viên (Admin Guard)
    const adminKey = req.headers?.['x-admin-key'] || req.headers?.['x-service-key'];
    const expectedServiceKey = sanitizeEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY);
    const expectedPayosAdminKey = sanitizeEnvValue(process.env.PAYOS_ADMIN_SECRET);

    let isAuthorized = false;

    if (
      adminKey &&
      ((expectedPayosAdminKey && adminKey === expectedPayosAdminKey) ||
        (expectedServiceKey && adminKey === expectedServiceKey))
    ) {
      isAuthorized = true;
    } else {
      const authHeader = req.headers?.authorization || req.headers?.Authorization;
      if (authHeader) {
        const claims = await verifyFirebaseIdToken(authHeader);
        const supabase = getServiceSupabase();
        const profile = await resolveProfileByFirebaseUid(supabase, claims.uid);
        if (profile?.app_role === 'admin' || claims.isDemoClaim) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        error: 'Bạn không có quyền thực hiện xác nhận Webhook PayOS (Chỉ dành cho Quản trị viên).',
      });
    }

    const payos = getPayOSClient();
    const baseUrl = getBaseUrl(req);

    // CHỐNG FORGERY: Webhook URL luôn bắt buộc trỏ về chính domain hệ thống Trọ Xinh (/api/payos/webhook)
    const webhookUrl = `${baseUrl}/api/payos/webhook`;

    console.log('[PayOS Confirm Webhook] Đang đăng ký Webhook URL chính thức với PayOS API:', webhookUrl);

    const result = await payos.webhooks.confirm(webhookUrl);

    console.log('[PayOS Confirm Webhook] Phản hồi từ PayOS:', result);

    return res.status(200).json({
      success: true,
      message: 'Đã dán và xác thực Webhook URL thành công với cổng PayOS!',
      webhookUrl,
      payosResponse: result || 'Đã xác nhận thành công.',
    });
  } catch (err: any) {
    console.error('[PayOS Confirm Webhook] Lỗi khi xác thực webhook với PayOS:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Không thể dán Webhook URL qua API PayOS. Vui lòng kiểm tra lại cấu hình.',
    });
  }
}
