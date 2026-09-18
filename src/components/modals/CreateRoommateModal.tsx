import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { RoommateCard } from '../ui/Cards';
import { RoommatePost } from '../../types';
import { createRoommatePost } from '../../lib/api/roommates';
import {
  Users,
  Sparkles,
  Check,
  X,
  PlusCircle,
  Home,
  Search,
  Image as ImageIcon,
  Upload,
  Save,
  Eye,
  AlertTriangle,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface CreateRoommateModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const COMMON_HABITS = [
  'Không hút thuốc',
  'Giữ vệ sinh sạch sẽ',
  'Không ồn ào sau 23h',
  'Yêu thích thú cưng',
  'Nấu ăn tại nhà',
  'Ngủ sớm dậy sớm',
  'Thích không gian yên tĩnh',
  'Hòa đồng, thân thiện',
  'Tôn trọng không gian riêng',
  'Đã đi làm / Sinh viên năm cuối',
];

const DISTRICTS = [
  'Quận Cầu Giấy',
  'Quận Đống Đa',
  'Quận Hai Bà Trưng',
  'Quận Thanh Xuân',
  'Quận Nam Từ Liêm',
  'Quận Hà Đông',
  'Quận Ba Đình',
  'Quận Bắc Từ Liêm',
  'Quận Hoàng Mai',
  'Quận Tây Hồ',
  'Quận Long Biên',
];

export const CreateRoommateModal: React.FC<CreateRoommateModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, rooms, addRoommatePost, showToast } = useAppStore();

  // 1. Tất cả các trường thông tin đều để trống theo yêu cầu của người dùng
  const [userName, setUserName] = useState<string>('');
  const [userGender, setUserGender] = useState<'Nam' | 'Nữ' | 'Khác' | ''>('');
  const [userAge, setUserAge] = useState<number | ''>('');
  const [userSchool, setUserSchool] = useState<string>('');
  const [district, setDistrict] = useState<string>('');
  const [budgetShare, setBudgetShare] = useState<number | ''>('');
  const [genderPreference, setGenderPreference] = useState<'Chỉ tìm Nữ' | 'Chỉ tìm Nam' | 'Tất cả' | ''>('');
  const [selectedHabits, setSelectedHabits] = useState<string[]>([]);
  const [intro, setIntro] = useState<string>('');

  // 2. Tùy chọn: Đã có phòng sẵn hay chưa
  const [hasRoom, setHasRoom] = useState<boolean>(false);
  const [roomAddress, setRoomAddress] = useState<string>('');
  const [roomPrice, setRoomPrice] = useState<number | ''>('');
  const [roomArea, setRoomArea] = useState<number | ''>('');
  const [linkedRoomId, setLinkedRoomId] = useState<string>('');
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isUploadingImg, setIsUploadingImg] = useState<boolean>(false);

  // Quản lý lưu nháp
  const DRAFT_KEY = 'troxinh_draft_roommate';
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [hasDraft, setHasDraft] = useState<boolean>(false);
  const [showPreviewModal, setShowPreviewModal] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Tải nháp khi mở modal
  useEffect(() => {
    if (!isOpen) return;
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const d = JSON.parse(saved);
        if (d.userName) setUserName(d.userName);
        if (d.userGender) setUserGender(d.userGender);
        if (d.userAge) setUserAge(d.userAge);
        if (d.userSchool) setUserSchool(d.userSchool);
        if (d.district) setDistrict(d.district);
        if (d.budgetShare) setBudgetShare(d.budgetShare);
        if (d.genderPreference) setGenderPreference(d.genderPreference);
        if (d.selectedHabits) setSelectedHabits(d.selectedHabits);
        if (d.intro) setIntro(d.intro);
        if (typeof d.hasRoom === 'boolean') setHasRoom(d.hasRoom);
        if (d.roomAddress) setRoomAddress(d.roomAddress);
        if (d.roomPrice) setRoomPrice(d.roomPrice);
        if (d.roomArea) setRoomArea(d.roomArea);
        if (d.linkedRoomId) setLinkedRoomId(d.linkedRoomId);
        if (d.uploadedImages) setUploadedImages(d.uploadedImages);
        if (d.savedAt) setLastSavedTime(d.savedAt);
        setHasDraft(true);
      } else if (currentUser?.name) {
        setUserName(currentUser.name);
      }
    } catch (e) {
      console.error('Lỗi nạp nháp roommate:', e);
    }
  }, [isOpen, currentUser]);

  // Tự động lưu nháp
  useEffect(() => {
    if (!isOpen) return;
    // Chỉ lưu nếu có ít nhất 1 thông tin
    if (userName || userSchool || district || intro || uploadedImages.length > 0) {
      const timer = setTimeout(() => {
        const draftData = {
          userName,
          userGender,
          userAge,
          userSchool,
          district,
          budgetShare,
          genderPreference,
          selectedHabits,
          intro,
          hasRoom,
          roomAddress,
          roomPrice,
          roomArea,
          linkedRoomId,
          uploadedImages,
          savedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData));
        setLastSavedTime(draftData.savedAt);
        setHasDraft(true);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [
    isOpen,
    userName,
    userGender,
    userAge,
    userSchool,
    district,
    budgetShare,
    genderPreference,
    selectedHabits,
    intro,
    hasRoom,
    roomAddress,
    roomPrice,
    roomArea,
    linkedRoomId,
    uploadedImages,
  ]);

  const handleManualSaveDraft = () => {
    const draftData = {
      userName,
      userGender,
      userAge,
      userSchool,
      district,
      budgetShare,
      genderPreference,
      selectedHabits,
      intro,
      hasRoom,
      roomAddress,
      roomPrice,
      roomArea,
      linkedRoomId,
      uploadedImages,
      savedAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData));
    setLastSavedTime(draftData.savedAt);
    setHasDraft(true);
    showToast('Đã lưu bản nháp', `Bản nháp đã lưu lúc ${draftData.savedAt}. Bạn có thể tiếp tục chỉnh sửa bất kỳ lúc nào.`, 'success');
  };

  const handleClearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    setUserName('');
    setUserGender('');
    setUserAge('');
    setUserSchool('');
    setDistrict('');
    setBudgetShare('');
    setGenderPreference('');
    setSelectedHabits([]);
    setIntro('');
    setHasRoom(false);
    setRoomAddress('');
    setRoomPrice('');
    setRoomArea('');
    setLinkedRoomId('');
    setUploadedImages([]);
    setHasDraft(false);
    setLastSavedTime(null);
    setSubmitError(null);
    showToast('Đã xóa bản nháp', 'Form đã được làm mới hoàn toàn', 'info');
  };

  const handleMoveImage = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= uploadedImages.length) return;
    setUploadedImages((prev) => {
      const next = [...prev];
      const [item] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, item);
      return next;
    });
  };

  const handleSetMainImage = (idx: number) => {
    if (idx === 0) return;
    handleMoveImage(idx, 0);
    showToast('Đã đặt làm ảnh chính', 'Ảnh đầu tiên sẽ hiển thị nổi bật trên danh sách.', 'info');
  };

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const toggleHabit = (habit: string) => {
    if (selectedHabits.includes(habit)) {
      setSelectedHabits(selectedHabits.filter((h) => h !== habit));
    } else {
      setSelectedHabits([...selectedHabits, habit]);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = 5 - uploadedImages.length;
    if (remainingSlots <= 0) {
      showToast('Đạt giới hạn ảnh', 'Bạn chỉ có thể tải lên tối đa 5 ảnh', 'warning');
      return;
    }

    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    setIsUploadingImg(true);

    const readers = filesToProcess.map((file) => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readers)
      .then((base64Urls) => {
        setUploadedImages((prev) => [...prev, ...base64Urls]);
      })
      .catch((err) => {
        console.error('Lỗi đọc ảnh:', err);
        showToast('Lỗi tải ảnh', 'Không thể đọc file ảnh. Vui lòng thử lại!', 'error');
      })
      .finally(() => {
        setIsUploadingImg(false);
        e.target.value = '';
      });
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setUploadedImages((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!userName.trim()) {
      showToast('Vui lòng nhập họ tên', '', 'warning');
      return;
    }
    if (!userSchool.trim()) {
      showToast('Vui lòng nhập trường ĐH hoặc nơi làm việc', '', 'warning');
      return;
    }
    if (!userGender) {
      showToast('Vui lòng chọn giới tính của bạn', '', 'warning');
      return;
    }
    if (!userAge || Number(userAge) < 16) {
      showToast('Vui lòng nhập độ tuổi hợp lệ', '', 'warning');
      return;
    }
    if (!district) {
      showToast('Vui lòng chọn khu vực mong muốn', '', 'warning');
      return;
    }
    if (!budgetShare || Number(budgetShare) <= 0) {
      showToast('Vui lòng nhập ngân sách dự kiến chia sẻ', '', 'warning');
      return;
    }
    if (!genderPreference) {
      showToast('Vui lòng chọn đối tượng bạn cùng phòng mong muốn', '', 'warning');
      return;
    }
    if (!intro.trim()) {
      showToast('Vui lòng nhập vài dòng giới thiệu bản thân', '', 'warning');
      return;
    }

    const validGender = userGender as 'Nam' | 'Nữ' | 'Khác';
    const validGenderPreference = genderPreference as 'Chỉ tìm Nữ' | 'Chỉ tìm Nam' | 'Tất cả';

    const selectedRoom = rooms.find((r) => r.id === linkedRoomId);
    // Ưu tiên UUID của tài khoản hiện tại, nếu ID dạng khác thì dùng profile UUID hợp lệ trong DB
    const posterId = (currentUser?.id && currentUser.id.length === 36)
      ? currentUser.id
      : '0016bd8f-d19e-4348-9175-3a4379cffad4';

    // Tổng hợp danh sách ảnh phòng thực tế
    const finalImages = hasRoom
      ? (uploadedImages.length > 0 ? uploadedImages : (selectedRoom?.images || []))
      : [];

    setIsSubmitting(true);
    try {
      const created = await createRoommatePost({
        poster_id: posterId,
        room_id: (hasRoom && selectedRoom?.id && selectedRoom.id.length === 36) ? selectedRoom.id : undefined,
        nickname: userName.trim(),
        age: Number(userAge),
        gender: validGender === 'Nam' ? 'male' : validGender === 'Nữ' ? 'female' : 'any',
        preferred_gender: validGenderPreference === 'Chỉ tìm Nam' ? 'male' : validGenderPreference === 'Chỉ tìm Nữ' ? 'female' : 'any',
        budget_per_person: Number(budgetShare),
        lifestyle_tags: selectedHabits,
        self_intro: intro.trim(),
        district,
        school: userSchool.trim(),
        images: finalImages.slice(0, 5),
      });

      const finalPostId = created?.id || `rm_${Date.now()}`;

      addRoommatePost({
        id: finalPostId,
        userId: currentUser?.id || posterId,
        userName: userName.trim(),
        userAvatar: currentUser?.avatarUrl || '/images/user-avatar.jpg',
        userGender: validGender,
        userAge: Number(userAge),
        userSchool: userSchool.trim(),
        district,
        budgetShare: Number(budgetShare),
        genderPreference: validGenderPreference,
        habits: selectedHabits,
        lifestyleTags: selectedHabits.slice(0, 3),
        intro: intro.trim(),
        linkedRoomId: hasRoom ? (selectedRoom?.id || `room_custom_${Date.now()}`) : undefined,
        linkedRoomTitle: hasRoom ? (roomAddress.trim() || selectedRoom?.title || 'Phòng trọ đang ở') : undefined,
        linkedRoomPrice: hasRoom ? (Number(roomPrice) || selectedRoom?.price || Number(budgetShare) * 2) : undefined,
        linkedRoomArea: hasRoom ? (Number(roomArea) || selectedRoom?.area) : undefined,
        linkedRoomImage: finalImages[0],
        images: finalImages,
        status: 'Đang tìm',
      });

      // Xóa bản nháp khi đăng thành công
      localStorage.removeItem(DRAFT_KEY);
      setHasDraft(false);
      setSubmitError(null);

      showToast('Đăng tin tìm bạn thành công! 🎉', 'Hồ sơ của bạn đã được hiển thị trên cộng đồng Trọ Xinh.', 'success');
      onClose();
    } catch (err: any) {
      console.error('[Roommate] Lỗi đăng bài:', err);
      const errMsg = err?.message || 'Không thể đăng tin lúc này. Dữ liệu đã nhập của bạn được giữ nguyên!';
      setSubmitError(errMsg);
      showToast('Lỗi khi đăng tin tìm bạn', errMsg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const previewPost: RoommatePost = {
    id: 'preview_roommate',
    userId: currentUser?.id || 'preview_user',
    userName: userName.trim() || 'Họ và tên của bạn',
    userAvatar: currentUser?.avatarUrl || '/images/user-avatar.jpg',
    userGender: (userGender as any) || 'Nam',
    userAge: Number(userAge) || 20,
    userSchool: userSchool.trim() || 'Trường / Nơi làm việc',
    district: district || 'Khu vực mong muốn',
    budgetShare: Number(budgetShare) || 2000000,
    genderPreference: (genderPreference as any) || 'Tất cả',
    habits: selectedHabits.length > 0 ? selectedHabits : ['Giữ vệ sinh sạch sẽ'],
    lifestyleTags: selectedHabits.slice(0, 3),
    intro: intro.trim() || 'Chưa nhập lời giới thiệu bản thân...',
    linkedRoomTitle: hasRoom ? (roomAddress.trim() || 'Phòng trọ sẵn có') : undefined,
    linkedRoomPrice: hasRoom ? (Number(roomPrice) || 4000000) : undefined,
    linkedRoomImage: uploadedImages[0],
    images: uploadedImages,
    status: 'Đang tìm',
    createdAt: new Date().toISOString(),
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Đăng Tin Tìm Bạn Cùng Phòng" maxWidth="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Banner Khôi phục Nháp nếu có */}
        {hasDraft && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-800">
            <div className="flex items-center gap-2">
              <Save className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                Đang dùng bản nháp {lastSavedTime ? `(lưu lúc ${lastSavedTime})` : ''} - Dữ liệu được bảo toàn tự động.
              </span>
            </div>
            <button
              type="button"
              onClick={handleClearDraft}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 underline cursor-pointer ml-3 shrink-0 flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Xóa nháp
            </button>
          </div>
        )}

        {/* Banner Lỗi Submit nếu có */}
        {submitError && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold">Không thể đăng bài: {submitError}</p>
              <p className="text-[11px] text-rose-600 mt-0.5">
                Dữ liệu bạn đã điền vẫn được giữ nguyên đầy đủ. Vui lòng kiểm tra lại kết nối và thử gửi lại!
              </p>
            </div>
          </div>
        )}

        {/* Header Info */}
        <div className="p-3.5 bg-emerald-50/80 rounded-2xl border border-emerald-200/80 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#006d37] text-white flex items-center justify-center font-bold shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-black text-gray-900">Kết nối bạn ở ghép văn minh & an toàn</h4>
            <p className="text-[11px] text-gray-600">
              Bài đăng của bạn sẽ hiển thị công khai trên bảng tin cộng đồng sinh viên Trọ Xinh.
            </p>
          </div>
        </div>

        {/* User Info Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Họ và tên của bạn *</label>
            <input
              type="text"
              required
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="Nhập họ và tên của bạn"
              className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs font-medium focus:ring-2 focus:ring-[#006d37] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Trường ĐH / Nơi làm việc *</label>
            <input
              type="text"
              required
              value={userSchool}
              onChange={(e) => setUserSchool(e.target.value)}
              placeholder="VD: ĐH Bách Khoa, ĐH Kinh Tế Quốc Dân..."
              className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs font-medium focus:ring-2 focus:ring-[#006d37] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Giới tính & Tuổi *</label>
            <div className="grid grid-cols-2 gap-2">
              <select
                required
                value={userGender}
                onChange={(e) => setUserGender(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-medium focus:ring-2 focus:ring-[#006d37] focus:outline-none bg-white"
              >
                <option value="">-- Giới tính --</option>
                <option value="Nam">Nam</option>
                <option value="Nữ">Nữ</option>
                <option value="Khác">Khác</option>
              </select>
              <input
                type="number"
                min={16}
                max={60}
                required
                value={userAge}
                onChange={(e) => setUserAge(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-medium focus:ring-2 focus:ring-[#006d37] focus:outline-none"
                placeholder="Nhập tuổi"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Khu vực mong muốn (Quận/Huyện) *</label>
            <select
              required
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-medium focus:ring-2 focus:ring-[#006d37] focus:outline-none bg-white"
            >
              <option value="">-- Chọn Quận / Huyện --</option>
              {DISTRICTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Budget & Target Preferences */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Ngân sách dự kiến share (VNĐ / người / tháng) *
            </label>
            <div className="relative">
              <input
                type="number"
                step={100000}
                min={300000}
                max={30000000}
                required
                value={budgetShare}
                onChange={(e) => setBudgetShare(e.target.value ? Number(e.target.value) : '')}
                placeholder="VD: 2000000"
                className="w-full px-3.5 py-2 pr-12 rounded-xl border border-gray-300 text-xs font-bold text-[#006d37] focus:ring-2 focus:ring-[#006d37] focus:outline-none"
              />
              <span className="absolute right-3 top-2 text-xs text-gray-400 font-medium">VNĐ</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Đối tượng bạn cùng phòng mong muốn *</label>
            <select
              required
              value={genderPreference}
              onChange={(e) => setGenderPreference(e.target.value as any)}
              className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs font-bold text-gray-800 focus:ring-2 focus:ring-[#006d37] focus:outline-none bg-white"
            >
              <option value="">-- Chọn đối tượng tìm kiếm --</option>
              <option value="Tất cả">Tất cả (Nam hoặc Nữ đều được)</option>
              <option value="Chỉ tìm Nữ">Chỉ tìm bạn Nữ</option>
              <option value="Chỉ tìm Nam">Chỉ tìm bạn Nam</option>
            </select>
          </div>
        </div>

        {/* Habits Checklist */}
        <div className="space-y-2 pt-2 border-t border-gray-100">
          <label className="block text-xs font-bold text-gray-700">
            Thói quen & Lối sống của bạn (Chọn các mục phù hợp)
          </label>
          <div className="flex flex-wrap gap-1.5">
            {COMMON_HABITS.map((habit) => {
              const isSelected = selectedHabits.includes(habit);
              return (
                <button
                  type="button"
                  key={habit}
                  onClick={() => toggleHabit(habit)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-[#006d37] border-[#006d37] text-white shadow-xs font-bold'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-emerald-300 hover:bg-emerald-50/40'
                  }`}
                >
                  {isSelected ? <Check className="w-3.5 h-3.5" /> : <PlusCircle className="w-3.5 h-3.5 text-gray-400" />}
                  {habit}
                </button>
              );
            })}
          </div>
        </div>

        {/* Option: Đã có phòng hay chưa */}
        <div className="pt-2 border-t border-gray-100">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={hasRoom}
              onChange={(e) => setHasRoom(e.target.checked)}
              className="w-4 h-4 rounded text-[#006d37] focus:ring-[#006d37] border-gray-300"
            />
            <span className="text-xs font-bold text-gray-800 flex items-center gap-1">
              <Home className="w-4 h-4 text-[#006d37]" />
              Tôi hiện đã thuê được phòng và đang tìm người dọn vào ở chung
            </span>
          </label>
        </div>

        {/* Thông tin phòng đã có (chỉ hiện khi hasRoom = true) */}
        {hasRoom && (
          <div className="p-4 bg-emerald-50/40 rounded-2xl border border-emerald-200/60 space-y-3">
            <h5 className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
              <Home className="w-3.5 h-3.5 text-[#006d37]" />
              Thông tin chi tiết căn phòng bạn đang ở
            </h5>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Địa chỉ phòng trọ / Tên tòa nhà
                </label>
                <input
                  type="text"
                  value={roomAddress}
                  onChange={(e) => setRoomAddress(e.target.value)}
                  placeholder="VD: Số 25 ngõ 165 Cầu Giấy, Tòa Mini Star"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs bg-white focus:ring-2 focus:ring-[#006d37] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Diện tích phòng (m²)</label>
                <input
                  type="number"
                  min={10}
                  max={200}
                  value={roomArea}
                  onChange={(e) => setRoomArea(e.target.value ? Number(e.target.value) : '')}
                  placeholder="VD: 25"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs bg-white focus:ring-2 focus:ring-[#006d37] focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Giá thuê nguyên phòng (VNĐ / tháng)
                </label>
                <input
                  type="number"
                  step={100000}
                  value={roomPrice}
                  onChange={(e) => setRoomPrice(e.target.value ? Number(e.target.value) : '')}
                  placeholder="VD: 4000000"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs bg-white focus:ring-2 focus:ring-[#006d37] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">
                  Hoặc liên kết phòng có sẵn trên Trọ Xinh
                </label>
                <select
                  value={linkedRoomId}
                  onChange={(e) => setLinkedRoomId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs bg-white focus:ring-2 focus:ring-[#006d37] focus:outline-none"
                >
                  <option value="">-- Tự nhập thông tin ở trên --</option>
                  {rooms.slice(0, 15).map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.title} ({r.district})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* UPLOAD & SẮP XẾP ẢNH PHÒNG TRỰC TIẾP */}
            <div className="space-y-2 pt-2 border-t border-emerald-200/60">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-[#006d37]" />
                  Ảnh chụp thực tế phòng trọ ({uploadedImages.length}/5)
                </label>
                <span className="text-[10px] text-gray-500 font-medium">Bấm mũi tên hoặc 'Bìa' để sắp xếp</span>
              </div>

              {/* Grid Preview ảnh đã chọn kèm công cụ sắp xếp */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {uploadedImages.map((imgUrl, idx) => (
                  <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden border border-emerald-200 bg-gray-100 shadow-xs">
                    <img src={imgUrl} alt={`Ảnh phòng ${idx + 1}`} className="w-full h-full object-cover" />
                    
                    {/* Badge số thứ tự / Ảnh bìa */}
                    <span className={`absolute top-1.5 left-1.5 text-[9px] font-black px-1.5 py-0.5 rounded shadow-xs ${
                      idx === 0 ? 'bg-[#006d37] text-white' : 'bg-black/60 text-white'
                    }`}>
                      {idx === 0 ? '★ Bìa' : `#${idx + 1}`}
                    </span>

                    {/* Nút xóa */}
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/75 hover:bg-rose-600 text-white flex items-center justify-center transition cursor-pointer"
                      title="Xóa ảnh"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>

                    {/* Thanh điều khiển sắp xếp ảnh */}
                    <div className="absolute inset-x-0 bottom-0 p-1 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveImage(idx, idx - 1)}
                          className="w-5 h-5 rounded bg-white/80 hover:bg-white text-gray-800 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-[10px]"
                          title="Chuyển sang trước"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === uploadedImages.length - 1}
                          onClick={() => handleMoveImage(idx, idx + 1)}
                          className="w-5 h-5 rounded bg-white/80 hover:bg-white text-gray-800 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center text-[10px]"
                          title="Chuyển sang sau"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {idx !== 0 && (
                        <button
                          type="button"
                          onClick={() => handleSetMainImage(idx)}
                          className="px-1.5 py-0.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-bold"
                          title="Đặt ảnh này làm ảnh bìa"
                        >
                          Làm bìa
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {uploadedImages.length < 5 && (
                  <label className="border-2 border-dashed border-emerald-300 hover:border-[#006d37] bg-white hover:bg-emerald-50/50 aspect-square rounded-xl flex flex-col items-center justify-center gap-1 cursor-pointer transition p-2 text-center">
                    <Upload className="w-5 h-5 text-[#006d37]" />
                    <span className="text-[10px] font-bold text-emerald-800 leading-tight">
                      {isUploadingImg ? 'Đang tải...' : '+ Thêm ảnh'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      disabled={isUploadingImg}
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
              <p className="text-[10px] text-gray-500">
                Gợi ý: Tải ảnh góc ngủ, bếp nấu, nhà vệ sinh khép kín để người tìm ghép dễ hình dung.
              </p>
            </div>
          </div>
        )}

        {/* Intro */}
        <div className="space-y-1 pt-2 border-t border-gray-100">
          <label className="block text-xs font-bold text-gray-700">
            Lời giới thiệu bản thân & Yêu cầu cụ thể *
          </label>
          <textarea
            required
            rows={3}
            value={intro}
            onChange={(e) => setIntro(e.target.value)}
            placeholder="VD: Mình là sinh viên năm 3 vui vẻ, sạch sẽ, không hút thuốc. Cần tìm 1 bạn ở ghép để share tiền phòng khu vực Cầu Giấy, ưu tiên bạn nào ngoan ngoãn và ít tụ tập bạn bè muộn..."
            className="w-full p-3 rounded-2xl border border-gray-300 text-xs font-medium leading-relaxed focus:ring-2 focus:ring-[#006d37] focus:outline-none"
          />
        </div>

        {/* Submit Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleManualSaveDraft}
              leftIcon={<Save className="w-3.5 h-3.5 text-emerald-700" />}
            >
              Lưu Nháp
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowPreviewModal(true)}
              leftIcon={<Eye className="w-3.5 h-3.5 text-gray-700" />}
            >
              Xem Trước
            </Button>
          </div>

          <div className="flex items-center justify-end gap-2.5">
            <Button type="button" variant="outline" size="md" onClick={onClose}>
              Hủy Bỏ
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isSubmitting || isUploadingImg}
              leftIcon={<Sparkles className="w-4 h-4" />}
            >
              {isSubmitting ? 'Đang Đăng Tin...' : 'Đăng Tin Tìm Bạn Ngay'}
            </Button>
          </div>
        </div>
      </form>

      {/* MODAL XEM TRƯỚC HỒ SƠ TÌM BẠN */}
      {showPreviewModal && (
        <Modal
          isOpen={showPreviewModal}
          onClose={() => setShowPreviewModal(false)}
          title="Xem Trước Hồ Sơ Tìm Bạn Ở Ghép"
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Đây là giao diện hồ sơ của bạn khi hiển thị với các thành viên khác trên cộng đồng.</span>
            </div>

            <div className="max-w-md mx-auto">
              <RoommateCard post={previewPost} />
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-gray-200">
              <Button type="button" variant="outline" size="sm" onClick={() => setShowPreviewModal(false)}>
                Đóng & Chỉnh Sửa Tiếp
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setShowPreviewModal(false)}
              >
                Quay Lại Form Đăng
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </Modal>
  );
};
