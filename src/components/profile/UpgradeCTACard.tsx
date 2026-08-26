import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Building2, ArrowRight } from 'lucide-react';

export const UpgradeCTACard: React.FC = () => {
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

      <Link to="/nang-cap-chu-tro" className="shrink-0 w-full sm:w-auto">
        <Button variant="primary" size="sm" className="w-full" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
          Đăng Ký Làm Chủ Trọ
        </Button>
      </Link>
    </div>
  );
};
