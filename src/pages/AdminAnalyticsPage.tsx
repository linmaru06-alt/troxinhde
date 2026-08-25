import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { DashboardSidebar } from '../components/layout/DashboardSidebar';
import { getAuditLogs } from '../lib/api/admin';
import { BarChart3, TrendingUp, Users, Home, ShieldCheck, History, Clock } from 'lucide-react';

export const AdminAnalyticsPage: React.FC = () => {
  const { rooms, buildings, roommates, marketplaceItems } = useAppStore();
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  useEffect(() => {
    getAuditLogs()
      .then((data) => setAuditLogs(data || []))
      .catch((err) => console.warn('[Admin] Lỗi tải audit logs:', err));
  }, []);

  return (
    <div className="flex bg-gray-50 min-h-[calc(100vh-4rem)]">
      <DashboardSidebar role="admin" />

      <main className="flex-1 p-4 sm:p-8 max-w-6xl space-y-8 overflow-y-auto">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-[#006d37]" />
            Báo Cáo Thống Kê Nền Tảng
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">Dữ liệu tăng trưởng phòng trọ, người dùng và nhật ký kiểm duyệt</p>
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-1">
            <span className="text-xs text-gray-500 font-semibold">Tổng số phòng trọ</span>
            <div className="text-2xl sm:text-3xl font-black text-gray-900">{rooms.length} phòng</div>
            <p className="text-[11px] text-emerald-600 font-medium">↑ Dữ liệu cập nhật liên tục</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-1">
            <span className="text-xs text-gray-500 font-semibold">Tòa nhà liên kết</span>
            <div className="text-2xl sm:text-3xl font-black text-[#006d37]">{buildings.length} tòa</div>
            <p className="text-[11px] text-emerald-600 font-medium">100% đạt chuẩn PCCC</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-1">
            <span className="text-xs text-gray-500 font-semibold">Bài tìm bạn ở ghép</span>
            <div className="text-2xl sm:text-3xl font-black text-blue-600">{roommates.length} bài</div>
            <p className="text-[11px] text-gray-500">Cộng đồng sinh viên</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-1">
            <span className="text-xs text-gray-500 font-semibold">Đồ thanh lý chợ</span>
            <div className="text-2xl sm:text-3xl font-black text-amber-600">{marketplaceItems.length} món</div>
            <p className="text-[11px] text-gray-500">Tiện ích tiết kiệm</p>
          </div>
        </div>

        {/* District Distribution Bar */}
        <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-gray-900">Phân Bổ Phòng Trọ Theo Khu Vực</h3>
          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between font-semibold mb-1">
                <span>Quận Cầu Giấy</span>
                <span>45% (Gần ĐHQG, Sư Phạm, Báo Chí)</span>
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#006d37] rounded-full w-[45%]" />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-semibold mb-1">
                <span>Quận Đống Đa</span>
                <span>30% (Khu Chùa Láng, FTU, Ngoại Giao)</span>
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#27ae60] rounded-full w-[30%]" />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-semibold mb-1">
                <span>Quận Hai Bà Trưng</span>
                <span>25% (Cụm Bách - Kinh - Xây)</span>
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#35a1e0] rounded-full w-[25%]" />
              </div>
            </div>
          </div>
        </div>

        {/* Audit Logs Section */}
        <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <History className="w-5 h-5 text-emerald-600" />
              Nhật Ký Thao Tác Quản Trị Viên (Audit Logs)
            </h3>
            <span className="text-xs text-gray-500 font-semibold">{auditLogs.length} bản ghi</span>
          </div>

          {auditLogs.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-xs bg-gray-50 rounded-2xl">
              Chưa có thao tác kiểm duyệt nào được ghi nhận gần đây.
            </div>
          ) : (
            <div className="space-y-2.5">
              {auditLogs.slice(0, 10).map((log) => (
                <div
                  key={log.id}
                  className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">{log.admin_email || 'admin@troxinh.vn'}</span>
                      <span className="px-2 py-0.5 rounded-full font-mono text-[10px] bg-emerald-100 text-emerald-800 font-bold">
                        {log.action}
                      </span>
                    </div>
                    <p className="text-gray-500">
                      Bảng: <span className="font-mono font-bold text-gray-700">{log.target_table}</span> • ID: <span className="font-mono text-gray-600">{log.target_id}</span>
                    </p>
                  </div>
                  <div className="text-[11px] text-gray-400 flex items-center gap-1 shrink-0">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(log.created_at).toLocaleString('vi-VN')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
