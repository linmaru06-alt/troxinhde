import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { useAppStore } from '../store/useAppStore';
import { Mail, ArrowRight, RefreshCw, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
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

  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState<number>(60);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [verificationId, setVerificationId] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [authMode, setAuthMode] = useState<'email' | 'phone'>('email');

  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Tự động gửi mã OTP khi mở trang
  useEffect(() => {
    let isMounted = true;

    async function triggerSend() {
      setIsSending(true);
      if (email) {
        setAuthMode('email');
        const res = await sendEmailOtp(email);
        if (isMounted) {
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
        }
      } else if (phone) {
        setAuthMode('phone');
        const res = await sendPhoneOtp(phone, 'recaptcha-container');
        if (isMounted) {
          setIsSending(false);
          if (res.success && res.verificationId) {
            setVerificationId(res.verificationId);
            showToast(
              'Đã kích hoạt gửi OTP SMS!',
              'Vui lòng kiểm tra tin nhắn trên điện thoại của bạn.',
              'info'
            );
          }
        }
      }
    }

    triggerSend();

    return () => {
      isMounted = false;
    };
  }, [email, phone]);

  // Đếm ngược 60s
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleChange = (val: string, index: number) => {
    if (isNaN(Number(val))) return;
    const nextOtp = [...otp];
    nextOtp[index] = val.slice(-1);
    setOtp(nextOtp);
    setErrorMsg('');

    if (val && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pastedData)) {
      const digits = pastedData.split('');
      setOtp(digits);
      inputsRef.current[5]?.focus();
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || isSending) return;
    setIsSending(true);
    setErrorMsg('');

    if (email) {
      const res = await sendEmailOtp(email);
      setIsSending(false);
      if (res.success) {
        setCountdown(60);
        showToast('Đã gửi lại mã OTP! 📧', 'Vui lòng kiểm tra hòm thư Gmail (hoặc Spam).', 'success');
      } else {
        setErrorMsg(res.error || 'Gửi lại mã thất bại.');
      }
    } else if (phone) {
      const res = await sendPhoneOtp(phone, 'recaptcha-container');
      setIsSending(false);
      if (res.success && res.verificationId) {
        setVerificationId(res.verificationId);
        setCountdown(60);
        showToast('Đã gửi lại mã OTP SMS!', 'Vui lòng kiểm tra tin nhắn điện thoại.', 'info');
      }
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length < 6) {
      setErrorMsg('Vui lòng nhập đủ 6 chữ số của mã OTP.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    let isSuccess = false;
    let verifiedUser: any = null;

    if (authMode === 'email' && email) {
      const res = await verifyEmailOtp(email, code);
      if (res.success) {
        isSuccess = true;
        verifiedUser = res.user;
      } else {
        setErrorMsg(res.error || 'Mã xác thực từ email không chính xác hoặc đã hết hạn.');
      }
    } else if (phone) {
      const res = await verifyPhoneOtp(verificationId, code, phone);
      if (res.success) {
        isSuccess = true;
        verifiedUser = res.user;
      } else {
        setErrorMsg(res.error || 'Mã OTP không chính xác.');
      }
    }

    if (isSuccess) {
      const userId = verifiedUser?.id || verifiedUser?.uid || `usr_${Date.now()}`;

      if (name) {
        // Đăng ký mới -> Lưu vào Supabase
        await syncUserToSupabase({
          id: userId,
          name: name.trim(),
          phone: phone || undefined,
          email: email || undefined,
          role: role === 'owner' ? 'owner' : 'user',
          avatar_url: '/images/user-avatar.jpg',
          verified: true,
          auth_provider: 'email_otp',
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
        // Đăng nhập bằng OTP
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
            <Mail className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Xác Thực Mã OTP</h1>
          <p className="text-xs text-gray-500">
            Mã OTP 6 số đã được gửi tự động tới:{' '}
            <strong className="text-gray-900 block mt-1 font-semibold">{email || phone}</strong>
          </p>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl flex items-start gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleVerify} className="space-y-6">
          {/* 6-box OTP input */}
          <div className="flex justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
            {otp.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => (inputsRef.current[idx] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(e.target.value, idx)}
                onKeyDown={(e) => handleKeyDown(e, idx)}
                className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-black rounded-2xl border-2 border-gray-200 focus:border-[#00a854] focus:ring-4 focus:ring-emerald-500/15 outline-hidden transition-all bg-gray-50/50 focus:bg-white text-gray-900 shadow-2xs"
                autoFocus={idx === 0}
              />
            ))}
          </div>

          <div className="text-center space-y-1">
            <p className="text-xs text-gray-500">
              Vui lòng mở ứng dụng <strong>Gmail</strong> trên điện thoại hoặc máy tính để lấy mã 6 số.
            </p>
          </div>

          {/* Submit button */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            isLoading={isLoading}
            disabled={otp.join('').length < 6}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Xác Nhận & Kích Hoạt Tài Khoản
          </Button>
        </form>

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
