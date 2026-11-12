import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { SEOHead } from '../components/seo/SEOHead';
import { Button } from '../components/ui/Button';
import {
  FREE_LISTING_QUOTA,
  LISTING_PLANS,
  calculateListingPlanAmountXu,
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
} from 'lucide-react';

export const PricingPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser, ownerSubscription, wallet } = useAppStore();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const safeReturnUrl = sanitizeReturnUrl(searchParams.get('returnUrl'), '');

  const faqs = [
    {
      q: 'Mỗi chủ trọ được đăng miễn phí bao nhiêu phòng?',
      a: `Mỗi tài khoản chủ trọ được đăng miễn phí ${FREE_LISTING_QUOTA} phòng đầu tiên. Khi đã sử dụng hết ${FREE_LISTING_QUOTA} phòng miễn phí, bạn mới cần mua Tin lẻ hoặc nâng cấp gói Tin nổi bật / Gói Pro để đăng thêm phòng.`,
    },
    {
      q: 'Tin lẻ 15 ngày (30 Xu) và 30 ngày (50 Xu) khác gì gói tháng?',
      a: 'Tin lẻ chỉ tính phí 1 lần cho mỗi phòng bạn muốn đăng thêm (15 ngày hoặc 30 ngày, trong đó Tin lẻ 30 ngày tặng kèm 1 lần đăng lại miễn phí). Gói Tin nổi bật (149 Xu/tháng) cho tối đa 10 tin đang hoạt động và Gói Pro (450 Xu/tháng) không giới hạn số lượng tin.',
    },
    {
      q: 'Thanh toán bằng Xu nội bộ, VietQR và MoMo có an toàn không?',
      a: 'Có. Bạn có thể thanh toán 1 chạm bằng Số dư Xu trong Ví Trọ Xinh, hoặc quét mã VietQR / MoMo được đối soát tự động qua Webhook bảo mật và kích hoạt gói ngay lập tức.',
    },
    {
      q: 'Gói Đăng Phòng có bao gồm phần mềm Quản Lý Trọ K23 hay Gói Đẩy Tin không?',
      a: 'Không. Đây là 3 dịch vụ hoàn toàn độc lập: Gói đăng phòng mở rộng hạn mức đăng tin sau 2 phòng miễn phí; Gói đẩy tin (từ 15 Xu) đưa phòng lên top tìm kiếm; còn Hệ thống K23 (từ 49 Xu/tháng) dùng để quản lý hợp đồng, khách thuê và điện nước.',
    },
  ];

  const handleSelectPlan = (planId: string) => {
    const plan = LISTING_PLANS.find((p) => p.id === planId);
    const effectiveCycle = plan?.billingType === 'one_time' ? 'one_time' : billingCycle;
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/40 via-gray-50 to-white pb-20">
      <SEOHead
        title="Bảng Giá Gói Đăng Phòng | Trọ Xinh"
        description="Đăng miễn phí 2 phòng đầu tiên, chọn Tin lẻ 30-50 Xu hoặc gói Tin nổi bật 149 Xu/tháng, Gói Pro 450 Xu/tháng bằng Xu nội bộ."
        url="/bang-gia"
      />

      {/* Hero Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8 text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/80 text-[#006d37] font-bold text-xs shadow-2xs">
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <span>Dịch Vụ 1 • Gói Đăng Phòng Chủ Trọ</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-gray-900 tracking-tight">
          Gói Đăng Phòng <span className="text-[#006d37]">Trọ Xinh</span>
        </h1>
        <p className="max-w-2xl mx-auto text-sm sm:text-base text-gray-600">
          Đăng tin cho thuê phòng trọ, tiếp cận hàng nghìn người thuê mỗi ngày tại Hà Nội. Minh bạch theo <strong>Xu nội bộ</strong>, linh hoạt theo nhu cầu thực tế.
        </p>

        {/* Banner 2 phòng miễn phí + Số dư Xu */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5 flex-wrap">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold text-xs shadow-2xs">
            <Gift className="w-4 h-4 text-[#006d37]" />
            <span>
              Tặng sẵn <strong>{FREE_LISTING_QUOTA} phòng đầu miễn phí (0 Xu)</strong> cho mọi chủ trọ mới
            </span>
          </div>

          {currentUser && (
            <Link
              to={currentUser.role === 'owner' ? '/chu-tro/vi-xu' : '/vi-xu'}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-black transition cursor-pointer"
              title="Xem và nạp thêm Số dư Xu"
            >
              <Coins className="w-3.5 h-3.5 text-amber-600" />
              <span>Số dư Xu: {(wallet?.total_xu ?? 0).toLocaleString('vi-VN')} Xu</span>
              <span className="text-[#006d37] underline ml-0.5">Nạp Xu →</span>
            </Link>
          )}
        </div>

        {/* Billing Toggle cho gói tháng */}
        <div className="pt-4 flex flex-col items-center justify-center gap-2">
          <div className="bg-gray-200/70 p-1 rounded-2xl flex items-center shadow-inner">
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                billingCycle === 'monthly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Theo Tháng
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('yearly')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                billingCycle === 'yearly'
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
          <p className="text-[11px] text-gray-500">
            * Mức giảm 20% theo năm áp dụng cho gói định kỳ (Tin nổi bật &amp; Gói Pro).
          </p>
        </div>
      </div>

      {/* 4 Pricing Cards Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
              billingCycle === 'yearly' && isSubscription
                ? Math.round(calculateListingPlanAmountXu(plan.id, 'yearly').finalXu / 12)
                : plan.priceXu;
            const totalYearlyXu =
              billingCycle === 'yearly' && isSubscription
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
                    {plan.badge && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-[#006d37] border border-emerald-200 whitespace-nowrap shrink-0">
                        {plan.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-2 min-h-[36px] leading-relaxed">{plan.description}</p>

                  {/* Xu Only Price Display */}
                  <div className="mt-5 pb-5 border-b border-gray-100">
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <span className="text-3xl sm:text-4xl font-black text-[#006d37] tracking-tight font-mono">
                        {monthlyEquivalentXu.toLocaleString('vi-VN')} Xu
                      </span>
                      <span className="text-xs font-bold text-gray-500">
                        /{isSubscription ? 'tháng' : plan.periodLabel}
                      </span>
                    </div>

                    {isSubscription && billingCycle === 'yearly' ? (
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
                          ? `Tối đa ${plan.roomLimit} phòng hoạt động cùng lúc`
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
                    onClick={() => handleSelectPlan(plan.id)}
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

        {/* Footer note of Service 1 card grid */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-gray-500 bg-white border border-gray-200 rounded-2xl px-4 py-3.5 shadow-2xs">
          <span className="flex items-center gap-1.5 font-medium text-gray-700">
            <ShieldCheck className="w-4 h-4 text-[#006d37]" />
            Thanh toán bằng <strong>Xu nội bộ</strong>, VietQR hoặc MoMo
          </span>
          <span className="hidden sm:inline text-gray-300">•</span>
          <span>2 phòng đầu tiên luôn miễn phí vĩnh viễn</span>
          <span className="hidden sm:inline text-gray-300">•</span>
          <span>Quản lý &amp; tắt gia hạn bất cứ lúc nào</span>
        </div>
      </div>

      {/* Feature Comparison Table */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="bg-white rounded-3xl border border-gray-200 shadow-md p-6 sm:p-8">
          <div className="text-center max-w-xl mx-auto mb-6">
            <h2 className="text-xl sm:text-2xl font-black text-gray-900">So Sánh Chi Tiết 4 Gói Đăng Phòng</h2>
            <p className="text-xs text-gray-500 mt-1">
              Bảng giá hiển thị đồng nhất theo Xu nội bộ, tách biệt hoàn toàn với Gói đẩy tin &amp; Gói quản lý K23.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse min-w-[640px]">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-4 px-4 font-bold text-gray-900 w-1/4">Tiêu chí</th>
                  <th className="py-4 px-4 font-bold text-gray-700 text-center">Tin lẻ 15 ngày (30 Xu)</th>
                  <th className="py-4 px-4 font-bold text-gray-700 text-center">Tin lẻ 30 ngày (50 Xu)</th>
                  <th className="py-4 px-4 font-bold text-[#006d37] text-center bg-emerald-50/50 rounded-t-xl">
                    Tin nổi bật (149 Xu/tháng)
                  </th>
                  <th className="py-4 px-4 font-bold text-amber-700 text-center">Gói Pro (450 Xu/tháng)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="py-3.5 px-4 font-medium text-gray-800">Số phòng mở thêm</td>
                  <td className="py-3.5 px-4 text-center font-bold text-gray-700">1 tin lẻ / lượt</td>
                  <td className="py-3.5 px-4 text-center font-bold text-gray-700">1 tin lẻ / lượt</td>
                  <td className="py-3.5 px-4 text-center font-bold text-[#006d37] bg-emerald-50/50">Tối đa 10 tin</td>
                  <td className="py-3.5 px-4 text-center font-bold text-amber-700">Không giới hạn</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-medium text-gray-800">Thời hạn hiển thị</td>
                  <td className="py-3.5 px-4 text-center text-gray-700">15 ngày</td>
                  <td className="py-3.5 px-4 text-center text-gray-700">30 ngày</td>
                  <td className="py-3.5 px-4 text-center font-semibold text-gray-700 bg-emerald-50/50">
                    Theo tháng / năm (-20%)
                  </td>
                  <td className="py-3.5 px-4 text-center font-semibold text-gray-700">Theo tháng / năm (-20%)</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-medium text-gray-800">Tặng đăng lại miễn phí</td>
                  <td className="py-3.5 px-4 text-center text-gray-400">—</td>
                  <td className="py-3.5 px-4 text-center font-bold text-[#006d37]">1 lần (0 Xu)</td>
                  <td className="py-3.5 px-4 text-center text-gray-600 bg-emerald-50/50">Theo gói</td>
                  <td className="py-3.5 px-4 text-center text-gray-700 font-semibold">Linh hoạt không giới hạn</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-medium text-gray-800">Hiển thị &amp; huy hiệu</td>
                  <td className="py-3.5 px-4 text-center text-gray-600">Tiêu chuẩn</td>
                  <td className="py-3.5 px-4 text-center text-gray-600">Tiêu chuẩn</td>
                  <td className="py-3.5 px-4 text-center font-bold text-[#006d37] bg-emerald-50/50">
                    Ưu tiên + Huy hiệu nổi bật
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold text-amber-700">Ưu tiên hàng đầu &amp; CSKH 24/7</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Cross-links to independent services */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <Link
            to="/chu-tro"
            className="p-5 rounded-2xl bg-amber-50/70 border border-amber-200 hover:border-amber-400 transition flex items-center justify-between gap-4"
          >
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block">
                Dịch vụ 2 độc lập
              </span>
              <h3 className="text-sm font-black text-gray-900 mt-0.5">Cần Đẩy Tin Lên Top?</h3>
              <p className="text-gray-600 mt-1">Gói Đẩy Tin 15 / 29 / 59 / 199 Xu áp dụng riêng cho từng phòng.</p>
            </div>
            <ArrowRight className="w-4 h-4 text-amber-700 shrink-0" />
          </Link>

          <Link
            to="/chu-tro/goi-dich-vu"
            className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 hover:border-[#006d37] transition flex items-center justify-between gap-4"
          >
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-[#006d37] block">
                Dịch vụ 3 độc lập
              </span>
              <h3 className="text-sm font-black text-gray-900 mt-0.5">Hệ Thống Quản Lý Phòng Trọ K23</h3>
              <p className="text-gray-600 mt-1">Quản lý hợp đồng, khách thuê &amp; tính hóa đơn điện nước từ 49 Xu/tháng.</p>
            </div>
            <ArrowRight className="w-4 h-4 text-[#006d37] shrink-0" />
          </Link>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-[#006d37] flex items-center justify-center mx-auto shadow-2xs">
            <HelpCircle className="w-5 h-5" />
          </div>
          <h2 className="text-2xl font-black text-gray-900">Câu Hỏi Thường Gặp (FAQ)</h2>
          <p className="text-xs text-gray-500">Mọi thắc mắc liên quan đến Gói đăng phòng và thanh toán Xu nội bộ</p>
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
      </div>
    </div>
  );
};
