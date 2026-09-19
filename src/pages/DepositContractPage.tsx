import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { SEOHead } from '../components/seo/SEOHead';
import { Button } from '../components/ui/Button';
import { generateContractPDF } from '../lib/generateContract';
import { useAppStore } from '../store/useAppStore';
import { DepositContractTemplate } from '../components/contract/DepositContractTemplate';
import {
  Download,
  Printer,
  ArrowLeft,
  FileCheck,
  ShieldCheck,
} from 'lucide-react';

export const DepositContractPage: React.FC = () => {
  const [isExporting, setIsExporting] = useState(false);
  const { showToast } = useAppStore();

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

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <SEOHead
        title="Mẫu Biên Bản Đặt Cọc Giữ Phòng Trọ Chuẩn Pháp Lý | Trọ Xinh"
        description="Mẫu giấy biên nhận tiền cọc và cam kết giữ chỗ thuê phòng trọ chuẩn pháp lý mới nhất mô phỏng khổ giấy A4. Tải PDF miễn phí và in ngay để bảo vệ quyền lợi đôi bên."
        url="/bien-ban-dat-coc"
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
              <FileCheck className="w-4 h-4 text-[#00a854]" />
              Mẫu Biên Bản Đặt Cọc Giữ Phòng Trọ (Bản A4)
            </h1>
            <p className="text-[11px] text-gray-500 font-medium">Định dạng văn bản hành chính A4 chuẩn · Cam kết rõ ràng điều kiện giữ phòng &amp; hoàn cọc · In &amp; Tải PDF miễn phí</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            leftIcon={<Printer className="w-4 h-4" />}
          >
            In Ngay (A4)
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

      {/* Deposit Document Canvas (A4 Container) */}
      <DepositContractTemplate id="deposit-content" />

      {/* Footer Trust Note (Hidden on Print) */}
      <div className="max-w-4xl mx-auto mt-4 text-center text-xs text-gray-500 flex items-center justify-center gap-1.5 print:hidden">
        <ShieldCheck className="w-4 h-4 text-[#00a854]" />
        <span>Mẫu văn bản được biên soạn chuẩn theo Bộ luật Dân sự 2015 · Nền tảng Trọ Xinh (TroXinh.vn) · Hotline hỗ trợ: <strong>0888 110 789</strong></span>
      </div>
    </div>
  );
};

