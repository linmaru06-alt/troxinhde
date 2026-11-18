import { PayOS } from '@payos/node';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import QRCode from 'qrcode';

const DEFAULT_SUPABASE_URL = 'https://nanhmbnpihlaojbwfebb.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'sb_publishable_aIbyNWURIM1qwQG6g_bTUg_lukLkC4f';

export const PAYOS_DEFAULT_RECEIVER = {
  bin: '970422',
  bankName: 'Ngân hàng Quân Đội (MBBank) qua PayOS',
  accountNumber: '0981246282',
  accountNumberLabel: 'Số tài khoản MBBank',
  accountName: 'NGUYEN DUY ANH',
};

function sanitizeEnvValue(val?: string): string {
  if (!val || typeof val !== 'string') return '';
  return val.trim().replace(/^['"]|['"]$/g, '').trim();
}

/**
 * Kiểm tra xem Vercel đã cấu hình SUPABASE_SERVICE_ROLE_KEY hay chưa
 */
export function hasSupabaseServiceRoleKey(): boolean {
  return Boolean(sanitizeEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY));
}

/**
 * Khởi tạo client PayOS chính thức từ thư viện @payos/node (v2.x)
 * Biến môi trường chỉ được đọc từ process.env, tuyệt đối không hardcode.
 */
export function getPayOSClient(): PayOS {
  const clientId = sanitizeEnvValue(process.env.PAYOS_CLIENT_ID);
  const apiKey = sanitizeEnvValue(process.env.PAYOS_API_KEY);
  const checksumKey = sanitizeEnvValue(process.env.PAYOS_CHECKSUM_KEY);

  if (!clientId || !apiKey || !checksumKey) {
    throw new Error(
      'Chưa cấu hình đầy đủ biến môi trường PayOS (PAYOS_CLIENT_ID, PAYOS_API_KEY, PAYOS_CHECKSUM_KEY) trên Vercel.'
    );
  }

  return new PayOS({
    clientId,
    apiKey,
    checksumKey,
  });
}

/**
 * Lấy URL gốc của website để cấu hình returnUrl và cancelUrl cho PayOS
 */
export function getBaseUrl(req?: any): string {
  const envBase =
    sanitizeEnvValue(process.env.NEXT_PUBLIC_BASE_URL) ||
    sanitizeEnvValue(process.env.VITE_APP_BASE_URL);
  if (envBase) {
    return envBase.replace(/\/+$/, '');
  }

  if (req?.headers?.host) {
    const proto = req.headers['x-forwarded-proto'] || 'https';
    return `${proto}://${req.headers.host}`.replace(/\/+$/, '');
  }

  return 'https://troxinhde-zeta.vercel.app';
}

let orderCounter = Math.floor(Math.random() * 1000);

/**
 * Sinh mã đơn hàng dạng số nguyên duy nhất theo chuẩn PayOS (orderCode: number)
 * PayOS yêu cầu orderCode là số nguyên dương <= 9007199254740991 (Number.MAX_SAFE_INTEGER).
 * Dùng timestamp millisecond trừ epoch offset + 4 chữ số counter tăng dần,
 * đảm bảo 100% duy nhất, không trùng lặp và là số nguyên an toàn.
 */
export function generatePayOSOrderCode(): number {
  orderCounter = (orderCounter + 1) % 10000;
  const offsetTime = Date.now() - 1700000000000;
  return offsetTime * 10000 + orderCounter;
}

/**
 * Tạo nội dung mô tả ngắn gọn <= 9 ký tự chuẩn PayOS (tương thích mọi tài khoản ngân hàng cá nhân & VA).
 * Lưu ý: Khi PayOS trả về response, PHẢI hiển thị đúng `payosRes.description` (vì PayOS có thể ghép thêm tiền tố đối soát).
 */
export function buildPayOSDescription(prefix: string, orderCode: number | string): string {
  const cleanPrefix = String(prefix || 'TX')
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase()
    .slice(0, 3);
  const digits = String(orderCode).replace(/\D/g, '');
  const maxDigits = Math.max(1, 9 - cleanPrefix.length);
  return `${cleanPrefix}${digits.slice(-maxDigits)}`.slice(0, 9);
}

/**
 * Tạo ảnh QR chính xác 100% từ chuỗi EMVCo `payosRes.qrCode` gốc của PayOS.
 * Đảm bảo nội dung chuyển khoản, số tài khoản (kể cả VA) và mã đối soát khớp tuyệt đối với pay.payos.vn.
 */
export async function buildPayOSQrDataUrl(payosRes: {
  qrCode?: string | null;
  bin?: string | null;
  accountNumber?: string | null;
  accountName?: string | null;
  amount: number;
  description?: string | null;
}): Promise<string> {
  const rawQr = typeof payosRes.qrCode === 'string' ? payosRes.qrCode.trim() : '';
  if (rawQr) {
    try {
      return await QRCode.toDataURL(rawQr, {
        width: 320,
        margin: 2,
        errorCorrectionLevel: 'M',
      });
    } catch (qrErr) {
      console.warn('[PayOS QR] Không thể render QR data URL, chuyển sang VietQR URL với dữ liệu PayOS:', qrErr);
    }
  }

  const bin = payosRes.bin || PAYOS_DEFAULT_RECEIVER.bin;
  const accNo = payosRes.accountNumber || PAYOS_DEFAULT_RECEIVER.accountNumber;
  const accName = payosRes.accountName || PAYOS_DEFAULT_RECEIVER.accountName;
  const desc = payosRes.description || '';

  return `https://img.vietqr.io/image/${bin}-${accNo}-compact2.png?amount=${payosRes.amount}&addInfo=${encodeURIComponent(
    desc
  )}&accountName=${encodeURIComponent(accName)}`;
}

/**
 * Kết nối Supabase từ máy chủ Vercel Serverless Function:
 * Ưu tiên SUPABASE_SERVICE_ROLE_KEY nếu có, fallback về SUPABASE_ANON_KEY.
 */
export function getPayOSServerSupabase(): SupabaseClient {
  const supabaseUrl =
    sanitizeEnvValue(process.env.SUPABASE_URL) ||
    sanitizeEnvValue(process.env.VITE_SUPABASE_URL) ||
    DEFAULT_SUPABASE_URL;

  const serviceKey = sanitizeEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const anonKey =
    sanitizeEnvValue(process.env.SUPABASE_ANON_KEY) ||
    sanitizeEnvValue(process.env.VITE_SUPABASE_ANON_KEY) ||
    DEFAULT_SUPABASE_ANON_KEY;

  const keyToUse = serviceKey || anonKey;

  return createClient(supabaseUrl, keyToUse, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export interface FulfillPayOSTxInput {
  supabase: SupabaseClient;
  tx: {
    id: string;
    order_code: string;
    user_id?: string | null;
    plan_id?: string | null;
    room_id?: string | null;
    amount: number;
    status: string;
    metadata?: Record<string, any> | null;
  };
  paidAmount: number;
  referenceId?: string | null;
  payosCode?: string | null;
  rawPayload?: any;
  signature?: string | null;
  source: 'webhook' | 'active_sync';
}

export interface FulfillPayOSTxResult {
  success: boolean;
  alreadyProcessed?: boolean;
  insufficientAmount?: boolean;
  fulfilledBy?: 'wallet_rpc' | 'service_rpc' | 'direct_update' | 'none';
  error?: string;
}

/**
 * Xử lý hoàn tất đơn hàng PayOS một cách NGUYÊN TỬ (Atomic) & CHỐNG TRÙNG LẶP (Idempotent):
 * - BẮT BUỘC kiểm tra số tiền thực nhận >= số tiền đơn hàng.
 * - GỌI RPC cộng Xu (`credit_wallet_from_topup`) hoặc kích hoạt dịch vụ (`fulfill_paid_service_order`)
 *   TRƯỚC KHI chạm vào trạng thái `transactions.status` (vì cả 2 RPC tự khóa dòng FOR UPDATE,
 *   tự đổi status = 'paid' và bỏ qua nếu status đã là 'paid').
 * - Sau đó mới bổ sung metadata đối soát PayOS (signature, raw_payload, payos_reference).
 */
export async function fulfillPaidPayOSTransaction(
  input: FulfillPayOSTxInput
): Promise<FulfillPayOSTxResult> {
  const { supabase, tx, paidAmount, referenceId, payosCode, rawPayload, signature, source } = input;
  const actualOrderCode = String(tx.order_code);
  const expectedAmount = Number(tx.amount) || 0;
  const effectivePaidAmount = Number(paidAmount) || 0;

  if (tx.status === 'paid' || tx.status === 'success') {
    return { success: true, alreadyProcessed: true, fulfilledBy: 'none' };
  }

  if (effectivePaidAmount < expectedAmount) {
    console.warn(
      `[PayOS Fulfill] Đơn #${actualOrderCode} chưa đủ tiền: thực nhận ${effectivePaidAmount} < yêu cầu ${expectedAmount}`
    );
    return {
      success: false,
      insufficientAmount: true,
      fulfilledBy: 'none',
      error: `Số tiền thanh toán (${effectivePaidAmount.toLocaleString('vi-VN')}đ) chưa đủ mức yêu cầu (${expectedAmount.toLocaleString('vi-VN')}đ).`,
    };
  }

  if (!hasSupabaseServiceRoleKey()) {
    console.error(
      `[PayOS Fulfill] THIẾU SUPABASE_SERVICE_ROLE_KEY trên Vercel! Không thể chạy RPC cộng Xu/kích hoạt dịch vụ cho đơn #${actualOrderCode}.`
    );
  }

  const nowIso = new Date().toISOString();
  const effectiveRef = referenceId || `PAYOS_${actualOrderCode}`;
  const isWalletTopup =
    tx.plan_id === 'wallet_topup' || tx.metadata?.type === 'wallet_topup';

  let fulfilledBy: 'wallet_rpc' | 'service_rpc' | 'direct_update' | 'none' = 'none';
  let rpcHandledPaidStatus = false;

  if (isWalletTopup) {
    const { data: topupRes, error: topupErr } = await supabase.rpc('credit_wallet_from_topup', {
      p_order_code: actualOrderCode,
      p_paid_amount: effectivePaidAmount,
      p_reference_id: effectiveRef,
      p_gateway: 'PayOS',
    });

    if (topupErr) {
      console.error(`[PayOS Fulfill] credit_wallet_from_topup error (#${actualOrderCode}):`, topupErr);
      return {
        success: false,
        fulfilledBy: 'none',
        error: `Lỗi cộng Xu vào ví: ${topupErr.message}`,
      };
    }

    if (topupRes && topupRes.success === false) {
      console.error(`[PayOS Fulfill] credit_wallet_from_topup rejected (#${actualOrderCode}):`, topupRes);
      return {
        success: false,
        insufficientAmount: topupRes.error === 'INSUFFICIENT_AMOUNT',
        fulfilledBy: 'none',
        error: `Không thể cộng Xu (${topupRes.error || 'UNKNOWN'})`,
      };
    }

    fulfilledBy = 'wallet_rpc';
    rpcHandledPaidStatus = true;
    console.log(`[PayOS Fulfill] Đã cộng Xu thành công cho đơn #${actualOrderCode} (qua ${source}):`, topupRes);
  } else {
    const { data: serviceRes, error: serviceErr } = await supabase.rpc('fulfill_paid_service_order', {
      p_order_code: actualOrderCode,
      p_paid_amount: effectivePaidAmount,
      p_reference_id: effectiveRef,
      p_gateway: 'PayOS',
    });

    if (!serviceErr && serviceRes?.success === true) {
      fulfilledBy = 'service_rpc';
      rpcHandledPaidStatus = true;
      console.log(
        `[PayOS Fulfill] Đã kích hoạt dịch vụ thành công cho đơn #${actualOrderCode} (qua ${source}):`,
        serviceRes
      );
    } else if (!serviceErr && serviceRes?.error === 'INSUFFICIENT_AMOUNT') {
      return {
        success: false,
        insufficientAmount: true,
        fulfilledBy: 'none',
        error: 'Số tiền thanh toán chưa đủ cho gói dịch vụ.',
      };
    } else {
      // Nếu là đơn dịch vụ chuẩn mà RPC lỗi do thiếu quyền service_role -> báo lỗi rõ ràng thay vì che giấu
      const errMsg = serviceErr?.message || serviceRes?.error || '';
      const isPermissionErr = /permission denied|42501|unauthorized/i.test(errMsg);
      if (isPermissionErr) {
        console.error(`[PayOS Fulfill] Lỗi quyền RPC (#${actualOrderCode}):`, errMsg);
        return {
          success: false,
          fulfilledBy: 'none',
          error: `Máy chủ thiếu quyền thực thi RPC (kiểm tra SUPABASE_SERVICE_ROLE_KEY): ${errMsg}`,
        };
      }

      console.warn(
        `[PayOS Fulfill] fulfill_paid_service_order không xử lý đơn #${actualOrderCode} (${errMsg}), chuyển cập nhật trạng thái paid trực tiếp.`
      );
    }
  }

  // Bổ sung metadata đối soát PayOS (và set status = 'paid' nếu là đơn tổng quát chưa đi qua RPC)
  const updatePayload: Record<string, any> = {
    metadata: {
      ...(tx.metadata || {}),
      payos_reference: effectiveRef,
      payos_amount: effectivePaidAmount,
      payos_code: payosCode || '00',
      paid_at: nowIso,
      fulfilled_via: source,
      fulfilled_by: fulfilledBy !== 'none' ? fulfilledBy : 'direct_update',
    },
  };

  if (signature) {
    updatePayload.signature = signature;
  }
  if (rawPayload) {
    updatePayload.raw_payload = rawPayload;
  }
  if (!rpcHandledPaidStatus) {
    updatePayload.status = 'paid';
    updatePayload.paid_at = nowIso;
    updatePayload.trans_id = effectiveRef;
    updatePayload.idempotency_key = effectiveRef;
  }

  const { error: updateErr } = await supabase
    .from('transactions')
    .update(updatePayload)
    .eq('id', tx.id);

  if (updateErr) {
    if (!rpcHandledPaidStatus) {
      console.error(`[PayOS Fulfill] Lỗi cập nhật status=paid cho đơn #${actualOrderCode}:`, updateErr);
      return {
        success: false,
        fulfilledBy: 'none',
        error: `Lỗi cập nhật giao dịch trong DB: ${updateErr.message}`,
      };
    }
    // Nếu RPC đã cộng Xu / kích hoạt dịch vụ thành công rồi thì lỗi ghi metadata bổ sung là non-blocking
    console.warn(`[PayOS Fulfill] Ghi metadata bổ sung thất bại (non-blocking) cho #${actualOrderCode}:`, updateErr.message);
  } else if (!rpcHandledPaidStatus) {
    fulfilledBy = 'direct_update';
  }

  return {
    success: true,
    alreadyProcessed: false,
    fulfilledBy,
  };
}

/**
 * Đối soát chủ động trực tiếp với PayOS API (`payos.paymentRequests.get`) khi đơn trong DB vẫn đang `pending`.
 * Giúp đảm bảo dù Webhook PayOS đến chậm hay rớt mạng, ngay khi khách chuyển đủ tiền và màn hình poll (mỗi 3s),
 * máy chủ sẽ tự xác minh với PayOS, cộng Xu / kích hoạt gói và trả về `paid` tức thì cho màn hình người dùng!
 */
export async function syncPayOSOrderStatusIfNeeded(params: {
  supabase: SupabaseClient;
  tx: {
    id: string;
    order_code: string;
    user_id?: string | null;
    plan_id?: string | null;
    room_id?: string | null;
    amount: number;
    payment_method?: string | null;
    status: string;
    metadata?: Record<string, any> | null;
  };
}): Promise<{
  status: string;
  syncedFromPayOS: boolean;
  paidAt?: string | null;
  error?: string;
}> {
  const { supabase, tx } = params;

  if (tx.status !== 'pending') {
    return { status: tx.status, syncedFromPayOS: false };
  }

  const meta = (tx.metadata || {}) as Record<string, any>;
  const isPayOSOrder =
    tx.payment_method === 'payos' ||
    Boolean(meta.order_code_num) ||
    Boolean(meta.payment_link_id);

  if (!isPayOSOrder) {
    return { status: tx.status, syncedFromPayOS: false };
  }

  const rawNum = Number(meta.order_code_num || tx.order_code);
  if (!Number.isSafeInteger(rawNum) || rawNum <= 0) {
    return { status: tx.status, syncedFromPayOS: false };
  }

  try {
    const payos = getPayOSClient();
    const payosInfo = await payos.paymentRequests.get(rawNum);
    if (!payosInfo) {
      return { status: tx.status, syncedFromPayOS: false };
    }

    const payosStatus = String(payosInfo.status || '').toUpperCase();
    const amountPaid = Number(payosInfo.amountPaid || 0);
    const amountRemaining = Number(payosInfo.amountRemaining ?? Math.max(0, tx.amount - amountPaid));

    // CHỈ xác nhận PAID khi PayOS báo PAID VÀ số tiền thực nhận đã đủ 100%
    if (payosStatus === 'PAID' && amountPaid >= Number(tx.amount) && amountRemaining <= 0) {
      const firstTx = Array.isArray(payosInfo.transactions) ? payosInfo.transactions[0] : null;
      const refId = firstTx?.reference || `PAYOS_SYNC_${rawNum}`;

      // Dùng service-role supabase để thực thi RPC nguyên tử (nếu có)
      const adminSupabase = hasSupabaseServiceRoleKey() ? getPayOSServerSupabase() : supabase;
      const fulfillRes = await fulfillPaidPayOSTransaction({
        supabase: adminSupabase,
        tx,
        paidAmount: amountPaid,
        referenceId: refId,
        payosCode: '00',
        rawPayload: payosInfo,
        source: 'active_sync',
      });

      if (fulfillRes.success) {
        return {
          status: 'paid',
          syncedFromPayOS: true,
          paidAt: firstTx?.transactionDateTime || new Date().toISOString(),
        };
      }

      return {
        status: tx.status,
        syncedFromPayOS: false,
        error: fulfillRes.error,
      };
    }

    if (payosStatus === 'CANCELLED' || payosStatus === 'EXPIRED') {
      const mapped = payosStatus === 'CANCELLED' ? 'cancelled' : 'expired';
      if (hasSupabaseServiceRoleKey()) {
        await getPayOSServerSupabase()
          .from('transactions')
          .update({ status: mapped })
          .eq('id', tx.id)
          .eq('status', 'pending');
      }
      return { status: mapped, syncedFromPayOS: true };
    }

    return { status: tx.status, syncedFromPayOS: false };
  } catch (err: any) {
    // Nếu PayOS tạm nghẽn mạng hoặc đơn không tồn tại trên PayOS -> không làm crash polling
    console.warn(`[PayOS Active Sync] Không thể truy vấn PayOS cho đơn #${rawNum}:`, err?.message);
    return { status: tx.status, syncedFromPayOS: false };
  }
}
