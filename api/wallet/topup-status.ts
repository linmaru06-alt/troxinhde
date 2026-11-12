import {
  WALLET_BANK_CONFIG,
  WALLET_MOMO_CONFIG,
  buildVietQrImageUrl,
  calculateWalletXuBreakdown,
  getWalletSupabaseClient,
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

    const { supabase, isServiceRole } = getWalletSupabaseClient(authHeader);
    const profile = await resolveProfileByFirebaseUid(supabase, claims.uid);
    if (!profile) {
      return res.status(404).json({ error: 'Không tìm thấy hồ sơ người dùng.' });
    }

    let tx: any = null;
    const { data: fullTx, error: fullTxError } = await supabase
      .from('transactions')
      .select('id, order_code, user_id, amount, payment_method, status, expires_at, paid_at, activated_at, metadata, created_at')
      .eq('order_code', orderCode)
      .eq('user_id', profile.id)
      .maybeSingle();

    if (fullTxError) {
      const missingMigrationCols =
        fullTxError.code === '42703' ||
        fullTxError.code === 'PGRST204' ||
        /column .* does not exist|schema cache/i.test(fullTxError.message || '');

      if (!missingMigrationCols) {
        return res.status(500).json({ error: `Lỗi tra cứu đơn nạp: ${fullTxError.message}` });
      }

      const { data: baseTx, error: baseTxError } = await supabase
        .from('transactions')
        .select('id, order_code, user_id, amount, payment_method, status, paid_at, activated_at, created_at')
        .eq('order_code', orderCode)
        .eq('user_id', profile.id)
        .maybeSingle();

      if (baseTxError) {
        return res.status(500).json({ error: `Lỗi tra cứu đơn nạp: ${baseTxError.message}` });
      }
      tx = baseTx;
    } else {
      tx = fullTx;
    }

    if (!tx) {
      return res.status(404).json({ error: 'Không tìm thấy đơn nạp Xu tương ứng.' });
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

    const { data: wallet } = await supabase
      .from('k23_wallets')
      .select('id, owner_id, balance_real_xu, balance_bonus_xu, updated_at')
      .eq('owner_id', profile.id)
      .maybeSingle();

    const normalizedMethod = tx.payment_method === 'momo' ? 'momo' : 'vietqr';
    const meta = (tx.metadata || {}) as Record<string, any>;
    const breakdown = calculateWalletXuBreakdown(Number(tx.amount) || 50000);
    const realXu = Number(meta.real_xu ?? breakdown.realXu);
    const bonusXu = Number(meta.bonus_xu ?? breakdown.bonusXu);
    const totalXu = Number(meta.total_xu ?? realXu + bonusXu);
    const bonusPercent = Number(meta.bonus_percent ?? breakdown.bonusPercent);

    const qrCode =
      normalizedMethod === 'momo'
        ? buildVietQrImageUrl(
            WALLET_MOMO_CONFIG.vietQrBankId,
            WALLET_MOMO_CONFIG.phoneNumber,
            tx.amount,
            tx.order_code,
            WALLET_MOMO_CONFIG.receiverName
          )
        : buildVietQrImageUrl(
            WALLET_BANK_CONFIG.vietQrBankId,
            WALLET_BANK_CONFIG.accountNumber,
            tx.amount,
            tx.order_code,
            WALLET_BANK_CONFIG.accountName
          );

    const deeplink =
      normalizedMethod === 'momo'
        ? `momo://app?action=pay&amount=${tx.amount}&receiver=${WALLET_MOMO_CONFIG.phoneNumber}&comment=${encodeURIComponent(
            tx.order_code
          )}`
        : undefined;

    return res.status(200).json({
      success: true,
      orderCode: tx.order_code,
      status: currentStatus,
      amount: tx.amount,
      paymentMethod: normalizedMethod,
      paidAt: tx.paid_at,
      expiresAt: resolvedExpiresAt,
      metadata: meta,
      order: {
        id: tx.id,
        orderCode: tx.order_code,
        amountVnd: tx.amount,
        realXu,
        bonusXu,
        totalXu,
        bonusPercent,
        method: normalizedMethod,
        status: currentStatus,
        expiresAt: resolvedExpiresAt,
        isSandbox: Boolean(meta.is_sandbox ?? profile.is_demo_account),
        qrCode,
        deeplink,
        transferContent: tx.order_code,
        receiverInfo:
          normalizedMethod === 'momo'
            ? {
                bankName: WALLET_MOMO_CONFIG.providerName,
                accountNumber: WALLET_MOMO_CONFIG.phoneNumber,
                accountNumberLabel: 'Số ví MoMo nhận',
                accountName: WALLET_MOMO_CONFIG.receiverName,
              }
            : {
                bankName: WALLET_BANK_CONFIG.bankName,
                accountNumber: WALLET_BANK_CONFIG.accountNumber,
                accountNumberLabel: 'Số tài khoản',
                accountName: WALLET_BANK_CONFIG.accountName,
              },
      },
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

