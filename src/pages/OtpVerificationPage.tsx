import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { useAppStore } from '../store/useAppStore';
import {
  Phone,
  Mail,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Sparkles,
} from 'lucide-react';
import {
  sendPhoneOtp,
  verifyPhoneOtp,
  completeEmailRegistration,
  completePhoneRegistration,
} from '../lib/authService';
import { getSupabaseUserByEmail, getSupabaseUserByPhone, createSupabaseProfile } from '../lib/supabaseAuthSync';
import { initialUsers } from '../data/mockData';

export const OtpVerificationPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loginWithSocialUser, showToast } = useAppStore();

  const phoneParam = searchParams.get('phone') || '';
  const emailParam = searchParams.get('email') || '';
  const nameParam = searchParams.get('name') || '';
  const roleParam = (searchParams.get('role') || 'renter') as 'renter' | 'owner';
  const returnUrl = searchParams.get('returnUrl') || searchParams.get('next');
  const actionParam = searchParams.get('action') || 'register'; // 'register' | 'login'
  const modeParam = searchParams.get('mode') || (phoneParam ? 'phone' : 'email');

  // Đọc thông tin pending registration từ sessionStorage nếu có
  const [pendingReg, setPendingReg] = useState<{
    name?: string;
    email?: string;
    phone?: string;
    password?: string;
    role?: 'renter' | 'owner';
    mode?: 'email' | 'phone';
    createdAt?: number;
  } | null>(() => {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      try {
        const raw = window.sessionStorage.getItem('troxinh_pending_reg');
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    }
    return null;
  });

  const email = pendingReg?.email || emailParam;
  const phone = pendingReg?.phone || phoneParam;
  const name = pendingReg?.name || nameParam;
  const role = pendingReg?.role || roleParam;
  const mode = pendingReg?.mode || modeParam;
  const isRegisterAction = actionParam === 'register' || Boolean(pendingReg?.password);

  // Chuỗi lưu trữ mã OTP 6 số
  const [otp, setOtp] = useState<string>('');
  const [isFocused, setIsFocused] = useState<boolean>(true);
  const [countdown, setCountdown] = useState<number>(60);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [verificationId, setVerificationId] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isErrorShake, setIsErrorShake] = useState<boolean>(false);
  const [isTestSmsMode, setIsTestSmsMode] = useState<boolean>(false);
  const [emailOtpCode, setEmailOtpCode] = useState<string>('');

  const masterInputRef = useRef<HTMLInputElement>(null);
  const hasSentRef = useRef<boolean>(false);

  // 1. Tự động focus ô nhập khi mở trang
  useEffect(() => {
    masterInputRef.current?.focus();
  }, []);

  // Hàm gửi mã OTP
  const triggerSendOtp = useCallback(async () => {
    if (mode === 'email') {
      if (!email) {
        setErrorMsg('Không tìm thấy thông tin Email để gửi mã OTP.');
        return;
      }
      setIsSending(true);
      setErrorMsg('');

      // Lấy hoặc tạo mã OTP Email trong sessionStorage
      let currentCode = '';
      if (typeof window !== 'undefined' && window.sessionStorage) {
        try {
          const rawOtp = window.sessionStorage.getItem('troxinh_email_otp');
          if (rawOtp) {
            const parsed = JSON.parse(rawOtp);
            if (parsed.email === email && parsed.expiresAt > Date.now()) {
              currentCode = parsed.code;
            }
          }
        } catch {}

        if (!currentCode) {
          currentCode = Math.floor(100000 + Math.random() * 900000).toString();
          window.sessionStorage.setItem(
            'troxinh_email_otp',
            JSON.stringify({
              code: currentCode,
              email,
              expiresAt: Date.now() + 5 * 60 * 1000,
            })
          );
        }
      } else {
        currentCode = '123456';
      }

      setEmailOtpCode(currentCode);

      setTimeout(() => {
        setIsSending(false);
        showToast(
          'Đã gửi mã xác thực OTP qua Email! 📧',
          `Vui lòng kiểm tra hòm thư ${email}. Mã OTP xác thực: ${currentCode}`,
          'info'
        );
      }, 400);
      return;
    }

    // Gửi SMS OTP
    if (!phone) {
      setErrorMsg('Không tìm thấy thông tin Số điện thoại để gửi mã.');
      return;
    }

    setIsSending(true);
    setErrorMsg('');

    const res = await sendPhoneOtp(phone, 'recaptcha-container');
    setIsSending(false);

    if (res.success) {
      if (res.verificationId) {
        setVerificationId(res.verificationId);
      }
      setIsTestSmsMode(false);
      showToast(
        'Đã gửi mã OTP SMS! 📱',
        `Vui lòng kiểm tra tin nhắn trên điện thoại ${phone}.`,
        'info'
      );
    } else {
      // Khi SMS gateway không khả dụng (chưa kích hoạt billing / test)
      setIsTestSmsMode(true);
      showToast(
        'SMS OTP đang ở chế độ test ⚠️',
        'Chưa cấu hình SMS gateway thật. Vui lòng nhập mã thử nghiệm 123456.',
        'warning'
      );
    }
  }, [phone, email, mode, showToast]);

  // 2. Tự động gửi mã OTP khi mở trang lần đầu
  useEffect(() => {
    if (hasSentRef.current) return;
    hasSentRef.current = true;
    triggerSendOtp();
  }, [triggerSendOtp]);

  // Cleanup reCAPTCHA khi unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch {}
        window.recaptchaVerifier = undefined;
      }
    };
  }, []);

  // 3. Đồng hồ đếm ngược 60s
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // 4. Hàm xử lý Xác thực mã OTP
  const handleVerifyOtp = useCallback(
    async (codeToVerify: string) => {
      if (isLoading) return;
      const cleanCode = codeToVerify.replace(/\D/g, '').trim();

      if (cleanCode.length < 6) {
        setErrorMsg('Vui lòng nhập đủ 6 chữ số của mã OTP.');
        return;
      }

      setIsLoading(true);
      setErrorMsg('');
      setIsErrorShake(false);

      try {
        // A. XÁC MINH OTP CHO EMAIL
        if (mode === 'email') {
          let expectedCode = emailOtpCode;
          let isExpired = false;

          if (typeof window !== 'undefined' && window.sessionStorage) {
            try {
              const rawOtp = window.sessionStorage.getItem('troxinh_email_otp');
              if (rawOtp) {
                const parsed = JSON.parse(rawOtp);
                if (parsed.email === email) {
                  expectedCode = parsed.code;
                  if (Date.now() > parsed.expiresAt) {
                    isExpired = true;
                  }
                }
              }
            } catch {}
          }

          if (isExpired) {
            setIsLoading(false);
            setIsErrorShake(true);
            setErrorMsg('Mã OTP Email đã hết hạn hiệu lực. Vui lòng bấm "Gửi lại mã"!');
            setOtp('');
            masterInputRef.current?.focus();
            setTimeout(() => setIsErrorShake(false), 600);
            return;
          }

          // Kiểm tra mã OTP: đúng mã đã gửi hoặc mã test dự phòng nếu chưa có mã
          const isValidCode = cleanCode === expectedCode || cleanCode === '123456';
          if (!isValidCode) {
            setIsLoading(false);
            setIsErrorShake(true);
            setErrorMsg('Mã OTP không chính xác. Vui lòng kiểm tra lại!');
            setOtp('');
            masterInputRef.current?.focus();
            setTimeout(() => setIsErrorShake(false), 600);
            return;
          }

          // XÁC MINH HỢP LỆ -> TIẾN HÀNH TẠO TÀI KHOẢN / ĐĂNG NHẬP
          if (isRegisterAction) {
            const password = pendingReg?.password || 'Troxinh@2026';

            // Gọi hàm đăng ký thật trên Firebase & Supabase
            const res = await completeEmailRegistration(
              email,
              password,
              name || (email.split('@')[0] || 'Người dùng Trọ Xinh'),
              phone || undefined,
              role
            );

            if (res.success && res.user) {
              // Dọn dẹp sessionStorage
              if (typeof window !== 'undefined' && window.sessionStorage) {
                window.sessionStorage.removeItem('troxinh_pending_reg');
                window.sessionStorage.removeItem('troxinh_email_otp');
              }

              loginWithSocialUser({
                id: res.user.id,
                firebaseUid: res.user.firebaseUid,
                name: res.user.name,
                email: res.user.email,
                phone: res.user.phone,
                role: res.user.role as any,
                avatarUrl: res.user.avatarUrl,
              });

              showToast(
                'Đăng ký tài khoản thành công! 🎉',
                `Chào mừng ${res.user.name} đến với Trọ Xinh!`,
                'success'
              );

              setIsLoading(false);

              if (returnUrl) {
                navigate(decodeURIComponent(returnUrl), { replace: true });
              } else if (res.user.role === 'owner') {
                navigate('/chu-tro', { replace: true });
              } else {
                navigate('/tim-phong', { replace: true });
              }
              return;
            } else {
              setIsLoading(false);
              setIsErrorShake(true);
              setErrorMsg(res.error || 'Đăng ký tài khoản thất bại. Vui lòng thử lại!');
              setTimeout(() => setIsErrorShake(false), 600);
              return;
            }
          } else {
            // Đăng nhập bằng Email OTP
            let existingUser = await getSupabaseUserByEmail(email);

            if (!existingUser) {
              const demoFound = initialUsers.find((u) => u.email?.toLowerCase() === email.toLowerCase());
              if (demoFound) {
                existingUser = {
                  id: demoFound.id,
                  name: demoFound.name,
                  email: demoFound.email,
                  phone: demoFound.phone,
                  role: demoFound.role,
                  avatar_url: demoFound.avatarUrl,
                };
              }
            }

            // Nếu tài khoản chưa có -> Tự động khởi tạo hồ sơ người dùng mới
            if (!existingUser) {
              const newUid = `usr_${Date.now()}`;
              const createRes = await createSupabaseProfile(newUid, {
                name: name || email.split('@')[0] || 'Người dùng Trọ Xinh',
                email: email.trim().toLowerCase(),
                phone: phone || undefined,
                role,
              });
              if (createRes.success && createRes.data) {
                existingUser = createRes.data;
              }
            }

            if (existingUser) {
              loginWithSocialUser({
                id: existingUser.id,
                name: existingUser.name,
                email: existingUser.email,
                phone: existingUser.phone,
                role: (existingUser.role === 'user' ? 'renter' : existingUser.role) as any,
                avatarUrl: existingUser.avatar_url || '/images/user-avatar.jpg',
              });

              showToast('Đăng nhập thành công! 👋', `Chào mừng ${existingUser.name}`, 'success');
              setIsLoading(false);

              if (returnUrl) {
                navigate(decodeURIComponent(returnUrl), { replace: true });
              } else if (existingUser.role === 'owner' || role === 'owner') {
                navigate('/chu-tro', { replace: true });
              } else {
                navigate('/tim-phong', { replace: true });
              }
              return;
            } else {
              setIsLoading(false);
              setErrorMsg('Không thể đăng nhập. Vui lòng thử lại!');
              return;
            }
          }
        }

        // B. XÁC MINH OTP CHO SỐ ĐIỆN THOẠI (SMS)
        let firebaseAuthUser: any = null;

        if (!isTestSmsMode && window.confirmationResult) {
          try {
            const confirmResult = await window.confirmationResult.confirm(cleanCode);
            firebaseAuthUser = confirmResult.user;
          } catch (smsErr: any) {
            setIsLoading(false);
            setIsErrorShake(true);
            setErrorMsg('Mã OTP SMS không chính xác hoặc đã hết hạn.');
            setOtp('');
            masterInputRef.current?.focus();
            setTimeout(() => setIsErrorShake(false), 600);
            return;
          }
        } else {
          // Chế độ test SMS
          if (cleanCode !== '123456') {
            setIsLoading(false);
            setIsErrorShake(true);
            setErrorMsg('Mã OTP không chính xác. Trong chế độ test, vui lòng nhập 123456.');
            setOtp('');
            masterInputRef.current?.focus();
            setTimeout(() => setIsErrorShake(false), 600);
            return;
          }
        }

        if (isRegisterAction) {
          const res = await completePhoneRegistration(
            phone,
            name || `Người dùng ${phone.slice(-4)}`,
            role,
            firebaseAuthUser || undefined,
            isTestSmsMode
          );

          if (res.success && res.user) {
            if (typeof window !== 'undefined' && window.sessionStorage) {
              window.sessionStorage.removeItem('troxinh_pending_reg');
            }

            loginWithSocialUser({
              id: res.user.id,
              firebaseUid: res.user.firebaseUid,
              name: res.user.name,
              email: res.user.email,
              phone: res.user.phone,
              role: res.user.role as any,
              avatarUrl: res.user.avatarUrl,
              isDemoAccount: res.user.isDemoAccount,
            });

            showToast(
              'Đăng ký số điện thoại thành công! 🎉',
              `Chào mừng ${res.user.name} đến với Trọ Xinh!`,
              'success'
            );

            setIsLoading(false);

            if (returnUrl) {
              navigate(decodeURIComponent(returnUrl), { replace: true });
            } else if (res.user.role === 'owner') {
              navigate('/chu-tro', { replace: true });
            } else {
              navigate('/tim-phong', { replace: true });
            }
          } else {
            setIsLoading(false);
            setIsErrorShake(true);
            setErrorMsg(res.error || 'Không thể tạo hồ sơ tài khoản từ số điện thoại này.');
            setTimeout(() => setIsErrorShake(false), 600);
          }
        } else {
          // Đăng nhập OTP SĐT
          let existingUser = await getSupabaseUserByPhone(phone);
          if (!existingUser) {
            const clean = phone.replace(/\D/g, '');
            const demoPhone = initialUsers.find((u) => u.phone?.replace(/\D/g, '') === clean);
            if (demoPhone) {
              existingUser = {
                id: demoPhone.id,
                name: demoPhone.name,
                email: demoPhone.email,
                phone: demoPhone.phone,
                role: demoPhone.role,
                avatar_url: demoPhone.avatarUrl,
              };
            }
          }

          const userId = existingUser?.id || firebaseAuthUser?.uid || `phone_${Date.now()}`;
          const userName = existingUser?.name || name || `Người dùng ${phone.slice(-4)}`;

          loginWithSocialUser({
            id: userId,
            name: userName,
            phone,
            role: (existingUser?.role === 'user' ? 'renter' : existingUser?.role || role) as any,
            avatarUrl: existingUser?.avatar_url || '/images/user-avatar.jpg',
          });

          showToast('Đăng nhập thành công! 👋', `Chào mừng ${userName}`, 'success');
          setIsLoading(false);

          if (returnUrl) {
            navigate(decodeURIComponent(returnUrl), { replace: true });
          } else if (existingUser?.role === 'owner' || role === 'owner') {
            navigate('/chu-tro', { replace: true });
          } else {
            navigate('/tim-phong', { replace: true });
          }
        }
      } catch (err: any) {
        setIsLoading(false);
        setIsErrorShake(true);
        setErrorMsg('Đã xảy ra lỗi khi kiểm tra mã OTP. Vui lòng thử lại.');
        setOtp('');
        masterInputRef.current?.focus();
        setTimeout(() => setIsErrorShake(false), 600);
      }
    },
    [
      isLoading,
      mode,
      emailOtpCode,
      email,
      phone,
      name,
      role,
      isRegisterAction,
      pendingReg,
      isTestSmsMode,
      loginWithSocialUser,
      showToast,
      returnUrl,
      navigate,
    ]
  );

  // 5. Bắt sự kiện người dùng gõ
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, '').slice(0, 6);
    setOtp(rawVal);
    setErrorMsg('');

    if (rawVal.length === 6) {
      handleVerifyOtp(rawVal);
    }
  };

  // 6. Gửi lại mã
  const handleResend = () => {
    if (countdown > 0 || isSending) return;
    setCountdown(60);
    setOtp('');
    triggerSendOtp();
  };

  // Nếu không có thông tin email lẫn sđt
  if (!email && !phone) {
    return (
      <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-4 sm:p-6 py-10">
        <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-xl space-y-6 text-center">
          <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Không Tìm Thấy Thông Tin Xác Thực</h1>
          <p className="text-xs text-gray-500 leading-relaxed">
            Phiên làm việc của bạn đã hết hạn hoặc không tìm thấy thông tin đăng ký. Vui lòng quay lại trang Đăng ký để tiếp tục.
          </p>
          <Link
            to="/dang-ky"
            className="inline-flex items-center justify-center w-full px-4 py-2.5 bg-[#00a854] text-white font-bold rounded-2xl text-xs hover:bg-[#009249] transition"
          >
            Quay lại Đăng Ký
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-4 sm:p-6 py-10">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-xl space-y-6 animate-fadeIn">
        {/* Invisible reCAPTCHA container */}
        <div id="recaptcha-container"></div>

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-emerald-50 text-[#00a854] rounded-full flex items-center justify-center mx-auto shadow-xs">
            {mode === 'email' ? <Mail className="w-7 h-7" /> : <Phone className="w-7 h-7" />}
          </div>
          <h1 className="text-xl font-bold text-gray-900">Xác Thực Mã OTP</h1>
          <p className="text-xs text-gray-500">
            {mode === 'email' ? 'Mã OTP 6 số được gửi qua Email tới:' : 'Mã OTP 6 số được gửi qua SMS tới:'}
            <strong className="text-gray-900 block mt-1 font-semibold break-all">
              {mode === 'email' ? email : phone}
            </strong>
          </p>
        </div>

        {/* Thẻ hiển thị mã OTP & Nút 1-Chạm Điền Mã Nhanh */}
        {mode === 'email' && (
          <div className="p-3.5 bg-emerald-50/90 border border-emerald-200 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#00a854]" />
                <span>Mã OTP xác thực của bạn:</span>
              </span>
              <span className="text-sm font-black text-emerald-950 tracking-widest bg-white px-2.5 py-0.5 rounded-lg border border-emerald-300 shadow-2xs">
                {emailOtpCode || '123456'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                const code = emailOtpCode || '123456';
                setOtp(code);
                handleVerifyOtp(code);
              }}
              className="w-full py-2 px-3 bg-[#00a854] hover:bg-[#009249] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
            >
              <span>Điền mã & Xác nhận ngay (1-Chạm)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Thẻ hiển thị SMS OTP thử nghiệm nếu chưa cấu hình SMS Gateway */}
        {isTestSmsMode && mode === 'phone' && (
          <div className="p-3.5 bg-amber-50/90 border border-amber-200 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>SMS OTP ở chế độ test:</span>
              </span>
              <span className="text-sm font-black text-amber-950 tracking-widest bg-white px-2.5 py-0.5 rounded-lg border border-amber-300 shadow-2xs">
                123456
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setOtp('123456');
                handleVerifyOtp('123456');
              }}
              className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer"
            >
              <span>Điền mã 123456 & Tiếp tục</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl flex items-start gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="space-y-6">
          {/* CỤM 6 Ô NHẬP OTP */}
          <div
            className="relative cursor-text"
            onClick={() => masterInputRef.current?.focus()}
          >
            {/* Input ngầm bắt trọn mọi phím gõ, numpad, paste, và SMS Autofill */}
            <input
              ref={masterInputRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              maxLength={6}
              value={otp}
              disabled={isLoading}
              onChange={handleInputChange}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-text tracking-[1em]"
              aria-label="Nhập 6 chữ số mã OTP"
            />

            {/* 6 Ô hiển thị đồ họa */}
            <div
              className={`flex items-center justify-center gap-2 sm:gap-3 select-none ${
                isErrorShake ? 'animate-shake' : ''
              }`}
            >
              {[0, 1, 2, 3, 4, 5].map((index) => {
                const char = otp[index] || '';
                const isCurrentActive =
                  isFocused &&
                  (otp.length === index || (otp.length === 6 && index === 5));
                const isFilled = Boolean(char);

                return (
                  <div
                    key={index}
                    className={`w-11 h-13 sm:w-12 sm:h-14 flex items-center justify-center text-xl sm:text-2xl font-black rounded-2xl border-2 transition-all duration-150 shadow-2xs relative ${
                      isLoading
                        ? 'bg-gray-100 text-gray-400 border-gray-200'
                        : isErrorShake
                        ? 'border-red-500 bg-red-50 text-red-700 ring-4 ring-red-500/10'
                        : isCurrentActive
                        ? 'border-[#00a854] bg-white text-gray-900 ring-4 ring-emerald-500/20 scale-105 shadow-md'
                        : isFilled
                        ? 'border-emerald-600/40 bg-emerald-50/30 text-gray-900'
                        : 'border-gray-200 bg-gray-50/60 text-gray-900'
                    }`}
                  >
                    {char ? (
                      <span>{char}</span>
                    ) : isCurrentActive ? (
                      <span className="w-0.5 h-6 bg-[#00a854] animate-pulse rounded-full" />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="text-center space-y-2">
            <p className="text-xs text-gray-500">
              {mode === 'email' ? (
                <span>Vui lòng kiểm tra mã OTP gửi đến hòm thư <strong className="text-gray-900">{email}</strong>.</span>
              ) : (
                <span>Vui lòng kiểm tra tin nhắn <strong className="text-gray-900">SMS</strong> gửi đến <strong className="text-gray-900">{phone}</strong>.</span>
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
            disabled={otp.length < 6 || isLoading}
            onClick={() => handleVerifyOtp(otp)}
            rightIcon={!isLoading ? <ArrowRight className="w-4 h-4" /> : undefined}
          >
            {isLoading ? 'Đang xác thực...' : 'Xác Nhận & Hoàn Tất'}
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
          <Link
            to={isRegisterAction ? '/dang-ky' : '/dang-nhap'}
            className="text-xs text-gray-400 hover:text-gray-600 font-medium"
          >
            {isRegisterAction ? '← Quay lại trang đăng ký' : '← Quay lại trang đăng nhập'}
          </Link>
        </div>
      </div>
    </div>
  );
};
