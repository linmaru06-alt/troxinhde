import {
  PAYOS_DEFAULT_RECEIVER,
  buildPayOSDescription,
  buildPayOSQrDataUrl,
  generatePayOSOrderCode,
  getBaseUrl,
  getPayOSClient,
  getPayOSServerSupabase,
} from '../_lib/payosServer.js';
import {
  getWalletSupabaseClient,
  resolveProfileByFirebaseUid,
  verifyFirebaseIdToken,
} from '../_lib/walletServer.js';

/**
 * Tạo link thanh toán & mã VietQR chuẩn PayOS (payos.vn)
 * Endpoint: POST /api/payos/create-payment-link
 *
 * Luồng xử lý:
 * 1. Kiểm tra tính hợp lệ số tiền (số nguyên VNĐ > 0) và xác thực Firebase user (nếu có).
 * 2. Sinh mã đơn hàng số nguyên duy nhất chuẩn PayOS (`orderCode: number`).
 * 3. Gọi PayOS SDK (`payos.paymentRequests.create`) lấy `checkoutUrl`, `qrCode` EMVCo gốc & `description` đối soát thật.
 * 4. Lưu đơn hàng ở trạng thái `pending` vào bảng `transactions` (Supabase) kèm đầy đủ `metadata` cho RPC kích hoạt.
 * 5. Trả ảnh QR được render trực tiếp từ `paymentLinkRes.qrCode` gốc của PayOS để khách quét ngay trên web.
 */
export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
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
    const billingCycle = body.billingCycle === 'yearly' ? 'yearly' : 'monthly';

    // Xác thực tài khoản Firebase nếu có gửi Authorization header
    let userId: string | null = null;
    const authHeader = req.headers?.authorization || req.headers?.Authorization;
    const supabase = authHeader
      ? getWalletSupabaseClient(authHeader).supabase
      : getPayOSServerSupabase();

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
        console.warn('[PayOS Create] Warning: Auth header verification skipped/failed:', authErr);
      }
    }

    // 1. Sinh mã đơn hàng số nguyên duy nhất theo chuẩn PayOS
    const orderCode = generatePayOSOrderCode();
    const orderCodeStr = String(orderCode);

    // 2. Cấu hình returnUrl & cancelUrl
    const baseUrl = getBaseUrl(req);
    const returnUrl = body.returnUrl || `${baseUrl}/thanh-toan/thanh-cong?orderCode=${orderCode}`;
    const cancelUrl = body.cancelUrl || `${baseUrl}/thanh-toan/da-huy?orderCode=${orderCode}`;

    // Mô tả ngắn <= 9 ký tự chuẩn PayOS (tương thích cả tài khoản ngân hàng cá nhân không VA)
    const requestDescription = buildPayOSDescription('TX', orderCode);

    // 3. Gọi API PayOS SDK tạo link & lấy mã QR gốc + nội dung đối soát thật từ PayOS
    const payos = getPayOSClient();
    const paymentLinkRes = await payos.paymentRequests.create({
      orderCode,
      amount,
      description: requestDescription,
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

    // Dùng CHÍNH XÁC thông tin đối soát mà PayOS trả về (description có thể gồm mã nhận diện CS...)
    const officialDescription = paymentLinkRes.description || requestDescription;
    const bin = paymentLinkRes.bin || PAYOS_DEFAULT_RECEIVER.bin;
    const accountNumber = paymentLinkRes.accountNumber || PAYOS_DEFAULT_RECEIVER.accountNumber;
    const accountName = paymentLinkRes.accountName || PAYOS_DEFAULT_RECEIVER.accountName;
    const qrImageUrl = await buildPayOSQrDataUrl({
      qrCode: paymentLinkRes.qrCode,
      bin,
      accountNumber,
      accountName,
      amount,
      description: officialDescription,
    });

    // 4. Lưu bản ghi đơn hàng với trạng thái PENDING và đầy đủ metadata trong 1 lần INSERT duy nhất
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000).toISOString();

    const { error: insertError } = await supabase
      .from('transactions')
      .insert({
        order_code: orderCodeStr,
        user_id: userId,
        plan_id: planId,
        room_id: roomId,
        amount,
        payment_method: 'payos',
        status: 'pending',
        expires_at: expiresAt,
        metadata: {
          order_code_num: orderCode,
          service_type: serviceType,
          fulfillment_mode: 'rpc',
          plan_id: planId,
          billing_cycle: billingCycle,
          room_id: roomId,
          description: body.description || officialDescription,
          payos_description: officialDescription,
          payos_bin: bin,
          payos_account_number: accountNumber,
          payos_account_name: accountName,
          payment_link_id: paymentLinkRes.paymentLinkId || null,
          payos_raw_qr: paymentLinkRes.qrCode || null,
          checkout_url: paymentLinkRes.checkoutUrl,
          buyer_email: body.buyerEmail || null,
          buyer_name: body.buyerName || null,
        },
        created_at: now.toISOString(),
      })
      .select('id, order_code, amount, status, created_at')
      .single();

    if (insertError) {
      console.error('[PayOS Create] Lỗi lưu đơn hàng vào database:', insertError);
      return res.status(500).json({
        error: `Không thể tạo bản ghi đơn hàng trong cơ sở dữ liệu: ${insertError.message}`,
      });
    }

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
      description: officialDescription,
      status: 'PENDING',
    });
  } catch (err: any) {
    console.error('[PayOS Create Payment Link] Error:', err);
    return res.status(500).json({
      error: err?.message || 'Lỗi máy chủ khi khởi tạo link thanh toán PayOS.',
    });
  }
}
