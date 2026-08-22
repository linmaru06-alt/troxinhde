import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppStore, SUBSCRIPTION_PLANS } from '../store/useAppStore';
import { SEOHead } from '../components/seo/SEOHead';
import { DashboardSidebar } from '../components/layout/DashboardSidebar';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { formatCurrency } from '../components/ui/Cards';
import {
  Crown,
  Calendar,
  Building2,
  TrendingUp,
  Receipt,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Gift,
  X,
  Download,
} from 'lucide-react';

export const OwnerSubscriptionManagePage: React.FC = () => {
  const navigate = useNavigate();
  const {
    ownerSubscription,
    paymentTransactions,
    rooms,
    currentUser,
    cancelSubscription,
    showToast,
  } = useAppStore();

  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);
  const [retentionAccepted, setRetentionAccepted] = useState<boolean>(false);

  const myRooms = rooms.filter((r) => r.ownerId === currentUser?.id || r.ownerId === 'user_owner_1');
  const currentPlan =
    SUBSCRIPTION_PLANS.find((p) => p.id === ownerSubscription.planId) || SUBSCRIPTION_PLANS[0];

  const totalUsedRooms = myRooms.length;
  const roomLimit = currentPlan.roomLimit;
  const usagePercent = Math.min(100, Math.round((totalUsedRooms / (roomLimit === 999 ? 100 : roomLimit)) * 100));

  const handleConfirmCancel = () => {
    cancelSubscription();
    setShowCancelModal(false);
    showToast('Đã hủy tự động gia hạn thành công', 'Bạn vẫn sử dụng đầy đủ quyền lợi đến hết ngày hết hạn.', 'info');
  };

  const handleAcceptRetention = () => {
    setRetentionAccepted(true);
    setShowCancelModal(false);
    showToast('Nhận ưu đãi thành công! 🎁', 'Bạn được tặng thêm 01 lượt Đẩy Tin Nổi Bật miễn phí.', 'success');
  };

  return (
    <div className="flex bg-gray-50 min-h-[calc(100vh-4rem)]">
      <SEOHead
        title="Quản Lý Gói Dịch Vụ & Hóa Đơn | TroXinh"
        description="Quản lý gói thuê bao dịch vụ, hạn mức đăng phòng và lịch sử giao dịch hóa đơn điện tử."
        url="/chu-tro/quan-ly-goi"
      />

      <DashboardSidebar role="owner" />

      <main className="flex-1 p-4 sm:p-8 max-w-6xl space-y-8 overflow-y-auto">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Quản Lý Gói & Hóa Đơn
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Theo dõi tình trạng gói thuê bao, dung lượng phòng đã sử dụng và lịch sử thanh toán
            </p>
          </div>

          <Link to="/nang-cap">
            <Button variant="primary" size="md" leftIcon={<Crown className="w-4 h-4" />}>
              Nâng Cấp Gói Khác
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
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-extrabold text-gray-900">{currentPlan.name}</h2>
                  <Badge variant="verified" size="sm">
                    {ownerSubscription.status === 'active' ? 'Đang hoạt động' : 'Đã hết hạn'}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Ngày hết hạn: <strong className="text-gray-800">{new Date(ownerSubscription.expiresAt).toLocaleDateString('vi-VN')}</strong> • {ownerSubscription.autoRenew ? 'Tự động gia hạn: Bật' : 'Tự động gia hạn: Tắt'}
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <p className="text-xs text-gray-400">Chi phí gói</p>
              <p className="text-2xl font-black text-[#006d37]">
                {currentPlan.price === 0 ? 'Miễn phí' : `${formatCurrency(currentPlan.price)}/tháng`}
              </p>
            </div>
          </div>

          {/* Usage Meter */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-gray-800 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-[#006d37]" />
                Hạn mức số lượng phòng:
              </span>
              <span className="font-bold text-gray-900">
                {totalUsedRooms} / {roomLimit === 999 ? 'Không giới hạn' : `${roomLimit} phòng`}
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  usagePercent >= 90
                    ? 'bg-rose-500'
                    : usagePercent >= 70
                    ? 'bg-amber-500'
                    : 'bg-[#006d37]'
                }`}
                style={{ width: `${roomLimit === 999 ? 20 : usagePercent}%` }}
              />
            </div>

            {totalUsedRooms >= roomLimit && roomLimit !== 999 && (
              <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 font-medium mt-3">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>
                  Bạn đã đạt giới hạn <strong>{roomLimit} phòng</strong> của gói hiện tại. Hãy nâng cấp gói Cơ bản/Pro để tiếp tục đăng thêm phòng mới.
                </span>
              </div>
            )}
          </div>

          {/* Actions Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-100">
            <Link to="/nang-cap" className="text-xs font-bold text-[#006d37] hover:underline flex items-center gap-1">
              <span>Xem các gói nâng cấp cao hơn</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            {ownerSubscription.planId !== 'free' && ownerSubscription.autoRenew && (
              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                className="text-xs font-medium text-rose-600 hover:text-rose-700 hover:underline"
              >
                Hủy tự động gia hạn
              </button>
            )}
          </div>
        </div>

        {/* Billing & Payment History Table */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-md p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
              <Receipt className="w-5 h-5 text-[#006d37]" />
              Lịch Sử Giao Dịch & Hóa Đơn
            </h2>
            <span className="text-xs text-gray-400">{paymentTransactions.length} giao dịch</span>
          </div>

          {paymentTransactions.length === 0 ? (
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
                    <th className="py-3 px-3 font-semibold">Số tiền</th>
                    <th className="py-3 px-3 font-semibold">Phương thức</th>
                    <th className="py-3 px-3 font-semibold">Thời gian</th>
                    <th className="py-3 px-3 font-semibold">Trạng thái</th>
                    <th className="py-3 px-3 font-semibold text-right">Biên lai</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paymentTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50/60 transition">
                      <td className="py-3.5 px-3 font-mono font-bold text-gray-800">#{tx.orderId}</td>
                      <td className="py-3.5 px-3 font-medium text-gray-900">{tx.orderInfo}</td>
                      <td className="py-3.5 px-3 font-black text-[#006d37]">{formatCurrency(tx.amount)}</td>
                      <td className="py-3.5 px-3 font-semibold uppercase text-gray-700">{tx.method}</td>
                      <td className="py-3.5 px-3 text-gray-500">
                        {new Date(tx.createdAt).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[11px]">
                          <CheckCircle2 className="w-3 h-3" />
                          Thành công
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => showToast('Tải biên lai', `Biên lai #${tx.orderId} đã được xuất thành công!`, 'success')}
                          className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-600 hover:text-[#006d37] transition inline-flex items-center gap-1"
                          title="Tải biên lai VAT"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span className="text-[11px]">PDF</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Cancel Subscription Retention Modal */}
        <Modal
          isOpen={showCancelModal}
          onClose={() => setShowCancelModal(false)}
          title="Bạn có chắc chắn muốn hủy gia hạn?"
        >
          <div className="space-y-5 text-xs text-gray-600">
            {/* Retention Offer Card */}
            <div className="p-4 bg-linear-to-br from-amber-50 to-emerald-50 rounded-2xl border border-amber-200 space-y-2">
              <div className="flex items-center gap-2 font-black text-amber-900 text-sm">
                <Gift className="w-4 h-4 text-amber-600" />
                <span>Ưu đãi giữ chân dành riêng cho bạn!</span>
              </div>
              <p className="text-gray-700">
                Ở lại cùng Trọ Xinh ngay hôm nay để nhận <strong>01 lượt Đẩy Tin Nổi Bật VIP (trị giá 59.000đ)</strong> hoàn toàn miễn phí!
              </p>
              <Button
                variant="primary"
                size="sm"
                fullWidth
                onClick={handleAcceptRetention}
                leftIcon={<Sparkles className="w-4 h-4" />}
              >
                Nhận Quà & Tiếp Tục Duy Trì Gói
              </Button>
            </div>

            <p>
              Nếu bạn vẫn muốn hủy: Gói dịch vụ của bạn sẽ không tự động trừ tiền vào chu kỳ tiếp theo. Bạn vẫn có thể sử dụng đầy đủ các quyền lợi cho đến hết ngày <strong>{new Date(ownerSubscription.expiresAt).toLocaleDateString('vi-VN')}</strong>.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
              <Button variant="outline" size="sm" onClick={() => setShowCancelModal(false)}>
                Giữ Gói Của Tôi
              </Button>
              <Button variant="danger" size="sm" onClick={handleConfirmCancel}>
                Xác Nhận Hủy Gia Hạn
              </Button>
            </div>
          </div>
        </Modal>
      </main>
    </div>
  );
};
