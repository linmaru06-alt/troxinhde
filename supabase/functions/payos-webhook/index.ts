// Supabase Edge Function: payos-webhook
// Webhook receiver from PayOS for automated instant subscription & boost activation
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createHmac } from 'https://deno.land/std@0.177.0/node/crypto.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const { code, desc, data, signature } = payload;

    const checksumKey = Deno.env.get('PAYOS_CHECKSUM_KEY') || Deno.env.get('VITE_PAYOS_CHECKSUM_KEY') || '';

    // Verify signature if checksum key is set
    if (checksumKey && signature && data) {
      // Sort keys alphabetically
      const sortedKeys = Object.keys(data).sort();
      const signString = sortedKeys.map((k) => `${k}=${data[k]}`).join('&');
      const expectedSignature = createHmac('sha256', checksumKey).update(signString).digest('hex');

      if (signature !== expectedSignature) {
        return new Response(JSON.stringify({ success: false, message: 'Invalid signature' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Initialize Supabase Admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    if (supabaseUrl && supabaseServiceKey) {
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      if (code === '00' && data?.orderCode) {
        const orderCode = String(data.orderCode);

        // 1. Update transaction status
        const { data: tx } = await supabase
          .from('transactions')
          .update({
            status: 'success',
            activated_at: new Date().toISOString(),
          })
          .eq('order_code', orderCode)
          .select()
          .single();

        if (tx) {
          // 2. If plan subscription -> update user subscription
          if (tx.plan_id) {
            const expiresAt = new Date();
            expiresAt.setMonth(expiresAt.getMonth() + 1);

            await supabase.from('user_subscriptions').upsert({
              user_id: tx.user_id,
              plan_id: tx.plan_id,
              started_at: new Date().toISOString(),
              expires_at: expiresAt.toISOString(),
              transaction_id: tx.id,
            });
          }

          // 3. If room boost -> update room boost expiry
          if (tx.room_id) {
            const boostDays = tx.plan_id === 'boost_30d' ? 30 : 7;
            const boostExpires = new Date();
            boostExpires.setDate(boostExpires.getDate() + boostDays);

            await supabase
              .from('rooms')
              .update({
                is_boosted: true,
                boost_expires_at: boostExpires.toISOString(),
                boost_badge: 'Tin Nổi Bật ★',
              })
              .eq('id', tx.room_id);
          }

          // 4. Send real-time notification to user
          await supabase.from('notifications').insert({
            user_id: tx.user_id,
            type: 'system',
            title: '🎉 Kích hoạt thanh toán thành công!',
            message: `Giao dịch #${orderCode} đã được kích hoạt tự động. Cảm ơn bạn đã tin dùng Trọ Xinh!`,
            link: '/chu-tro/tong-quan',
            read: false,
          });
        }
      }
    }

    // Required response to PayOS
    return new Response(JSON.stringify({ success: true, message: 'Webhook processed successfully' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
