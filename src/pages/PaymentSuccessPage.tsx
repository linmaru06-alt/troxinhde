import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Clock, AlertTriangle, ArrowRight, Home, RefreshCw, ShieldCheck } from 'lucide-react';
import { SEOHead } from '../components/seo/SEOHead';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { formatCurrency } from '../components/ui/Cards';
import { getPayOSOrderStatus, PayOSOrderStatusResult } from '../lib/payos';
import {
  getListingPlanById,
  getBoostPackageById,
  getK23PlanByCode,
} from '../lib/monetizationCatalog';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { useAppStore } from '../store/useAppStore';

export const PaymentSuccessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { currentUser, fetchWallet } = useAppStore();

  const orderCode = searchParams.get('orderCode') || '';
  const [loading, setLoading] = useState<boolean>(true);
  const [orderData, setOrderData] = useState<PayOSOrderStatusResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [pollCount, setPollCount] = useState<number>(0);
  const didSyncCachesRef = useRef<boolean>(false);

  // Tra cứu trạng thái đơn hàng từ Database Supabase + Đối soát trực tiếp với PayOS
  const verifyRealOrderStatus = async (showLoadingState = false) => {
    if (!orderCode) {
      setErrorMessage('Không tìm thấy mã đơn hàng trong đường dẫn.');
      setLoading(false);
      return null;
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
    let timer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const runCheck = async () => {
      const res = await verifyRealOrderStatus(pollCount === 0);
      if (cancelled) return;

      // Tiếp tục kiểm tra định kỳ mỗi 2.5 giây (tối đa 48 lần ~ 2 phút) nếu đơn vẫn đang pending
      if (res && !res.isPaid && res.status === 'pending' && pollCount < 48) {
        timer = setTimeout(() => {
          setPollCount((prev) => prev + 1);
        }, 2500);
      }
    };

    runCheck();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [orderCode, pollCount]);

  // Lắng nghe Supabase Realtime để chuyển sang Thành Công ngay lập tức khi Webhook cập nhật DB
  useEffect(() => {
    if (!orderCode || !isSupabaseConfigured || !supabase) return;
    if (orderData?.isPaid || orderData?.status === 'paid' || orderData?.status === 'success') return;

    const channel = supabase
      .channel(`payos-success-page-${orderCode}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'transactions',
          filter: `order_code=eq.${orderCode}`,
        },
        (payload: any) => {
          const nextStatus = payload?.new?.status;
          if (nextStatus === 'paid' || nextStatus === 'success') {
            verifyRealOrderStatus(false);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderCode, orderData?.isPaid, orderData?.status]);

  const isActuallyPaid =
    Boolean(orderData?.isPaid) ||
    orderData?.status === 'paid' ||
    orderData?.status === 'success';
  const isStillPending = Boolean(orderData && !isActuallyPaid && orderData.status === 'pending');

  // Đồng bộ lại số dư Ví Xu, hạn mức tin, gói K23 ngay khi xác nhận đã thanh toán thành công
  useEffect(() => {
    if (!isActuallyPaid || didSyncCachesRef.current || !currentUser?.id) return;
    didSyncCachesRef.current = true;
    fetchWallet(currentUser.id);
    queryClient.invalidateQueries({ queryKey: ['wallet', currentUser.id] });
    queryClient.invalidateQueries({ queryKey: ['wallet-transactions', currentUser.id] });
    queryClient.invalidateQueries({ queryKey: ['owner-listing-quota', currentUser.id] });
    queryClient.invalidateQueries({ queryKey: ['k23-subscription'] });
  }, [isActuallyPaid, currentUser?.id, fetchWallet, queryClient]);

  // Xác định chính xác dịch vụ/quyền lợi đã được kích hoạt để hiển thị & điều hướng đúng chỗ
  const meta = (orderData?.metadata || {}) as Record<string, any>;
  const serviceType =
    orderData?.serviceType ||
    meta.service_type ||
    (orderData?.planId === 'wallet_topup' || meta.type === 'wallet_topup'
      ? 'wallet_topup'
      : 'listing_plan');

  const isOwnerOrAdmin = currentUser?.role === 'owner' || currentUser?.role === 'admin';

  const getFulfilledBenefitInfo = () => {
    if (serviceType === 'wallet_topup') {
      const totalXu = Number(meta.total_xu || Math.floor((orderData?.amount || 0) / 1000));
      return {
        serviceLabel: `Nạp Ví Trọ Xinh (+${totalXu.toLocaleString('vi-VN')} Xu)`,
        benefitNote: `Số dư +${totalXu.toLocaleString('vi-VN')} Xu đã được cộng vào ví của bạn.`,
        primaryCtaText: 'Xem số dư Ví Xu ngay',
        primaryCtaPath: isOwnerOrAdmin ? '/chu-tro/vi-xu' : '/vi-xu',
      };
    }
    if (serviceType === 'boost') {
      const boostId = meta.boost_id || String(orderData?.planId || '').replace(/^boost_/, '');
      const boostPkg = getBoostPackageById(boostId);
      return {
        serviceLabel: boostPkg ? `Đẩy tin VIP: ${boostPkg.name}` : 'Gói đẩy tin VIP Trọ Xinh',
        benefitNote: 'Tin phòng trọ của bạn đã được đẩy lên vị trí ưu tiên trên bảng tìm kiếm.',
        primaryCtaText: 'Xem phòng đang đẩy tin',
        primaryCtaPath: '/chu-tro',
      };
    }
    if (serviceType === 'k23') {
      const planCode = meta.plan_code || String(orderData?.planId || '').replace(/^k23_/, '');
      const k23Plan = getK23PlanByCode(planCode);
      return {
        serviceLabel: `Quản lý nhà trọ K23 — Gói ${k23Plan.name}`,
        benefitNote: 'Các tính năng quản lý hợp đồng, chốt điện nước và hóa đơn K23 đã sẵn sàng.',
        primaryCtaText: 'Vào Quản lý gói K23',
        primaryCtaPath: '/chu-tro/quan-ly-goi-k23',
      };
    }
    if (serviceType === 'repost') {
      const days = Number(meta.duration_days || 30);
      return {
        serviceLabel: `Gia hạn / Đăng lại tin (${days} ngày)`,
        benefitNote: `Tin phòng của bạn đã được gia hạn hiển thị thêm ${days} ngày.`,
        primaryCtaText: 'Quản lý danh sách phòng',
        primaryCtaPath: '/chu-tro',
      };
    }
    const listingPlan = getListingPlanById(orderData?.planId || meta.plan_id || '');
    return {
      serviceLabel: listingPlan ? `Gói đăng tin: ${listingPlan.name}` : 'Gói dịch vụ Trọ Xinh',
      benefitNote: 'Quyền lợi gói dịch vụ đã được kích hoạt tự động trên tài khoản của bạn.',
      primaryCtaText: isOwnerOrAdmin ? 'Xem gói dịch vụ đã kích hoạt' : 'Khám phá phòng trọ ngay',
      primaryCtaPath: isOwnerOrAdmin ? '/chu-tro/quan-ly-goi' : '/tim-phong',
    };
  };

  const benefitInfo = getFulfilledBenefitInfo();

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
              Hệ thống đang xác minh trực tiếp với cổng PayOS và cơ sở dữ liệu Trọ Xinh.
            </p>
          </div>
        ) : isActuallyPaid ? (
          /* TRƯỜNG HỢP 1: ĐÃ XÁC NHẬN NHẬN ĐỦ TIỀN & KÍCH HOẠT THÀNH CÔNG */
          <div className="space-y-6">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-12 h-12" />
            </div>

            <div className="space-y-2">
              <Badge variant="verified" className="px-3 py-1 text-xs uppercase tracking-wider font-semibold">
                Giao dịch thành công
              </Badge>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
                Thanh toán hoàn tất!
              </h1>
              <p className="text-sm text-slate-600">
                {benefitInfo.benefitNote}
              </p>
            </div>

            {/* Chi tiết đơn hàng */}
            <div className="bg-slate-50 rounded-2xl p-5 text-left border border-slate-100 space-y-3">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200 gap-2">
                <span className="text-xs text-slate-500 font-medium">Dịch vụ đã kích hoạt</span>
                <span className="text-xs font-extrabold text-slate-900 text-right">
                  {benefitInfo.serviceLabel}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-xs text-slate-500 font-medium">Mã đơn hàng</span>
                <span className="text-sm font-mono font-bold text-slate-800">#{orderData?.orderCode}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-xs text-slate-500 font-medium">Số tiền đã nhận</span>
                <span className="text-base font-bold text-emerald-600">
                  {formatCurrency(orderData?.amount || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                <span className="text-xs text-slate-500 font-medium">Phương thức</span>
                <span className="text-xs font-semibold text-slate-700 bg-white px-2 py-1 rounded-md border border-slate-200">
                  Cổng PayOS (MBBank VietQR)
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500 font-medium">Trạng thái hệ thống</span>
                <span className="inline-flex items-center text-xs font-bold text-emerald-600">
                  <ShieldCheck className="w-4 h-4 mr-1 text-emerald-500" />
                  Đã nhận đủ tiền &amp; kích hoạt
                </span>
              </div>
            </div>

            {/* Điều hướng */}
            <div className="pt-2 space-y-3">
              <Button
                onClick={() => navigate(benefitInfo.primaryCtaPath)}
                className="w-full justify-center bg-primary hover:bg-primary-hover text-white py-3 rounded-xl shadow-lg shadow-primary/20 cursor-pointer"
              >
                {benefitInfo.primaryCtaText}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>

              <Button
                variant="outline"
                onClick={() => navigate('/')}
                className="w-full justify-center border-slate-200 text-slate-600 hover:bg-slate-100 py-3 rounded-xl cursor-pointer"
              >
                <Home className="w-4 h-4 mr-2" />
                Về trang chủ Trọ Xinh
              </Button>
            </div>
          </div>
        ) : isStillPending ? (
          /* TRƯỜNG HỢP 2: ĐƠN HÀNG VẪN ĐANG PENDING (CHỜ NGÂN HÀNG XÁC NHẬN ĐỦ TIỀN) */
          <div className="space-y-6">
            <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto shadow-inner animate-pulse">
              <Clock className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <Badge variant="pending" className="px-3 py-1 text-xs uppercase tracking-wider font-semibold">
                Đang chờ xác nhận từ Ngân hàng
              </Badge>
              <h1 className="text-2xl font-black text-slate-900">
                Đang đối soát giao dịch PayOS
              </h1>
              <p className="text-sm text-slate-600">
                Hệ thống đang liên tục kiểm tra với PayOS. Ngay khi ngân hàng xác nhận đã nhận đủ số tiền, màn hình này sẽ tự động chuyển sang Thành Công.
              </p>
            </div>

            <div className="bg-amber-50/70 rounded-2xl p-4 text-left border border-amber-200 space-y-2">
              <div className="flex justify-between items-center text-xs text-amber-900">
                <span>Mã đơn:</span>
                <span className="font-mono font-bold">#{orderData?.orderCode}</span>
              </div>
              <div className="flex justify-between items-center text-xs text-amber-900">
                <span>Số tiền cần thanh toán:</span>
                <span className="font-bold">{formatCurrency(orderData?.amount || 0)}</span>
              </div>
              <p className="text-[11px] text-amber-700 pt-1">
                Lưu ý: Nếu bạn vừa chuyển khoản xong, vui lòng đợi 5–15 giây và không quét lại mã QR.
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-3">
              <Button
                onClick={() => verifyRealOrderStatus(true)}
                className="w-full justify-center bg-slate-800 hover:bg-slate-900 text-white py-3 rounded-xl cursor-pointer"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Kiểm tra lại trạng thái ngay
              </Button>

              <Button
                variant="outline"
                onClick={() => navigate('/')}
                className="w-full justify-center text-slate-600 py-3 rounded-xl cursor-pointer"
              >
                Về trang chủ (Dịch vụ sẽ tự kích hoạt)
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
                {errorMessage || 'Không tìm thấy thông tin thanh toán hợp lệ hoặc đơn hàng đã bị hủy/hết hạn.'}
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-3">
              <Button
                onClick={() => verifyRealOrderStatus(true)}
                className="w-full justify-center bg-primary text-white py-3 rounded-xl cursor-pointer"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Thử kiểm tra lại
              </Button>

              <Link to="/bang-gia" className="w-full">
                <Button variant="outline" className="w-full justify-center text-slate-600 py-3 rounded-xl cursor-pointer">
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
