import React, { useState, useEffect } from 'react';
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
  FileCheck,
  Phone,
  Lock,
  XCircle,
  Upload,
  CreditCard,
  UserCheck,
  FileText,
  Camera,
  Trash2,
  ExternalLink,
  AlertTriangle,
  Scale,
  X,
} from 'lucide-react';

const VIETNAM_BANKS = [
  { id: 'VCB', name: 'Vietcombank (Ngoại Thương Việt Nam)' },
  { id: 'TCB', name: 'Techcombank (Kỹ Thương Việt Nam)' },
  { id: 'MB', name: 'MB Bank (Quân Đội)' },
  { id: 'BIDV', name: 'BIDV (Đầu Tư & Phát Triển Việt Nam)' },
  { id: 'VPB', name: 'VPBank (Việt Nam Thịnh Vượng)' },
  { id: 'ACB', name: 'ACB (Á Châu)' },
  { id: 'TPB', name: 'TPBank (Tiên Phong)' },
  { id: 'CTG', name: 'VietinBank (Công Thương Việt Nam)' },
  { id: 'AGR', name: 'Agribank (Nông Nghiệp & PTNT)' },
  { id: 'STB', name: 'Sacombank (Sài Gòn Thương Tín)' },
  { id: 'VIB', name: 'VIB (Quốc Tế)' },
  { id: 'MSB', name: 'MSB (Hàng Hải)' },
  { id: 'OCB', name: 'OCB (Phương Đông)' },
  { id: 'SHB', name: 'SHB (Sài Gòn - Hà Nội)' },
  { id: 'CAKE', name: 'Cake by VPBank' },
];

