// =====================================================================
// K23 PMS — PHASE 4: SIÊU HỆ SINH THÁI THÔNG MINH
// P3-05: K23 Mobile PWA & Offline Sync Engine Types
// =====================================================================

export type OfflineOperationType =
  | 'meter_reading'     // Chốt số điện nước dưới tầng hầm
  | 'record_payment'    // Thu tiền mặt tại cửa phòng
  | 'report_issue'      // Ghi nhận hỏng hóc thiết bị
  | 'check_in_tenant';  // Đón khách thuê vào phòng mới

export interface OfflineQueueItem {
  id: string;
  operationType: OfflineOperationType;
  entityId: string; // roomId, invoiceId, issueId
  payload: Record<string, any>;
  createdAt: string;
  syncedAt?: string;
  retryCount: number;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  errorMessage?: string;
}

export interface CccdQrParsedData {
  cccdNumber: string;    // 12 chữ số căn cước công dân
  oldCmndNumber?: string;// 9 chữ số CMND cũ (nếu có)
  fullName: string;      // Họ và tên viết hoa có dấu
  dateOfBirth: string;   // DD/MM/YYYY
  gender: 'Nam' | 'Nữ';  // Giới tính
  permanentAddress: string; // Nơi thường trú
  issueDate?: string;    // Ngày cấp thẻ
}

export interface MobileOfflineState {
  isOnline: boolean;
  pendingQueueCount: number;
  lastSyncedAt: string | null;
}
