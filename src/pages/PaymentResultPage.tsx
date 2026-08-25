import React, { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useAppStore, SUBSCRIPTION_PLANS } from '../store/useAppStore';
import { SEOHead } from '../components/seo/SEOHead';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { formatCurrency } from '../components/ui/Cards';
import { generateInvoicePDF } from '../lib/generateInvoice';
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
  const navigate = useNavigate();
  const { paymentTransactions, currentUser } = useAppStore();

  const orderId = searchParams.get('orderId') || searchParams.get('orderCode') || 'TRX_889201';
  const amount = Number(searchParams.get('amount')) || 99000;
  const statusParam = searchParams.get('status') || 'success';
  const planId = searchParams.get('plan') || 'basic';
  const method = searchParams.get('method') || 'vietqr';

  const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId) || SUBSCRIPTION_PLANS[1];

  const isSuccess = statusParam === 'success';
  const isFailed = statusParam === 'failed';
  const isExpired = statusParam === 'expired';
  const isPending = statusParam === 'pending';

  // Calculate expiry date (30 days from now)
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 30);
  const formattedExpiry = expiryDate.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState<boolean>(false);
  const { showToast } = useAppStore();

  const handleDownloadInvoice = async () => {
    setIsGeneratingInvoice(true);
    try {
      const now = new Date();
      const formatMethodName = (m: string) => {
        if (m === 'vietqr' || m === 'banking') return 'Chuyển khoản VietQR (Techcombank)';
        if (m === 'momo') return 'Ví Điện Tử MoMo';
        if (m === 'vnpay') return 'Cổng VNPay';
        return 'Chuyển khoản Ngân hàng';
      };

      await generateInvoicePDF({
        orderCode: String(orderId),
        orderDate: now.toLocaleDateString('vi-VN'),
        orderTime: now.toLocaleTimeString('vi-VN'),
        paymentMethod: formatMethodName(method),
        buyerName: currentUser?.name || 'Đối Tác Chủ Trọ',
        buyerPhone: currentUser?.phone || '0912 345 678',
        buyerEmail: currentUser?.email || 'khachhang@troxinh.vn',
        planName: plan.name,
        planDescription: plan.description,
        planDuration: '30 ngày',
        startDate: now.toLocaleDateString('vi-VN'),
        endDate: formattedExpiry,
        unitPrice: amount,
        vatRate: 0,
        vatAmount: 0,
        totalAmount: amount,
        sellerName: 'Nguyễn Vũ Chính',
        sellerAddress: '18 Ngõ 167 Tây Sơn, Phường Quang Trung, Quận Đống Đa, TP. Hà Nội',
        sellerPhone: '0888 110 789',
        sellerEmail: 'nguyenvuchinhb1hhb@gmail.com',
        sellerBank: 'Techcombank (Ngân hàng TMCP Kỹ Thương Việt Nam) — STK: 0888110789',
      });

      showToast('Tải biên lai thành công!', `Biên lai giao dịch #${orderId} đã được xuất thành công!`, 'success');
    } catch (err) {
      console.error('[Invoice Download Error]', err);
      showToast('Có lỗi xảy ra', 'Không thể tạo biên lai PDF. Vui lòng thử lại.', 'error');
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/70 py-12">
      <SEOHead
        title="Kết Quả Thanh Toán | TroXinh Hà Nội"
        description="Chi tiết kết quả giao dịch thanh toán gói dịch vụ hoặc đẩy tin phòng trọ."
        url="/thanh-toan/ket-qua"
      />

      <div className="max-w-xl mx-auto px-4 sm:px-6">
        <div className="bg-white rounded-3xl border border-gray-200 shadow-lg p-6 sm:p-8 text-center space-y-6">
          {/* Status Icon & Header */}
          {isSuccess && (
            <div className="space-y-3">
              <div className="w-16 h-16 bg-emerald-100 text-[#006d37] rounded-full flex items-center justify-center mx-auto shadow-md animate-bounce">
                <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-[#006d37] font-extrabold text-xs">
                <Sparkles className="w-3.5 h-3.5" />
                <span>THANH TOÁN THÀNH CÔNG</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900">
                Gói Dịch Vụ Đã Kích Hoạt!
              </h1>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Gói <strong className="text-gray-900">{plan.name}</strong> của bạn đã sẵn sàng sử dụng trên hệ thống Trọ Xinh.
              </p>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-semibold">
                <Calendar className="w-3.5 h-3.5 text-[#006d37]" />
                <span>Hiệu lực đến: <strong className="text-[#006d37]">{formattedExpiry}</strong></span>
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
                Mã VietQR chỉ có hiệu lực trong 15 phút. Vui lòng tạo mã QR mới để tiếp tục giao dịch.
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
                Giao dịch chưa thể hoàn tất. Bạn có thể thử lại bằng phương thức thanh toán khác.
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
                Hệ thống đang đồng bộ với cổng thanh toán. Gói dịch vụ sẽ được kích hoạt ngay khi nhận tiền.
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
              <div className="flex justify-between">
                <span>Dịch vụ đăng ký:</span>
                <span className="font-bold text-gray-900">{plan.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Phương thức:</span>
                <span className="font-semibold uppercase text-gray-800">{method}</span>
              </div>
              <div className="flex justify-between">
                <span>Tổng tiền:</span>
                <span className="font-black text-base text-[#006d37]">{formatCurrency(amount)}</span>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="space-y-3 pt-2">
            {isSuccess ? (
              <>
                <Link to="/chu-tro/tong-quan">
                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    leftIcon={<PlusCircle className="w-4 h-4" />}
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                  >
                    Bắt Đầu Sử Dụng Ngay
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
                  className="border-emerald-600 text-[#006d37] hover:bg-emerald-50 font-bold"
                >
                  {isGeneratingInvoice ? 'Đang tạo biên lai PDF...' : 'Tải biên lai PDF'}
                </Button>

                <Link to="/chu-tro/phong/tao-moi">
                  <Button variant="outline" size="md" fullWidth leftIcon={<Building2 className="w-4 h-4" />}>
                    Đăng Phòng Trọ Mới
                  </Button>
                </Link>
              </>
            ) : isExpired ? (
              <>
                <Link to={`/thanh-toan/${planId}`}>
                  <Button variant="primary" size="lg" fullWidth leftIcon={<RotateCcw className="w-4 h-4" />}>
                    Tạo Mã QR Mới
                  </Button>
                </Link>
                <Link to="/nang-cap">
                  <Button variant="outline" size="md" fullWidth>
                    Quay Lại Bảng Giá
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link to={`/thanh-toan/${planId}`}>
                  <Button variant="primary" size="lg" fullWidth leftIcon={<RotateCcw className="w-4 h-4" />}>
                    Thử Lại Thanh Toán
                  </Button>
                </Link>
                <Link to="/nang-cap">
                  <Button variant="outline" size="md" fullWidth>
                    Quay Lại Bảng Giá
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Support Footer */}
          <div className="pt-4 border-t border-gray-100 text-xs text-gray-500 space-y-1.5">
            <p>Gặp sự cố thanh toán? Liên hệ ngay:</p>
            <div className="flex flex-wrap items-center justify-center gap-3 font-semibold">
              <a href="tel:0888110789" className="text-[#006d37] hover:underline">
                📞 0888 110 789
              </a>
              <span>•</span>
              <a
                href="https://zalo.me/0888110789"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-800 hover:underline"
              >
                💬 Zalo: 0888 110 789
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
