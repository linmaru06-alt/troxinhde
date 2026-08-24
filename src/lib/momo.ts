import { supabase, isSupabaseConfigured } from './supabase';

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
  deeplink?: string;
  qrCode: string;
  amount: number;
  description: string;
  method: 'momo';
  momoInfo: {
    receiverName: string;
    phoneNumber: string;
    amount: number;
    transferContent: string;
  };
}

/**
 * Tạo mã QR MoMo tương thích quét qua App MoMo & VietQR Napas
 */
export function generateMoMoQR(
  phoneNumber: string,
  amount: number,
  transferContent: string,
  accountName: string
): string {
  // Chuẩn VietQR định danh Napas MoMo (Bank Code: 970422 / 970445) hoặc Compact2 QR
  return `https://img.vietqr.io/image/970422-${phoneNumber}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(
    transferContent
  )}&accountName=${encodeURIComponent(accountName)}`;
}

/**
 * Gọi Edge Function create-momo-payment hoặc tạo đơn QR MoMo tức thì
 */
export async function createMoMoPaymentOrder(
  params: CreateMoMoPaymentParams
): Promise<MoMoPaymentResponse> {
  const timestamp = Date.now();
  const shortUser = params.userId ? params.userId.slice(0, 8) : 'GUEST';
  const orderId = `TROXINH_${shortUser}_${timestamp}`;
  const transferContent = `TROXINH ${timestamp.toString().slice(-6)}`;

  const defaultMoMoInfo = {
    receiverName: 'NGUYEN VU CHINH',
    phoneNumber: '0888110789',
    amount: params.amount,
    transferContent,
  };

  let description = params.planName || 'Tro Xinh - Goi Dich Vu';
  if (params.planId === 'basic') description = 'Tro Xinh - Goi Co Ban';
  else if (params.planId === 'pro') description = 'Tro Xinh - Goi Pro';
  else if (params.planId.includes('boost')) description = 'Tro Xinh - Day Tin VIP';

  const baseUrl = import.meta.env.VITE_APP_BASE_URL || window.location.origin;
  const returnUrl = params.returnUrl || `${baseUrl}/thanh-toan/ket-qua`;

  // 1. Thử gọi Supabase Edge Function nếu đã kết nối
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.functions.invoke('create-momo-payment', {
        body: {
          amount: params.amount,
          planId: params.planId,
          userId: params.userId,
          planName: description,
          roomId: params.roomId,
        },
      });

      if (!error && data && data.success) {
        const qrCode =
          data.qrCodeUrl ||
          generateMoMoQR(
            defaultMoMoInfo.phoneNumber,
            params.amount,
            transferContent,
            defaultMoMoInfo.receiverName
          );

        return {
          success: true,
          orderId: data.orderId || orderId,
          orderCode: data.orderId || orderId,
          payUrl: data.payUrl || `${returnUrl}?orderId=${orderId}&amount=${params.amount}&status=success`,
          deeplink: data.deeplink,
          qrCode,
          amount: params.amount,
          description,
          method: 'momo',
          momoInfo: defaultMoMoInfo,
        };
      }
    } catch (err) {
      console.warn('Edge Function create-momo-payment fallback sang Direct MoMo QR:', err);
    }
  }

  // 2. Direct MoMo QR Payload (Nhanh & Ổn định)
  const qrCode = generateMoMoQR(
    defaultMoMoInfo.phoneNumber,
    params.amount,
    transferContent,
    defaultMoMoInfo.receiverName
  );

  return {
    success: true,
    orderId,
    orderCode: orderId,
    payUrl: `${returnUrl}?orderId=${orderId}&amount=${params.amount}&status=success`,
    deeplink: `momo://app?action=pay&amount=${params.amount}&receiver=${defaultMoMoInfo.phoneNumber}&comment=${encodeURIComponent(
      transferContent
    )}`,
    qrCode,
    amount: params.amount,
    description,
    method: 'momo',
    momoInfo: defaultMoMoInfo,
  };
}
