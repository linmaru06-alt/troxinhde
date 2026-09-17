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

export async function recordSuccessfulPayment(
  userId: string,
  orderCode: string | number,
  planId: string,
  amount: number,
  paymentMethod: string = 'vietqr'
) {
  if (!isSupabaseConfigured) return null;

  try {
    const validUserId = userId.length === 36 ? userId : '00000000-0000-0000-0000-000000000002';
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    // 1. Insert transaction
    const { data: tx, error: txErr } = await supabase
      .from('transactions')
      .upsert(
        {
          user_id: validUserId,
          order_code: String(orderCode),
          plan_id: planId,
          amount,
          status: 'success',
          payment_method: paymentMethod,
          activated_at: new Date().toISOString(),
        },
        { onConflict: 'order_code' }
      )
      .select()
      .single();

    if (txErr) {
      console.warn('[Payments] Lỗi ghi nhận transaction:', txErr.message);
    }

    // 2. Insert or update user subscription
    const { data: sub, error: subErr } = await supabase
      .from('user_subscriptions')
      .insert({
        user_id: validUserId,
        plan_id: planId,
        expires_at: expiresAt,
        transaction_id: tx?.id || null,
      })
      .select()
      .single();

    if (subErr) {
      console.warn('[Payments] Lỗi cập nhật subscription:', subErr.message);
    }

    return { transaction: tx, subscription: sub };
  } catch (err) {
    console.error('[Payments] Lỗi hệ thống thanh toán:', err);
    return null;
  }
}
