import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Modal } from '../../ui/Modal';
import { Button } from '../../ui/Button';
import { Crown, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import { useK23Subscription } from '../../../hooks/queries/useK23Subscription';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  returnUrl?: string;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  title = 'Bạn đã đạt giới hạn của gói quản lý K23 hiện tại',
  message = 'Để tiếp tục thêm phòng trọ, tòa nhà mới và sử dụng các tính năng vận hành nâng cao, vui lòng nâng cấp gói K23.',
  returnUrl,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentPlan, roomCount, maxRooms, buildingCount, maxBuildings } = useK23Subscription();

  const handleUpgrade = () => {
    onClose();
    const targetReturn = returnUrl || `${location.pathname}${location.search}`;
    navigate(`/chu-tro/goi-dich-vu?returnUrl=${encodeURIComponent(targetReturn)}`);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="">
      <div className="text-center pt-2 pb-4">
        <div className="w-14 h-14 bg-gradient-to-tr from-amber-400 to-amber-200 text-amber-950 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/20">
          <Crown className="w-8 h-8" />
        </div>

        <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
        <p className="text-sm text-slate-600 max-w-md mx-auto mb-6">{message}</p>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left mb-6">
          <div className="flex flex-wrap justify-between items-center gap-2 text-sm font-medium text-slate-700 mb-2">
            <span>Gói đang dùng: <strong className="text-primary-700">{currentPlan?.name || 'Gói Cơ Bản'}</strong></span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                {roomCount} / {maxRooms === -1 ? '∞' : maxRooms} phòng
              </span>
              <span className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                {buildingCount} / {maxBuildings === -1 ? '∞' : maxBuildings} tòa nhà
              </span>
            </div>
          </div>

          <div className="space-y-1.5 text-xs text-slate-600 mt-3 pt-3 border-t border-slate-200">
            <div className="flex items-center gap-2 text-slate-800 font-medium">
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
              <span><strong>Gói Tiêu Chuẩn (129 Xu/tháng)</strong>: Tối đa 35 phòng & 3 tòa nhà</span>
            </div>
            <div className="flex items-center gap-2 text-slate-800 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span><strong>Gói Chuỗi (299 Xu/tháng)</strong>: Không giới hạn phòng & tòa nhà</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Để sau
          </Button>
          <Button
            onClick={handleUpgrade}
            className="w-full sm:w-auto bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-700 hover:to-indigo-700 text-white font-bold shadow-md shadow-primary-500/20"
          >
            Xem bảng giá & Nâng cấp <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </div>
      </div>
    </Modal>
  );
};

