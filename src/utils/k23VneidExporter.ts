// =====================================================================
// K23 PMS — PHASE 4: SIÊU HỆ SINH THÁI THÔNG MINH
// P3-06: VNeID & Dịch Vụ Công Cư Trú Data Exporter & CCCD Validator
// =====================================================================

import { VneidTenantStayRecord, VneidDeclarationExport, CccdValidationResult } from '../types/k23Vneid';

const PROVINCE_CODES: Record<string, string> = {
  '001': 'Thành phố Hà Nội',
  '002': 'Tỉnh Hà Giang',
  '004': 'Tỉnh Cao Bằng',
  '006': 'Tỉnh Bắc Kạn',
  '008': 'Tỉnh Tuyên Quang',
  '010': 'Tỉnh Lào Cai',
  '011': 'Tỉnh Điện Biên',
  '012': 'Tỉnh Lai Châu',
  '014': 'Tỉnh Sơn La',
  '015': 'Tỉnh Yên Bái',
  '017': 'Tỉnh Hoà Bình',
  '019': 'Tỉnh Thái Nguyên',
  '020': 'Tỉnh Lạng Sơn',
  '022': 'Tỉnh Quảng Ninh',
  '024': 'Tỉnh Bắc Giang',
  '025': 'Tỉnh Phú Thọ',
  '026': 'Tỉnh Vĩnh Phúc',
  '027': 'Tỉnh Bắc Ninh',
  '030': 'Tỉnh Hải Dương',
  '031': 'Thành phố Hải Phòng',
  '033': 'Tỉnh Hưng Yên',
  '034': 'Tỉnh Thái Bình',
  '035': 'Tỉnh Hà Nam',
  '036': 'Tỉnh Nam Định',
  '037': 'Tỉnh Ninh Bình',
  '038': 'Tỉnh Thanh Hóa',
  '040': 'Tỉnh Nghệ An',
  '042': 'Tỉnh Hà Tĩnh',
  '044': 'Tỉnh Quảng Bình',
  '045': 'Tỉnh Quảng Trị',
  '046': 'Tỉnh Thừa Thiên Huế',
  '048': 'Thành phố Đà Nẵng',
  '049': 'Tỉnh Quảng Nam',
  '051': 'Tỉnh Quảng Ngãi',
  '052': 'Tỉnh Bình Định',
  '054': 'Tỉnh Phú Yên',
  '056': 'Tỉnh Khánh Hòa',
  '058': 'Tỉnh Ninh Thuận',
  '060': 'Tỉnh Bình Thuận',
  '062': 'Tỉnh Kon Tum',
  '064': 'Tỉnh Gia Lai',
  '066': 'Tỉnh Đắk Lắk',
  '067': 'Tỉnh Đắk Nông',
  '068': 'Tỉnh Lâm Đồng',
  '070': 'Tỉnh Bình Phước',
  '072': 'Tỉnh Tây Ninh',
  '074': 'Tỉnh Bình Dương',
  '075': 'Tỉnh Đồng Nai',
  '077': 'Tỉnh Bà Rịa - Vũng Tàu',
  '079': 'Thành phố Hồ Chí Minh',
  '080': 'Tỉnh Long An',
  '082': 'Tỉnh Tiền Giang',
  '083': 'Tỉnh Bến Tre',
  '084': 'Tỉnh Trà Vinh',
  '086': 'Tỉnh Vĩnh Long',
  '087': 'Tỉnh Đồng Tháp',
  '089': 'Tỉnh An Giang',
  '091': 'Tỉnh Kiên Giang',
  '092': 'Thành phố Cần Thơ',
  '093': 'Tỉnh Hậu Giang',
  '094': 'Tỉnh Sóc Trăng',
  '095': 'Tỉnh Bạc Liêu',
  '096': 'Tỉnh Cà Mau',
};

/**
 * Kiểm tra tính hợp lệ của Số Căn cước công dân (12 chữ số) theo thuật toán Bộ Công An
 */
export function validateCccdNumber(cccd: string): CccdValidationResult {
  if (!cccd) return { isValid: false, error: 'Chưa nhập số CCCD' };

  const clean = cccd.replace(/\D/g, '');
  if (clean.length !== 12) {
    return { isValid: false, error: `Số CCCD phải gồm đúng 12 chữ số (Hiện có: ${clean.length} số)` };
  }

  const provinceCode = clean.substring(0, 3);
  const provinceName = PROVINCE_CODES[provinceCode] || 'Mã tỉnh không xác định';

  const centuryGenderCode = clean.substring(3, 4);
  const yearCode = parseInt(clean.substring(4, 6), 10);

  let birthYear = 1900 + yearCode;
  let genderCentury = 'Nam thế kỷ 20';

  switch (centuryGenderCode) {
    case '0':
      birthYear = 1900 + yearCode;
      genderCentury = 'Nam (sinh thế kỷ 20: 1900-1999)';
      break;
    case '1':
      birthYear = 1900 + yearCode;
      genderCentury = 'Nữ (sinh thế kỷ 20: 1900-1999)';
      break;
    case '2':
      birthYear = 2000 + yearCode;
      genderCentury = 'Nam (sinh thế kỷ 21: 2000-2099)';
      break;
    case '3':
      birthYear = 2000 + yearCode;
      genderCentury = 'Nữ (sinh thế kỷ 21: 2000-2099)';
      break;
    default:
      genderCentury = 'Mã thế kỷ/giới tính đặc thù';
  }

  return {
    isValid: true,
    provinceCode,
    provinceName,
    genderCentury,
    birthYear,
  };
}

