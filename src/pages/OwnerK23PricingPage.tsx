import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { DashboardSidebar } from '../components/layout/DashboardSidebar';
import { SEOHead } from '../components/seo/SEOHead';
import { useK23Subscription } from '../hooks/queries/useK23Subscription';
import { useAppStore } from '../store/useAppStore';
import { K23PlanCode } from '../types/k23';
import {
  K23_TRIAL_DAYS,
  calculateK23AmountXu,
  sanitizeReturnUrl,
} from '../lib/monetizationCatalog';
import {
  Check,
  Crown,
  Sparkles,
  Building2,
  ShieldCheck,
  HelpCircle,
  ArrowRight,
  Gift,
  Coins,
  Loader2,
} from 'lucide-react';
import { Button } from '../components/ui/Button';

export const OwnerK23PricingPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { currentUser, wallet, showToast } = useAppStore();
  const {
    plans,
    currentPlan,
    subscription,
    isActive,
    isTrial,
    hasUsedTrial,
    daysLeft,
    activateTrial,
    isActivatingTrial,
  } = useK23Subscription();

  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const safeReturnUrl = sanitizeReturnUrl(searchParams.get('returnUrl'), '');

  const handleSelectPlan = (planCode: K23PlanCode) => {
    const qs = new URLSearchParams({
      plan: planCode,
      cycle: billingCycle,
    });
    if (safeReturnUrl) {
      qs.set('returnUrl', safeReturnUrl);
    }
    const target = `/chu-tro/thanh-toan-goi?${qs.toString()}`;

    if (!currentUser) {
      navigate(`/dang-nhap?returnUrl=${encodeURIComponent(target)}`);
      return;
    }
    navigate(target);
  };

  const handleActivateTrial = async () => {
    if (!currentUser) {
      navigate(
        `/dang-nhap?returnUrl=${encodeURIComponent(
          safeReturnUrl ? `/chu-tro/goi-dich-vu?returnUrl=${encodeURIComponent(safeReturnUrl)}` : '/chu-tro/goi-dich-vu'
        )}`
      );
      return;
    }
    try {
      await activateTrial();
      showToast(
        'Kích hoạt dùng thử K23 thành công!',
        `Bạn có ${K23_TRIAL_DAYS} ngày sử dụng miễn phí gói Tiêu Chuẩn (tối đa 35 phòng & 3 tòa nhà).`,
        'success'
      );
      navigate(safeReturnUrl || '/chu-tro/hoa-don');
    } catch (err: any) {
      showToast(
        'Không thể kích hoạt dùng thử',
        err?.message || 'Tài khoản đã sử dụng lượt dùng thử trước đó.',
        'error'
      );
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <SEOHead
        title="Bảng Giá Hệ Thống Quản Lý Phòng Trọ K23 | Trọ Xinh"
        description="Quản lý phòng, khách thuê, hợp đồng và tính hóa đơn điện nước hằng tháng với gói Cơ Bản 49 Xu, Tiêu Chuẩn 129 Xu, Chuỗi 299 Xu."
        url="/chu-tro/goi-dich-vu"
      />
      <DashboardSidebar role="owner" />

      <main className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-8 pt-4 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-[#006d37] text-xs font-bold shadow-2xs">
            <Sparkles className="w-4 h-4 text-[#006d37]" />
            DỊCH VỤ 3 • HỆ THỐNG QUẢN LÝ PHÒNG TRỌ K23
          </div>
          <h1 className="text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
            Hệ Thống Quản Lý Phòng Trọ K23
          </h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Quản lý phòng, khách thuê, hợp đồng và tính hóa đơn điện nước hằng tháng. Thanh toán linh hoạt bằng{' '}
            <strong>Xu nội bộ</strong>, tách biệt hoàn toàn với Gói đăng phòng và Gói đẩy tin.
          </p>

          {currentUser && (
            <div className="flex justify-center">
              <Link
                to="/chu-tro/vi-xu"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-black transition"
              >
                <Coins className="w-3.5 h-3.5 text-amber-600" />
                <span>Số dư Xu: {(wallet?.total_xu ?? 0).toLocaleString('vi-VN')} Xu</span>
                <span className="text-[#006d37] underline ml-0.5">Nạp Xu →</span>
              </Link>
            </div>
          )}

          {/* Toggle Chỉ Tháng / Năm (Đóng 10 tặng 2) */}
          <div className="flex items-center justify-center pt-2">
            <div className="bg-slate-200/80 p-1.5 rounded-2xl flex items-center gap-1 shadow-inner">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  billingCycle === 'monthly'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Theo Tháng
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('yearly')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  billingCycle === 'yearly'
                    ? 'bg-[#006d37] text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Theo Năm</span>
                <span className="text-[10px] font-black bg-amber-400 text-amber-950 px-1.5 py-0.5 rounded-md">
                  Đóng 10 tặng 2
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Banner dùng thử 30 ngày gói Tiêu Chuẩn (0 Xu) */}
        <div className="max-w-5xl mx-auto mb-8">
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-amber-50 border border-emerald-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xs">
            <div className="flex items-center gap-3.5 text-left">
              <div className="w-11 h-11 rounded-2xl bg-[#006d37] text-white flex items-center justify-center shrink-0">
                <Gift className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-black text-slate-900">
                  {isTrial
                    ? `Bạn đang dùng thử gói Tiêu Chuẩn (còn ${daysLeft} ngày)`
                    : hasUsedTrial
                    ? 'Tài khoản đã sử dụng quyền dùng thử 30 ngày K23'
                    : `Dùng thử ${K23_TRIAL_DAYS} ngày gói Tiêu Chuẩn — 0 Xu`}
                </h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  Trải nghiệm đầy đủ quản lý tới 35 phòng, 3 tòa nhà, chốt điện nước và phát hành hóa đơn VietQR tự động. Trả năm đóng 10 tặng 2.
                </p>
              </div>
            </div>

            {!isTrial && !hasUsedTrial && !isActive && (
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleActivateTrial}
                disabled={isActivatingTrial}
                className="shrink-0 font-black cursor-pointer"
                leftIcon={
                  isActivatingTrial ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )
                }
              >
                {isActivatingTrial ? 'Đang kích hoạt...' : `Dùng thử ${K23_TRIAL_DAYS} ngày (0 Xu)`}
              </Button>
            )}
          </div>
        </div>

        {/* Pricing Cards Grid — 3 Gói (Xu only) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-7 items-stretch mb-16 max-w-6xl mx-auto">
          {plans.map((plan) => {
            const isPopular = plan.code === 'standard' || plan.is_popular;
            const isCurrent = Boolean(
              currentUser && isActive && currentPlan?.code === plan.code && !isTrial
            );

            const monthlyXu = plan.price_monthly;
            const yearlyTotalXu = calculateK23AmountXu(plan.code, 'yearly').amountXu;
            const effectiveMonthlyDisplayXu =
              billingCycle === 'yearly' ? Math.round(yearlyTotalXu / 12) : monthlyXu;

            return (
              <div
                key={plan.id}
                className={`relative rounded-3xl bg-white p-7 sm:p-8 flex flex-col justify-between transition-all duration-300 ${
                  isPopular
                    ? 'border-2 border-[#006d37] shadow-xl shadow-emerald-900/10 lg:scale-[1.03] z-10'
                    : 'border border-slate-200 shadow-sm hover:shadow-md'
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#006d37] text-white text-[11px] font-black uppercase tracking-wider px-4 py-1 rounded-full shadow-md flex items-center gap-1 whitespace-nowrap">
                    <Crown className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                    <span>PHỔ BIẾN NHẤT</span>
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        isPopular ? 'bg-emerald-50 text-[#006d37]' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      <Building2 className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                      {plan.max_rooms === -1 ? 'Không giới hạn phòng' : `Tối đa ${plan.max_rooms} phòng`} •{' '}
                      {plan.max_buildings === -1 ? '∞ tòa nhà' : `${plan.max_buildings} tòa nhà`}
                    </span>
                  </div>

                  <h3 className="text-xl font-extrabold text-slate-900">{plan.name}</h3>
                  <p className="text-xs text-slate-500 mt-1.5 min-h-[36px] leading-relaxed">
                    {plan.description}
                  </p>

                  {/* Price strictly in Xu */}
                  <div className="mt-5 pt-5 border-t border-slate-100">
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <span className="text-3xl sm:text-4xl font-black text-[#006d37] tracking-tight font-mono">
                        {effectiveMonthlyDisplayXu.toLocaleString('vi-VN')} Xu
                      </span>
                      <span className="text-xs font-bold text-slate-500">/ tháng</span>
                    </div>

                    {billingCycle === 'yearly' ? (
                      <div className="mt-2 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-xl text-[11px] text-emerald-800 font-bold">
                        Thanh toán 1 năm: <strong>{yearlyTotalXu.toLocaleString('vi-VN')} Xu/năm</strong> (Đóng 10 tặng 2)
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 mt-2 font-medium">
                        Hoặc trả theo năm chỉ <strong>{yearlyTotalXu.toLocaleString('vi-VN')} Xu/năm</strong> (tặng 2 tháng)
                      </p>
                    )}
                  </div>

                  {/* Features List */}
                  <ul className="mt-6 space-y-3 border-t border-slate-100 pt-5">
                    {plan.features.map((feat, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-xs text-slate-700">
                        <div className="w-4 h-4 rounded-full bg-emerald-100 text-[#006d37] flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                        <span className="leading-snug">{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* CTA */}
                <div className="mt-8 pt-2">
                  <Button
                    type="button"
                    disabled={isCurrent}
                    onClick={() => handleSelectPlan(plan.code)}
                    variant={isPopular ? 'primary' : 'outline'}
                    size="lg"
                    fullWidth
                    rightIcon={!isCurrent ? <ArrowRight className="w-4 h-4" /> : undefined}
                    className="font-bold cursor-pointer"
                  >
                    {isCurrent ? 'Đang sử dụng' : isPopular ? 'Chọn gói' : 'Bắt đầu ngay'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* FAQ */}
        <div className="max-w-4xl mx-auto bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm mb-8">
          <div className="flex items-center gap-2.5 mb-6">
            <HelpCircle className="w-6 h-6 text-[#006d37]" />
            <h3 className="text-xl font-bold text-slate-900">Câu Hỏi Thường Gặp Về K23</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-600 leading-relaxed">
            <div>
              <h4 className="font-bold text-slate-900 text-sm mb-1.5">
                Gói dùng thử 30 ngày bao gồm tính năng gì?
              </h4>
              <p>
                Mỗi chủ trọ được kích hoạt 1 lần duy nhất 30 ngày miễn phí gói <strong>Tiêu Chuẩn</strong> (tối đa 35 phòng &amp; 3 tòa nhà, 0 Xu), gồm chốt điện nước và phát hành hóa đơn VietQR.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm mb-1.5">
                Trả theo năm "Đóng 10 tặng 2" tính như thế nào?
              </h4>
              <p>
                Khi chọn chu kỳ Năm, bạn chỉ thanh toán 10 tháng Xu (Cơ Bản 490 Xu/năm, Tiêu Chuẩn 1.290 Xu/năm, Chuỗi 2.990 Xu/năm) và được sử dụng đủ 12 tháng.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm mb-1.5">
                Hết hạn gói thì dữ liệu phòng &amp; hóa đơn có mất không?
              </h4>
              <p>
                Không. Dữ liệu vẫn được bảo lưu an toàn. Bạn luôn có 7 ngày ân hạn để gia hạn qua Xu nội bộ, VietQR hoặc MoMo trước khi các tính năng tạo mới tạm khóa.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm mb-1.5">
                Gói K23 có gộp chung lượt đăng tin phòng không?
              </h4>
              <p>
                Không. Quản lý phòng trọ K23 là phần mềm vận hành độc lập; còn Gói đăng phòng (2 phòng đầu miễn phí) và Gói đẩy tin áp dụng riêng trên chợ tìm phòng.
              </p>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#006d37]" />
              Thanh toán an toàn qua Xu nội bộ, VietQR &amp; MoMo
            </span>
            <Link to="/chu-tro/quan-ly-goi-k23" className="text-[#006d37] font-bold hover:underline">
              Xem gói K23 của tôi →
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};
