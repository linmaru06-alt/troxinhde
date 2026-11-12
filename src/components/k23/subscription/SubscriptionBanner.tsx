import React from 'react';
import { Link } from 'react-router-dom';
import { useK23Subscription } from '../../../hooks/queries/useK23Subscription';
import { Sparkles, AlertTriangle, AlertCircle, ArrowRight, ShieldAlert } from 'lucide-react';

export const SubscriptionBanner: React.FC = () => {
  const {
    isTrial,
    isGracePeriod,
    isSuspended,
    daysLeft,
    canAddRoom,
    roomCount,
    maxRooms,
    canAddBuilding,
    buildingCount,
    maxBuildings,
  } = useK23Subscription();

  // 1. Quá hạn ân hạn -> Bị tạm ngừng
  if (isSuspended) {
    return (
      <div className="bg-red-600 text-white px-4 py-3 rounded-xl mb-6 shadow-md flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-700 rounded-lg">
            <ShieldAlert className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-sm">Gói quản lý phòng đã tạm ngừng</p>
            <p className="text-xs text-red-100">
              Bạn chỉ có thể xem dữ liệu cũ. Chức năng tạo phòng, chốt điện nước và xuất hóa đơn mới đã bị khóa.
            </p>
          </div>
        </div>
        <Link
          to="/chu-tro/goi-dich-vu"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-red-700 text-xs font-bold rounded-lg hover:bg-red-50 transition-colors shadow-sm shrink-0"
        >
          Kích hoạt lại ngay <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  // 2. Đang trong 7 ngày ân hạn (Grace Period)
  if (isGracePeriod) {
    return (
      <div className="bg-amber-500 text-white px-4 py-3 rounded-xl mb-6 shadow-md flex flex-col sm:flex-row items-center justify-between gap-3 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-600 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-semibold text-sm">Gói dịch vụ đã hết hạn (Đang trong 7 ngày ân hạn)</p>
            <p className="text-xs text-amber-100">
              Vui lòng gia hạn gói để tránh bị gián đoạn việc chốt số và thu tiền trọ cuối tháng.
            </p>
          </div>
        </div>
        <Link
          to="/chu-tro/goi-dich-vu"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-white text-amber-800 text-xs font-bold rounded-lg hover:bg-amber-50 transition-colors shadow-sm shrink-0"
        >
          Gia hạn ngay <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  // 3. Đang dùng thử miễn phí 30 ngày (Free Trial)
  if (isTrial) {
    return (
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-primary-900 text-white px-4 py-3 rounded-xl mb-6 shadow-sm border border-indigo-700/50 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-700/60 rounded-lg border border-indigo-500/30">
            <Sparkles className="w-5 h-5 text-amber-300 animate-spin" style={{ animationDuration: '6s' }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">Dùng thử Miễn phí Gói Tiêu Chuẩn (0 Xu)</span>
              <span className="text-[11px] font-bold bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full">
                Còn {daysLeft} ngày
              </span>
            </div>
            <p className="text-xs text-indigo-200 mt-0.5">
              Gói Tiêu Chuẩn • tối đa 35 phòng &amp; 3 tòa nhà • Trả năm đóng 10 tặng 2.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/chu-tro/goi-dich-vu"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold rounded-lg transition-colors shadow-sm"
          >
            Nâng cấp gói <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  // 4. Đạt giới hạn phòng
  if (!canAddRoom && maxRooms !== -1) {
    return (
      <div className="bg-orange-50 border border-orange-200 text-orange-900 px-4 py-3 rounded-xl mb-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="font-semibold text-sm">Đã đạt tối đa hạn mức phòng ({roomCount}/{maxRooms} phòng)</p>
            <p className="text-xs text-orange-700">
              Bạn cần nâng cấp gói K23 để tiếp tục thêm phòng mới vào hệ thống quản lý.
            </p>
          </div>
        </div>
        <Link
          to="/chu-tro/goi-dich-vu"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold rounded-lg transition-colors shrink-0"
        >
          Nâng cấp gói ngay <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    );
  }

  // 5. Đạt giới hạn tòa nhà
  if (!canAddBuilding && maxBuildings !== -1) {
    return (
      <div className="bg-orange-50 border border-orange-200 text-orange-900 px-4 py-3 rounded-xl mb-6 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <p className="font-semibold text-sm">Đã đạt tối đa hạn mức tòa nhà ({buildingCount}/{maxBuildings} tòa nhà)</p>
            <p className="text-xs text-orange-700">
              Nâng cấp lên gói Tiêu Chuẩn (3 tòa nhà) hoặc gói Chuỗi (không giới hạn) để thêm cơ sở mới.
            </p>
          </div>
        </div>
        <Link
          to="/chu-tro/goi-dich-vu"
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold rounded-lg transition-colors shrink-0"
        >
          Nâng cấp gói ngay <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    );
  }

  return null;
};

