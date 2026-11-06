import React, { useState, useMemo } from 'react';
import {
  X,
  Calculator,
  Calendar,
  DollarSign,
  ArrowRight,
  Check,
  Copy,
  Sparkles,
  Info,
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { formatPrice } from '../../ui/Cards';
import {
  calculateProratedRent,
  calculateMoveInProration,
  calculateMoveOutProration,
} from '../../../utils/k23Proration';

interface ProrationCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMonthlyRent?: number;
  onApplyProration?: (result: { amount: number; description: string }) => void;
}

export const ProrationCalculatorModal: React.FC<ProrationCalculatorModalProps> = ({
  isOpen,
  onClose,
  defaultMonthlyRent = 3500000,
  onApplyProration,
}) => {
  const [calcType, setCalcType] = useState<'move_in' | 'move_out' | 'custom'>('move_in');
  const [monthlyRent, setMonthlyRent] = useState<number>(defaultMonthlyRent);

  const todayStr = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(todayStr);

  const [copied, setCopied] = useState(false);

  // Tính toán kết quả theo chế độ
  const result = useMemo(() => {
    if (calcType === 'move_in') {
      return calculateMoveInProration(monthlyRent, startDate);
    }
    if (calcType === 'move_out') {
      return calculateMoveOutProration(monthlyRent, endDate);
    }
    return calculateProratedRent(monthlyRent, startDate, endDate);
  }, [calcType, monthlyRent, startDate, endDate]);

  if (!isOpen) return null;

  const handleCopy = () => {
    const text = `Tiền phòng ngày lẻ: ${formatPrice(result.proratedRent)} (${result.formulaDescription})`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleApply = () => {
    if (onApplyProration) {
      onApplyProration({
        amount: result.proratedRent,
        description: `Tiền phòng lẻ ${result.actualStayDays} ngày (${result.startDate} đến ${result.endDate})`,
      });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/20">
              <Calculator className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Tính Tiền Phòng Ngày Lẻ (K23)</h3>
              <p className="text-xs text-emerald-100/90">
                P0-05 • Chia tiền theo ngày thực tế khi vào/ra giữa kỳ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form body */}
        <div className="p-6 space-y-5">
          {/* Bộ chọn chế độ */}
          <div className="grid grid-cols-3 gap-2 p-1.5 rounded-2xl bg-slate-100 border border-slate-200 text-xs font-bold">
            <button
              type="button"
              onClick={() => setCalcType('move_in')}
              className={`py-2 rounded-xl transition-all ${
                calcType === 'move_in'
                  ? 'bg-white text-emerald-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Vào giữa tháng
            </button>
            <button
              type="button"
              onClick={() => setCalcType('move_out')}
              className={`py-2 rounded-xl transition-all ${
                calcType === 'move_out'
                  ? 'bg-white text-emerald-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ra giữa tháng
            </button>
            <button
              type="button"
              onClick={() => setCalcType('custom')}
              className={`py-2 rounded-xl transition-all ${
                calcType === 'custom'
                  ? 'bg-white text-emerald-800 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tùy chọn ngày
            </button>
          </div>

          {/* Nhập giá phòng */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              Giá thuê 1 tháng niêm yết (VNĐ)
            </label>
            <div className="relative">
              <input
                type="number"
                step="50000"
                value={monthlyRent || ''}
                onChange={(e) => setMonthlyRent(parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-bold text-slate-800"
                placeholder="3.500.000"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
                đ/tháng
              </span>
            </div>
          </div>

          {/* Chọn ngày */}
          {calcType === 'move_in' && (
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Ngày khách bắt đầu dọn vào ở
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-semibold text-slate-800"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Hệ thống tự tính từ ngày này đến ngày cuối cùng của tháng {new Date(startDate).getMonth() + 1}.
              </span>
            </div>
          )}

          {calcType === 'move_out' && (
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Ngày khách trả phòng dọn đi
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm font-semibold text-slate-800"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Hệ thống tự tính từ ngày đầu tháng đến ngày khách dọn đi.
              </span>
            </div>
          )}

          {calcType === 'custom' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Từ ngày
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-2xl border border-slate-200 text-xs font-semibold text-slate-800"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Đến ngày
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-2xl border border-slate-200 text-xs font-semibold text-slate-800"
                />
              </div>
            </div>
          )}

          {/* Hộp kết quả tính toán chi tiết */}
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                Số tiền phòng thực thu
              </span>
              <span className="text-xs font-bold text-emerald-700">
                {result.actualStayDays} ngày thực ở
              </span>
            </div>

            <div className="text-2xl font-black text-emerald-900">
              {formatPrice(result.proratedRent)}
            </div>

            <div className="text-xs text-emerald-800/90 pt-2 border-t border-emerald-200/80 space-y-1">
              <div className="flex justify-between">
                <span>Đơn giá ngày:</span>
                <span className="font-semibold">{formatPrice(result.dailyRate)}/ngày</span>
              </div>
              <div className="flex justify-between">
                <span>Số ngày trong tháng:</span>
                <span className="font-semibold">{result.totalDaysInMonth} ngày</span>
              </div>
              <div className="text-[11px] text-emerald-700/80 pt-1 italic">
                {result.formulaDescription}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Đã chép số tiền' : 'Sao chép kết quả'}
          </button>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onClose}>
              Đóng
            </Button>
            {onApplyProration && (
              <Button
                variant="primary"
                onClick={handleApply}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                Áp dụng vào hóa đơn
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

