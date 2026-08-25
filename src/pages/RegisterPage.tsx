import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { User, Phone, Lock, Mail, UserPlus, ShieldCheck, AlertCircle } from 'lucide-react';
import { checkUserExists } from '../lib/supabaseAuthSync';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const returnUrl = searchParams.get('returnUrl') || searchParams.get('next');
  const roleParam = searchParams.get('role') || 'renter';

  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 1. Kiểm tra Họ và tên
    if (!name.trim()) {
      setError('Vui lòng nhập họ và tên của bạn.');
      return;
    }

    // 2. Validate định dạng Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setError('Địa chỉ Email không hợp lệ.');
      return;
    }

    // 3. Validate Số điện thoại
    const cleanPhone = phone.trim().replace(/\D/g, '');
    if (!cleanPhone || cleanPhone.length < 10) {
      setError('Số điện thoại không hợp lệ (tối thiểu 10 chữ số).');
      return;
    }

    // 4. Validate Mật khẩu (tối thiểu 8 ký tự theo yêu cầu)
    if (!password || password.length < 8) {
      setError('Mật khẩu phải có ít nhất 8 ký tự để đảm bảo an toàn.');
      return;
    }

    // 5. Kiểm tra Mật khẩu xác nhận
    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp với mật khẩu đã nhập.');
      return;
    }

    setIsLoading(true);

    try {
      // 6. Kiểm tra xem Email hoặc SĐT đã tồn tại trên Supabase Database chưa
      const existsCheck = await checkUserExists({
        email: email.trim(),
        phone: cleanPhone,
      });

      if (existsCheck.exists) {
        setIsLoading(false);
        setError(existsCheck.message || 'Email hoặc Số điện thoại này đã được đăng ký!');
        return;
      }

      // 7. Chuyển sang màn hình xác thực OTP SMS
      setIsLoading(false);
      const queryParams = new URLSearchParams({
        phone: cleanPhone,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role: roleParam,
        mode: 'phone',
      });
      if (returnUrl) {
        queryParams.set('returnUrl', returnUrl);
      }

      // Lưu mật khẩu tạm vào sessionStorage để tạo user đầy đủ sau khi OTP thành công
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('reg_pass_temp', password);
      }

      navigate(`/xac-thuc-otp?${queryParams.toString()}`);
    } catch (err: any) {
      setIsLoading(false);
      setError('Đã có lỗi xảy ra trong quá trình kiểm tra. Vui lòng thử lại!');
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-4 sm:p-6 py-10">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-xl space-y-6 animate-fadeIn">
        <div className="text-center space-y-2">
          <Link to="/" className="inline-flex items-center gap-2.5 group">
            <img
              src="/images/logo.png"
              alt="Trọ Xinh Logo"
              className="w-12 h-12 rounded-2xl object-cover ring-2 ring-emerald-500/20 shadow-md group-hover:scale-105 transition-transform"
            />
            <span className="text-2xl font-black text-[#00a854]">Trọ Xinh</span>
          </Link>
          <h1 className="text-xl font-bold text-gray-900">Tạo Tài Khoản Mới</h1>
          <p className="text-xs text-gray-500">Tham gia cộng đồng phòng trọ an tâm & văn minh số 1</p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl flex items-start gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Đăng ký */}
        <form onSubmit={handleRegister} className="space-y-3.5">
          <Input
            label="Họ và tên"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nguyễn Văn A"
            leftIcon={<User className="w-4 h-4" />}
          />

          <Input
            label="Địa chỉ Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nguyenvana@gmail.com"
            leftIcon={<Mail className="w-4 h-4" />}
          />

          <Input
            label="Số điện thoại"
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0988 110 789"
            leftIcon={<Phone className="w-4 h-4" />}
          />

          <Input
            label="Mật khẩu (tối thiểu 8 ký tự)"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Tối thiểu 8 ký tự"
            leftIcon={<Lock className="w-4 h-4" />}
          />

          <Input
            label="Xác nhận mật khẩu"
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Nhập lại mật khẩu vừa đặt"
            leftIcon={<Lock className="w-4 h-4" />}
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full mt-2"
            isLoading={isLoading}
            leftIcon={<UserPlus className="w-4 h-4" />}
          >
            Tiếp Tục Nhận Mã OTP
          </Button>
        </form>

        <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100 text-[11px] text-emerald-900 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#00a854] shrink-0" />
          <span>Bạn là chủ trọ? Sau khi tạo tài khoản, bạn có thể dễ dàng nộp hồ sơ nâng cấp thành Đối Tác Chủ Trọ.</span>
        </div>

        <div className="text-center text-xs text-gray-600 space-y-2">
          <div>
            Đã có tài khoản?{' '}
            <Link
              to={returnUrl ? `/dang-nhap?returnUrl=${encodeURIComponent(returnUrl)}` : '/dang-nhap'}
              className="font-bold text-[#00a854] hover:underline"
            >
              Đăng nhập ngay
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
