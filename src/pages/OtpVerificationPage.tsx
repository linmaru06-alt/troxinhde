import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { useAppStore } from '../store/useAppStore';
import { Mail, Phone, ArrowRight, RefreshCw, AlertCircle, CheckCircle2, ShieldCheck, Loader2 } from 'lucide-react';
import { sendEmailOtp, verifyEmailOtp, sendPhoneOtp, verifyPhoneOtp } from '../lib/authService';
import { syncUserToSupabase } from '../lib/supabaseAuthSync';

export const OtpVerificationPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loginWithPhone, registerUser, showToast } = useAppStore();

  const email = searchParams.get('email') || '';
  const phone = searchParams.get('phone') || '';
  const role = (searchParams.get('role') || 'renter') as 'renter' | 'owner';
  const name = searchParams.get('name') || '';
  const returnUrl = searchParams.get('returnUrl') || searchParams.get('next');

  // Mảng lưu trữ độc lập giá trị cho từng ô (6 ô riêng biệt)
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [countdown, setCountdown] = useState<number>(60);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [verificationId, setVerificationId] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isErrorShake, setIsErrorShake] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'email' | 'phone'>('email');

  // 6 refs riêng biệt cho 6 ô input
  const inputRef0 = useRef<HTMLInputElement>(null);
  const inputRef1 = useRef<HTMLInputElement>(null);
  const inputRef2 = useRef<HTMLInputElement>(null);
  const inputRef3 = useRef<HTMLInputElement>(null);
  const inputRef4 = useRef<HTMLInputElement>(null);
  const inputRef5 = useRef<HTMLInputElement>(null);

  const inputRefs = [inputRef0, inputRef1, inputRef2, inputRef3, inputRef4, inputRef5];
  const hasSentRef = useRef<boolean>(false);

  // 1. Tự động focus ô đầu tiên khi mở trang
  useEffect(() => {
    inputRefs[0].current?.focus();
  }, []);

  // 2. Tự động gửi mã OTP khi mở trang lần đầu
  useEffect(() => {
    if (hasSentRef.current) return;
    hasSentRef.current = true;

    async function triggerInitialSend() {
      setIsSending(true);
      if (email) {
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
        if (res.success && res.verificationId) {
          setVerificationId(res.verificationId);
          showToast(
            'Đã kích hoạt gửi OTP SMS!',
            'Vui lòng kiểm tra tin nhắn trên điện thoại.',
            'info'
          );
        }
      }
    }

    triggerInitialSend();
  }, [email, phone, showToast]);

  // 3. Đồng hồ đếm ngược 60s
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // 4. Xử lý Xác thực mã OTP
  const handleVerifyOtp = useCallback(
    async (codeToVerify: string) => {
      if (isLoading) return;
      const cleanCode = codeToVerify.trim();

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
        const userId = verifiedUser?.id || verifiedUser?.uid || `usr_${Date.now()}`;

        if (name) {
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

          registerUser({
            id: userId,
            name: name.trim(),
            phone: phone || '',
            email: email || '',
          });

          showToast(
            'Đăng ký tài khoản thành công! 🎉',
            `Chào mừng ${name} đến với Trọ Xinh!`,
            'success'
          );
        } else {
          loginWithPhone(phone || email, role === 'owner' ? 'owner' : 'user');
          showToast('Đăng nhập thành công! 👋', 'Chào mừng bạn quay trở lại Trọ Xinh.', 'success');
        }

        setIsLoading(false);

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
        // Reset 6 ô về trống khi sai và focus lại ô 1
        setOtp(['', '', '', '', '', '']);
        inputRefs[0].current?.focus();
        setTimeout(() => setIsErrorShake(false), 600);
      }
    },
    [isLoading, authMode, email, phone, verificationId, name, role, returnUrl, registerUser, loginWithPhone, showToast, navigate]
  );

  // 5. Xử lý khi gõ phím vào từng ô
  const handleChange = (val: string, index: number) => {
    if (isLoading) return;

    // Chỉ nhận ký tự số
    const numbersOnly = val.replace(/\D/g, '');
    if (!numbersOnly) {
      const newOtp = [...otp];
      newOtp[index] = '';
      setOtp(newOtp);
      return;
    }

    // Lấy số cuối cùng vừa gõ vào ô này
    const singleDigit = numbersOnly.slice(-1);
    const newOtp = [...otp];
    newOtp[index] = singleDigit;
    setOtp(newOtp);
    setErrorMsg('');

    // Tự động nhảy con trỏ sang ô tiếp theo
    if (index < 5) {
      inputRefs[index + 1].current?.focus();
      inputRefs[index + 1].current?.select();
      setActiveIndex(index + 1);
    }

    // Tự động kích hoạt xác thực ngay khi đủ 6 số!
    const fullCode = newOtp.join('');
    if (fullCode.length === 6 && !newOtp.includes('')) {
      handleVerifyOtp(fullCode);
    }
  };

  // 6. Xử lý phím đặc biệt (Backspace, Arrow keys)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (isLoading) return;

    if (e.key === 'Backspace') {
      e.preventDefault();
      const newOtp = [...otp];

      if (newOtp[index]) {
        // Ô hiện tại có số -> Xóa số ô hiện tại
        newOtp[index] = '';
        setOtp(newOtp);
      } else if (index > 0) {
        // Ô hiện tại trống -> Lùi về ô trước và xóa số ô trước
        newOtp[index - 1] = '';
        setOtp(newOtp);
        inputRefs[index - 1].current?.focus();
        inputRefs[index - 1].current?.select();
        setActiveIndex(index - 1);
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs[index - 1].current?.focus();
      inputRefs[index - 1].current?.select();
      setActiveIndex(index - 1);
    } else if (e.key === 'ArrowRight' && index < 5) {
      e.preventDefault();
      inputRefs[index + 1].current?.focus();
      inputRefs[index + 1].current?.select();
      setActiveIndex(index + 1);
    }
  };

  // 7. Xử lý Auto-Paste mã OTP (VD: Copy "123456")
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (isLoading) return;

    const pastedData = e.clipboardData.getData('text');
    const numbersOnly = pastedData.replace(/\D/g, '').slice(0, 6);

    if (!numbersOnly) return;

    const newOtp = ['', '', '', '', '', ''];
    for (let i = 0; i < numbersOnly.length; i++) {
      newOtp[i] = numbersOnly[i];
    }
    setOtp(newOtp);

    const focusIdx = Math.min(numbersOnly.length, 5);
    inputRefs[focusIdx].current?.focus();
    inputRefs[focusIdx].current?.select();
    setActiveIndex(focusIdx);

    if (numbersOnly.length === 6) {
      handleVerifyOtp(numbersOnly);
    }
  };

  // 8. Xử lý gửi lại mã
  const handleResend = async () => {
    if (countdown > 0 || isSending) return;

    setIsSending(true);
    setErrorMsg('');
    setOtp(['', '', '', '', '', '']); // Reset 6 ô về rỗng
    inputRefs[0].current?.focus();

    if (email) {
      const res = await sendEmailOtp(email);
      setIsSending(false);
      if (res.success) {
        setCountdown(60);
        showToast('Đã gửi lại mã OTP mới! 📧', 'Vui lòng kiểm tra hòm thư Gmail (hoặc Spam).', 'success');
      } else {
        setErrorMsg(res.error || 'Gửi lại mã thất bại.');
      }
    } else if (phone) {
      const res = await sendPhoneOtp(phone, 'recaptcha-container');
      setIsSending(false);
      if (res.success && res.verificationId) {
        setVerificationId(res.verificationId);
        setCountdown(60);
        showToast('Đã gửi lại mã OTP SMS mới!', 'Vui lòng kiểm tra tin nhắn điện thoại.', 'info');
      }
    }
  };

  const isFullOtp = otp.every((d) => d !== '');

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
            Mã OTP 6 số đã được gửi tự động tới:{' '}
            <strong className="text-gray-900 block mt-1 font-semibold break-all">
              {email || phone}
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
          {/* 6 Ô NHẬP RIÊNG BIỆT 100% VỚI VALUE TỪNG Ô ĐỘC LẬP */}
          <div
            className={`flex items-center justify-center gap-2 sm:gap-3 select-none ${
              isErrorShake ? 'animate-shake' : ''
            }`}
          >
            {otp.map((digit, idx) => {
              const isFilled = digit !== '';
              const isFocused = activeIndex === idx;

              return (
                <input
                  key={idx}
                  ref={inputRefs[idx]}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={otp[idx]}
                  disabled={isLoading}
                  autoComplete={idx === 0 ? 'one-time-code' : 'off'}
                  onChange={(e) => handleChange(e.target.value, idx)}
                  onKeyDown={(e) => handleKeyDown(e, idx)}
                  onPaste={handlePaste}
                  onFocus={(e) => {
                    setActiveIndex(idx);
                    e.target.select();
                  }}
                  onBlur={() => setActiveIndex(-1)}
                  aria-label={`Mã OTP số ${idx + 1}`}
                  className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-black rounded-2xl border-2 outline-hidden transition-all duration-200 shadow-2xs ${
                    isLoading ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : ''
                  } ${
                    isErrorShake
                      ? 'border-red-500 bg-red-50/50 text-red-700 ring-4 ring-red-500/10'
                      : isFocused
                      ? 'border-[#00a854] bg-white text-gray-900 ring-4 ring-emerald-500/20 scale-105 shadow-md'
                      : isFilled
                      ? 'border-emerald-600/40 bg-emerald-50/30 text-gray-900 font-black'
                      : 'border-gray-200 bg-gray-50/60 text-gray-900 hover:border-gray-300'
                  }`}
                />
              );
            })}
          </div>

          <div className="text-center space-y-1">
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
          </div>

          {/* Nút Xác nhận */}
          <Button
            type="button"
            variant="primary"
            size="lg"
            className="w-full"
            isLoading={isLoading}
            disabled={!isFullOtp || isLoading}
            onClick={() => handleVerifyOtp(otp.join(''))}
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
