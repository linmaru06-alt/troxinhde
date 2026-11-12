import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  WALLET_TOPUP_PACKS,
  WalletTopupMethod,
  WalletTopupOrder,
} from '../../lib/api/k23Wallet';
import { TopupWizardStep } from '../../hooks/useWalletTopup';
import { User } from '../../types';
import { Button } from '../ui/Button';
import { formatCurrency } from '../ui/Cards';
import {
  Coins,
  QrCode,
  Wallet,
  Check,
  Copy,
  Download,
  Clock,
  RefreshCw,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  Sparkles,
  ExternalLink,
  Building2,
} from 'lucide-react';

interface TopupStepperWizardProps {
  currentUser: User | null;
  isDemoAccount: boolean;
  balanceTotalXu: number;
  step: TopupWizardStep;
  setStep: (
    step: TopupWizardStep,
    options?: { replace?: boolean; orderCode?: string | null }
  ) => void;
  onBackToOverview: () => void;
  selectedPackIndex: number;
  selectPack: (idx: number) => void;
  customXuInput: string;
  handleCustomXuChange: (val: string) => void;
  numericCustomXu: number;
  amountVnd: number;
  preview: { realXu: number; bonusXu: number; totalXu: number; bonusPercent: number };
  isAmountValid: boolean;
  method: WalletTopupMethod;
  setMethod: (m: WalletTopupMethod) => void;
  activeOrder: WalletTopupOrder | null;
  isHydratingOrder?: boolean;
  orderError: string | null;
  countdownText: string;
  isCreatingOrder: boolean;
  createOrder: () => void;
  isCheckingStatus: boolean;
  recheckStatus: () => void;
  isConfirmingDemo: boolean;
  confirmDemoTopup: () => void;
  resetWizard: () => void;
  onShowToast: (title: string, desc?: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
}

export const TopupStepperWizard: React.FC<TopupStepperWizardProps> = ({
  currentUser,
  isDemoAccount,
  balanceTotalXu,
  step,
  setStep,
  onBackToOverview,
  selectedPackIndex,
  selectPack,
  customXuInput,
  handleCustomXuChange,
  numericCustomXu,
  amountVnd,
  preview,
  isAmountValid,
  method,
  setMethod,
  activeOrder,
  isHydratingOrder = false,
  orderError,
  countdownText,
  isCreatingOrder,
  createOrder,
  isCheckingStatus,
  recheckStatus,
  isConfirmingDemo,
  confirmDemoTopup,
  resetWizard,
  onShowToast,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isDownloadingQr, setIsDownloadingQr] = useState<boolean>(false);

  const isLandlord = currentUser?.role === 'owner';

  const handleCopy = (text: string, fieldKey: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    onShowToast(`Đã sao chép ${label}`, text, 'info');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleDownloadQr = async () => {
    if (!activeOrder?.qrCode) return;
    setIsDownloadingQr(true);
    try {
      const response = await fetch(activeOrder.qrCode);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `TroXinh-${activeOrder.orderCode}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      onShowToast('Đã tải mã QR về máy', 'Bạn có thể mở ảnh trong app ngân hàng để quét.', 'success');
    } catch {
      window.open(activeOrder.qrCode, '_blank', 'noopener,noreferrer');
    } finally {
      setIsDownloadingQr(false);
    }
  };

  const handleGoStep2 = () => {
    if (!currentUser) {
      const returnUrl = encodeURIComponent(location.pathname + location.search);
      navigate(`/dang-nhap?returnUrl=${returnUrl}`);
      return;
    }
    if (!isAmountValid) {
      onShowToast(
        'Số Xu chưa hợp lệ',
        'Vui lòng chọn gói hoặc nhập tối thiểu 10 Xu (10.000đ) và tối đa 50.000 Xu.',
        'warning'
      );
      return;
    }
    setStep(2);
  };

  const numericStep = step === 'success' || step === 'expired' ? 3 : step === 'overview' ? 1 : step;

  const mobileBackHandler = () => {
    if (step === 2) {
      setStep(1);
    } else if (step === 3) {
      setStep(2);
    } else {
      onBackToOverview();
    }
  };

  const mobileHeaderTitle =
    step === 1
      ? 'Chọn gói nạp Xu'
      : step === 2
        ? 'Phương thức thanh toán'
        : step === 3
          ? 'Quét mã QR thanh toán'
          : step === 'success'
            ? 'Nạp Xu thành công'
            : 'Đơn nạp hết hạn';

  return (
    <div className="sm:space-y-4">
      {/* Mobile App Sticky Top Bar (< 640px) */}
      <div className="sm:hidden sticky top-14 z-30 bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-2xs">
        <div className="flex items-center justify-between gap-2 px-3 py-2.5">
          <button
            type="button"
            onClick={mobileBackHandler}
            aria-label="Quay lại"
            className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-800 active:scale-95 transition cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="min-w-0 text-center flex-1">
            <h2 className="text-sm font-black text-gray-950 truncate">{mobileHeaderTitle}</h2>
            <p className="text-[10.5px] font-bold text-gray-500">
              {step === 1 && 'Bước 1/3 • 1 Xu = 1.000đ'}
              {step === 2 && 'Bước 2/3 • Chọn cổng thanh toán'}
              {step === 3 && `Bước 3/3 • ${countdownText}`}
              {step === 'success' && 'Đã đối soát hoàn tất'}
              {step === 'expired' && 'Vui lòng tạo mã mới'}
            </p>
          </div>

          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-[#006d37] text-[11px] font-black border border-emerald-200 shrink-0">
            <Coins className="w-3 h-3" />
            {balanceTotalXu.toLocaleString('vi-VN')}
          </span>
        </div>

        {/* Thanh tiến độ 3 vạch kiểu Mobile App */}
        <div className="grid grid-cols-3 gap-1 px-3 pb-2">
          {[1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`h-1 rounded-full transition-all ${
                step === 'success' || numericStep >= idx ? 'bg-[#00a854]' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Thanh điều hướng quay về Tổng quan Ví Xu (Desktop >= 640px) */}
      <div className="hidden sm:flex items-center justify-between">
        <button
          type="button"
          onClick={onBackToOverview}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-gray-100 border border-gray-200 text-xs font-bold text-gray-700 shadow-2xs transition cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Quay về Ví Xu</span>
        </button>

        <span className="text-xs font-bold text-gray-400">
          {step === 1 && 'Bước 1 / 3'}
          {step === 2 && 'Bước 2 / 3'}
          {step === 3 && 'Bước 3 / 3'}
          {step === 'success' && 'Hoàn tất'}
          {step === 'expired' && 'Hết hạn'}
        </span>
      </div>

      <div className="bg-white sm:rounded-3xl sm:border sm:border-gray-200 sm:shadow-sm px-4 py-5 sm:p-8 space-y-5 sm:space-y-6">
        {/* Header & Thanh Stepper 3 Bước (Desktop >= 640px) */}
        <div className="hidden sm:flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-gray-100">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg sm:text-xl font-black text-gray-950 flex items-center gap-2">
              <QrCode className="w-5 h-5 text-[#00a854]" />
              Nạp Xu Vào Ví
            </h2>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#006d37] text-xs font-bold border border-emerald-200">
              <Coins className="w-3.5 h-3.5" />
              Số dư: {balanceTotalXu.toLocaleString('vi-VN')} Xu
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Quy đổi <strong>1 Xu = 1.000 VNĐ</strong> • Tự động cộng Xu trong 1–3 phút sau khi chuyển khoản
          </p>
        </div>

        {/* Stepper 1 -> 2 -> 3 */}
        <div className="flex items-center gap-2 sm:gap-3 text-xs self-start md:self-auto">
          {[
            { num: 1, label: 'Chọn gói' },
            { num: 2, label: 'Phương thức' },
            { num: 3, label: 'Quét QR' },
          ].map((item, idx) => {
            const isCompleted = step === 'success' || numericStep > item.num;
            const isCurrent = step !== 'success' && numericStep === item.num;
            return (
              <React.Fragment key={item.num}>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-[11px] transition ${
                      isCompleted
                        ? 'bg-[#00a854] text-white'
                        : isCurrent
                          ? 'bg-emerald-100 text-[#006d37] ring-2 ring-[#00a854]'
                          : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {isCompleted ? <Check className="w-3.5 h-3.5" /> : item.num}
                  </span>
                  <span
                    className={`font-bold ${
                      isCurrent || isCompleted ? 'text-gray-900' : 'text-gray-400'
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
                {idx < 2 && <div className="w-4 sm:w-6 h-px bg-gray-200" />}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ================= BƯỚC 1: CHỌN GÓI NẠP / NHẬP XU TÙY Ý ================= */}
      {step === 1 && (
        <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn">
          <div className="space-y-3">
            <label className="text-xs font-extrabold text-gray-900 uppercase tracking-wide block">
              Chọn gói nạp nhanh
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3.5 pt-2">
              {WALLET_TOPUP_PACKS.map((pack, idx) => {
                const isSelected = selectedPackIndex === idx;
                return (
                  <button
                    key={pack.vnd}
                    type="button"
                    onClick={() => selectPack(idx)}
                    className={`min-h-[86px] px-2.5 py-3.5 sm:p-4 rounded-2xl border-2 text-center transition cursor-pointer relative active:scale-[0.98] touch-manipulation ${
                      isSelected
                        ? 'border-[#00a854] bg-emerald-50/70 shadow-sm ring-2 ring-emerald-500/15'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    {pack.badge && (
                      <span
                        className={`absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9.5px] sm:text-[10px] font-black px-2 sm:px-2.5 py-0.5 rounded-full shadow-2xs ${
                          pack.popular
                            ? 'bg-emerald-100 text-[#006d37] border border-emerald-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}
                      >
                        {pack.badge}
                      </span>
                    )}

                    <span className="text-sm sm:text-lg font-black text-gray-950 block mt-1">
                      {pack.vnd.toLocaleString('vi-VN')} đ
                    </span>
                    <span
                      className={`text-xs sm:text-sm font-black block mt-0.5 ${
                        isSelected ? 'text-[#006d37]' : 'text-gray-700'
                      }`}
                    >
                      {pack.totalXu.toLocaleString('vi-VN')} Xu
                    </span>
                    {pack.bonusXu > 0 && (
                      <span className="text-[10px] sm:text-[11px] text-amber-700 font-semibold block mt-0.5 leading-tight">
                        ({pack.realXu.toLocaleString('vi-VN')} gốc + {pack.bonusXu} thưởng)
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ô nhập số Xu tùy ý (16px font trên mobile để tránh iOS tự zoom) */}
          <div className="space-y-2.5">
            <label
              htmlFor="wallet-custom-xu"
              className="text-xs font-extrabold text-gray-900 uppercase tracking-wide block"
            >
              Hoặc nhập số Xu tùy ý (tối thiểu 10 Xu)
            </label>

            <div className="relative">
              <Coins className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="wallet-custom-xu"
                type="text"
                inputMode="numeric"
                value={customXuInput}
                onChange={(e) => handleCustomXuChange(e.target.value)}
                placeholder="Nhập số Xu (VD: 500)"
                className="w-full pl-10 pr-16 py-3 bg-gray-50 border border-gray-300 rounded-2xl text-base sm:text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#00a854] focus:bg-white transition"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-gray-500">
                XU
              </span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <span className="text-gray-500 font-medium">
                1 Xu = 1.000 VND • Thanh toán:{' '}
                <strong className="text-gray-900">{formatCurrency(amountVnd)}</strong>
              </span>

              {isAmountValid ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 font-medium">
                  <Info className="w-3.5 h-3.5 text-[#00a854] shrink-0" />
                  <span>
                    Bạn sẽ nhận:{' '}
                    <strong className="text-[#006d37]">
                      {preview.totalXu.toLocaleString('vi-VN')} Xu
                    </strong>{' '}
                    (gồm <strong>{preview.realXu.toLocaleString('vi-VN')} Xu thật</strong>
                    {preview.bonusXu > 0 && (
                      <>
                        {' '}
                        và <strong className="text-amber-700">{preview.bonusXu} Xu thưởng</strong>
                      </>
                    )}
                    )
                  </span>
                </div>
              ) : (
                <span className="text-rose-600 font-semibold">
                  Nhập từ 10 Xu (10.000đ) đến 50.000 Xu (50.000.000đ)
                </span>
              )}
            </div>
          </div>

          <div className="hidden sm:block">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              disabled={!isAmountValid && Boolean(currentUser)}
              onClick={handleGoStep2}
              rightIcon={<ArrowRight className="w-4 h-4" />}
              className="font-black text-sm shadow-sm cursor-pointer"
            >
              {currentUser
                ? `Tiếp tục (${formatCurrency(amountVnd)})`
                : 'Đăng nhập để tiếp tục nạp Xu'}
            </Button>
          </div>

          {/* Mobile Sticky Bottom CTA Dock (< 640px) */}
          <div
            className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 px-4 pt-2.5 shadow-[0_-8px_24px_rgba(0,0,0,0.08)]"
            style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
          >
            <div className="flex items-center justify-between gap-3 mb-2 text-xs">
              <span className="text-gray-500 font-medium">
                Nhận:{' '}
                <strong className="text-[#006d37]">
                  {isAmountValid ? `${preview.totalXu.toLocaleString('vi-VN')} Xu` : '—'}
                </strong>
              </span>
              <span className="font-black text-gray-950">{formatCurrency(amountVnd)}</span>
            </div>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              disabled={!isAmountValid && Boolean(currentUser)}
              onClick={handleGoStep2}
              rightIcon={<ArrowRight className="w-4 h-4" />}
              className="font-black text-sm shadow-sm cursor-pointer min-h-[48px]"
            >
              {currentUser ? 'Tiếp tục' : 'Đăng nhập để nạp Xu'}
            </Button>
          </div>
        </div>
      )}

      {/* ================= BƯỚC 2: CHỌN PHƯƠNG THỨC THANH TOÁN ================= */}
      {step === 2 && (
        <div className="max-w-2xl mx-auto space-y-6 animate-fadeIn">
          {/* Tóm tắt đơn hàng (dùng icon Ví tiền thay icon dấu nhân) */}
          <div className="flex items-center justify-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs sm:text-sm text-gray-800">
              <Coins className="w-4 h-4 text-[#00a854] shrink-0" />
              <span>
                Nạp <strong>{formatCurrency(amountVnd)}</strong> — nhận{' '}
                <strong className="text-[#006d37]">
                  {preview.totalXu.toLocaleString('vi-VN')} Xu
                </strong>
                {preview.bonusXu > 0 && (
                  <span className="text-amber-700 font-semibold">
                    {' '}
                    ({preview.realXu} gốc + {preview.bonusXu} thưởng)
                  </span>
                )}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-extrabold text-gray-900 uppercase tracking-wide block">
              Chọn phương thức thanh toán
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* VietQR */}
              <button
                type="button"
                onClick={() => setMethod('vietqr')}
                className={`p-5 rounded-2xl border-2 text-left transition relative cursor-pointer flex items-start gap-3.5 ${
                  method === 'vietqr'
                    ? 'border-[#00a854] bg-emerald-50/50 shadow-sm ring-2 ring-emerald-500/15'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                {method === 'vietqr' && (
                  <span className="absolute -top-2.5 -right-2.5 w-6 h-6 rounded-full bg-[#00a854] text-white flex items-center justify-center shadow-sm">
                    <Check className="w-3.5 h-3.5" />
                  </span>
                )}
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                    method === 'vietqr'
                      ? 'bg-emerald-100 text-[#006d37]'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  <QrCode className="w-6 h-6" />
                </div>
                <div>
                  <span className="font-black text-base text-gray-950 block">VietQR</span>
                  <span className="text-xs text-gray-500 mt-0.5 block leading-relaxed">
                    Chuyển khoản mọi ngân hàng VN qua mã QR tự động 24/7
                  </span>
                </div>
              </button>

              {/* MoMo */}
              <button
                type="button"
                onClick={() => setMethod('momo')}
                className={`p-5 rounded-2xl border-2 text-left transition relative cursor-pointer flex items-start gap-3.5 ${
                  method === 'momo'
                    ? 'border-[#A50064] bg-pink-50/40 shadow-sm ring-2 ring-pink-500/15'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                {method === 'momo' && (
                  <span className="absolute -top-2.5 -right-2.5 w-6 h-6 rounded-full bg-[#A50064] text-white flex items-center justify-center shadow-sm">
                    <Check className="w-3.5 h-3.5" />
                  </span>
                )}
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                    method === 'momo'
                      ? 'bg-pink-100 text-[#A50064]'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  <Wallet className="w-6 h-6" />
                </div>
                <div>
                  <span className="font-black text-base text-gray-950 block">MoMo</span>
                  <span className="text-xs text-gray-500 mt-0.5 block leading-relaxed">
                    Ví MoMo, thanh toán nhanh qua App hoặc quét mã QR Napas
                  </span>
                </div>
              </button>
            </div>
          </div>

          {orderError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <strong className="block">Không thể khởi tạo đơn nạp Xu</strong>
                <span>{orderError}</span>
              </div>
            </div>
          )}

          <div className="hidden sm:block space-y-3 pt-1">
            <Button
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isCreatingOrder}
              onClick={createOrder}
              rightIcon={<ArrowRight className="w-4 h-4" />}
              className="font-black text-sm shadow-sm cursor-pointer"
            >
              {isCreatingOrder ? 'Đang tạo mã QR thanh toán...' : 'Tiếp tục tạo mã thanh toán'}
            </Button>

            <div className="text-center">
              <button
                type="button"
                disabled={isCreatingOrder}
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-gray-800 underline cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Quay lại chọn gói khác
              </button>
            </div>
          </div>

          {/* Mobile Sticky Bottom CTA Dock cho Bước 2 (< 640px) */}
          <div
            className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 px-4 pt-3 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] flex items-center gap-2.5"
            style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
          >
            <button
              type="button"
              disabled={isCreatingOrder}
              onClick={() => setStep(1)}
              className="min-h-[48px] px-4 rounded-xl border border-gray-300 bg-white text-xs font-bold text-gray-700 active:scale-95 transition cursor-pointer shrink-0"
            >
              Quay lại
            </button>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isCreatingOrder}
              onClick={createOrder}
              rightIcon={<ArrowRight className="w-4 h-4" />}
              className="font-black text-sm shadow-sm cursor-pointer min-h-[48px]"
            >
              {isCreatingOrder ? 'Đang tạo mã QR...' : 'Tạo mã thanh toán'}
            </Button>
          </div>
        </div>
      )}

      {/* ================= TRẠNG THÁI ĐANG KHÔI PHỤC ĐƠN KHI F5 ================= */}
      {step === 3 && !activeOrder && (
        <div className="max-w-lg mx-auto py-8 text-center space-y-4">
          {isHydratingOrder ? (
            <>
              <RefreshCw className="w-8 h-8 text-[#00a854] animate-spin mx-auto" />
              <p className="text-sm font-bold text-gray-700">Đang tải thông tin mã thanh toán...</p>
            </>
          ) : (
            <>
              <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
              <p className="text-sm font-bold text-gray-800">
                {orderError || 'Không tìm thấy thông tin đơn thanh toán.'}
              </p>
              <Button variant="primary" size="md" onClick={resetWizard} className="font-bold cursor-pointer">
                Chọn gói nạp mới
              </Button>
            </>
          )}
        </div>
      )}

      {/* ================= BƯỚC 3: QUÉT MÃ QR THANH TOÁN & ĐỐI SOÁT ================= */}
      {step === 3 && activeOrder && (
        <div className="max-w-lg mx-auto space-y-5 animate-fadeIn">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500">
              <span>{activeOrder.method === 'momo' ? 'Ví MoMo' : 'VietQR Ngân hàng'}</span>
              <span>•</span>
              <span>Mã đơn #{activeOrder.orderCode}</span>
            </div>

            {/* Thanh đếm ngược đưa lên đầu trang trên Mobile (< 640px) */}
            <div className="sm:hidden px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold flex items-center justify-center gap-2">
              <Clock className="w-4 h-4 text-amber-600 animate-pulse shrink-0" />
              <span>Đang chờ thanh toán • Còn {countdownText}</span>
            </div>
          </div>

          {/* Khung QR */}
          <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-gray-50 border border-gray-200 flex flex-col items-center text-center space-y-3">
            <span className="text-sm font-black text-gray-900">Quét mã để thanh toán</span>

            <div className="w-48 h-48 sm:w-52 sm:h-52 bg-white p-2.5 rounded-2xl shadow-md border border-gray-200 flex items-center justify-center">
              <img
                src={activeOrder.qrCode}
                alt={`QR thanh toán ${activeOrder.orderCode}`}
                className="w-full h-full object-contain"
              />
            </div>

            <p className="sm:hidden text-[11px] text-gray-500">
              Mẹo: Chạm nút <strong>Tải mã QR</strong> hoặc nhấn giữ ảnh QR để lưu vào Thư viện ảnh
            </p>

            <div>
              <div className="text-2xl font-black text-[#006d37]">
                {formatCurrency(activeOrder.amountVnd)}
              </div>
              <div className="text-xs text-gray-600 mt-0.5">
                Bạn sẽ nhận:{' '}
                <strong className="text-[#006d37]">
                  {activeOrder.totalXu.toLocaleString('vi-VN')} Xu
                </strong>
                {activeOrder.bonusXu > 0 && (
                  <span className="text-amber-700 font-medium">
                    {' '}
                    ({activeOrder.realXu} thật + {activeOrder.bonusXu} thưởng)
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-1 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleDownloadQr}
                disabled={isDownloadingQr}
                className="flex-1 sm:flex-initial min-h-[42px] px-3.5 py-2 rounded-xl bg-white hover:bg-gray-100 border border-gray-300 text-xs font-bold text-gray-800 inline-flex items-center justify-center gap-1.5 cursor-pointer transition active:scale-95"
              >
                <Download className="w-3.5 h-3.5 text-[#006d37]" />
                <span>{isDownloadingQr ? 'Đang tải...' : 'Tải mã QR'}</span>
              </button>

              {activeOrder.deeplink && (
                <a
                  href={activeOrder.deeplink}
                  className="flex-1 sm:flex-initial min-h-[42px] px-3.5 py-2 rounded-xl bg-[#A50064] hover:bg-[#8a0053] text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 transition active:scale-95"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Mở App MoMo</span>
                </a>
              )}
            </div>
          </div>

          {/* Chi tiết chuyển khoản đầy đủ + Nút Copy từng trường */}
          <div className="bg-white rounded-2xl border border-gray-200 p-4 space-y-2.5 text-xs">
            <h4 className="font-black text-sm text-gray-900 pb-2 border-b border-gray-100">
              Chi tiết chuyển khoản
            </h4>

            <div className="flex items-center justify-between gap-2">
              <span className="text-gray-500">Ngân hàng / Kênh nhận</span>
              <span className="font-bold text-gray-900 text-right">
                {activeOrder.receiverInfo.bankName}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-gray-500">{activeOrder.receiverInfo.accountNumberLabel}</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-black text-gray-900">
                  {activeOrder.receiverInfo.accountNumber}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    handleCopy(
                      activeOrder.receiverInfo.accountNumber,
                      'account',
                      activeOrder.receiverInfo.accountNumberLabel.toLowerCase()
                    )
                  }
                  className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-900 cursor-pointer"
                  title="Sao chép số tài khoản"
                >
                  {copiedField === 'account' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-gray-500">Chủ tài khoản</span>
              <span className="font-bold text-gray-900 text-right">
                {activeOrder.receiverInfo.accountName}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-gray-500">Số tiền chính xác</span>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-[#006d37]">
                  {formatCurrency(activeOrder.amountVnd)}
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(String(activeOrder.amountVnd), 'amount', 'số tiền')}
                  className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-900 cursor-pointer"
                  title="Sao chép số tiền"
                >
                  {copiedField === 'amount' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
              <span className="text-gray-500">Nội dung chuyển khoản</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-black text-xs text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
                  {activeOrder.transferContent}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    handleCopy(activeOrder.transferContent, 'content', 'nội dung chuyển khoản')
                  }
                  className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 cursor-pointer"
                  title="Sao chép nội dung chuyển khoản"
                >
                  {copiedField === 'content' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Trạng thái chờ & đếm ngược (Desktop >= 640px) */}
          <div className="hidden sm:flex px-4 py-2.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold items-center justify-center gap-2">
            <Clock className="w-4 h-4 text-amber-600 animate-pulse shrink-0" />
            <span>Đang chờ thanh toán • Hết hạn sau {countdownText}</span>
          </div>

          {orderError && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{orderError}</span>
            </div>
          )}

          {/* Chế độ Demo Sandbox: CHỈ hiển thị cho tài khoản Demo */}
          {(isDemoAccount || activeOrder.isSandbox) && (
            <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-300 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  Môi trường Demo Sandbox
                </span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-200 text-amber-950">
                  Sandbox
                </span>
              </div>
              <p className="text-[11px] text-amber-900">
                Bạn đang dùng tài khoản Demo. Bấm nút dưới để kiểm thử luồng Webhook cộng{' '}
                <strong>+{activeOrder.totalXu} Xu</strong> mà không cần chuyển tiền thật.
              </p>
              <Button
                variant="primary"
                size="sm"
                fullWidth
                isLoading={isConfirmingDemo}
                onClick={confirmDemoTopup}
                className="bg-amber-500 hover:bg-amber-600 text-amber-950 font-black cursor-pointer"
              >
                {isConfirmingDemo
                  ? 'Đang giả lập Webhook...'
                  : `Xác nhận nạp Demo Sandbox (+${activeOrder.totalXu} Xu)`}
              </Button>
            </div>
          )}

          <div className="space-y-3">
            <div className="hidden sm:block">
              <Button
                variant="primary"
                size="lg"
                fullWidth
                isLoading={isCheckingStatus}
                onClick={recheckStatus}
                leftIcon={<RefreshCw className={`w-4 h-4 ${isCheckingStatus ? 'animate-spin' : ''}`} />}
                className="font-black text-sm shadow-sm cursor-pointer"
              >
                {isCheckingStatus ? 'Đang kiểm tra giao dịch...' : 'Kiểm tra lại trạng thái'}
              </Button>
            </div>

            <div className="flex items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="inline-flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-gray-800 underline cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Quay lại
              </button>
              <span className="text-gray-300">•</span>
              <button
                type="button"
                onClick={resetWizard}
                className="inline-flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-gray-800 underline cursor-pointer"
              >
                Đổi gói nạp khác
              </button>
            </div>

            <p className="text-[11px] text-gray-500 text-center flex items-center justify-center gap-1">
              <Info className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              <span>Hệ thống tự động cộng Xu sau khi nhận được tiền, thường trong 1–3 phút.</span>
            </p>
          </div>

          {/* Mobile Sticky Bottom CTA Dock cho Bước 3 (< 640px) */}
          <div
            className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-gray-200 px-4 pt-3 shadow-[0_-8px_24px_rgba(0,0,0,0.08)]"
            style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
          >
            <Button
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isCheckingStatus}
              onClick={recheckStatus}
              leftIcon={<RefreshCw className={`w-4 h-4 ${isCheckingStatus ? 'animate-spin' : ''}`} />}
              className="font-black text-sm shadow-sm cursor-pointer min-h-[48px]"
            >
              {isCheckingStatus ? 'Đang kiểm tra...' : 'Kiểm tra lại trạng thái'}
            </Button>
          </div>
        </div>
      )}

      {/* ================= HOÀN TẤT NẠP XU ================= */}
      {step === 'success' && activeOrder && (
        <div className="max-w-lg mx-auto py-4 text-center space-y-5 animate-fadeIn">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-[#006d37] flex items-center justify-center mx-auto shadow-sm">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-1">
            <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-emerald-50 text-[#006d37] text-xs font-black">
              NẠP XU THÀNH CÔNG
            </span>
            <h3 className="text-2xl font-black text-gray-950">
              +{activeOrder.totalXu.toLocaleString('vi-VN')} Xu đã vào ví!
            </h3>
            <p className="text-xs text-gray-500">
              Mã đơn <strong>#{activeOrder.orderCode}</strong> đã được đối soát thành công.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 text-left text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">Số tiền đã nạp:</span>
              <span className="font-bold text-gray-900">{formatCurrency(activeOrder.amountVnd)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Xu thật cộng thêm:</span>
              <span className="font-bold text-[#006d37]">+{activeOrder.realXu} Xu</span>
            </div>
            {activeOrder.bonusXu > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">Xu thưởng ưu đãi:</span>
                <span className="font-bold text-amber-700">+{activeOrder.bonusXu} Xu</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-gray-200">
              <span className="font-bold text-gray-900">Số dư ví hiện tại:</span>
              <span className="font-black text-base text-[#006d37]">
                {balanceTotalXu.toLocaleString('vi-VN')} Xu
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="primary"
              size="md"
              fullWidth
              onClick={onBackToOverview}
              leftIcon={<Wallet className="w-4 h-4" />}
              className="font-bold cursor-pointer"
            >
              Về Ví Xu
            </Button>
            <Button
              variant="outline"
              size="md"
              fullWidth
              onClick={resetWizard}
              className="font-bold cursor-pointer"
            >
              Nạp thêm Xu
            </Button>
            {isLandlord && (
              <Link to="/chu-tro" className="w-full">
                <Button
                  variant="outline"
                  size="md"
                  fullWidth
                  leftIcon={<Building2 className="w-4 h-4" />}
                  className="font-bold cursor-pointer"
                >
                  Về trang Chủ trọ
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* ================= ĐƠN QUÁ HẠN 15 PHÚT ================= */}
      {step === 'expired' && (
        <div className="max-w-lg mx-auto py-4 text-center space-y-4 animate-fadeIn">
          <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-9 h-9" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-black text-gray-950">Mã QR đã hết hạn</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Mỗi mã QR chỉ có hiệu lực 15 phút để bảo đảm đối soát chính xác. Vui lòng tạo mã QR mới để tiếp tục nạp Xu.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              variant="primary"
              size="md"
              onClick={resetWizard}
              leftIcon={<RefreshCw className="w-4 h-4" />}
              className="font-bold cursor-pointer"
            >
              Tạo mã QR mới
            </Button>
            <Button
              variant="outline"
              size="md"
              onClick={onBackToOverview}
              className="font-bold cursor-pointer"
            >
              Về Ví Xu
            </Button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

