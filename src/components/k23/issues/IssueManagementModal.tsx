import React, { useState } from 'react';
import {
  X,
  Wrench,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Plus,
  User,
  DollarSign,
  Phone,
  Image as ImageIcon,
  Sparkles,
  Filter,
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { formatPrice } from '../../ui/Cards';
import { K23Issue, IssueStatus, IssuePriority } from '../../../types/k23Operations';
import { useK23Operations } from '../../../hooks/queries/useK23Operations';
import { useAppStore } from '../../../store/useAppStore';

interface IssueManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IssueManagementModal: React.FC<IssueManagementModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, buildings, rooms } = useAppStore();
  const ownerId = currentUser?.id || 'user_owner_1';

  const { issues, createIssue, updateIssueStatus } = useK23Operations();

  const [statusFilter, setStatusFilter] = useState<'all' | IssueStatus>('all');
  const [isCreateMode, setIsCreateMode] = useState<boolean>(false);

  // Form tạo sự cố mới
  const [selectedRoomId, setSelectedRoomId] = useState<string>(rooms[0]?.id || '');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [priority, setPriority] = useState<IssuePriority>('medium');
  const [assignedTo, setAssignedTo] = useState<string>('');
  const [repairCost, setRepairCost] = useState<number>(0);

  // Modal nghiệm thu
  const [resolvingIssue, setResolvingIssue] = useState<K23Issue | null>(null);
  const [actualRepairCost, setActualRepairCost] = useState<number>(0);

  if (!isOpen) return null;

  const filteredIssues = issues.filter((iss) => {
    if (statusFilter !== 'all' && iss.status !== statusFilter) return false;
    return true;
  });

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const room = rooms.find((r) => r.id === selectedRoomId);
    const building = buildings.find((b) => b.id === room?.buildingId);

    await createIssue({
      building_id: building?.id || 'bld_1',
      building_name: building?.name || 'Tòa nhà',
      room_id: selectedRoomId,
      room_number: room?.roomNumber || room?.title || 'Phòng',
      owner_id: ownerId,
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      status: 'pending',
      repair_cost: repairCost,
      assigned_to: assignedTo.trim() || undefined,
    });

    setTitle('');
    setDescription('');
    setIsCreateMode(false);
  };

  const handleConfirmResolve = async () => {
    if (!resolvingIssue) return;
    await updateIssueStatus({
      issueId: resolvingIssue.id,
      status: 'resolved',
      repairCost: actualRepairCost,
      assignedTo: resolvingIssue.assigned_to,
    });
    setResolvingIssue(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-amber-800 via-amber-700 to-orange-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/20">
              <Wrench className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Quản Lý Sự Cố & Sửa Chữa (Work-Orders)</h3>
              <p className="text-xs text-amber-100/90">
                P1-04 • Theo dõi báo hỏng, điều phối thợ và tự động hạch toán chi phí
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thanh công cụ */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 text-xs font-bold">
            <span className="text-slate-500 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Lọc:
            </span>
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'pending', label: 'Chờ sửa' },
              { id: 'in_progress', label: 'Đang sửa' },
              { id: 'resolved', label: 'Đã xong' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3 py-1 rounded-xl transition-all ${
                  statusFilter === tab.id
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <Button
            variant="primary"
            onClick={() => setIsCreateMode(!isCreateMode)}
            className="bg-amber-600 hover:bg-amber-700 text-xs font-bold shadow-sm"
          >
            <Plus className="w-4 h-4 mr-1" />
            {isCreateMode ? 'Đóng form' : 'Báo sự cố mới'}
          </Button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* Form tạo sự cố mới */}
          {isCreateMode && (
            <form onSubmit={handleCreateSubmit} className="p-5 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-4 mb-4">
              <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" /> Tạo phiếu sự cố / Sửa chữa mới
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Chọn phòng gặp sự cố</label>
                  <select
                    value={selectedRoomId}
                    onChange={(e) => setSelectedRoomId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold"
                  >
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.roomNumber ? `P.${r.roomNumber}` : r.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Mức độ khẩn cấp</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-semibold"
                  >
                    <option value="low">Thấp (Có thể để vài ngày)</option>
                    <option value="medium">Bình thường (Trong 24h)</option>
                    <option value="high">Cao (Cần thợ xử lý sớm)</option>
                    <option value="urgent">Khẩn cấp (Hỏng điện nước nguy hiểm)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Tiêu đề sự cố</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="VD: Hỏng vòi sen rò rỉ nước, Điều hòa kêu to..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Mô tả chi tiết</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Khách báo từ sáng nay, cần thợ mang theo cờ lê và gioăng cao su..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="outline" type="button" onClick={() => setIsCreateMode(false)} className="text-xs">
                  Hủy
                </Button>
                <Button variant="primary" type="submit" className="bg-amber-600 hover:bg-amber-700 text-xs font-bold">
                  Lưu phiếu sự cố
                </Button>
              </div>
            </form>
          )}

          {/* Danh sách sự cố */}
          {filteredIssues.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-600">Hiện không có sự cố nào</p>
              <p className="text-xs">Tất cả trang thiết bị phòng đang hoạt động bình thường</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredIssues.map((issue) => (
                <div
                  key={issue.id}
                  className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-amber-300 transition-all shadow-sm space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{issue.title}</span>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700">
                        {issue.room_number || 'Phòng'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {issue.priority === 'urgent' && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200 animate-pulse flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Khẩn cấp
                        </span>
                      )}
                      {issue.priority === 'high' && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          Ưu tiên cao
                        </span>
                      )}

                      {issue.status === 'pending' && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                          Chờ tiếp nhận
                        </span>
                      )}
                      {issue.status === 'in_progress' && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                          Đang sửa chữa
                        </span>
                      )}
                      {issue.status === 'resolved' && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          ✓ Đã hoàn tất
                        </span>
                      )}
                    </div>
                  </div>

                  {issue.description && <p className="text-xs text-slate-600">{issue.description}</p>}

                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 pt-1">
                    <div className="flex items-center gap-3">
                      {issue.tenant_name && (
                        <span className="flex items-center gap-1 text-slate-700 font-semibold">
                          <User className="w-3.5 h-3.5" /> {issue.tenant_name}
                        </span>
                      )}
                      {issue.assigned_to && (
                        <span className="flex items-center gap-1 text-amber-800 font-semibold">
                          <Wrench className="w-3.5 h-3.5" /> {issue.assigned_to}
                        </span>
                      )}
                    </div>

                    {/* Thao tác chuyển trạng thái */}
                    <div className="flex items-center gap-2">
                      {issue.status === 'pending' && (
                        <button
                          type="button"
                          onClick={() => updateIssueStatus({ issueId: issue.id, status: 'in_progress', assignedTo: 'Thợ điện nước' })}
                          className="px-2.5 py-1 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
                        >
                          Giao thợ sửa
                        </button>
                      )}

                      {issue.status === 'in_progress' && (
                        <button
                          type="button"
                          onClick={() => {
                            setResolvingIssue(issue);
                            setActualRepairCost(issue.repair_cost || 100000);
                          }}
                          className="px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs transition-colors"
                        >
                          Nghiệm thu hoàn tất
                        </button>
                      )}

                      {issue.status === 'resolved' && issue.repair_cost > 0 && (
                        <span className="font-bold text-emerald-700 text-xs">
                          Chi phí: {formatPrice(issue.repair_cost)} (Đã vào Sổ Quỹ)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal nhập chi phí khi nghiệm thu */}
        {resolvingIssue && (
          <div className="p-4 bg-emerald-50 border-t border-emerald-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div>
              <span className="text-xs font-bold text-emerald-900 block">
                Nghiệm thu sự cố: {resolvingIssue.title}
              </span>
              <span className="text-[11px] text-emerald-700">
                Chi phí này sẽ tự động ghi nhận vào Sổ chi phí vận hành (P1-03)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="10000"
                value={actualRepairCost || ''}
                onChange={(e) => setActualRepairCost(parseFloat(e.target.value) || 0)}
                placeholder="Số tiền chi (đ)"
                className="w-32 px-3 py-1.5 rounded-xl border border-emerald-300 font-bold text-xs"
              />
              <Button variant="primary" onClick={handleConfirmResolve} className="bg-emerald-600 hover:bg-emerald-700 text-xs font-bold">
                Xác nhận
              </Button>
              <Button variant="outline" onClick={() => setResolvingIssue(null)} className="text-xs">
                Hủy
              </Button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <Button variant="outline" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </div>
    </div>
  );
};

