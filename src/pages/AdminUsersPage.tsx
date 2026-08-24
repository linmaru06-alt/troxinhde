import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { DashboardSidebar } from '../components/layout/DashboardSidebar';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { initialUsers } from '../data/mockData';
import { User } from '../types';
import {
  Users,
  Search,
  ShieldCheck,
  Building2,
  Phone,
  Mail,
  Lock,
  Clock,
  UserCheck,
  XCircle,
  AlertTriangle,
  X,
  History,
} from 'lucide-react';

export const AdminUsersPage: React.FC = () => {
  const navigate = useNavigate();
  const { ownerApplications } = useAppStore();

  const [search, setSearch] = useState<string>('');
  const [filterTab, setFilterTab] = useState<'all' | 'user' | 'owner' | 'pending_owner' | 'blocked'>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState<boolean>(false);
  const [revokeInput, setRevokeInput] = useState<string>('');

  const pendingOwnerCount = ownerApplications.filter((a) => a.status === 'pending').length;

  const usersList = initialUsers.map((u) => {
    const hasPendingApp = ownerApplications.some((a) => a.userId === u.id && a.status === 'pending');
    return {
      ...u,
      ownerApplicationStatus: hasPendingApp ? ('pending' as const) : u.ownerApplicationStatus,
    };
  });

  const filteredUsers = usersList.filter((u) => {
    if (filterTab === 'user' && u.role !== 'user') return false;
    if (filterTab === 'owner' && u.role !== 'owner') return false;
    if (filterTab === 'pending_owner' && u.ownerApplicationStatus !== 'pending') return false;
    if (filterTab === 'blocked') return false; // Demo no blocked users
    if (
      search &&
      !u.name.toLowerCase().includes(search.toLowerCase()) &&
      !(u.phone || '').includes(search) &&
      !(u.email || '').toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
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
            <p className="text-xs text-gray-500 mt-0.5">Danh sách tài khoản khách thuê, chủ trọ và ban quản trị</p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên hoặc SĐT..."
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#006d37]"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            {[
              { key: 'all', label: 'Tất cả' },
              { key: 'user', label: 'Người dùng' },
              { key: 'owner', label: 'Chủ trọ' },
              { key: 'pending_owner', label: `Chờ duyệt CT (${pendingOwnerCount})` },
              { key: 'blocked', label: 'Bị khóa' },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => {
                  if (t.key === 'pending_owner' && pendingOwnerCount > 0) {
                    // Quick link option
                    setFilterTab('pending_owner');
                  } else {
                    setFilterTab(t.key as any);
                  }
                }}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition shrink-0 ${
                  filterTab === t.key
                    ? 'bg-[#006d37] text-white shadow-xs'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-100 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-4">Tài Khoản</th>
                  <th className="p-4">Số Điện Thoại</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Vai Trò & Quyền Hạn</th>
                  <th className="p-4">Ngày Tham Gia</th>
                  <th className="p-4 text-right">Chi Tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-gray-400 text-xs">
                      Không tìm thấy người dùng nào phù hợp.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50/80 transition">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img src={u.avatarUrl} alt="" className="w-9 h-9 rounded-full object-cover ring-1 ring-gray-200" />
                          <div>
                            <span className="font-bold text-gray-900">{u.name}</span>
                            {u.verified && <span className="text-[10px] text-emerald-600 font-bold block">✓ Đã xác thực SV</span>}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-mono text-gray-700">{u.phone}</td>
                      <td className="p-4 text-gray-500">{u.email || 'Chưa liên kết'}</td>
                      <td className="p-4">
                        {u.role === 'owner' ? (
                          <Badge variant="verified" size="sm">🏢 Chủ Trọ</Badge>
                        ) : u.role === 'admin' ? (
                          <Badge variant="primary" size="sm">🛡️ Admin</Badge>
                        ) : u.ownerApplicationStatus === 'pending' ? (
                          <Link to="/admin/don-chu-tro" className="inline-block">
                            <Badge variant="pending" size="sm">⏳ Chờ duyệt CT</Badge>
                          </Link>
                        ) : (
                          <Badge variant="available" size="sm">👤 Người Thuê</Badge>
                        )}
                      </td>
                      <td className="p-4 text-gray-400 text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="p-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedUser(u)}
                        >
                          Xem Hồ Sơ →
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* User Detail & Role History Side Panel */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/40 backdrop-blur-2xs flex justify-end animate-fadeIn">
          <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-slideLeft">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-bold text-sm text-gray-900">Chi Tiết Tài Khoản</h3>
              <button onClick={() => setSelectedUser(null)} className="p-1 rounded-full text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
              {/* Profile Card */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <img src={selectedUser.avatarUrl} alt="" className="w-14 h-14 rounded-full object-cover ring-2 ring-white shadow-xs" />
                <div>
                  <h4 className="font-black text-base text-gray-900">{selectedUser.name}</h4>
                  <p className="text-gray-500">{selectedUser.phone} • {selectedUser.email}</p>
                  <div className="mt-1">
                    <Badge variant={selectedUser.role === 'owner' ? 'verified' : selectedUser.role === 'admin' ? 'primary' : 'available'} size="sm">
                      {selectedUser.role === 'owner' ? '🏢 Chủ Trọ Đối Tác' : selectedUser.role === 'admin' ? '🛡️ Admin' : '👤 Người Thuê'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Role History Timeline */}
              <div className="space-y-3">
                <h4 className="font-bold text-gray-900 uppercase text-[11px] tracking-wider text-[#006d37] flex items-center gap-1.5">
                  <History className="w-4 h-4" />
                  Lịch Sử Vai Trò
                </h4>
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <div className="w-2 h-2 rounded-full bg-[#006d37] mt-1 shrink-0" />
                    <div>
                      <p className="font-bold text-gray-900">Tạo tài khoản (Người dùng)</p>
                      <span className="text-[10px] text-gray-400">{new Date(selectedUser.createdAt).toLocaleDateString('vi-VN')}</span>
                    </div>
                  </div>

                  {selectedUser.role === 'owner' && (
                    <div className="flex items-start gap-2.5">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1 shrink-0" />
                      <div>
                        <p className="font-bold text-[#006d37]">Được phê duyệt quyền Chủ Trọ</p>
                        <span className="text-[10px] text-gray-400">Đã xác minh cơ sở & PCCC</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Admin Manual Actions */}
              {selectedUser.role === 'owner' && (
                <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 space-y-2 text-rose-900">
                  <h4 className="font-bold flex items-center gap-1.5 text-xs text-rose-700">
                    <AlertTriangle className="w-4 h-4" />
                    Quyền can thiệp quản trị:
                  </h4>
                  <p className="text-[11px]">
                    Thu hồi quyền Chủ trọ nếu phát hiện cơ sở vi phạm nghiêm trọng quy định niêm yết giá hoặc an toàn.
                  </p>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => setShowRevokeConfirm(true)}
                  >
                    Thu Hồi Quyền Chủ Trọ
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Revoke Double Confirm Dialog */}
      {showRevokeConfirm && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 text-center animate-scaleUp">
            <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-base text-gray-900">Xác Nhận Thu Hồi Quyền Chủ Trọ?</h3>
            <p className="text-xs text-gray-500">
              Tài khoản <strong>{selectedUser.name}</strong> sẽ bị hạ quyền về Người dùng thường và mất quyền đăng phòng. Gõ <strong>XÁC NHẬN</strong> để tiếp tục:
            </p>

            <input
              type="text"
              value={revokeInput}
              onChange={(e) => setRevokeInput(e.target.value)}
              placeholder="XÁC NHẬN"
              className="w-full text-center p-2 border border-gray-300 rounded-xl text-xs font-bold uppercase"
            />

            <div className="flex gap-2 pt-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => { setShowRevokeConfirm(false); setRevokeInput(''); }}>
                Hủy
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="flex-1"
                disabled={revokeInput !== 'XÁC NHẬN'}
                onClick={() => {
                  setShowRevokeConfirm(false);
                  setSelectedUser({ ...selectedUser, role: 'user' });
                  setRevokeInput('');
                }}
              >
                Thu Hồi Quyền
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
