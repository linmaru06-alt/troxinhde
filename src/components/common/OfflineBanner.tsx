import React, { useState, useEffect } from 'react';
import { WifiOff, CheckCircle2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export const OfflineBanner: React.FC = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 3000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOffline(true);
      setShowReconnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {isOffline && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-50 bg-rose-600 text-white text-xs font-bold px-4 py-2 text-center flex items-center justify-center gap-2 shadow-md"
          style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top, 0.5rem))' }}
        >
          <WifiOff className="w-4 h-4 animate-pulse" />
          <span>Bạn đang ở chế độ ngoại tuyến. Đang dùng dữ liệu bộ nhớ tạm.</span>
        </motion.div>
      )}

      {showReconnected && (
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -50, opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-50 bg-emerald-600 text-white text-xs font-bold px-4 py-2 text-center flex items-center justify-center gap-2 shadow-md"
          style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top, 0.5rem))' }}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Đã khôi phục kết nối Internet! Dữ liệu đang được đồng bộ.</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
