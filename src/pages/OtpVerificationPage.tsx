import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { useAppStore } from '../store/useAppStore';
import { ShieldCheck, ArrowRight, RefreshCw } from 'lucide-react';
import { sendPhoneOtp, verifyPhoneOtp } from '../lib/authService';

export const OtpVerificationPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loginWithPhone, registerUser, showToast } = useAppStore();

  const phone = searchParams.get('phone') || '0988110789';
  const role = (searchParams.get('role') || 'renter') as 'renter' | 'owner';
  const name = searchParams.get('name');
  const returnUrl = searchParams.get('returnUrl') || searchParams.get('next');

  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState<number>(60);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [verificationId, setVerificationId] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Tự động gọi gửi OTP khi mở trang
  useEffect(() => {
    let isMounted = true;
    async function triggerSend() {
      const res = await sendPhoneOtp(phone, 'recaptcha-container');
      if (isMounted && res.success && res.verificationId) {
        setVerificationId(res.verificationId);
        if (res.isSimulated && res.demoOtp) {
          showToast(
            'Mã OTP gửi về SĐT của bạn:',
            `Mã xác thực 6 số: ${res.demoOtp}`,
            'info'
          );
        } else {
          showToast(
            'Đã gửi tin nhắn SMS chứa mã OTP!',
            'Vui lòng kiểm tra hộp thư tin nhắn điện thoại.',
            'success'
          );
        }
      }
    }
    triggerSend();

    return () => {
      isMounted = false;
    };
  }, [phone]);

  // Đồng hồ đếm ngược
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

    // Tự động focus sang ô tiếp theo
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

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length < 6) {
      setErrorMsg('Vui lòng nhập đủ 6 chữ số của mã OTP');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    const res = await verifyPhoneOtp(verificationId, code, phone);

    setIsLoading(false);

    if (res.success) {
      if (name) {
        // Đăng ký mới
        registerUser({ name, phone });
      } else {
        // Đăng nhập số điện thoại
        loginWithPhone(phone, role);
        showToast('Xác thực OTP thành công! 🎉', 'Chào mừng bạn đến với Trọ Xinh.', 'success');
      }

      if (returnUrl) {
        navigate(returnUrl);
      } else if (role === 'owner' || phone === '0912345678') {
        navigate('/chu-tro');
      } else if (phone === '0888110789') {
        navigate('/admin');
      } else {
        navigate('/tim-phong');
      }
    } else {
      setErrorMsg(res.error || 'Mã OTP không chính xác. Vui lòng kiểm tra lại!');
    }
  };

  const handleResend = async () => {
    setOtp(['', '', '', '', '', '']);
    setCountdown(60);
    setErrorMsg('');
    const res = await sendPhoneOtp(phone, 'recaptcha-container');
    if (res.success && res.verificationId) {
      setVerificationId(res.verificationId);
      if (res.isSimulated && res.demoOtp) {
        showToast(
          'Mã OTP gửi lại mới:',
          `Mã xác thực 6 số: ${res.demoOtp}`,
          'info'
        );
      } else {
        showToast(
          'Đã gửi lại mã OTP thành công!',
          'Vui lòng kiểm tra tin nhắn SMS trên máy.',
          'success'
        );
      }
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-xl space-y-6 text-center animate-fadeIn">
        {/* Invisible Google reCAPTCHA Anchor */}
        <div id="recaptcha-container"></div>

        {/* Icon */}
        <div className="w-16 h-16 bg-emerald-50 text-[#00a854] rounded-full flex items-center justify-center mx-auto shadow-xs">
          <ShieldCheck className="w-8 h-8" />
        </div>

        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-gray-900">
            {name ? 'Xác Thực SĐT Để Hoàn Tất Đăng Ký' : 'Xác Thực Số Điện Thoại'}
          </h1>
          <p className="text-xs text-gray-500">
            Mã OTP 6 chữ số đã được gửi đến số điện thoại: <strong className="text-gray-900">{phone}</strong>
          </p>
        </div>

        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs px-3.5 py-2.5 rounded-xl font-medium">
            {errorMsg}
          </div>
        )}

        {/* OTP Input Boxes */}
        <form onSubmit={handleVerify} className="space-y-6">
          <div className="flex justify-center gap-2 sm:gap-2.5" onPaste={handlePaste}>
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
                className="w-11 h-12 sm:w-12 sm:h-14 text-center text-lg sm:text-xl font-black rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#00a854] focus:border-transparent bg-gray-50 text-gray-900"
              />
            ))}
          </div>

          <div className="text-xs text-gray-500">
            {countdown > 0 ? (
              <span>
                Gửi lại mã OTP sau <strong className="text-[#00a854]">{countdown}s</strong>
              </span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                className="font-bold text-[#00a854] hover:underline flex items-center gap-1 mx-auto"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Gửi lại mã OTP ngay
              </button>
            )}
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            isLoading={isLoading}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            {name ? 'Xác Nhận & Tạo Tài Khoản' : 'Xác Nhận & Đăng Nhập'}
          </Button>

          <div className="pt-2 text-center">
            <Link to="/dang-nhap" className="text-xs text-gray-400 hover:text-gray-600 font-medium">
              ← Đổi số điện thoại khác
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};
