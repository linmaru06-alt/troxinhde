import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { UserRole } from '../types';
import { Home, Phone, Lock, LogIn, Sparkles, ShieldCheck, UserCheck } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loginAsRole, showToast } = useAppStore();

  const nextUrl = searchParams.get('next');
  const roleParam = (searchParams.get('role') as UserRole) || 'renter';

  const [role, setRole] = useState<UserRole>(roleParam);
  const [phone, setPhone] = useState<string>('0987654321');
  const [password, setPassword] = useState<string>('123456');
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
      loginAsRole(role);

      if (nextUrl) {
        navigate(nextUrl);
      } else if (role === 'owner') {
        navigate('/chu-tro');
      } else if (role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/tim-kiem');
      }
    }, 400);
  };

  const handleQuickLogin = (targetRole: UserRole) => {
    loginAsRole(targetRole);
    if (targetRole === 'owner') navigate('/chu-tro');
    else if (targetRole === 'admin') navigate('/admin');
    else navigate('/tim-kiem');
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-xl space-y-6 animate-fadeIn">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-[#006d37] to-[#27ae60] flex items-center justify-center text-white shadow-md">
              <Home className="w-6 h-6" />
            </div>
            <span className="text-2xl font-black text-[#006d37]">Trọ Xinh</span>
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Đăng Nhập Tài Khoản</h1>
          <p className="text-xs text-gray-500">Truy cập để quản lý phòng hoặc danh sách đã lưu</p>
        </div>

        {/* Role Toggle Tabs */}
        <div className="flex bg-gray-100 p-1 rounded-2xl">
          <button
            type="button"
            onClick={() => { setRole('renter'); setPhone('0987654321'); }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
              role === 'renter' ? 'bg-white text-[#006d37] shadow-xs' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Người Thuê
          </button>
          <button
            type="button"
            onClick={() => { setRole('owner'); setPhone('0912345678'); }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
              role === 'owner' ? 'bg-white text-[#006d37] shadow-xs' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Chủ Trọ
          </button>
          <button
            type="button"
            onClick={() => { setRole('admin'); setPhone('1900888899'); }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
              role === 'admin' ? 'bg-white text-[#006d37] shadow-xs' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Quản Trị
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            label="Số điện thoại"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0987 654 321"
            leftIcon={<Phone className="w-4 h-4" />}
          />

          <Input
            label="Mật khẩu"
            type="password"
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

        {/* 1-Click Demo Login Shortcuts */}
        <div className="pt-2 border-t border-gray-100 space-y-2">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block text-center">
            Đăng nhập nhanh demo (QA 1-Click):
          </span>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleQuickLogin('renter')}
              className="px-2 py-1.5 bg-emerald-50 text-[#006d37] hover:bg-emerald-100 rounded-xl text-[11px] font-bold transition border border-emerald-200"
            >
              👤 Người Thuê
            </button>
            <button
              onClick={() => handleQuickLogin('owner')}
              className="px-2 py-1.5 bg-amber-50 text-amber-900 hover:bg-amber-100 rounded-xl text-[11px] font-bold transition border border-amber-200"
            >
              🏢 Chủ Trọ
            </button>
            <button
              onClick={() => handleQuickLogin('admin')}
              className="px-2 py-1.5 bg-blue-50 text-[#006492] hover:bg-blue-100 rounded-xl text-[11px] font-bold transition border border-blue-200"
            >
              🛡️ Admin
            </button>
          </div>
        </div>

        {/* Register CTA */}
        <div className="text-center text-xs text-gray-600">
          Chưa có tài khoản?{' '}
          <Link to={`/dang-ky?role=${role}`} className="font-bold text-[#006d37] hover:underline">
            Đăng ký ngay
          </Link>
        </div>
      </div>
    </div>
  );
};
