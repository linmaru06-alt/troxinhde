import React from 'react';
import { Link } from 'react-router-dom';
import { SEOHead } from '../components/seo/SEOHead';
import { Button } from '../components/ui/Button';
import {
  FileText,
  Printer,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Phone,
  Mail,
  MessageCircle,
  Clock,
  ExternalLink,
  ChevronRight,
  MapPin,
} from 'lucide-react';

export const TermsPage: React.FC = () => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-50/60 py-10 px-4 sm:px-6 lg:px-8">
      <SEOHead
        title="Điều Khoản Sử Dụng Dịch Vụ | TroXinh Hà Nội"
        description="Quy chế và điều khoản sử dụng dịch vụ tìm trọ, đăng tin và bảo vệ tiền cọc trên nền tảng Trọ Xinh (TroXinh.vn)."
        url="/dieu-khoan"
      />

      <div className="max-w-[800px] mx-auto space-y-8">
        {/* Header with Print button */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-[#006d37] text-xs font-bold">
              <FileText className="w-4 h-4" />
              <span>Văn Bản Quy Chế & Pháp Lý</span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              leftIcon={<Printer className="w-4 h-4" />}
              className="print:hidden"
            >
              In Trang
            </Button>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
            Điều Khoản Sử Dụng Dịch Vụ Trọ Xinh
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 pt-2 border-t border-gray-100">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              Ngày hiệu lực: <strong>01/09/2026</strong>
            </span>
            <span>•</span>
            <span>Vận hành: <strong>Nguyễn Vũ Chính</strong></span>
            <span>•</span>
            <span>Địa chỉ: <strong>18 Ngõ 167 Tây Sơn, Đống Đa, Hà Nội</strong></span>
          </div>
        </div>

        {/* Content Body */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-gray-200 shadow-xs space-y-8 text-sm text-gray-700 leading-relaxed print:shadow-none print:border-none print:p-0">
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-emerald-100 text-[#006d37] flex items-center justify-center font-black text-xs">
                1
              </span>
              GIỚI THIỆU VỀ DỊCH VỤ
            </h2>
            <p className="pl-9 text-gray-600">
              Trọ Xinh (<strong>troxinh.vn</strong>) là nền tảng kết nối trực tuyến giúp sinh viên và người đi làm tại Hà Nội tìm kiếm phòng trọ đã được kiểm duyệt, tìm bạn ở ghép và mua bán đồ dùng sinh viên. Vận hành bởi cá nhân <strong>Nguyễn Vũ Chính</strong>, địa chỉ: Số 18 Ngõ 167 Tây Sơn, Phường Quang Trung, Quận Đống Đa, Thành phố Hà Nội.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-emerald-100 text-[#006d37] flex items-center justify-center font-black text-xs">
                2
              </span>
              ĐIỀU KIỆN SỬ DỤNG
            </h2>
            <div className="pl-9 space-y-2 text-gray-600">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Người dùng phải từ đủ <strong>16 tuổi trở lên</strong> hoặc có sự đồng ý của người giám hộ hợp pháp.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Thông tin đăng ký phải chính xác và trung thực.</span>
              </div>
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>Nghiêm cấm đăng tin sai sự thật, lừa đảo hoặc dùng dịch vụ cho mục đích phi pháp.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Một cá nhân chỉ được đăng ký và sử dụng một tài khoản chính thức.</span>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-emerald-100 text-[#006d37] flex items-center justify-center font-black text-xs">
                3
              </span>
              QUYỀN VÀ NGHĨA VỤ NGƯỜI DÙNG
            </h2>
            <div className="pl-9 space-y-1.5 text-gray-600">
              <p>• Được tìm kiếm, lưu tin và liên hệ miễn phí.</p>
              <p>• Có trách nhiệm bảo mật tài khoản và mật khẩu của mình.</p>
              <p>• Có trách nhiệm hoàn toàn đối với nội dung thông tin do mình đăng tải.</p>
              <p>• Không được sao chép, thu thập hoặc phát tán dữ liệu từ Trọ Xinh khi chưa có sự đồng ý.</p>
            </div>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-emerald-100 text-[#006d37] flex items-center justify-center font-black text-xs">
                4
              </span>
              QUYỀN VÀ NGHĨA VỤ CỦA TRỌ XINH
            </h2>
            <div className="pl-9 space-y-1.5 text-gray-600">
              <p>• Kiểm duyệt tin đăng trong vòng 24 giờ làm việc.</p>
              <p>• Có quyền xóa tin vi phạm mà không cần thông báo trước.</p>
              <p>• Cam kết bảo mật thông tin người dùng theo quy định pháp luật.</p>
              <p>• Tiếp nhận và hỗ trợ giải quyết khiếu nại trong vòng 48 giờ.</p>
            </div>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-emerald-100 text-[#006d37] flex items-center justify-center font-black text-xs">
                5
              </span>
              CHÍNH SÁCH THANH TOÁN & HOÀN TIỀN
            </h2>
            <div className="pl-9 space-y-1.5 text-gray-600">
              <p>• Thanh toán qua <strong>VietQR (MB Bank)</strong> hoặc <strong>Ví MoMo</strong>.</p>
              <p>• Hoàn tiền 100% nếu lỗi phát sinh từ phía hệ thống Trọ Xinh.</p>
              <p>• Không hoàn tiền nếu đã kích hoạt và sử dụng dịch vụ quá 24 giờ.</p>
              <p>• Mọi yêu cầu khiếu nại hoàn tiền vui lòng gửi về email: <strong>nguyenvuchinhb1hhb@gmail.com</strong>.</p>
            </div>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-emerald-100 text-[#006d37] flex items-center justify-center font-black text-xs">
                6
              </span>
              GIỚI HẠN TRÁCH NHIỆM
            </h2>
            <div className="pl-9 space-y-1.5 text-gray-600">
              <p>• Trọ Xinh là nền tảng trung gian kết nối giữa người có nhu cầu thuê và chủ nhà trọ.</p>
              <p>• Trọ Xinh không chịu trách nhiệm về giao dịch dân sự trực tiếp giữa chủ trọ và người thuê sau khi đã kết nối.</p>
              <p>• Khuyến khích hai bên sử dụng mẫu hợp đồng thuê trọ và biên bản đặt cọc có sẵn trên nền tảng.</p>
            </div>
          </section>

          {/* Section 7 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-emerald-100 text-[#006d37] flex items-center justify-center font-black text-xs">
                7
              </span>
              SỞ HỮU TRÍ TUỆ
            </h2>
            <p className="pl-9 text-gray-600">
              Toàn bộ nội dung, giao diện thiết kế, thương hiệu và logo Trọ Xinh thuộc quyền sở hữu của <strong>Nguyễn Vũ Chính</strong>. Nghiêm cấm mọi hành vi sao chép, giả mạo khi chưa có sự đồng ý bằng văn bản.
            </p>
          </section>

          {/* Section 8 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-emerald-100 text-[#006d37] flex items-center justify-center font-black text-xs">
                8
              </span>
              THAY ĐỔI ĐIỀU KHOẢN
            </h2>
            <p className="pl-9 text-gray-600">
              Trọ Xinh có quyền cập nhật điều khoản bất kỳ lúc nào để phù hợp với định hướng hoạt động và quy định pháp lý. Thay đổi quan trọng sẽ được thông báo qua email ít nhất 7 ngày trước ngày áp dụng.
            </p>
          </section>

          {/* Section 9 */}
          <section className="space-y-3 pt-4 border-t border-gray-100">
            <h2 className="text-base sm:text-lg font-bold text-gray-900 flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-emerald-100 text-[#006d37] flex items-center justify-center font-black text-xs">
                9
              </span>
              THÔNG TIN LIÊN HỆ
            </h2>
            <div className="pl-9 bg-gray-50 p-5 rounded-2xl border border-gray-200 space-y-2.5">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#006d37]" />
                <span>Hotline: <strong>0888 110 789</strong> (08:00 – 21:00 hàng ngày)</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#006d37]" />
                <span>Email: <strong>nguyenvuchinhb1hhb@gmail.com</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-[#006d37]" />
                <a
                  href="https://zalo.me/0888110789"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-emerald-800 hover:underline flex items-center gap-1"
                >
                  Zalo: 0888 110 789 <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
                </a>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#006d37] shrink-0 mt-0.5" />
                <span>Địa chỉ: 18 Ngõ 167 Tây Sơn, Phường Quang Trung, Quận Đống Đa, TP. Hà Nội</span>
              </div>
            </div>
          </section>
        </div>

        {/* Bottom CTA */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-6 bg-emerald-900 text-white rounded-3xl shadow-xs print:hidden">
          <div>
            <h3 className="font-bold text-base">Xem thêm chính sách bảo mật & quyền riêng tư</h3>
            <p className="text-xs text-emerald-200">Tìm hiểu cách chúng tôi bảo vệ thông tin cá nhân của bạn.</p>
          </div>
          <Link
            to="/chinh-sach-bao-mat"
            className="px-5 py-2.5 bg-white text-[#006d37] hover:bg-emerald-50 rounded-xl font-bold text-xs transition flex items-center gap-1.5"
          >
            Chính Sách Bảo Mật <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};
