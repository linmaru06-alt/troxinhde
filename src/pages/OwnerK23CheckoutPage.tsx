import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { DashboardSidebar } from '../components/layout/DashboardSidebar';
import { SEOHead } from '../components/seo/SEOHead';
import { useK23Subscription } from '../hooks/queries/useK23Subscription';
import { K23PlanCode, K23BillingCycle, K23SubscriptionOrder } from '../types/k23';
import { generateVietQrUrl, POPULAR_BANKS } from '../lib/vietqr';
import { formatCurrency } from '../components/ui/Cards';
import { Button } from '../components/ui/Button';
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
  AlertCircle,
} from 'lucide-react';

export const OwnerK23CheckoutPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { plans, createOrder, confirmOrder, isCreatingOrder, isConfirmingOrder } = useK23Subscription();

  const planCode = (searchParams.get('plan') as K23PlanCode) || 'pro';
  const billingCycle = (searchParams.get('cycle') as K23BillingCycle) || 'yearly';

  const selectedPlan = plans.find((p) => p.code === planCode) || plans[1];
  const amount = billingCycle === 'yearly' ? selectedPlan?.price_yearly || 1290000 : selectedPlan?.price_monthly || 129000;

  const [order, setOrder] = useState<K23SubscriptionOrder | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(15 * 60); // 15 mins
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  // Tài khoản nhận thanh toán của Trọ Xinh (MBBank)
  const troXinhBank = {
    bankId: 'MB',
    bankName: 'MBBank - Ngân hàng Quân Đội',
    accountNo: '0868886868',
    accountName: 'CONG TY TRO XINH VIET NAM',
  };

  // 1. Tạo order khi vào trang
  useEffect(() => {
    let isMounted = true;
    createOrder({ planCode, billingCycle }).then((createdOrder) => {
      if (isMounted) {
        setOrder(createdOrder);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [planCode, billingCycle, createOrder]);

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
      setTimeout(() => {
        navigate('/chu-tro/quan-ly-goi-k23');
      }, 2500);
    } catch (err) {
      console.error(err);
    }
  };

  if (!selectedPlan || isCreatingOrder) {
    return (
      <div className="flex min-h-screen bg-slate-50 items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-2" />
          <p className="text-sm text-slate-600">Đang khởi tạo cổng thanh toán bảo mật...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <SEOHead
        title="Thanh Toán Gói Cước K23 | Trọ Xinh"
        description="Thanh toán kích hoạt gói quản lý phòng trọ K23 qua chuyển khoản ngân hàng VietQR."
      />
      <DashboardSidebar />

      <main className="flex-1 p-4 lg:p-8 max-w-4xl mx-auto">
        {/* Nút quay lại */}
        <Link
          to="/chu-tro/goi-dich-vu"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại chọn gói cước khác
        </Link>

        {isSuccess ? (
          <div className="bg-white rounded-3xl p-10 border border-emerald-200 shadow-xl text-center max-w-lg mx-auto my-12 animate-in zoom-in-95">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Thanh toán thành công!</h2>
            <p className="text-sm text-slate-600 mb-6">
              Hệ thống đã tự động kích hoạt <strong>{selectedPlan.name} ({billingCycle === 'yearly' ? '1 Năm' : '1 Tháng'})</strong> cho tài khoản của bạn.
            </p>
            <div className="inline-flex items-center gap-2 text-xs text-slate-500 bg-slate-100 px-4 py-2 rounded-xl">
              <Loader2 className="w-4 h-4 animate-spin text-primary-600" />
              Đang chuyển hướng về trang Quản lý gói cước...
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            {/* Cột trái: Mã VietQR & Bộ đếm giờ */}
            <div className="md:col-span-6 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm text-center">
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

              {/* VietQR Image Container */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 inline-block mb-4 shadow-inner">
                {qrUrl ? (
                  <img
                    src={qrUrl}
                    alt="VietQR Thanh Toan K23"
                    className="w-64 h-64 mx-auto object-contain rounded-xl"
                  />
                ) : (
                  <div className="w-64 h-64 flex items-center justify-center">
                    <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                  </div>
                )}
              </div>

              <p className="text-xs text-slate-500 mb-6">
                Mở ứng dụng Ngân hàng bất kỳ (App MB, Vietcombank, Techcombank, Momo, VNPay...) để quét mã và thanh toán tự động.
              </p>

              <Button
                onClick={handleConfirmPaid}
                disabled={isConfirmingOrder}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
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

            {/* Cột phải: Thông tin đơn hàng & Chi tiết chuyển khoản thủ công */}
            <div className="md:col-span-6 space-y-6">
              {/* Box Gói cước */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary-600" />
                  THÔNG TIN ĐƠN HÀNG
                </h3>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Gói cước:</span>
                    <span className="font-bold text-slate-900">{selectedPlan.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Chu kỳ sử dụng:</span>
                    <span className="font-semibold text-slate-900">
                      {billingCycle === 'yearly' ? '12 Tháng (Đóng 10 tặng 2)' : '1 Tháng'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Mã đơn hàng:</span>
                    <span className="font-mono font-bold text-primary-600">
                      {order?.order_code || '---'}
                    </span>
                  </div>
                  <div className="pt-3 border-t border-slate-100 flex justify-between items-baseline">
                    <span className="text-sm font-bold text-slate-900">Tổng thanh toán:</span>
                    <span className="text-2xl font-extrabold text-primary-600">
                      {formatCurrency(amount)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Box Chuyển khoản thủ công */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 mb-4 pb-2 border-b border-slate-100 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-slate-700" />
                  HOẶC CHUYỂN KHOẢN THỦ CÔNG
                </h3>

                <div className="space-y-3.5 text-xs">
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
                          <CheckCircle2 className="w-3 h-3" /> Đã chép
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

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-slate-500">Nội dung chuyển khoản (Bắt buộc):</span>
                      {copiedField === 'desc' && (
                        <span className="text-emerald-600 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Đã chép
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
                    Chuyển đúng nội dung để hệ thống tự động nhận diện và kích hoạt trong vòng 10 giây.
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
