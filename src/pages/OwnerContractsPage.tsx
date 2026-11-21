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
  MessageCircle,
  MoreVertical,
  ChevronRight,
  ShieldAlert,
  Archive,
  RefreshCw,
  FolderOpen,
  Wrench,
  ArrowLeft,
  ArrowRight,
  Users,
  User,
  ShieldCheck,
  Check,
  Info,
  FileCheck,
  Phone,
  Mail,
  Car,
  MapPin,
  ExternalLink,
  PenTool,
  Grid,
  List,
  Building2,
  Lock,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { formatPrice } from '../components/ui/Cards';
import { K23VipGate } from '../components/k23/subscription/K23VipGate';
import { DashboardSidebar } from '../components/layout/DashboardSidebar';
import { useK23Tenants } from '../hooks/queries/useK23Tenants';
import { useAppStore } from '../store/useAppStore';
import { K23Contract, K23Tenant, CreateContractParams } from '../types/k23Tenants';
import { Room } from '../types';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { CreateContractModal } from '../components/k23/contracts/CreateContractModal';
import { MoveOutSettlementModal } from '../components/k23/settlement/MoveOutSettlementModal';
import { IssueManagementModal } from '../components/k23/issues/IssueManagementModal';
import { TenantDocumentCabinetModal } from '../components/k23/tenants/TenantDocumentCabinetModal';
import { ZaloReminderModal } from '../components/k23/zalo/ZaloReminderModal';
import { ESignatureModal } from '../components/k23/contracts/ESignatureModal';
import { Invoice } from '../types/k23';
import { extractZaloDataFromInvoice } from '../utils/zaloTemplateBuilder';

