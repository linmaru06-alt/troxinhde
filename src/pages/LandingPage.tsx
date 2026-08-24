import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { Button } from '../components/ui/Button';
import { RoomCard, RoommateCard, MarketplaceCard } from '../components/ui/Cards';
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
  Clock,
  Home,
  DollarSign,
  Users,
  ShoppingBag,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { rooms, roommates, marketplaceItems, currentUser } = useAppStore();

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
    { label: '🛡️ Đã đối chiếu thông tin', query: { xacMinh: 'true' } },
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
  const featuredRoommates = roommates.slice(0, 3);
  const featuredMarketplace = marketplaceItems.slice(0, 4);

  return (
    <div className="space-y-12 sm:space-y-16 pb-16 bg-[#f8f9fa]">
      <SEOHead
        title="Trọ Xinh - Nền Tảng Tìm Phòng Trọ Sinh Viên Đã Kiểm Duyệt tại Hà Nội"
        description="Tìm phòng trọ sinh viên đã đối chiếu thực tế, biết rõ tổng chi phí hàng tháng, tìm bạn ở ghép và chợ đồ cũ sinh viên."
        url="/"
      />

      {/* 1. ORIGINAL GREEN HERO SECTION WITH FLOATING SEARCH CARD */}
      <section className="relative overflow-hidden pt-10 pb-16 md:pt-16 md:pb-24 bg-linear-to-b from-emerald-50/70 via-emerald-50/30 to-[#f8f9fa] border-b border-gray-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-8 space-y-4">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white text-[#006d37] border border-emerald-200 text-xs font-black shadow-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Nền tảng phòng trọ đã đối chiếu thông tin 100% tại Hà Nội</span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-gray-900 tracking-tight leading-tight sm:leading-none">
              Tìm trọ an tâm, <br className="hidden sm:inline" />
              <span className="text-[#006d37] relative inline-block">
                không lo phòng ảo
                <span className="absolute bottom-1 left-0 right-0 h-3 bg-emerald-200/50 -z-10 rounded-full" />
              </span>
            </h1>

            <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto leading-relaxed font-medium">
              Đúng giá, đúng hình, biết trước toàn bộ chi phí dự kiến và đặt lịch hẹn trực tiếp với chủ trọ.
            </p>
          </div>

          {/* Search Card */}
          <div className="max-w-4xl mx-auto bg-white rounded-3xl p-3 sm:p-5 shadow-xl border border-gray-200/80 ring-1 ring-black/5 space-y-3">
            <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row items-center gap-2.5">
              {/* Search input with autocomplete */}
              <div className="relative flex-1 w-full flex items-center bg-gray-50/90 hover:bg-gray-100/90 rounded-2xl border border-gray-200 px-4 py-3 transition focus-within:ring-2 focus-within:ring-[#006d37] focus-within:bg-white">
                <Search className="w-5 h-5 text-gray-400 shrink-0 mr-2.5" />
                <input
                  type="text"
                  placeholder="Gõ tên trường ĐH hoặc khu vực (Bách Khoa, ĐHQG, Cầu Giấy, Chùa Láng...)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-xs sm:text-sm font-semibold text-gray-900 focus:outline-none placeholder:text-gray-400"
                />
              </div>

              {/* Location / District Dropdown */}
              <div className="relative w-full md:w-60 shrink-0">
                <div className="flex items-center bg-gray-50/90 hover:bg-gray-100/90 rounded-2xl border border-gray-200 px-3.5 py-3 transition focus-within:ring-2 focus-within:ring-[#006d37] focus-within:bg-white">
                  <MapPin className="w-4 h-4 text-[#006d37] shrink-0 mr-1.5" />
                  <select
                    value={selectedDistrict}
                    onChange={(e) => setSelectedDistrict(e.target.value)}
                    className="w-full bg-transparent text-xs sm:text-sm font-bold text-gray-900 focus:outline-none cursor-pointer"
                  >
                    <option value="">Tất cả khu vực (Hà Nội)</option>
                    {districts.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Search Button */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                leftIcon={<Search className="w-4 h-4" />}
                className="w-full md:w-auto px-7 py-3 font-bold rounded-2xl shadow-md shrink-0"
              >
                Tìm Phòng Trọ
              </Button>
            </form>
          </div>
        </div>
      </section>

      {/* 2. QUICK FILTER PILLS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-gray-200/80 shadow-xs">
          <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-gray-100">
            <span className="text-xs font-extrabold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#006d37]" />
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

      {/* 3. TRUST HIGHLIGHTS */}
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

      {/* 4. VERIFIED ROOMS FEED */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-gray-200">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#006d37] text-[11px] font-bold mb-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Đã đối chiếu trong 30 ngày qua</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              Phòng Trọ Đã Kiểm Tra Mới Nhất
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

      {/* 5. AI RECOMMENDATIONS SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AIRecommendationsSection />
      </section>

      {/* 6. ROOMMATE SECTION (TÌM BẠN CÙNG PHÒNG) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-100 text-[#006d37]">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                Tìm Bạn Cùng Phòng Văn Minh
              </h2>
              <p className="text-xs text-gray-500">Kết nối sinh viên chung trường, hợp lối sống, share tiền phòng an tâm</p>
            </div>
          </div>

          <Link to="/tim-ban-cung-phong">
            <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Xem tất cả ({roommates.length} bài đăng)
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {featuredRoommates.map((item) => (
            <RoommateCard key={item.id} post={item} />
          ))}
        </div>
      </section>

      {/* 7. MARKETPLACE SECTION (CHỢ ĐỒ CŨ SINH VIÊN) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                Chợ Đồ Cũ Sinh Viên Pass Nhanh
              </h2>
              <p className="text-xs text-gray-500">Tủ lạnh, bàn học, máy giặt, đồ gia dụng giá sinh viên gần trường</p>
            </div>
          </div>

          <Link to="/cho-do-cu">
            <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Xem tất cả ({marketplaceItems.length} món đồ)
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredMarketplace.map((item) => (
            <MarketplaceCard key={item.id} item={item} />
          ))}
        </div>
      </section>

      {/* 8. CTA FOR LANDLORDS */}
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
              <Button variant="secondary" size="lg" className="font-black">
                Đăng Ký Làm Chủ Trọ
              </Button>
            </Link>
            <Link to="/bang-gia">
              <Button variant="outline" size="lg" className="text-white border-white/40 hover:bg-white/10">
                Xem Bảng Giá Gói VIP
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
