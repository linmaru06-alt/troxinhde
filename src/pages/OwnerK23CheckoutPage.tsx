import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { DashboardSidebar } from '../components/layout/DashboardSidebar';
import { SEOHead } from '../components/seo/SEOHead';
import { useAppStore } from '../store/useAppStore';
import { useK23Subscription } from '../hooks/queries/useK23Subscription';
import { K23PlanCode, K23BillingCycle, K23SubscriptionOrder } from '../types/k23';
import { generateVietQrUrl } from '../lib/vietqr';
import { formatCurrency } from '../components/ui/Cards';
import { Button } from '../components/ui/Button';
import { generateInvoicePDF } from '../lib/generateInvoice';
import {
  QrCode,
  ShieldCheck,
  Clock,
  Copy,
  CheckCircle2,
  ArrowLeft,
  Building2,
  Sparkles,
  Loader2,
  Coins,
  Rocket,
  Smartphone,
  FileDown,
  Receipt,
  Check,
} from 'lucide-react';

export const OwnerK23CheckoutPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const {
    plans,
    createOrder,
    confirmOrder,
    activateTrial,
    isCreatingOrder,
    isConfirmingOrder,
    isActivatingTrial,
  } = useK23Subscription();
  const { wallet, spendXu, showToast, currentUser } = useAppStore();

  const planCode = (searchParams.get('plan') as K23PlanCode) || 'pro';
  const billingCycle = (searchParams.get('cycle') as K23BillingCycle) || 'yearly';

  const selectedPlan = plans.find((p) => p.code === planCode) || plans[1];
  const isTrialStarter = selectedPlan.code === 'starter';

  // Tính số tiền và số Xu chính xác theo chu kỳ (Tháng / Quý / Năm)
  let amount = 0;
  if (!isTrialStarter) {
    if (billingCycle === 'quarterly') {
      amount = selectedPlan?.price_quarterly ?? Math.round((selectedPlan?.price_monthly || 199000) * 3 * 0.9);
    } else if (billingCycle === 'yearly') {
      amount = selectedPlan?.price_yearly ?? Math.round((selectedPlan?.price_monthly || 199000) * 12 * 0.8);
    } else {
      amount = selectedPlan?.price_monthly || 199000;
    }
  }

  const amountXu = Math.round(amount / 1000);
  const hasEnoughXu = wallet.total_xu >= amountXu;

  const [paymentMethod, setPaymentMethod] = useState<'wallet_xu' | 'vietqr' | 'momo'>('wallet_xu');
  const [order, setOrder] = useState<K23SubscriptionOrder | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(15 * 60); // 15 mins
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isProcessingXu, setIsProcessingXu] = useState<boolean>(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);

  // Tài khoản ngân hàng nhận tiền của Trọ Xinh
  const troXinhBank = {
    bankId: 'MB',
    bankName: 'MBBank - Ngân hàng Quân Đội',
    accountNo: '0868886868',
    accountName: 'CONG TY TRO XINH VIET NAM',
  };

  const momoReceiver = {
    phone: '0888110789',
    name: 'NGUYEN VU CHINH (TRO XINH)',
  };

  // 1. Tạo order khi vào trang (nếu không phải gói thử nghiệm 0đ)
  useEffect(() => {
    let isMounted = true;
    if (!isTrialStarter) {
      createOrder({ planCode, billingCycle }).then((createdOrder) => {
        if (isMounted) {
          setOrder(createdOrder);
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [planCode, billingCycle, createOrder, isTrialStarter]);

  // 2. Countdown timer 15:00
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    showToast('Đã sao chép vào bộ nhớ tạm', text, 'info');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const transferContent = order?.order_code ? `K23 ${order.order_code}` : 'K23 DICH VU';

  const qrUrl = generateVietQrUrl({
    bankId: troXinhBank.bankId,
    accountNo: troXinhBank.accountNo,
    accountName: troXinhBank.accountName,
    amount: amount,
    description: transferContent,
    template: 'compact2',
  });

  const momoQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
    `2|99|${momoReceiver.phone}|${momoReceiver.name}|${currentUser?.email || ''}|0|0|${amount}|${transferContent}|transfer_mycode`
  )}`;

  // Kích hoạt Dùng Thử 2 Tháng (0đ)
  const handleActivateTrial = async () => {
    try {
      await activateTrial();
      setIsSuccess(true);
      showToast('Kích hoạt dùng thử thành công! 🎉', 'Bạn có 60 ngày trải nghiệm miễn phí 100% phần mềm K23.', 'success');
      setTimeout(() => {
        navigate('/chu-tro/quan-ly-goi-k23');
      }, 3000);
    } catch (err) {
      console.error(err);
      showToast('Có lỗi xảy ra', 'Không thể kích hoạt dùng thử. Vui lòng liên hệ CSKH.', 'error');
    }
  };

  // Xác nhận chuyển khoản VietQR hoặc MoMo
  const handleConfirmPaid = async () => {
    if (!order) return;
    try {
      await confirmOrder({
        orderId: order.id,
        orderCode: order.order_code,
        planCode,
        billingCycle,
      });
      setIsSuccess(true);
      showToast('Thanh toán thành công!', `Hệ thống đã kích hoạt ${selectedPlan.name}.`, 'success');
      setTimeout(() => {
        navigate('/chu-tro/quan-ly-goi-k23');
      }, 3000);
    } catch (err) {
      console.error(err);
    }
  };

  // Thanh toán bằng Ví Xu 1 Chạm
  const handlePayWithXu = async () => {
    if (!order) return;
    if (!hasEnoughXu) {
      showToast(
        'Số dư Xu không đủ',
        `Gói này cần ${amountXu.toLocaleString('vi-VN')} Xu nhưng ví của bạn chỉ còn ${wallet.total_xu.toLocaleString('vi-VN')} Xu. Vui lòng nạp thêm Xu.`,
        'error'
      );
      return;
    }

    try {
      setIsProcessingXu(true);
      const cycleLabel =
        billingCycle === 'yearly' ? '1 Năm' : billingCycle === 'quarterly' ? '3 Tháng' : '1 Tháng';
      const success = await spendXu(
        amountXu,
        `Kích hoạt hệ thống K23: ${selectedPlan.name} (${cycleLabel})`,
        order.order_code
      );
      if (success) {
        await confirmOrder({
          orderId: order.id,
          orderCode: order.order_code,
          planCode,
          billingCycle,
        });
        setIsProcessingXu(false);
        setIsSuccess(true);
        showToast('Thanh toán Ví Xu thành công! 🪙', `Đã trừ ${amountXu} Xu và kích hoạt gói cước.`, 'success');
        setTimeout(() => {
          navigate('/chu-tro/quan-ly-goi-k23');
        }, 3000);
      } else {
        setIsProcessingXu(false);
      }
    } catch (err) {
      setIsProcessingXu(false);
      console.error(err);
    }
  };

  // Xuất biên lai PDF
  const handleDownloadInvoice = async () => {
    setIsDownloadingPdf(true);
    try {
      const now = new Date();
      let durationDays = 30;
      if (billingCycle === 'quarterly') durationDays = 90;
      else if (billingCycle === 'yearly') durationDays = 365;
      else if (isTrialStarter) durationDays = 60;

      const expiry = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

      await generateInvoicePDF({
        orderCode: order?.order_code || `K23_TRIAL_${Date.now().toString().slice(-6)}`,
        orderDate: now.toLocaleDateString('vi-VN'),
        orderTime: now.toLocaleTimeString('vi-VN'),
        paymentMethod:
          paymentMethod === 'wallet_xu'
            ? 'Ví Xu Trọ Xinh (1 Chạm)'
            : paymentMethod === 'momo'
            ? 'Ví Điện Tử MoMo'
            : 'Chuyển khoản VietQR PayOS (MBBank)',
        buyerName: currentUser?.name || 'Đối Tác Chủ Trọ K23',
        buyerPhone: currentUser?.phone || '0912 345 678',
        buyerEmail: currentUser?.email || 'chutro@troxinh.vn',
        planName: `Hệ thống PMS K23: ${selectedPlan.name}`,
        planDescription: selectedPlan.description,
        planDuration: `${durationDays} ngày`,
        startDate: now.toLocaleDateString('vi-VN'),
        endDate: expiry.toLocaleDateString('vi-VN'),
        unitPrice: amount,
        vatRate: 0,
        vatAmount: 0,
        totalAmount: amount,
        sellerName: 'Nguyễn Vũ Chính (Trọ Xinh PMS)',
        sellerAddress: '18 Ngõ 167 Tây Sơn, Phường Quang Trung, Quận Đống Đa, TP. Hà Nội',
        sellerPhone: '0888 110 789',
        sellerEmail: 'chutro@troxinh.vn',
        sellerBank: `${troXinhBank.bankName} — STK: ${troXinhBank.accountNo}`,
      });

      showToast('Tải biên lai PDF thành công!', 'Biên lai thanh toán điện tử đã được tải về máy của bạn.', 'success');
    } catch (err) {
      console.error(err);
      showToast('Có lỗi xảy ra', 'Không thể tạo file PDF biên lai. Vui lòng thử lại.', 'error');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const cycleText =
    billingCycle === 'yearly'
      ? 'Theo Năm (Giảm 20% • Đóng 10 tặng 2)'
      : billingCycle === 'quarterly'
      ? 'Theo Quý (Giảm 10%)'
      : 'Theo Tháng';

  if (!selectedPlan || (!isTrialStarter && isCreatingOrder)) {
    return (
      <div className="flex min-h-screen bg-slate-50 items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-2" />
          <p className="text-sm text-slate-600">Đang khởi tạo cổng thanh toán bảo mật K23...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <SEOHead
        title="Thanh Toán Dịch Vụ Quản Lý K23 | Trọ Xinh"
        description="Thanh toán kích hoạt hệ thống quản lý phòng trọ K23 qua VietQR, Ví MoMo hoặc Ví Xu Trọ Xinh."
      />
      <DashboardSidebar role="owner" />

      <main className="flex-1 p-4 lg:p-8 max-w-4xl mx-auto">
        {/* Nút quay lại */}
        <Link
          to="/chu-tro/goi-dich-vu"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại chọn gói cước khác
        </Link>

        {isSuccess ? (
          <div className="bg-white rounded-3xl p-8 sm:p-12 border border-emerald-200 shadow-xl text-center max-w-lg mx-auto my-10 animate-in zoom-in-95 space-y-6">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-md">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-900">Kích Hoạt Thành Công!</h2>
              <p className="text-sm text-slate-600">
                Hệ thống đã kích hoạt <strong>{selectedPlan.name} ({isTrialStarter ? 'Dùng thử 2 tháng' : cycleText})</strong> cho tài khoản của bạn.
              </p>
            </div>

            {/* Chi tiết đơn đã thanh toán */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-left text-xs space-y-2.5">
              <div className="flex justify-between items-center text-slate-600">
                <span>Gói dịch vụ:</span>
                <span className="font-bold text-slate-900">{selectedPlan.name}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Tổng chi phí:</span>
                <span className="font-black text-sm text-[#006d37]">
                  {formatCurrency(amount)} ({amountXu} Xu)
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Trạng thái:</span>
                <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  ✓ Đã kích hoạt
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2.5">
              <Button
                variant="outline"
                size="md"
                fullWidth
                onClick={handleDownloadInvoice}
                disabled={isDownloadingPdf}
                leftIcon={
                  isDownloadingPdf ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#006d37]" />
                  ) : (
                    <FileDown className="w-4 h-4 text-[#006d37]" />
                  )
                }
                className="font-bold border-emerald-300 hover:bg-emerald-50"
              >
                {isDownloadingPdf ? 'Đang tạo biên lai PDF...' : 'Tải Biên Lai Thanh Toán (PDF)'}
              </Button>

              <Link to="/chu-tro/quan-ly-goi-k23">
                <Button variant="primary" size="lg" fullWidth className="font-bold">
                  Quản Lý Gói & Tòa Nhà Ngay
                </Button>
              </Link>
            </div>
          </div>
        ) : isTrialStarter ? (
          /* Khối đăng ký Dùng thử 2 tháng miễn phí (0đ) */
          <div className="bg-white rounded-3xl p-8 border border-emerald-200 shadow-md max-w-xl mx-auto my-8 space-y-6 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-100 to-amber-100 text-emerald-700 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
              <Sparkles className="w-8 h-8 text-emerald-600" />
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                Ưu đãi 100% cho chủ trọ mới
              </span>
              <h2 className="text-2xl font-black text-slate-900">
                Trải Nghiệm Miễn Phí 2 Tháng Đầu (0đ)
              </h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Làm quen với toàn bộ tính năng quản lý phòng, chốt chỉ số điện nước thông minh và xuất hóa đơn VietQR tự động.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left text-xs space-y-2.5">
              <div className="flex justify-between items-center text-slate-600">
                <span>Gói đăng ký:</span>
                <span className="font-bold text-slate-900">{selectedPlan.name}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Thời hạn trải nghiệm:</span>
                <span className="font-bold text-emerald-700">60 ngày (2 tháng)</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Số lượng phòng tối đa:</span>
                <span className="font-bold text-slate-900">10 phòng trọ</span>
              </div>
              <div className="flex justify-between items-baseline pt-2 border-t border-slate-200">
                <span className="font-bold text-slate-900">Tổng thanh toán:</span>
                <div className="text-right">
                  <span className="text-xl font-black text-[#006d37]">0 đ</span>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 ml-2">
                    (0 Xu)
                  </span>
                </div>
              </div>
            </div>

            <Button
              onClick={handleActivateTrial}
              disabled={isActivatingTrial}
              className="w-full bg-[#00a854] hover:bg-[#008f47] text-white font-black py-4 rounded-xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 text-sm"
            >
              {isActivatingTrial ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Đang kích hoạt 60 ngày miễn phí...
                </>
              ) : (
                <>
                  <Rocket className="w-5 h-5 text-amber-300" /> Kích Hoạt Dùng Thử 2 Tháng Miễn Phí (0đ)
                </>
              )}
            </Button>
            <p className="text-[11px] text-slate-400">
              * Không yêu cầu thẻ ngân hàng, không tự động trừ tiền khi hết hạn.
            </p>
          </div>
        ) : (
          /* Khối thanh toán các gói trả phí (Quản lý Cơ bản & Nâng cao) */
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            {/* Cột trái: Chọn Phương thức thanh toán (Ví Xu / VietQR / MoMo) */}
            <div className="md:col-span-6 space-y-4">
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-sm font-bold text-slate-900">Chọn Phương Thức Thanh Toán</h3>
                  <Link
                    to="/chu-tro/vi-xu"
                    className="text-xs font-bold text-[#006d37] hover:underline flex items-center gap-1"
                  >
                    <Coins className="w-3.5 h-3.5 text-amber-500" />
                    <span>Ví: <strong>{wallet.total_xu} Xu</strong></span>
                  </Link>
                </div>

                {/* 3 Phương thức: Ví Xu, VietQR, MoMo */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('wallet_xu')}
                    className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition cursor-pointer text-center ${
                      paymentMethod === 'wallet_xu'
                        ? 'border-[#006d37] bg-emerald-50/80 text-[#006d37] shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center font-black">
                      <Coins className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[11px] font-black">Ví Xu</span>
                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-100 px-1 py-0.2 rounded-full">
                      1 Chạm ⭐
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('vietqr')}
                    className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition cursor-pointer text-center ${
                      paymentMethod === 'vietqr'
                        ? 'border-[#006d37] bg-emerald-50/80 text-[#006d37] shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-full bg-primary-600 text-white flex items-center justify-center font-black">
                      <QrCode className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-[11px] font-black">VietQR</span>
                    <span className="text-[9px] font-bold text-slate-500">40+ Ngân hàng</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('momo')}
                    className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition cursor-pointer text-center ${
                      paymentMethod === 'momo'
                        ? 'border-[#a50064] bg-pink-50/80 text-[#a50064] shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#A50064] to-[#D82D8B] text-white flex items-center justify-center font-black text-[10px]">
                      MoMo
                    </div>
                    <span className="text-[11px] font-black">Ví MoMo</span>
                    <span className="text-[9px] font-bold text-pink-700 bg-pink-100 px-1 py-0.2 rounded-full">
                      Tức thì ⚡
                    </span>
                  </button>
                </div>

                {/* Khối hiển thị chi tiết theo phương thức */}
                {paymentMethod === 'wallet_xu' ? (
                  <div className="bg-gradient-to-br from-amber-500/10 via-emerald-50 to-emerald-500/10 rounded-2xl p-5 border border-amber-200/80 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs text-slate-600 block">Số dư Ví Xu hiện tại:</span>
                        <div className="text-xl font-black text-amber-900 flex items-center gap-1.5">
                          <Coins className="w-5 h-5 text-amber-600" />
                          <span>{wallet.total_xu.toLocaleString('vi-VN')} Xu</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-slate-600 block">Cần thanh toán:</span>
                        <span className="text-xl font-black text-[#006d37]">
                          {amountXu.toLocaleString('vi-VN')} Xu
                        </span>
                        <span className="text-[10px] text-slate-500 block">
                          (~{formatCurrency(amount)})
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-amber-200/60 text-xs flex items-center justify-between">
                      {hasEnoughXu ? (
                        <span className="text-emerald-800 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Số dư đủ để kích hoạt ngay lập tức
                        </span>
                      ) : (
                        <div className="flex items-center justify-between w-full">
                          <span className="text-rose-700 font-bold">
                            ⚠️ Ví thiếu {(amountXu - wallet.total_xu).toLocaleString('vi-VN')} Xu
                          </span>
                          <Link
                            to="/chu-tro/vi-xu"
                            className="px-3 py-1 bg-amber-400 hover:bg-amber-500 text-amber-950 rounded-xl font-black text-[11px] transition shadow-xs"
                          >
                            Nạp thêm Xu ngay →
                          </Link>
                        </div>
                      )}
                    </div>

                    <Button
                      onClick={handlePayWithXu}
                      disabled={!hasEnoughXu || isProcessingXu}
                      className="w-full bg-[#00a854] hover:bg-[#008f47] text-white font-black py-4 rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 text-sm"
                    >
                      {isProcessingXu ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Đang trừ {amountXu} Xu & kích hoạt gói...
                        </>
                      ) : (
                        <>
                          <Rocket className="w-4 h-4 text-amber-300" />
                          {hasEnoughXu
                            ? `Thanh Toán Bằng Ví Xu (Trừ ${amountXu} Xu - 1 Chạm)`
                            : `Số Dư Không Đủ (${wallet.total_xu}/${amountXu} Xu)`}
                        </>
                      )}
                    </Button>
                  </div>
                ) : paymentMethod === 'momo' ? (
                  /* Giao diện thanh toán MoMo */
                  <div className="text-center pt-2 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2 text-xs font-bold text-[#a50064]">
                        <Smartphone className="w-4 h-4" />
                        MÃ MOMO QR CHUYỂN TIỀN
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-pink-600 bg-pink-50 px-2.5 py-1 rounded-full border border-pink-200">
                        <Clock className="w-3.5 h-3.5" />
                        {formatTimer(timeLeft)}
                      </div>
                    </div>

                    <div className="bg-pink-50/50 p-4 rounded-2xl border-2 border-[#a50064] inline-block shadow-inner">
                      <img
                        src={momoQrUrl}
                        alt="MoMo QR K23"
                        className="w-56 h-56 mx-auto object-contain rounded-xl"
                      />
                    </div>

                    <p className="text-xs text-slate-500">
                      Quét mã bằng ứng dụng <strong>Ví MoMo</strong> hoặc bất kỳ App Ngân hàng nào hỗ trợ VietQR.
                    </p>

                    <Button
                      onClick={handleConfirmPaid}
                      disabled={isConfirmingOrder}
                      className="w-full bg-[#a50064] hover:bg-[#8c0054] text-white font-bold py-3.5 rounded-xl shadow-lg shadow-pink-600/20 flex items-center justify-center gap-2 text-sm"
                    >
                      {isConfirmingOrder ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Đang kiểm tra giao dịch MoMo...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" /> Tôi đã chuyển khoản MoMo xong
                        </>
                      )}
                    </Button>
                  </div>
                ) : (
                  /* Giao diện thanh toán VietQR */
                  <div className="text-center pt-2">
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                        <QrCode className="w-4 h-4 text-primary-600" />
                        MÃ VIETQR QUÉT NHANH
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                        <Clock className="w-3.5 h-3.5" />
                        {formatTimer(timeLeft)}
                      </div>
                    </div>

                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 inline-block mb-4 shadow-inner">
                      {qrUrl ? (
                        <img
                          src={qrUrl}
                          alt="VietQR Thanh Toan K23"
                          className="w-56 h-56 mx-auto object-contain rounded-xl"
                        />
                      ) : (
                        <div className="w-56 h-56 flex items-center justify-center">
                          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 mb-4">
                      Mở ứng dụng Ngân hàng quét mã để thanh toán tự động đúng số tiền và nội dung.
                    </p>

                    <Button
                      onClick={handleConfirmPaid}
                      disabled={isConfirmingOrder}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 text-sm"
                    >
                      {isConfirmingOrder ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Đang kiểm tra giao dịch...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" /> Tôi đã chuyển khoản thành công
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Cột phải: Thông tin đơn hàng & Chi tiết chuyển khoản */}
            <div className="md:col-span-6 space-y-6">
              {/* Box Gói cước */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary-600" />
                  THÔNG TIN ĐƠN HÀNG
                </h3>

                <div className="space-y-3 text-xs sm:text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Gói dịch vụ:</span>
                    <span className="font-bold text-slate-900">{selectedPlan.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Hạn mức phòng:</span>
                    <span className="font-bold text-slate-900">
                      {selectedPlan.max_rooms === -1 ? 'Không giới hạn' : `Tối đa ${selectedPlan.max_rooms} phòng`}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Chu kỳ thanh toán:</span>
                    <span className="font-semibold text-slate-900">{cycleText}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Mã đơn hàng:</span>
                    <span className="font-mono font-bold text-primary-600">
                      {order?.order_code || '---'}
                    </span>
                  </div>
                  <div className="pt-3 border-t border-slate-100 flex justify-between items-baseline">
                    <span className="text-sm font-bold text-slate-900">Tổng thanh toán:</span>
                    <div className="text-right">
                      <span className="text-2xl font-extrabold text-primary-600">
                        {formatCurrency(amount)}
                      </span>
                      <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 block mt-1">
                        🪙 {amountXu.toLocaleString('vi-VN')} Xu
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Box Chuyển khoản thủ công */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-slate-700" />
                  THÔNG TIN TÀI KHOẢN NHẬN
                </h3>

                <div className="space-y-3 text-xs">
                  {paymentMethod === 'momo' ? (
                    <>
                      <div>
                        <span className="text-slate-500 block mb-1">Ví điện tử:</span>
                        <div className="font-bold text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                          Ví Điện Tử MoMo (Napas 24/7)
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-slate-500">Số điện thoại MoMo:</span>
                          {copiedField === 'momoPhone' && (
                            <span className="text-emerald-600 font-bold flex items-center gap-1">
                              <Check className="w-3 h-3" /> Đã chép
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between font-mono font-bold text-sm text-[#a50064] bg-pink-50 p-2.5 rounded-xl border border-pink-200">
                          <span>{momoReceiver.phone}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(momoReceiver.phone, 'momoPhone')}
                            className="text-pink-600 hover:text-pink-800 p-1"
                            title="Sao chép"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-500 block mb-1">Tên người nhận:</span>
                        <div className="font-bold text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                          {momoReceiver.name}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <span className="text-slate-500 block mb-1">Ngân hàng thụ hưởng:</span>
                        <div className="font-bold text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                          {troXinhBank.bankName}
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-slate-500">Số tài khoản:</span>
                          {copiedField === 'accountNo' && (
                            <span className="text-emerald-600 font-bold flex items-center gap-1">
                              <Check className="w-3 h-3" /> Đã chép
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between font-mono font-bold text-sm text-slate-900 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                          <span>{troXinhBank.accountNo}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(troXinhBank.accountNo, 'accountNo')}
                            className="text-primary-600 hover:text-primary-800 p-1"
                            title="Sao chép"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-500 block mb-1">Chủ tài khoản:</span>
                        <div className="font-bold text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                          {troXinhBank.accountName}
                        </div>
                      </div>
                    </>
                  )}

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-slate-500">Nội dung chuyển khoản (Bắt buộc):</span>
                      {copiedField === 'desc' && (
                        <span className="text-emerald-600 font-bold flex items-center gap-1">
                          <Check className="w-3 h-3" /> Đã chép
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between font-mono font-bold text-sm text-amber-700 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                      <span>{transferContent}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(transferContent, 'desc')}
                        className="text-amber-700 hover:text-amber-900 p-1"
                        title="Sao chép nội dung"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-2.5 text-xs text-blue-800">
                  <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
                  <span>
                    Chuyển đúng nội dung để hệ thống tự động nhận diện và kích hoạt trong vòng 10 giây. Xuất biên lai PDF ngay sau thanh toán.
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
