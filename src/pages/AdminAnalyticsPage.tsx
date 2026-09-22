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
        <div className="flex items-center gap-2 mb-6">
          <h1 className="text-xl sm:text-2xl font-normal text-gray-800 tracking-tight">
            Trang chủ
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Cột trái: Biểu đồ chính (chiếm 7/12) */}
          <div className="lg:col-span-7 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
            <div className="flex border-b border-gray-100">
              <div className="flex-1 p-4 border-b-2 border-blue-600 cursor-pointer">
                <div className="text-sm font-medium text-blue-600 flex items-center justify-between">
                  <span>Số người dùng đang hoạt động</span>
                  <span className="text-xs">▼</span>
                </div>
                <div className="text-3xl font-normal text-gray-800 mt-1">{metrics.totalUsers || 18}</div>
                <div className="text-xs font-medium text-emerald-600 mt-1">↑ 50,0%</div>
              </div>
              <div className="flex-1 p-4 border-b-2 border-transparent hover:bg-gray-50 cursor-pointer">
                <div className="text-sm font-medium text-gray-500 flex items-center justify-between">
                  <span>Số lượng sự kiện</span>
                  <span className="text-xs">▼</span>
                </div>
                <div className="text-3xl font-normal text-gray-800 mt-1">1,4 N</div>
                <div className="text-xs font-medium text-emerald-600 mt-1">↑ 686,8%</div>
              </div>
            </div>
            {/* Biểu đồ giả lập (Chart placeholder) */}
            <div className="flex-1 p-6 flex flex-col justify-end min-h-[250px] relative">
               <div className="absolute inset-0 p-6 flex items-end">
                 <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                   {/* Dotted reference lines */}
                   <line x1="0" y1="20" x2="100" y2="20" stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4 4" />
                   <line x1="0" y1="50" x2="100" y2="50" stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4 4" />
                   <line x1="0" y1="80" x2="100" y2="80" stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4 4" />
                   
                   <path d="M0,80 L15,50 L30,40 L45,60 L60,80 L75,45 L100,45" fill="none" stroke="#1a73e8" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                   <circle cx="30" cy="40" r="4" fill="white" stroke="#1a73e8" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                 </svg>
               </div>
               {/* Y-axis labels */}
               <div className="absolute right-2 top-6 bottom-6 flex flex-col justify-between text-[10px] text-gray-400">
                 <span>12</span>
                 <span>10</span>
                 <span>8</span>
                 <span>6</span>
                 <span>4</span>
                 <span>2</span>
                 <span>0</span>
               </div>
               {/* X-axis labels */}
               <div className="flex justify-between text-xs text-gray-400 mt-auto pt-4 border-t border-gray-100 w-[95%]">
                 <span>15<br/>thg</span>
                 <span>16</span>
                 <span>17</span>
                 <span>18</span>
                 <span>19</span>
                 <span>20</span>
                 <span>21</span>
               </div>
            </div>
            <div className="p-4 border-t border-gray-100 text-sm text-blue-600 font-medium flex justify-between items-center bg-white hover:bg-gray-50 cursor-pointer">
              <span className="text-gray-500">7 ngày trước ▼</span>
              <span>Xem trang tổng quan nhanh về báo cáo →</span>
            </div>
          </div>

          {/* Cột giữa: 30 phút qua (chiếm 3/12) */}
          <div className="lg:col-span-3 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col p-5">
            <div className="text-xs font-bold text-gray-500 uppercase flex items-center justify-between">
              SỐ NGƯỜI DÙNG ĐANG HOẠT ĐỘNG TRONG 30 PHÚT QUA
              <span className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </span>
            </div>
            <div className="text-5xl font-normal text-gray-800 mt-3">3</div>
            <div className="text-[11px] font-medium text-gray-500 mt-1 uppercase">SỐ NGƯỜI DÙNG ĐANG HOẠT ĐỘNG MỖI PHÚT</div>
            
            {/* Bar chart placeholder */}
            <div className="h-16 flex items-end gap-1 mt-4 border-b border-gray-100 pb-1">
              {[...Array(20)].map((_, i) => (
                <div key={i} className="flex-1 bg-blue-600 rounded-t-sm" style={{ height: `${i === 17 ? 40 : i === 19 ? 70 : i === 18 ? 30 : i === 1 ? 60 : i === 2 ? 50 : 0}%` }} />
              ))}
            </div>
            
            <div className="mt-4">
              <div className="flex justify-between text-[11px] font-bold text-gray-500 uppercase border-b border-gray-100 pb-2 mb-2">
                <span>QUỐC GIA ▼</span>
                <span>SỐ NGƯỜI ... ▼</span>
              </div>
              <div className="flex justify-between text-sm text-gray-700 py-1 border-b border-gray-100">
                <span>Vietnam</span>
                <span>3</span>
              </div>
            </div>
            
            <div className="mt-auto pt-6 text-sm text-blue-600 font-medium text-center cursor-pointer hover:underline">
              Xem báo cáo thời gian thực →
            </div>
          </div>

          {/* Cột phải: Release notes (chiếm 2/12) */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col p-5">
            <div className="text-[11px] font-bold text-gray-500 uppercase flex items-center gap-1.5 mb-4">
              <Sparkles className="w-3.5 h-3.5 text-gray-400" />
              THÔNG BÁO PHÁT HÀNH
            </div>
            <h3 className="text-[15px] font-bold text-gray-800 mb-3">Khám phá Trang tổng quan</h3>
            
            <div className="bg-gray-50 rounded-lg p-6 flex justify-center mb-4 border border-gray-100 relative overflow-hidden h-28">
               <div className="absolute inset-0 flex items-center justify-center opacity-70">
                 {/* Decorative simple graphic to mimic the screenshot */}
                 <div className="flex items-end gap-2 h-12">
                   <div className="w-4 h-6 border border-gray-300 bg-white" />
                   <div className="w-4 h-10 border border-gray-300 bg-white" />
                   <div className="w-16 h-12 border border-gray-300 bg-white flex items-center justify-center relative">
                     <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-400" />
                     <Users className="w-6 h-6 text-gray-400" />
                   </div>
                 </div>
               </div>
            </div>
            
            <p className="text-xs text-gray-600 leading-relaxed mb-4">
              Trang tổng quan là một loại hình báo cáo mới với tính năng kéo thả linh hoạt, giúp trực quan hóa các chỉ số quan trọng một cách nhanh chóng nhằm mang lại những thông tin chi tiết hữu ích.
            </p>
            
            <div className="mt-auto text-sm text-blue-600 font-medium cursor-pointer hover:underline text-center">
              Tạo Trang tổng quan
            </div>
          </div>
        </div>

        {/* Section: Mới truy cập gần đây */}
        <div className="pt-6">
          <h2 className="text-base font-medium text-gray-800 mb-4">Mới truy cập gần đây</h2>
          <div className="h-20" /> {/* Spacer as placeholder for recently accessed */}
        </div>
      </main>
    </div>
  );
};
