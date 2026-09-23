/**
 * Định nghĩa dữ liệu và bảng nhãn tiếng Việt cho hệ thống Báo cáo (Report System)
 */

/**
 * 1. Danh mục đối tượng báo cáo
 */
export type ReportTargetType = 'tin_dang' | 'nguoi_dung' | 'tin_nhan';

export const REPORT_TARGET_LABELS: Record<ReportTargetType, string> = {
  tin_dang: 'Tin đăng',
  nguoi_dung: 'Người dùng',
  tin_nhan: 'Tin nhắn',
};

/**
 * 2. Danh mục mã lý do báo cáo
 */
export type ReportReasonCode =
  | 'lua_dao'
  | 'hang_cam'
  | 'sai_mo_ta'
  | 'spam'
  | 'khong_phu_hop'
  | 'khac';

export const REPORT_REASON_LABELS: Record<ReportReasonCode, string> = {
  lua_dao: 'Lừa đảo',
  hang_cam: 'Hàng cấm',
  sai_mo_ta: 'Sai mô tả',
  spam: 'Spam',
  khong_phu_hop: 'Không phù hợp',
  khac: 'Khác',
};

/**
 * 3. Danh mục mã trạng thái báo cáo
 */
export type ReportStatusCode =
  | 'moi'
  | 'dang_xu_ly'
  | 'da_xu_ly'
  | 'bac_bo';

export const REPORT_STATUS_LABELS: Record<ReportStatusCode, string> = {
  moi: 'Mới',
  dang_xu_ly: 'Đang xử lý',
  da_xu_ly: 'Đã xử lý',
  bac_bo: 'Bác bỏ',
};

/**
 * Cấu trúc dữ liệu báo cáo
 */
export interface ReportRecord {
  id: string;
  reporter_id: string;
  target_type: ReportTargetType;
  target_id: string;
  target_owner_id?: string;
  reason: ReportReasonCode;
  description?: string;
  content_snapshot?: string;
  status: ReportStatusCode;
  admin_notes?: string;
  reporter_name?: string;
  reporter_phone?: string;
  created_at: string;
  updated_at?: string;
}
