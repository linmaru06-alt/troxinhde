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
  Edit3,
  RotateCcw,
} from 'lucide-react';

export const ContractTemplatePage: React.FC = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const { showToast, currentUser } = useAppStore();

  // Form states for autofill
  const [formData, setFormData] = useState({
    contractNo: '01/2026/HĐT-TX',
    date: new Date().getDate().toString().padStart(2, '0'),
    month: (new Date().getMonth() + 1).toString().padStart(2, '0'),
    year: new Date().getFullYear().toString(),
    signingCity: 'Hà Nội',
    
    // Landlord
    ownerName: 'Nguyễn Văn Tuấn',
    ownerBirth: '1982',
    ownerCccd: '001082012345',
    ownerCccdDate: '15/08/2021',
    ownerCccdPlace: 'Cục Cảnh sát QLHC về TTXH',
    ownerAddress: 'Số 18 Ngõ 167 Tây Sơn, Đống Đa, Hà Nội',
    ownerPhone: '0988112233',

    // Renter
    renterName: currentUser?.name || 'Nguyễn Minh Anh',
    renterBirth: '2004',
    renterCccd: '038204009876',
    renterCccdDate: '20/09/2022',
    renterCccdPlace: 'Cục Cảnh sát QLHC về TTXH',
    renterSchool: currentUser?.school || 'Đại học Bách Khoa Hà Nội',
    renterAddress: 'Xã Tân Triều, Huyện Thanh Trì, TP. Hà Nội',
    renterPhone: currentUser?.phone || '0987654321',

    // Room info
    roomNumber: '302',
    houseAddress: 'Số 18 Ngõ 167 Tây Sơn, Phường Quang Trung, Quận Đống Đa, TP. Hà Nội',
    area: '25',
    durationMonths: '12',
    startDate: '01/09/2026',
    endDate: '01/09/2027',
    price: '4.500.000',
    priceInWords: 'Bốn triệu năm trăm nghìn đồng',
    electricityPrice: '3.800',
    waterPrice: '30.000',
    serviceFee: '150.000',
    deposit: '4.500.000',
    depositInWords: 'Bốn triệu năm trăm nghìn đồng',
  });

  const handleDownloadPDF = async () => {
    setIsExporting(true);
    try {
      await generateContractPDF('contract-content', 'MauHopDongThueTro_TroXinh');
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

  const handleResetBlank = () => {
    setFormData({
      contractNo: '......./HĐT-TX',
      date: '.......',
      month: '.......',
      year: '20......',
      signingCity: '....................................................................',
      ownerName: '....................................................................................................',
      ownerBirth: '................',
      ownerCccd: '...........................................',
      ownerCccdDate: '............................',
      ownerCccdPlace: '...................................................................................................................',
      ownerAddress: '..................................................................................................................',
      ownerPhone: '...........................................................................................................................',
      renterName: '....................................................................................................................',
      renterBirth: '................',
      renterCccd: '...........................................',
      renterCccdDate: '............................',
      renterCccdPlace: '...................................................................................................................',
      renterSchool: '.....................................................................................................................',
      renterAddress: '..................................................................................................................',
      renterPhone: '...........................................................................................................................',
      roomNumber: '..........',
      houseAddress: '................................................................................................................TP. Hà Nội',
      area: '...........',
      durationMonths: '...........',
      startDate: '......./......./20......',
      endDate: '......./......./20......',
      price: '...................................',
      priceInWords: '....................................................................',
      electricityPrice: '..........................',
      waterPrice: '..........................',
      serviceFee: '..........................',
      deposit: '...................................',
      depositInWords: '.........................................................',
    });
    showToast('Đã chuyển sang mẫu giấy trắng để in viết tay!', '', 'info');
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <SEOHead
        title="Mẫu Hợp Đồng Thuê Trọ Chuẩn Pháp Lý | Trọ Xinh"
        description="Mẫu hợp đồng thuê nhà trọ, phòng trọ chuẩn pháp lý mới nhất. Tải PDF miễn phí và in ngay 2 bản có đầy đủ 10 điều khoản bảo vệ quyền lợi."
        url="/hop-dong-mau"
      />

      {/* Sticky Top Toolbar (Hidden on Print) */}
      <div className="max-w-4xl mx-auto mb-6 bg-white p-4 rounded-3xl border border-gray-200 shadow-md flex flex-wrap items-center justify-between gap-3 sticky top-20 z-30 print:hidden">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="p-2 rounded-2xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-sm sm:text-base font-black text-gray-950 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#00a854]" />
              Mẫu Hợp Đồng Thuê Phòng Trọ Chuẩn Pháp Lý
            </h1>
            <p className="text-[11px] text-gray-500 font-medium">10 điều khoản rõ ràng · Font chữ tiếng Việt chuẩn xác · Miễn phí</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleResetBlank}
            className="px-3 py-1.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-xs font-bold text-gray-700 transition flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Mẫu Viết Tay
          </button>

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
            Tải PDF
          </Button>
        </div>
      </div>

      {/* Contract Document Canvas */}
      <div
        id="contract-content"
        className="max-w-4xl mx-auto bg-white p-8 sm:p-14 rounded-3xl shadow-xl border border-gray-200 text-gray-950 leading-relaxed space-y-6 text-sm sm:text-[15px] font-sans antialiased print:shadow-none print:border-none print:p-0 print:m-0"
        style={{ fontFamily: "'Be Vietnam Pro', 'Segoe UI', Arial, sans-serif" }}
      >
        {/* National Header */}
        <div className="text-center space-y-1.5 pb-6 border-b border-gray-200">
          <p className="font-black text-sm tracking-wider uppercase">
            CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
          </p>
          <p className="font-bold text-xs tracking-wide uppercase">
            Độc lập – Tự do – Hạnh phúc
          </p>
          <div className="w-24 h-0.5 bg-gray-400 mx-auto mt-2" />

          <div className="pt-6">
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-gray-950">
              HỢP ĐỒNG THUÊ NHÀ / PHÒNG TRỌ
            </h2>
            <p className="text-xs italic text-gray-500 mt-1">
              (Số: {formData.contractNo} · Căn cứ theo Bộ luật Dân sự số 91/2015/QH13 và Luật Nhà ở số 27/2023/QH15)
            </p>
          </div>
        </div>

        {/* Date & Location */}
        <p className="italic text-right text-xs text-gray-600">
          Hôm nay, ngày <strong>{formData.date}</strong> tháng <strong>{formData.month}</strong> năm <strong>{formData.year}</strong>, tại: {formData.signingCity}
        </p>

        <p className="font-medium text-gray-800">
          Chúng tôi gồm các bên dưới đây cùng thống nhất ký kết Hợp đồng thuê phòng trọ với các điều khoản thỏa thuận sau:
        </p>

        {/* BÊN CHO THUÊ */}
        <div className="space-y-2">
          <h3 className="font-black text-sm text-gray-950 uppercase tracking-wide">
            I. BÊN CHO THUÊ (BÊN A):
          </h3>
          <ul className="space-y-1.5 pl-4 list-disc text-gray-800">
            <li>Họ và tên chủ nhà / người đại diện: <strong>{formData.ownerName}</strong></li>
            <li>Năm sinh: <strong>{formData.ownerBirth}</strong> • Số CCCD: <strong>{formData.ownerCccd}</strong> • Cấp ngày: <strong>{formData.ownerCccdDate}</strong></li>
            <li>Nơi cấp: {formData.ownerCccdPlace}</li>
            <li>Địa chỉ thường trú: {formData.ownerAddress}</li>
            <li>Số điện thoại liên hệ: <strong>{formData.ownerPhone}</strong></li>
          </ul>
        </div>

        {/* BÊN THUÊ */}
        <div className="space-y-2">
          <h3 className="font-black text-sm text-gray-950 uppercase tracking-wide">
            II. BÊN THUÊ (BÊN B):
          </h3>
          <ul className="space-y-1.5 pl-4 list-disc text-gray-800">
            <li>Họ và tên người thuê: <strong>{formData.renterName}</strong></li>
            <li>Năm sinh: <strong>{formData.renterBirth}</strong> • Số CCCD: <strong>{formData.renterCccd}</strong> • Cấp ngày: <strong>{formData.renterCccdDate}</strong></li>
            <li>Nơi cấp: {formData.renterCccdPlace}</li>
            <li>Trường học / Cơ quan: <strong>{formData.renterSchool}</strong></li>
            <li>Địa chỉ thường trú: {formData.renterAddress}</li>
            <li>Số điện thoại liên hệ: <strong>{formData.renterPhone}</strong></li>
          </ul>
        </div>

        {/* 10 ĐIỀU KHOẢN */}
        <div className="space-y-4 pt-4 border-t border-gray-200">
          <h3 className="font-black text-sm text-gray-950 uppercase tracking-wide">
            III. NỘI DUNG VÀ CÁC ĐIỀU KHOẢN THỎA THUẬN:
          </h3>

          <div className="space-y-3.5 pl-2">
            <div>
              <p className="font-bold text-gray-950">Điều 1: Thông tin phòng cho thuê</p>
              <p className="text-gray-800 text-xs sm:text-sm leading-relaxed">
                Bên A đồng ý cho Bên B thuê phòng số: <strong>{formData.roomNumber}</strong> thuộc nhà tại: <strong>{formData.houseAddress}</strong>.<br />
                Diện tích sử dụng: <strong>{formData.area} m²</strong>. Trang thiết bị bàn giao kèm theo gồm: Điều hòa, Bình nóng lạnh, Giường đệm, Tủ quần áo, Thiết bị vệ sinh và chìa khóa/vân tay cửa ra vào đảm bảo hoạt động bình thường.
              </p>
            </div>

            <div>
              <p className="font-bold text-gray-950">Điều 2: Thời hạn thuê phòng</p>
              <p className="text-gray-800 text-xs sm:text-sm leading-relaxed">
                Thời hạn thuê là <strong>{formData.durationMonths} tháng</strong>, tính từ ngày <strong>{formData.startDate}</strong> đến hết ngày <strong>{formData.endDate}</strong>.<br />
                Khi hết hạn hợp đồng, nếu Bên B có nhu cầu tiếp tục thuê thì phải thông báo trước cho Bên A tối thiểu 30 ngày để gia hạn.
              </p>
            </div>

            <div>
              <p className="font-bold text-gray-950">Điều 3: Giá thuê và phương thức thanh toán</p>
              <p className="text-gray-800 text-xs sm:text-sm leading-relaxed">
                - Giá thuê phòng: <strong>{formData.price} VNĐ/tháng</strong> (Bằng chữ: <em>{formData.priceInWords}</em>).<br />
                - Tiền điện: <strong>{formData.electricityPrice} đ/kWh</strong> (theo công tơ riêng). Tiền nước: <strong>{formData.waterPrice} đ/khối</strong> (hoặc người/tháng).<br />
                - Phí dịch vụ (Wifi, vệ sinh, thang máy, đổ rác): <strong>{formData.serviceFee} VNĐ/tháng</strong>.<br />
                - Thời gian thanh toán: Định kỳ từ ngày <strong>01 đến ngày 05</strong> hàng tháng qua tiền mặt hoặc chuyển khoản ngân hàng.
              </p>
            </div>

            <div>
              <p className="font-bold text-gray-950">Điều 4: Tiền đặt cọc và hoàn cọc</p>
              <p className="text-gray-800 text-xs sm:text-sm leading-relaxed">
                Bên B đặt cọc cho Bên A số tiền: <strong>{formData.deposit} VNĐ</strong> (Bằng chữ: <em>{formData.depositInWords}</em>).<br />
                Bên A có trách nhiệm <strong>hoàn trả 100% tiền đặt cọc</strong> cho Bên B khi kết thúc hợp đồng đúng hạn, đã thanh toán đủ các chi phí dịch vụ và bàn giao nguyên vẹn phòng cùng trang thiết bị.
              </p>
            </div>

            <div>
              <p className="font-bold text-gray-950">Điều 5: Quyền và nghĩa vụ của Bên A (Chủ trọ)</p>
              <p className="text-gray-800 text-xs sm:text-sm leading-relaxed">
                - Bàn giao phòng và trang thiết bị cho Bên B đúng hiện trạng đã cam kết.<br />
                - Đảm bảo quyền sử dụng phòng hợp pháp, an ninh trật tự và hệ thống PCCC của tòa nhà hoạt động tốt.<br />
                - Sửa chữa kịp thời các hư hỏng kết cấu công trình không do lỗi của Bên B gây ra.
              </p>
            </div>

            <div>
              <p className="font-bold text-gray-950">Điều 6: Quyền và nghĩa vụ của Bên B (Người thuê)</p>
              <p className="text-gray-800 text-xs sm:text-sm leading-relaxed">
                - Sử dụng phòng đúng mục đích để ở, chấp hành quy định an ninh trật tự và đăng ký tạm trú đúng pháp luật.<br />
                - Thanh toán tiền thuê phòng và các chi phí dịch vụ đầy đủ, đúng hạn.<br />
                - Tuyệt đối chấp hành các quy định về an toàn phòng cháy chữa cháy (PCCC), không chứa hóa chất độc hại, chất cấm.<br />
                - Không tự ý đục phá, sửa chữa kết cấu phòng hoặc cho người khác thuê lại khi chưa có sự đồng ý bằng văn bản của Bên A.
              </p>
            </div>

            <div>
              <p className="font-bold text-gray-950">Điều 7: Điều khoản chấm dứt hợp đồng</p>
              <p className="text-gray-800 text-xs sm:text-sm leading-relaxed">
                Hợp đồng chấm dứt khi hết thời hạn thỏa thuận; hoặc một trong hai bên có quyền đơn phương chấm dứt hợp đồng nếu bên kia vi phạm nghiêm trọng các điều khoản, nhưng phải thông báo bằng văn bản trước tối thiểu 30 ngày.
              </p>
            </div>

            <div>
              <p className="font-bold text-gray-950">Điều 8: Giải quyết tranh chấp</p>
              <p className="text-gray-800 text-xs sm:text-sm leading-relaxed">
                Hai bên cam kết thực hiện đúng các điều khoản trong hợp đồng. Mọi tranh chấp phát sinh sẽ được ưu tiên giải quyết qua thương lượng, hòa giải. Trường hợp không thể tự giải quyết, vụ việc sẽ được đưa ra Tòa án nhân dân có thẩm quyền.
              </p>
            </div>

            <div>
              <p className="font-bold text-gray-950">Điều 9: Điều khoản thi hành</p>
              <p className="text-gray-800 text-xs sm:text-sm leading-relaxed">
                Hợp đồng này có hiệu lực kể từ ngày ký. Hợp đồng được lập thành <strong>02 (hai) bản</strong> có giá trị pháp lý như nhau, mỗi bên giữ 01 bản để thực hiện.
              </p>
            </div>
          </div>
        </div>

        {/* Signature Area */}
        <div className="pt-8 grid grid-cols-2 text-center">
          <div className="space-y-16">
            <div>
              <p className="font-black text-sm uppercase text-gray-950">ĐẠI DIỆN BÊN A (CHỦ TRỌ)</p>
              <p className="text-xs italic text-gray-500">(Ký và ghi rõ họ tên)</p>
            </div>
            <p className="text-xs text-gray-400">....................................................................</p>
          </div>

          <div className="space-y-16">
            <div>
              <p className="font-black text-sm uppercase text-gray-950">ĐẠI DIỆN BÊN B (NGƯỜI THUÊ)</p>
              <p className="text-xs italic text-gray-500">(Ký và ghi rõ họ tên)</p>
            </div>
            <p className="text-xs text-gray-400">....................................................................</p>
          </div>
        </div>

        {/* Footer Trust Stamp */}
        <div className="pt-8 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between text-[11px] text-gray-500 gap-2">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#00a854]" />
            Mẫu hợp đồng bảo vệ quyền lợi sinh viên & chủ trọ của Trọ Xinh (TroXinh.vn)
          </span>
          <span>Hotline hỗ trợ pháp lý: 0888 110 789</span>
        </div>
      </div>
    </div>
  );
};
