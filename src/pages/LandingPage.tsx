import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { Button } from '../components/ui/Button';
import { RoomCard, RoommateCard, MarketplaceCard } from '../components/ui/Cards';
import { SEOHead } from '../components/seo/SEOHead';
import { AIRecommendationsSection } from '../components/rooms/AIRecommendationsSection';
import {
  Search,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Clock,
  Users,
  ShoppingBag,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { rooms, roommates, marketplaceItems } = useAppStore();

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
  const featuredRoommates = roommates.slice(0, 3);
  const featuredMarketplace = marketplaceItems.slice(0, 4);

  return (
    <div className="space-y-10 sm:space-y-14 pb-16 bg-[#f8f9fa]">
      <SEOHead
        title="Trọ Xinh - Nền Tảng Tìm Phòng Trọ Đã Xác Minh Tại Hà Nội"
        description="Tìm phòng trọ sinh viên đã đối chiếu thực tế, biết rõ tổng chi phí hàng tháng, tìm bạn ở ghép và chợ đồ cũ sinh viên."
        url="/"
      />

      {/* 1. BRIGHT GREEN WITH YELLOWISH CENTER GLOW HERO BANNER (CHỢ TỐT EXACT STRUCTURE) */}
      <section
        className="relative pt-8 pb-14 sm:pt-10 sm:pb-16 md:pt-12 md:pb-20 px-4 sm:px-6 lg:px-8 border-b border-emerald-400/30"
        style={{
          background: 'radial-gradient(ellipse 85% 85% at 50% 45%, #fff9a6 0%, #a7f3d0 38%, #34d399 70%, #10b981 100%)',
        }}
      >
        <div className="max-w-6xl mx-auto text-center relative z-10 space-y-3 sm:space-y-4">
          {/* Slogan Banner with 3D Icons & Black Bold Text */}
          <div className="relative max-w-3xl mx-auto py-2">
            {/* Left Decorative Floating Badges */}
            <div className="hidden md:flex flex-col items-center absolute -left-14 top-0 text-3xl animate-bounce duration-1000 select-none pointer-events-none opacity-95">
              <span>🏠</span>
              <span className="text-xl">🛋️</span>
            </div>

            {/* Right Decorative Floating Badges */}
            <div className="hidden md:flex flex-col items-center absolute -right-14 top-0 text-3xl animate-bounce duration-700 select-none pointer-events-none opacity-95">
              <span>🛵</span>
              <span className="text-xl">🎓</span>
            </div>

            <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-gray-950 tracking-tight leading-tight drop-shadow-xs">
              Phòng thật, giá chuẩn, đặt lịch trực tiếp!
            </h1>

            <p className="text-xs sm:text-sm text-gray-950 font-bold max-w-xl mx-auto mt-2 opacity-90">
              Biết rõ tổng chi phí hàng tháng, đối chiếu thực tế và kết nối trực tiếp với chủ trọ tại Hà Nội
            </p>
          </div>
        </div>

        {/* 2. FLOATING DOCKED SEARCH BAR (EXACTLY 50% ON BANNER, 50% ON BODY WITH GREEN BUTTON) */}
        <div className="absolute left-0 right-0 bottom-0 translate-y-1/2 z-30 px-3 sm:px-4">
          <div className="max-w-4xl mx-auto">
            <form
              onSubmit={handleSearchSubmit}
              className="bg-white rounded-2xl md:rounded-full p-2 sm:p-2.5 shadow-2xl border border-gray-200/90 ring-1 ring-black/5 flex flex-col md:flex-row items-center gap-2"
            >
              {/* Search Input */}
              <div className="flex-1 w-full flex items-center px-3.5 py-1.5 text-gray-900">
                <Search className="w-5 h-5 text-gray-400 shrink-0 mr-3" />
                <input
                  type="text"
                  placeholder="Tìm sản phẩm, phòng trọ, trường ĐH (Bách Khoa, ĐHQG, Cầu Giấy...)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-xs sm:text-sm font-semibold text-gray-900 focus:outline-none placeholder:text-gray-400"
                />
              </div>

              {/* Location Selector Pill (Chợ Tốt Style) */}
              <div className="w-full md:w-auto shrink-0 flex items-center">
                <div className="w-full md:w-56 flex items-center bg-white hover:bg-gray-50 rounded-xl md:rounded-full border border-gray-200 px-3.5 py-2 transition cursor-pointer shadow-2xs">
                  <MapPin className="w-4 h-4 text-[#00a854] shrink-0 mr-2" />
                  <select
                    value={selectedDistrict}
                    onChange={(e) => setSelectedDistrict(e.target.value)}
                    className="w-full bg-transparent text-xs font-bold text-gray-900 focus:outline-none cursor-pointer"
                  >
                    <option value="">Chọn khu vực (Toàn HN)</option>
                    {districts.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Search Action CTA Button (GREEN BUTTON) */}
              <button
                type="submit"
                className="w-full md:w-auto px-8 py-2.5 bg-[#00a854] hover:bg-[#008f47] text-white font-black text-xs sm:text-sm rounded-xl md:rounded-full transition shadow-md flex items-center justify-center gap-1.5 shrink-0"
              >
                <span>Tìm kiếm</span>
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Spacer for bottom half of docked search bar */}
      <div className="h-9 sm:h-11 md:h-13" />

      {/* 3. QUICK FILTER PILLS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-gray-200/80 shadow-xs">
          <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-gray-100">
            <span className="text-xs font-black uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#00a854]" />
              Tìm nhanh theo nhu cầu sinh viên
            </span>
            <Link to="/tim-phong" className="text-xs font-black text-[#00a854] hover:underline flex items-center gap-0.5">
              Xem tất cả phòng →
            </Link>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {quickPillFilters.map((pill, idx) => (
              <button
                key={idx}
                onClick={() => handleQuickPillClick(pill.query)}
                className="px-3.5 py-2 rounded-2xl bg-gray-50 hover:bg-emerald-50 hover:text-[#00a854] hover:border-emerald-200 border border-gray-200/80 text-xs font-bold text-gray-900 transition shrink-0 shadow-2xs"
              >
                {pill.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 4. TRUST HIGHLIGHTS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-xs flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#00a854] flex items-center justify-center shrink-0">
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
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#00a854] flex items-center justify-center shrink-0">
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
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#00a854] flex items-center justify-center shrink-0">
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
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#00a854] text-[11px] font-bold mb-1">
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

      {/* 6. AI RECOMMENDATIONS SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AIRecommendationsSection />
      </section>

      {/* 7. ROOMMATE SECTION */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-100 text-[#00a854]">
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

      {/* 8. MARKETPLACE SECTION */}
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

      {/* 9. CTA FOR LANDLORDS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-[#00a854] to-[#006d37] rounded-3xl p-6 sm:p-10 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-200">
              Dành riêng cho chủ trọ tại Hà Nội
            </span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-950">
              Bạn có phòng trống cần tìm khách thuê tử tế?
            </h2>
            <p className="text-xs sm:text-sm text-gray-900 font-bold max-w-xl leading-relaxed">
              Tiếp cận hơn 50.000 sinh viên tại các trường ĐHQG, Bách Khoa, Kinh Tế, Ngoại Thương. Đăng tin nhanh chóng, quản lý lịch hẹn thông minh.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <Link to="/nang-cap-chu-tro">
              <button className="px-6 py-3 bg-gray-950 hover:bg-black text-white font-black rounded-2xl text-xs sm:text-sm shadow-md transition">
                Đăng ký làm chủ trọ
              </button>
            </Link>
            <Link to="/bang-gia">
              <button className="px-6 py-3 bg-white/20 hover:bg-white/30 text-gray-950 font-black rounded-2xl text-xs sm:text-sm border border-black/10 transition">
                Xem bảng giá gói VIP
              </button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
