import React from 'react';
import { EditProfileForm } from '../profile/EditProfileForm';
import { X, UserCheck } from 'lucide-react';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn overflow-y-auto">
      <div className="bg-gray-50 rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-y-auto border border-gray-200 shadow-2xl animate-scaleUp my-auto">
        {/* Modal Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md px-6 py-4 border-b border-gray-200 flex items-center justify-between z-20 rounded-t-3xl">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-[#00a854] flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-gray-900">Cập Nhật Hồ Sơ</h2>
              <p className="text-xs text-gray-500">Chỉnh sửa thông tin cá nhân và xác thực danh tính</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          <EditProfileForm
            onSuccess={() => {
              if (onSuccess) onSuccess();
              onClose();
            }}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  );
};
