import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { Sparkles, X } from 'lucide-react';

export const GuestPromptBanner: React.FC = () => {
  const { currentUser } = useAppStore();
  const location = useLocation();
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  useEffect(() => {
    const dismissed = localStorage.getItem('troxinh_guest_banner_dismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, []);

  // Only render if guest and not dismissed
  if (currentUser || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('troxinh_guest_banner_dismissed', 'true');
  };

  const returnUrl = encodeURIComponent(location.pathname + location.search);

  return (
    <div className="relative bg-[#EFF6FF] border-l-3 border-blue-500 rounded-2xl p-3.5 sm:p-4 mb-4 flex items-center justify-between gap-3 shadow-xs animate-fadeIn">
      <div className="flex items-center gap-2.5 text-xs text-blue-900 leading-snug">
        <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
        <div>
          <span>Đăng ký miễn phí để lưu phòng yêu thích và nhắn tin trực tiếp với chủ trọ. </span>
          <Link
            to={`/dang-ky?returnUrl=${returnUrl}`}
            className="font-bold text-blue-700 hover:underline inline-flex items-center gap-0.5 ml-1"
          >
            Đăng ký ngay →
          </Link>
          <span className="mx-1.5 text-blue-300">|</span>
          <Link
            to={`/dang-nhap?returnUrl=${returnUrl}`}
            className="text-blue-600 hover:underline font-medium"
          >
            Đã có tài khoản? Đăng nhập
          </Link>
        </div>
      </div>

      <button
        onClick={handleDismiss}
        className="text-blue-400 hover:text-blue-700 p-1 rounded-lg transition shrink-0"
        title="Đóng thông báo"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
