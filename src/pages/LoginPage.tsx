import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAppStore } from '../store/useAppStore';
import { Phone, Lock, LogIn, Mail, AlertCircle, ShieldCheck, Building2, User, Sparkles, Loader2 } from 'lucide-react';
import { loginWithEmailPassword, loginWithGoogle, loginWithDemoAccount } from '../lib/authService';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loginWithSocialUser, showToast } = useAppStore();

  const returnUrl = searchParams.get('returnUrl') || searchParams.get('next');
  const roleParam = (searchParams.get('role') || 'renter') as 'renter' | 'owner';

  // Mode: 'email' (Email + Mật khẩu) | 'otp' (Mã OTP)
  const [loginMode, setLoginMode] = useState<'email' | 'otp'>('email');
  // OTP sub-mode: 'email' (Nhận qua Gmail) | 'phone' (Nhận qua SMS)
  const [otpSubMode, setOtpSubMode] = useState<'email' | 'phone'>('email');

  // Form states
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [rememberMe, setRememberMe] = useState<boolean>(true);

  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState<boolean>(false);
  const [demoLoadingType, setDemoLoadingType] = useState<string | null>(null);

  // 1. Xử lý đăng nhập bằng Email & Mật khẩu
  const handleEmailLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Vui lòng nhập địa chỉ Email.');
      return;
    }
    if (!password) {
      setError('Vui lòng nhập mật khẩu.');
      return;
    }

    setIsLoading(true);
    const res = await loginWithEmailPassword(email, password);
    setIsLoading(false);

    if (res.success && res.user) {
      loginWithSocialUser({
        id: res.user.id,
        name: res.user.name,
        email: res.user.email,
        phone: res.user.phone,
        role: res.user.role,
        avatarUrl: res.user.avatarUrl,
      });

      showToast('Đăng nhập thành công! 👋', `Chào mừng ${res.user.name}`, 'success');

      if (returnUrl) {
        navigate(decodeURIComponent(returnUrl));
      } else if (res.user.role === 'owner') {
        navigate('/chu-tro');
      } else if (res.user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/tim-phong');
      }
    } else {
      setError(res.error || 'Email hoặc mật khẩu không chính xác.');
    }
  };

  // 2. Xử lý đăng nhập bằng Mã OTP (Gmail hoặc SĐT)
  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (otpSubMode === 'email') {
      const cleanEmail = email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!cleanEmail || !emailRegex.test(cleanEmail)) {
        setError('Vui lòng nhập địa chỉ Email Gmail hợp lệ.');
        return;
      }

      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        const otpUrl = `/xac-thuc-otp?email=${encodeURIComponent(cleanEmail)}&role=${roleParam}&mode=email${
          returnUrl ? `&returnUrl=${encodeURIComponent(returnUrl)}` : ''
        }`;
        navigate(otpUrl);
      }, 200);
    } else {
      const cleanPhone = phone.trim().replace(/\D/g, '');
      if (!cleanPhone || cleanPhone.length < 10) {
        setError('Số điện thoại không hợp lệ (tối thiểu 10 chữ số).');
        return;
      }

      setIsLoading(true);
      setTimeout(() => {
        setIsLoading(false);
        const otpUrl = `/xac-thuc-otp?phone=${encodeURIComponent(cleanPhone)}&role=${roleParam}&mode=phone${
          returnUrl ? `&returnUrl=${encodeURIComponent(returnUrl)}` : ''
        }`;
        navigate(otpUrl);
      }, 200);
    }
  };

  // 3. Xử lý đăng nhập 1-chạm bằng Google OAuth
  const handleGoogleLogin = async () => {
    setError('');
    setIsGoogleLoading(true);

    const res = await loginWithGoogle();
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

      showToast('Đăng nhập Google thành công! 🎉', `Chào mừng ${res.user.name}`, 'success');

      if (returnUrl) {
        navigate(decodeURIComponent(returnUrl));
      } else if (res.user.role === 'owner') {
        navigate('/chu-tro');
      } else if (res.user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/tim-phong');
      }
    } else {
      setError(res.error || 'Không thể đăng nhập bằng Google.');
    }
  };

  // 4. Xử lý đăng nhập Demo 1-chạm (Admin, Chủ trọ, Sinh viên) an toàn qua Token
  const handleDemoLogin = async (demoType: 'admin' | 'owner' | 'renter') => {
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

      showToast(`Đăng nhập tài khoản ${demoType.toUpperCase()} Demo thành công! 🎉`, `Chào mừng ${res.user.name}`, 'success');

      if (returnUrl) {
        navigate(decodeURIComponent(returnUrl));
      } else if (res.user.role === 'owner') {
        navigate('/chu-tro');
      } else if (res.user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/tim-phong');
      }
    } else {
      setError(res.error || 'Không thể kết nối tài khoản demo.');
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-4 sm:p-6 py-10">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-xl space-y-6 animate-fadeIn">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-emerald-50 text-[#00a854] rounded-full flex items-center justify-center mx-auto shadow-xs">
            <LogIn className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Đăng Nhập Trọ Xinh</h1>
          <p className="text-xs text-gray-500">
            Chào mừng bạn quay trở lại nền tảng thuê trọ sinh viên Hà Nội
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex p-1 bg-gray-100/80 rounded-2xl">
          <button
            type="button"
            onClick={() => {
              setLoginMode('email');
              setError('');
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              loginMode === 'email'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Email & Mật Khẩu
          </button>
          <button
            type="button"
            onClick={() => {
              setLoginMode('otp');
              setError('');
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              loginMode === 'otp'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Mã OTP (Gmail / SMS)
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl flex items-start gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* FORM 1: EMAIL & PASSWORD */}
        {loginMode === 'email' && (
          <form onSubmit={(e) => handleEmailLogin(e)} className="space-y-4">
            <Input
              label="Địa chỉ Email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nguyenvana@gmail.com"
              leftIcon={<Mail className="w-4 h-4" />}
            />

            <div className="space-y-1">
              <Input
                label="Mật khẩu"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu của bạn"
                leftIcon={<Lock className="w-4 h-4" />}
              />
              <div className="flex items-center justify-between pt-1">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 text-[#00a854] rounded-md border-gray-300 focus:ring-[#00a854]"
                  />
                  <span className="text-xs text-gray-600">Ghi nhớ đăng nhập</span>
                </label>

                <Link
                  to="/quen-mat-khau"
                  className="text-xs font-semibold text-[#00a854] hover:underline"
                >
                  Quên mật khẩu?
                </Link>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              isLoading={isLoading}
              leftIcon={<LogIn className="w-4 h-4" />}
            >
              Đăng Nhập
            </Button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => {
                  setLoginMode('otp');
                  setOtpSubMode('email');
                }}
                className="text-xs text-[#00a854] hover:underline font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Hoặc đăng nhập không cần mật khẩu bằng mã OTP Gmail →</span>
              </button>
            </div>
          </form>
        )}

        {/* FORM 2: OTP (GMAIL / SMS) */}
        {loginMode === 'otp' && (
          <form onSubmit={handleOtpSubmit} className="space-y-4">
            {/* Sub-selector for OTP destination */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-gray-50 border border-gray-200 rounded-xl">
              <button
                type="button"
                onClick={() => setOtpSubMode('email')}
                className={`py-1.5 px-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  otpSubMode === 'email'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-gray-600 hover:bg-gray-200/60'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Nhận qua Gmail</span>
              </button>
              <button
                type="button"
                onClick={() => setOtpSubMode('phone')}
                className={`py-1.5 px-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  otpSubMode === 'phone'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-gray-600 hover:bg-gray-200/60'
                }`}
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Nhận qua SMS</span>
              </button>
            </div>

            {otpSubMode === 'email' ? (
              <Input
                label="Địa chỉ Gmail của bạn"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nguyenvana@gmail.com"
                leftIcon={<Mail className="w-4 h-4" />}
              />
            ) : (
              <Input
                label="Số điện thoại của bạn"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0988 110 789"
                leftIcon={<Phone className="w-4 h-4" />}
              />
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              isLoading={isLoading}
              leftIcon={otpSubMode === 'email' ? <Mail className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
            >
              {otpSubMode === 'email' ? 'Gửi Mã OTP Về Gmail' : 'Gửi Mã OTP Qua SMS'}
            </Button>
          </form>
        )}

        {/* Tài khoản Demo 1-Chạm */}
        <div className="pt-2">
          <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center mb-2">
            Hoặc Đăng Nhập 1-Chạm Bằng Tài Khoản Mẫu:
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleDemoLogin('admin')}
              disabled={Boolean(demoLoadingType)}
              className="p-2.5 rounded-2xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-800 text-[11px] font-bold flex flex-col items-center gap-1 transition tap-bounce disabled:opacity-60 cursor-pointer shadow-2xs"
            >
              {demoLoadingType === 'admin' ? (
                <Loader2 className="w-4 h-4 text-purple-600 animate-spin" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-purple-600" />
              )}
              <span>Admin</span>
            </button>

            <button
              type="button"
              onClick={() => handleDemoLogin('owner')}
              disabled={Boolean(demoLoadingType)}
              className="p-2.5 rounded-2xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-[11px] font-bold flex flex-col items-center gap-1 transition tap-bounce disabled:opacity-60 cursor-pointer shadow-2xs"
            >
              {demoLoadingType === 'owner' ? (
                <Loader2 className="w-4 h-4 text-amber-600 animate-spin" />
              ) : (
                <Building2 className="w-4 h-4 text-amber-600" />
              )}
              <span>Chủ Trọ</span>
            </button>

            <button
              type="button"
              onClick={() => handleDemoLogin('renter')}
              disabled={Boolean(demoLoadingType)}
              className="p-2.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-[11px] font-bold flex flex-col items-center gap-1 transition tap-bounce disabled:opacity-60 cursor-pointer shadow-2xs"
            >
              {demoLoadingType === 'renter' ? (
                <Loader2 className="w-4 h-4 text-[#00a854] animate-spin" />
              ) : (
                <User className="w-4 h-4 text-[#00a854]" />
              )}
              <span>Sinh Viên</span>
            </button>
          </div>
        </div>

        {/* Social Login Separator */}
        <div className="relative flex py-1 items-center">
          <div className="flex-grow border-t border-gray-200"></div>
          <span className="flex-shrink mx-4 text-gray-400 text-xs font-medium uppercase tracking-wider">
            hoặc
          </span>
          <div className="flex-grow border-t border-gray-200"></div>
        </div>

        {/* Google 1-Click Button */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={isGoogleLoading}
          className="w-full py-3 px-4 rounded-2xl border border-gray-300 hover:border-gray-400 hover:bg-gray-50 flex items-center justify-center gap-3 transition-all font-semibold text-xs text-gray-700 shadow-2xs hover:shadow-xs disabled:opacity-50 cursor-pointer"
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
          {isGoogleLoading ? 'Đang kết nối Google...' : 'Tiếp tục với Google'}
        </button>

        {/* Footer Link */}
        <div className="text-center text-xs text-gray-600">
          Chưa có tài khoản Trọ Xinh?{' '}
          <Link
            to={returnUrl ? `/dang-ky?returnUrl=${encodeURIComponent(returnUrl)}` : '/dang-ky'}
            className="font-bold text-[#00a854] hover:underline"
          >
            Đăng ký ngay
          </Link>
        </div>
      </div>
    </div>
  );
};
