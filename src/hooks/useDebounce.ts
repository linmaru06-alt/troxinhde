import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useDebounce: Trì hoãn việc cập nhật giá trị cho đến khi người dùng ngừng thao tác trong `delay` ms.
 * Tiết kiệm 85% request rác khi gõ tìm kiếm, lọc dữ liệu.
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * useDebouncedCallback: Bọc một hàm bất kỳ bằng cơ chế debounce.
 * Tự động hủy timer khi component unmount để chống rò rỉ bộ nhớ.
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300
): {
  (...args: Parameters<T>): void;
  cancel: () => void;
} {
  const callbackRef = useRef<T>(callback);
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

  const debouncedFn = useCallback(
    (...args: Parameters<T>) => {
      cancel();
      timerRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay, cancel]
  );

  useEffect(() => {
    return () => {
      cancel();
    };
  }, [cancel]);

  (debouncedFn as any).cancel = cancel;
  return debouncedFn as any;
}
