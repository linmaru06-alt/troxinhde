import React, { useState } from 'react';
import { Button } from './Button';
import { RotateCcw, Home, AlertTriangle, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';

export interface ErrorFallbackProps {
  error?: any;
  resetError?: () => void;
}

export const ErrorFallbackUI: React.FC<ErrorFallbackProps> = ({ error, resetError }) => {
  const [showDetails, setShowDetails] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const errorMessage = error instanceof Error ? error.message : typeof error === 'string' ? error : error ? String(error) : '';
  const errorStack = error instanceof Error ? error.stack : '';

  const handleCopy = () => {
    const details = `Lỗi: ${errorMessage}\nStack: ${errorStack || 'N/A'}`;
    navigator.clipboard.writeText(details);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleRetry = async () => {
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((r) => r.unregister()));
      }
    } catch {
      // ignore
    }
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-6">
      <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-xl text-center space-y-6 animate-fadeIn">
        <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto ring-8 ring-rose-50/50">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl font-black text-gray-900">Đã xảy ra sự cố</h1>
          <p className="text-xs text-gray-500 leading-relaxed">
            Hệ thống đã ghi nhận lỗi tự động về trung tâm giám sát. Bạn có thể thử tải lại trang hoặc quay về trang chủ.
          </p>

          {/* Accordion chi tiết lỗi kỹ thuật */}
          {errorMessage && (
            <div className="pt-2 text-left">
              <button
                type="button"
                onClick={() => setShowDetails(!showDetails)}
                className="w-full flex items-center justify-between px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                <span>Chi tiết lỗi kỹ thuật</span>
                {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showDetails && (
                <div className="mt-2 p-3 bg-slate-900 text-emerald-400 rounded-xl text-[11px] font-mono overflow-x-auto space-y-2">
                  <div className="flex items-center justify-between text-slate-400 text-[10px] pb-1 border-b border-slate-700">
                    <span>Mô tả ngoại lệ</span>
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="text-amber-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{isCopied ? 'Đã chép' : 'Sao chép'}</span>
                    </button>
                  </div>
                  <div className="text-rose-400 font-bold">{errorMessage}</div>
                  {errorStack && (
                    <pre className="text-[10px] text-slate-400 whitespace-pre-wrap leading-tight max-h-40 overflow-y-auto">
                      {errorStack}
                    </pre>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <Button
            variant="outline"
            size="md"
            className="w-full"
            onClick={handleRetry}
            leftIcon={<RotateCcw className="w-4 h-4" />}
          >
            Thử Lại
          </Button>
          <Button
            variant="primary"
            size="md"
            className="w-full"
            onClick={() => (window.location.href = '/')}
            leftIcon={<Home className="w-4 h-4" />}
          >
            Về Trang Chủ
          </Button>
        </div>
      </div>
    </div>
  );
};
