import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { DashboardSidebar } from '../components/layout/DashboardSidebar';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { AdminConfirmModal } from '../components/admin/AdminConfirmModal';
import {
  getAdminMetrics,
  getPendingRooms,
  getPendingOwnerApplications,
  getReportsAdmin,
  getAuditLogs,
  approveRoom as approveRoomApi,
  rejectRoom as rejectRoomApi,
  approveOwnerApplication as approveOwnerAppApi,
  rejectOwnerApplication as rejectOwnerAppApi,
  resolveReport as resolveReportApi,
} from '../lib/api/admin';
import { AdminMetrics, AuditLog, ReportItem } from '../types';
import {
  ShieldAlert,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Home,
  Users,
  Building2,
  Calendar,
  MessageSquare,
  ChevronRight,
  RefreshCw,
  Eye,
  Filter,
  ArrowUpRight,
  History,
  ShieldCheck,
  Check,
  X,
  Sparkles,
} from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, showToast } = useAppStore();

  const [metrics, setMetrics] = useState<AdminMetrics>({
    totalRooms: 0,
    pendingRooms: 0,
    approvedRooms: 0,
    rejectedRooms: 0,
    totalUsers: 0,
    totalOwners: 0,
    pendingOwnerApps: 0,
    totalReports: 0,
    pendingReports: 0,
    totalBookings: 0,
    pendingBookings: 0,
  });

  const [timeFilter, setTimeFilter] = useState<'today' | '7days' | '30days' | 'all'>('all');
  const [workQueueFilter, setWorkQueueFilter] = useState<'all' | 'rooms' | 'owners' | 'reports'>('all');

  const [pendingRoomsList, setPendingRoomsList] = useState<any[]>([]);
  const [pendingOwnerAppsList, setPendingOwnerAppsList] = useState<any[]>([]);
  const [reportsList, setReportsList] = useState<any[]>([]);
  const [recentAuditLogs, setRecentAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Split view item đang chọn
  const [selectedTask, setSelectedTask] = useState<{
    type: 'room' | 'owner' | 'report';
    data: any;
  } | null>(null);

  // Modal từ chối / thao tác nguy hiểm
  const [confirmModalState, setConfirmModalState] = useState<{
    isOpen: boolean;
    type: 'room' | 'owner' | 'user' | 'custom';
    title: string;
    description: string;
    entityName?: string;
    onConfirm: (reason: string) => Promise<void>;
  }>({
    isOpen: false,
    type: 'room',
    title: '',
    description: '',
    onConfirm: async () => {},
  });

  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [m, rooms, owners, reports, audits] = await Promise.all([
        getAdminMetrics(),
        getPendingRooms(),
        getPendingOwnerApplications(),
        getReportsAdmin(),
        getAuditLogs(),
      ]);
      setMetrics(m);
      setPendingRoomsList(rooms);
      setPendingOwnerAppsList(owners);
      setReportsList(reports);
      setRecentAuditLogs(audits.slice(0, 15));

      // Tự động chọn item đầu tiên nếu chưa chọn
      if (rooms.length > 0) {
        setSelectedTask({ type: 'room', data: rooms[0] });
      } else if (owners.length > 0) {
        setSelectedTask({ type: 'owner', data: owners[0] });
      } else if (reports.length > 0) {
        setSelectedTask({ type: 'report', data: reports[0] });
      }
    } catch (err) {
      console.error('[Admin Dashboard] Lỗi nạp dữ liệu:', err);
      showToast('Không thể tải một số dữ liệu quản trị', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Tính các cảnh báo ưu tiên (SLA Alerts)
  const urgentReports = reportsList.filter((r) => r.status === 'pending');
  const overdueRooms = pendingRoomsList.filter((r) => {
    const hours = (Date.now() - new Date(r.created_at).getTime()) / (1000 * 60 * 60);
    return hours > 24;
  });
  const overdueOwners = pendingOwnerAppsList.filter((a) => {
    const hours = (Date.now() - new Date(a.created_at).getTime()) / (1000 * 60 * 60);
    return hours > 48;
  });

  // Gom các tác vụ vào Work Queue
  const queueItems = [
    ...pendingRoomsList.map((r) => ({
      id: r.id,
      type: 'room' as const,
      title: r.name || 'Phòng trọ mới',
      subtitle: `${r.buildings?.name || 'Chưa gán tòa'} - ${r.buildings?.district || 'Hà Nội'}`,
      author: r.profiles?.full_name || 'Chủ trọ',
      createdAt: r.created_at,
      badge: 'Duyệt phòng',
      badgeColor: 'bg-blue-100 text-blue-700',
      data: r,
    })),
    ...pendingOwnerAppsList
      .filter((a) => a.status === 'pending')
      .map((a) => ({
        id: a.id,
        type: 'owner' as const,
        title: `Đơn xin làm chủ trọ: ${a.building_name}`,
        subtitle: `${a.address}, ${a.district}`,
        author: a.profiles?.full_name || 'Người dùng',
        createdAt: a.created_at,
        badge: 'Đơn chủ trọ',
        badgeColor: 'bg-emerald-100 text-emerald-800',
        data: a,
      })),
    ...reportsList
      .filter((rep) => rep.status === 'pending')
      .map((rep) => ({
        id: rep.id,
        type: 'report' as const,
        title: `Báo cáo: ${rep.reason}`,
        subtitle: rep.description || 'Không có mô tả chi tiết',
        author: 'Khách thuê',
        createdAt: rep.created_at,
        badge: 'Báo cáo',
        badgeColor: 'bg-rose-100 text-rose-700',
        data: rep,
      })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const filteredQueueItems = queueItems.filter((item) => {
    if (workQueueFilter === 'rooms') return item.type === 'room';
    if (workQueueFilter === 'owners') return item.type === 'owner';
    if (workQueueFilter === 'reports') return item.type === 'report';
    return true;
  });

  // Xử lý duyệt nhanh từ panel
  const handleApproveSelectedTask = async () => {
    if (!selectedTask) return;
    try {
      if (selectedTask.type === 'room') {
        await approveRoomApi(selectedTask.data.id, currentUser);
        showToast(`Đã duyệt phòng thành công!`, 'success');
      } else if (selectedTask.type === 'owner') {
        await approveOwnerAppApi(selectedTask.data.id, selectedTask.data.user_id, currentUser);
        showToast(`Đã nâng cấp đối tác Chủ trọ thành công!`, 'success');
      } else if (selectedTask.type === 'report') {
        await resolveReportApi(selectedTask.data.id, 'dismiss', 'Admin bỏ qua báo cáo hợp lệ', currentUser);
        showToast(`Đã đóng báo cáo!`, 'success');
      }
      loadDashboardData();
    } catch (err: any) {
      showToast(`Lỗi khi duyệt: ${err?.message || 'Thất bại'}`, 'error');
    }
  };

  // Mở modal từ chối
  const handleOpenRejectModal = () => {
    if (!selectedTask) return;
    if (selectedTask.type === 'room') {
      setConfirmModalState({
        isOpen: true,
        type: 'room',
        title: 'Từ chối tin đăng phòng trọ',
        description: 'Tin đăng phòng sẽ bị chuyển sang trạng thái "Bị từ chối". Chủ trọ sẽ nhận được thông báo giải thích kèm lý do chuẩn hóa bên dưới.',
        entityName: selectedTask.data.name,
        onConfirm: async (reason: string) => {
          await rejectRoomApi(selectedTask.data.id, reason, currentUser);
          setConfirmModalState((prev) => ({ ...prev, isOpen: false }));
          showToast('Đã từ chối tin đăng và thông báo cho chủ trọ', 'info');
          loadDashboardData();
        },
      });
    } else if (selectedTask.type === 'owner') {
      setConfirmModalState({
        isOpen: true,
        type: 'owner',
        title: 'Từ chối hồ sơ đăng ký Chủ trọ',
        description: 'Hồ sơ chủ trọ này sẽ bị từ chối. Người dùng sẽ nhận được thông báo để bổ sung giấy tờ CCCD/Pháp lý hợp lệ.',
        entityName: selectedTask.data.building_name,
        onConfirm: async (reason: string) => {
          await rejectOwnerAppApi(selectedTask.data.id, selectedTask.data.user_id, reason, currentUser);
          setConfirmModalState((prev) => ({ ...prev, isOpen: false }));
          showToast('Đã từ chối đơn đăng ký chủ trọ', 'info');
          loadDashboardData();
        },
      });
    } else if (selectedTask.type === 'report') {
      setConfirmModalState({
        isOpen: true,
        type: 'custom',
        title: 'Xử lý báo cáo vi phạm & Hạ nội dung',
        description: 'Phòng hoặc nội dung bị báo cáo sẽ bị ẩn khỏi hệ thống và người đăng sẽ bị cảnh cáo.',
        entityName: selectedTask.data.reason,
        onConfirm: async (reason: string) => {
          await resolveReportApi(selectedTask.data.id, 'hide_listing', reason, currentUser);
          setConfirmModalState((prev) => ({ ...prev, isOpen: false }));
          showToast('Đã xử lý báo cáo và hạ nội dung vi phạm', 'success');
          loadDashboardData();
        },
      });
    }
  };

  return (
    <div className="flex bg-gray-50 min-h-[calc(100vh-4rem)]">
      <DashboardSidebar role="admin" />

      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 overflow-y-auto">
        {/* Header Tổng Quan */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              Trung Tâm Điều Hành Quản Trị
            </h1>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              className="text-xs flex items-center gap-1.5"
              onClick={loadDashboardData}
              disabled={isLoading}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Làm mới
            </Button>
            <div className="bg-white border border-gray-200 rounded-xl p-0.5 flex text-xs font-semibold">
              <button
                onClick={() => setTimeFilter('today')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  timeFilter === 'today' ? 'bg-[#006d37] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Hôm nay
              </button>
              <button
                onClick={() => setTimeFilter('7days')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  timeFilter === '7days' ? 'bg-[#006d37] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                7 ngày
              </button>
              <button
                onClick={() => setTimeFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  timeFilter === 'all' ? 'bg-[#006d37] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Tất cả
              </button>
            </div>
          </div>
        </div>

        {/* 1. THANH CẢNH BÁO ƯU TIÊN (SLA ALERTS) */}
        {(urgentReports.length > 0 || overdueRooms.length > 0 || overdueOwners.length > 0) && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Cảnh Báo Vận Hành & Quá Hạn SLA
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {urgentReports.length > 0 && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-start justify-between shadow-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                      <h4 className="text-xs font-bold text-rose-950">
                        {urgentReports.length} Báo cáo vi phạm chờ xử lý
                      </h4>
                    </div>
                    <p className="text-[11px] text-rose-700">Người dùng phản ánh phòng ảo hoặc sai giá</p>
                  </div>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="text-xs shrink-0"
                    onClick={() => {
                      setWorkQueueFilter('reports');
                      const first = queueItems.find((q) => q.type === 'report');
                      if (first) setSelectedTask({ type: 'report', data: first.data });
                    }}
                  >
                    Xử lý ngay
                  </Button>
                </div>
              )}

              {overdueRooms.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start justify-between shadow-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-600" />
                      <h4 className="text-xs font-bold text-amber-950">
                        {overdueRooms.length} Tin phòng chờ quá 24h
                      </h4>
                    </div>
                    <p className="text-[11px] text-amber-800">Cần phê duyệt để chủ trọ kịp đón khách</p>
                  </div>
                  <Button
                    size="sm"
                    variant="primary"
                    className="text-xs shrink-0"
                    onClick={() => {
                      setWorkQueueFilter('rooms');
                      const first = queueItems.find((q) => q.type === 'room');
                      if (first) setSelectedTask({ type: 'room', data: first.data });
                    }}
                  >
                    Duyệt ngay
                  </Button>
                </div>
              )}

              {overdueOwners.length > 0 && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4 flex items-start justify-between shadow-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-indigo-600" />
                      <h4 className="text-xs font-bold text-indigo-950">
                        {overdueOwners.length} Đơn chủ trọ quá 48h
                      </h4>
                    </div>
                    <p className="text-[11px] text-indigo-800">Kiểm tra thông tin CCCD và cấp quyền đối tác</p>
                  </div>
                  <Button
                    size="sm"
                    variant="primary"
                    className="text-xs shrink-0 bg-indigo-600 hover:bg-indigo-700"
                    onClick={() => {
                      setWorkQueueFilter('owners');
                      const first = queueItems.find((q) => q.type === 'owner');
                      if (first) setSelectedTask({ type: 'owner', data: first.data });
                    }}
                  >
                    Xem đơn
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 2. BỘ CHỈ SỐ VẬN HÀNH THẬT (METRICS GRID) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-gray-500 text-xs font-semibold">
              <span>Phòng chờ kiểm duyệt</span>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-3xl font-black text-amber-600">{metrics.pendingRooms}</div>
            <p className="text-[11px] text-gray-500 font-medium">Tổng {metrics.totalRooms} phòng trong hệ thống</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-gray-500 text-xs font-semibold">
              <span>Hồ sơ Chủ trọ chờ duyệt</span>
              <Building2 className="w-4 h-4 text-[#006d37]" />
            </div>
            <div className="text-3xl font-black text-[#006d37]">{metrics.pendingOwnerApps}</div>
            <p className="text-[11px] text-gray-500 font-medium">Hiện có {metrics.totalOwners} chủ trọ đối tác</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-gray-500 text-xs font-semibold">
              <span>Lịch hẹn xem phòng</span>
              <Calendar className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-3xl font-black text-blue-600">{metrics.totalBookings}</div>
            <p className="text-[11px] text-emerald-600 font-medium">{metrics.pendingBookings} lịch đang chờ hẹn</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-gray-500 text-xs font-semibold">
              <span>Báo cáo vi phạm</span>
              <ShieldAlert className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-3xl font-black text-rose-600">{metrics.pendingReports}</div>
            <p className="text-[11px] text-gray-500 font-medium">Tỷ lệ an toàn tiêu chuẩn 99%</p>
          </div>
        </div>

        {/* 3. HỘP VIỆC HỢP NHẤT (WORK QUEUE - SPLIT VIEW) */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#006d37]" />
                Hộp Việc Kiểm Duyệt Tập Trung (Work Queue)
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Xử lý trực tiếp phòng mới, đối tác và báo cáo vi phạm với kiểm tra 2 bước
              </p>
            </div>

            {/* Bộ lọc loại việc */}
            <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl text-xs font-semibold">
              <button
                onClick={() => setWorkQueueFilter('all')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  workQueueFilter === 'all' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600'
                }`}
              >
                Tất cả ({queueItems.length})
              </button>
              <button
                onClick={() => setWorkQueueFilter('rooms')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  workQueueFilter === 'rooms' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600'
                }`}
              >
                Phòng ({pendingRoomsList.length})
              </button>
              <button
                onClick={() => setWorkQueueFilter('owners')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  workQueueFilter === 'owners' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600'
                }`}
              >
                Chủ trọ ({pendingOwnerAppsList.length})
              </button>
              <button
                onClick={() => setWorkQueueFilter('reports')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  workQueueFilter === 'reports' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600'
                }`}
              >
                Báo cáo ({reportsList.filter((r) => r.status === 'pending').length})
              </button>
            </div>
          </div>

          {/* Khung Split View: Bên trái danh sách - Bên phải chi tiết */}
          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[480px]">
            {/* Cột trái: Danh sách hàng đợi */}
            <div className="lg:col-span-5 border-r border-gray-100 divide-y divide-gray-100 overflow-y-auto max-h-[580px]">
              {filteredQueueItems.length === 0 ? (
                <div className="p-8 text-center space-y-2">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                  <h4 className="font-bold text-sm text-gray-800">Không còn việc tồn đọng!</h4>
                  <p className="text-xs text-gray-500">Mọi tin đăng và hồ sơ hiện tại đều đã được xử lý xong.</p>
                </div>
              ) : (
                filteredQueueItems.map((item) => {
                  const isSelected = selectedTask?.data?.id === item.id;
                  return (
                    <div
                      key={`${item.type}_${item.id}`}
                      onClick={() => setSelectedTask({ type: item.type, data: item.data })}
                      className={`p-4 cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-emerald-50/60 border-l-4 border-[#006d37]'
                          : 'hover:bg-gray-50/80 border-l-4 border-transparent'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${item.badgeColor}`}>
                          {item.badge}
                        </span>
                        <span className="text-[10px] text-gray-400">
                          {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                      <h4 className="font-bold text-xs text-gray-900 line-clamp-1 mt-1.5">{item.title}</h4>
                      <p className="text-[11px] text-gray-500 line-clamp-1">{item.subtitle}</p>
                      <div className="flex items-center justify-between text-[10px] text-gray-400 mt-2">
                        <span>Đăng bởi: {item.author}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Cột phải: Chi tiết & Thao tác duyệt */}
            <div className="lg:col-span-7 p-6 overflow-y-auto max-h-[580px] bg-white">
              {!selectedTask ? (
                <div className="h-full flex items-center justify-center text-center p-8 text-gray-400">
                  <div>
                    <Filter className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="text-xs">Chọn một công việc bên trái để kiểm tra chi tiết và duyệt</p>
                  </div>
                </div>
              ) : selectedTask.type === 'room' ? (
                /* Chi tiết Phòng */
                <div className="space-y-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                        Kiểm duyệt phòng
                      </span>
                      <h3 className="text-base font-black text-gray-900 mt-1">
                        {selectedTask.data.name || 'Phòng trọ'}
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {selectedTask.data.buildings?.name || 'Tòa nhà'} • {selectedTask.data.buildings?.address},{' '}
                        {selectedTask.data.buildings?.district}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-black text-[#006d37]">
                        {selectedTask.data.price ? `${(selectedTask.data.price / 1000000).toFixed(1)} tr/th` : 'Thỏa thuận'}
                      </div>
                      <span className="text-[10px] text-gray-400">Cọc: {selectedTask.data.deposit || 0}đ</span>
                    </div>
                  </div>

                  {/* Thông tin chi tiết */}
                  <div className="grid grid-cols-3 gap-2 bg-gray-50 p-3 rounded-2xl text-xs">
                    <div>
                      <span className="text-gray-400 block text-[10px]">Diện tích</span>
                      <span className="font-bold text-gray-800">{selectedTask.data.area || 20} m²</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">Loại phòng</span>
                      <span className="font-bold text-gray-800">{selectedTask.data.room_type || 'Khép kín'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">Chủ trọ</span>
                      <span className="font-bold text-gray-800">
                        {selectedTask.data.profiles?.full_name || 'Đối tác'}
                      </span>
                    </div>
                  </div>

                  {/* Mô tả */}
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-gray-700">Mô tả phòng:</h4>
                    <p className="text-xs text-gray-600 bg-gray-50 p-3 rounded-xl line-clamp-4 leading-relaxed">
                      {selectedTask.data.description || 'Chủ trọ chưa nhập mô tả chi tiết.'}
                    </p>
                  </div>

                  {/* Nút hành động */}
                  <div className="flex gap-3 pt-4 border-t border-gray-100">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 py-2 text-rose-600 border-rose-200 hover:bg-rose-50"
                      onClick={handleOpenRejectModal}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Từ chối tin này
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      className="flex-1 py-2"
                      onClick={handleApproveSelectedTask}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Phê duyệt phòng
                    </Button>
                  </div>
                </div>
              ) : selectedTask.type === 'owner' ? (
                /* Chi tiết Hồ sơ Chủ trọ */
                <div className="space-y-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Hồ sơ đối tác chủ trọ
                      </span>
                      <h3 className="text-base font-black text-gray-900 mt-1">
                        {selectedTask.data.building_name}
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {selectedTask.data.address}, {selectedTask.data.district}
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-3.5 rounded-2xl space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Chủ sở hữu:</span>
                      <span className="font-bold text-gray-800">
                        {selectedTask.data.profiles?.full_name || 'Chủ nhà'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Số điện thoại:</span>
                      <span className="font-bold text-gray-800">
                        {selectedTask.data.profiles?.phone || 'Chưa cập nhật'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Số CCCD:</span>
                      <span className="font-bold text-gray-800 font-mono">
                        {selectedTask.data.cccd_number || '12 số'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-gray-700">Ghi chú pháp lý & PCCC:</h4>
                    <p className="text-xs text-gray-600 bg-gray-50 p-3 rounded-xl leading-relaxed">
                      {selectedTask.data.legal_docs_note || 'Đầy đủ cam kết PCCC và phòng ngừa rủi ro.'}
                    </p>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-gray-100">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 py-2 text-rose-600 border-rose-200 hover:bg-rose-50"
                      onClick={handleOpenRejectModal}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Từ chối hồ sơ
                    </Button>
                    <Button
                      variant="primary"
                      size="sm"
                      className="flex-1 py-2"
                      onClick={handleApproveSelectedTask}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Phê duyệt đối tác
                    </Button>
                  </div>
                </div>
              ) : (
                /* Chi tiết Báo cáo vi phạm */
                <div className="space-y-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
                        Báo cáo vi phạm
                      </span>
                      <h3 className="text-base font-black text-rose-950 mt-1">
                        Lý do: {selectedTask.data.reason}
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Mã đối tượng: {selectedTask.data.target_id} • Loại: {selectedTask.data.target_type}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-gray-700">Chi tiết người thuê phản ánh:</h4>
                    <p className="text-xs text-gray-800 bg-rose-50/50 border border-rose-100 p-3.5 rounded-xl leading-relaxed">
                      {selectedTask.data.description || 'Không có mô tả chi tiết thêm.'}
                    </p>
                  </div>

                  <div className="flex gap-3 pt-4 border-t border-gray-100">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 py-2 text-gray-700"
                      onClick={handleApproveSelectedTask}
                    >
                      Bỏ qua báo cáo
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="flex-1 py-2"
                      onClick={handleOpenRejectModal}
                    >
                      <ShieldAlert className="w-4 h-4 mr-1" />
                      Hạ tin & Cảnh cáo
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 4. NHẬT KÝ HOẠT ĐỘNG GẦN ĐÂY (RECENT AUDIT STREAM) */}
        <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <History className="w-5 h-5 text-[#006d37]" />
              Nhật Ký Quản Trị Gần Đây (Audit Logs)
            </h3>
            <Link
              to="/admin/nhat-ky"
              className="text-xs font-bold text-[#006d37] hover:underline flex items-center gap-1"
            >
              Xem toàn bộ ({recentAuditLogs.length}) <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 font-semibold">
                  <th className="py-2.5 px-3">Thời gian</th>
                  <th className="py-2.5 px-3">Admin</th>
                  <th className="py-2.5 px-3">Hành động</th>
                  <th className="py-2.5 px-3">Đối tượng</th>
                  <th className="py-2.5 px-3">Lý do</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentAuditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-gray-400">
                      Chưa có lịch sử thao tác quản trị được ghi nhận.
                    </td>
                  </tr>
                ) : (
                  recentAuditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-3 px-3 text-gray-500 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleTimeString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        - {new Date(log.created_at).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-gray-800">{log.admin_email || 'admin@troxinh.vn'}</div>
                        <span className="text-[10px] text-gray-400 uppercase font-semibold">
                          {log.admin_role || 'Quản trị viên'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-md font-semibold text-[11px] ${
                            log.action.includes('approve')
                              ? 'bg-emerald-100 text-emerald-800'
                              : log.action.includes('reject') || log.action.includes('ban')
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-gray-600">
                        {log.entity_type}: {log.entity_id ? log.entity_id.slice(0, 8) : 'hệ thống'}
                      </td>
                      <td className="py-3 px-3 text-gray-600 max-w-xs truncate">
                        {log.reason || 'Thao tác kiểm duyệt tiêu chuẩn'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal xác nhận 2 bước */}
      <AdminConfirmModal
        isOpen={confirmModalState.isOpen}
        onClose={() => setConfirmModalState((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModalState.onConfirm}
        title={confirmModalState.title}
        description={confirmModalState.description}
        type={confirmModalState.type}
        entityName={confirmModalState.entityName}
      />
    </div>
  );
};
