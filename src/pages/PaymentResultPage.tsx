import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { SEOHead } from '../components/seo/SEOHead';
import { Button } from '../components/ui/Button';
import { formatCurrency } from '../components/ui/Cards';
import { generateInvoicePDF } from '../lib/generateInvoice';
import {
  LISTING_PLANS,
  BOOST_PACKAGES,
  getListingPlanById,
  getBoostPackageById,
  getK23PlanByCode,
  sanitizeReturnUrl,
  XU_TO_VND_RATE,
} from '../lib/monetizationCatalog';
import {
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Receipt,
  Sparkles,
  Building2,
  PlusCircle,
  RotateCcw,
  Calendar,
  AlertTriangle,
  FileDown,
  Loader2,
} from 'lucide-react';

export const PaymentResultPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { currentUser, showToast } = useAppStore();

  const service = searchParams.get('service') || 'listing_plan';
  const orderId = searchParams.get('orderId') || searchParams.get('orderCode') || 'TRX_ORDER';
  const statusParam = searchParams.get('status') || 'success';
  const planId = searchParams.get('plan') || 'featured';
  const cycleParam = searchParams.get('cycle') || 'monthly';
  const method = searchParams.get('method') || 'wallet_xu';
  const safeReturnUrl = sanitizeReturnUrl(searchParams.get('returnUrl'), '');

  const listingPlan = getListingPlanById(planId) || LISTING_PLANS[2];
  const boostPkg = getBoostPackageById(planId) || BOOST_PACKAGES[1];
  const k23Plan = getK23PlanByCode(planId);

  const amountXuParam = Number(searchParams.get('amountXu'));
  const amountVndParam = Number(searchParams.get('amount'));

  const resolvedXu = Number.isFinite(amountXuParam) && amountXuParam > 0
    ? amountXuParam
    : Number.isFinite(amountVndParam) && amountVndParam > 0
    ? Math.round(amountVndParam / XU_TO_VND_RATE)
    : listingPlan.priceXu;

  const resolvedVnd = Number.isFinite(amountVndParam) && amountVndParam > 0
    ? amountVndParam
    : resolvedXu * XU_TO_VND_RATE;

  const serviceName =
    service === 'boost'
      ? `Gói đẩy tin: ${boostPkg.name}`
      : service === 'k23'
      ? `Hệ thống quản lý K23 — Gói ${k23Plan.name}`
      : service === 'repost'
      ? 'Gia hạn / Đăng lại tin phòng'
      : `Gói đăng phòng: ${listingPlan.name}`;

  const durationDays =
    service === 'boost'
      ? boostPkg.days
      : service === 'k23'
      ? cycleParam === 'yearly'
        ? 365
        : 30
      : listingPlan.billingType === 'one_time'
      ? listingPlan.durationDays
      : cycleParam === 'yearly'
      ? 365
      : 30;

  const isSuccess = statusParam === 'success';
  const isFailed = statusParam === 'failed';
  const isExpired = statusParam === 'expired';
  const isPending = statusParam === 'pending';

  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + durationDays);
  const formattedExpiry = expiryDate.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState<boolean>(false);

  const formatMethodName = (m: string) => {
    if (m === 'wallet_xu') return 'Xu nội bộ Trọ Xinh';
    if (m === 'vietqr' || m === 'banking') return 'Chuyển khoản VietQR (Techcombank)';
    if (m === 'momo') return 'Ví Điện Tử MoMo';
    return 'Thanh toán trực tuyến';
  };

  const handleDownloadInvoice = async () => {
    setIsGeneratingInvoice(true);
    try {
      const now = new Date();
      await generateInvoicePDF({
        orderCode: String(orderId),
        orderDate: now.toLocaleDateString('vi-VN'),
        orderTime: now.toLocaleTimeString('vi-VN'),
        paymentMethod: formatMethodName(method),
        buyerName: currentUser?.name || 'Đối Tác Chủ Trọ',
        buyerPhone: currentUser?.phone || '0912 345 678',
        buyerEmail: currentUser?.email || 'khachhang@troxinh.vn',
        planName: serviceName,
        planDescription: `${serviceName} (${resolvedXu} Xu)`,
        planDuration: `${durationDays} ngày`,
        startDate: now.toLocaleDateString('vi-VN'),
        endDate: formattedExpiry,
        unitPrice: resolvedVnd,
        vatRate: 0,
        vatAmount: 0,
        totalAmount: resolvedVnd,
        sellerName: 'Nguyễn Vũ Chính',
        sellerAddress: '18 Ngõ 167 Tây Sơn, Phường Quang Trung, Quận Đống Đa, TP. Hà Nội',
        sellerPhone: '0888 110 789',
        sellerEmail: 'nguyenvuchinhb1hhb@gmail.com',
        sellerBank: 'Techcombank — STK: 0888110789',
      });

      showToast('Tải biên lai thành công!', `Biên lai giao dịch #${orderId} đã được xuất.`, 'success');
    } catch (err) {
      console.error('[Invoice Download Error]', err);
      showToast('Có lỗi xảy ra', 'Không thể tạo biên lai PDF. Vui lòng thử lại.', 'error');
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  const retryHref =
    service === 'k23'
      ? `/chu-tro/thanh-toan-goi?plan=${planId}`
      : `/thanh-toan/${planId}${safeReturnUrl ? `?returnUrl=${encodeURIComponent(safeReturnUrl)}` : ''}`;

  return (
    <div className="min-h-screen bg-gray-50/70 py-12">
      <SEOHead
        title="Kết Quả Thanh Toán | Trọ Xinh"
        description="Chi tiết kết quả giao dịch thanh toán dịch vụ chủ trọ trên Trọ Xinh."
        url="/thanh-toan/ket-qua"
      />

      <div className="max-w-xl mx-auto px-4 sm:px-6">
        <div className="bg-white rounded-3xl border border-gray-200 shadow-lg p-6 sm:p-8 text-center space-y-6">
          {isSuccess && (
            <div className="space-y-3">
              <div className="w-16 h-16 bg-emerald-100 text-[#006d37] rounded-full flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-[#006d37] font-extrabold text-xs">
                <Sparkles className="w-3.5 h-3.5" />
                <span>THANH TOÁN THÀNH CÔNG</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900">Dịch Vụ Đã Kích Hoạt!</h1>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                <strong className="text-gray-900">{serviceName}</strong> đã sẵn sàng hoạt động trong tài khoản của bạn.
              </p>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold">
                <Calendar className="w-3.5 h-3.5 text-[#006d37]" />
                <span>
                  Hiệu lực đến: <strong className="text-[#006d37]">{formattedExpiry}</strong>
                </span>
              </div>
            </div>
          )}

          {isExpired && (
            <div className="space-y-3">
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto shadow-md">
                <AlertTriangle className="w-10 h-10 stroke-[2.5]" />
              </div>
              <h1 className="text-2xl font-black text-gray-900">Mã QR Đã Hết Hạn</h1>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Mã QR chỉ có hiệu lực 15 phút để đảm bảo đối soát chính xác. Vui lòng tạo lại giao dịch mới.
              </p>
            </div>
          )}

          {isFailed && (
            <div className="space-y-3">
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto shadow-md">
                <XCircle className="w-10 h-10 stroke-[2.5]" />
              </div>
              <h1 className="text-2xl font-black text-gray-900">Thanh Toán Thất Bại</h1>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Giao dịch chưa thể hoàn tất. Bạn có thể thử lại hoặc chọn phương thức thanh toán khác.
              </p>
            </div>
          )}

          {isPending && (
            <div className="space-y-3">
              <div className="w-16 h-16 bg-emerald-100 text-[#006d37] rounded-full flex items-center justify-center mx-auto shadow-md">
                <Clock className="w-10 h-10 animate-spin" />
              </div>
              <h1 className="text-2xl font-black text-gray-900">Đang Chờ Xác Nhận Giao Dịch</h1>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Hệ thống đang đồng bộ Webhook. Dịch vụ sẽ kích hoạt ngay sau khi nhận được xác nhận.
              </p>
            </div>
          )}

          {/* Receipt Info Card */}
          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 text-left space-y-3 text-xs">
            <div className="flex items-center justify-between font-bold text-gray-900 pb-2 border-b border-gray-200">
              <span className="flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-[#006d37]" />
                Chi Tiết Đơn Hàng
              </span>
              <span className="font-mono text-gray-600">#{orderId}</span>
            </div>

            <div className="space-y-2 text-gray-600">
              <div className="flex justify-between gap-2">
                <span>Dịch vụ:</span>
                <span className="font-bold text-gray-900 text-right">{serviceName}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span>Phương thức:</span>
                <span className="font-semibold text-gray-800">{formatMethodName(method)}</span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <span>Giá trị thanh toán:</span>
                <div className="text-right">
                  <span className="font-black text-base text-[#006d37] font-mono">
                    {resolvedXu.toLocaleString('vi-VN')} Xu
                  </span>
                  {method !== 'wallet_xu' && (
                    <span className="text-[11px] font-semibold text-gray-500 block">
                      ({formatCurrency(resolvedVnd)})
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="space-y-3 pt-2">
            {isSuccess ? (
              <>
                {safeReturnUrl && (
                  <Link to={safeReturnUrl} className="block">
                    <Button
                      variant="primary"
                      size="lg"
                      fullWidth
                      rightIcon={<ArrowRight className="w-4 h-4" />}
                      className="font-black cursor-pointer"
                    >
                      Quay lại tiếp tục công việc
                    </Button>
                  </Link>
                )}

                <Link to="/chu-tro/tong-quan" className="block">
                  <Button
                    variant={safeReturnUrl ? 'outline' : 'primary'}
                    size="lg"
                    fullWidth
                    leftIcon={<PlusCircle className="w-4 h-4" />}
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                    className="cursor-pointer"
                  >
                    Về Trang Quản Lý Chủ Trọ
                  </Button>
                </Link>

                <Button
                  variant="outline"
                  size="md"
                  fullWidth
                  onClick={handleDownloadInvoice}
                  disabled={isGeneratingInvoice}
                  leftIcon={
                    isGeneratingInvoice ? (
                      <Loader2 className="w-4 h-4 animate-spin text-[#006d37]" />
                    ) : (
                      <FileDown className="w-4 h-4 text-[#006d37]" />
                    )
                  }
                  className="border-emerald-600 text-[#006d37] hover:bg-emerald-50 font-bold cursor-pointer"
                >
                  {isGeneratingInvoice ? 'Đang tạo biên lai PDF...' : 'Tải biên lai PDF'}
                </Button>

                {!safeReturnUrl && (
                  <Link to="/chu-tro/phong/tao-moi" className="block">
                    <Button variant="outline" size="md" fullWidth leftIcon={<Building2 className="w-4 h-4" />}>
                      Đăng Phòng Trọ Mới
                    </Button>
                  </Link>
                )}
              </>
            ) : (
              <>
                <Link to={retryHref} className="block">
                  <Button variant="primary" size="lg" fullWidth leftIcon={<RotateCcw className="w-4 h-4" />}>
                    {isExpired ? 'Tạo Mã QR Mới' : 'Thử Lại Thanh Toán'}
                  </Button>
                </Link>
                <Link to="/bang-gia" className="block">
                  <Button variant="outline" size="md" fullWidth>
                    Quay Lại Bảng Giá
                  </Button>
                </Link>
              </>
            )}
          </div>

          <div className="pt-4 border-t border-gray-100 text-xs text-gray-500 space-y-1.5">
            <p>Cần hỗ trợ đối soát? Liên hệ:</p>
            <div className="flex flex-wrap items-center justify-center gap-3 font-semibold">
              <a href="tel:0888110789" className="text-[#006d37] hover:underline">
                0888 110 789
              </a>
              <span>•</span>
              <a
                href="https://zalo.me/0888110789"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-800 hover:underline"
              >
                Zalo: 0888 110 789
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
