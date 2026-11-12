import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { DashboardSidebar } from '../components/layout/DashboardSidebar';
import { SEOHead } from '../components/seo/SEOHead';
import { useAppStore } from '../store/useAppStore';
import { useK23Subscription } from '../hooks/queries/useK23Subscription';
import { formatCurrency } from '../components/ui/Cards';
import { Button } from '../components/ui/Button';
import { generateInvoicePDF } from '../lib/generateInvoice';
import {
  getK23PlanByCode,
  calculateK23AmountXu,
  XU_TO_VND_RATE,
  sanitizeReturnUrl,
} from '../lib/monetizationCatalog';
import {
  purchaseK23PlanWithXu,
  createServicePaymentOrder,
  getServicePaymentOrderStatus,
  confirmDemoServiceOrder,
  ServicePaymentOrderResponse,
} from '../lib/api/monetization';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import {
  QrCode,
  ShieldCheck,
  Copy,
  CheckCircle2,
  ArrowLeft,
  Building2,
  Sparkles,
  Loader2,
  Coins,
  Smartphone,
  FileDown,
  Receipt,
  Check,
  RefreshCw,
  FlaskConical,
} from 'lucide-react';

export const OwnerK23CheckoutPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { invalidateSubscription } = useK23Subscription();
  const { wallet, spendXu, fetchWallet, showToast, currentUser } = useAppStore();

  const rawPlanParam = searchParams.get('plan');
  const rawCycleParam = searchParams.get('cycle');
  const safeReturnUrl = sanitizeReturnUrl(searchParams.get('returnUrl'), '');

  const selectedPlan = getK23PlanByCode(rawPlanParam);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>(
    rawCycleParam === 'yearly' ? 'yearly' : 'monthly'
  );
  const [paymentMethod, setPaymentMethod] = useState<'wallet_xu' | 'vietqr' | 'momo'>('wallet_xu');

  const [activeOrder, setActiveOrder] = useState<ServicePaymentOrderResponse | null>(null);
  const [isCreatingQr, setIsCreatingQr] = useState<boolean>(false);
  const [isPayingXu, setIsPayingXu] = useState<boolean>(false);
  const [isCheckingQr, setIsCheckingQr] = useState<boolean>(false);
  const [isConfirmingDemo, setIsConfirmingDemo] = useState<boolean>(false);
  const [isPaid, setIsPaid] = useState<boolean>(false);
  const [completedOrderCode, setCompletedOrderCode] = useState<string>('');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState<boolean>(false);

  const amountXu = calculateK23AmountXu(selectedPlan.code, billingCycle).amountXu;
  const amountVnd = amountXu * XU_TO_VND_RATE;
  const walletTotalXu = wallet?.total_xu ?? 0;
  const hasEnoughXu = walletTotalXu >= amountXu;

  const currentCheckoutUrl = `${location.pathname}${location.search}`;
  const topupReturnUrl = `/chu-tro/vi-xu?buoc=chon-goi&returnUrl=${encodeURIComponent(currentCheckoutUrl)}`;

  const completeK23Payment = async (orderCode: string) => {
    setCompletedOrderCode(orderCode);
    setIsPaid(true);
    setActiveOrder(null);
    if (currentUser?.id) {
      fetchWallet(currentUser.id);
    }
    await invalidateSubscription();
    showToast(
      'Thanh toán K23 thành công!',
      `Gói ${selectedPlan.name} đã được kích hoạt trong hệ thống quản lý phòng trọ.`,
      'success'
    );
  };

  // Realtime + Polling khi đang mở QR VietQR / MoMo
  useEffect(() => {
    if (isPaid || !activeOrder?.orderCode) return;

    const interval = setInterval(async () => {
      try {
        const res = await getServicePaymentOrderStatus(activeOrder.orderCode);
        if (res.status === 'paid') {
          clearInterval(interval);
          await completeK23Payment(activeOrder.orderCode);
        }
      } catch (err) {
        console.warn('[OwnerK23CheckoutPage] Poll warning:', err);
      }
    }, 3000);

    let channel: any = null;
    if (isSupabaseConfigured && supabase) {
      channel = supabase
        .channel(`k23-order-${activeOrder.orderCode}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'transactions',
            filter: `order_code=eq.${activeOrder.orderCode}`,
          },
          async (payload: any) => {
            if (payload?.new?.status === 'paid') {
              clearInterval(interval);
              await completeK23Payment(activeOrder.orderCode);
            }
          }
        )
        .subscribe();
    }

    return () => {
      clearInterval(interval);
      if (channel && supabase) supabase.removeChannel(channel);
    };
  }, [activeOrder?.orderCode, isPaid]);

  const handlePayWithXu = async () => {
    if (!currentUser) {
      navigate(`/dang-nhap?returnUrl=${encodeURIComponent(currentCheckoutUrl)}`);
      return;
    }

    if (!hasEnoughXu) {
      showToast(
        'Số dư Xu không đủ',
        `Cần ${amountXu} Xu nhưng số dư hiện có ${walletTotalXu} Xu.`,
        'warning'
      );
      return;
    }

    setIsPayingXu(true);
    try {
      if (isSupabaseConfigured) {
        const res = await purchaseK23PlanWithXu({
          planCode: selectedPlan.code,
          billingCycle,
        });
        await completeK23Payment(res.order_code || `TXK23_${Date.now().toString().slice(-6)}`);
        return;
      }

      // Offline fallback
      const spendOk = await spendXu(
        amountXu,
        `Đăng ký K23 ${selectedPlan.name} (${billingCycle === 'yearly' ? '1 năm' : '1 tháng'})`,
        selectedPlan.code
      );
      if (!spendOk) {
        return;
      }
      await completeK23Payment(`TXK23_${Date.now().toString().slice(-6)}`);
    } catch (err: any) {
      showToast('Không thể kích hoạt gói K23', err?.message || 'Vui lòng thử lại sau.', 'error');
    } finally {
      setIsPayingXu(false);
    }
  };

  const handleCreateQrOrder = async (channel: 'vietqr' | 'momo') => {
    if (!currentUser) {
      navigate(`/dang-nhap?returnUrl=${encodeURIComponent(currentCheckoutUrl)}`);
      return;
    }
    setIsCreatingQr(true);
    try {
      const order = await createServicePaymentOrder({
        serviceType: 'k23',
        itemId: selectedPlan.code,
        billingCycle,
        method: channel,
      });
      setActiveOrder(order);
    } catch (err: any) {
      showToast('Không tạo được mã thanh toán', err?.message || 'Vui lòng thử lại.', 'error');
    } finally {
      setIsCreatingQr(false);
    }
  };

  const handleRecheckQr = async () => {
    if (!activeOrder?.orderCode) return;
    setIsCheckingQr(true);
    try {
      const res = await getServicePaymentOrderStatus(activeOrder.orderCode);
      if (res.status === 'paid') {
        await completeK23Payment(activeOrder.orderCode);
      } else {
        showToast(
          'Đang chờ đối soát giao dịch',
          'Hệ thống sẽ tự động kích hoạt ngay sau khi nhận được tiền.',
          'info'
        );
      }
    } catch (err: any) {
      showToast('Lỗi kiểm tra giao dịch', err?.message || 'Vui lòng thử lại.', 'error');
    } finally {
      setIsCheckingQr(false);
    }
  };

  const handleDemoSandboxConfirm = async () => {
    if (!activeOrder?.orderCode || !currentUser?.isDemoAccount) return;
    setIsConfirmingDemo(true);
    try {
      await confirmDemoServiceOrder(activeOrder.orderCode);
      await completeK23Payment(activeOrder.orderCode);
    } catch (err: any) {
      showToast('Lỗi xác nhận Demo Sandbox', err?.message || 'Vui lòng thử lại.', 'error');
    } finally {
      setIsConfirmingDemo(false);
    }
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleDownloadInvoice = async () => {
    setIsGeneratingInvoice(true);
    try {
      const now = new Date();
      const durationDays = billingCycle === 'yearly' ? 365 : 30;
      const end = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

      await generateInvoicePDF({
        orderCode: completedOrderCode || 'TXK23_ORDER',
        orderDate: now.toLocaleDateString('vi-VN'),
        orderTime: now.toLocaleTimeString('vi-VN'),
        paymentMethod:
          paymentMethod === 'wallet_xu'
            ? 'Xu nội bộ Trọ Xinh'
            : paymentMethod === 'momo'
            ? 'Ví Điện Tử MoMo'
            : 'Chuyển khoản VietQR (Techcombank)',
        buyerName: currentUser?.name || 'Đối Tác Chủ Trọ',
        buyerPhone: currentUser?.phone || '0912 345 678',
        buyerEmail: currentUser?.email || 'khachhang@troxinh.vn',
        planName: `Hệ thống K23 — ${selectedPlan.name}`,
        planDescription: selectedPlan.description,
        planDuration: billingCycle === 'yearly' ? '12 tháng (Đóng 10 tặng 2)' : '30 ngày',
        startDate: now.toLocaleDateString('vi-VN'),
        endDate: end.toLocaleDateString('vi-VN'),
        unitPrice: amountVnd,
        vatRate: 0,
        vatAmount: 0,
        totalAmount: amountVnd,
        sellerName: 'Nguyễn Vũ Chính',
        sellerAddress: '18 Ngõ 167 Tây Sơn, Phường Quang Trung, Quận Đống Đa, TP. Hà Nội',
        sellerPhone: '0888 110 789',
        sellerEmail: 'nguyenvuchinhb1hhb@gmail.com',
        sellerBank: 'Techcombank — STK: 0888110789',
      });
      showToast('Tải biên lai thành công!', 'Biên lai PDF K23 đã được xuất.', 'success');
    } catch (err) {
      showToast('Có lỗi xảy ra', 'Không thể tạo biên lai PDF.', 'error');
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <SEOHead
        title={`Thanh Toán Gói K23 ${selectedPlan.name} | Trọ Xinh`}
        description="Hoàn tất đăng ký phần mềm quản lý phòng trọ K23 bằng Xu nội bộ, VietQR hoặc MoMo."
      />
      <DashboardSidebar role="owner" />

      <main className="flex-1 p-4 lg:p-8 max-w-5xl mx-auto">
        <div className="mb-6">
          <Link
            to={
              safeReturnUrl
                ? `/chu-tro/goi-dich-vu?returnUrl=${encodeURIComponent(safeReturnUrl)}`
                : '/chu-tro/goi-dich-vu'
            }
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Quay lại bảng giá K23
          </Link>
        </div>

        {isPaid ? (
          <div className="bg-white rounded-3xl p-8 sm:p-10 border border-emerald-200 shadow-xl text-center max-w-2xl mx-auto space-y-5">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-11 h-11" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Kích Hoạt K23 Thành Công!
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              Gói <strong>{selectedPlan.name}</strong> ({billingCycle === 'yearly' ? '1 Năm' : '1 Tháng'}) đã được mở khóa cho tài khoản của bạn.
            </p>

            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 text-left text-xs space-y-2.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Mã đơn hàng:</span>
                <span className="font-mono font-bold text-slate-900">#{completedOrderCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Gói dịch vụ:</span>
                <span className="font-bold text-[#006d37]">K23 {selectedPlan.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Hạn mức:</span>
                <span className="font-bold text-slate-900">
                  {selectedPlan.maxRooms === -1 ? 'Không giới hạn phòng' : `${selectedPlan.maxRooms} phòng`} •{' '}
                  {selectedPlan.maxBuildings === -1 ? '∞ tòa nhà' : `${selectedPlan.maxBuildings} tòa nhà`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Giá trị thanh toán:</span>
                <span className="font-black text-[#006d37] font-mono">
                  {amountXu.toLocaleString('vi-VN')} Xu
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              {safeReturnUrl && (
                <Button
                  variant="primary"
                  onClick={() => navigate(safeReturnUrl)}
                  className="font-bold cursor-pointer"
                >
                  Quay lại tiếp tục công việc
                </Button>
              )}
              <Button
                variant={safeReturnUrl ? 'outline' : 'primary'}
                onClick={() => navigate('/chu-tro/hoa-don')}
                className="font-bold cursor-pointer"
              >
                Vào Quản lý Hóa đơn K23
              </Button>
              <Button
                variant="outline"
                onClick={handleDownloadInvoice}
                disabled={isGeneratingInvoice}
                leftIcon={
                  isGeneratingInvoice ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <FileDown className="w-4 h-4" />
                  )
                }
                className="font-bold cursor-pointer"
              >
                {isGeneratingInvoice ? 'Đang xuất PDF...' : 'Tải biên lai PDF'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left 5 cols: Order Summary */}
            <div className="lg:col-span-5 bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-5">
              <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                <div className="w-11 h-11 bg-emerald-50 text-[#006d37] rounded-2xl flex items-center justify-center border border-emerald-100">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#006d37] block">
                    Dịch vụ 3 • Quản lý K23
                  </span>
                  <h2 className="text-lg font-extrabold text-slate-900">Gói {selectedPlan.name}</h2>
                </div>
              </div>

              {/* Cycle Switch */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setBillingCycle('monthly');
                    setActiveOrder(null);
                  }}
                  className={`p-3 rounded-2xl border-2 text-left transition cursor-pointer ${
                    billingCycle === 'monthly'
                      ? 'border-[#006d37] bg-emerald-50/50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className="text-[11px] font-bold text-slate-700 block">Theo Tháng</span>
                  <span className="text-sm font-black text-[#006d37] font-mono">
                    {selectedPlan.priceMonthlyXu} Xu
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBillingCycle('yearly');
                    setActiveOrder(null);
                  }}
                  className={`p-3 rounded-2xl border-2 text-left transition cursor-pointer relative ${
                    billingCycle === 'yearly'
                      ? 'border-[#006d37] bg-emerald-50/50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className="absolute -top-2 right-2 bg-amber-400 text-amber-950 text-[9px] font-black px-1.5 py-0.5 rounded-full">
                    Tặng 2 tháng
                  </span>
                  <span className="text-[11px] font-bold text-slate-700 block">Theo Năm</span>
                  <span className="text-sm font-black text-[#006d37] font-mono">
                    {selectedPlan.priceYearlyXu.toLocaleString('vi-VN')} Xu
                  </span>
                </button>
              </div>

              <div className="space-y-2.5 text-xs pt-2 border-t border-slate-100">
                <div className="flex justify-between text-slate-600">
                  <span>Hạn mức phòng:</span>
                  <strong className="text-slate-900">
                    {selectedPlan.maxRooms === -1 ? 'Không giới hạn' : `${selectedPlan.maxRooms} phòng`}
                  </strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Hạn mức tòa nhà:</span>
                  <strong className="text-slate-900">
                    {selectedPlan.maxBuildings === -1 ? 'Không giới hạn' : `${selectedPlan.maxBuildings} tòa nhà`}
                  </strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Thời hạn:</span>
                  <strong className="text-slate-900">
                    {billingCycle === 'yearly' ? '12 tháng (Đóng 10 tặng 2)' : '30 ngày'}
                  </strong>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-between items-baseline">
                <span className="text-sm font-bold text-slate-900">Tổng thanh toán:</span>
                <div className="text-right">
                  <span className="text-2xl font-black text-[#006d37] font-mono">
                    {amountXu.toLocaleString('vi-VN')} Xu
                  </span>
                  {paymentMethod !== 'wallet_xu' && (
                    <span className="text-xs text-slate-500 block">({formatCurrency(amountVnd)})</span>
                  )}
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-[11px] text-emerald-900 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-[#006d37] shrink-0 mt-0.5" />
                <span>
                  Xu sẽ được trừ ngay khi xác nhận thanh toán. Xem thêm tại{' '}
                  <Link to="/terms" className="underline font-bold">
                    Điều khoản dịch vụ
                  </Link>
                  .
                </span>
              </div>
            </div>

            {/* Right 7 cols: Payment Methods & Active QR */}
            <div className="lg:col-span-7 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6">
              <div>
                <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-[#006d37]" />
                  Thanh Toán Gói Quản Lý K23
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Chọn thanh toán nhanh 1 chạm bằng Xu nội bộ hoặc quét mã VietQR / MoMo tự động
                </p>
              </div>

              {/* Method tabs */}
              <div className="grid grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('wallet_xu');
                    setActiveOrder(null);
                  }}
                  className={`p-3 rounded-2xl border-2 text-xs font-bold flex flex-col items-center gap-1 transition cursor-pointer ${
                    paymentMethod === 'wallet_xu'
                      ? 'border-amber-500 bg-amber-50 text-amber-950'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <Coins className="w-5 h-5 text-amber-600" />
                  <span>Xu nội bộ</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('vietqr');
                    handleCreateQrOrder('vietqr');
                  }}
                  className={`p-3 rounded-2xl border-2 text-xs font-bold flex flex-col items-center gap-1 transition cursor-pointer ${
                    paymentMethod === 'vietqr'
                      ? 'border-[#006d37] bg-emerald-50 text-[#006d37]'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <QrCode className="w-5 h-5 text-[#006d37]" />
                  <span>VietQR</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('momo');
                    handleCreateQrOrder('momo');
                  }}
                  className={`p-3 rounded-2xl border-2 text-xs font-bold flex flex-col items-center gap-1 transition cursor-pointer ${
                    paymentMethod === 'momo'
                      ? 'border-[#a50064] bg-pink-50 text-[#a50064]'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <Smartphone className="w-5 h-5 text-[#a50064]" />
                  <span>Ví MoMo</span>
                </button>
              </div>

              {/* Panel 1: Xu nội bộ */}
              {paymentMethod === 'wallet_xu' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-amber-900 font-semibold block">Số dư Xu khả dụng:</span>
                      <span className="text-lg font-black text-amber-950 font-mono">
                        {walletTotalXu.toLocaleString('vi-VN')} Xu
                      </span>
                    </div>
                    {hasEnoughXu ? (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-[#006d37] font-bold">
                        ✓ Đủ Xu thanh toán
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 font-bold">
                        Thiếu {(amountXu - walletTotalXu).toLocaleString('vi-VN')} Xu
                      </span>
                    )}
                  </div>

                  {hasEnoughXu ? (
                    <Button
                      variant="primary"
                      size="lg"
                      fullWidth
                      isLoading={isPayingXu}
                      onClick={handlePayWithXu}
                      leftIcon={<Sparkles className="w-4 h-4" />}
                      className="font-black cursor-pointer"
                    >
                      Thanh toán {amountXu.toLocaleString('vi-VN')} Xu &amp; Kích hoạt ngay
                    </Button>
                  ) : (
                    <Link to={topupReturnUrl} className="block">
                      <Button
                        variant="primary"
                        size="lg"
                        fullWidth
                        leftIcon={<Coins className="w-4 h-4" />}
                        className="bg-amber-500 hover:bg-amber-600 text-white font-black cursor-pointer"
                      >
                        Nạp thêm Xu ngay ({walletTotalXu}/{amountXu} Xu) →
                      </Button>
                    </Link>
                  )}
                </div>
              )}

              {/* Panel 2: VietQR / MoMo live order */}
              {paymentMethod !== 'wallet_xu' && (
                <div className="space-y-4 text-center">
                  {isCreatingQr || !activeOrder ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-slate-500">
                      <Loader2 className="w-7 h-7 animate-spin text-[#006d37]" />
                      <span>Đang khởi tạo mã thanh toán đối soát tự động...</span>
                    </div>
                  ) : (
                    <>
                      <div className="inline-block p-3 bg-white rounded-2xl border-2 border-emerald-200 shadow-sm">
                        <img
                          src={activeOrder.qrCode}
                          alt="QR K23"
                          className="w-56 h-56 object-contain mx-auto"
                        />
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left text-xs space-y-2">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Đơn vị nhận:</span>
                          <strong className="text-slate-900">{activeOrder.receiverInfo.bankName}</strong>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Số tài khoản / Ví:</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-slate-900">
                              {activeOrder.receiverInfo.accountNumber}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(activeOrder.receiverInfo.accountNumber, 'acc')}
                              className="text-[#006d37] cursor-pointer"
                            >
                              {copiedField === 'acc' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Chủ tài khoản:</span>
                          <strong className="text-slate-900 uppercase">
                            {activeOrder.receiverInfo.accountName}
                          </strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Số tiền chính xác:</span>
                          <strong className="text-[#006d37] font-black">
                            {formatCurrency(activeOrder.amountVnd)} ({activeOrder.amountXu} Xu)
                          </strong>
                        </div>
                        <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                          <span className="text-slate-500">Nội dung chuyển khoản:</span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-black text-amber-900 bg-amber-100 px-2 py-0.5 rounded">
                              {activeOrder.transferContent}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(activeOrder.transferContent, 'content')}
                              className="text-amber-800 cursor-pointer"
                            >
                              {copiedField === 'content' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Button
                          variant="primary"
                          size="lg"
                          fullWidth
                          isLoading={isCheckingQr}
                          onClick={handleRecheckQr}
                          leftIcon={<RefreshCw className={`w-4 h-4 ${isCheckingQr ? 'animate-spin' : ''}`} />}
                          className="font-bold cursor-pointer"
                        >
                          {isCheckingQr ? 'Đang kiểm tra...' : 'Kiểm tra trạng thái thanh toán'}
                        </Button>

                        {currentUser?.isDemoAccount && (
                          <Button
                            variant="outline"
                            size="md"
                            fullWidth
                            isLoading={isConfirmingDemo}
                            onClick={handleDemoSandboxConfirm}
                            leftIcon={<FlaskConical className="w-4 h-4 text-amber-600" />}
                            className="border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold cursor-pointer"
                          >
                            Xác nhận Demo Sandbox (Tài khoản Demo)
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
