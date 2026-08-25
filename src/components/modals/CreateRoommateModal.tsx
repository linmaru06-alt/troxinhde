import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import {
  Users,
  Sparkles,
  MapPin,
  DollarSign,
  GraduationCap,
  Heart,
  Check,
  X,
  Building2,
  PlusCircle,
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
];

export const CreateRoommateModal: React.FC<CreateRoommateModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, rooms, addRoommatePost, showToast } = useAppStore();

  const [userName, setUserName] = useState(currentUser?.name || '');
  const [userGender, setUserGender] = useState<'Nam' | 'Nữ' | 'Khác'>('Nam');
  const [userAge, setUserAge] = useState<number>(20);
  const [userSchool, setUserSchool] = useState<string>('Đại học Quốc Gia Hà Nội');
  const [district, setDistrict] = useState<string>('Quận Cầu Giấy');
  const [budgetShare, setBudgetShare] = useState<number>(2000000);
  const [genderPreference, setGenderPreference] = useState<'Chỉ tìm Nữ' | 'Chỉ tìm Nam' | 'Tất cả'>('Tất cả');
  const [selectedHabits, setSelectedHabits] = useState<string[]>([
    'Không hút thuốc',
    'Giữ vệ sinh sạch sẽ',
    'Không ồn ào sau 23h',
  ]);
  const [intro, setIntro] = useState<string>('');
  const [linkedRoomId, setLinkedRoomId] = useState<string>('');

  const toggleHabit = (habit: string) => {
    if (selectedHabits.includes(habit)) {
      setSelectedHabits(selectedHabits.filter((h) => h !== habit));
    } else {
      setSelectedHabits([...selectedHabits, habit]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!userName.trim()) {
      showToast('Vui lòng nhập họ tên', '', 'warning');
      return;
    }
    if (!intro.trim()) {
      showToast('Vui lòng nhập vài dòng giới thiệu bản thân', '', 'warning');
      return;
    }

    const selectedRoom = rooms.find((r) => r.id === linkedRoomId);

    addRoommatePost({
      userId: currentUser?.id || `user_${Date.now()}`,
      userName: userName.trim(),
      userAvatar: currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
      userGender,
      userAge: Number(userAge) || 20,
      userSchool: userSchool.trim(),
      district,
      budgetShare: Number(budgetShare) || 2000000,
      genderPreference,
      habits: selectedHabits,
      lifestyleTags: selectedHabits.slice(0, 3),
      intro: intro.trim(),
      linkedRoomId: selectedRoom?.id,
      linkedRoomTitle: selectedRoom?.title,
      linkedRoomPrice: selectedRoom?.price,
      linkedRoomArea: selectedRoom?.area,
      linkedRoomImage: selectedRoom?.images[0],
      status: 'Đang tìm',
    });

    onClose();
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
              placeholder="VD: Nguyễn Minh Trang"
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
              placeholder="VD: ĐH Bách Khoa Hà Nội"
              className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs font-medium focus:ring-2 focus:ring-[#006d37] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Giới tính & Tuổi</label>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={userGender}
                onChange={(e) => setUserGender(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-medium focus:ring-2 focus:ring-[#006d37] focus:outline-none bg-white"
              >
                <option value="Nam">Nam</option>
                <option value="Nữ">Nữ</option>
                <option value="Khác">Khác</option>
              </select>
              <input
                type="number"
                min={17}
                max={40}
                value={userAge}
                onChange={(e) => setUserAge(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-medium focus:ring-2 focus:ring-[#006d37] focus:outline-none"
                placeholder="Tuổi"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Khu vực mong muốn (Quận/Huyện) *</label>
            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-300 text-xs font-medium focus:ring-2 focus:ring-[#006d37] focus:outline-none bg-white"
            >
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
                min={500000}
                max={20000000}
                required
                value={budgetShare}
                onChange={(e) => setBudgetShare(Number(e.target.value))}
                className="w-full px-3.5 py-2 pr-12 rounded-xl border border-gray-300 text-xs font-bold text-[#006d37] focus:ring-2 focus:ring-[#006d37] focus:outline-none"
              />
              <span className="absolute right-3 top-2 text-xs text-gray-400 font-medium">VNĐ</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Đối tượng bạn cùng phòng mong muốn</label>
            <select
              value={genderPreference}
              onChange={(e) => setGenderPreference(e.target.value as any)}
              className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs font-bold text-gray-800 focus:ring-2 focus:ring-[#006d37] focus:outline-none bg-white"
            >
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
                      ? 'bg-emerald-600 text-white shadow-xs'
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

        {/* Optional Linked Room */}
        <div className="pt-2 border-t border-gray-100">
          <label className="block text-xs font-bold text-gray-700 mb-1">
            Đã có phòng sẵn? (Tùy chọn: Chọn phòng trên hệ thống để ghép người)
          </label>
          <select
            value={linkedRoomId}
            onChange={(e) => setLinkedRoomId(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl border border-gray-300 text-xs font-medium text-gray-800 focus:ring-2 focus:ring-[#006d37] focus:outline-none bg-white"
          >
            <option value="">-- Chưa có phòng (Cùng nhau đi tìm phòng mới) --</option>
            {rooms.slice(0, 10).map((r) => (
              <option key={r.id} value={r.id}>
                {r.title} ({r.district} - {r.price.toLocaleString('vi-VN')} đ/tháng)
              </option>
            ))}
          </select>
        </div>

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
            placeholder="VD: Mình là sinh viên năm 3 vui vẻ, sạch sẽ, không hút thuốc. Cần tìm 1 bạn nữ ở ghép để share tiền phòng khu vực Cầu Giấy, ưu tiên bạn nào ngoan ngoãn và ít tụ tập bạn bè muộn..."
            className="w-full p-3 rounded-2xl border border-gray-300 text-xs font-medium leading-relaxed focus:ring-2 focus:ring-[#006d37] focus:outline-none"
          />
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end gap-3 pt-3 border-t border-gray-200">
          <Button type="button" variant="outline" size="md" onClick={onClose}>
            Hủy Bỏ
          </Button>
          <Button type="submit" variant="primary" size="md" leftIcon={<Sparkles className="w-4 h-4" />}>
            Đăng Tin Tìm Bạn Ngay
          </Button>
        </div>
      </form>
    </Modal>
  );
};
