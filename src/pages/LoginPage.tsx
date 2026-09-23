import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import {
  loginWithGoogle,
  loginWithFacebook,
  loginWithApple,
  loginWithEmailPassword,
  loginWithDemoAccount,
} from '../lib/authService';
import {
  AlertCircle,
  Sparkles,
  ArrowRight,
  ChevronLeft,
} from 'lucide-react';
import { isValidReturnUrl } from '../lib/auth/redirectAfterAuth';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loginWithSocialUser, showToast } = useAppStore();

  const returnUrl = searchParams.get('returnUrl') || searchParams.get('next');
  const roleParam = (searchParams.get('role') || 'renter') as 'renter' | 'owner';

  // Steps: 'main' | 'password'
  const [step, setStep] = useState<'main' | 'password'>('main');
  const [identifier, setIdentifier] = useState<string>('');
  const [password, setPassword] = useState<string>('');

  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSocialLoading, setIsSocialLoading] = useState<string | null>(null);

  const isEmail = identifier.includes('@');

  const handleFinishLogin = (user: any) => {
    loginWithSocialUser({
      id: user.id,
      firebaseUid: user.firebaseUid,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      avatarUrl: user.avatarUrl,
      isDemoAccount: Boolean(user.isDemoAccount),
    });

    showToast('Đăng nhập thành công! 🎉', `Chào mừng ${user.name}`, 'success');

    if (returnUrl) {
      const decodedUrl = decodeURIComponent(returnUrl);
      if (isValidReturnUrl(decodedUrl, user.role)) {
        navigate(decodedUrl);
        return;
      }
    }

    if (user.role === 'owner') {
      navigate('/chu-tro');
    } else if (user.role === 'admin') {
      navigate('/admin');
    } else {
      navigate('/tim-phong');
    }
  };

  // 1. Social: Google
  const handleGoogleLogin = async () => {
    setError('');
    setIsSocialLoading('google');
    try {
      const res = await loginWithGoogle(roleParam);
      if (res.success && res.user) {
        handleFinishLogin(res.user);
      } else {
        setError(res.error || 'Đăng nhập Google không thành công.');
      }
    } catch {
      setError('Lỗi khi kết nối Google.');
    } finally {
      setIsSocialLoading(null);
    }
  };

  // 2. Social: Facebook
  const handleFacebookLogin = async () => {
    setError('');
    setIsSocialLoading('facebook');
    try {
      const res = await loginWithFacebook(roleParam);
      if (res.success && res.user) {
        handleFinishLogin(res.user);
      } else {
        setError(res.error || 'Đăng nhập Facebook không thành công.');
      }
    } catch {
      setError('Lỗi khi kết nối Facebook.');
    } finally {
      setIsSocialLoading(null);
    }
  };

  // 3. Social: Apple
  const handleAppleLogin = async () => {
    setError('');
    setIsSocialLoading('apple');
    try {
      const res = await loginWithApple(roleParam);
      if (res.success && res.user) {
        handleFinishLogin(res.user);
      } else {
        setError(res.error || 'Đăng nhập Apple không thành công.');
      }
    } catch {
      setError('Lỗi khi kết nối Apple.');
    } finally {
      setIsSocialLoading(null);
    }
  };

  // 4. Form Submit (Tiếp tục)
  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) return;
    setError('');

    if (isEmail) {
      setStep('password');
    } else {
      const cleanPhone = identifier.replace(/\D/g, '');
      if (cleanPhone.length < 10) {
        setError('Số điện thoại không hợp lệ (tối thiểu 10 chữ số).');
        return;
      }
      const otpUrl = `/xac-thuc-otp?mode=phone&phone=${encodeURIComponent(cleanPhone)}&role=${roleParam}&action=login${
        returnUrl ? `&returnUrl=${encodeURIComponent(returnUrl)}` : ''
      }`;
      navigate(otpUrl);
    }
  };

  // 5. Submit Password
  const handleEmailPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Vui lòng nhập mật khẩu.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await loginWithEmailPassword(identifier.trim().toLowerCase(), password);
      if (res.success && res.user) {
        handleFinishLogin(res.user);
      } else {
        setError(res.error || 'Email hoặc mật khẩu không chính xác.');
      }
    } catch {
      setError('Đã có lỗi xảy ra khi xác thực.');
    } finally {
      setIsLoading(false);
    }
  };

  // 6. Quick Demo
  const handleQuickDemo = async (role: 'renter' | 'owner' | 'admin') => {
    setIsLoading(true);
    try {
      const res = await loginWithDemoAccount(role);
      if (res.success && res.user) {
        handleFinishLogin(res.user);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-4 sm:p-6 py-10 bg-gray-50">
      <div className="relative w-full max-w-[430px] bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-gray-100 space-y-4 animate-scaleUp overflow-hidden">
        {/* Nút quay lại khi ở step con */}
        {step !== 'main' && (
          <button
            onClick={() => {
              setStep('main');
              setError('');
            }}
            className="absolute top-4 left-4 p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition z-10 flex items-center gap-1 text-xs font-semibold cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Quay lại</span>
          </button>
        )}

        {/* Header chuẩn phong cách Chợ Tốt */}
        <div className="flex items-center justify-between pt-1">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              {step === 'main' && 'Đăng nhập/Đăng ký'}
              {step === 'password' && 'Nhập Mật Khẩu'}
            </h1>
            <p className="text-[12px] text-gray-500 mt-0.5">
              {step === 'main' && 'Tiếp cận hàng chục ngàn phòng trọ sinh viên Hà Nội'}
              {step === 'password' && `Tài khoản: ${identifier}`}
            </p>
          </div>

          {/* Mascot Trọ Xinh */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 relative -mr-1">
            <img
              src="/images/mascot.png"
              alt="Trọ Xinh Mascot"
              className="w-full h-full object-contain drop-shadow-sm"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl flex items-start gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <span>{error}</span>
              {(error.includes('Không tìm thấy') || error.includes('Đăng ký')) && (
                <Link
                  to={returnUrl ? `/dang-ky?returnUrl=${encodeURIComponent(returnUrl)}` : '/dang-ky'}
                  className="block font-bold text-[#00a854] hover:underline"
                >
                  👉 Bấm vào đây để Đăng ký tài khoản mới
                </Link>
              )}
            </div>
          </div>
        )}

        {/* ================= STEP 1: MAIN ================= */}
        {step === 'main' && (
          <div className="space-y-3.5 pt-1">
            {/* 1. Tiếp tục với Google */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={!!isSocialLoading || isLoading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-[#f0f2f5] hover:bg-[#e4e6e9] text-gray-900 font-bold rounded-full transition active:scale-98 disabled:opacity-60 text-sm shadow-2xs cursor-pointer"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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
              <span>{isSocialLoading === 'google' ? 'Đang kết nối Google...' : 'Tiếp tục với Google'}</span>
            </button>

            {/* 2. Tiếp tục với Facebook */}
            <button
              type="button"
              onClick={handleFacebookLogin}
              disabled={!!isSocialLoading || isLoading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white hover:bg-gray-50 text-gray-900 font-bold rounded-full border border-gray-300 transition active:scale-98 disabled:opacity-60 text-sm shadow-2xs cursor-pointer"
            >
              <svg className="w-5 h-5 text-[#1877F2] shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              <span>{isSocialLoading === 'facebook' ? 'Đang kết nối...' : 'Tiếp tục với Facebook'}</span>
            </button>

            {/* 3. Tiếp tục với Apple */}
            <button
              type="button"
              onClick={handleAppleLogin}
              disabled={!!isSocialLoading || isLoading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white hover:bg-gray-50 text-gray-900 font-bold rounded-full border border-gray-300 transition active:scale-98 disabled:opacity-60 text-sm shadow-2xs cursor-pointer"
            >
              <svg className="w-5 h-5 text-gray-900 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.93-2.85-.9.04-1.99.6-2.64 1.35-.57.65-.98 1.72-.85 2.74 1.01.08 2.03-.54 2.56-1.24z" />
              </svg>
              <span>{isSocialLoading === 'apple' ? 'Đang kết nối...' : 'Tiếp tục với Apple'}</span>
            </button>

            {/* Hoặc Divider */}
            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-3 bg-white text-gray-400 font-medium">Hoặc</span>
              </div>
            </div>

            {/* Form Số điện thoại */}
            <form onSubmit={handleContinue} className="space-y-3">
              <div>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    setError('');
                  }}
                  placeholder="Số điện thoại"
                  className="w-full px-4 py-3 bg-white border border-gray-300 focus:border-[#00a854] focus:ring-2 focus:ring-[#00a854]/20 rounded-2xl text-sm font-medium text-gray-900 placeholder:text-gray-400 outline-hidden transition"
                />
              </div>

              <button
                type="submit"
                disabled={!identifier.trim() || isLoading}
                className={`w-full py-3 px-4 font-bold rounded-2xl text-sm transition active:scale-98 shadow-xs flex items-center justify-center gap-2 ${
                  identifier.trim()
                    ? 'bg-[#00a854] hover:bg-[#009249] text-white cursor-pointer'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                <span>{isLoading ? 'Đang xử lý...' : 'Tiếp tục'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Tài khoản trải nghiệm nhanh 1-Chạm */}
            <div className="pt-2 border-t border-dashed border-gray-200">
              <p className="text-[11px] text-gray-400 text-center font-medium mb-1.5 flex items-center justify-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>Tài khoản thử nghiệm nhanh (1-Chạm):</span>
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleQuickDemo('renter')}
                  className="py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-[#006d37] text-[11px] font-bold rounded-xl border border-emerald-200 transition text-center cursor-pointer"
                >
                  Người thuê
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemo('owner')}
                  className="py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-[#006492] text-[11px] font-bold rounded-xl border border-blue-200 transition text-center cursor-pointer"
                >
                  Chủ trọ
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemo('admin')}
                  className="py-1.5 px-2 bg-purple-50 hover:bg-purple-100 text-purple-700 text-[11px] font-bold rounded-xl border border-purple-200 transition text-center cursor-pointer"
                >
                  Admin
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 2: PASSWORD ================= */}
        {step === 'password' && (
          <form onSubmit={handleEmailPasswordSubmit} className="space-y-4 pt-1">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Mật khẩu của bạn</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu tài khoản"
                autoFocus
                required
                className="w-full px-4 py-3 bg-white border border-gray-300 focus:border-[#00a854] focus:ring-2 focus:ring-[#00a854]/20 rounded-2xl text-sm font-medium text-gray-900 placeholder:text-gray-400 outline-hidden transition"
              />
            </div>

            <button
              type="submit"
              disabled={!password || isLoading}
              className="w-full py-3 px-4 bg-[#00a854] hover:bg-[#009249] text-white font-bold rounded-2xl text-sm transition active:scale-98 shadow-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <span>{isLoading ? 'Đang xác thực...' : 'Đăng Nhập Ngay'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
              <Link
                to="/quen-mat-khau"
                className="text-[#00a854] hover:underline font-semibold"
              >
                Quên mật khẩu?
              </Link>
              <Link
                to={`/dang-ky?email=${encodeURIComponent(identifier)}`}
                className="text-gray-600 hover:text-gray-900 font-semibold"
              >
                Tạo tài khoản mới →
              </Link>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
