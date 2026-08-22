import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { Button } from '../components/ui/Button';
import { RoomCard, RoommateCard, MarketplaceCard } from '../components/ui/Cards';
import { SEOHead } from '../components/seo/SEOHead';
import {
  Search,
  MapPin,
  DollarSign,
  Home,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Users,
  ShoppingBag,
  ArrowRight,
  Building2,
  Lock,
  Award,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { rooms, roommates, marketplaceItems, currentUser } = useAppStore();

  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [selectedPrice, setSelectedPrice] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');

  const districts = [
    'Quận Cầu Giấy',
    'Quận Đống Đa',
    'Quận Hai Bà Trưng',
    'Quận Thanh Xuân',
    'Quận Nam Từ Liêm',
    'Quận Hà Đông',
    'Quận Ba Đình',
  ];
  const priceRanges = [
    { label: 'Dưới 2 triệu', value: '0-2000000' },
    { label: '2 - 3.5 triệu', value: '2000000-3500000' },
    { label: '3.5 - 5 triệu', value: '3500000-5000000' },
    { label: 'Trên 5 triệu', value: '5000000-99999999' },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (selectedDistrict) params.set('khuVuc', selectedDistrict);
    if (selectedPrice) params.set('gia', selectedPrice);
    if (selectedType) params.set('loai', selectedType);
    navigate(`/tim-kiem?${params.toString()}`);
  };

  const handleOwnerPostClick = () => {
    if (currentUser?.role === 'owner') {
      navigate('/chu-tro/phong/tao-moi');
    } else {
      navigate('/dang-nhap?role=owner&next=/chu-tro/phong/tao-moi');
    }
  };

  const verifiedRooms = rooms.filter((r) => r.verified && r.status === 'Còn trống').slice(0, 4);

  return (
    <div className="space-y-16 sm:space-y-24 pb-12">
      <SEOHead
        title="TroXinh - Tìm Phòng Trọ Sinh Viên Đã Kiểm Duyệt tại Hà Nội"
        description="Nền tảng tìm phòng trọ uy tín dành cho sinh viên Hà Nội. 100% phòng đã kiểm duyệt PCCC & an ninh, giá minh bạch, kết nối trực tiếp với chủ trọ."
        url="/"
      />

      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden pt-8 pb-16 md:pt-16 md:pb-24 bg-linear-to-b from-emerald-50/80 via-[#f9f9f9] to-[#f9f9f9]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-10 space-y-4">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white text-[#006d37] border border-emerald-200 text-xs font-bold shadow-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Nền tảng phòng trọ đã kiểm duyệt 100% tại Hà Nội</span>
            </div>

            {/* Headline */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight leading-tight sm:leading-none">
              Tìm trọ an tâm, <br className="hidden sm:inline" />
              <span className="text-[#006d37] relative">
                không lo phòng ảo
                <span className="absolute bottom-1 left-0 right-0 h-2.5 bg-emerald-200/50 -z-10 rounded-full" />
              </span>
            </h1>

            <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Mỗi phòng trọ trên Trọ Xinh đều được đội ngũ kiểm định trực tiếp tại chỗ. Đúng giá, đúng hình, hỗ trợ bảo vệ tiền cọc cho sinh viên và người đi làm.
            </p>
          </div>

          {/* Search Box */}
          <div className="max-w-4xl mx-auto bg-white rounded-3xl p-4 sm:p-6 shadow-xl border border-gray-100">
            <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              {/* District Select */}
              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#006d37]" />
                  Khu Vực / Quận
                </label>
                <select
                  value={selectedDistrict}
                  onChange={(e) => setSelectedDistrict(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#006d37]"
                >
                  <option value="">Tất cả khu vực (Hà Nội)</option>
                  {districts.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* Price Range Select */}
              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-[#006d37]" />
                  Mức Giá Thuê
                </label>
                <select
                  value={selectedPrice}
                  onChange={(e) => setSelectedPrice(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#006d37]"
                >
                  <option value="">Tất cả mức giá</option>
                  {priceRanges.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>

              {/* Room Type Select */}
              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide flex items-center gap-1.5">
                  <Home className="w-3.5 h-3.5 text-[#006d37]" />
                  Loại Phòng
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#006d37]"
                >
                  <option value="">Tất cả loại phòng</option>
                  <option value="Phòng đơn">Phòng đơn</option>
                  <option value="Studio">Studio ban công</option>
                  <option value="Phòng ghép">Phòng ghép / KTX</option>
                  <option value="Căn hộ mini">Căn hộ mini</option>
                </select>
              </div>

              {/* CTA Buttons */}
              <div className="sm:col-span-3 flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2 text-xs text-gray-500 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                  <span className="font-semibold text-gray-700 shrink-0">Tìm nhanh:</span>
                  {['Gần ĐHQG', 'Gần Bách Khoa', 'Khu Chùa Láng', 'Dưới 3tr'].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        if (tag === 'Gần ĐHQG' || tag === 'Cầu Giấy') setSelectedDistrict('Quận Cầu Giấy');
                        if (tag === 'Gần Bách Khoa') setSelectedDistrict('Quận Hai Bà Trưng');
                        if (tag === 'Khu Chùa Láng') setSelectedDistrict('Quận Đống Đa');
                        if (tag === 'Dưới 3tr') setSelectedPrice('0-3500000');
                      }}
                      className="px-2.5 py-1 bg-gray-100 hover:bg-emerald-50 hover:text-[#006d37] rounded-lg transition shrink-0"
                    >
                      {tag}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={handleOwnerPostClick}
                    className="w-full sm:w-auto"
                  >
                    Đăng Phòng Cho Thuê
                  </Button>

                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    leftIcon={<Search className="w-4 h-4" />}
                    className="w-full sm:w-auto"
                  >
                    Tìm Phòng Trọ
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* 2. TRUST COMMITMENTS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 border border-emerald-100 shadow-xs flex items-start gap-4 hover:shadow-md transition">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#006d37] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base mb-1">Kiểm Duyệt Thực Tế 100%</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Đội ngũ Trọ Xinh trực tiếp đến tận nơi xác minh địa chỉ, giá điện nước, tiện ích và giấy tờ chủ trọ.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-emerald-100 shadow-xs flex items-start gap-4 hover:shadow-md transition">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base mb-1">Bảo Vệ Tiền Cọc An Toàn</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Hợp đồng mẫu chuẩn pháp lý, minh bạch chi phí phát sinh, cam kết hoàn cọc nếu phòng không đúng cam kết.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-emerald-100 shadow-xs flex items-start gap-4 hover:shadow-md transition">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#006492] flex items-center justify-center shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-base mb-1">Hệ Sinh Thái Sinh Viên</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Tích hợp sẵn tìm bạn ở ghép tương đồng lối sống và chợ thanh lý đồ dùng sinh viên 0 đồng.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. FEATURED VERIFIED LISTINGS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#006d37] uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4" />
              Nổi bật hôm nay
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Phòng Trọ Đã Kiểm Duyệt
            </h2>
          </div>

          <Link to="/tim-kiem" className="inline-flex items-center gap-1 text-sm font-bold text-[#006d37] hover:underline">
            Xem tất cả {rooms.length} phòng <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {verifiedRooms.map((room) => (
            <RoomCard key={room.id} room={room} />
          ))}
        </div>
      </section>

      {/* 4. ROOMMATE MATCHING PREVIEW */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-linear-to-r from-emerald-900 via-[#006d37] to-emerald-800 rounded-3xl p-6 sm:p-10 text-white shadow-xl">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8">
            <div className="space-y-2 max-w-xl">
              <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-semibold backdrop-blur-xs">
                Cộng Đồng Sinh Viên
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold">Tìm Bạn Ở Ghép Hợp Gu & San Sẻ Chi Phí</h2>
              <p className="text-emerald-100 text-xs sm:text-sm">
                Kết nối với sinh viên cùng trường, cùng thói quen sinh hoạt. Xem trước thông tin phòng đã liên kết.
              </p>
            </div>

            <Link to="/roommate">
              <Button variant="secondary" size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Khám Phá Bạn Ghép
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {roommates.slice(0, 3).map((post) => (
              <RoommateCard key={post.id} post={post} />
            ))}
          </div>
        </div>
      </section>

      {/* 5. SECONDHAND MARKETPLACE PREVIEW */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">
              <ShoppingBag className="w-4 h-4" />
              Chợ Đồ Cũ Sinh Viên
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Thanh Lý Nhanh - Tặng Đồ 0 Đồng
            </h2>
          </div>

          <Link to="/cho-do-cu" className="inline-flex items-center gap-1 text-sm font-bold text-[#006d37] hover:underline">
            Xem chợ đồ cũ <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {marketplaceItems.slice(0, 6).map((item) => (
            <MarketplaceCard key={item.id} item={item} />
          ))}
        </div>
      </section>

      {/* 6. OWNER BANNER */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-amber-50/80 rounded-3xl p-8 sm:p-12 border border-amber-200/60 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-3 max-w-xl text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-900 rounded-full text-xs font-bold">
              <Building2 className="w-4 h-4 text-amber-700" />
              Dành riêng cho chủ nhà trọ & căn hộ
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-gray-900">
              Bạn Có Phòng Trọ Trống Cần Cho Thuê Nhanh?
            </h2>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              Tiếp cận hơn 50.000+ sinh viên và người đi làm uy tín mỗi tháng. Được hỗ trợ chụp ảnh, kiểm duyệt và quản lý phòng tự động qua phần mềm SaaS miễn phí.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
            <Button
              variant="primary"
              size="lg"
              onClick={handleOwnerPostClick}
              leftIcon={<Building2 className="w-5 h-5" />}
            >
              Đăng Phòng Ngay
            </Button>
            <Link to="/dang-ky?role=owner">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Đăng Ký Chủ Trọ
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};
