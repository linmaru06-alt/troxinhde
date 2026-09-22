import React, { useState, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { syncUserToSupabase } from '../../lib/supabaseAuthSync';
import { uploadToStorage } from '../../lib/storage';
import { uploadImage, validateImageFile } from '../../lib/cloudinary';
import {
  User as UserIcon,
  Phone,
  School,
  Calendar,
  ShieldCheck,
  ShieldAlert,
  UploadCloud,
  CheckCircle2,
  Trash2,
  Camera,
  Loader2,
  Link2,
  Sparkles,
  AlertCircle,
  HelpCircle,
  Save,
  RotateCcw,
} from 'lucide-react';

const UNIVERSITY_OPTIONS = [
  'Đại học Quốc Gia Hà Nội',
  'Đại học Bách Khoa Hà Nội',
  'Đại học Kinh Tế Quốc Dân',
  'Đại học Ngoại Thương',
  'Đại học Sư Phạm Hà Nội',
  'Đại học Thương Mại',
  'Đại học Hà Nội',
  'Đại học Kiến Trúc Hà Nội',
  'Đại học Luật Hà Nội',
  'Đại học Giao Thông Vận Tải',
  'Đại học Xây Dựng Hà Nội',
  'Đại học Y Hà Nội',
  'Học viện Ngân Hàng',
  'Học viện Tài Chính',
  'Học viện Bưu Chính Viễn Thông',
  'Học viện Báo Chí & Tuyên Truyền',
  'Đại học FPT',
  'Đại học Bách Khoa TP.HCM',
  'Đại học Khoa Học Tự Nhiên TP.HCM',
  'Đại học Kinh Tế TP.HCM (UEH)',
  'Đại học Quốc Tế - ĐHQG TP.HCM',
  'Đại học Cần Thơ',
  'Đại học Đà Nẵng',
  'Khác / Đã đi làm',
];

const YEAR_OPTIONS = [
  'Năm 1',
  'Năm 2',
  'Năm 3',
  'Năm 4',
  'Cựu sinh viên',
  'Đi làm',
];

interface EditProfileFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  className?: string;
}

