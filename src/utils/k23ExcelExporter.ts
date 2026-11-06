import * as XLSX from 'xlsx';
import { Invoice } from '../types/k23';
import { K23Contract, K23Tenant } from '../types/k23Tenants';

export interface FinanceExportData {
  month: number;
  year: number;
  buildingName?: string;
  invoices: Invoice[];
  contracts?: K23Contract[];
  tenants?: K23Tenant[];
  expenses?: Array<{
    date: string;
    category: string;
    title: string;
    amount: number;
    notes?: string;
  }>;
}

/**
 * P1-02: Xuất Báo Cáo Doanh Thu, Công Nợ & Danh Bạ Ra File Excel (.xlsx) 4 Sheet Chuẩn Mực
 */
export function exportK23FinanceToExcel(data: FinanceExportData, customFileName?: string) {
  const wb = XLSX.utils.book_new();

  // 1. SHEET 1: TỔNG QUAN KỲ TÍNH
  const totalAmount = data.invoices.reduce((s, i) => s + (i.total_amount || 0), 0);
  const paidAmount = data.invoices.reduce((s, i) => s + (i.paid_amount || 0), 0);
  const debtAmount = Math.max(0, totalAmount - paidAmount);
  const paidCount = data.invoices.filter((i) => i.status === 'paid').length;
  const collectionRate = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0;

  const summaryRows = [
    { 'Chỉ số tài chính': 'Kỳ báo cáo', 'Giá trị': `Tháng ${data.month}/${data.year}` },
    { 'Chỉ số tài chính': 'Tòa nhà / Cơ sở', 'Giá trị': data.buildingName || 'Tất cả cơ sở' },
    { 'Chỉ số tài chính': 'Tổng số hóa đơn phát hành', 'Giá trị': `${data.invoices.length} phòng` },
    { 'Chỉ số tài chính': 'Số phòng đã nộp đủ 100%', 'Giá trị': `${paidCount} phòng` },
    { 'Chỉ số tài chính': 'Tỷ lệ thu hồi tiền phòng', 'Giá trị': `${collectionRate}%` },
    { 'Chỉ số tài chính': 'TỔNG DOANH THU PHÁT HÀNH (VNĐ)', 'Giá trị': totalAmount },
    { 'Chỉ số tài chính': 'TỔNG TIỀN THỰC THU VỀ TÚI (VNĐ)', 'Giá trị': paidAmount },
    { 'Chỉ số tài chính': 'TỔNG CÔNG NỢ CÒN THIẾU (VNĐ)', 'Giá trị': debtAmount },
  ];

  const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
  wsSummary['!cols'] = [{ wch: 35 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, '1. Tổng quan dòng tiền');

  // 2. SHEET 2: CHI TIẾT TỪNG PHÒNG
  const invoiceRows = data.invoices.map((inv) => {
    const roomNumber = inv.room?.room_number || inv.room?.title || 'Phòng';
    const rentItem = inv.items?.find((it) => it.item_type === 'rent')?.amount || 0;
    const electricItem = inv.items?.find((it) => it.description.toLowerCase().includes('điện'))?.amount || 0;
    const waterItem = inv.items?.find((it) => it.description.toLowerCase().includes('nước'))?.amount || 0;
    const serviceItem = (inv.total_amount || 0) - rentItem - electricItem - waterItem;
    const debt = Math.max(0, (inv.total_amount || 0) - (inv.paid_amount || 0));

    let statusText = 'Chưa nộp';
    if (inv.status === 'paid') statusText = 'Đã nộp đủ';
    else if (inv.status === 'partial') statusText = 'Nộp một phần (Còn nợ)';
    else if (inv.status === 'overdue') statusText = 'Quá hạn';

    return {
      'Mã hóa đơn': inv.invoice_code,
      'Số phòng': roomNumber,
      'Khách thuê': inv.tenant?.full_name || 'Khách thuê',
      'SĐT': inv.tenant?.phone || '',
      'Tiền phòng (đ)': rentItem > 0 ? rentItem : inv.total_amount,
      'Tiền điện (đ)': electricItem,
      'Tiền nước (đ)': waterItem,
      'Dịch vụ khác (đ)': Math.max(0, serviceItem),
      'TỔNG PHẢI THU (đ)': inv.total_amount,
      'ĐÃ THU (đ)': inv.paid_amount,
      'CÒN NỢ (đ)': debt,
      'Trạng thái': statusText,
      'Phương thức': inv.payment_method || 'VietQR',
      'Hạn thanh toán': inv.due_date || '',
    };
  });

  const wsInvoices = XLSX.utils.json_to_sheet(invoiceRows);
  wsInvoices['!cols'] = [
    { wch: 16 }, { wch: 12 }, { wch: 22 }, { wch: 14 },
    { wch: 15 }, { wch: 14 }, { wch: 14 }, { wch: 16 },
    { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 22 }, { wch: 18 }, { wch: 14 }
  ];
  XLSX.utils.book_append_sheet(wb, wsInvoices, '2. Danh sách thu tiền');

  // 3. SHEET 3: SỔ KHÁCH THUÊ & CCCD
  if (data.tenants && data.tenants.length > 0) {
    const tenantRows = data.tenants.map((t) => {
      const matchContract = data.contracts?.find((c) => c.tenant_id === t.id);
      return {
        'Họ và tên': t.full_name,
        'Số điện thoại': t.phone,
        'Số CCCD / CMND': t.id_card_number || 'Chưa cập nhật',
        'Ngày cấp': t.id_card_date || '',
        'Nơi cấp': t.id_card_place || 'Cục CS QLHC về TTXH',
        'Quê quán': t.hometown || '',
        'Biển số xe': t.vehicle_plate || '',
        'Phòng đang ở': matchContract?.room?.room_number || '—',
        'Tiền cọc giữ (đ)': matchContract?.deposit_amount || 0,
        'Thời hạn hợp đồng': matchContract ? `${matchContract.start_date} đến ${matchContract.end_date}` : '—',
        'Ghi chú': t.notes || '',
      };
    });

    const wsTenants = XLSX.utils.json_to_sheet(tenantRows);
    wsTenants['!cols'] = [
      { wch: 22 }, { wch: 15 }, { wch: 18 }, { wch: 12 },
      { wch: 22 }, { wch: 16 }, { wch: 15 }, { wch: 14 },
      { wch: 16 }, { wch: 25 }, { wch: 30 }
    ];
    XLSX.utils.book_append_sheet(wb, wsTenants, '3. Sổ quản lý khách CCCD');
  }

  // 4. SHEET 4: CHI PHÍ VẬN HÀNH (NẾU CÓ)
  if (data.expenses && data.expenses.length > 0) {
    const expenseRows = data.expenses.map((e) => ({
      'Ngày chi': e.date,
      'Danh mục': e.category,
      'Nội dung chi': e.title,
      'Số tiền chi (đ)': e.amount,
      'Ghi chú': e.notes || '',
    }));
    const wsExpenses = XLSX.utils.json_to_sheet(expenseRows);
    wsExpenses['!cols'] = [{ wch: 14 }, { wch: 18 }, { wch: 30 }, { wch: 18 }, { wch: 25 }];
    XLSX.utils.book_append_sheet(wb, wsExpenses, '4. Chi phí vận hành');
  }

  const defaultName = `TroXinh_K23_BaoCao_T${data.month}_${data.year}.xlsx`;
  const fileName = customFileName || defaultName;

  XLSX.writeFile(wb, fileName);
  return true;
}

