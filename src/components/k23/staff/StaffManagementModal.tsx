import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  UserPlus,
  Building2,
  Phone,
  Trash2,
  Check,
  Sparkles,
  Zap,
  Wrench,
  DollarSign,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { useK23StaffPermissions } from '../../../hooks/queries/useK23StaffPermissions';
import { StaffRoleType, STAFF_ROLE_LABELS, CreateStaffAssignmentParams } from '../../../types/k23Staff';

interface StaffManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableBuildings?: Array<{ id: string; name: string }>;
}

export const StaffManagementModal: React.FC<StaffManagementModalProps> = ({
  isOpen,
  onClose,
  availableBuildings = [
    { id: 'bld_1', name: 'Tòa Nhà Xanh Trọ Xinh (Triều Khúc)' },
    { id: 'bld_2', name: 'Căn Hộ Dịch Vụ Cầu Giấy (Duy Tân)' },
    { id: 'bld_3', name: 'Chung Cư Mini Đống Đa (Chùa Láng)' },
  ],
}) => {
  const { assignments, isLoading, addStaff, updatePermissions, removeStaff } = useK23StaffPermissions();

  const [isAdding, setIsAdding] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffPhone, setNewStaffPhone] = useState('');
  const [selectedBuildingId, setSelectedBuildingId] = useState(availableBuildings[0]?.id || 'bld_1');
  const [selectedRole, setSelectedRole] = useState<StaffRoleType>('manager');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim() || !newStaffPhone.trim()) return;

    setIsSubmitting(true);
    try {
      const bld = availableBuildings.find((b) => b.id === selectedBuildingId);
      const params: CreateStaffAssignmentParams = {
        building_id: selectedBuildingId,
        building_name: bld?.name || 'Tòa nhà quản lý',
        staff_name: newStaffName.trim(),
        staff_phone: newStaffPhone.trim(),
        role_type: selectedRole,
        can_record_meter: selectedRole === 'manager' || selectedRole === 'security',
        can_manage_issues: selectedRole === 'manager' || selectedRole === 'security',
        can_collect_cash: selectedRole === 'manager' || selectedRole === 'accountant',
        can_view_revenue: selectedRole === 'accountant', // Mặc định chỉ kế toán được xem doanh thu
      };

      await addStaff(params);
      setNewStaffName('');
      setNewStaffPhone('');
      setIsAdding(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-500/30 text-indigo-200 px-2.5 py-0.5 rounded-full border border-indigo-400/30">
                  K23 PMS • P2-01 (Pro)
                </span>
                <span className="text-xs text-indigo-200 font-bold">Multi-Building RBAC</span>
              </div>
              <h2 className="text-lg font-black text-white mt-1">
                Phân Quyền Nhân Sự Quản Lý Đa Cơ Sở
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nội dung chính */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Banner giải thích tính năng bảo mật */}
          <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200 text-xs text-indigo-900 space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              Bảo vệ bí mật doanh thu & Kiểm soát số liệu minh bạch
            </p>
            <p className="text-indigo-700 leading-relaxed text-[11px]">
              Chủ chuỗi có thể giao quyền cho Quản lý tòa chốt số điện nước, giao việc cho Bảo vệ tiếp nhận sửa chữa nhưng
              <strong> ẩn hoàn toàn doanh thu tổng và không cho phép tự ý đổi đơn giá phòng</strong>.
            </p>
          </div>

          {/* Thanh tác vụ: Nút Thêm Nhân Viên */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900">
              Danh Sách Nhân Viên Được Phân Công ({assignments.length})
            </h3>
            {!isAdding && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsAdding(true)}
                leftIcon={<UserPlus className="w-4 h-4" />}
              >
                Thêm Nhân Viên Mới
              </Button>
            )}
          </div>

          {/* Form Thêm Nhân Viên Mới */}
          {isAdding && (
            <form onSubmit={handleCreateStaff} className="p-5 rounded-2xl bg-slate-50 border border-slate-300 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-indigo-600" /> Cấp quyền truy cập cho nhân sự mới
                </span>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="text-xs text-slate-400 hover:text-slate-600 font-bold"
                >
                  Hủy
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Họ và tên nhân viên *</label>
                  <input
                    type="text"
                    required
                    value={newStaffName}
                    onChange={(e) => setNewStaffName(e.target.value)}
                    placeholder="VD: Nguyễn Văn Hùng"
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Số điện thoại *</label>
                  <input
                    type="tel"
                    required
                    value={newStaffPhone}
                    onChange={(e) => setNewStaffPhone(e.target.value)}
                    placeholder="0912 345 678"
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cơ sở / Tòa nhà phân công *</label>
                  <select
                    value={selectedBuildingId}
                    onChange={(e) => setSelectedBuildingId(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 bg-white font-medium"
                  >
                    {availableBuildings.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Vai trò nhân sự *</label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value as StaffRoleType)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 focus:border-indigo-500 bg-white font-medium"
                  >
                    <option value="manager">Quản Lý Tòa Nhà (Trông coi, chốt số)</option>
                    <option value="security">Bảo Vệ / Trông Xe (Chốt số, an ninh)</option>
                    <option value="accountant">Kế Toán Vận Hành (Đối soát tiền)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsAdding(false)}>
                  Hủy
                </Button>
                <Button variant="primary" size="sm" type="submit" isLoading={isSubmitting}>
                  Cấp Quyền Ngay
                </Button>
              </div>
            </form>
          )}

          {/* Bảng Danh Sách & Ma Trận Phân Quyền */}
          {isLoading ? (
            <div className="text-center py-8 text-xs text-slate-500">Đang tải danh sách nhân viên...</div>
          ) : assignments.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              Chưa có nhân viên nào được phân công. Hãy bấm "Thêm Nhân Viên Mới".
            </div>
          ) : (
            <div className="space-y-4">
              {assignments.map((staff) => {
                const roleMeta = STAFF_ROLE_LABELS[staff.role_type];
                return (
                  <div
                    key={staff.id}
                    className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 transition shadow-2xs space-y-4"
                  >
                    {/* Hàng 1: Thông tin nhân sự & Tòa nhà */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-slate-900">{staff.staff_name}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${roleMeta.badgeColor}`}>
                            {roleMeta.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
                          <span className="flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5 text-slate-400" /> {staff.staff_phone}
                          </span>
                          <span className="flex items-center gap-1 font-medium text-indigo-700">
                            <Building2 className="w-3.5 h-3.5" /> {staff.building_name}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          if (confirm(`Bạn có chắc chắn muốn thu hồi quyền của ${staff.staff_name}?`)) {
                            removeStaff(staff.id);
                          }
                        }}
                        className="text-xs text-rose-600 hover:text-rose-800 font-bold flex items-center gap-1 self-end sm:self-center p-1.5 hover:bg-rose-50 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Thu hồi quyền</span>
                      </button>
                    </div>

                    {/* Hàng 2: Bộ 4 công tắc phân quyền granular (Toggle Switch) */}
                    <div>
                      <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider block mb-2">
                        Chi tiết quyền thao tác tại cơ sở:
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        {/* Quyền 1: Chốt điện nước */}
                        <label
                          className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                            staff.can_record_meter
                              ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 font-bold'
                              : 'bg-slate-50 border-slate-200 text-slate-500'
                          }`}
                        >
                          <span className="flex items-center gap-1.5 text-[11px]">
                            <Zap className="w-3.5 h-3.5 text-amber-500" /> Chốt điện nước
                          </span>
                          <input
                            type="checkbox"
                            checked={staff.can_record_meter}
                            onChange={(e) => updatePermissions(staff.id, { can_record_meter: e.target.checked })}
                            className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                        </label>

                        {/* Quyền 2: Sửa chữa sự cố */}
                        <label
                          className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                            staff.can_manage_issues
                              ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 font-bold'
                              : 'bg-slate-50 border-slate-200 text-slate-500'
                          }`}
                        >
                          <span className="flex items-center gap-1.5 text-[11px]">
                            <Wrench className="w-3.5 h-3.5 text-blue-500" /> Xử lý sự cố
                          </span>
                          <input
                            type="checkbox"
                            checked={staff.can_manage_issues}
                            onChange={(e) => updatePermissions(staff.id, { can_manage_issues: e.target.checked })}
                            className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                        </label>

                        {/* Quyền 3: Thu tiền mặt */}
                        <label
                          className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                            staff.can_collect_cash
                              ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 font-bold'
                              : 'bg-slate-50 border-slate-200 text-slate-500'
                          }`}
                        >
                          <span className="flex items-center gap-1.5 text-[11px]">
                            <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> Thu tiền mặt
                          </span>
                          <input
                            type="checkbox"
                            checked={staff.can_collect_cash}
                            onChange={(e) => updatePermissions(staff.id, { can_collect_cash: e.target.checked })}
                            className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                        </label>

                        {/* Quyền 4: Xem doanh thu tổng */}
                        <label
                          className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                            staff.can_view_revenue
                              ? 'bg-purple-50/70 border-purple-300 text-purple-950 font-bold'
                              : 'bg-slate-50 border-slate-200 text-slate-500'
                          }`}
                        >
                          <span className="flex items-center gap-1.5 text-[11px]">
                            <TrendingUp className="w-3.5 h-3.5 text-purple-600" /> Xem doanh thu
                          </span>
                          <input
                            type="checkbox"
                            checked={staff.can_view_revenue}
                            onChange={(e) => updatePermissions(staff.id, { can_view_revenue: e.target.checked })}
                            className="rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-500 flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            Nhân viên chỉ truy cập được các chức năng được tích xanh ở trên.
          </span>
          <Button variant="outline" size="sm" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </div>
    </div>
  );
};

