import { useEffect, RefObject } from 'react';

/**
 * Hook to trigger callback when clicking outside the specified ref element
 * or when pressing the Escape key.
 */
export function useOutsideClick(
  ref: RefObject<HTMLElement | null>,
  onOutsideClick: () => void,
  isActive: boolean = true
) {
  useEffect(() => {
    if (!isActive) return;

    function handleClick(e: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onOutsideClick();
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onOutsideClick();
      }
    }

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick, { passive: true });
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActive, onOutsideClick, ref]);
}
