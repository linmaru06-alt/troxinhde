import React from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { XCircle, ArrowLeft, RefreshCw, HelpCircle } from 'lucide-react';
import { SEOHead } from '../components/seo/SEOHead';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

export const PaymentCancelPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const orderCode = searchParams.get('orderCode') || '';

  return (
    <div className="min-h-[80vh] bg-slate-50 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <SEOHead
        title="Đã hủy thanh toán | Trọ Xinh"
        description="Giao dịch thanh toán đã bị hủy trên cổng PayOS."
      />

      <div className="max-w-lg w-full bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden p-6 sm:p-8 text-center">
        <div className="space-y-6">
          <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <XCircle className="w-12 h-12" />
          </div>

          <div className="space-y-2">
            <Badge variant="warning" className="px-3 py-1 text-xs uppercase tracking-wider font-semibold">
              Giao dịch đã hủy
            </Badge>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
              Đã hủy thanh toán
            </h1>
            <p className="text-sm text-slate-600 max-w-sm mx-auto">
              Bạn vừa hủy yêu cầu thanh toán trên cổng PayOS. Tài khoản ngân hàng của bạn chưa bị trừ bất kỳ khoản phí nào.
            </p>
          </div>

          {orderCode && (
            <div className="bg-slate-50 rounded-2xl p-4 text-left border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between items-center text-slate-600">
                <span>Mã đơn hàng:</span>
                <span className="font-mono font-bold text-slate-800">#{orderCode}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Trạng thái:</span>
                <span className="font-semibold text-amber-600">Đã dừng thanh toán</span>
              </div>
            </div>
          )}

          <div className="pt-2 space-y-3">
            <Button
              onClick={() => navigate('/bang-gia')}
              className="w-full justify-center bg-primary hover:bg-primary-hover text-white py-3 rounded-xl shadow-lg shadow-primary/20"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Thử thanh toán lại
            </Button>

            <Button
              variant="outline"
              onClick={() => navigate('/')}
              className="w-full justify-center border-slate-200 text-slate-700 hover:bg-slate-100 py-3 rounded-xl"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Về trang chủ Trọ Xinh
            </Button>

            <div className="pt-2">
              <Link
                to="/ho-tro"
                className="inline-flex items-center text-xs text-slate-500 hover:text-primary transition-colors"
              >
                <HelpCircle className="w-3.5 h-3.5 mr-1" />
                Cần hỗ trợ thanh toán? Liên hệ CSKH Trọ Xinh
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentCancelPage;

