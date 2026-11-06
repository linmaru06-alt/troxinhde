import React, { useState, useMemo } from 'react';
import {
  X,
  Clock,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  DollarSign,
  Calculator,
  Calendar,
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { formatPrice } from '../../ui/Cards';
import { LateFeeConfig, LateFeeType, DEFAULT_LATE_FEE_CONFIG } from '../../../types/k23LateFee';
import { calculateLateFee } from '../../../utils/k23LateFeeCalculator';

interface LateFeeConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: (config: LateFeeConfig) => void;
}

export const LateFeeConfigModal: React.FC<LateFeeConfigModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [config, setConfig] = useState<LateFeeConfig>(DEFAULT_LATE_FEE_CONFIG);

  // States giả lập
  const [simTotalDue, setSimTotalDue] = useState<number>(4500000);
  const [simDueDate, setSimDueDate] = useState<string>('2026-11-05');
  const [simAsOfDate, setSimAsOfDate] = useState<string>('2026-11-10');

  const simResult = useMemo(() => {
    return calculateLateFee(simTotalDue, simDueDate, simAsOfDate, config);
  }, [simTotalDue, simDueDate, simAsOfDate, config]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (onSave) onSave(config);
    alert('Đã lưu cấu hình phạt chậm nộp tiền phòng thành công!');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-400/30 flex items-center justify-center text-rose-300">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-rose-500/30 text-rose-200 px-2.5 py-0.5 rounded-full border border-rose-400/30">
                  K23 PMS • P2-06 (Pro)
                </span>
                <span className="text-xs text-rose-200 font-bold">Rèn Luyện Ý Thức Đóng Tiền</span>
              </div>
              <h2 className="text-lg font-black text-white mt-1">
                Cấu Hình Phạt Chậm Nộp Tiền Phòng Tự Động
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
          {/* Công tắc Bật/Tắt */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <span className="font-bold text-slate-900 text-sm block">Kích hoạt phạt chậm nộp tiền phòng</span>
              <span className="text-slate-500 text-[11px]">Tự động cộng tiền phạt vào hóa đơn khi quá hạn</span>
            </div>
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
              className="w-5 h-5 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
            />
          </div>

          {/* Cấu hình chi tiết */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Thời gian ân hạn (Grace Period) *
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={0}
                    max={15}
                    value={config.grace_period_days}
                    onChange={(e) => setConfig({ ...config, grace_period_days: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-bold"
                  />
                  <span className="text-slate-500 shrink-0">ngày</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  Sau ngày đến hạn bao nhiêu ngày thì bắt đầu tính phạt (VD: 3 ngày)
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Hình thức phạt *</label>
                <select
                  value={config.fee_type}
                  onChange={(e) => setConfig({ ...config, fee_type: e.target.value as LateFeeType })}
                  className="w-full p-2.5 rounded-xl border border-slate-300 font-medium bg-white"
                >
                  <option value="daily_amount">Phạt theo ngày quá hạn (VD: 20.000đ/ngày)</option>
                  <option value="fixed">Phạt cố định một lần (VD: 50.000đ/lần)</option>
                  <option value="daily_rate">Phạt phần trăm theo ngày (VD: 0.5%/ngày)</option>
                </select>
              </div>

              {config.fee_type === 'daily_amount' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Số tiền phạt mỗi ngày trễ *</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step={5000}
                      value={config.daily_amount}
                      onChange={(e) => setConfig({ ...config, daily_amount: Number(e.target.value) })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 font-bold"
                    />
                    <span className="text-slate-500 shrink-0">đ / ngày</span>
                  </div>
                </div>
              )}

              {config.fee_type === 'fixed' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Số tiền phạt cố định *</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step={10000}
                      value={config.fixed_amount}
                      onChange={(e) => setConfig({ ...config, fixed_amount: Number(e.target.value) })}
                      className="w-full p-2.5 rounded-xl border border-slate-300 font-bold"
                    />
                    <span className="text-slate-500 shrink-0">đ / lần</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Mức phạt tối đa (Trần trễ hạn)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step={50000}
                    value={config.max_cap_amount || 300000}
                    onChange={(e) => setConfig({ ...config, max_cap_amount: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-bold"
                  />
                  <span className="text-slate-500 shrink-0">đ</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Không phạt vượt quá mức trần này</p>
              </div>
            </div>
          </div>

          {/* Giả lập tính toán trực quan */}
          <div className="p-4 rounded-2xl bg-slate-900 text-white space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <span className="font-bold flex items-center gap-1.5 text-amber-400">
                <Calculator className="w-4 h-4" /> Giả Lập Tính Phạt Trực Tiếp
              </span>
              <span className="text-[10px] text-slate-400">Thử nghiệm xem logic hoạt động</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-slate-300 mb-1">Tiền phòng gốc:</label>
                <input
                  type="number"
                  value={simTotalDue}
                  onChange={(e) => setSimTotalDue(Number(e.target.value))}
                  className="w-full p-2 rounded-xl bg-white/10 border border-white/20 text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-300 mb-1">Ngày đến hạn:</label>
                <input
                  type="date"
                  value={simDueDate}
                  onChange={(e) => setSimDueDate(e.target.value)}
                  className="w-full p-2 rounded-xl bg-white/10 border border-white/20 text-white font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-300 mb-1">Ngày tính phạt (Hôm nay):</label>
                <input
                  type="date"
                  value={simAsOfDate}
                  onChange={(e) => setSimAsOfDate(e.target.value)}
                  className="w-full p-2 rounded-xl bg-white/10 border border-white/20 text-white font-bold"
                />
              </div>
            </div>

            {/* Kết quả */}
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1.5 pt-3">
              <div className="flex justify-between items-center">
                <span className="text-slate-300">Số ngày quá hạn:</span>
                <span className="font-black text-rose-400 text-sm">
                  {simResult.overdueDays} ngày (Tính phạt: {simResult.chargeableDays} ngày)
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-300">Tiền phạt phát sinh:</span>
                <span className="font-black text-amber-400 text-base">
                  +{formatPrice(simResult.lateFeeAmount)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-white/10">
                <span className="text-white font-bold">Tổng tiền khách phải trả:</span>
                <span className="font-black text-emerald-400 text-base">
                  {formatPrice(simTotalDue + simResult.lateFeeAmount)}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 italic pt-1">
                💬 Tin nhắn Zalo sẽ tự động thêm: "{simResult.explanation}"
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={onClose}>
            Đóng
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave}>
            Lưu Cấu Hình
          </Button>
        </div>
      </div>
    </div>
  );
};

