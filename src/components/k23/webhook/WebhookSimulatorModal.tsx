import React, { useState } from 'react';
import {
  X,
  Zap,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Building2,
  Radio,
  Sparkles,
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { formatPrice } from '../../ui/Cards';
import { Invoice } from '../../../types/k23';
import { processBankPaymentWebhook, BankWebhookPayload } from '../../../lib/api/k23Webhook';

interface WebhookSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoices: Invoice[];
  onSuccess: (updatedInvoiceId: string) => void;
}

export const WebhookSimulatorModal: React.FC<WebhookSimulatorModalProps> = ({
  isOpen,
  onClose,
  invoices,
  onSuccess,
}) => {
  const unpaidInvoices = invoices.filter((i) => i.status !== 'paid');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>(unpaidInvoices[0]?.id || '');
  const [gateway, setGateway] = useState<'SePay' | 'Casso'>('SePay');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [resultMsg, setResultMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const selectedInv = invoices.find((i) => i.id === selectedInvoiceId);
  const remaining = selectedInv ? Math.max(0, selectedInv.total_amount - selectedInv.paid_amount) : 0;

  const handleSimulateWebhook = async () => {
    if (!selectedInv) return;

    setIsProcessing(true);
    setResultMsg(null);

    // Giả lập thời gian truyền Webhook 1.5 giây
    setTimeout(async () => {
      const payload: BankWebhookPayload = {
        gateway,
        accountNumber: '0912345678',
        transferAmount: remaining,
        content: `TROXINH ${selectedInv.invoice_code} MBBank`,
        referenceCode: `FT${Date.now()}`,
      };

      const res = await processBankPaymentWebhook(payload, invoices);
      setIsProcessing(false);

      if (res.success) {
        setResultMsg(res.message);
        onSuccess(selectedInv.id);
      } else {
        setResultMsg(res.message || 'Lỗi đối soát');
      }
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/20">
              <Zap className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Mô Phỏng Đối Soát SePay / Casso</h3>
              <p className="text-xs text-blue-200">
                P1-06 • Tự động nhận biến động số dư & gạch nợ trong 3 giây
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

        {/* Nội dung */}
        <div className="p-6 space-y-5">
          {unpaidInvoices.length === 0 ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <p className="font-bold text-sm text-slate-800">Tất cả hóa đơn đã được thanh toán đủ!</p>
            </div>
          ) : (
            <>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Chọn hóa đơn cần giả lập khách chuyển khoản
                </label>
                <select
                  value={selectedInvoiceId}
                  onChange={(e) => setSelectedInvoiceId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-800 bg-white"
                >
                  {unpaidInvoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      #{inv.invoice_code} — {inv.room?.room_number || 'Phòng'} ({inv.tenant?.full_name || 'Khách'}) — Nợ: {formatPrice(inv.total_amount - inv.paid_amount)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Thông tin giao dịch giả lập */}
              {selectedInv && (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Cổng thanh toán:</span>
                    <span className="font-bold text-blue-700">SePay Webhook (Ngân hàng quân đội MB)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Số tiền khách chuyển:</span>
                    <span className="font-bold text-emerald-700 font-mono text-sm">{formatPrice(remaining)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Nội dung chuyển khoản:</span>
                    <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border">
                      TROXINH {selectedInv.invoice_code}
                    </span>
                  </div>
                </div>
              )}

              {/* Kết quả sau khi chạy */}
              {resultMsg && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{resultMsg}</span>
                </div>
              )}

              <Button
                variant="primary"
                onClick={handleSimulateWebhook}
                disabled={isProcessing}
                className="w-full bg-blue-600 hover:bg-blue-700 font-bold py-3 text-xs shadow-md shadow-blue-600/20"
              >
                {isProcessing ? 'Đang nhận diện biến động số dư (3s)...' : 'Bấm để giả lập khách chuyển tiền ngay'}
              </Button>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <Button variant="outline" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </div>
    </div>
  );
};

