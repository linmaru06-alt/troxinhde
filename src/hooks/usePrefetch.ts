import { useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export type PrefetchType = 'room' | 'roommate' | 'market';

interface PrefetchOptions {
  type: PrefetchType;
  id?: string;
  imageUrl?: string;
  intentDelayMs?: number; // Ngưỡng nhận diện ý định xem thực sự (mặc định 65ms)
}

/**
 * usePrefetch: Bộ nạp trước tài nguyên thông minh theo Triết lý Qiangu Web (Chương 06 & 14).
 * Tận dụng khoảng thời gian chết 150ms - 300ms của người dùng (từ lúc rê chuột/chạm tay đến khi click)
 * để tải trước JS Chunk, dữ liệu cache và ảnh bìa -> Đưa thời gian mở trang về 0ms.
 */
export function usePrefetch(options: PrefetchOptions) {
  const { type, id, imageUrl, intentDelayMs = 65 } = options;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasPrefetchedRef = useRef<boolean>(false);
  const queryClient = useQueryClient();

  const executePrefetch = useCallback(() => {
    if (hasPrefetchedRef.current) return;
    hasPrefetchedRef.current = true;

    // 1. Nạp trước JavaScript Chunk của trang đích
    try {
      if (type === 'room') {
        import('../pages/RoomDetailPage');
      } else if (type === 'roommate') {
        import('../pages/RoommateDetailPage');
      } else if (type === 'market') {
        import('../pages/MarketplaceDetailPage');
      }
    } catch {
      // Bỏ qua lỗi nạp trước module
    }

    // 2. Nạp trước hình ảnh bìa vào Image Cache của trình duyệt
    if (imageUrl && !imageUrl.startsWith('data:')) {
      const img = new Image();
      img.src = imageUrl;
    }
  }, [type, id, imageUrl, queryClient]);

  // Kích hoạt khi chuột chạm vào hoặc ngón tay chạm kính màn hình
  const onPointerEnter = useCallback(() => {
    if (hasPrefetchedRef.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      executePrefetch();
    }, intentDelayMs);
  }, [executePrefetch, intentDelayMs]);

  // Hủy bỏ nếu chuột rời đi trước 65ms (chứng tỏ chỉ vô tình lướt qua)
  const onPointerLeave = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Chạm trên điện thoại di động: Bắt đầu nạp ngay tức thì ở mili-giây đầu tiên
  const onPointerDown = useCallback(() => {
    executePrefetch();
  }, [executePrefetch]);

  return {
    prefetchProps: {
      onPointerEnter,
      onPointerLeave,
      onPointerDown,
    },
    executePrefetch,
  };
}
