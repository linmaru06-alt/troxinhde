import { useQuery } from '@tanstack/react-query';
import { getConversations } from '../../lib/api/messages';

export function useConversations(userId?: string) {
  return useQuery({
    queryKey: ['conversations', userId],
    queryFn: () => (userId ? getConversations(userId) : []),
    enabled: Boolean(userId),
    staleTime: 10 * 1000, // 10 seconds
    refetchInterval: 15 * 1000,
  });
}
