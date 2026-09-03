import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { DashboardSidebar } from '../components/layout/DashboardSidebar';
import { getAdminMetrics, getAuditLogs, getAllRoomsAdmin } from '../lib/api/admin';
import { AdminMetrics, AuditLog } from '../types';
import { BarChart3, TrendingUp, Users, Home, ShieldCheck, History, Clock, RefreshCw } from 'lucide-react';

export const AdminAnalyticsPage: React.FC = () => {
  const { showToast } = useAppStore();

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

  const [rooms, setRooms] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const [m, r, a] = await Promise.all([
        getAdminMetrics(),
        getAllRoomsAdmin(),
        getAuditLogs(),
      ]);
      setMetrics(m);
      setRooms(r);
      setAuditLogs(a);
    } catch (err) {
      console.warn('[Admin Analytics] Lỗi nạp thống kê:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  // Tính toán phân bổ phòng theo quận từ dữ liệu Supabase thật
  const districtCounts: Record<string, number> = {};
  rooms.forEach((room) => {
    const dist = room.buildings?.district || 'Chưa phân loại';
    districtCounts[dist] = (districtCounts[dist] || 0) + 1;
  });

  const totalCalculated = rooms.length;
  const districtStats = Object.entries(districtCounts)
    .map(([district, count]) => ({
      district,
      count,
      percent: totalCalculated > 0 ? Math.round((count / totalCalculated) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <div className="flex bg-gray-50 min-h-[calc(100vh-4rem)]">
      <DashboardSidebar role="admin" />

      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 overflow-y-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              <BarChart3 className="w-7 h-7 text-[#006d37]" />
              Báo Cáo & Thống Kê Nền Tảng
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              100% dữ liệu thống kê tổng hợp từ Supabase, không sử dụng số liệu minh họa hoặc dự phóng ảo.
            </p>
          </div>

          <button
            onClick={fetchAnalytics}
            disabled={isLoading}
            className="self-start sm:self-auto px-3.5 py-2 text-xs font-bold rounded-xl border border-gray-200 bg-white hover:bg-gray-50 flex items-center gap-1.5 shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Cập nhật số liệu
          </button>
        </div>

        {/* 4 Thẻ chỉ số chính */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-1">
            <span className="text-xs text-gray-500 font-semibold">Tổng số phòng trọ</span>
            <div className="text-2xl sm:text-3xl font-black text-gray-900">
              {metrics.totalRooms} <span className="text-sm font-semibold text-gray-400">phòng</span>
            </div>
            <p className="text-[11px] text-[#006d37] font-semibold">
              {metrics.approvedRooms} phòng đã công khai
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-1">
            <span className="text-xs text-gray-500 font-semibold">Cộng đồng người dùng</span>
            <div className="text-2xl sm:text-3xl font-black text-[#006d37]">
              {metrics.totalUsers} <span className="text-sm font-semibold text-gray-400">tài khoản</span>
            </div>
            <p className="text-[11px] text-gray-500 font-medium">
              Gồm {metrics.totalOwners} chủ trọ đối tác
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-1">
            <span className="text-xs text-gray-500 font-semibold">Lịch hẹn xem phòng</span>
            <div className="text-2xl sm:text-3xl font-black text-blue-600">
              {metrics.totalBookings} <span className="text-sm font-semibold text-gray-400">lượt</span>
            </div>
            <p className="text-[11px] text-blue-700 font-medium">
              {metrics.pendingBookings} lịch đang chờ hẹn
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-1">
            <span className="text-xs text-gray-500 font-semibold">Phản ánh & Báo cáo</span>
            <div className="text-2xl sm:text-3xl font-black text-rose-600">
              {metrics.totalReports} <span className="text-sm font-semibold text-gray-400">báo cáo</span>
            </div>
            <p className="text-[11px] text-rose-700 font-medium">
              {metrics.pendingReports} báo cáo đang chờ xử lý
            </p>
          </div>
        </div>

        {/* Phân bổ phòng theo quận thực tế */}
        <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-900">
              Phân Bổ Phòng Trọ Theo Khu Vực Thực Tế
            </h3>
            <span className="text-xs text-gray-400">Dữ liệu từ bảng rooms</span>
          </div>

          {districtStats.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-400">
              Chưa có đủ dữ liệu phòng để lập biểu đồ phân bổ khu vực.
            </div>
          ) : (
            <div className="space-y-3 text-xs">
              {districtStats.map((item, idx) => {
                const colors = ['bg-[#006d37]', 'bg-emerald-500', 'bg-blue-500', 'bg-amber-500', 'bg-purple-500'];
                return (
                  <div key={item.district} className="space-y-1">
                    <div className="flex justify-between font-semibold">
                      <span className="text-gray-800">{item.district}</span>
                      <span className="text-gray-500">
                        {item.count} phòng ({item.percent}%)
                      </span>
                    </div>
                    <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${colors[idx % colors.length]}`}
                        style={{ width: `${item.percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Nhật ký quản trị gần nhất */}
        <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <History className="w-5 h-5 text-[#006d37]" />
              Nhật Ký Quản Trị Hệ Thống
            </h3>
            <span className="text-xs text-gray-500 font-semibold">{auditLogs.length} thao tác đã ghi</span>
          </div>

          <div className="divide-y divide-gray-100 text-xs">
            {auditLogs.length === 0 ? (
              <p className="py-6 text-center text-gray-400">Chưa có bản ghi nhật ký nào.</p>
            ) : (
              auditLogs.slice(0, 10).map((log) => (
                <div key={log.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <div className="font-bold text-gray-900">{log.action}</div>
                    <p className="text-[11px] text-gray-500">
                      Bởi: <strong>{log.admin_email}</strong> • Đối tượng: {log.entity_type} ({log.entity_id?.slice(0, 8)})
                    </p>
                  </div>
                  <div className="text-right whitespace-nowrap">
                    <span className="text-[10px] text-gray-400">
                      {new Date(log.created_at).toLocaleString('vi-VN')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