export const EditProfileForm: React.FC<EditProfileFormProps> = ({
  onSuccess,
  onCancel,
  className = '',
}) => {
  const { currentUser, setCurrentUser, showToast } = useAppStore();

  // Khối 1: Thông tin chung
  const [avatarUrl, setAvatarUrl] = useState<string>(
    currentUser?.avatarUrl || '/images/user-avatar.jpg'
  );
  const [name, setName] = useState<string>(currentUser?.name || '');
  const [school, setSchool] = useState<string>(currentUser?.school || 'Đại học Quốc Gia Hà Nội');
  const [customSchool, setCustomSchool] = useState<string>('');
  const [year, setYear] = useState<string>(currentUser?.year || 'Năm 2');
  const [phone, setPhone] = useState<string>(currentUser?.phone || '');
  const [phoneVerified, setPhoneVerified] = useState<boolean>(
    Boolean(currentUser?.phoneVerified)
  );

  // Khối 2: Xác thực & Liên hệ
  const [studentCardUrl, setStudentCardUrl] = useState<string>(
    currentUser?.studentCardUrl || ''
  );
  const [socialLink, setSocialLink] = useState<string>(
    currentUser?.socialLink || ''
  );

  // Trạng thái xử lý
  const [isUploadingAvatar, setIsUploadingAvatar] = useState<boolean>(false);
  const [isUploadingCard, setIsUploadingCard] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [errors, setErrors] = useState<{ name?: string; phone?: string; socialLink?: string }>({});

  // Modal / Trạng thái xác thực SĐT mini
  const [showPhoneVerifyModal, setShowPhoneVerifyModal] = useState<boolean>(false);
  const [otpCode, setOtpCode] = useState<string>('');
  const [isVerifyingPhone, setIsVerifyingPhone] = useState<boolean>(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const cardInputRef = useRef<HTMLInputElement>(null);

  // Kiểm tra trường học có trong danh sách hay là tùy chọn khác
  const isCustomSchool = !UNIVERSITY_OPTIONS.includes(school) && school !== '';

  // Xử lý upload ảnh Avatar
  const handleAvatarFileChange = async (file: File | null) => {
    if (!file) return;

    const validationError = validateImageFile(file);
    if (validationError) {
      showToast(validationError, '', 'error');
      return;
    }

    setIsUploadingAvatar(true);
    // Preview trước tức thì
    const preview = URL.createObjectURL(file);
    setAvatarUrl(preview);

    try {
      // Ưu tiên tải lên Supabase Storage hoặc Cloudinary
      let uploadedUrl = '';
      try {
        uploadedUrl = await uploadToStorage(file, 'avatars', { folder: 'user_avatars' });
      } catch {
        uploadedUrl = await uploadImage(file, 'troxinh/avatars');
      }

      setAvatarUrl(uploadedUrl);
      showToast('Đã tải ảnh đại diện lên thành công', '', 'success');
    } catch (err: any) {
      showToast('Không thể tải ảnh lên', err?.message || 'Vui lòng thử lại', 'error');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Xử lý upload ảnh Thẻ sinh viên / CCCD
  const handleCardFileChange = async (file: File | null) => {
    if (!file) return;

    const validationError = validateImageFile(file);
    if (validationError) {
      showToast(validationError, '', 'error');
      return;
    }

    setIsUploadingCard(true);
    // Preview tức thì
    const preview = URL.createObjectURL(file);
    setStudentCardUrl(preview);

    try {
      let uploadedUrl = '';
      try {
        uploadedUrl = await uploadToStorage(file, 'documents', { folder: 'student_cards' });
      } catch {
        uploadedUrl = await uploadImage(file, 'troxinh/documents');
      }

      setStudentCardUrl(uploadedUrl);
      showToast('Tải lên ảnh Thẻ SV / CCCD thành công!', '', 'success');
    } catch (err: any) {
      showToast('Tải tài liệu thất bại', err?.message || 'Vui lòng thử lại', 'error');
    } finally {
      setIsUploadingCard(false);
    }
  };

  // Xử lý kéo thả file thẻ sinh viên
  const handleDropCard = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleCardFileChange(e.dataTransfer.files[0]);
    }
  };

  // Giả lập luồng gửi OTP xác thực số điện thoại
  const handleSendOtp = () => {
    if (!phone || phone.replace(/\D/g, '').length < 9) {
      setErrors((prev) => ({ ...prev, phone: 'Vui lòng nhập số điện thoại hợp lệ' }));
      return;
    }
    setErrors((prev) => ({ ...prev, phone: undefined }));
    setShowPhoneVerifyModal(true);
    showToast('Mã OTP xác thực đã được gửi tới số điện thoại của bạn!', '', 'info');
  };

  const handleConfirmOtp = () => {
    if (!otpCode || otpCode.trim().length < 4) {
      showToast('Vui lòng nhập mã OTP gồm 4-6 chữ số', '', 'error');
      return;
    }
    setIsVerifyingPhone(true);
    setTimeout(() => {
      setIsVerifyingPhone(false);
      setPhoneVerified(true);
      setShowPhoneVerifyModal(false);
      setOtpCode('');
      showToast('Xác thực số điện thoại thành công!', '', 'success');
    }, 600);
  };

  // Validate form
  const validateForm = () => {
    const newErrors: { name?: string; phone?: string; socialLink?: string } = {};

    if (!name.trim()) {
      newErrors.name = 'Vui lòng nhập Họ và tên';
    }

    if (phone && phone.replace(/\D/g, '').length < 9) {
      newErrors.phone = 'Số điện thoại không đúng định dạng';
    }

    if (socialLink) {
      const isUrl = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/.test(socialLink.trim());
      const isZaloPhone = /^0\d{9}$/.test(socialLink.trim()) || socialLink.includes('zalo.me') || socialLink.includes('facebook.com') || socialLink.includes('fb.com');
      if (!isUrl && !isZaloPhone) {
        newErrors.socialLink = 'Vui lòng nhập liên kết hợp lệ (vd: https://zalo.me/... hoặc https://facebook.com/...)';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Xử lý Lưu thay đổi
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      showToast('Vui lòng kiểm tra lại các trường thông tin!', '', 'error');
      return;
    }

    if (!currentUser) {
      showToast('Bạn chưa đăng nhập. Vui lòng đăng nhập lại.', '', 'error');
      return;
    }

    setIsSaving(true);

    const finalSchool = school === 'Khác / Đã đi làm' && customSchool.trim() ? customSchool.trim() : school;
    const isStudentVerified = Boolean(studentCardUrl) || Boolean(currentUser.studentVerified);

    const updatedUser = {
      ...currentUser,
      name: name.trim(),
      avatarUrl: avatarUrl || currentUser.avatarUrl,
      school: finalSchool,
      year: year,
      phone: phone.trim(),
      phoneVerified: phoneVerified,
      studentCardUrl: studentCardUrl,
      socialLink: socialLink.trim(),
      studentVerified: isStudentVerified,
      verified: isStudentVerified || currentUser.verified,
    };

    try {
      // 1. Cập nhật Zustand App Store
      setCurrentUser(updatedUser);

      // 2. Đồng bộ lên Supabase Profiles
      try {
        await syncUserToSupabase({
          id: currentUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          phone: updatedUser.phone,
          role: updatedUser.role as any,
          avatar_url: updatedUser.avatarUrl,
          verified: updatedUser.verified,
        });
      } catch (syncErr) {
        console.warn('[EditProfile] Lỗi đồng bộ Supabase:', syncErr);
      }

      showToast('Cập nhật hồ sơ thành công!', 'Thông tin cá nhân của bạn đã được lưu.', 'success');

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      showToast('Lỗi khi cập nhật hồ sơ', err?.message || 'Vui lòng thử lại sau', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className={`space-y-6 text-left ${className}`}>
      {/* ========================================================================= */}
      {/* 1. KHỐI THÔNG TIN CHUNG (Basic Info) */}
      {/* ========================================================================= */}
      <section className="bg-white rounded-3xl p-5 sm:p-7 border border-gray-200 shadow-xs space-y-6 transition-all">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div className="space-y-1">
            <h2 className="text-base sm:text-lg font-black text-gray-900 flex items-center gap-2">
              <UserIcon className="w-5 h-5 text-[#00a854]" />
              1. Khối Thông Tin Chung
            </h2>
            <p className="text-xs sm:text-sm text-gray-500">
              Ảnh đại diện, họ tên và thông tin trường học của bạn
            </p>
          </div>
          <span className="text-[11px] font-bold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
            Bắt buộc
          </span>
        </div>

        {/* 1.1 Avatar Section */}
        <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-gray-50/70 border border-gray-200/70">
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleAvatarFileChange(e.target.files[0]);
              }
            }}
          />

          <div className="relative group shrink-0">
            <div
              onClick={() => avatarInputRef.current?.click()}
              className="w-24 h-24 rounded-full overflow-hidden border-3 border-white shadow-md bg-white cursor-pointer group-hover:ring-3 group-hover:ring-[#00a854] transition-all relative flex items-center justify-center"
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={name || 'Ảnh đại diện'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-emerald-50 text-[#00a854] text-2xl font-bold">
                  {name ? name.charAt(0).toUpperCase() : '👤'}
                </div>
              )}

              {/* Overlay hover */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
                <Camera className="w-5 h-5 mb-0.5" />
                <span className="text-[9px] font-bold uppercase tracking-wider">Đổi ảnh</span>
              </div>

              {isUploadingAvatar && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-[#00a854] animate-spin" />
                </div>
              )}
            </div>

            {/* Camera badge icon */}
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="absolute bottom-0 right-0 p-1.5 bg-[#00a854] text-white rounded-full shadow-sm hover:bg-[#009247] transition active:scale-95"
              title="Thay đổi ảnh đại diện"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1.5 text-center sm:text-left flex-1">
            <h3 className="text-sm font-bold text-gray-900">Ảnh đại diện</h3>
            <p className="text-xs text-gray-500">
              Định dạng JPG, PNG, WEBP (tối đa 5MB). Sử dụng ảnh chân dung rõ mặt để tạo uy tín khi giao lưu.
            </p>
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00a854] hover:text-[#009247] hover:underline pt-1"
            >
              <Camera className="w-3.5 h-3.5" />
              {isUploadingAvatar ? 'Đang tải ảnh lên...' : 'Thay đổi ảnh'}
            </button>
          </div>
        </div>

        {/* 1.2 Form fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Họ và tên */}
          <div className="space-y-1.5 md:col-span-2">
            <label htmlFor="user-fullname" className="block text-xs sm:text-sm font-bold text-gray-800">
              Họ và tên <span className="text-red-500">*</span>
            </label>
            <input
              id="user-fullname"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
              }}
              placeholder="Nhập họ và tên đầy đủ (vd: Nguyễn Văn A)"
              className={`w-full px-4 py-3 rounded-2xl border text-sm text-gray-900 placeholder-gray-400 bg-white transition focus:outline-none focus:ring-2 focus:ring-[#00a854] focus:border-transparent ${
                errors.name ? 'border-red-400 bg-red-50/20' : 'border-gray-300 hover:border-gray-400'
              }`}
            />
            {errors.name && <p className="text-xs text-red-600 font-medium">{errors.name}</p>}
          </div>

          {/* Trường học / Nơi làm việc */}
          <div className="space-y-1.5">
            <label htmlFor="user-school" className="block text-xs sm:text-sm font-bold text-gray-800 flex items-center gap-1.5">
              <School className="w-4 h-4 text-[#00a854]" />
              Trường học / Nơi làm việc
            </label>
            <select
              id="user-school"
              value={isCustomSchool ? 'Khác / Đã đi làm' : school}
              onChange={(e) => {
                setSchool(e.target.value);
                if (e.target.value !== 'Khác / Đã đi làm') {
                  setCustomSchool('');
                }
              }}
              className="w-full px-4 py-3 rounded-2xl border border-gray-300 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#00a854] focus:border-transparent hover:border-gray-400 transition"
            >
              {UNIVERSITY_OPTIONS.map((uni) => (
                <option key={uni} value={uni}>
                  {uni}
                </option>
              ))}
            </select>

            {/* Nếu chọn khác hoặc là trường tùy chỉnh */}
            {(school === 'Khác / Đã đi làm' || isCustomSchool) && (
              <input
                type="text"
                value={customSchool || (isCustomSchool ? school : '')}
                onChange={(e) => setCustomSchool(e.target.value)}
                placeholder="Nhập tên trường hoặc nơi công tác..."
                className="w-full mt-2 px-4 py-2.5 rounded-xl border border-gray-300 text-xs text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-[#00a854]"
              />
            )}
          </div>

          {/* Năm học */}
          <div className="space-y-1.5">
            <label htmlFor="user-year" className="block text-xs sm:text-sm font-bold text-gray-800 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[#00a854]" />
              Năm học / Tình trạng
            </label>
            <select
              id="user-year"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-gray-300 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#00a854] focus:border-transparent hover:border-gray-400 transition"
            >
              {YEAR_OPTIONS.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* Số điện thoại & Xác thực */}
          <div className="space-y-1.5 md:col-span-2">
            <label htmlFor="user-phone" className="block text-xs sm:text-sm font-bold text-gray-800 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Phone className="w-4 h-4 text-[#00a854]" />
                Số điện thoại
              </span>
              {phoneVerified ? (
                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Đã xác minh
                </span>
              ) : (
                <span className="text-[11px] text-amber-700 font-medium">Chưa xác minh</span>
              )}
            </label>

            <div className="relative flex items-center">
              <input
                id="user-phone"
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (phoneVerified && e.target.value !== currentUser?.phone) {
                    setPhoneVerified(false); // Cần xác minh lại nếu đổi SĐT
                  }
                  if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
                }}
                placeholder="Nhập số điện thoại (vd: 0987654321)"
                className={`w-full px-4 py-3 pr-28 rounded-2xl border text-sm text-gray-900 placeholder-gray-400 bg-white transition focus:outline-none focus:ring-2 focus:ring-[#00a854] focus:border-transparent ${
                  errors.phone ? 'border-red-400 bg-red-50/20' : 'border-gray-300 hover:border-gray-400'
                }`}
              />

              {/* Nút bấm nhỏ Xác thực bên cạnh */}
              <div className="absolute right-2">
                {phoneVerified ? (
                  <div className="px-3 py-1.5 bg-emerald-100/70 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Đã duyệt
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    className="px-3 py-1.5 bg-[#00a854] hover:bg-[#009247] text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition flex items-center gap-1"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Xác thực
                  </button>
                )}
              </div>
            </div>
            {errors.phone && <p className="text-xs text-red-600 font-medium">{errors.phone}</p>}
            <p className="text-[11px] text-gray-500">
              Số điện thoại dùng để nhận tin nhắn lịch hẹn phòng và hỗ trợ giao dịch an toàn.
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. KHỐI XÁC THỰC & LIÊN HỆ (Trust & Contact) */}
      {/* ========================================================================= */}
      <section className="bg-white rounded-3xl p-5 sm:p-7 border border-gray-200 shadow-xs space-y-6 transition-all">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div className="space-y-1">
            <h2 className="text-base sm:text-lg font-black text-gray-900 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              2. Khối Xác Thực & Liên Hệ
            </h2>
            <p className="text-xs sm:text-sm text-gray-500">
              Tăng độ tin cậy để nhận huy hiệu xác minh và kết nối người mua/bán
            </p>
          </div>
          <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            Tăng uy tín
          </span>
        </div>

        {/* 2.1 Xác minh sinh viên (Thẻ SV / CCCD Upload) */}
        <div className="space-y-2">
          <label className="block text-xs sm:text-sm font-bold text-gray-800">
            Xác minh sinh viên (Mặt trước Thẻ SV hoặc CCCD)
          </label>

          <input
            ref={cardInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleCardFileChange(e.target.files[0]);
              }
            }}
          />

          {!studentCardUrl ? (
            /* Khu vực Drag & Drop / Click Upload */
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDropCard}
              onClick={() => cardInputRef.current?.click()}
              className={`p-6 sm:p-8 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center flex flex-col items-center justify-center gap-2.5 ${
                isDragOver
                  ? 'border-[#00a854] bg-emerald-50/50 scale-[0.99]'
                  : 'border-gray-300 hover:border-[#00a854] bg-gray-50/60 hover:bg-gray-50'
              }`}
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-[#00a854] flex items-center justify-center">
                {isUploadingCard ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <UploadCloud className="w-6 h-6" />
                )}
              </div>
              <div className="space-y-1">
                <p className="text-xs sm:text-sm font-bold text-gray-800">
                  {isUploadingCard
                    ? 'Đang tải lên tài liệu xác minh...'
                    : 'Kéo thả hoặc bấm vào đây để tải ảnh lên'}
                </p>
                <p className="text-[11px] text-gray-500">
                  Hỗ trợ định dạng JPG, PNG, WEBP (mặt trước rõ nét, không bị che khuất)
                </p>
              </div>
            </div>
          ) : (
            /* Hiển thị Preview ảnh thẻ sinh viên khi đã tải lên */
            <div className="relative rounded-2xl border border-gray-200 bg-gray-50 p-3 sm:p-4 flex flex-col sm:flex-row items-center gap-4">
              <div className="w-full sm:w-44 h-28 rounded-xl overflow-hidden bg-gray-200 border border-gray-300 relative shrink-0">
                <img
                  src={studentCardUrl}
                  alt="Thẻ sinh viên / CCCD"
                  className="w-full h-full object-cover"
                />
                {isUploadingCard && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                )}
              </div>

              <div className="space-y-1 flex-1 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs font-bold text-emerald-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Đã tải lên mặt trước thẻ
                </div>
                <p className="text-xs text-gray-600 font-medium">
                  Hồ sơ đang ở trạng thái xác thực danh tính sinh viên.
                </p>
                <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => cardInputRef.current?.click()}
                    disabled={isUploadingCard}
                    className="text-xs font-bold text-[#00a854] hover:underline"
                  >
                    Đổi ảnh khác
                  </button>
                  <span className="text-gray-300">•</span>
                  <button
                    type="button"
                    onClick={() => setStudentCardUrl('')}
                    disabled={isUploadingCard}
                    className="text-xs font-bold text-rose-600 hover:underline flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> Xóa
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Ghi chú bắt buộc theo yêu cầu */}
          <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200/80 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-[#00a854] shrink-0 mt-0.5" />
            <p className="text-xs text-emerald-950 font-medium">
              <strong>Ghi chú:</strong> Tải lên để nhận huy hiệu <strong>Đã xác minh sinh viên</strong>. Thông tin chỉ dùng để duyệt huy hiệu và được bảo mật tuyệt đối.
            </p>
          </div>
        </div>

        {/* 2.2 Mạng xã hội (Tùy chọn) */}
        <div className="space-y-1.5">
          <label htmlFor="user-social-link" className="block text-xs sm:text-sm font-bold text-gray-800 flex items-center gap-1.5">
            <Link2 className="w-4 h-4 text-blue-600" />
            Mạng xã hội <span className="text-xs font-normal text-gray-500">(Tùy chọn)</span>
          </label>
          <div className="relative">
            <input
              id="user-social-link"
              type="text"
              value={socialLink}
              onChange={(e) => {
                setSocialLink(e.target.value);
                if (errors.socialLink) setErrors((prev) => ({ ...prev, socialLink: undefined }));
              }}
              placeholder="Điền link Zalo hoặc Facebook cá nhân (vd: https://facebook.com/username hoặc https://zalo.me/0987654321)"
              className={`w-full px-4 py-3 rounded-2xl border text-sm text-gray-900 placeholder-gray-400 bg-white transition focus:outline-none focus:ring-2 focus:ring-[#00a854] focus:border-transparent ${
                errors.socialLink ? 'border-red-400 bg-red-50/20' : 'border-gray-300 hover:border-gray-400'
              }`}
            />
          </div>
          {errors.socialLink && <p className="text-xs text-red-600 font-medium">{errors.socialLink}</p>}
          <p className="text-[11px] text-gray-500">
            Giúp tăng độ tin cậy khi giao dịch trên Chợ đồ cũ và tìm bạn cùng phòng trọ.
          </p>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. NÚT LƯU THAY ĐỔI (Trải dài Mobile, Xanh lá thương hiệu) */}
      {/* ========================================================================= */}
      <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl border border-gray-300 text-gray-700 hover:bg-gray-100 font-bold text-sm transition active:scale-95 text-center"
          >
            Hủy bỏ
          </button>
        )}

        <button
          type="submit"
          disabled={isSaving || isUploadingAvatar || isUploadingCard}
          className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-green-600 hover:bg-green-700 text-white font-bold text-sm sm:text-base shadow-md hover:shadow-lg transition-all duration-200 active:scale-98 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Đang lưu thay đổi...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Lưu thay đổi
            </>
          )}
        </button>
      </div>

      {/* ========================================================================= */}
      {/* MODAL XÁC THỰC SỐ ĐIỆN THOẠI (OTP) */}
      {/* ========================================================================= */}
      {showPhoneVerifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-5 shadow-2xl border border-gray-100 animate-scaleUp">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-[#00a854] flex items-center justify-center mx-auto">
                <Phone className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-gray-900">Xác thực số điện thoại</h3>
              <p className="text-xs text-gray-500">
                Nhập mã OTP gồm 6 chữ số đã được gửi tới số <strong>{phone}</strong>
              </p>
            </div>

            <div className="space-y-2">
              <input
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="Nhập mã OTP (vd: 123456)"
                className="w-full px-4 py-3 text-center tracking-widest text-lg font-black rounded-2xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#00a854]"
                autoFocus
              />
              <p className="text-[11px] text-gray-400 text-center">
                Mẹo thử nghiệm: Có thể nhập bất kỳ mã 6 chữ số nào để xác nhận.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowPhoneVerifyModal(false)}
                className="flex-1 py-3 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmOtp}
                disabled={isVerifyingPhone}
                className="flex-1 py-3 rounded-xl bg-[#00a854] hover:bg-[#009247] text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5"
              >
                {isVerifyingPhone ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
};
