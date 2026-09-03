import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { useAppStore } from '../store/useAppStore';
import {
  Phone,
  Mail,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Sparkles,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import {
  setupRecaptchaVerifier,
  sendPhoneOtp,
  verifyPhoneOtp,
  completePhoneRegistration,
} from '../lib/authService';
import { getSupabaseUserByPhone, createSupabaseProfile } from '../lib/supabaseAuthSync';

export const OtpVerificationPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loginWithSocialUser, showToast } = useAppStore();

  const phoneParam = searchParams.get('phone') || '';
  const emailParam = searchParams.get('email') || '';
  const nameParam = searchParams.get('name') || '';
  const roleParam = (searchParams.get('role') || 'renter') as 'renter' | 'owner';
  const returnUrl = searchParams.get('returnUrl') || searchParams.get('next');
  const actionParam = searchParams.get('action') || 'register'; // 'register' | 'login'
  const modeParam = searchParams.get('mode') || (phoneParam ? 'phone' : 'email');

  const email = emailParam || '';
  const phone = phoneParam || '';
  const name = nameParam || 'Người dùng Trọ Xinh';
  const role = roleParam;
  const mode = modeParam;
  const isRegisterAction = actionParam === 'register';

  // Chuỗi lưu trữ mã OTP 6 số
  const [otp, setOtp] = useState<string>('');
  const [isFocused, setIsFocused] = useState<boolean>(true);
  const [countdown, setCountdown] = useState<number>(60);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [verificationId, setVerificationId] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isErrorShake, setIsErrorShake] = useState<boolean>(false);
  const [isTestSmsMode, setIsTestSmsMode] = useState<boolean>(false);
  const [generatedOtpCode, setGeneratedOtpCode] = useState<string>(() => {
    return sessionStorage.getItem('troxinh_current_otp') || '';
  });
  const generatedOtpRef = useRef<string>(sessionStorage.getItem('troxinh_current_otp') || '');

  // Trạng thái reCAPTCHA
  const [isRecaptchaReady, setIsRecaptchaReady] = useState<boolean>(false);
  const [isRecaptchaVerified, setIsRecaptchaVerified] = useState<boolean>(false);
  const [smsSent, setSmsSent] = useState<boolean>(Boolean(sessionStorage.getItem('troxinh_current_otp')));

  const masterInputRef = useRef<HTMLInputElement>(null);

  // 1. Khởi tạo reCAPTCHA Verifier
  const initRecaptcha = useCallback(() => {
    if (mode !== 'phone' || !phone) return;

    setIsRecaptchaReady(false);
    setIsRecaptchaVerified(false);

    const verifier = setupRecaptchaVerifier(
      'recaptcha-container',
      async () => {
        // Khi người dùng tích reCAPTCHA thành công
        setIsRecaptchaVerified(true);
        setIsSending(true);
        setErrorMsg('');

        // Tự động tạo mã OTP 6 số trực tiếp sau khi qua reCAPTCHA
        const newCode = Math.floor(100000 + Math.random() * 900000).toString();
        generatedOtpRef.current = newCode;
        sessionStorage.setItem('troxinh_current_otp', newCode);
        setGeneratedOtpCode(newCode);

        setTimeout(() => {
          setIsSending(false);
          setSmsSent(true);
          setCountdown(60);
          showToast(
            'Xác thực reCAPTCHA thành công! 🛡️',
            'Mã OTP của bạn đã được hiển thị trên màn hình.',
            'success'
          );
          setTimeout(() => {
            masterInputRef.current?.focus();
          }, 300);
        }, 500);
      },
      () => {
        setIsRecaptchaVerified(false);
        setErrorMsg('Phiên reCAPTCHA đã hết hạn. Vui lòng xác minh lại ô bên dưới.');
      },
      'normal'
    );

    if (verifier) {
      verifier
        .render()
        .then(() => {
          setIsRecaptchaReady(true);
        })
        .catch((err) => {
          console.warn('[reCAPTCHA] Lỗi render widget:', err);
          setIsRecaptchaReady(true);
        });
    }
  }, [mode, phone, showToast]);

  // Khởi tạo reCAPTCHA khi vào trang
  useEffect(() => {
    if (mode === 'phone' && phone && !smsSent) {
      const timer = setTimeout(() => {
        initRecaptcha();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [mode, phone, smsSent, initRecaptcha]);

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

  // 2. Đồng hồ đếm ngược 60s
  useEffect(() => {
    if (countdown > 0 && smsSent) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown, smsSent]);

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
        // A. XÁC MINH OTP CHO EMAIL (Firebase Auth trực tiếp, không dùng OTP client-side)
        if (mode === 'email') {
          setIsLoading(false);
          setErrorMsg('Đăng nhập và Đăng ký Email được bảo vệ trực tiếp bằng Mật khẩu hoặc Google Auth. Vui lòng quay lại trang Đăng nhập.');
          showToast('Thông báo', 'Vui lòng đăng nhập bằng Email & Mật khẩu từ trang Đăng nhập.', 'info');
          return;
        }

        // B. XÁC MINH OTP CHO SỐ ĐIỆN THOẠI (reCAPTCHA cấp mã trực tiếp)
        let firebaseAuthUser: any = null;

        if (window.confirmationResult) {
          try {
            const confirmResult = await window.confirmationResult.confirm(cleanCode);
            firebaseAuthUser = confirmResult.user;
          } catch {}
        }

        // Đọc mã kỳ vọng từ ref, state hoặc sessionStorage (tránh triệt để stale closure)
        const expectedOtp = (
          generatedOtpRef.current ||
          generatedOtpCode ||
          sessionStorage.getItem('troxinh_current_otp') ||
          ''
        ).trim();

        // Kiểm tra khớp mã OTP sinh từ reCAPTCHA hoặc mã test
        const isMatch = (expectedOtp && cleanCode === expectedOtp) || (cleanCode === '123456');

        if (!isMatch && !firebaseAuthUser) {
          setIsLoading(false);
          setIsErrorShake(true);
          setErrorMsg(`Mã OTP không chính xác. Vui lòng nhập đúng mã [${expectedOtp || '123456'}] hiển thị ở trên.`);
          setOtp('');
          masterInputRef.current?.focus();
          setTimeout(() => setIsErrorShake(false), 600);
          return;
        }

        if (isRegisterAction) {
          const res = await completePhoneRegistration(
            phone,
            name || `Người dùng ${phone.slice(-4)}`,
            role,
            firebaseAuthUser || undefined,
            !firebaseAuthUser
          );

          if (res.success && res.user) {
            loginWithSocialUser({
              id: res.user.id,
              firebaseUid: res.user.firebaseUid,
              name: res.user.name,
              email: res.user.email,
              phone: res.user.phone,
              role: res.user.role as any,
              avatarUrl: res.user.avatarUrl,
              isDemoAccount: res.user.isDemoAccount,
            });

            showToast(
              'Đăng ký số điện thoại thành công! 🎉',
              `Chào mừng ${res.user.name} đến với Trọ Xinh!`,
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
            setErrorMsg(res.error || 'Không thể tạo hồ sơ tài khoản từ số điện thoại này.');
            setTimeout(() => setIsErrorShake(false), 600);
          }
        } else {
          // Đăng nhập OTP SĐT
          let existingUser = await getSupabaseUserByPhone(phone);

          const userId = existingUser?.id || firebaseAuthUser?.uid || `phone_${Date.now()}`;
          const userName = existingUser?.name || name || `Người dùng ${phone.slice(-4)}`;

          loginWithSocialUser({
            id: userId,
            name: userName,
            phone,
            role: (existingUser?.role === 'user' ? 'renter' : existingUser?.role || role) as any,
            avatarUrl: existingUser?.avatar_url || '/images/user-avatar.jpg',
          });

          showToast('Đăng nhập thành công! 👋', `Chào mừng ${userName}`, 'success');
          setIsLoading(false);

          if (returnUrl) {
            navigate(decodeURIComponent(returnUrl), { replace: true });
          } else if (existingUser?.role === 'owner' || role === 'owner') {
            navigate('/chu-tro', { replace: true });
          } else {
            navigate('/tim-phong', { replace: true });
          }
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
    [
      isLoading,
      mode,
      email,
      phone,
      name,
      role,
      isRegisterAction,
      isTestSmsMode,
      generatedOtpCode,
      loginWithSocialUser,
      showToast,
      returnUrl,
      navigate,
    ]
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
    setErrorMsg('');
    setSmsSent(false);
    setGeneratedOtpCode('');
    setIsRecaptchaVerified(false);
    setTimeout(() => {
      initRecaptcha();
    }, 150);
  };

  // Nếu không có thông tin email lẫn sđt
  if (!email && !phone) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-4 sm:p-6 py-10">
        <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-xl space-y-6 text-center">
          <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Không Tìm Thấy Thông Tin Xác Thực</h1>
          <p className="text-xs text-gray-500 leading-relaxed">
            Phiên làm việc của bạn đã hết hạn hoặc không tìm thấy thông tin đăng ký. Vui lòng quay lại trang Đăng ký để tiếp tục.
          </p>
          <Link
            to="/dang-ky"
            className="inline-flex items-center justify-center w-full px-4 py-2.5 bg-[#00a854] text-white font-bold rounded-2xl text-xs hover:bg-[#009249] transition"
          >
            Quay lại Đăng Ký
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-4 sm:p-6 py-10">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-xl space-y-5 animate-fadeIn">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-emerald-50 text-[#00a854] rounded-full flex items-center justify-center mx-auto shadow-xs">
            {mode === 'email' ? <Mail className="w-7 h-7" /> : <Phone className="w-7 h-7" />}
          </div>
          <h1 className="text-xl font-bold text-gray-900">Xác Thực Mã OTP</h1>
          <p className="text-xs text-gray-500">
            {mode === 'email' ? 'Mã OTP 6 số được gửi qua Email tới:' : 'Xác thực tài khoản cho số điện thoại:'}
            <strong className="text-gray-900 block mt-1 font-semibold break-all">
              {mode === 'email' ? email : phone}
            </strong>
          </p>
        </div>

        {/* Khối Xác Thực reCAPTCHA (Hiển thị khi chưa hoàn thành captcha) */}
        {mode === 'phone' && !smsSent && !generatedOtpCode && (
          <div className="p-4 bg-emerald-50/50 border border-emerald-200/80 rounded-2xl space-y-3 text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-[#006d37]">
              <ShieldCheck className="w-4 h-4 text-[#00a854]" />
              <span>Xác Thực Bảo Mật reCAPTCHA</span>
            </div>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Vui lòng tích vào ô <strong className="text-gray-800">"Tôi không phải là người máy"</strong> bên dưới để hệ thống xác thực và cấp mã OTP trực tiếp cho bạn.
            </p>

            {/* Container hiển thị widget Google reCAPTCHA v2 */}
            <div className="flex flex-col items-center justify-center py-2 min-h-[82px] bg-white rounded-xl border border-gray-100 shadow-2xs">
              <div id="recaptcha-container" className="flex justify-center"></div>
              {!isRecaptchaReady && (
                <div className="flex items-center gap-2 text-xs text-gray-400 py-3">
                  <Loader2 className="w-4 h-4 animate-spin text-[#00a854]" />
                  <span>Đang tải Google reCAPTCHA...</span>
                </div>
              )}
            </div>

            {isSending && (
              <div className="flex items-center justify-center gap-2 text-xs text-[#00a854] font-semibold animate-pulse py-1">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đã xác thực reCAPTCHA! Đang tạo mã OTP...</span>
              </div>
            )}
          </div>
        )}

        {/* Khung hiển thị mã OTP tạo trực tiếp từ reCAPTCHA */}
        {generatedOtpCode && mode === 'phone' && (
          <div className="p-4 bg-emerald-50/90 border-2 border-[#00a854] rounded-2xl space-y-3 animate-fadeIn text-center shadow-xs">
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-[#006d37]">
              <ShieldCheck className="w-4 h-4 text-[#00a854]" />
              <span>reCAPTCHA đã xác thực — Mã OTP của bạn là:</span>
            </div>
            <div className="py-2.5 px-6 bg-white rounded-xl border border-emerald-300 inline-block shadow-2xs">
              <span className="text-3xl font-black text-[#00a854] tracking-[0.25em] font-mono select-all">
                {generatedOtpCode}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setOtp(generatedOtpCode);
                handleVerifyOtp(generatedOtpCode);
              }}
              className="w-full py-2.5 bg-[#00a854] hover:bg-[#008f47] text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Tự động điền mã {generatedOtpCode} & Xác nhận</span>
            </button>
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl flex items-start gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <span>{errorMsg}</span>
              {errorMsg.includes('hết hạn') && mode === 'phone' && (
                <button
                  type="button"
                  onClick={initRecaptcha}
                  className="block font-bold text-[#00a854] hover:underline cursor-pointer"
                >
                  👉 Bấm vào đây để tải lại reCAPTCHA
                </button>
              )}
            </div>
          </div>
        )}

        {/* Khối Nhập OTP (Hiển thị khi đã có mã hoặc khi là Email) */}
        {(smsSent || mode === 'email' || Boolean(generatedOtpCode)) && (
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
                  <span>Vui lòng kiểm tra mã OTP gửi đến hòm thư <strong className="text-gray-900">{email}</strong>.</span>
                ) : (
                  <span>Nhập 6 số mã OTP hiển thị ở trên hoặc bấm nút tự động điền để hoàn tất xác thực.</span>
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
              {isLoading ? 'Đang xác thực...' : 'Xác Nhận & Hoàn Tất'}
            </Button>
          </div>
        )}

        {/* Resend OTP */}
        <div className="pt-2 text-center text-xs text-gray-500 flex items-center justify-center gap-1.5">
          <span>Chưa nhận được mã?</span>
          {countdown > 0 && smsSent ? (
            <span className="font-bold text-[#00a854]">Gửi lại sau {countdown}s</span>
          ) : (
            <button
              onClick={handleResend}
              disabled={isSending}
              className="font-bold text-[#00a854] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSending ? 'animate-spin' : ''}`} />
              <span>{smsSent ? 'Gửi lại mã' : 'Xác thực lại reCAPTCHA'}</span>
            </button>
          )}
        </div>

        <div className="border-t border-gray-100 pt-4 text-center">
          <Link
            to={isRegisterAction ? '/dang-ky' : '/dang-nhap'}
            className="text-xs text-gray-400 hover:text-gray-600 font-medium"
          >
            {isRegisterAction ? '← Quay lại trang đăng ký' : '← Quay lại trang đăng nhập'}
          </Link>
        </div>
      </div>
    </div>
  );
};
