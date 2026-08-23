import { useQuery } from '@tanstack/react-query';
import { getSavedRooms } from '../../lib/api/rooms';

export function useSavedRooms(userId?: string) {
  return useQuery({
    queryKey: ['savedRooms', userId],
    queryFn: () => (userId ? getSavedRooms(userId) : []),
    enabled: Boolean(userId),
    staleTime: 60 * 1000, // 1 minute
  });
}
