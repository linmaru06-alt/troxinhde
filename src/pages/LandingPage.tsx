import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { Button } from '../components/ui/Button';
import { RoomCard } from '../components/ui/Cards';
import { SEOHead } from '../components/seo/SEOHead';
import { SearchAutocomplete } from '../components/search/SearchAutocomplete';
import { AIRecommendationsSection } from '../components/rooms/AIRecommendationsSection';
import {
  Search,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Building2,
  Navigation,
  ChevronDown,
  Clock,
  Home,
  Check,
  Plus,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { rooms, currentUser } = useAppStore();

  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const districts = [
    'Quận Cầu Giấy',
    'Quận Đống Đa',
    'Quận Hai Bà Trưng',
    'Quận Thanh Xuân',
    'Quận Nam Từ Liêm',
    'Quận Hà Đông',
    'Quận Ba Đình',
    'Quận Hoàng Mai',
    'Quận Bắc Từ Liêm',
  ];

  const quickPillFilters: { label: string; query: Record<string, string> }[] = [
    { label: '🏢 Tất cả phòng', query: {} },
    { label: '🎓 Gần ĐHQG / Sư Phạm', query: { khuVuc: 'Quận Cầu Giấy', truong: 'Đại học Quốc Gia Hà Nội' } },
    { label: '🎓 Gần Bách Khoa - KTQD', query: { khuVuc: 'Quận Hai Bà Trưng', truong: 'Đại học Bách Khoa' } },
    { label: '🎓 Gần Ngoại Thương - Luật', query: { khuVuc: 'Quận Đống Đa', truong: 'Đại học Ngoại Thương' } },
    { label: '💵 Dưới 3.5 triệu', query: { gia: '0-3500000' } },
    { label: '🛋️ Studio khép kín', query: { loai: 'Studio' } },
    { label: '🏢 Căn hộ mini', query: { loai: 'Căn hộ mini' } },
    { label: '🛡️ Mới xác minh', query: { xacMinh: 'true' } },
  ];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    if (selectedDistrict) params.set('khuVuc', selectedDistrict);
    navigate(`/tim-phong?${params.toString()}`);
  };

  const handleQuickPillClick = (filterQuery: Record<string, string>) => {
    const params = new URLSearchParams(filterQuery);
    navigate(`/tim-phong?${params.toString()}`);
  };

  const verifiedRooms = rooms.filter((r) => r.verified && r.status === 'Còn trống').slice(0, 6);

  return (
    <div className="space-y-12 sm:space-y-16 pb-16 bg-[#f8f9fa]">
      <SEOHead
        title="Trọ Xinh - Nền Tảng Tìm Phòng Trọ Đã Xác Minh Tại Hà Nội"
        description="Tìm phòng trọ sinh viên đã đối chiếu thực tế, biết rõ tổng chi phí hàng tháng, liên hệ và đặt lịch hẹn trực tiếp với chủ trọ."
        url="/"
      />

      {/* 1. CHỢ TỐT STYLE HERO BANNER SECTION */}
      <section className="relative bg-gradient-to-b from-[#ffba00] to-[#f7b928] pt-8 pb-16 md:pt-12 md:pb-20 px-4 sm:px-6 lg:px-8 border-b border-amber-400/50">
        <div className="max-w-6xl mx-auto text-center relative z-10 space-y-6">
          {/* Slogan Banner with 3D Icons */}
          <div className="relative max-w-3xl mx-auto py-2">
            {/* Left Decorative Floating Badges */}
            <div className="hidden md:flex flex-col items-center absolute -left-12 top-0 text-3xl animate-bounce duration-1000 select-none pointer-events-none opacity-90">
              <span>🏠</span>
              <span className="text-xl">🛋️</span>
            </div>

            {/* Right Decorative Floating Badges */}
            <div className="hidden md:flex flex-col items-center absolute -right-12 top-0 text-3xl animate-bounce duration-700 select-none pointer-events-none opacity-90">
              <span>🛵</span>
              <span className="text-xl">🎓</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-gray-950 tracking-tight leading-tight drop-shadow-xs">
              Giá tốt, gần bạn, chốt nhanh!
            </h1>

            <p className="text-xs sm:text-sm text-gray-900 font-semibold max-w-xl mx-auto mt-2">
              Tìm phòng trọ sinh viên đã đối chiếu danh tính & thông tin thực tế tại Hà Nội
            </p>
          </div>
        </div>

        {/* 2. FLOATING DOCKED SEARCH BAR (CHỢ TỐT STYLE) */}
        <div className="max-w-4xl mx-auto -mb-24 sm:-mb-26 px-2 relative z-20">
          <div className="bg-white rounded-3xl p-3 sm:p-4 shadow-2xl border border-gray-100 ring-1 ring-black/5 space-y-3">
            <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row items-center gap-2">
              {/* Search input with autocomplete */}
              <div className="relative flex-1 w-full flex items-center bg-gray-50/80 hover:bg-gray-100/80 rounded-2xl border border-gray-200 px-4 py-2.5 transition focus-within:ring-2 focus-within:ring-[#006d37] focus-within:bg-white">
                <Search className="w-5 h-5 text-gray-400 shrink-0 mr-2.5" />
                <input
                  type="text"
                  placeholder="Tìm phòng trọ, trường ĐH (Bách Khoa, ĐHQG, Cầu Giấy, Chùa Láng...)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-xs sm:text-sm font-semibold text-gray-900 focus:outline-none placeholder:text-gray-400 placeholder:font-normal"
                />
              </div>

              {/* Location / District Dropdown */}
              <div className="relative w-full md:w-56 shrink-0">
                <div className="flex items-center bg-gray-50/80 hover:bg-gray-100/80 rounded-2xl border border-gray-200 px-3.5 py-2.5 transition focus-within:ring-2 focus-within:ring-[#006d37] focus-within:bg-white">
                  <MapPin className="w-4 h-4 text-[#006d37] shrink-0 mr-1.5" />
                  <select
                    value={selectedDistrict}
                    onChange={(e) => setSelectedDistrict(e.target.value)}
                    className="w-full bg-transparent text-xs sm:text-sm font-bold text-gray-900 focus:outline-none cursor-pointer"
                  >
                    <option value="">Chọn khu vực (Toàn Hà Nội)</option>
                    {districts.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Search Button */}
              <button
                type="submit"
                className="w-full md:w-auto px-7 py-3 bg-[#ffba00] hover:bg-[#f0af00] text-gray-950 font-black text-sm rounded-2xl transition shadow-md flex items-center justify-center gap-1.5 shrink-0"
              >
                <Search className="w-4 h-4 stroke-[3]" />
                <span>Tìm kiếm</span>
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Spacing for floating search bar */}
      <div className="h-10 sm:h-12" />

      {/* 3. QUICK CATEGORY PILLS (CHỢ TỐT FILTER CHIPS) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-gray-200/80 shadow-xs">
          <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-gray-100">
            <span className="text-xs font-extrabold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#ffba00]" />
              Tìm nhanh theo nhu cầu sinh viên
            </span>
            <Link to="/tim-phong" className="text-xs font-bold text-[#006d37] hover:underline flex items-center gap-0.5">
              Xem tất cả phòng →
            </Link>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {quickPillFilters.map((pill, idx) => (
              <button
                key={idx}
                onClick={() => handleQuickPillClick(pill.query)}
                className="px-3.5 py-2 rounded-2xl bg-gray-50 hover:bg-emerald-50 hover:text-[#006d37] hover:border-emerald-200 border border-gray-200/80 text-xs font-bold text-gray-700 transition shrink-0 shadow-2xs"
              >
                {pill.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 4. TRUST VALUE HIGHLIGHTS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-xs flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#006d37] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm mb-0.5">Chủ trọ đã xác minh</h3>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                Đối chiếu CCCD và số điện thoại chính chủ trước khi kích hoạt tin đăng.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-xs flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#006d37] flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm mb-0.5">Biết rõ tổng chi phí</h3>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                Minh bạch đơn giá điện, nước, cọc, dịch vụ. Không lo phụ phí ẩn phát sinh.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-xs flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#006d37] flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm mb-0.5">Đặt lịch xem trực tiếp</h3>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                Chọn ngày giờ rảnh, chủ trọ xác nhận 2 chiều, nhắc hẹn tự động chống bùng lịch.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. VERIFIED ROOMS FEED */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-gray-200">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#006d37] text-[11px] font-bold mb-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Đã kiểm tra trong 30 ngày qua</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              Phòng Trọ Đã Đối Chiếu Mới Nhất
            </h2>
          </div>

          <Link to="/tim-phong">
            <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Xem tất cả ({rooms.length} phòng)
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {verifiedRooms.map((room) => (
            <RoomCard key={room.id} room={room} />
          ))}
        </div>
      </section>

      {/* 6. AI RECOMMENDATIONS SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AIRecommendationsSection />
      </section>

      {/* 7. CTA FOR LANDLORDS (BANNER DÀNH CHO CHỦ TRỌ) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-[#006d37] to-[#004e27] rounded-3xl p-6 sm:p-10 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
              Dành riêng cho chủ trọ tại Hà Nội
            </span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Bạn có phòng trống cần tìm khách thuê tử tế?
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100 max-w-xl leading-relaxed">
              Tiếp cận hơn 50.000 sinh viên tại các trường ĐHQG, Bách Khoa, Kinh Tế, Ngoại Thương. Đăng tin nhanh chóng, quản lý lịch hẹn thông minh.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <Link to="/nang-cap-chu-tro">
              <button className="px-6 py-3 bg-[#ffba00] hover:bg-[#f0af00] text-gray-950 font-black rounded-2xl text-xs sm:text-sm shadow-md transition">
                Đăng ký làm chủ trọ
              </button>
            </Link>
            <Link to="/bang-gia">
              <button className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl text-xs sm:text-sm border border-white/30 transition">
                Xem bảng giá gói VIP
              </button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
