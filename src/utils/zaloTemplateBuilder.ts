import { Invoice } from '../types/k23';
import { formatCurrency } from '../components/ui/Cards';

export type ZaloTemplateType = 'bill_announcement' | 'gentle_reminder' | 'overdue_warning';

export interface ZaloMessageData {
  tenantName: string;
  tenantPhone: string;
  roomNumber: string;
  billingMonth: number;
  billingYear: number;
  totalAmount: number;
  remainingAmount?: number;
  dueDate?: string;
  invoiceCode: string;
  notes?: string;
  elecUsage?: number;
  elecAmount?: number;
  waterUsage?: number;
  waterAmount?: number;
  bankName?: string;
  bankAccount?: string;
  accountHolder?: string;
}

export function extractZaloDataFromInvoice(invoice: Invoice): ZaloMessageData {
  let elecUsage = 0;
  let elecAmount = 0;
  let waterUsage = 0;
  let waterAmount = 0;

  if (invoice.items) {
    invoice.items.forEach((item) => {
      const desc = item.description.toLowerCase();
      if (desc.includes('điện')) {
        elecUsage += item.quantity;
        elecAmount += item.amount;
      } else if (desc.includes('nước')) {
        waterUsage += item.quantity;
        waterAmount += item.amount;
      }
    });
  }

  // Format hạn nộp
  let dueDateStr = 'ngày 10 hàng tháng';
  if (invoice.due_date) {
    try {
      const d = new Date(invoice.due_date);
      dueDateStr = `ngày ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
    } catch {
      dueDateStr = invoice.due_date;
    }
  }

  return {
    tenantName: invoice.tenant?.full_name || 'Quý khách',
    tenantPhone: invoice.tenant?.phone || '',
    roomNumber: invoice.room?.room_number || 'Phòng trọ',
    billingMonth: invoice.billing_month,
    billingYear: invoice.billing_year,
    totalAmount: invoice.total_amount,
    remainingAmount: invoice.remaining,
    dueDate: dueDateStr,
    invoiceCode: invoice.invoice_code,
    notes: invoice.notes || undefined,
    elecUsage,
    elecAmount,
    waterUsage,
    waterAmount,
    bankName: 'MBBank',
    bankAccount: '0388123456',
    accountHolder: 'TRAN QUOC TUAN',
  };
}

export function buildZaloMessage(type: ZaloTemplateType, data: ZaloMessageData): string {
  const currentUrl = typeof window !== 'undefined' ? window.location.origin : 'https://troxinhde-zeta.vercel.app';
  const billLink = `${currentUrl}/demo-hoa-don`;

  switch (type) {
    case 'bill_announcement':
      return `🏠 [TRỌ XINH] THÔNG BÁO TIỀN PHÒNG THÁNG ${data.billingMonth}/${data.billingYear}
Xin chào bạn ${data.tenantName} (${data.roomNumber}),
Chủ nhà xin gửi thông tin hóa đơn tiền phòng kỳ này:

💰 TỔNG CẦN THANH TOÁN: ${formatCurrency(data.remainingAmount ?? data.totalAmount)}
${data.elecUsage > 0 ? `⚡ Điện tiêu thụ: ${data.elecUsage} kWh (${formatCurrency(data.elecAmount)})\n` : ''}${data.waterUsage > 0 ? `💧 Nước sinh hoạt: ${data.waterUsage} m³ (${formatCurrency(data.waterAmount)})\n` : ''}📅 Hạn thanh toán: Trước ${data.dueDate}

💳 Quý khách vui lòng chuyển khoản quét mã VietQR tự động hoặc chuyển theo thông tin:
- Ngân hàng: ${data.bankName}
- Số tài khoản: ${data.bankAccount}
- Chủ tài khoản: ${data.accountHolder}
- Nội dung: TROXINH ${data.invoiceCode.replace(/[^a-zA-Z0-9]/g, '')}

👉 Xem chi tiết hóa đơn và mã QR tại: ${billLink}
Cảm ơn bạn đã luôn hợp tác! Chúc bạn tháng mới an vui.`;

    case 'gentle_reminder':
      return `⏰ [TRỌ XINH] NHẮC ĐÓNG TIỀN PHÒNG (${data.roomNumber})
Chào bạn ${data.tenantName},
Hóa đơn tiền phòng tháng ${data.billingMonth} của bạn sẽ đến hạn vào ${data.dueDate}.
Số tiền cần thanh toán: ${formatCurrency(data.remainingAmount ?? data.totalAmount)}.

Bạn nhớ sắp xếp thanh toán đúng hạn giúp chủ nhà nhé.
Nội dung chuyển khoản: TROXINH ${data.invoiceCode.replace(/[^a-zA-Z0-9]/g, '')}
Xem lại hóa đơn tại: ${billLink}
Cảm ơn bạn nhiều!`;

    case 'overdue_warning':
      return `⚠️ [CẢNH BÁO QUÁ HẠN] HÓA ĐƠN TIỀN PHÒNG ${data.roomNumber}
Kính gửi bạn ${data.tenantName},
Hóa đơn tiền phòng tháng ${data.billingMonth} (#${data.invoiceCode}) hiện đã QUÁ HẠN thanh toán.
Số tiền còn nợ: ${formatCurrency(data.remainingAmount ?? data.totalAmount)}.

Quý khách vui lòng hoàn tất thanh toán gấp trong ngày hôm nay để tránh bị phát sinh phí trễ hạn hoặc gián đoạn dịch vụ điện nước.
Nếu đã chuyển khoản, bạn vui lòng gửi lại biên lai cho chủ nhà nhé.
Xem hóa đơn & quét VietQR: ${billLink}`;

    default:
      return '';
  }
}

/**
 * Mở trực tiếp cuộc trò chuyện Zalo với số điện thoại khách thuê và copy tin nhắn vào clipboard
 */
export async function openZaloDeepLink(phone: string, message: string): Promise<boolean> {
  // 1. Copy tin nhắn vào clipboard
  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(message);
    } catch {
      // ignore
    }
  }

  // 2. Làm sạch số điện thoại (bỏ dấu cách, dấu chấm, đổi +84 thành 0)
  const cleanPhone = phone.replace(/\D/g, '').replace(/^84/, '0');

  // 3. Mở Zalo chat
  if (cleanPhone.length >= 9) {
    const zaloUrl = `https://zalo.me/${cleanPhone}`;
    window.open(zaloUrl, '_blank', 'noopener,noreferrer');
    return true;
  } else {
    // Nếu không có số điện thoại, chỉ copy vào clipboard
    alert('Đã sao chép nội dung tin nhắn vào bộ nhớ đệm! (Khách chưa có SĐT hợp lệ)');
    return false;
  }
}

