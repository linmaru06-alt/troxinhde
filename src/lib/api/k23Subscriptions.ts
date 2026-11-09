import { supabase, isSupabaseConfigured } from '../supabase';
import { K23Plan, K23Subscription, K23SubscriptionOrder, K23PlanCode, K23BillingCycle } from '../../types/k23';

export const DEFAULT_K23_PLANS: K23Plan[] = [
  {
    id: 'plan_starter',
    code: 'starter',
    name: 'Dùng Thử K23',
    description: 'Miễn phí 100% để chủ trọ làm quen với phần mềm (Tối đa 10 phòng)',
    price_monthly: 0,
    price_quarterly: 0,
    price_yearly: 0,
    max_rooms: 10,
    max_buildings: 1,
    max_managers: 1,
    features: [
      'Trải nghiệm 2 tháng đầu miễn phí 100%',
      'Tối đa 10 phòng hoạt động',
      'Chốt số điện nước thông minh (Mobile + Desktop)',
      'Hóa đơn A5 kèm VietQR tự động',
      'Xuất ảnh hóa đơn gửi nhanh Zalo',
      '1 Tài khoản chủ nhà',
      'Hỗ trợ kỹ thuật qua hệ thống Ticket (24/7)',
    ],
    is_active: true,
    display_order: 1,
  },
  {
    id: 'plan_pro',
    code: 'pro',
    name: 'Quản Lý Cơ Bản',
    description: 'Lựa chọn lý tưởng cho các chủ nhà trọ vừa và nhỏ (Tối đa 20 phòng) - Được chọn nhiều nhất ⭐',
    price_monthly: 199000,
    price_quarterly: 537300, // -10% (~179.100 đ/tháng • 537 Xu)
    price_yearly: 1910400,    // -20% (~159.200 đ/tháng • 1.910 Xu)
    max_rooms: 20,
    max_buildings: 2,
    max_managers: 2,
    features: [
      'Tối đa 20 phòng hoạt động',
      'Quản lý tới 2 tòa nhà cơ sở',
      'Cảnh báo số điện nước bất thường/nhảy số',
      'Tự động sinh mã VietQR in trên từng hóa đơn',
      'Gửi hóa đơn & nhắc nợ qua Zalo khách thuê',
      'Nhắc hạn hợp đồng khách thuê tự động',
      'Báo cáo doanh thu & dòng tiền hàng tháng',
      'Ưu tiên hỗ trợ kỹ thuật Zalo riêng (24/7)',
    ],
    is_active: true,
    display_order: 2,
  },
  {
    id: 'plan_enterprise',
    code: 'enterprise',
    name: 'Quản Lý Nâng Cao',
    description: 'Dành cho chuỗi căn hộ dịch vụ và chủ trọ quy mô lớn không giới hạn phòng',
    price_monthly: 399000,
    price_quarterly: 1077300, // -10% (~359.100 đ/tháng • 1.077 Xu)
    price_yearly: 3830400,    // -20% (~319.200 đ/tháng • 3.830 Xu)
    max_rooms: -1,
    max_buildings: -1,
    max_managers: 99,
    features: [
      'Không giới hạn số phòng & số tòa nhà',
      'Phân quyền nhân viên quản lý không giới hạn',
      'Tích hợp chốt số điện nước bằng AI Camera Scanner',
      'Tích hợp Zalo ZNS tích xanh doanh nghiệp',
      'Báo cáo thuế TNCN & GTGT mẫu TT 40/2021',
      'Cổng Web Khách Thuê tự tra cứu hóa đơn',
      'Ký số hợp đồng điện tử & khai báo VNeID lưu trú',
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
  const isDemo =
    ownerId === '00000000-0000-0000-0000-000000000002' ||
    ownerId === 'user_owner_1' ||
    ownerId.toLowerCase().includes('demo') ||
    ownerId.toLowerCase().includes('chutro');

  const isLocallyActivated =
    isDemo ||
    (typeof window !== 'undefined' && localStorage.getItem('k23_vip_activated_' + ownerId) === 'true');

  const emptySubscription: K23Subscription = {
    id: 'sub_' + ownerId,
    owner_id: ownerId,
    plan_code: 'pro',
    billing_cycle: 'monthly',
    status: isLocallyActivated ? 'active' : 'unsubscribed',
    trial_start_at: new Date().toISOString(),
    trial_end_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 2 tháng trải nghiệm
    current_period_start: new Date().toISOString(),
    current_period_end: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    grace_period_end: new Date(Date.now() + 67 * 24 * 60 * 60 * 1000).toISOString(),
    auto_renew: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    plan: DEFAULT_K23_PLANS.find(p => p.code === 'pro'),
  };

  if (!isSupabaseConfigured || !ownerId) return emptySubscription;

  try {
    const { data, error } = await supabase
      .from('k23_subscriptions')
      .select('*')
      .eq('owner_id', ownerId)
      .maybeSingle();

    if (error || !data) {
      return emptySubscription;
    }

    const plans = await getK23Plans();
    const plan = plans.find(p => p.code === data.plan_code) || DEFAULT_K23_PLANS[1];

    return {
      ...data,
      plan,
    };
  } catch {
    return emptySubscription;
  }
}

export async function activateK23Trial(ownerId: string): Promise<K23Subscription> {
  if (typeof window !== 'undefined') {
    localStorage.setItem('k23_vip_activated_' + ownerId, 'true');
  }

  const now = new Date();
  const trialEnd = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000); // Trải nghiệm 2 tháng đầu miễn phí
  const graceEnd = new Date(trialEnd.getTime() + 7 * 24 * 60 * 60 * 1000);

  const activatedSub: K23Subscription = {
    id: 'trial_' + ownerId,
    owner_id: ownerId,
    plan_code: 'starter',
    billing_cycle: 'monthly',
    status: 'trialing',
    trial_start_at: now.toISOString(),
    trial_end_at: trialEnd.toISOString(),
    current_period_start: now.toISOString(),
    current_period_end: trialEnd.toISOString(),
    grace_period_end: graceEnd.toISOString(),
    auto_renew: false,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    plan: DEFAULT_K23_PLANS.find(p => p.code === 'starter'),
  };

  if (!isSupabaseConfigured || !ownerId) return activatedSub;

  try {
    const { data, error } = await supabase
      .from('k23_subscriptions')
      .upsert({
        owner_id: ownerId,
        plan_code: 'starter',
        billing_cycle: 'monthly',
        status: 'trialing',
        trial_start_at: now.toISOString(),
        trial_end_at: trialEnd.toISOString(),
        current_period_start: now.toISOString(),
        current_period_end: trialEnd.toISOString(),
        grace_period_end: graceEnd.toISOString(),
        auto_renew: false,
      })
      .select()
      .single();

    if (error || !data) return activatedSub;

    return {
      ...data,
      plan: DEFAULT_K23_PLANS.find(p => p.code === 'starter'),
    };
  } catch {
    return activatedSub;
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
  const plan = DEFAULT_K23_PLANS.find(p => p.code === planCode) || DEFAULT_K23_PLANS[1];
  
  let amount = plan.price_monthly;
  if (billingCycle === 'quarterly') {
    amount = plan.price_quarterly ?? Math.round(plan.price_monthly * 3 * 0.9);
  } else if (billingCycle === 'yearly') {
    amount = plan.price_yearly ?? Math.round(plan.price_monthly * 12 * 0.8);
  }

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
  if (typeof window !== 'undefined') {
    localStorage.setItem('k23_vip_activated_' + ownerId, 'true');
  }

  const plan = DEFAULT_K23_PLANS.find(p => p.code === planCode) || DEFAULT_K23_PLANS[1];
  const now = new Date();
  
  let durationDays = 30;
  if (billingCycle === 'quarterly') durationDays = 90;
  else if (billingCycle === 'yearly') durationDays = 365;

  const periodEnd = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
  const graceEnd = new Date(periodEnd.getTime() + 7 * 24 * 60 * 60 * 1000);

  if (!isSupabaseConfigured) return true;

  try {
    await supabase
      .from('k23_subscription_orders')
      .update({
        status: 'paid',
        payment_time: now.toISOString(),
      })
      .eq('order_code', orderCode);

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
        auto_renew: true,
      });

    return true;
  } catch {
    return true;
  }
}
