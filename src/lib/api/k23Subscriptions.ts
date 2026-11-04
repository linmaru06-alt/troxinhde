import { supabase, isSupabaseConfigured } from '../supabase';
import { K23Plan, K23Subscription, K23SubscriptionOrder, K23PlanCode, K23BillingCycle } from '../../types/k23';

export const DEFAULT_K23_PLANS: K23Plan[] = [
  {
    id: 'plan_starter',
    code: 'starter',
    name: 'Gói Cơ Bản',
    description: 'Dành cho chủ nhà nguyên căn hoặc 1 dãy trọ nhỏ (≤10 phòng)',
    price_monthly: 49000,
    price_yearly: 490000,
    max_rooms: 10,
    max_buildings: 1,
    max_managers: 1,
    features: [
      'Tối đa 10 phòng hoạt động',
      '1 Tòa nhà duy nhất',
      'Chốt số điện nước thông minh (Mobile + Desktop)',
      'Hóa đơn A5 kèm VietQR tự động',
      'Xuất ảnh hóa đơn gửi nhanh Zalo',
      '1 Tài khoản chủ nhà',
      'Hỗ trợ qua hệ thống Ticket (24-48h)',
    ],
    is_active: true,
    display_order: 1,
  },
  {
    id: 'plan_pro',
    code: 'pro',
    name: 'Gói Tiêu Chuẩn',
    description: 'Dành cho chung cư mini & dãy trọ vừa (≤35 phòng) - Được chọn nhiều nhất ⭐',
    price_monthly: 129000,
    price_yearly: 1290000,
    max_rooms: 35,
    max_buildings: 3,
    max_managers: 3,
    features: [
      'Tối đa 35 phòng hoạt động',
      'Quản lý tới 3 tòa nhà',
      'Cảnh báo số điện nước bất thường/nhảy số',
      '1 Tài khoản chủ + 2 Phụ tá / Bảo vệ',
      'Hóa đơn Zalo + VietQR động từng phòng',
      'Nhắc hạn hợp đồng khách thuê tự động',
      'Giảm 10% phí đẩy tin phòng trống lên sàn Trọ Xinh',
      'Ưu tiên hỗ trợ Zalo riêng (8h - 22h)',
    ],
    is_active: true,
    display_order: 2,
  },
  {
    id: 'plan_enterprise',
    code: 'enterprise',
    name: 'Gói Chuỗi',
    description: 'Dành cho chuỗi căn hộ dịch vụ và chủ trọ quy mô lớn không giới hạn',
    price_monthly: 299000,
    price_yearly: 2990000,
    max_rooms: -1,
    max_buildings: -1,
    max_managers: 99,
    features: [
      'Không giới hạn số phòng',
      'Không giới hạn số tòa nhà',
      'Phân quyền nhân viên quản lý không giới hạn',
      'Báo cáo doanh thu & dòng tiền chuyên sâu',
      'Hợp đồng chuẩn pháp lý & Ký điện tử',
      'Giảm 25% phí đẩy tin sàn + Huy hiệu Xác thực',
      'Chuyên viên kỹ thuật 1-1 hỗ trợ nhập liệu ban đầu',
    ],
    is_active: true,
    display_order: 3,
  },
];

export async function getK23Plans(): Promise<K23Plan[]> {
  if (!isSupabaseConfigured) return DEFAULT_K23_PLANS;

  try {
    const { data, error } = await supabase
      .from('k23_plans')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error || !data || data.length === 0) {
      return DEFAULT_K23_PLANS;
    }
    return data;
  } catch {
    return DEFAULT_K23_PLANS;
  }
}

export async function getOwnerK23Subscription(ownerId: string): Promise<K23Subscription> {
  const defaultTrial: K23Subscription = {
    id: 'trial_' + ownerId,
    owner_id: ownerId,
    plan_code: 'pro',
    billing_cycle: 'monthly',
    status: 'trialing',
    trial_start_at: new Date().toISOString(),
    trial_end_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    current_period_start: new Date().toISOString(),
    current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    grace_period_end: new Date(Date.now() + 37 * 24 * 60 * 60 * 1000).toISOString(),
    auto_renew: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    plan: DEFAULT_K23_PLANS.find(p => p.code === 'pro'),
  };

  if (!isSupabaseConfigured || !ownerId) return defaultTrial;

  try {
    const { data, error } = await supabase
      .from('k23_subscriptions')
      .select('*')
      .eq('owner_id', ownerId)
      .maybeSingle();

    if (error || !data) {
      return defaultTrial;
    }

    const plans = await getK23Plans();
    const plan = plans.find(p => p.code === data.plan_code) || DEFAULT_K23_PLANS[1];

    return {
      ...data,
      plan,
    };
  } catch {
    return defaultTrial;
  }
}

export async function getOwnerRoomCount(ownerId: string): Promise<number> {
  if (!isSupabaseConfigured || !ownerId) return 0;
  try {
    const { count, error } = await supabase
      .from('rooms')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', ownerId);

    if (error || count === null) return 0;
    return count;
  } catch {
    return 0;
  }
}

export async function createK23Order(
  ownerId: string,
  planCode: K23PlanCode,
  billingCycle: K23BillingCycle
): Promise<K23SubscriptionOrder> {
  const plan = DEFAULT_K23_PLANS.find(p => p.code === planCode) || DEFAULT_K23_PLANS[0];
  const amount = billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly;
  const randNum = Math.floor(10000 + Math.random() * 90000);
  const orderCode = `K23${randNum}`;

  const newOrder: K23SubscriptionOrder = {
    id: `ord_${Date.now()}`,
    order_code: orderCode,
    owner_id: ownerId,
    plan_code: planCode,
    billing_cycle: billingCycle,
    amount,
    status: 'pending',
    payment_method: 'vietqr',
    created_at: new Date().toISOString(),
  };

  if (!isSupabaseConfigured) return newOrder;

  try {
    const { data, error } = await supabase
      .from('k23_subscription_orders')
      .insert({
        order_code: orderCode,
        owner_id: ownerId,
        plan_code: planCode,
        billing_cycle: billingCycle,
        amount,
        status: 'pending',
        payment_method: 'vietqr',
      })
      .select()
      .single();

    if (error || !data) return newOrder;
    return data;
  } catch {
    return newOrder;
  }
}

export async function confirmK23OrderMock(
  orderId: string,
  orderCode: string,
  ownerId: string,
  planCode: K23PlanCode,
  billingCycle: K23BillingCycle
): Promise<boolean> {
  if (!isSupabaseConfigured) return true;

  try {
    // 1. Cập nhật order sang paid
    await supabase
      .from('k23_subscription_orders')
      .update({
        status: 'paid',
        payment_time: new Date().toISOString(),
        transaction_ref: `TXN_${Date.now()}`,
      })
      .eq('order_code', orderCode);

    // 2. Tính ngày hết hạn mới
    const addDays = billingCycle === 'yearly' ? 365 : 30;
    const now = new Date();
    const periodEnd = new Date(now.getTime() + addDays * 24 * 60 * 60 * 1000);
    const graceEnd = new Date(periodEnd.getTime() + 7 * 24 * 60 * 60 * 1000);

    // 3. Upsert k23_subscriptions
    await supabase
      .from('k23_subscriptions')
      .upsert({
        owner_id: ownerId,
        plan_code: planCode,
        billing_cycle: billingCycle,
        status: 'active',
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        grace_period_end: graceEnd.toISOString(),
        updated_at: now.toISOString(),
      }, { onConflict: 'owner_id' });

    return true;
  } catch (err) {
    console.error('Lỗi xác nhận đơn hàng:', err);
    return false;
  }
}