export const OwnerContractsPage: React.FC = () => {
  const { currentUser, rooms } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { roomId: urlRoomId, contractId: urlContractId } = useParams<{ roomId?: string; contractId?: string }>();

  // Xác định tiền tố route hiện tại (/chu-tro/hop-dong hoặc /chu-tro/khach-thue-hop-dong hoặc /chu-tro/so-khach)
  const baseRoute = useMemo(() => {
    if (location.pathname.startsWith('/chu-tro/khach-thue-hop-dong')) return '/chu-tro/khach-thue-hop-dong';
    if (location.pathname.startsWith('/chu-tro/so-khach')) return '/chu-tro/so-khach';
    return '/chu-tro/hop-dong';
  }, [location.pathname]);

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

  // 🌟 Điều hướng 3 Lớp có URL riêng biệt (Deep Linking Routing):
  // Lớp 1: ${baseRoute}
  // Lớp 2: ${baseRoute}/phong/:roomId
  // Lớp 3: ${baseRoute}/chi-tiet/:contractId
  const activeLayer: 1 | 2 | 3 = useMemo(() => {
    if (urlContractId) return 3;
    if (urlRoomId) return 2;
    return 1;
  }, [urlContractId, urlRoomId]);

  const selectedContractId = urlContractId || null;

  const selectedRoomId = useMemo(() => {
    if (urlRoomId) return urlRoomId;
    if (urlContractId) {
      const match = contracts.find((c) => c.id === urlContractId);
      return match?.room_id || null;
    }
    return null;
  }, [urlRoomId, urlContractId, contracts]);

  // View Mode: 'layers' (3 Lớp theo Stitch) hoặc 'table' (Bảng tổng hợp tất cả HĐ)
  const [viewMode, setViewMode] = useState<'layers' | 'table'>('layers');

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expiring_soon' | 'expired' | 'terminated'>('all');

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTenantForCabinet, setSelectedTenantForCabinet] = useState<K23Tenant | null>(null);
  const [zaloTargetInvoice, setZaloTargetInvoice] = useState<Invoice | null>(null);

  // Thống kê nhanh toàn bộ
  const stats = useMemo(() => {
    let activeCount = 0;
    let expiringCount = 0;
    let expiredCount = 0;
    let terminatedCount = 0;
    let totalDeposit = 0;

    contracts.forEach((c) => {
      if (c.status === 'active') activeCount++;
      if (c.status === 'expiring_soon') {
        activeCount++;
        expiringCount++;
      }
      if (c.status === 'expired') expiredCount++;
      if (c.status === 'terminated') terminatedCount++;
      if (c.status !== 'terminated') {
        totalDeposit += c.deposit_amount || 0;
      }
    });

    return {
      total: contracts.length,
      activeCount,
      expiringCount,
      expiredCount,
      terminatedCount,
      totalDeposit,
    };
  }, [contracts]);

  // Gom dữ liệu theo từng phòng cho LỚP 1
  const roomGridData = useMemo(() => {
    const map = new Map<
      string,
      {
        roomId: string;
        roomNumber: string;
        buildingName: string;
        floor?: number | string;
        contracts: K23Contract[];
        tenants: K23Tenant[];
        totalDeposit: number;
        hasExpiring: boolean;
        hasExpired: boolean;
        hasActive: boolean;
        capacity: number;
      }
    >();

    // 1. Khởi tạo từ danh sách rooms trong store
    (rooms || []).forEach((r) => {
      map.set(r.id, {
        roomId: r.id,
        roomNumber: r.room_number || r.title || 'Phòng',
        buildingName: r.building_name || 'Tòa nhà Trọ Xinh',
        floor: r.floor || 'Tầng 1',
        contracts: [],
        tenants: [],
        totalDeposit: 0,
        hasExpiring: false,
        hasExpired: false,
        hasActive: false,
        capacity: r.max_occupants || 2,
      });
    });

    // 2. Gắn contracts vào từng phòng
    contracts.forEach((c) => {
      const rId = c.room_id || c.room?.room_number || 'default_room';
      let entry = map.get(rId);
      if (!entry) {
        entry = {
          roomId: rId,
          roomNumber: c.room?.room_number || `P.${rId}`,
          buildingName: c.room?.building_name || 'Tòa nhà Trọ Xinh',
          floor: 'Tầng 2',
          contracts: [],
          tenants: [],
          totalDeposit: 0,
          hasExpiring: false,
          hasExpired: false,
          hasActive: false,
          capacity: 2,
        };
        map.set(rId, entry);
      }

      entry.contracts.push(c);
      if (c.tenant) {
        entry.tenants.push(c.tenant);
      }
      if (c.status !== 'terminated') {
        entry.totalDeposit += c.deposit_amount || 0;
      }
      if (c.status === 'expiring_soon') entry.hasExpiring = true;
      if (c.status === 'expired') entry.hasExpired = true;
      if (c.status === 'active') entry.hasActive = true;
    });

    let list = Array.from(map.values());

    // Áp dụng bộ lọc cho Lớp 1 nếu có
    if (statusFilter !== 'all') {
      list = list.filter((r) => {
        if (statusFilter === 'active') return r.hasActive;
        if (statusFilter === 'expiring_soon') return r.hasExpiring;
        if (statusFilter === 'expired') return r.hasExpired;
        if (statusFilter === 'terminated') return r.contracts.some((c) => c.status === 'terminated');
        return true;
      });
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (r) =>
          r.roomNumber.toLowerCase().includes(q) ||
          r.buildingName.toLowerCase().includes(q) ||
          r.tenants.some((t) => t.full_name?.toLowerCase().includes(q) || t.phone?.includes(q))
      );
    }

    return list;
  }, [rooms, contracts, statusFilter, searchTerm]);

  // Phòng đang chọn ở Lớp 2 (Hỗ trợ cả mở URL trực tiếp lẫn điều hướng nội bộ)
  const activeRoomData = useMemo(() => {
    if (!selectedRoomId) return null;
    const found = roomGridData.find((r) => r.roomId === selectedRoomId);
    if (found) return found;

    const roomObj = rooms.find((r) => r.id === selectedRoomId);
    const roomContracts = contracts.filter((c) => c.room_id === selectedRoomId);
    return {
      roomId: selectedRoomId,
      roomNumber: roomObj?.room_number || roomObj?.title || `Phòng ${selectedRoomId}`,
      buildingName: roomObj?.building_name || 'Tòa nhà Trọ Xinh',
      floor: roomObj?.floor || 'Tầng 1',
      contracts: roomContracts,
      tenants: roomContracts.map((c) => c.tenant).filter(Boolean) as K23Tenant[],
      totalDeposit: roomContracts.reduce((sum, c) => sum + (c.deposit_amount || 0), 0),
      hasExpiring: roomContracts.some((c) => c.status === 'expiring_soon'),
      hasExpired: roomContracts.some((c) => c.status === 'expired'),
      hasActive: roomContracts.some((c) => c.status === 'active'),
      capacity: roomObj?.max_occupants || 2,
    };
  }, [roomGridData, selectedRoomId, rooms, contracts]);

  // Hợp đồng / Thành viên đang chọn ở Lớp 3
  const activeContractData = useMemo(() => {
    if (!selectedContractId) return null;
    return contracts.find((c) => c.id === selectedContractId) || null;
  }, [contracts, selectedContractId]);

  // Danh sách hợp đồng đã lọc cho chế độ bảng phẳng (Table view)
  const filteredContracts = useMemo(() => {
    return contracts.filter((c) => {
      if (statusFilter !== 'all') {
        if (statusFilter === 'active' && c.status !== 'active') return false;
        if (statusFilter === 'expiring_soon' && c.status !== 'expiring_soon') return false;
        if (statusFilter === 'expired' && c.status !== 'expired') return false;
        if (statusFilter === 'terminated' && c.status !== 'terminated') return false;
      }

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

  // Điều hướng giữa các lớp (CẬP NHẬT TRỰC TIẾP URL TRÊN THANH ĐỊA CHỈ TRÌNH DUYỆT)
  const handleSelectRoomToLayer2 = (roomId: string) => {
    navigate(`${baseRoute}/phong/${roomId}`);
  };

  const handleSelectContractToLayer3 = (contractId: string) => {
    navigate(`${baseRoute}/chi-tiet/${contractId}`);
  };

  const handleBackToLayer1 = () => {
    navigate(baseRoute);
  };

  const handleBackToLayer2 = () => {
    if (selectedRoomId) {
      navigate(`${baseRoute}/phong/${selectedRoomId}`);
    } else {
      navigate(baseRoute);
    }
  };

  const handleOpenZaloForContract = (contract: K23Contract) => {
    const dummyInvoice: Invoice = {
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
      due_date: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(contract.payment_due_day || 5).padStart(2, '0')}`,
      created_at: new Date().toISOString(),
    };
    setZaloTargetInvoice(dummyInvoice);
  };

  const handleCreateContractSuccess = async (params: CreateContractParams) => {
    return await createContract(params);
  };

  return (
    <K23VipGate featureTitle="Sổ Khách Thuê & Quản Lý Hợp Đồng">
      <div className="flex bg-gray-50 min-h-[calc(100vh-4rem)]">
        {/* Sidebar Chủ trọ chuẩn Stitch */}
        <DashboardSidebar role="owner" />

        {/* Nội dung chính */}
        <main className="flex-1 p-4 sm:p-8 max-w-7xl space-y-6 overflow-y-auto animate-in fade-in duration-200">
          {/* 🌟 1. HEADER CHÍNH CỦA TRANG */}
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
                Quản lý danh bạ khách thuê theo chu trình 3 Lớp: Lưới ô phòng &rarr; Danh sách thành viên &rarr; Hồ sơ CCCD điện tử chi tiết.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setIsIssuesModalOpen(true)}
                className="rounded-2xl border-amber-200 text-amber-800 bg-amber-50/60 hover:bg-amber-100"
              >
                <Wrench className="w-4 h-4 mr-2 text-amber-600" />
                Sự cố phòng (3)
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
                + Tạo Hợp Đồng Mới
              </Button>
            </div>
          </div>

          {/* 🌟 2. 4 THẺ THỐNG KÊ (STITCH LIFECYCLE) */}
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

          {/* 🌟 3. BỘ CHUYỂN CHẾ ĐỘ HIỂN THỊ & TÌM KIẾM / LỌC */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              {/* Tab chuyển đổi chế độ */}
              <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl self-start">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('layers');
                    navigate(baseRoute);
                  }}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    viewMode === 'layers'
                      ? 'bg-white text-emerald-800 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Grid className="w-4 h-4 text-emerald-600" />
                  Quy Trình 3 Lớp (Chuẩn Stitch)
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    viewMode === 'table'
                      ? 'bg-white text-emerald-800 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <List className="w-4 h-4 text-slate-500" />
                  Bảng Tổng Hợp HĐ
                </button>
              </div>

              {/* Breadcrumb khi đang ở Lớp 2 hoặc Lớp 3 */}
              {viewMode === 'layers' && (
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <span
                    onClick={handleBackToLayer1}
                    className={`cursor-pointer px-2.5 py-1 rounded-lg transition-colors ${
                      activeLayer === 1 ? 'bg-emerald-100 text-emerald-800' : 'text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    Lớp 1: Ô Phòng
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  <span
                    onClick={() => {
                      if (selectedRoomId) navigate(`${baseRoute}/phong/${selectedRoomId}`);
                    }}
                    className={`px-2.5 py-1 rounded-lg transition-colors ${
                      !selectedRoomId
                        ? 'text-slate-300 cursor-not-allowed'
                        : activeLayer === 2
                        ? 'bg-teal-100 text-teal-800 cursor-pointer'
                        : 'text-slate-500 hover:bg-slate-100 cursor-pointer'
                    }`}
                  >
                    Lớp 2: Thành Viên
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  <span
                    onClick={() => {
                      if (selectedContractId) navigate(`${baseRoute}/chi-tiet/${selectedContractId}`);
                    }}
                    className={`px-2.5 py-1 rounded-lg ${
                      activeLayer === 3 ? 'bg-amber-100 text-amber-900 cursor-pointer' : 'text-slate-300'
                    }`}
                  >
                    Lớp 3: Hồ Sơ Chi Tiết
                  </span>
                </div>
              )}
            </div>

            {/* Thanh tìm kiếm & Bộ lọc số đếm động */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-2 border-t border-slate-100">
              <div className="relative w-full md:w-96">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm theo tên khách, SĐT, số phòng, CCCD..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm bg-slate-50/50"
                />
              </div>

              <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 mr-1">
                  <Filter className="w-3.5 h-3.5" /> Lọc:
                </span>
                {[
                  { id: 'all', label: `Tất cả (${stats.total})` },
                  { id: 'active', label: `Đang chạy (${stats.activeCount})` },
                  { id: 'expiring_soon', label: `Sắp hết hạn (${stats.expiringCount})` },
                  { id: 'expired', label: `Đã hết hạn (${stats.expiredCount})` },
                  { id: 'terminated', label: `Đã thanh lý (${stats.terminatedCount})` },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setStatusFilter(tab.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
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
          </div>

          {/* 🌟 4. GIAO DIỆN CHÍNH: QUY TRÌNH 3 LỚP (STITCH NATIVE) */}
          {viewMode === 'layers' && (
            <div className="space-y-6">
              {/* ============================================================== */}
              {/* 🟢 LỚP 1: LƯỚI Ô PHÒNG & HIỆN TRẠNG CỌC (ROOM MATRIX) */}
              {/* ============================================================== */}
              {activeLayer === 1 && (
                <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-6 animate-in fade-in duration-200">
                  <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-800 font-bold shadow-xs">
                        <Grid className="w-5 h-5 text-emerald-700" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-700 text-white text-[11px] font-black uppercase tracking-wider">
                            LỚP 1 (MẶC ĐỊNH)
                          </span>
                          <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                            Lưới Ô Phòng & Hiện Trạng Cọc
                          </h2>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Bấm vào từng ô phòng để mở <strong>Lớp 2 (Danh sách thành viên)</strong> hoặc thêm thành viên mới
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="primary"
                        onClick={() => setIsCreateModalOpen(true)}
                        className="rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold"
                      >
                        <Plus className="w-4 h-4 mr-1" /> + Thêm thành viên
                      </Button>
                    </div>
                  </div>

                  {isLoadingContracts ? (
                    <div className="py-20 text-center text-slate-400 text-sm">Đang tải danh sách ô phòng...</div>
                  ) : roomGridData.length === 0 ? (
                    <div className="py-16 text-center space-y-3">
                      <Building2 className="w-12 h-12 text-slate-300 mx-auto" />
                      <p className="text-base font-bold text-slate-700">Chưa có ô phòng nào</p>
                      <p className="text-xs text-slate-400">Hãy thêm tòa nhà và phòng trọ để bắt đầu quản lý</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {roomGridData.map((room) => {
                        const occupantCount = room.tenants.length;
                        const isVacant = occupantCount === 0;

                        return (
                          <div
                            key={room.roomId}
                            className={`p-5 rounded-2xl border transition-all flex flex-col justify-between gap-4 relative group ${
                              isVacant
                                ? 'border-dashed border-slate-300 bg-slate-50/60 hover:bg-slate-100/60'
                                : room.hasExpired
                                ? 'border-rose-200 bg-rose-50/20 hover:shadow-md'
                                : room.hasExpiring
                                ? 'border-amber-300 bg-amber-50/20 hover:shadow-md'
                                : 'border-slate-200 bg-white hover:shadow-md hover:border-emerald-300'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleSelectRoomToLayer2(room.roomId)}
                                    className="text-lg sm:text-xl font-black text-slate-900 group-hover:text-emerald-700 transition-colors flex items-center gap-1 cursor-pointer"
                                  >
                                    {room.roomNumber}
                                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-transform group-hover:translate-x-0.5" />
                                  </button>

                                  {isVacant ? (
                                    <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[11px] font-bold">
                                      Phòng trống
                                    </span>
                                  ) : room.hasExpired ? (
                                    <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[11px] font-bold flex items-center gap-1 border border-rose-200">
                                      <span className="w-1.5 h-1.5 rounded-full bg-rose-600" /> Đã hết hạn
                                    </span>
                                  ) : room.hasExpiring ? (
                                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[11px] font-bold flex items-center gap-1 border border-amber-300 animate-pulse">
                                      <span className="w-1.5 h-1.5 rounded-full bg-amber-600" /> Sắp hết hạn
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold flex items-center gap-1 border border-emerald-200">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" /> Đang hiệu lực
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-500 mt-1">
                                  {room.buildingName} • {room.floor}
                                </p>
                              </div>

                              <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-800 text-xs font-black">
                                {occupantCount}/{room.capacity} TV
                              </span>
                            </div>

                            {/* Khối tiền cọc giữ */}
                            <div className="p-3 rounded-xl bg-slate-100/70 flex items-center justify-between text-xs">
                              <span className="text-slate-500 font-medium">
                                {isVacant ? 'Chưa có thành viên' : 'Tổng tiền cọc đang giữ:'}
                              </span>
                              <span className="font-extrabold text-teal-800 text-sm">
                                {isVacant ? 'Cọc: 0 đ' : formatPrice(room.totalDeposit)}
                              </span>
                            </div>

                            {/* Thao tác chuyển sang Lớp 2 hoặc thêm TV */}
                            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                              <button
                                type="button"
                                onClick={() => handleSelectRoomToLayer2(room.roomId)}
                                className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 hover:underline cursor-pointer"
                              >
                                <Users className="w-3.5 h-3.5" />
                                {isVacant ? 'Xem chi tiết ô phòng' : `Xem ${occupantCount} thành viên (Lớp 2)`}
                              </button>

                              <button
                                type="button"
                                onClick={() => setIsCreateModalOpen(true)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-bold transition-colors border border-emerald-200"
                              >
                                <Plus className="w-3.5 h-3.5" /> Thêm TV
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}

              {/* ============================================================== */}
              {/* 🔵 LỚP 2: DANH SÁCH THÀNH VIÊN TRONG PHÒNG (MEMBERS LIST) */}
              {/* ============================================================== */}
              {activeLayer === 2 && (
                <section className="bg-white rounded-3xl p-6 shadow-sm border-2 border-teal-500/30 space-y-6 animate-in fade-in duration-200">
                  <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-teal-100 flex items-center justify-center text-teal-800 font-bold shadow-xs">
                        <Users className="w-5 h-5 text-teal-700" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full bg-teal-700 text-white text-[11px] font-black uppercase tracking-wider">
                            LỚP 2
                          </span>
                          <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                            Danh Sách Thành Viên — {activeRoomData?.roomNumber || 'Phòng'} • {activeRoomData?.buildingName}
                          </h2>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Hiện đang có {activeRoomData?.contracts.length || 0} hợp đồng thành viên cư trú tại phòng này
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleBackToLayer1}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" /> &larr; Quay lại danh sách phòng (Lớp 1)
                    </button>
                  </div>

                  {/* Danh sách các card thành viên */}
                  {(!activeRoomData || activeRoomData.contracts.length === 0) ? (
                    <div className="py-16 text-center space-y-3 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <Users className="w-12 h-12 text-slate-300 mx-auto" />
                      <p className="text-base font-bold text-slate-700">Phòng này hiện chưa có thành viên nào</p>
                      <Button
                        variant="primary"
                        onClick={() => setIsCreateModalOpen(true)}
                        className="rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold"
                      >
                        <Plus className="w-4 h-4 mr-1" /> + Thêm Hợp Đồng Thành Viên Mới
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activeRoomData.contracts.map((contract, index) => {
                        const daysLeft = Math.ceil(
                          (new Date(contract.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                        );
                        const initials = (contract.tenant?.full_name || 'KT')
                          .split(' ')
                          .map((n) => n[0])
                          .slice(-2)
                          .join('')
                          .toUpperCase();

                        return (
                          <div
                            key={contract.id}
                            className="p-5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50/50 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-2xs"
                          >
                            <div className="flex items-center gap-3.5 min-w-0">
                              <div className="w-12 h-12 rounded-2xl bg-emerald-700 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-2xs">
                                {initials}
                              </div>
                              <div className="min-w-0 space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-extrabold text-slate-900 text-base">
                                    {contract.tenant?.full_name || 'Khách thuê'}
                                  </span>
                                  {index === 0 ? (
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold border border-emerald-200">
                                      Đại diện HĐ
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold">
                                      Thành viên ở cùng
                                    </span>
                                  )}

                                  {contract.status === 'active' && (
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200">
                                      Đang hiệu lực
                                    </span>
                                  )}
                                  {contract.status === 'expiring_soon' && (
                                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[11px] font-bold border border-amber-300">
                                      Sắp hết hạn
                                    </span>
                                  )}
                                  {contract.status === 'expired' && (
                                    <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[11px] font-bold border border-rose-200">
                                      Đã hết hạn
                                    </span>
                                  )}
                                </div>

                                <div className="text-xs text-slate-500 flex flex-wrap items-center gap-x-3 gap-y-1">
                                  <span>
                                    SĐT: <strong className="text-slate-800">{contract.tenant?.phone || 'N/A'}</strong>
                                  </span>
                                  <span>
                                    • CCCD:{' '}
                                    <strong className="text-emerald-700 font-mono">
                                      {contract.tenant?.id_card_number || 'Đã lưu (2 mặt)'}
                                    </strong>
                                  </span>
                                  <span>
                                    • Hợp đồng: <strong>{contract.start_date} &rarr; {contract.end_date}</strong> (
                                    {daysLeft > 0 ? `Còn ${daysLeft} ngày` : `Quá hạn ${Math.abs(daysLeft)} ngày`})
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between md:justify-end gap-4 w-full md:w-auto shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                              <div className="text-right">
                                <span className="text-[11px] text-slate-500 block">Tiền cọc giữ:</span>
                                <span className="font-extrabold text-teal-800 text-sm">
                                  {formatPrice(contract.deposit_amount)}
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleSelectContractToLayer3(contract.id)}
                                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800 transition-all shadow-sm cursor-pointer"
                              >
                                Xem hồ sơ (Lớp 3) &rarr;
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}

              {/* ============================================================== */}
              {/* 🟠 LỚP 3: HỒ SƠ CHI TIẾT THÀNH VIÊN & HỢP ĐỒNG (DETAIL PROFILE) */}
              {/* ============================================================== */}
              {activeLayer === 3 && activeContractData && (
                <section className="bg-white rounded-3xl p-6 shadow-sm border-2 border-amber-500/40 space-y-6 animate-in fade-in duration-200">
                  <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-900 font-bold shadow-xs">
                        <FileCheck className="w-5 h-5 text-amber-700" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-full bg-amber-600 text-white text-[11px] font-black uppercase tracking-wider">
                            LỚP 3
                          </span>
                          <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                            Hồ Sơ Chi Tiết Thành Viên — {activeContractData.tenant?.full_name || 'Khách thuê'} ({activeContractData.room?.room_number || 'Phòng'})
                          </h2>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Mã hợp đồng: <strong className="font-mono text-emerald-800">{activeContractData.contract_code}</strong> • {activeContractData.room?.building_name || 'Tòa nhà'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleBackToLayer2}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" /> &larr; Quay lại danh sách thành viên (Lớp 2)
                    </button>
                  </div>

                  {/* Layout 2 cột chuẩn Stitch: Cột trái Thông tin nhân thân & HĐ; Cột phải CCCD 2 mặt & 4 Nút hành động */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Cột trái: 7 phần */}
                    <div className="lg:col-span-7 space-y-5">
                      {/* 1. Thông tin cá nhân & Liên hệ */}
                      <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                        <span className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                          <User className="w-4 h-4 text-emerald-700" /> 1. Thông tin cá nhân & liên hệ
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                          <div>
                            <span className="text-slate-500 block">Họ và tên:</span>
                            <strong className="text-slate-900 text-sm font-black">{activeContractData.tenant?.full_name}</strong>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Số điện thoại Zalo:</span>
                            <strong className="text-slate-900 text-sm font-black">{activeContractData.tenant?.phone}</strong>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Số CCCD gắn chip:</span>
                            <strong className="text-emerald-700 font-mono text-sm font-bold">
                              {activeContractData.tenant?.id_card_number || '001201012345'}
                            </strong>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Quê quán / Thường trú:</span>
                            <span className="text-slate-800 font-medium">{activeContractData.tenant?.hometown || 'TP. Hà Nội'}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Biển số xe máy:</span>
                            <strong className="text-slate-900 font-mono font-bold">
                              {activeContractData.tenant?.license_plate || '29-P1 567.89'}
                            </strong>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Email liên hệ:</span>
                            <span className="text-slate-800">{activeContractData.tenant?.email || 'khachthue@troxinh.com'}</span>
                          </div>
                        </div>
                      </div>

                      {/* 2. Điều khoản hợp đồng thuê phòng */}
                      <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                        <span className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-emerald-700" /> 2. Điều khoản hợp đồng thuê phòng
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                          <div>
                            <span className="text-slate-500 block">Mã hợp đồng & Phòng:</span>
                            <span className="font-mono font-black text-emerald-800">
                              {activeContractData.contract_code}
                            </span>{' '}
                            ({activeContractData.room?.room_number})
                          </div>
                          <div>
                            <span className="text-slate-500 block">Thời hạn hợp đồng:</span>
                            <strong className="text-slate-800">{activeContractData.start_date} &rarr; {activeContractData.end_date}</strong>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Giá thuê thỏa thuận:</span>
                            <strong className="text-emerald-700 text-sm font-black">
                              {formatPrice(activeContractData.rent_amount)}/tháng
                            </strong>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Tiền cọc giữ chỗ:</span>
                            <strong className="text-teal-800 text-sm font-black">
                              {formatPrice(activeContractData.deposit_amount)}
                            </strong>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Hạn đóng tiền hàng tháng:</span>
                            <span className="text-slate-800 font-bold">Mùng {activeContractData.payment_due_day || 5} hàng tháng</span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">Trạng thái chữ ký pháp lý:</span>
                            <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Đã ký (hồ sơ giấy lưu trữ)
                            </span>
                          </div>
                        </div>
                        <div className="p-3 rounded-xl bg-white border border-slate-200 text-slate-600 text-[11px] leading-relaxed">
                          <strong>Ghi chú bàn giao:</strong> Khách đóng cọc trước, cam kết ở tối thiểu 6 tháng, đã bàn giao 2 chìa khóa cổng và 1 thẻ thang máy.
                        </div>
                      </div>

                      {/* 3. Tình trạng công nợ */}
                      <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                            <DollarSign className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="text-xs font-black text-slate-900">Tình trạng công nợ tiền phòng</div>
                            <div className="text-[11px] text-slate-600">Đã thu đủ kỳ tháng hiện tại</div>
                          </div>
                        </div>
                        <span className="px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-bold shadow-2xs">
                          Còn nợ: 0 đ
                        </span>
                      </div>
                    </div>

                    {/* Cột phải: 5 phần (Ảnh CCCD & 4 nút hành động) */}
                    <div className="lg:col-span-5 space-y-5 flex flex-col justify-between">
                      <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                            <FolderOpen className="w-4 h-4 text-emerald-700" /> Ảnh CCCD 2 mặt (Lưu trữ an toàn)
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            Đã mã hóa
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-1">
                          <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-center space-y-1.5">
                            <span className="text-[11px] font-bold text-slate-600 block">Mặt trước (Chip)</span>
                            <div className="h-28 rounded-lg bg-slate-100 overflow-hidden relative border border-slate-200 flex items-center justify-center">
                              <img
                                className="object-cover w-full h-full"
                                alt="Mặt trước CCCD"
                                src="https://images.unsplash.com/photo-1633332755192-727a05c4013d?auto=format&fit=crop&w=400&q=80"
                              />
                            </div>
                            <span className="font-mono text-[10px] text-slate-400 block truncate">
                              {activeContractData.tenant?.id_card_number || '001201012345'}
                            </span>
                          </div>

                          <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-center space-y-1.5">
                            <span className="text-[11px] font-bold text-slate-600 block">Mặt sau</span>
                            <div className="h-28 rounded-lg bg-slate-100 overflow-hidden relative border border-slate-200 flex items-center justify-center">
                              <img
                                className="object-cover w-full h-full"
                                alt="Mặt sau CCCD"
                                src="https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=400&q=80"
                              />
                            </div>
                            <span className="text-[10px] text-slate-400 block truncate">Cục CSQLHC TTXH</span>
                          </div>
                        </div>
                      </div>

                      {/* Cụm 4 nút thao tác nghiệp vụ chuẩn Stitch */}
                      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
                        <span className="text-xs font-black text-slate-700 uppercase tracking-wide block">
                          Thao tác nghiệp vụ:
                        </span>
                        <div className="grid grid-cols-2 gap-2.5">
                          <button
                            type="button"
                            onClick={() => handleOpenZaloForContract(activeContractData)}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-teal-700 text-white text-xs font-bold hover:bg-teal-800 transition-all shadow-sm cursor-pointer"
                          >
                            <MessageCircle className="w-4 h-4" /> Nhắc Zalo 1 chạm
                          </button>

                          <button
                            type="button"
                            onClick={async () => {
                              if (confirm(`Xác nhận gia hạn hợp đồng ${activeContractData.contract_code} thêm 6 tháng?`)) {
                                await renewContract({ contractId: activeContractData.id, additionalMonths: 6 });
                                alert('Đã gia hạn thành công thêm 6 tháng!');
                              }
                            }}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-emerald-100 text-emerald-900 text-xs font-bold hover:bg-emerald-200 transition-colors cursor-pointer border border-emerald-300"
                          >
                            <RefreshCw className="w-4 h-4" /> +6T Gia hạn
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedContractForSettlement(activeContractData)}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-rose-50 text-rose-800 text-xs font-bold hover:bg-rose-100 transition-colors border border-rose-200 cursor-pointer"
                          >
                            <Archive className="w-4 h-4" /> Tất toán & cấn cọc
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (activeContractData.tenant) {
                                setSelectedTenantForCabinet(activeContractData.tenant);
                              }
                            }}
                            className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
                          >
                            <FolderOpen className="w-4 h-4" /> Tủ hồ sơ CCCD
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>
              )}
            </div>
          )}

          {/* 🌟 5. CHẾ ĐỘ BẢNG TỔNG HỢP (TABLE VIEW) KHI NGƯỜI DÙNG CẦN XEM PHẲNG */}
          {viewMode === 'table' && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-200">
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
                            <td className="py-4 px-6">
                              <div className="font-bold text-slate-900">{c.contract_code}</div>
                              <div className="text-xs font-semibold text-emerald-700 mt-0.5">
                                {c.room?.room_number || 'Phòng'}
                                {c.room?.building_name && ` • ${c.room.building_name}`}
                              </div>
                            </td>

                            <td className="py-4 px-6">
                              <div className="font-bold text-slate-900">{c.tenant?.full_name || 'Khách thuê'}</div>
                              <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                                <span className="font-semibold text-slate-700">{c.tenant?.phone}</span>
                                {c.tenant?.id_card_number && (
                                  <span className="font-mono text-slate-400">({c.tenant.id_card_number})</span>
                                )}
                              </div>
                            </td>

                            <td className="py-4 px-6">
                              <div className="font-medium text-slate-800 text-xs">
                                {c.start_date} &rarr; {c.end_date}
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

                            <td className="py-4 px-6">
                              <div className="font-bold text-slate-900">{formatPrice(c.rent_amount)}/tháng</div>
                              <div className="text-xs font-semibold text-teal-700 mt-0.5">
                                Cọc: {formatPrice(c.deposit_amount)}
                              </div>
                            </td>

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

                            <td className="py-4 px-6 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setViewMode('layers');
                                    handleSelectContractToLayer3(c.id);
                                  }}
                                  title="Mở hồ sơ chi tiết (Lớp 3)"
                                  className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                                >
                                  <FolderOpen className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenZaloForContract(c)}
                                  title="Gửi Zalo nhắc tiền phòng"
                                  className="p-1.5 rounded-lg text-teal-600 hover:bg-teal-50 transition-colors"
                                >
                                  <MessageCircle className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setSelectedContractForSign(c)}
                                  title="Ký tay điện tử / E-Sign"
                                  className="p-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors"
                                >
                                  <PenTool className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (confirm(`Gia hạn hợp đồng ${c.contract_code} thêm 6 tháng?`)) {
                                      await renewContract({ contractId: c.id, additionalMonths: 6 });
                                    }
                                  }}
                                  title="Gia hạn hợp đồng 6 tháng"
                                  className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors font-bold text-xs"
                                >
                                  +6T
                                </button>
                                {c.status !== 'terminated' && (
                                  <button
                                    type="button"
                                    onClick={() => setSelectedContractForSettlement(c)}
                                    title="Tất toán & Cấn trừ cọc"
                                    className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
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
          )}

          {/* 🌟 6. KHỐI LƯU Ý PHÁP LÝ CHUẨN STITCH */}
          <section className="rounded-2xl bg-amber-50 border border-amber-200 p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-2xs font-bold">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="text-amber-900 space-y-1 text-xs">
              <h3 className="font-extrabold uppercase tracking-wide text-amber-950">
                Lưu ý nghiệp vụ pháp lý hợp đồng:
              </h3>
              <p className="leading-relaxed text-amber-900/90">
                Hợp đồng trên hệ thống Trọ Xinh PMS dùng để quản lý dữ liệu danh bạ, thời hạn, báo cáo sự cố và đối trừ cọc minh bạch. Việc ký kết pháp lý bắt buộc phải được thực hiện bằng <strong>hợp đồng giấy</strong> giữa Chủ trọ và Người thuê theo đúng quy định hiện hành của pháp luật.
              </p>
            </div>
          </section>

          {/* Modals nghiệp vụ */}
          <CreateContractModal
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            rooms={rooms}
            ownerId={ownerId}
            onSuccess={handleCreateContractSuccess}
          />

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

          {zaloTargetInvoice && (
            <ZaloReminderModal
              isOpen={!!zaloTargetInvoice}
              onClose={() => setZaloTargetInvoice(null)}
              data={extractZaloDataFromInvoice(zaloTargetInvoice as any)}
            />
          )}

          <MoveOutSettlementModal
            isOpen={!!selectedContractForSettlement}
            onClose={() => setSelectedContractForSettlement(null)}
            contract={selectedContractForSettlement}
            onConfirmSettlement={async ({ contractId }) => {
              await terminateContract(contractId);
            }}
            onPostToMarketplace={() => {
              navigate('/chu-tro/phong/tao-moi');
            }}
          />

          <IssueManagementModal
            isOpen={isIssuesModalOpen}
            onClose={() => setIsIssuesModalOpen(false)}
          />

          <ESignatureModal
            isOpen={!!selectedContractForSign}
            onClose={() => setSelectedContractForSign(null)}
            contract={selectedContractForSign}
          />
        </main>
      </div>
    </K23VipGate>
  );
};

export default OwnerContractsPage;
