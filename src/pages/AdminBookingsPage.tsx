import React, { useState, useEffect } from 'react';
import { DashboardSidebar } from '../components/layout/DashboardSidebar';
import { getViewingRequestsAdmin } from '../lib/api/admin';
import { Button } from '../components/ui/Button';
import {
  Calendar,
  Search,
  Filter,
  RefreshCw,
  Clock,
  Home,
  User,
  Phone,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';

export const AdminBookingsPage: React.FC = () => {
  const [bookings, setBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  const fetchBookings = async () => {
    setIsLoading(true);
    try {
      const data = await getViewingRequestsAdmin();
      setBookings(data);
    } catch (err) {
      console.warn('[Admin Bookings] Lỗi nạp lịch hẹn:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const filteredBookings = bookings.filter((b) => {
    if (statusFilter !== 'all' && b.status !== statusFilter) return false;
    if (
      search &&
      !b.rooms?.name?.toLowerCase().includes(search.toLowerCase()) &&
      !b.renter?.full_name?.toLowerCase().includes(search.toLowerCase()) &&
      !b.contact_phone?.includes(search)
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
              <Calendar className="w-7 h-7 text-[#006d37]" />
              Theo Dõi Lịch Hẹn Xem Phòng
            </h1>

          </div>

          <Button
            variant="outline"
            size="sm"
            className="text-xs flex items-center gap-1.5 self-start sm:self-auto"
            onClick={fetchBookings}
            disabled={isLoading}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Làm mới danh sách
          </Button>
        </div>

        {/* Thanh tìm kiếm & bộ lọc */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo phòng, tên khách, SĐT..."
              className="w-full text-xs pl-9 pr-3 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#006d37]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
            <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">Trạng thái:</span>
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'pending', label: 'Chờ xác nhận' },
              { id: 'confirmed', label: 'Đã xác nhận' },
              { id: 'cancelled', label: 'Đã hủy' },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setStatusFilter(st.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  statusFilter === st.id
                    ? 'bg-[#006d37] text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bảng lịch hẹn */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-semibold">
                  <th className="py-3 px-4">Thời gian hẹn</th>
                  <th className="py-3 px-4">Phòng trọ</th>
                  <th className="py-3 px-4">Khách thuê</th>
                  <th className="py-3 px-4">Chủ trọ</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4">Ghi chú</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredBookings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-gray-400">
                      Không có lịch hẹn nào phù hợp bộ lọc.
                    </td>
                  </tr>
                ) : (
                  filteredBookings.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-bold text-gray-900">{item.requested_date}</div>
                        <div className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3" />
                          {item.requested_time || 'Thỏa thuận'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-gray-900 max-w-[200px] truncate">
                          {item.rooms?.name || 'Phòng trọ'}
                        </div>
                        <div className="text-[11px] text-[#006d37] font-semibold">
                          {item.rooms?.price ? `${(item.rooms.price / 1000000).toFixed(1)} tr/th` : 'Thỏa thuận'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-gray-800">{item.renter?.full_name || 'Khách thuê'}</div>
                        <div className="text-[11px] text-gray-400 font-mono">{item.contact_phone}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-gray-800">{item.owner?.full_name || 'Chủ trọ'}</div>
                        <div className="text-[11px] text-gray-400 font-mono">{item.owner?.phone || '—'}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${
                            item.status === 'confirmed' || item.status === 'Đã xác nhận'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.status === 'cancelled' || item.status === 'Đã hủy'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {item.status === 'confirmed' || item.status === 'Đã xác nhận'
                            ? 'Đã xác nhận'
                            : item.status === 'cancelled' || item.status === 'Đã hủy'
                            ? 'Đã hủy'
                            : 'Chờ phản hồi'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-gray-600 max-w-xs truncate">
                        {item.message || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};
