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
} from 'lucide-react';

export const DepositContractPage: React.FC = () => {
  const [isExporting, setIsExporting] = useState(false);
  const { showToast } = useAppStore();

  const handleDownloadPDF = async () => {
    setIsExporting(true);
    try {
      await generateContractPDF('deposit-content', 'BienBanDatCoc_TroXinh');
      showToast('Tải biên bản cọc thành công!', 'File PDF biên bản đặt cọc giữ phòng đã được lưu.', 'success');
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
        title="Mẫu Biên Bản Đặt Cọc Thuê Phòng Trọ Chuẩn | TroXinh Hà Nội"
        description="Mẫu giấy biên nhận và cam kết đặt cọc giữ phòng trọ chuẩn pháp lý. Bảo vệ tiền cọc của sinh viên và người thuê trọ."
        url="/bien-ban-dat-coc"
      />

      {/* Sticky Top Toolbar */}
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
              <FileCheck className="w-4 h-4 text-[#006d37]" />
              Mẫu Biên Bản Đặt Cọc Giữ Phòng Trọ
            </h1>
            <p className="text-[11px] text-gray-500">Mẫu 1 trang chuẩn · Cam kết rõ ràng điều kiện giữ phòng & hoàn cọc</p>
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

      {/* Deposit Document Canvas */}
      <div
        id="deposit-content"
        className="max-w-4xl mx-auto bg-white p-8 sm:p-12 rounded-2xl shadow-xl border border-gray-200 font-serif text-gray-900 leading-relaxed space-y-5 text-sm sm:text-[15px] print:shadow-none print:border-none print:p-0 print:m-0"
      >
        {/* Header */}
        <div className="text-center space-y-1 pb-4 border-b border-gray-200">
          <p className="font-bold text-sm tracking-wider uppercase font-sans">
            CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
          </p>
          <p className="font-bold text-xs tracking-wide uppercase font-sans">
            Độc lập – Tự do – Hạnh phúc
          </p>
          <div className="w-20 h-0.5 bg-gray-400 mx-auto mt-2" />

          <div className="pt-4">
            <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-tight font-sans text-gray-900">
              BIÊN BẢN ĐẶT CỌC GIỮ PHÒNG TRỌ
            </h2>
            <p className="text-xs italic text-gray-500 font-sans mt-0.5">
              (Cam kết thỏa thuận đặt cọc thuê chỗ ở hợp pháp)
            </p>
          </div>
        </div>

        {/* Date & Location */}
        <p className="italic text-right text-xs">
          Hôm nay, ngày ....... tháng ....... năm 20......, tại địa chỉ: ............................................................................
        </p>

        {/* BÊN NHẬN CỌC */}
        <div className="space-y-1.5">
          <h3 className="font-bold font-sans text-sm text-gray-900 uppercase">
            I. BÊN NHẬN ĐẶT CỌC (CHỦ TRỌ / ĐẠI DIỆN):
          </h3>
          <ul className="space-y-1 pl-4 list-disc text-gray-800 text-xs sm:text-sm">
            <li>Họ và tên: ....................................................................................................................................</li>
            <li>Số CCCD: ........................................... Cấp ngày: ............................ Nơi cấp: ...................................</li>
            <li>Số điện thoại liên hệ: ...........................................................................................................................</li>
          </ul>
        </div>

        {/* BÊN ĐẶT CỌC */}
        <div className="space-y-1.5">
          <h3 className="font-bold font-sans text-sm text-gray-900 uppercase">
            II. BÊN ĐẶT CỌC (NGƯỜI THUÊ PHÒNG):
          </h3>
          <ul className="space-y-1 pl-4 list-disc text-gray-800 text-xs sm:text-sm">
            <li>Họ và tên: ....................................................................................................................................</li>
            <li>Số CCCD: ........................................... Cấp ngày: ............................ Nơi cấp: ...................................</li>
            <li>Trường học / Công ty: .........................................................................................................................</li>
            <li>Số điện thoại liên hệ: ...........................................................................................................................</li>
          </ul>
        </div>

        {/* NỘI DUNG ĐẶT CỌC */}
        <div className="space-y-3 pt-3 border-t border-gray-100">
          <h3 className="font-bold font-sans text-sm text-gray-900 uppercase">
            III. NỘI DUNG THỎA THUẬN ĐẶT CỌC:
          </h3>

          <div className="space-y-2 pl-2 text-xs sm:text-sm text-gray-800">
            <p>
              1. <strong>Thông tin phòng giữ chỗ:</strong> Phòng số <strong>..........</strong> tại địa chỉ: ................................................................................................ Phường: ........................................................, Quận: ...................................................., Hà Nội.
            </p>

            <p>
              2. <strong>Số tiền đặt cọc:</strong> <strong>.................................................. VNĐ</strong> (Bằng chữ: .......................................................................................................................................................................).
            </p>

            <p>
              3. <strong>Mục đích đặt cọc:</strong> Để đảm bảo Bên Nhận Cọc giữ chỗ phòng trọ nêu trên cho Bên Đặt Cọc. Giá thuê phòng chính thức được chốt là: <strong>................................... VNĐ/tháng</strong>.
            </p>

            <p>
              4. <strong>Thời hạn giữ chỗ:</strong> Từ ngày ......./......./20...... đến hết 17h00 ngày ......./......./20...... Đến thời điểm này, hai bên sẽ tiến hành ký Hợp đồng thuê phòng trọ chính thức và bàn giao phòng.
            </p>

            <p>
              5. <strong>Cam kết trách nhiệm hai bên:</strong><br />
              - Nếu đến thời hạn trên mà Bên Đặt Cọc không đến ký hợp đồng và không có lý do chính đáng được chấp thuận thì Bên Đặt Cọc sẽ mất số tiền cọc.<br />
              - Nếu Bên Nhận Cọc tự ý cho người khác thuê hoặc từ chối cho Bên Đặt Cọc thuê thì phải hoàn trả 100% số tiền cọc và bồi thường một khoản tiền tương đương tiền cọc cho Bên Đặt Cọc.<br />
              - Số tiền đặt cọc này sẽ được chuyển thành Tiền cọc hợp đồng khi ký kết Hợp đồng thuê trọ chính thức.
            </p>
          </div>
        </div>

        {/* Signatures */}
        <div className="pt-6 grid grid-cols-2 text-center font-sans">
          <div className="space-y-14">
            <div>
              <p className="font-bold text-xs sm:text-sm uppercase">BÊN NHẬN ĐẶT CỌC (CHỦ TRỌ)</p>
              <p className="text-[11px] italic text-gray-500">(Ký và ghi rõ họ tên)</p>
            </div>
            <p className="text-xs text-gray-400">....................................................................</p>
          </div>

          <div className="space-y-14">
            <div>
              <p className="font-bold text-xs sm:text-sm uppercase">BÊN ĐẶT CỌC (NGƯỜI THUÊ)</p>
              <p className="text-[11px] italic text-gray-500">(Ký và ghi rõ họ tên)</p>
            </div>
            <p className="text-xs text-gray-400">....................................................................</p>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-6 border-t border-gray-200 flex items-center justify-between text-[11px] text-gray-400 font-sans">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Biên bản mẫu cam kết an tâm cọc phòng từ Trọ Xinh (TroXinh.vn)
          </span>
          <span>Hotline: 0987.654.321</span>
        </div>
      </div>
    </div>
  );
};
