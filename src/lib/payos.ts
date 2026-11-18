import { auth } from './firebase';

export interface CreatePayOSPaymentParams {
  amount: number;
  planId?: string;
  roomId?: string;
  serviceType?: string;
  billingCycle?: 'monthly' | 'yearly';
  description?: string;
  buyerName?: string;
  buyerEmail?: string;
  buyerPhone?: string;
  returnUrl?: string;
  cancelUrl?: string;
}

export interface PayOSPaymentLinkResult {
  success: boolean;
  orderCode: number;
  checkoutUrl: string;
  paymentLinkId?: string;
  qrCode: string;
  rawQrCode?: string;
  bin?: string;
  accountNumber?: string;
  accountName?: string;
  amount: number;
  description: string;
  status: string;
}

export interface PayOSOrderStatusResult {
  found: boolean;
  orderCode: string;
  amount: number;
  status: 'pending' | 'paid' | 'success' | 'failed' | 'cancelled' | 'expired';
  isPaid: boolean;
  syncedFromPayOS?: boolean;
  paidAt?: string | null;
  createdAt?: string;
  planId?: string | null;
  serviceType?: string;
  metadata?: Record<string, any>;
  error?: string;
}

/**
 * Gọi API backend để tạo link thanh toán PayOS
 */
export async function createPayOSPaymentLink(
  params: CreatePayOSPaymentParams
): Promise<PayOSPaymentLinkResult> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Đính kèm Firebase ID Token nếu người dùng đang đăng nhập
  try {
    const user = auth?.currentUser;
    if (user) {
      const token = await user.getIdToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
  } catch (authErr) {
    console.warn('[PayOS Client] Không thể lấy Firebase token:', authErr);
  }

  const response = await fetch('/api/payos/create-payment-link', {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });

  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Không thể tạo link thanh toán PayOS. Vui lòng thử lại.');
  }

  return data as PayOSPaymentLinkResult;
}

/**
 * Kiểm tra trạng thái thực tế của đơn hàng từ Database Supabase (do Webhook cập nhật)
 */
export async function getPayOSOrderStatus(
  orderCode: string | number
): Promise<PayOSOrderStatusResult> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  try {
    const user = auth?.currentUser;
    if (user) {
      const token = await user.getIdToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
  } catch {
    // Cho phép tiếp tục tra cứu qua RPC nếu token chưa sẵn sàng
  }

  const response = await fetch(`/api/payos/order-status?orderCode=${encodeURIComponent(orderCode)}`, {
    method: 'GET',
    headers,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || `Không thể tra cứu trạng thái đơn hàng #${orderCode}`);
  }

  return data as PayOSOrderStatusResult;
}
