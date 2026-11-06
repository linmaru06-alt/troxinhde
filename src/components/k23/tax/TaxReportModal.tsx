import React, { useState, useMemo } from 'react';
import {
  X,
  FileSpreadsheet,
  Receipt,
  Building2,
  DollarSign,
  Printer,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { formatPrice } from '../../ui/Cards';
import { TaxProfile, DEFAULT_TAX_PROFILE } from '../../../types/k23Tax';
import { Invoice } from '../../../types/k23';
import { calculateQuarterlyTax, generateTaxDeclarationText } from '../../../utils/k23TaxCalculator';

interface TaxReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoices?: Invoice[];
}

export const TaxReportModal: React.FC<TaxReportModalProps> = ({
  isOpen,
  onClose,
  invoices = [],
}) => {
  const [taxProfile, setTaxProfile] = useState<TaxProfile>(DEFAULT_TAX_PROFILE);
  const [selectedQuarter, setSelectedQuarter] = useState<1 | 2 | 3 | 4>(4);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isViewingFullReport, setIsViewingFullReport] = useState<boolean>(false);

  // Tính toán số liệu thuế
  const taxReport = useMemo(() => {
    return calculateQuarterlyTax(invoices, selectedQuarter, selectedYear, taxProfile);
  }, [invoices, selectedQuarter, selectedYear, taxProfile]);

  const declarationText = useMemo(() => {
    return generateTaxDeclarationText(taxReport, taxProfile);
  }, [taxReport, taxProfile]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(declarationText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Bang_Ke_Khai_Thue_Q${selectedQuarter}_${selectedYear}</title>
            <style>
              body { font-family: 'Times New Roman', serif; font-size: 13pt; line-height: 1.5; padding: 40px; }
              pre { white-space: pre-wrap; font-family: inherit; }
            </style>
          </head>
          <body>
            <pre>${declarationText}</pre>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-teal-500/30 text-teal-200 px-2.5 py-0.5 rounded-full border border-teal-400/30">
                  K23 PMS • P2-07 (Pro)
                </span>
                <span className="text-xs text-teal-200 font-bold">Thông Tư 40/2021/TT-BTC</span>
              </div>
              <h2 className="text-lg font-black text-white mt-1">
                Sổ Nhật Ký Kê Khai Thuế & Hóa Đơn VAT Cho Thuê Nhà
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
          {/* Thông tin Mã số thuế & Hộ kinh doanh */}
          <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <span className="text-[10px] font-bold text-teal-700 uppercase block">Mã số thuế (MST)</span>
              <span className="font-mono font-black text-slate-900 text-sm">{taxProfile.tax_code}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-teal-700 uppercase block">Tên hộ kinh doanh</span>
              <span className="font-bold text-slate-800">{taxProfile.business_name}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-teal-700 uppercase block">Chi cục thuế quản lý</span>
              <span className="font-bold text-slate-800">{taxProfile.tax_office}</span>
            </div>
          </div>

          {/* Chọn Quý kê khai */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-700">Chọn Kỳ Kê Khai:</span>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4].map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setSelectedQuarter(q as any)}
                    className={`px-3 py-1.5 rounded-xl font-bold transition text-xs cursor-pointer ${
                      selectedQuarter === q
                        ? 'bg-teal-700 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Quý {q}
                  </button>
                ))}
              </div>
            </div>
            <span className="text-slate-500 font-medium">Năm tính thuế: <strong>{selectedYear}</strong></span>
          </div>

          {/* 4 Thẻ chỉ số nghĩa vụ thuế */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Doanh thu tiền thuê</span>
              <span className="font-black text-slate-900 text-base block">
                {formatPrice(taxReport.gross_rental_revenue)}
              </span>
              <span className="text-[10px] text-emerald-600 font-medium mt-1 block">Chịu thuế 10%</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Thuế GTGT (5%)</span>
              <span className="font-black text-teal-700 text-base block">
                {formatPrice(taxReport.vat_amount)}
              </span>
              <span className="text-[10px] text-slate-400 mt-1 block">Giá trị gia tăng</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Thuế TNCN (5%)</span>
              <span className="font-black text-blue-700 text-base block">
                {formatPrice(taxReport.pit_amount)}
              </span>
              <span className="text-[10px] text-slate-400 mt-1 block">Thu nhập cá nhân</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-300">
              <span className="text-[10px] text-amber-800 font-bold block mb-0.5">Tổng thuế phải nộp</span>
              <span className="font-black text-amber-950 text-base block">
                {formatPrice(taxReport.total_tax_due)}
              </span>
              <span className="text-[10px] text-amber-700 font-bold mt-1 block">Vào ngân sách</span>
            </div>
          </div>

          {/* Khối hiển thị văn bản Tờ khai chuẩn mẫu 01/TTS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-black text-slate-900 flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-teal-600" />
                Mẫu Tờ Khai 01/TTS (Dùng nộp thuedientu.gdt.gov.vn)
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center gap-1 transition"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {isCopied ? 'Đã sao chép' : 'Sao chép'}
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-2.5 py-1 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-bold flex items-center gap-1 transition"
                >
                  <Printer className="w-3.5 h-3.5" /> In giấy A4
                </button>
              </div>
            </div>

            <div className="border border-slate-300 rounded-2xl p-4 bg-slate-900 text-white font-mono text-[11px] max-h-52 overflow-y-auto">
              <pre className="whitespace-pre-wrap leading-relaxed text-slate-300">
                {declarationText}
              </pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            Cơ sở pháp lý: Thông tư 40/2021/TT-BTC áp dụng cho hoạt động cho thuê nhà trọ.
          </span>
          <Button variant="outline" size="sm" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </div>
    </div>
  );
};

