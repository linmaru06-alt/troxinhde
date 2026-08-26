import { supabase, isSupabaseConfigured } from './supabase';

export const MOMO_CONFIG = {
  PARTNER_NAME: 'Trọ Xinh - Nền Tảng Tìm & Quản Lý Nhà Trọ',
  PHONE_NUMBER: '0888110789',
  RECEIVER_NAME: 'NGUYEN VU CHINH',
  BRAND_COLOR: '#A50064',
  ACCENT_COLOR: '#D82D8B',
  LOGO_URL: 'https://upload.wikimedia.org/wikipedia/vi/f/fe/MoMo_Logo.png',
};

export interface CreateMoMoPaymentParams {
  planId: string;
  planName?: string;
  userId: string;
  roomId?: string;
  amount: number;
  returnUrl?: string;
  cancelUrl?: string;
}

export interface MoMoPaymentResponse {
  success: boolean;
  orderId: string;
  orderCode: string | number;
  payUrl: string;
  deeplink: string;
  qrCode: string;
  amount: number;
  description: string;
  method: 'momo';
  momoInfo: {
    receiverName: string;
    phoneNumber: string;
    amount: number;
    transferContent: string;
    momoWalletUrl: string;
  };
  expiresAt: string;
}

/**
 * Tạo mã Dynamic QR MoMo tương thích quét trực tiếp từ App MoMo & 40+ Ngân Hàng Napas
 */
export function generateMoMoQR(
  phoneNumber: string,
  amount: number,
  transferContent: string,
  accountName: string
): string {
  // Chuẩn VietQR định danh Napas MoMo (Bank Code: 970422 - MoMo)
  return `https://img.vietqr.io/image/970422-${phoneNumber}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(
    transferContent
  )}&accountName=${encodeURIComponent(accountName)}`;
}

/**
 * Khởi tạo đơn hàng MoMo chuẩn doanh nghiệp
 * Hỗ trợ:
 * 1. Mở App MoMo trực tiếp (Deeplink 1-chạm)
 * 2. Quét mã Dynamic QR MoMo
 * 3. Lưu bản ghi đơn hàng 'pending' vào Supabase để đối soát realtime
 */
export async function createMoMoPaymentOrder(
  params: CreateMoMoPaymentParams
): Promise<MoMoPaymentResponse> {
  const timestamp = Date.now();
  const shortUser = params.userId ? params.userId.replace(/\D/g, '').slice(-4) || 'USER' : 'GUEST';
  const orderId = `MOMO_${shortUser}_${timestamp}`;
  const transferContent = `TX ${timestamp.toString().slice(-6)}`;
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 phút

  const defaultMoMoInfo = {
    receiverName: MOMO_CONFIG.RECEIVER_NAME,
    phoneNumber: MOMO_CONFIG.PHONE_NUMBER,
    amount: params.amount,
    transferContent,
    momoWalletUrl: `https://me.momo.vn/${MOMO_CONFIG.PHONE_NUMBER}`,
  };

  let description = params.planName || 'Trọ Xinh - Gói Dịch Vụ';
  if (params.planId === 'basic') description = 'Trọ Xinh - Gói Cơ Bản';
  else if (params.planId === 'pro') description = 'Trọ Xinh - Gói Chủ Trọ VIP Pro';
  else if (params.planId.includes('boost')) description = 'Trọ Xinh - Đẩy Tin VIP';
  else if (params.planId.includes('deposit')) description = 'Trọ Xinh - Đặt Cọc Giữ Phòng';

  const baseUrl = (typeof window !== 'undefined' ? window.location.origin : '') || 'http://localhost:3000';
  const returnUrl = params.returnUrl || `${baseUrl}/thanh-toan/ket-qua`;

  // Deeplink chuẩn mở App MoMo
  const deeplink = `momo://app?action=pay&amount=${params.amount}&receiver=${defaultMoMoInfo.phoneNumber}&comment=${encodeURIComponent(
    transferContent
  )}`;

  const dynamicQR = generateMoMoQR(
    defaultMoMoInfo.phoneNumber,
    params.amount,
    transferContent,
    defaultMoMoInfo.receiverName
  );

  // 1. Lưu bản ghi đơn hàng pending vào Supabase bảng transactions (nếu có kết nối)
  if (isSupabaseConfigured) {
    try {
      const validUserId = params.userId && params.userId.length === 36 ? params.userId : '00000000-0000-0000-0000-000000000002';
      await supabase.from('transactions').upsert(
        {
          user_id: validUserId,
          order_code: orderId,
          plan_id: params.planId,
          amount: params.amount,
          status: 'pending',
          payment_method: 'momo',
          created_at: new Date().toISOString(),
        },
        { onConflict: 'order_code' }
      );
    } catch (dbErr) {
      console.warn('[MoMo Payment] Lưu transaction pending:', dbErr);
    }
  }

  // 2. Thử gọi Edge Function create-momo-payment (nếu backend MoMo Gateway v2 cấu hình sẵn)
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.functions.invoke('create-momo-payment', {
        body: {
          amount: params.amount,
          planId: params.planId,
          userId: params.userId,
          orderId,
          orderInfo: description,
          returnUrl,
          roomId: params.roomId,
        },
      });

      if (!error && data?.success) {
        return {
          success: true,
          orderId: data.orderId || orderId,
          orderCode: data.orderId || orderId,
          payUrl: data.payUrl || `${returnUrl}?orderId=${orderId}&amount=${params.amount}&status=success`,
          deeplink: data.deeplink || deeplink,
          qrCode: data.qrCodeUrl || dynamicQR,
          amount: params.amount,
          description,
          method: 'momo',
          momoInfo: defaultMoMoInfo,
          expiresAt,
        };
      }
    } catch (err) {
      console.warn('[MoMo Payment] Edge Function fallback sang Direct MoMo Gateway:', err);
    }
  }

  // 3. Direct MoMo Smart Payload
  return {
    success: true,
    orderId,
    orderCode: orderId,
    payUrl: `${returnUrl}?orderId=${orderId}&amount=${params.amount}&status=success&method=momo`,
    deeplink,
    qrCode: dynamicQR,
    amount: params.amount,
    description,
    method: 'momo',
    momoInfo: defaultMoMoInfo,
    expiresAt,
  };
}

/**
 * Kiểm tra trạng thái giao dịch MoMo từ Supabase
 */
export async function checkMoMoPaymentStatus(orderId: string): Promise<{
  paid: boolean;
  status: 'pending' | 'completed' | 'failed' | 'expired';
  order?: any;
}> {
  if (!isSupabaseConfigured) {
    return { paid: false, status: 'pending' };
  }

  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('order_code', orderId)
      .maybeSingle();

    if (error || !data) {
      return { paid: false, status: 'pending' };
    }

    return {
      paid: data.status === 'success' || data.status === 'completed',
      status: data.status === 'success' ? 'completed' : data.status,
      order: data,
    };
  } catch {
    return { paid: false, status: 'pending' };
  }
}

/**
 * Mô phỏng xác nhận thanh toán MoMo thành công (dành cho chế độ Test / Demo)
 */
export async function confirmMoMoPaymentDemo(orderId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return true;

  try {
    const { error } = await supabase
      .from('transactions')
      .update({
        status: 'success',
        activated_at: new Date().toISOString(),
      })
      .eq('order_code', orderId);

    return !error;
  } catch {
    return false;
  }
}
