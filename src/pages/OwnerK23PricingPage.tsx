import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardSidebar } from '../components/layout/DashboardSidebar';
import { SEOHead } from '../components/seo/SEOHead';
import { useK23Subscription } from '../hooks/queries/useK23Subscription';
import { K23PlanCode, K23BillingCycle } from '../types/k23';
import { formatCurrency } from '../components/ui/Cards';
import {
  Check,
  Crown,
  Sparkles,
  Zap,
  Building2,
  ShieldCheck,
  HelpCircle,
  ArrowRight,
  Gift,
} from 'lucide-react';
import { Button } from '../components/ui/Button';

export const OwnerK23PricingPage: React.FC = () => {
  const navigate = useNavigate();
  const { plans, currentPlan, subscription, isTrial } = useK23Subscription();
  const [billingCycle, setBillingCycle] = useState<K23BillingCycle>('yearly');

  const handleSelectPlan = (planCode: K23PlanCode) => {
    navigate(`/chu-tro/thanh-toan-goi?plan=${planCode}&cycle=${billingCycle}`);
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <SEOHead
        title="Bảng Giá Dịch Vụ Quản Lý Nhà Trọ K23 | Trọ Xinh"
        description="Bảng giá phần mềm quản lý phòng trọ K23: chốt điện nước, hóa đơn VietQR tự động, quản lý khách thuê."
      />
      <DashboardSidebar role="owner" />

      <main className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-10 pt-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-50 border border-primary-200 text-primary-700 text-xs font-bold mb-4 shadow-sm">
            <Sparkles className="w-4 h-4 text-primary-600" />
            HỆ THỐNG QUẢN LÝ NHÀ TRỌ K23 CHUYÊN NGHIỆP
          </div>
          <h1 className="text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
            Bảng Giá Đơn Giản, Minh Bạch & Tối Ưu Cho Chủ Trọ
          </h1>
          <p className="text-base text-slate-600 leading-relaxed">
            Chọn gói cước phù hợp với quy mô phòng trọ của bạn. Tự động hóa hoàn toàn khâu chốt điện nước, xuất hóa đơn A5 và thu tiền qua VietQR.
          </p>

          {/* Toggle Chu kỳ Tháng / Năm */}
          <div className="flex items-center justify-center mt-8">
            <div className="bg-slate-200/80 p-1.5 rounded-2xl flex items-center shadow-inner">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  billingCycle === 'monthly'
                    ? 'bg-white text-slate-900 shadow-md'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Thanh toán theo tháng
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('yearly')}
                className={`relative px-5 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                  billingCycle === 'yearly'
                    ? 'bg-primary-600 text-white shadow-md'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Thanh toán theo năm</span>
                <span className="text-[11px] font-extrabold bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                  <Gift className="w-3 h-3" /> Đóng 10 tặng 2
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* 3 Pricing Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16 items-stretch">
          {plans.map((plan) => {
            const isPro = plan.code === 'pro';
            const isEnterprise = plan.code === 'enterprise';
            const isCurrent = !isTrial && subscription?.status === 'active' && currentPlan?.code === plan.code;
            const price = billingCycle === 'yearly' ? plan.price_yearly : plan.price_monthly;
            const monthlyEquivalent = billingCycle === 'yearly' ? Math.round(plan.price_yearly / 12) : plan.price_monthly;

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-3xl transition-all duration-300 ${
                  isPro
                    ? 'bg-white border-2 border-primary-500 shadow-xl shadow-primary-500/10 scale-100 lg:-translate-y-2'
                    : 'bg-white border border-slate-200 shadow-sm hover:shadow-md'
                } p-6 sm:p-8`}
              >
                {/* Popular Badge */}
                {isPro && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary-600 to-indigo-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-md flex items-center gap-1.5">
                    <Crown className="w-3.5 h-3.5 text-amber-300" />
                    LỰA CHỌN PHỔ BIẾN NHẤT
                  </div>
                )}

                {/* Plan Header */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                    {isEnterprise && (
                      <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-full">
                        Chuỗi lớn
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 min-h-[32px] leading-relaxed">
                    {plan.description}
                  </p>
                </div>

                {/* Price Display */}
                <div className="mb-6 pb-6 border-b border-slate-100">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-extrabold text-slate-900 tracking-tight">
                      {formatCurrency(monthlyEquivalent)}
                    </span>
                    <span className="text-slate-500 text-sm font-medium">/ tháng</span>
                  </div>

                  {billingCycle === 'yearly' ? (
                    <div className="text-xs font-semibold text-emerald-600 mt-2 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5" />
                      Thanh toán {formatCurrency(price)} / năm (Tiết kiệm 2 tháng)
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 mt-2">
                      Gia hạn từng tháng một
                    </div>
                  )}
                </div>

                {/* Key Quota Highlights */}
                <div className="bg-slate-50 rounded-xl p-3.5 mb-6 space-y-2 text-xs font-medium text-slate-700">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Giới hạn quy mô:</span>
                    <span className="font-bold text-slate-900">
                      {plan.max_rooms === -1 ? 'Không giới hạn phòng' : `Tối đa ${plan.max_rooms} phòng`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Số tòa nhà quản lý:</span>
                    <span className="font-bold text-slate-900">
                      {plan.max_buildings === -1 ? 'Không giới hạn tòa' : `Tối đa ${plan.max_buildings} tòa nhà`}
                    </span>
                  </div>
                </div>

                {/* Features List */}
                <div className="flex-1 space-y-3 mb-8">
                  <p className="text-xs font-bold text-slate-900 tracking-wider uppercase">Tính năng nổi bật:</p>
                  {plan.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-600">
                      <div className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                      <span className="leading-tight">{feat}</span>
                    </div>
                  ))}
                </div>

                {/* CTA Button */}
                <Button
                  onClick={() => handleSelectPlan(plan.code)}
                  disabled={isCurrent}
                  className={`w-full py-3 text-sm font-bold rounded-xl transition-all shadow-sm ${
                    isCurrent
                      ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                      : isPro
                      ? 'bg-primary-600 hover:bg-primary-700 text-white shadow-primary-500/25 shadow-lg'
                      : 'bg-slate-900 hover:bg-slate-800 text-white'
                  }`}
                >
                  {isCurrent ? (
                    'Gói bạn đang dùng'
                  ) : (
                    <span className="inline-flex items-center justify-center gap-2">
                      Chọn {plan.name} <ArrowRight className="w-4 h-4" />
                    </span>
                  )}
                </Button>
              </div>
            );
          })}
        </div>

        {/* FAQ Section */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 max-w-4xl mx-auto shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-primary-50 text-primary-600 rounded-xl">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Câu hỏi thường gặp về gói cước K23</h2>
              <p className="text-xs text-slate-500">Mọi thắc mắc của chủ trọ đều được giải đáp rõ ràng</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div className="space-y-2">
              <h4 className="font-bold text-slate-900">1. Dùng thử 30 ngày có cần nhập thẻ ngân hàng không?</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Hoàn toàn <strong>KHÔNG</strong>. Chủ trọ được tự động kích hoạt Gói Tiêu Chuẩn 30 ngày ngay khi tạo tài khoản để trải nghiệm toàn bộ tính năng mà không bị trừ bất kỳ chi phí nào.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-slate-900">2. Khi hết hạn gói cước dữ liệu phòng có bị xóa không?</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Dữ liệu của bạn được <strong>bảo lưu an toàn 100%</strong> trong tối thiểu 12 tháng. Hệ thống chỉ tạm khóa tính năng tạo phòng mới và phát hành hóa đơn mới cho đến khi bạn gia hạn.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-slate-900">3. Tôi có thể nâng cấp từ Gói Cơ Bản lên Gói Pro không?</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Có. Bạn có thể nâng cấp bất kỳ lúc nào. Hệ thống sẽ tự động tính toán thời hạn còn lại và quy đổi sang gói mới để bạn không bị thiệt thòi chi phí.
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-slate-900">4. Thanh toán qua hình thức nào? Bao lâu thì kích hoạt?</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                Hệ thống hỗ trợ quét mã VietQR ngân hàng (MB, VCB, Techcombank,...) hoặc cổng PayOS. Gói dịch vụ được <strong>tự động kích hoạt ngay lập tức</strong> sau khi chuyển khoản thành công.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

