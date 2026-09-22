import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { Button } from '../ui/Button';
import { Building2, ArrowRight } from 'lucide-react';

export const UpgradeCTACard: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, showToast } = useAppStore();

  const handleUpgrade = () => {
    if (!currentUser) {
      navigate('/dang-nhap?returnUrl=/nang-cap-chu-tro');
      return;
    }

    const hasPhone = Boolean(currentUser.phone && currentUser.phone.replace(/\D/g, '').length >= 9);
    const hasCard = Boolean(currentUser.studentCardUrl);
    const hasSocial = Boolean(currentUser.socialLink);

    if (!hasPhone || !hasCard || !hasSocial) {
      showToast(
        'Vui lòng bổ sung SĐT, Ảnh xác minh và Link MXH để đăng ký làm chủ trọ',
        'Hồ sơ chủ trọ yêu cầu đầy đủ thông tin định danh và kênh liên lạc trực tiếp.',
        'error'
      );

      // Tự động cuộn mượt mà lên form hồ sơ
      const targetInput = !hasPhone
        ? document.getElementById('user-phone')
        : !hasCard
        ? document.getElementById('user-social-link')
        : document.getElementById('user-social-link');

      if (targetInput) {
        targetInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        targetInput.focus();
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }

    navigate('/nang-cap-chu-tro');
  };

  return (
    <div className="bg-gradient-to-r from-blue-50 to-emerald-50 rounded-2xl p-4 border border-blue-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-xs shrink-0">
          <Building2 className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-gray-900">Bạn có phòng muốn cho thuê?</h4>
          <p className="text-[11px] text-gray-500">
            Nâng cấp lên Chủ trọ — miễn phí, kiểm duyệt và kích hoạt trong 24h.
          </p>
        </div>
      </div>

      <div className="shrink-0 w-full sm:w-auto">
        <Button
          variant="primary"
          size="sm"
          className="w-full cursor-pointer"
          rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
          onClick={handleUpgrade}
        >
          Đăng Ký Làm Chủ Trọ
        </Button>
      </div>
    </div>
  );
};
