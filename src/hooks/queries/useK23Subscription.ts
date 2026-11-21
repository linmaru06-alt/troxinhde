import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '../../store/useAppStore';
import {
  getK23Plans,
  getOwnerK23Subscription,
  getOwnerRoomCount,
  getOwnerBuildingCount,
  activateK23Trial,
  DEFAULT_K23_PLANS,
} from '../../lib/api/k23Subscriptions';

export function useK23Subscription() {
  const queryClient = useQueryClient();
  const { currentUser } = useAppStore();
  const ownerId = currentUser?.id || '';
  const isDemoUser = Boolean(currentUser?.isDemoAccount);

  const plansQuery = useQuery({
    queryKey: ['k23_plans'],
    queryFn: getK23Plans,
    staleTime: 1000 * 60 * 30,
  });

  const subscriptionQuery = useQuery({
    queryKey: ['k23_subscription', ownerId],
    queryFn: () => getOwnerK23Subscription(ownerId, isDemoUser),
    enabled: Boolean(ownerId),
    staleTime: 1000 * 60 * 2,
  });

  const roomCountQuery = useQuery({
    queryKey: ['k23_owner_room_count', ownerId],
    queryFn: () => getOwnerRoomCount(ownerId),
    enabled: Boolean(ownerId),
    staleTime: 1000 * 60 * 2,
  });

  const buildingCountQuery = useQuery({
    queryKey: ['k23_owner_building_count', ownerId],
    queryFn: () => getOwnerBuildingCount(ownerId),
    enabled: Boolean(ownerId),
    staleTime: 1000 * 60 * 2,
  });

  const subscription = subscriptionQuery.data;
  const chainPlan = DEFAULT_K23_PLANS.find((p) => p.code === 'chain') || DEFAULT_K23_PLANS[2];
  const currentPlan = subscription?.status === 'active' && subscription.plan ? subscription.plan : chainPlan;
  const roomCount = roomCountQuery.data || 0;
  const buildingCount = buildingCountQuery.data || 0;

  const now = Date.now();
  const periodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end).getTime()
    : now + 365 * 24 * 60 * 60 * 1000;
  const graceEnd = subscription?.grace_period_end
    ? new Date(subscription.grace_period_end).getTime()
    : periodEnd;

  const diffTime = periodEnd - now;
  const daysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  // Mở khóa toàn bộ đặc quyền VIP K23 cho Chủ trọ kiểm thử tính năng
  const isUnsubscribed = false;
  const isTrial = false;
  const isGracePeriod = false;
  const isSuspended = false;
  const isActive = true;
  const isVip = true;
  const hasUsedTrial = true;

  // Quota phòng không giới hạn
  const maxRooms = -1;
  const isUnlimitedRooms = true;
  const canAddRoom = true;
  const roomUsagePercent = 0;

  // Quota tòa nhà không giới hạn
  const maxBuildings = -1;
  const isUnlimitedBuildings = true;
  const canAddBuilding = true;
  const buildingUsagePercent = 0;

  const activateTrialMutation = useMutation({
    mutationFn: () => activateK23Trial(ownerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['k23_subscription', ownerId] });
    },
  });

  const invalidateSubscription = () => {
    return queryClient.invalidateQueries({ queryKey: ['k23_subscription', ownerId] });
  };

  return {
    plans: plansQuery.data && plansQuery.data.length > 0 ? plansQuery.data : DEFAULT_K23_PLANS,
    isLoadingPlans: plansQuery.isLoading,
    subscription,
    currentPlan,
    isLoadingSubscription: subscriptionQuery.isLoading,
    roomCount,
    maxRooms,
    isUnlimitedRooms,
    canAddRoom,
    roomUsagePercent,
    buildingCount,
    maxBuildings,
    isUnlimitedBuildings,
    canAddBuilding,
    buildingUsagePercent,
    daysLeft,
    isUnsubscribed,
    isTrial,
    hasUsedTrial,
    isActive,
    isVip,
    isGracePeriod,
    isSuspended,
    activateTrial: activateTrialMutation.mutateAsync,
    isActivatingTrial: activateTrialMutation.isPending,
    invalidateSubscription,
  };
}
