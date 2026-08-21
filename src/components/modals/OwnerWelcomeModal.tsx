import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Building2, CheckCircle2, ArrowRight, Home, Sparkles, X } from 'lucide-react';

interface OwnerWelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
  ownerName: string;
}

export const OwnerWelcomeModal: React.FC<OwnerWelcomeModalProps> = ({
  isOpen,
  onClose,
  ownerName,
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleStart = () => {
    onClose();
    navigate('/chu-tro/toa-nha/tao-moi');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-emerald-100 text-center space-y-6 animate-scaleUp overflow-hidden">
        {/* Decorative Confetti Background Dots */}
        <div className="absolute inset-0 pointer-events-none opacity-40 overflow-hidden">
          <div className="absolute top-2 left-4 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-bounce" />
          <div className="absolute top-6 right-8 w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <div className="absolute top-12 left-10 w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          <div className="absolute top-4 right-16 w-3 h-3 rounded-full bg-rose-400 animate-bounce" />
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Trophy / House Icon */}
        <div className="relative w-20 h-20 bg-emerald-50 text-[#006d37] rounded-3xl flex items-center justify-center mx-auto shadow-md">
          <Building2 className="w-10 h-10" />
          <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#006d37] text-white rounded-full flex items-center justify-center ring-2 ring-white shadow-xs">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        {/* Heading & Greeting */}
        <div className="space-y-1.5">
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 leading-snug">
            Chào mừng {ownerName} vào TroXinh Chủ trọ! 🎉
          </h2>
          <p className="text-xs text-gray-600">
            Hồ sơ đối tác của bạn đã được Ban Quản Trị xét duyệt thành công.
          </p>
        </div>

        {/* 3 Quick-start steps */}
        <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-100 text-left space-y-2.5 text-xs text-emerald-950">
          <div className="font-bold flex items-center gap-1.5 text-xs uppercase tracking-wider text-[#006d37]">
            <Sparkles className="w-3.5 h-3.5" />
            3 bước bắt đầu nhanh:
          </div>
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-[#006d37] text-white flex items-center justify-center text-[10px] font-bold shrink-0">1</span>
              <span>Tạo hồ sơ tòa nhà hoặc khu trọ đầu tiên</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-[#006d37] text-white flex items-center justify-center text-[10px] font-bold shrink-0">2</span>
              <span>Thêm thông tin phòng, giá điện nước và ảnh thực tế</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-5 h-5 rounded-full bg-[#006d37] text-white flex items-center justify-center text-[10px] font-bold shrink-0">3</span>
              <span>Gửi kiểm duyệt — phòng sẽ hiển thị công khai trong 24h</span>
            </div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="space-y-2 pt-2">
          <Button
            variant="primary"
            size="lg"
            className="w-full"
            onClick={handleStart}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Tạo Tòa Nhà Đầu Tiên Ngay
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="w-full text-gray-500 hover:text-gray-900"
            onClick={onClose}
          >
            Để sau, vào Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};
