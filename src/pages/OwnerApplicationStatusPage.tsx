import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Building2,
  ShieldCheck,
  ArrowRight,
  Home,
  RotateCcw,
} from 'lucide-react';

export const OwnerApplicationStatusPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAppStore();

  const status = currentUser?.ownerApplicationStatus || 'none';

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 space-y-8 animate-fadeIn">
      {/* Pending State */}
      {status === 'pending' && (
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-amber-200 shadow-xl text-center space-y-6">
          <div className="w-20 h-20 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto shadow-xs animate-pulse">
            <Clock className="w-10 h-10" />
          </div>

          <div className="space-y-1.5">
            <Badge variant="pending" size="md">Đang Xét Duyệt (24h)</Badge>
            <h1 className="text-2xl font-black text-gray-900">Hồ Sơ Của Bạn Đang Được Thẩm Định!</h1>
            <p className="text-xs sm:text-sm text-gray-600 max-w-md mx-auto leading-relaxed">
              Ban Quản Trị Trọ Xinh đang kiểm tra số CCCD và thông tin cơ sở nhà trọ của bạn.
            </p>
          </div>

          <div className="p-4 bg-amber-50/70 rounded-2xl border border-amber-100 text-left text-xs space-y-2 text-amber-900">
            <h4 className="font-bold flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-amber-700" />
              Lưu ý quan trọng:
            </h4>
            <p>• Thời gian phản hồi: trong vòng <strong>24 giờ làm việc</strong>.</p>
            <p>• Ban Quản Trị có thể liên hệ số {currentUser?.phone} để đối chiếu thông tin.</p>
          </div>

          <div className="flex justify-center gap-3">
            <Link to="/toi">
              <Button variant="outline" size="md">
                Về Trang Cá Nhân
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Approved State */}
      {(status === 'approved' || currentUser?.role === 'owner') && (
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-emerald-200 shadow-xl text-center space-y-6">
          <div className="w-20 h-20 bg-emerald-50 text-[#006d37] rounded-full flex items-center justify-center mx-auto shadow-xs">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div className="space-y-1.5">
            <Badge variant="verified" size="md">Đã Phê Duyệt Thành Công</Badge>
            <h1 className="text-2xl font-black text-gray-900">Chúc Mừng Bạn Đã Là Chủ Trọ Đối Tác!</h1>
            <p className="text-xs sm:text-sm text-gray-600 max-w-md mx-auto leading-relaxed">
              Quyền quản trị tòa nhà và đăng tin phòng trọ đã được kích hoạt trên tài khoản của bạn.
            </p>
          </div>

          <div className="flex justify-center gap-3">
            <Link to="/chu-tro/toa-nha/tao-moi">
              <Button variant="primary" size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Đăng Phòng Đầu Tiên Ngay
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Rejected State */}
      {status === 'rejected' && (
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-rose-200 shadow-xl text-center space-y-6">
          <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
            <XCircle className="w-10 h-10" />
          </div>

          <div className="space-y-1.5">
            <Badge variant="rejected" size="md">Hồ Sơ Chưa Được Duyệt</Badge>
            <h1 className="text-2xl font-black text-gray-900">Đơn Đăng Ký Chưa Được Chấp Thuận</h1>
            <p className="text-xs sm:text-sm text-rose-700 bg-rose-50 p-3 rounded-2xl max-w-md mx-auto leading-relaxed">
              Lý do: {currentUser?.ownerApplicationRejectionReason || 'Thông tin giấy tờ hoặc địa chỉ chưa đầy đủ.'}
            </p>
          </div>

          <div className="flex justify-center gap-3">
            <Link to="/nang-cap-chu-tro">
              <Button variant="primary" size="md" leftIcon={<RotateCcw className="w-4 h-4" />}>
                Chỉnh Sửa & Gửi Lại Đơn
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* None State */}
      {status === 'none' && (
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-gray-200 text-center space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Bạn Chưa Nộp Đơn Nâng Cấp</h2>
          <p className="text-xs text-gray-500">
            Nộp đơn ngay để bắt đầu đăng tin và quản lý tòa nhà trên Trọ Xinh.
          </p>
          <Link to="/nang-cap-chu-tro">
            <Button variant="primary" size="md">
              Nộp Đơn Ngay
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
};
