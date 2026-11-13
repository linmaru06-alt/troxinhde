import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { useK23Subscription } from '../hooks/queries/useK23Subscription';
import { SEOHead } from '../components/seo/SEOHead';
import { Button } from '../components/ui/Button';
import {
  FREE_LISTING_QUOTA,
  LISTING_PLANS,
  BOOST_PACKAGES,
  K23_PLAN_CATALOG,
  K23_TRIAL_DAYS,
  calculateListingPlanAmountXu,
  calculateK23AmountXu,
  sanitizeReturnUrl,
} from '../lib/monetizationCatalog';
import {
  Check,
  Sparkles,
  Crown,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Coins,
  ArrowRight,
  Gift,
  ShieldCheck,
  Zap,
  TrendingUp,
  Clock,
  Home,
  Crosshair,
  Building2,
  FileText,
  Rocket,
  Info,
} from 'lucide-react';

export const PricingPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser, ownerSubscription, wallet, showToast } = useAppStore();
  const [listingBillingCycle, setListingBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [k23BillingCycle, setK23BillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const {
    currentPlan: userK23Plan,
    isActive: isK23Active,
    hasUsedTrial: hasUsedK23Trial,
    isTrial: isK23InTrial,
    daysLeft: k23DaysLeft,
    activateTrial,
    isActivatingTrial,
  } = useK23Subscription();

  const safeReturnUrl = sanitizeReturnUrl(searchParams.get('returnUrl'), '');

  const faqs = [
    {
      q: 'Tại sao Trọ Xinh có 3 dịch vụ trả phí khác nhau?',
      a: 'Trọ Xinh chia tách 3 dịch vụ hoàn toàn độc lập để bạn chỉ phải trả tiền cho đúng nhu cầu của mình: (1) Gói Đăng Phòng mở rộng hạn mức đăng tin sau 2 phòng miễn phí; (2) Gói Đẩy Tin giúp từng phòng cụ thể lên top tìm kiếm nhanh gấp 3 lần; và (3) Hệ Thống Quản Lý K23 là phần mềm vận hành chốt điện nước, quản lý khách thuê và hóa đơn hàng tháng.',
    },
    {
      q: 'Mỗi chủ trọ được đăng miễn phí bao nhiêu phòng?',
      a: `Mỗi tài khoản chủ trọ được đăng miễn phí ${FREE_LISTING_QUOTA} phòng đầu tiên vĩnh viễn (0 Xu). Khi đã dùng hết ${FREE_LISTING_QUOTA} phòng miễn phí, bạn mới cần mua Tin lẻ (30-50 Xu) hoặc nâng cấp gói Tin nổi bật (149 Xu/tháng) / Gói Pro (450 Xu/tháng) để mở thêm phòng.`,
    },
    {
      q: 'Gói Đẩy Tin có cộng dồn thời hạn hiển thị của tin phòng không?',
      a: 'Không. Gói Đẩy Tin (15 Xu - 199 Xu) chỉ tập trung đưa tin đăng của bạn lên vị trí nổi bật nhất và gắn huy hiệu để tiếp cận người thuê nhanh nhất trong khoảng thời gian đã chọn (1, 3, 7 hoặc 30 ngày). Thời hạn tồn tại của tin đăng gốc tuân theo gói đăng phòng.',
    },
    {
      q: 'Dùng thử 30 ngày Hệ Thống K23 hoạt động như thế nào?',
      a: `Mỗi chủ trọ được tặng miễn phí 1 lần dùng thử ${K23_TRIAL_DAYS} ngày gói Tiêu Chuẩn (0 Xu). Bạn có thể quản lý tới 35 phòng, 3 tòa nhà, chốt số điện nước và xuất hóa đơn VietQR tự động hoàn toàn miễn phí trong suốt thời gian dùng thử.`,
    },
    {
      q: 'Thanh toán bằng Xu nội bộ có ưu điểm gì?',
      a: 'Toàn bộ dịch vụ trên Trọ Xinh đều định giá theo Xu nội bộ (1 Xu = 1.000 VNĐ). Khi có số dư trong Ví Xu, bạn thanh toán 1 chạm ngay lập tức mà không cần quét mã QR hay chuyển khoản mỗi lần. Ngoài ra nạp Xu từ 500.000đ được tặng thêm 10% Xu thưởng.',
    },
  ];

  const handleSelectListingPlan = (planId: string) => {
    const plan = LISTING_PLANS.find((p) => p.id === planId);
    const effectiveCycle = plan?.billingType === 'one_time' ? 'one_time' : listingBillingCycle;
    const qs = new URLSearchParams();
    if (effectiveCycle !== 'one_time') {
      qs.set('cycle', effectiveCycle);
    }
    if (safeReturnUrl) {
      qs.set('returnUrl', safeReturnUrl);
    }
    const target = qs.toString() ? `/thanh-toan/${planId}?${qs.toString()}` : `/thanh-toan/${planId}`;

    if (!currentUser) {
      navigate(`/dang-nhap?returnUrl=${encodeURIComponent(target)}`);
      return;
    }
    navigate(target);
  };

  const handleSelectBoostPackage = (boostId: string) => {
    // Gói đẩy tin áp dụng cho từng phòng cụ thể của chủ trọ
    if (!currentUser) {
      navigate(`/dang-nhap?returnUrl=${encodeURIComponent('/chu-tro')}`);
      return;
    }
    if (currentUser.role !== 'owner') {
      navigate('/dang-ky-chu-tro');
      return;
    }
    // Chuyển tới trang Quản lý phòng của chủ trọ để chọn phòng muốn đẩy
    showToast(
      'Chọn phòng cần đẩy tin',
      `Bạn đã chọn gói đẩy tin: ${BOOST_PACKAGES.find((b) => b.id === boostId)?.name || boostId}. Vui lòng chọn phòng cần áp dụng.`,
      'info'
    );
    navigate('/chu-tro');
  };

  const handleSelectK23Plan = (planCode: string) => {
    const qs = new URLSearchParams();
    qs.set('plan', planCode);
    qs.set('cycle', k23BillingCycle);
    if (safeReturnUrl) {
      qs.set('returnUrl', safeReturnUrl);
    }
    const target = `/chu-tro/thanh-toan-goi?${qs.toString()}`;

    if (!currentUser) {
      navigate(`/dang-nhap?returnUrl=${encodeURIComponent(target)}`);
      return;
    }
    if (currentUser.role !== 'owner') {
      navigate('/dang-ky-chu-tro');
      return;
    }
    navigate(target);
  };

  const handleActivateK23Trial = async () => {
    if (!currentUser) {
      navigate(`/dang-nhap?returnUrl=${encodeURIComponent('/bang-gia#dich-vu-3')}`);
      return;
    }
    try {
      await activateTrial();
      showToast(
        'Kích hoạt dùng thử K23 thành công!',
        `Bạn có ${K23_TRIAL_DAYS} ngày sử dụng miễn phí gói Tiêu Chuẩn (tối đa 35 phòng & 3 tòa nhà).`,
        'success'
      );
      navigate('/chu-tro/hoa-don');
    } catch (err: any) {
      showToast(
        'Không thể kích hoạt dùng thử',
        err?.message || 'Mỗi chủ trọ chỉ được dùng thử miễn phí 30 ngày một lần.',
        'error'
      );
    }
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/40 via-gray-50 to-white pb-20">
      <SEOHead
        title="Gói Dịch Vụ PRO Chủ Trọ • Bảng Giá Trọ Xinh"
        description="Bảng giá 3 dịch vụ độc lập: Gói Đăng Phòng (miễn phí 2 phòng đầu), Gói Đẩy Tin (từ 15 Xu) và Hệ Thống Quản Lý Phòng Trọ K23 (từ 49 Xu/tháng)."
        url="/bang-gia"
      />

      {/* Top Hero Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-6 text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/80 text-[#006d37] font-bold text-xs shadow-2xs">
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <span>Gói PRO Dịch Vụ Chủ Trọ Trọ Xinh</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-gray-900 tracking-tight">
          Hệ Thống Dịch Vụ <span className="text-[#006d37]">Trọ Xinh PRO</span>
        </h1>
        <p className="max-w-2xl mx-auto text-sm sm:text-base text-gray-600 leading-relaxed">
          3 dịch vụ trả phí độc lập, minh bạch hoàn toàn bằng <strong>Xu nội bộ</strong>. Vuốt xuống để khám phá chi tiết từng dịch vụ phù hợp với bạn.
        </p>

        {/* User Wallet Balance chip if logged in */}
        {currentUser && (
          <div className="pt-1 flex items-center justify-center">
            <Link
              to={currentUser.role === 'owner' ? '/chu-tro/vi-xu' : '/vi-xu'}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-black transition cursor-pointer shadow-xs"
              title="Xem và nạp thêm Số dư Xu"
            >
              <Coins className="w-4 h-4 text-amber-600" />
              <span>Số dư ví của bạn: {(wallet?.total_xu ?? 0).toLocaleString('vi-VN')} Xu</span>
              <span className="text-[#006d37] underline ml-1 font-bold">Nạp thêm Xu →</span>
            </Link>
          </div>
        )}

        {/* Sticky Quick-Navigation Pills Bar */}
        <div className="pt-4 sticky top-16 z-30 flex items-center justify-center">
          <div className="bg-white/95 backdrop-blur-md p-1.5 rounded-2xl border border-gray-200 shadow-md flex items-center gap-1 sm:gap-2 flex-wrap justify-center text-xs font-bold">
            <button
              type="button"
              onClick={() => scrollToSection('dich-vu-1')}
              className="px-3.5 py-2 rounded-xl text-gray-800 hover:text-[#006d37] hover:bg-emerald-50 transition flex items-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-4 h-4 text-[#006d37]" />
              <span>1. Gói Đăng Phòng</span>
            </button>
            <span className="text-gray-300 hidden sm:inline">•</span>
            <button
              type="button"
              onClick={() => scrollToSection('dich-vu-2')}
              className="px-3.5 py-2 rounded-xl text-gray-800 hover:text-amber-700 hover:bg-amber-50 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Rocket className="w-4 h-4 text-amber-600" />
              <span>2. Gói Đẩy Tin</span>
            </button>
            <span className="text-gray-300 hidden sm:inline">•</span>
            <button
              type="button"
              onClick={() => scrollToSection('dich-vu-3')}
              className="px-3.5 py-2 rounded-xl text-gray-800 hover:text-emerald-700 hover:bg-emerald-50 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Building2 className="w-4 h-4 text-[#006d37]" />
              <span>3. Quản Lý K23</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. DỊCH VỤ 1: GÓI ĐĂNG PHÒNG */}
      {/* ========================================================================= */}
      <section id="dich-vu-1" className="scroll-mt-28 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-3 mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[#006d37] text-xs font-black uppercase tracking-wider">
              <FileText className="w-3.5 h-3.5" />
              Dịch vụ 1 • Gói đăng phòng
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-gray-900 tracking-tight">
              Gói Đăng Phòng
            </h2>
            <p className="max-w-xl mx-auto text-xs sm:text-sm text-gray-600">
              Đăng tin cho thuê phòng trọ, tiếp cận hàng nghìn người thuê.
            </p>

            {/* Banner 2 phòng đầu miễn phí */}
            <div className="pt-2 flex justify-center">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold text-xs shadow-2xs">
                <Gift className="w-4 h-4 text-[#006d37]" />
                <span>
                  Tặng sẵn <strong>{FREE_LISTING_QUOTA} phòng đầu miễn phí (0 Xu)</strong> cho mọi chủ trọ mới
                </span>
              </div>
            </div>

            {/* Toggle Tháng / Năm (-20%) cho Dịch vụ 1 */}
            <div className="pt-3 flex flex-col items-center justify-center gap-2">
              <div className="bg-gray-200/80 p-1 rounded-2xl flex items-center shadow-inner">
                <button
                  type="button"
                  onClick={() => setListingBillingCycle('monthly')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    listingBillingCycle === 'monthly'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Theo Tháng
                </button>
                <button
                  type="button"
                  onClick={() => setListingBillingCycle('yearly')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    listingBillingCycle === 'yearly'
                      ? 'bg-[#006d37] text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <span>Theo Năm</span>
                  <span className="bg-amber-400 text-amber-950 text-[10px] px-1.5 py-0.5 rounded-md font-black">
                    Giảm 20%
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* 4 Pricing Cards Dịch vụ 1 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            {LISTING_PLANS.map((plan) => {
              const isSubscription = plan.billingType === 'subscription';
              const isCurrent = Boolean(
                currentUser &&
                  isSubscription &&
                  ownerSubscription.status === 'active' &&
                  ownerSubscription.planId === plan.id
              );

              const monthlyEquivalentXu =
                listingBillingCycle === 'yearly' && isSubscription
                  ? Math.round(calculateListingPlanAmountXu(plan.id, 'yearly').finalXu / 12)
                  : plan.priceXu;
              const totalYearlyXu =
                listingBillingCycle === 'yearly' && isSubscription
                  ? calculateListingPlanAmountXu(plan.id, 'yearly').finalXu
                  : 0;

              return (
                <div
                  key={plan.id}
                  className={`relative rounded-3xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-300 ${
                    plan.popular
                      ? 'bg-white border-2 border-[#006d37] shadow-xl shadow-emerald-900/10 lg:scale-[1.02] z-10'
                      : 'bg-white border border-gray-200 shadow-md hover:shadow-lg'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#006d37] text-white text-[11px] font-black px-3.5 py-1 rounded-full shadow-md flex items-center gap-1 whitespace-nowrap">
                      <Crown className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                      <span>PHỔ BIẾN NHẤT</span>
                    </div>
                  )}

                  <div>
                    <div className="flex items-start justify-between gap-2 min-h-[28px]">
                      <h3 className="text-lg font-extrabold text-gray-900 leading-tight">{plan.name}</h3>
                      {plan.badge && !plan.popular && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-[#006d37] border border-emerald-200 whitespace-nowrap shrink-0">
                          {plan.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-2 min-h-[36px] leading-relaxed">{plan.description}</p>

                    {/* Xu Price */}
                    <div className="mt-5 pb-5 border-b border-gray-100">
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        <span className="text-3xl sm:text-4xl font-black text-[#006d37] tracking-tight font-mono">
                          {monthlyEquivalentXu.toLocaleString('vi-VN')} Xu
                        </span>
                        <span className="text-xs font-bold text-gray-500">
                          /{isSubscription ? 'tháng' : plan.periodLabel}
                        </span>
                      </div>

                      {isSubscription && listingBillingCycle === 'yearly' ? (
                        <div className="text-[11px] text-emerald-800 font-bold mt-2 flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-xl">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span>
                            Trả theo năm: <strong>{totalYearlyXu.toLocaleString('vi-VN')} Xu/năm</strong> (-20%)
                          </span>
                        </div>
                      ) : (
                        <p className="text-[11px] text-gray-400 mt-2 font-medium">
                          {plan.roomLimit === -1
                            ? 'Không giới hạn số lượng tin hoạt động'
                            : isSubscription
                            ? `Tối đa ${plan.roomLimit} tin hoạt động`
                            : plan.freeRepostsGranted > 0
                            ? `1 tin / ${plan.durationDays} ngày + tặng 1 lần đăng lại 0 Xu`
                            : `1 tin / ${plan.durationDays} ngày linh hoạt`}
                        </p>
                      )}
                    </div>

                    {/* Features List */}
                    <div className="mt-5 space-y-3">
                      <p className="text-[11px] font-bold text-gray-900 uppercase tracking-wider">
                        Quyền lợi gói:
                      </p>
                      {plan.features.map((feat, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 text-xs text-gray-700">
                          <div className="w-4 h-4 rounded-full bg-emerald-100 text-[#006d37] flex items-center justify-center shrink-0 mt-0.5">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                          <span className="leading-snug">{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* CTA Button */}
                  <div className="mt-7 pt-3">
                    <Button
                      variant={plan.popular ? 'primary' : 'outline'}
                      size="lg"
                      fullWidth
                      onClick={() => handleSelectListingPlan(plan.id)}
                      disabled={isCurrent}
                      rightIcon={!isCurrent ? <ArrowRight className="w-4 h-4" /> : undefined}
                      className="font-bold cursor-pointer"
                    >
                      {isCurrent ? 'Đang sử dụng' : 'Chọn gói'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer note Dịch vụ 1 */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-gray-500 bg-white border border-gray-200 rounded-2xl px-4 py-3.5 shadow-2xs">
            <span className="flex items-center gap-1.5 font-medium text-gray-700">
              <ShieldCheck className="w-4 h-4 text-[#006d37]" />
              Thanh toán bằng <strong>Xu nội bộ</strong>, VietQR hoặc MoMo
            </span>
            <span className="hidden sm:inline text-gray-300">•</span>
            <span>2 phòng đầu tiên luôn miễn phí vĩnh viễn</span>
            <span className="hidden sm:inline text-gray-300">•</span>
            <span>Hủy hoặc tắt tự động gia hạn bất cứ lúc nào</span>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. DỊCH VỤ 2: GÓI ĐẨY TIN */}
      {/* ========================================================================= */}
      <section id="dich-vu-2" className="scroll-mt-28 py-12 bg-white/70 border-y border-gray-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-3 mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-black uppercase tracking-wider">
              <Rocket className="w-3.5 h-3.5" />
              Dịch vụ 2 • Gói đẩy tin
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-gray-900 tracking-tight">
              Gói Đẩy Tin
            </h2>
            <p className="max-w-xl mx-auto text-xs sm:text-sm text-gray-600">
              Đẩy tin lên top, cho thuê nhanh hơn.
            </p>
          </div>

          {/* 4 Cards Dịch vụ 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            {BOOST_PACKAGES.map((boost) => {
              const isPopular = boost.popular;
              return (
                <div
                  key={boost.id}
                  className={`relative rounded-3xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-300 ${
                    isPopular
                      ? 'bg-white border-2 border-emerald-600 shadow-xl shadow-emerald-900/10 lg:scale-[1.02] z-10'
                      : 'bg-white border border-gray-200 shadow-md hover:shadow-lg'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#00a854] text-white text-[11px] font-black px-3.5 py-1 rounded-full shadow-md flex items-center gap-1 whitespace-nowrap">
                      <span>PHỔ BIẾN NHẤT</span>
                    </div>
                  )}

                  <div>
                    <div className="text-center pb-2">
                      <h3 className="text-lg font-extrabold text-gray-900">{boost.name}</h3>
                    </div>

                    {/* Icon đại diện */}
                    <div className="flex justify-center my-4">
                      <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-700 shadow-inner">
                        {boost.id === 'single' ? (
                          <Zap className="w-7 h-7 text-amber-500" />
                        ) : boost.id === '3days' ? (
                          <TrendingUp className="w-7 h-7 text-emerald-600" />
                        ) : boost.id === '7days' ? (
                          <Clock className="w-7 h-7 text-blue-500" />
                        ) : (
                          <Crown className="w-7 h-7 text-amber-500" />
                        )}
                      </div>
                    </div>

                    {/* Giá Xu & Thời hạn */}
                    <div className="text-center my-4 pb-4 border-b border-gray-100">
                      <div className="text-3xl sm:text-4xl font-black text-[#006d37] font-mono">
                        {boost.priceXu} Xu
                      </div>
                      <div className="text-xs font-semibold text-gray-500 mt-1">
                        {boost.durationDays} ngày
                      </div>
                    </div>

                    <p className="text-xs text-gray-600 text-center min-h-[48px] leading-relaxed">
                      {boost.description}
                    </p>
                  </div>

                  <div className="mt-6 pt-2">
                    <Button
                      variant={isPopular ? 'primary' : 'outline'}
                      size="lg"
                      fullWidth
                      onClick={() => handleSelectBoostPackage(boost.id)}
                      className="font-bold cursor-pointer"
                    >
                      Chọn gói
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Banner lưu ý chính sách Dịch vụ 2 (Khớp đúng yêu cầu) */}
          <div className="mt-8 max-w-4xl mx-auto p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-950 flex items-start gap-2.5 shadow-2xs">
            <Info className="w-4 h-4 text-[#006d37] shrink-0 mt-0.5" />
            <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span>
                Xu sẽ được trừ ngay khi chọn gói. Gói có thể hủy trong 24h đầu. Xem chi tiết tại{' '}
                <Link to="/terms" className="font-bold text-[#006d37] underline hover:text-emerald-800">
                  Chính sách dịch vụ →
                </Link>
              </span>
              <Link
                to="/chu-tro"
                className="font-bold text-[#006d37] whitespace-nowrap hover:underline flex items-center gap-1"
              >
                Vào Quản lý phòng để đẩy tin <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. DỊCH VỤ 3: HỆ THỐNG QUẢN LÝ PHÒNG TRỌ K23 */}
      {/* ========================================================================= */}
      <section id="dich-vu-3" className="scroll-mt-28 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-3 mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-[#006d37] text-xs font-black uppercase tracking-wider">
              <Building2 className="w-3.5 h-3.5" />
              Dịch vụ 3 • Quản lý vận hành K23
            </div>
            <h2 className="text-2xl sm:text-4xl font-black text-gray-900 tracking-tight">
              Hệ Thống Quản Lý Phòng Trọ
            </h2>
            <p className="max-w-xl mx-auto text-xs sm:text-sm text-gray-600">
              Quản lý phòng, khách thuê, hợp đồng và tính hóa đơn điện nước hằng tháng.
            </p>

            {/* Toggle Tháng / Năm (Đóng 10 tặng 2) cho K23 */}
            <div className="pt-3 flex flex-col items-center justify-center gap-2">
              <div className="bg-gray-200/80 p-1 rounded-2xl flex items-center shadow-inner">
                <button
                  type="button"
                  onClick={() => setK23BillingCycle('monthly')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    k23BillingCycle === 'monthly'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Theo Tháng
                </button>
                <button
                  type="button"
                  onClick={() => setK23BillingCycle('yearly')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    k23BillingCycle === 'yearly'
                      ? 'bg-[#006d37] text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <span>Theo Năm</span>
                  <span className="bg-amber-400 text-amber-950 text-[10px] px-1.5 py-0.5 rounded-md font-black">
                    Đóng 10 tặng 2
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* 3 Cards Dịch vụ 3 (K23) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch">
            {K23_PLAN_CATALOG.map((plan) => {
              const isPopular = plan.isPopular;
              const isYearly = k23BillingCycle === 'yearly';
              const pricing = calculateK23AmountXu(plan.code, k23BillingCycle);
              const displayXu = isYearly ? plan.priceYearlyXu : plan.priceMonthlyXu;

              return (
                <div
                  key={plan.code}
                  className={`relative rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 ${
                    isPopular
                      ? 'bg-white border-2 border-emerald-600 shadow-xl shadow-emerald-900/10 lg:scale-[1.03] z-10'
                      : 'bg-white border border-gray-200 shadow-md hover:shadow-lg'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#00a854] text-white text-[11px] font-black px-4 py-1 rounded-full shadow-md flex items-center gap-1 whitespace-nowrap">
                      <span>PHỔ BIẾN NHẤT</span>
                    </div>
                  )}

                  <div>
                    {/* Icon */}
                    <div className="flex justify-center mb-4">
                      <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-[#006d37] flex items-center justify-center border border-emerald-100 shadow-inner">
                        {plan.code === 'basic' ? (
                          <Home className="w-7 h-7" />
                        ) : plan.code === 'standard' ? (
                          <Crosshair className="w-7 h-7" />
                        ) : (
                          <Building2 className="w-7 h-7" />
                        )}
                      </div>
                    </div>

                    <div className="text-center pb-2">
                      <h3 className="text-xl font-black text-gray-900">{plan.name}</h3>
                    </div>

                    {/* Price */}
                    <div className="text-center my-4 pb-4 border-b border-gray-100">
                      <div className="text-3xl sm:text-4xl font-black text-[#006d37] font-mono">
                        {displayXu.toLocaleString('vi-VN')} Xu
                        <span className="text-sm font-bold text-gray-500 font-sans">
                          /{isYearly ? 'năm' : 'tháng'}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        (khoảng {(displayXu * 1000).toLocaleString('vi-VN')} VNĐ)
                      </div>
                    </div>

                    {/* Features checklist */}
                    <div className="space-y-3 py-2 text-xs sm:text-sm text-gray-700">
                      <div className="flex items-center gap-2.5">
                        <Check className="w-4 h-4 text-[#006d37] stroke-[3] shrink-0" />
                        <span>
                          {plan.maxRooms === -1 ? 'Không giới hạn phòng' : `Tối đa ${plan.maxRooms} phòng`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <Check className="w-4 h-4 text-[#006d37] stroke-[3] shrink-0" />
                        <span>
                          {plan.maxBuildings === -1 ? 'Không giới hạn tòa nhà' : `${plan.maxBuildings} tòa nhà`}
                        </span>
                      </div>
                      {plan.features.slice(2).map((feat, idx) => (
                        <div key={idx} className="flex items-center gap-2.5">
                          <Check className="w-4 h-4 text-[#006d37] stroke-[3] shrink-0" />
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-8 pt-2">
                    <Button
                      variant={isPopular ? 'primary' : 'outline'}
                      size="lg"
                      fullWidth
                      onClick={() => handleSelectK23Plan(plan.code)}
                      className="font-bold cursor-pointer"
                    >
                      {plan.code === 'standard' ? 'Chọn gói' : 'Bắt đầu ngay'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Banner dùng thử 30 ngày (0 Xu) */}
          <div className="mt-8 max-w-3xl mx-auto p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-950 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2 text-center sm:text-left">
              <Info className="w-4 h-4 text-[#006d37] shrink-0" />
              <span>
                <strong>Dùng thử 30 ngày gói Tiêu Chuẩn (0 Xu)</strong>, trả năm đóng 10 tặng 2.
              </span>
            </div>

            {!hasUsedK23Trial && !isK23InTrial && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleActivateK23Trial}
                isLoading={isActivatingTrial}
                className="whitespace-nowrap font-bold shrink-0 cursor-pointer shadow-xs"
              >
                Dùng thử 30 ngày (0 Xu)
              </Button>
            )}

            {isK23InTrial && (
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full whitespace-nowrap">
                Đang dùng thử (còn {k23DaysLeft} ngày)
              </span>
            )}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. FAQ SECTION */}
      {/* ========================================================================= */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-[#006d37] flex items-center justify-center mx-auto shadow-2xs">
            <HelpCircle className="w-5 h-5" />
          </div>
          <h2 className="text-2xl font-black text-gray-900">Câu Hỏi Thường Gặp (FAQ)</h2>
          <p className="text-xs text-gray-500">Mọi thắc mắc liên quan đến 3 Dịch vụ trả phí và Ví Xu nội bộ</p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openFaqIndex === index;
            return (
              <div
                key={index}
                className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-2xs transition"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                  className="w-full p-4 text-left flex items-center justify-between gap-4 font-bold text-sm text-gray-900 hover:text-[#006d37] cursor-pointer"
                >
                  <span>{faq.q}</span>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-gray-500 shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />
                  )}
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 text-xs text-gray-600 leading-relaxed border-t border-gray-100 pt-3">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
