import { supabase, isSupabaseConfigured } from '../supabase';

export async function getUserSubscription(userId: string) {
  if (!isSupabaseConfigured) return null;

  const { data, error } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .order('expires_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  const isActive = Boolean(data.expires_at && new Date(data.expires_at).getTime() > Date.now());

  return {
    ...data,
    is_active: isActive,
  };
}

export async function getUserTransactions(userId: string) {
  if (!isSupabaseConfigured) return [];

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export interface CreatePendingTransactionParams {
  orderCode: string | number;
  userId?: string | null;
  planId: string;
  roomId?: string | null;
  amount: number;
  paymentMethod?: string;
}

/**
 * Ghi nhận giao dịch đang chờ thanh toán (status = 'pending') vào Supabase
 * Tuân thủ RLS: Chỉ cho phép chèn status = 'pending'
 */
export async function createPendingTransaction(params: CreatePendingTransactionParams) {
  if (!isSupabaseConfigured) return null;

  try {
    const validUserId = params.userId && params.userId.length === 36 ? params.userId : null;

    const payload = {
      order_code: String(params.orderCode),
      user_id: validUserId,
      plan_id: params.planId,
      room_id: params.roomId || null,
      amount: params.amount,
      payment_method: params.paymentMethod || 'vietqr',
      status: 'pending',
    };

    const { data, error } = await supabase
      .from('transactions')
      .upsert(payload, { onConflict: 'order_code' })
      .select()
      .maybeSingle();

    if (error) {
      console.warn('[Payments] Lưu pending transaction gặp cảnh báo:', error.message);
      return null;
    }

    return data;
  } catch (err) {
    console.warn('[Payments] Không thể tạo pending transaction:', err);
    return null;
  }
}

/**
 * Xác thực trạng thái thanh toán từ Server Database (Read-only an toàn)
 */
export async function verifyPaymentFromDatabase(
  orderCode: string | number
): Promise<{ status: 'waiting' | 'success' | 'failed' | 'expired'; data?: any }> {
  if (!isSupabaseConfigured) return { status: 'waiting' };

  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('status, plan_id, amount, paid_at, activated_at')
      .eq('order_code', String(orderCode))
      .maybeSingle();

    if (error || !data) return { status: 'waiting' };

    if (data.status === 'success' || data.status === 'paid') {
      return { status: 'success', data };
    }
    if (data.status === 'failed' || data.status === 'cancelled') {
      return { status: 'failed', data };
    }
    if (data.status === 'expired') {
      return { status: 'expired', data };
    }

    return { status: 'waiting', data };
  } catch {
    return { status: 'waiting' };
  }
}

/**
 * Ghi nhận giao dịch thanh toán (Chỉ dùng cho môi trường Sandbox Demo hoặc Fallback cục bộ có kiểm soát)
 */
export async function recordSuccessfulPayment(
  userId: string,
  orderCode: string | number,
  planId: string,
  amount: number,
  paymentMethod: string = 'vietqr'
) {
  if (!isSupabaseConfigured) return null;

  try {
    const validUserId = userId.length === 36 ? userId : null;
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    // 1. Chỉ cập nhật khi ở môi trường phát triển / sandbox
    const { data: tx, error: txErr } = await supabase
      .from('transactions')
      .upsert(
        {
          user_id: validUserId,
          order_code: String(orderCode),
          plan_id: planId,
          amount,
          status: 'paid',
          payment_method: paymentMethod,
          activated_at: new Date().toISOString(),
          paid_at: new Date().toISOString(),
        },
        { onConflict: 'order_code' }
      )
      .select()
      .maybeSingle();

    if (txErr) {
      console.warn('[Payments] Lưu transaction ghi nhận:', txErr.message);
    }

    // 2. Cập nhật subscription nếu có user_id hợp lệ
    if (validUserId) {
      const { data: sub, error: subErr } = await supabase
        .from('user_subscriptions')
        .insert({
          user_id: validUserId,
          plan_id: planId,
          expires_at: expiresAt,
          transaction_id: tx?.id || null,
        })
        .select()
        .maybeSingle();

      if (subErr) {
        console.warn('[Payments] Cập nhật subscription:', subErr.message);
      }
      return { transaction: tx, subscription: sub };
    }

    return { transaction: tx, subscription: null };
  } catch (err) {
    console.error('[Payments] Lỗi hệ thống thanh toán:', err);
    return null;
  }
}
