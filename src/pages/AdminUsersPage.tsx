import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { DashboardSidebar } from '../components/layout/DashboardSidebar';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { AdminConfirmModal } from '../components/admin/AdminConfirmModal';
import { User } from '../types';
import {
  getUsers,
  banUser as banUserApi,
  unbanUser as unbanUserApi,
  changeUserRole as changeUserRoleApi,
  logAdminAudit,
} from '../lib/api/admin';
import {
  Users,
  Search,
  ShieldCheck,
  Building2,
  Phone,
  Mail,
  Lock,
  Unlock,
  Clock,
  UserCheck,
  XCircle,
  AlertTriangle,
  X,
  Eye,
  EyeOff,
  RefreshCw,
  UserCog,
  ShieldAlert,
} from 'lucide-react';

export const AdminUsersPage: React.FC = () => {
  const { currentUser, showToast } = useAppStore();

  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [filterRole, setFilterRole] = useState<'all' | 'user' | 'owner' | 'admin' | 'banned'>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Trạng thái hiển thị số điện thoại được che (để bảo vệ dữ liệu cá nhân)
  const [revealedPhones, setRevealedPhones] = useState<Record<string, boolean>>({});

  // Modal xác nhận khóa tài khoản / đổi vai trò
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'user' | 'custom';
    title: string;
    description: string;
    entityName?: string;
    onConfirm: (reason: string) => Promise<void>;
  }>({
    isOpen: false,
    type: 'user',
    title: '',
    description: '',
    onConfirm: async () => {},
  });

  const fetchUsersList = async () => {
    setIsLoading(true);
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (err) {
      console.warn('[Admin Users] Lỗi tải người dùng:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersList();
  }, []);

  // Hàm che số điện thoại: 0912345678 -> 091****678
  const maskPhone = (phone?: string) => {
    if (!phone || phone.length < 7) return phone || '—';
    return `${phone.slice(0, 3)}****${phone.slice(-3)}`;
  };

  const handleToggleRevealPhone = async (user: User) => {
    const isCurrentlyRevealed = revealedPhones[user.id];
    if (!isCurrentlyRevealed) {
      // Ghi log bảo mật khi Admin xem số điện thoại khách hàng
      await logAdminAudit({
        action: 'view_sensitive_phone',
        entity_type: 'user',
        entity_id: user.id,
        reason: 'Quản trị viên xem số điện thoại đầy đủ để hỗ trợ',
        admin: currentUser,
      });
    }
    setRevealedPhones((prev) => ({
      ...prev,
      [user.id]: !isCurrentlyRevealed,
    }));
  };

  // Khóa tài khoản người dùng
  const handleOpenBanModal = (user: User) => {
    setConfirmModal({
      isOpen: true,
      type: 'user',
      title: `Khóa tài khoản ${user.name}`,
      description: `Tài khoản sẽ bị vô hiệu hóa quyền đăng tin, đặt lịch và nhắn tin. Người dùng sẽ thấy lý do khi mở ứng dụng.`,
      entityName: user.name,
      onConfirm: async (reason: string) => {
        try {
          await banUserApi(user.id, reason, 30, currentUser);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          showToast(`Đã khóa tài khoản ${user.name}`, 'warning');
          fetchUsersList();
        } catch (err: any) {
          showToast(`Lỗi: ${err?.message}`, 'error');
        }
      },
    });
  };

  // Mở khóa tài khoản
  const handleUnbanUser = async (user: User) => {
    try {
      await unbanUserApi(user.id, currentUser);
      showToast(`Đã mở khóa tài khoản ${user.name}!`, 'success');
      fetchUsersList();
    } catch (err: any) {
      showToast(`Lỗi: ${err?.message}`, 'error');
    }
  };

  // Đổi vai trò (Chỉ super_admin)
  const handleChangeRole = (user: User, newRole: 'user' | 'owner' | 'admin') => {
    setConfirmModal({
      isOpen: true,
      type: 'user',
      title: `Thay đổi vai trò người dùng sang "${newRole}"`,
      description: `Thao tác nhạy cảm: Chuyển quyền tài khoản ${user.name}. Cần ghi rõ lý do phê duyệt.`,
      entityName: user.name,
      onConfirm: async (reason: string) => {
        try {
          await changeUserRoleApi(user.id, newRole, currentUser);
          setConfirmModal((prev) => ({ ...prev, isOpen: false }));
          showToast(`Đã đổi vai trò thành ${newRole}!`, 'success');
          fetchUsersList();
        } catch (err: any) {
          showToast(`Lỗi: ${err?.message}`, 'error');
        }
      },
    });
  };

  const filteredUsers = users.filter((u) => {
    if (filterRole === 'user' && u.role !== 'user') return false;
    if (filterRole === 'owner' && u.role !== 'owner') return false;
    if (filterRole === 'admin' && u.role !== 'admin') return false;
    if (filterRole === 'banned' && !u.isBanned) return false;

    if (
      search &&
      !u.name.toLowerCase().includes(search.toLowerCase()) &&
      !(u.phone || '').includes(search) &&
      !(u.email || '').toLowerCase().includes(search.toLowerCase()) &&
      !u.id.toLowerCase().includes(search.toLowerCase())
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
              <Users className="w-7 h-7 text-[#006d37]" />
              Quản Lý Người Dùng & Phân Quyền
            </h1>

          </div>

          <Button
            variant="outline"
            size="sm"
            className="text-xs flex items-center gap-1.5 self-start sm:self-auto"
            onClick={fetchUsersList}
            disabled={isLoading}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Làm mới danh sách
          </Button>
        </div>

        {/* Thanh tìm kiếm & bộ lọc vai trò */}
        <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên, email, SĐT, ID..."
              className="w-full text-xs pl-9 pr-3 py-2 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#006d37]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
            <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">Lọc vai trò:</span>
            {[
              { id: 'all', label: `Tất cả (${users.length})` },
              { id: 'user', label: `Người thuê (${users.filter((u) => u.role === 'user').length})` },
              { id: 'owner', label: `Chủ trọ (${users.filter((u) => u.role === 'owner').length})` },
              { id: 'admin', label: `Quản trị (${users.filter((u) => u.role === 'admin').length})` },
              { id: 'banned', label: `Bị khóa (${users.filter((u) => u.isBanned).length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterRole(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  filterRole === tab.id
                    ? 'bg-[#006d37] text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bảng danh sách người dùng */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-gray-500 font-semibold">
                  <th className="py-3 px-4">Người dùng</th>
                  <th className="py-3 px-4">Liên hệ & SĐT (Bảo mật)</th>
                  <th className="py-3 px-4">Vai trò</th>
                  <th className="py-3 px-4">Trạng thái</th>
                  <th className="py-3 px-4">Ngày đăng ký</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-gray-400">
                      Không tìm thấy người dùng nào phù hợp.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isRevealed = revealedPhones[u.id];
                    return (
                      <tr key={u.id} className="hover:bg-gray-50/70 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={u.avatarUrl || '/images/user-avatar.jpg'}
                              alt=""
                              className="w-9 h-9 rounded-full object-cover ring-1 ring-black/5 shrink-0"
                            />
                            <div>
                              <div className="font-bold text-gray-900">{u.name}</div>
                              <div className="text-[10px] text-gray-400 font-mono">ID: {u.id.slice(0, 8)}...</div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 font-mono text-gray-800">
                            <span>{isRevealed ? u.phone || '—' : maskPhone(u.phone)}</span>
                            {u.phone && (
                              <button
                                onClick={() => handleToggleRevealPhone(u)}
                                title={isRevealed ? 'Che số' : 'Xem đầy đủ (Ghi log)'}
                                className="p-1 text-gray-400 hover:text-[#006d37] rounded"
                              >
                                {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            )}
                          </div>
                          <div className="text-[10px] text-gray-400">{u.email || 'Chưa liên kết email'}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-md text-[11px] font-bold inline-block ${
                              u.role === 'admin'
                                ? 'bg-purple-100 text-purple-800'
                                : u.role === 'owner'
                                ? 'bg-emerald-100 text-[#006d37]'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {u.role === 'admin' ? 'Quản trị viên' : u.role === 'owner' ? 'Chủ trọ' : 'Khách thuê'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          {u.isBanned ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 flex items-center gap-1 w-max">
                              <Lock className="w-3 h-3" /> Đã khóa
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1 w-max">
                              <UserCheck className="w-3 h-3" /> Hoạt động
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-gray-500 whitespace-nowrap">
                          {new Date(u.createdAt).toLocaleDateString('vi-VN')}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {u.isBanned ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-[11px] py-1 px-2.5 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                                onClick={() => handleUnbanUser(u)}
                              >
                                <Unlock className="w-3 h-3 mr-1" />
                                Mở khóa
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-[11px] py-1 px-2.5 text-rose-600 border-rose-200 hover:bg-rose-50"
                                onClick={() => handleOpenBanModal(u)}
                              >
                                <Lock className="w-3 h-3 mr-1" />
                                Khóa
                              </Button>
                            )}

                            {/* Menu đổi vai trò nhanh */}
                            {u.role === 'user' && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-[11px] py-1 px-2 text-[#006d37]"
                                title="Nâng quyền lên Chủ trọ"
                                onClick={() => handleChangeRole(u, 'owner')}
                              >
                                + Chủ trọ
                              </Button>
                            )}
                            {u.role === 'owner' && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-[11px] py-1 px-2 text-amber-700"
                                title="Hạ quyền về Người thuê"
                                onClick={() => handleChangeRole(u, 'user')}
                              >
                                Thu hồi
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Modal xác nhận thao tác người dùng */}
      <AdminConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        description={confirmModal.description}
        type={confirmModal.type}
        entityName={confirmModal.entityName}
      />
    </div>
  );
};
