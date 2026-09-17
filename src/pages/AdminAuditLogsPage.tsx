import React, { useState, useEffect } from 'react';
import { DashboardSidebar } from '../components/layout/DashboardSidebar';
import { getAuditLogs } from '../lib/api/admin';
import { AuditLog } from '../types';
import { Button } from '../components/ui/Button';
import {
  History,
  Search,
  Filter,
  RefreshCw,
  ShieldAlert,
  CheckCircle2,
  Calendar,
  Eye,
  X,
  FileText,
} from 'lucide-react';

export const AdminAuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const data = await getAuditLogs();
      setLogs(data);
    } catch (err) {
      console.warn('[Audit Logs Page] Lỗi tải logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter((l) => {
    if (entityFilter !== 'all' && l.entity_type !== entityFilter) return false;
    if (
      search &&
      !l.action.toLowerCase().includes(search.toLowerCase()) &&
      !(l.reason || '').toLowerCase().includes(search.toLowerCase()) &&
      !(l.admin_email || '').toLowerCase().includes(search.toLowerCase()) &&
      !(l.entity_id || '').toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="flex bg-gray-50 min-h-[calc(100vh-4rem)]">
      <DashboardSidebar role="admin" />

      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 overflow-y-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              <History className="w-7 h-7 text-[#006d37]" />
              Nhật Ký Quản Trị (Audit Logs)
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Hệ thống lưu vết bất biến: theo dõi ai đã làm gì, vào thời điểm nào, đối tượng nào và lý do cụ thể.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="text-xs flex items-center gap-1.5 self-start sm:self-auto"
            onClick={fetchLogs}
            disabled={isLoading}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Làm mới logs
          </Button>
        </div>

        {/* Bộ lọc & Tìm kiếm */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo hành động, email, ID..."
              className="w-full text-xs pl-9 pr-3 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#006d37]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
            <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">Lọc đối tượng:</span>
            {['all', 'room', 'owner_application', 'user', 'report'].map((cat) => (
              <button
                key={cat}
                onClick={() => setEntityFilter(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  entityFilter === cat
                    ? 'bg-[#006d37] text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat === 'all'
                  ? 'Tất cả'
                  : cat === 'room'
                  ? 'Phòng'
                  : cat === 'owner_application'
                  ? 'Chủ trọ'
                  : cat === 'user'
                  ? 'Người dùng'
                  : 'Báo cáo'}
              </button>
            ))}
          </div>
        </div>

        {/* Bảng Logs */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-semibold">
                  <th className="py-3 px-4">Thời gian</th>
                  <th className="py-3 px-4">Admin</th>
                  <th className="py-3 px-4">Hành động</th>
                  <th className="py-3 px-4">Đối tượng</th>
                  <th className="py-3 px-4">Lý do</th>
                  <th className="py-3 px-4 text-right">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-gray-400">
                      Không tìm thấy bản ghi nhật ký phù hợp.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-3.5 px-4 text-gray-500 whitespace-nowrap">
                        <div className="font-semibold text-gray-800">
                          {new Date(log.created_at).toLocaleTimeString('vi-VN')}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          {new Date(log.created_at).toLocaleDateString('vi-VN')}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-gray-900">{log.admin_email || 'admin@troxinh.vn'}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-gray-100 text-gray-600">
                            {log.admin_role || 'moderator'}
                          </span>
                          {log.is_demo_admin && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                              DEMO
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-md font-semibold text-[11px] inline-block ${
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
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-gray-800 capitalize">{log.entity_type}</div>
                        <div className="font-mono text-[10px] text-gray-400 truncate max-w-[120px]">
                          {log.entity_id || 'N/A'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-gray-600 max-w-xs truncate">
                        {log.reason || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-[11px] py-1 px-2.5"
                          onClick={() => setSelectedLog(log)}
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          So sánh
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal so sánh dữ liệu cũ / mới */}
        {selectedLog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
            <div className="bg-white rounded-3xl p-6 max-w-2xl w-full shadow-2xl border border-gray-100 animate-scaleUp space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#006d37]" />
                  <h3 className="font-bold text-base text-gray-900">Chi Tiết Bản Ghi Audit Log</h3>
                </div>
                <button
                  onClick={() => setSelectedLog(null)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-gray-50 p-3.5 rounded-2xl">
                <div>
                  <span className="text-gray-400 block text-[10px]">Hành động:</span>
                  <span className="font-bold text-gray-900">{selectedLog.action}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">Người thực hiện:</span>
                  <span className="font-bold text-gray-900">{selectedLog.admin_email}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">Đối tượng:</span>
                  <span className="font-mono text-gray-900">
                    {selectedLog.entity_type} ({selectedLog.entity_id})
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">Thời gian:</span>
                  <span className="font-semibold text-gray-900">
                    {new Date(selectedLog.created_at).toLocaleString('vi-VN')}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-400 block text-[10px]">Lý do thực hiện:</span>
                  <span className="font-medium text-gray-800">{selectedLog.reason || 'Không có ghi chú'}</span>
                </div>
              </div>

              {/* So sánh Data Before vs Data After */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <span className="font-bold text-gray-700 block">Dữ liệu trước (data_before):</span>
                  <pre className="p-3 bg-gray-100 rounded-xl text-[11px] font-mono text-gray-700 overflow-x-auto max-h-48">
                    {JSON.stringify(selectedLog.data_before || { note: 'Không có dữ liệu trước' }, null, 2)}
                  </pre>
                </div>
                <div className="space-y-1">
                  <span className="font-bold text-[#006d37] block">Dữ liệu sau (data_after):</span>
                  <pre className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl text-[11px] font-mono text-emerald-900 overflow-x-auto max-h-48">
                    {JSON.stringify(selectedLog.data_after || { note: 'Không có dữ liệu sau' }, null, 2)}
                  </pre>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedLog(null)}>
                  Đóng
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
