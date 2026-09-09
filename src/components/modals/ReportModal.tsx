import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useAppStore } from '../../store/useAppStore';
import { createReport } from '../../lib/api/reports';
import { CheckCircle2, ShieldAlert, AlertCircle } from 'lucide-react';

export interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetTitle?: string;
  targetId?: string;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  targetTitle = 'Tin đăng này',
  targetId,
}) => {
  const { currentUser, addReport, showToast } = useAppStore();
  const [reason, setReason] = useState<string>('Phòng không giống thực tế / Tin ảo');
  const [detail, setDetail] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const reasons = [
    'Phòng không giống thực tế / Tin ảo',
    'Chủ nhà thu phụ phí trái quy định',
    'Địa chỉ hoặc hình ảnh không chính xác',
    'Phòng đã cho thuê nhưng không cập nhật',
    'Dấu hiệu lừa đảo / yêu cầu cọc mờ ám',
    'Thái độ giao tiếp không chuẩn mực',
    'Lý do khác',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await createReport({
        reporter_id: currentUser?.id,
        target_type: 'room',
        target_id: targetId || 'target_item',
        reason,
        description: detail.trim(),
        reporter_name: currentUser?.name || 'Người dùng ẩn danh',
        reporter_phone: currentUser?.phone,
      });

      addReport({
        targetId: targetId || 'target_item',
        targetTitle,
        targetType: 'room',
        reporterName: currentUser?.name || 'Người dùng ẩn danh',
        reporterPhone: currentUser?.phone,
        reason,
        detail,
      });

      setIsSubmitting(false);
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 1500);
    } catch (err: any) {
      setIsSubmitting(false);
      const msg = err?.message || 'Không thể gửi báo cáo vi phạm. Vui lòng thử lại!';
      setErrorMessage(msg);
      showToast('Gửi báo cáo thất bại', msg, 'error');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Báo Cáo Vi Phạm" maxWidth="md">
      {isSuccess ? (
        <div className="py-8 text-center space-y-3">
          <div className="w-16 h-16 bg-emerald-100 text-[#006d37] rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h4 className="text-lg font-bold text-gray-900">Báo Cáo Đã Được Tiếp Nhận</h4>
          <p className="text-xs text-gray-500 max-w-xs mx-auto">
            Ban Quản Trị Trọ Xinh sẽ kiểm duyệt và xử lý trong vòng 24 giờ làm việc.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMessage && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 p-3 rounded-xl border border-amber-200/50">
            <ShieldAlert className="w-4 h-4 shrink-0 text-amber-600" />
            <span>Báo cáo đối với: <strong className="font-semibold">{targetTitle}</strong></span>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-700 uppercase">Chọn lý do vi phạm:</label>
            <div className="space-y-1.5">
              {reasons.map((r, i) => (
                <label
                  key={i}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                    reason === r ? 'border-[#006d37] bg-emerald-50/50 font-medium text-[#006d37]' : 'border-gray-200 hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="reason"
                    checked={reason === r}
                    onChange={() => setReason(r)}
                    className="text-[#006d37] focus:ring-[#006d37]"
                  />
                  <span>{r}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-700 uppercase">Mô tả thêm (Tùy chọn):</label>
            <textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              rows={3}
              placeholder="Vui lòng cung cấp thêm thông tin chi tiết về sự việc..."
              className="w-full text-xs rounded-xl border border-gray-300 p-2.5 focus:outline-none focus:ring-2 focus:ring-[#006d37]"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Hủy bỏ
            </Button>
            <Button type="submit" variant="destructive" size="sm" isLoading={isSubmitting}>
              Gửi Báo Cáo
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
