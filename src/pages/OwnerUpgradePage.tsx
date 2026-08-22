import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import {
  Building2,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  FileCheck,
  Phone,
  Lock,
  ArrowLeft,
  XCircle,
} from 'lucide-react';

export const OwnerUpgradePage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, submitOwnerApplication, showToast } = useAppStore();

  const [buildingName, setBuildingName] = useState<string>('Nhà Trọ Sinh Viên Xanh');
  const [address, setAddress] = useState<string>('Số 18 Ngõ 165 Cầu Giấy, P. Dịch Vọng');
  const [district, setDistrict] = useState<string>('Quận Cầu Giấy');
  const [totalRooms, setTotalRooms] = useState<number>(12);
  const [cccdNumber, setCccdNumber] = useState<string>('079098001234');
  const [legalDocsNote, setLegalDocsNote] = useState<string>(
    'Đã có giấy phép đăng ký kinh doanh và đạt thẩm duyệt PCCC năm 2025.'
  );
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  // If not logged in -> redirect to login
  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto my-16 p-6 bg-white rounded-3xl border border-gray-200 text-center space-y-4">
        <div className="w-14 h-14 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto">
          <Lock className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-gray-900">Yêu Cầu Đăng Nhập</h2>
        <p className="text-xs text-gray-500">
          Bạn cần đăng nhập tài khoản trước khi gửi hồ sơ đăng ký làm đối tác chủ trọ.
        </p>
        <Link to="/dang-nhap?next=/nang-cap-chu-tro">
          <Button variant="primary" size="md" className="w-full">
            Đăng Nhập Ngay
          </Button>
        </Link>
      </div>
    );
  }

  // If already owner -> show owner status and link to dashboard
  if (currentUser.role === 'owner') {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white rounded-3xl border border-emerald-200 shadow-md text-center space-y-6 animate-fadeIn">
        <div className="w-20 h-20 bg-emerald-100 text-[#006d37] rounded-full flex items-center justify-center mx-auto shadow-xs">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <div className="space-y-1.5">
          <Badge variant="verified" size="md">Đối Tác Chủ Trọ Chính Thức</Badge>
          <h1 className="text-2xl font-black text-gray-900">Bạn Đã Có Quyền Chủ Trọ!</h1>
          <p className="text-xs text-gray-600 max-w-md mx-auto">
            Tài khoản của bạn đã được phê duyệt đầy đủ quyền quản lý tòa nhà, đăng tin phòng và tiếp cận người thuê.
          </p>
        </div>

        <div className="flex justify-center gap-3">
          <Link to="/chu-tro">
            <Button variant="primary" size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Vào Bảng Điều Khiển Quản Trị
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // If application is pending
  if (currentUser.ownerApplicationStatus === 'pending' || isSuccess) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white rounded-3xl border border-amber-200 shadow-md text-center space-y-6 animate-fadeIn">
        <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto shadow-xs animate-pulse">
          <Clock className="w-10 h-10" />
        </div>
        <div className="space-y-1.5">
          <Badge variant="pending" size="md">Đang Chờ Ban Quản Trị Phê Duyệt</Badge>
          <h1 className="text-2xl font-black text-gray-900">Hồ Sơ Của Bạn Đang Được Thẩm Định!</h1>
          <p className="text-xs text-gray-600 max-w-md mx-auto leading-relaxed">
            Chuyên viên kiểm định Trọ Xinh đang thẩm định thông tin cơ sở và số CCCD của bạn. Kết quả sẽ có trong vòng <strong>24 giờ làm việc</strong>.
          </p>
        </div>

        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-left text-xs space-y-2 text-amber-900">
          <div className="font-bold flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-amber-700" />
            Quy trình tiếp theo:
          </div>
          <p>• Ban Quản Trị sẽ liên hệ số điện thoại {currentUser.phone} để xác thực.</p>
          <p>• Sau khi được duyệt, quyền "Chủ trọ" sẽ tự động được kích hoạt trên tài khoản.</p>
        </div>

        <Link to="/toi">
          <Button variant="outline" size="md">
            Quay Về Trang Cá Nhân
          </Button>
        </Link>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!buildingName.trim() || !address.trim() || !cccdNumber.trim()) {
      showToast('Vui lòng điền đủ các trường bắt buộc', '', 'error');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      submitOwnerApplication({
        buildingName,
        address,
        district,
        totalRooms: Number(totalRooms) || 1,
        cccdNumber,
        legalDocsNote,
      });
      setIsSuccess(true);
    }, 400);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-linear-to-r from-emerald-900 via-[#006d37] to-emerald-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-xs font-semibold backdrop-blur-xs">
            <Building2 className="w-4 h-4" />
            <span>Nâng Cấp Quyền Đối Tác Chủ Trọ</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Đăng Ký Trở Thành Chủ Trọ Đối Tác Trọ Xinh
          </h1>
          <p className="text-emerald-100 text-xs sm:text-sm leading-relaxed">
            Đăng phòng miễn phí, tiếp cận 50.000+ sinh viên thuê phòng văn minh, sử dụng phần mềm quản lý tòa nhà chuyên nghiệp.
          </p>
        </div>
      </div>

      {currentUser.ownerApplicationStatus === 'rejected' && (
        <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 text-xs text-rose-800 space-y-1">
          <div className="font-bold flex items-center gap-1.5 text-rose-900">
            <XCircle className="w-4 h-4 text-rose-600" />
            Hồ sơ trước đó bị từ chối:
          </div>
          <p>{currentUser.ownerApplicationReason || 'Thông tin giấy tờ chưa rõ ràng. Vui lòng cập nhật lại bên dưới.'}</p>
        </div>
      )}

      {/* Benefits grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs space-y-1.5">
          <ShieldCheck className="w-5 h-5 text-[#006d37]" />
          <h3 className="text-xs font-bold text-gray-900">Xác Thực & Thẩm Định 100%</h3>
          <p className="text-[11px] text-gray-500">Được cấp huy hiệu Đã Kiểm Duyệt giúp lấp đầy phòng nhanh gấp 3 lần.</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs space-y-1.5">
          <TrendingUp className="w-5 h-5 text-[#006d37]" />
          <h3 className="text-xs font-bold text-gray-900">Bảng Quản Trị Tòa Nhà SaaS</h3>
          <p className="text-[11px] text-gray-500">Theo dõi phòng trống, hợp đồng và lịch xem phòng tập trung miễn phí.</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs space-y-1.5">
          <FileCheck className="w-5 h-5 text-[#006d37]" />
          <h3 className="text-xs font-bold text-gray-900">Không Thu Phí Người Thuê</h3>
          <p className="text-[11px] text-gray-500">Tạo dựng niềm tin bền vững, kết nối trực tiếp không qua trung gian.</p>
        </div>
      </div>

      {/* Application Form */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-md space-y-6">
        <div className="border-b border-gray-100 pb-4">
          <h2 className="text-lg font-bold text-gray-900">Thông Tin Khai Báo Cơ Sở Nhà Trọ</h2>
          <p className="text-xs text-gray-500">Vui lòng cung cấp thông tin chính xác để Ban Quản Trị thẩm định nhanh chóng</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Tên tòa nhà / Khu nhà trọ của bạn"
            required
            value={buildingName}
            onChange={(e) => setBuildingName(e.target.value)}
            placeholder="Ví dụ: Cụm Nhà Trọ Xanh Cơ Sở 1"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Địa chỉ chi tiết (Số nhà, Tên đường)"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Ví dụ: Số 18 Ngõ 165 Cầu Giấy, P. Dịch Vọng"
            />
            <div className="space-y-1.5 text-left">
              <label className="block text-sm font-medium text-gray-700">Khu vực / Quận</label>
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-sm"
              >
                <option value="Quận Cầu Giấy">Quận Cầu Giấy</option>
                <option value="Quận Đống Đa">Quận Đống Đa</option>
                <option value="Quận Hai Bà Trưng">Quận Hai Bà Trưng</option>
                <option value="Quận Thanh Xuân">Quận Thanh Xuân</option>
                <option value="Quận Nam Từ Liêm">Quận Nam Từ Liêm</option>
                <option value="Quận Hà Đông">Quận Hà Đông</option>
                <option value="Quận Ba Đình">Quận Ba Đình</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Số Căn cước công dân (CCCD) người đại diện"
              required
              value={cccdNumber}
              onChange={(e) => setCccdNumber(e.target.value)}
              placeholder="079098xxxxxx"
            />
            <Input
              label="Tổng số lượng phòng đang vận hành"
              type="number"
              required
              value={totalRooms}
              onChange={(e) => setTotalRooms(Number(e.target.value))}
              placeholder="12"
            />
          </div>

          <div className="space-y-1.5 text-left">
            <label className="block text-sm font-medium text-gray-700">Ghi chú về giấy tờ pháp lý / PCCC (Tùy chọn)</label>
            <textarea
              rows={3}
              value={legalDocsNote}
              onChange={(e) => setLegalDocsNote(e.target.value)}
              placeholder="Mô tả giấy phép kinh doanh, hệ thống PCCC, vân tay an ninh..."
              className="w-full rounded-xl border border-gray-300 p-3 text-sm focus:ring-2 focus:ring-[#006d37]"
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            isLoading={isSubmitting}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Gửi Hồ Sơ Xét Duyệt Lên Chủ Trọ (24h)
          </Button>
        </form>
      </div>
    </div>
  );
};
