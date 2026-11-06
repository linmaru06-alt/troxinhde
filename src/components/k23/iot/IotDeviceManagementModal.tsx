import React, { useState, useEffect } from 'react';
import {
  X,
  Cpu,
  Zap,
  KeyRound,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  BatteryCharging,
  Wifi,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { K23IotDevice, LockTemporaryPasscode, IOT_DEVICE_META } from '../../../types/k23Iot';
import { getIotDevices, syncIotMeter, generateLockPasscode } from '../../../lib/api/k23Iot';

interface IotDeviceManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  buildingName?: string;
}

export const IotDeviceManagementModal: React.FC<IotDeviceManagementModalProps> = ({
  isOpen,
  onClose,
  buildingName = 'Tòa Nhà Xanh Trọ Xinh',
}) => {
  const [devices, setDevices] = useState<K23IotDevice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [generatedPasscode, setGeneratedPasscode] = useState<LockTemporaryPasscode | null>(null);
  const [isCopiedPin, setIsCopiedPin] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadDevices();
    }
  }, [isOpen]);

  const loadDevices = async () => {
    setIsLoading(true);
    try {
      const data = await getIotDevices();
      setDevices(data);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleSyncMeter = async (deviceId: string) => {
    setSyncingId(deviceId);
    try {
      const res = await syncIotMeter(deviceId);
      if (res.success) {
        setDevices((prev) =>
          prev.map((d) => (d.id === deviceId ? { ...d, latest_reading_kwh: res.newReading, last_synced_at: new Date().toISOString() } : d))
        );
      }
    } finally {
      setSyncingId(null);
    }
  };

  const handleCreatePasscode = async (roomNumber: string) => {
    const pin = await generateLockPasscode(roomNumber, 24);
    setGeneratedPasscode(pin);
  };

  const handleCopyPasscode = () => {
    if (!generatedPasscode) return;
    navigator.clipboard.writeText(
      `Mã mở cửa phòng ${generatedPasscode.room_number}: ${generatedPasscode.passcode} (Có hiệu lực đến ${generatedPasscode.valid_to})`
    );
    setIsCopiedPin(true);
    setTimeout(() => setIsCopiedPin(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-slate-900 via-violet-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-violet-500/20 border border-violet-400/30 flex items-center justify-center text-violet-300">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-violet-500/30 text-violet-200 px-2.5 py-0.5 rounded-full border border-violet-400/30">
                  K23 PMS • P2-08 (Pro)
                </span>
                <span className="text-xs text-violet-200 font-bold">Smart Hardware Gateway</span>
              </div>
              <h2 className="text-lg font-black text-white mt-1">
                Cổng Kết Nối Phần Cứng Thông Minh (IoT)
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nội dung */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-xs">
          {/* Banner giới thiệu cổng kết nối */}
          <div className="p-4 rounded-2xl bg-violet-50/70 border border-violet-200 text-violet-900 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-violet-600" />
              Đồng bộ chỉ số công-tơ tự động & Điều khiển khóa phòng từ xa
            </p>
            <p className="text-violet-700 leading-relaxed text-[11px]">
              Hệ thống tự động tiếp nhận chỉ số điện qua Gateway Tuya/Zigbee vào ngày cuối tháng và tích hợp tạo mã mở cửa tạm thời qua Bluetooth TTLock.
            </p>
          </div>

          {/* Popup Mã PIN mở cửa tạm thời nếu vừa sinh */}
          {generatedPasscode && (
            <div className="p-4 rounded-2xl bg-slate-900 text-white border border-violet-400/40 space-y-3 animate-in fade-in duration-300">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <span className="font-bold text-amber-400 flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4" /> Mã Mở Cửa Tạm Thời ({generatedPasscode.room_number})
                </span>
                <button
                  type="button"
                  onClick={() => setGeneratedPasscode(null)}
                  className="text-slate-400 hover:text-white text-xs"
                >
                  Đóng
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="font-mono text-3xl font-black text-emerald-400 tracking-widest block">
                    {generatedPasscode.passcode}
                  </span>
                  <span className="text-[11px] text-slate-300 mt-1 block">
                    Hiệu lực đến: {generatedPasscode.valid_to}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleCopyPasscode}
                  className="px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold flex items-center gap-1.5 transition text-xs"
                >
                  {isCopiedPin ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                  {isCopiedPin ? 'Đã sao chép' : 'Sao chép gửi khách'}
                </button>
              </div>
            </div>
          )}

          {/* Danh sách thiết bị IoT */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-black text-slate-900">Thiết Bị Phần Cứng Đang Kết Nối ({devices.length}):</span>
              <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Gateway Online
              </span>
            </div>

            {isLoading ? (
              <div className="text-center py-8 text-slate-400">Đang kiểm tra kết nối thiết bị...</div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
                {devices.map((device) => {
                  const meta = IOT_DEVICE_META[device.device_type];
                  const isMeter = meta.iconType === 'meter';

                  return (
                    <div
                      key={device.id}
                      className="p-4 hover:bg-slate-50/70 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-start sm:items-center gap-3.5">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            isMeter ? 'bg-amber-100 text-amber-700' : 'bg-violet-100 text-violet-700'
                          }`}
                        >
                          {isMeter ? <Zap className="w-5 h-5" /> : <KeyRound className="w-5 h-5" />}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-sm text-slate-900">{device.device_name}</span>
                            <span className="font-bold text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-800">
                              {device.room_number}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1">
                            <span>MAC: <strong className="font-mono text-slate-700">{device.device_mac}</strong></span>
                            <span>•</span>
                            <span>{meta.provider}</span>
                            {device.latest_lock_battery !== undefined && (
                              <>
                                <span>•</span>
                                <span className="text-emerald-700 font-bold flex items-center gap-0.5">
                                  <BatteryCharging className="w-3.5 h-3.5" /> Pin: {device.latest_lock_battery}%
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-center">
                        {isMeter && device.latest_reading_kwh !== undefined && (
                          <div className="text-right">
                            <span className="font-mono font-black text-base text-amber-600 block">
                              {device.latest_reading_kwh} <span className="text-[10px] text-slate-500 font-sans">kWh</span>
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Đồng bộ: {new Date(device.last_synced_at).toLocaleTimeString('vi-VN')}
                            </span>
                          </div>
                        )}

                        {isMeter ? (
                          <button
                            type="button"
                            disabled={syncingId === device.id}
                            onClick={() => handleSyncMeter(device.id)}
                            className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold border border-amber-300 text-xs flex items-center gap-1.5 transition cursor-pointer"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${syncingId === device.id ? 'animate-spin' : ''}`} />
                            <span>{syncingId === device.id ? 'Đang đọc...' : 'Đồng bộ tức thì'}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleCreatePasscode(device.room_number)}
                            className="px-3 py-1.5 rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-900 font-bold border border-violet-300 text-xs flex items-center gap-1.5 transition cursor-pointer"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            <span>Cấp mã mở cửa</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            Cổng tiếp nhận Webhook IoT: <code className="font-mono bg-slate-100 px-1.5 py-0.5 rounded">POST /api/k23/iot/meter-sync</code>
          </span>
          <Button variant="outline" size="sm" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </div>
    </div>
  );
};

