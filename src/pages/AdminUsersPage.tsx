import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { DashboardSidebar } from '../components/layout/DashboardSidebar';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { initialUsers } from '../data/mockData';
import { Users, Search, ShieldCheck, Phone, Mail, Lock } from 'lucide-react';

export const AdminUsersPage: React.FC = () => {
  const { currentUser } = useAppStore();
  const [search, setSearch] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  const users = initialUsers.filter((u) => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (search && !u.name.toLowerCase().includes(search.toLowerCase()) && !u.phone.includes(search)) return false;
    return true;
  });

  return (
    <div className="flex bg-gray-50 min-h-[calc(100vh-4rem)]">
      <DashboardSidebar role="admin" />

      <main className="flex-1 p-4 sm:p-8 max-w-6xl space-y-6 overflow-y-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
              <Users className="w-7 h-7 text-[#006d37]" />
              Quản Lý Người Dùng
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">Danh sách chủ trọ, khách thuê và tài khoản quản trị</p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm kiếm theo tên hoặc SĐT..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            {['all', 'renter', 'owner', 'admin'].map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition ${
                  roleFilter === r
                    ? 'bg-[#006d37] text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {r === 'all' ? 'Tất cả' : r === 'renter' ? 'Người thuê' : r === 'owner' ? 'Chủ trọ' : 'Admin'}
              </button>
            ))}
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="divide-y divide-gray-100">
            {users.map((u) => (
              <div key={u.id} className="p-4 sm:p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <img src={u.avatarUrl} alt="" className="w-12 h-12 rounded-full object-cover ring-2 ring-gray-100" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-gray-900">{u.name}</h4>
                      <Badge variant="verified" size="sm">
                        {u.role === 'owner' ? 'Chủ Trọ' : u.role === 'admin' ? 'Admin' : 'Người Thuê'}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500">{u.phone} • {u.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    Khóa tài khoản
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};
