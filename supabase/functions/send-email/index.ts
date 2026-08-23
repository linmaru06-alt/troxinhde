// Supabase Edge Function: send-email
// Resend API Transactional Email Service for TroXinh.vn
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type EmailType =
  | 'welcome'
  | 'room_approved'
  | 'room_rejected'
  | 'owner_approved'
  | 'payment_success'
  | 'subscription_expiring';

interface EmailRequestBody {
  type: EmailType;
  to: string;
  data: Record<string, any>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body: EmailRequestBody = await req.json();
    const { type, to, data } = body;

    if (!to || !type) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: to, type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY') || '';

    // Subject mapping according to roadmap specs
    let subject = 'Thông báo từ Trọ Xinh';
    if (type === 'welcome') subject = 'Chào mừng đến Trọ Xinh! 🏠';
    else if (type === 'room_approved') subject = `✅ Phòng ${data.roomName || ''} đã được duyệt`;
    else if (type === 'room_rejected') subject = `❌ Phòng ${data.roomName || ''} cần chỉnh sửa`;
    else if (type === 'owner_approved') subject = '🎉 Tài khoản Chủ trọ đã được kích hoạt!';
    else if (type === 'payment_success') subject = '🧾 Xác nhận thanh toán Trọ Xinh';
    else if (type === 'subscription_expiring') subject = `⏰ Gói ${data.planName || ''} hết hạn sau 7 ngày`;

    // Render HTML content based on type
    const htmlContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 16px;">
        <div style="background-color: #006d37; color: white; padding: 20px; text-align: center; border-radius: 12px 12px 0 0;">
          <h2 style="margin:0;">Trọ Xinh Việt Nam</h2>
        </div>
        <div style="padding: 24px; color: #1a1c1c; font-size: 14px; line-height: 1.6;">
          <h3 style="color: #006d37;">${subject}</h3>
          <p>Xin chào <strong>${data.fullName || data.ownerName || 'Bạn'}</strong>,</p>
          <p>${data.message || 'Cảm ơn bạn đã tin dùng nền tảng Trọ Xinh.'}</p>
          ${data.reason ? `<div style="background:#fee2e2;color:#991b1b;padding:12px;border-radius:8px;"><strong>Lý do:</strong> ${data.reason}</div>` : ''}
          ${data.amount ? `<p><strong>Số tiền:</strong> ${data.amount} VND (#${data.orderCode})</p>` : ''}
          <div style="text-align: center; margin-top: 24px;">
            <a href="https://troxinh.vn" style="background:#006d37;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:bold;">Truy Cập Trọ Xinh</a>
          </div>
        </div>
        <div style="text-align: center; font-size: 11px; color: #6b7280; padding: 16px; border-top: 1px solid #f3f4f6;">
          © 2026 Trọ Xinh Việt Nam · Hotline: 1900 8888 99
        </div>
      </div>
    `;

    if (resendApiKey) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Trọ Xinh <thongbao@troxinh.vn>',
          to: [to],
          subject,
          html: htmlContent,
        }),
      });

      const resData = await res.json();
      return new Response(JSON.stringify({ success: true, resend: resData }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Local dev mode fallback
    console.log(`[Dev Email Simulated] To: ${to}, Subject: ${subject}`);
    return new Response(
      JSON.stringify({ success: true, simulated: true, subject, to }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
