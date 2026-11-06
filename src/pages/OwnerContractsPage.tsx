import React, { useState, useMemo } from 'react';
import {
  FileText,
  UserCheck,
  Clock,
  AlertTriangle,
  DollarSign,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Calendar,
  ExternalLink,
  MessageCircle,
  MoreVertical,
  ChevronRight,
  ShieldAlert,
  Archive,
  RefreshCw,
  FolderOpen,
  Wrench,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { formatPrice } from '../components/ui/Cards';
import { K23VipGate } from '../components/k23/subscription/K23VipGate';
import { useK23Tenants } from '../hooks/queries/useK23Tenants';
import { useAppStore } from '../store/useAppStore';
import { K23Contract, K23Tenant, CreateContractParams } from '../types/k23Tenants';
import { useNavigate } from 'react-router-dom';
import { CreateContractModal } from '../components/k23/contracts/CreateContractModal';
import { MoveOutSettlementModal } from '../components/k23/settlement/MoveOutSettlementModal';
import { IssueManagementModal } from '../components/k23/issues/IssueManagementModal';
import { TenantDocumentCabinetModal } from '../components/k23/tenants/TenantDocumentCabinetModal';
import { ZaloReminderModal } from '../components/k23/zalo/ZaloReminderModal';
import { ESignatureModal } from '../components/k23/contracts/ESignatureModal';
import { PenTool } from 'lucide-react';
import { Invoice } from '../types/k23';
import { extractZaloDataFromInvoice } from '../utils/zaloTemplateBuilder';

export const OwnerContractsPage: React.FC = () => {
  const { currentUser, rooms } = useAppStore();
  const navigate = useNavigate();
  const [selectedContractForSettlement, setSelectedContractForSettlement] = useState<K23Contract | null>(null);
  const [isIssuesModalOpen, setIsIssuesModalOpen] = useState<boolean>(false);
  const [selectedContractForSign, setSelectedContractForSign] = useState<K23Contract | null>(null);
  const ownerId = currentUser?.id || 'user_owner_1';

  const {
    contracts,
    tenants,
    isLoadingContracts,
    createContract,
    renewContract,
    terminateContract,
    isCreating,
    isRenewing,
    isTerminating,
  } = useK23Tenants();

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expiring_soon' | 'expired' | 'terminated'>('all');

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTenantForCabinet, setSelectedTenantForCabinet] = useState<K23Tenant | null>(null);
  const [zaloTargetInvoice, setZaloTargetInvoice] = useState<K23Invoice | null>(null);

  // Thống kê nhanh
  const stats = useMemo(() => {
    let activeCount = 0;
    let expiringCount = 0;
    let expiredCount = 0;
    let totalDeposit = 0;

    contracts.forEach((c) => {
      if (c.status === 'active') activeCount++;
      if (c.status === 'expiring_soon') {
        activeCount++;
        expiringCount++;
      }
      if (c.status === 'expired') expiredCount++;
      if (c.status !== 'terminated') {
        totalDeposit += c.deposit_amount || 0;
      }
    });

    return {
      activeCount,
      expiringCount,
      expiredCount,
      totalDeposit,
    };
  }, [contracts]);

  // Danh sách đã lọc
  const filteredContracts = useMemo(() => {
    return contracts.filter((c) => {
      // 1. Lọc status
      if (statusFilter !== 'all') {
        if (statusFilter === 'active' && c.status !== 'active') return false;
        if (statusFilter === 'expiring_soon' && c.status !== 'expiring_soon') return false;
        if (statusFilter === 'expired' && c.status !== 'expired') return false;
        if (statusFilter === 'terminated' && c.status !== 'terminated') return false;
      }

      // 2. Tìm kiếm theo từ khóa
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const tenantName = c.tenant?.full_name?.toLowerCase() || '';
        const tenantPhone = c.tenant?.phone?.toLowerCase() || '';
        const tenantCccd = c.tenant?.id_card_number?.toLowerCase() || '';
        const roomNumber = c.room?.room_number?.toLowerCase() || '';
        const code = c.contract_code?.toLowerCase() || '';

        return (
          tenantName.includes(query) ||
          tenantPhone.includes(query) ||
          tenantCccd.includes(query) ||
          roomNumber.includes(query) ||
          code.includes(query)
        );
      }

      return true;
    });
  }, [contracts, statusFilter, searchTerm]);

  const handleOpenZaloForContract = (contract: K23Contract) => {
    // Tạo dummy invoice từ contract để dùng ZaloReminderModal
    const dummyInvoice: K23Invoice = {
      id: contract.id,
      room_id: contract.room_id,
      room_number: contract.room?.room_number || 'Phòng',
      building_name: contract.room?.building_name || 'Tòa nhà',
      tenant_name: contract.tenant?.full_name || 'Khách thuê',
      tenant_phone: contract.tenant?.phone || '',
      billing_month: new Date().toISOString().slice(0, 7),
      rent_fee: contract.rent_amount,
      electric_old: 0,
      electric_new: 0,
      electric_kwh: 0,
      electric_rate: 3500,
      electric_fee: 0,
      water_type: 'head',
      water_fee: 100000,
      service_fee: 100000,
      other_fees: 0,
      total_amount: contract.rent_amount + 200000,
      status: 'pending',
      due_date: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(contract.payment_due_day).padStart(2, '0')}`,
      created_at: new Date().toISOString(),
    };
    setZaloTargetInvoice(dummyInvoice);
  };

  const handleCreateContractSuccess = async (params: CreateContractParams) => {
    return await createContract(params);
  };

  return (
    <K23VipGate featureTitle="Sổ Khách Thuê & Quản Lý Hợp Đồng">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-in fade-in duration-300">
        {/* Header trang */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
                K23 PMS • P0-02 & P0-04
              </span>
              <span className="text-xs text-slate-500 font-medium">Bảo toàn dữ liệu • Chống trùng phòng</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-2 flex items-center gap-2.5">
              <FileText className="w-8 h-8 text-emerald-700" />
              Sổ Khách Thuê & Hợp Đồng
            </h1>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              Quản lý danh bạ khách thuê, tủ hồ sơ CCCD điện tử, theo dõi ngày hết hạn hợp đồng và giữ tiền cọc minh bạch.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setIsIssuesModalOpen(true)}
              className="rounded-2xl border-amber-200 text-amber-800 bg-amber-50/60 hover:bg-amber-100"
            >
              <Wrench className="w-4 h-4 mr-2 text-amber-600" />
              Sự cố phòng
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (tenants.length > 0) setSelectedTenantForCabinet(tenants[0]);
              }}
              className="rounded-2xl border-slate-200"
            >
              <FolderOpen className="w-4 h-4 mr-2 text-teal-600" />
              Tủ hồ sơ CCCD
            </Button>
            <Button
              variant="primary"
              onClick={() => setIsCreateModalOpen(true)}
              className="rounded-2xl bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-700/20"
            >
              <Plus className="w-5 h-5 mr-1.5" />
              Tạo Hợp Đồng Mới
            </Button>
          </div>
        </div>

        {/* 4 Thẻ Thống kê nhanh */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-700 shrink-0">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-500 block">Đang thuê hoạt động</span>
              <span className="text-2xl font-black text-slate-900">{stats.activeCount} hợp đồng</span>
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-white border border-amber-200 shadow-sm flex items-center gap-4 relative overflow-hidden">
            {stats.expiringCount > 0 && (
              <span className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
            )}
            <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-700 shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-amber-700 block">Sắp hết hạn (&le; 30 ngày)</span>
              <span className="text-2xl font-black text-amber-900">{stats.expiringCount} hợp đồng</span>
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-white border border-rose-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-700 shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-rose-700 block">Đã quá hạn hợp đồng</span>
              <span className="text-2xl font-black text-rose-900">{stats.expiredCount} hợp đồng</span>
            </div>
          </div>

          <div className="p-5 rounded-3xl bg-white border border-teal-200 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center text-teal-700 shrink-0">
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-teal-700 block">Tổng tiền cọc đang giữ</span>
              <span className="text-2xl font-black text-teal-900">{formatPrice(stats.totalDeposit)}</span>
            </div>
          </div>
        </div>

        {/* Thanh tìm kiếm & Bộ lọc trạng thái */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên khách, SĐT, số phòng, CCCD..."
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Lọc:
            </span>
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'active', label: 'Đang chạy' },
              { id: 'expiring_soon', label: 'Sắp hết hạn' },
              { id: 'expired', label: 'Đã hết hạn' },
              { id: 'terminated', label: 'Đã thanh lý' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  statusFilter === tab.id
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bảng Danh sách Hợp đồng & Khách thuê */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          {isLoadingContracts ? (
            <div className="py-20 text-center text-slate-400 text-sm">Đang tải danh sách hợp đồng...</div>
          ) : filteredContracts.length === 0 ? (
            <div className="py-20 text-center space-y-3">
              <FileText className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="text-base font-bold text-slate-700">Chưa có hợp đồng nào phù hợp</p>
              <p className="text-xs text-slate-400">Hãy tạo hợp đồng mới để bắt đầu quản lý khách thuê</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-semibold text-xs uppercase tracking-wider">
                    <th className="py-4 px-6">Mã HĐ & Phòng</th>
                    <th className="py-4 px-6">Khách thuê & CCCD</th>
                    <th className="py-4 px-6">Thời hạn hợp đồng</th>
                    <th className="py-4 px-6">Tiền thuê & Tiền cọc</th>
                    <th className="py-4 px-6 text-center">Trạng thái</th>
                    <th className="py-4 px-6 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredContracts.map((c) => {
                    const daysLeft = Math.ceil(
                      (new Date(c.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                    );

                    return (
                      <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Mã HĐ & Phòng */}
                        <td className="py-4 px-6">
                          <div className="font-bold text-slate-900">{c.contract_code}</div>
                          <div className="text-xs font-semibold text-emerald-700 mt-0.5">
                            {c.room?.room_number || 'Phòng'}
                            {c.room?.building_name && ` • ${c.room.building_name}`}
                          </div>
                        </td>

                        {/* Khách thuê */}
                        <td className="py-4 px-6">
                          <div className="font-bold text-slate-900">{c.tenant?.full_name || 'Khách thuê'}</div>
                          <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <span className="font-semibold text-slate-700">{c.tenant?.phone}</span>
                            {c.tenant?.id_card_number && (
                              <span className="font-mono text-slate-400">({c.tenant.id_card_number})</span>
                            )}
                          </div>
                        </td>

                        {/* Thời hạn */}
                        <td className="py-4 px-6">
                          <div className="font-medium text-slate-800 text-xs">
                            {c.start_date} → {c.end_date}
                          </div>
                          <div className="mt-1">
                            {daysLeft > 30 && (
                              <span className="text-xs text-slate-500 font-medium">Còn {daysLeft} ngày</span>
                            )}
                            {daysLeft > 0 && daysLeft <= 30 && (
                              <span className="text-xs font-bold text-amber-700 flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" /> Còn {daysLeft} ngày hết hạn
                              </span>
                            )}
                            {daysLeft <= 0 && c.status !== 'terminated' && (
                              <span className="text-xs font-bold text-rose-700 flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5" /> Quá hạn {Math.abs(daysLeft)} ngày
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Giá thuê & Tiền cọc */}
                        <td className="py-4 px-6">
                          <div className="font-bold text-slate-900">{formatPrice(c.rent_amount)}/tháng</div>
                          <div className="text-xs font-semibold text-teal-700 mt-0.5">
                            Cọc: {formatPrice(c.deposit_amount)}
                          </div>
                        </td>

                        {/* Trạng thái */}
                        <td className="py-4 px-6 text-center">
                          {c.status === 'active' && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Đang hiệu lực
                            </span>
                          )}
                          {c.status === 'expiring_soon' && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 animate-pulse">
                              Sắp hết hạn
                            </span>
                          )}
                          {c.status === 'expired' && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              Đã hết hạn
                            </span>
                          )}
                          {c.status === 'terminated' && (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              Đã thanh lý
                            </span>
                          )}
                        </td>

                        {/* Thao tác */}
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Nút xem tủ hồ sơ */}
                            <button
                              type="button"
                              onClick={() => c.tenant && setSelectedTenantForCabinet(c.tenant)}
                              className="p-2 rounded-xl text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                              title="Tủ hồ sơ CCCD"
                            >
                              <FolderOpen className="w-4 h-4" />
                            </button>

                            {/* Nút nhắc Zalo */}
                            <button
                              type="button"
                              onClick={() => handleOpenZaloForContract(c)}
                              className="p-2 rounded-xl text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition-colors"
                              title="Nhắc Zalo 1 chạm"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </button>

                            {/* Nút Gia hạn nhanh */}
                            {c.status !== 'terminated' && (
                              <button
                                type="button"
                                disabled={isRenewing}
                                onClick={async () => {
                                  if (window.confirm(`Gia hạn hợp đồng ${c.contract_code} thêm 6 tháng?`)) {
                                    await renewContract({ contractId: c.id, additionalMonths: 6 });
                                  }
                                }}
                                className="px-2.5 py-1 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                                title="Gia hạn 6 tháng"
                              >
                                +6T
                              </button>
                            )}

                            {/* Nút thanh lý */}
                            {c.status !== 'terminated' && (
                              <button
                                type="button"
                                disabled={isTerminating}
                                onClick={() => setSelectedContractForSettlement(c)}
                                className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                title="Tất toán trả phòng & cấn trừ cọc"
                              >
                                <Archive className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Tạo Hợp đồng */}
        <CreateContractModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          rooms={rooms}
          ownerId={ownerId}
          onSuccess={handleCreateContractSuccess}
        />

        {/* Modal Tủ Hồ Sơ Khách Thuê */}
        <TenantDocumentCabinetModal
          isOpen={!!selectedTenantForCabinet}
          onClose={() => setSelectedTenantForCabinet(null)}
          tenant={selectedTenantForCabinet}
          contracts={contracts}
          onRenewContract={async (cId, months) => {
            return await renewContract({ contractId: cId, additionalMonths: months });
          }}
          onTerminateContract={async (cId) => {
            return await terminateContract(cId);
          }}
          onOpenZalo={(t) => {
            const matched = contracts.find((c) => c.tenant_id === t.id);
            if (matched) handleOpenZaloForContract(matched);
          }}
        />

        {/* Modal Nhắc nợ Zalo */}
        {zaloTargetInvoice && (
          <ZaloReminderModal
            isOpen={!!zaloTargetInvoice}
            onClose={() => setZaloTargetInvoice(null)}
            data={extractZaloDataFromInvoice(zaloTargetInvoice as any)}
          />
        )}
        {/* Modal Tất toán trả phòng & cấn trừ cọc (P1-01 & P1-10) */}
        <MoveOutSettlementModal
          isOpen={!!selectedContractForSettlement}
          onClose={() => setSelectedContractForSettlement(null)}
          contract={selectedContractForSettlement}
          onConfirmSettlement={async ({ contractId }) => {
            await terminateContract(contractId);
          }}
          onPostToMarketplace={(roomId) => {
            navigate('/chu-tro/phong/tao-moi');
          }}
        />
        {/* Modal Quản lý Sự Cố Phòng P1-04 */}
        <IssueManagementModal
          isOpen={isIssuesModalOpen}
          onClose={() => setIsIssuesModalOpen(false)}
        />
      </div>

      <ESignatureModal
        isOpen={!!selectedContractForSign}
        onClose={() => setSelectedContractForSign(null)}
        contract={selectedContractForSign}
      />
    </K23VipGate>
  );
};
export default OwnerContractsPage;
