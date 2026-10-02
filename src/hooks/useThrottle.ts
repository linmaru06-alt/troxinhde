import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useThrottle: Tiết lưu giá trị để chỉ cập nhật tối đa 1 lần trong mỗi chu kỳ `interval` ms.
 * Dùng cho các giá trị biến thiên liên tục như vị trí chuột, kích thước cửa sổ, tọa độ bản đồ.
 */
export function useThrottle<T>(value: T, interval: number = 200): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastExecuted = useRef<number>(Date.now());

  useEffect(() => {
    const now = Date.now();
    const elapsed = now - lastExecuted.current;

    if (elapsed >= interval) {
      lastExecuted.current = now;
      setThrottledValue(value);
    } else {
      const timer = setTimeout(() => {
        lastExecuted.current = Date.now();
        setThrottledValue(value);
      }, interval - elapsed);

      return () => clearTimeout(timer);
    }
  }, [value, interval]);

  return throttledValue;
}

/**
 * useThrottledCallback: Tiết lưu hàm thực thi, ngăn chặn việc gọi dồn dập (ví dụ khi cuộn trang hoặc kéo bản đồ).
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  interval: number = 200
): {
  (...args: Parameters<T>): void;
  cancel: () => void;
} {
  const callbackRef = useRef<T>(callback);
  const lastExecuted = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const throttledFn = useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      const elapsed = now - lastExecuted.current;

      if (elapsed >= interval) {
        cancel();
        lastExecuted.current = now;
        callbackRef.current(...args);
      } else {
        cancel();
        timerRef.current = setTimeout(() => {
          lastExecuted.current = Date.now();
          callbackRef.current(...args);
        }, interval - elapsed);
      }
    },
    [interval, cancel]
  );

  useEffect(() => {
    return () => {
      cancel();
    };
  }, [cancel]);

  (throttledFn as any).cancel = cancel;
  return throttledFn as any;
}
