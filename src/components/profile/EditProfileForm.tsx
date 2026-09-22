import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { syncUserToSupabase, fetchUserProfileFromSupabase } from '../../lib/supabaseAuthSync';
import { uploadToStorage } from '../../lib/storage';
import { uploadImage } from '../../lib/cloudinary';
import {
  User as UserIcon,
  Phone,
  School,
  Calendar,
  ShieldCheck,
  UploadCloud,
  CheckCircle2,
  Trash2,
  Camera,
  Loader2,
  Link2,
  Sparkles,
  AlertCircle,
  Save,
  Building2,
  Clock,
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

interface FormErrors {
  name?: string;
  phone?: string;
  studentCard?: string;
  socialLink?: string;
}

interface EditProfileFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  className?: string;
  showOwnerUpgradeCTA?: boolean;
}

/**
 * Kiểm tra định dạng link Facebook hoặc Zalo
 * BẮT BUỘC phải là URL hợp lệ bắt đầu bằng https://facebook.com/, https://www.facebook.com/, hoặc https://zalo.me/
 */
export const validateSocialUrl = (url: string): boolean => {
  if (!url || !url.trim()) return false;
  const regex = /^https:\/\/(www\.)?(facebook\.com\/[A-Za-z0-9_.-]+|zalo\.me\/[A-Za-z0-9_.-]+)/i;
  return regex.test(url.trim());
};

/**
 * Kiểm tra định dạng ảnh (PNG, JPEG, JPG, WebP) và dung lượng tối đa 5MB
 */
export const validateImageSizeAndType = (file: File): string | null => {
  const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  const hasValidType = ACCEPTED_TYPES.includes(file.type.toLowerCase()) || Boolean(file.name.match(/\.(jpg|jpeg|png|webp)$/i));

  if (!hasValidType) {
    return 'Định dạng ảnh không hợp lệ. Chỉ chấp nhận JPG, JPEG, PNG, WebP';
  }

  const MAX_SIZE_MB = 5;
  if (file.size > MAX_SIZE_MB * 1024 * 1024) {
    return 'Dung lượng file vượt quá giới hạn tối đa 5MB. Vui lòng chọn ảnh nhẹ hơn.';
  }

  return null;
};

