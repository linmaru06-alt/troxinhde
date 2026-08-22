import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
  Code,
  RotateCcw,
  CheckCircle2,
  Users,
  Building2,
  Home,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';

export const DebugPage: React.FC = () => {
  // Production protection: automatically block debug dashboard in production or unless VITE_ENABLE_DEBUG=true
  if (import.meta.env.PROD || import.meta.env.VITE_ENABLE_DEBUG !== 'true') {
    return <Navigate to="/" replace />;
  }

  const {
    currentUser,
    rooms,
    buildings,
    roommates,
    marketplaceItems,
    notifications,
    threads,
    savedRoomIds,
    loginAsRole,
    resetAllData,
  } = useAppStore();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner */}
      <div className="bg-gray-900 rounded-3xl p-6 sm:p-8 text-white space-y-3">
        <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
          <Code className="w-5 h-5" />
          <span>Bảng Điều Khiển QA & Debug Dành Cho Lập Trình Viên</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black">Kiểm Thử Toàn Diện Luồng Trọ Xinh</h1>
        <p className="text-xs text-gray-300">
          Chuyển đổi vai trò người dùng (Role Switcher), kiểm tra dữ liệu LocalStorage và Reset dữ liệu ban đầu.
        </p>

        <div className="pt-2">
          <Button
            variant="destructive"
            size="md"
            onClick={resetAllData}
            leftIcon={<RotateCcw className="w-4 h-4" />}
          >
            Reset Dữ Liệu Demo Ban Đầu (Reseed)
          </Button>
        </div>
      </div>

      {/* Role Switcher */}
      <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-gray-900">1. Chuyển Đổi Nhanh Vai Trò (Active Role):</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={() => loginAsRole('user')}
            className={`p-4 rounded-2xl border text-left transition ${
              currentUser?.role === 'user'
                ? 'border-[#006d37] bg-emerald-50 text-[#006d37] font-bold shadow-xs'
                : 'border-gray-200 hover:bg-gray-50 text-gray-700'
            }`}
          >
            <div className="text-sm">👤 Người Thuê</div>
            <span className="text-[11px] text-gray-400 font-normal">Nguyễn Minh Anh</span>
          </button>

          <button
            onClick={() => loginAsRole('owner')}
            className={`p-4 rounded-2xl border text-left transition ${
              currentUser?.role === 'owner'
                ? 'border-[#006d37] bg-emerald-50 text-[#006d37] font-bold shadow-xs'
                : 'border-gray-200 hover:bg-gray-50 text-gray-700'
            }`}
          >
            <div className="text-sm">🏢 Chủ Trọ</div>
            <span className="text-[11px] text-gray-400 font-normal">Trần Quốc Tuấn</span>
          </button>

          <button
            onClick={() => loginAsRole('admin')}
            className={`p-4 rounded-2xl border text-left transition ${
              currentUser?.role === 'admin'
                ? 'border-[#006d37] bg-emerald-50 text-[#006d37] font-bold shadow-xs'
                : 'border-gray-200 hover:bg-gray-50 text-gray-700'
            }`}
          >
            <div className="text-sm">🛡️ Ban Quản Trị</div>
            <span className="text-[11px] text-gray-400 font-normal">Admin Trọ Xinh</span>
          </button>

          <button
            onClick={() => loginAsRole('guest')}
            className={`p-4 rounded-2xl border text-left transition ${
              !currentUser
                ? 'border-[#006d37] bg-emerald-50 text-[#006d37] font-bold shadow-xs'
                : 'border-gray-200 hover:bg-gray-50 text-gray-700'
            }`}
          >
            <div className="text-sm">🌐 Khách Vãng Lai</div>
            <span className="text-[11px] text-gray-400 font-normal">Chưa đăng nhập</span>
          </button>
        </div>
      </div>

      {/* Route Quick Test Map */}
      <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-gray-900">2. Danh Mục Các Đường Dẫn Đã Triển Khai (Route Map):</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
          {[
            { to: '/', label: 'Trang chủ (Landing)' },
            { to: '/tim-kiem', label: 'Tìm kiếm phòng + Lọc' },
            { to: '/ban-do', label: 'Bản đồ phòng trọ' },
            { to: '/roommate', label: 'Tìm bạn ở ghép' },
            { to: '/cho-do-cu', label: 'Chợ đồ cũ sinh viên' },
            { to: '/ve-chung-toi/kiem-duyet', label: 'Quy trình kiểm duyệt' },
            { to: '/dang-nhap', label: 'Đăng nhập' },
            { to: '/dang-ky', label: 'Đăng ký tài khoản' },
            { to: '/xac-thuc-otp', label: 'Xác thực số điện thoại' },
            { to: '/quen-mat-khau', label: 'Quên mật khẩu' },
            { to: '/onboarding', label: 'Onboarding người thuê' },
            { to: '/toi', label: 'Hồ sơ người thuê' },
            { to: '/da-luu', label: 'Phòng đã lưu' },
            { to: '/thong-bao', label: 'Trung tâm thông báo' },
            { to: '/tin-nhan', label: 'Hộp thư tin nhắn' },
            { to: '/chu-tro/onboarding', label: 'Onboarding chủ trọ' },
            { to: '/chu-tro', label: 'Dashboard chủ trọ' },
            { to: '/chu-tro/toa-nha', label: 'Danh sách tòa nhà' },
            { to: '/chu-tro/toa-nha/tao-moi', label: 'Tạo hồ sơ tòa nhà' },
            { to: '/chu-tro/phong/tao-moi', label: 'Đăng phòng trọ mới' },
            { to: '/admin', label: 'Duyệt tin đăng admin' },
            { to: '/admin/nguoi-dung', label: 'Quản lý người dùng' },
            { to: '/admin/thong-ke', label: 'Báo cáo thống kê' },
          ].map((r) => (
            <Link
              key={r.to}
              to={r.to}
              className="p-2.5 bg-gray-50 hover:bg-emerald-50 hover:text-[#006d37] rounded-xl border border-gray-100 font-semibold flex items-center justify-between transition"
            >
              <span>{r.label}</span>
              <span className="text-[10px] text-gray-400 font-mono">{r.to}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};
