import React, { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';
import { DashboardSidebar } from '../components/layout/DashboardSidebar';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { OwnerApplication } from '../types';
import { getAllOwnerApplicationsAdmin } from '../lib/api/ownerUpgrade';
import { approveOwnerApplication as approveOwnerApplicationCloud, rejectOwnerApplication as rejectOwnerApplicationCloud } from '../lib/api/admin';
import {
  Building2,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  UserCheck,
  ShieldCheck,
  Phone,
  Mail,
  MapPin,
  X,
  FileCheck,
  ChevronRight,
  AlertTriangle,
  RefreshCw,
  Loader2,
} from 'lucide-react';

export const AdminOwnerApplicationsPage: React.FC = () => {
  const { ownerApplications, approveOwnerApplication, rejectOwnerApplication, currentUser, showToast } = useAppStore();

  const [applications, setApplications] = useState<OwnerApplication[]>(ownerApplications);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filterTab, setFilterTab] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [search, setSearch] = useState<string>('');
  const [selectedApp, setSelectedApp] = useState<OwnerApplication | null>(null);

  // Rejection Form state
  const [isRejectFormOpen, setIsRejectFormOpen] = useState<boolean>(false);
  const [rejectReason, setRejectReason] = useState<string>('Ảnh CCCD không rõ hoặc không hợp lệ');
  const [customRejectNote, setCustomRejectNote] = useState<string>('');
  const [showConfirmApprove, setShowConfirmApprove] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const cloudApps = await getAllOwnerApplicationsAdmin();
      if (cloudApps && cloudApps.length > 0) {
        // Merge cloud apps với local store nếu có đơn chưa sync
        const map = new Map<string, OwnerApplication>();
        cloudApps.forEach((a) => map.set(a.id, a));
        ownerApplications.forEach((a) => {
          if (!map.has(a.id)) {
            map.set(a.id, a);
          }
        });
        setApplications(Array.from(map.values()));
      } else {
        setApplications(ownerApplications);
      }
    } catch (err) {
      console.warn('[AdminOwnerApplicationsPage] Lỗi tải dữ liệu cloud:', err);
      setApplications(ownerApplications);
    } finally {
      setIsLoading(false);
    }
  }, [ownerApplications]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredApps = applications.filter((app) => {
    if (filterTab !== 'all' && app.status !== filterTab) return false;
    if (
      search &&
      !(app.userName || '').toLowerCase().includes(search.toLowerCase()) &&
      !(app.userPhone || '').includes(search) &&
      !(app.district || '').toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const pendingCount = applications.filter((a) => a.status === 'pending').length;

  const handleApprove = async (id: string) => {
    setIsProcessing(true);
    try {
      const app = applications.find((a) => a.id === id);
      const userId = app?.userId || id;

      // 1. Cập nhật trên Supabase Cloud
      try {
        await approveOwnerApplicationCloud(id, userId, currentUser);
      } catch (cloudErr) {
        console.warn('[Admin] Lỗi cập nhật cloud, tiếp tục cập nhật store:', cloudErr);
      }

      // 2. Cập nhật Store cục bộ
      approveOwnerApplication(id);

      // 3. Cập nhật state trang hiện tại
      setApplications((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: 'approved', reviewedAt: new Date().toISOString() } : a))
      );

      setShowConfirmApprove(false);
      if (selectedApp?.id === id) {
        setSelectedApp({ ...selectedApp, status: 'approved', reviewedAt: new Date().toISOString() });
      }

      showToast('Đã phê duyệt hồ sơ chủ trọ thành công!', `Tài khoản ${app?.userName || ''} đã được cấp quyền Chủ trọ.`, 'success');
    } catch (err: any) {
      showToast('Lỗi khi phê duyệt hồ sơ', err?.message || 'Vui lòng thử lại', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;
    const finalReason = customRejectNote ? `${rejectReason}: ${customRejectNote}` : rejectReason;

    setIsProcessing(true);
    try {
      // 1. Cập nhật trên Supabase Cloud
      try {
        await rejectOwnerApplicationCloud(selectedApp.id, selectedApp.userId, finalReason, currentUser);
      } catch (cloudErr) {
        console.warn('[Admin] Lỗi cập nhật cloud, tiếp tục cập nhật store:', cloudErr);
      }

      // 2. Cập nhật Store cục bộ
      rejectOwnerApplication(selectedApp.id, finalReason);

      // 3. Cập nhật state trang hiện tại
      setApplications((prev) =>
        prev.map((a) => (a.id === selectedApp.id ? { ...a, status: 'rejected', rejectionReason: finalReason, reviewedAt: new Date().toISOString() } : a))
      );

      setIsRejectFormOpen(false);
      setSelectedApp({
        ...selectedApp,
        status: 'rejected',
        rejectionReason: finalReason,
        reviewedAt: new Date().toISOString(),
      });

      showToast('Đã từ chối hồ sơ', `Lý do: ${finalReason}`, 'info');
    } catch (err: any) {
      showToast('Lỗi khi từ chối hồ sơ', err?.message || 'Vui lòng thử lại', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex bg-gray-50 min-h-[calc(100vh-4rem)]">
      <DashboardSidebar role="admin" />

      <main className="flex-1 p-4 sm:p-8 max-w-6xl space-y-6 overflow-y-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
              <Building2 className="w-7 h-7 text-[#006d37]" />
              Quản Lý Đơn Đăng Ký Chủ Trọ
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Thẩm định hồ sơ, xác minh CCCD và cấp quyền đối tác cho chủ cơ sở nhà trọ
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            isLoading={isLoading}
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
            className="self-start sm:self-auto"
          >
            Làm mới danh sách
          </Button>
        </div>

        {/* Filter Bar & Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
            {[
              { key: 'pending', label: `Chờ duyệt (${pendingCount})` },
              { key: 'approved', label: 'Đã duyệt' },
              { key: 'rejected', label: 'Bị từ chối' },
              { key: 'all', label: 'Tất cả' },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setFilterTab(t.key as any)}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition shrink-0 ${
                  filterTab === t.key
                    ? 'bg-[#006d37] text-white shadow-xs'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên, SĐT, quận..."
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#006d37]"
            />
          </div>
        </div>

        {/* Table List */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-100 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-4">Người Nộp Đơn</th>
                  <th className="p-4">Số Điện Thoại</th>
                  <th className="p-4">Tên Cơ Sở & Số Phòng</th>
                  <th className="p-4">Khu Vực</th>
                  <th className="p-4">Ngày Gửi</th>
                  <th className="p-4">Trạng Thái</th>
                  <th className="p-4 text-right">Hành Động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {filteredApps.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-12 text-center text-gray-400 text-xs">
                      Không có đơn đăng ký nào trong danh mục này.
                    </td>
                  </tr>
                ) : (
                  filteredApps.map((app) => (
                    <tr key={app.id} className="hover:bg-gray-50/80 transition">
                      <td className="p-4">
                        <div className="font-bold text-gray-900">{app.userName}</div>
                        <div className="text-[11px] text-gray-400">{app.userEmail || 'Chưa cập nhật email'}</div>
                      </td>
                      <td className="p-4 font-mono text-gray-700">
                        {app.userPhone}
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-gray-900">{app.buildingName}</div>
                        <div className="text-[11px] text-[#006d37] font-semibold">{app.totalRooms} phòng dự kiến</div>
                      </td>
                      <td className="p-4 text-gray-600">{app.district}</td>
                      <td className="p-4 text-gray-400 text-[11px]">
                        {new Date(app.createdAt).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="p-4">
                        <Badge
                          variant={app.status === 'approved' ? 'verified' : app.status === 'pending' ? 'pending' : 'rejected'}
                          size="sm"
                        >
                          {app.status === 'approved' ? 'Đã duyệt' : app.status === 'pending' ? 'Chờ duyệt' : 'Từ chối'}
                        </Badge>
                      </td>
                      <td className="p-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedApp(app);
                            setIsRejectFormOpen(false);
                          }}
                        >
                          Xem Chi Tiết →
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* DETAIL SIDE PANEL (Slide from right, width 480px) */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-2xs flex justify-end animate-fadeIn">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col animate-slideLeft">
            {/* Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-[#006d37] flex items-center justify-center font-bold">
                  {selectedApp.userName.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-gray-900">{selectedApp.userName}</h3>
                  <p className="text-[11px] text-gray-500">{selectedApp.userPhone} • {selectedApp.userEmail}</p>
                </div>
              </div>

              <button
                onClick={() => setSelectedApp(null)}
                className="p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
              {/* Status Badge */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-100">
                <span className="font-semibold text-gray-500">Trạng thái hồ sơ:</span>
                <Badge
                  variant={selectedApp.status === 'approved' ? 'verified' : selectedApp.status === 'pending' ? 'pending' : 'rejected'}
                  size="md"
                >
                  {selectedApp.status === 'approved' ? '✓ Đã Phê Duyệt' : selectedApp.status === 'pending' ? '⏳ Chờ Duyệt (24h)' : '✗ Bị Từ Chối'}
                </Badge>
              </div>

              {/* Section: Verification Details */}
              <div className="space-y-2">
                <h4 className="font-bold text-gray-900 uppercase text-[11px] tracking-wider text-[#006d37]">
                  1. Thông Tin Xác Minh
                </h4>
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Số Căn cước công dân (CCCD):</span>
                    <span className="font-mono font-bold text-gray-900">
                      {selectedApp.cccdNumber ? `${selectedApp.cccdNumber.slice(0, 3)} xxx xxx ${selectedApp.cccdNumber.slice(-3)}` : '079 xxx xxx 123'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Xác thực số điện thoại OTP:</span>
                    <span className="text-emerald-700 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Đã xác thực
                    </span>
                  </div>
                </div>
              </div>

              {/* Section: Property Info */}
              <div className="space-y-2">
                <h4 className="font-bold text-gray-900 uppercase text-[11px] tracking-wider text-[#006d37]">
                  2. Thông Tin Cơ Sở Nhà Trọ
                </h4>
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-2">
                  <div>
                    <span className="text-gray-400 block text-[10px]">Tên tòa nhà:</span>
                    <span className="font-bold text-gray-900 text-sm">{selectedApp.buildingName}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px]">Địa chỉ:</span>
                    <span className="font-semibold text-gray-800">{selectedApp.address}, {selectedApp.district}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px]">Quy mô:</span>
                    <span className="font-bold text-[#006d37]">{selectedApp.totalRooms} phòng cho thuê</span>
                  </div>
                  {selectedApp.legalDocsNote && (
                    <div className="pt-1">
                      <span className="text-gray-400 block text-[10px]">Giấy phép & PCCC:</span>
                      <p className="text-gray-700 bg-white p-2.5 rounded-xl border border-gray-200 mt-1">
                        {selectedApp.legalDocsNote}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Section: Commitments */}
              <div className="space-y-2">
                <h4 className="font-bold text-gray-900 uppercase text-[11px] tracking-wider text-[#006d37]">
                  3. Cam Kết Từ Chủ Cơ Sở
                </h4>
                <div className="p-3 bg-emerald-50/50 rounded-2xl border border-emerald-100 space-y-1.5 text-emerald-950">
                  <div className="flex items-center gap-2 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-[#006d37]" />
                    <span>Thông tin khai báo chính xác và trung thực 100%</span>
                  </div>
                  <div className="flex items-center gap-2 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-[#006d37]" />
                    <span>Tuân thủ quy định giá điện nước niêm yết công khai</span>
                  </div>
                  <div className="flex items-center gap-2 font-medium">
                    <CheckCircle2 className="w-4 h-4 text-[#006d37]" />
                    <span>Đảm bảo phòng thực tế đúng như hình ảnh và thông số</span>
                  </div>
                </div>
              </div>

              {/* Rejection Reason display if rejected */}
              {selectedApp.rejectionReason && (
                <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 text-rose-900 space-y-1">
                  <span className="font-bold flex items-center gap-1 text-rose-700">
                    <XCircle className="w-4 h-4" /> Lý do từ chối trước đó:
                  </span>
                  <p>{selectedApp.rejectionReason}</p>
                </div>
              )}
            </div>

            {/* Action Zone (Sticky bottom) */}
            <div className="p-4 border-t border-gray-200 bg-white space-y-3">
              {selectedApp.status === 'pending' && !isRejectFormOpen && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="md"
                    className="flex-1 text-rose-600 border-rose-200 hover:bg-rose-50"
                    onClick={() => setIsRejectFormOpen(true)}
                    leftIcon={<XCircle className="w-4 h-4" />}
                  >
                    Từ Chối Đơn
                  </Button>

                  <Button
                    variant="primary"
                    size="md"
                    className="flex-1"
                    onClick={() => setShowConfirmApprove(true)}
                    leftIcon={<CheckCircle2 className="w-4 h-4" />}
                  >
                    Phê Duyệt Làm Chủ Trọ
                  </Button>
                </div>
              )}

              {/* Expanded Rejection Form */}
              {isRejectFormOpen && (
                <form onSubmit={handleReject} className="space-y-3 p-3 bg-rose-50/50 rounded-2xl border border-rose-200 animate-fadeIn">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-rose-900 uppercase">Lý do từ chối *:</label>
                    <select
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-xl p-2 text-xs"
                    >
                      <option value="Ảnh CCCD không rõ hoặc không hợp lệ">Ảnh CCCD không rõ hoặc không hợp lệ</option>
                      <option value="Thông tin cơ sở nhà trọ không đầy đủ">Thông tin cơ sở nhà trọ không đầy đủ</option>
                      <option value="Khu vực chưa được hỗ trợ thẩm định">Khu vực chưa được hỗ trợ thẩm định</option>
                      <option value="Phát hiện thông tin không trung thực">Phát hiện thông tin không trung thực</option>
                      <option value="Tài khoản vi phạm quy định">Tài khoản vi phạm quy định</option>
                      <option value="Lý do khác">Lý do khác...</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-700">Ghi chú thêm cho người dùng:</label>
                    <textarea
                      rows={2}
                      value={customRejectNote}
                      onChange={(e) => setCustomRejectNote(e.target.value)}
                      placeholder="Vui lòng chụp lại ảnh CCCD rõ nét..."
                      className="w-full bg-white border border-gray-300 rounded-xl p-2 text-xs focus:ring-2 focus:ring-rose-500"
                    />
                  </div>

                  <div className="flex gap-2 justify-end pt-1">
                    <Button type="button" variant="outline" size="sm" onClick={() => setIsRejectFormOpen(false)}>
                      Hủy
                    </Button>
                    <Button type="submit" variant="destructive" size="sm">
                      Xác Nhận Từ Chối
                    </Button>
                  </div>
                </form>
              )}

              {selectedApp.status === 'approved' && (
                <div className="p-3 bg-emerald-50 rounded-2xl text-center text-xs font-bold text-[#006d37] border border-emerald-200">
                  ✓ Tài khoản đã được nâng cấp thành Chủ Trọ chính thức
                </div>
              )}

              {selectedApp.status === 'rejected' && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleApprove(selectedApp.id)}
                  >
                    Duyệt Lại Hồ Sơ Này
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Approve Confirmation Modal */}
      {showConfirmApprove && selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 text-center animate-scaleUp">
            <div className="w-14 h-14 bg-emerald-100 text-[#006d37] rounded-full flex items-center justify-center mx-auto shadow-xs">
              <UserCheck className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-base text-gray-900">Xác Nhận Nâng Cấp Tài Khoản?</h3>
            <p className="text-xs text-gray-500">
              Bạn đang nâng cấp <strong>{selectedApp.userName}</strong> thành Đối Tác Chủ Trọ TroXinh. Hành động này sẽ kích hoạt quyền đăng phòng và quản lý tòa nhà.
            </p>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" className="flex-1" disabled={isProcessing} onClick={() => setShowConfirmApprove(false)}>
                Hủy
              </Button>
              <Button variant="primary" size="sm" className="flex-1" isLoading={isProcessing} onClick={() => handleApprove(selectedApp.id)}>
                Xác Nhận Duyệt
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
