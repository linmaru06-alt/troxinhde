// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

declare const Deno: any;
declare const crypto: any;

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
      },
    });
  }

  try {
    const body = await req.json();
    const {
      amount, // Số tiền VND (VD: 99000)
      planId, // 'basic' | 'pro' | 'boost_7d' | 'boost_30d'
      userId = 'GUEST_USER', // UUID người dùng
      planName = 'Dịch vụ Trọ Xinh', // 'Gói Cơ Bản' | 'Gói Pro'
      roomId, // UUID phòng (nếu là boost)
    } = body;

    // ── Cấu hình MoMo ──────────────────────────────────
    const partnerCode = Deno.env.get('MOMO_PARTNER_CODE') || 'MOMO';
    const accessKey = Deno.env.get('MOMO_ACCESS_KEY') || 'F8BBA842ECF85';
    const secretKey = Deno.env.get('MOMO_SECRET_KEY') || 'K951B6PE1waDMi640xX08PD3vg6EkVlz';
    const endpoint = Deno.env.get('MOMO_ENDPOINT') || 'https://test-payment.momo.vn/v2/gateway/api/create';
    const ipnUrl = Deno.env.get('MOMO_IPN_URL') || 'https://troxinh.vn/api/momo-webhook';
    const redirectUrl = Deno.env.get('MOMO_REDIRECT_URL') || 'https://troxinh.vn/thanh-toan/ket-qua';

    // ── Tạo orderId và requestId unique ────────────────
    const timestamp = Date.now();
    const userPrefix = typeof userId === 'string' ? userId.slice(0, 8) : 'GUEST';
    const orderId = `TROXINH_${userPrefix}_${timestamp}`;
    const requestId = `REQ_${timestamp}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    // ── Thông tin đơn hàng ──────────────────────────────
    const orderInfo = `Tro Xinh - ${planName}`; // max 255 ký tự
    const extraData = btoa(
      JSON.stringify({
        userId,
        planId,
        roomId: roomId || null,
      })
    );

    // ── Tạo chữ ký HMAC-SHA256 ─────────────────────────
    // Thứ tự fields PHẢI đúng theo tài liệu MoMo
    const rawSignature = [
      `accessKey=${accessKey}`,
      `amount=${amount}`,
      `extraData=${extraData}`,
      `ipnUrl=${ipnUrl}`,
      `orderId=${orderId}`,
      `orderInfo=${orderInfo}`,
      `partnerCode=${partnerCode}`,
      `redirectUrl=${redirectUrl}`,
      `requestId=${requestId}`,
      `requestType=payWithMethod`,
    ].join('&');

    const encoder = new TextEncoder();
    const keyData = encoder.encode(secretKey);
    const msgData = encoder.encode(rawSignature);

    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signBuffer = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
    const signature = Array.from(new Uint8Array(signBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    // ── Gọi MoMo API ───────────────────────────────────
    const momoPayload = {
      partnerCode,
      requestId,
      amount: Number(amount),
      orderId,
      orderInfo,
      redirectUrl,
      ipnUrl,
      requestType: 'payWithMethod',
      extraData,
      lang: 'vi',
      signature,
    };

    const momoRes = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(momoPayload),
    });

    const momoData = await momoRes.json();

    // ── Kiểm tra kết quả từ MoMo ───────────────────────
    if (momoData.resultCode !== 0) {
      return new Response(
        JSON.stringify({
          success: false,
          message: momoData.message || 'Tạo đơn MoMo thất bại',
          code: momoData.resultCode,
          details: momoData,
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    // ── Lưu pending transaction vào Supabase nếu có cấu hình ───
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (supabaseUrl && supabaseServiceKey) {
      try {
        const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        await supabase.from('transactions').insert({
          user_id: userId,
          order_code: orderId,
          plan_id: planId,
          room_id: roomId || null,
          amount: Number(amount),
          status: 'pending',
          payment_method: 'momo',
          idempotency_key: `momo_${userId}_${planId}_${Math.floor(timestamp / 86400000)}_${timestamp}`,
        });
      } catch (dbErr: any) {
        console.warn('Lưu giao dịch vào Supabase thất bại:', dbErr?.message || dbErr);
      }
    }

    // ── Trả về cho client ───────────────────────────────
    return new Response(
      JSON.stringify({
        success: true,
        orderId,
        requestId,
        payUrl: momoData.payUrl, // Link redirect sang MoMo Web
        deeplink: momoData.deeplink, // Mở app MoMo trực tiếp
        qrCodeUrl: momoData.qrCodeUrl, // URL ảnh QR code
        resultCode: momoData.resultCode,
        message: momoData.message,
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Lỗi server. Vui lòng thử lại.',
        error: error?.message || String(error),
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});
