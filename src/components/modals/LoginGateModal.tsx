import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '../ui/Button';
import { useUIStore } from '../../store/useUIStore';
import { Heart, MessageSquare, Calendar, PlusCircle, LogIn, Sparkles, X } from 'lucide-react';

export type LoginGateTrigger = 'save' | 'message' | 'booking' | 'post' | 'generic';

interface LoginGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  trigger?: LoginGateTrigger;
}

export const LoginGateModal: React.FC<LoginGateModalProps> = ({
  isOpen,
  onClose,
  trigger = 'generic',
}) => {
  const location = useLocation();
  const { openAuthModal } = useUIStore();

  if (!isOpen) return null;

  const currentPath = location.pathname + location.search;

  const triggerDetails = {
    save: {
      icon: Heart,
      color: 'bg-rose-50 text-rose-600',
      title: 'Đăng Nhập Để Lưu Phòng Yêu Thích',
      body: 'Lưu lại các phòng trọ ưng ý để dễ dàng so sánh giá, tiện ích và xem lại bất cứ lúc nào.',
    },
    message: {
      icon: MessageSquare,
      color: 'bg-blue-50 text-[#006492]',
      title: 'Đăng Nhập Để Nhắn Tin Trực Tiếp',
      body: 'Trò chuyện thời gian thực với chủ trọ hoặc bạn cùng phòng, nhận phản hồi chỉ trong vài phút.',
    },
    booking: {
      icon: Calendar,
      color: 'bg-amber-50 text-[#904d00]',
      title: 'Đăng Nhập Để Đặt Lịch Xem Phòng',
      body: 'Chọn khung giờ rảnh của bạn và nhận xác nhận lịch hẹn trực tiếp từ chủ nhà.',
    },
    post: {
      icon: PlusCircle,
      color: 'bg-emerald-50 text-[#006d37]',
      title: 'Đăng Nhập Để Đăng Tin',
      body: 'Đăng tin tìm bạn cùng phòng hoặc thanh lý đồ cũ miễn phí tiếp cận hàng chục ngàn sinh viên.',
    },
    generic: {
      icon: Sparkles,
      color: 'bg-emerald-50 text-[#006d37]',
      title: 'Đăng Nhập Để Tiếp Tục',
      body: 'Tham gia cộng đồng Trọ Xinh để trải nghiệm trọn vẹn các tính năng an tâm.',
    },
  }[trigger];

  const Icon = triggerDetails.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-gray-100 text-center space-y-5 animate-scaleUp">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icon */}
        <div className={`w-16 h-16 ${triggerDetails.color} rounded-2xl flex items-center justify-center mx-auto shadow-xs`}>
          <Icon className="w-8 h-8" />
        </div>

        {/* Text */}
        <div className="space-y-1.5">
          <h3 className="text-lg font-black text-gray-900 leading-snug">{triggerDetails.title}</h3>
          <p className="text-xs text-gray-500 leading-relaxed">{triggerDetails.body}</p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              openAuthModal('login');
            }}
            className="w-full py-3 px-4 bg-[#00a854] hover:bg-[#009249] text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition shadow-xs cursor-pointer"
          >
            <LogIn className="w-4 h-4" />
            <span>Đăng Nhập Ngay</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              openAuthModal('register');
            }}
            className="w-full py-2.5 px-4 bg-gray-50 hover:bg-gray-100 text-gray-700 font-bold rounded-2xl border border-gray-200 text-xs transition cursor-pointer"
          >
            <span>Đăng Ký Tài Khoản Miễn Phí</span>
          </button>
        </div>

        {/* Continue browsing */}
        <div>
          <button
            onClick={onClose}
            className="text-xs text-gray-400 hover:text-gray-700 font-medium transition"
          >
            Tiếp tục xem phòng →
          </button>
        </div>
      </div>
    </div>
  );
};
