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
  FileCheck,
  RotateCcw,
} from 'lucide-react';

export const DepositContractPage: React.FC = () => {
  const [isExporting, setIsExporting] = useState(false);
  const { showToast, currentUser } = useAppStore();

  const [formData, setFormData] = useState({
    date: new Date().getDate().toString().padStart(2, '0'),
    month: (new Date().getMonth() + 1).toString().padStart(2, '0'),
    year: new Date().getFullYear().toString(),
    signingCity: 'Hà Nội',

    // Landlord
    ownerName: 'Nguyễn Văn Tuấn',
    ownerCccd: '001082012345',
    ownerCccdDate: '15/08/2021',
    ownerCccdPlace: 'Cục Cảnh sát QLHC về TTXH',
    ownerPhone: '0988112233',

    // Renter
    renterName: currentUser?.name || 'Nguyễn Minh Anh',
    renterCccd: '038204009876',
    renterCccdDate: '20/09/2022',
    renterCccdPlace: 'Cục Cảnh sát QLHC về TTXH',
    renterSchool: currentUser?.school || 'Đại học Bách Khoa Hà Nội',
    renterPhone: currentUser?.phone || '0987654321',

    // Room info
    roomNumber: '302',
    houseAddress: 'Số 18 Ngõ 167 Tây Sơn, Phường Quang Trung, Quận Đống Đa, TP. Hà Nội',
    depositAmount: '1.000.000',
    depositInWords: 'Một triệu đồng chẵn',
    officialPrice: '4.500.000',
    holdUntilDate: '01/09/2026',
  });

  const handleDownloadPDF = async () => {
    setIsExporting(true);
    try {
      await generateContractPDF('deposit-content', 'BienBanDatCoc_TroXinh');
      showToast('Tải biên bản cọc thành công!', 'File PDF biên bản đặt cọc giữ phòng đã được lưu về máy.', 'success');
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
      date: '.......',
      month: '.......',
      year: '20......',
      signingCity: '....................................................................',
      ownerName: '....................................................................................................',
      ownerCccd: '...........................................',
      ownerCccdDate: '............................',
      ownerCccdPlace: '...................................................................................................',
      ownerPhone: '...........................................................................................................',
      renterName: '....................................................................................................',
      renterCccd: '...........................................',
      renterCccdDate: '............................',
      renterCccdPlace: '...................................................................................................',
      renterSchool: '.....................................................................................................',
      renterPhone: '...........................................................................................................',
      roomNumber: '..........',
      houseAddress: '................................................................................................TP. Hà Nội',
      depositAmount: '..................................................',
      depositInWords: '................................................................................................................',
      officialPrice: '...................................',
      holdUntilDate: '......./......./20......',
    });
    showToast('Đã chuyển sang mẫu giấy trắng để in viết tay!', '', 'info');
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <SEOHead
        title="Mẫu Biên Bản Đặt Cọc Giữ Phòng Trọ Chuẩn | Trọ Xinh"
        description="Mẫu giấy biên nhận và cam kết đặt cọc giữ phòng trọ chuẩn pháp lý. Bảo vệ tiền cọc của sinh viên và người thuê trọ."
        url="/bien-ban-dat-coc"
      />

      {/* Sticky Top Toolbar */}
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
              <FileCheck className="w-4 h-4 text-[#00a854]" />
              Mẫu Biên Bản Đặt Cọc Giữ Phòng Trọ
            </h1>
            <p className="text-[11px] text-gray-500 font-medium">1 trang cô đọng · Cam kết rõ ràng điều kiện giữ phòng & hoàn cọc</p>
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

      {/* Deposit Document Canvas */}
      <div
        id="deposit-content"
        className="max-w-4xl mx-auto bg-white p-8 sm:p-12 rounded-3xl shadow-xl border border-gray-200 text-gray-950 leading-relaxed space-y-5 text-sm sm:text-[15px] font-sans antialiased print:shadow-none print:border-none print:p-0 print:m-0"
        style={{ fontFamily: "'Be Vietnam Pro', 'Segoe UI', Arial, sans-serif" }}
      >
        {/* Header */}
        <div className="text-center space-y-1.5 pb-4 border-b border-gray-200">
          <p className="font-black text-sm tracking-wider uppercase">
            CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
          </p>
          <p className="font-bold text-xs tracking-wide uppercase">
            Độc lập – Tự do – Hạnh phúc
          </p>
          <div className="w-20 h-0.5 bg-gray-400 mx-auto mt-2" />

          <div className="pt-4">
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-gray-950">
              BIÊN BẢN ĐẶT CỌC GIỮ PHÒNG TRỌ
            </h2>
            <p className="text-xs italic text-gray-500 mt-0.5">
              (Biên nhận tiền cọc và cam kết giữ chỗ thuê phòng hợp pháp)
            </p>
          </div>
        </div>

        {/* Date & Location */}
        <p className="italic text-right text-xs text-gray-600">
          Hôm nay, ngày <strong>{formData.date}</strong> tháng <strong>{formData.month}</strong> năm <strong>{formData.year}</strong>, tại: {formData.signingCity}
        </p>

        {/* BÊN NHẬN CỌC */}
        <div className="space-y-1.5">
          <h3 className="font-black text-sm text-gray-950 uppercase tracking-wide">
            I. BÊN NHẬN ĐẶT CỌC (CHỦ TRỌ / ĐẠI DIỆN):
          </h3>
          <ul className="space-y-1 pl-4 list-disc text-gray-800 text-xs sm:text-sm">
            <li>Họ và tên: <strong>{formData.ownerName}</strong></li>
            <li>Số CCCD: <strong>{formData.ownerCccd}</strong> • Cấp ngày: <strong>{formData.ownerCccdDate}</strong> • Nơi cấp: {formData.ownerCccdPlace}</li>
            <li>Số điện thoại liên hệ: <strong>{formData.ownerPhone}</strong></li>
          </ul>
        </div>

        {/* BÊN ĐẶT CỌC */}
        <div className="space-y-1.5">
          <h3 className="font-black text-sm text-gray-950 uppercase tracking-wide">
            II. BÊN ĐẶT CỌC (NGƯỜI THUÊ PHÒNG):
          </h3>
          <ul className="space-y-1 pl-4 list-disc text-gray-800 text-xs sm:text-sm">
            <li>Họ và tên: <strong>{formData.renterName}</strong></li>
            <li>Số CCCD: <strong>{formData.renterCccd}</strong> • Cấp ngày: <strong>{formData.renterCccdDate}</strong> • Nơi cấp: {formData.renterCccdPlace}</li>
            <li>Trường học / Nơi làm việc: <strong>{formData.renterSchool}</strong></li>
            <li>Số điện thoại liên hệ: <strong>{formData.renterPhone}</strong></li>
          </ul>
        </div>

        {/* NỘI DUNG ĐẶT CỌC */}
        <div className="space-y-3 pt-3 border-t border-gray-200">
          <h3 className="font-black text-sm text-gray-950 uppercase tracking-wide">
            III. NỘI DUNG THỎA THUẬN ĐẶT CỌC:
          </h3>

          <div className="space-y-2.5 pl-2 text-xs sm:text-sm text-gray-800">
            <p className="leading-relaxed">
              1. <strong>Thông tin phòng giữ chỗ:</strong> Phòng số <strong>{formData.roomNumber}</strong> tại địa chỉ: <strong>{formData.houseAddress}</strong>.
            </p>

            <p className="leading-relaxed">
              2. <strong>Số tiền đặt cọc:</strong> <strong>{formData.depositAmount} VNĐ</strong> (Bằng chữ: <em>{formData.depositInWords}</em>).
            </p>

            <p className="leading-relaxed">
              3. <strong>Mục đích đặt cọc:</strong> Để đảm bảo Bên Nhận Cọc giữ chỗ phòng trọ nêu trên cho Bên Đặt Cọc. Giá thuê phòng chính thức được chốt là: <strong>{formData.officialPrice} VNĐ/tháng</strong> (cố định không tăng trong suốt thời hạn hợp đồng).
            </p>

            <p className="leading-relaxed">
              4. <strong>Thời hạn giữ chỗ:</strong> Đến hết 17h00 ngày <strong>{formData.holdUntilDate}</strong>. Đến thời điểm này, hai bên sẽ tiến hành ký Hợp đồng thuê phòng trọ chính thức và bàn giao phòng.
            </p>

            <p className="leading-relaxed">
              5. <strong>Cam kết trách nhiệm hai bên:</strong><br />
              - Nếu đến thời hạn trên mà Bên Đặt Cọc không đến ký hợp đồng và không có lý do chính đáng được chấp thuận thì Bên Đặt Cọc sẽ mất số tiền cọc.<br />
              - Nếu Bên Nhận Cọc tự ý cho người khác thuê hoặc từ chối cho Bên Đặt Cọc thuê thì phải hoàn trả 100% số tiền cọc và bồi thường một khoản tiền tương đương tiền cọc cho Bên Đặt Cọc.<br />
              - Số tiền đặt cọc này sẽ được chuyển thành Tiền cọc hợp đồng khi ký kết Hợp đồng thuê trọ chính thức.
            </p>
          </div>
        </div>

        {/* Signatures */}
        <div className="pt-6 grid grid-cols-2 text-center">
          <div className="space-y-14">
            <div>
              <p className="font-black text-xs sm:text-sm uppercase text-gray-950">BÊN NHẬN ĐẶT CỌC (CHỦ TRỌ)</p>
              <p className="text-[11px] italic text-gray-500">(Ký và ghi rõ họ tên)</p>
            </div>
            <p className="text-xs text-gray-400">....................................................................</p>
          </div>

          <div className="space-y-14">
            <div>
              <p className="font-black text-xs sm:text-sm uppercase text-gray-950">BÊN ĐẶT CỌC (NGƯỜI THUÊ)</p>
              <p className="text-[11px] italic text-gray-500">(Ký và ghi rõ họ tên)</p>
            </div>
            <p className="text-xs text-gray-400">....................................................................</p>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-6 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between text-[11px] text-gray-500 gap-2">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#00a854]" />
            Biên bản thỏa thuận được bảo hộ bởi Nền tảng Trọ Xinh (TroXinh.vn)
          </span>
          <span>Hotline hỗ trợ: 0888 110 789</span>
        </div>
      </div>
    </div>
  );
};
