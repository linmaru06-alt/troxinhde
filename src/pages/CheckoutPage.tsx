import React, { useState } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '../store/useAppStore';
import { PaymentMethod, SubscriptionPlanId } from '../types';
import { SEOHead } from '../components/seo/SEOHead';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { formatCurrency } from '../components/ui/Cards';
import { usePaymentPolling } from '../hooks/usePaymentPolling';
import {
  LISTING_PLANS,
  getListingPlanById,
  calculateListingPlanAmountXu,
  applyDiscountToXu,
  validateMonetizationCoupon,
  XU_TO_VND_RATE,
  sanitizeReturnUrl,
} from '../lib/monetizationCatalog';
import {
  purchaseListingPlanWithXu,
  createServicePaymentOrder,
  confirmDemoServiceOrder,
} from '../lib/api/monetization';
import { isSupabaseConfigured } from '../lib/supabase';
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
  Gift,
  X,
  Coins,
  RefreshCw,
  FlaskConical,
} from 'lucide-react';

interface PaymentViewData {
  method: 'vietqr' | 'momo';
  orderCode: string;
  qrCode: string;
  amountVnd: number;
  amountXu: number;
  receiverTitle: string;
  receiverName: string;
  accountNumber: string;
  accountNumberLabel: string;
  badgeLabel: string;
  transferContent: string;
  deeplink?: string;
  isSandbox?: boolean;
}

const AVAILABLE_VOUCHERS = [
  {
    code: 'TROXINH50',
    discountPercent: 50,
    title: 'Ưu Đãi Đặc Biệt 50%',
    description: 'Giảm 50% tổng Xu thanh toán gói đăng phòng Trọ Xinh',
    badge: 'Hot nhất',
    minSpend: 'Áp dụng mọi gói',
  },
  {
    code: 'CHUTROVIP',
    discountPercent: 25,
    title: 'Đặc Quyền Chủ Trọ VIP',
    description: 'Giảm 25% gói Tin nổi bật và Gói Pro',
    badge: 'Chủ trọ VIP',
    minSpend: 'Áp dụng mọi gói',
  },
  {
    code: 'SINHVIEN',
    discountPercent: 20,
    title: 'Đồng Hành Sinh Viên',
    description: 'Giảm 20% hỗ trợ chủ trọ mới',
    badge: 'Ưu đãi 20%',
    minSpend: 'Áp dụng mọi gói',
  },
  {
    code: 'BANMOI',
    discountPercent: 10,
    title: 'Chào Bạn Mới Gia Nhập',
    description: 'Giảm 10% cho đơn đăng phòng đầu tiên',
    badge: 'Bạn mới',
    minSpend: 'Áp dụng mọi gói',
  },
];

