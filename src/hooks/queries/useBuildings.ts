import { useQuery } from '@tanstack/react-query';
import { getBuildings } from '../../lib/api/buildings';

export function useBuildings(ownerId?: string) {
  return useQuery({
    queryKey: ['buildings', ownerId],
    queryFn: () => getBuildings(ownerId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
