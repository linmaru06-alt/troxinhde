import { TaxProfile, QuarterlyTaxReport, DEFAULT_TAX_PROFILE } from '../types/k23Tax';
import { Invoice } from '../types/k23';

/**
 * Tính toán thuế cho thuê tài sản theo Thông tư 40/2021/TT-BTC
 */
export function calculateQuarterlyTax(
  invoices: Invoice[],
  quarter: 1 | 2 | 3 | 4 = 4,
  year: number = 2026,
  profile: TaxProfile = DEFAULT_TAX_PROFILE
): QuarterlyTaxReport {
  let grossRental = 0;
  let grossService = 0;
  const roomSet = new Set<string>();

  for (const inv of invoices) {
    if (inv.room?.id) roomSet.add(inv.room.id);

    if (inv.items && inv.items.length > 0) {
      for (const item of inv.items) {
        if (item.item_type === 'rent') {
          grossRental += item.amount;
        } else {
          grossService += item.amount;
        }
      }
    } else {
      // Nếu không có items chi tiết, mặc định 85% tiền phòng, 15% điện nước
      grossRental += Math.round(inv.total_amount * 0.85);
      grossService += Math.round(inv.total_amount * 0.15);
    }
  }

  const totalRevenue = grossRental + grossService;
  // Giả định doanh thu năm của chủ chuỗi vượt ngưỡng 100.000.000đ/năm
  const isTaxable = totalRevenue * 4 >= profile.annual_revenue_threshold || totalRevenue >= 25000000;

  // Thuế GTGT 5% và Thuế TNCN 5% trên doanh thu cho thuê tài sản
  const vatAmount = isTaxable ? Math.round(grossRental * profile.vat_rate) : 0;
  const pitAmount = isTaxable ? Math.round(grossRental * profile.pit_rate) : 0;
  const totalTaxDue = vatAmount + pitAmount;

  return {
    quarter,
    year,
    gross_rental_revenue: grossRental,
    service_revenue: grossService,
    total_revenue: totalRevenue,
    is_taxable: isTaxable,
    vat_amount: vatAmount,
    pit_amount: pitAmount,
    total_tax_due: totalTaxDue,
    invoice_count: invoices.length,
    room_count: roomSet.size || 3,
  };
}

/**
 * Sinh văn bản Tờ Khai Doanh Thu & Thuế Cho Thuê Nhà (Mẫu 01/TTS - Tổng Cục Thuế)
 */
export function generateTaxDeclarationText(report: QuarterlyTaxReport, profile: TaxProfile): string {
  return `CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc
-------------------------
BẢNG KÊ KHAI DOANH THU & NGHĨA VỤ THUẾ CHO THUÊ NHÀ
(Theo Thông tư số 40/2021/TT-BTC của Bộ Tài Chính)

Kỳ tính thuế: Quý ${report.quarter} / Năm ${report.year}
Cơ quan thuế quản lý: ${profile.tax_office}

I. THÔNG TIN NGƯỜI NỘP THUẾ:
1. Tên người nộp thuế / Hộ kinh doanh: ${profile.business_name.toUpperCase()}
2. Mã số thuế: ${profile.tax_code}
3. Địa chỉ kinh doanh / Cho thuê: ${profile.address}

II. DOANH THU KÊ KHAI TRONG QUÝ:
1. Doanh thu tiền thuê nhà chịu thuế: ${report.gross_rental_revenue.toLocaleString('vi-VN')} VNĐ
2. Doanh thu dịch vụ sinh hoạt (thu hộ chi hộ): ${report.service_revenue.toLocaleString('vi-VN')} VNĐ
=> TỔNG DOANH THU THỰC TẾ: ${report.total_revenue.toLocaleString('vi-VN')} VNĐ
- Tình trạng chịu thuế: ${report.is_taxable ? 'THUỘC DIỆN NỘP THUẾ (Doanh thu > 100tr/năm)' : 'MIỄN THUẾ (Doanh thu <= 100tr/năm)'}

III. NGHĨA VỤ THUẾ PHẢI NỘP:
1. Thuế Giá Trị Gia Tăng (GTGT) [Tỷ lệ 5%]: ${report.vat_amount.toLocaleString('vi-VN')} VNĐ
2. Thuế Thu Nhập Cá Nhân (TNCN) [Tỷ lệ 5%]: ${report.pit_amount.toLocaleString('vi-VN')} VNĐ
----------------------------------------------------------------------
TỔNG SỐ TIỀN THUẾ PHẢI NỘP VÀO NGÂN SÁCH NHÀ NƯỚC:
👉 ${report.total_tax_due.toLocaleString('vi-VN')} VNĐ (Mười phần trăm doanh thu thuê)

Tôi cam đoan số liệu kê khai trên là hoàn toàn trung thực và đúng với thực tế hoạt động kinh doanh.

        Hà Nội, ngày ... tháng ... năm 2026
             NGƯỜI KÊ KHAI NỘP THUẾ
             (Ký, ghi rõ họ tên)
`;
}

