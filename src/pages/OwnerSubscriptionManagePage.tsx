import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAppStore, SUBSCRIPTION_PLANS } from '../store/useAppStore';
import { SEOHead } from '../components/seo/SEOHead';
import { DashboardSidebar } from '../components/layout/DashboardSidebar';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import {
  Crown,
  Building2,
  Receipt,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Gift,
  FileDown,
  Loader2,
  Rocket,
} from 'lucide-react';
import { generateInvoicePDF } from '../lib/generateInvoice';
import { PaymentTransaction } from '../types';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { resolveUserIdToUuid } from '../lib/api/messages';
import {
  getOwnerListingQuota,
  getOwnerListingCredits,
  cancelOwnerListingAutoRenew,
} from '../lib/api/monetization';
import {
  FREE_LISTING_QUOTA,
  XU_TO_VND_RATE,
  normalizeListingPlanId,
} from '../lib/monetizationCatalog';

export const OwnerSubscriptionManagePage: React.FC = () => {
  const queryClient = useQueryClient();
  const {
    ownerSubscription,
    paymentTransactions,
    rooms,
    currentUser,
    cancelSubscription,
    showToast,
  } = useAppStore();

  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);
  const [downloadingTxId, setDownloadingTxId] = useState<string | null>(null);

  const quotaQuery = useQuery({
    queryKey: ['owner-listing-quota', currentUser?.id],
    queryFn: () => getOwnerListingQuota(currentUser?.id),
    enabled: Boolean(currentUser?.id) && isSupabaseConfigured,
    staleTime: 15_000,
  });

  const creditsQuery = useQuery({
    queryKey: ['owner-listing-credits', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      const uid = await resolveUserIdToUuid(currentUser.id);
      return getOwnerListingCredits(uid || currentUser.id);
    },
    enabled: Boolean(currentUser?.id) && isSupabaseConfigured,
    staleTime: 30_000,
  });

  const serverTxQuery = useQuery({
    queryKey: ['owner-service-transactions', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id || !supabase) return [];
      const uid = await resolveUserIdToUuid(currentUser.id);
      if (!uid) return [];
      const { data, error } = await supabase
        .from('transactions')
        .select('id, order_code, plan_id, service_type, amount, amount_xu, method, status, created_at')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) return [];
      return (data || []).map((row: any): PaymentTransaction => ({
        id: row.id,
        userId: currentUser.id,
        userName: currentUser.name || 'Chủ Trọ',
        orderId: row.order_code,
        orderInfo:
          row.service_type === 'boost'
            ? `Đẩy tin (${row.plan_id || 'boost'})`
            : row.service_type === 'k23'
            ? `Quản lý K23 (${row.plan_id || 'standard'})`
            : row.service_type === 'repost'
            ? 'Gia hạn / Đăng lại tin'
            : `Gói đăng phòng (${row.plan_id || 'featured'})`,
        amount: Number(row.amount) || 0,
        amountXu: Number(row.amount_xu) || Math.round((Number(row.amount) || 0) / XU_TO_VND_RATE),
        method: row.method || 'vietqr',
        status: row.status === 'paid' || row.status === 'success' ? 'success' : row.status === 'failed' ? 'failed' : 'pending',
        planId: row.plan_id,
        createdAt: row.created_at,
      }));
    },
    enabled: Boolean(currentUser?.id) && isSupabaseConfigured,
    staleTime: 30_000,
  });

  const mergedTransactions: PaymentTransaction[] =
    serverTxQuery.data && serverTxQuery.data.length > 0 ? serverTxQuery.data : paymentTransactions;

  const quotaData = quotaQuery.data;
  const freeRepostRemaining = (creditsQuery.data || [])
    .filter((c) => c.status === 'available' || c.free_repost_remaining > 0)
    .reduce((sum, c) => sum + (Number(c.free_repost_remaining) || 0), 0);

  const activePlanCode =
    quotaData?.activePlanId && quotaData.activePlanId !== 'free'
      ? normalizeListingPlanId(quotaData.activePlanId) || 'free'
      : quotaData?.activePlanId === 'free'
      ? 'free'
      : ownerSubscription.planId === 'free'
      ? 'free'
      : normalizeListingPlanId(ownerSubscription.planId) || 'free';

  const currentPlan =
    SUBSCRIPTION_PLANS.find((p) => p.id === activePlanCode) || SUBSCRIPTION_PLANS[0];

  const myRooms = rooms.filter(
    (r) =>
      r.ownerId === currentUser?.id ||
      (Boolean(currentUser?.isDemoAccount) && r.ownerId === 'user_owner_1')
  );

  const isSubscriptionActive = quotaData
    ? quotaData.canCreateRoom
    : Boolean(ownerSubscription.expiresAt && new Date(ownerSubscription.expiresAt).getTime() > Date.now());

  const totalUsedRooms = quotaData ? quotaData.roomCount : myRooms.length;
  const roomLimit = quotaData
    ? quotaData.activePlanLimit === -1
      ? 999
      : quotaData.activePlanLimit
    : currentPlan.roomLimit;
  const usagePercent =
    roomLimit === 999
      ? 20
      : Math.min(100, Math.round((totalUsedRooms / Math.max(1, roomLimit)) * 100));

  const expiresAtDisplay = quotaData?.activePlanExpiresAt || ownerSubscription.expiresAt;
  const autoRenewDisplay = quotaData ? quotaData.autoRenew : ownerSubscription.autoRenew;

  const handleDownloadInvoice = async (tx: PaymentTransaction) => {
    setDownloadingTxId(tx.id);
    try {
      const createdDate = new Date(tx.createdAt);
      const expiredDate = new Date(createdDate);
      expiredDate.setDate(expiredDate.getDate() + 30);

      const planInfo = SUBSCRIPTION_PLANS.find((p) => p.id === tx.planId) || {
        name: tx.orderInfo || 'Gói Dịch Vụ Chủ Trọ',
        description: 'Dịch vụ chủ trọ Trọ Xinh',
      };

      const formatMethodName = (m: string) => {
        if (m === 'wallet_xu') return 'Xu nội bộ Trọ Xinh';
        if (m === 'vietqr' || m === 'banking') return 'Chuyển khoản VietQR (Techcombank)';
        if (m === 'momo') return 'Ví Điện Tử MoMo';
        return 'Thanh toán trực tuyến';
      };

      await generateInvoicePDF({
        orderCode: tx.orderId,
        orderDate: createdDate.toLocaleDateString('vi-VN'),
        orderTime: createdDate.toLocaleTimeString('vi-VN'),
        paymentMethod: formatMethodName(tx.method),
        buyerName: tx.userName || currentUser?.name || 'Đối Tác Chủ Trọ',
        buyerPhone: currentUser?.phone || '0912 345 678',
        buyerEmail: currentUser?.email || 'khachhang@troxinh.vn',
        planName: planInfo.name,
        planDescription: planInfo.description,
        planDuration: '30 ngày',
        startDate: createdDate.toLocaleDateString('vi-VN'),
        endDate: expiredDate.toLocaleDateString('vi-VN'),
        unitPrice: tx.amount,
        vatRate: 0,
        vatAmount: 0,
        totalAmount: tx.amount,
        sellerName: 'Nguyễn Vũ Chính',
        sellerAddress: '18 Ngõ 167 Tây Sơn, Phường Quang Trung, Quận Đống Đa, TP. Hà Nội',
        sellerPhone: '0888 110 789',
        sellerEmail: 'nguyenvuchinhb1hhb@gmail.com',
        sellerBank: 'Techcombank — STK: 0888110789',
      });

      showToast('Tải biên lai thành công!', `Biên lai giao dịch #${tx.orderId} đã được xuất.`, 'success');
    } catch (error) {
      console.error('[Invoice Error]', error);
      showToast('Có lỗi xảy ra', 'Không thể tạo biên lai PDF. Vui lòng thử lại.', 'error');
    } finally {
      setDownloadingTxId(null);
    }
  };

  const handleConfirmCancel = async () => {
    try {
      if (isSupabaseConfigured) {
        await cancelOwnerListingAutoRenew();
        await queryClient.invalidateQueries({ queryKey: ['owner-listing-quota', currentUser?.id] });
      }
      cancelSubscription();
      setShowCancelModal(false);
    } catch (err: any) {
      showToast('Không thể cập nhật tự động gia hạn', err?.message || 'Vui lòng thử lại.', 'error');
    }
  };

  return (
    <div className="flex bg-gray-50 min-h-[calc(100vh-4rem)]">
      <SEOHead
        title="Quản Lý Gói Đăng Phòng & Hóa Đơn | Trọ Xinh"
        description="Quản lý hạn mức phòng miễn phí, tin lẻ, gói Tin nổi bật / Pro và lịch sử thanh toán Xu."
        url="/chu-tro/quan-ly-goi"
      />

      <DashboardSidebar role="owner" />

      <main className="flex-1 p-4 sm:p-8 max-w-6xl space-y-8 overflow-y-auto">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-[#006d37]">
              Dịch vụ 1 • Gói đăng phòng
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Quản Lý Gói Đăng Phòng &amp; Giao Dịch
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Theo dõi 2 phòng miễn phí, tin lẻ khả dụng, gói đăng phòng và lịch sử thanh toán bằng Xu nội bộ
            </p>
          </div>

          <Link to="/bang-gia">
            <Button variant="primary" size="md" leftIcon={<Crown className="w-4 h-4" />}>
              Chọn / Nâng Cấp Gói
            </Button>
          </Link>
        </div>

        {/* Current Plan Overview Card */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-md p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-[#006d37] flex items-center justify-center shrink-0 shadow-xs">
                <Crown className="w-7 h-7" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-xl font-extrabold text-gray-900">{currentPlan.name}</h2>
                  <Badge variant={isSubscriptionActive ? 'verified' : 'outline'} size="sm">
                    {isSubscriptionActive ? 'Đang hoạt động' : 'Cần bổ sung gói'}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {activePlanCode === 'free' ? (
                    <>Còn <strong>{quotaData?.freeRemaining ?? Math.max(0, FREE_LISTING_QUOTA - totalUsedRooms)}/{FREE_LISTING_QUOTA} phòng miễn phí</strong> đầu tiên</>
                  ) : (
                    <>
                      Hiệu lực đến:{' '}
                      <strong className="text-gray-800">
                        {expiresAtDisplay ? new Date(expiresAtDisplay).toLocaleDateString('vi-VN') : '—'}
                      </strong>{' '}
                      • {autoRenewDisplay ? 'Tự động gia hạn: Bật' : 'Tự động gia hạn: Tắt'}
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <p className="text-xs text-gray-400">Chi phí gói</p>
              <p className="text-2xl font-black text-[#006d37] font-mono">
                {(currentPlan.priceXu ?? 0) === 0
                  ? '0 Xu (Miễn phí)'
                  : `${(currentPlan.priceXu ?? 0).toLocaleString('vi-VN')} Xu / ${currentPlan.period}`}
              </p>
            </div>
          </div>

          {/* 3 mini stats: Free quota / Single credits / Free reposts */}
          {quotaData && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200">
                <span className="text-emerald-800 font-semibold block">Phòng đầu miễn phí</span>
                <span className="text-lg font-black text-[#006d37] font-mono">
                  {quotaData.freeRemaining}/{quotaData.freeQuota} lượt còn lại
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200">
                <span className="text-amber-800 font-semibold block">Tin lẻ khả dụng</span>
                <span className="text-lg font-black text-amber-900 font-mono">
                  {quotaData.availableSingleCredits} tin
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-teal-50/70 border border-teal-200">
                <span className="text-teal-800 font-semibold block">Lượt đăng lại 0 Xu</span>
                <span className="text-lg font-black text-teal-900 font-mono">
                  {freeRepostRemaining} lượt tặng kèm
                </span>
              </div>
            </div>
          )}

          {/* Usage Meter */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-gray-800 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-[#006d37]" />
                Số phòng đang sử dụng:
              </span>
              <span className="font-bold text-gray-900">
                {totalUsedRooms} / {roomLimit === 999 ? 'Không giới hạn' : `${roomLimit} phòng`}
              </span>
            </div>

            <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  usagePercent >= 90
                    ? 'bg-rose-500'
                    : usagePercent >= 70
                    ? 'bg-amber-500'
                    : 'bg-[#006d37]'
                }`}
                style={{ width: `${usagePercent}%` }}
              />
            </div>

            {!isSubscriptionActive && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 font-medium mt-3">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>
                  Bạn đã hết <strong>2 phòng miễn phí</strong> và chưa có gói mở rộng khả dụng. Chọn Tin lẻ (30–50 Xu) hoặc gói Tin nổi bật (149 Xu) để tiếp tục đăng thêm phòng.
                </span>
              </div>
            )}
          </div>

          {/* Actions Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-100">
            <Link to="/bang-gia" className="text-xs font-bold text-[#006d37] hover:underline flex items-center gap-1">
              <span>Xem bảng giá Gói đăng phòng</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            {activePlanCode !== 'free' && autoRenewDisplay && (
              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                className="text-xs font-medium text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
              >
                Tắt tự động gia hạn
              </button>
            )}
          </div>
        </div>

        {/* Cross-links 2 dịch vụ độc lập khác */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <Link
            to="/chu-tro"
            className="p-5 rounded-3xl bg-white border border-amber-200 hover:border-amber-400 shadow-2xs transition flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <Rocket className="w-5 h-5" />
              </div>
              <div>
                <span className="font-black text-gray-900 text-sm block">Dịch vụ 2: Gói Đẩy Tin Nổi Bật</span>
                <span className="text-gray-500">Đẩy phòng lên top tìm kiếm từ 15 / 29 / 59 / 199 Xu</span>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-amber-700 shrink-0" />
          </Link>

          <Link
            to="/chu-tro/goi-dich-vu"
            className="p-5 rounded-3xl bg-white border border-emerald-200 hover:border-[#006d37] shadow-2xs transition flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-[#006d37] flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <span className="font-black text-gray-900 text-sm block">Dịch vụ 3: Quản Lý Phòng Trọ K23</span>
                <span className="text-gray-500">Quản lý hợp đồng &amp; điện nước từ 49 Xu/tháng (Thử 30N)</span>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-[#006d37] shrink-0" />
          </Link>
        </div>

        {/* Billing & Payment History Table */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-md p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-[#006d37]" />
              Lịch Sử Giao Dịch &amp; Hóa Đơn
            </h2>
            <span className="text-xs text-gray-400">{mergedTransactions.length} giao dịch</span>
          </div>

          {mergedTransactions.length === 0 ? (
            <div className="text-center py-10 text-xs text-gray-400">
              Chưa có giao dịch thanh toán nào được ghi nhận.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500">
                    <th className="py-3 px-3 font-semibold">Mã đơn</th>
                    <th className="py-3 px-3 font-semibold">Nội dung</th>
                    <th className="py-3 px-3 font-semibold">Giá trị</th>
                    <th className="py-3 px-3 font-semibold">Phương thức</th>
                    <th className="py-3 px-3 font-semibold">Thời gian</th>
                    <th className="py-3 px-3 font-semibold">Trạng thái</th>
                    <th className="py-3 px-3 font-semibold text-right">Biên lai</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {mergedTransactions.map((tx) => {
                    const xuVal = tx.amountXu ?? Math.round((tx.amount || 0) / XU_TO_VND_RATE);
                    return (
                      <tr key={tx.id} className="hover:bg-gray-50/60 transition">
                        <td className="py-3.5 px-3 font-mono font-bold text-gray-800">#{tx.orderId}</td>
                        <td className="py-3.5 px-3 font-medium text-gray-900">{tx.orderInfo}</td>
                        <td className="py-3.5 px-3 font-black text-[#006d37] font-mono">
                          {xuVal.toLocaleString('vi-VN')} Xu
                        </td>
                        <td className="py-3.5 px-3 font-semibold uppercase text-gray-700">{tx.method}</td>
                        <td className="py-3.5 px-3 text-gray-500">
                          {new Date(tx.createdAt).toLocaleDateString('vi-VN')}
                        </td>
                        <td className="py-3.5 px-3">
                          {tx.status === 'success' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[11px]">
                              <CheckCircle2 className="w-3 h-3" />
                              Thành công
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold text-[11px]">
                              {tx.status === 'failed' ? 'Thất bại' : 'Đang chờ'}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-3 text-right">
                          {tx.status === 'success' ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-[#006d37] border-emerald-600 hover:bg-emerald-50 gap-1.5 text-[11px] py-1 px-2.5 rounded-xl inline-flex items-center font-bold shadow-2xs"
                              onClick={() => handleDownloadInvoice(tx)}
                              disabled={downloadingTxId === tx.id}
                            >
                              {downloadingTxId === tx.id ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin text-[#006d37]" />
                                  <span>Đang tạo...</span>
                                </>
                              ) : (
                                <>
                                  <FileDown className="w-3 h-3 text-[#006d37]" />
                                  <span>Tải biên lai</span>
                                </>
                              )}
                            </Button>
                          ) : (
                            <span className="text-[11px] text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Cancel Subscription Modal */}
        <Modal
          isOpen={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          title="Bạn có chắc chắn muốn tắt tự động gia hạn?"
        >
          <div className="space-y-5 text-xs text-gray-600">
            <div className="p-4 bg-gradient-to-br from-amber-50 to-emerald-50 rounded-2xl border border-amber-200 space-y-2">
              <div className="flex items-center gap-2 font-black text-amber-900 text-sm">
                <Gift className="w-4 h-4 text-amber-600" />
                <span>Lưu ý quyền lợi gói đăng phòng</span>
              </div>
              <p className="text-gray-700">
                Khi tắt tự động gia hạn, gói <strong>{currentPlan.name}</strong> vẫn duy trì đầy đủ quyền lợi cho đến hết ngày{' '}
                <strong>
                  {expiresAtDisplay ? new Date(expiresAtDisplay).toLocaleDateString('vi-VN') : 'hết chu kỳ'}
                </strong>{' '}
                và không tự trừ Xu vào chu kỳ tiếp theo.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
              <Button variant="outline" size="sm" onClick={() => setShowCancelModal(false)}>
                Giữ Gia Hạn Tự Động
              </Button>
              <Button variant="danger" size="sm" onClick={handleConfirmCancel}>
                Xác Nhận Tắt Gia Hạn
              </Button>
            </div>
          </div>
        </Modal>
      </main>
    </div>
  );
};
