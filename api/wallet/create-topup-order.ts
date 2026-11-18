import {
  WALLET_BANK_CONFIG,
  WALLET_MOMO_CONFIG,
  buildVietQrImageUrl,
  calculateWalletXuBreakdown,
  generateTopupOrderCode,
  getWalletSupabaseClient,
  resolveProfileByFirebaseUid,
  verifyFirebaseIdToken,
} from '../_lib/walletServer.js';
import {
  PAYOS_DEFAULT_RECEIVER,
  buildPayOSDescription,
  buildPayOSQrDataUrl,
  generatePayOSOrderCode,
  getBaseUrl,
  getPayOSClient,
} from '../_lib/payosServer.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Chỉ chấp nhận phương thức POST.' });
  }

  try {
    const authHeader = req.headers?.authorization || req.headers?.Authorization;
    const claims = await verifyFirebaseIdToken(authHeader);

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const amountVnd = Number(body.amountVnd);
    const method = body.method === 'momo' ? 'momo' : body.method === 'payos' ? 'payos' : 'vietqr';

    const breakdown = calculateWalletXuBreakdown(amountVnd);
    const { supabase } = getWalletSupabaseClient(authHeader);
    const profile = await resolveProfileByFirebaseUid(supabase, claims.uid);

    if (!profile) {
      return res.status(404).json({
        error: 'Chưa tìm thấy hồ sơ người dùng trên Supabase. Vui lòng đăng xuất và đăng nhập lại.',
      });
    }

    const isSandbox = Boolean(profile.is_demo_account || claims.isDemoClaim);
    let orderCode = '';
    let payosOrderNum = 0;

    if (method === 'payos') {
      payosOrderNum = generatePayOSOrderCode();
      orderCode = String(payosOrderNum);
    } else {
      orderCode = isSandbox
        ? `DEMO${generateTopupOrderCode().slice(5)}`
        : generateTopupOrderCode();
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000).toISOString();
    let transferContent = orderCode;

    let payosCheckoutUrl: string | undefined = undefined;
    let payosQrImage: string | undefined = undefined;
    let payosRawQr: string | undefined = undefined;
    let payosPaymentLinkId: string | undefined = undefined;
    let payosBin: string = PAYOS_DEFAULT_RECEIVER.bin;
    let payosReceiver = {
      bankName: PAYOS_DEFAULT_RECEIVER.bankName,
      accountNumber: PAYOS_DEFAULT_RECEIVER.accountNumber,
      accountNumberLabel: 'Số tài khoản nhận (MBBank)',
      accountName: PAYOS_DEFAULT_RECEIVER.accountName,
    };

    if (method === 'payos') {
      try {
        const payos = getPayOSClient();
        const baseUrl = getBaseUrl(req);
        const walletPath =
          profile.app_role === 'owner' || profile.app_role === 'admin' ? '/chu-tro/vi-xu' : '/vi-xu';
        // Quay về bước thanh-toan để máy chủ đối soát thật với PayOS/DB rồi mới chuyển sang màn hình Thành công
        const returnUrl = `${baseUrl}${walletPath}?buoc=thanh-toan&order=${orderCode}`;
        const cancelUrl = `${baseUrl}${walletPath}?buoc=het-han&order=${orderCode}`;
        const shortDesc = buildPayOSDescription('XU', payosOrderNum);

        const payosRes = await payos.paymentRequests.create({
          orderCode: payosOrderNum,
          amount: breakdown.amountVnd,
          description: shortDesc,
          returnUrl,
          cancelUrl,
          buyerName: (profile as any)?.name || claims.email || undefined,
          buyerEmail: claims.email || undefined,
        });

        payosCheckoutUrl = payosRes.checkoutUrl;
        payosRawQr = payosRes.qrCode || undefined;
        payosPaymentLinkId = payosRes.paymentLinkId || undefined;
        payosBin = payosRes.bin || PAYOS_DEFAULT_RECEIVER.bin;
        const accNo = payosRes.accountNumber || PAYOS_DEFAULT_RECEIVER.accountNumber;
        const accName = payosRes.accountName || PAYOS_DEFAULT_RECEIVER.accountName;
        const officialDesc = payosRes.description || shortDesc;

        transferContent = officialDesc;
        payosReceiver.accountNumber = accNo;
        payosReceiver.accountName = accName;
        payosQrImage = await buildPayOSQrDataUrl({
          qrCode: payosRes.qrCode,
          bin: payosBin,
          accountNumber: accNo,
          accountName: accName,
          amount: breakdown.amountVnd,
          description: officialDesc,
        });
      } catch (payosErr: any) {
        console.error('[Create Topup Order] PayOS create error:', payosErr);
        return res.status(502).json({
          error: `Không thể khởi tạo giao dịch với cổng PayOS (${payosErr?.message || 'Lỗi kết nối PayOS'}). Vui lòng thử lại sau giây lát.`,
        });
      }
    }

    let insertedOrder: any = null;
    const { data: fullOrder, error: fullInsertErr } = await supabase
      .from('transactions')
      .insert({
        order_code: orderCode,
        user_id: profile.id,
        plan_id: 'wallet_topup',
        amount: breakdown.amountVnd,
        payment_method: method,
        status: 'pending',
        expires_at: expiresAt,
        metadata: {
          type: 'wallet_topup',
          real_xu: breakdown.realXu,
          bonus_xu: breakdown.bonusXu,
          total_xu: breakdown.totalXu,
          bonus_percent: breakdown.bonusPercent,
          is_sandbox: isSandbox,
          order_code_num: method === 'payos' ? payosOrderNum : undefined,
          payment_link_id: payosPaymentLinkId,
          payos_description: method === 'payos' ? transferContent : undefined,
          payos_bin: method === 'payos' ? payosBin : undefined,
          payos_account_number: method === 'payos' ? payosReceiver.accountNumber : undefined,
          payos_account_name: method === 'payos' ? payosReceiver.accountName : undefined,
          payos_raw_qr: payosRawQr,
          checkout_url: payosCheckoutUrl,
        },
        created_at: now.toISOString(),
      })
      .select('id, order_code, amount, payment_method, status, expires_at, metadata, created_at')
      .single();

    if (fullInsertErr) {
      const missingMigrationCols =
        fullInsertErr.code === '42703' ||
        fullInsertErr.code === 'PGRST204' ||
        /column .* does not exist|schema cache/i.test(fullInsertErr.message || '');

      if (!missingMigrationCols) {
        return res.status(500).json({
          error: `Không thể tạo đơn nạp Xu: ${fullInsertErr.message}`,
        });
      }

      // Tương thích ngược nếu quản trị viên chưa chạy migration 050 thêm expires_at & metadata
      const { data: baseOrder, error: baseInsertErr } = await supabase
        .from('transactions')
        .insert({
          order_code: orderCode,
          user_id: profile.id,
          plan_id: 'wallet_topup',
          amount: breakdown.amountVnd,
          payment_method: method,
          status: 'pending',
          created_at: now.toISOString(),
        })
        .select('id, order_code, amount, payment_method, status, created_at')
        .single();

      if (baseInsertErr || !baseOrder) {
        return res.status(500).json({
          error: `Không thể tạo đơn nạp Xu: ${baseInsertErr?.message || fullInsertErr.message}`,
        });
      }
      insertedOrder = baseOrder;
    } else {
      insertedOrder = fullOrder;
    }

    const qrCode =
      method === 'payos'
        ? payosQrImage!
        : method === 'momo'
        ? buildVietQrImageUrl(
            WALLET_MOMO_CONFIG.vietQrBankId,
            WALLET_MOMO_CONFIG.phoneNumber,
            breakdown.amountVnd,
            transferContent,
            WALLET_MOMO_CONFIG.receiverName
          )
        : buildVietQrImageUrl(
            WALLET_BANK_CONFIG.vietQrBankId,
            WALLET_BANK_CONFIG.accountNumber,
            breakdown.amountVnd,
            transferContent,
            WALLET_BANK_CONFIG.accountName
          );

    const deeplink =
      method === 'payos'
        ? payosCheckoutUrl
        : method === 'momo'
        ? `momo://app?action=pay&amount=${breakdown.amountVnd}&receiver=${WALLET_MOMO_CONFIG.phoneNumber}&comment=${encodeURIComponent(
            transferContent
          )}`
        : undefined;

    return res.status(200).json({
      success: true,
      order: {
        id: insertedOrder.id,
        orderCode: insertedOrder.order_code,
        amountVnd: breakdown.amountVnd,
        realXu: breakdown.realXu,
        bonusXu: breakdown.bonusXu,
        totalXu: breakdown.totalXu,
        bonusPercent: breakdown.bonusPercent,
        method,
        status: insertedOrder.status,
        expiresAt: insertedOrder.expires_at || expiresAt,
        isSandbox,
        qrCode,
        deeplink,
        transferContent,
        receiverInfo:
          method === 'payos'
            ? payosReceiver
            : method === 'momo'
            ? {
                bankName: WALLET_MOMO_CONFIG.providerName,
                accountNumber: WALLET_MOMO_CONFIG.phoneNumber,
                accountNumberLabel: 'Số điện thoại MoMo',
                accountName: WALLET_MOMO_CONFIG.receiverName,
              }
            : {
                bankName: WALLET_BANK_CONFIG.bankShortName,
                accountNumber: WALLET_BANK_CONFIG.accountNumber,
                accountNumberLabel: 'Số tài khoản',
                accountName: WALLET_BANK_CONFIG.accountName,
              },
      },
    });
  } catch (err: any) {
    const message = err?.message || 'Không thể khởi tạo đơn nạp Xu.';
    const isAuthError = message.includes('Firebase') || message.includes('Bearer');
    return res.status(isAuthError ? 401 : 400).json({ error: message });
  }
}

