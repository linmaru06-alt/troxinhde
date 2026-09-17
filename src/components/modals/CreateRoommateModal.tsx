import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
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
    const posterId = currentUser?.id || '00000000-0000-0000-0000-000000000003';

    // Tổng hợp danh sách ảnh phòng thực tế
    const finalImages = hasRoom
      ? (uploadedImages.length > 0 ? uploadedImages : (selectedRoom?.images || []))
      : [];

    setIsSubmitting(true);
    try {
      const created = await createRoommatePost({
        poster_id: posterId.length === 36 ? posterId : '00000000-0000-0000-0000-000000000003',
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

      addRoommatePost({
        id: created?.id,
        userId: currentUser?.id || `user_${Date.now()}`,
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

      showToast('Đăng tin tìm bạn thành công!', 'Hồ sơ của bạn đã được hiển thị trên cộng đồng.', 'success');
      onClose();
    } catch (err: any) {
      console.error('[Roommate] Lỗi lưu bài lên Cloud:', err);
      showToast('Lỗi khi đăng tin tìm bạn', err?.message || 'Không thể lưu bài đăng. Vui lòng thử lại!', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Đăng Tin Tìm Bạn Cùng Phòng" maxWidth="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
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
            Thói quen sinh hoạt & Tính cách (Chọn các mục phù hợp)
          </label>
          <div className="flex flex-wrap gap-2">
            {COMMON_HABITS.map((habit) => {
              const isSelected = selectedHabits.includes(habit);
              return (
                <button
                  type="button"
                  key={habit}
                  onClick={() => toggleHabit(habit)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-[#006d37] text-white shadow-xs'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {isSelected ? <Check className="w-3.5 h-3.5" /> : <PlusCircle className="w-3.5 h-3.5 text-gray-400" />}
                  <span>{habit}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. PHẦN TÙY CHỌN: ĐÃ CÓ PHÒNG SẴN HAY CHƯA + TẢI ẢNH */}
        <div className="space-y-3 pt-3 border-t border-gray-100">
          <label className="block text-xs font-bold text-gray-700">
            Tình trạng phòng trọ hiện tại của bạn *
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setHasRoom(false)}
              className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex items-start gap-3 ${
                !hasRoom
                  ? 'border-[#006d37] bg-emerald-50/70 ring-2 ring-[#006d37]/20 shadow-xs'
                  : 'border-gray-200 bg-white hover:bg-gray-50'
              }`}
            >
              <div className={`p-2 rounded-xl shrink-0 ${!hasRoom ? 'bg-[#006d37] text-white' : 'bg-gray-100 text-gray-500'}`}>
                <Search className="w-4 h-4" />
              </div>
              <div>
                <p className={`text-xs font-bold ${!hasRoom ? 'text-[#006d37]' : 'text-gray-800'}`}>Chưa có phòng</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Tìm bạn hợp gu để cùng nhau đi tìm và thuê phòng mới</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setHasRoom(true)}
              className={`p-3.5 rounded-2xl border text-left transition cursor-pointer flex items-start gap-3 ${
                hasRoom
                  ? 'border-[#006d37] bg-emerald-50/70 ring-2 ring-[#006d37]/20 shadow-xs'
                  : 'border-gray-200 bg-white hover:bg-gray-50'
              }`}
            >
              <div className={`p-2 rounded-xl shrink-0 ${hasRoom ? 'bg-[#006d37] text-white' : 'bg-gray-100 text-gray-500'}`}>
                <Home className="w-4 h-4" />
              </div>
              <div>
                <p className={`text-xs font-bold ${hasRoom ? 'text-[#006d37]' : 'text-gray-800'}`}>Đã có phòng sẵn</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Đang ở phòng trọ và cần tìm bạn vào ở ghép cùng</p>
              </div>
            </button>
          </div>
        </div>

        {/* Khung nhập chi tiết phòng + Tải ảnh khi ĐÃ CÓ PHÒNG */}
        {hasRoom && (
          <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-2 text-xs font-black text-[#006d37]">
              <Home className="w-4 h-4" />
              <span>Thông tin chi tiết phòng đang ở cần tìm bạn ghép:</span>
            </div>

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

            {/* UPLOAD ẢNH PHÒNG TRỰC TIẾP */}
            <div className="space-y-2 pt-2 border-t border-emerald-200/60">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-[#006d37]" />
                  Ảnh chụp thực tế phòng trọ ({uploadedImages.length}/5)
                </label>
                <span className="text-[10px] text-gray-500 font-medium">Tối đa 5 ảnh rõ nét</span>
              </div>

              {/* Grid Preview ảnh đã chọn */}
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
                {uploadedImages.map((imgUrl, idx) => (
                  <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden border border-emerald-200 bg-gray-100 shadow-xs">
                    <img src={imgUrl} alt={`Ảnh phòng ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/75 hover:bg-rose-600 text-white flex items-center justify-center transition cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                    {idx === 0 && (
                      <span className="absolute bottom-1 left-1 right-1 text-[9px] font-bold bg-[#006d37]/90 text-white text-center py-0.5 rounded-md backdrop-blur-xs">
                        Ảnh chính
                      </span>
                    )}
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
        <div className="flex justify-end gap-3 pt-3 border-t border-gray-200">
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
      </form>
    </Modal>
  );
};
