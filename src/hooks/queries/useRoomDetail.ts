import { useQuery } from '@tanstack/react-query';
import { getRoomById } from '../../lib/api/rooms';

export function useRoomDetail(id?: string) {
  return useQuery({
    queryKey: ['room', id],
    queryFn: () => (id ? getRoomById(id) : null),
    enabled: Boolean(id),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}
