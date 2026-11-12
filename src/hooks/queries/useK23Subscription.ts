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
  const currentPlan = subscription?.plan || DEFAULT_K23_PLANS[1];
  const roomCount = roomCountQuery.data || 0;
  const buildingCount = buildingCountQuery.data || 0;

  const now = Date.now();
  const periodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end).getTime()
    : now;
  const graceEnd = subscription?.grace_period_end
    ? new Date(subscription.grace_period_end).getTime()
    : periodEnd;

  const diffTime = periodEnd - now;
  const daysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  const isUnsubscribed = !subscription || subscription.status === 'unsubscribed';
  const isTrial = subscription?.status === 'trialing';
  const isGracePeriod = !isUnsubscribed && now > periodEnd && now <= graceEnd;
  const isSuspended = !isUnsubscribed && (now > graceEnd || subscription?.status === 'suspended');
  const isActive =
    !isUnsubscribed &&
    (subscription?.status === 'active' || isTrial || isGracePeriod) &&
    !isSuspended;
  const isVip = isActive;
  const hasUsedTrial = Boolean(subscription?.has_used_trial || isTrial);

  // Quota phòng
  const maxRooms = isActive ? (currentPlan?.max_rooms ?? 35) : 0;
  const isUnlimitedRooms = maxRooms === -1;
  const canAddRoom = isActive && (isUnlimitedRooms || roomCount < maxRooms);
  const roomUsagePercent =
    isUnlimitedRooms || maxRooms <= 0
      ? 0
      : Math.min(100, Math.round((roomCount / maxRooms) * 100));

  // Quota tòa nhà
  const maxBuildings = isActive ? (currentPlan?.max_buildings ?? 3) : 0;
  const isUnlimitedBuildings = maxBuildings === -1;
  const canAddBuilding = isActive && (isUnlimitedBuildings || buildingCount < maxBuildings);
  const buildingUsagePercent =
    isUnlimitedBuildings || maxBuildings <= 0
      ? 0
      : Math.min(100, Math.round((buildingCount / maxBuildings) * 100));

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
