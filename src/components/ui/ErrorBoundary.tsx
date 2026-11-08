import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ErrorFallbackUI } from './ErrorFallbackUI';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in application:', error, errorInfo);

    // Tự động khôi phục nếu trình duyệt người dùng bị kẹt chunk cũ từ cache sau deploy
    const errorMsg = String(error?.message || error || '');
    const isStaleCacheError =
      errorMsg.includes('ShieldCheck') ||
      errorMsg.includes('Failed to fetch dynamically imported module') ||
      errorMsg.includes('Importing a module script failed') ||
      errorMsg.includes('Loading chunk') ||
      errorMsg.includes('is not defined') ||
      errorMsg.includes('Unexpected token');

    if (isStaleCacheError && typeof window !== 'undefined') {
      const reloadKey = 'troxinh_auto_cache_clear_' + errorMsg.slice(0, 15);
      if (!sessionStorage.getItem(reloadKey)) {
        sessionStorage.setItem(reloadKey, 'true');
        try {
          if ('caches' in window) {
            caches.keys().then((names) => Promise.all(names.map((n) => caches.delete(n))));
          }
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then((regs) => {
              Promise.all(regs.map((r) => r.unregister())).then(() => {
                window.location.reload();
              });
            });
            return;
          }
        } catch {
          // ignore
        }
        window.location.reload();
      }
    }
  }

  public resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return <ErrorFallbackUI error={this.state.error} resetError={this.resetError} />;
    }

    return this.props.children;
  }
}
