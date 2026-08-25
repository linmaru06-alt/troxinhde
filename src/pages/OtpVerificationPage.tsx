import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { useAppStore } from '../store/useAppStore';
import {
  Mail,
  Phone,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Sparkles,
  ArrowLeftRight,
  Info,
} from 'lucide-react';
import { sendEmailOtp, verifyEmailOtp, sendPhoneOtp, verifyPhoneOtp } from '../lib/authService';
import { syncUserToSupabase, getSupabaseUserByPhone, getSupabaseUserByEmail } from '../lib/supabaseAuthSync';
import { auth, createUserWithEmailAndPassword } from '../lib/firebase';

export const OtpVerificationPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loginWithPhone, registerUser, showToast } = useAppStore();

  const email = searchParams.get('email') || '';
  const phone = searchParams.get('phone') || '';
  const role = (searchParams.get('role') || 'renter') as 'renter' | 'owner';
  const name = searchParams.get('name') || '';
  const returnUrl = searchParams.get('returnUrl') || searchParams.get('next');
  const modeParam = searchParams.get('mode') as 'phone' | 'email' | null;

  // Xác định chế độ xác thực ban đầu (Ưu tiên Phone nếu đăng ký SĐT hoặc có param mode=phone)
  const initialMode: 'phone' | 'email' =
    modeParam === 'email' || (!phone && Boolean(email))
      ? 'email'
      : 'phone';

  // Chuỗi lưu trữ mã OTP 6 số
  const [otp, setOtp] = useState<string>('');
  const [isFocused, setIsFocused] = useState<boolean>(true);
  const [countdown, setCountdown] = useState<number>(60);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [verificationId, setVerificationId] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isErrorShake, setIsErrorShake] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'email' | 'phone'>(initialMode);
  const [simulatedCode, setSimulatedCode] = useState<string>('');

  const masterInputRef = useRef<HTMLInputElement>(null);
  const hasSentRef = useRef<boolean>(false);

  // 1. Tự động focus ô nhập khi mở trang
  useEffect(() => {
    masterInputRef.current?.focus();
  }, []);

  // Hàm gửi mã OTP
  const triggerSendOtp = useCallback(
    async (mode: 'email' | 'phone') => {
      setIsSending(true);
      setErrorMsg('');
      setSimulatedCode('');

      if (mode === 'email' && email) {
        setAuthMode('email');
        const res = await sendEmailOtp(email);
        setIsSending(false);
        if (res.success) {
          showToast(
            'Đã gửi mã xác thực về Gmail! 📧',
            `Vui lòng kiểm tra hộp thư đến của ${email}.`,
            'success'
          );
        } else {
          setErrorMsg(res.error || 'Không thể gửi email xác thực.');
        }
      } else if (phone) {
        setAuthMode('phone');
        const res = await sendPhoneOtp(phone, 'recaptcha-container');
        setIsSending(false);
        if (res.success) {
          if (res.verificationId) {
            setVerificationId(res.verificationId);
          }
          if (res.isSimulated && res.demoOtp) {
            setSimulatedCode(res.demoOtp);
            showToast(
              `Mã OTP thử nghiệm: ${res.demoOtp}`,
              'Môi trường chạy thử nghiệm SMS.',
              'info'
            );
          } else {
            showToast(
              'Đã kích hoạt gửi OTP SMS!',
              'Vui lòng kiểm tra tin nhắn trên điện thoại.',
              'info'
            );
          }
        } else {
          setErrorMsg(res.error || 'Không thể gửi tin nhắn SMS.');
        }
      } else {
        setIsSending(false);
        setErrorMsg('Không tìm thấy thông tin Số điện thoại hoặc Email để gửi mã.');
      }
    },
    [email, phone, showToast]
  );

  // 2. Tự động gửi mã OTP khi mở trang lần đầu
  useEffect(() => {
    if (hasSentRef.current) return;
    hasSentRef.current = true;
    triggerSendOtp(initialMode);
  }, [initialMode, triggerSendOtp]);

  // Cleanup reCAPTCHA khi unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch (e) {}
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

      let isSuccess = false;
      let verifiedUser: any = null;

      try {
        if (authMode === 'email' && email) {
          const res = await verifyEmailOtp(email, cleanCode);
          if (res.success) {
            isSuccess = true;
            verifiedUser = res.user;
          } else {
            setErrorMsg(res.error || 'Mã xác thực từ email không chính xác hoặc đã hết hạn.');
          }
        } else if (phone) {
          const res = await verifyPhoneOtp(verificationId, cleanCode, phone);
          if (res.success) {
            isSuccess = true;
            verifiedUser = res.user;
          } else {
            setErrorMsg(res.error || 'Mã OTP không chính xác.');
          }
        }
      } catch (err: any) {
        setErrorMsg('Đã xảy ra lỗi khi kiểm tra mã OTP. Vui lòng thử lại.');
      }

      if (isSuccess) {
        let userId = verifiedUser?.id || verifiedUser?.uid || `usr_${Date.now()}`;

        if (name) {
          // LUỒNG ĐĂNG KÝ MỚI:
          // 1. Kiểm tra nếu có mật khẩu tạm -> Khởi tạo user trên Firebase Auth (để sau này đăng nhập bằng password)
          const tempPassword =
            typeof window !== 'undefined' ? sessionStorage.getItem('reg_pass_temp') : null;

          if (tempPassword && email) {
            try {
              const fbCred = await createUserWithEmailAndPassword(
                auth,
                email.trim().toLowerCase(),
                tempPassword
              );
              if (fbCred.user) {
                userId = fbCred.user.uid;
              }
            } catch (fbErr: any) {
              console.warn('[Firebase Auth] Đăng ký email pass nền:', fbErr);
            } finally {
              sessionStorage.removeItem('reg_pass_temp');
            }
          }

          // 2. Lưu thông tin người dùng vào Supabase Database
          await syncUserToSupabase({
            id: userId,
            name: name.trim(),
            phone: phone || undefined,
            email: email || undefined,
            role: role === 'owner' ? 'owner' : 'user',
            avatar_url: '/images/user-avatar.jpg',
            verified: true,
            auth_provider: authMode === 'email' ? 'email_otp' : 'phone_otp',
            owner_application_status: role === 'owner' ? 'pending' : 'none',
          });

          // 3. Đồng bộ vào Zustand App Store
          registerUser({
            id: userId,
            name: name.trim(),
            phone: phone || '',
            email: email || '',
            role: role === 'owner' ? 'owner' : 'user',
          });

          showToast(
            'Đăng ký tài khoản thành công! 🎉',
            `Chào mừng ${name} đến với Trọ Xinh!`,
            'success'
          );
        } else {
          // LUỒNG ĐĂNG NHẬP:
          // Thử tải thông tin người dùng đã có trên Supabase để không bị gán tên mặc định
          let existingProfile = null;
          if (phone) {
            existingProfile = await getSupabaseUserByPhone(phone);
          }
          if (!existingProfile && email) {
            existingProfile = await getSupabaseUserByEmail(email);
          }

          if (existingProfile) {
            loginWithPhone(
              phone || email,
              existingProfile.role as any,
              existingProfile.name,
              existingProfile.email
            );
          } else {
            loginWithPhone(phone || email, role === 'owner' ? 'owner' : 'user');
          }

          showToast('Đăng nhập thành công! 👋', 'Chào mừng bạn quay trở lại Trọ Xinh.', 'success');
        }

        setIsLoading(false);

        // Chuyển trang
        if (returnUrl) {
          navigate(decodeURIComponent(returnUrl), { replace: true });
        } else if (role === 'owner') {
          navigate('/chu-tro', { replace: true });
        } else {
          navigate('/', { replace: true });
        }
      } else {
        setIsLoading(false);
        setIsErrorShake(true);
        // Xóa mã đã nhập để nhập lại và focus lại
        setOtp('');
        masterInputRef.current?.focus();
        setTimeout(() => setIsErrorShake(false), 600);
      }
    },
    [
      isLoading,
      authMode,
      email,
      phone,
      verificationId,
      name,
      role,
      returnUrl,
      registerUser,
      loginWithPhone,
      showToast,
      navigate,
    ]
  );

  // 5. Xử lý gõ phím / paste vào input chính
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isLoading) return;
    const rawVal = e.target.value;
    const numbersOnly = rawVal.replace(/\D/g, '').slice(0, 6);

    setOtp(numbersOnly);
    setErrorMsg('');

    // Khi gõ đủ 6 số -> Tự động kích hoạt xác thực ngay lập tức!
    if (numbersOnly.length === 6) {
      handleVerifyOtp(numbersOnly);
    }
  };

  // 6. Gửi lại mã OTP
  const handleResend = async () => {
    if (countdown > 0 || isSending) return;

    setOtp('');
    setCountdown(60);
    masterInputRef.current?.focus();
    await triggerSendOtp(authMode);
  };

  // 7. Chuyển đổi phương thức nhận mã (SMS <-> Email)
  const handleSwitchAuthMode = (newMode: 'email' | 'phone') => {
    if (isSending || isLoading || newMode === authMode) return;
    setAuthMode(newMode);
    setOtp('');
    setErrorMsg('');
    setCountdown(60);
    triggerSendOtp(newMode);
  };

  // Tự động điền mã thử nghiệm nếu có
  const handleAutofillDemo = () => {
    if (simulatedCode) {
      setOtp(simulatedCode);
      handleVerifyOtp(simulatedCode);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-4 sm:p-6 py-10">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-xl space-y-6 animate-fadeIn">
        {/* Invisible reCAPTCHA container */}
        <div id="recaptcha-container"></div>

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-emerald-50 text-[#00a854] rounded-full flex items-center justify-center mx-auto shadow-xs">
            {authMode === 'email' ? <Mail className="w-7 h-7" /> : <Phone className="w-7 h-7" />}
          </div>
          <h1 className="text-xl font-bold text-gray-900">Xác Thực Mã OTP</h1>
          <p className="text-xs text-gray-500">
            Mã OTP 6 số được gửi qua{' '}
            <strong className="text-gray-900">
              {authMode === 'email' ? 'Gmail' : 'SMS Số điện thoại'}
            </strong>{' '}
            tới:
            <strong className="text-gray-900 block mt-1 font-semibold break-all">
              {authMode === 'email' ? email : phone}
            </strong>
          </p>
        </div>

        {/* Toggle chuyển đổi phương thức nhận OTP nếu có cả Email và SĐT */}
        {email && phone && (
          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={() => handleSwitchAuthMode(authMode === 'phone' ? 'email' : 'phone')}
              disabled={isSending || isLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-[#00a854] hover:bg-emerald-100 transition-colors cursor-pointer border border-emerald-200"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>
                {authMode === 'phone'
                  ? 'Nhận mã qua Gmail thay thế'
                  : 'Nhận mã qua SMS Số điện thoại'}
              </span>
            </button>
          </div>
        )}

        {/* Banner hỗ trợ mã giả lập khi Firebase SMS chạy chế độ test */}
        {simulatedCode && (
          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-2xl flex items-center justify-between gap-2 animate-fadeIn">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 shrink-0 text-amber-600" />
              <div>
                <span className="font-bold">Mã OTP thử nghiệm: </span>
                <span className="font-mono font-bold text-sm text-amber-900">{simulatedCode}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleAutofillDemo}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold text-[11px] transition-colors cursor-pointer"
            >
              Tự điền mã
            </button>
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl flex items-start gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="space-y-6">
          {/* CỤM 6 Ô NHẬP OTP THEO TIÊU CHUẨN CAO CẤP QUỐC TẾ */}
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

            {/* 6 Ô hiển thị đồ họa siêu đẹp */}
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
              {authMode === 'email' ? (
                <>
                  Vui lòng mở ứng dụng <strong className="text-gray-900">Gmail</strong> trên điện thoại hoặc máy tính để lấy mã 6 số.
                </>
              ) : (
                <>
                  Vui lòng kiểm tra hộp thư tin nhắn <strong className="text-gray-900">SMS</strong> trên điện thoại của bạn.
                </>
              )}
            </p>

            {authMode === 'email' && (
              <div className="p-3 bg-emerald-50/80 border border-emerald-200 text-emerald-900 text-xs rounded-2xl flex items-start gap-2 text-left">
                <Info className="w-4 h-4 shrink-0 text-[#00a854] mt-0.5" />
                <div className="space-y-0.5 leading-relaxed">
                  <p className="font-bold">Mẹo xác thực nhanh:</p>
                  <p className="text-gray-600">
                    Nếu thư Gmail của bạn nhận được là một đường link xác nhận, bạn chỉ cần <strong>bấm trực tiếp vào liên kết trong thư</strong> để đăng nhập ngay mà không cần gõ mã.
                  </p>
                </div>
              </div>
            )}
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
