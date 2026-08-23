// Supabase Edge Function: create-payment-link
// PayOS / VietQR Gateway integration for TroXinh.vn
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createHmac } from 'https://deno.land/std@0.177.0/node/crypto.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaymentRequestBody {
  planId: string;
  userId: string;
  roomId?: string;
  amount: number;
  returnUrl: string;
  cancelUrl: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body: PaymentRequestBody = await req.json();
    const { planId, userId, roomId, amount, returnUrl, cancelUrl } = body;

    if (!userId || !planId || !amount) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: userId, planId, amount' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const clientId = Deno.env.get('PAYOS_CLIENT_ID') || Deno.env.get('VITE_PAYOS_CLIENT_ID') || '';
    const apiKey = Deno.env.get('PAYOS_API_KEY') || Deno.env.get('VITE_PAYOS_API_KEY') || '';
    const checksumKey = Deno.env.get('PAYOS_CHECKSUM_KEY') || Deno.env.get('VITE_PAYOS_CHECKSUM_KEY') || '';

    // Generate unique numeric orderCode for PayOS (max safe integer)
    const orderCode = Number(`${Date.now().toString().slice(-6)}${Math.floor(1000 + Math.random() * 9000)}`);
    
    // Description max 25 characters (PayOS limit)
    let description = 'TroXinh Goi Dich Vu';
    if (planId === 'basic') description = 'Tro Xinh - Goi Co Ban';
    else if (planId === 'pro') description = 'Tro Xinh - Goi Pro';
    else if (planId.includes('boost')) description = 'Tro Xinh - Day Tin VIP';

    // If live PayOS keys are configured, call PayOS Merchant API
    if (clientId && apiKey && checksumKey) {
      // Calculate HMAC-SHA256 signature according to PayOS specification
      const signatureData = `amount=${amount}&cancelUrl=${cancelUrl}&description=${description}&orderCode=${orderCode}&returnUrl=${returnUrl}`;
      const signature = createHmac('sha256', checksumKey).update(signatureData).digest('hex');

      const payosPayload = {
        orderCode,
        amount,
        description,
        cancelUrl,
        returnUrl,
        items: [
          {
            name: description,
            quantity: 1,
            price: amount,
          },
        ],
        signature,
      };

      const response = await fetch('https://api-merchant.payos.vn/v2/payment-requests', {
        method: 'POST',
        headers: {
          'x-client-id': clientId,
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payosPayload),
      });

      const data = await response.json();

      if (data.code === '00' && data.data) {
        return new Response(
          JSON.stringify({
            success: true,
            orderCode,
            checkoutUrl: data.data.checkoutUrl,
            qrCode: data.data.qrCode,
            paymentLinkId: data.data.paymentLinkId,
            amount,
            description,
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Fallback: Generate real VietQR Standard Payload (MB Bank TroXinh)
    const bankId = 'MB'; // MB Bank
    const accountNo = '0888110789';
    const accountName = 'NGUYEN VU CHINH';
    const transferContent = `TROXINH ${orderCode}`;
    const vietQrUrl = `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(
      transferContent
    )}&accountName=${encodeURIComponent(accountName)}`;

    return new Response(
      JSON.stringify({
        success: true,
        orderCode,
        checkoutUrl: `${returnUrl}?orderCode=${orderCode}&amount=${amount}&status=success`,
        qrCode: vietQrUrl,
        bankInfo: {
          bankName: 'Ngân hàng Quân Đội (MB Bank)',
          bankCode: 'MB',
          accountNumber: accountNo,
          accountName: accountName,
          branch: 'Chi nhánh Đống Đa, Hà Nội',
          amount,
          transferContent,
        },
        amount,
        description,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || 'Internal Server Error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
