import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '../../store/useAppStore';
import {
  getK23Plans,
  getOwnerK23Subscription,
  getOwnerRoomCount,
  createK23Order,
  confirmK23OrderMock,
} from '../../lib/api/k23Subscriptions';
import { K23PlanCode, K23BillingCycle } from '../../types/k23';

export function useK23Subscription() {
  const queryClient = useQueryClient();
  const { currentUser } = useAppStore();
  const ownerId = currentUser?.id || '';

  // 1. Fetch Plans
  const plansQuery = useQuery({
    queryKey: ['k23_plans'],
    queryFn: getK23Plans,
    staleTime: 1000 * 60 * 30, // 30 mins
  });

  // 2. Fetch Owner Subscription
  const subscriptionQuery = useQuery({
    queryKey: ['k23_subscription', ownerId],
    queryFn: () => getOwnerK23Subscription(ownerId),
    enabled: !!ownerId,
    staleTime: 1000 * 60 * 5, // 5 mins
  });

  // 3. Fetch Owner Room Count
  const roomCountQuery = useQuery({
    queryKey: ['k23_owner_room_count', ownerId],
    queryFn: () => getOwnerRoomCount(ownerId),
    enabled: !!ownerId,
    staleTime: 1000 * 60 * 2,
  });

  const subscription = subscriptionQuery.data;
  const currentPlan = subscription?.plan;
  const roomCount = roomCountQuery.data || 0;

  // Tính toán thời gian & trạng thái
  const now = new Date().getTime();
  const periodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end).getTime()
    : now;
  const graceEnd = subscription?.grace_period_end
    ? new Date(subscription.grace_period_end).getTime()
    : periodEnd;

  const diffTime = periodEnd - now;
  const daysLeft = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));

  const isTrial = subscription?.status === 'trialing';
  const isGracePeriod = now > periodEnd && now <= graceEnd;
  const isSuspended = now > graceEnd || subscription?.status === 'suspended';
  const isActive = (subscription?.status === 'active' || isTrial) && !isSuspended;

  // Tính toán quota phòng
  const maxRooms = currentPlan?.max_rooms ?? 10;
  const isUnlimitedRooms = maxRooms === -1;
  const canAddRoom = isUnlimitedRooms || roomCount < maxRooms;
  const roomUsagePercent = isUnlimitedRooms
    ? 0
    : Math.min(100, Math.round((roomCount / maxRooms) * 100));

  // Mutations
  const createOrderMutation = useMutation({
    mutationFn: ({
      planCode,
      billingCycle,
    }: {
      planCode: K23PlanCode;
      billingCycle: K23BillingCycle;
    }) => createK23Order(ownerId, planCode, billingCycle),
  });

  const confirmOrderMutation = useMutation({
    mutationFn: ({
      orderId,
      orderCode,
      planCode,
      billingCycle,
    }: {
      orderId: string;
      orderCode: string;
      planCode: K23PlanCode;
      billingCycle: K23BillingCycle;
    }) => confirmK23OrderMock(orderId, orderCode, ownerId, planCode, billingCycle),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['k23_subscription', ownerId] });
    },
  });

  return {
    plans: plansQuery.data || [],
    isLoadingPlans: plansQuery.isLoading,
    subscription,
    currentPlan,
    isLoadingSubscription: subscriptionQuery.isLoading,
    roomCount,
    maxRooms,
    isUnlimitedRooms,
    canAddRoom,
    roomUsagePercent,
    daysLeft,
    isTrial,
    isActive,
    isGracePeriod,
    isSuspended,
    createOrder: createOrderMutation.mutateAsync,
    confirmOrder: confirmOrderMutation.mutateAsync,
    isCreatingOrder: createOrderMutation.isPending,
    isConfirmingOrder: confirmOrderMutation.isPending,
  };
}

