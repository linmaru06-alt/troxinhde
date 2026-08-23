import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Home, Phone, Lock, LogIn, Sparkles, ShieldCheck } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loginWithPhone, showToast } = useAppStore();

  const nextUrl = searchParams.get('next');

  const [phone, setPhone] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!phone.trim()) {
      setError('Vui lòng nhập số điện thoại');
      return;
    }
    if (!password.trim()) {
      setError('Vui lòng nhập mật khẩu');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      loginWithPhone(phone);

      if (nextUrl) {
        navigate(nextUrl);
      } else {
        if (phone === '0912345678') {
          navigate('/chu-tro');
        } else if (phone === '0888110789' || phone === '1900888899') {
          navigate('/admin');
        } else {
          navigate('/tim-kiem');
        }
      }
    }, 350);
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-xl space-y-6 animate-fadeIn">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2.5 group">
            <img
              src="/images/logo.png"
              alt="Trọ Xinh Logo"
              className="w-12 h-12 rounded-2xl object-cover ring-2 ring-emerald-500/20 shadow-md group-hover:scale-105 transition-transform"
            />
            <span className="text-2xl font-black text-[#006d37]">Trọ Xinh</span>
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Đăng Nhập Tài Khoản</h1>
          <p className="text-xs text-gray-500">Truy cập để quản lý phòng, danh sách đã lưu và trò chuyện</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            label="Số điện thoại"
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0987 654 321"
            leftIcon={<Phone className="w-4 h-4" />}
          />

          <Input
            label="Mật khẩu"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            leftIcon={<Lock className="w-4 h-4" />}
          />

          {error && <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-xl">{error}</p>}

          <div className="flex items-center justify-between text-xs">
            <label className="flex items-center gap-2 cursor-pointer text-gray-600">
              <input type="checkbox" defaultChecked className="rounded text-[#006d37] focus:ring-[#006d37]" />
              <span>Ghi nhớ đăng nhập</span>
            </label>
            <Link to="/quen-mat-khau" className="font-semibold text-[#006d37] hover:underline">
              Quên mật khẩu?
            </Link>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            isLoading={isLoading}
            leftIcon={<LogIn className="w-4 h-4" />}
          >
            Đăng Nhập
          </Button>
        </form>

        {/* Register CTA */}
        <div className="text-center text-xs text-gray-600 pt-2 border-t border-gray-100 space-y-2">
          <div>
            Chưa có tài khoản?{' '}
            <Link to="/dang-ky" className="font-bold text-[#006d37] hover:underline">
              Đăng ký tài khoản ngay
            </Link>
          </div>
          <p className="text-[11px] text-gray-400">
            Cần hỗ trợ? Liên hệ <a href="tel:0888110789" className="font-semibold text-gray-600 hover:underline">0888 110 789</a> hoặc <a href="https://zalo.me/0888110789" target="_blank" rel="noopener noreferrer" className="font-semibold text-[#006d37] hover:underline">Zalo</a>
          </p>
        </div>
      </div>
    </div>
  );
};
