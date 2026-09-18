import React from 'react';
import { SEOHead } from '../components/seo/SEOHead';

export const PrivacyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50/50 py-10 px-4 sm:px-6 lg:px-8">
      <SEOHead
        title="Chính Sách Bảo Mật & Quyền Riêng Tư – Trọ Xinh"
        description="Chính sách bảo mật thông tin và quyền riêng tư của nền tảng Trọ Xinh. Cam kết bảo vệ dữ liệu cá nhân của người dùng."
        url="/privacy"
      />

      <div className="max-w-4xl mx-auto px-6 py-10 sm:p-12 bg-white rounded-2xl border border-gray-200/80 shadow-xs text-left">
        <div className="inline-block px-3 py-1 bg-green-50 text-green-700 text-xs font-semibold rounded-full mb-3">
          BẢO VỆ DỮ LIỆU &amp; QUYỀN RIÊNG TƯ
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 text-left">
          Chính Sách Bảo Mật &amp; Quyền Riêng Tư
        </h1>

        <p className="text-xs sm:text-sm text-gray-500 pb-4 border-b border-gray-100 mb-6 text-left">
          Ngày hiệu lực: <strong>01/09/2026</strong> | Vận hành: <strong>Nguyễn Vũ Chính</strong> | Địa chỉ: <strong>18 Ngõ 167 Tây Sơn, Đống Đa, Hà Nội</strong>
        </p>

        <div className="space-y-6">
          {/* Section 1 */}
          <section>
            <h2 className="mt-8 font-semibold text-lg text-green-700 text-left mb-3">
              THÔNG TIN CHÚNG TÔI THU THẬP
            </h2>
            <ul className="list-disc pl-5 space-y-2 text-gray-700 leading-relaxed text-left">
              <li>Họ tên, email, số điện thoại khi đăng ký tài khoản.</li>
              <li>Ảnh đại diện (nếu người dùng tự nguyện cung cấp).</li>
              <li>Lịch sử tìm kiếm và danh sách phòng trọ đã lưu.</li>
              <li>Thông tin thiết bị và địa chỉ IP (thu thập tự động ẩn danh).</li>
              <li>Ảnh chụp CCCD khi đăng ký làm Đối Tác Chủ Trọ (được mã hóa, chỉ Ban Quản Trị được xem để duyệt và tự động xóa sau 90 ngày).</li>
            </ul>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="mt-8 font-semibold text-lg text-green-700 text-left mb-3">
              MỤC ĐÍCH SỬ DỤNG
            </h2>
            <ul className="list-disc pl-5 space-y-2 text-gray-700 leading-relaxed text-left mb-3">
              <li>Cung cấp và cải thiện dịch vụ tìm phòng trọ, tìm bạn ở ghép và mua bán đồ cũ.</li>
              <li>Gửi thông báo liên quan đến tài khoản, xác nhận lịch hẹn và trạng thái tin đăng.</li>
              <li>Gợi ý phòng phù hợp dựa trên lịch sử xem và khu vực tìm kiếm.</li>
            </ul>
            <p className="text-gray-700 leading-relaxed text-left">
              <strong className="font-semibold text-gray-900">Cam kết:</strong> KHÔNG bán thông tin cho bất kỳ bên thứ ba nào. KHÔNG dùng số điện thoại của người dùng cho mục đích quảng cáo rác (spam).
            </p>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="mt-8 font-semibold text-lg text-green-700 text-left mb-3">
              CHIA SẺ THÔNG TIN
            </h2>
            <ul className="list-disc pl-5 space-y-2 text-gray-700 leading-relaxed text-left">
              <li>Thông tin liên hệ cơ bản chỉ được chia sẻ với chủ trọ khi người thuê chủ động gửi yêu cầu đặt lịch hẹn hoặc nhắn tin.</li>
              <li>Dữ liệu tổng hợp (đã ẩn danh hoàn toàn) dùng cho báo cáo nội bộ nhằm cải thiện chất lượng dịch vụ.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="mt-8 font-semibold text-lg text-green-700 text-left mb-3">
              BẢO MẬT DỮ LIỆU
            </h2>
            <ul className="list-disc pl-5 space-y-2 text-gray-700 leading-relaxed text-left">
              <li>Dữ liệu lưu trữ trên Supabase với mã hóa chuẩn AES-256. Áp dụng cơ chế Row Level Security (RLS) để mỗi tài khoản chỉ truy cập đúng dữ liệu được cấp quyền.</li>
              <li>Kết nối an toàn HTTPS/TLS trên toàn bộ website.</li>
              <li>Tuyệt đối không lưu mật khẩu ở dạng văn bản thô (plaintext).</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="mt-8 font-semibold text-lg text-green-700 text-left mb-3">
              QUYỀN CỦA NGƯỜI DÙNG
            </h2>
            <ul className="list-disc pl-5 space-y-2 text-gray-700 leading-relaxed text-left">
              <li>Yêu cầu xem, chỉnh sửa hoặc cập nhật dữ liệu cá nhân trong mục Hồ sơ.</li>
              <li>Rút lại sự đồng ý sử dụng dữ liệu bất cứ lúc nào.</li>
              <li>Yêu cầu xóa tài khoản và toàn bộ dữ liệu hoàn toàn khỏi hệ thống.</li>
              <li>
                Liên hệ thực hiện quyền riêng tư:{' '}
                <a href="mailto:nguyenvuchinhb1hhb@gmail.com" className="font-semibold text-[#006d37] hover:underline">
                  nguyenvuchinhb1hhb@gmail.com
                </a>.
              </li>
            </ul>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="mt-8 font-semibold text-lg text-green-700 text-left mb-3">
              COOKIES &amp; TRACKING
            </h2>
            <ul className="list-disc pl-5 space-y-2 text-gray-700 leading-relaxed text-left">
              <li>Cookie được dùng để lưu phiên đăng nhập (session) bảo mật.</li>
              <li>Google Analytics theo dõi lưu lượng truy cập dưới dạng dữ liệu ẩn danh, không định danh cá nhân.</li>
              <li>Người dùng có thể tùy chỉnh hoặc tắt cookie trong phần cài đặt của trình duyệt bất cứ lúc nào.</li>
            </ul>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="mt-8 font-semibold text-lg text-green-700 text-left mb-3">
              THỜI GIAN LƯU TRỮ
            </h2>
            <ul className="list-disc pl-5 space-y-2 text-gray-700 leading-relaxed text-left">
              <li><strong className="font-semibold text-gray-900">Dữ liệu tài khoản:</strong> Lưu trữ cho đến khi người dùng yêu cầu xóa tài khoản.</li>
              <li><strong className="font-semibold text-gray-900">Lịch sử xem phòng:</strong> Tự động lưu tối đa 12 tháng.</li>
              <li><strong className="font-semibold text-gray-900">Nhật ký hệ thống (System logs):</strong> Lưu tối đa 90 ngày.</li>
              <li><strong className="font-semibold text-gray-900">Ảnh CCCD (khi đăng ký chủ trọ):</strong> Tự động xóa sau 90 ngày kể từ khi xét duyệt xong.</li>
            </ul>
          </section>

          {/* Section 8 */}
          <section>
            <h2 className="mt-8 font-semibold text-lg text-green-700 text-left mb-3">
              THAY ĐỔI CHÍNH SÁCH
            </h2>
            <p className="text-gray-700 leading-relaxed text-left">
              Chính sách có thể được cập nhật khi có thay đổi quan trọng về mặt công nghệ hoặc quy định pháp luật. Mọi cập nhật sẽ được thông báo qua email hoặc hiển thị trên trang chủ ít nhất 7 ngày trước ngày có hiệu lực.
            </p>
          </section>

          {/* Section 9 */}
          <section>
            <h2 className="mt-8 font-semibold text-lg text-green-700 text-left mb-3">
              LIÊN HỆ VỀ BẢO MẬT
            </h2>
            <ul className="list-disc pl-5 space-y-2 text-gray-700 leading-relaxed text-left">
              <li>
                Hotline/Zalo hỗ trợ bảo mật:{' '}
                <a href="tel:0888110789" className="font-semibold text-[#006d37] hover:underline">
                  0888 110 789
                </a>{' '}
                (08:00 – 21:00)
              </li>
              <li>
                Email:{' '}
                <a href="mailto:nguyenvuchinhb1hhb@gmail.com" className="font-semibold text-[#006d37] hover:underline">
                  nguyenvuchinhb1hhb@gmail.com
                </a>
              </li>
              <li>
                Địa chỉ: 18 Ngõ 167 Tây Sơn, Phường Quang Trung, Quận Đống Đa, TP. Hà Nội
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};
