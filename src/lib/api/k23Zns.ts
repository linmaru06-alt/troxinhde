// =====================================================================
// K23 PMS — PHASE 4: SIÊU HỆ SINH THÁI THÔNG MINH
// P3-02: Zalo ZNS Tự Động Qua Zalo OA Tích Xanh Trọ Xinh Service
// =====================================================================

import { K23ZnsPayload, K23ZnsMessage, ZnsTemplateType, ZNS_PRICING } from '../../types/k23Zns';
import { formatCurrency } from '../../components/ui/Cards';

const MOCK_ZNS_HISTORY: K23ZnsMessage[] = [
  {
    id: 'zns_hist_01',
    templateType: 'bill_notice',
    recipientPhone: '0988123456',
    recipientName: 'Lê Hoàng Nam',
    roomNumber: 'P.101',
    buildingName: 'Tòa Nhà Xanh Trọ Xinh',
    status: 'delivered',
    sentAt: '2026-11-05T08:30:00Z',
    deliveredAt: '2026-11-05T08:30:03Z',
    trackingId: 'ZNS_TRACK_98231',
    priceVnd: 250,
    previewContent: {
      oaName: ZNS_PRICING.OA_NAME,
      isVerified: true,
      title: 'THÔNG BÁO TIỀN PHÒNG THÁNG 11/2026',
      fields: [
        { label: 'Khách thuê', value: 'Lê Hoàng Nam' },
        { label: 'Phòng', value: 'P.101 - Tòa Nhà Xanh Trọ Xinh' },
        { label: 'Kỳ thanh toán', value: 'Tháng 11/2026' },
        { label: 'Tổng tiền', value: '3.620.000 đ' },
        { label: 'Hạn chót', value: '05/11/2026' },
      ],
      ctaButtons: [
        { label: 'Thanh toán VietQR 1-chạm', actionType: 'open_url', url: 'https://troxinh.vn/tra-cuu-phong' },
        { label: 'Xem chi tiết hóa đơn', actionType: 'open_url', url: 'https://troxinh.vn/tra-cuu-phong' },
      ],
    },
  },
];

/**
 * Tạo nội dung tin nhắn Zalo ZNS chuẩn từ dữ liệu hóa đơn
 */
export function buildZnsMessage(payload: K23ZnsPayload, templateType: ZnsTemplateType = 'bill_notice'): K23ZnsMessage {
  const titles: Record<ZnsTemplateType, string> = {
    bill_notice: `THÔNG BÁO TIỀN PHÒNG KỲ ${payload.billingMonth}`,
    payment_received: `XÁC NHẬN ĐÃ NHẬN TIỀN PHÒNG KỲ ${payload.billingMonth}`,
    debt_reminder: `NHẮC NHỞ QUÁ HẠN TIỀN PHÒNG KỲ ${payload.billingMonth}`,
    move_out_settlement: `BIÊN BẢN TẤT TOÁN TRẢ PHÒNG & HOÀN CỌC`,
  };

  const fields = [
    { label: 'Khách thuê', value: payload.tenantName },
    { label: 'Phòng trọ', value: `${payload.roomNumber} - ${payload.buildingName}` },
    { label: 'Kỳ thanh toán', value: payload.billingMonth },
    { label: 'Số tiền cần đóng', value: formatCurrency(payload.remainingAmount ?? payload.totalAmount) },
    { label: 'Hạn thanh toán', value: payload.dueDate },
    { label: 'Mã hóa đơn', value: payload.invoiceCode },
  ];

  return {
    id: `zns_${Date.now()}`,
    templateType,
    recipientPhone: payload.tenantPhone,
    recipientName: payload.tenantName,
    roomNumber: payload.roomNumber,
    buildingName: payload.buildingName,
    status: 'delivered',
    sentAt: new Date().toISOString(),
    deliveredAt: new Date().toISOString(),
    trackingId: `ZNS_TRACK_${Math.floor(100000 + Math.random() * 900000)}`,
    priceVnd: ZNS_PRICING.COST_PER_MESSAGE,
    previewContent: {
      oaName: ZNS_PRICING.OA_NAME,
      isVerified: true,
      title: titles[templateType],
      fields,
      ctaButtons: [
        { label: 'Thanh toán VietQR 1-chạm', actionType: 'open_url', url: payload.viewBillUrl },
        { label: 'Tra cứu hóa đơn', actionType: 'open_url', url: payload.viewBillUrl },
      ],
    },
  };
}

/**
 * Gửi tin nhắn ZNS qua Zalo OA tích xanh Trọ Xinh
 */
export async function sendZnsMessage(payload: K23ZnsPayload, templateType: ZnsTemplateType = 'bill_notice'): Promise<{ success: boolean; message: K23ZnsMessage; costVnd: number }> {
  // Giả lập độ trễ kết nối API Zalo Cloud Service (300ms)
  await new Promise((r) => setTimeout(r, 400));

  const message = buildZnsMessage(payload, templateType);
  MOCK_ZNS_HISTORY.unshift(message);

  return {
    success: true,
    message,
    costVnd: ZNS_PRICING.COST_PER_MESSAGE,
  };
}

/**
 * Lấy lịch sử gửi tin ZNS của chủ trọ
 */
export async function getZnsHistory(): Promise<K23ZnsMessage[]> {
  await new Promise((r) => setTimeout(r, 100));
  return [...MOCK_ZNS_HISTORY];
}
