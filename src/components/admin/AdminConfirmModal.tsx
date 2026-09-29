import React, { useState } from 'react';
import { AlertTriangle, ShieldAlert, CheckCircle2, X } from 'lucide-react';
import { Button } from '../ui/Button';

export interface AdminConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void> | void;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  type: 'room' | 'owner' | 'user' | 'marketplace' | 'custom';
  entityName?: string;
  isLoading?: boolean;
}

const ROOM_REASONS = [
  'Ảnh không đủ hoặc không rõ nét',
  'Thông tin giá và phụ phí không khớp thực tế',
  'Địa chỉ không xác định được trên bản đồ',
  'Thiếu giấy tờ pháp lý hoặc giấy chứng nhận PCCC',
  'Nghi ngờ lừa đảo hoặc trung gian bất hợp pháp',
  'Nội dung hoặc hình ảnh vi phạm tiêu chuẩn cộng đồng',
];

const OWNER_REASONS = [
  'Ảnh chụp CCCD bị mờ, lóa hoặc mất góc',
  'Thông tin đăng ký không khớp với giấy tờ',
  'Tài liệu pháp lý / quyền sở hữu đã hết hạn',
  'Nghi ngờ danh tính giả mạo',
  'Số điện thoại không liên lạc được',
];

const USER_REASONS = [
  'Spam tin nhắn hoặc đặt lịch hẹn bất thường',
  'Đăng tin giả mạo hoặc cố ý lừa đảo khách thuê',
  'Có nhiều phản ánh vi phạm từ cộng đồng',
  'Sử dụng ngôn từ quấy rối hoặc xúc phạm người khác',
];

const MARKETPLACE_REASONS = [
  'Ảnh chụp không rõ ràng hoặc không phải ảnh thực tế',
  'Mức giá không hợp lý hoặc khai báo sai hình thức tặng/bán',
  'Món đồ không thuộc danh mục cho phép (hàng cấm, nguy hiểm)',
  'Mô tả sơ sài hoặc cố ý chèn link quảng cáo, cờ bạc',
  'Số điện thoại hoặc thông tin người bán nghi vấn lừa đảo',
  'Đồ dùng đã quá cũ/hỏng nặng không còn khả năng sử dụng',
];

export const AdminConfirmModal: React.FC<AdminConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'Xác nhận thực hiện',
  cancelText = 'Hủy bỏ',
  variant = 'danger',
  type,
  entityName,
  isLoading = false,
}) => {
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [customDetail, setCustomDetail] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!isOpen) return null;

  const defaultReasonOptions =
    type === 'room'
      ? ROOM_REASONS
      : type === 'owner'
      ? OWNER_REASONS
      : type === 'user'
      ? USER_REASONS
      : type === 'marketplace'
      ? MARKETPLACE_REASONS
      : [];

  const handleToggleReason = (reason: string) => {
    if (selectedReasons.includes(reason)) {
      setSelectedReasons(selectedReasons.filter((r) => r !== reason));
    } else {
      setSelectedReasons([...selectedReasons, reason]);
    }
    setErrorMsg('');
  };

  const getCombinedReason = () => {
    const parts = [...selectedReasons];
    if (customDetail.trim()) {
      
      parts.push(customDetail.trim());
    }
    return parts.join('; ');
  };

  const finalReason = getCombinedReason();
  const isValid = finalReason.trim().length >= 10;

  const handleConfirmSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) {
      setErrorMsg('Vui lòng chọn hoặc nhập lý do chi tiết (tối thiểu 10 ký tự)');
      return;
    }
    setErrorMsg('');
    await onConfirm(finalReason);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl p-6 max-w-lg w-full shadow-2xl border border-gray-100 animate-scaleUp space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                variant === 'danger'
                  ? 'bg-rose-100 text-rose-600'
                  : variant === 'warning'
                  ? 'bg-amber-100 text-amber-600'
                  : 'bg-emerald-100 text-[#006d37]'
              }`}
            >
              {variant === 'danger' ? (
                <ShieldAlert className="w-6 h-6" />
              ) : (
                <AlertTriangle className="w-6 h-6" />
              )}
            </div>
            <div>
              <h3 className="font-extrabold text-base text-gray-900">{title}</h3>
              {entityName && (
                <p className="text-xs text-gray-500 font-medium line-clamp-1 mt-0.5">
                  Đối tượng: <span className="font-bold text-gray-800">{entityName}</span>
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cảnh báo hành động */}
        <div className="bg-amber-50/70 border border-amber-200/60 rounded-2xl p-3.5 text-xs text-amber-900 leading-relaxed">
          {description}
        </div>

        {/* Form lý do chuẩn hóa */}
        <form onSubmit={handleConfirmSubmit} className="space-y-4">
          {defaultReasonOptions.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 block">
                Chọn lý do chuẩn hóa (có thể chọn nhiều mục):
              </label>
              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                {defaultReasonOptions.map((opt) => {
                  const isChecked = selectedReasons.includes(opt);
                  return (
                    <label
                      key={opt}
                      onClick={() => handleToggleReason(opt)}
                      className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                        isChecked
                          ? 'border-[#006d37] bg-emerald-50/50 text-[#006d37] font-semibold'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="mt-0.5 rounded text-[#006d37] focus:ring-[#006d37]"
                      />
                      <span>{opt}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Ô nhập lý do bổ sung */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 block">
              Ghi chú lý do chi tiết <span className="text-rose-500">*</span> (tối thiểu 10 ký tự):
            </label>
            <textarea
              value={customDetail}
              onChange={(e) => {
                setCustomDetail(e.target.value);
                setErrorMsg('');
              }}
              rows={3}
              placeholder="Nhập chi tiết căn cứ, bằng chứng hoặc lưu ý cho người dùng..."
              className="w-full text-xs p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#006d37] focus:border-transparent outline-none resize-none"
            />
            <div className="flex justify-between items-center text-[11px] text-gray-400">
              <span>Độ dài: {finalReason.length} ký tự</span>
              <span>Yêu cầu: &ge; 10 ký tự</span>
            </div>
          </div>

          {errorMsg && (
            <p className="text-xs text-rose-600 font-semibold bg-rose-50 p-2.5 rounded-xl border border-rose-100">
              {errorMsg}
            </p>
          )}

          {/* Footer nút hành động */}
          <div className="flex gap-2.5 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1 py-2.5"
              onClick={onClose}
              disabled={isLoading}
            >
              {cancelText}
            </Button>
            <Button
              type="submit"
              variant={variant === 'danger' ? 'destructive' : 'primary'}
              size="sm"
              className="flex-1 py-2.5"
              disabled={!isValid || isLoading}
            >
              {isLoading ? 'Đang xử lý...' : confirmText}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
