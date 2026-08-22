import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useAppStore, SUBSCRIPTION_PLANS } from '../store/useAppStore';
import { SEOHead } from '../components/seo/SEOHead';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { formatCurrency } from '../components/ui/Cards';
import {
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Home,
  Receipt,
  Download,
  Share2,
  Sparkles,
  Building2,
  PlusCircle,
} from 'lucide-react';

export const PaymentResultPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { paymentTransactions, rooms, currentUser } = useAppStore();

  const orderId = searchParams.get('orderId') || 'TRX_889201';
  const amount = Number(searchParams.get('amount')) || 99000;
  const statusParam = searchParams.get('status') || 'success';
  const planId = searchParams.get('plan') || 'basic';
  const method = searchParams.get('method') || 'momo';

  const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId) || SUBSCRIPTION_PLANS[1];

  const isSuccess = statusParam === 'success';
  const isFailed = statusParam === 'failed';
  const isPending = statusParam === 'pending';

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
                <span>GIAO DỊCH THÀNH CÔNG</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900">
                Cảm Ơn Bạn Đã Thanh Toán!
              </h1>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Gói <strong className="text-gray-900">{plan.name}</strong> của bạn đã được kích hoạt thành công trên hệ thống Trọ Xinh.
              </p>
            </div>
          )}

          {isFailed && (
            <div className="space-y-3">
              <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto shadow-md">
                <XCircle className="w-10 h-10 stroke-[2.5]" />
              </div>
              <h1 className="text-2xl font-black text-gray-900">Thanh Toán Chưa Hoàn Tất</h1>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Giao dịch bị gián đoạn hoặc tài khoản của bạn chưa bị trừ tiền. Bạn có thể kiểm tra lại và thực hiện thanh toán lại.
              </p>
            </div>
          )}

          {isPending && (
            <div className="space-y-3">
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto shadow-md">
                <Clock className="w-10 h-10 stroke-[2.5]" />
              </div>
              <h1 className="text-2xl font-black text-gray-900">Đang Chờ Xác Nhận</h1>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Hệ thống đang đối soát với ngân hàng. Gói dịch vụ sẽ tự động kích hoạt trong 1-5 phút tới.
              </p>
            </div>
          )}

          {/* Transaction Receipt Card */}
          <div className="bg-gray-50/80 rounded-2xl p-4 sm:p-6 text-left text-xs space-y-3 border border-gray-100">
            <div className="flex justify-between items-center pb-3 border-b border-gray-200">
              <span className="font-bold text-gray-700 flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-[#006d37]" />
                Hóa Đơn Điện Tử
              </span>
              <span className="font-mono text-gray-500 text-[11px]">#{orderId}</span>
            </div>

            <div className="space-y-2 text-gray-600">
              <div className="flex justify-between">
                <span>Dịch vụ:</span>
                <span className="font-bold text-gray-900">{plan.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Phương thức:</span>
                <span className="font-semibold text-gray-800 uppercase">{method}</span>
              </div>
              <div className="flex justify-between">
                <span>Thời gian giao dịch:</span>
                <span className="text-gray-700">{new Date().toLocaleString('vi-VN')}</span>
              </div>
              <div className="flex justify-between">
                <span>Hạn mức đăng phòng:</span>
                <span className="font-bold text-[#006d37]">
                  {plan.roomLimit === 999 ? 'Không giới hạn' : `${plan.roomLimit} phòng`}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-200 items-baseline">
                <span className="font-bold text-gray-900">Tổng tiền đã thanh toán:</span>
                <span className="text-base font-black text-[#006d37]">{formatCurrency(amount)}</span>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="space-y-3 pt-2">
            {isSuccess ? (
              <>
                <Link to="/chu-tro/phong/tao-moi">
                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    leftIcon={<PlusCircle className="w-4 h-4" />}
                    rightIcon={<ArrowRight className="w-4 h-4" />}
                  >
                    Đăng Thêm Phòng Trọ Mới
                  </Button>
                </Link>

                <Link to="/chu-tro">
                  <Button variant="outline" size="md" fullWidth leftIcon={<Building2 className="w-4 h-4" />}>
                    Về Bảng Điều Khiển Chủ Trọ
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link to={`/thanh-toan/${planId}`}>
                  <Button variant="primary" size="lg" fullWidth>
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
        </div>
      </div>
    </div>
  );
};
