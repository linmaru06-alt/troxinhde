import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useUIStore } from '../store/useUIStore';

/**
 * Automatically closes all active dropdowns, mobile sheets, search suggestions,
 * and temporary panels whenever the route pathname changes.
 */
export function useCloseOnNavigate() {
  const location = useLocation();
  const closeAll = useUIStore((s) => s.closeAll);

  useEffect(() => {
    closeAll();
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname, closeAll]);
}
