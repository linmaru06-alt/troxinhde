import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle2, Clock, AlertTriangle, ArrowRight, Home, RefreshCw, ShieldCheck } from 'lucide-react';
import { SEOHead } from '../components/seo/SEOHead';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { formatCurrency } from '../components/ui/Cards';
import { getPayOSOrderStatus, PayOSOrderStatusResult } from '../lib/payos';
import { useAppStore } from '../store/useAppStore';

export const PaymentSuccessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentUser } = useAppStore();

  const orderCode = searchParams.get('orderCode') || '';
  const [loading, setLoading] = useState<boolean>(true);
  const [orderData, setOrderData] = useState<PayOSOrderStatusResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [pollCount, setPollCount] = useState<number>(0);

  // Tra cứu trạng thái đơn hàng từ Database Supabase (do webhook PayOS cập nhật)
  const verifyRealOrderStatus = async (showLoadingState = false) => {
    if (!orderCode) {
      setErrorMessage('Không tìm thấy mã đơn hàng trong đường dẫn.');
      setLoading(false);
      return;
    }

    if (showLoadingState) {
      setLoading(true);
    }

    try {
      const res = await getPayOSOrderStatus(orderCode);
      setOrderData(res);
      setErrorMessage('');
      return res;
    } catch (err: any) {
      console.warn('[PaymentSuccessPage] Lỗi kiểm tra trạng thái đơn:', err);
      setErrorMessage(err?.message || 'Không thể tra cứu trạng thái đơn hàng từ máy chủ.');
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    let cancelled = false;

    const runCheck = async () => {
      const res = await verifyRealOrderStatus(pollCount === 0);
      if (cancelled) return;

      // Nếu đơn hàng chưa được webhook đổi sang PAID và chưa quá 15 lần poll (30 giây)
      if (res && !res.isPaid && res.status === 'pending' && pollCount < 15) {
        timer = setTimeout(() => {
          setPollCount((prev) => prev + 1);
        }, 2000);
      }
    };

    runCheck();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [orderCode, pollCount]);

  const isActuallyPaid = orderData?.isPaid || orderData?.status === 'paid' || orderData?.status === 'success';
  const isStillPending = orderData && !isActuallyPaid && orderData.status === 'pending';

  return (
    <div className="min-h-[80vh] bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <SEOHead
        title="Thanh toán thành công | Trọ Xinh"
        description="Xác nhận kết quả thanh toán dịch vụ qua cổng PayOS trên Trọ Xinh."
      />

      <div className="max-w-lg w-full bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden p-6 sm:p-8 text-center transition-all">
        {loading && pollCount === 0 ? (
          <div className="py-12 space-y-4">
            <RefreshCw className="w-12 h-12 text-primary mx-auto animate-spin" />
            <h2 className="text-xl font-bold text-slate-800">Đang đối soát trạng thái từ Ngân hàng...</h2>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              Hệ thống đang kiểm tra chữ ký xác nhận của PayOS trong cơ sở dữ liệu.
            </p>
          </div>
        ) : isActuallyPaid ? (
          /* TRƯỜNG HỢP 1: WEBHOOK ĐÃ CẬP NHẬT DATABASE SANG PAID (THỰC TẾ 100%) */
          <div className="space-y-6">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner animate-bounce">
              <CheckCircle2 className="w-12 h-12" />
            </div>

            <div className="space-y-2">
              <Badge variant="success" className="px-3 py-1 text-xs uppercase tracking-wider font-semibold">
                Giao dịch thành công
              </Badge>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
                Thanh toán hoàn tất!
              </h1>
              <p className="text-sm text-slate-600">
                Giao dịch của bạn đã được PayOS xác thực và ghi nhận vào hệ thống Trọ Xinh.
              </p>
            </div>

            {/* Chi tiết đơn hàng */}
            <div className="bg-slate-50 rounded-2xl p-5 text-left border border-slate-100 space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-xs text-slate-500 font-medium">Mã đơn hàng</span>
                <span className="text-sm font-mono font-bold text-slate-800">#{orderData?.orderCode}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-xs text-slate-500 font-medium">Số tiền thanh toán</span>
                <span className="text-base font-bold text-emerald-600">
                  {formatCurrency(orderData?.amount || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-xs text-slate-500 font-medium">Phương thức</span>
                <span className="text-xs font-semibold text-slate-700 bg-white px-2 py-1 rounded-md border border-slate-200">
                  Cổng PayOS (VietQR)
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500 font-medium">Trạng thái Database</span>
                <span className="inline-flex items-center text-xs font-bold text-emerald-600">
                  <ShieldCheck className="w-4 h-4 mr-1 text-emerald-500" />
                  Đã ghi nhận PAID
                </span>
              </div>
            </div>

            {/* Điều hướng */}
            <div className="pt-2 space-y-3">
              {currentUser?.role === 'landlord' || currentUser?.role === 'admin' ? (
                <Button
                  onClick={() => navigate('/chu-tro/tong-quan')}
                  className="w-full justify-center bg-primary hover:bg-primary-hover text-white py-3 rounded-xl shadow-lg shadow-primary/20"
                >
                  Vào Bảng điều khiển Quản lý
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={() => navigate('/phong-tro')}
                  className="w-full justify-center bg-primary hover:bg-primary-hover text-white py-3 rounded-xl shadow-lg shadow-primary/20"
                >
                  Khám phá phòng trọ ngay
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}

              <Button
                variant="outline"
                onClick={() => navigate('/')}
                className="w-full justify-center border-slate-200 text-slate-600 hover:bg-slate-100 py-3 rounded-xl"
              >
                <Home className="w-4 h-4 mr-2" />
                Về trang chủ Trọ Xinh
              </Button>
            </div>
          </div>
        ) : isStillPending ? (
          /* TRƯỜNG HỢP 2: ĐƠN HÀNG VẪN ĐANG PENDING TRONG DATABASE (CHỜ WEBHOOK TỪ NGÂN HÀNG) */
          <div className="space-y-6">
            <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto shadow-inner animate-pulse">
              <Clock className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <Badge variant="warning" className="px-3 py-1 text-xs uppercase tracking-wider font-semibold">
                Đang chờ xác nhận từ Ngân hàng
              </Badge>
              <h1 className="text-2xl font-black text-slate-900">
                Đang chờ tín hiệu Webhook
              </h1>
              <p className="text-sm text-slate-600">
                Bạn đã hoàn tất thao tác thanh toán. Hệ thống đang đợi cổng PayOS gửi xác nhận gạch nợ vào Database (thường trong vòng 5 - 30 giây).
              </p>
            </div>

            <div className="bg-amber-50/70 rounded-2xl p-4 text-left border border-amber-200 space-y-2">
              <div className="flex justify-between items-center text-xs text-amber-900">
                <span>Mã đơn:</span>
                <span className="font-mono font-bold">#{orderData?.orderCode}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-amber-900">
                <span>Số tiền:</span>
                <span className="font-bold">{formatCurrency(orderData?.amount || 0)}</span>
              </div>
              <p className="text-[11px] text-amber-700 pt-1">
                Lưu ý: Bạn không cần quét mã lại. Sau khi nhận được tiền, hệ thống sẽ tự động kích hoạt dịch vụ của bạn.
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-3">
              <Button
                onClick={() => verifyRealOrderStatus(true)}
                className="w-full justify-center bg-slate-800 hover:bg-slate-900 text-white py-3 rounded-xl"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Kiểm tra lại trạng thái
              </Button>

              <Button
                variant="outline"
                onClick={() => navigate('/')}
                className="w-full justify-center text-slate-600 py-3 rounded-xl"
              >
                Về trang chủ (Dịch vụ sẽ tự cập nhật)
              </Button>
            </div>
          </div>
        ) : (
          /* TRƯỜNG HỢP 3: LỖI HOẶC KHÔNG TÌM THẤY ĐƠN HÀNG */
          <div className="space-y-6">
            <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-slate-900">
                Chưa thể xác nhận đơn hàng
              </h1>
              <p className="text-sm text-slate-600">
                {errorMessage || 'Không tìm thấy thông tin thanh toán hợp lệ hoặc đơn hàng chưa hoàn tất.'}
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-3">
              <Button
                onClick={() => verifyRealOrderStatus(true)}
                className="w-full justify-center bg-primary text-white py-3 rounded-xl"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Thử kiểm tra lại
              </Button>

              <Link to="/bang-gia" className="w-full">
                <Button variant="outline" className="w-full justify-center text-slate-600 py-3 rounded-xl">
                  Quay lại Bảng giá dịch vụ
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentSuccessPage;

