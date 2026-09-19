import React from 'react';
import { Link } from 'react-router-dom';
import { SEOHead } from '../components/seo/SEOHead';
import { Button } from '../components/ui/Button';
import {
  ShieldCheck,
  Printer,
  Lock,
  Database,
  CheckCircle2,
  Phone,
  Mail,
  MessageCircle,
  Clock,
  ExternalLink,
  ChevronRight,
  MapPin,
} from 'lucide-react';

export const PrivacyPolicyPage: React.FC = () => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gray-50/60 py-10 px-4 sm:px-6 lg:px-8">
      <SEOHead
        title="Chính Sách Bảo Mật & Quyền Riêng Tư | TroXinh Hà Nội"
        description="Cam kết bảo vệ dữ liệu cá nhân, mã hóa dữ liệu Supabase AES-256 và chính sách quyền riêng tư của nền tảng Trọ Xinh (TroXinh.vn)."
        url="/chinh-sach-bao-mat"
      />

      <div className="max-w-[800px] mx-auto space-y-8">
        {/* Header with Print button */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-[#006d37] text-xs font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>Bảo Vệ Dữ Liệu & Quyền Riêng Tư</span>
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
            Chính Sách Bảo Mật & Quyền Riêng Tư
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
            <h2 className="text-base sm:text-lg font-bold text-green-700 flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-emerald-100 text-green-700 flex items-center justify-center font-black text-xs">
                1
              </span>
              THÔNG TIN CHÚNG TÔI THU THẬP
            </h2>
            <div className="pl-9 space-y-1.5 text-gray-700">
              <p>• Họ tên, email, số điện thoại khi đăng ký tài khoản.</p>
              <p>• Ảnh đại diện (nếu người dùng tự nguyện cung cấp).</p>
              <p>• Lịch sử tìm kiếm và danh sách phòng trọ đã lưu.</p>
              <p>• Thông tin thiết bị và địa chỉ IP (thu thập tự động ẩn danh).</p>
              <p>• Ảnh chụp CCCD khi đăng ký làm Đối Tác Chủ Trọ (được mã hóa, chỉ Ban Quản Trị được xem để duyệt và tự động xóa sau 90 ngày).</p>
            </div>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-green-700 flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-emerald-100 text-green-700 flex items-center justify-center font-black text-xs">
                2
              </span>
              MỤC ĐÍCH SỬ DỤNG
            </h2>
            <div className="pl-9 space-y-2 text-gray-700">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Cung cấp và cải thiện dịch vụ tìm phòng trọ, tìm bạn ở ghép và mua bán đồ cũ.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Gửi thông báo liên quan đến tài khoản, xác nhận lịch hẹn và trạng thái tin đăng.</span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>Gợi ý phòng phù hợp dựa trên lịch sử xem và khu vực tìm kiếm.</span>
              </div>
              <div className="flex items-start gap-2">
                <Lock className="w-4 h-4 text-green-700 shrink-0 mt-0.5" />
                <span><strong>Cam kết:</strong> KHÔNG bán thông tin cho bất kỳ bên thứ ba nào.</span>
              </div>
              <div className="flex items-start gap-2">
                <Lock className="w-4 h-4 text-green-700 shrink-0 mt-0.5" />
                <span>KHÔNG dùng số điện thoại của người dùng cho mục đích quảng cáo rác (spam).</span>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-green-700 flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-emerald-100 text-green-700 flex items-center justify-center font-black text-xs">
                3
              </span>
              CHIA SẺ THÔNG TIN
            </h2>
            <div className="pl-9 space-y-1.5 text-gray-700">
              <p>• Thông tin liên hệ cơ bản chỉ được chia sẻ với chủ trọ khi người thuê chủ động gửi yêu cầu đặt lịch hẹn hoặc nhắn tin.</p>
              <p>• Dữ liệu tổng hợp (đã ẩn danh hoàn toàn) dùng cho báo cáo nội bộ nhằm cải thiện chất lượng dịch vụ.</p>
            </div>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-green-700 flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-emerald-100 text-green-700 flex items-center justify-center font-black text-xs">
                4
              </span>
              BẢO MẬT DỮ LIỆU
            </h2>
            <div className="pl-9 space-y-2 text-gray-700">
              <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-emerald-900 text-xs">
                  <Database className="w-4 h-4 text-green-700" />
                  <span>Hệ thống cơ sở dữ liệu Supabase</span>
                </div>
                <p className="text-xs text-emerald-800">
                  Dữ liệu lưu trữ trên Supabase với mã hóa chuẩn AES-256. Áp dụng cơ chế Row Level Security (RLS) để mỗi tài khoản chỉ truy cập đúng dữ liệu được cấp quyền.
                </p>
              </div>
              <p>• Kết nối an toàn HTTPS/TLS trên toàn bộ website.</p>
              <p>• Tuyệt đối không lưu mật khẩu ở dạng văn bản thô (plaintext).</p>
            </div>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-green-700 flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-emerald-100 text-green-700 flex items-center justify-center font-black text-xs">
                5
              </span>
              QUYỀN CỦA NGƯỜI DÙNG
            </h2>
            <div className="pl-9 space-y-1.5 text-gray-700">
              <p>• Yêu cầu xem, chỉnh sửa hoặc cập nhật dữ liệu cá nhân trong mục Hồ sơ.</p>
              <p>• Rút lại sự đồng ý sử dụng dữ liệu bất cứ lúc nào.</p>
              <p>• Yêu cầu xóa tài khoản và toàn bộ dữ liệu hoàn toàn khỏi hệ thống.</p>
              <p>• Liên hệ thực hiện quyền riêng tư: <strong>nguyenvuchinhb1hhb@gmail.com</strong>.</p>
            </div>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-green-700 flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-emerald-100 text-green-700 flex items-center justify-center font-black text-xs">
                6
              </span>
              COOKIES & TRACKING
            </h2>
            <div className="pl-9 space-y-1.5 text-gray-700">
              <p>• Cookie được dùng để lưu phiên đăng nhập (session) bảo mật.</p>
              <p>• Google Analytics theo dõi lưu lượng truy cập dưới dạng dữ liệu ẩn danh, không định danh cá nhân.</p>
              <p>• Người dùng có thể tùy chỉnh hoặc tắt cookie trong phần cài đặt của trình duyệt bất cứ lúc nào.</p>
            </div>
          </section>

          {/* Section 7 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-green-700 flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-emerald-100 text-green-700 flex items-center justify-center font-black text-xs">
                7
              </span>
              THỜI GIAN LƯU TRỮ
            </h2>
            <div className="pl-9 space-y-1.5 text-gray-700">
              <p>• Dữ liệu tài khoản: Lưu trữ cho đến khi người dùng yêu cầu xóa tài khoản.</p>
              <p>• Lịch sử xem phòng: Tự động lưu tối đa 12 tháng.</p>
              <p>• Nhật ký hệ thống (System logs): Lưu tối đa 90 ngày.</p>
              <p>• Ảnh CCCD (khi đăng ký chủ trọ): Tự động xóa sau 90 ngày kể từ khi xét duyệt xong.</p>
            </div>
          </section>

          {/* Section 8 */}
          <section className="space-y-3">
            <h2 className="text-base sm:text-lg font-bold text-green-700 flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-emerald-100 text-green-700 flex items-center justify-center font-black text-xs">
                8
              </span>
              THAY ĐỔI CHÍNH SÁCH
            </h2>
            <p className="pl-9 text-gray-700">
              Chính sách có thể được cập nhật khi có thay đổi quan trọng về mặt công nghệ hoặc quy định pháp luật. Mọi cập nhật sẽ được thông báo qua email hoặc hiển thị trên trang chủ ít nhất 7 ngày trước ngày có hiệu lực.
            </p>
          </section>

          {/* Section 9 */}
          <section className="space-y-3 pt-4 border-t border-gray-100">
            <h2 className="text-base sm:text-lg font-bold text-green-700 flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-emerald-100 text-green-700 flex items-center justify-center font-black text-xs">
                9
              </span>
              LIÊN HỆ VỀ BẢO MẬT
            </h2>
            <div className="pl-9 bg-gray-50 p-5 rounded-2xl border border-gray-200 space-y-2.5">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-green-700" />
                <a href="tel:0888110789" className="hover:text-green-700 hover:underline transition-colors">
                  <strong>0888 110 789</strong>
                </a>
                <span className="text-gray-500 text-xs">(08:00 – 21:00)</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-green-700" />
                <a href="mailto:nguyenvuchinhb1hhb@gmail.com" className="hover:text-green-700 hover:underline transition-colors">
                  <strong>nguyenvuchinhb1hhb@gmail.com</strong>
                </a>
              </div>
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-green-700" />
                <a
                  href="https://zalo.me/0888110789"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-emerald-800 hover:underline flex items-center gap-1"
                >
                  0888 110 789 <ExternalLink className="w-3.5 h-3.5 text-emerald-600" />
                </a>
              </div>
              <a
                href="https://www.google.com/maps/dir/?api=1&destination=18+Ngõ+167+Tây+Sơn,+Phường+Quang+Trung,+Quận+Đống+Đa,+TP.+Hà+Nội"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-2 hover:underline hover:text-green-700 cursor-pointer transition-colors"
              >
                <MapPin className="w-4 h-4 text-green-700 shrink-0 mt-0.5" />
                <span>18 Ngõ 167 Tây Sơn, Phường Quang Trung, Quận Đống Đa, TP. Hà Nội</span>
              </a>
            </div>
          </section>
        </div>

        {/* Bottom CTA */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-6 bg-emerald-900 text-white rounded-3xl shadow-xs print:hidden">
          <div>
            <h3 className="font-bold text-base">Xem thêm điều khoản sử dụng dịch vụ</h3>
            <p className="text-xs text-emerald-200">Hiểu rõ quyền lợi và nghĩa vụ của bạn khi sử dụng Trọ Xinh.</p>
          </div>
          <Link
            to="/dieu-khoan"
            className="px-5 py-2.5 bg-white text-[#006d37] hover:bg-emerald-50 rounded-xl font-bold text-xs transition flex items-center gap-1.5"
          >
            Điều Khoản Sử Dụng <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};
