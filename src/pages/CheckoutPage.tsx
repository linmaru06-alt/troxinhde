import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppStore, SUBSCRIPTION_PLANS } from '../store/useAppStore';
import { PaymentMethod, SubscriptionPlanId } from '../types';
import { SEOHead } from '../components/seo/SEOHead';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { formatCurrency } from '../components/ui/Cards';
import { createPaymentOrder, PaymentLinkResponse } from '../lib/payos';
import { usePaymentPolling } from '../hooks/usePaymentPolling';
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
  Copy,
  Clock,
  RotateCcw,
  AlertCircle,
  Check,
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

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('vietqr');
  const [couponCode, setCouponCode] = useState<string>('');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [couponMessage, setCouponMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [paymentData, setPaymentData] = useState<PaymentLinkResponse | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Pricing calculations
  const basePrice = selectedPlan.price;
  const discountAmount = Math.round((basePrice * discountPercent) / 100);
  const priceAfterDiscount = basePrice - discountAmount;
  const vatAmount = 0; // Giai đoạn đầu: Chưa áp dụng VAT (Cá nhân kinh doanh)
  const totalAmount = priceAfterDiscount;

  // Real-time payment polling hook
  const {
    status: paymentStatus,
    countdownText,
    triggerManualSuccess,
    resetPayment,
  } = usePaymentPolling(paymentData ? paymentData.orderCode : null, selectedPlan.id, totalAmount);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    showToast('Đã sao chép vào bộ nhớ tạm', text, 'info');
    setTimeout(() => setCopiedField(null), 2000);
  };

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
      if (paymentMethod === 'vietqr' || paymentMethod === 'banking') {
        const res = await createPaymentOrder({
          planId: selectedPlan.id,
          userId: currentUser?.id || 'guest_user',
          amount: totalAmount,
        });

        setPaymentData(res);
        setIsProcessing(false);
      } else {
        // MoMo Gateway
        await new Promise((resolve) => setTimeout(resolve, 800));
        const tx = upgradeSubscription(selectedPlan.id as SubscriptionPlanId, 'momo', totalAmount);
        navigate(`/thanh-toan/ket-qua?orderId=${tx.orderId}&amount=${totalAmount}&plan=${selectedPlan.id}&method=momo&status=success`);
      }
    } catch (err: any) {
      showToast('Thanh toán gặp lỗi', 'Vui lòng thử lại hoặc liên hệ hỗ trợ', 'error');
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/60 py-10">
      <SEOHead
        title="Thanh Toán Đơn Hàng | TroXinh Hà Nội"
        description="Hoàn tất thanh toán nâng cấp gói dịch vụ chủ trọ an toàn, bảo mật qua VietQR hoặc Ví MoMo."
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

        {/* LIVE VIETQR PAYMENT ACTIVE VIEW */}
        {paymentData ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Col: VietQR Code Box */}
            <div className="lg:col-span-7 bg-white rounded-3xl border border-gray-200 shadow-md p-6 sm:p-8 space-y-6 text-center">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div className="text-left">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#006d37] bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                    <QrCode className="w-3.5 h-3.5" /> Chuyển khoản VietQR 24/7
                  </span>
                  <h3 className="text-base font-extrabold text-gray-900 mt-1">Quét mã bằng App Ngân hàng bất kỳ</h3>
                </div>

                {/* Countdown Timer */}
                <div className="text-right">
                  <span className="text-[11px] text-gray-400 block">Hết hạn sau</span>
                  <span className="text-sm font-black text-rose-600 font-mono flex items-center gap-1 justify-end">
                    <Clock className="w-3.5 h-3.5 animate-spin" />
                    {countdownText}
                  </span>
                </div>
              </div>

              {/* Dynamic QR Code Image */}
              <div className="relative mx-auto w-64 h-64 bg-white p-3 rounded-2xl border-2 border-emerald-600 shadow-lg flex items-center justify-center">
                <img
                  src={paymentData.qrCode}
                  alt="VietQR TroXinh"
                  className="w-full h-full object-contain rounded-xl"
                />
              </div>

              <p className="text-xs text-gray-500 font-medium">
                Mở ứng dụng Ngân hàng (MB, VCB, Techcombank, BIDV, VPBank...) và chọn <strong>Quét mã QR</strong>
              </p>
              <p className="text-xs text-emerald-800 font-medium">
                Cần hỗ trợ? Zalo: <a href="https://zalo.me/0888110789" target="_blank" rel="noopener noreferrer" className="underline font-bold">0888 110 789</a>
              </p>

              {/* Action Buttons */}
              <div className="space-y-3 pt-2">
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={triggerManualSuccess}
                  leftIcon={<CheckCircle2 className="w-5 h-5" />}
                  className="font-bold shadow-md"
                >
                  Tôi Đã Chuyển Khoản Xong
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  fullWidth
                  onClick={() => {
                    setPaymentData(null);
                    resetPayment();
                  }}
                  leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                  className="text-gray-500"
                >
                  Hủy & Đổi Phương Thức Khác
                </Button>
              </div>
            </div>

            {/* Right Col: Transfer Info Details */}
            <div className="lg:col-span-5 bg-white rounded-3xl border border-gray-200 shadow-md p-6 space-y-5">
              <h3 className="font-extrabold text-gray-900 text-sm pb-3 border-b border-gray-100 flex items-center gap-2">
                <Building className="w-4 h-4 text-[#006d37]" />
                Thông Tin Chuyển Khoản Thủ Công
              </h3>

              <div className="space-y-3 text-xs">
                {/* Bank */}
                <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                  <span className="text-gray-500 text-[11px]">Ngân hàng nhận</span>
                  <div className="flex items-center justify-between font-bold text-gray-900">
                    <span>{paymentData.bankInfo.bankName}</span>
                    <Badge variant="verified" size="sm">MB</Badge>
                  </div>
                </div>

                {/* Account Number */}
                <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                  <span className="text-gray-500 text-[11px]">Số tài khoản</span>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-black text-gray-900 tracking-wider">
                      {paymentData.bankInfo.accountNumber}
                    </span>
                    <button
                      onClick={() => handleCopy(paymentData.bankInfo.accountNumber, 'acc')}
                      className="inline-flex items-center gap-1 text-[#006d37] font-bold hover:underline"
                    >
                      {copiedField === 'acc' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedField === 'acc' ? 'Đã chép' : 'Sao chép'}
                    </button>
                  </div>
                </div>

                {/* Account Name */}
                <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                  <span className="text-gray-500 text-[11px]">Chủ tài khoản</span>
                  <p className="font-bold text-gray-900 uppercase">{paymentData.bankInfo.accountName}</p>
                </div>

                {/* Amount */}
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1">
                  <span className="text-emerald-800 text-[11px] font-medium">Số tiền chính xác</span>
                  <div className="flex items-center justify-between">
                    <span className="font-black text-base text-[#006d37]">
                      {formatCurrency(paymentData.bankInfo.amount)}
                    </span>
                    <button
                      onClick={() => handleCopy(String(paymentData.bankInfo.amount), 'amount')}
                      className="inline-flex items-center gap-1 text-[#006d37] font-bold hover:underline"
                    >
                      {copiedField === 'amount' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedField === 'amount' ? 'Đã chép' : 'Sao chép'}
                    </button>
                  </div>
                </div>

                {/* Transfer Content */}
                <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl space-y-1">
                  <span className="text-amber-800 text-[11px] font-bold">Nội dung chuyển khoản (BẮT BUỘC)</span>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-black text-amber-950 bg-amber-100 px-2 py-0.5 rounded">
                      {paymentData.bankInfo.transferContent}
                    </span>
                    <button
                      onClick={() => handleCopy(paymentData.bankInfo.transferContent, 'content')}
                      className="inline-flex items-center gap-1 text-amber-900 font-bold hover:underline"
                    >
                      {copiedField === 'content' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedField === 'content' ? 'Đã chép' : 'Sao chép'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-blue-50 text-blue-800 rounded-xl text-[11px] flex items-start gap-2">
                <Sparkles className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
                <span>Hệ thống tự động kích hoạt gói dịch vụ trong 5-30 giây ngay sau khi ngân hàng nhận được tiền.</span>
              </div>
            </div>
          </div>
        ) : (
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
                  {/* 1. VietQR (Primary Recommended) */}
                  <label
                    onClick={() => setPaymentMethod('vietqr')}
                    className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition ${
                      paymentMethod === 'vietqr' || paymentMethod === 'banking'
                        ? 'border-[#006d37] bg-emerald-50/40 shadow-xs ring-2 ring-emerald-500/10'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center border-gray-300 peer-checked:border-[#006d37]">
                        {(paymentMethod === 'vietqr' || paymentMethod === 'banking') && (
                          <div className="w-2.5 h-2.5 rounded-full bg-[#006d37]" />
                        )}
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-[#006d37] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-2xs">
                        <QrCode className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">Chuyển Khoản VietQR / PayOS</p>
                        <p className="text-[11px] text-gray-500">Quét mã QR tự động điền số tiền & nội dung qua 40+ App Ngân hàng</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                      Khuyên dùng ⚡
                    </span>
                  </label>

                  {/* 2. MoMo */}
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
                        <p className="text-[11px] text-gray-500">Thanh toán tức thì qua App MoMo</p>
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
                    <span>Thuế GTGT (VAT)</span>
                    <span className="font-medium text-gray-500">Chưa áp dụng (0đ)</span>
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
                  Tạo Mã Thanh Toán {formatCurrency(totalAmount)}
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
        )}
      </div>
    </div>
  );
};
