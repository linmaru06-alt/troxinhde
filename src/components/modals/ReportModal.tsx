import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useAppStore } from '../../store/useAppStore';
import {
  createReport,
  ReportReasonCode,
  REPORT_REASON_LABELS,
  MAX_REPORT_DESCRIPTION_LENGTH,
} from '../../lib/api/reports';
import { CheckCircle2, ShieldAlert, AlertCircle, Flag, EyeOff, ShieldOff, Check } from 'lucide-react';

export interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetTitle?: string;
  targetId?: string;
  targetType?: string;
  targetOwnerId?: string;
  contentSnapshot?: string;
  onSuccess?: () => void;
}

const REPORT_REASONS: { code: ReportReasonCode; label: string }[] = [
  { code: 'lua_dao', label: REPORT_REASON_LABELS.lua_dao },
  { code: 'hang_cam', label: REPORT_REASON_LABELS.hang_cam },
  { code: 'sai_mo_ta', label: REPORT_REASON_LABELS.sai_mo_ta },
  { code: 'spam', label: REPORT_REASON_LABELS.spam },
  { code: 'khong_phu_hop', label: REPORT_REASON_LABELS.khong_phu_hop },
  { code: 'khac', label: REPORT_REASON_LABELS.khac },
];

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  targetTitle = 'Nội dung này',
  targetId,
  targetType = 'tin_dang',
  targetOwnerId,
  contentSnapshot,
  onSuccess,
}) => {
  const {
    currentUser,
    addReport,
    showToast,
    hiddenItemIds,
    hideItem,
    blockedUserIds,
    blockUser,
  } = useAppStore();
  const [reasonCode, setReasonCode] = useState<ReportReasonCode>('lua_dao');
  const [detail, setDetail] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isHiding, setIsHiding] = useState<boolean>(false);
  const [isBlocking, setIsBlocking] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setReasonCode('lua_dao');
      setDetail('');
      setErrorMessage('');
      setIsSuccess(false);
      setIsHiding(false);
      setIsBlocking(false);
    }
  }, [isOpen, targetId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    // Kiểm tra quy tắc lý do khác
    if (reasonCode === 'khac' && !detail.trim()) {
      setErrorMessage('Lý do "Khác" bắt buộc phải có mô tả chi tiết.');
      return;
    }

    if (detail.length > MAX_REPORT_DESCRIPTION_LENGTH) {
      setErrorMessage(`Mô tả không được vượt quá ${MAX_REPORT_DESCRIPTION_LENGTH} ký tự.`);
      return;
    }

    setIsSubmitting(true);

    try {
      await createReport({
        reporter_id: currentUser?.id,
        target_type: targetType,
        target_id: targetId || 'target_item',
        target_owner_id: targetOwnerId,
        content_snapshot: contentSnapshot,
        reason: reasonCode,
        description: detail.trim(),
        reporter_name: currentUser?.name || 'Người dùng ẩn danh',
        reporter_phone: currentUser?.phone,
      });

      // Đồng bộ vào Admin store
      const adminTargetType: 'user' | 'marketplace' =
        targetType === 'nguoi_dung' || targetType === 'user' || targetType === 'tin_nhan'
          ? 'user'
          : 'marketplace';

      const combinedAdminDetail = contentSnapshot
        ? `[Bản sao nội dung: "${contentSnapshot}"]\n${detail.trim()}`.trim()
        : detail.trim();

      addReport({
        targetId: targetId || 'target_item',
        targetTitle,
        targetType: adminTargetType,
        reporterName: currentUser?.name || 'Người dùng ẩn danh',
        reporterPhone: currentUser?.phone,
        reason: REPORT_REASON_LABELS[reasonCode],
        detail: combinedAdminDetail,
      });

      setIsSubmitting(false);
      setIsSuccess(true);
      showToast('Gửi báo cáo thành công', 'Cảm ơn bạn đã phản ánh để giữ cộng đồng an toàn!', 'success');

      if (onSuccess) {
        onSuccess();
      }
      // Không tự đóng modal bằng setTimeout để người dùng xem và chọn Ẩn tin / Chặn người bán
    } catch (err: any) {
      setIsSubmitting(false);
      const msg = err?.message || 'Không thể gửi báo cáo vi phạm. Vui lòng thử lại sau!';
      setErrorMessage(msg);
      showToast('Gửi báo cáo thất bại', msg, 'error');
    }
  };

  const handleHideThisItem = async () => {
    if (!targetId || isHiding) return;
    setIsHiding(true);
    try {
      await hideItem(targetId, targetTitle);
    } finally {
      setIsHiding(false);
    }
  };

  const handleBlockThisSeller = async () => {
    if (!targetOwnerId || isBlocking) return;
    setIsBlocking(true);
    try {
      await blockUser(targetOwnerId, 'Người bán');
    } finally {
      setIsBlocking(false);
    }
  };

  const isItemAlreadyHidden = Boolean(targetId && hiddenItemIds.includes(targetId));
  const isSellerAlreadyBlocked = Boolean(targetOwnerId && blockedUserIds.includes(targetOwnerId));
  const showSellerBlockOption = Boolean(targetOwnerId && targetOwnerId !== currentUser?.id);
  const showHideItemOption = Boolean(targetId && targetType !== 'nguoi_dung' && targetType !== 'user');

  const modalTitle =
    targetType === 'nguoi_dung' || targetType === 'user'
      ? 'Báo Cáo Người Dùng'
      : targetType === 'tin_nhan' || targetType === 'message'
      ? 'Báo Cáo Tin Nhắn'
      : 'Báo Cáo Vi Phạm';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} maxWidth="md">
      {isSuccess ? (
        <div className="py-4 sm:py-6 text-center space-y-4 animate-fadeIn">
          <div className="w-14 h-14 bg-emerald-100 text-[#006d37] rounded-full flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-7 h-7 sm:w-8 sm:h-8" />
          </div>
          <div className="space-y-1">
            <h4 className="text-base sm:text-lg font-bold text-gray-900">
              Cảm ơn bạn đã gửi báo cáo!
            </h4>
            <p className="text-xs text-gray-600 max-w-sm mx-auto leading-relaxed px-2">
              Phản ánh của bạn đã được ghi nhận. Ban Quản Trị Trọ Xinh sẽ kiểm tra và xử lý trong thời gian sớm nhất.
            </p>
          </div>

          {/* 2 Tùy chọn bảo vệ trải nghiệm: Ẩn tin & Chặn người bán */}
          {(showHideItemOption || showSellerBlockOption) && (
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3.5 text-left space-y-3">
              <p className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                Tùy chọn bảo vệ trải nghiệm của bạn:
              </p>

              {/* Tùy chọn 1: Ẩn tin này khỏi danh sách */}
              {showHideItemOption && (
                <div className="flex items-center justify-between gap-3 p-2.5 bg-white rounded-xl border border-gray-100 shadow-2xs">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                      <EyeOff className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h5 className="text-xs font-bold text-gray-900">Ẩn tin này khỏi danh sách của tôi</h5>
                      <p className="text-[11px] text-gray-500 line-clamp-1">
                        Tin đăng sẽ không còn hiển thị trong danh sách chợ đồ cũ của bạn.
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {isItemAlreadyHidden ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-500 border border-gray-200 cursor-not-allowed">
                        <Check className="w-3.5 h-3.5 text-emerald-600" /> Đã ẩn
                      </span>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleHideThisItem}
                        isLoading={isHiding}
                        leftIcon={<EyeOff className="w-3.5 h-3.5" />}
                      >
                        Ẩn tin
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Tùy chọn 2: Chặn người bán */}
              {showSellerBlockOption && (
                <div className="flex items-center justify-between gap-3 p-2.5 bg-white rounded-xl border border-gray-100 shadow-2xs">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center shrink-0 mt-0.5">
                      <ShieldOff className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h5 className="text-xs font-bold text-gray-900">Chặn người bán này</h5>
                      <p className="text-[11px] text-gray-500 line-clamp-1">
                        Không thấy tin của người này và họ không thể nhắn tin cho bạn.
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0">
                    {isSellerAlreadyBlocked ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-500 border border-gray-200 cursor-not-allowed">
                        <Check className="w-3.5 h-3.5 text-emerald-600" /> Đã chặn
                      </span>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleBlockThisSeller}
                        isLoading={isBlocking}
                        leftIcon={<ShieldOff className="w-3.5 h-3.5 text-rose-600" />}
                      >
                        Chặn người bán
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="pt-2">
            <Button type="button" variant="primary" size="md" fullWidth onClick={onClose}>
              Hoàn Tất & Đóng
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMessage && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-amber-800 bg-amber-50/90 p-3 rounded-xl border border-amber-200">
            <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600" />
            <span className="truncate">
              Báo cáo đối với: <strong className="font-semibold text-gray-900">{targetTitle}</strong>
            </span>
          </div>

          {/* Chọn lý do */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider">
              Chọn lý do vi phạm:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {REPORT_REASONS.map((r) => {
                const isSelected = reasonCode === r.code;
                return (
                  <label
                    key={r.code}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                      isSelected
                        ? 'border-[#006d37] bg-emerald-50/80 font-bold text-[#006d37] shadow-xs ring-1 ring-[#006d37]/20'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reportReason"
                      value={r.code}
                      checked={isSelected}
                      onChange={() => setReasonCode(r.code)}
                      className="text-[#006d37] focus:ring-[#006d37]"
                    />
                    <span>{r.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Ô mô tả có đếm ký tự */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label className="font-semibold text-gray-700">
                {reasonCode === 'khac' ? (
                  <span>
                    Mô tả chi tiết <span className="text-rose-600 font-bold">* (Bắt buộc)</span>:
                  </span>
                ) : (
                  <span>Mô tả thêm (Tùy chọn):</span>
                )}
              </label>
              <span
                className={`text-[11px] font-mono ${
                  detail.length >= MAX_REPORT_DESCRIPTION_LENGTH
                    ? 'text-rose-600 font-bold'
                    : 'text-gray-400'
                }`}
              >
                {detail.length}/{MAX_REPORT_DESCRIPTION_LENGTH}
              </span>
            </div>
            <textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value.slice(0, MAX_REPORT_DESCRIPTION_LENGTH))}
              maxLength={MAX_REPORT_DESCRIPTION_LENGTH}
              rows={3}
              placeholder={
                reasonCode === 'khac'
                  ? 'Vui lòng mô tả cụ thể lý do vi phạm của nội dung này (bắt buộc)...'
                  : 'Cung cấp thêm chi tiết vi phạm để ban quản trị đối chiếu (tùy chọn)...'
              }
              className="w-full text-xs rounded-xl border border-gray-300 p-2.5 focus:outline-none focus:ring-2 focus:ring-[#006d37] transition"
            />
          </div>

          {/* Các nút bấm */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              variant="destructive"
              size="sm"
              isLoading={isSubmitting}
              leftIcon={<Flag className="w-3.5 h-3.5" />}
            >
              Gửi Báo Cáo
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
