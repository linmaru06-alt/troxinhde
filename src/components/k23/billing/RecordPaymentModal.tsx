import React, { useState } from 'react';
import {
  X,
  CreditCard,
  DollarSign,
  Calendar,
  CheckCircle2,
  Banknote,
  QrCode,
  FileText,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { formatPrice } from '../../ui/Cards';
import { Invoice } from '../../../types/k23';

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onConfirm: (data: {
    invoiceId: string;
    paidNowAmount: number;
    paymentMethod: string;
    notes?: string;
  }) => Promise<any>;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  invoice,
  onConfirm,
}) => {
  if (!isOpen || !invoice) return null;

  const currentTotal = invoice.total_amount || 0;
  const currentPaid = invoice.paid_amount || 0;
  const remainingDebt = Math.max(0, currentTotal - currentPaid);

  const [paidNowAmount, setPaidNowAmount] = useState<number>(remainingDebt > 0 ? remainingDebt : currentTotal);
  const [paymentMethod, setPaymentMethod] = useState<string>('Chuyển khoản VietQR');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const newTotalPaid = currentPaid + paidNowAmount;
  const newRemainingDebt = Math.max(0, currentTotal - newTotalPaid);
  const isFullyPaid = newRemainingDebt === 0;
  const isOverpaid = newTotalPaid > currentTotal;

  const handleQuickAmount = (type: 'full' | 'half' | 'advance') => {
    if (type === 'full') {
      setPaidNowAmount(remainingDebt);
    } else if (type === 'half') {
      setPaidNowAmount(Math.round(remainingDebt / 2 / 1000) * 1000);
    } else if (type === 'advance') {
      // Trả trước thêm 1 tháng tiền phòng
      const rentFee = invoice.items?.find((i) => i.item_type === 'rent')?.amount || currentTotal;
      setPaidNowAmount(remainingDebt + rentFee);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (paidNowAmount <= 0) {
      setErrorMsg('Vui lòng nhập số tiền thanh toán lớn hơn 0đ.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await onConfirm({
        invoiceId: invoice.id,
        paidNowAmount,
        paymentMethod,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể ghi nhận thanh toán');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/20">
              <Banknote className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Ghi Nhận Thu Tiền (K23)</h3>
              <p className="text-xs text-emerald-100/90">
                P0-06 • Hỗ trợ thu từng phần, trả trước và đa phương thức
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

        {/* Thẻ tóm tắt thông tin hóa đơn */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-500 font-medium">Hóa đơn #{invoice.invoice_code}</span>
            <div className="font-bold text-slate-800 text-sm mt-0.5">
              {invoice.room?.room_number || invoice.room?.title || 'Phòng'} • {invoice.tenant?.full_name || 'Khách thuê'}
            </div>
          </div>
          <div className="text-right">
            <span className="text-slate-500 font-medium">Tổng hóa đơn</span>
            <div className="font-bold text-slate-900 text-sm mt-0.5">
              {formatPrice(currentTotal)}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Nhập số tiền thu lần này */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-700">
                Số tiền khách thanh toán lần này (VNĐ)
              </label>
              <span className="text-xs text-amber-700 font-semibold">
                Còn nợ: {formatPrice(remainingDebt)}
              </span>
            </div>

            <div className="relative">
              <input
                type="number"
                step="10000"
                value={paidNowAmount || ''}
                onChange={(e) => setPaidNowAmount(parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-base font-black text-slate-900"
                placeholder="Nhập số tiền..."
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                VNĐ
              </span>
            </div>

            {/* Phím tắt điền tiền nhanh */}
            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={() => handleQuickAmount('full')}
                className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors"
              >
                Trả hết nợ ({formatPrice(remainingDebt)})
              </button>
              {remainingDebt > 500000 && (
                <button
                  type="button"
                  onClick={() => handleQuickAmount('half')}
                  className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  Trả 50%
                </button>
              )}
              <button
                type="button"
                onClick={() => handleQuickAmount('advance')}
                className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
              >
                + Trả trước 1 tháng
              </button>
            </div>
          </div>

          {/* Phương thức thanh toán (P0-08) */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              Phương thức thanh toán
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'Chuyển khoản VietQR', label: 'VietQR', icon: QrCode },
                { id: 'Tiền mặt', label: 'Tiền mặt', icon: Banknote },
                { id: 'Chuyển khoản ngân hàng', label: 'Chuyển khoản', icon: CreditCard },
              ].map((m) => {
                const Icon = m.icon;
                const isSelected = paymentMethod === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id)}
                    className={`p-2.5 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50/80 text-emerald-800 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ghi chú */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              Ghi chú giao dịch (Tùy chọn)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="VD: Khách trả trước một nửa, hẹn cuối tuần đóng nốt..."
              className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>

          {/* Trạng thái dự kiến sau khi ghi nhận */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
            <div className="flex justify-between items-center text-slate-600">
              <span>Đã thu trước đó:</span>
              <span className="font-semibold">{formatPrice(currentPaid)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span>Thu thêm lần này:</span>
              <span className="font-bold text-emerald-700">+{formatPrice(paidNowAmount)}</span>
            </div>
            <div className="pt-1.5 border-t border-slate-200 flex justify-between items-center font-bold">
              <span>Trạng thái sau khi thu:</span>
              {isFullyPaid && (
                <span className="text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full text-[11px]">
                  ✓ Hoàn tất (Đã thu đủ 100%)
                </span>
              )}
              {!isFullyPaid && !isOverpaid && (
                <span className="text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full text-[11px]">
                  Thu một phần (Còn nợ: {formatPrice(newRemainingDebt)})
                </span>
              )}
              {isOverpaid && (
                <span className="text-blue-800 bg-blue-100 px-2.5 py-0.5 rounded-full text-[11px]">
                  Trả dư / Trả trước (+{formatPrice(newTotalPaid - currentTotal)})
                </span>
              )}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Button variant="outline" type="button" onClick={onClose}>
              Hủy
            </Button>
            <Button
              variant="primary"
              type="submit"
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-700/20"
            >
              {isSubmitting ? 'Đang lưu...' : 'Xác nhận thu tiền'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

