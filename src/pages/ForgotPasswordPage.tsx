import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAppStore } from '../store/useAppStore';
import { KeyRound, Mail, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { sendPasswordReset } from '../lib/authService';

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useAppStore();

  const [email, setEmail] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setError('Vui lòng nhập địa chỉ Email hợp lệ.');
      return;
    }

    setIsLoading(true);
    const res = await sendPasswordReset(email);
    setIsLoading(false);

    if (res.success) {
      setIsSubmitted(true);
      showToast('Đã gửi email khôi phục mật khẩu! 📧', 'Vui lòng kiểm tra hộp thư đến hoặc hòm thư Spam.', 'success');
    } else {
      setError(res.error || 'Không thể gửi email đặt lại mật khẩu.');
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-4 sm:p-6 py-10">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-xl space-y-6 animate-fadeIn">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-emerald-50 text-[#00a854] rounded-full flex items-center justify-center mx-auto shadow-xs">
            <KeyRound className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Quên Mật Khẩu?</h1>
          <p className="text-xs text-gray-500">
            Nhập email đã đăng ký của bạn để nhận liên kết đặt lại mật khẩu an toàn
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl flex items-start gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {isSubmitted ? (
          <div className="text-center space-y-4 py-4 animate-fadeIn">
            <div className="w-12 h-12 bg-emerald-100 text-[#00a854] rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-gray-900">Đã Gửi Liên Kết Thành Công!</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Chúng tôi đã gửi email hướng dẫn đặt lại mật khẩu tới <strong>{email}</strong>. Vui lòng bấm vào liên kết trong email để đổi mật khẩu mới.
              </p>
            </div>
            <Button
              variant="primary"
              size="md"
              className="w-full mt-2"
              onClick={() => navigate('/dang-nhap')}
            >
              Quay Lại Đăng Nhập
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Địa chỉ Email của bạn"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nguyenvana@gmail.com"
              leftIcon={<Mail className="w-4 h-4" />}
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              isLoading={isLoading}
            >
              Gửi Link Đặt Lại Mật Khẩu
            </Button>
          </form>
        )}

        <div className="pt-2 text-center">
          <Link
            to="/dang-nhap"
            className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Quay lại trang đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
};
