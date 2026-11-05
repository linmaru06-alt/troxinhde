import { K23VipGate } from '../components/k23/subscription/K23VipGate';
import { SubscriptionBanner } from '../components/k23/subscription/SubscriptionBanner';
import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DashboardSidebar } from '../components/layout/DashboardSidebar';
import { useAppStore } from '../store/useAppStore';
import { useInvoices, useUpdateInvoiceStatus, useDeleteInvoice } from '../hooks/queries/useK23';
import { InvoiceStatusBadge } from '../components/k23/InvoiceStatusBadge';
import { InvoiceStatus } from '../types/k23';
import {
  Receipt,
  Building2,
  Calendar,
  DollarSign,
  CheckCircle,
  Clock,
  AlertCircle,
  Eye,
  Trash2,
  PlusCircle,
  ChevronLeft,
  ChevronRight,
  Zap,
} from 'lucide-react';

export const OwnerInvoiceListPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, buildings, showToast } = useAppStore();

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const isDemo = currentUser?.isDemoAccount || currentUser?.id === '00000000-0000-0000-0000-000000000002' || currentUser?.id === 'user_owner_1';
  const myBuildings = buildings.filter(
    (b) =>
      b.ownerId === currentUser?.id ||
      (isDemo && (b.ownerId === 'user_owner_1' || b.ownerId === '00000000-0000-0000-0000-000000000002')) ||
      (currentUser?.firebaseUid && b.ownerId === currentUser.firebaseUid)
  );

  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('all');

  const { data: invoices = [], isLoading } = useInvoices({
    ownerId: currentUser?.id || '',
    buildingId: selectedBuildingId !== 'all' ? selectedBuildingId : undefined,
    month: selectedMonth,
    year: selectedYear,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  });

  const updateStatusMutation = useUpdateInvoiceStatus();
  const deleteInvoiceMutation = useDeleteInvoice();

  // Metrics
  const metrics = useMemo(() => {
    const totalAmount = invoices.reduce((sum, inv) => sum + (inv.total_amount || 0), 0);
    const paidAmount = invoices.reduce((sum, inv) => sum + (inv.paid_amount || 0), 0);
    const remainingAmount = Math.max(0, totalAmount - paidAmount);
    const paidCount = invoices.filter((inv) => inv.status === 'paid').length;
    const overdueCount = invoices.filter((inv) => inv.status === 'overdue').length;

    return { totalAmount, paidAmount, remainingAmount, paidCount, overdueCount };
  }, [invoices]);

  const handleMarkAsPaid = async (invoiceId: string, total: number) => {
    try {
      await updateStatusMutation.mutateAsync({
        id: invoiceId,
        status: 'paid',
        paidAmount: total,
        paymentMethod: 'Chuyển khoản VietQR',
      });
      if (showToast) {
        showToast('Đã đánh dấu thanh toán thành công!', 'success');
      }
    } catch {
      alert('Không thể cập nhật trạng thái');
    }
  };

  const handleDelete = async (invoiceId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa hóa đơn này?')) return;
    try {
      await deleteInvoiceMutation.mutateAsync(invoiceId);
      if (showToast) {
        showToast('Đã xóa hóa đơn', 'info');
      }
    } catch {
      alert('Không thể xóa hóa đơn');
    }
  };

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  return (
    <K23VipGate featureTitle="Hóa Đơn & Tiền Nhà Hàng Tháng K23">
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans">
      <DashboardSidebar role="owner" />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          <SubscriptionBanner />
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
                <Receipt className="w-7 h-7 text-emerald-600" />
                Hóa Đơn & Tiền Nhà Hàng Tháng
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Quản lý hóa đơn thu tiền phòng, theo dõi công nợ và xuất bill gửi Zalo cho khách
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate('/chu-tro/chot-so')}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-amber-500 text-white hover:bg-amber-600 shadow transition-all"
              >
                <Zap className="w-4 h-4" />
                <span>Chốt số & Tạo bill</span>
              </button>
            </div>
          </div>

          {/* Metrics Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Total */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Tổng phải thu</span>
                <div className="p-2 bg-blue-50 dark:bg-blue-950/40 text-blue-600 rounded-xl">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <span className="text-lg sm:text-2xl font-black font-mono text-slate-900 dark:text-white mt-2 block">
                {metrics.totalAmount.toLocaleString('vi-VN')} đ
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">
                {invoices.length} phòng trong kỳ
              </span>
            </div>

            {/* Collected */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Đã thu về</span>
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-xl">
                  <CheckCircle className="w-4 h-4" />
                </div>
              </div>
              <span className="text-lg sm:text-2xl font-black font-mono text-emerald-600 mt-2 block">
                {metrics.paidAmount.toLocaleString('vi-VN')} đ
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">
                {metrics.paidCount}/{invoices.length} phòng đã trả
              </span>
            </div>

            {/* Remaining */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Còn nợ lại</span>
                <div className="p-2 bg-rose-50 dark:bg-rose-950/40 text-rose-600 rounded-xl">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <span className="text-lg sm:text-2xl font-black font-mono text-rose-600 mt-2 block">
                {metrics.remainingAmount.toLocaleString('vi-VN')} đ
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">Chưa thanh toán đủ</span>
            </div>

            {/* Overdue */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Quá hạn nộp</span>
                <div className="p-2 bg-amber-50 dark:bg-amber-950/40 text-amber-600 rounded-xl">
                  <AlertCircle className="w-4 h-4" />
                </div>
              </div>
              <span className="text-lg sm:text-2xl font-black font-mono text-amber-600 mt-2 block">
                {metrics.overdueCount} phòng
              </span>
              <span className="text-[11px] text-slate-400 mt-1 block">Cần nhắc đóng tiền</span>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              {/* Building selector */}
              {myBuildings.length > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs sm:text-sm">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <select
                    value={selectedBuildingId}
                    onChange={(e) => setSelectedBuildingId(e.target.value)}
                    className="bg-transparent font-semibold text-slate-800 dark:text-slate-200 outline-none"
                  >
                    <option value="all">Tất cả tòa nhà</option>
                    {myBuildings.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Status Filter Chips */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    statusFilter === 'all'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500'
                  }`}
                >
                  Tất cả
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('sent')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    statusFilter === 'sent'
                      ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm'
                      : 'text-slate-500'
                  }`}
                >
                  Chưa trả
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('paid')}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    statusFilter === 'paid'
                      ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm'
                      : 'text-slate-500'
                  }`}
                >
                  Đã trả
                </button>
              </div>
            </div>

            {/* Month Navigator */}
            <div className="flex items-center gap-1 self-end sm:self-auto bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-500"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-bold px-2 text-slate-800 dark:text-slate-200 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Tháng {selectedMonth}/{selectedYear}
              </span>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-500"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Invoices List */}
          {isLoading ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800">
              <p className="text-slate-400 animate-pulse text-sm">Đang tải danh sách hóa đơn...</p>
            </div>
          ) : invoices.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800 space-y-3">
              <Receipt className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                Chưa có hóa đơn nào trong tháng {selectedMonth}/{selectedYear}
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Bấm vào nút "Chốt số & Tạo bill" để ghi nhận số điện nước và tự động sinh hóa đơn cho
                các phòng
              </p>
              <button
                type="button"
                onClick={() => navigate('/chu-tro/chot-so')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-emerald-600 text-white hover:bg-emerald-700 shadow"
              >
                <Zap className="w-4 h-4" />
                Đi đến trang chốt số ngay
              </button>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 uppercase font-semibold text-[11px] border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="py-3 px-4">Mã hóa đơn</th>
                    <th className="py-3 px-3">Phòng thuê</th>
                    <th className="py-3 px-3">Khách thuê</th>
                    <th className="py-3 px-3 text-right">Tổng tiền</th>
                    <th className="py-3 px-3 text-right">Đã thu</th>
                    <th className="py-3 px-3 text-center">Trạng thái</th>
                    <th className="py-3 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {invoices.map((inv) => {
                    const roomNumber =
                      inv.room?.room_number || inv.room?.title || 'Phòng';
                    const remaining = inv.remaining ?? inv.total_amount - inv.paid_amount;

                    return (
                      <tr
                        key={inv.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3 px-4 font-mono font-medium text-slate-500">
                          #{inv.invoice_code}
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-900 dark:text-white">
                          {roomNumber}
                        </td>
                        <td className="py-3 px-3 text-slate-600 dark:text-slate-300">
                          {inv.tenant?.full_name || 'Khách thuê'}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                          {inv.total_amount.toLocaleString('vi-VN')} đ
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-emerald-600 font-semibold">
                          {inv.paid_amount.toLocaleString('vi-VN')} đ
                        </td>
                        <td className="py-3 px-3 text-center">
                          <InvoiceStatusBadge status={inv.status} />
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {inv.status !== 'paid' && (
                              <button
                                type="button"
                                onClick={() => handleMarkAsPaid(inv.id, inv.total_amount)}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-all"
                                title="Đánh dấu đã thu đủ tiền"
                              >
                                Đã thu
                              </button>
                            )}
                            <Link
                              to={`/chu-tro/hoa-don/${inv.id}`}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                              title="Xem chi tiết & gửi bill"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleDelete(inv.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all"
                              title="Xóa hóa đơn"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
    </K23VipGate>
  );
};

