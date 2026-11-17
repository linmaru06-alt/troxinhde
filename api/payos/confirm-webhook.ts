import { getBaseUrl, getPayOSClient } from '../_lib/payosServer.js';

/**
 * Tự động đăng ký và xác thực Webhook URL trực tiếp với hệ thống PayOS thông qua API
 * Endpoint: GET / POST /api/payos/confirm-webhook
 * 
 * Luồng hoạt động:
 * 1. Đọc khóa PayOS từ biến môi trường máy chủ Vercel (PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY).
 * 2. Tự động xác định URL Webhook chính thức: https://troxinhde-zeta.vercel.app/api/payos/webhook.
 * 3. Gọi trực tiếp hàm payos.webhooks.confirm(webhookUrl) của SDK PayOS (gọi POST /confirm-webhook đến PayOS).
 * 4. PayOS sẽ ping kiểm tra endpoint và lưu Webhook URL vào hệ thống của bạn mà bạn không cần dán tay trên web.
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
    const payos = getPayOSClient();
    const baseUrl = getBaseUrl(req);
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    
    // Webhook URL chính thức của Trọ Xinh
    const webhookUrl = body.webhookUrl || `${baseUrl}/api/payos/webhook`;

    console.log('[PayOS Confirm Webhook] Đang đăng ký Webhook URL với PayOS API:', webhookUrl);

    // Gọi API của PayOS để tự động xác nhận và lưu URL Webhook
    const result = await payos.webhooks.confirm(webhookUrl);

    console.log('[PayOS Confirm Webhook] Phản hồi từ PayOS:', result);

    return res.status(200).json({
      success: true,
      message: `Đã dán và xác thực Webhook URL thành công với cổng PayOS!`,
      webhookUrl,
      payosResponse: result || 'Đã xác nhận thành công.',
    });
  } catch (err: any) {
    console.error('[PayOS Confirm Webhook] Lỗi khi xác thực webhook với PayOS:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Không thể dán Webhook URL qua API PayOS. Vui lòng kiểm tra lại biến môi trường PayOS trên Vercel.',
    });
  }
}
