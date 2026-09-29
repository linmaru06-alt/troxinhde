import React from 'react';

export interface RentalContractTemplateProps {
  id?: string;
  className?: string;
}

export const RentalContractTemplate: React.FC<RentalContractTemplateProps> = ({
  id = 'rental-contract-template',
  className = '',
}) => {
  return (
    <div
      id={id}
      className={`max-w-4xl mx-auto bg-white p-8 sm:p-14 shadow-lg my-8 text-gray-900 text-base leading-loose antialiased print:shadow-none print:m-0 print:p-8 ${className}`}
      style={{ fontFamily: "'Times New Roman', Times, 'Be Vietnam Pro', serif" }}
    >
      {/* 1. Tiêu đề Quốc hiệu & Tiêu ngữ */}
      <div className="text-center mb-8 space-y-1">
        <h2 className="text-center font-bold tracking-wider text-base sm:text-lg uppercase">
          CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
        </h2>
        <h3 className="text-center font-bold underline mb-8 text-sm sm:text-base tracking-wide uppercase">
          ĐỘC LẬP - TỰ DO - HẠNH PHÚC
        </h3>
        
        {/* Tên Hợp đồng */}
        <div className="pt-2">
          <h1 className="text-center font-bold text-2xl sm:text-3xl mb-2 tracking-tight uppercase">
            HỢP ĐỒNG THUÊ NHÀ / PHÒNG TRỌ
          </h1>
          <p className="text-center italic text-sm text-gray-700">
            (Số: ......./2026/HĐT-TX - Căn cứ theo Bộ luật Dân sự số 91/2015/QH13 và Luật Nhà ở số 27/2023/QH15)
          </p>
        </div>
      </div>

      {/* 2. Thời gian, địa điểm & Dẫn nhập */}
      <div className="space-y-4 mb-6 leading-loose">
        <p className="whitespace-pre-wrap text-right italic text-sm">
          Hôm nay, ngày ...... tháng ...... năm 20......, tại: ........................................................................................
        </p>
        <p>
          Chúng tôi gồm các bên dưới đây cùng thống nhất ký kết Hợp đồng thuê phòng trọ với các điều khoản thỏa thuận sau:
        </p>
      </div>

      {/* 3. Bên Cho Thuê (Bên A) */}
      <div className="space-y-2 mb-6">
        <p className="font-bold uppercase">I. BÊN CHO THUÊ (BÊN A):</p>
        <ul className="pl-6 space-y-2 list-disc leading-loose">
          <li className="whitespace-pre-wrap">
            Họ và tên chủ nhà / người đại diện: .......................................................................................................................
          </li>
          <li className="whitespace-pre-wrap">
            Năm sinh: ....................... Số CCCD: ......................................................... Cấp ngày: ....../....../.........
          </li>
          <li className="whitespace-pre-wrap">
            Nơi cấp: ....................................................................................................................................................................
          </li>
          <li className="whitespace-pre-wrap">
            Địa chỉ thường trú: .................................................................................................................................................
          </li>
          <li className="whitespace-pre-wrap">
            Số điện thoại liên hệ: .............................................................................................................................................
          </li>
        </ul>
      </div>

      {/* 4. Bên Thuê (Bên B) */}
      <div className="space-y-2 mb-6">
        <p className="font-bold uppercase">II. BÊN THUÊ (BÊN B):</p>
        <ul className="pl-6 space-y-2 list-disc leading-loose">
          <li className="whitespace-pre-wrap">
            Họ và tên người thuê: .............................................................................................................................................
          </li>
          <li className="whitespace-pre-wrap">
            Năm sinh: ....................... Số CCCD: ......................................................... Cấp ngày: ....../....../.........
          </li>
          <li className="whitespace-pre-wrap">
            Nơi cấp: ....................................................................................................................................................................
          </li>
          <li className="whitespace-pre-wrap">
            Trường học / Cơ quan: ...........................................................................................................................................
          </li>
          <li className="whitespace-pre-wrap">
            Địa chỉ thường trú: .................................................................................................................................................
          </li>
          <li className="whitespace-pre-wrap">
            Số điện thoại liên hệ: .............................................................................................................................................
          </li>
        </ul>
      </div>

      {/* 5. Nội dung và các điều khoản thỏa thuận */}
      <div className="space-y-6">
        <p className="font-bold uppercase">III. NỘI DUNG VÀ CÁC ĐIỀU KHOẢN THỎA THUẬN:</p>

        {/* Điều 1 */}
        <div className="space-y-2 leading-loose">
          <p className="font-bold">Điều 1: Thông tin phòng cho thuê</p>
          <div className="pl-4 space-y-2">
            <p className="whitespace-pre-wrap">
              Bên A đồng ý cho Bên B thuê phòng số: .......... thuộc nhà tại: ................................................................................
            </p>
            <p className="whitespace-pre-wrap">
              ......................................................................................................................................................................................
            </p>
            <p>Diện tích sử dụng: ............ m2.</p>
            <p className="whitespace-pre-wrap">
              Trang thiết bị bàn giao kèm theo gồm: .....................................................................................................................
            </p>
            <p className="whitespace-pre-wrap">
              ......................................................................................................................................................................................
            </p>
          </div>
        </div>

        {/* Điều 2 */}
        <div className="space-y-2 leading-loose">
          <p className="font-bold">Điều 2: Thời hạn thuê phòng</p>
          <ul className="pl-6 list-disc space-y-2">
            <li>
              Thời hạn thuê là ...... tháng, tính từ ngày ....../....../......... đến hết ngày ....../....../.........
            </li>
            <li>
              Khi hết hạn hợp đồng, nếu Bên B có nhu cầu tiếp tục thuê thì phải thông báo trước cho Bên A tối thiểu 30 ngày để gia hạn.
            </li>
          </ul>
        </div>

        {/* Điều 3 */}
        <div className="space-y-2 leading-loose">
          <p className="font-bold">Điều 3: Giá thuê và phương thức thanh toán</p>
          <ul className="pl-6 list-disc space-y-2">
            <li className="whitespace-pre-wrap">
              Giá thuê phòng: ............................................ VNĐ/tháng (Bằng chữ: ............................................................................).
            </li>
            <li>
              Tiền điện: ................. đ/kWh (theo công tơ riêng). Tiền nước: ................. đ/khối (hoặc người/tháng).
            </li>
            <li className="whitespace-pre-wrap">
              Phí dịch vụ (Wifi, vệ sinh, thang máy, đổ rác): ............................................ VNĐ/tháng.
            </li>
            <li>
              Thời gian thanh toán: Định kỳ từ ngày ...... đến ngày ...... hàng tháng qua tiền mặt hoặc chuyển khoản.
            </li>
          </ul>
        </div>

        {/* Điều 4 */}
        <div className="space-y-2 leading-loose">
          <p className="font-bold">Điều 4: Tiền đặt cọc và hoàn cọc</p>
          <ul className="pl-6 list-disc space-y-2">
            <li className="whitespace-pre-wrap">
              Bên B đặt cọc cho Bên A số tiền: ............................................ VNĐ (Bằng chữ: ...........................................................).
            </li>
            <li>
              Bên A có trách nhiệm hoàn trả 100% tiền đặt cọc cho Bên B khi kết thúc hợp đồng đúng hạn, đã thanh toán đủ các chi phí dịch vụ và bàn giao nguyên vẹn phòng cùng trang thiết bị.
            </li>
          </ul>
        </div>

        {/* Điều 5 */}
        <div className="space-y-2 leading-loose">
          <p className="font-bold">Điều 5: Quyền và nghĩa vụ của Bên A (Chủ trọ)</p>
          <ul className="pl-6 list-disc space-y-2">
            <li>Bàn giao phòng và trang thiết bị cho Bên B đúng hiện trạng đã cam kết.</li>
            <li>Đảm bảo quyền sử dụng phòng hợp pháp, an ninh trật tự và hệ thống PCCC của tòa nhà hoạt động tốt.</li>
            <li>Sửa chữa kịp thời các hư hỏng kết cấu công trình không do lỗi của Bên B gây ra.</li>
          </ul>
        </div>

        {/* Điều 6 */}
        <div className="space-y-2 leading-loose">
          <p className="font-bold">Điều 6: Quyền và nghĩa vụ của Bên B (Người thuê)</p>
          <ul className="pl-6 list-disc space-y-2">
            <li>Sử dụng phòng đúng mục đích để ở, chấp hành quy định an ninh trật tự và đăng ký tạm trú đúng pháp luật.</li>
            <li>Thanh toán tiền thuê phòng và các chi phí dịch vụ đầy đủ, đúng hạn.</li>
            <li>Tuyệt đối chấp hành các quy định về an toàn phòng cháy chữa cháy (PCCC), không chứa hóa chất độc hại, chất cấm.</li>
            <li>Không tự ý đục phá, sửa chữa kết cấu phòng hoặc cho người khác thuê lại khi chưa có sự đồng ý bằng văn bản của Bên A.</li>
          </ul>
        </div>

        {/* Điều 7 */}
        <div className="space-y-2 leading-loose">
          <p className="font-bold">Điều 7: Điều khoản chấm dứt hợp đồng</p>
          <p className="pl-4">
            Hợp đồng chấm dứt khi hết thời hạn thỏa thuận; hoặc một trong hai bên có quyền đơn phương chấm dứt hợp đồng nếu bên kia vi phạm nghiêm trọng các điều khoản, nhưng phải thông báo bằng văn bản trước tối thiểu 30 ngày.
          </p>
        </div>

        {/* Điều 8 */}
        <div className="space-y-2 leading-loose">
          <p className="font-bold">Điều 8: Giải quyết tranh chấp</p>
          <p className="pl-4">
            Hai bên cam kết thực hiện đúng các điều khoản trong hợp đồng. Mọi tranh chấp phát sinh sẽ được ưu tiên giải quyết qua thương lượng, hòa giải. Trường hợp không thể tự giải quyết, vụ việc sẽ được đưa ra Tòa án nhân dân có thẩm quyền.
          </p>
        </div>

        {/* Điều 9 */}
        <div className="space-y-2 leading-loose">
          <p className="font-bold">Điều 9: Điều khoản thi hành</p>
          <p className="pl-4">
            Hợp đồng này có hiệu lực kể từ ngày ký. Hợp đồng được lập thành 02 (hai) bản có giá trị pháp lý như nhau, mỗi bên giữ 01 bản để thực hiện.
          </p>
        </div>
      </div>

      {/* 6. Phần Chữ ký (Cuối trang) */}
      <div className="flex justify-between mt-16 text-center leading-normal">
        <div className="w-1/2">
          <strong>ĐẠI DIỆN BÊN A (CHỦ TRỌ)</strong>
          <br />
          <span className="italic text-sm">(Ký và ghi rõ họ tên)</span>
          <div className="h-28" />
        </div>
        <div className="w-1/2">
          <strong>ĐẠI DIỆN BÊN B (NGƯỜI THUÊ)</strong>
          <br />
          <span className="italic text-sm">(Ký và ghi rõ họ tên)</span>
          <div className="h-28" />
        </div>
      </div>
    </div>
  );
};
