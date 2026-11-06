// =====================================================================
// K23 PMS — PHASE 4: SIÊU HỆ SINH THÁI THÔNG MINH
// P3-05: Huy hiệu trạng thái Ngoại tuyến / Đồng bộ nền PWA
// =====================================================================

import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, Volume2, CheckCircle2 } from 'lucide-react';
import {
  getOfflineQueue,
  flushOfflineQueue,
  playPaymentReceivedChime,
  enqueueOfflineAction,
} from '../../../lib/offline/k23OfflineSyncEngine';

interface OfflineSyncStatusBadgeProps {
  onSyncComplete?: () => void;
}

export const OfflineSyncStatusBadge: React.FC<OfflineSyncStatusBadgeProps> = ({ onSyncComplete }) => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [queueCount, setQueueCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncMessage, setLastSyncMessage] = useState<string | null>(null);

  const refreshCount = () => {
    setQueueCount(getOfflineQueue().length);
  };

  useEffect(() => {
    refreshCount();

    const handleOnline = () => {
      setIsOnline(true);
      // Tự động đẩy dữ liệu khi có mạng
      handleTriggerSync();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const interval = setInterval(refreshCount, 3000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const handleTriggerSync = async () => {
    if (!navigator.onLine) {
      alert('Thiết bị đang không có kết nối Internet. Vui lòng kết nối WiFi hoặc 4G để đồng bộ.');
      return;
    }

    setIsSyncing(true);
    try {
      const res = await flushOfflineQueue();
      refreshCount();
      if (res.successCount > 0) {
        setLastSyncMessage(`Đã đồng bộ ${res.successCount} bản ghi lên Supabase Cloud!`);
        setTimeout(() => setLastSyncMessage(null), 3000);
        if (onSyncComplete) onSyncComplete();
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleTestChime = () => {
    playPaymentReceivedChime();
  };

  const handleSimulateOfflineRecord = () => {
    enqueueOfflineAction('meter_reading', 'room_demo_underground', {
      roomNumber: 'P.102 (Hầm B1)',
      elecNew: 1480,
      waterNew: 88,
      note: 'Ghi ngoại tuyến khi mất sóng tầng hầm',
    });
    refreshCount();
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Badge mạng */}
      <div
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
          isOnline
            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs'
            : 'bg-rose-50 text-rose-800 border border-rose-300 animate-pulse'
        }`}
      >
        {isOnline ? (
          <>
            <Wifi className="w-3.5 h-3.5 text-emerald-600" />
            <span>Trực tuyến</span>
          </>
        ) : (
          <>
            <WifiOff className="w-3.5 h-3.5 text-rose-600" />
            <span>Ngoại tuyến (Tầng hầm)</span>
          </>
        )}
      </div>

      {/* Số lượng chờ đồng bộ */}
      {queueCount > 0 && (
        <button
          type="button"
          onClick={handleTriggerSync}
          disabled={isSyncing}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs transition cursor-pointer shadow-xs"
          title="Bấm để đồng bộ dữ liệu lên máy chủ"
        >
          <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{queueCount} chờ đồng bộ</span>
        </button>
      )}

      {/* Nút test âm thanh Ting tiền về */}
      <button
        type="button"
        onClick={handleTestChime}
        className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs transition cursor-pointer flex items-center gap-1"
        title="Thử âm thanh Ting! tiền về"
      >
        <Volume2 className="w-3.5 h-3.5 text-blue-600" />
        <span className="hidden sm:inline text-[11px] font-semibold">Ting! Âm thanh</span>
      </button>

      {/* Nút test giả lập ghi ngoại tuyến */}
      <button
        type="button"
        onClick={handleSimulateOfflineRecord}
        className="px-2 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-[11px] font-semibold transition cursor-pointer"
        title="Giả lập ghi số điện khi đang ở tầng hầm không có mạng"
      >
        + Ghi số tầng hầm
      </button>

      {lastSyncMessage && (
        <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          {lastSyncMessage}
        </span>
      )}
    </div>
  );
};
