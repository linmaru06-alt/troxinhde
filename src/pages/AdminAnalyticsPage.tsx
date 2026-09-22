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

        {/* Module Báo Cáo Phân Tích (Giao diện chuẩn GA4) */}
        <div className="bg-[#111827] text-white rounded-3xl p-6 shadow-xl border border-gray-800">
          <div className="flex items-center gap-3 mb-6">
            <Activity className="w-6 h-6 text-blue-500" />
            <h2 className="text-xl font-bold tracking-tight">Tổng quan về báo cáo (Mô phỏng GA4)</h2>
          </div>

          <div className="flex flex-col xl:flex-row gap-6">
            {/* Cột trái: Biểu đồ đường */}
            <div className="flex-1 bg-[#1f2937] border border-gray-700 rounded-2xl p-5">
              <div className="flex items-center gap-6 mb-8 border-b border-gray-700 pb-4">
                <div className="cursor-pointer border-b-2 border-blue-500 pb-2">
                  <div className="text-sm text-gray-400 font-medium">Số người dùng đang hoạt động</div>
                  <div className="text-3xl font-bold mt-1">{metrics.totalUsers}</div>
                </div>
                <div className="cursor-pointer pb-2 opacity-50 hover:opacity-100 transition-opacity">
                  <div className="text-sm text-gray-400 font-medium">Số lượng sự kiện</div>
                  <div className="text-3xl font-bold mt-1">{metrics.totalBookings * 12 + metrics.totalUsers * 4}</div>
                </div>
              </div>
              
              {/* Interactive Line Chart using Recharts */}
              <div className="h-56 relative w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={[
                    { date: '25 thg 8', users: Math.round(metrics.totalUsers * 0.2), events: Math.round(metrics.totalBookings * 2) },
                    { date: '31 thg 8', users: Math.round(metrics.totalUsers * 0.4), events: Math.round(metrics.totalBookings * 3) },
                    { date: '6 thg 9', users: Math.round(metrics.totalUsers * 0.6), events: Math.round(metrics.totalBookings * 5) },
                    { date: '12 thg 9', users: Math.round(metrics.totalUsers * 0.5), events: Math.round(metrics.totalBookings * 4) },
                    { date: '18 thg 9', users: Math.round(metrics.totalUsers * 0.9), events: Math.round(metrics.totalBookings * 10) },
                    { date: 'Hôm nay', users: metrics.totalUsers, events: metrics.totalBookings * 12 + metrics.totalUsers * 4 }
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                    <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }}
                      itemStyle={{ color: '#60a5fa' }}
                    />
                    <Line type="monotone" dataKey="users" name="Người dùng" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="events" name="Sự kiện" stroke="#f97316" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Cột phải: 30 phút qua */}
            <div className="w-full xl:w-80 bg-[#1f2937] border border-gray-700 rounded-2xl p-5 flex flex-col">
              <div className="text-sm text-gray-400 font-medium mb-1">Số người dùng trong 30 phút qua</div>
              <div className="text-3xl font-bold mb-6">3</div>
              
              {/* Interactive Bar Chart using Recharts */}
              <div className="h-24 w-full mb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { minute: '30p trước', users: 2 }, { minute: '28p', users: 4 }, { minute: '26p', users: 1 },
                    { minute: '24p', users: 5 }, { minute: '22p', users: 8 }, { minute: '20p', users: 3 },
                    { minute: '18p', users: 6 }, { minute: '16p', users: 9 }, { minute: '14p', users: 4 },
                    { minute: '12p', users: 7 }, { minute: '10p', users: 2 }, { minute: '8p', users: 5 },
                    { minute: '6p', users: 3 }, { minute: 'Vừa xong', users: 8 }
                  ]}>
                    <Tooltip 
                      cursor={{ fill: '#374151' }}
                      contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff', fontSize: '12px' }}
                    />
                    <Bar dataKey="users" name="Người dùng" fill="#3b82f6" radius={[2, 2, 0, 0]}>
                      {
                        [2,4,1,5,8,3,6,9,4,7,2,5,3,8].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 13 ? '#60a5fa' : '#3b82f6'} />
                        ))
                      }
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              <div className="text-xs text-gray-400 font-medium mb-3 uppercase">Quốc gia hàng đầu</div>
              <div className="flex-1 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2"><span className="w-4 h-3 bg-red-500 inline-block rounded-xs"></span>Vietnam</span>
                  <span className="font-semibold">3</span>
                </div>
              </div>
            </div>
          </div>
        </div>


      </main>
    </div>
  );
};
