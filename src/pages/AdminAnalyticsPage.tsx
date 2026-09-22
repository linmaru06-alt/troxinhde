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
              
              {/* Fake Line Chart */}
              <div className="h-48 relative w-full flex items-end">
                <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="w-full h-full text-blue-500 drop-shadow-md">
                  <path 
                    d="M0,35 Q10,25 20,30 T40,15 T60,20 T80,5 T100,10 L100,40 L0,40 Z" 
                    fill="url(#blue-gradient)" 
                    opacity="0.3" 
                  />
                  <path 
                    d="M0,35 Q10,25 20,30 T40,15 T60,20 T80,5 T100,10" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="1.5" 
                  />
                  <defs>
                    <linearGradient id="blue-gradient" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="currentColor" />
                      <stop offset="100%" stopColor="transparent" />
                    </linearGradient>
                  </defs>
                </svg>
                {/* Lưới ngang */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-10">
                  <div className="w-full h-px bg-white"></div>
                  <div className="w-full h-px bg-white"></div>
                  <div className="w-full h-px bg-white"></div>
                  <div className="w-full h-px bg-white"></div>
                </div>
              </div>
            </div>

            {/* Cột phải: 30 phút qua */}
            <div className="w-full xl:w-80 bg-[#1f2937] border border-gray-700 rounded-2xl p-5 flex flex-col">
              <div className="text-sm text-gray-400 font-medium mb-1">Số người dùng trong 30 phút qua</div>
              <div className="text-3xl font-bold mb-6">3</div>
              
              {/* Fake Bar Chart */}
              <div className="flex items-end gap-1 h-20 mb-6 border-b border-gray-700 pb-2">
                {[2,4,1,5,8,3,6,9,4,7,2,5,3,8].map((val, i) => (
                  <div key={i} className="flex-1 bg-blue-500 rounded-t-sm opacity-80" style={{ height: `${val * 10}%` }}></div>
                ))}
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
