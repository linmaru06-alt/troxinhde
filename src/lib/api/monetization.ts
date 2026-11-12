import { supabase, isSupabaseConfigured, getFirebaseIdToken } from '../supabase';
import {
  BoostPackageId,
  CanonicalK23PlanCode,
  FREE_LISTING_QUOTA,
  ListingBillingCycle,
  ListingPlanId,
  ServiceOrderType,
} from '../monetizationCatalog';

export type PaymentOrderMethod = 'vietqr' | 'momo';

export interface ServicePaymentOrder {
  id: string;
  orderCode: string;
  serviceType: ServiceOrderType;
  planId: string;
  roomId?: string | null;
  description: string;
  amountXu: number;
  amountVnd: number;
  method: PaymentOrderMethod;
  status: 'pending' | 'paid' | 'success' | 'expired' | 'failed';
  expiresAt: string;
  isSandbox: boolean;
  qrCode: string;
  deeplink?: string;
  transferContent: string;
  receiverInfo: {
    bankName: string;
    accountNumber: string;
    accountNumberLabel: string;
    accountName: string;
  };
}

export type ServicePaymentOrderResponse = ServicePaymentOrder;

export interface ServiceOrderStatusResponse {
  success: boolean;
  orderCode: string;
  status: 'pending' | 'paid' | 'success' | 'expired' | 'failed';
  amount: number;
  amountXu: number;
  paymentMethod: PaymentOrderMethod;
  paidAt?: string | null;
  activatedAt?: string | null;
  expiresAt?: string | null;
  metadata?: Record<string, any>;
  order?: ServicePaymentOrder | null;
}

export interface OwnerListingQuotaStatus {
  freeQuota: number;
  roomCount: number;
  freeRemaining: number;
  activePlanId: string;
  activePlanLimit: number; // -1 = unlimited
  activePlanExpiresAt?: string | null;
  autoRenew: boolean;
  availableSingleCredits: number;
  canCreateRoom: boolean;
}

export interface OwnerListingCreditRecord {
  id: string;
  owner_id: string;
  plan_id: 'single_15d' | 'single_30d';
  duration_days: number;
  free_repost_remaining: number;
  status: 'available' | 'used' | 'expired';
  room_id?: string | null;
  created_at: string;
  used_at?: string | null;
}

export interface XuPurchaseRpcResult {
  success: boolean;
  error?: string;
  required_xu?: number;
  remaining_total?: number;
  order_code?: string;
  transaction_id?: string;
  amount_xu?: number;
  free_repost?: boolean;
  activation?: Record<string, any>;
}

export async function getOwnerListingQuota(_ownerId?: string): Promise<OwnerListingQuotaStatus> {
  const defaultQuota: OwnerListingQuotaStatus = {
    freeQuota: FREE_LISTING_QUOTA,
    roomCount: 0,
    freeRemaining: FREE_LISTING_QUOTA,
    activePlanId: 'free',
    activePlanLimit: FREE_LISTING_QUOTA,
    activePlanExpiresAt: null,
    autoRenew: false,
    availableSingleCredits: 0,
    canCreateRoom: true,
  };

  if (!isSupabaseConfigured) return defaultQuota;

  try {
    const { data, error } = await supabase.rpc('get_owner_listing_quota');
    if (error || !data || !data.success) {
      return defaultQuota;
    }

    return {
      freeQuota: Number(data.free_quota ?? FREE_LISTING_QUOTA),
      roomCount: Number(data.room_count ?? 0),
      freeRemaining: Number(data.free_remaining ?? 0),
      activePlanId: String(data.active_plan_id || 'free'),
      activePlanLimit: Number(data.active_plan_limit ?? FREE_LISTING_QUOTA),
      activePlanExpiresAt: data.active_plan_expires_at || null,
      autoRenew: Boolean(data.auto_renew),
      availableSingleCredits: Number(data.available_single_credits ?? 0),
      canCreateRoom: Boolean(data.can_create_room),
    };
  } catch {
    return defaultQuota;
  }
}

