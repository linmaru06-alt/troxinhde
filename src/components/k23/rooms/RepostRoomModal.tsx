// =====================================================================
// K23 MONETIZATION — REPOST ROOM MODAL
// Đăng lại 1 chạm (Lần 1 miễn phí, Lần 2+ thu phí 30 Xu/15d hoặc 50 Xu/30d)
// Theo tài liệu: "Trọ Xinh - Mô hình thu tiền mới - Đã chốt vòng đời tin 30 ngày"
// =====================================================================

import React, { useState } from 'react';
import { RotateCcw, CheckCircle2, QrCode, Sparkles, Copy, Check, Clock, Coins } from 'lucide-react';
import { Room } from '../../../types';
import { LISTING_CONSTANTS, calculateListingStatus } from '../../../utils/listingLifecycle';
import { formatCurrency } from '../../ui/Cards';
import { useAppStore } from '../../../store/useAppStore';

interface RepostRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: Room;
  onSuccess?: () => void;
}

export const RepostRoomModal: React.FC<RepostRoomModalProps> = ({ isOpen, onClose, room, onSuccess }) => {
  const { updateRoomStatus, wallet, spendXu, showToast } = useAppStore();
  const statusDetail = calculateListingStatus(room);
  const isFree = statusDetail.canRepostFree;

  const [selectedDuration, setSelectedDuration] = useState<15 | 30>(30);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [showBankQr, setShowBankQr] = useState<boolean>(false);

  if (!isOpen) return null;

  const priceXu = selectedDuration === 15 ? LISTING_CONSTANTS.REPOST_15_DAYS_PRICE_XU : LISTING_CONSTANTS.REPOST_30_DAYS_PRICE_XU;
  const priceVnd = priceXu * LISTING_CONSTANTS.XU_TO_VND_RATE;
  const hasEnoughXu = wallet.total_xu >= priceXu;
  const transferContent = `TX GIAHAN ${room.roomNumber || room.id.slice(0, 6)} ${selectedDuration}D`.toUpperCase();

  const vietQrUrl = `https://img.vietqr.io/image/970422-0888110789-compact2.png?amount=${priceVnd}&addInfo=${encodeURIComponent(
    transferContent
  )}&accountName=${encodeURIComponent('CONG TY TRO XINH')}`;

  const handleExecuteRepost = () => {
    setIsProcessing(true);
    setTimeout(() => {
      // Cập nhật trạng thái phòng sang Còn trống và gia hạn ngày hết hạn
      const now = new Date();
      const additionalDays = isFree ? 30 : selectedDuration;
      const newExpiresAt = new Date(now.getTime() + additionalDays * 24 * 60 * 60 * 1000).toISOString();
      const newArchivedUntil = new Date(
        now.getTime() + (additionalDays + LISTING_CONSTANTS.ARCHIVE_STORAGE_DAYS) * 24 * 60 * 60 * 1000
      ).toISOString();

      updateRoomStatus(room.id, 'Còn trống');
      // Ghi nhận trực tiếp vào object phòng
      room.status = 'Còn trống';
      room.publishedAt = now.toISOString();
      room.expiresAt = newExpiresAt;
      room.archivedUntil = newArchivedUntil;
      room.repostCount = (room.repostCount || 0) + 1;

      setIsProcessing(false);
      onClose();
      showToast(
        'Đăng lại tin thành công! 🎉',
        `Phòng ${room.roomNumber} đã được hiển thị công khai trở lại trong ${additionalDays} ngày.`,
        'success'
      );
      if (onSuccess) onSuccess();
    }, 800);
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
                {isFree ? 'Đăng Lại Tin 1 Chạm (Miễn Phí)' : 'Gia Hạn Tin Đăng'}
              </h3>
              <p className="text-[11px] text-gray-500">
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
                <Sparkles className="w-3.5 h-3.5" /> CHÍNH SÁCH ƯU ĐÃI LẦN 1
              </div>
              <h4 className="text-xl font-black text-emerald-950">0 Xu • MIỄN PHÍ 100%</h4>
              <p className="text-xs text-emerald-800 leading-relaxed">
                Trọ Xinh tặng bạn <strong>1 lần đăng lại hoàn toàn miễn phí</strong>. Tin đăng sẽ được kích hoạt lại <strong>30 ngày hiển thị</strong>, giữ nguyên toàn bộ nội dung, hình ảnh, lượt xem và lịch sử liên hệ.
              </p>
            </div>

            <p className="text-[11px] text-gray-500 italic text-center">
              * Từ lần đăng lại thứ 2 trở đi, hệ thống sẽ áp dụng mức phí ưu đãi 30 Xu (15 ngày) hoặc 50 Xu (30 ngày).
            </p>

            <button
              type="button"
              disabled={isProcessing}
              onClick={handleExecuteRepost}
              className="w-full py-3 rounded-2xl bg-[#00a854] hover:bg-[#008f47] text-white text-xs font-black transition flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-95 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isProcessing ? 'Đang kích hoạt tin...' : 'Kích Hoạt Đăng Lại Ngay (30 Ngày)'}</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Lựa chọn kỳ hạn gia hạn */}
            <div>
              <label className="text-xs font-bold text-gray-800 block mb-2">Chọn Kỳ Hạn Gia Hạn Tin:</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedDuration(15)}
                  className={`p-3.5 rounded-2xl border-2 text-left transition cursor-pointer ${
                    selectedDuration === 15
                      ? 'border-[#00a854] bg-emerald-50/50 shadow-xs'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="block text-xs font-bold text-gray-900">Kỳ Hạn 15 Ngày</span>
                  <span className="block text-sm font-black text-[#006d37] mt-0.5">30 Xu (~30.000đ)</span>
                  <span className="text-[10px] text-gray-500">2.000đ / ngày</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedDuration(30)}
                  className={`p-3.5 rounded-2xl border-2 text-left transition cursor-pointer relative ${
                    selectedDuration === 30
                      ? 'border-[#00a854] bg-emerald-50/50 shadow-xs'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="absolute -top-2 right-2 bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full">
                    TIẾT KIỆM
                  </span>
                  <span className="block text-xs font-bold text-gray-900">Kỳ Hạn 30 Ngày</span>
                  <span className="block text-sm font-black text-[#006d37] mt-0.5">50 Xu (~50.000đ)</span>
                  <span className="text-[10px] text-gray-500">1.666đ / ngày</span>
                </button>
              </div>
            </div>

            {/* Phương Thức 1: Thanh Toán Bằng Ví Xu (Khuyên dùng) */}
            <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-gray-900 flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-[#00a854]" />
                  <span>Thanh Toán Bằng Ví Xu Trọ Xinh:</span>
                </span>
                <span className="text-xs font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                  Số dư: {wallet.total_xu} Xu
                </span>
              </div>

              {hasEnoughXu ? (
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={async () => {
                    setIsProcessing(true);
                    const success = await spendXu(
                      priceXu,
                      `Gia hạn tin phòng ${room.roomNumber || room.id.slice(0, 6)} (${selectedDuration} ngày)`,
                      `TX_GIAHAN_${room.roomNumber || room.id.slice(0, 6)}`
                    );
                    if (success) {
                      handleExecuteRepost();
                    } else {
                      setIsProcessing(false);
                    }
                  }}
                  className="w-full py-3 rounded-2xl bg-[#00a854] hover:bg-[#008f47] text-white text-xs font-black transition flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  <Coins className="w-4 h-4 text-amber-300" />
                  <span>{isProcessing ? 'Đang trừ Xu & gia hạn...' : `Trừ ${priceXu} Xu — Gia Hạn Ngay (1 Chạm)`}</span>
                </button>
              ) : (
                <div className="space-y-2 pt-1">
                  <p className="text-[11px] text-rose-700">
                    Số dư ví hiện tại ({wallet.total_xu} Xu) chưa đủ {priceXu} Xu để gia hạn.
                  </p>
                  <a
                    href="/chu-tro/vi-xu"
                    target="_blank"
                    rel="noreferrer"
                    className="block text-center py-2 px-3 bg-amber-400 hover:bg-amber-500 text-amber-950 font-black text-xs rounded-xl shadow-xs transition"
                  >
                    Nạp Thêm Xu Vào Ví Ngay ↗
                  </a>
                </div>
              )}
            </div>

            {/* Toggle hiển thị VietQR ngân hàng */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => setShowBankQr(!showBankQr)}
                className="text-xs font-bold text-gray-500 hover:text-gray-800 underline cursor-pointer"
              >
                {showBankQr ? 'Ẩn mã VietQR ngân hàng' : 'Hoặc quét mã VietQR ngân hàng trực tiếp'}
              </button>
            </div>

            {/* Quét mã VietQR chuyển khoản */}
            {showBankQr && (
              <div className="p-3 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-center space-y-2 animate-fadeIn">
                <img
                  src={vietQrUrl}
                  alt="VietQR Gia Hạn Tin"
                  className="w-48 h-48 mx-auto rounded-xl object-contain bg-white p-1"
                />
                <div className="flex items-center justify-between text-xs px-2 text-gray-700">
                  <span>Số tiền: <strong className="text-[#006d37]">{formatCurrency(priceVnd)}</strong></span>
                  <div className="flex items-center gap-1">
                    <span className="font-mono font-bold text-[11px] bg-white px-1.5 py-0.5 rounded border border-gray-200">
                      {transferContent}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(transferContent);
                        setIsCopied(true);
                        setTimeout(() => setIsCopied(false), 2000);
                      }}
                      className="p-1 text-gray-500 hover:text-gray-900 cursor-pointer"
                    >
                      {isCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleExecuteRepost}
                  className="w-full mt-2 py-2.5 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{isProcessing ? 'Đang kích hoạt...' : 'Tôi Đã Chuyển Khoản Qua App Ngân Hàng'}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
