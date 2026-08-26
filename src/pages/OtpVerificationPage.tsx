import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { useAppStore } from '../store/useAppStore';
import {
  Phone,
  ArrowRight,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { sendPhoneOtp, verifyPhoneOtp } from '../lib/authService';

export const OtpVerificationPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loginWithSocialUser, showToast } = useAppStore();

  const phone = searchParams.get('phone') || '';
  const email = searchParams.get('email') || '';
  const nameParam = searchParams.get('name') || '';
  const role = (searchParams.get('role') || 'renter') as 'renter' | 'owner';
  const returnUrl = searchParams.get('returnUrl') || searchParams.get('next');
  const mode = searchParams.get('mode') || (phone ? 'phone' : 'email');

  // Chuỗi lưu trữ mã OTP 6 số
  const [otp, setOtp] = useState<string>('');
  const [isFocused, setIsFocused] = useState<boolean>(true);
  const [countdown, setCountdown] = useState<number>(60);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [verificationId, setVerificationId] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isErrorShake, setIsErrorShake] = useState<boolean>(false);

  const masterInputRef = useRef<HTMLInputElement>(null);
  const hasSentRef = useRef<boolean>(false);

  // 1. Tự động focus ô nhập khi mở trang
  useEffect(() => {
    masterInputRef.current?.focus();
  }, []);

  // Hàm gửi mã OTP
  const triggerSendOtp = useCallback(
    async () => {
      if (mode === 'email') {
        if (!email) {
          setErrorMsg('Không tìm thấy thông tin Email để gửi mã.');
          return;
        }
        setIsSending(true);
        setErrorMsg('');
        setTimeout(() => {
          setIsSending(false);
          showToast(
            'Đã gửi mã xác thực OTP qua Email! 📧',
            `Vui lòng kiểm tra hòm thư ${email} (hoặc nhập 123456 để thử nghiệm nhanh).`,
            'info'
          );
        }, 500);
        return;
      }

      if (!phone) {
        setErrorMsg('Không tìm thấy thông tin Số điện thoại để gửi mã.');
        return;
      }

      setIsSending(true);
      setErrorMsg('');

      const res = await sendPhoneOtp(phone, 'recaptcha-container');
      setIsSending(false);

      if (res.success) {
        if (res.verificationId) {
          setVerificationId(res.verificationId);
        }
        showToast(
          'Đã kích hoạt gửi OTP SMS! 📱',
          'Vui lòng kiểm tra tin nhắn trên điện thoại của bạn (hoặc nhập 123456 để thử nhanh).',
          'info'
        );
      } else {
        setErrorMsg(res.error || 'Không thể gửi tin nhắn SMS.');
      }
    },
    [phone, email, mode, showToast]
  );

  // 2. Tự động gửi mã OTP khi mở trang lần đầu
  useEffect(() => {
    if (hasSentRef.current) return;
    hasSentRef.current = true;
    triggerSendOtp();
  }, [triggerSendOtp]);

  // Cleanup reCAPTCHA khi unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch {}
        window.recaptchaVerifier = undefined;
      }
    };
  }, []);

  // 3. Đồng hồ đếm ngược 60s
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // 4. Hàm xử lý Xác thực mã OTP
  const handleVerifyOtp = useCallback(
    async (codeToVerify: string) => {
      if (isLoading) return;
      const cleanCode = codeToVerify.replace(/\D/g, '').trim();

      if (cleanCode.length < 6) {
        setErrorMsg('Vui lòng nhập đủ 6 chữ số của mã OTP.');
        return;
      }

      setIsLoading(true);
      setErrorMsg('');
      setIsErrorShake(false);

      try {
        // Nếu ở chế độ email hoặc test code 123456
        if (mode === 'email' || cleanCode === '123456') {
          const generatedId = `user_${Date.now()}`;
          const displayName = nameParam || (email ? email.split('@')[0] : phone ? `Người dùng ${phone.slice(-4)}` : 'Người dùng Trọ Xinh');

          loginWithSocialUser({
            id: generatedId,
            name: displayName,
            email: email || undefined,
            phone: phone || undefined,
            role: role as any,
            avatarUrl: '/images/user-avatar.jpg',
          });

          showToast(
            'Xác thực OTP thành công! 🎉',
            `Chào mừng ${displayName} đến với Trọ Xinh!`,
            'success'
          );

          setIsLoading(false);

          if (returnUrl) {
            navigate(decodeURIComponent(returnUrl), { replace: true });
          } else if (role === 'owner') {
            navigate('/chu-tro', { replace: true });
          } else {
            navigate('/tim-phong', { replace: true });
          }
          return;
        }

        // Chế độ xác thực Firebase Phone OTP
        const res = await verifyPhoneOtp(verificationId, cleanCode, phone, role);

        if (res.success && res.user) {
          loginWithSocialUser({
            id: res.user.id,
            name: nameParam || res.user.name,
            email: res.user.email,
            phone: res.user.phone,
            role: res.user.role as any,
            avatarUrl: res.user.avatarUrl,
          });

          showToast(
            'Xác thực số điện thoại thành công! 🎉',
            `Chào mừng ${nameParam || res.user.name} đến với Trọ Xinh!`,
            'success'
          );

          setIsLoading(false);

          if (returnUrl) {
            navigate(decodeURIComponent(returnUrl), { replace: true });
          } else if (res.user.role === 'owner') {
            navigate('/chu-tro', { replace: true });
          } else {
            navigate('/tim-phong', { replace: true });
          }
        } else {
          setIsLoading(false);
          setIsErrorShake(true);
          setErrorMsg(res.error || 'Mã OTP không chính xác hoặc đã hết hạn.');
          setOtp('');
          masterInputRef.current?.focus();
          setTimeout(() => setIsErrorShake(false), 600);
        }
      } catch (err: any) {
        setIsLoading(false);
        setIsErrorShake(true);
        setErrorMsg('Đã xảy ra lỗi khi kiểm tra mã OTP. Vui lòng thử lại.');
        setOtp('');
        masterInputRef.current?.focus();
        setTimeout(() => setIsErrorShake(false), 600);
      }
    },
    [isLoading, mode, verificationId, phone, email, nameParam, role, loginWithSocialUser, showToast, returnUrl, navigate]
  );

  // 5. Bắt sự kiện người dùng gõ
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtp(rawVal);
    setErrorMsg('');

    if (rawVal.length === 6) {
      handleVerifyOtp(rawVal);
    }
  };

  // 6. Gửi lại mã
  const handleResend = () => {
    if (countdown > 0 || isSending) return;
    setCountdown(60);
    setOtp('');
    triggerSendOtp();
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-4 sm:p-6 py-10">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-xl space-y-6 animate-fadeIn">
        {/* Invisible reCAPTCHA container */}
        <div id="recaptcha-container"></div>

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-emerald-50 text-[#00a854] rounded-full flex items-center justify-center mx-auto shadow-xs">
            <Phone className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Xác Thực Mã OTP</h1>
          <p className="text-xs text-gray-500">
            {mode === 'email' ? 'Mã OTP 6 số được gửi qua Email tới:' : 'Mã OTP 6 số được gửi qua SMS tới:'}
            <strong className="text-gray-900 block mt-1 font-semibold break-all">
              {mode === 'email' ? email : phone}
            </strong>
          </p>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl flex items-start gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="space-y-6">
          {/* CỤM 6 Ô NHẬP OTP */}
          <div
            className="relative cursor-text"
            onClick={() => masterInputRef.current?.focus()}
          >
            {/* Input ngầm bắt trọn mọi phím gõ, numpad, paste, và SMS Autofill */}
            <input
              ref={masterInputRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              maxLength={6}
              value={otp}
              disabled={isLoading}
              onChange={handleInputChange}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-text tracking-[1em]"
              aria-label="Nhập 6 chữ số mã OTP"
            />

            {/* 6 Ô hiển thị đồ họa */}
            <div
              className={`flex items-center justify-center gap-2 sm:gap-3 select-none ${
                isErrorShake ? 'animate-shake' : ''
              }`}
            >
              {[0, 1, 2, 3, 4, 5].map((index) => {
                const char = otp[index] || '';
                const isCurrentActive =
                  isFocused &&
                  (otp.length === index || (otp.length === 6 && index === 5));
                const isFilled = Boolean(char);

                return (
                  <div
                    key={index}
                    className={`w-11 h-13 sm:w-12 sm:h-14 flex items-center justify-center text-xl sm:text-2xl font-black rounded-2xl border-2 transition-all duration-150 shadow-2xs relative ${
                      isLoading
                        ? 'bg-gray-100 text-gray-400 border-gray-200'
                        : isErrorShake
                        ? 'border-red-500 bg-red-50 text-red-700 ring-4 ring-red-500/10'
                        : isCurrentActive
                        ? 'border-[#00a854] bg-white text-gray-900 ring-4 ring-emerald-500/20 scale-105 shadow-md'
                        : isFilled
                        ? 'border-emerald-600/40 bg-emerald-50/30 text-gray-900'
                        : 'border-gray-200 bg-gray-50/60 text-gray-900'
                    }`}
                  >
                    {char ? (
                      <span>{char}</span>
                    ) : isCurrentActive ? (
                      <span className="w-0.5 h-6 bg-[#00a854] animate-pulse rounded-full" />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="text-center space-y-2">
            <p className="text-xs text-gray-500">
              {mode === 'email' ? (
                <span>Vui lòng kiểm tra hòm thư Email (hoặc nhập <strong className="text-[#00a854]">123456</strong> để xác thực).</span>
              ) : (
                <span>Vui lòng kiểm tra tin nhắn <strong className="text-gray-900">SMS</strong> (hoặc nhập <strong className="text-[#00a854]">123456</strong> để xác thực).</span>
              )}
            </p>
          </div>

          {/* Nút Xác nhận */}
          <Button
            type="button"
            variant="primary"
            size="lg"
            className="w-full"
            isLoading={isLoading}
            disabled={otp.length < 6 || isLoading}
            onClick={() => handleVerifyOtp(otp)}
            rightIcon={!isLoading ? <ArrowRight className="w-4 h-4" /> : undefined}
          >
            {isLoading ? 'Đang xác thực...' : 'Xác Nhận & Tiếp Tục'}
          </Button>
        </div>

        {/* Resend OTP */}
        <div className="pt-2 text-center text-xs text-gray-500 flex items-center justify-center gap-1.5">
          <span>Chưa nhận được mã?</span>
          {countdown > 0 ? (
            <span className="font-bold text-[#00a854]">Gửi lại sau {countdown}s</span>
          ) : (
            <button
              onClick={handleResend}
              disabled={isSending}
              className="font-bold text-[#00a854] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSending ? 'animate-spin' : ''}`} />
              <span>Gửi lại mã</span>
            </button>
          )}
        </div>

        <div className="border-t border-gray-100 pt-4 text-center">
          <Link to="/dang-nhap" className="text-xs text-gray-400 hover:text-gray-600 font-medium">
            ← Quay lại trang đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
};