export async function getOwnerListingCredits(ownerId: string): Promise<OwnerListingCreditRecord[]> {
  if (!isSupabaseConfigured || !ownerId) return [];
  try {
    const { data, error } = await supabase
      .from('owner_listing_credits')
      .select('*')
      .eq('owner_id', ownerId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data as OwnerListingCreditRecord[];
  } catch {
    return [];
  }
}

export async function consumeListingCreditForRoom(roomId: string): Promise<{
  success: boolean;
  consumed?: boolean;
  error?: string;
}> {
  if (!isSupabaseConfigured) return { success: true, consumed: false };
  try {
    const { data, error } = await supabase.rpc('consume_listing_credit_for_room', {
      p_room_id: roomId,
    });
    if (error) {
      return { success: false, error: error.message };
    }
    return {
      success: Boolean(data?.success),
      consumed: Boolean(data?.consumed),
      error: data?.error,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Lỗi kiểm tra lượt đăng tin.' };
  }
}

export async function purchaseListingPlanWithXu(params: {
  planId: ListingPlanId;
  billingCycle?: ListingBillingCycle;
  couponCode?: string;
}): Promise<XuPurchaseRpcResult> {
  if (!isSupabaseConfigured) {
    throw new Error('Chưa cấu hình Supabase để thanh toán bằng Xu.');
  }

  const { data, error } = await supabase.rpc('purchase_listing_plan_with_xu', {
    p_plan_id: params.planId,
    p_billing_cycle: params.billingCycle || 'monthly',
    p_coupon_code: params.couponCode || null,
  });

  if (error) {
    throw new Error(error.message || 'Không thể thanh toán gói đăng phòng bằng Xu.');
  }

  return (data || { success: false, error: 'EMPTY_RESPONSE' }) as XuPurchaseRpcResult;
}

export async function purchaseRoomBoostWithXu(params: {
  roomId: string;
  boostId: BoostPackageId;
}): Promise<XuPurchaseRpcResult> {
  if (!isSupabaseConfigured) {
    throw new Error('Chưa cấu hình Supabase để thanh toán đẩy tin bằng Xu.');
  }

  const { data, error } = await supabase.rpc('purchase_room_boost_with_xu', {
    p_room_id: params.roomId,
    p_boost_id: params.boostId,
  });

  if (error) {
    throw new Error(error.message || 'Không thể thanh toán gói đẩy tin bằng Xu.');
  }

  return (data || { success: false, error: 'EMPTY_RESPONSE' }) as XuPurchaseRpcResult;
}

export async function purchaseK23PlanWithXu(params: {
  planCode: CanonicalK23PlanCode;
  billingCycle?: 'monthly' | 'yearly';
}): Promise<XuPurchaseRpcResult> {
  if (!isSupabaseConfigured) {
    throw new Error('Chưa cấu hình Supabase để thanh toán gói K23 bằng Xu.');
  }

  const { data, error } = await supabase.rpc('purchase_k23_plan_with_xu', {
    p_plan_code: params.planCode,
    p_billing_cycle: params.billingCycle || 'monthly',
  });

  if (error) {
    throw new Error(error.message || 'Không thể thanh toán gói K23 bằng Xu.');
  }

  return (data || { success: false, error: 'EMPTY_RESPONSE' }) as XuPurchaseRpcResult;
}

export async function repostRoomWithXu(params: {
  roomId: string;
  durationDays?: 15 | 30;
}): Promise<XuPurchaseRpcResult> {
  if (!isSupabaseConfigured) {
    throw new Error('Chưa cấu hình Supabase để gia hạn tin.');
  }

  const { data, error } = await supabase.rpc('repost_room_with_xu', {
    p_room_id: params.roomId,
    p_duration_days: params.durationDays || 30,
  });

  if (error) {
    throw new Error(error.message || 'Không thể đăng lại tin phòng.');
  }

  return (data || { success: false, error: 'EMPTY_RESPONSE' }) as XuPurchaseRpcResult;
}

export async function cancelOwnerListingAutoRenew(): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { data, error } = await supabase.rpc('cancel_owner_listing_auto_renew');
  if (error) throw new Error(error.message || 'Không thể tắt tự động gia hạn.');
  return Boolean(data?.success);
}

export async function activateK23TrialRpc(): Promise<{
  success: boolean;
  trialEndAt?: string;
}> {
  if (!isSupabaseConfigured) {
    return {
      success: true,
      trialEndAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }
  const { data, error } = await supabase.rpc('activate_k23_trial');
  if (error) {
    throw new Error(error.message || 'Không thể kích hoạt dùng thử K23.');
  }
  if (!data?.success) {
    throw new Error(data?.message || data?.error || 'Tài khoản không đủ điều kiện dùng thử K23.');
  }
  return {
    success: true,
    trialEndAt: data.trial_end_at || data.current_period_end,
  };
}

export async function createServicePaymentOrder(params: {
  serviceType: ServiceOrderType;
  itemId: string;
  billingCycle?: 'monthly' | 'yearly';
  roomId?: string;
  durationDays?: 15 | 30;
  couponCode?: string;
  method: PaymentOrderMethod;
}): Promise<ServicePaymentOrder> {
  const idToken = await getFirebaseIdToken();
  if (!idToken) {
    throw new Error('Phiên đăng nhập chưa sẵn sàng. Vui lòng đăng nhập lại để thanh toán.');
  }

  const response = await fetch('/api/payments/create-service-order', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(params),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.success || !payload?.order) {
    throw new Error(payload?.error || 'Không thể khởi tạo đơn thanh toán.');
  }

  return payload.order as ServicePaymentOrder;
}

export async function getServicePaymentOrderStatus(
  orderCode: string
): Promise<ServiceOrderStatusResponse> {
  const idToken = await getFirebaseIdToken();
  if (!idToken) {
    throw new Error('Phiên đăng nhập Firebase đã hết hạn.');
  }

  const response = await fetch(
    `/api/payments/service-order-status?orderCode=${encodeURIComponent(orderCode)}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    }
  );

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.error || 'Không thể kiểm tra trạng thái đơn thanh toán.');
  }

  return payload as ServiceOrderStatusResponse;
}

export async function confirmDemoServiceOrder(orderCode: string): Promise<{
  success: boolean;
  sandbox: boolean;
  result?: any;
}> {
  const idToken = await getFirebaseIdToken();
  if (!idToken) {
    throw new Error('Phiên đăng nhập Demo chưa sẵn sàng.');
  }

  const response = await fetch('/api/payments/demo-confirm', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ orderCode }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.success) {
    throw new Error(payload?.error || 'Không thể xác nhận đơn Demo Sandbox.');
  }

  return payload;
}
