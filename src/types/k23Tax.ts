export interface TaxProfile {
  tax_code: string; // Mã số thuế (MST)
  business_name: string; // Tên hộ kinh doanh / Chủ nhà
  tax_office: string; // Chi cục thuế quản lý
  address: string;
  vat_rate: number; // Mặc định 0.05 (5% GTGT theo TT 40/2021/TT-BTC)
  pit_rate: number; // Mặc định 0.05 (5% TNCN theo TT 40/2021/TT-BTC)
  annual_revenue_threshold: number; // 100.000.000đ/năm
}

export interface QuarterlyTaxReport {
  quarter: 1 | 2 | 3 | 4;
  year: number;
  gross_rental_revenue: number; // Doanh thu tiền thuê nhà
  service_revenue: number; // Doanh thu điện, nước, dịch vụ khác
  total_revenue: number; // Tổng doanh thu
  is_taxable: boolean; // Doanh thu lũy kế vượt 100tr/năm
  vat_amount: number; // Thuế GTGT (5%)
  pit_amount: number; // Thuế TNCN (5%)
  total_tax_due: number; // Tổng thuế phải nộp
  invoice_count: number;
  room_count: number;
}

export const DEFAULT_TAX_PROFILE: TaxProfile = {
  tax_code: '0109887766-001',
  business_name: 'Hộ Kinh Doanh Nhà Trọ Xinh',
  tax_office: 'Chi cục Thuế Khu vực Thanh Xuân - Cầu Giấy',
  address: 'Số 12 Ngõ 68 Triều Khúc, Phường Thanh Xuân Nam, Hà Nội',
  vat_rate: 0.05,
  pit_rate: 0.05,
  annual_revenue_threshold: 100000000,
};

