/**
 * K23 PMS — Types cho quy trình Tất toán trả phòng, Kiểm kê thiết bị & Cấn trừ cọc
 * (P1-01: Move-Out Settlement & Asset Inventory)
 */

export interface RoomAssetItem {
  id: string;
  name: string; // VD: Điều hòa Daikin 9000BTU, Nóng lạnh Rossi, Tủ lạnh Mini 90L, Chìa khóa cửa...
  initialCondition: string; // Tình trạng khi bàn giao: "Mới 100%", "Hoạt động tốt"...
  returnCondition: 'good' | 'damaged' | 'missing'; // Tình trạng khi trả
  damageFee: number; // Phí phạt đền bù (VNĐ) nếu hỏng hoặc mất
  notes?: string;
}

export interface MoveOutSettlementCalculation {
  contractId: string;
  contractCode: string;
  roomId: string;
  roomNumber: string;
  tenantName: string;
  tenantPhone: string;
  moveOutDate: string;

  // Cọc ban đầu
  depositAmount: number;

  // Các khoản trừ
  accumulatedDebt: number; // Nợ cũ các tháng trước
  proratedRentFee: number; // Tiền phòng ngày lẻ đến ngày trả
  proratedElectricFee: number; // Tiền điện ngày lẻ
  proratedWaterFee: number; // Tiền nước ngày lẻ
  damageFee: number; // Tiền phạt hư hỏng thiết bị
  cleaningFee: number; // Phí dọn dẹp vệ sinh phòng
  otherDeduction: number; // Khấu trừ khác

  // Tổng trừ
  totalDeductions: number;

  // Hoàn cọc thực tế (Âm: Khách phải nộp thêm; Dương: Chủ trả lại khách)
  netRefundAmount: number;
}

