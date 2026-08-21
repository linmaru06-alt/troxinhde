import React from 'react';
import { Link } from 'react-router-dom';
import { User } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { UpgradeCTACard } from './UpgradeCTACard';
import {
  CheckCircle2,
  Lock,
  Clock,
  XCircle,
  Building2,
  ShieldCheck,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface RolePermissionSectionProps {
  user: User;
}

export const RolePermissionSection: React.FC<RolePermissionSectionProps> = ({ user }) => {
  const role = user.role;
  const status = user.ownerApplicationStatus || 'none';

  // Permission item helper
  const PermissionItem = ({ allowed, label }: { allowed: boolean; label: string }) => (
    <div className={`flex items-center gap-2 p-2 rounded-xl text-xs font-semibold ${
      allowed ? 'text-gray-800 bg-gray-50' : 'text-gray-400 bg-gray-50/50 line-through'
    }`}>
      {allowed ? (
        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
      ) : (
        <Lock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
      )}
      <span>{label}</span>
    </div>
  );

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
        <div>
          <h3 className="text-base font-bold text-gray-900">Vai Trò & Quyền Hạn Tài Khoản</h3>
          <p className="text-xs text-gray-500">Mức độ phân quyền trên nền tảng Trọ Xinh</p>
        </div>

        <div>
          {role === 'owner' ? (
            <Badge variant="verified" size="md">🏢 Chủ Trọ Đối Tác</Badge>
          ) : role === 'admin' ? (
            <Badge variant="primary" size="md">🛡️ Ban Quản Trị</Badge>
          ) : status === 'pending' ? (
            <Badge variant="pending" size="md">⏳ Đang Xét Duyệt Chủ Trọ</Badge>
          ) : status === 'rejected' ? (
            <Badge variant="rejected" size="md">❌ Đơn Bị Từ Chối</Badge>
          ) : (
            <Badge variant="available" size="md">👤 Người Dùng / Người Thuê</Badge>
          )}
        </div>
      </div>

      {/* CASE 1: Standard User (status = 'none') */}
      {role === 'user' && status === 'none' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <PermissionItem allowed label="Tìm và xem phòng trọ" />
            <PermissionItem allowed label="Lưu phòng yêu thích" />
            <PermissionItem allowed label="Nhắn tin với chủ trọ" />
            <PermissionItem allowed label="Đặt lịch xem phòng" />
            <PermissionItem allowed label="Tìm bạn cùng phòng" />
            <PermissionItem allowed label="Mua bán đồ cũ sinh viên" />
            <PermissionItem allowed={false} label="Đăng phòng cho thuê" />
            <PermissionItem allowed={false} label="Quản lý tòa nhà" />
          </div>

          <UpgradeCTACard />
        </div>
      )}

      {/* CASE 2: User Pending Owner Approval */}
      {role === 'user' && status === 'pending' && (
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-2">
            <div className="font-bold flex items-center gap-1.5 text-amber-800 text-sm">
              <Clock className="w-4 h-4 text-amber-600 animate-spin" />
              Đơn đăng ký Chủ Trọ đang được xét duyệt
            </div>
            <p>Hồ sơ được gửi ngày: <strong>{new Date().toLocaleDateString('vi-VN')}</strong></p>
            <p>Dự kiến phản hồi từ Ban Quản Trị trong vòng <strong>24 giờ làm việc</strong>.</p>
            <div className="pt-1">
              <Link
                to="/nang-cap-chu-tro/trang-thai"
                className="font-bold text-amber-800 hover:underline inline-flex items-center gap-1"
              >
                Xem chi tiết trạng thái đơn đăng ký →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* CASE 3: User Rejected */}
      {role === 'user' && status === 'rejected' && (
        <div className="space-y-4">
          <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 text-xs text-rose-900 space-y-2">
            <div className="font-bold flex items-center gap-1.5 text-rose-700 text-sm">
              <XCircle className="w-4 h-4 text-rose-600" />
              Đơn đăng ký Chủ Trọ chưa được chấp thuận
            </div>
            <p>Lý do: {user.ownerApplicationRejectionReason || 'Thông tin giấy tờ hoặc CCCD chưa rõ ràng.'}</p>
            <div className="pt-2">
              <Link to="/nang-cap-chu-tro">
                <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                  Gửi Lại Đơn Đăng Ký
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* CASE 4: Approved Owner */}
      {role === 'owner' && (
        <div className="space-y-4">
          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#006d37]" />
                Đã xác minh Đối Tác Chủ Trọ bởi TroXinh
              </h4>
              <p className="text-[11px] text-emerald-700">
                Toàn bộ quyền đăng phòng, tạo tòa nhà và quản lý tin nhắn khách thuê đã được mở khóa.
              </p>
            </div>

            <Link to="/chu-tro/tong-quan">
              <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                Đến Quản Lý Chủ Trọ
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
