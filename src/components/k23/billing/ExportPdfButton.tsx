import React, { useState } from 'react';
import { FileDown, Printer, Loader2, Check } from 'lucide-react';
import { exportInvoiceToPdf, printInvoiceDirect } from '../../../utils/k23PdfExporter';

interface ExportPdfButtonProps {
  targetRef: React.RefObject<HTMLElement>;
  invoiceCode: string;
  roomTitle?: string;
  className?: string;
}

export const ExportPdfButton: React.FC<ExportPdfButtonProps> = ({
  targetRef,
  invoiceCode,
  roomTitle = 'phong',
  className = '',
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleExportPdf = async () => {
    if (!targetRef.current) return;
    setIsExporting(true);

    const safeTitle = roomTitle.replace(/\s+/g, '-');
    const fileName = `Hoa-Don-${safeTitle}-${invoiceCode}.pdf`;

    const ok = await exportInvoiceToPdf(targetRef.current, fileName, {
      format: 'a4',
      orientation: 'portrait',
      marginMm: 8,
    });

    setIsExporting(false);
    if (ok) {
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 2500);
    }
  };

  const handlePrint = () => {
    if (!targetRef.current) return;
    printInvoiceDirect(targetRef.current);
  };

  return (
    <div className={`inline-flex items-center rounded-xl bg-white border border-slate-200 shadow-sm p-1 gap-1 ${className}`}>
      <button
        type="button"
        disabled={isExporting}
        onClick={handleExportPdf}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:text-emerald-700 hover:bg-emerald-50 transition-colors disabled:opacity-50"
        title="Tải tệp PDF tiếng Việt có dấu chuẩn đẹp"
      >
        {isExporting ? (
          <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
        ) : isSuccess ? (
          <Check className="w-4 h-4 text-emerald-600" />
        ) : (
          <FileDown className="w-4 h-4 text-rose-600" />
        )}
        <span>{isExporting ? 'Đang xuất PDF...' : isSuccess ? 'Đã tải PDF' : 'Xuất PDF'}</span>
      </button>

      <div className="w-px h-4 bg-slate-200" />

      <button
        type="button"
        onClick={handlePrint}
        className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
        title="In biên lai trực tiếp ra máy in"
      >
        <Printer className="w-4 h-4" />
      </button>
    </div>
  );
};

