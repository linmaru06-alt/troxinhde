import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAppStore } from '../store/useAppStore';
import { KeyRound, Phone, Lock, CheckCircle2, ArrowLeft } from 'lucide-react';

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useAppStore();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [phone, setPhone] = useState<string>('');
  const [otp, setOtp] = useState<string>('123456');
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      setError('Vui lòng nhập số điện thoại');
      return;
    }
    setError('');
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setStep(2);
      showToast('Đã gửi mã xác nhận OTP', 'Mã demo: 123456', 'info');
    }, 400);
  };

  const handleStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp !== '123456') {
      setError('Mã OTP không đúng (Demo: 123456)');
      return;
    }
    setError('');
    setStep(3);
  };

  const handleStep3 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setError('Mật khẩu mới phải có tối thiểu 6 ký tự');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu nhập lại không khớp');
      return;
    }
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      showToast('Đặt lại mật khẩu thành công! 🎉', 'Vui lòng đăng nhập với mật khẩu mới.', 'success');
      navigate('/dang-nhap');
    }, 500);
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-xl space-y-6 animate-fadeIn">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-emerald-50 text-[#006d37] rounded-full flex items-center justify-center mx-auto">
            <KeyRound className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Quên Mật Khẩu</h1>
          <p className="text-xs text-gray-500">Khôi phục mật khẩu tài khoản Trọ Xinh</p>
        </div>

        {/* Stepper indicator */}
        <div className="flex items-center justify-between px-4 pb-2 border-b border-gray-100 text-xs font-bold text-gray-400">
          <span className={step >= 1 ? 'text-[#006d37]' : ''}>1. Nhập SĐT</span>
          <span>→</span>
          <span className={step >= 2 ? 'text-[#006d37]' : ''}>2. Xác thực OTP</span>
          <span>→</span>
          <span className={step === 3 ? 'text-[#006d37]' : ''}>3. Đổi mật khẩu</span>
        </div>

        {/* Step 1: Phone */}
        {step === 1 && (
          <form onSubmit={handleStep1} className="space-y-4">
            <Input
              label="Số điện thoại đăng ký"
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0987 654 321"
              leftIcon={<Phone className="w-4 h-4" />}
            />
            {error && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-xl">{error}</p>}
            <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={isLoading}>
              Gửi Mã Xác Thực OTP
            </Button>
          </form>
        )}

        {/* Step 2: OTP */}
        {step === 2 && (
          <form onSubmit={handleStep2} className="space-y-4">
            <Input
              label="Nhập mã OTP 6 số"
              type="text"
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="123456"
            />
            {error && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-xl">{error}</p>}
            <Button type="submit" variant="primary" size="lg" className="w-full">
              Xác Thực OTP
            </Button>
          </form>
        )}

        {/* Step 3: New Password */}
        {step === 3 && (
          <form onSubmit={handleStep3} className="space-y-4">
            <Input
              label="Mật khẩu mới"
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Tối thiểu 6 ký tự"
              leftIcon={<Lock className="w-4 h-4" />}
            />
            <Input
              label="Xác nhận mật khẩu mới"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Nhập lại mật khẩu mới"
              leftIcon={<Lock className="w-4 h-4" />}
            />
            {error && <p className="text-xs text-red-600 bg-red-50 p-2 rounded-xl">{error}</p>}
            <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={isLoading}>
              Cập Nhật Mật Khẩu
            </Button>
          </form>
        )}

        <div className="text-center pt-2">
          <Link to="/dang-nhap" className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-900">
            <ArrowLeft className="w-3.5 h-3.5" /> Quay lại đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
};
