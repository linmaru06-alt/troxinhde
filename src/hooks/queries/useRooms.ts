import { useQuery } from '@tanstack/react-query';
import { getRooms, RoomFilters } from '../../lib/api/rooms';

export function useRooms(filters?: RoomFilters) {
  return useQuery({
    queryKey: ['rooms', filters],
    queryFn: () => getRooms(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
}
