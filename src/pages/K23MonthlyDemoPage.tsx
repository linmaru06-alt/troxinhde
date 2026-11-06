import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { DashboardSidebar } from '../components/layout/DashboardSidebar';
import { SEOHead } from '../components/seo/SEOHead';
import { InvoiceBillView } from '../components/k23/InvoiceBillView';
import { ShareBillButton } from '../components/k23/ShareBillButton';
import { ZaloReminderButton } from '../components/k23/zalo/ZaloReminderButton';
import { ExportPdfButton } from '../components/k23/billing/ExportPdfButton';
import { BatchCreateRoomsModal } from '../components/k23/rooms/BatchCreateRoomsModal';
import { TenantDocumentCabinetModal } from '../components/k23/tenants/TenantDocumentCabinetModal';
import { ProrationCalculatorModal } from '../components/k23/billing/ProrationCalculatorModal';
import { RecordPaymentModal } from '../components/k23/billing/RecordPaymentModal';
import { MoveOutSettlementModal } from '../components/k23/settlement/MoveOutSettlementModal';
import { exportK23FinanceToExcel } from '../utils/k23ExcelExporter';
import { IssueManagementModal } from '../components/k23/issues/IssueManagementModal';
import { ExpenseManagementModal } from '../components/k23/expenses/ExpenseManagementModal';
import { WebhookSimulatorModal } from '../components/k23/webhook/WebhookSimulatorModal';
import { AuditLogModal } from '../components/k23/audit/AuditLogModal';
import { StaffManagementModal } from '../components/k23/staff/StaffManagementModal';
import { TieredTariffConfigModal } from '../components/k23/tariffs/TieredTariffConfigModal';
import { ParkingManagementModal } from '../components/k23/parking/ParkingManagementModal';
import { ESignatureModal } from '../components/k23/contracts/ESignatureModal';
import { LateFeeConfigModal } from '../components/k23/settings/LateFeeConfigModal';
import { K23Contract, K23Tenant } from '../types/k23Tenants';
import { Invoice, InvoiceStatus } from '../types/k23';
import { formatCurrency } from '../components/ui/Cards';
import { Button } from '../components/ui/Button';
import {
  Building2,
  Calendar,
  Zap,
  Receipt,
  QrCode,
  DollarSign,
  CheckCircle2,
  Clock,
  AlertCircle,
  Share2,
  Printer,
  Sparkles,
  ArrowRight,
  Eye,
  Camera,
  Layers,
  Wrench,
  TrendingUp,
  FileSpreadsheet,
  FileDown,
  History,
  Archive,
  FolderOpen,
  Calculator,
  UserCheck,
  ExternalLink,
  Crown,
  Bike,
  PenTool,
  ShieldCheck,
} from 'lucide-react';

interface DemoRoomReading {
  roomId: string;
  roomNumber: string;
  tenantName: string;
  tenantPhone: string;
  baseRent: number;
  elecOld: number;
  elecNew: number;
  waterOld: number;
  waterNew: number;
  trashFee: number;
  wifiFee: number;
  parkingFee: number;
}

