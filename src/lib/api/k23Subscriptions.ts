import { supabase, isSupabaseConfigured } from '../supabase';
import { K23Plan, K23Subscription, K23PlanCode } from '../../types/k23';
import { K23_PLAN_CATALOG, normalizeK23PlanCode } from '../monetizationCatalog';
import { resolveUserIdToUuid } from './messages';
import { activateK23TrialRpc } from './monetization';

export const DEFAULT_K23_PLANS: K23Plan[] = K23_PLAN_CATALOG.map((p, index) => ({
  id: p.id,
  code: p.code,
  name: p.name,
  description: p.description,
  price_monthly: p.priceMonthlyXu,
  price_yearly: p.priceYearlyXu,
  max_rooms: p.maxRooms,
  max_buildings: p.maxBuildings,
  max_managers: p.maxManagers,
  features: p.features,
  is_active: true,
  display_order: index + 1,
  is_popular: p.popular,
  badge_label: p.badge,
}));

export async function getK23Plans(): Promise<K23Plan[]> {
  if (!isSupabaseConfigured || !supabase) return DEFAULT_K23_PLANS;

  try {
    const { data, error } = await supabase
      .from('k23_plans')
      .select('*')
      .eq('is_active', true)
      .in('code', ['basic', 'standard', 'chain'])
      .order('display_order', { ascending: true });

    if (error || !data || data.length === 0) {
      return DEFAULT_K23_PLANS;
    }

    return data.map((row: any) => {
      const catalogMatch = K23_PLAN_CATALOG.find((c) => c.code === row.code);
      return {
        ...row,
        code: row.code as K23PlanCode,
        is_popular: catalogMatch?.popular ?? row.code === 'standard',
        badge_label: catalogMatch?.badge,
      };
    });
  } catch {
    return DEFAULT_K23_PLANS;
  }
}

export async function getOwnerK23Subscription(
  ownerId: string,
  isDemoUser = false
): Promise<K23Subscription> {
  const isDemoIdentity =
    isDemoUser ||
    ownerId === '00000000-0000-0000-0000-000000000002' ||
    ownerId === 'user_owner_1' ||
    ownerId.toLowerCase().includes('demo');

  const standardPlan = DEFAULT_K23_PLANS.find((p) => p.code === 'standard') || DEFAULT_K23_PLANS[1];

  const unsubscribedSubscription: K23Subscription = {
    id: `sub_${ownerId || 'guest'}`,
    owner_id: ownerId,
    plan_code: 'standard',
    billing_cycle: 'monthly',
    status: isDemoIdentity && !isSupabaseConfigured ? 'trialing' : 'unsubscribed',
    has_used_trial: false,
    current_period_start: new Date().toISOString(),
    current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    grace_period_end: new Date(Date.now() + 37 * 24 * 60 * 60 * 1000).toISOString(),
    auto_renew: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    plan: standardPlan,
  };

  if (!isSupabaseConfigured || !supabase || !ownerId) {
    return unsubscribedSubscription;
  }

  try {
    const resolvedId = (await resolveUserIdToUuid(ownerId)) || ownerId;
    const { data, error } = await supabase
      .from('k23_subscriptions')
      .select('*')
      .eq('owner_id', resolvedId)
      .maybeSingle();

    if (error || !data) {
      if (isDemoIdentity) {
        return {
          ...unsubscribedSubscription,
          status: 'trialing',
          trial_start_at: new Date().toISOString(),
          trial_end_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        };
      }
      return unsubscribedSubscription;
    }

    const plans = await getK23Plans();
    const canonicalCode = normalizeK23PlanCode(data.plan_code);
    const plan = plans.find((p) => p.code === canonicalCode) || standardPlan;

    return {
      ...data,
      plan_code: canonicalCode,
      plan,
    };
  } catch {
    return unsubscribedSubscription;
  }
}

export async function activateK23Trial(ownerId: string): Promise<K23Subscription> {
  if (!ownerId) {
    throw new Error('Vui lòng đăng nhập để kích hoạt dùng thử 30 ngày K23.');
  }

  if (isSupabaseConfigured) {
    const res = await activateK23TrialRpc();
    const standardPlan = DEFAULT_K23_PLANS.find((p) => p.code === 'standard') || DEFAULT_K23_PLANS[1];
    const now = new Date().toISOString();
    const trialEnd = res.trialEndAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    return {
      id: `trial_${ownerId}`,
      owner_id: ownerId,
      plan_code: 'standard',
      billing_cycle: 'monthly',
      status: 'trialing',
      has_used_trial: true,
      trial_start_at: now,
      trial_end_at: trialEnd,
      current_period_start: now,
      current_period_end: trialEnd,
      grace_period_end: new Date(new Date(trialEnd).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      auto_renew: false,
      created_at: now,
      updated_at: now,
      plan: standardPlan,
    };
  }

  // Offline demo fallback
  const now = new Date();
  const trialEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const graceEnd = new Date(trialEnd.getTime() + 7 * 24 * 60 * 60 * 1000);
  return {
    id: `trial_${ownerId}`,
    owner_id: ownerId,
    plan_code: 'standard',
    billing_cycle: 'monthly',
    status: 'trialing',
    has_used_trial: true,
    trial_start_at: now.toISOString(),
    trial_end_at: trialEnd.toISOString(),
    current_period_start: now.toISOString(),
    current_period_end: trialEnd.toISOString(),
    grace_period_end: graceEnd.toISOString(),
    auto_renew: false,
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
    plan: DEFAULT_K23_PLANS.find((p) => p.code === 'standard'),
  };
}

export async function getOwnerRoomCount(ownerId: string): Promise<number> {
  if (!isSupabaseConfigured || !supabase || !ownerId) return 0;
  try {
    const resolvedId = (await resolveUserIdToUuid(ownerId)) || ownerId;
    const { count, error } = await supabase
      .from('rooms')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', resolvedId);

    if (error || count === null) return 0;
    return count;
  } catch {
    return 0;
  }
}

export async function getOwnerBuildingCount(ownerId: string): Promise<number> {
  if (!isSupabaseConfigured || !supabase || !ownerId) return 0;
  try {
    const resolvedId = (await resolveUserIdToUuid(ownerId)) || ownerId;
    const { count, error } = await supabase
      .from('buildings')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', resolvedId);

    if (error || count === null) return 0;
    return count;
  } catch {
    return 0;
  }
}
