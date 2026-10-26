import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MarketplaceItem } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import {
  createMarketplaceItem,
  deleteMarketplaceItem,
  getMarketplaceItemById,
  isMarketplaceItemId,
  setMarketplaceItemStatus,
  updateMarketplaceItemContent,
  fetchMarketplaceItemsByRoomId,
  fetchMarketplaceItemsByBuildingId,
} from '../../lib/api/marketplace';
import { resolveSessionProfileId } from '../../lib/authService';
import { MarketplaceItemInput, MarketplaceSellerStatus } from '../../lib/marketplaceStatus';

export const marketplaceItemKey = (id?: string) => ['marketplace-item', id] as const;
export const marketplaceByRoomKey = (roomId?: string) => ['marketplace-by-room', roomId] as const;
export const marketplaceByBuildingKey = (buildingId?: string) => ['marketplace-by-building', buildingId] as const;

/**
 * Danh sách đồ pass/thanh lý tại một phòng trọ (USP 2: Vòng đời chuyển trọ khép kín)
 */
export function useMarketplaceByRoom(roomId?: string) {
  const query = useQuery({
    queryKey: marketplaceByRoomKey(roomId),
    queryFn: async () => {
      if (!roomId) return [];
      return fetchMarketplaceItemsByRoomId(roomId);
    },
    enabled: Boolean(roomId),
    staleTime: 60 * 1000,
  });

  return {
    items: query.data || [],
    isLoading: query.isLoading,
    error: (query.error as Error | null) ?? null,
    refetch: query.refetch,
  };
}

/**
 * Danh sách đồ pass/thanh lý thuộc cùng một tòa nhà
 */
export function useMarketplaceByBuilding(buildingId?: string) {
  const query = useQuery({
    queryKey: marketplaceByBuildingKey(buildingId),
    queryFn: async () => {
      if (!buildingId) return [];
      return fetchMarketplaceItemsByBuildingId(buildingId);
    },
    enabled: Boolean(buildingId),
    staleTime: 60 * 1000,
  });

  return {
    items: query.data || [],
    isLoading: query.isLoading,
    error: (query.error as Error | null) ?? null,
    refetch: query.refetch,
  };
}

/**
 * Chi tiết một tin chợ đồ cũ. Dữ liệu máy chủ là nguồn chính;
 * bản trong danh sách chỉ dùng để hiển thị ngay trong lúc tải.
 */
export function useMarketplaceItem(id?: string) {
  const cachedItem = useAppStore((s) => (id ? s.marketplaceItems.find((i) => i.id === id) : undefined));
  const upsertMarketplaceItem = useAppStore((s) => s.upsertMarketplaceItem);
  const removeMarketplaceItem = useAppStore((s) => s.removeMarketplaceItem);
  const isRemote = isMarketplaceItemId(id);

  const query = useQuery({
    queryKey: marketplaceItemKey(id),
    queryFn: async () => {
      const item = await getMarketplaceItemById(id as string);
      if (item) upsertMarketplaceItem(item);
      else removeMarketplaceItem(id as string);
      return item;
    },
    enabled: isRemote,
    staleTime: 30 * 1000,
  });

  const item: MarketplaceItem | null = query.data !== undefined ? query.data : cachedItem ?? null;

  return {
    item,
    isLoading: isRemote && query.isLoading && !cachedItem,
    error: (query.error as Error | null) ?? null,
    refetch: query.refetch,
  };
}

/**
 * Các thao tác của người bán. Chỉ cập nhật giao diện bằng dữ liệu máy chủ trả về sau khi thành công.
 */
export function useMarketplaceItemMutations() {
  const queryClient = useQueryClient();
  const upsertMarketplaceItem = useAppStore((s) => s.upsertMarketplaceItem);
  const removeMarketplaceItem = useAppStore((s) => s.removeMarketplaceItem);

  const applyItem = (item: MarketplaceItem) => {
    upsertMarketplaceItem(item);
    queryClient.setQueryData(marketplaceItemKey(item.id), item);
    queryClient.invalidateQueries({ queryKey: ['marketplace-by-room'] });
    queryClient.invalidateQueries({ queryKey: ['marketplace-by-building'] });
  };

  const createItem = useMutation({
    mutationFn: async ({ sellerId, input }: { sellerId: string; input: MarketplaceItemInput }) => {
      // Lấy lại id hồ sơ theo phiên Firebase ngay lúc đăng, sửa luôn currentUser nếu đang giữ id cũ
      const profileId = await resolveSessionProfileId(sellerId);
      const storedUser = useAppStore.getState().currentUser;
      if (storedUser && storedUser.id !== profileId) {
        useAppStore.getState().setCurrentUser({ ...storedUser, id: profileId });
      }
      return createMarketplaceItem(profileId, input);
    },
    onSuccess: applyItem,
  });

  const updateItem = useMutation({
    mutationFn: ({ id, input }: { id: string; input: MarketplaceItemInput }) => updateMarketplaceItemContent(id, input),
    onSuccess: applyItem,
  });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: MarketplaceSellerStatus }) => setMarketplaceItemStatus(id, status),
    onSuccess: applyItem,
  });

  const deleteItem = useMutation({
    mutationFn: (id: string) => deleteMarketplaceItem(id),
    onSuccess: (_data, id) => {
      removeMarketplaceItem(id);
      queryClient.setQueryData(marketplaceItemKey(id), null);
      queryClient.invalidateQueries({ queryKey: ['marketplace-by-room'] });
      queryClient.invalidateQueries({ queryKey: ['marketplace-by-building'] });
    },
  });

  return { createItem, updateItem, setStatus, deleteItem };
}

export const MARKETPLACE_STATUS_TOASTS: Record<MarketplaceSellerStatus, { title: string; description: string }> = {
  sold: {
    title: 'Đã đánh dấu đã bán 🎉',
    description: 'Tin vẫn hiển thị với nhãn Đã bán, người mua mới không thể nhắn hỏi thêm.',
  },
  closed: {
    title: 'Đã đóng tin',
    description: 'Tin không còn nhận liên hệ mới. Lịch sử trò chuyện vẫn được giữ lại.',
  },
  available: {
    title: 'Đã mở lại tin',
    description: 'Món đồ đã hiển thị trở lại và có thể nhận liên hệ mới.',
  },
};
