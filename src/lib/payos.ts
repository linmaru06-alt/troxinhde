import axios from 'axios';
import { supabase, isSupabaseConfigured } from './supabase';
import { createPendingTransaction, verifyPaymentFromDatabase } from './api/payments';

export interface CreatePaymentRequest {
  planId: string;
  userId: string;
  roomId?: string;
  amount: number;
  returnUrl?: string;
  cancelUrl?: string;
}

export interface BankInfo {
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
  amount: number;
  transferContent: string;
}

export interface PaymentLinkResponse {
  success: boolean;
  orderCode: number;
  checkoutUrl: string;
  qrCode: string;
  bankInfo: BankInfo;
  amount: number;
  description: string;
}

// Generate VietQR direct image URL with high-contrast compact2 template
export function generateVietQRUrl(bankId: string, accountNo: string, amount: number, content: string, accountName: string): string {
  return `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(
    content
  )}&accountName=${encodeURIComponent(accountName)}`;
}

export async function createPaymentOrder(params: CreatePaymentRequest): Promise<PaymentLinkResponse> {
  const defaultBank = {
    bankName: 'Ngân hàng TMCP Kỹ Thương Việt Nam (Techcombank)',
    bankCode: 'TCB',
    accountNumber: '0888110789',
    accountName: 'NGUYEN VU CHINH',
    branch: 'Chi nhánh Hà Nội',
  };

  // Generate unique 8-digit orderCode
  const orderCode = Number(`${Date.now().toString().slice(-6)}${Math.floor(100 + Math.random() * 900)}`);
  const transferContent = `TROXINH ${orderCode}`;

  let description = 'Tro Xinh - Goi Dich Vu';
  if (params.planId === 'basic') description = 'Tro Xinh - Goi Co Ban';
  else if (params.planId === 'pro') description = 'Tro Xinh - Goi Pro';
  else if (params.planId.includes('boost')) description = 'Tro Xinh - Day Tin VIP';

  const baseUrl = import.meta.env.VITE_APP_BASE_URL || window.location.origin;
  const returnUrl = params.returnUrl || `${baseUrl}/thanh-toan/ket-qua`;
  const cancelUrl = params.cancelUrl || `${baseUrl}/thanh-toan/${params.planId}?status=cancelled`;

  // 1. Ghi nhận giao dịch PENDING vào Supabase Database
  await createPendingTransaction({
    orderCode,
    userId: params.userId,
    planId: params.planId,
    roomId: params.roomId,
    amount: params.amount,
    paymentMethod: 'vietqr',
  });

  // 2. Thử gọi Supabase Edge Function nếu PayOS backend đã cấu hình
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.functions.invoke('create-payment-link', {
        body: {
          planId: params.planId,
          userId: params.userId,
          roomId: params.roomId,
          amount: params.amount,
          returnUrl,
          cancelUrl,
        },
      });

      if (!error && data?.qrCode) {
        return {
          success: true,
          orderCode: data.orderCode || orderCode,
          checkoutUrl: data.checkoutUrl || `${returnUrl}?orderCode=${orderCode}&amount=${params.amount}&status=success`,
          qrCode: data.qrCode,
          bankInfo: data.bankInfo || {
            ...defaultBank,
            amount: params.amount,
            transferContent,
          },
          amount: params.amount,
          description,
        };
      }
    } catch (e) {
      console.warn('Edge Function create-payment-link unavailable, using direct VietQR gateway fallback.', e);
    }
  }

  // 3. Chuẩn hóa mã VietQR QuickPay EMVCo chuẩn NAPAS
  const qrCode = generateVietQRUrl(
    defaultBank.bankCode,
    defaultBank.accountNumber,
    params.amount,
    transferContent,
    defaultBank.accountName
  );

  return {
    success: true,
    orderCode,
    checkoutUrl: `${returnUrl}?orderCode=${orderCode}&amount=${params.amount}&status=success`,
    qrCode,
    bankInfo: {
      ...defaultBank,
      amount: params.amount,
      transferContent,
    },
    amount: params.amount,
    description,
  };
}

export async function checkPaymentStatus(orderCode: number | string): Promise<{ status: 'waiting' | 'success' | 'failed' | 'expired' }> {
  return await verifyPaymentFromDatabase(orderCode);
}
