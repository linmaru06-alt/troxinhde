import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { RoommateCard } from '../components/ui/Cards';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Users, PlusCircle, Search, Filter, Sparkles, Heart } from 'lucide-react';

export const RoommateListPage: React.FC = () => {
  const navigate = useNavigate();
  const { roommates, currentUser, showToast } = useAppStore();

  const [selectedGender, setSelectedGender] = useState<string>('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');

  const filteredRoommates = useMemo(() => {
    return roommates.filter((r) => {
      if (selectedGender && r.genderPreference !== selectedGender && r.genderPreference !== 'Tất cả') {
        return false;
      }
      if (selectedDistrict && r.district !== selectedDistrict) {
        return false;
      }
      return true;
    });
  }, [roommates, selectedGender, selectedDistrict]);

  const handlePostClick = () => {
    if (!currentUser) {
      showToast('Vui lòng đăng nhập', 'Bạn cần đăng nhập để đăng tin tìm bạn cùng phòng', 'warning');
      navigate('/dang-nhap?next=/roommate');
      return;
    }
    // Open create roommate post modal or form
    showToast('Mở form đăng tin tìm bạn ghép', '', 'info');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      {/* Header Banner */}
      <div className="bg-linear-to-r from-emerald-900 via-[#006d37] to-emerald-800 rounded-3xl p-6 sm:p-10 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-xs font-semibold backdrop-blur-xs">
            <Users className="w-4 h-4" />
            <span>Cộng Đồng Tìm Bạn Ở Ghép</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Tìm Bạn Cùng Phòng Hợp Gu & San Sẻ Chi Phí
          </h1>
          <p className="text-emerald-100 text-xs sm:text-sm leading-relaxed">
            Kết nối với sinh viên và người đi làm văn minh, có cùng thói quen sinh hoạt và mức ngân sách tại TP.HCM.
          </p>
        </div>

        <Button
          variant="secondary"
          size="lg"
          onClick={handlePostClick}
          leftIcon={<PlusCircle className="w-5 h-5" />}
        >
          Đăng Tin Tìm Bạn
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-bold text-gray-700 uppercase">Lọc theo:</span>

          {/* Gender Filter */}
          <select
            value={selectedGender}
            onChange={(e) => setSelectedGender(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium text-gray-800"
          >
            <option value="">Tất cả giới tính</option>
            <option value="Chỉ tìm Nữ">Chỉ tìm bạn Nữ</option>
            <option value="Chỉ tìm Nam">Chỉ tìm bạn Nam</option>
          </select>

          {/* District Filter */}
          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium text-gray-800"
          >
            <option value="">Tất cả khu vực</option>
            <option value="Quận Bình Thạnh">Quận Bình Thạnh</option>
            <option value="Quận Tân Bình">Quận Tân Bình</option>
            <option value="TP. Thủ Đức">TP. Thủ Đức</option>
          </select>
        </div>

        <span className="text-xs text-gray-500 font-semibold">
          Tìm thấy {filteredRoommates.length} bạn đang tìm người ở ghép
        </span>
      </div>

      {/* Roommate Grid */}
      {filteredRoommates.length === 0 ? (
        <EmptyState
          icon="inbox"
          title="Chưa có bài đăng phù hợp"
          description="Hãy thử chọn lại bộ lọc hoặc là người đầu tiên đăng tin tìm bạn cùng phòng nhé!"
          actionText="Đăng tin ngay"
          onAction={handlePostClick}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRoommates.map((post) => (
            <RoommateCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
};
