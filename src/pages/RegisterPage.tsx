import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { UserRole } from '../types';
import { Home, User, Phone, Lock, UserPlus, ShieldCheck } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const roleParam = (searchParams.get('role') as UserRole) || 'renter';

  const [role, setRole] = useState<'renter' | 'owner'>(roleParam === 'owner' ? 'owner' : 'renter');
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Vui lòng nhập họ và tên');
      return;
    }
    if (!phone.trim() || phone.length < 10) {
      setError('Số điện thoại không hợp lệ (tối thiểu 10 số)');
      return;
    }
    if (!password || password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }
    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      // Navigate to OTP with phone & role
      navigate(`/xac-thuc-otp?phone=${encodeURIComponent(phone)}&role=${role}&name=${encodeURIComponent(name)}`);
    }, 400);
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-xl space-y-6 animate-fadeIn">
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-[#006d37] to-[#27ae60] flex items-center justify-center text-white shadow-md">
              <Home className="w-6 h-6" />
            </div>
            <span className="text-2xl font-black text-[#006d37]">Trọ Xinh</span>
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Tạo Tài Khoản Mới</h1>
          <p className="text-xs text-gray-500">Tham gia cộng đồng phòng trọ an tâm số 1</p>
        </div>

        {/* Role Toggle Tabs */}
        <div className="flex bg-gray-100 p-1 rounded-2xl">
          <button
            type="button"
            onClick={() => setRole('renter')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
              role === 'renter' ? 'bg-white text-[#006d37] shadow-xs' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Tôi là Người Thuê
          </button>
          <button
            type="button"
            onClick={() => setRole('owner')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition ${
              role === 'owner' ? 'bg-white text-[#006d37] shadow-xs' : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Tôi là Chủ Trọ
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleRegister} className="space-y-4">
          <Input
            label="Họ và tên của bạn"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nguyễn Văn A"
            leftIcon={<User className="w-4 h-4" />}
          />

          <Input
            label="Số điện thoại đăng ký"
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
            placeholder="Tối thiểu 6 ký tự"
            leftIcon={<Lock className="w-4 h-4" />}
          />

          <Input
            label="Xác nhận mật khẩu"
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Nhập lại mật khẩu"
            leftIcon={<Lock className="w-4 h-4" />}
          />

          {error && <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-xl">{error}</p>}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            isLoading={isLoading}
            leftIcon={<UserPlus className="w-4 h-4" />}
          >
            Tiếp Tục Xác Thực OTP
          </Button>
        </form>

        <div className="text-center text-xs text-gray-600">
          Đã có tài khoản?{' '}
          <Link to={`/dang-nhap?role=${role}`} className="font-bold text-[#006d37] hover:underline">
            Đăng nhập ngay
          </Link>
        </div>
      </div>
    </div>
  );
};
