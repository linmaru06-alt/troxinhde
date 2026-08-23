import { useQuery } from '@tanstack/react-query';
import { getNotifications } from '../../lib/api/notifications';

export function useNotifications(userId?: string) {
  return useQuery({
    queryKey: ['notifications', userId],
    queryFn: () => (userId ? getNotifications(userId) : []),
    enabled: Boolean(userId),
    staleTime: 30 * 1000, // 30 seconds
  });
}
