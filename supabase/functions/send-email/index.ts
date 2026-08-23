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
          <h2 style="margin:0; font-size: 20px;">Trọ Xinh (TroXinh.vn)</h2>
          <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.9;">Nền tảng tìm kiếm & quản lý phòng trọ đã kiểm duyệt</p>
        </div>
        <div style="padding: 24px; color: #1a1c1c; font-size: 14px; line-height: 1.6;">
          <h3 style="color: #006d37; margin-top: 0;">${subject}</h3>
          <p>Xin chào <strong>${data.fullName || data.ownerName || 'Quý đối tác'}</strong>,</p>
          <p>${data.message || 'Cảm ơn bạn đã tin dùng và đồng hành cùng nền tảng Trọ Xinh.'}</p>
          
          ${type === 'payment_success' ? `
            <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:12px; padding:16px; margin:16px 0;">
              <h4 style="margin:0 0 8px 0; color:#166534;">🧾 Chi Tiết Biên Lai Thanh Toán</h4>
              <p style="margin:4px 0;">• <strong>Mã đơn hàng:</strong> #${data.orderCode || data.orderId || 'TRX849201'}</p>
              <p style="margin:4px 0;">• <strong>Dịch vụ:</strong> ${data.planName || 'Gói Dịch Vụ Chủ Trọ'}</p>
              <p style="margin:4px 0;">• <strong>Số tiền:</strong> ${Number(data.amount || 99000).toLocaleString('vi-VN')} đ</p>
              <p style="margin:4px 0;">• <strong>Đơn vị cung cấp:</strong> Nguyễn Vũ Chính (18 Ngõ 167 Tây Sơn, Đống Đa, Hà Nội)</p>
              <p style="margin:4px 0;">• <strong>Hotline hỗ trợ:</strong> 0888 110 789 (Zalo)</p>
            </div>
          ` : ''}

          ${data.reason ? `<div style="background:#fee2e2;color:#991b1b;padding:12px;border-radius:8px;margin:12px 0;"><strong>Lý do:</strong> ${data.reason}</div>` : ''}
          
          <div style="text-align: center; margin-top: 24px;">
            <a href="https://troxinh.vn/chu-tro/quan-ly-goi" style="background:#006d37;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block;">Quản Lý Gói & Tải Biên Lai PDF</a>
          </div>
        </div>
        <div style="text-align: center; font-size: 11px; color: #6b7280; padding: 16px; border-top: 1px solid #f3f4f6;">
          © 2026 Trọ Xinh · Vận hành bởi Nguyễn Vũ Chính · Hotline: 0888 110 789 · Email: nguyenvuchinhb1hhb@gmail.com
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