export const OwnerUpgradePage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, submitOwnerApplication, showToast } = useAppStore();

  // 1. Thông tin cá nhân / Tổ chức cho thuê
  const [orgType, setOrgType] = useState<'personal' | 'business'>('personal');
  const [fullName, setFullName] = useState<string>(currentUser?.name || '');
  const [taxOrCccdNumber, setTaxOrCccdNumber] = useState<string>('079098001234');
  const [cccdIssueDate, setCccdIssueDate] = useState<string>('2021-08-15');
  const [cccdIssuePlace, setCccdIssuePlace] = useState<string>('Cục Cảnh sát QLHC về TTXH');
  const [phone, setPhone] = useState<string>(currentUser?.phone || '0987654321');
  const [permanentAddress, setPermanentAddress] = useState<string>('Số 18 Ngõ 165 Cầu Giấy, P. Dịch Vọng, Q. Cầu Giấy, Hà Nội');
  const [email, setEmail] = useState<string>(currentUser?.email || '');

  // Phone OTP Verification State
  const [isOtpSent, setIsOtpSent] = useState<boolean>(false);
  const [otpCode, setOtpCode] = useState<string>('');
  const [isPhoneVerified, setIsPhoneVerified] = useState<boolean>(true); // Pre-verified if logged in
  const [otpCountdown, setOtpCountdown] = useState<number>(0);

  // 2. Thông tin xác thực tài khoản (KYC)
  const [cccdFront, setCccdFront] = useState<string | null>(
    'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=600&auto=format&fit=crop&q=80'
  );
  const [cccdBack, setCccdBack] = useState<string | null>(
    'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80'
  );
  const [portraitWithCccd, setPortraitWithCccd] = useState<string | null>(
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop&q=80'
  );
  const [businessDoc, setBusinessDoc] = useState<string | null>(null);

  // 3. Thông tin tài khoản nhận tiền (Thanh toán)
  const [bankName, setBankName] = useState<string>('Vietcombank (Ngoại Thương Việt Nam)');
  const [bankAccountNumber, setBankAccountNumber] = useState<string>('0011004328999');
  const [bankAccountName, setBankAccountName] = useState<string>('');

  // 4. Thông tin cơ sở nhà trọ (Như form ban đầu)
  const [buildingName, setBuildingName] = useState<string>('Nhà Trọ Sinh Viên Xanh');
  const [address, setAddress] = useState<string>('Số 18 Ngõ 165 Cầu Giấy, P. Dịch Vọng');
  const [district, setDistrict] = useState<string>('Quận Cầu Giấy');
  const [totalRooms, setTotalRooms] = useState<number>(12);
  const [legalDocsNote, setLegalDocsNote] = useState<string>(
    'Đã có giấy phép đăng ký kinh doanh và đạt thẩm duyệt PCCC năm 2025.'
  );

  const [agreementChecked, setAgreementChecked] = useState<boolean>(false);
  const [showTermsModal, setShowTermsModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  // Auto-sync bank account name to UpperCase ASCII from full name
  useEffect(() => {
    if (fullName) {
      const normalized = fullName
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .toUpperCase();
      setBankAccountName(normalized);
    }
  }, [fullName]);

  // Sync user info on mount if available
  useEffect(() => {
    if (currentUser) {
      if (currentUser.name && !fullName) setFullName(currentUser.name);
      if (currentUser.email && !email) setEmail(currentUser.email);
      if (currentUser.phone && !phone) setPhone(currentUser.phone);
    }
  }, [currentUser]);

  // Handle countdown for OTP
  useEffect(() => {
    if (otpCountdown > 0) {
      const timer = setTimeout(() => setOtpCountdown(otpCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCountdown]);

  const handleSendOtp = () => {
    if (!phone || phone.length < 9) {
      showToast('Số điện thoại không hợp lệ', 'Vui lòng nhập đúng số điện thoại', 'error');
      return;
    }
    setIsOtpSent(true);
    setOtpCountdown(60);
    showToast('Mã OTP xác thực đã được gửi!', 'Mã OTP thử nghiệm của bạn là: 123456', 'info');
  };

  const handleVerifyOtp = () => {
    if (otpCode === '123456' || otpCode.length === 6) {
      setIsPhoneVerified(true);
      showToast('Xác thực số điện thoại thành công! ✓', '', 'success');
    } else {
      showToast('Mã OTP không đúng', 'Vui lòng nhập mã OTP gồm 6 chữ số (Mã demo: 123456)', 'error');
    }
  };

  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (val: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result) {
        setter(reader.result as string);
        showToast('Tải ảnh lên thành công', file.name, 'success');
      }
    };
    reader.readAsDataURL(file);
  };

  // If not logged in -> redirect to login
  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-white rounded-3xl border border-gray-200 text-center space-y-6 shadow-xl animate-fadeIn">
        <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
          <Lock className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-gray-900">Yêu Cầu Đăng Nhập</h2>
          <p className="text-xs text-gray-500 leading-relaxed">
            Bạn cần đăng nhập tài khoản bằng Google, Email hoặc Số điện thoại trước khi gửi hồ sơ đăng ký làm đối tác chủ trọ.
          </p>
        </div>
        <div className="space-y-3 pt-2">
          <Link to="/dang-nhap?returnUrl=/dang-ky-chu-tro" className="block">
            <Button variant="primary" size="lg" className="w-full" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Đăng Nhập Tài Khoản Ngay
            </Button>
          </Link>
          <Link to="/" className="block">
            <Button variant="ghost" size="sm" className="w-full text-gray-500">
              Quay về trang chủ
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // If already owner -> show owner status and link to dashboard
  if (currentUser.role === 'owner') {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 bg-white rounded-3xl border border-emerald-200 shadow-xl text-center space-y-6 animate-fadeIn">
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
      <div className="max-w-xl mx-auto my-12 p-8 bg-white rounded-3xl border border-amber-200 shadow-xl text-center space-y-6 animate-fadeIn">
        <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto shadow-xs animate-pulse">
          <Clock className="w-10 h-10" />
        </div>
        <div className="space-y-1.5">
          <Badge variant="pending" size="md">Đang Chờ Ban Quản Trị Phê Duyệt</Badge>
          <h1 className="text-2xl font-black text-gray-900">Hồ Sơ Của Bạn Đang Được Thẩm Định!</h1>
          <p className="text-xs text-gray-600 max-w-md mx-auto leading-relaxed">
            Chuyên viên kiểm định Trọ Xinh đang thẩm định thông tin cơ sở, CCCD/KYC và tài khoản ngân hàng của bạn. Kết quả sẽ có trong vòng <strong>24 giờ làm việc</strong>.
          </p>
        </div>

        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 text-left text-xs space-y-2 text-amber-900">
          <div className="font-bold flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-amber-700" />
            Quy trình tiếp theo:
          </div>
          <p>• Ban Quản Trị sẽ liên hệ số điện thoại {phone || currentUser.phone} để xác thực đối soát.</p>
          <p>• Sau khi được duyệt, quyền "Chủ trọ" và bộ công cụ quản lý tòa nhà sẽ tự động kích hoạt.</p>
        </div>

        <div className="flex justify-center gap-3">
          <Link to="/toi">
            <Button variant="outline" size="md">
              Quay Về Trang Cá Nhân
            </Button>
          </Link>
          <Link to="/nang-cap-chu-tro/trang-thai">
            <Button variant="primary" size="md">
              Xem Tiến Độ Hồ Sơ
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      showToast('Vui lòng nhập Họ và tên chủ trọ', '', 'error');
      return;
    }
    if (!taxOrCccdNumber.trim()) {
      showToast('Vui lòng nhập Số CCCD/CMND hoặc MST', '', 'error');
      return;
    }
    if (!phone.trim()) {
      showToast('Vui lòng nhập số điện thoại liên hệ', '', 'error');
      return;
    }
    if (!isPhoneVerified) {
      showToast('Vui lòng hoàn tất xác thực OTP số điện thoại', '', 'error');
      return;
    }
    if (!cccdFront || !cccdBack) {
      showToast('Vui lòng tải lên ảnh mặt trước và mặt sau CCCD', '', 'error');
      return;
    }
    if (!bankAccountNumber.trim() || !bankAccountName.trim()) {
      showToast('Vui lòng điền thông tin tài khoản nhận tiền', '', 'error');
      return;
    }
    if (!buildingName.trim() || !address.trim()) {
      showToast('Vui lòng nhập tên tòa nhà và địa chỉ cơ sở', '', 'error');
      return;
    }
    if (!agreementChecked) {
      showToast('Vui lòng cam kết thông tin khai báo là chính xác', '', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      submitOwnerApplication({
        fullName,
        organizationType: orgType,
        taxOrCccdNumber,
        cccdNumber: taxOrCccdNumber,
        cccdIssueDate,
        cccdIssuePlace,
        phone,
        phoneVerified: isPhoneVerified,
        permanentAddress,
        email,
        cccdFrontUrl: cccdFront || undefined,
        cccdBackUrl: cccdBack || undefined,
        portraitWithCccdUrl: portraitWithCccd || undefined,
        businessDocUrl: businessDoc || undefined,
        bankName,
        bankAccountNumber,
        bankAccountName,
        buildingName,
        address,
        district,
        totalRooms: Number(totalRooms) || 1,
        legalDocsNote,
      });
      setIsSuccess(true);
      showToast(
        'Đã gửi hồ sơ nâng cấp thành công!',
        'Ban Quản Trị Trọ Xinh đã nhận được hồ sơ và sẽ thẩm định trong vòng 24h.',
        'success'
      );
    } catch (err: any) {
      showToast('Lỗi khi gửi hồ sơ', err?.message || 'Vui lòng thử lại sau', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-[#006d37] to-emerald-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-xs font-semibold backdrop-blur-xs">
            <Building2 className="w-4 h-4" />
            <span>Biểu Mẫu Tiêu Chuẩn Nâng Cấp Chủ Trọ</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Đăng Ký Trở Thành Chủ Trọ Đối Tác Trọ Xinh
          </h1>
          <p className="text-emerald-100 text-xs sm:text-sm leading-relaxed">
            Xác thực danh tính chủ nhà, bảo vệ giao dịch minh bạch, tiếp cận 50.000+ sinh viên văn minh và kích hoạt phần mềm quản lý tòa nhà miễn phí.
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 text-center shrink-0 w-full sm:w-auto">
          <div className="text-2xl font-black text-amber-300">24h</div>
          <div className="text-[11px] text-emerald-100 font-medium">Thời gian thẩm định</div>
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

      {/* Main Registration Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* ============================================================ */}
        {/* 1. THÔNG TIN CÁ NHÂN / TỔ CHỨC CHO THUÊ */}
        {/* ============================================================ */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-md space-y-6">
          <div className="border-b border-gray-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-emerald-100 text-[#006d37] font-black text-xs flex items-center justify-center">
                  1
                </span>
                <h2 className="text-base sm:text-lg font-bold text-gray-900">
                  Thông Tin Cá Nhân / Tổ Chức Cho Thuê
                </h2>
              </div>
              <p className="text-xs text-gray-500 mt-1 pl-9">
                Thông tin pháp lý của chủ nhà hoặc người đại diện hộ kinh doanh
              </p>
            </div>

            {/* Org Type Selector */}
            <div className="flex bg-gray-100 p-1 rounded-xl self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setOrgType('personal')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  orgType === 'personal'
                    ? 'bg-white text-[#006d37] shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Cá Nhân / Hộ Gia Đình
              </button>
              <button
                type="button"
                onClick={() => setOrgType('business')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                  orgType === 'business'
                    ? 'bg-white text-[#006d37] shadow-xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Doanh Nghiệp / HKD
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={
                orgType === 'personal'
                  ? 'Họ và tên chủ trọ *'
                  : 'Tên đại diện doanh nghiệp / Hộ kinh doanh *'
              }
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ví dụ: Nguyễn Văn A"
            />
            <Input
              label={
                orgType === 'personal'
                  ? 'Số Căn cước công dân (CCCD / CMND) *'
                  : 'Mã số thuế doanh nghiệp / Số CCCD đại diện *'
              }
              required
              value={taxOrCccdNumber}
              onChange={(e) => setTaxOrCccdNumber(e.target.value)}
              placeholder="079098001234"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Ngày cấp CCCD / Giấy phép *"
              type="date"
              required
              value={cccdIssueDate}
              onChange={(e) => setCccdIssueDate(e.target.value)}
            />
            <Input
              label="Nơi cấp CCCD / Giấy phép *"
              required
              value={cccdIssuePlace}
              onChange={(e) => setCccdIssuePlace(e.target.value)}
              placeholder="Ví dụ: Cục Cảnh sát QLHC về TTXH"
            />
          </div>

          {/* Phone with OTP Verification */}
          <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-[#006d37]" />
                Số điện thoại liên hệ (Bắt buộc xác thực OTP) *
              </label>
              {isPhoneVerified ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#006d37] bg-emerald-100 px-2.5 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Đã xác thực OTP
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full">
                  Chưa xác thực OTP
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setIsPhoneVerified(false);
                }}
                placeholder="0987654321"
                className="flex-1 bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs font-mono font-medium focus:ring-2 focus:ring-[#006d37]"
              />
              <Button
                type="button"
                variant={isPhoneVerified ? 'outline' : 'primary'}
                size="sm"
                onClick={handleSendOtp}
                disabled={otpCountdown > 0}
              >
                {otpCountdown > 0
                  ? `Gửi lại (${otpCountdown}s)`
                  : isPhoneVerified
                  ? 'Gửi lại mã OTP'
                  : 'Gửi mã OTP qua SMS'}
              </Button>
            </div>

            {isOtpSent && !isPhoneVerified && (
              <div className="flex items-center gap-2 pt-1 animate-fadeIn">
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="Nhập 6 số OTP (Demo: 123456)"
                  className="w-48 bg-white border border-emerald-400 rounded-xl px-3 py-2 text-xs font-mono tracking-widest text-center font-bold focus:ring-2 focus:ring-[#006d37]"
                />
                <Button type="button" variant="primary" size="sm" onClick={handleVerifyOtp}>
                  Xác Nhận Mã
                </Button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Địa chỉ liên hệ / Hộ khẩu thường trú *"
              required
              value={permanentAddress}
              onChange={(e) => setPermanentAddress(e.target.value)}
              placeholder="Số nhà, Phường/Xã, Quận/Huyện, Tỉnh/TP"
            />
            <Input
              label="Email nhận thông báo giao dịch & hợp đồng *"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="chutro@gmail.com"
            />
          </div>
        </div>

        {/* ============================================================ */}
        {/* 2. THÔNG TIN XÁC THỰC TÀI KHOẢN (KYC) */}
        {/* ============================================================ */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-md space-y-6">
          <div className="border-b border-gray-100 pb-4">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-emerald-100 text-[#006d37] font-black text-xs flex items-center justify-center">
                2
              </span>
              <h2 className="text-base sm:text-lg font-bold text-gray-900">
                Thông Tin Xác Thực Tài Khoản (KYC)
              </h2>
            </div>
            <p className="text-xs text-gray-500 mt-1 pl-9">
              Ảnh chụp rõ nét 4 góc, không lóa mờ, nhằm đảm bảo chống tài khoản ảo và nâng cao uy tín tin đăng
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* CCCD Front */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-800 flex items-center justify-between">
                <span>Mặt trước CCCD / CMND *</span>
                {cccdFront && <CheckCircle2 className="w-4 h-4 text-[#006d37]" />}
              </label>
              <div className="relative border-2 border-dashed border-gray-300 hover:border-[#006d37] rounded-2xl p-3 text-center transition bg-gray-50/50 group h-44 flex flex-col items-center justify-center overflow-hidden">
                {cccdFront ? (
                  <>
                    <img src={cccdFront} alt="CCCD Mặt trước" className="w-full h-full object-cover rounded-xl" />
                    <button
                      type="button"
                      onClick={() => setCccdFront(null)}
                      className="absolute top-2 right-2 p-1.5 bg-rose-600 text-white rounded-full opacity-90 hover:opacity-100 shadow-md"
                      title="Xóa ảnh"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <label className="cursor-pointer w-full h-full flex flex-col items-center justify-center p-2">
                    <Upload className="w-7 h-7 text-gray-400 group-hover:text-[#006d37] mb-2 transition" />
                    <span className="text-[11px] font-bold text-gray-700">Tải ảnh mặt trước</span>
                    <span className="text-[10px] text-gray-400 mt-0.5">JPG, PNG (Tối đa 5MB)</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, setCccdFront)}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* CCCD Back */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-800 flex items-center justify-between">
                <span>Mặt sau CCCD / CMND *</span>
                {cccdBack && <CheckCircle2 className="w-4 h-4 text-[#006d37]" />}
              </label>
              <div className="relative border-2 border-dashed border-gray-300 hover:border-[#006d37] rounded-2xl p-3 text-center transition bg-gray-50/50 group h-44 flex flex-col items-center justify-center overflow-hidden">
                {cccdBack ? (
                  <>
                    <img src={cccdBack} alt="CCCD Mặt sau" className="w-full h-full object-cover rounded-xl" />
                    <button
                      type="button"
                      onClick={() => setCccdBack(null)}
                      className="absolute top-2 right-2 p-1.5 bg-rose-600 text-white rounded-full opacity-90 hover:opacity-100 shadow-md"
                      title="Xóa ảnh"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <label className="cursor-pointer w-full h-full flex flex-col items-center justify-center p-2">
                    <Upload className="w-7 h-7 text-gray-400 group-hover:text-[#006d37] mb-2 transition" />
                    <span className="text-[11px] font-bold text-gray-700">Tải ảnh mặt sau</span>
                    <span className="text-[10px] text-gray-400 mt-0.5">JPG, PNG (Tối đa 5MB)</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, setCccdBack)}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Portrait with CCCD */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-800 flex items-center justify-between">
                <span>Chân dung cầm CCCD *</span>
                {portraitWithCccd && <CheckCircle2 className="w-4 h-4 text-[#006d37]" />}
              </label>
              <div className="relative border-2 border-dashed border-gray-300 hover:border-[#006d37] rounded-2xl p-3 text-center transition bg-gray-50/50 group h-44 flex flex-col items-center justify-center overflow-hidden">
                {portraitWithCccd ? (
                  <>
                    <img src={portraitWithCccd} alt="Chân dung cầm CCCD" className="w-full h-full object-cover rounded-xl" />
                    <button
                      type="button"
                      onClick={() => setPortraitWithCccd(null)}
                      className="absolute top-2 right-2 p-1.5 bg-rose-600 text-white rounded-full opacity-90 hover:opacity-100 shadow-md"
                      title="Xóa ảnh"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <label className="cursor-pointer w-full h-full flex flex-col items-center justify-center p-2">
                    <Camera className="w-7 h-7 text-gray-400 group-hover:text-[#006d37] mb-2 transition" />
                    <span className="text-[11px] font-bold text-gray-700">Ảnh chân dung + CCCD</span>
                    <span className="text-[10px] text-gray-400 mt-0.5">Rõ khuôn mặt & thông tin thẻ</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, setPortraitWithCccd)}
                    />
                  </label>
                )}
              </div>
            </div>
          </div>

          {/* Optional Business / Land License */}
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-gray-800 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-gray-500" />
                Giấy chứng nhận quyền sử dụng đất / Giấy phép kinh doanh (Tùy chọn)
              </span>
              {businessDoc && <span className="text-[11px] font-bold text-[#006d37]">Đã đính kèm</span>}
            </div>
            <p className="text-gray-500 text-[11px]">
              Dành cho cơ sở lớn hoặc chuỗi căn hộ dịch vụ chuyên nghiệp để nhận huy hiệu kiểm duyệt Vàng.
            </p>
            <div className="flex items-center gap-3 pt-1">
              <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 hover:border-[#006d37] rounded-xl font-medium text-gray-700 text-xs transition shadow-2xs">
                <Upload className="w-3.5 h-3.5 text-gray-500" />
                {businessDoc ? 'Thay đổi tệp đính kèm' : 'Tải lên tài liệu (PDF, Ảnh)'}
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e, setBusinessDoc)}
                />
              </label>
              {businessDoc && (
                <button
                  type="button"
                  onClick={() => setBusinessDoc(null)}
                  className="text-rose-600 hover:underline text-xs"
                >
                  Gỡ tệp
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 3. THÔNG TIN TÀI KHOẢN NHẬN TIỀN (THANH TOÁN) */}
        {/* ============================================================ */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-md space-y-6">
          <div className="border-b border-gray-100 pb-4">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-emerald-100 text-[#006d37] font-black text-xs flex items-center justify-center">
                3
              </span>
              <h2 className="text-base sm:text-lg font-bold text-gray-900">
                Thông Tin Tài Khoản Nhận Tiền (Thanh Toán)
              </h2>
            </div>
            <p className="text-xs text-gray-500 mt-1 pl-9">
              Tài khoản ngân hàng dùng để nhận tiền cọc, tiền thuê phòng từ khách hàng thuê trọ
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-bold text-gray-700">Tên ngân hàng *</label>
              <select
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-xs font-semibold focus:ring-2 focus:ring-[#006d37]"
              >
                {VIETNAM_BANKS.map((b) => (
                  <option key={b.id} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Số tài khoản ngân hàng *"
              required
              value={bankAccountNumber}
              onChange={(e) => setBankAccountNumber(e.target.value)}
              placeholder="Ví dụ: 0011004328999"
            />

            <div className="space-y-1.5 text-left">
              <label className="block text-xs font-bold text-gray-700 flex items-center justify-between">
                <span>Chủ tài khoản (In hoa không dấu) *</span>
                <span className="text-[10px] text-[#006d37] font-bold">Khớp tên chủ trọ</span>
              </label>
              <input
                type="text"
                required
                value={bankAccountName}
                onChange={(e) => setBankAccountName(e.target.value.toUpperCase())}
                placeholder="NGUYEN VAN A"
                className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 text-xs font-mono font-bold tracking-wider uppercase focus:ring-2 focus:ring-[#006d37]"
              />
            </div>
          </div>

          <div className="p-3 bg-blue-50/60 rounded-2xl border border-blue-100 flex items-center gap-2.5 text-xs text-blue-900">
            <CreditCard className="w-5 h-5 text-blue-600 shrink-0" />
            <p className="text-[11px] leading-relaxed">
              Tên chủ tài khoản phải <strong>trùng khớp</strong> với Họ và tên trên Căn cước công dân để hệ thống bảo mật đối soát tự động khi sinh viên thanh toán giữ chỗ.
            </p>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 4. THÔNG TIN KHAI BÁO CƠ SỞ NHÀ TRỌ (NHƯ ẢNH) */}
        {/* ============================================================ */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-md space-y-6">
          <div className="border-b border-gray-100 pb-4">
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-emerald-100 text-[#006d37] font-black text-xs flex items-center justify-center">
                4
              </span>
              <h2 className="text-base sm:text-lg font-bold text-gray-900">
                Thông Tin Khai Báo Cơ Sở Nhà Trọ
              </h2>
            </div>
            <p className="text-xs text-gray-500 mt-1 pl-9">
              Vui lòng cung cấp thông tin chính xác để Ban Quản Trị thẩm định nhanh chóng
            </p>
          </div>

          <div className="space-y-4">
            <Input
              label="Tên tòa nhà / Khu nhà trọ của bạn"
              required
              value={buildingName}
              onChange={(e) => setBuildingName(e.target.value)}
              placeholder="Nhà Trọ Sinh Viên Xanh"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Địa chỉ chi tiết (Số nhà, Tên đường)"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Số 18 Ngõ 165 Cầu Giấy, P. Dịch Vọng"
              />
              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-bold text-gray-700">Khu vực / Quận</label>
                <select
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-xs font-semibold focus:ring-2 focus:ring-[#006d37]"
                >
                  <option value="Quận Cầu Giấy">Quận Cầu Giấy</option>
                  <option value="Quận Đống Đa">Quận Đống Đa</option>
                  <option value="Quận Hai Bà Trưng">Quận Hai Bà Trưng</option>
                  <option value="Quận Thanh Xuân">Quận Thanh Xuân</option>
                  <option value="Quận Nam Từ Liêm">Quận Nam Từ Liêm</option>
                  <option value="Quận Bắc Từ Liêm">Quận Bắc Từ Liêm</option>
                  <option value="Quận Hà Đông">Quận Hà Đông</option>
                  <option value="Quận Ba Đình">Quận Ba Đình</option>
                  <option value="Quận Hoàng Mai">Quận Hoàng Mai</option>
                  <option value="Quận Tây Hồ">Quận Tây Hồ</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Số Căn cước công dân (CCCD) người đại diện"
                required
                value={taxOrCccdNumber}
                onChange={(e) => setTaxOrCccdNumber(e.target.value)}
                placeholder="079098001234"
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
              <label className="block text-xs font-bold text-gray-700">
                Ghi chú về giấy tờ pháp lý / PCCC (Tùy chọn)
              </label>
              <textarea
                rows={3}
                value={legalDocsNote}
                onChange={(e) => setLegalDocsNote(e.target.value)}
                placeholder="Đã có giấy phép đăng ký kinh doanh và đạt thẩm duyệt PCCC năm 2025."
                className="w-full rounded-xl border border-gray-300 p-3 text-xs focus:ring-2 focus:ring-[#006d37]"
              />
            </div>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 5. ĐIỀU KHOẢN VÀ ĐIỀU KIỆN SỬ DỤNG DÀNH CHO CHỦ TRỌ */}
        {/* ============================================================ */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-md space-y-6">
          <div className="border-b border-gray-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-xl bg-emerald-100 text-[#006d37] font-black text-xs flex items-center justify-center">
                  5
                </span>
                <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Scale className="w-5 h-5 text-[#006d37]" />
                  Điều Khoản &amp; Điều Kiện Sử Dụng Dành Cho Chủ Trọ
                </h2>
              </div>
              <p className="text-xs text-gray-500 mt-1 pl-9">
                Quy định về tài khoản, nội dung tin đăng, thanh toán, an toàn PCCC &amp; cơ chế xử lý vi phạm
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowTermsModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-[#006d37] text-xs font-bold rounded-xl transition cursor-pointer self-start sm:self-auto border border-emerald-200 shadow-2xs"
            >
              <span>Xem toàn văn 5 điều khoản</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Tóm tắt 5 điều khoản cốt lõi */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
            <div className="p-3.5 bg-gray-50/80 rounded-2xl border border-gray-200/80 space-y-1.5">
              <div className="font-bold text-gray-900 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-[#006d37] text-[11px] font-black flex items-center justify-center shrink-0">1</span>
                Quy Định Tài Khoản &amp; Xác Thực
              </div>
              <p className="text-gray-600 pl-7 leading-relaxed">
                Cam kết dữ liệu chính xác, chính chủ (CCCD, SĐT, STK), tự bảo mật tài khoản và có quyền sở hữu/cho thuê hợp pháp.
              </p>
            </div>

            <div className="p-3.5 bg-gray-50/80 rounded-2xl border border-gray-200/80 space-y-1.5">
              <div className="font-bold text-gray-900 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-[#006d37] text-[11px] font-black flex items-center justify-center shrink-0">2</span>
                Quy Định Nội Dung Tin Đăng
              </div>
              <p className="text-gray-600 pl-7 leading-relaxed">
                Trung thực 100% về hình ảnh, giá, diện tích; cập nhật trạng thái phòng kịp thời; không đăng nội dung vi phạm pháp luật.
              </p>
            </div>

            <div className="p-3.5 bg-gray-50/80 rounded-2xl border border-gray-200/80 space-y-1.5">
              <div className="font-bold text-gray-900 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-[#006d37] text-[11px] font-black flex items-center justify-center shrink-0">3</span>
                Giao Dịch &amp; Thanh Toán
              </div>
              <p className="text-gray-600 pl-7 leading-relaxed">
                Thanh toán phí dịch vụ niêm yết, đối soát nhận tiền cọc/tiền thuê qua STK và tuân thủ chính sách hoàn tiền khi có lỗi.
              </p>
            </div>

            <div className="p-3.5 bg-gray-50/80 rounded-2xl border border-gray-200/80 space-y-1.5">
              <div className="font-bold text-gray-900 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-[#006d37] text-[11px] font-black flex items-center justify-center shrink-0">4</span>
                Trách Nhiệm Với Người Thuê
              </div>
              <p className="text-gray-600 pl-7 leading-relaxed">
                Ký hợp đồng thuê trọ hợp pháp, hỗ trợ đăng ký tạm trú và đảm bảo an toàn PCCC, an ninh trật tự cơ sở.
              </p>
            </div>

            <div className="p-3.5 bg-gray-50/80 rounded-2xl border border-gray-200/80 space-y-1.5 md:col-span-2">
              <div className="font-bold text-gray-900 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-[#006d37] text-[11px] font-black flex items-center justify-center shrink-0">5</span>
                Cơ Chế Xử Lý Vi Phạm &amp; Giới Hạn Trách Nhiệm
              </div>
              <p className="text-gray-600 pl-7 leading-relaxed">
                Website có quyền gỡ bỏ tin sai sự thật, khóa tài khoản vi phạm; hoạt động với vai trò sàn TMĐT kết nối người thuê và cho thuê.
              </p>
            </div>
          </div>

          {/* Commitment Agreement Checkbox */}
          <div
            className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 flex items-start gap-3.5 ${
              agreementChecked
                ? 'bg-emerald-50/90 border-emerald-300 ring-2 ring-emerald-500/20'
                : 'bg-amber-50/60 border-amber-200 hover:border-amber-300'
            }`}
          >
            <input
              type="checkbox"
              id="agreement"
              checked={agreementChecked}
              onChange={(e) => setAgreementChecked(e.target.checked)}
              className="w-5 h-5 rounded text-[#006d37] focus:ring-[#006d37] cursor-pointer mt-0.5 shrink-0 accent-[#006d37]"
            />
            <label htmlFor="agreement" className="cursor-pointer text-xs leading-relaxed text-gray-800 select-none">
              <span className="font-bold text-gray-900 block mb-0.5">
                Tôi xác nhận đã đọc, hiểu rõ và đồng ý với tất cả 5 Điều khoản &amp; Điều kiện sử dụng dành cho Chủ trọ *
              </span>
              Tôi cam kết các thông tin cá nhân, giấy tờ CCCD/KYC, tài khoản thanh toán và thông tin cơ sở nhà trọ khai báo ở trên là hoàn toàn chính xác, trung thực và tự chịu hoàn toàn trách nhiệm trước pháp luật.
            </label>
          </div>

          {!agreementChecked && (
            <p className="text-[11px] text-amber-700 font-medium flex items-center gap-1.5 pl-1 animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>Vui lòng tích chọn đồng ý với điều khoản trên để mở khóa nút gửi yêu cầu trở thành chủ trọ.</span>
            </p>
          )}
        </div>

        {/* SUBMIT BUTTON */}
        <div className="space-y-4">
          <button
            type="submit"
            disabled={!agreementChecked || isSubmitting}
            className={`w-full py-4 px-6 rounded-2xl font-black text-sm sm:text-base shadow-lg flex items-center justify-center gap-2 transition-all ${
              agreementChecked && !isSubmitting
                ? 'bg-[#00a854] hover:bg-[#008f47] active:scale-[0.99] text-white shadow-emerald-500/20 cursor-pointer'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none border border-gray-300/50'
            }`}
          >
            {isSubmitting ? (
              <span>Đang gửi hồ sơ thẩm định...</span>
            ) : (
              <>
                <span>Gửi Yêu Cầu Trở Thành Chủ Trọ (Xét duyệt 24h)</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>

          {/* Footer Consultation Info */}
          <div className="text-center text-xs text-gray-500 flex items-center justify-center gap-2 flex-wrap">
            <span>Cần tư vấn gói phù hợp?</span>
            <span className="flex items-center gap-1 font-bold text-gray-800">
              📞 <a href="tel:0888110789" className="hover:underline">0888 110 789</a>
            </span>
            <span>·</span>
            <span className="flex items-center gap-1 font-bold text-[#006d37]">
              💬 <a href="https://zalo.me/0888110789" target="_blank" rel="noopener noreferrer" className="hover:underline">Zalo tư vấn</a>
            </span>
          </div>
        </div>
      </form>

      {/* MODAL CHI TIẾT ĐIỀU KHOẢN VÀ ĐIỀU KIỆN SỬ DỤNG DÀNH CHO CHỦ TRỌ */}
      {showTermsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-gray-200 overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-[#006d37] flex items-center justify-center shrink-0">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-gray-900">
                    ĐIỀU KHOẢN VÀ ĐIỀU KIỆN SỬ DỤNG DÀNH CHO CHỦ TRỌ
                  </h3>
                  <p className="text-xs text-gray-500">Nền tảng Quản lý &amp; Tìm kiếm Trọ Xinh</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs sm:text-sm text-gray-700 leading-relaxed text-left">
              {/* Điều 1 */}
              <section className="space-y-2">
                <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-100 text-[#006d37] font-black text-xs flex items-center justify-center shrink-0">1</span>
                  Quy định về tài khoản và xác thực thông tin
                </h4>
                <ul className="list-disc pl-10 space-y-1.5 text-gray-600">
                  <li>
                    <strong className="text-gray-800">Chính xác dữ liệu:</strong> Chủ trọ cam kết cung cấp thông tin cá nhân (Họ tên, CCCD, Số điện thoại, Tài khoản ngân hàng) chính xác, chính chủ và chịu trách nhiệm hoàn toàn về tính pháp lý của thông tin này.
                  </li>
                  <li>
                    <strong className="text-gray-800">Bảo mật tài khoản:</strong> Chủ trọ có trách nhiệm tự bảo mật mật khẩu và tài khoản của mình. Mọi hoạt động được thực hiện qua tài khoản của chủ trọ được tính là hành vi của chính chủ trọ đó.
                  </li>
                  <li>
                    <strong className="text-gray-800">Quyền sở hữu:</strong> Chủ trọ cam kết mình là chủ sở hữu hợp pháp hoặc có quyền cho thuê hợp pháp đối với bất động sản/phòng trọ được đăng tải.
                  </li>
                </ul>
              </section>

              {/* Điều 2 */}
              <section className="space-y-2">
                <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-100 text-[#006d37] font-black text-xs flex items-center justify-center shrink-0">2</span>
                  Quy định về nội dung tin đăng
                </h4>
                <ul className="list-disc pl-10 space-y-1.5 text-gray-600">
                  <li>
                    <strong className="text-gray-800">Tính trung thực:</strong> Thông tin về phòng trọ (giá cả, diện tích, vị trí, tiện ích, hình ảnh, video) phải đúng với thực tế. Nghiêm cấm hành vi treo đầu dê bán thịt chó hoặc dùng hình ảnh giả mạo.
                  </li>
                  <li>
                    <strong className="text-gray-800">Cập nhật trạng thái:</strong> Chủ trọ có nghĩa vụ cập nhật ngay trạng thái phòng (Còn trống / Đã cho thuê) trên hệ thống để tránh làm mất thời gian của người thuê và giữ uy tín cho nền tảng.
                  </li>
                  <li>
                    <strong className="text-gray-800">Nội dung nghiêm cấm:</strong> Không đăng tải các nội dung vi phạm pháp luật, thuần phong mỹ tục, hoặc các thông tin mang tính chất quảng cáo cho các dịch vụ khác ngoài mục đích cho thuê bất động sản.
                  </li>
                </ul>
              </section>

              {/* Điều 3 */}
              <section className="space-y-2">
                <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-100 text-[#006d37] font-black text-xs flex items-center justify-center shrink-0">3</span>
                  Quy trình giao dịch và thanh toán
                </h4>
                <ul className="list-disc pl-10 space-y-1.5 text-gray-600">
                  <li>
                    <strong className="text-gray-800">Phí dịch vụ:</strong> Chủ trọ đồng ý thanh toán các khoản phí (phí đăng tin, phí hoa hồng trên mỗi lượt đặt phòng thành công, hoặc phí dịch vụ khác) theo biểu phí được niêm yết công khai của website tại từng thời điểm.
                  </li>
                  <li>
                    <strong className="text-gray-800">Nhận tiền thanh toán:</strong> Nền tảng sẽ chuyển tiền đặt cọc/tiền thuê thu hộ (nếu có) vào tài khoản ngân hàng do chủ trọ cung cấp sau khi khấu trừ phí dịch vụ, theo đúng chu kỳ đối soát đã thỏa thuận.
                  </li>
                  <li>
                    <strong className="text-gray-800">Chính sách hoàn tiền:</strong> Chủ trọ phải tuân thủ chính sách hủy phòng và hoàn tiền của website trong trường hợp lỗi phát sinh từ phía chủ trọ (ví dụ: không bàn giao phòng đúng hẹn, phòng không đúng mô tả).
                  </li>
                </ul>
              </section>

              {/* Điều 4 */}
              <section className="space-y-2">
                <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-100 text-[#006d37] font-black text-xs flex items-center justify-center shrink-0">4</span>
                  Trách nhiệm đối với người thuê trọ
                </h4>
                <ul className="list-disc pl-10 space-y-1.5 text-gray-600">
                  <li>
                    <strong className="text-gray-800">Hợp đồng thuê nhà:</strong> Chủ trọ tự chịu trách nhiệm ký kết hợp đồng thuê trọ hợp pháp với khách thuê và thực hiện đầy đủ nghĩa vụ của bên cho thuê theo quy định của Pháp luật Việt Nam.
                  </li>
                  <li>
                    <strong className="text-gray-800">An ninh và Đăng ký tạm trú:</strong> Chủ trọ có trách nhiệm hỗ trợ khách thuê thực hiện các thủ tục đăng ký tạm trú, tạm vắng và đảm bảo các điều kiện an toàn phòng cháy chữa cháy (PCCC), an ninh trật tự tại cơ sở cho thuê.
                  </li>
                </ul>
              </section>

              {/* Điều 5 */}
              <section className="space-y-2">
                <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-emerald-100 text-[#006d37] font-black text-xs flex items-center justify-center shrink-0">5</span>
                  Cơ chế xử lý vi phạm
                </h4>
                <ul className="list-disc pl-10 space-y-1.5 text-gray-600">
                  <li>
                    <strong className="text-gray-800">Gỡ bỏ tin đăng:</strong> Website có quyền gỡ bỏ không cần báo trước các tin đăng có dấu hiệu lừa đảo, sai sự thật hoặc bị người dùng báo cáo (report) tiêu cực nhiều lần.
                  </li>
                  <li>
                    <strong className="text-gray-800">Khóa tài khoản:</strong> Tài khoản của chủ trọ sẽ bị khóa tạm thời hoặc vĩnh viễn nếu vi phạm nghiêm trọng các điều khoản này hoặc có hành vi gian lận tài chính.
                  </li>
                  <li>
                    <strong className="text-gray-800">Giới hạn trách nhiệm:</strong> Website chỉ đóng vai trò là sàn giao dịch thương mại điện tử kết nối người thuê và người cho thuê. Website không chịu trách nhiệm về bất kỳ tranh chấp, thiệt hại phát sinh từ mối quan hệ thuê nhà giữa chủ trọ và khách thuê.
                  </li>
                </ul>
              </section>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 border-t border-gray-100 flex items-center justify-between bg-gray-50/60">
              <Link
                to="/dieu-khoan"
                target="_blank"
                className="text-xs font-semibold text-[#006d37] hover:underline flex items-center gap-1"
              >
                <span>Xem trang Điều khoản chung</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowTermsModal(false)}
                >
                  Đóng
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setAgreementChecked(true);
                    setShowTermsModal(false);
                    showToast('Đã xác nhận đồng ý điều khoản', 'Bạn có thể gửi hồ sơ đăng ký ngay bây giờ.', 'success');
                  }}
                  rightIcon={<CheckCircle2 className="w-4 h-4" />}
                >
                  Tôi Đã Đọc &amp; Đồng Ý
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