export const EditProfileForm: React.FC<EditProfileFormProps> = ({
  onSuccess,
  onCancel,
  className = '',
  showOwnerUpgradeCTA = true,
}) => {
  const navigate = useNavigate();
  const { currentUser, setCurrentUser, showToast } = useAppStore();

  const isPendingHost = currentUser?.ownerApplicationStatus === 'pending';
  const isApprovedOwner = currentUser?.role === 'owner';

  // 1. Khởi tạo State rỗng (Không hardcode mock data)
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [school, setSchool] = useState<string>('');
  const [customSchool, setCustomSchool] = useState<string>('');
  const [year, setYear] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [phoneVerified, setPhoneVerified] = useState<boolean>(false);
  const [studentCardUrl, setStudentCardUrl] = useState<string>('');
  const [socialLink, setSocialLink] = useState<string>('');

  // Trạng thái xử lý
  const [isLoadingProfile, setIsLoadingProfile] = useState<boolean>(true);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState<boolean>(false);
  const [isUploadingCard, setIsUploadingCard] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isUpgrading, setIsUpgrading] = useState<boolean>(false);
  const [errors, setErrors] = useState<FormErrors>({});

  // Popup Modal thông báo gửi hồ sơ chủ trọ thành công
  const [showPendingSuccessModal, setShowPendingSuccessModal] = useState<boolean>(false);

  // Modal / Trạng thái xác thực SĐT mini
  const [showPhoneVerifyModal, setShowPhoneVerifyModal] = useState<boolean>(false);
  const [otpCode, setOtpCode] = useState<string>('');
  const [isVerifyingPhone, setIsVerifyingPhone] = useState<boolean>(false);

  // DOM Refs phục vụ tự động Scroll và Focus khi validation thất bại
  const nameInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const cardSectionRef = useRef<HTMLDivElement>(null);
  const socialInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const cardInputRef = useRef<HTMLInputElement>(null);

  // =========================================================================
  // FETCH DATA TỪ SUPABASE KHI LOAD COMPONENT
  // =========================================================================
  useEffect(() => {
    let isMounted = true;

    async function loadRealProfile() {
      if (!currentUser?.id) {
        setIsLoadingProfile(false);
        return;
      }

      setIsLoadingProfile(true);

      try {
        // Query trực tiếp vào bảng profiles trên Supabase
        const dbProfile = await fetchUserProfileFromSupabase(currentUser.id);

        if (isMounted) {
          if (dbProfile) {
            setName(dbProfile.name || '');
            setAvatarUrl(dbProfile.avatar_url || currentUser.avatarUrl || '/images/user-avatar.jpg');
            setPhone(dbProfile.phone || '');
            setPhoneVerified(Boolean(dbProfile.phone_verified));
            setStudentCardUrl(dbProfile.student_card_url || '');
            setSocialLink(dbProfile.social_link || dbProfile.facebook_link || '');

            const dbSchool = dbProfile.school || '';
            if (UNIVERSITY_OPTIONS.includes(dbSchool)) {
              setSchool(dbSchool);
              setCustomSchool('');
            } else if (dbSchool) {
              setSchool('Khác / Đã đi làm');
              setCustomSchool(dbSchool);
            } else {
              setSchool('');
              setCustomSchool('');
            }

            setYear(dbProfile.year || '');

            // Đồng bộ lại currentUser trong zustand store với dữ liệu thật từ DB
            setCurrentUser({
              ...currentUser,
              name: dbProfile.name || currentUser.name,
              avatarUrl: dbProfile.avatar_url || currentUser.avatarUrl,
              phone: dbProfile.phone || currentUser.phone,
              phoneVerified: Boolean(dbProfile.phone_verified),
              school: dbProfile.school || currentUser.school,
              year: dbProfile.year || currentUser.year,
              studentCardUrl: dbProfile.student_card_url || currentUser.studentCardUrl,
              socialLink: dbProfile.social_link || currentUser.socialLink,
              ownerApplicationStatus: dbProfile.owner_application_status || currentUser.ownerApplicationStatus,
              verified: Boolean(dbProfile.verified),
            });
          } else {
            // Fallback nếu chưa có trong DB thì lấy từ currentUser
            setName(currentUser.name || '');
            setAvatarUrl(currentUser.avatarUrl || '/images/user-avatar.jpg');
            setPhone(currentUser.phone || '');
            setPhoneVerified(Boolean(currentUser.phoneVerified));
            setStudentCardUrl(currentUser.studentCardUrl || '');
            setSocialLink(currentUser.socialLink || '');

            const curSchool = currentUser.school || '';
            if (UNIVERSITY_OPTIONS.includes(curSchool)) {
              setSchool(curSchool);
            } else if (curSchool) {
              setSchool('Khác / Đã đi làm');
              setCustomSchool(curSchool);
            }

            setYear(currentUser.year || '');
          }
        }
      } catch (err) {
        console.warn('[EditProfileForm] Lỗi tải dữ liệu Supabase:', err);
      } finally {
        if (isMounted) {
          setIsLoadingProfile(false);
        }
      }
    }

    loadRealProfile();

    return () => {
      isMounted = false;
    };
  }, [currentUser?.id]);

  // Kiểm tra trường học có trong danh sách hay là tùy chọn khác
  const isCustomSchool = school === 'Khác / Đã đi làm' || (!UNIVERSITY_OPTIONS.includes(school) && school !== '');

  // Cuộn mượt mà lên trường lỗi đầu tiên
  const scrollToFirstError = (firstErrorField: keyof FormErrors) => {
    setTimeout(() => {
      if (firstErrorField === 'name' && nameInputRef.current) {
        nameInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        nameInputRef.current.focus();
      } else if (firstErrorField === 'phone' && phoneInputRef.current) {
        phoneInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        phoneInputRef.current.focus();
      } else if (firstErrorField === 'studentCard' && cardSectionRef.current) {
        cardSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (firstErrorField === 'socialLink' && socialInputRef.current) {
        socialInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        socialInputRef.current.focus();
      }
    }, 100);
  };

  // Xử lý upload ảnh Avatar
  const handleAvatarFileChange = async (file: File | null) => {
    if (!file) return;

    const validationError = validateImageSizeAndType(file);
    if (validationError) {
      showToast(validationError, '', 'error');
      return;
    }

    setIsUploadingAvatar(true);
    const preview = URL.createObjectURL(file);
    setAvatarUrl(preview);

    try {
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

    const validationError = validateImageSizeAndType(file);
    if (validationError) {
      showToast(validationError, '', 'error');
      return;
    }

    setIsUploadingCard(true);
    const preview = URL.createObjectURL(file);
    setStudentCardUrl(preview);

    if (errors.studentCard) {
      setErrors((prev) => ({ ...prev, studentCard: undefined }));
    }

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
      scrollToFirstError('phone');
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

  // =========================================================================
  // 1. VALIDATION DÀNH CHO NÚT "LƯU THAY ĐỔI" (Người thuê thông thường)
  // =========================================================================
  const validateForRenter = (): boolean => {
    const newErrors: FormErrors = {};

    if (!name.trim()) {
      newErrors.name = 'Vui lòng nhập Họ và tên';
    }

    if (phone.trim() && phone.replace(/\D/g, '').length < 9) {
      newErrors.phone = 'Số điện thoại không đúng định dạng (tối thiểu 9 số)';
    }

    if (socialLink.trim() && !validateSocialUrl(socialLink)) {
      newErrors.socialLink = 'Vui lòng nhập đúng đường dẫn Facebook hoặc Zalo';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      const firstField = Object.keys(newErrors)[0] as keyof FormErrors;
      scrollToFirstError(firstField);
      return false;
    }

    return true;
  };

  // =========================================================================
  // 2. VALIDATION DÀNH CHO NÚT "ĐĂNG KÝ LÀM CHỦ TRỌ" (Owner Upgrade)
  // =========================================================================
  const validateForOwnerUpgrade = (): boolean => {
    const newErrors: FormErrors = {};

    if (!name.trim()) {
      newErrors.name = 'Vui lòng nhập Họ và tên chủ trọ';
    }

    if (!phone.trim()) {
      newErrors.phone = 'Vui lòng nhập Số điện thoại để đăng ký làm chủ trọ';
    } else if (phone.replace(/\D/g, '').length < 9) {
      newErrors.phone = 'Số điện thoại không đúng định dạng (tối thiểu 9 số)';
    }

    if (!studentCardUrl.trim()) {
      newErrors.studentCard = 'Vui lòng tải lên ảnh Thẻ sinh viên hoặc CCCD để xác thực danh tính chủ trọ';
    }

    if (!socialLink.trim() || !validateSocialUrl(socialLink)) {
      newErrors.socialLink = 'Vui lòng nhập đúng đường dẫn Facebook hoặc Zalo';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      showToast(
        'Vui lòng bổ sung SĐT, Ảnh xác minh và Link MXH để đăng ký làm chủ trọ',
        'Hồ sơ chủ trọ yêu cầu đầy đủ thông tin định danh và kênh liên lạc trực tiếp.',
        'error'
      );

      const firstField = Object.keys(newErrors)[0] as keyof FormErrors;
      scrollToFirstError(firstField);
      return false;
    }

    return true;
  };

  // =========================================================================
  // HÀM UPDATE DATA THỰC TẾ XUỐNG SUPABASE
  // =========================================================================
  const saveUserData = async (customOwnerStatus?: 'none' | 'pending' | 'approved' | 'rejected') => {
    if (!currentUser) throw new Error('Chưa đăng nhập');

    const finalSchool = school === 'Khác / Đã đi làm' && customSchool.trim() ? customSchool.trim() : school;
    const isStudentVerified = Boolean(studentCardUrl) || Boolean(currentUser.studentVerified);
    const targetStatus = customOwnerStatus !== undefined ? customOwnerStatus : (currentUser.ownerApplicationStatus || 'none');

    const profileData = {
      id: currentUser.id,
      name: name.trim(),
      email: currentUser.email,
      phone: phone.trim() || undefined,
      role: currentUser.role as any,
      avatar_url: avatarUrl || currentUser.avatarUrl || '/images/user-avatar.jpg',
      verified: isStudentVerified || currentUser.verified,
      owner_application_status: targetStatus,
      school: finalSchool || undefined,
      year: year || undefined,
      student_card_url: studentCardUrl || undefined,
      social_link: socialLink.trim() || undefined,
      facebook_link: socialLink.trim() || undefined,
      phone_verified: phoneVerified,
      student_verified: isStudentVerified,
    };

    // 1. Cập nhật thực tế xuống Supabase
    const res = await syncUserToSupabase(profileData);
    if (!res.success && res.error) {
      throw new Error(res.error);
    }

    // 2. Cập nhật Zustand App Store ngay lập tức
    const updatedUser = {
      ...currentUser,
      name: profileData.name,
      avatarUrl: profileData.avatar_url,
      school: finalSchool,
      year: year,
      phone: profileData.phone,
      phoneVerified: phoneVerified,
      studentCardUrl: studentCardUrl,
      socialLink: profileData.social_link,
      studentVerified: isStudentVerified,
      verified: profileData.verified,
      ownerApplicationStatus: targetStatus,
    };

    setCurrentUser(updatedUser);
    return updatedUser;
  };

  // Xử lý Lưu thay đổi (Người thuê bình thường)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForRenter()) {
      showToast('Vui lòng kiểm tra lại thông tin!', '', 'error');
      return;
    }

    if (!currentUser) {
      showToast('Bạn chưa đăng nhập. Vui lòng đăng nhập lại.', '', 'error');
      return;
    }

    setIsSaving(true);
    try {
      await saveUserData();
      showToast('Cập nhật hồ sơ thành công!', 'Thông tin cá nhân của bạn đã được đồng bộ lên Supabase.', 'success');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      showToast('Lỗi khi cập nhật hồ sơ', err?.message || 'Vui lòng thử lại sau', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Xử lý Đăng ký làm chủ trọ (PENDING_HOST)
  const handleOwnerUpgradeClick = async (e: React.MouseEvent) => {
    e.preventDefault();

    if (isPendingHost) {
      showToast('Hồ sơ của bạn đang được xét duyệt', 'Quản trị viên đang thẩm định trong vòng 24h.', 'info');
      return;
    }

    if (!currentUser) {
      showToast('Vui lòng đăng nhập để đăng ký làm chủ trọ', '', 'error');
      navigate('/dang-nhap?returnUrl=/nang-cap-chu-tro');
      return;
    }

    if (!validateForOwnerUpgrade()) {
      return;
    }

    setIsUpgrading(true);
    try {
      await saveUserData('pending');

      showToast(
        'Hồ sơ của bạn đã được gửi.',
        'Quản trị viên sẽ kiểm tra tính xác thực của ảnh thẻ và mạng xã hội trước khi cấp quyền Chủ trọ trong vòng 24h.',
        'success'
      );

      setShowPendingSuccessModal(true);
    } catch (err: any) {
      showToast('Lỗi khi gửi hồ sơ đăng ký', err?.message || 'Vui lòng thử lại sau', 'error');
    } finally {
      setIsUpgrading(false);
    }
  };

  if (isLoadingProfile) {
    return (
      <div className="bg-white rounded-3xl p-10 border border-gray-200 text-center space-y-4 shadow-xs animate-pulse">
        <div className="w-12 h-12 rounded-full bg-emerald-100 text-[#00a854] flex items-center justify-center mx-auto">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
        <div className="space-y-2 max-w-sm mx-auto">
          <div className="h-4 bg-gray-200 rounded-full w-3/4 mx-auto"></div>
          <div className="h-3 bg-gray-100 rounded-full w-1/2 mx-auto"></div>
        </div>
        <p className="text-xs text-gray-500 font-medium">Đang đồng bộ dữ liệu hồ sơ từ Supabase...</p>
      </div>
    );
  }

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
            Cơ bản
          </span>
        </div>

        {/* 1.1 Avatar Section */}
        <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-gray-50/70 border border-gray-200/70">
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/png, image/jpeg, image/jpg, image/webp"
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

            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="absolute bottom-0 right-0 p-1.5 bg-[#00a854] text-white rounded-full shadow-sm hover:bg-[#009247] transition active:scale-95 cursor-pointer"
              title="Thay đổi ảnh đại diện"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1.5 text-center sm:text-left flex-1">
            <h3 className="text-sm font-bold text-gray-900">Ảnh đại diện</h3>
            <p className="text-xs text-gray-500">
              Chấp nhận PNG, JPEG, JPG, WebP (tối đa 5MB). Ảnh rõ mặt giúp hồ sơ tăng độ tin cậy.
            </p>
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={isUploadingAvatar}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#00a854] hover:text-[#009247] hover:underline pt-1 cursor-pointer"
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
              ref={nameInputRef}
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
              }}
              placeholder="Nhập họ và tên đầy đủ (vd: Nguyễn Văn A)"
              className={`w-full px-4 py-3 rounded-2xl border text-sm text-gray-900 placeholder-gray-400 bg-white transition focus:outline-none focus:ring-2 focus:ring-[#00a854] focus:border-transparent ${
                errors.name ? 'border-red-500 bg-red-50/20 ring-1 ring-red-500' : 'border-gray-300 hover:border-gray-400'
              }`}
            />
            {errors.name && (
              <p className="text-xs text-red-600 font-semibold flex items-center gap-1 animate-fadeIn">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {errors.name}
              </p>
            )}
          </div>

          {/* Trường học / Nơi làm việc */}
          <div className="space-y-1.5">
            <label htmlFor="user-school" className="block text-xs sm:text-sm font-bold text-gray-800 flex items-center gap-1.5">
              <School className="w-4 h-4 text-[#00a854]" />
              Trường học / Nơi làm việc
            </label>
            <select
              id="user-school"
              value={school}
              onChange={(e) => {
                setSchool(e.target.value);
                if (e.target.value !== 'Khác / Đã đi làm') {
                  setCustomSchool('');
                }
              }}
              className="w-full px-4 py-3 rounded-2xl border border-gray-300 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#00a854] focus:border-transparent hover:border-gray-400 transition"
            >
              <option value="">-- Chọn Trường Đại học / Tổ chức --</option>
              {UNIVERSITY_OPTIONS.map((uni) => (
                <option key={uni} value={uni}>
                  {uni}
                </option>
              ))}
            </select>

            {isCustomSchool && (
              <input
                type="text"
                value={customSchool}
                onChange={(e) => setCustomSchool(e.target.value)}
                placeholder="Nhập tên trường hoặc nơi công tác cụ thể..."
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
              <option value="">-- Chọn Năm học --</option>
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
                <span className="text-[11px] font-normal text-gray-500">
                  (Tùy chọn cho Người thuê • <strong className="text-amber-700">Bắt buộc cho Chủ trọ</strong>)
                </span>
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
                ref={phoneInputRef}
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (phoneVerified && e.target.value !== currentUser?.phone) {
                    setPhoneVerified(false);
                  }
                  if (errors.phone) setErrors((prev) => ({ ...prev, phone: undefined }));
                }}
                placeholder="Nhập số điện thoại (vd: 0987654321)"
                className={`w-full px-4 py-3 pr-28 rounded-2xl border text-sm text-gray-900 placeholder-gray-400 bg-white transition focus:outline-none focus:ring-2 focus:ring-[#00a854] focus:border-transparent ${
                  errors.phone ? 'border-red-500 bg-red-50/20 ring-1 ring-red-500' : 'border-gray-300 hover:border-gray-400'
                }`}
              />

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
                    className="px-3 py-1.5 bg-[#00a854] hover:bg-[#009247] text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition flex items-center gap-1 cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Xác thực
                  </button>
                )}
              </div>
            </div>
            {errors.phone && (
              <p className="text-xs text-red-600 font-semibold flex items-center gap-1 animate-fadeIn">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {errors.phone}
              </p>
            )}
            <p className="text-[11px] text-gray-500">
              Số điện thoại dùng để nhận tin nhắn lịch hẹn phòng và liên hệ xác thực tài khoản.
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
              Tăng độ tin cậy để nhận huy hiệu xác minh và kết nối an toàn
            </p>
          </div>
          <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            Tăng uy tín
          </span>
        </div>

        {/* 2.1 Xác minh sinh viên (Thẻ SV / CCCD Upload) */}
        <div ref={cardSectionRef} className="space-y-2">
          <label className="block text-xs sm:text-sm font-bold text-gray-800 flex items-center justify-between">
            <span>
              Xác minh sinh viên / CCCD (Mặt trước Thẻ SV hoặc CCCD)
            </span>
            <span className="text-[11px] font-normal text-gray-500">
              (Tùy chọn cho Người thuê • <strong className="text-amber-700">Bắt buộc cho Chủ trọ</strong>)
            </span>
          </label>

          <input
            ref={cardInputRef}
            type="file"
            accept="image/png, image/jpeg, image/jpg, image/webp"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleCardFileChange(e.target.files[0]);
              }
            }}
          />

          {!studentCardUrl ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDropCard}
              onClick={() => cardInputRef.current?.click()}
              className={`p-6 sm:p-8 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center flex flex-col items-center justify-center gap-2.5 ${
                errors.studentCard
                  ? 'border-red-500 bg-red-50/30 ring-1 ring-red-500'
                  : isDragOver
                  ? 'border-[#00a854] bg-emerald-50/50 scale-[0.99]'
                  : 'border-gray-300 hover:border-[#00a854] bg-gray-50/60 hover:bg-gray-50'
              }`}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${errors.studentCard ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-[#00a854]'}`}>
                {isUploadingCard ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <UploadCloud className="w-6 h-6" />
                )}
              </div>
              <div className="space-y-1">
                <p className={`text-xs sm:text-sm font-bold ${errors.studentCard ? 'text-red-700' : 'text-gray-800'}`}>
                  {isUploadingCard
                    ? 'Đang tải lên tài liệu xác minh...'
                    : 'Kéo thả hoặc bấm vào đây để tải ảnh lên'}
                </p>
                <p className="text-[11px] text-gray-500">
                  Chỉ nhận PNG, JPEG, JPG, WebP (dung lượng tối đa 5MB)
                </p>
              </div>
            </div>
          ) : (
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
                  Hồ sơ đang ở trạng thái xác thực danh tính sinh viên / đối tác.
                </p>
                <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => cardInputRef.current?.click()}
                    disabled={isUploadingCard}
                    className="text-xs font-bold text-[#00a854] hover:underline cursor-pointer"
                  >
                    Đổi ảnh khác
                  </button>
                  <span className="text-gray-300">•</span>
                  <button
                    type="button"
                    onClick={() => setStudentCardUrl('')}
                    disabled={isUploadingCard}
                    className="text-xs font-bold text-rose-600 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" /> Xóa
                  </button>
                </div>
              </div>
            </div>
          )}

          {errors.studentCard && (
            <p className="text-xs text-red-600 font-semibold flex items-center gap-1 animate-fadeIn">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {errors.studentCard}
            </p>
          )}

          <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200/80 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-[#00a854] shrink-0 mt-0.5" />
            <p className="text-xs text-emerald-950 font-medium">
              <strong>Ghi chú:</strong> Tải lên để nhận huy hiệu <strong>Đã xác minh sinh viên</strong> hoặc hoàn tất hồ sơ Chủ trọ. Thông tin được mã hóa bảo mật tuyệt đối.
            </p>
          </div>
        </div>

        {/* 2.2 Mạng xã hội */}
        <div className="space-y-1.5">
          <label htmlFor="user-social-link" className="block text-xs sm:text-sm font-bold text-gray-800 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Link2 className="w-4 h-4 text-blue-600" />
              Mạng xã hội
            </span>
            <span className="text-[11px] font-normal text-gray-500">
              (Tùy chọn cho Người thuê • <strong className="text-amber-700">Bắt buộc cho Chủ trọ</strong>)
            </span>
          </label>
          <div className="relative">
            <input
              id="user-social-link"
              ref={socialInputRef}
              type="text"
              value={socialLink}
              onChange={(e) => {
                setSocialLink(e.target.value);
                if (errors.socialLink) setErrors((prev) => ({ ...prev, socialLink: undefined }));
              }}
              placeholder="Nhập link dạng https://facebook.com/... hoặc https://zalo.me/..."
              className={`w-full px-4 py-3 rounded-2xl border text-sm text-gray-900 placeholder-gray-400 bg-white transition focus:outline-none focus:ring-2 focus:ring-[#00a854] focus:border-transparent ${
                errors.socialLink ? 'border-red-500 bg-red-50/20 ring-1 ring-red-500' : 'border-gray-300 hover:border-gray-400'
              }`}
            />
          </div>
          {errors.socialLink && (
            <p className="text-xs text-red-600 font-semibold flex items-center gap-1 animate-fadeIn">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {errors.socialLink}
            </p>
          )}
          <p className="text-[11px] text-gray-500">
            Bắt đầu bằng <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-800">https://facebook.com/</code>, <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-800">https://www.facebook.com/</code> hoặc <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-800">https://zalo.me/</code>
          </p>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. KHU VỰC HÀNH ĐỘNG & NÂNG CẤP CHỦ TRỌ (Action Buttons) */}
      {/* ========================================================================= */}
      <div className="space-y-4 pt-2">
        {/* Banner / CTA Đăng Ký Làm Chủ Trọ nếu tài khoản chưa phải chủ trọ */}
        {showOwnerUpgradeCTA && !isApprovedOwner && (
          <div className={`rounded-3xl p-5 border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs transition-all ${
            isPendingHost
              ? 'bg-amber-50/80 border-amber-200'
              : 'bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border-emerald-200/80'
          }`}>
            <div className="flex items-start sm:items-center gap-3.5">
              <div className={`p-3 text-white rounded-2xl shadow-sm shrink-0 ${isPendingHost ? 'bg-amber-600' : 'bg-emerald-600'}`}>
                {isPendingHost ? <Clock className="w-6 h-6 animate-pulse" /> : <Building2 className="w-6 h-6" />}
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-black text-gray-900">
                    {isPendingHost ? 'Hồ Sơ Đăng Ký Đang Chờ Xét Duyệt' : 'Bạn muốn đăng phòng cho thuê?'}
                  </h4>
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    isPendingHost ? 'bg-amber-100 text-amber-900' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {isPendingHost ? 'Đang xét duyệt' : 'Miễn phí'}
                  </span>
                </div>
                <p className="text-xs text-gray-600">
                  {isPendingHost
                    ? 'Quản trị viên đang kiểm tra tính xác thực của ảnh thẻ và mạng xã hội trong vòng 24h.'
                    : 'Nâng cấp tài khoản lên Chủ Trọ Đối Tác để bắt đầu đăng tin và tiếp cận hàng ngàn sinh viên.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleOwnerUpgradeClick}
              disabled={isPendingHost || isUpgrading || isSaving}
              className={`w-full sm:w-auto px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 shrink-0 ${
                isPendingHost
                  ? 'bg-amber-100 text-amber-800 border border-amber-300 cursor-not-allowed shadow-none'
                  : 'bg-emerald-700 hover:bg-emerald-800 text-white hover:shadow-lg cursor-pointer'
              }`}
            >
              {isUpgrading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang xử lý gửi hồ sơ...
                </>
              ) : isPendingHost ? (
                <>
                  <Clock className="w-4 h-4 text-amber-600" />
                  Đang chờ duyệt hồ sơ
                </>
              ) : (
                <>
                  <Building2 className="w-4 h-4" />
                  Đăng Ký Làm Chủ Trọ
                </>
              )}
            </button>
          </div>
        )}

        {/* Nút Lưu thay đổi thông thường */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isSaving || isUpgrading}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl border border-gray-300 text-gray-700 hover:bg-gray-100 font-bold text-sm transition active:scale-95 text-center cursor-pointer"
            >
              Hủy bỏ
            </button>
          )}

          <button
            type="submit"
            disabled={isSaving || isUpgrading || isUploadingAvatar || isUploadingCard}
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
      </div>

      {/* ========================================================================= */}
      {/* POPUP THÔNG BÁO GỬI HỒ SƠ CHỦ TRỌ THÀNH CÔNG */}
      {/* ========================================================================= */}
      {showPendingSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-6 shadow-2xl border border-gray-100 text-center animate-scaleUp">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-gray-950">Gửi Hồ Sơ Thành Công!</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Hồ sơ của bạn đã được gửi. Quản trị viên sẽ kiểm tra tính xác thực của ảnh thẻ và mạng xã hội trước khi cấp quyền Chủ trọ trong vòng <strong>24h</strong>.
              </p>
            </div>

            <div className="p-3.5 bg-gray-50 rounded-2xl border border-gray-200 text-xs text-left space-y-1.5 text-gray-600">
              <div className="flex items-center gap-2 font-bold text-gray-800">
                <Clock className="w-4 h-4 text-amber-600" />
                Trạng thái: <span className="text-amber-700">Đang chờ xét duyệt (PENDING_HOST)</span>
              </div>
              <p className="text-[11px] text-gray-500">
                Bạn sẽ nhận được thông báo ngay khi hồ sơ được phê duyệt hoàn tất.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowPendingSuccessModal(false)}
              className="w-full py-3.5 rounded-2xl bg-[#00a854] hover:bg-[#009247] text-white font-bold text-sm shadow-md transition cursor-pointer active:scale-95"
            >
              Đã hiểu & Đóng
            </button>
          </div>
        </div>
      )}

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
                className="flex-1 py-3 rounded-xl border border-gray-300 text-xs font-bold text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmOtp}
                disabled={isVerifyingPhone}
                className="flex-1 py-3 rounded-xl bg-[#00a854] hover:bg-[#009247] text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
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
