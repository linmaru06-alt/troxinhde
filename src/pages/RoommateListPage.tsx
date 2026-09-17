import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { RoommateCard } from '../components/ui/Cards';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { CreateRoommateModal } from '../components/modals/CreateRoommateModal';
import {
  Users,
  PlusCircle,
  Search,
  Sparkles,
  X,
  SlidersHorizontal,
} from 'lucide-react';

export const RoommateListPage: React.FC = () => {
  const navigate = useNavigate();
  const { roommates, currentUser, showToast } = useAppStore();

  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [selectedGender, setSelectedGender] = useState<string>('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [selectedBudget, setSelectedBudget] = useState<string>('');

  const filteredRoommates = useMemo(() => {
    return roommates.filter((r) => {
      // Gender filter
      if (selectedGender && r.genderPreference !== selectedGender && r.genderPreference !== 'Tất cả') {
        return false;
      }

      // District filter
      if (selectedDistrict && r.district !== selectedDistrict) {
        return false;
      }

      // Budget filter
      if (selectedBudget === 'under_2m' && r.budgetShare > 2000000) return false;
      if (selectedBudget === '2m_3m' && (r.budgetShare < 2000000 || r.budgetShare > 3000000)) return false;
      if (selectedBudget === 'over_3m' && r.budgetShare < 3000000) return false;

      // Search keyword filter (Name, school, bio, district)
      if (searchKeyword.trim()) {
        const q = searchKeyword.toLowerCase();
        const matchName = (r.userName || '').toLowerCase().includes(q);
        const matchSchool = (r.userSchool || '').toLowerCase().includes(q);
        const matchIntro = (r.intro || '').toLowerCase().includes(q);
        const matchDistrict = (r.district || '').toLowerCase().includes(q);
        if (!matchName && !matchSchool && !matchIntro && !matchDistrict) return false;
      }

      return true;
    });
  }, [roommates, selectedGender, selectedDistrict, selectedBudget, searchKeyword]);

  const handlePostClick = () => {
    if (!currentUser) {
      showToast('Vui lòng đăng nhập', 'Bạn cần đăng nhập để đăng tin tìm bạn cùng phòng', 'warning');
      navigate('/dang-nhap?returnUrl=/roommate');
      return;
    }
    setIsCreateOpen(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      {/* Create Roommate Modal */}
      <CreateRoommateModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} />

      {/* Header Banner with Custom Illustration Backdrop & Cinematic Overlay */}
      <div className="relative overflow-hidden rounded-3xl shadow-2xl border border-emerald-500/20 bg-slate-950">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-right md:bg-center bg-no-repeat transition-transform duration-700"
          style={{ backgroundImage: `url('/roommate-banner.webp')` }}
        />
        {/* Sophisticated Dark Gradient & Frosted Overlay for crystal-clear text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-slate-950/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-slate-950/40" />
        {/* Ambient Emerald Glow */}
        <div className="absolute -top-10 right-1/4 w-80 h-80 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Content Container */}
        <div className="relative z-10 p-6 sm:p-10 lg:p-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-3.5 max-w-xl">
            {/* 1. Bỏ dòng 'Giai Đoạn 3', dùng badge cộng đồng chuẩn */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/25 rounded-full text-xs font-bold text-emerald-300 border border-emerald-400/40 backdrop-blur-md shadow-xs transition">
              <Users className="w-4 h-4 text-emerald-400" />
              <span>Cộng Đồng Tìm Bạn Ở Ghép Văn Minh Hà Nội</span>
            </div>
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
              Tìm Bạn Cùng Phòng <br />
              <span className="text-[#4ade80]">Hợp Gu & San Sẻ Chi Phí</span>
            </h1>
            <p className="text-gray-200 text-xs sm:text-sm md:text-base leading-relaxed font-medium drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)] max-w-lg">
              Kết nối với sinh viên và người đi làm văn minh, có cùng thói quen sinh hoạt, tính cách và mức ngân sách tại các quận Hà Nội.
            </p>
          </div>

          {/* 3. Phần đăng tin tìm bạn ghép nổi bật hơn vượt trội */}
          <div className="shrink-0 flex flex-col items-center md:items-end gap-2.5 w-full md:w-auto">
            <div className="p-1 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 shadow-[0_0_25px_rgba(16,185,129,0.4)] hover:shadow-[0_0_35px_rgba(16,185,129,0.65)] transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] w-full md:w-auto">
              <button
                type="button"
                onClick={handlePostClick}
                className="w-full md:w-auto flex items-center justify-center gap-2.5 px-6 sm:px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#006d37] via-[#008f47] to-[#00a854] hover:from-[#005a2d] hover:to-[#008f47] text-white font-black text-sm sm:text-base tracking-wide cursor-pointer transition-all duration-200"
              >
                <PlusCircle className="w-5 h-5 text-emerald-200 shrink-0" />
                <span>Đăng Tin Tìm Bạn Ghép</span>
                <Sparkles className="w-4 h-4 text-emerald-300 shrink-0" />
              </button>
            </div>
            <div className="inline-flex items-center gap-1.5 text-[11px] text-emerald-300 font-semibold bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-full border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Miễn phí 100% • Tiếp cận 10.000+ sinh viên</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar & Search */}
      <div className="space-y-3 bg-white p-4 sm:p-5 rounded-3xl border border-gray-200 shadow-xs">
        {/* Top Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="Tìm theo tên bạn, trường đại học hoặc từ khóa (vd: Bách Khoa, Ngoại Thương, Yên tĩnh...)"
            className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-[#006d37] focus:outline-none"
          />
          {searchKeyword && (
            <button
              onClick={() => setSearchKeyword('')}
              className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-bold text-gray-700 flex items-center gap-1">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#006d37]" />
              Lọc theo:
            </span>

            {/* Gender Filter */}
            <select
              value={selectedGender}
              onChange={(e) => setSelectedGender(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-800 focus:outline-none focus:border-[#006d37]"
            >
              <option value="">Tất cả giới tính</option>
              <option value="Chỉ tìm Nữ">Chỉ tìm bạn Nữ</option>
              <option value="Chỉ tìm Nam">Chỉ tìm bạn Nam</option>
            </select>

            {/* District Filter */}
            <select
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-800 focus:outline-none focus:border-[#006d37]"
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

            {/* Budget Filter */}
            <select
              value={selectedBudget}
              onChange={(e) => setSelectedBudget(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-800 focus:outline-none focus:border-[#006d37]"
            >
              <option value="">Tất cả ngân sách share</option>
              <option value="under_2m">&lt; 2 Triệu / người</option>
              <option value="2m_3m">2 – 3 Triệu / người</option>
              <option value="over_3m">&gt; 3 Triệu / người</option>
            </select>

            {(selectedGender || selectedDistrict || selectedBudget || searchKeyword) && (
              <button
                onClick={() => {
                  setSelectedGender('');
                  setSelectedDistrict('');
                  setSelectedBudget('');
                  setSearchKeyword('');
                }}
                className="text-xs text-rose-600 hover:underline font-bold flex items-center gap-0.5 ml-1"
              >
                <X className="w-3.5 h-3.5" />
                Xóa lọc
              </button>
            )}
          </div>

          <span className="text-xs text-gray-500 font-bold bg-emerald-50 px-3 py-1 rounded-full text-[#006d37]">
            {filteredRoommates.length} hồ sơ bạn ghép
          </span>
        </div>
      </div>

      {/* Roommate Grid */}
      {filteredRoommates.length === 0 ? (
        <EmptyState
          icon="inbox"
          title="Chưa có bài đăng phù hợp"
          description="Hãy thử chọn lại bộ lọc hoặc là người đầu tiên đăng tin tìm bạn cùng phòng nhé!"
          actionText="Đăng tin tìm bạn ngay"
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
