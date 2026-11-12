import React from 'react';
import ReactDOM from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ErrorBoundary } from './components/ui/ErrorBoundary';
import App from './App';
import 'leaflet/dist/leaflet.css';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Có bản deploy mới: service worker mới kích hoạt rồi tự tải lại trang một lần,
// người dùng không bị kẹt ở giao diện cũ trong bộ nhớ đệm
registerSW({ immediate: true });

// Xóa cache tile bản đồ cũ do SW từng giữ (tránh lỗi bản đồ xám khi quay lại trang)
if (typeof window !== 'undefined' && 'caches' in window) {
  caches.delete('google-maps-tiles-cache').catch(() => {});
  caches.delete('osm-tiles-cache').catch(() => {});
}

// Tự động khôi phục và tải lại khi có bản deploy mới của Vite (tránh lỗi 404 chunk cũ hoặc stale script)
window.addEventListener('vite:preloadError', () => {
  const reloadKey = 'troxinh_vite_preload_error_reload';
  if (!sessionStorage.getItem(reloadKey)) {
    sessionStorage.setItem(reloadKey, Date.now().toString());
    if ('caches' in window) {
      caches.keys().then((names) => Promise.all(names.map((n) => caches.delete(n))));
    }
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        Promise.all(regs.map((r) => r.unregister())).then(() => {
          window.location.reload();
        });
      });
    } else {
      window.location.reload();
    }
  }
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000, // V8 Garbage Collection: Thu gom rác các cache không dùng sau 10 phút
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <App />
          {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
        </QueryClientProvider>
      </HelmetProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

