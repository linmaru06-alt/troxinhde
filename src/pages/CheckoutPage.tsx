import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppStore, SUBSCRIPTION_PLANS } from '../store/useAppStore';
import { PaymentMethod, SubscriptionPlanId } from '../types';
import { SEOHead } from '../components/seo/SEOHead';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { formatCurrency } from '../components/ui/Cards';
import {
  ShieldCheck,
  Lock,
  CreditCard,
  QrCode,
  Smartphone,
  Building,
  CheckCircle2,
  Tag,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  HelpCircle,
  AlertCircle,
} from 'lucide-react';

export const CheckoutPage: React.FC = () => {
  const { planId } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const {
    currentUser,
    upgradeSubscription,
    validateCoupon,
    showToast,
  } = useAppStore();

  const selectedPlan =
    SUBSCRIPTION_PLANS.find((p) => p.id === planId) || SUBSCRIPTION_PLANS[1];

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('momo');
  const [couponCode, setCouponCode] = useState<string>('');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [couponMessage, setCouponMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Pricing calculations
  const basePrice = selectedPlan.price;
  const discountAmount = Math.round((basePrice * discountPercent) / 100);
  const priceAfterDiscount = basePrice - discountAmount;
  const vatAmount = Math.round(priceAfterDiscount * 0.08); // 8% VAT
  const totalAmount = priceAfterDiscount + vatAmount;

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;

    const result = validateCoupon(couponCode);
    if (result.valid) {
      setDiscountPercent(result.discountPercent);
      setCouponMessage({ text: result.message, error: false });
      showToast('Áp dụng mã giảm giá thành công!', result.message, 'success');
    } else {
      setDiscountPercent(0);
      setCouponMessage({ text: result.message, error: true });
      showToast('Mã không hợp lệ', result.message, 'error');
    }
  };

  const handleCheckout = async () => {
    setIsProcessing(true);

    try {
      // Simulate real gateway processing
      await new Promise((resolve) => setTimeout(resolve, 800));

      const tx = upgradeSubscription(selectedPlan.id as SubscriptionPlanId, paymentMethod, totalAmount);

      // Navigate to payment result page
      navigate(`/thanh-toan/ket-qua?orderId=${tx.orderId}&amount=${totalAmount}&plan=${selectedPlan.id}&method=${paymentMethod}&status=success`);
    } catch (err: any) {
      showToast('Thanh toán gặp lỗi', 'Vui lòng thử lại hoặc liên hệ hỗ trợ', 'error');
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/60 py-10">
      <SEOHead
        title="Thanh Toán Đơn Hàng | TroXinh Hà Nội"
        description="Hoàn tất thanh toán nâng cấp gói dịch vụ chủ trọ an toàn, bảo mật qua MoMo, VNPay hoặc Chuyển khoản."
        url={`/thanh-toan/${planId}`}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Breadcrumb Back link */}
        <Link
          to="/nang-cap"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-[#006d37] transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại bảng giá</span>
        </Link>

        {/* Page Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-gray-200">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Thanh Toán Gói Dịch Vụ
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Kiểm tra thông tin đơn hàng và lựa chọn phương thức thanh toán an toàn
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 w-fit">
            <Lock className="w-3.5 h-3.5" />
            <span>Mã hóa bảo mật 256-bit SSL</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left 2 Cols: Payment Method Selection */}
          <div className="lg:col-span-2 space-y-6">
            {/* Payment Method Selector */}
            <div className="bg-white rounded-3xl border border-gray-200 shadow-xs p-6 space-y-5">
              <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-[#006d37]" />
                Chọn Phương Thức Thanh Toán
              </h2>

              <div className="space-y-3">
                {/* 1. MoMo */}
                <label
                  onClick={() => setPaymentMethod('momo')}
                  className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition ${
                    paymentMethod === 'momo'
                      ? 'border-[#a50064] bg-pink-50/40 shadow-xs'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center border-gray-300 peer-checked:border-[#a50064]">
                      {paymentMethod === 'momo' && (
                        <div className="w-2.5 h-2.5 rounded-full bg-[#a50064]" />
                      )}
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-[#a50064] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-2xs">
                      MoMo
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">Ví Điện Tử MoMo</p>
                      <p className="text-[11px] text-gray-500">Quét mã QR hoặc thanh toán tức thì qua App MoMo</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                    Khuyên dùng ⚡
                  </span>
                </label>

                {/* 2. VNPay QR */}
                <label
                  onClick={() => setPaymentMethod('vnpay')}
                  className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition ${
                    paymentMethod === 'vnpay'
                      ? 'border-[#005ba9] bg-blue-50/40 shadow-xs'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center border-gray-300 peer-checked:border-[#005ba9]">
                      {paymentMethod === 'vnpay' && (
                        <div className="w-2.5 h-2.5 rounded-full bg-[#005ba9]" />
                      )}
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-[#005ba9] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-2xs">
                      VNPAY
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">Cổng VNPay QR / Mobile Banking</p>
                      <p className="text-[11px] text-gray-500">Hỗ trợ 40+ ngân hàng Việt Nam (VCB, Vietinbank, BIDV...)</p>
                    </div>
                  </div>
                  <QrCode className="w-5 h-5 text-gray-400" />
                </label>

                {/* 3. Bank Transfer */}
                <label
                  onClick={() => setPaymentMethod('banking')}
                  className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition ${
                    paymentMethod === 'banking'
                      ? 'border-[#006d37] bg-emerald-50/40 shadow-xs'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center border-gray-300 peer-checked:border-[#006d37]">
                      {paymentMethod === 'banking' && (
                        <div className="w-2.5 h-2.5 rounded-full bg-[#006d37]" />
                      )}
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-[#006d37] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-2xs">
                      <Building className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900">Chuyển Khoản Ngân Hàng Trực Tiếp</p>
                      <p className="text-[11px] text-gray-500">Tự động kích hoạt gói ngay khi nhận được thanh toán</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-gray-400">24/7</span>
                </label>
              </div>
            </div>

            {/* Coupon Code Section */}
            <div className="bg-white rounded-3xl border border-gray-200 shadow-xs p-6 space-y-4">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Tag className="w-4 h-4 text-[#006d37]" />
                Mã Giảm Giá / Khuyến Mãi
              </h2>

              <form onSubmit={handleApplyCoupon} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nhập mã (vd: TROXINH50, SINHVIEN)"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold uppercase tracking-wider focus:outline-none focus:border-[#006d37] bg-gray-50/50"
                />
                <Button type="submit" variant="outline" size="sm">
                  Áp Dụng
                </Button>
              </form>

              {couponMessage && (
                <p
                  className={`text-xs font-medium flex items-center gap-1.5 ${
                    couponMessage.error ? 'text-rose-600' : 'text-emerald-700'
                  }`}
                >
                  {couponMessage.error ? <AlertCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  {couponMessage.text}
                </p>
              )}

              <p className="text-[11px] text-gray-400">
                Gợi ý mã ưu đãi: Thử nhập <span className="font-bold text-gray-700">TROXINH50</span> để giảm 50% hoặc <span className="font-bold text-gray-700">SINHVIEN</span> để giảm 20%.
              </p>
            </div>
          </div>

          {/* Right Col: Order Summary Card */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-gray-200 shadow-md p-6 space-y-6 sticky top-24">
              <h2 className="text-base font-extrabold text-gray-900 pb-3 border-b border-gray-100">
                Tóm Tắt Đơn Hàng
              </h2>

              {/* Plan Card Mini */}
              <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-extrabold text-gray-900">{selectedPlan.name}</span>
                  <Badge variant="verified" size="sm">
                    {selectedPlan.period}
                  </Badge>
                </div>
                <p className="text-xs text-gray-600">
                  Hạn mức: <strong className="text-[#006d37]">{selectedPlan.roomLimit === 999 ? 'Không giới hạn' : `${selectedPlan.roomLimit} phòng`}</strong>
                </p>
              </div>

              {/* Financial Breakdowns */}
              <div className="space-y-2.5 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span>Giá gói</span>
                  <span className="font-bold text-gray-900">{formatCurrency(basePrice)}</span>
                </div>

                {discountPercent > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Mã giảm giá ({discountPercent}%)</span>
                    <span>- {formatCurrency(discountAmount)}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>Thuế GTGT (VAT 8%)</span>
                  <span className="font-semibold text-gray-800">{formatCurrency(vatAmount)}</span>
                </div>

                <div className="pt-3 border-t border-gray-200 flex justify-between items-baseline">
                  <span className="text-sm font-extrabold text-gray-900">Tổng thanh toán</span>
                  <span className="text-xl font-black text-[#006d37]">
                    {formatCurrency(totalAmount)}
                  </span>
                </div>
              </div>

              {/* CTA Payment Submit */}
              <Button
                variant="primary"
                size="lg"
                fullWidth
                isLoading={isProcessing}
                onClick={handleCheckout}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Thanh Toán {formatCurrency(totalAmount)}
              </Button>

              <div className="space-y-2 pt-2 text-[11px] text-gray-400 text-center">
                <p className="flex items-center justify-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Bảo đảm hoàn tiền trong 7 ngày nếu không hài lòng
                </p>
                <p>Bằng việc thanh toán, bạn đồng ý với Điều khoản dịch vụ của TroXinh.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
