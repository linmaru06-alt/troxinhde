import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { LogIn, UserPlus } from 'lucide-react';

export interface LoginPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string;
}

export const LoginPromptModal: React.FC<LoginPromptModalProps> = ({
  isOpen,
  onClose,
  message = 'Bạn cần đăng nhập tài khoản để thực hiện thao tác này.',
}) => {
  const navigate = useNavigate();

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Yêu Cầu Đăng Nhập" maxWidth="sm">
      <div className="py-2 text-center space-y-4">
        <div className="w-14 h-14 bg-emerald-50 text-[#006d37] rounded-full flex items-center justify-center mx-auto">
          <LogIn className="w-7 h-7" />
        </div>
        <p className="text-sm text-gray-600 leading-relaxed">{message}</p>

        <div className="flex flex-col gap-2 pt-2">
          <Button
            variant="primary"
            size="md"
            className="w-full"
            leftIcon={<LogIn className="w-4 h-4" />}
            onClick={() => {
              onClose();
              navigate('/dang-nhap');
            }}
          >
            Đăng Nhập Ngay
          </Button>
          <Button
            variant="outline"
            size="md"
            className="w-full"
            leftIcon={<UserPlus className="w-4 h-4" />}
            onClick={() => {
              onClose();
              navigate('/dang-ky');
            }}
          >
            Đăng Ký Tài Khoản Mới
          </Button>
        </div>
      </div>
    </Modal>
  );
};
