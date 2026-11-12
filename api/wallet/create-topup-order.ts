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

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Chỉ chấp nhận phương thức POST.' });
  }

  try {
    const authHeader = req.headers?.authorization || req.headers?.Authorization;
    const claims = await verifyFirebaseIdToken(authHeader);

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const amountVnd = Number(body.amountVnd);
    const method = body.method === 'momo' ? 'momo' : 'vietqr';

    const breakdown = calculateWalletXuBreakdown(amountVnd);
    const { supabase } = getWalletSupabaseClient(authHeader);
    const profile = await resolveProfileByFirebaseUid(supabase, claims.uid);

    if (!profile) {
      return res.status(404).json({
        error: 'Chưa tìm thấy hồ sơ người dùng trên Supabase. Vui lòng đăng xuất và đăng nhập lại.',
      });
    }

    const isSandbox = Boolean(profile.is_demo_account || claims.isDemoClaim);
    const orderCode = isSandbox
      ? `DEMO${generateTopupOrderCode().slice(5)}`
      : generateTopupOrderCode();

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 15 * 60 * 1000).toISOString();
    const transferContent = orderCode;

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
      method === 'momo'
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
      method === 'momo'
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
          method === 'momo'
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

