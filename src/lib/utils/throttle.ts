import { useRef, useCallback } from 'react';

/**
 * QIANGU ENGINE: Throttle Action Hook
 * Khóa chặt các tương tác người dùng trong waitMs mili-giây,
 * triệt tiêu hoàn toàn Double-Submit và bảo vệ Main Thread.
 */
export function useThrottleAction<T extends (...args: any[]) => any>(
  action: T,
  waitMs: number = 2000
): (...args: Parameters<T>) => void {
  const isLockedRef = useRef<boolean>(false);
  const actionRef = useRef<T>(action);
  actionRef.current = action;

  return useCallback(
    (...args: Parameters<T>) => {
      if (isLockedRef.current) return;
      isLockedRef.current = true;
      try {
        actionRef.current(...args);
      } finally {
        setTimeout(() => {
          isLockedRef.current = false;
        }, waitMs);
      }
    },
    [waitMs]
  );
}
