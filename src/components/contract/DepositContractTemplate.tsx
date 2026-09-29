import React from 'react';

export interface DepositContractTemplateProps {
  id?: string;
  className?: string;
}

export const DepositContractTemplate: React.FC<DepositContractTemplateProps> = ({
  id = 'deposit-contract-template',
  className = '',
}) => {
  return (
    <div
      id={id}
      className={`max-w-4xl mx-auto bg-white p-12 shadow-lg my-8 text-gray-900 font-serif leading-loose antialiased print:shadow-none print:m-0 print:p-8 ${className}`}
      style={{ fontFamily: "'Times New Roman', Times, 'Be Vietnam Pro', serif" }}
    >
      {/* Tiêu đề: Quốc hiệu & Tiêu ngữ */}
      <div className="text-center mb-8 space-y-1">
        <h2 className="text-center font-bold tracking-wider text-base sm:text-lg uppercase">
          CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
        </h2>
        <h3 className="text-center font-bold underline mb-8 text-sm sm:text-base tracking-wide">
          Độc lập – Tự do – Hạnh phúc
        </h3>

        {/* Tên biên bản */}
        <div className="pt-2">
          <h1 className="text-center font-bold text-2xl sm:text-3xl mb-2 tracking-tight uppercase">
            BIÊN BẢN ĐẶT CỌC GIỮ PHÒNG TRỌ
          </h1>
          <p className="text-center italic text-sm text-gray-700">
            (Biên nhận tiền cọc và cam kết giữ chỗ thuê phòng hợp pháp)
          </p>
        </div>
      </div>

      {/* Thời gian & Địa điểm */}
      <div className="space-y-4 mb-6 leading-loose">
        <p className="whitespace-pre-wrap text-right italic text-sm">
          Hôm nay, ngày ...... tháng ...... năm 20......, tại: ........................................................................................
        </p>
      </div>

      {/* I. BÊN NHẬN ĐẶT CỌC (CHỦ TRỌ / ĐẠI DIỆN) */}
      <div className="space-y-2 mb-6">
        <p className="font-bold uppercase">I. BÊN NHẬN ĐẶT CỌC (CHỦ TRỌ / ĐẠI DIỆN):</p>
        <div className="pl-4 space-y-2 leading-loose">
          <p className="whitespace-pre-wrap">
            Họ và tên: ...................................................................................................................................................
          </p>
          <p className="whitespace-pre-wrap">
            Số CCCD: ......................................... Cấp ngày: ....../....../......... Nơi cấp: ...........................................
          </p>
          <p className="whitespace-pre-wrap">
            Số điện thoại liên hệ: .................................................................................................................................
          </p>
        </div>
      </div>

      {/* II. BÊN ĐẶT CỌC (NGƯỜI THUÊ PHÒNG) */}
      <div className="space-y-2 mb-6">
        <p className="font-bold uppercase">II. BÊN ĐẶT CỌC (NGƯỜI THUÊ PHÒNG):</p>
        <div className="pl-4 space-y-2 leading-loose">
          <p className="whitespace-pre-wrap">
            Họ và tên: ...................................................................................................................................................
          </p>
          <p className="whitespace-pre-wrap">
            Số CCCD: ......................................... Cấp ngày: ....../....../......... Nơi cấp: ...........................................
          </p>
          <p className="whitespace-pre-wrap">
            Trường học / Nơi làm việc: .......................................................................................................................
          </p>
          <p className="whitespace-pre-wrap">
            Số điện thoại liên hệ: .................................................................................................................................
          </p>
        </div>
      </div>

      {/* III. NỘI DUNG THỎA THUẬN ĐẶT CỌC */}
      <div className="space-y-4 mb-8">
        <p className="font-bold uppercase">III. NỘI DUNG THỎA THUẬN ĐẶT CỌC:</p>
        <div className="pl-4 space-y-3 leading-loose">
          <p className="whitespace-pre-wrap">
            Thông tin phòng giữ chỗ: Phòng số ........... tại địa chỉ: ......................................................................
            {'\n'}........................................................................................................................................................................
          </p>

          <p className="whitespace-pre-wrap">
            Số tiền đặt cọc: ............................................ VNĐ (Bằng chữ: ...........................................................).
          </p>

          <p className="whitespace-pre-wrap">
            Mục đích đặt cọc: Để đảm bảo Bên Nhận Cọc giữ chỗ phòng trọ nêu trên cho Bên Đặt Cọc. Giá thuê phòng chính thức được chốt là: .............................. VNĐ/tháng (cố định không tăng trong suốt thời hạn hợp đồng).
          </p>

          <p className="whitespace-pre-wrap">
            Thời hạn giữ chỗ: Đến hết ......h...... ngày ....../....../......... Đến thời điểm này, hai bên sẽ tiến hành ký Hợp đồng thuê phòng trọ chính thức và bàn giao phòng.
          </p>

          <div className="space-y-2 leading-loose">
            <p className="font-bold">Cam kết trách nhiệm hai bên:</p>
            <div className="space-y-2 pl-2">
              <p className="whitespace-pre-wrap">
                Nếu đến thời hạn trên mà Bên Đặt Cọc không đến ký hợp đồng và không có lý do chính đáng được chấp thuận thì Bên Đặt Cọc sẽ mất số tiền cọc.
              </p>
              <p className="whitespace-pre-wrap">
                Nếu Bên Nhận Cọc tự ý cho người khác thuê hoặc từ chối cho Bên Đặt Cọc thuê thì phải hoàn trả 100% số tiền cọc và bồi thường một khoản tiền tương đương tiền cọc cho Bên Đặt Cọc.
              </p>
              <p className="whitespace-pre-wrap">
                Số tiền đặt cọc này sẽ được chuyển thành Tiền cọc hợp đồng khi ký kết Hợp đồng thuê trọ chính thức.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Chữ ký (Cuối trang) - Flexbox chia 2 cột căn giữa */}
      <div className="flex justify-between mt-16 text-center leading-normal">
        <div className="w-1/2">
          <p className="font-bold uppercase">BÊN NHẬN ĐẶT CỌC</p>
          <p className="italic text-sm">(Ký và ghi rõ họ tên)</p>
          <div className="h-28" />
        </div>
        <div className="w-1/2">
          <p className="font-bold uppercase">BÊN ĐẶT CỌC</p>
          <p className="italic text-sm">(Ký và ghi rõ họ tên)</p>
          <div className="h-28" />
        </div>
      </div>
    </div>
  );
};
