/**
 * K23 PMS — Tiện ích tính tiền lẻ theo ngày khi vào / ra giữa kỳ
 * (P0-05: Proration Billing / Move-in date anchor billing cycles)
 * Nguồn tham khảo tinh hoa: RenterManagement & rentflow
 */

export interface ProrationCalculationResult {
  monthlyRent: number;
  startDate: string;
  endDate: string;
  totalDaysInMonth: number;
  actualStayDays: number;
  dailyRate: number;
  proratedRent: number;
  formulaDescription: string;
}

/**
 * Lấy số ngày trong một tháng cụ thể của năm
 */
export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Tính tiền phòng chia theo ngày thực ở khi vào hoặc ra giữa kỳ
 * @param monthlyRent Giá thuê 1 tháng (VNĐ)
 * @param startDate Ngày bắt đầu tính (YYYY-MM-DD hoặc Date)
 * @param endDate Ngày kết thúc (YYYY-MM-DD hoặc Date)
 */
export function calculateProratedRent(
  monthlyRent: number,
  startDateInput: string | Date,
  endDateInput: string | Date
): ProrationCalculationResult {
  const start = new Date(startDateInput);
  const end = new Date(endDateInput);

  // Đưa về 00:00:00 để tính số ngày tròn
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  const diffTime = end.getTime() - start.getTime();
  const actualStayDays = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1);

  // Lấy số ngày của tháng bắt đầu
  const year = start.getFullYear();
  const month = start.getMonth() + 1; // 1-12
  const totalDaysInMonth = getDaysInMonth(year, month);

  // Đơn giá mỗi ngày
  const dailyRate = Math.round(monthlyRent / totalDaysInMonth);

  // Tổng tiền làm tròn đến hàng nghìn
  const rawProrated = Math.round((monthlyRent / totalDaysInMonth) * actualStayDays);
  const proratedRent = Math.round(rawProrated / 1000) * 1000;

  const startStr = `${String(start.getDate()).padStart(2, '0')}/${String(start.getMonth() + 1).padStart(2, '0')}/${start.getFullYear()}`;
  const endStr = `${String(end.getDate()).padStart(2, '0')}/${String(end.getMonth() + 1).padStart(2, '0')}/${end.getFullYear()}`;

  const formulaDescription = `${actualStayDays} ngày ở (${startStr} → ${endStr}) × ${dailyRate.toLocaleString('vi-VN')} đ/ngày (Tháng ${month} có ${totalDaysInMonth} ngày)`;

  return {
    monthlyRent,
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
    totalDaysInMonth,
    actualStayDays,
    dailyRate,
    proratedRent,
    formulaDescription,
  };
}

/**
 * Tự động tính tiền kỳ đầu khi khách vào ở giữa tháng đến hết tháng
 */
export function calculateMoveInProration(monthlyRent: number, moveInDateStr: string): ProrationCalculationResult {
  const moveIn = new Date(moveInDateStr);
  const year = moveIn.getFullYear();
  const month = moveIn.getMonth() + 1;
  const daysInMonth = getDaysInMonth(year, month);
  const lastDayOfMonth = new Date(year, month - 1, daysInMonth);

  return calculateProratedRent(monthlyRent, moveIn, lastDayOfMonth);
}

/**
 * Tự động tính tiền kỳ cuối khi khách dọn ra giữa tháng
 */
export function calculateMoveOutProration(monthlyRent: number, moveOutDateStr: string): ProrationCalculationResult {
  const moveOut = new Date(moveOutDateStr);
  const year = moveOut.getFullYear();
  const month = moveOut.getMonth(); // 0-11
  const firstDayOfMonth = new Date(year, month, 1);

  return calculateProratedRent(monthlyRent, firstDayOfMonth, moveOut);
}

