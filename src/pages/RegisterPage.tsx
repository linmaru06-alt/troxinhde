import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAppStore } from '../store/useAppStore';
import { User, Phone, Lock, Mail, UserPlus, ShieldCheck, AlertCircle, Sparkles, Building2, CheckCircle2, ArrowRight } from 'lucide-react';
import { loginWithGoogle, loginWithDemoAccount } from '../lib/authService';
import { checkUserExists } from '../lib/supabaseAuthSync';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loginWithSocialUser, showToast } = useAppStore();

  const returnUrl = searchParams.get('returnUrl') || searchParams.get('next');
  const roleParam = (searchParams.get('role') || 'renter') as 'renter' | 'owner';

  // Mode: 'email' (Email & Mật khẩu) | 'phone' (Số điện thoại & OTP)
  const [registerMode, setRegisterMode] = useState<'email' | 'phone'>('email');

  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState<boolean>(false);
  const [demoLoadingType, setDemoLoadingType] = useState<string | null>(null);

  // 1. Xử lý Đăng ký bằng Email & Mật khẩu -> Kiểm tra trùng lặp -> Chuyển sang /xac-thuc-otp
  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Kiểm tra Họ và tên
    if (!name.trim()) {
      setError('Vui lòng nhập họ và tên của bạn.');
      return;
    }

    // Validate định dạng Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setError('Địa chỉ Email không hợp lệ.');
      return;
    }

    // Validate Mật khẩu (tối thiểu 8 ký tự)
    if (!password || password.length < 8) {
      setError('Mật khẩu phải có ít nhất 8 ký tự để đảm bảo an toàn.');
      return;
    }

    // Kiểm tra Mật khẩu xác nhận
    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp với mật khẩu đã nhập.');
      return;
    }

    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (phone.trim() && cleanPhone.length < 10) {
      setError('Số điện thoại không hợp lệ (tối thiểu 10 chữ số).');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Kiểm tra xem Email hoặc SĐT đã tồn tại chưa
      const checkRes = await checkUserExists({
        email: cleanEmail,
        phone: cleanPhone || undefined,
      });

      if (checkRes.exists) {
        setIsLoading(false);
        setError(checkRes.message || 'Email hoặc số điện thoại này đã được đăng ký tài khoản.');
        return;
      }

      // 2. Tạo mã OTP 6 số ngẫu nhiên cho email
      const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

      // 3. Lưu thông tin đăng ký tạm thời vào sessionStorage (Tuyệt đối không đưa mật khẩu lên URL)
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.setItem(
          'troxinh_pending_reg',
          JSON.stringify({
            name: name.trim(),
            email: cleanEmail,
            phone: cleanPhone || undefined,
            password,
            role: roleParam,
            mode: 'email',
            createdAt: Date.now(),
          })
        );

        window.sessionStorage.setItem(
          'troxinh_email_otp',
          JSON.stringify({
            code: otpCode,
            email: cleanEmail,
            expiresAt: Date.now() + 5 * 60 * 1000,
          })
        );
      }

      setIsLoading(false);

      // 4. Chuyển sang màn hình xác thực OTP bắt buộc
      const otpUrl = `/xac-thuc-otp?mode=email&email=${encodeURIComponent(cleanEmail)}&name=${encodeURIComponent(
        name.trim()
      )}${cleanPhone ? `&phone=${encodeURIComponent(cleanPhone)}` : ''}&role=${roleParam}&action=register${
        returnUrl ? `&returnUrl=${encodeURIComponent(returnUrl)}` : ''
      }`;
      navigate(otpUrl);
    } catch (err: any) {
      setIsLoading(false);
      setError('Đã có lỗi xảy ra khi kiểm tra thông tin. Vui lòng thử lại!');
    }
  };

  // 2. Xử lý Đăng ký bằng Số điện thoại (Nhận OTP SMS) -> Kiểm tra trùng lặp -> Chuyển sang /xac-thuc-otp
  const handlePhoneRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Vui lòng nhập họ và tên của bạn.');
      return;
    }

    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      setError('Số điện thoại không hợp lệ (tối thiểu 10 chữ số).');
      return;
    }

    setIsLoading(true);

    try {
      const checkRes = await checkUserExists({ phone: cleanPhone });
      if (checkRes.exists) {
        setIsLoading(false);
        setError(checkRes.message || 'Số điện thoại này đã được sử dụng cho một tài khoản khác.');
        return;
      }

      // Lưu thông tin đăng ký vào sessionStorage
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.setItem(
          'troxinh_pending_reg',
          JSON.stringify({
            name: name.trim(),
            phone: cleanPhone,
            role: roleParam,
            mode: 'phone',
            createdAt: Date.now(),
          })
        );
      }

      setIsLoading(false);
      const otpUrl = `/xac-thuc-otp?mode=phone&phone=${encodeURIComponent(cleanPhone)}&name=${encodeURIComponent(
        name.trim()
      )}&role=${roleParam}&action=register${returnUrl ? `&returnUrl=${encodeURIComponent(returnUrl)}` : ''}`;
      navigate(otpUrl);
    } catch (err: any) {
      setIsLoading(false);
      setError('Đã có lỗi xảy ra khi kiểm tra số điện thoại. Vui lòng thử lại!');
    }
  };

  // 3. Xử lý Đăng ký nhanh 1-chạm bằng Google
  const handleGoogleSignUp = async () => {
    setError('');
    setIsGoogleLoading(true);

    const res = await loginWithGoogle(roleParam);
    setIsGoogleLoading(false);

    if (res.success && res.user) {
      loginWithSocialUser({
        id: res.user.id,
        name: res.user.name,
        email: res.user.email,
        phone: res.user.phone,
        role: res.user.role,
        avatarUrl: res.user.avatarUrl,
      });

      showToast('Đăng ký Google thành công! 🎉', `Chào mừng ${res.user.name}`, 'success');

      if (returnUrl) {
        navigate(decodeURIComponent(returnUrl));
      } else if (res.user.role === 'owner') {
        navigate('/chu-tro');
      } else {
        navigate('/tim-phong');
      }
    } else {
      setError(res.error || 'Không thể đăng ký bằng Google.');
    }
  };

  // 4. Trải nghiệm Demo Nhanh
  const handleDemoLogin = async (demoType: 'owner' | 'renter') => {
    setError('');
    setDemoLoadingType(demoType);

    const res = await loginWithDemoAccount(demoType);
    setDemoLoadingType(null);

    if (res.success && res.user) {
      loginWithSocialUser({
        id: res.user.id,
        name: res.user.name,
        email: res.user.email,
        phone: res.user.phone,
        role: res.user.role,
        avatarUrl: res.user.avatarUrl,
      });

      showToast(`Kích hoạt tài khoản ${demoType.toUpperCase()} Demo thành công! ✨`, `Chào mừng ${res.user.name}`, 'success');

      if (returnUrl) {
        navigate(decodeURIComponent(returnUrl));
      } else if (res.user.role === 'owner') {
        navigate('/chu-tro');
      } else {
        navigate('/tim-phong');
      }
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-4 sm:p-6 py-10">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-xl space-y-6 animate-fadeIn">
        {/* Header */}
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2.5 group">
            <img
              src="/images/logo.png"
              alt="Trọ Xinh Logo"
              className="w-12 h-12 rounded-2xl object-cover ring-2 ring-emerald-500/20 shadow-md group-hover:scale-105 transition-transform"
            />
            <span className="text-2xl font-black text-[#00a854]">Trọ Xinh</span>
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Tạo Tài Khoản Mới</h1>
          <p className="text-xs text-gray-500">Tham gia cộng đồng phòng trọ an tâm & văn minh số 1 Hà Nội</p>
        </div>

        {/* Tab Selection */}
        <div className="flex p-1 bg-gray-100/80 rounded-2xl">
          <button
            type="button"
            onClick={() => {
              setRegisterMode('email');
              setError('');
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              registerMode === 'email'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Email & Mật Khẩu
          </button>
          <button
            type="button"
            onClick={() => {
              setRegisterMode('phone');
              setError('');
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              registerMode === 'phone'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Số Điện Thoại (OTP SMS)
          </button>
        </div>

        {/* Error notification */}
        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl flex items-start gap-2.5 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="space-y-1 flex-1">
              <span className="block font-medium">{error}</span>
              {(error.includes('đăng ký') || error.includes('sử dụng') || error.includes('hệ thống') || error.includes('Đăng nhập')) && (
                <Link
                  to={returnUrl ? `/dang-nhap?returnUrl=${encodeURIComponent(returnUrl)}` : '/dang-nhap'}
                  className="inline-flex items-center gap-1 font-bold text-[#00a854] hover:underline pt-0.5"
                >
                  <span>👉 Bấm vào đây để Đăng nhập ngay</span>
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Form Tab 1: Email & Mật khẩu */}
        {registerMode === 'email' && (
          <form onSubmit={handleEmailRegister} className="space-y-3.5">
            <Input
              label="Họ và tên"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nguyễn Văn A"
              leftIcon={<User className="w-4 h-4" />}
            />

            <Input
              label="Địa chỉ Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nguyenvana@gmail.com"
              leftIcon={<Mail className="w-4 h-4" />}
            />

            <Input
              label="Số điện thoại (tùy chọn)"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0988 110 789"
              leftIcon={<Phone className="w-4 h-4" />}
            />

            <Input
              label="Mật khẩu (tối thiểu 8 ký tự)"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tối thiểu 8 ký tự"
              leftIcon={<Lock className="w-4 h-4" />}
            />

            <Input
              label="Xác nhận mật khẩu"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu vừa đặt"
              leftIcon={<Lock className="w-4 h-4" />}
            />

            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100 text-[11px] text-emerald-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#00a854] shrink-0" />
              <span>Sau khi bấm nút, hệ thống sẽ gửi mã xác thực OTP 6 số để kích hoạt tài khoản.</span>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              isLoading={isLoading}
              leftIcon={<Mail className="w-4 h-4" />}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              {isLoading ? 'Đang gửi mã OTP...' : 'Gửi Mã OTP & Xác Nhận Đăng Ký'}
            </Button>
          </form>
        )}

        {/* Form Tab 2: Số điện thoại (OTP SMS) */}
        {registerMode === 'phone' && (
          <form onSubmit={handlePhoneRegister} className="space-y-3.5">
            <Input
              label="Họ và tên"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nguyễn Văn A"
              leftIcon={<User className="w-4 h-4" />}
            />

            <Input
              label="Số điện thoại nhận mã OTP"
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0988 110 789"
              leftIcon={<Phone className="w-4 h-4" />}
            />

            <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100 text-[11px] text-emerald-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#00a854] shrink-0" />
              <span>Hệ thống sẽ gửi mã xác thực OTP 6 số qua tin nhắn SMS tới số điện thoại của bạn.</span>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              isLoading={isLoading}
              leftIcon={<Phone className="w-4 h-4" />}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              {isLoading ? 'Đang gửi mã OTP...' : 'Gửi Mã Xác Thực OTP SMS'}
            </Button>
          </form>
        )}

        {/* Social Registration: Google OAuth 1-Click */}
        <div className="space-y-3 pt-2">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-white text-gray-500 font-medium">Hoặc đăng ký nhanh với</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignUp}
            disabled={isGoogleLoading}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-2.5 bg-white hover:bg-gray-50 text-gray-800 font-bold rounded-2xl border border-gray-200 shadow-xs transition active:scale-98 disabled:opacity-60 text-xs"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{isGoogleLoading ? 'Đang kết nối Google...' : 'Đăng Ký Bằng Google (1-Chạm)'}</span>
          </button>
        </div>

        {/* Quick Demo Access */}
        <div className="pt-2 border-t border-gray-100 text-center space-y-2">
          <p className="text-[11px] text-gray-500 font-medium">Trải nghiệm nhanh không cần tạo tài khoản:</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleDemoLogin('renter')}
              disabled={Boolean(demoLoadingType)}
              className="px-3 py-1.5 bg-gray-50 hover:bg-emerald-50 hover:text-[#00a854] text-gray-700 rounded-xl text-xs font-bold border border-gray-200 transition flex items-center justify-center gap-1"
            >
              <User className="w-3.5 h-3.5" />
              <span>{demoLoadingType === 'renter' ? 'Đang vào...' : '👤 Demo Người Thuê'}</span>
            </button>
            <button
              type="button"
              onClick={() => handleDemoLogin('owner')}
              disabled={Boolean(demoLoadingType)}
              className="px-3 py-1.5 bg-gray-50 hover:bg-emerald-50 hover:text-[#00a854] text-gray-700 rounded-xl text-xs font-bold border border-gray-200 transition flex items-center justify-center gap-1"
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>{demoLoadingType === 'owner' ? 'Đang vào...' : '🏢 Demo Chủ Trọ'}</span>
            </button>
          </div>
        </div>

        {/* Footer link to login */}
        <div className="text-center text-xs text-gray-600 space-y-2">
          <div>
            Đã có tài khoản?{' '}
            <Link
              to={returnUrl ? `/dang-nhap?returnUrl=${encodeURIComponent(returnUrl)}` : '/dang-nhap'}
              className="font-bold text-[#00a854] hover:underline"
            >
              Đăng nhập ngay
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

