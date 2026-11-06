// =====================================================================
// K23 PMS — PHASE 4: SIÊU HỆ SINH THÁI THÔNG MINH
// P3-06: Cổng Khai Báo Lưu Trú VNeID & Dịch Vụ Công Bộ Công An Types
// =====================================================================

export interface VneidTenantStayRecord {
  id: string;
  roomNumber: string;
  contractCode?: string;
  // Thông tin định danh cá nhân
  cccdNumber: string;       // 12 chữ số CCCD chuẩn Bộ Công An
  fullName: string;         // Họ và tên viết hoa
  dateOfBirth: string;      // DD/MM/YYYY
  gender: 'Nam' | 'Nữ';
  nationality: string;      // Mặc định: 'Việt Nam'
  ethnicity: string;        // Dân tộc: 'Kinh', ...
  permanentAddress: string; // Nơi thường trú trên CCCD
  phone: string;            // Số điện thoại liên hệ
  // Thông tin lưu trú tại tòa nhà
  stayAddress: string;      // Địa chỉ cơ sở lưu trú (nhà trọ)
  arrivalDate: string;      // Ngày bắt đầu đến ở
  expectedDepartureDate: string; // Ngày dự kiến rời đi (hết hạn HĐ)
  stayReason: 'Thuê nhà để ở' | 'Học tập' | 'Lao động' | 'Mục đích khác';
  status: 'valid' | 'missing_info' | 'submitted';
  validationErrors?: string[];
}

export interface VneidDeclarationExport {
  exportId: string;
  buildingName: string;
  buildingAddress: string;
  ward: string;
  district: string;
  city: string;
  landlordName: string;
  landlordPhone: string;
  landlordCccd: string;
  createdDate: string;
  totalRecords: number;
  records: VneidTenantStayRecord[];
}

export interface CccdValidationResult {
  isValid: boolean;
  provinceCode?: string;
  provinceName?: string;
  genderCentury?: string;
  birthYear?: number;
  error?: string;
}
