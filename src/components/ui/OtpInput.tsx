import React, { useState, useRef, useEffect, useCallback } from 'react';

export interface OtpInputProps {
  length?: number;
  value?: string;
  onChange?: (otp: string) => void;
  onComplete?: (otp: string) => void;
  disabled?: boolean;
  isError?: boolean;
  autoFocus?: boolean;
  className?: string;
}

export const OtpInput: React.FC<OtpInputProps> = ({
  length = 6,
  value = '',
  onChange,
  onComplete,
  disabled = false,
  isError = false,
  autoFocus = true,
  className = '',
}) => {
  // Khởi tạo mảng lưu trữ từng ký tự của mã OTP
  const [digits, setDigits] = useState<string[]>(() => {
    const initial = new Array(length).fill('');
    if (value) {
      const cleanVal = value.replace(/\D/g, '').slice(0, length);
      for (let i = 0; i < cleanVal.length; i++) {
        initial[i] = cleanVal[i];
      }
    }
    return initial;
  });

  const [activeIndex, setActiveIndex] = useState<number>(autoFocus ? 0 : -1);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Đồng bộ khi prop `value` từ bên ngoài thay đổi
  useEffect(() => {
    if (value !== undefined) {
      const cleanVal = value.replace(/\D/g, '').slice(0, length);
      const newDigits = new Array(length).fill('');
      for (let i = 0; i < cleanVal.length; i++) {
        newDigits[i] = cleanVal[i];
      }
      setDigits(newDigits);
    }
  }, [value, length]);

  // Tự động focus ô đầu tiên khi mount
  useEffect(() => {
    if (autoFocus && !disabled && inputRefs.current[0]) {
      inputRefs.current[0].focus();
      setActiveIndex(0);
    }
  }, [autoFocus, disabled]);

  // Cập nhật và kích hoạt sự kiện hoàn thành
  const updateDigits = useCallback(
    (newDigits: string[]) => {
      setDigits(newDigits);
      const fullOtp = newDigits.join('');
      onChange?.(fullOtp);

      if (fullOtp.length === length && !newDigits.includes('')) {
        onComplete?.(fullOtp);
      }
    },
    [length, onChange, onComplete]
  );

  // Xử lý khi người dùng gõ phím
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    if (disabled) return;

    const rawVal = e.target.value;
    // Chỉ giữ lại chữ số
    const numbersOnly = rawVal.replace(/\D/g, '');

    if (!numbersOnly) {
      // Trường hợp xóa trắng ô
      const next = [...digits];
      next[index] = '';
      updateDigits(next);
      return;
    }

    // Lấy chữ số mới nhất vừa nhập (chống nhảy số và dồn nhiều ký tự)
    const singleDigit = numbersOnly.slice(-1);
    const next = [...digits];
    next[index] = singleDigit;
    updateDigits(next);

    // Tự động nhảy con trỏ sang ô tiếp theo
    if (index < length - 1) {
      const nextInput = inputRefs.current[index + 1];
      if (nextInput) {
        nextInput.focus();
        nextInput.select();
        setActiveIndex(index + 1);
      }
    }
  };

  // Xử lý các phím đặc biệt (Backspace, Delete, Phím mũi tên)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (disabled) return;

    if (e.key === 'Backspace') {
      e.preventDefault();
      const next = [...digits];

      if (next[index]) {
        // Nếu ô hiện tại đang có số -> Xóa số ở ô hiện tại
        next[index] = '';
        updateDigits(next);
      } else if (index > 0) {
        // Nếu ô hiện tại đã trống -> Lùi về ô trước và xóa số ô trước
        next[index - 1] = '';
        updateDigits(next);
        const prevInput = inputRefs.current[index - 1];
        if (prevInput) {
          prevInput.focus();
          prevInput.select();
          setActiveIndex(index - 1);
        }
      }
    } else if (e.key === 'Delete') {
      e.preventDefault();
      const next = [...digits];
      next[index] = '';
      updateDigits(next);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (index > 0) {
        const prevInput = inputRefs.current[index - 1];
        if (prevInput) {
          prevInput.focus();
          prevInput.select();
          setActiveIndex(index - 1);
        }
      }
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (index < length - 1) {
        const nextInput = inputRefs.current[index + 1];
        if (nextInput) {
          nextInput.focus();
          nextInput.select();
          setActiveIndex(index + 1);
        }
      }
    }
  };

  // Xử lý Auto-Paste mã OTP (VD: copy "123456" hoặc tin nhắn SMS autofill)
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (disabled) return;

    const pastedData = e.clipboardData.getData('text');
    const numbersOnly = pastedData.replace(/\D/g, '').slice(0, length);

    if (!numbersOnly) return;

    const next = new Array(length).fill('');
    for (let i = 0; i < numbersOnly.length; i++) {
      next[i] = numbersOnly[i];
    }
    updateDigits(next);

    // Focus vào ô cuối cùng đã điền hoặc ô tiếp theo
    const targetIdx = Math.min(numbersOnly.length, length - 1);
    const targetInput = inputRefs.current[targetIdx];
    if (targetInput) {
      targetInput.focus();
      targetInput.select();
      setActiveIndex(targetIdx);
    }
  };

  // Xử lý khi click / focus vào ô
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>, index: number) => {
    setActiveIndex(index);
    // Bôi đen toàn bộ số trong ô để khi gõ số mới sẽ tự động ghi đè
    e.target.select();
  };

  return (
    <div
      className={`flex items-center justify-center gap-2 sm:gap-3 select-none ${
        isError ? 'animate-shake' : ''
      } ${className}`}
    >
      {digits.map((digit, idx) => {
        const isFilled = digit !== '';
        const isFocused = activeIndex === idx;

        return (
          <input
            key={idx}
            ref={(el) => (inputRefs.current[idx] = el)}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={digit}
            disabled={disabled}
            autoComplete={idx === 0 ? 'one-time-code' : 'off'}
            onChange={(e) => handleChange(e, idx)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            onPaste={handlePaste}
            onFocus={(e) => handleFocus(e, idx)}
            onBlur={() => setActiveIndex(-1)}
            aria-label={`Mã OTP số ${idx + 1}`}
            className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-xl sm:text-2xl font-black rounded-2xl border-2 outline-hidden transition-all duration-200 shadow-2xs ${
              disabled ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : ''
            } ${
              isError
                ? 'border-red-500 bg-red-50/50 text-red-700 ring-4 ring-red-500/10'
                : isFocused
                ? 'border-[#00a854] bg-white text-gray-900 ring-4 ring-emerald-500/20 scale-105 shadow-md'
                : isFilled
                ? 'border-emerald-600/40 bg-emerald-50/30 text-gray-900 font-black'
                : 'border-gray-200 bg-gray-50/60 text-gray-900 hover:border-gray-300'
            }`}
          />
        );
      })}
    </div>
  );
};
