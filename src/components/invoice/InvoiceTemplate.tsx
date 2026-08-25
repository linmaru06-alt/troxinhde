import React from 'react';

export interface InvoiceProps {
  // Order Info
  orderCode: string;
  orderDate: string;
  orderTime?: string;
  paymentMethod: string;

  // Buyer Info
  buyerName: string;
  buyerPhone: string;
  buyerEmail?: string;

  // Service Details
  planName: string;
  planDescription: string;
  planDuration: string;
  startDate: string;
  endDate: string;
  unitPrice: number;
  vatRate: number;
  vatAmount: number;
  totalAmount: number;
  amountInWords?: string;

  // Seller Info (Fixed Trọ Xinh)
  sellerName?: string;
  sellerAddress?: string;
  sellerPhone?: string;
  sellerEmail?: string;
  sellerBank?: string;
}

export const InvoiceTemplate: React.FC<InvoiceProps> = ({
  orderCode,
  orderDate,
  orderTime = '12:00:00',
  paymentMethod,
  buyerName,
  buyerPhone,
  buyerEmail = 'khachhang@troxinh.vn',
  planName,
  planDescription,
  planDuration,
  startDate,
  endDate,
  unitPrice,
  vatRate,
  vatAmount,
  totalAmount,
  amountInWords,
  sellerName = 'Nguyễn Vũ Chính',
  sellerAddress = 'Số 18 Ngõ 167 Tây Sơn, P. Quang Trung, Q. Đống Đa, TP. Hà Nội',
  sellerPhone = '0888 110 789',
  sellerEmail = 'nguyenvuchinhb1hhb@gmail.com',
  sellerBank = 'Techcombank (Ngân hàng TMCP Kỹ Thương Việt Nam) — STK: 0888110789 (NGUYEN VU CHINH)',
}) => {
  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN').format(Math.round(num)) + ' đ';
  };

  return (
    <div
      style={{
        width: '794px',
        minHeight: '1123px',
        padding: '40px 48px',
        backgroundColor: '#ffffff',
        fontFamily: "'Be Vietnam Pro', Arial, Helvetica, sans-serif",
        fontSize: '12px',
        color: '#1f2937',
        lineHeight: 1.5,
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingBottom: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img
            src="/images/logo.png"
            alt="Trọ Xinh Logo"
            style={{ width: '48px', height: '48px', borderRadius: '12px', objectFit: 'cover' }}
          />
          <div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: '#006d37', letterSpacing: '-0.5px' }}>
              Trọ Xinh
            </div>
            <div style={{ fontSize: '11px', color: '#6b7280', fontWeight: 500 }}>
              Nền Tảng Tìm & Quản Lý Phòng Trọ Đã Kiểm Duyệt (TroXinh.vn)
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#006d37', textTransform: 'uppercase' }}>
            BIÊN LAI THANH TOÁN
          </div>
          <div style={{ fontSize: '11px', color: '#4b5563', marginTop: '2px' }}>
            Mã giao dịch: <strong style={{ color: '#111827', fontFamily: 'monospace' }}>#{orderCode}</strong>
          </div>
          <div style={{ fontSize: '10px', color: '#9ca3af' }}>
            Ngày lập: {orderDate} {orderTime ? `lúc ${orderTime}` : ''}
          </div>
        </div>
      </div>

      {/* Green Divider */}
      <div style={{ height: '3px', backgroundColor: '#006d37', marginBottom: '20px', borderRadius: '2px' }} />

      {/* 2-Column: BÊN BÁN & BÊN MUA */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '20px',
          marginBottom: '20px',
        }}
      >
        {/* Bên Bán */}
        <div
          style={{
            backgroundColor: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '14px 16px',
          }}
        >
          <div
            style={{
              display: 'inline-block',
              backgroundColor: '#006d37',
              color: '#ffffff',
              fontSize: '10px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '4px',
              textTransform: 'uppercase',
              marginBottom: '8px',
            }}
          >
            ĐƠN VỊ CUNG CẤP (BÊN BÁN)
          </div>
          <div style={{ fontSize: '11px', lineHeight: 1.6, color: '#374151' }}>
            <div><strong>Người đại diện:</strong> {sellerName}</div>
            <div><strong>Địa chỉ:</strong> {sellerAddress}</div>
            <div><strong>Hotline:</strong> {sellerPhone}</div>
            <div><strong>Email:</strong> {sellerEmail}</div>
            <div><strong>Tài khoản:</strong> {sellerBank}</div>
          </div>
        </div>

        {/* Bên Mua */}
        <div
          style={{
            backgroundColor: '#f9fafb',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '14px 16px',
          }}
        >
          <div
            style={{
              display: 'inline-block',
              backgroundColor: '#006d37',
              color: '#ffffff',
              fontSize: '10px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '4px',
              textTransform: 'uppercase',
              marginBottom: '8px',
            }}
          >
            KHÁCH HÀNG (BÊN MUA)
          </div>
          <div style={{ fontSize: '11px', lineHeight: 1.6, color: '#374151' }}>
            <div><strong>Họ và tên:</strong> {buyerName}</div>
            <div><strong>Số điện thoại:</strong> {buyerPhone}</div>
            <div><strong>Email:</strong> {buyerEmail}</div>
            <div><strong>Vai trò:</strong> Đối Tác Chủ Trọ TroXinh</div>
            <div><strong>Hình thức:</strong> Kích hoạt dịch vụ trực tuyến</div>
          </div>
        </div>
      </div>

      {/* Chi Tiết Dịch Vụ */}
      <div style={{ marginBottom: '20px' }}>
        <div
          style={{
            display: 'inline-block',
            backgroundColor: '#006d37',
            color: '#ffffff',
            fontSize: '10px',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: '4px',
            textTransform: 'uppercase',
            marginBottom: '8px',
          }}
        >
          CHI TIẾT DỊCH VỤ THANH TOÁN
        </div>

        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '11px',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            overflow: 'hidden',
          }}
        >
          <thead>
            <tr style={{ backgroundColor: '#006d37', color: '#ffffff', textAlign: 'left' }}>
              <th style={{ padding: '8px 10px', width: '40px', textAlign: 'center' }}>STT</th>
              <th style={{ padding: '8px 12px' }}>Tên Gói / Dịch Vụ</th>
              <th style={{ padding: '8px 12px', width: '90px', textAlign: 'center' }}>Thời Hạn</th>
              <th style={{ padding: '8px 12px', width: '110px', textAlign: 'right' }}>Đơn Giá</th>
              <th style={{ padding: '8px 12px', width: '120px', textAlign: 'right' }}>Thành Tiền</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e5e7eb' }}>
              <td style={{ padding: '10px', textAlign: 'center', fontWeight: 600, color: '#6b7280' }}>1</td>
              <td style={{ padding: '10px 12px' }}>
                <div style={{ fontWeight: 700, color: '#111827', fontSize: '12px' }}>{planName}</div>
                <div style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}>{planDescription}</div>
              </td>
              <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: '#374151' }}>
                {planDuration}
              </td>
              <td style={{ padding: '10px 12px', textAlign: 'right', color: '#374151' }}>
                {formatVND(unitPrice)}
              </td>
              <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: '#111827' }}>
                {formatVND(unitPrice)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Tổng tiền & Bằng chữ */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
          <div style={{ width: '320px', fontSize: '11px', lineHeight: 1.8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4b5563' }}>
              <span>Tạm tính:</span>
              <span style={{ fontWeight: 600 }}>{formatVND(unitPrice)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4b5563' }}>
              <span>Thuế GTGT ({vatRate > 0 ? `${vatRate}%` : 'Chưa áp dụng'}):</span>
              <span style={{ fontWeight: 600 }}>{vatRate > 0 ? formatVND(vatAmount) : '0 đ'}</span>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '14px',
                fontWeight: 800,
                color: '#006d37',
                borderTop: '2px solid #006d37',
                paddingTop: '6px',
                marginTop: '4px',
              }}
            >
              <span>TỔNG CỘNG:</span>
              <span>{formatVND(totalAmount)}</span>
            </div>
            {amountInWords && (
              <div style={{ fontSize: '10px', fontStyle: 'italic', color: '#6b7280', textAlign: 'right', marginTop: '2px' }}>
                (Bằng chữ: {amountInWords})
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2-Column: THÔNG TIN THANH TOÁN & HIỆU LỰC DỊCH VỤ */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
          marginBottom: '16px',
        }}
      >
        {/* Thông tin thanh toán */}
        <div
          style={{
            backgroundColor: '#ecfdf5',
            border: '1px solid #a7f3d0',
            borderRadius: '12px',
            padding: '12px 16px',
          }}
        >
          <div style={{ fontWeight: 700, color: '#065f46', fontSize: '11px', marginBottom: '6px' }}>
            💳 THÔNG TIN THANH TOÁN
          </div>
          <div style={{ fontSize: '11px', lineHeight: 1.6, color: '#047857' }}>
            <div><strong>Phương thức:</strong> {paymentMethod}</div>
            <div><strong>Thời gian GD:</strong> {orderDate} {orderTime}</div>
            <div><strong>Trạng thái:</strong> ✅ ĐÃ THANH TOÁN THÀNH CÔNG</div>
          </div>
        </div>

        {/* Hiệu lực dịch vụ */}
        <div
          style={{
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '12px',
            padding: '12px 16px',
            borderLeft: '4px solid #006d37',
          }}
        >
          <div style={{ fontWeight: 700, color: '#1e40af', fontSize: '11px', marginBottom: '6px' }}>
            ⏰ HIỆU LỰC DỊCH VỤ
          </div>
          <div style={{ fontSize: '11px', lineHeight: 1.6, color: '#1d4ed8' }}>
            <div><strong>Bắt đầu:</strong> {startDate}</div>
            <div><strong>Hết hạn:</strong> {endDate}</div>
            <div><strong>Gia hạn:</strong> Thông báo tự động trước 7 ngày</div>
          </div>
        </div>
      </div>

      {/* Lưu Ý Quan Trọng */}
      <div
        style={{
          backgroundColor: '#fefce8',
          border: '1px solid #fef08a',
          borderLeft: '4px solid #f59e0b',
          borderRadius: '12px',
          padding: '10px 14px',
          fontSize: '10.5px',
          color: '#713f12',
          lineHeight: 1.5,
          marginBottom: '20px',
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: '2px' }}>📌 LƯU Ý QUAN TRỌNG:</div>
        <div>• Biên lai này có giá trị xác nhận giao dịch thành công trên nền tảng <strong>TroXinh.vn</strong>.</div>
        <div>• Quyền lợi gói đã được kích hoạt trực tiếp vào tài khoản quản trị của bạn ngay sau khi thanh toán.</div>
        <div>• Mọi thắc mắc hoặc yêu cầu hỗ trợ đối soát, vui lòng liên hệ Hotline: <strong>0888 110 789</strong> hoặc Zalo cùng số.</div>
      </div>

      {/* Footer */}
      <div
        style={{
          textAlign: 'center',
          borderTop: '1px solid #e5e7eb',
          paddingTop: '12px',
          fontSize: '10px',
          color: '#9ca3af',
          lineHeight: 1.5,
        }}
      >
        <div style={{ fontWeight: 700, color: '#4b5563' }}>
          © 2026 Trọ Xinh · Nền Tảng Tìm Trọ & Quản Lý Nhà Trọ Đã Kiểm Duyệt (TroXinh.vn)
        </div>
        <div>Cảm ơn bạn đã tin tưởng đồng hành cùng Trọ Xinh trong việc mang lại không gian sống an tâm cho sinh viên!</div>
      </div>
    </div>
  );
};