export const CheckoutPage: React.FC = () => {
  const { planId } = useParams<{ planId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const {
    currentUser,
    wallet,
    spendXu,
    upgradeSubscription,
    fetchWallet,
    showToast,
  } = useAppStore();

  const selectedPlan = getListingPlanById(planId) || LISTING_PLANS[2];
  const initialCycleParam = searchParams.get('cycle');
  const safeReturnUrl = sanitizeReturnUrl(searchParams.get('returnUrl'), '');

  const [billingCycle, setBillingCycle] = useState<'one_time' | 'monthly' | 'yearly'>(() => {
    if (selectedPlan.billingType === 'one_time') return 'one_time';
    return initialCycleParam === 'yearly' ? 'yearly' : 'monthly';
  });

  const effectiveCycle: 'one_time' | 'monthly' | 'yearly' =
    selectedPlan.billingType === 'one_time'
      ? 'one_time'
      : billingCycle === 'yearly'
      ? 'yearly'
      : 'monthly';
  const apiCycle: 'monthly' | 'yearly' = effectiveCycle === 'yearly' ? 'yearly' : 'monthly';

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('wallet_xu');
  const [couponCode, setCouponCode] = useState<string>('');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [couponMessage, setCouponMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isConfirmingDemo, setIsConfirmingDemo] = useState<boolean>(false);
  const [paymentData, setPaymentData] = useState<PaymentViewData | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState<boolean>(false);

  const baseXu = calculateListingPlanAmountXu(selectedPlan.id, apiCycle).baseXu;
  const finalXu = applyDiscountToXu(baseXu, discountPercent);
  const discountXu = Math.max(0, baseXu - finalXu);
  const totalAmountVnd = finalXu * XU_TO_VND_RATE;
  const walletBalanceXu = wallet?.total_xu ?? 0;
  const isEnoughXu = walletBalanceXu >= finalXu;

  const {
    countdownText,
    isChecking,
    recheckStatus,
    resetPayment,
  } = usePaymentPolling(
    paymentData ? paymentData.orderCode : null,
    selectedPlan.id,
    totalAmountVnd,
    paymentData ? paymentData.method : 'vietqr',
    () => {
      if (currentUser?.id) {
        fetchWallet(currentUser.id);
        queryClient.invalidateQueries({ queryKey: ['owner-listing-quota', currentUser.id] });
      }
    },
    {
      billingCycle: apiCycle,
      amountXu: finalXu,
      returnUrl: safeReturnUrl,
    }
  );

  const currentCheckoutPath = `${location.pathname}${location.search}`;
  const walletTopupUrl = `${
    currentUser?.role === 'owner' ? '/chu-tro/vi-xu' : '/vi-xu'
  }?buoc=chon-goi&returnUrl=${encodeURIComponent(currentCheckoutPath)}`;

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    showToast('Đã sao chép', text, 'info');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleApplyVoucherFromList = (code: string) => {
    setCouponCode(code);
    const result = validateMonetizationCoupon(code);
    if (result.valid) {
      setDiscountPercent(result.discountPercent);
      setCouponMessage({ text: result.message, error: false });
      showToast('Áp dụng mã giảm giá thành công!', result.message, 'success');
    }
    setIsVoucherModalOpen(false);
  };

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponCode.trim()) return;

    const result = validateMonetizationCoupon(couponCode);
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

  const navigateToSuccessResult = (orderCode: string, methodUsed: PaymentMethod) => {
    const qs = new URLSearchParams({
      service: 'listing_plan',
      orderId: orderCode,
      amount: String(totalAmountVnd),
      amountXu: String(finalXu),
      plan: selectedPlan.id,
      cycle: effectiveCycle,
      method: methodUsed,
      status: 'success',
    });
    if (safeReturnUrl) {
      qs.set('returnUrl', safeReturnUrl);
    }
    navigate(`/thanh-toan/ket-qua?${qs.toString()}`);
  };

  const handleCheckout = async () => {
    if (!currentUser) {
      navigate(`/dang-nhap?returnUrl=${encodeURIComponent(currentCheckoutPath)}`);
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Thanh toán 1 chạm bằng Số dư Xu nội bộ
      if (paymentMethod === 'wallet_xu') {
        if (!isEnoughXu) {
          showToast(
            'Số dư Xu không đủ',
            `Bạn cần ${finalXu} Xu (hiện có ${walletBalanceXu} Xu). Vui lòng nạp thêm Xu hoặc chọn VietQR/MoMo.`,
            'warning'
          );
          setIsProcessing(false);
          return;
        }

        if (isSupabaseConfigured) {
          const res = await purchaseListingPlanWithXu({
            planId: selectedPlan.id,
            billingCycle: apiCycle,
            couponCode: discountPercent > 0 ? couponCode : undefined,
          });
          await fetchWallet(currentUser.id);
          await queryClient.invalidateQueries({ queryKey: ['owner-listing-quota', currentUser.id] });
          upgradeSubscription(selectedPlan.id as SubscriptionPlanId, 'wallet_xu', totalAmountVnd);
          navigateToSuccessResult(res.order_code || `TXGOI_${Date.now().toString().slice(-6)}`, 'wallet_xu');
          return;
        }

        // Demo offline fallback
        const localSpendOk = await spendXu(
          finalXu,
          `Thanh toán ${selectedPlan.name} (${effectiveCycle})`,
          selectedPlan.id
        );
        if (!localSpendOk) {
          setIsProcessing(false);
          return;
        }
        upgradeSubscription(selectedPlan.id as SubscriptionPlanId, 'wallet_xu', totalAmountVnd);
        navigateToSuccessResult(`TXGOI_${Date.now().toString().slice(-6)}`, 'wallet_xu');
        return;
      }

      // 2. Thanh toán trực tiếp VietQR / MoMo qua Server Order
      const selectedChannel: 'vietqr' | 'momo' = paymentMethod === 'momo' ? 'momo' : 'vietqr';
      const orderRes = await createServicePaymentOrder({
        serviceType: 'listing_plan',
        itemId: selectedPlan.id,
        billingCycle: apiCycle,
        couponCode: discountPercent > 0 ? couponCode : undefined,
        method: selectedChannel,
      });

      setPaymentData({
        method: selectedChannel,
        orderCode: orderRes.orderCode,
        qrCode: orderRes.qrCode,
        amountVnd: orderRes.amountVnd,
        amountXu: orderRes.amountXu,
        receiverTitle: selectedChannel === 'momo' ? 'Ví MoMo nhận' : 'Ngân hàng nhận',
        receiverName: orderRes.receiverInfo.accountName,
        accountNumber: orderRes.receiverInfo.accountNumber,
        accountNumberLabel: selectedChannel === 'momo' ? 'Số điện thoại MoMo' : 'Số tài khoản',
        badgeLabel: selectedChannel === 'momo' ? 'MoMo' : 'Techcombank',
        transferContent: orderRes.transferContent,
        deeplink: orderRes.deeplink,
        isSandbox: orderRes.isSandbox,
      });
    } catch (err: any) {
      showToast('Không thể tạo giao dịch', err?.message || 'Vui lòng thử lại hoặc liên hệ hỗ trợ.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmDemoSandbox = async () => {
    if (!paymentData || !currentUser?.isDemoAccount) return;
    setIsConfirmingDemo(true);
    try {
      await confirmDemoServiceOrder(paymentData.orderCode);
      await recheckStatus();
    } catch (err: any) {
      showToast('Lỗi xác nhận Demo Sandbox', err?.message || 'Vui lòng thử lại.', 'error');
    } finally {
      setIsConfirmingDemo(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/60 py-10">
      <SEOHead
        title={`Thanh Toán ${selectedPlan.name} | Trọ Xinh`}
        description="Hoàn tất thanh toán gói đăng phòng bằng Xu nội bộ, VietQR hoặc MoMo."
        url={`/thanh-toan/${selectedPlan.id}`}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <Link
          to={safeReturnUrl ? `/bang-gia?returnUrl=${encodeURIComponent(safeReturnUrl)}` : '/bang-gia'}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-[#006d37] transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại bảng giá gói đăng phòng</span>
        </Link>

        {/* Page Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-gray-200">
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-[#006d37]">
              Dịch vụ 1 • Gói đăng phòng
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Thanh Toán {selectedPlan.name}
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Thanh toán 1 chạm bằng Xu nội bộ hoặc quét mã VietQR / MoMo đối soát tự động
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 w-fit">
            <Lock className="w-3.5 h-3.5" />
            <span>Xác thực Webhook bảo mật</span>
          </div>
        </div>

        {/* LIVE QR PAYMENT ACTIVE VIEW (VIETQR / MOMO) */}
        {paymentData ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
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

                <div className="text-right">
                  <span className="text-[11px] text-gray-400 block">Hết hạn sau</span>
                  <span className="text-sm font-black text-rose-600 font-mono flex items-center gap-1 justify-end">
                    <Clock className="w-3.5 h-3.5" />
                    {countdownText}
                  </span>
                </div>
              </div>

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
                    Mở ứng dụng <strong>MoMo</strong> hoặc App Ngân hàng hỗ trợ VietQR và quét mã trên.
                  </>
                ) : (
                  <>
                    Mở App Ngân hàng (Techcombank, VCB, MB, BIDV, VPBank...) và chọn <strong>Quét mã QR</strong>.
                  </>
                )}
              </p>

              {paymentData.method === 'momo' && paymentData.deeplink && (
                <div className="space-y-2 pt-1">
                  <a
                    href={paymentData.deeplink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2.5 w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-[#A50064] to-[#D82D8B] hover:opacity-95 text-white font-extrabold text-sm transition shadow-md"
                  >
                    <Smartphone className="w-5 h-5" />
                    <span>Mở App MoMo Thanh Toán</span>
                    <ExternalLink className="w-4 h-4 ml-1 opacity-80" />
                  </a>
                </div>
              )}

              {/* Polling / Demo actions */}
              <div className="space-y-2.5 pt-2">
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  isLoading={isChecking}
                  onClick={recheckStatus}
                  leftIcon={<RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />}
                  className={`font-bold shadow-md cursor-pointer ${
                    paymentData.method === 'momo'
                      ? 'bg-[#A50064] hover:bg-[#8C0054] text-white border-none'
                      : ''
                  }`}
                >
                  {isChecking ? 'Đang kiểm tra đối soát...' : 'Kiểm tra lại trạng thái giao dịch'}
                </Button>

                {currentUser?.isDemoAccount && (
                  <Button
                    variant="outline"
                    size="md"
                    fullWidth
                    isLoading={isConfirmingDemo}
                    onClick={handleConfirmDemoSandbox}
                    leftIcon={<FlaskConical className="w-4 h-4 text-amber-600" />}
                    className="border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold cursor-pointer"
                  >
                    Xác nhận Demo Sandbox (Tài khoản Demo)
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  fullWidth
                  onClick={() => {
                    setPaymentData(null);
                    resetPayment();
                  }}
                  leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                  className="text-gray-500 cursor-pointer"
                >
                  Hủy &amp; Đổi Phương Thức Khác
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
                <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                  <span className="text-gray-500 text-[11px]">{paymentData.receiverTitle}</span>
                  <div className="flex items-center justify-between font-bold text-gray-900">
                    <span>
                      {paymentData.method === 'momo'
                        ? 'Ví Điện Tử MoMo'
                        : 'Ngân hàng TMCP Kỹ Thương (Techcombank)'}
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

                <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                  <span className="text-gray-500 text-[11px]">{paymentData.accountNumberLabel}</span>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-black text-gray-900 tracking-wider">
                      {paymentData.accountNumber}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(paymentData.accountNumber, 'acc')}
                      className={`inline-flex items-center gap-1 font-bold hover:underline cursor-pointer ${
                        paymentData.method === 'momo' ? 'text-[#a50064]' : 'text-[#006d37]'
                      }`}
                    >
                      {copiedField === 'acc' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedField === 'acc' ? 'Đã chép' : 'Sao chép'}
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                  <span className="text-gray-500 text-[11px]">Chủ tài khoản nhận</span>
                  <p className="font-bold text-gray-900 uppercase">{paymentData.receiverName}</p>
                </div>

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
                    Số tiền chính xác ({paymentData.amountXu} Xu)
                  </span>
                  <div className="flex items-center justify-between">
                    <span
                      className={`font-black text-base ${
                        paymentData.method === 'momo' ? 'text-[#a50064]' : 'text-[#006d37]'
                      }`}
                    >
                      {formatCurrency(paymentData.amountVnd)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(String(paymentData.amountVnd), 'amount')}
                      className={`inline-flex items-center gap-1 font-bold hover:underline cursor-pointer ${
                        paymentData.method === 'momo' ? 'text-[#a50064]' : 'text-[#006d37]'
                      }`}
                    >
                      {copiedField === 'amount' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedField === 'amount' ? 'Đã chép' : 'Sao chép'}
                    </button>
                  </div>
                </div>

                <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl space-y-1">
                  <span className="text-amber-800 text-[11px] font-bold">Nội dung chuyển khoản (BẮT BUỘC)</span>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm font-black text-amber-950 bg-amber-100 px-2 py-0.5 rounded">
                      {paymentData.transferContent}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(paymentData.transferContent, 'content')}
                      className="inline-flex items-center gap-1 text-amber-900 font-bold hover:underline cursor-pointer"
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
                  Hệ thống tự động đối soát qua Webhook và kích hoạt gói ngay sau khi nhận được chuyển khoản.
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left 2 Cols: Cycle & Payment Method */}
            <div className="lg:col-span-2 space-y-6">
              {selectedPlan.billingType === 'subscription' && (
                <div className="bg-white rounded-3xl border border-gray-200 shadow-xs p-6 space-y-3">
                  <h2 className="text-sm font-extrabold text-gray-900">Chu kỳ thanh toán</h2>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setBillingCycle('monthly')}
                      className={`p-3.5 rounded-2xl border-2 text-left transition cursor-pointer ${
                        effectiveCycle === 'monthly'
                          ? 'border-[#006d37] bg-emerald-50/40'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-xs font-bold text-gray-900 block">Theo Tháng</span>
                      <span className="text-sm font-black text-[#006d37] font-mono">
                        {selectedPlan.priceXu.toLocaleString('vi-VN')} Xu / tháng
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setBillingCycle('yearly')}
                      className={`p-3.5 rounded-2xl border-2 text-left transition cursor-pointer relative ${
                        effectiveCycle === 'yearly'
                          ? 'border-[#006d37] bg-emerald-50/40'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="absolute -top-2.5 right-3 bg-amber-400 text-amber-950 text-[10px] font-black px-2 py-0.5 rounded-full">
                        Giảm 20%
                      </span>
                      <span className="text-xs font-bold text-gray-900 block">Theo Năm</span>
                      <span className="text-sm font-black text-[#006d37] font-mono">
                        {(selectedPlan.yearlyPriceXu ?? selectedPlan.priceXu * 12).toLocaleString('vi-VN')} Xu / năm
                      </span>
                    </button>
                  </div>
                </div>
              )}

              {/* Payment Method Selector */}
              <div className="bg-white rounded-3xl border border-gray-200 shadow-xs p-6 space-y-5">
                <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-[#006d37]" />
                  Chọn Phương Thức Thanh Toán
                </h2>

                <div className="space-y-3">
                  {/* 1. Ví Xu nội bộ (Ưu tiên số 1) */}
                  <label
                    onClick={() => setPaymentMethod('wallet_xu')}
                    className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition ${
                      paymentMethod === 'wallet_xu'
                        ? 'border-amber-500 bg-amber-50/40 shadow-xs ring-2 ring-amber-400/20'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center border-gray-300">
                        {paymentMethod === 'wallet_xu' && (
                          <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                        )}
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                        <Coins className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">Thanh toán bằng Xu nội bộ (1 chạm)</p>
                        <p className="text-[11px] text-gray-500">
                          Số dư khả dụng:{' '}
                          <strong className={isEnoughXu ? 'text-[#006d37]' : 'text-rose-600'}>
                            {walletBalanceXu.toLocaleString('vi-VN')} Xu
                          </strong>
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                      Nhanh nhất
                    </span>
                  </label>

                  {paymentMethod === 'wallet_xu' && !isEnoughXu && (
                    <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <span className="text-amber-900">
                        Số dư thiếu <strong>{(finalXu - walletBalanceXu).toLocaleString('vi-VN')} Xu</strong> để thanh toán đơn này.
                      </span>
                      <Link
                        to={walletTopupUrl}
                        className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-center shrink-0 transition"
                      >
                        Nạp thêm Xu ngay →
                      </Link>
                    </div>
                  )}

                  {/* 2. VietQR */}
                  <label
                    onClick={() => setPaymentMethod('vietqr')}
                    className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition ${
                      paymentMethod === 'vietqr'
                        ? 'border-[#006d37] bg-emerald-50/40 shadow-xs ring-2 ring-emerald-500/10'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center border-gray-300">
                        {paymentMethod === 'vietqr' && (
                          <div className="w-2.5 h-2.5 rounded-full bg-[#006d37]" />
                        )}
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-[#006d37] text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <QrCode className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">Chuyển khoản VietQR (Techcombank)</p>
                        <p className="text-[11px] text-gray-500">
                          Quy đổi {finalXu.toLocaleString('vi-VN')} Xu = {formatCurrency(totalAmountVnd)}
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                      Tự động 24/7
                    </span>
                  </label>

                  {/* 3. MoMo */}
                  <label
                    onClick={() => setPaymentMethod('momo')}
                    className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition ${
                      paymentMethod === 'momo'
                        ? 'border-[#A50064] bg-pink-50/50 shadow-xs ring-2 ring-pink-500/20'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center border-gray-300">
                        {paymentMethod === 'momo' && (
                          <div className="w-2.5 h-2.5 rounded-full bg-[#A50064]" />
                        )}
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#A50064] to-[#D82D8B] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                        MoMo
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">Ví Điện Tử MoMo QR</p>
                        <p className="text-[11px] text-gray-500">
                          Quét mã qua App MoMo ({formatCurrency(totalAmountVnd)})
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-[#A50064] bg-pink-100 px-2 py-0.5 rounded-md">
                      Tức thì
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

                <div className="space-y-3">
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

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => setIsVoucherModalOpen(true)}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#006d37] hover:text-[#005229] transition bg-emerald-50 hover:bg-emerald-100/80 px-3 py-1.5 rounded-xl border border-emerald-200/80 cursor-pointer shadow-2xs"
                    >
                      <Gift className="w-3.5 h-3.5 text-amber-500" />
                      <span>Kho Voucher (4 mã sẵn có)</span>
                    </button>
                    {discountPercent > 0 && (
                      <span className="text-xs font-bold text-emerald-700">Đang giảm {discountPercent}%</span>
                    )}
                  </div>
                </div>

                {couponMessage && (
                  <p
                    className={`text-xs font-medium flex items-center gap-1.5 ${
                      couponMessage.error ? 'text-rose-600' : 'text-emerald-700'
                    }`}
                  >
                    {couponMessage.error ? (
                      <AlertCircle className="w-3.5 h-3.5" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    {couponMessage.text}
                  </p>
                )}
              </div>
            </div>

            {/* Right Col: Order Summary Card */}
            <div className="space-y-6">
              <div className="bg-white rounded-3xl border border-gray-200 shadow-md p-6 space-y-6 sticky top-24">
                <h2 className="text-base font-extrabold text-gray-900 pb-3 border-b border-gray-100">
                  Tóm Tắt Đơn Hàng
                </h2>

                <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-extrabold text-gray-900">{selectedPlan.name}</span>
                    <Badge variant="verified" size="sm">
                      {effectiveCycle === 'yearly'
                        ? '1 Năm'
                        : effectiveCycle === 'monthly'
                        ? '1 Tháng'
                        : selectedPlan.periodLabel}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600">
                    Hạn mức:{' '}
                    <strong className="text-[#006d37]">
                      {selectedPlan.roomLimit === -1
                        ? 'Không giới hạn phòng'
                        : `${selectedPlan.roomLimit} phòng`}
                    </strong>
                  </p>
                </div>

                <div className="space-y-2.5 text-xs text-gray-600">
                  <div className="flex justify-between items-center">
                    <span>Giá gói:</span>
                    <span className="font-bold text-gray-900 font-mono">{baseXu.toLocaleString('vi-VN')} Xu</span>
                  </div>

                  {discountPercent > 0 && (
                    <div className="flex justify-between items-center text-emerald-700 font-semibold">
                      <span>Giảm giá ({discountPercent}%):</span>
                      <span className="font-mono">-{discountXu.toLocaleString('vi-VN')} Xu</span>
                    </div>
                  )}

                  <div className="pt-3 border-t border-gray-200 flex justify-between items-baseline">
                    <span className="text-sm font-extrabold text-gray-900">Tổng thanh toán:</span>
                    <div className="text-right">
                      <span className="text-2xl font-black text-[#006d37] font-mono">
                        {finalXu.toLocaleString('vi-VN')} Xu
                      </span>
                      {paymentMethod !== 'wallet_xu' && (
                        <span className="text-xs font-semibold text-gray-500 block mt-0.5">
                          ({formatCurrency(totalAmountVnd)})
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  isLoading={isProcessing}
                  disabled={paymentMethod === 'wallet_xu' && !isEnoughXu}
                  onClick={handleCheckout}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  className="font-black cursor-pointer"
                >
                  {paymentMethod === 'wallet_xu'
                    ? `Thanh toán ${finalXu.toLocaleString('vi-VN')} Xu ngay`
                    : `Tạo mã QR (${formatCurrency(totalAmountVnd)})`}
                </Button>

                <div className="space-y-2 pt-2 text-[11px] text-gray-400 text-center">
                  <p className="flex items-center justify-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    Xu sẽ được trừ ngay khi xác nhận thanh toán.
                  </p>
                  <p>
                    Xem thêm tại{' '}
                    <Link to="/terms" className="text-[#006d37] underline font-semibold">
                      Điều khoản dịch vụ
                    </Link>
                    .
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODAL KHO VOUCHER */}
      {isVoucherModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-200 space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-black">
                  <Gift className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-black text-base text-gray-900">Kho Voucher Ưu Đãi</h3>
                  <p className="text-xs text-gray-500">Chọn voucher để áp dụng trực tiếp cho gói đăng phòng</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsVoucherModalOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center text-sm transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {AVAILABLE_VOUCHERS.map((voucher) => (
                <div
                  key={voucher.code}
                  className="p-4 rounded-2xl border-2 border-emerald-100 hover:border-[#006d37] bg-emerald-50/30 transition flex items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-sm text-[#006d37] bg-white px-2.5 py-1 rounded-lg border border-emerald-200 shadow-2xs">
                        {voucher.code}
                      </span>
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                        {voucher.badge}
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-gray-900">{voucher.title}</h4>
                    <p className="text-[11px] text-gray-500 leading-tight">{voucher.description}</p>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    variant={couponCode === voucher.code ? 'outline' : 'primary'}
                    onClick={() => handleApplyVoucherFromList(voucher.code)}
                    className="shrink-0 font-bold"
                  >
                    {couponCode === voucher.code ? 'Đang Dùng' : 'Áp Dụng'}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
