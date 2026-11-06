// =====================================================================
// K23 PMS — PHASE 4: SIÊU HỆ SINH THÁI THÔNG MINH
// P3-02: Zalo ZNS Tự Động Qua Zalo OA Tích Xanh Trọ Xinh
// =====================================================================

export type ZnsTemplateType =
  | 'bill_notice'          // Thông báo tiền phòng hàng tháng
  | 'payment_received'     // Xác nhận đã nhận tiền phòng (Gạch nợ)
  | 'debt_reminder'        // Nhắc nợ tiền phòng quá hạn
  | 'move_out_settlement'; // Quyết toán trả phòng & hoàn cọc

export type ZnsDeliveryStatus = 'sending' | 'delivered' | 'read' | 'failed';

export interface K23ZnsPayload {
  tenantName: string;
  tenantPhone: string;
  roomNumber: string;
  buildingName: string;
  billingMonth: string;
  totalAmount: number;
  remainingAmount?: number;
  dueDate: string;
  bankName?: string;
  bankAccount?: string;
  accountHolder?: string;
  invoiceCode: string;
  viewBillUrl: string;
}

export interface K23ZnsMessage {
  id: string;
  templateType: ZnsTemplateType;
  recipientPhone: string;
  recipientName: string;
  roomNumber: string;
  buildingName: string;
  status: ZnsDeliveryStatus;
  sentAt: string;
  deliveredAt?: string;
  trackingId: string;
  priceVnd: number; // Đơn giá tiêu chuẩn: 250đ/tin
  previewContent: {
    oaName: string;
    isVerified: boolean; // Tích xanh Zalo Official Account
    title: string;
    fields: Array<{ label: string; value: string }>;
    ctaButtons: Array<{ label: string; actionType: 'open_url' | 'copy_qr'; url?: string }>;
  };
}

export const ZNS_PRICING = {
  COST_PER_MESSAGE: 250, // 250 VNĐ / tin ZNS tích xanh
  OA_NAME: 'Trọ Xinh Việt Nam',
  OA_AVATAR: '/images/mascot.png',
  VERIFIED_BADGE: true,
};
