import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUIStore } from '../../store/useUIStore';
import { useAppStore } from '../../store/useAppStore';
import {
  loginWithGoogle,
  loginWithFacebook,
  loginWithApple,
  loginWithEmailPassword,
  loginWithDemoAccount,
} from '../../lib/authService';
import {
  X,
  Phone,
  Mail,
  Lock,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
} from 'lucide-react';

export const AuthModal: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthModalOpen, authModalMode, closeAuthModal } = useUIStore();
  const { loginWithSocialUser, showToast } = useAppStore();

  // Screen steps: 'main' | 'password'
  const [step, setStep] = useState<'main' | 'password'>('main');
  const [identifier, setIdentifier] = useState<string>(''); // Phone or Email
  const [password, setPassword] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSocialLoading, setIsSocialLoading] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  const currentPath = location.pathname + location.search;
  const isEmail = identifier.includes('@');
  const isPhone = !isEmail && identifier.replace(/\D/g, '').length >= 9;
  const isValidIdentifier = isEmail || isPhone;

  const handleClose = () => {
    setErrorMsg('');
    setStep('main');
    setIdentifier('');
    setPassword('');
    closeAuthModal();
  };

  // 1. Social Login: Google
  const handleGoogleLogin = async () => {
    setErrorMsg('');
    setIsSocialLoading('google');
    try {
      const res = await loginWithGoogle('renter');
      if (res.success && res.user) {
        loginWithSocialUser({
          id: res.user.id,
          firebaseUid: res.user.firebaseUid,
          name: res.user.name,
          email: res.user.email,
          phone: res.user.phone,
          role: res.user.role,
          avatarUrl: res.user.avatarUrl,
          isDemoAccount: Boolean(res.user.isDemoAccount),
        });
        showToast('Đăng nhập thành công! 🎉', `Chào mừng ${res.user.name}`, 'success');
        handleClose();
      } else {
        setErrorMsg(res.error || 'Đăng nhập Google không thành công.');
      }
    } catch (err: any) {
      setErrorMsg('Lỗi khi xác thực tài khoản Google.');
    } finally {
      setIsSocialLoading(null);
    }
  };

  // 2. Social Login: Facebook
  const handleFacebookLogin = async () => {
    setErrorMsg('');
    setIsSocialLoading('facebook');
    try {
      const res = await loginWithFacebook('renter');
      if (res.success && res.user) {
        loginWithSocialUser({
          id: res.user.id,
          firebaseUid: res.user.firebaseUid,
          name: res.user.name,
          email: res.user.email,
          phone: res.user.phone,
          role: res.user.role,
          avatarUrl: res.user.avatarUrl,
          isDemoAccount: Boolean(res.user.isDemoAccount),
        });
        showToast('Đăng nhập Facebook thành công! 🎉', `Chào mừng ${res.user.name}`, 'success');
        handleClose();
      } else {
        setErrorMsg(res.error || 'Đăng nhập Facebook không thành công.');
      }
    } catch (err: any) {
      setErrorMsg('Lỗi khi xác thực tài khoản Facebook.');
    } finally {
      setIsSocialLoading(null);
    }
  };

  // 3. Social Login: Apple
  const handleAppleLogin = async () => {
    setErrorMsg('');
    setIsSocialLoading('apple');
    try {
      const res = await loginWithApple('renter');
      if (res.success && res.user) {
        loginWithSocialUser({
          id: res.user.id,
          firebaseUid: res.user.firebaseUid,
          name: res.user.name,
          email: res.user.email,
          phone: res.user.phone,
          role: res.user.role,
          avatarUrl: res.user.avatarUrl,
          isDemoAccount: Boolean(res.user.isDemoAccount),
        });
        showToast('Đăng nhập Apple thành công! 🎉', `Chào mừng ${res.user.name}`, 'success');
        handleClose();
      } else {
        setErrorMsg(res.error || 'Đăng nhập Apple không thành công.');
      }
    } catch (err: any) {
      setErrorMsg('Lỗi khi xác thực tài khoản Apple.');
    } finally {
      setIsSocialLoading(null);
    }
  };

  // 3. Xử lý khi bấm nút "Tiếp tục"
  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim()) return;
    setErrorMsg('');

    const cleanInput = identifier.trim();

    if (isEmail) {
      // Email -> Chuyển sang nhập mật khẩu
      setStep('password');
    } else {
      // Số điện thoại -> Chuyển sang màn hình xác thực OTP chuẩn có reCAPTCHA Firebase
      const cleanPhone = cleanInput.replace(/\D/g, '');
      if (cleanPhone.length < 10) {
        setErrorMsg('Số điện thoại không hợp lệ (tối thiểu 10 số).');
        return;
      }

      handleClose();
      navigate(`/xac-thuc-otp?mode=phone&phone=${encodeURIComponent(cleanPhone)}&action=${authModalMode}&role=renter`);
    }
  };

  // 4. Xử lý Đăng nhập Email & Mật khẩu
  const handleEmailPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setErrorMsg('Vui lòng nhập mật khẩu.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const res = await loginWithEmailPassword(identifier.trim().toLowerCase(), password);
      if (res.success && res.user) {
        loginWithSocialUser({
          id: res.user.id,
          firebaseUid: res.user.firebaseUid,
          name: res.user.name,
          email: res.user.email,
          phone: res.user.phone,
          role: res.user.role,
          avatarUrl: res.user.avatarUrl,
          isDemoAccount: Boolean(res.user.isDemoAccount),
        });
        showToast('Đăng nhập thành công! 🎉', `Chào mừng ${res.user.name}`, 'success');
        handleClose();
      } else {
        setErrorMsg(res.error || 'Email hoặc mật khẩu không chính xác.');
      }
    } catch (err: any) {
      setErrorMsg('Đã có lỗi xảy ra khi đăng nhập.');
    } finally {
      setIsLoading(false);
    }
  };

  // 5. Đăng nhập nhanh Demo
  const handleQuickDemo = async (role: 'renter' | 'owner' | 'admin') => {
    setIsLoading(true);
    try {
      const res = await loginWithDemoAccount(role);
      if (res.success && res.user) {
        loginWithSocialUser({
          id: res.user.id,
          firebaseUid: res.user.firebaseUid,
          name: res.user.name,
          email: res.user.email,
          phone: res.user.phone,
          role: res.user.role,
          avatarUrl: res.user.avatarUrl,
          isDemoAccount: Boolean(res.user.isDemoAccount),
        });
        showToast(
          'Đăng nhập tài khoản mẫu thành công! 🎉',
          `Bạn đang đăng nhập với quyền ${role === 'admin' ? 'Ban Quản Trị' : role === 'owner' ? 'Chủ Trọ' : 'Người Thuê'}`,
          'success'
        );
        handleClose();
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      {/* Container phong cách Chợ Tốt */}
      <div className="relative w-full max-w-[430px] bg-white rounded-3xl p-6 sm:p-7 shadow-2xl border border-gray-100 space-y-4 animate-scaleUp overflow-hidden">
        {/* Nút đóng X */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition z-10"
          aria-label="Đóng"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Nút quay lại khi ở step con */}
        {step !== 'main' && (
          <button
            onClick={() => {
              setStep('main');
              setErrorMsg('');
            }}
            className="absolute top-4 left-4 p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition z-10 flex items-center gap-1 text-xs font-semibold"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Quay lại</span>
          </button>
        )}

        {/* Header: Tiêu đề + Mascot Trọ Xinh chuẩn phong cách Chợ Tốt */}
        <div className="flex items-center justify-between pt-1">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              {step === 'main' && 'Đăng nhập/Đăng ký'}
              {step === 'password' && 'Nhập Mật Khẩu'}
            </h2>
            <p className="text-[12px] text-gray-500 mt-0.5">
              {step === 'main' && 'Tiếp cận hàng chục ngàn phòng trọ xinh xắn'}
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
                // Fallback nếu ảnh chưa tải
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl flex items-start gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ================= STEP 1: MAIN SOCIAL & PHONE INPUT ================= */}
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
                    setErrorMsg('');
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
                  className="py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-[#006d37] text-[11px] font-bold rounded-xl border border-emerald-200 transition text-center"
                >
                  Người thuê
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemo('owner')}
                  className="py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-[#006492] text-[11px] font-bold rounded-xl border border-blue-200 transition text-center"
                >
                  Chủ trọ
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemo('admin')}
                  className="py-1.5 px-2 bg-purple-50 hover:bg-purple-100 text-purple-700 text-[11px] font-bold rounded-xl border border-purple-200 transition text-center"
                >
                  Admin
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 2: PASSWORD (CHO EMAIL) ================= */}
        {step === 'password' && (
          <form onSubmit={handleEmailPasswordSubmit} className="space-y-4 pt-1">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Mật khẩu của bạn</label>
              <div className="relative">
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
              <button
                type="button"
                onClick={() => {
                  handleClose();
                  navigate('/quen-mat-khau');
                }}
                className="text-[#00a854] hover:underline font-semibold"
              >
                Quên mật khẩu?
              </button>
              <button
                type="button"
                onClick={() => {
                  handleClose();
                  navigate(`/dang-ky?email=${encodeURIComponent(identifier)}`);
                }}
                className="text-gray-600 hover:text-gray-900 font-semibold"
              >
                Tạo tài khoản mới →
              </button>
            </div>
          </form>
        )}



        {/* Footer: Quy chế, Chính sách & Logo hệ sinh thái Chợ Tốt / Trọ Xinh */}
        <div className="pt-3 border-t border-gray-100 text-center space-y-3">
          <div className="flex items-center justify-center gap-2 text-[11px] text-gray-400 flex-wrap">
            <a href="/dieu-khoan" target="_blank" rel="noreferrer" className="hover:text-gray-600 underline">
              Quy chế hoạt động sàn
            </a>
            <span>•</span>
            <a href="/chinh-sach-bao-mat" target="_blank" rel="noreferrer" className="hover:text-gray-600 underline">
              Chính sách bảo mật
            </a>
            <span>•</span>
            <a href="#support" onClick={(e) => { e.preventDefault(); showToast('Hotline hỗ trợ', '1900 6868 (8:00 - 21:00 hàng ngày)', 'info'); }} className="hover:text-gray-600 underline">
              Liên hệ hỗ trợ
            </a>
          </div>

          {/* Logo Hệ sinh thái Trọ Xinh phong cách Chợ Tốt */}
          <div className="flex items-center justify-center gap-3 pt-0.5 opacity-85 select-none">
            <span className="text-xs font-black tracking-tight text-[#00a854]">
              TRỌ<span className="text-emerald-700">XINH</span>
            </span>
            <span className="text-xs font-black tracking-tight text-[#f37021]">
              NHÀ<span className="text-amber-700">TỐT</span>
            </span>
            <span className="text-xs font-black tracking-tight text-[#006492]">
              VIỆC<span className="text-blue-700">TỐT</span>
            </span>
            <span className="text-xs font-black tracking-tight text-[#f5a623]">
              CHỢ<span className="text-amber-600">XE</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