export const K23MonthlyDemoPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'invoices' | 'readings' | 'bill'>('invoices');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string>('inv_302');
  const billViewRef = useRef<HTMLDivElement>(null);

  // Dữ liệu mock phục vụ demo Tủ hồ sơ & Tất toán
  const demoTenants: K23Tenant[] = [
    {
      id: 't_302',
      owner_id: 'user_owner_1',
      full_name: 'Nguyễn Văn An',
      phone: '0988 123 456',
      id_card_number: '001201012345',
      id_card_date: '2021-05-12',
      id_card_place: 'Cục CS QLHC về TTXH',
      hometown: 'Thái Bình',
      vehicle_plate: '17B2-688.99',
      id_card_front_url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80',
      id_card_back_url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=600&q=80',
      notes: 'Sinh viên ĐH Bách Khoa, ngoan ngoãn, đóng tiền đúng hạn.',
    },
    {
      id: 't_303',
      owner_id: 'user_owner_1',
      full_name: 'Lê Thị Thu Mai',
      phone: '0977 654 321',
      id_card_number: '034199008877',
      hometown: 'Hải Dương',
      vehicle_plate: '34C1-345.67',
      notes: 'Nhân viên văn phòng, giữ gìn phòng sạch sẽ.',
    },
    {
      id: 't_304',
      owner_id: 'user_owner_1',
      full_name: 'Trần Minh Đức',
      phone: '0912 888 999',
      id_card_number: '022203001122',
      hometown: 'Quảng Ninh',
      notes: 'Kinh doanh tự do.',
    },
  ];

  const demoContracts: K23Contract[] = [
    {
      id: 'contract_302',
      contract_code: 'HD-2026-P302',
      owner_id: 'user_owner_1',
      room_id: 'room_1',
      tenant_id: 't_302',
      start_date: '2026-08-01',
      end_date: '2027-08-01',
      rent_amount: 4200000,
      deposit_amount: 4200000,
      payment_cycle_months: 1,
      payment_due_day: 5,
      status: 'active',
      room: { id: 'room_1', room_number: 'P.302', title: 'Phòng Studio', building_name: 'Tòa Nhà Xanh' },
      tenant: demoTenants[0],
    },
    {
      id: 'contract_304',
      contract_code: 'HD-2026-P304',
      owner_id: 'user_owner_1',
      room_id: 'room_3',
      tenant_id: 't_304',
      start_date: '2026-05-01',
      end_date: '2026-11-01',
      rent_amount: 3500000,
      deposit_amount: 3500000,
      payment_cycle_months: 1,
      payment_due_day: 5,
      status: 'expired',
      room: { id: 'room_3', room_number: 'P.304', title: 'Phòng Đơn', building_name: 'Tòa Nhà Xanh' },
      tenant: demoTenants[2],
    },
  ];

  // States các Modals trải nghiệm K23
  const [isBatchRoomsOpen, setIsBatchRoomsOpen] = useState(false);
  const [isCabinetOpen, setIsCabinetOpen] = useState(false);
  const [isProrationOpen, setIsProrationOpen] = useState(false);
  const [isRecordPaymentOpen, setIsRecordPaymentOpen] = useState(false);
  const [isSettlementOpen, setIsSettlementOpen] = useState(false);
  const [isIssuesOpen, setIsIssuesOpen] = useState(false);
  const [isExpenseOpen, setIsExpenseOpen] = useState(false);
  const [isWebhookOpen, setIsWebhookOpen] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [isStaffOpen, setIsStaffOpen] = useState(false);
  const [isTieredTariffOpen, setIsTieredTariffOpen] = useState(false);
  const [isParkingOpen, setIsParkingOpen] = useState(false);
  const [isESignOpen, setIsESignOpen] = useState(false);
  const [isLateFeeOpen, setIsLateFeeOpen] = useState(false);

  // 1. Dữ liệu chỉ số điện nước demo tương tác trực tiếp
  const [readings, setReadings] = useState<DemoRoomReading[]>([
    {
      roomId: 'room_1',
      roomNumber: 'P.302',
      tenantName: 'Nguyễn Văn An',
      tenantPhone: '0988 123 456',
      baseRent: 4200000,
      elecOld: 1450,
      elecNew: 1520, // 70 kWh
      waterOld: 42,
      waterNew: 48,  // 6 m3
      trashFee: 20000,
      wifiFee: 50000,
      parkingFee: 100000,
    },
    {
      roomId: 'room_2',
      roomNumber: 'P.303',
      tenantName: 'Lê Thị Thu Mai',
      tenantPhone: '0977 654 321',
      baseRent: 3800000,
      elecOld: 1120,
      elecNew: 1175, // 55 kWh
      waterOld: 28,
      waterNew: 32,  // 4 m3
      trashFee: 20000,
      wifiFee: 50000,
      parkingFee: 100000,
    },
    {
      roomId: 'room_3',
      roomNumber: 'P.304',
      tenantName: 'Trần Minh Đức',
      tenantPhone: '0912 888 999',
      baseRent: 3500000,
      elecOld: 980,
      elecNew: 1025, // 45 kWh
      waterOld: 35,
      waterNew: 38,  // 3 m3
      trashFee: 20000,
      wifiFee: 50000,
      parkingFee: 0,
    },
  ]);

  const elecUnitPrice = 3500;
  const waterUnitPrice = 25000;

  // 2. Danh sách Hóa đơn demo hoàn chỉnh Tháng 11/2026
  const [invoices, setInvoices] = useState<Invoice[]>([
    {
      id: 'inv_302',
      room_id: 'room_1',
      owner_id: 'user_owner_1',
      invoice_code: 'HD-202611-302',
      billing_month: 11,
      billing_year: 2026,
      due_date: '2026-11-10T00:00:00Z',
      total_amount: 4765000,
      paid_amount: 0,
      remaining: 4765000,
      status: 'sent',
      payment_method: 'Chuyển khoản VietQR',
      notes: 'Tiền phòng tháng 11/2026. Quý khách vui lòng chuyển khoản trước ngày 10/11.',
      created_at: '2026-11-01T08:00:00Z',
      room: {
        id: 'room_1',
        room_number: 'P.302',
        title: 'Phòng Studio Ban Công Thoáng Mát',
        building_id: 'bld_1',
        price: 4200000,
      },
      tenant: {
        id: 't_302',
        full_name: 'Nguyễn Văn An',
        phone: '0988 123 456',
      },
      items: [
        { id: 'i1', item_type: 'rent', description: 'Tiền thuê phòng tháng 11/2026', quantity: 1, unit_price: 4200000, amount: 4200000 },
        { id: 'i2', item_type: 'service', description: 'Tiền điện (1.450 ➔ 1.520: 70 kWh)', quantity: 70, unit_price: 3500, amount: 245000 },
        { id: 'i3', item_type: 'service', description: 'Tiền nước sinh hoạt (42 ➔ 48: 6 m³)', quantity: 6, unit_price: 25000, amount: 150000 },
        { id: 'i4', item_type: 'service', description: 'Rác sinh hoạt & Vệ sinh chung', quantity: 1, unit_price: 20000, amount: 20000 },
        { id: 'i5', item_type: 'service', description: 'Internet Wifi cáp quang tốc độ cao', quantity: 1, unit_price: 50000, amount: 50000 },
        { id: 'i6', item_type: 'service', description: 'Phí gửi xe máy tầng 1 (1 xe)', quantity: 1, unit_price: 100000, amount: 100000 },
      ],
    },
    {
      id: 'inv_303',
      room_id: 'room_2',
      owner_id: 'user_owner_1',
      invoice_code: 'HD-202611-303',
      billing_month: 11,
      billing_year: 2026,
      due_date: '2026-11-10T00:00:00Z',
      total_amount: 4207500,
      paid_amount: 4207500,
      remaining: 0,
      status: 'paid',
      paid_at: '2026-11-03T10:15:00Z',
      payment_method: 'Chuyển khoản VietQR',
      notes: 'Đã thanh toán đủ qua chuyển khoản VietQR quét mã tự động.',
      created_at: '2026-11-01T08:30:00Z',
      room: {
        id: 'room_2',
        room_number: 'P.303',
        title: 'Phòng Studio Đầy Đủ Nội Thất',
        building_id: 'bld_1',
        price: 3800000,
      },
      tenant: {
        id: 't_303',
        full_name: 'Lê Thị Thu Mai',
        phone: '0977 654 321',
      },
      items: [
        { id: 'i21', item_type: 'rent', description: 'Tiền thuê phòng tháng 11/2026', quantity: 1, unit_price: 3800000, amount: 3800000 },
        { id: 'i22', item_type: 'service', description: 'Tiền điện (1.120 ➔ 1.175: 55 kWh)', quantity: 55, unit_price: 3500, amount: 192500 },
        { id: 'i23', item_type: 'service', description: 'Tiền nước sinh hoạt (28 ➔ 32: 4 m³)', quantity: 4, unit_price: 25000, amount: 100000 },
        { id: 'i24', item_type: 'service', description: 'Rác sinh hoạt & Vệ sinh chung', quantity: 1, unit_price: 20000, amount: 20000 },
        { id: 'i25', item_type: 'service', description: 'Internet Wifi tốc độ cao', quantity: 1, unit_price: 50000, amount: 50000 },
        { id: 'i26', item_type: 'service', description: 'Phí gửi xe máy tầng 1 (1 xe)', quantity: 1, unit_price: 100000, amount: 100000 },
        { id: 'i27', item_type: 'deduction', description: 'Khuyến mãi tân sinh viên', quantity: 1, unit_price: -55000, amount: -55000 },
      ],
    },
    {
      id: 'inv_304',
      room_id: 'room_3',
      owner_id: 'user_owner_1',
      invoice_code: 'HD-202611-304',
      billing_month: 11,
      billing_year: 2026,
      due_date: '2026-11-05T00:00:00Z',
      total_amount: 3802500,
      paid_amount: 0,
      remaining: 3802500,
      status: 'overdue',
      payment_method: 'Chuyển khoản VietQR',
      notes: 'Đã quá hạn đóng tiền phòng 3 ngày. Vui lòng thanh toán gấp trong ngày hôm nay.',
      created_at: '2026-11-01T09:00:00Z',
      room: {
        id: 'room_3',
        room_number: 'P.304',
        title: 'Phòng Đơn Tiện Nghi Ban Công',
        building_id: 'bld_1',
        price: 3500000,
      },
      tenant: {
        id: 't_304',
        full_name: 'Trần Minh Đức',
        phone: '0912 888 999',
      },
      items: [
        { id: 'i31', item_type: 'rent', description: 'Tiền thuê phòng tháng 11/2026', quantity: 1, unit_price: 3500000, amount: 3500000 },
        { id: 'i32', item_type: 'service', description: 'Tiền điện (980 ➔ 1.025: 45 kWh)', quantity: 45, unit_price: 3500, amount: 157500 },
        { id: 'i33', item_type: 'service', description: 'Tiền nước sinh hoạt (35 ➔ 38: 3 m³)', quantity: 3, unit_price: 25000, amount: 75000 },
        { id: 'i34', item_type: 'service', description: 'Rác sinh hoạt & Vệ sinh chung', quantity: 1, unit_price: 20000, amount: 20000 },
        { id: 'i35', item_type: 'service', description: 'Internet Wifi tốc độ cao', quantity: 1, unit_price: 50000, amount: 50000 },
      ],
    },
  ]);

  const activeInvoice = invoices.find((inv) => inv.id === selectedInvoiceId) || invoices[0];

  // Tính tổng dòng tiền
  const totalBilled = invoices.reduce((sum, inv) => sum + inv.total_amount, 0);
  const totalCollected = invoices.reduce((sum, inv) => sum + inv.paid_amount, 0);
  const totalRemaining = invoices.reduce((sum, inv) => sum + inv.remaining, 0);
  const collectionRate = Math.round((totalCollected / totalBilled) * 100);

  // Đổi trạng thái thanh toán mẫu
  const handleTogglePaid = (invId: string) => {
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id === invId) {
          const isNowPaid = inv.status !== 'paid';
          return {
            ...inv,
            status: (isNowPaid ? 'paid' : 'sent') as InvoiceStatus,
            paid_amount: isNowPaid ? inv.total_amount : 0,
            remaining: isNowPaid ? 0 : inv.total_amount,
            paid_at: isNowPaid ? new Date().toISOString() : undefined,
          };
        }
        return inv;
      })
    );
  };

  // Cập nhật số điện/nước tương tác
  const handleUpdateReading = (roomId: string, field: 'elecNew' | 'waterNew', val: number) => {
    setReadings((prev) =>
      prev.map((r) => {
        if (r.roomId === roomId) {
          return { ...r, [field]: Math.max(0, val) };
        }
        return r;
      })
    );
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <SEOHead
        title="Demo Mẫu 1 Tháng Quản Lý Phòng Trọ K23 | Trọ Xinh"
        description="Trải nghiệm thực tế 1 tháng quản lý phòng trọ: chốt số điện nước, tờ hóa đơn in ấn A5 và VietQR chuyển khoản động."
      />
      <DashboardSidebar role="owner" />

      <main className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto space-y-6">
        {/* Banner Giới thiệu Demo */}
        <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider mb-3 shadow-sm">
                <Crown className="w-3.5 h-3.5" />
                BẢN DEMO MẪU HOÀN CHỈNH — 1 THÁNG QUẢN LÝ PHÒNG TRỌ K23
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Tòa Nhà Xanh Trọ Xinh — Kỳ Thu Tiền Tháng 11/2026
              </h1>
              <p className="text-xs sm:text-sm text-emerald-100 mt-2 max-w-2xl leading-relaxed">
                Xem trực quan cách K23 vận hành: từ chốt số điện nước tự động, phát hành hóa đơn A5 chuẩn in ấn đến quét VietQR động nhận tiền trong 3 giây.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Link to="/chu-tro/goi-dich-vu">
                <Button className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs px-5 py-3 rounded-xl shadow-lg flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 fill-current" /> Đăng ký gói VIP chính thức <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>

          {/* 4 Thẻ Thống kê Dòng tiền */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-emerald-600/60">
            <div className="bg-emerald-900/40 p-3.5 rounded-2xl border border-emerald-600/40">
              <span className="text-[11px] text-emerald-200 block mb-0.5">Tổng tiền phát hành</span>
              <span className="text-lg sm:text-xl font-extrabold text-white">{formatCurrency(totalBilled)}</span>
              <span className="text-[10px] text-emerald-300 block mt-0.5">3 phòng</span>
            </div>

            <div className="bg-emerald-900/40 p-3.5 rounded-2xl border border-emerald-600/40">
              <span className="text-[11px] text-emerald-200 block mb-0.5">Đã thu về</span>
              <span className="text-lg sm:text-xl font-extrabold text-amber-300">{formatCurrency(totalCollected)}</span>
              <span className="text-[10px] text-emerald-300 block mt-0.5">1 phòng đã quét QR</span>
            </div>

            <div className="bg-emerald-900/40 p-3.5 rounded-2xl border border-emerald-600/40">
              <span className="text-[11px] text-emerald-200 block mb-0.5">Còn nợ lại</span>
              <span className="text-lg sm:text-xl font-extrabold text-rose-300">{formatCurrency(totalRemaining)}</span>
              <span className="text-[10px] text-emerald-300 block mt-0.5">2 phòng chưa đóng</span>
            </div>

            <div className="bg-emerald-900/40 p-3.5 rounded-2xl border border-emerald-600/40">
              <span className="text-[11px] text-emerald-200 block mb-0.5">Tỷ lệ thu hồi</span>
              <span className="text-lg sm:text-xl font-extrabold text-white">{collectionRate}%</span>
              <span className="text-[10px] text-emerald-300 block mt-0.5">Tiến độ tháng</span>
            </div>
          </div>
        </div>

        {/* 🌟 SIÊU PHÒNG LAB TRẢI NGHIỆM ĐẦY ĐỦ TÍNH NĂNG K23 PMS (CẢ GIAI ĐOẠN 1 VÀ 2) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                Phòng Lab Thử Nghiệm K23 — Đầy Đủ Tính Năng Vận Hành Chuỗi & Ký Số (P0, P1 & P2)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Bấm vào từng nút bên dưới để xem trực tiếp cách hệ thống vận hành thực tế
              </p>
            </div>
            <span className="text-[11px] font-bold px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
              ✓ Đầy đủ P0, P1 & P2 (Đợt 1 + 2)
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {/* P0-01 */}
            <button
              type="button"
              onClick={() => setIsBatchRoomsOpen(true)}
              className="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition flex flex-col justify-between gap-2 cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <Building2 className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-900 block group-hover:text-emerald-700">Tạo phòng hàng loạt</span>
                <span className="text-[10px] text-slate-400">P0-01 • Sinh tự động</span>
              </div>
            </button>

            {/* P0-04 */}
            <button
              type="button"
              onClick={() => setIsCabinetOpen(true)}
              className="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition flex flex-col justify-between gap-2 cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
                <FolderOpen className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-900 block group-hover:text-teal-700">Tủ hồ sơ CCCD</span>
                <span className="text-[10px] text-slate-400">P0-04 • Xem ảnh 2 mặt</span>
              </div>
            </button>

            {/* P0-05 */}
            <button
              type="button"
              onClick={() => setIsProrationOpen(true)}
              className="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition flex flex-col justify-between gap-2 cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                <Calculator className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-900 block group-hover:text-blue-700">Tính tiền ngày lẻ</span>
                <span className="text-[10px] text-slate-400">P0-05 • Vào/ra giữa kỳ</span>
              </div>
            </button>

            {/* P0-06 */}
            <button
              type="button"
              onClick={() => setIsRecordPaymentOpen(true)}
              className="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition flex flex-col justify-between gap-2 cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <DollarSign className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-900 block group-hover:text-emerald-700">Thu từng phần</span>
                <span className="text-[10px] text-slate-400">P0-06 • Ghi nhận nợ</span>
              </div>
            </button>

            {/* P1-01 & P1-10 */}
            <button
              type="button"
              onClick={() => setIsSettlementOpen(true)}
              className="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition flex flex-col justify-between gap-2 cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                <Archive className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-900 block group-hover:text-rose-700">Tất toán trả phòng</span>
                <span className="text-[10px] text-slate-400">P1-01 • Cấn trừ cọc</span>
              </div>
            </button>

            {/* P1-02 */}
            <button
              type="button"
              onClick={() => {
                exportK23FinanceToExcel({
                  month: 11,
                  year: 2026,
                  buildingName: 'Tòa Nhà Xanh Trọ Xinh',
                  invoices,
                  contracts: demoContracts,
                  tenants: demoTenants,
                });
              }}
              className="p-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-left transition flex flex-col justify-between gap-2 cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-xs">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-emerald-900 block">Xuất Excel (.xlsx)</span>
                <span className="text-[10px] text-emerald-700">P1-02 • Tải 4 sheets</span>
              </div>
            </button>

            {/* P1-03 */}
            <button
              type="button"
              onClick={() => setIsExpenseOpen(true)}
              className="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition flex flex-col justify-between gap-2 cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-900 block group-hover:text-teal-700">Sổ quỹ & Lãi ròng</span>
                <span className="text-[10px] text-slate-400">P1-03 • Thu trừ Chi</span>
              </div>
            </button>

            {/* P1-04 */}
            <button
              type="button"
              onClick={() => setIsIssuesOpen(true)}
              className="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition flex flex-col justify-between gap-2 cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                <Wrench className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-900 block group-hover:text-amber-700">Sự cố phòng</span>
                <span className="text-[10px] text-slate-400">P1-04 • Giao việc thợ</span>
              </div>
            </button>

            {/* P1-06 */}
            <button
              type="button"
              onClick={() => setIsWebhookOpen(true)}
              className="p-3 rounded-2xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-left transition flex flex-col justify-between gap-2 cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-blue-900 block">Test SePay 3s</span>
                <span className="text-[10px] text-blue-700">P1-06 • Tự động gạch nợ</span>
              </div>
            </button>

            {/* P1-05 */}
            <a
              href="/tra-cuu-phong"
              target="_blank"
              rel="noreferrer"
              className="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition flex flex-col justify-between gap-2 cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                <ExternalLink className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-900 block group-hover:text-purple-700">Cổng Web khách</span>
                <span className="text-[10px] text-slate-400">P1-05 • Xem bill VietQR</span>
              </div>
            </a>

            {/* P1-08 */}
            <button
              type="button"
              onClick={() => setIsAuditOpen(true)}
              className="p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition flex flex-col justify-between gap-2 cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                <History className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-900 block group-hover:text-indigo-700">Nhật ký Audit Log</span>
                <span className="text-[10px] text-slate-400">P1-08 • Lịch sử sửa số</span>
              </div>
            </button>

            {/* P0-10 */}
            <Link
              to="/chu-tro/hop-dong"
              className="p-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-left transition flex flex-col justify-between gap-2 cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold shadow-xs">
                <UserCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-emerald-950 block">Sổ khách & HĐ</span>
                <span className="text-[10px] text-emerald-700">Trang quản lý đầy đủ →</span>
              </div>
            </Link>

            {/* P2-01 */}
            <button
              type="button"
              onClick={() => setIsStaffOpen(true)}
              className="p-3 rounded-2xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-left transition flex flex-col justify-between gap-2 cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-indigo-950 block">Phân quyền nhân sự</span>
                <span className="text-[10px] text-indigo-700">P2-01 • RBAC đa cơ sở</span>
              </div>
            </button>

            {/* P2-02 */}
            <button
              type="button"
              onClick={() => setIsTieredTariffOpen(true)}
              className="p-3 rounded-2xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-left transition flex flex-col justify-between gap-2 cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-amber-950 block">Điện bậc thang</span>
                <span className="text-[10px] text-amber-700">P2-02 • Lũy tiến EVN</span>
              </div>
            </button>

            {/* P2-03 */}
            <button
              type="button"
              onClick={() => setIsParkingOpen(true)}
              className="p-3 rounded-2xl bg-sky-50 hover:bg-sky-100 border border-sky-200 text-left transition flex flex-col justify-between gap-2 cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold shadow-xs">
                <Bike className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-sky-950 block">Vé xe tháng</span>
                <span className="text-[10px] text-sky-700">P2-03 • Quản lý biển số</span>
              </div>
            </button>

            {/* P2-05 */}
            <button
              type="button"
              onClick={() => setIsESignOpen(true)}
              className="p-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-left transition flex flex-col justify-between gap-2 cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-xl bg-emerald-800 text-white flex items-center justify-center font-bold shadow-xs">
                <PenTool className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-emerald-950 block">Ký HĐ & Mẫu CT01</span>
                <span className="text-[10px] text-emerald-700">P2-05 • Chữ ký số SHA-256</span>
              </div>
            </button>

            {/* P2-06 */}
            <button
              type="button"
              onClick={() => setIsLateFeeOpen(true)}
              className="p-3 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-left transition flex flex-col justify-between gap-2 cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold shadow-xs">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-rose-950 block">Phạt chậm nộp</span>
                <span className="text-[10px] text-rose-700">P2-06 • Grace period</span>
              </div>
            </button>
          </div>
        </div>

        {/* Thanh Điều Hướng Tabs */}
        <div className="flex border-b border-slate-200 space-x-2">
          <button
            type="button"
            onClick={() => setActiveTab('invoices')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'invoices'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Receipt className="w-4 h-4" />
            <span>1. Danh Sách Hóa Đơn & Tờ Bill A5 ({invoices.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('readings')}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all ${
              activeTab === 'readings'
                ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-xl'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>2. Bảng Chốt Số Điện Nước Trực Tiếp</span>
          </button>
        </div>

        {/* ================= TAB 1: DANH SÁCH HÓA ĐƠN & LIVE BILL A5 ================= */}
        {activeTab === 'invoices' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Cột trái: Danh sách hóa đơn (5 cột) */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                  Chọn phòng để xem chi tiết tờ Bill A5:
                </h3>

                <div className="space-y-3">
                  {invoices.map((inv) => {
                    const isSelected = inv.id === selectedInvoiceId;
                    const isPaid = inv.status === 'paid';
                    const isOverdue = inv.status === 'overdue';

                    return (
                      <div
                        key={inv.id}
                        onClick={() => setSelectedInvoiceId(inv.id)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50/40 shadow-sm ring-2 ring-emerald-500/20'
                            : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-base text-slate-900">
                              {inv.room?.room_number}
                            </span>
                            <span className="text-xs text-slate-500">({inv.tenant?.full_name})</span>
                          </div>

                          {isPaid ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                              <CheckCircle2 className="w-3 h-3" /> Đã thu
                            </span>
                          ) : isOverdue ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded-full">
                              <AlertCircle className="w-3 h-3" /> Quá hạn
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full">
                              <Clock className="w-3 h-3" /> Chờ đóng
                            </span>
                          )}
                        </div>

                        <div className="flex items-baseline justify-between pt-2 border-t border-slate-100 text-xs">
                          <span className="text-slate-500">Mã: {inv.invoice_code}</span>
                          <span className="font-extrabold text-sm text-slate-900">
                            {formatCurrency(inv.total_amount)}
                          </span>
                        </div>

                        <div className="mt-3 flex items-center justify-between pt-2 text-xs">
                          <div className="flex items-center gap-1.5">
                            <ZaloReminderButton invoice={inv} size="sm" />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTogglePaid(inv.id);
                              }}
                            className={`px-3 py-1.5 rounded-xl font-bold transition-all text-[11px] ${
                              isPaid
                                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                            }`}
                          >
                            {isPaid ? 'Đổi: Chưa thu' : 'Đã nhận tiền'}
                            </button>
                          </div>

                          <span className="text-emerald-700 font-bold flex items-center gap-1">
                            Xem bill A5 <ArrowRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Cột phải: Live Bill A5 In Ấn Kèm VietQR (7 cột) */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                      <Receipt className="w-5 h-5 text-emerald-600" />
                      TỜ HÓA ĐƠN A5 CHUẨN IN ẤN & GỬI ZALO
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Đang xem hóa đơn phòng: <strong>{activeInvoice.room?.room_number}</strong>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <ZaloReminderButton invoice={activeInvoice} variant="primary" />
                    <ShareBillButton
                      targetRef={billViewRef}
                      invoiceCode={activeInvoice.invoice_code}
                      roomTitle={activeInvoice.room?.room_number ? `P${activeInvoice.room.room_number}` : 'phong'}
                    />
                  </div>
                </div>

                {/* Container Tờ Bill A5 */}
                <div className="bg-slate-100 p-3 sm:p-5 rounded-2xl flex justify-center overflow-x-auto shadow-inner">
                  <div ref={billViewRef} className="w-full max-w-[520px]">
                    <InvoiceBillView
                      invoice={activeInvoice}
                      buildingName="Tòa Nhà Xanh Trọ Xinh - Cầu Giấy"
                      buildingAddress="Số 18 Ngõ 165 Cầu Giấy, P. Dịch Vọng, Hà Nội"
                      ownerName="Trần Quốc Tuấn"
                      ownerPhone="0912345678"
                      bankId="MB"
                      bankAccountNo="0912345678"
                      bankAccountName="TRAN QUOC TUAN"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: BẢNG CHỐT SỐ ĐIỆN NƯỚC TƯƠNG TÁC ================= */}
        {activeTab === 'readings' && (
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500" />
                  Bảng Chốt Số Điện Nước Tháng 11/2026 (Tương Tác Thử)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Đơn giá cấu hình: <strong>Điện {formatCurrency(elecUnitPrice)}/kWh</strong> • <strong>Nước {formatCurrency(waterUnitPrice)}/m³</strong>
                </p>
              </div>

              <div className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                💡 Bạn có thể thử gõ số mới vào ô input để xem hệ thống tự động tính tiền
              </div>
            </div>

            {/* Bảng chốt số */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 text-slate-700 uppercase font-bold text-[11px] border-b border-slate-200">
                    <th className="py-3 px-3">Phòng</th>
                    <th className="py-3 px-3">Khách thuê</th>
                    <th className="py-3 px-3 text-center bg-amber-50/60 border-l border-amber-100">Số điện cũ</th>
                    <th className="py-3 px-3 text-center bg-amber-50/60">Số điện mới</th>
                    <th className="py-3 px-3 text-right bg-amber-50/60">Dùng (kWh)</th>
                    <th className="py-3 px-3 text-right bg-amber-50/60 border-r border-amber-100">Tiền điện</th>
                    <th className="py-3 px-3 text-center bg-blue-50/60">Số nước cũ</th>
                    <th className="py-3 px-3 text-center bg-blue-50/60">Số nước mới</th>
                    <th className="py-3 px-3 text-right bg-blue-50/60">Dùng (m³)</th>
                    <th className="py-3 px-3 text-right bg-blue-50/60">Tiền nước</th>
                    <th className="py-3 px-3 text-right font-black">Ước tính Bill</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {readings.map((r) => {
                    const elecUsage = Math.max(0, r.elecNew - r.elecOld);
                    const elecAmount = elecUsage * elecUnitPrice;
                    const waterUsage = Math.max(0, r.waterNew - r.waterOld);
                    const waterAmount = waterUsage * waterUnitPrice;
                    const totalEstimate = r.baseRent + elecAmount + waterAmount + r.trashFee + r.wifiFee + r.parkingFee;

                    return (
                      <tr key={r.roomId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-extrabold text-slate-900 text-sm">
                          {r.roomNumber}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-800">{r.tenantName}</div>
                          <div className="text-[11px] text-slate-400">{r.tenantPhone}</div>
                        </td>

                        {/* Điện */}
                        <td className="py-3 px-3 text-center bg-amber-50/30 border-l border-amber-100 font-mono font-medium text-slate-600">
                          {r.elecOld}
                        </td>
                        <td className="py-3 px-3 text-center bg-amber-50/30">
                          <input
                            type="number"
                            value={r.elecNew}
                            onChange={(e) => handleUpdateReading(r.roomId, 'elecNew', Number(e.target.value))}
                            className="w-20 px-2 py-1 bg-white border border-amber-300 rounded-lg text-center font-mono font-bold text-amber-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </td>
                        <td className="py-3 px-3 text-right bg-amber-50/30 font-bold font-mono text-amber-700">
                          {elecUsage} kWh
                        </td>
                        <td className="py-3 px-3 text-right bg-amber-50/30 font-bold text-slate-800 border-r border-amber-100">
                          {formatCurrency(elecAmount)}
                        </td>

                        {/* Nước */}
                        <td className="py-3 px-3 text-center bg-blue-50/30 font-mono font-medium text-slate-600">
                          {r.waterOld}
                        </td>
                        <td className="py-3 px-3 text-center bg-blue-50/30">
                          <input
                            type="number"
                            value={r.waterNew}
                            onChange={(e) => handleUpdateReading(r.roomId, 'waterNew', Number(e.target.value))}
                            className="w-16 px-2 py-1 bg-white border border-blue-300 rounded-lg text-center font-mono font-bold text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </td>
                        <td className="py-3 px-3 text-right bg-blue-50/30 font-bold font-mono text-blue-700">
                          {waterUsage} m³
                        </td>
                        <td className="py-3 px-3 text-right bg-blue-50/30 font-bold text-slate-800">
                          {formatCurrency(waterAmount)}
                        </td>

                        {/* Tổng Bill */}
                        <td className="py-3 px-3 text-right font-black text-sm text-emerald-700">
                          {formatCurrency(totalEstimate)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-500">
                * Sau khi chốt số, hệ thống sẽ tự động gộp tiền thuê phòng + tiền điện nước + các dịch vụ thành từng hóa đơn riêng cho từng phòng.
              </p>

              <Button
                onClick={() => setActiveTab('invoices')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md flex items-center gap-2"
              >
                <span>Xem các hóa đơn đã sinh tự động</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* TOÀN BỘ CÁC MODAL TRẢI NGHIỆM K23 PMS */}
      <BatchCreateRoomsModal
        isOpen={isBatchRoomsOpen}
        onClose={() => setIsBatchRoomsOpen(false)}
        building={{
          id: 'bld_1',
          name: 'Tòa Nhà Xanh Trọ Xinh',
          address: 'Số 12 Ngõ 68 Triều Khúc',
          district: 'Thanh Xuân',
          city: 'Hà Nội',
        }}
        owner={{
          id: 'user_owner_1',
          name: 'Chủ trọ Demo',
        }}
        onSuccess={async () => {
          alert('Khởi tạo phòng hàng loạt thành công!');
        }}
      />

      <TenantDocumentCabinetModal
        isOpen={isCabinetOpen}
        onClose={() => setIsCabinetOpen(false)}
        tenant={demoTenants[0]}
        contracts={demoContracts}
      />

      <ProrationCalculatorModal
        isOpen={isProrationOpen}
        onClose={() => setIsProrationOpen(false)}
        defaultMonthlyRent={4200000}
      />

      <RecordPaymentModal
        isOpen={isRecordPaymentOpen}
        onClose={() => setIsRecordPaymentOpen(false)}
        invoice={activeInvoice}
        onConfirm={async ({ paidNowAmount, paymentMethod }) => {
          const newPaid = activeInvoice.paid_amount + paidNowAmount;
          const newStatus = newPaid >= activeInvoice.total_amount ? 'paid' : 'partial';
          setInvoices((prev) =>
            prev.map((i) =>
              i.id === activeInvoice.id
                ? { ...i, paid_amount: newPaid, remaining: Math.max(0, i.total_amount - newPaid), status: newStatus as any, payment_method: paymentMethod }
                : i
            )
          );
        }}
      />

      <MoveOutSettlementModal
        isOpen={isSettlementOpen}
        onClose={() => setIsSettlementOpen(false)}
        contract={demoContracts[1]}
        onConfirmSettlement={async () => {
          // done
        }}
      />

      <IssueManagementModal
        isOpen={isIssuesOpen}
        onClose={() => setIsIssuesOpen(false)}
      />

      <ExpenseManagementModal
        isOpen={isExpenseOpen}
        onClose={() => setIsExpenseOpen(false)}
        totalRevenueCollected={totalCollected}
      />

      <WebhookSimulatorModal
        isOpen={isWebhookOpen}
        onClose={() => setIsWebhookOpen(false)}
        invoices={invoices}
        onSuccess={(invId) => {
          setInvoices((prev) =>
            prev.map((i) =>
              i.id === invId
                ? { ...i, status: 'paid' as any, paid_amount: i.total_amount, remaining: 0 }
                : i
            )
          );
        }}
      />

      <AuditLogModal
        isOpen={isAuditOpen}
        onClose={() => setIsAuditOpen(false)}
      />

      <StaffManagementModal
        isOpen={isStaffOpen}
        onClose={() => setIsStaffOpen(false)}
      />

      <TieredTariffConfigModal
        isOpen={isTieredTariffOpen}
        onClose={() => setIsTieredTariffOpen(false)}
      />

      <ParkingManagementModal
        isOpen={isParkingOpen}
        onClose={() => setIsParkingOpen(false)}
      />

      <ESignatureModal
        isOpen={isESignOpen}
        onClose={() => setIsESignOpen(false)}
        contract={demoContracts[0]}
      />

      <LateFeeConfigModal
        isOpen={isLateFeeOpen}
        onClose={() => setIsLateFeeOpen(false)}
      />
    </div>
  );
};
