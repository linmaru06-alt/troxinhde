import {
  generatePayOSOrderCode,
  getBaseUrl,
  getPayOSClient,
  getPayOSServerSupabase,
} from '../_lib/payosServer.js';
import {
  resolveProfileByFirebaseUid,
  verifyFirebaseIdToken,
} from '../_lib/walletServer.js';

export default async function handler(req: any, res: any) {
  // Đặt header CORS để frontend có thể gọi an toàn
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Chỉ chấp nhận phương thức POST.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const rawAmount = Number(body.amount);

    if (!Number.isFinite(rawAmount) || !Number.isInteger(rawAmount) || rawAmount <= 0) {
      return res.status(400).json({
        error: 'Số tiền thanh toán phải là số nguyên VNĐ hợp lệ lớn hơn 0.',
      });
    }

    const amount = Math.round(rawAmount);
    const planId = body.planId ? String(body.planId).trim() : null;
    const roomId = body.roomId ? String(body.roomId).trim() : null;
    const serviceType = body.serviceType ? String(body.serviceType).trim() : 'listing_plan';

    // Xác thực tài khoản Firebase nếu có gửi Authorization header
    let userId: string | null = null;
    const authHeader = req.headers?.authorization || req.headers?.Authorization;
    const supabase = getPayOSServerSupabase();

    if (authHeader) {
      try {
        const claims = await verifyFirebaseIdToken(authHeader);
        if (claims?.uid) {
          const profile = await resolveProfileByFirebaseUid(supabase, claims.uid);
          if (profile?.id) {
            userId = profile.id;
          }
        }
      } catch (authErr) {
        // Cho phép tiếp tục nếu không bắt buộc auth hoặc auth token hết hạn nhẹ
        console.warn('[PayOS Create] Warning: Auth header present but verification skipped/failed:', authErr);
      }
    }

    // 1. Sinh mã đơn hàng số nguyên duy nhất theo chuẩn PayOS
    const orderCode = generatePayOSOrderCode();
    const orderCodeStr = String(orderCode);

    // 2. Cấu hình returnUrl & cancelUrl
    const baseUrl = getBaseUrl(req);
    const returnUrl = body.returnUrl || `${baseUrl}/thanh-toan/thanh-cong?orderCode=${orderCode}`;
    const cancelUrl = body.cancelUrl || `${baseUrl}/thanh-toan/da-huy?orderCode=${orderCode}`;

    // PayOS giới hạn độ dài mô tả tối đa 25 ký tự, không dấu để hiển thị VietQR chuẩn xác
    const orderDescription = (`TX ${orderCode}`).slice(0, 25);

    // 3. Tạo bản ghi đơn hàng với trạng thái PENDING trong Supabase
    const nowIso = new Date().toISOString();
    const { data: insertedTx, error: insertError } = await supabase
      .from('transactions')
      .insert({
        order_code: orderCodeStr,
        user_id: userId,
        plan_id: planId,
        room_id: roomId,
        amount: amount,
        payment_method: 'payos',
        status: 'pending',
        metadata: {
          order_code_num: orderCode,
          service_type: serviceType,
          plan_id: planId,
          room_id: roomId,
          description: body.description || orderDescription,
          buyer_email: body.buyerEmail || null,
          buyer_name: body.buyerName || null,
        },
        created_at: nowIso,
      })
      .select('id, order_code, amount, status, created_at')
      .single();

    if (insertError) {
      console.error('[PayOS Create] Lỗi lưu đơn hàng vào database:', insertError);
      return res.status(500).json({
        error: `Không thể tạo bản ghi đơn hàng trong cơ sở dữ liệu: ${insertError.message}`,
      });
    }

    // 4. Gọi API PayOS SDK để tạo link thanh toán (checkoutUrl)
    const payos = getPayOSClient();
    const paymentLinkRes = await payos.paymentRequests.create({
      orderCode,
      amount,
      description: orderDescription,
      returnUrl,
      cancelUrl,
      buyerName: body.buyerName ? String(body.buyerName).slice(0, 50) : undefined,
      buyerEmail: body.buyerEmail ? String(body.buyerEmail).slice(0, 50) : undefined,
      buyerPhone: body.buyerPhone ? String(body.buyerPhone).slice(0, 20) : undefined,
    });

    if (!paymentLinkRes || !paymentLinkRes.checkoutUrl) {
      return res.status(500).json({
        error: 'PayOS không trả về checkoutUrl hợp lệ.',
      });
    }

    // 5. Cập nhật payment_link_id vào transaction metadata
    try {
      await supabase
        .from('transactions')
        .update({
          metadata: {
            order_code_num: orderCode,
            service_type: serviceType,
            plan_id: planId,
            room_id: roomId,
            payment_link_id: paymentLinkRes.paymentLinkId || null,
            payos_qr_code: paymentLinkRes.qrCode || null,
          },
        })
        .eq('id', insertedTx.id);
    } catch {
      // Non-blocking metadata update
    }

    const bin = paymentLinkRes.bin || '970422';
    const accountNumber = paymentLinkRes.accountNumber || '0981246282';
    const accountName = paymentLinkRes.accountName || 'NGUYEN DUY ANH';

    // Link ảnh VietQR chuẩn NAPAS để hiển thị trực tiếp ngay trên website Trọ Xinh
    const qrImageUrl = `https://img.vietqr.io/image/${bin}-${accountNumber}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(
      orderDescription
    )}&accountName=${encodeURIComponent(accountName)}`;

    return res.status(200).json({
      success: true,
      orderCode,
      checkoutUrl: paymentLinkRes.checkoutUrl,
      paymentLinkId: paymentLinkRes.paymentLinkId,
      qrCode: qrImageUrl,
      rawQrCode: paymentLinkRes.qrCode,
      bin,
      accountNumber,
      accountName,
      amount,
      description: orderDescription,
      status: 'PENDING',
    });
  } catch (err: any) {
    console.error('[PayOS Create Payment Link] Error:', err);
    return res.status(500).json({
      error: err?.message || 'Lỗi máy chủ khi khởi tạo link thanh toán PayOS.',
    });
  }
}

