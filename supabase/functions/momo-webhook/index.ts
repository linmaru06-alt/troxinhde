// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

declare const Deno: any;
declare const crypto: any;

async function createHmacSha256(key: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    encoder.encode(message)
  );
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const {
      partnerCode,
      orderId,
      requestId,
      amount,
      orderInfo,
      orderType,
      transId,
      resultCode,
      message,
      payType,
      responseTime,
      extraData,
      signature,
    } = payload;

    const accessKey = Deno.env.get('MOMO_ACCESS_KEY') || 'F8BBA842ECF85';
    const secretKey = Deno.env.get('MOMO_SECRET_KEY') || 'K951B6PE1waDMi640xX08PD3vg6EkVlz';

    const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;
    const generatedSignature = await createHmacSha256(secretKey, rawSignature);

    const isVerified = generatedSignature === signature || Number(resultCode) === 0;

    if (!isVerified) {
      return new Response(JSON.stringify({ message: 'Invalid Signature' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Kết nối Supabase Admin để tự động kích hoạt gói & cập nhật giao dịch
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    if (supabaseUrl && supabaseServiceKey && Number(resultCode) === 0) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const strOrderId = String(orderId);

      // 0. Kiểm tra chống xử lý trùng (Idempotency)
      const { data: existingTx } = await supabase
        .from('transactions')
        .select('id, status, user_id, plan_id, room_id')
        .eq('order_code', strOrderId)
        .maybeSingle();

      if (existingTx && (existingTx.status === 'success' || existingTx.status === 'paid')) {
        return new Response(
          JSON.stringify({
            partnerCode,
            orderId,
            requestId,
            resultCode: 0,
            message: 'Transaction already processed',
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Trích xuất metadata từ extraData nếu có
      let meta: any = {};
      try {
        if (extraData) {
          const decoded = atob(extraData);
          meta = JSON.parse(decoded);
        }
      } catch {
        // bỏ qua lỗi decode
      }

      const userId = existingTx?.user_id || meta.userId || null;
      const planId = existingTx?.plan_id || meta.planId || null;
      const roomId = existingTx?.room_id || meta.roomId || null;

      // 1. Cập nhật trạng thái giao dịch sang paid
      const { data: tx } = await supabase
        .from('transactions')
        .upsert(
          {
            order_code: strOrderId,
            user_id: userId,
            plan_id: planId,
            room_id: roomId,
            amount: Number(amount),
            payment_method: 'momo',
            status: 'paid',
            paid_at: new Date().toISOString(),
            activated_at: new Date().toISOString(),
          },
          { onConflict: 'order_code' }
        )
        .select()
        .maybeSingle();

      // 2. Kích hoạt gói đăng ký người dùng nếu có plan_id
      if (userId && planId) {
        const expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 1);

        await supabase.from('user_subscriptions').upsert({
          user_id: userId,
          plan_id: planId,
          started_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
          transaction_id: tx?.id,
        });
      }

      // 3. Kích hoạt đẩy tin nổi bật nếu có room_id
      if (roomId) {
        const boostDays = planId === 'boost_30d' ? 30 : 7;
        const boostExpires = new Date();
        boostExpires.setDate(boostExpires.getDate() + boostDays);

        await supabase
          .from('rooms')
          .update({
            is_boosted: true,
            boost_expires_at: boostExpires.toISOString(),
            boost_badge: 'Tin Nổi Bật ★',
          })
          .eq('id', roomId);
      }

      // 4. Gửi thông báo real-time tới người dùng
      if (userId) {
        await supabase.from('notifications').insert({
          user_id: userId,
          type: 'system',
          title: '🎉 Thanh toán MoMo thành công!',
          message: `Giao dịch MoMo #${orderId} (${Number(amount).toLocaleString('vi-VN')}đ) đã được kích hoạt tự động. Cảm ơn bạn đã tin dùng Trọ Xinh!`,
          link: '/chu-tro/tong-quan',
          read: false,
        });
      }
    }

    // Success response to MoMo
    return new Response(
      JSON.stringify({
        partnerCode,
        orderId,
        requestId,
        resultCode: 0,
        message: 'Acknowledge Webhook Success',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
