import React from 'react';
import { Button } from './Button';
import { RotateCcw, Home, AlertTriangle } from 'lucide-react';

export interface ErrorFallbackProps {
  error?: any;
  resetError?: () => void;
}

export const ErrorFallbackUI: React.FC<ErrorFallbackProps> = ({ error, resetError }) => {
  const errorMessage = error instanceof Error ? error.message : typeof error === 'string' ? error : error ? String(error) : '';

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
          {errorMessage && import.meta.env.DEV && (
            <div className="p-3 bg-gray-100 rounded-xl text-left overflow-x-auto text-[11px] text-gray-700 font-mono">
              {errorMessage}
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          {resetError && (
            <Button
              variant="outline"
              size="md"
              className="w-full"
              onClick={resetError}
              leftIcon={<RotateCcw className="w-4 h-4" />}
            >
              Thử Lại
            </Button>
          )}
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
