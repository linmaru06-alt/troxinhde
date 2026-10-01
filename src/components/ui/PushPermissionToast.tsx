
import React from 'react';
import { Button } from './Button';
import { usePushNotification } from '../../hooks/usePushNotification';
import { Bell, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const PushPermissionToast: React.FC = () => {
  const { showPrompt, dismissPrompt, isLastPrompt, requestPermission } = usePushNotification();

  if (!showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.95 }}
        className="fixed right-4 sm:right-6 z-50 max-w-sm w-full bg-white rounded-3xl p-4 sm:p-5 shadow-2xl border border-gray-200/90 flex items-start gap-3.5 sm:!bottom-6"
        style={{ bottom: 'calc(var(--mobile-bottom-offset, 3.5rem) + 0.75rem)' }}
      >
        <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#006d37] flex items-center justify-center shrink-0">
          <Bell className="w-5 h-5 animate-bounce" />
        </div>

        <div className="flex-1 space-y-2">
          <div>
            <h4 className="text-xs font-bold text-gray-900 leading-tight">
              Đừng để lỡ phòng đẹp và tin nhắn quan trọng
            </h4>
            <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">
              Biết ngay khi chủ trọ trả lời, có người hỏi mua món đồ bạn đăng, hoặc có phòng giá tốt vừa lên sàn.
            </p>
            <p className="text-[10px] text-gray-400 mt-1 leading-snug">
              Bạn có thể tắt bất cứ lúc nào trong cài đặt trình duyệt.
            </p>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Button
              variant="primary"
              size="sm"
              onClick={requestPermission}
              className="text-xs py-1.5 px-3"
            >
              Bật thông báo
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={dismissPrompt}
              className="text-xs py-1.5 px-2 text-gray-500 hover:text-gray-700"
            >
              {isLastPrompt ? 'Không, cảm ơn' : 'Để sau'}
            </Button>
          </div>
        </div>

        <button
          onClick={dismissPrompt}
          className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
          aria-label="Đóng"
        >
          <X className="w-4 h-4" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
};
