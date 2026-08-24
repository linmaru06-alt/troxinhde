import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { OtpInput } from '../components/ui/OtpInput';
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

  const [otpValue, setOtpValue] = useState<string>('');
  const [countdown, setCountdown] = useState<number>(60);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [verificationId, setVerificationId] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isErrorShake, setIsErrorShake] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'email' | 'phone'>('email');

  const hasSentRef = useRef<boolean>(false);

  // 1. Tự động gửi mã OTP khi mở trang lần đầu
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

  // 2. Đồng hồ đếm ngược 60s
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // 3. Xử lý gửi lại mã OTP
  const handleResend = async () => {
    if (countdown > 0 || isSending) return;

    setIsSending(true);
    setErrorMsg('');
    setOtpValue(''); // Reset toàn bộ ô nhập về trống khi gửi lại mã

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

  // 4. Xử lý Xác thực (Được gọi tự động khi gõ đủ 6 số hoặc bấm nút)
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
          // Lưu vào Supabase Database
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

        // Chuyển trang ngay lập tức
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
        // Tự động xóa mã đã nhập để người dùng gõ lại dễ dàng
        setOtpValue('');
        setTimeout(() => setIsErrorShake(false), 600);
      }
    },
    [isLoading, authMode, email, phone, verificationId, name, role, returnUrl, registerUser, loginWithPhone, showToast, navigate]
  );

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
          {/* Component OTPInput tối ưu cao cấp */}
          <OtpInput
            length={6}
            value={otpValue}
            onChange={(val) => {
              setOtpValue(val);
              setErrorMsg('');
            }}
            onComplete={(fullCode) => {
              // Tự động gọi xác thực ngay khi nhập đủ 6 số!
              handleVerifyOtp(fullCode);
            }}
            disabled={isLoading}
            isError={isErrorShake}
            autoFocus={true}
          />

          <div className="text-center space-y-1">
            <p className="text-xs text-gray-500">
              {authMode === 'email' ? (
                <>
                  Vui lòng mở ứng dụng <strong className="text-gray-900">Gmail</strong> trên điện thoại hoặc máy tính để lấy mã.
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
            disabled={otpValue.length < 6 || isLoading}
            onClick={() => handleVerifyOtp(otpValue)}
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
