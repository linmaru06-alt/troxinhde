// =====================================================================
// K23 MONETIZATION — REPOST ROOM MODAL
// Đăng lại 1 chạm: Lần 1 (hoặc credit Tin lẻ 30 ngày) miễn phí 0 Xu;
// Lần 2+ thu phí 30 Xu/15 ngày hoặc 50 Xu/30 ngày
// =====================================================================

import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  RotateCcw,
  CheckCircle2,
  QrCode,
  Sparkles,
  Copy,
  Check,
  Coins,
  RefreshCw,
  FlaskConical,
  Loader2,
} from 'lucide-react';
import { Room } from '../../../types';
import { LISTING_CONSTANTS, calculateListingStatus } from '../../../utils/listingLifecycle';
import { formatCurrency } from '../../ui/Cards';
import { useAppStore } from '../../../store/useAppStore';
import { isSupabaseConfigured } from '../../../lib/supabase';
import {
  repostRoomWithXu,
  createServicePaymentOrder,
  getServicePaymentOrderStatus,
  confirmDemoServiceOrder,
  ServicePaymentOrderResponse,
} from '../../../lib/api/monetization';

interface RepostRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: Room;
  onSuccess?: () => void;
}

export const RepostRoomModal: React.FC<RepostRoomModalProps> = ({ isOpen, onClose, room, onSuccess }) => {
  const location = useLocation();
  const queryClient = useQueryClient();
  const { currentUser, updateRoomStatus, wallet, spendXu, fetchWallet, showToast } = useAppStore();
  const statusDetail = calculateListingStatus(room);
  const isFree = statusDetail.canRepostFree;

  const [selectedDuration, setSelectedDuration] = useState<15 | 30>(30);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [showBankQr, setShowBankQr] = useState<boolean>(false);
  const [qrOrder, setQrOrder] = useState<ServicePaymentOrderResponse | null>(null);
  const [isLoadingQr, setIsLoadingQr] = useState<boolean>(false);
  const [isCheckingQr, setIsCheckingQr] = useState<boolean>(false);
  const [isConfirmingDemo, setIsConfirmingDemo] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) {
      setShowBankQr(false);
      setQrOrder(null);
    }
  }, [isOpen]);

  // Poll trạng thái nếu QR đang mở
  useEffect(() => {
    if (!isOpen || !showBankQr || !qrOrder?.orderCode) return;

    const interval = setInterval(async () => {
      try {
        const res = await getServicePaymentOrderStatus(qrOrder.orderCode);
        if (res.status === 'paid') {
          clearInterval(interval);
          applyRoomRepostUI(selectedDuration);
        }
      } catch (err) {
        console.warn('[RepostRoomModal] Poll warning:', err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isOpen, showBankQr, qrOrder?.orderCode, selectedDuration]);

  if (!isOpen) return null;

  const priceXu =
    selectedDuration === 15
      ? LISTING_CONSTANTS.REPOST_15_DAYS_PRICE_XU
      : LISTING_CONSTANTS.REPOST_30_DAYS_PRICE_XU;
  const walletTotalXu = wallet?.total_xu ?? 0;
  const hasEnoughXu = walletTotalXu >= priceXu;
  const topupReturnHref = `${
    currentUser?.role === 'owner' ? '/chu-tro/vi-xu' : '/vi-xu'
  }?buoc=chon-goi&returnUrl=${encodeURIComponent(location.pathname + location.search)}`;

  const applyRoomRepostUI = (days: number) => {
    const now = new Date();
    const newExpiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
    const newArchivedUntil = new Date(
      now.getTime() + (days + LISTING_CONSTANTS.ARCHIVE_STORAGE_DAYS) * 24 * 60 * 60 * 1000
    ).toISOString();

    updateRoomStatus(room.id, 'Còn trống');
    room.status = 'Còn trống';
    room.publishedAt = now.toISOString();
    room.expiresAt = newExpiresAt;
    room.archivedUntil = newArchivedUntil;
    room.repostCount = (room.repostCount || 0) + 1;

    if (currentUser?.id) {
      fetchWallet(currentUser.id);
      queryClient.invalidateQueries({ queryKey: ['owner-listing-quota', currentUser.id] });
    }

    onClose();
    showToast(
      'Đăng lại tin thành công!',
      `Phòng ${room.roomNumber} đã được hiển thị công khai trở lại trong ${days} ngày.`,
      'success'
    );
    if (onSuccess) onSuccess();
  };

  const handleRepostWithXuOrFree = async () => {
    setIsProcessing(true);
    const additionalDays = isFree ? 30 : selectedDuration;

    try {
      if (isSupabaseConfigured) {
        const res = await repostRoomWithXu({
          roomId: room.id,
          durationDays: additionalDays,
        });
        applyRoomRepostUI(Number(res.activation?.duration_days) || additionalDays);
        return;
      }

      // Offline demo fallback
      if (!isFree) {
        const spendOk = await spendXu(
          priceXu,
          `Gia hạn tin phòng ${room.roomNumber || room.id.slice(0, 6)} (${additionalDays} ngày)`,
          room.id
        );
        if (!spendOk) {
          setIsProcessing(false);
          return;
        }
      }
      applyRoomRepostUI(additionalDays);
    } catch (err: any) {
      showToast('Không thể đăng lại tin', err?.message || 'Vui lòng thử lại sau.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleOpenBankQr = async () => {
    const nextOpen = !showBankQr;
    setShowBankQr(nextOpen);
    if (!nextOpen) return;

    setIsLoadingQr(true);
    try {
      const order = await createServicePaymentOrder({
        serviceType: 'repost',
        itemId: 'repost',
        roomId: room.id,
        durationDays: selectedDuration,
        method: 'vietqr',
      });
      setQrOrder(order);
    } catch (err: any) {
      showToast('Không tạo được mã VietQR', err?.message || 'Vui lòng thử lại.', 'error');
      setShowBankQr(false);
    } finally {
      setIsLoadingQr(false);
    }
  };

  const handleRecheckQr = async () => {
    if (!qrOrder?.orderCode) return;
    setIsCheckingQr(true);
    try {
      const res = await getServicePaymentOrderStatus(qrOrder.orderCode);
      if (res.status === 'paid') {
        applyRoomRepostUI(selectedDuration);
      } else {
        showToast(
          'Đang chờ xác nhận chuyển khoản',
          'Hệ thống sẽ tự động kích hoạt tin ngay sau khi nhận được tiền.',
          'info'
        );
      }
    } catch (err: any) {
      showToast('Lỗi kiểm tra giao dịch', err?.message || 'Vui lòng thử lại.', 'error');
    } finally {
      setIsCheckingQr(false);
    }
  };

  const handleDemoConfirm = async () => {
    if (!qrOrder?.orderCode || !currentUser?.isDemoAccount) return;
    setIsConfirmingDemo(true);
    try {
      await confirmDemoServiceOrder(qrOrder.orderCode);
      applyRoomRepostUI(selectedDuration);
    } catch (err: any) {
      showToast('Lỗi xác nhận Demo', err?.message || 'Vui lòng thử lại.', 'error');
    } finally {
      setIsConfirmingDemo(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-scaleUp">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-[#00a854] flex items-center justify-center">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-gray-900">
                {isFree ? 'Đăng Lại Tin 1 Chạm (Miễn Phí)' : 'Gia Hạn / Đăng Lại Tin'}
              </h3>
              <p className="text-[11px] text-gray-500 line-clamp-1">
                Phòng: {room.roomNumber} - {room.title}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Nội dung theo trường hợp miễn phí hay có phí */}
        {isFree ? (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 text-center space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black">
                <Sparkles className="w-3.5 h-3.5" /> ĐĂNG LẠI MIỄN PHÍ
              </div>
              <h4 className="text-xl font-black text-emerald-950">0 Xu • MIỄN PHÍ 100%</h4>
              <p className="text-xs text-emerald-800 leading-relaxed">
                Tin đăng sẽ được kích hoạt lại <strong>30 ngày hiển thị</strong>, giữ nguyên toàn bộ nội dung, hình ảnh và lịch sử liên hệ.
              </p>
            </div>

            <p className="text-[11px] text-gray-500 italic text-center">
              * Các lần gia hạn tiếp theo áp dụng mức phí 30 Xu (15 ngày) hoặc 50 Xu (30 ngày).
            </p>

            <button
              type="button"
              disabled={isProcessing}
              onClick={handleRepostWithXuOrFree}
              className="w-full py-3 rounded-2xl bg-[#00a854] hover:bg-[#008f47] text-white text-xs font-black transition flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isProcessing ? 'Đang kích hoạt tin...' : 'Kích Hoạt Đăng Lại Ngay (30 Ngày)'}</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Lựa chọn kỳ hạn gia hạn (Chỉ hiển thị Xu) */}
            <div>
              <label className="text-xs font-bold text-gray-800 block mb-2">Chọn Kỳ Hạn Gia Hạn:</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDuration(15);
                    setShowBankQr(false);
                    setQrOrder(null);
                  }}
                  className={`p-3.5 rounded-2xl border-2 text-left transition cursor-pointer ${
                    selectedDuration === 15
                      ? 'border-[#00a854] bg-emerald-50/50 shadow-xs'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="block text-xs font-bold text-gray-900">Kỳ Hạn 15 Ngày</span>
                  <span className="block text-base font-black text-[#006d37] font-mono mt-0.5">30 Xu</span>
                  <span className="text-[10px] text-gray-500">Hiển thị thêm 15 ngày</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedDuration(30);
                    setShowBankQr(false);
                    setQrOrder(null);
                  }}
                  className={`p-3.5 rounded-2xl border-2 text-left transition cursor-pointer relative ${
                    selectedDuration === 30
                      ? 'border-[#00a854] bg-emerald-50/50 shadow-xs'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="absolute -top-2 right-2 bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                    TIẾT KIỆM
                  </span>
                  <span className="block text-xs font-bold text-gray-900">Kỳ Hạn 30 Ngày</span>
                  <span className="block text-base font-black text-[#006d37] font-mono mt-0.5">50 Xu</span>
                  <span className="text-[10px] text-gray-500">Hiển thị thêm 30 ngày</span>
                </button>
              </div>
            </div>

            {/* Phương Thức 1: Thanh Toán Bằng Xu nội bộ */}
            <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-gray-900 flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-[#00a854]" />
                  <span>Thanh toán bằng Xu nội bộ:</span>
                </span>
                <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                  Số dư: {walletTotalXu.toLocaleString('vi-VN')} Xu
                </span>
              </div>

              {hasEnoughXu ? (
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleRepostWithXuOrFree}
                  className="w-full py-3 rounded-2xl bg-[#00a854] hover:bg-[#008f47] text-white text-xs font-black transition flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  <Coins className="w-4 h-4 text-amber-300" />
                  <span>
                    {isProcessing ? 'Đang trừ Xu & gia hạn...' : `Trừ ${priceXu} Xu — Gia Hạn Ngay (1 Chạm)`}
                  </span>
                </button>
              ) : (
                <div className="space-y-2 pt-1">
                  <p className="text-[11px] text-rose-700">
                    Số dư hiện tại ({walletTotalXu} Xu) chưa đủ {priceXu} Xu để gia hạn.
                  </p>
                  <Link
                    to={topupReturnHref}
                    className="block text-center py-2 px-3 bg-amber-400 hover:bg-amber-500 text-amber-950 font-black text-xs rounded-xl shadow-xs transition"
                  >
                    Nạp Thêm Xu Ngay →
                  </Link>
                </div>
              )}
            </div>

            {/* Toggle hiển thị VietQR ngân hàng */}
            <div className="text-center">
              <button
                type="button"
                onClick={handleOpenBankQr}
                disabled={isLoadingQr}
                className="text-xs font-bold text-gray-500 hover:text-gray-800 underline cursor-pointer inline-flex items-center gap-1"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>{showBankQr ? 'Ẩn mã VietQR ngân hàng' : 'Hoặc quét mã VietQR trực tiếp'}</span>
              </button>
            </div>

            {/* Quét mã VietQR chuyển khoản qua Server Order */}
            {showBankQr && (
              <div className="p-3 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-center space-y-2.5 animate-fadeIn">
                {isLoadingQr || !qrOrder ? (
                  <div className="py-8 flex flex-col items-center justify-center gap-2 text-xs text-gray-500">
                    <Loader2 className="w-6 h-6 animate-spin text-[#006d37]" />
                    <span>Đang tạo mã VietQR đối soát tự động...</span>
                  </div>
                ) : (
                  <>
                    <img
                      src={qrOrder.qrCode}
                      alt="VietQR Gia Hạn Tin"
                      className="w-44 h-44 mx-auto rounded-xl object-contain bg-white p-1"
                    />
                    <div className="text-[11px] text-gray-600">
                      {qrOrder.receiverInfo.bankName} • STK:{' '}
                      <strong className="font-mono text-gray-900">{qrOrder.receiverInfo.accountNumber}</strong> •{' '}
                      {qrOrder.receiverInfo.accountName}
                    </div>
                    <div className="flex items-center justify-between text-xs px-2 text-gray-700">
                      <span>
                        Số tiền:{' '}
                        <strong className="text-[#006d37]">{formatCurrency(qrOrder.amountVnd)}</strong>
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="font-mono font-bold text-[11px] bg-white px-1.5 py-0.5 rounded border border-gray-200">
                          {qrOrder.transferContent}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(qrOrder.transferContent);
                            setIsCopied(true);
                            setTimeout(() => setIsCopied(false), 2000);
                          }}
                          className="p-1 text-gray-500 hover:text-gray-900 cursor-pointer"
                        >
                          {isCopied ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isCheckingQr}
                      onClick={handleRecheckQr}
                      className="w-full py-2.5 rounded-xl bg-[#006d37] hover:bg-[#00572c] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isCheckingQr ? 'animate-spin' : ''}`} />
                      <span>{isCheckingQr ? 'Đang kiểm tra...' : 'Kiểm tra trạng thái thanh toán'}</span>
                    </button>

                    {currentUser?.isDemoAccount && (
                      <button
                        type="button"
                        disabled={isConfirmingDemo}
                        onClick={handleDemoConfirm}
                        className="w-full py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <FlaskConical className="w-3.5 h-3.5" />
                        <span>{isConfirmingDemo ? 'Đang xác nhận Demo...' : 'Xác nhận Demo Sandbox'}</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
