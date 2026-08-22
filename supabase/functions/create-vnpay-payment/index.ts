import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';

// Helper to create HMAC SHA-512 in Deno Web Crypto API
async function createHmacSha512(key: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-512' },
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
    const {
      amount,
      orderInfo,
      orderId = `VNP_${Date.now()}`,
      bankCode,
      returnUrl = 'https://troxinh.vn/thanh-toan/ket-qua',
      ipAddr = '127.0.0.1',
    } = await req.json();

    const tmnCode = Deno.env.get('VNPAY_TMN_CODE') || 'TROXINH01';
    const secretKey = Deno.env.get('VNPAY_HASH_SECRET') || 'VNPAYSECRETKEYTROXINH88202029';
    const vnpUrl = Deno.env.get('VNPAY_URL') || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';

    const date = new Date();
    const createDate = date.toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);

    let vnpParams: Record<string, string> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: tmnCode,
      vnp_Locale: 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: orderId,
      vnp_OrderInfo: orderInfo || 'Thanh toan goi Tro Xinh',
      vnp_OrderType: 'other',
      vnp_Amount: String(Number(amount) * 100),
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: ipAddr,
      vnp_CreateDate: createDate,
    };

    if (bankCode) {
      vnpParams['vnp_BankCode'] = bankCode;
    }

    // Sort parameters alphabetically
    const sortedKeys = Object.keys(vnpParams).sort();
    const signData = sortedKeys
      .map((key) => `${key}=${encodeURIComponent(vnpParams[key]).replace(/%20/g, '+')}`)
      .join('&');

    const secureHash = await createHmacSha512(secretKey, signData);
    const paymentUrl = `${vnpUrl}?${signData}&vnp_SecureHash=${secureHash}`;

    return new Response(
      JSON.stringify({
        paymentUrl,
        orderId,
        amount,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
