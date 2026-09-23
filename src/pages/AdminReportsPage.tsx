import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAppStore } from '../store/useAppStore';
import { DashboardSidebar } from '../components/layout/DashboardSidebar';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
  GroupedReportItem,
  ReportTargetType,
  ReportStatusCode,
  REPORT_TARGET_LABELS,
  REPORT_REASON_LABELS,
  REPORT_STATUS_LABELS,
  ReportRecord,
} from '../types/report';
import {
  getGroupedReportsAdmin,
  hideReportedListing,
  restoreReportedListing,
  banReportedUser,
  unbanReportedUser,
  dismissReportsGroup,
} from '../lib/api/admin';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Search,
  Eye,
  EyeOff,
  UserX,
  UserCheck,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  ExternalLink,
  MessageSquare,
  User as UserIcon,
  Tag,
  AlertOctagon,
  Check,
  X,
  FileText,
  Lock,
} from 'lucide-react';

export const AdminReportsPage: React.FC = () => {
  const { currentUser, showToast } = useAppStore();

  const [groupedReports, setGroupedReports] = useState<GroupedReportItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<ReportStatusCode | 'all'>('all');
  const [targetTypeFilter, setTargetTypeFilter] = useState<ReportTargetType | 'all'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'most_reported'>('newest');

  // Modal xem chi tiết
  const [selectedGroup, setSelectedGroup] = useState<GroupedReportItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);

  // Modal thực hiện thao tác có ghi chú
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    type: 'hide' | 'restore' | 'ban' | 'unban' | 'dismiss';
    group: GroupedReportItem | null;
  }>({
    isOpen: false,
    type: 'hide',
    group: null,
  });
  const [adminNotes, setAdminNotes] = useState<string>('');
  const [actionError, setActionError] = useState<string>('');
  const [isSubmittingAction, setIsSubmittingAction] = useState<boolean>(false);

  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getGroupedReportsAdmin();
      setGroupedReports(data);
    } catch (err: any) {
      console.error('[AdminReportsPage] Lỗi tải báo cáo:', err);
      showToast(err.message || 'Không thể tải danh sách báo cáo', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Thống kê đếm
  const stats = useMemo(() => {
    const total = groupedReports.length;
    const moi = groupedReports.filter((g) => g.status === 'moi').length;
    const dangXuLy = groupedReports.filter((g) => g.status === 'dang_xu_ly').length;
    const daXuLy = groupedReports.filter((g) => g.status === 'da_xu_ly').length;
    const bacBo = groupedReports.filter((g) => g.status === 'bac_bo').length;
    const autoModeratedCount = groupedReports.filter((g) => g.auto_moderated || g.distinct_reporters >= 3).length;

    return { total, moi, dangXuLy, daXuLy, bacBo, autoModeratedCount };
  }, [groupedReports]);

  // Lọc và sắp xếp
  const filteredAndSortedGroups = useMemo(() => {
    let list = [...groupedReports];

    // Lọc theo trạng thái
    if (statusFilter !== 'all') {
      list = list.filter((g) => g.status === statusFilter);
    }

    // Lọc theo loại đối tượng
    if (targetTypeFilter !== 'all') {
      list = list.filter((g) => g.target_type === targetTypeFilter);
    }

    // Tìm kiếm từ khóa
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((g) => {
        const titleMatch = g.target_content?.title?.toLowerCase().includes(q);
        const descMatch = g.target_content?.description?.toLowerCase().includes(q);
        const snapshotMatch = g.target_content?.content_snapshot?.toLowerCase().includes(q);
        const ownerMatch = g.target_owner?.name?.toLowerCase().includes(q) || g.target_owner?.phone?.includes(q);
        const idMatch = g.target_id.toLowerCase().includes(q);
        const reporterMatch = g.reports.some(
          (r) =>
            r.reporter_name?.toLowerCase().includes(q) ||
            r.description?.toLowerCase().includes(q)
        );

        return Boolean(titleMatch || descMatch || snapshotMatch || ownerMatch || idMatch || reporterMatch);
      });
    }

    // Sắp xếp
    if (sortBy === 'newest') {
      list.sort((a, b) => new Date(b.latest_created_at).getTime() - new Date(a.latest_created_at).getTime());
    } else if (sortBy === 'most_reported') {
      list.sort((a, b) => b.total_reports - a.total_reports);
    }

    return list;
  }, [groupedReports, statusFilter, targetTypeFilter, searchQuery, sortBy]);

  // Mở modal thao tác
  const handleOpenActionModal = (type: 'hide' | 'restore' | 'ban' | 'unban' | 'dismiss', group: GroupedReportItem) => {
    setActionModal({
      isOpen: true,
      type,
      group,
    });
    setAdminNotes('');
    setActionError('');
  };

  // Xác nhận thực thi thao tác
  const handleConfirmAction = async () => {
    if (!adminNotes.trim()) {
      setActionError('Vui lòng nhập ghi chú lý do xử lý của Quản trị viên (bắt buộc).');
      return;
    }

    const { type, group } = actionModal;
    if (!group) return;

    setIsSubmittingAction(true);
    setActionError('');

    try {
      if (type === 'hide') {
        await hideReportedListing({
          targetType: group.target_type,
          targetId: group.target_id,
          adminNotes: adminNotes.trim(),
          admin: currentUser,
        });
        showToast('Đã ẩn tin đăng vi phạm và cập nhật trạng thái báo cáo', 'success');
      } else if (type === 'restore') {
        await restoreReportedListing({
          targetType: group.target_type,
          targetId: group.target_id,
          adminNotes: adminNotes.trim(),
          admin: currentUser,
        });
        showToast('Đã khôi phục tin đăng công khai', 'success');
      } else if (type === 'ban') {
        const userId = group.target_type === 'nguoi_dung' ? group.target_id : group.target_owner_id;
        if (!userId) {
          throw new Error('Không xác định được ID người dùng để khóa tài khoản');
        }
        await banReportedUser({
          userId,
          targetId: group.target_id,
          adminNotes: adminNotes.trim(),
          admin: currentUser,
        });
        showToast('Đã khóa tài khoản người dùng và xử lý báo cáo vi phạm', 'success');
      } else if (type === 'unban') {
        const userId = group.target_type === 'nguoi_dung' ? group.target_id : group.target_owner_id;
        if (!userId) {
          throw new Error('Không xác định được ID người dùng để mở khóa tài khoản');
        }
        await unbanReportedUser({
          userId,
          adminNotes: adminNotes.trim(),
          admin: currentUser,
        });
        showToast('Đã mở khóa tài khoản người dùng thành công', 'success');
      } else if (type === 'dismiss') {
        await dismissReportsGroup({
          targetType: group.target_type,
          targetId: group.target_id,
          adminNotes: adminNotes.trim(),
          admin: currentUser,
        });
        showToast('Đã bác bỏ báo cáo vi phạm', 'info');
      }

      setActionModal({ isOpen: false, type: 'hide', group: null });
      if (isDetailModalOpen) {
        setIsDetailModalOpen(false);
      }
      await fetchReports();
    } catch (err: any) {
      console.error('[AdminReportsPage] Thao tác thất bại:', err);
      setActionError(err.message || 'Thao tác không thành công, vui lòng thử lại.');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return `${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} ${d.toLocaleDateString('vi-VN')}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="flex bg-gray-50 min-h-[calc(100vh-4rem)]">
      <DashboardSidebar role="admin" />

      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-gray-200 shadow-xs">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-gray-900">Quản lý Báo cáo vi phạm</h1>
                <p className="text-xs text-gray-500 mt-0.5">
                  Xử lý các phản ánh vi phạm từ cộng đồng. Gom nhóm theo đối tượng và lưu nhật ký xử lý.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchReports}
              disabled={isLoading}
              className="text-xs flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Làm mới</span>
            </Button>
          </div>
        </div>

        {/* Thẻ thống kê */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`p-4 rounded-2xl border text-left transition-all ${
              statusFilter === 'all'
                ? 'bg-emerald-50 border-[#006d37] shadow-xs'
                : 'bg-white border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="text-[11px] font-bold text-gray-500 uppercase">Tổng đối tượng</div>
            <div className="text-2xl font-black text-gray-900 mt-1">{stats.total}</div>
            <div className="text-[11px] text-gray-500 mt-0.5">nhóm đối tượng vi phạm</div>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('moi')}
            className={`p-4 rounded-2xl border text-left transition-all ${
              statusFilter === 'moi'
                ? 'bg-rose-50 border-rose-500 shadow-xs'
                : 'bg-white border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="text-[11px] font-bold text-rose-600 uppercase flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              Mới tiếp nhận
            </div>
            <div className="text-2xl font-black text-rose-600 mt-1">{stats.moi}</div>
            <div className="text-[11px] text-gray-500 mt-0.5">cần xem xét & xử lý</div>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('dang_xu_ly')}
            className={`p-4 rounded-2xl border text-left transition-all ${
              statusFilter === 'dang_xu_ly'
                ? 'bg-amber-50 border-amber-500 shadow-xs'
                : 'bg-white border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="text-[11px] font-bold text-amber-600 uppercase">Đang xử lý</div>
            <div className="text-2xl font-black text-amber-700 mt-1">{stats.dangXuLy}</div>
            <div className="text-[11px] text-gray-500 mt-0.5">đang thẩm tra xác minh</div>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('da_xu_ly')}
            className={`p-4 rounded-2xl border text-left transition-all ${
              statusFilter === 'da_xu_ly'
                ? 'bg-emerald-50 border-emerald-500 shadow-xs'
                : 'bg-white border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="text-[11px] font-bold text-emerald-700 uppercase">Đã xử lý</div>
            <div className="text-2xl font-black text-emerald-700 mt-1">{stats.daXuLy}</div>
            <div className="text-[11px] text-gray-500 mt-0.5">đã ẩn tin / khóa user</div>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('bac_bo')}
            className={`p-4 rounded-2xl border text-left transition-all ${
              statusFilter === 'bac_bo'
                ? 'bg-gray-100 border-gray-400 shadow-xs'
                : 'bg-white border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="text-[11px] font-bold text-gray-600 uppercase">Bác bỏ</div>
            <div className="text-2xl font-black text-gray-700 mt-1">{stats.bacBo}</div>
            <div className="text-[11px] text-gray-500 mt-0.5">không vi phạm tiêu chuẩn</div>
          </button>
        </div>

        {/* Thanh công cụ: Tìm kiếm, Loại đối tượng, Sắp xếp */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-gray-200 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
            {/* Search Input */}
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm tiêu đề, nội dung, ID đối tượng, người báo cáo..."
                className="w-full text-xs pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl outline-none focus:bg-white focus:ring-2 focus:ring-[#006d37] transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Sắp xếp */}
            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">Sắp xếp:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="text-xs bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 outline-none font-semibold text-gray-700 focus:ring-2 focus:ring-[#006d37]"
              >
                <option value="newest">Báo cáo mới nhất</option>
                <option value="most_reported">Nhiều báo cáo nhất</option>
              </select>
            </div>
          </div>

          {/* Lọc theo Loại đối tượng & Trạng thái con */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
            <span className="text-xs font-bold text-gray-500 mr-1">Loại đối tượng:</span>
            {[
              { id: 'all', label: 'Tất cả đối tượng' },
              { id: 'tin_dang', label: 'Tin đăng' },
              { id: 'nguoi_dung', label: 'Người dùng' },
              { id: 'tin_nhan', label: 'Tin nhắn' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTargetTypeFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  targetTypeFilter === tab.id
                    ? 'bg-[#006d37] text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}

            <div className="ml-auto text-xs text-gray-400">
              Hiển thị <strong>{filteredAndSortedGroups.length}</strong> / {groupedReports.length} nhóm
            </div>
          </div>
        </div>

        {/* Danh sách Thẻ Báo cáo gom nhóm */}
        {isLoading ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-gray-200 shadow-xs space-y-3">
            <RefreshCw className="w-8 h-8 text-[#006d37] animate-spin mx-auto" />
            <p className="text-xs font-bold text-gray-600">Đang tải danh sách báo cáo vi phạm...</p>
          </div>
        ) : filteredAndSortedGroups.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-gray-200 shadow-xs space-y-3">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto">
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-gray-900">Không có báo cáo vi phạm nào phù hợp</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Tất cả các đối tượng đã được xử lý hoặc không có phản ánh nào khớp với bộ lọc hiện tại.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAndSortedGroups.map((group) => {
              const isAutoModerated = group.auto_moderated || group.distinct_reporters >= 3;
              const hasUnresolved = group.status === 'moi' || group.status === 'dang_xu_ly';

              return (
                <div
                  key={`${group.target_type}:${group.target_id}`}
                  className={`bg-white rounded-3xl p-5 sm:p-6 border transition-all shadow-xs hover:shadow-md ${
                    isAutoModerated && hasUnresolved
                      ? 'border-rose-300 ring-1 ring-rose-200'
                      : 'border-gray-200'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row justify-between gap-5">
                    {/* Phần nội dung chính */}
                    <div className="flex-1 space-y-3">
                      {/* Huy hiệu header */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Loại đối tượng */}
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold flex items-center gap-1 ${
                            group.target_type === 'tin_dang'
                              ? 'bg-emerald-100 text-emerald-800'
                              : group.target_type === 'nguoi_dung'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-sky-100 text-sky-800'
                          }`}
                        >
                          {group.target_type === 'tin_dang' && <Tag className="w-3 h-3" />}
                          {group.target_type === 'nguoi_dung' && <UserIcon className="w-3 h-3" />}
                          {group.target_type === 'tin_nhan' && <MessageSquare className="w-3 h-3" />}
                          {REPORT_TARGET_LABELS[group.target_type] || group.target_type}
                        </span>

                        {/* Trạng thái nhóm */}
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                            group.status === 'moi'
                              ? 'bg-rose-100 text-rose-700'
                              : group.status === 'dang_xu_ly'
                              ? 'bg-amber-100 text-amber-800'
                              : group.status === 'bac_bo'
                              ? 'bg-gray-100 text-gray-700'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {REPORT_STATUS_LABELS[group.status] || group.status}
                        </span>

                        {/* Cảnh báo Ngưỡng Auto-Moderation (>= 3 người khác nhau) */}
                        {isAutoModerated && (
                          <span className="px-2.5 py-1 rounded-lg text-[11px] font-black bg-rose-600 text-white flex items-center gap-1 shadow-xs animate-pulse">
                            <AlertOctagon className="w-3 h-3" />
                            Đã đạt ngưỡng kiểm duyệt tự động ({group.distinct_reporters} người phản ánh)
                          </span>
                        )}

                        {/* Số lượng báo cáo */}
                        <span className="text-xs font-bold text-gray-500 ml-auto">
                          <strong>{group.total_reports}</strong> báo cáo từ{' '}
                          <strong>{group.distinct_reporters}</strong> người dùng
                        </span>
                      </div>

                      {/* Tiêu đề & Thông tin đối tượng bị báo cáo */}
                      <div className="flex items-start gap-3.5 pt-1">
                        {/* Thumbnail ảnh nếu là tin đăng */}
                        {group.target_content?.images && group.target_content.images.length > 0 ? (
                          <img
                            src={group.target_content.images[0]}
                            alt={group.target_content.title}
                            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border border-gray-100 shrink-0"
                          />
                        ) : group.target_owner?.avatarUrl ? (
                          <img
                            src={group.target_owner.avatarUrl}
                            alt={group.target_owner.name}
                            className="w-14 h-14 rounded-2xl object-cover border border-gray-100 shrink-0"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 shrink-0">
                            {group.target_type === 'tin_nhan' ? (
                              <MessageSquare className="w-6 h-6" />
                            ) : group.target_type === 'nguoi_dung' ? (
                              <UserIcon className="w-6 h-6" />
                            ) : (
                              <Tag className="w-6 h-6" />
                            )}
                          </div>
                        )}

                        <div className="space-y-1 overflow-hidden">
                          <h3 className="text-base font-bold text-gray-900 leading-snug">
                            {group.target_content?.title ||
                              group.target_owner?.name ||
                              `Đối tượng [${group.target_type}] ID: ${group.target_id.slice(0, 12)}...`}
                          </h3>

                          {/* Snapshot nội dung lúc báo cáo */}
                          {group.target_content?.content_snapshot && (
                            <p className="text-xs text-gray-600 bg-amber-50/70 border border-amber-200/60 rounded-xl p-2 font-mono line-clamp-2">
                              <strong>Bản sao lúc báo cáo:</strong> "{group.target_content.content_snapshot}"
                            </p>
                          )}

                          {/* Metadata người sở hữu */}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 pt-0.5">
                            {group.target_owner && (
                              <span>
                                Người đăng/sở hữu: <strong>{group.target_owner.name}</strong>
                                {group.target_owner.phone && ` (${group.target_owner.phone})`}
                                {group.target_owner.isBanned && (
                                  <span className="ml-1 text-[10px] font-bold text-rose-600 uppercase bg-rose-50 px-1 rounded">
                                    Đã khóa
                                  </span>
                                )}
                              </span>
                            )}
                            <span>Mã đối tượng: <code className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">{group.target_id}</code></span>
                          </div>
                        </div>
                      </div>

                      {/* Các lý do vi phạm phổ biến */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-xs font-semibold text-gray-400 mr-1">Lý do:</span>
                        {group.reasons.map((reason) => (
                          <span
                            key={reason}
                            className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-gray-100 text-gray-700"
                          >
                            {REPORT_REASON_LABELS[reason] || reason}
                          </span>
                        ))}
                        <span className="text-[11px] text-gray-400 ml-2">
                          Báo cáo gần nhất: {formatDate(group.latest_created_at)}
                        </span>
                      </div>

                      {/* Thông tin giải quyết trước đó nếu có */}
                      {group.resolved_at && (
                        <div className="bg-gray-50 rounded-2xl p-3 border border-gray-200/80 text-xs space-y-1">
                          <div className="flex items-center gap-2 text-gray-600">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>
                              Xử lý bởi: <strong>{group.resolved_by_name || 'Admin'}</strong> lúc{' '}
                              <strong>{formatDate(group.resolved_at)}</strong>
                            </span>
                          </div>
                          {group.admin_notes && (
                            <p className="text-gray-700 italic pl-5.5">
                              "{group.admin_notes}"
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Cột nút hành động */}
                    <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0 justify-end lg:w-48 lg:border-l lg:border-gray-100 lg:pl-5">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedGroup(group);
                          setIsDetailModalOpen(true);
                        }}
                        className="text-xs w-full flex items-center justify-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Xem chi tiết ({group.total_reports})</span>
                      </Button>

                      {/* 4 Thao tác xử lý nghiệp vụ */}
                      {group.target_type === 'tin_dang' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenActionModal('hide', group)}
                            className="text-xs w-full text-rose-600 hover:bg-rose-50 border-rose-200 flex items-center justify-center gap-1.5"
                          >
                            <EyeOff className="w-3.5 h-3.5" />
                            <span>Ẩn tin đăng</span>
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenActionModal('restore', group)}
                            className="text-xs w-full text-[#006d37] hover:bg-emerald-50 border-emerald-200 flex items-center justify-center gap-1.5"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Khôi phục tin</span>
                          </Button>
                        </>
                      )}

                      {/* Thao tác Khóa / Mở khóa người dùng */}
                      {group.target_owner?.isBanned ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenActionModal('unban', group)}
                          className="text-xs w-full text-emerald-700 hover:bg-emerald-50 border-emerald-300 flex items-center justify-center gap-1.5"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Mở khóa người dùng</span>
                        </Button>
                      ) : (
                        (() => {
                          const targetUserId = group.target_type === 'nguoi_dung' ? group.target_id : group.target_owner_id;
                          const isSelf = Boolean(currentUser?.id && targetUserId === currentUser.id);
                          // Tránh khóa admin
                          return (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={isSelf}
                              title={isSelf ? 'Quản trị viên không thể tự khóa chính mình' : undefined}
                              onClick={() => handleOpenActionModal('ban', group)}
                              className={`text-xs w-full flex items-center justify-center gap-1.5 ${
                                isSelf
                                  ? 'opacity-50 cursor-not-allowed bg-gray-100 text-gray-400 border-gray-200'
                                  : 'text-rose-700 hover:bg-rose-50 border-rose-300'
                              }`}
                            >
                              <UserX className="w-3.5 h-3.5" />
                              <span>{isSelf ? 'Tài khoản của bạn' : 'Khóa người dùng'}</span>
                            </Button>
                          );
                        })()
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenActionModal('dismiss', group)}
                        className="text-xs w-full text-gray-600 hover:bg-gray-100 border-gray-300 flex items-center justify-center gap-1.5"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Bác bỏ báo cáo</span>
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* MODAL 1: XEM CHI TIẾT ĐỐI TƯỢNG VÀ DANH SÁCH BÁO CÁO CON */}
        {isDetailModalOpen && selectedGroup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-fade-in">
            <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden">
              {/* Header modal */}
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-gray-900">Chi tiết Báo cáo vi phạm</h2>
                    <p className="text-xs text-gray-500">
                      Gom {selectedGroup.total_reports} báo cáo từ {selectedGroup.distinct_reporters} người dùng
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsDetailModalOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body modal */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {/* 1. Thông tin đối tượng bị báo cáo */}
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-gray-500">
                      Đối tượng bị báo cáo ({REPORT_TARGET_LABELS[selectedGroup.target_type]})
                    </span>
                    {selectedGroup.target_content?.url && (
                      <a
                        href={selectedGroup.target_content.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-bold text-[#006d37] hover:underline flex items-center gap-1"
                      >
                        <span>Xem trang công khai</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  <div className="flex items-start gap-4">
                    {selectedGroup.target_content?.images && selectedGroup.target_content.images.length > 0 && (
                      <img
                        src={selectedGroup.target_content.images[0]}
                        alt="Target"
                        className="w-20 h-20 rounded-2xl object-cover border border-gray-200 shrink-0"
                      />
                    )}
                    <div className="space-y-1">
                      <h4 className="text-sm font-black text-gray-900">
                        {selectedGroup.target_content?.title || `ID: ${selectedGroup.target_id}`}
                      </h4>
                      {selectedGroup.target_content?.price !== undefined && (
                        <div className="text-xs font-extrabold text-[#006d37]">
                          {selectedGroup.target_content.price.toLocaleString('vi-VN')} đ
                        </div>
                      )}
                      {selectedGroup.target_owner && (
                        <div className="text-xs text-gray-600">
                          Người tạo/sở hữu: <strong>{selectedGroup.target_owner.name}</strong> - SĐT:{' '}
                          <strong>{selectedGroup.target_owner.phone || '—'}</strong>
                          {selectedGroup.target_owner.isBanned && (
                            <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-700">
                              ĐÃ BỊ KHÓA
                            </span>
                          )}
                        </div>
                      )}
                      <div className="text-[11px] text-gray-400">
                        Mã ID: <code>{selectedGroup.target_id}</code>
                      </div>
                    </div>
                  </div>

                  {/* Bản sao nội dung lúc báo cáo */}
                  {selectedGroup.target_content?.content_snapshot && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-1">
                      <span className="font-bold text-amber-900">Bản sao nội dung lúc người dùng báo cáo:</span>
                      <p className="text-gray-800 font-mono text-[11px] whitespace-pre-wrap">
                        {selectedGroup.target_content.content_snapshot}
                      </p>
                    </div>
                  )}
                </div>

                {/* 2. Lịch sử đã xử lý (nếu có) */}
                {selectedGroup.resolved_at && (
                  <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 space-y-1.5 text-xs">
                    <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Thông tin xử lý gần nhất</span>
                    </div>
                    <div className="text-gray-700">
                      Xử lý bởi: <strong>{selectedGroup.resolved_by_name || 'Quản trị viên'}</strong> vào lúc{' '}
                      <strong>{formatDate(selectedGroup.resolved_at)}</strong>
                    </div>
                    {selectedGroup.admin_notes && (
                      <div className="text-gray-800 italic pt-1">
                        Ghi chú: "{selectedGroup.admin_notes}"
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Danh sách từng báo cáo con */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black uppercase text-gray-500">
                    Danh sách chi tiết {selectedGroup.reports.length} phản ánh gửi về
                  </h4>

                  <div className="space-y-2.5">
                    {selectedGroup.reports.map((report, idx) => (
                      <div
                        key={report.id || idx}
                        className="bg-white p-3.5 rounded-2xl border border-gray-200 text-xs space-y-2 shadow-2xs"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center font-bold text-[10px] text-gray-600">
                              {idx + 1}
                            </span>
                            <span className="font-bold text-gray-900">
                              {report.reporter_name || `Người dùng [${report.reporter_id?.slice(0, 8)}]`}
                            </span>
                            <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                              Bảo vệ người tố giác
                            </span>
                          </div>
                          <span className="text-gray-400 text-[11px]">{formatDate(report.created_at)}</span>
                        </div>

                        <div className="flex items-center gap-2 pl-7">
                          <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-rose-50 text-rose-700 border border-rose-200">
                            {REPORT_REASON_LABELS[report.reason] || report.reason}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-gray-100 text-gray-600 font-medium">
                            Trạng thái: {REPORT_STATUS_LABELS[report.status] || report.status}
                          </span>
                        </div>

                        {report.description && (
                          <div className="pl-7 text-gray-700 bg-gray-50 p-2 rounded-xl text-[11px] whitespace-pre-wrap">
                            {report.description}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer modal: Các thao tác nhanh */}
              <div className="p-4 sm:p-6 bg-gray-50 border-t border-gray-100 flex flex-wrap gap-2 justify-end">
                {selectedGroup.target_type === 'tin_dang' && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenActionModal('hide', selectedGroup)}
                      className="text-xs text-rose-600 hover:bg-rose-50 border-rose-200"
                    >
                      <EyeOff className="w-3.5 h-3.5 mr-1" />
                      Ẩn tin
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenActionModal('restore', selectedGroup)}
                      className="text-xs text-[#006d37] hover:bg-emerald-50 border-emerald-200"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1" />
                      Khôi phục tin
                    </Button>
                  </>
                )}
                {selectedGroup.target_owner?.isBanned ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenActionModal('unban', selectedGroup)}
                    className="text-xs text-emerald-700 hover:bg-emerald-50 border-emerald-300"
                  >
                    <UserCheck className="w-3.5 h-3.5 mr-1" />
                    Mở khóa người dùng
                  </Button>
                ) : (
                  (() => {
                    const targetUserId = selectedGroup.target_type === 'nguoi_dung' ? selectedGroup.target_id : selectedGroup.target_owner_id;
                    const isSelf = Boolean(currentUser?.id && targetUserId === currentUser.id);
                    return (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isSelf}
                        onClick={() => handleOpenActionModal('ban', selectedGroup)}
                        className={`text-xs ${
                          isSelf
                            ? 'opacity-50 cursor-not-allowed bg-gray-100 text-gray-400 border-gray-200'
                            : 'text-rose-700 hover:bg-rose-50 border-rose-300'
                        }`}
                      >
                        <UserX className="w-3.5 h-3.5 mr-1" />
                        {isSelf ? 'Tài khoản của bạn' : 'Khóa người dùng'}
                      </Button>
                    );
                  })()
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenActionModal('dismiss', selectedGroup)}
                  className="text-xs text-gray-600 hover:bg-gray-200"
                >
                  <XCircle className="w-3.5 h-3.5 mr-1" />
                  Bác bỏ báo cáo
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsDetailModalOpen(false)}
                  className="text-xs"
                >
                  Đóng
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 2: XÁC NHẬN THAO TÁC CÓ GHI CHÚ BẮT BUỘC */}
        {actionModal.isOpen && actionModal.group && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-gray-100">
              {/* Tiêu đề modal */}
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    actionModal.type === 'restore' || actionModal.type === 'unban'
                      ? 'bg-emerald-100 text-emerald-700'
                      : actionModal.type === 'dismiss'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {actionModal.type === 'restore' ? (
                    <RotateCcw className="w-6 h-6" />
                  ) : actionModal.type === 'unban' ? (
                    <UserCheck className="w-6 h-6" />
                  ) : actionModal.type === 'dismiss' ? (
                    <XCircle className="w-6 h-6" />
                  ) : actionModal.type === 'ban' ? (
                    <UserX className="w-6 h-6" />
                  ) : (
                    <EyeOff className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-black text-gray-900">
                    {actionModal.type === 'hide' && 'Ẩn tin đăng vi phạm'}
                    {actionModal.type === 'restore' && 'Khôi phục tin đăng'}
                    {actionModal.type === 'ban' && 'Khóa tài khoản người dùng'}
                    {actionModal.type === 'unban' && 'Mở khóa tài khoản người dùng'}
                    {actionModal.type === 'dismiss' && 'Bác bỏ nhóm báo cáo'}
                  </h3>
                  <p className="text-xs text-gray-500">
                    Đối tượng: <strong>{actionModal.group.target_content?.title || actionModal.group.target_owner?.name || actionModal.group.target_id}</strong>
                  </p>
                </div>
              </div>

              {/* Cảnh báo tác động */}
              <div className="bg-gray-50 p-3.5 rounded-2xl text-xs text-gray-600 leading-relaxed border border-gray-200/70">
                {actionModal.type === 'hide' && (
                  <span>
                    Tin đăng sẽ bị chuyển về trạng thái chờ duyệt (ẩn khỏi chợ công khai). Thông báo sẽ được gửi tới chủ tin và toàn bộ {actionModal.group.total_reports} báo cáo sẽ được đánh dấu <strong>Đã xử lý</strong>.
                  </span>
                )}
                {actionModal.type === 'restore' && (
                  <span>
                    Tin đăng sẽ được khôi phục công khai trên toàn hệ thống. Thông báo duyệt lại sẽ được gửi tới người đăng và báo cáo sẽ được đánh dấu <strong>Đã xử lý</strong>.
                  </span>
                )}
                {actionModal.type === 'ban' && (
                  <span>
                    Tài khoản người dùng sẽ bị khóa và không thể đăng bài hoặc nhắn tin. Mọi báo cáo liên quan sẽ được giải quyết.
                  </span>
                )}
                {actionModal.type === 'unban' && (
                  <span>
                    Tài khoản người dùng sẽ được mở khóa và có thể đăng bài, nhắn tin trở lại bình thường. Hành động này sẽ được ghi vào Audit Log.
                  </span>
                )}
                {actionModal.type === 'dismiss' && (
                  <span>
                    Các báo cáo vi phạm sẽ được chuyển sang trạng thái <strong>Bác bỏ</strong>. Tin đăng và tài khoản người dùng vẫn tiếp tục hoạt động bình thường.
                  </span>
                )}
              </div>

              {/* Ô nhập ghi chú xử lý bắt buộc */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700 flex items-center justify-between">
                  <span>Ghi chú của Quản trị viên <span className="text-rose-500">* (Bắt buộc)</span></span>
                  <span className="text-[10px] text-gray-400">Lưu vào Audit Log và lịch sử xử lý</span>
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => {
                    setAdminNotes(e.target.value);
                    if (actionError) setActionError('');
                  }}
                  rows={4}
                  placeholder="Nhập lý do cụ thể và ghi chú giải trình cho thao tác này..."
                  className="w-full text-xs p-3 border border-gray-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#006d37] focus:border-transparent transition"
                />
                {actionError && (
                  <p className="text-xs font-bold text-rose-600 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{actionError}</span>
                  </p>
                )}
              </div>

              {/* Nút hành động */}
              <div className="flex items-center gap-2 justify-end pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActionModal({ isOpen: false, type: 'hide', group: null })}
                  disabled={isSubmittingAction}
                  className="text-xs"
                >
                  Hủy bỏ
                </Button>
                <Button
                  variant={actionModal.type === 'restore' ? 'primary' : 'danger'}
                  size="sm"
                  onClick={handleConfirmAction}
                  disabled={isSubmittingAction}
                  className="text-xs flex items-center gap-1.5"
                >
                  {isSubmittingAction && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Xác nhận thực hiện</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
