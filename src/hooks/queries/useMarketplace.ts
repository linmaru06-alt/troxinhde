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
} from '../../lib/api/marketplace';
import { MarketplaceItemInput, MarketplaceSellerStatus } from '../../lib/marketplaceStatus';

export const marketplaceItemKey = (id?: string) => ['marketplace-item', id] as const;

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
  };

  const createItem = useMutation({
    mutationFn: ({ sellerId, input }: { sellerId: string; input: MarketplaceItemInput }) =>
      createMarketplaceItem(sellerId, input),
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
