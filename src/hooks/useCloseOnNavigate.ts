import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useUIStore } from '../store/useUIStore';
import { trackPage } from '../lib/analytics';

/**
 * Automatically closes all active dropdowns, mobile sheets, search suggestions,
 * resets window scroll, and tracks page view in Google Analytics 4.
 */
export function useCloseOnNavigate() {
  const location = useLocation();
  const closeAll = useUIStore((s) => s.closeAll);

  useEffect(() => {
    closeAll();
    window.scrollTo({ top: 0, behavior: 'instant' });
    trackPage(location.pathname + location.search);
  }, [location.pathname, location.search, closeAll]);
}
