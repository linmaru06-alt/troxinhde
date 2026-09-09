import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppStore, SUBSCRIPTION_PLANS } from '../store/useAppStore';
import { PaymentMethod, SubscriptionPlanId } from '../types';
import { SEOHead } from '../components/seo/SEOHead';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { formatCurrency } from '../components/ui/Cards';
import { createPaymentOrder } from '../lib/payos';
import { createMoMoPaymentOrder } from '../lib/momo';
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
  ExternalLink,
} from 'lucide-react';

interface PaymentViewData {
  method: PaymentMethod;
  orderCode: string | number;
  qrCode: string;
  amount: number;
  receiverTitle: string;
  receiverName: string;
  accountNumber: string;
  accountNumberLabel: string;
  badgeLabel: string;
  transferContent: string;
  deeplink?: string;
  payUrl?: string;
}

// Flag kiểm soát thanh toán: Tắt thanh toán tự động đến khi backend webhook được bảo mật hoàn toàn
const IS_ONLINE_PAYMENT_ENABLED = false;

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
  const [paymentData, setPaymentData] = useState<PaymentViewData | null>(null);
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
  } = usePaymentPolling(
    paymentData ? paymentData.orderCode : null,
    selectedPlan.id,
    totalAmount,
    paymentData ? paymentData.method : 'vietqr'
  );

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
      if (currentUser?.isDemoAccount) {
        // Chế độ Sandbox cho tài khoản Demo: Không gọi API thanh toán thật
        const mockOrderCode = `DEMO_${Date.now().toString().slice(-6)}`;
        setPaymentData({
          method: paymentMethod,
          orderCode: mockOrderCode,
          qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=DEMO_PAYMENT_${mockOrderCode}`,
          amount: totalAmount,
          receiverTitle: 'Môi trường Thử Nghiệm (Sandbox)',
          receiverName: 'TRỌ XINH SANDBOX DEMO',
          accountNumber: '9999DEMO8888',
          accountNumberLabel: 'Mã thử nghiệm',
          badgeLabel: 'Demo Sandbox',
          transferContent: `TROXINH ${mockOrderCode}`,
        });
        setIsProcessing(false);
        showToast('Chế độ Demo Sandbox 🧪', 'Tài khoản demo sử dụng giao dịch giả lập không mất tiền thật.', 'info');
        return;
      }

      if (paymentMethod === 'vietqr' || paymentMethod === 'banking') {
        const res = await createPaymentOrder({
          planId: selectedPlan.id,
          userId: currentUser?.id || 'guest_user',
          amount: totalAmount,
        });

        setPaymentData({
          method: 'vietqr',
          orderCode: res.orderCode,
          qrCode: res.qrCode,
          amount: res.amount,
          receiverTitle: 'Ngân hàng nhận',
          receiverName: res.bankInfo.accountName,
          accountNumber: res.bankInfo.accountNumber,
          accountNumberLabel: 'Số tài khoản',
          badgeLabel: 'Techcombank',
          transferContent: res.bankInfo.transferContent,
          payUrl: res.checkoutUrl,
        });
        setIsProcessing(false);
      } else if (paymentMethod === 'momo') {
        const momoRes = await createMoMoPaymentOrder({
          planId: selectedPlan.id,
          planName: selectedPlan.name,
          userId: currentUser?.id || 'guest_user',
          amount: totalAmount,
        });

        setPaymentData({
          method: 'momo',
          orderCode: momoRes.orderId,
          qrCode: momoRes.qrCode,
          amount: momoRes.amount,
          receiverTitle: 'Ví MoMo nhận',
          receiverName: momoRes.momoInfo.receiverName,
          accountNumber: momoRes.momoInfo.phoneNumber,
          accountNumberLabel: 'Số điện thoại MoMo',
          badgeLabel: 'MoMo',
          transferContent: momoRes.momoInfo.transferContent,
          deeplink: momoRes.deeplink,
          payUrl: momoRes.payUrl,
        });
        setIsProcessing(false);
      } else {
        // Fallback VietQR
        const res = await createPaymentOrder({
          planId: selectedPlan.id,
          userId: currentUser?.id || 'guest_user',
          amount: totalAmount,
        });
        setPaymentData({
          method: 'vietqr',
          orderCode: res.orderCode,
          qrCode: res.qrCode,
          amount: res.amount,
          receiverTitle: 'Ngân hàng nhận',
          receiverName: res.bankInfo.accountName,
          accountNumber: res.bankInfo.accountNumber,
          accountNumberLabel: 'Số tài khoản',
          badgeLabel: 'Techcombank',
          transferContent: res.bankInfo.transferContent,
          payUrl: res.checkoutUrl,
        });
        setIsProcessing(false);
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

        {/* Thông báo bảo trì nâng cấp hạ tầng thanh toán an toàn */}
        {!IS_ONLINE_PAYMENT_ENABLED && (
          <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 mb-6 flex items-start gap-3.5 shadow-xs animate-fadeIn">
            <div className="p-2 bg-amber-100 text-amber-700 rounded-2xl shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-black text-amber-950">
                Hệ thống thanh toán tự động đang nâng cấp hạ tầng bảo mật
              </h3>
              <p className="text-xs text-amber-800 leading-relaxed">
                Để đảm bảo tính xác thực và an toàn tuyệt đối, cổng thanh toán tự động đang được kết nối với hệ thống Webhook bảo mật. Vui lòng liên hệ CSKH hoặc bộ phận duyệt gói của Trọ Xinh để hoàn tất thủ công trong thời gian này.
              </p>
            </div>
          </div>
        )}

        {/* LIVE QR PAYMENT ACTIVE VIEW (VIETQR / MOMO) */}
        {paymentData ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Col: Dynamic QR Code Box */}
            <div className="lg:col-span-7 bg-white rounded-3xl border border-gray-200 shadow-md p-6 sm:p-8 space-y-6 text-center">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div className="text-left">
                  {paymentData.method === 'momo' ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#a50064] bg-pink-50 px-2.5 py-1 rounded-full border border-pink-200">
                      <Smartphone className="w-3.5 h-3.5" /> Thanh toán Ví MoMo QR 24/7
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#006d37] bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                      <QrCode className="w-3.5 h-3.5" /> Chuyển khoản VietQR 24/7
                    </span>
                  )}
                  <h3 className="text-base font-extrabold text-gray-900 mt-1">
                    {paymentData.method === 'momo'
                      ? 'Quét mã bằng App MoMo hoặc Ngân hàng'
                      : 'Quét mã bằng App Ngân hàng bất kỳ'}
                  </h3>
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
              <div
                className={`relative mx-auto w-64 h-64 bg-white p-3 rounded-2xl border-2 shadow-lg flex items-center justify-center ${
                  paymentData.method === 'momo' ? 'border-[#a50064]' : 'border-emerald-600'
                }`}
              >
                <img
                  src={paymentData.qrCode}
                  alt={paymentData.method === 'momo' ? 'MoMo QR TroXinh' : 'VietQR TroXinh'}
                  className="w-full h-full object-contain rounded-xl"
                />
              </div>

              <p className="text-xs text-gray-500 font-medium">
                {paymentData.method === 'momo' ? (
                  <>
                    Mở ứng dụng <strong>MoMo</strong> hoặc bất kỳ App Ngân hàng và chọn <strong>Quét mã QR</strong>
                  </>
                ) : (
                  <>
                    Mở ứng dụng Ngân hàng (MB, VCB, Techcombank, BIDV, VPBank...) và chọn <strong>Quét mã QR</strong>
                  </>
                )}
              </p>

              {/* Deeplink for MoMo App on Mobile & Web Gateway */}
              {paymentData.method === 'momo' && (
                <div className="space-y-2 pt-1">
                  <a
                    href={paymentData.deeplink || `https://me.momo.vn/${paymentData.accountNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2.5 w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-[#A50064] to-[#D82D8B] hover:opacity-95 text-white font-extrabold text-sm transition shadow-md active:scale-98"
                  >
                    <Smartphone className="w-5 h-5" />
                    <span>Mở App MoMo Thanh Toán 1-Chạm</span>
                    <ExternalLink className="w-4 h-4 ml-1 opacity-80" />
                  </a>
                  <p className="text-[11px] text-gray-400">
                    💡 Trên điện thoại, bấm nút trên để tự động mở ứng dụng MoMo và xác thực FaceID / Vân tay
                  </p>
                </div>
              )}

              <p className="text-xs text-emerald-800 font-medium">
                Cần hỗ trợ? Zalo / Hotline: <a href="https://zalo.me/0888110789" target="_blank" rel="noopener noreferrer" className="underline font-bold">0888 110 789</a>
              </p>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-2">
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  onClick={triggerManualSuccess}
                  leftIcon={<CheckCircle2 className="w-5 h-5" />}
                  className={`font-bold shadow-md ${
                    paymentData.method === 'momo'
                      ? 'bg-[#A50064] hover:bg-[#8C0054] text-white border-none'
                      : ''
                  }`}
                >
                  {paymentData.method === 'momo' ? 'Xác Nhận Đã Chuyển MoMo' : 'Tôi Đã Chuyển Khoản Xong'}
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
                {paymentData.method === 'momo' ? (
                  <Smartphone className="w-4 h-4 text-[#a50064]" />
                ) : (
                  <Building className="w-4 h-4 text-[#006d37]" />
                )}
                Thông Tin Chuyển Khoản Chi Tiết
              </h3>

              <div className="space-y-3 text-xs">
                {/* Receiver Entity */}
                <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                  <span className="text-gray-500 text-[11px]">{paymentData.receiverTitle}</span>
                  <div className="flex items-center justify-between font-bold text-gray-900">
                    <span>
                      {paymentData.method === 'momo'
                        ? 'Ví Điện Tử MoMo (Napas QR)'
                        : 'Ngân hàng TMCP Kỹ Thương Việt Nam (Techcombank)'}
                    </span>
                    <Badge
                      variant="verified"
                      size="sm"
                      className={paymentData.method === 'momo' ? 'bg-pink-100 text-[#a50064] border-pink-200' : ''}
                    >
                      {paymentData.badgeLabel}
                    </Badge>
                  </div>
                </div>

                {/* Account / Phone Number */}
                <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                  <span className="text-gray-500 text-[11px]">{paymentData.accountNumberLabel}</span>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-black text-gray-900 tracking-wider">
                      {paymentData.accountNumber}
                    </span>
                    <button
                      onClick={() => handleCopy(paymentData.accountNumber, 'acc')}
                      className={`inline-flex items-center gap-1 font-bold hover:underline ${
                        paymentData.method === 'momo' ? 'text-[#a50064]' : 'text-[#006d37]'
                      }`}
                    >
                      {copiedField === 'acc' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedField === 'acc' ? 'Đã chép' : 'Sao chép'}
                    </button>
                  </div>
                </div>

                {/* Account Name */}
                <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                  <span className="text-gray-500 text-[11px]">Chủ tài khoản nhận</span>
                  <p className="font-bold text-gray-900 uppercase">{paymentData.receiverName}</p>
                </div>

                {/* Amount */}
                <div
                  className={`p-3 rounded-xl space-y-1 border ${
                    paymentData.method === 'momo'
                      ? 'bg-pink-50/70 border-pink-200'
                      : 'bg-emerald-50/70 border-emerald-200'
                  }`}
                >
                  <span
                    className={`text-[11px] font-medium ${
                      paymentData.method === 'momo' ? 'text-[#a50064]' : 'text-emerald-800'
                    }`}
                  >
                    Số tiền chính xác
                  </span>
                  <div className="flex items-center justify-between">
                    <span
                      className={`font-black text-base ${
                        paymentData.method === 'momo' ? 'text-[#a50064]' : 'text-[#006d37]'
                      }`}
                    >
                      {formatCurrency(paymentData.amount)}
                    </span>
                    <button
                      onClick={() => handleCopy(String(paymentData.amount), 'amount')}
                      className={`inline-flex items-center gap-1 font-bold hover:underline ${
                        paymentData.method === 'momo' ? 'text-[#a50064]' : 'text-[#006d37]'
                      }`}
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
                      {paymentData.transferContent}
                    </span>
                    <button
                      onClick={() => handleCopy(paymentData.transferContent, 'content')}
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
                <span>
                  Hệ thống tự động kích hoạt gói dịch vụ trong 5-30 giây ngay sau khi hệ thống nhận được giao dịch.
                </span>
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
                        ? 'border-[#A50064] bg-pink-50/50 shadow-xs ring-2 ring-pink-500/20'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center border-gray-300 peer-checked:border-[#A50064]">
                        {paymentMethod === 'momo' && (
                          <div className="w-2.5 h-2.5 rounded-full bg-[#A50064]" />
                        )}
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#A50064] to-[#D82D8B] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                        MoMo
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                          <span>Ví Điện Tử MoMo (Dynamic QR & Deeplink)</span>
                          <span className="text-[10px] font-extrabold bg-[#A50064] text-white px-1.5 py-0.2 rounded-full">
                            OFFICIAL
                          </span>
                        </p>
                        <p className="text-[11px] text-gray-500">Mở App MoMo thanh toán 1-chạm hoặc quét mã QR tự động điền tiền</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-[#A50064] bg-pink-100 px-2 py-0.5 rounded-md">
                      Tức thì ⚡
                    </span>
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
                  variant={IS_ONLINE_PAYMENT_ENABLED ? 'primary' : 'outline'}
                  size="lg"
                  fullWidth
                  disabled={!IS_ONLINE_PAYMENT_ENABLED}
                  isLoading={isProcessing}
                  onClick={
                    IS_ONLINE_PAYMENT_ENABLED
                      ? handleCheckout
                      : () =>
                          showToast(
                            'Cổng thanh toán đang bảo trì',
                            'Vui lòng liên hệ CSKH hoặc Hotline để kích hoạt gói dịch vụ thủ công.',
                            'warning'
                          )
                  }
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  {IS_ONLINE_PAYMENT_ENABLED
                    ? `Tạo Mã Thanh Toán ${formatCurrency(totalAmount)}`
                    : 'Thanh toán trực tuyến tạm đóng'}
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
