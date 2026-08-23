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
      navigate('/dang-nhap?returnUrl=/roommate');
      return;
    }
    // Open create roommate post modal or form
    showToast('Mở form đăng tin tìm bạn ghép', '', 'info');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      {/* Header Banner with Custom Illustration Backdrop */}
      <div className="relative overflow-hidden rounded-3xl shadow-2xl border border-gray-900/10">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url('/images/roommate-banner.webp')` }}
        />
        {/* Sophisticated Dark Gradient & Frosted Overlay for Maximum Contrast & Readability */}
        <div className="absolute inset-0 bg-linear-to-r from-slate-950/95 via-slate-900/80 to-slate-950/40" />
        <div className="absolute inset-0 bg-linear-to-t from-slate-950/70 via-transparent to-transparent" />

        {/* Content Container */}
        <div className="relative z-10 p-6 sm:p-10 lg:p-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white/15 hover:bg-white/20 rounded-full text-xs font-bold text-emerald-300 border border-emerald-400/30 backdrop-blur-md shadow-xs">
              <Users className="w-4 h-4 text-emerald-400" />
              <span>Cộng Đồng Tìm Bạn Ở Ghép Hà Nội</span>
            </div>
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
              Tìm Bạn Cùng Phòng <br />
              <span className="text-[#4ade80]">Hợp Gu & San Sẻ Chi Phí</span>
            </h1>
            <p className="text-gray-100 text-xs sm:text-sm md:text-base leading-relaxed font-medium drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)] max-w-lg">
              Kết nối với sinh viên và người đi làm văn minh, có cùng thói quen sinh hoạt, tính cách và mức ngân sách tại các quận Hà Nội.
            </p>
          </div>

          <div className="shrink-0 bg-white/10 backdrop-blur-md p-2 rounded-2xl border border-white/20 shadow-xl">
            <Button
              variant="secondary"
              size="lg"
              onClick={handlePostClick}
              leftIcon={<PlusCircle className="w-5 h-5" />}
              className="font-bold shadow-lg"
            >
              Đăng Tin Tìm Bạn
            </Button>
          </div>
        </div>
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
            <option value="Quận Cầu Giấy">Quận Cầu Giấy</option>
            <option value="Quận Đống Đa">Quận Đống Đa</option>
            <option value="Quận Hai Bà Trưng">Quận Hai Bà Trưng</option>
            <option value="Quận Thanh Xuân">Quận Thanh Xuân</option>
            <option value="Quận Nam Từ Liêm">Quận Nam Từ Liêm</option>
            <option value="Quận Hà Đông">Quận Hà Đông</option>
            <option value="Quận Ba Đình">Quận Ba Đình</option>
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
