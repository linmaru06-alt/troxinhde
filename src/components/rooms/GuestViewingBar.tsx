import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { Button } from '../ui/Button';
import { X, Sparkles } from 'lucide-react';

export const GuestViewingBar: React.FC = () => {
  const { currentUser } = useAppStore();
  const location = useLocation();
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  useEffect(() => {
    // Only check scroll if guest and not dismissed this session
    const sessionDismissed = sessionStorage.getItem('troxinh_guest_viewing_bar_dismissed');
    if (sessionDismissed === 'true' || currentUser) return;

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight > 0 && scrollY / docHeight > 0.65) {
        setIsVisible(true);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [currentUser]);

  if (currentUser || !isVisible || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('troxinh_guest_viewing_bar_dismissed', 'true');
  };

  const returnUrl = encodeURIComponent(location.pathname + location.search);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/98 backdrop-blur-md border-t border-gray-200 shadow-2xl p-3 sm:p-4 animate-slideUp">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-100 text-[#006d37] rounded-xl hidden sm:block">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-gray-900 leading-tight">
              Bạn quan tâm đến phòng trọ này?
            </h4>
            <p className="text-[11px] text-gray-500 hidden sm:block">
              Tạo tài khoản miễn phí để liên hệ trực tiếp chủ nhà và bảo vệ tiền cọc.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link to={`/dang-nhap?returnUrl=${returnUrl}`} className="text-xs font-semibold text-gray-600 hover:text-gray-900 hidden sm:block">
            Đăng nhập
          </Link>
          <Link to={`/dang-ky?returnUrl=${returnUrl}`}>
            <Button variant="primary" size="sm">
              Đăng Ký Để Liên Hệ
            </Button>
          </Link>
          <button
            onClick={handleDismiss}
            className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg"
            title="Đóng thanh xem"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
