import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { SEOHead } from '../components/seo/SEOHead';
import { Button } from '../components/ui/Button';
import { generateContractPDF } from '../lib/generateContract';
import { useAppStore } from '../store/useAppStore';
import {
  Download,
  Printer,
  ArrowLeft,
  ShieldCheck,
  FileText,
  CheckCircle2,
  Share2,
} from 'lucide-react';

export const ContractTemplatePage: React.FC = () => {
  const [isExporting, setIsExporting] = useState(false);
  const { showToast } = useAppStore();

  const handleDownloadPDF = async () => {
    setIsExporting(true);
    try {
      await generateContractPDF('contract-content', 'MauHopDong_TroXinh');
      showToast('Tải hợp đồng thành công!', 'File PDF mẫu hợp đồng thuê phòng đã được lưu về máy.', 'success');
    } catch (err) {
      showToast('Có lỗi xảy ra', 'Vui lòng thử tính năng In ngay (Print) hoặc thử lại.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <SEOHead
        title="Mẫu Hợp Đồng Thuê Trọ Chuẩn Pháp Lý | TroXinh Hà Nội"
        description="Mẫu hợp đồng thuê nhà trọ, phòng trọ chuẩn pháp lý mới nhất. Tải PDF miễn phí và in ngay 2 bản có đầy đủ 10 điều khoản bảo vệ người thuê và chủ trọ."
        url="/hop-dong-mau"
      />

      {/* Sticky Top Toolbar (Hidden on Print) */}
      <div className="max-w-4xl mx-auto mb-6 bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-gray-200 shadow-md flex flex-wrap items-center justify-between gap-3 sticky top-20 z-30 print:hidden">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="p-2 rounded-xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-sm sm:text-base font-extrabold text-gray-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#006d37]" />
              Mẫu Hợp Đồng Thuê Phòng Trọ Chuẩn
            </h1>
            <p className="text-[11px] text-gray-500">10 điều khoản chuẩn pháp lý · Miễn phí sử dụng</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            leftIcon={<Printer className="w-4 h-4" />}
          >
            In Ngay
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleDownloadPDF}
            isLoading={isExporting}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Tải File PDF
          </Button>
        </div>
      </div>

      {/* Contract Document Canvas */}
      <div
        id="contract-content"
        className="max-w-4xl mx-auto bg-white p-8 sm:p-14 rounded-2xl shadow-xl border border-gray-200 font-serif text-gray-900 leading-relaxed space-y-6 text-sm sm:text-[15px] print:shadow-none print:border-none print:p-0 print:m-0"
      >
        {/* National Header */}
        <div className="text-center space-y-1.5 pb-6 border-b border-gray-200">
          <p className="font-bold text-sm tracking-wider uppercase font-sans">
            CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
          </p>
          <p className="font-bold text-xs tracking-wide uppercase font-sans">
            Độc lập – Tự do – Hạnh phúc
          </p>
          <div className="w-24 h-0.5 bg-gray-400 mx-auto mt-2" />

          <div className="pt-6">
            <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-tight font-sans text-gray-900">
              HỢP ĐỒNG THUÊ NHÀ / PHÒNG TRỌ
            </h2>
            <p className="text-xs italic text-gray-500 font-sans mt-1">
              (Số: ......./HĐT-TX · Áp dụng theo quy định của Bộ luật Dân sự 2015)
            </p>
          </div>
        </div>

        {/* Date & Location */}
        <p className="italic text-right text-xs">
          Hôm nay, ngày ....... tháng ....... năm 20......, tại địa chỉ: ............................................................................
        </p>

        <p className="font-medium">
          Chúng tôi gồm các bên dưới đây cùng thống nhất ký kết Hợp đồng thuê phòng trọ với các điều khoản sau:
        </p>

        {/* BÊN CHO THUÊ */}
        <div className="space-y-2">
          <h3 className="font-bold font-sans text-sm text-gray-900 uppercase">
            I. BÊN CHO THUÊ (BÊN A):
          </h3>
          <ul className="space-y-1.5 pl-4 list-disc text-gray-800">
            <li>Họ và tên chủ nhà/người đại diện: ....................................................................................................</li>
            <li>Năm sinh: ....................................... Số CCCD: ........................................... Cấp ngày: ............................</li>
            <li>Nơi cấp: ...................................................................................................................................................</li>
            <li>Địa chỉ thường trú: ..................................................................................................................................</li>
            <li>Số điện thoại liên hệ: ...........................................................................................................................</li>
          </ul>
        </div>

        {/* BÊN THUÊ */}
        <div className="space-y-2">
          <h3 className="font-bold font-sans text-sm text-gray-900 uppercase">
            II. BÊN THUÊ (BÊN B):
          </h3>
          <ul className="space-y-1.5 pl-4 list-disc text-gray-800">
            <li>Họ và tên người thuê: ....................................................................................................................</li>
            <li>Năm sinh: ....................................... Số CCCD: ........................................... Cấp ngày: ............................</li>
            <li>Nơi cấp: ...................................................................................................................................................</li>
            <li>Trường học / Nơi làm việc: .....................................................................................................................</li>
            <li>Địa chỉ thường trú: ..................................................................................................................................</li>
            <li>Số điện thoại liên hệ: ...........................................................................................................................</li>
          </ul>
        </div>

        {/* 10 ĐIỀU KHOẢN */}
        <div className="space-y-4 pt-4 border-t border-gray-100">
          <h3 className="font-bold font-sans text-sm text-gray-900 uppercase">
            III. NỘI DUNG VÀ CÁC ĐIỀU KHOẢN THỎA THUẬN:
          </h3>

          <div className="space-y-3 pl-2">
            <div>
              <p className="font-bold">Điều 1: Thông tin phòng cho thuê</p>
              <p className="text-gray-700">
                Bên A đồng ý cho Bên B thuê phòng số: <strong>..........</strong> thuộc nhà số: ................................................................... Phường/Xã: ................................................., Quận/Huyện: .............................................., TP. Hà Nội.
                Diện tích sử dụng: ........... m². Trang thiết bị bàn giao kèm theo gồm: Điều hòa (.....), Bình nóng lạnh (.....), Giường (.....), Tủ quần áo (.....), Thiết bị vệ sinh và chìa khóa/vân tay cửa ra vào.
              </p>
            </div>

            <div>
              <p className="font-bold">Điều 2: Thời hạn thuê phòng</p>
              <p className="text-gray-700">
                Thời hạn thuê là <strong>........... tháng</strong>, tính từ ngày ......./......./20...... đến hết ngày ......./......./20...... 
                Khi hết hạn hợp đồng, nếu Bên B có nhu cầu tiếp tục thuê thì phải thông báo trước cho Bên A tối thiểu 30 ngày để gia hạn.
              </p>
            </div>

            <div>
              <p className="font-bold">Điều 3: Giá thuê và phương thức thanh toán</p>
              <p className="text-gray-700">
                - Giá thuê phòng: <strong>................................... VNĐ/tháng</strong> (Bằng chữ: ....................................................................).<br />
                - Tiền điện: .......................... đ/kWh (theo công tơ riêng). Tiền nước: .......................... đ/khối (hoặc người/tháng).<br />
                - Phí dịch vụ (Wifi, rác, vệ sinh, thang máy): .......................... VNĐ/tháng.<br />
                - Thời gian thanh toán: Định kỳ từ ngày <strong>01 đến ngày 05</strong> hàng tháng qua tiền mặt hoặc chuyển khoản ngân hàng.
              </p>
            </div>

            <div>
              <p className="font-bold">Điều 4: Tiền đặt cọc và hoàn cọc</p>
              <p className="text-gray-700">
                Bên B đặt cọc cho Bên A số tiền: <strong>................................... VNĐ</strong> (Bằng chữ: .........................................................).<br />
                Bên A có trách nhiệm hoàn trả 100% tiền đặt cọc cho Bên B khi kết thúc hợp đồng đúng hạn, đã thanh toán đủ các chi phí dịch vụ và bàn giao nguyên vẹn phòng cùng trang thiết bị.
              </p>
            </div>

            <div>
              <p className="font-bold">Điều 5: Quyền và nghĩa vụ của Bên A (Chủ trọ)</p>
              <p className="text-gray-700">
                - Bàn giao phòng và trang thiết bị cho Bên B đúng thỏa thuận.<br />
                - Đảm bảo quyền sử dụng phòng hợp pháp, an ninh trật tự và hệ thống PCCC của tòa nhà hoạt động tốt.<br />
                - Sửa chữa kịp thời các hư hỏng kết cấu công trình không do lỗi Bên B gây ra.
              </p>
            </div>

            <div>
              <p className="font-bold">Điều 6: Quyền và nghĩa vụ của Bên B (Người thuê)</p>
              <p className="text-gray-700">
                - Sử dụng phòng đúng mục đích để ở, chấp hành quy định an ninh trật tự và đăng ký tạm trú đúng pháp luật.<br />
                - Thanh toán tiền thuê phòng và các chi phí dịch vụ đầy đủ, đúng hạn.<br />
                - Tuyệt đối chấp hành các quy định về an toàn phòng cháy chữa cháy (PCCC), không chứa hóa chất độc hại, chất cấm.<br />
                - Không tự ý sửa chữa kết cấu phòng hoặc cho người khác thuê lại khi chưa có sự đồng ý bằng văn bản của Bên A.
              </p>
            </div>

            <div>
              <p className="font-bold">Điều 7: Điều khoản chấm dứt hợp đồng</p>
              <p className="text-gray-700">
                Hợp đồng chấm dứt khi hết thời hạn thỏa thuận; hoặc một trong hai bên có quyền đơn phương chấm dứt hợp đồng nếu bên kia vi phạm nghiêm trọng các điều khoản, nhưng phải thông báo bằng văn bản trước tối thiểu 30 ngày.
              </p>
            </div>

            <div>
              <p className="font-bold">Điều 8: Giải quyết tranh chấp</p>
              <p className="text-gray-700">
                Hai bên cam kết thực hiện đúng các điều khoản trong hợp đồng. Mọi tranh chấp phát sinh sẽ được ưu tiên giải quyết qua thương lượng, hòa giải. Trường hợp không thể tự giải quyết, vụ việc sẽ được đưa ra Tòa án nhân dân có thẩm quyền.
              </p>
            </div>

            <div>
              <p className="font-bold">Điều 9: Điều khoản thi hành</p>
              <p className="text-gray-700">
                Hợp đồng này có hiệu lực kể từ ngày ký. Hợp đồng được lập thành 02 (hai) bản có giá trị pháp lý như nhau, mỗi bên giữ 01 bản để thực hiện.
              </p>
            </div>
          </div>
        </div>

        {/* Signature Area */}
        <div className="pt-8 grid grid-cols-2 text-center font-sans">
          <div className="space-y-16">
            <div>
              <p className="font-bold text-sm uppercase">ĐẠI DIỆN BÊN A (CHỦ TRỌ)</p>
              <p className="text-xs italic text-gray-500">(Ký và ghi rõ họ tên)</p>
            </div>
            <p className="text-xs text-gray-400">....................................................................</p>
          </div>

          <div className="space-y-16">
            <div>
              <p className="font-bold text-sm uppercase">ĐẠI DIỆN BÊN B (NGƯỜI THUÊ)</p>
              <p className="text-xs italic text-gray-500">(Ký và ghi rõ họ tên)</p>
            </div>
            <p className="text-xs text-gray-400">....................................................................</p>
          </div>
        </div>

        {/* Footer Trust Stamp */}
        <div className="pt-8 border-t border-gray-200 flex items-center justify-between text-[11px] text-gray-400 font-sans">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Mẫu hợp đồng kiểm duyệt bởi Nền tảng Cho Thuê Trọ Xinh (TroXinh.vn)
          </span>
          <span>Hotline hỗ trợ pháp lý: 0987.654.321</span>
        </div>
      </div>
    </div>
  );
};
