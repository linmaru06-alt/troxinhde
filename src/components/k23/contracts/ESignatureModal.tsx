import React, { useRef, useState, useEffect } from 'react';
import {
  X,
  PenTool,
  CheckCircle2,
  RotateCcw,
  ShieldCheck,
  FileText,
  Printer,
  Copy,
  Check,
  Sparkles,
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { K23Contract } from '../../../types/k23Tenants';
import { generateContractHash, generateCT01Document } from '../../../utils/k23Ct01Generator';

interface ESignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract?: K23Contract | null;
  onSignedSuccess?: (hash: string, signatureDataUrl: string) => void;
}

export const ESignatureModal: React.FC<ESignatureModalProps> = ({
  isOpen,
  onClose,
  contract,
  onSignedSuccess,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [signedHash, setSignedHash] = useState<string | null>(null);
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [isShowingCT01, setIsShowingCT01] = useState(false);
  const [isCopiedCT01, setIsCopiedCT01] = useState(false);

  useEffect(() => {
    if (isOpen && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      setHasDrawn(false);
      setSignedHash(null);
      setSignatureUrl(null);
      setIsShowingCT01(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const defaultContract: K23Contract = contract || {
    id: 'ct_demo',
    contract_code: 'HD-2026-P302',
    owner_id: 'user_owner_1',
    room_id: 'room_1',
    tenant_id: 't_302',
    start_date: '2026-08-01',
    end_date: '2027-08-01',
    rent_amount: 4200000,
    deposit_amount: 4200000,
    payment_cycle_months: 1,
    payment_due_day: 5,
    status: 'active',
    room: { id: 'room_1', room_number: 'P.302', title: 'Phòng Studio', building_name: 'Tòa Nhà Xanh' },
    tenant: {
      id: 't_302',
      owner_id: 'user_owner_1',
      full_name: 'Nguyễn Văn An',
      phone: '0988 123 456',
      id_card_number: '001201012345',
      hometown: 'Thái Bình',
    },
  };

  const tenant = defaultContract.tenant;

  // Drawing Canvas Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleConfirmSign = () => {
    if (!hasDrawn || !canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    const nowIso = new Date().toISOString();
    const hash = generateContractHash(defaultContract.contract_code, tenant?.full_name || 'KhachThue', nowIso);

    setSignedHash(hash);
    setSignatureUrl(dataUrl);

    if (onSignedSuccess) {
      onSignedSuccess(hash, dataUrl);
    }
  };

  // Tạo nội dung CT01
  const ct01Text = generateCT01Document({
    fullName: tenant?.full_name || 'Nguyễn Văn An',
    dateOfBirth: '15/08/2003',
    gender: 'Nam',
    idCardNumber: tenant?.id_card_number || '001201012345',
    idCardDate: tenant?.id_card_date || '12/05/2021',
    idCardPlace: tenant?.id_card_place || 'Cục CS QLHC về TTXH',
    phone: tenant?.phone || '0988 123 456',
    permanentAddress: tenant?.hometown || 'Xã Đông Á, Huyện Đông Hưng, Tỉnh Thái Bình',
    temporaryAddress: `Phòng ${defaultContract.room?.room_number || 'P.302'}, ${defaultContract.room?.building_name || 'Tòa Nhà Xanh Trọ Xinh'}, Triều Khúc, Thanh Xuân, Hà Nội`,
    landlordName: 'Chủ Trọ Đối Tác K23',
    landlordPhone: '0912 345 678',
    leaseStartDate: defaultContract.start_date,
    leaseEndDate: defaultContract.end_date,
  });

  const handleCopyCT01 = () => {
    navigator.clipboard.writeText(ct01Text);
    setIsCopiedCT01(true);
    setTimeout(() => setIsCopiedCT01(false), 2000);
  };

  const handlePrintCT01 = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>To_Khai_Tam_Tru_CT01_${tenant?.full_name || 'Khach'}</title>
            <style>
              body { font-family: 'Times New Roman', serif; font-size: 14pt; line-height: 1.5; padding: 40px; }
              pre { white-space: pre-wrap; font-family: inherit; }
            </style>
          </head>
          <body>
            <pre>${ct01Text}</pre>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
              <PenTool className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/30 text-emerald-200 px-2.5 py-0.5 rounded-full border border-emerald-400/30">
                  K23 PMS • P2-05 (Pro)
                </span>
                <span className="text-xs text-emerald-200 font-bold">Chữ Ký Số SHA-256</span>
              </div>
              <h2 className="text-lg font-black text-white mt-1">
                Ký Hợp Đồng Điện Tử Cảm Ứng & Mẫu CT01
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
          {/* Thông tin HĐ */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
            <div>
              <span className="font-bold text-slate-800 text-sm block">
                {defaultContract.contract_code} • {defaultContract.room?.room_number}
              </span>
              <span className="text-slate-500 text-[11px]">
                Khách thuê: <strong>{tenant?.full_name}</strong> ({tenant?.phone})
              </span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 text-[10px] block">Thời hạn thuê</span>
              <span className="font-bold text-slate-700">
                {defaultContract.start_date} ➔ {defaultContract.end_date}
              </span>
            </div>
          </div>

          {!signedHash ? (
            /* Khối Bảng vẽ chữ ký Canvas */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="font-black text-slate-900 flex items-center gap-2">
                  <PenTool className="w-4 h-4 text-emerald-600" />
                  Ký tay trực tiếp vào ô bên dưới (Dùng chuột hoặc vuốt ngón tay):
                </label>
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-slate-400 hover:text-slate-700 font-bold flex items-center gap-1 text-[11px]"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Vẽ lại
                </button>
              </div>

              <div className="border-2 border-dashed border-slate-300 rounded-2xl overflow-hidden bg-slate-50/50 relative">
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={180}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-44 cursor-crosshair touch-none"
                />
                {!hasDrawn && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-slate-400 text-xs italic">
                    Ký tên của bạn tại đây...
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  variant="primary"
                  size="md"
                  disabled={!hasDrawn}
                  onClick={handleConfirmSign}
                  leftIcon={<CheckCircle2 className="w-4 h-4" />}
                >
                  Xác Nhận Ký Hợp Đồng Điện Tử
                </Button>
              </div>
            </div>
          ) : (
            /* Trạng thái sau khi ký thành công */
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 space-y-2">
                <div className="flex items-center gap-2 font-black text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ĐÃ KÝ ĐIỆN TỬ THÀNH CÔNG VÀ KHÓA TOÀN VẸN
                </div>
                <div className="space-y-1 text-[11px] font-mono text-emerald-800">
                  <p>Mã băm bảo mật: <strong>{signedHash}</strong></p>
                  <p>Thời điểm ký: {new Date().toLocaleString('vi-VN')}</p>
                </div>
              </div>

              {signatureUrl && (
                <div className="p-3 rounded-2xl border border-slate-200 bg-white flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Chữ ký số đã lưu vết:</span>
                  <img src={signatureUrl} alt="Chữ ký" className="h-12 border rounded-lg bg-slate-50 p-1" />
                </div>
              )}

              {/* Nút bật Mẫu CT01 */}
              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="font-black text-indigo-950 block">Mẫu Tờ Khai Tạm Trú CT01 (Bộ Công An)</span>
                  <span className="text-[11px] text-indigo-700">Tự động điền sẵn CCCD, quê quán & địa chỉ trọ để nộp công an</span>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsShowingCT01(!isShowingCT01)}
                  leftIcon={<FileText className="w-4 h-4" />}
                >
                  {isShowingCT01 ? 'Ẩn Tờ Khai' : 'Xem Mẫu CT01 Điền Sẵn'}
                </Button>
              </div>

              {/* Văn bản CT01 hiển thị */}
              {isShowingCT01 && (
                <div className="space-y-2 border border-slate-200 rounded-2xl p-4 bg-slate-900 text-white font-mono text-[11px]">
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <span className="text-amber-400 font-bold">Biểu Mẫu CT01 Điền Sẵn (TT 66/2023/TT-BCA)</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleCopyCT01}
                        className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center gap-1 transition"
                      >
                        {isCopiedCT01 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {isCopiedCT01 ? 'Đã sao chép' : 'Sao chép'}
                      </button>
                      <button
                        type="button"
                        onClick={handlePrintCT01}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 transition font-bold"
                      >
                        <Printer className="w-3.5 h-3.5" /> In giấy A4
                      </button>
                    </div>
                  </div>
                  <pre className="whitespace-pre-wrap leading-relaxed text-slate-300 max-h-56 overflow-y-auto">
                    {ct01Text}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </div>
    </div>
  );
};

