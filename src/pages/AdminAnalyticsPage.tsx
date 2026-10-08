import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { DashboardSidebar } from '../components/layout/DashboardSidebar';
import { getAdminMetrics, getAuditLogs, getAllRoomsAdmin } from '../lib/api/admin';
import { AdminMetrics, AuditLog } from '../types';
import { GA_ID } from '../lib/analytics';
import {
  BarChart3,
  TrendingUp,
  Users,
  Home,
  ShieldCheck,
  History,
  Clock,
  RefreshCw,
  Activity,
  ExternalLink,
  Globe,
  Sparkles,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';

export const AdminAnalyticsPage: React.FC = () => {
  const { showToast } = useAppStore();

  const [lookerUrl, setLookerUrl] = useState<string>(() => {
    return (
      localStorage.getItem('troxinh_admin_looker_url') ||
      (import.meta.env.VITE_LOOKER_STUDIO_EMBED_URL as string) ||
      ''
    );
  });
  const [tempLookerInput, setTempLookerInput] = useState<string>('');

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

  const handleSaveLookerUrl = () => {
    if (!tempLookerInput.trim()) return;
    localStorage.setItem('troxinh_admin_looker_url', tempLookerInput.trim());
    setLookerUrl(tempLookerInput.trim());
    showToast('Đã lưu liên kết báo cáo Looker Studio!', '', 'success');
  };

  const handleRemoveLookerUrl = () => {
    localStorage.removeItem('troxinh_admin_looker_url');
    setLookerUrl('');
    setTempLookerInput('');
    showToast('Đã xóa liên kết báo cáo Looker Studio', '', 'info');
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

        {/* Module Báo Cáo Phân Tích GA4 (Looker Studio) */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Activity className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-bold tracking-tight text-gray-900">Báo cáo Google Analytics (GA4)</h2>
            </div>
            {lookerUrl && (
              <button
                onClick={handleRemoveLookerUrl}
                className="text-sm text-red-600 hover:text-red-700 font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
              >
                Xóa liên kết
              </button>
            )}
          </div>

          {lookerUrl ? (
            <div className="w-full h-[600px] rounded-xl overflow-hidden border border-gray-200">
              <iframe
                src={lookerUrl}
                width="100%"
                height="100%"
                frameBorder="0"
                style={{ border: 0 }}
                allowFullScreen
                sandbox="allow-storage-access-by-user-activation allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
              ></iframe>
            </div>
          ) : (
            <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-8 text-center max-w-2xl mx-auto my-8">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Chưa kết nối Google Analytics</h3>
              <p className="text-gray-600 mb-6 text-sm">
                Để xem báo cáo lưu lượng truy cập thực tế, vui lòng tạo báo cáo trên Looker Studio kết nối với GA4 và dán liên kết nhúng (embed URL) vào đây.
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tempLookerInput}
                  onChange={(e) => setTempLookerInput(e.target.value)}
                  placeholder="https://lookerstudio.google.com/embed/reporting/..."
                  className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-[#006d37] focus:border-transparent outline-none"
                />
                <button
                  onClick={handleSaveLookerUrl}
                  disabled={!tempLookerInput.trim()}
                  className="px-6 py-2.5 bg-[#006d37] text-white font-bold rounded-xl hover:bg-[#005a2e] disabled:opacity-50 transition-colors whitespace-nowrap"
                >
                  Kết nối
                </button>
              </div>
            </div>
          )}
        </div>


      </main>
    </div>
  );
};
