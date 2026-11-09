import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppStore, SUBSCRIPTION_PLANS } from '../store/useAppStore';
import { SEOHead } from '../components/seo/SEOHead';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { formatCurrency } from '../components/ui/Cards';
import {
  Check,
  Zap,
  Sparkles,
  ShieldCheck,
  Crown,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Building2,
  ArrowRight,
  Headphones,
  TrendingUp,
  Coins,
} from 'lucide-react';

export const PricingPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, ownerSubscription, wallet } = useAppStore();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: 'Tôi có thể nâng cấp hoặc hủy gói bất kỳ lúc nào không?',
      a: 'Hoàn toàn được! Bạn có thể nâng cấp lên gói cao hơn bất kỳ lúc nào hoặc tắt tính năng tự động gia hạn ngay trong trang Quản lý gói. Các quyền lợi sẽ được bảo lưu đầy đủ cho đến hết chu kỳ đã thanh toán.',
    },
    {
      q: 'Hệ thống thanh toán qua MoMo, VNPay và Ví Xu có an toàn không?',
      a: 'Trọ Xinh kết nối trực tiếp với cổng thanh toán chuẩn quốc gia MoMo, VNPay và hệ sinh thái Ví Xu Trọ Xinh chuẩn PCI-DSS 256-bit. Mọi giao dịch trừ Xu hoặc nạp tiền đều được bảo mật và lưu nhật ký giao dịch tức thì.',
    },
    {
      q: 'Lượt "Đẩy Tin Nổi Bật" hoạt động như thế nào?',
      a: 'Khi kích hoạt đẩy tin, phòng trọ của bạn sẽ được gắn huy hiệu vàng "Tin Nổi Bật", ưu tiên xuất hiện tại top đầu trang tìm kiếm và bản đồ Hà Nội, giúp tiếp cận khách thuê gấp 3-5 lần bình thường.',
    },
    {
      q: 'Tôi có được xuất hóa đơn điện tử VAT không?',
      a: 'Có. Sau khi thanh toán thành công, bạn có thể tải biên lai điện tử tại mục "Lịch sử thanh toán" hoặc liên hệ bộ phận hỗ trợ khách hàng để nhận hóa đơn VAT theo MST doanh nghiệp.',
    },
  ];

  const handleSelectPlan = (planId: string) => {
    if (planId === 'free') {
      navigate('/chu-tro');
      return;
    }
    if (!currentUser) {
      navigate(`/dang-nhap?returnUrl=/thanh-toan/${planId}`);
      return;
    }
    navigate(`/thanh-toan/${planId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50/40 via-gray-50 to-white pb-20">
      <SEOHead
        title="Bảng Giá Dịch Vụ Chủ Trọ | TroXinh Hà Nội"
        description="Nâng cấp tài khoản chủ trọ TroXinh bằng Ví Xu để đăng nhiều phòng hơn, đẩy tin nổi bật tiếp cận 100,000+ sinh viên Hà Nội."
        url="/nang-cap"
      />

      {/* Hero Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-10 text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/80 text-[#006d37] font-bold text-xs shadow-2xs">
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <span>Bảng Giá Gói Dịch Vụ Chủ Trọ TroXinh 2026</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-gray-900 tracking-tight">
          Lấp Đầy Phòng Nhanh Hơn Với <span className="text-[#006d37]">Trọ Xinh Pro</span>
        </h1>
        <p className="max-w-2xl mx-auto text-sm sm:text-base text-gray-600">
          Tiếp cận hơn 100,000+ sinh viên các trường ĐH lớn tại Hà Nội (Bách Khoa, ĐHQG, Ngoại Thương, Kinh Tế...). Minh bạch, an toàn, tối ưu chi phí.
        </p>

        {/* Quy ước đổi tiền ra Xu: 1 Xu = 1.000đ */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-50 border border-amber-300 text-amber-900 font-bold text-xs shadow-2xs">
            <Coins className="w-4 h-4 text-amber-600" />
            <span>Quy ước chuẩn: <strong>1 Xu = 1.000 VNĐ</strong> • Trừ trực tiếp vào Ví Xu Trọ Xinh</span>
          </div>

          {currentUser && (
            <Link
              to={currentUser.role === 'owner' ? '/chu-tro/vi-xu' : '/vi-xu'}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-[#006d37] text-xs font-black transition cursor-pointer"
              title="Xem và nạp thêm số dư Ví Xu"
            >
              <span>Ví của bạn: {wallet?.total_xu ?? 5500} Xu</span>
              <span className="text-emerald-800 underline">Nạp thêm →</span>
            </Link>
          )}
        </div>

        {/* Billing Toggle */}
        <div className="pt-4 flex items-center justify-center gap-3">
          <div className="bg-gray-200/70 p-1 rounded-2xl flex items-center shadow-inner">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Theo Tháng
            </button>
            <button
              onClick={() => setBillingCycle('yearly')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                billingCycle === 'yearly'
                  ? 'bg-[#006d37] text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Theo Năm
              <span className="bg-amber-400 text-amber-950 text-[10px] px-1.5 py-0.2 rounded-md font-black">
                Giảm 20%
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
          {SUBSCRIPTION_PLANS.map((plan) => {
            const isCurrent = ownerSubscription.planId === plan.id;
            const price =
              billingCycle === 'yearly' && plan.price > 0
                ? Math.round((plan.price * 12 * 0.8) / 12)
                : plan.price;

            const xuPrice = Math.round(price / 1000);
            const originalXu = plan.originalPrice ? Math.round(plan.originalPrice / 1000) : 0;
            const yearlyTotalXu = Math.round((price * 12) / 1000);

            return (
              <div
                key={plan.id}
                className={`relative rounded-3xl p-8 flex flex-col justify-between transition-all duration-300 ${
                  plan.popular
                    ? 'bg-white border-2 border-[#006d37] shadow-xl shadow-emerald-900/10 scale-[1.02] z-10'
                    : 'bg-white border border-gray-200 shadow-md hover:shadow-lg'
                }`}
              >
                {/* Popular Pill */}
                {plan.popular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#006d37] text-white text-xs font-black px-4 py-1 rounded-full shadow-md flex items-center gap-1.5">
                    <Crown className="w-3.5 h-3.5 text-amber-300" />
                    <span>LỰA CHỌN PHỔ BIẾN NHẤT</span>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-xl font-extrabold text-gray-900">{plan.name}</h3>
                    {plan.badge && (
                      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#006d37] border border-emerald-200">
                        {plan.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-2 min-h-8">{plan.description}</p>

                  {/* Price display quy đổi ra Xu (1 Xu = 1.000đ) */}
                  <div className="mt-6 pb-6 border-b border-gray-100">
                    {price === 0 ? (
                      <div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl font-black text-gray-900 tracking-tight">
                            Miễn phí
                          </span>
                          <span className="text-xs font-bold text-emerald-800 bg-emerald-100/70 border border-emerald-300 px-2 py-0.5 rounded-full font-mono">
                            0 Xu
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          Trải nghiệm đầy đủ 02 phòng không tốn chi phí
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div className="flex items-baseline gap-1.5 flex-wrap">
                          <span className="text-4xl font-black text-gray-900 tracking-tight flex items-baseline gap-1">
                            <span>{xuPrice}</span>
                            <span className="text-2xl font-black text-amber-500">Xu</span>
                          </span>
                          <span className="text-xs font-bold text-gray-500">/tháng</span>
                          <span className="text-xs font-medium text-gray-400">
                            (~{formatCurrency(price)})
                          </span>
                        </div>

                        {plan.originalPrice && billingCycle === 'monthly' && (
                          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1.5 flex-wrap">
                            <span>Giá gốc:</span>
                            <span className="line-through font-bold text-gray-500">
                              {originalXu} Xu
                            </span>
                            <span className="line-through text-[11px] text-gray-400">
                              ({formatCurrency(plan.originalPrice)})/tháng
                            </span>
                          </p>
                        )}

                        {billingCycle === 'yearly' && price > 0 && (
                          <p className="text-xs text-emerald-700 font-bold mt-1.5 flex items-center gap-1 flex-wrap">
                            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span>
                              Thanh toán theo năm: <strong>{yearlyTotalXu} Xu</strong>/năm (~{formatCurrency(price * 12)} • Tiết kiệm 20%)
                            </span>
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Features List */}
                  <div className="mt-6 space-y-3.5">
                    <p className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                      Quyền lợi bao gồm:
                    </p>
                    {plan.features.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-gray-700">
                        <div className="w-4 h-4 rounded-full bg-emerald-100 text-[#006d37] flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CTA Button */}
                <div className="mt-8 pt-4">
                  <Button
                    variant={plan.popular ? 'primary' : 'outline'}
                    size="lg"
                    fullWidth
                    onClick={() => handleSelectPlan(plan.id)}
                    disabled={isCurrent}
                  >
                    {isCurrent ? 'Gói Hiện Tại Của Bạn' : plan.price === 0 ? 'Sử Dụng Miễn Phí' : 'Nâng Cấp Ngay'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 🌟 GÓI TIN LẺ DÀNH CHO CHỦ TRỌ 3 - 5 PHÒNG (THEO MÔ HÌNH MỚI 1 XU = 1.000Đ) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4">
        <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg border border-emerald-500/30">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-black border border-amber-400/40">
                <Sparkles className="w-3.5 h-3.5" /> TIN LẺ LINH HOẠT • 1 XU = 1.000Đ
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Bạn Chỉ Có 3 - 5 Phòng Và Không Cần Mua Gói Tháng?
              </h3>
              <p className="text-xs text-emerald-100/90 leading-relaxed">
                Sau 2 phòng đầu tiên được <strong>miễn phí vĩnh viễn</strong>, bạn có thể mua từng tin lẻ theo nhu cầu phát sinh thực tế. Mỗi tin hiển thị <strong>30 ngày</strong>, đặc biệt <strong>được tặng 1 lần đăng lại hoàn toàn miễn phí (0 Xu)</strong>!
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full lg:w-auto shrink-0">
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/15 text-left space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-emerald-300">Tin Lẻ 15 Ngày</span>
                  <span className="text-[10px] font-black bg-emerald-500/30 text-emerald-200 px-2 py-0.5 rounded-full">Linh hoạt</span>
                </div>
                <div className="text-xl font-black text-white">30 Xu <span className="text-xs text-slate-300 font-normal">(~30.000đ)</span></div>
                <p className="text-[11px] text-slate-300">Phù hợp phòng trọ hot cần cho thuê gấp trong nửa tháng.</p>
              </div>

              <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-amber-400/40 text-left space-y-1 relative">
                <span className="absolute -top-2.5 right-3 bg-amber-400 text-slate-950 text-[9px] font-black px-2 py-0.5 rounded-full">
                  TIẾT KIỆM
                </span>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-amber-300">Tin Lẻ 30 Ngày</span>
                  <span className="text-[10px] font-black bg-amber-500/30 text-amber-200 px-2 py-0.5 rounded-full">Chuẩn 30d</span>
                </div>
                <div className="text-xl font-black text-white">50 Xu <span className="text-xs text-slate-300 font-normal">(~50.000đ)</span></div>
                <p className="text-[11px] text-slate-300">Hiển thị trọn vẹn 30 ngày + tặng 1 lần đăng lại 0 Xu.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Comparison Table */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-3xl border border-gray-200 shadow-md p-6 sm:p-10">
          <div className="text-center max-w-xl mx-auto mb-8">
            <h2 className="text-2xl font-black text-gray-900">So Sánh Chi Tiết Các Gói</h2>
            <p className="text-xs text-gray-500 mt-1">
              Bảng so sánh chi tiết tính năng giúp bạn chọn giải pháp phù hợp nhất cho mô hình nhà trọ của mình.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-4 px-4 font-bold text-gray-900 w-1/3">Tính năng & Hạn mức</th>
                  <th className="py-4 px-4 font-bold text-gray-700 text-center">Gói Miễn Phí (0 Xu)</th>
                  <th className="py-4 px-4 font-bold text-[#006d37] text-center bg-emerald-50/50 rounded-t-xl">
                    Gói Cơ Bản (99 Xu)
                  </th>
                  <th className="py-4 px-4 font-bold text-amber-700 text-center">Gói Pro VIP (299 Xu)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="py-3.5 px-4 font-medium text-gray-800">Số lượng phòng đăng tối đa</td>
                  <td className="py-3.5 px-4 text-center font-bold text-gray-600">02 phòng</td>
                  <td className="py-3.5 px-4 text-center font-bold text-[#006d37] bg-emerald-50/50">10 phòng</td>
                  <td className="py-3.5 px-4 text-center font-bold text-amber-700">Không giới hạn</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-medium text-gray-800">Lượt Đẩy Tin Nổi Bật hàng tháng</td>
                  <td className="py-3.5 px-4 text-center text-gray-400">—</td>
                  <td className="py-3.5 px-4 text-center font-semibold text-gray-700 bg-emerald-50/50">
                    1 lượt (3 ngày)
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold text-amber-700">5 lượt VIP</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-medium text-gray-800">Thời gian duyệt tin</td>
                  <td className="py-3.5 px-4 text-center text-gray-600">Trong 24h</td>
                  <td className="py-3.5 px-4 text-center font-medium text-gray-700 bg-emerald-50/50">Ưu tiên 2h</td>
                  <td className="py-3.5 px-4 text-center font-bold text-emerald-600">Duyệt ngay (AI Auto)</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-medium text-gray-800">Huy hiệu Đối Tác Xác Thực Vàng</td>
                  <td className="py-3.5 px-4 text-center text-gray-400">—</td>
                  <td className="py-3.5 px-4 text-center text-gray-400 bg-emerald-50/50">—</td>
                  <td className="py-3.5 px-4 text-center">
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                      ⭐ Đối Tác Vàng
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-medium text-gray-800">Thống kê lượt xem & khách hỏi</td>
                  <td className="py-3.5 px-4 text-center text-gray-600">Cơ bản</td>
                  <td className="py-3.5 px-4 text-center text-gray-700 bg-emerald-50/50">Chi tiết theo tuần</td>
                  <td className="py-3.5 px-4 text-center font-medium text-gray-800">Báo cáo chuyên sâu</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-[#006d37] flex items-center justify-center mx-auto shadow-2xs">
            <HelpCircle className="w-5 h-5" />
          </div>
          <h2 className="text-2xl font-black text-gray-900">Câu Hỏi Thường Gặp (FAQ)</h2>
          <p className="text-xs text-gray-500">Mọi thắc mắc liên quan đến thanh toán và gia hạn gói dịch vụ</p>
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
                  onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                  className="w-full p-4 text-left flex items-center justify-between gap-4 font-bold text-sm text-gray-900 hover:text-[#006d37]"
                >
                  <span>{faq.q}</span>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-gray-500 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />}
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

        {/* Contact Support Box */}
        <div className="pt-4">
          <div className="p-6 bg-white rounded-3xl border border-gray-200 text-center space-y-3 shadow-2xs">
            <h3 className="text-sm font-bold text-gray-900">Còn thắc mắc về gói dịch vụ?</h3>
            <p className="text-xs text-gray-500">Đội ngũ hỗ trợ của Trọ Xinh luôn sẵn sàng tư vấn trực tiếp:</p>
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
              <a href="tel:0888110789" className="font-bold text-[#006d37] hover:underline flex items-center gap-1">
                📞 Gọi ngay: 0888 110 789
              </a>
              <span>•</span>
              <a
                href="https://zalo.me/0888110789"
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-emerald-800 hover:underline flex items-center gap-1"
              >
                💬 Zalo: 0888 110 789
              </a>
              <span>•</span>
              <a href="mailto:nguyenvuchinhb1hhb@gmail.com" className="font-medium text-gray-600 hover:underline flex items-center gap-1">
                📧 nguyenvuchinhb1hhb@gmail.com
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
