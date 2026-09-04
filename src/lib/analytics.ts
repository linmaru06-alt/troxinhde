// Google Analytics 4 (GA4) Type-Safe Tracking Service for TroXinh.vn

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

export type EventName =
  | 'room_view'
  | 'room_save'
  | 'room_unsave'
  | 'contact_owner'
  | 'call_owner'
  | 'zalo_click'
  | 'booking_start'
  | 'booking_complete'
  | 'search'
  | 'filter_apply'
  | 'map_view'
  | 'register_start'
  | 'register_complete'
  | 'upgrade_view'
  | 'payment_start'
  | 'payment_complete'
  | 'roommate_view'
  | 'marketplace_view'
  | 'review_submit';

export const GA_ID =
  import.meta.env.VITE_GA_MEASUREMENT_ID ||
  import.meta.env.VITE_FIREBASE_MEASUREMENT_ID ||
  'G-8Z6N1ZQ5GW';

export function track(name: EventName, params?: Record<string, any>) {
  if (typeof window === 'undefined' || !window.gtag) return;
  
  // In development, log tracked event to console
  if (import.meta.env.DEV) {
    console.log(`[GA4 Event] ${name}:`, params || {});
  }

  window.gtag('event', name, params);
}

export function trackPage(path: string) {
  if (typeof window === 'undefined' || !window.gtag) return;

  if (import.meta.env.DEV) {
    console.log(`[GA4 PageView] ${path}`);
  }

  window.gtag('config', GA_ID, {
    page_path: path,
  });
}
