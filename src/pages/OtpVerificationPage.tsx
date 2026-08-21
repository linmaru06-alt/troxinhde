import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { Button } from '../components/ui/Button';
import { ShieldCheck, RotateCcw, ArrowRight } from 'lucide-react';

export const OtpVerificationPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loginAsRole, showToast } = useAppStore();

  const phone = searchParams.get('phone') || '0987654321';
  const role = (searchParams.get('role') as any) || 'renter';

  const [otp, setOtp] = useState<string[]>(['1', '2', '3', '4', '5', '6']);
  const [countdown, setCountdown] = useState<number>(45);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

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

    // Auto-focus next input
    if (val && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      loginAsRole(role);
      showToast('Xác thực OTP thành công! 🎉', 'Chào mừng bạn đến với Trọ Xinh.', 'success');

      if (role === 'owner') {
        navigate('/chu-tro/onboarding');
      } else {
        navigate('/onboarding');
      }
    }, 500);
  };

  const handleResend = () => {
    setCountdown(45);
    showToast('Đã gửi lại mã OTP (Mã demo: 123456)', '', 'info');
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-xl space-y-6 text-center animate-fadeIn">
        <div className="w-16 h-16 bg-emerald-50 text-[#006d37] rounded-full flex items-center justify-center mx-auto shadow-xs">
          <ShieldCheck className="w-8 h-8" />
        </div>

        <div className="space-y-1">
          <h1 className="text-xl font-bold text-gray-900">Xác Thực Số Điện Thoại</h1>
          <p className="text-xs text-gray-500">
            Mã OTP 6 chữ số đã được gửi đến số điện thoại: <strong className="text-gray-900">{phone}</strong>
          </p>
        </div>

        {/* 6 Digit Input Boxes */}
        <form onSubmit={handleVerify} className="space-y-6">
          <div className="flex justify-center gap-2 sm:gap-2.5">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputsRef.current[index] = el)}
                type="text"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(e.target.value, index)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                className="w-11 h-12 sm:w-12 sm:h-14 text-center text-lg sm:text-xl font-black rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#006d37] focus:border-transparent bg-gray-50 text-gray-900"
              />
            ))}
          </div>

          <div className="text-xs text-gray-500">
            {countdown > 0 ? (
              <span>Gửi lại mã OTP sau <strong className="text-[#006d37]">{countdown}s</strong></span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                className="font-bold text-[#006d37] hover:underline flex items-center gap-1 mx-auto"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Gửi lại mã OTP ngay
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
            Xác Nhận & Tiếp Tục
          </Button>
        </form>
      </div>
    </div>
  );
};
