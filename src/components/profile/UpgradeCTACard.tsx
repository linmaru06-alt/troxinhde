import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { Button } from '../ui/Button';
import { Building2, ArrowRight, Clock } from 'lucide-react';
import { validateSocialUrl } from './EditProfileForm';

export const UpgradeCTACard: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, showToast } = useAppStore();

  const isPendingHost = currentUser?.ownerApplicationStatus === 'pending';

  const handleUpgrade = () => {
    if (isPendingHost) {
      showToast('Hồ sơ của bạn đang được xét duyệt', 'Quản trị viên đang thẩm định trong vòng 24h.', 'info');
      return;
    }

    if (!currentUser) {
      navigate('/dang-nhap?returnUrl=/nang-cap-chu-tro');
      return;
    }

    const hasPhone = Boolean(currentUser.phone && currentUser.phone.replace(/\D/g, '').length >= 9);
    const hasCard = Boolean(currentUser.studentCardUrl);
    const hasSocial = Boolean(currentUser.socialLink && validateSocialUrl(currentUser.socialLink));

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
    <div className={`rounded-2xl p-4 border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs transition-all ${
      isPendingHost
        ? 'bg-amber-50/80 border-amber-200'
        : 'bg-gradient-to-r from-blue-50 to-emerald-50 border-blue-100'
    }`}>
      <div className="flex items-center gap-3">
        <div className={`p-2.5 text-white rounded-xl shadow-xs shrink-0 ${isPendingHost ? 'bg-amber-600' : 'bg-blue-600'}`}>
          {isPendingHost ? <Clock className="w-5 h-5 animate-pulse" /> : <Building2 className="w-5 h-5" />}
        </div>
        <div>
          <h4 className="text-xs font-bold text-gray-900">
            {isPendingHost ? 'Đang xét duyệt hồ sơ Chủ Trọ' : 'Bạn có phòng muốn cho thuê?'}
          </h4>
          <p className="text-[11px] text-gray-500">
            {isPendingHost
              ? 'Quản trị viên đang kiểm tra tính xác thực trước khi cấp quyền trong 24h.'
              : 'Nâng cấp lên Chủ trọ — miễn phí, kiểm duyệt và kích hoạt trong 24h.'}
          </p>
        </div>
      </div>

      <div className="shrink-0 w-full sm:w-auto">
        <Button
          variant={isPendingHost ? 'outline' : 'primary'}
          size="sm"
          disabled={isPendingHost}
          className={`w-full ${isPendingHost ? 'bg-amber-100 text-amber-800 border-amber-300 cursor-not-allowed' : 'cursor-pointer'}`}
          rightIcon={isPendingHost ? <Clock className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
          onClick={handleUpgrade}
        >
          {isPendingHost ? 'Đang chờ duyệt hồ sơ' : 'Đăng Ký Làm Chủ Trọ'}
        </Button>
      </div>
    </div>
  );
};