/**
 * Xuất dữ liệu khai báo lưu trú theo chuẩn XML của Cổng Dịch vụ công Quản lý Cư trú
 */
export function generateVneidXmlContent(data: VneidDeclarationExport): string {
  const sanitize = (str: string) =>
    (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

  const recordsXml = data.records
    .map(
      (r, idx) => `    <NguoiLuuTru stt="${idx + 1}">
      <SoDinhDanh>${sanitize(r.cccdNumber)}</SoDinhDanh>
      <HoVaTen>${sanitize(r.fullName.toUpperCase())}</HoVaTen>
      <NgaySinh>${sanitize(r.dateOfBirth)}</NgaySinh>
      <GioiTinh>${sanitize(r.gender)}</GioiTinh>
      <QuocTich>${sanitize(r.nationality || 'Việt Nam')}</QuocTich>
      <DanToc>${sanitize(r.ethnicity || 'Kinh')}</DanToc>
      <NoiThuongTru>${sanitize(r.permanentAddress)}</NoiThuongTru>
      <SoDienThoai>${sanitize(r.phone)}</SoDienThoai>
      <PhongO>${sanitize(r.roomNumber)}</PhongO>
      <NgayDen>${sanitize(r.arrivalDate)}</NgayDen>
      <NgayDuKienDi>${sanitize(r.expectedDepartureDate)}</NgayDuKienDi>
      <LyDoLuuTru>${sanitize(r.stayReason)}</LyDoLuuTru>
    </NguoiLuuTru>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<HoSoKhaiBaoLuuTru xmlns="http://dvc.dancuquocgia.gov.vn/schema/luutru" phienBan="2.0">
  <ThongTinCoSo>
    <TenCoSo>${sanitize(data.buildingName)}</TenCoSo>
    <DiaChi>${sanitize(data.buildingAddress)}</DiaChi>
    <PhuongXa>${sanitize(data.ward)}</PhuongXa>
    <QuanHuyen>${sanitize(data.district)}</QuanHuyen>
    <TinhThanhPho>${sanitize(data.city)}</TinhThanhPho>
    <ChuCoSo>${sanitize(data.landlordName)}</ChuCoSo>
    <SdtChuCoSo>${sanitize(data.landlordPhone)}</SdtChuCoSo>
    <CccdChuCoSo>${sanitize(data.landlordCccd)}</CccdChuCoSo>
    <NgayXuatDuLieu>${sanitize(data.createdDate)}</NgayXuatDuLieu>
    <TongSoNguoi>${data.totalRecords}</TongSoNguoi>
  </ThongTinCoSo>
  <DanhSachNguoiLuuTru>
${recordsXml}
  </DanhSachNguoiLuuTru>
</HoSoKhaiBaoLuuTru>`;
}

/**
 * Xuất dữ liệu JSON nộp API Cổng dịch vụ công
 */
export function generateVneidJsonContent(data: VneidDeclarationExport): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Xuất bảng kê CSV tương thích Excel
 */
export function generateVneidCsvContent(data: VneidDeclarationExport): string {
  const headers = [
    'STT',
    'Phòng',
    'Số CCCD (12 số)',
    'Họ và tên',
    'Ngày sinh',
    'Giới tính',
    'Nơi thường trú',
    'Số điện thoại',
    'Ngày đến',
    'Dự kiến rời đi',
    'Lý do lưu trú',
    'Địa chỉ nhà trọ',
  ];

  const rows = data.records.map((r, i) => [
    i + 1,
    `"${r.roomNumber}"`,
    `"${r.cccdNumber}"`,
    `"${r.fullName.toUpperCase()}"`,
    `"${r.dateOfBirth}"`,
    `"${r.gender}"`,
    `"${r.permanentAddress.replace(/"/g, '""')}"`,
    `"${r.phone}"`,
    `"${r.arrivalDate}"`,
    `"${r.expectedDepartureDate}"`,
    `"${r.stayReason}"`,
    `"${data.buildingAddress.replace(/"/g, '""')}"`,
  ]);

  return '\uFEFF' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
}

/**
 * Tải file dữ liệu khai báo lưu trú về máy người dùng
 */
export function downloadVneidExportFile(
  content: string,
  filename: string,
  mimeType: string = 'application/xml'
): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
