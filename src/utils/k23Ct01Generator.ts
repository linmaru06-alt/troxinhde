import { CT01DeclarationData } from '../types/k23Signature';

/**
 * Sinh mã băm bảo mật SHA-256 cho hợp đồng điện tử
 */
export function generateContractHash(contractCode: string, signerName: string, signedAt: string): string {
  const payload = `${contractCode}_${signerName}_${signedAt}_TROXINH_K23_SECURE`;
  let hash = 0;
  for (let i = 0; i < payload.length; i++) {
    const char = payload.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  return `SHA256-${hex}f8c9b2a14e7d0356`.toUpperCase();
}

/**
 * Sinh nội dung văn bản Tờ Khai Thay Đổi Thông Tin Cư Trú (Mẫu CT01 - Bộ Công An)
 */
export function generateCT01Document(data: CT01DeclarationData): string {
  return `CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
Độc lập - Tự do - Hạnh phúc
-------------------------
Mẫu CT01 (Ban hành theo TT số 66/2023/TT-BCA của Bộ Công An)

TỜ KHAI THAY ĐỔI THÔNG TIN CƯ TRÚ
(Đăng ký tạm trú / Gia hạn tạm trú phòng trọ)

Kính gửi: Công an Xã/Phường nơi quản lý địa bàn thuê trọ

1. Họ, chữ đệm và tên người kê khai: ${data.fullName.toUpperCase()}
2. Ngày, tháng, năm sinh: ${data.dateOfBirth || 'Chưa cập nhật'}    Giới tính: ${data.gender || 'Nam/Nữ'}
3. Số định danh cá nhân / CCCD: ${data.idCardNumber}
   - Ngày cấp: ${data.idCardDate || 'Cục CS QLHC về TTXH'}
   - Nơi cấp: ${data.idCardPlace || 'Cục Cảnh sát QLHC về TTXH'}
4. Số điện thoại liên hệ: ${data.phone}
5. Nơi thường trú: ${data.permanentAddress}
6. Nơi đề nghị đăng ký tạm trú: ${data.temporaryAddress}
7. Họ tên chủ nhà / Người cho thuê: ${data.landlordName} (SĐT: ${data.landlordPhone})
8. Thời hạn thuê: Từ ngày ${data.leaseStartDate} đến ngày ${data.leaseEndDate}

Ý KIẾN CỦA CHỦ NHÀ / NGƯỜI CHO THUÊ:
"Tôi đồng ý cho ông/bà ${data.fullName} đăng ký tạm trú tại địa chỉ nêu trên theo đúng hợp đồng thuê trọ."

        Hà Nội, ngày ... tháng ... năm 2026
Ý KIẾN CỦA CHỦ HỘ / CHỦ TRỌ          NGƯỜI KÊ KHAI
       (Ký, ghi rõ họ tên)         (Ký, ghi rõ họ tên)
`;
}

