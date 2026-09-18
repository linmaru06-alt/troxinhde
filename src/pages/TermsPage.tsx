import React from 'react';
import { SEOHead } from '../components/seo/SEOHead';

export const TermsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50/50 py-10">
      <SEOHead
        title="Điều Khoản Sử Dụng – Trọ Xinh"
        description="Quy định và điều khoản sử dụng nền tảng Trọ Xinh. Cam kết kết nối minh bạch, an toàn giữa người tìm phòng và chủ nhà."
        url="/terms"
      />

      <div className="max-w-4xl mx-auto px-4 py-12 bg-white rounded-2xl border border-gray-200/80 shadow-xs text-gray-700 leading-relaxed space-y-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">
          ĐIỀU KHOẢN SỬ DỤNG – TRỌ XINH
        </h1>

        <p>
          Chào mừng bạn đến với Trọ Xinh! Cảm ơn bạn đã tin tưởng và sử dụng nền tảng của chúng tôi. Khi truy cập, đăng ký tài khoản hoặc sử dụng bất kỳ dịch vụ nào trên website Trọ Xinh (bao gồm nhưng không giới hạn ở: Tìm phòng, Đăng tin, Tìm bạn cùng phòng, Chợ đồ cũ sinh viên), bạn đồng ý đã đọc, hiểu và cam kết tuân thủ toàn bộ các Điều khoản sử dụng dưới đây.
        </p>

        <h2 className="mt-8 font-semibold text-lg text-gray-900">
          Điều 1: Mục Đích &amp; Bản Chất Nền Tảng
        </h2>
        <p>
          Trọ Xinh là một nền tảng công nghệ trung gian cung cấp không gian trực tuyến giúp kết nối Người có phòng cho thuê/nhà trọ với Người có nhu cầu tìm phòng, tìm bạn ở ghép, và trao đổi đồ dùng sinh viên.
        </p>
        <p>
          <strong>Miễn trừ trách nhiệm:</strong> Trọ Xinh KHÔNG sở hữu, quản lý, hay vận hành bất kỳ phòng trọ hay tài sản nào trên nền tảng. Chúng tôi KHÔNG phải là một bên tham gia vào hợp đồng thuê nhà hay giao dịch mua bán giữa các người dùng.
        </p>

        <h2 className="mt-8 font-semibold text-lg text-gray-900">
          Điều 2: Quy Định Về Tài Khoản Người Dùng
        </h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>Người dùng chịu trách nhiệm cung cấp thông tin cá nhân chính xác, đầy đủ khi đăng ký.</li>
          <li>Người dùng phải tự bảo mật thông tin đăng nhập. Trọ Xinh không chịu trách nhiệm cho tổn thất phát sinh từ việc lộ thông tin.</li>
          <li>Ban quản trị có quyền tạm khóa hoặc xóa vĩnh viễn tài khoản mà không cần báo trước nếu phát hiện gian lận, lừa đảo.</li>
        </ul>

        <h2 className="mt-8 font-semibold text-lg text-gray-900">
          Điều 3: Quy Định Dành Cho Người Đăng Tin
        </h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>Tính xác thực:</strong> Mọi thông tin mô tả, giá cả, địa chỉ và hình ảnh phải đúng 100% thực tế. Cấm đăng tin môi giới ảo.
          </li>
          <li>
            <strong>Tính hợp pháp:</strong> Không đăng tải nội dung trái quy định pháp luật Việt Nam. Tuyệt đối không đăng bán hàng cấm trong 'Chợ đồ cũ'.
          </li>
          <li>
            <strong>Quyền kiểm duyệt:</strong> Trọ Xinh có quyền yêu cầu chỉnh sửa, ẩn hoặc xóa bỏ các tin đăng không đáp ứng tiêu chuẩn theo 'Quy trình kiểm duyệt phòng 24h'.
          </li>
        </ul>

        <h2 className="mt-8 font-semibold text-lg text-gray-900">
          Điều 4: An Toàn Giao Dịch &amp; Khuyến Cáo
        </h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <strong>Giao dịch độc lập:</strong> Mọi giao dịch diễn ra hoàn toàn giữa hai bên. Trọ Xinh không thu phí hoa hồng và không chịu trách nhiệm pháp lý đối với bất kỳ rủi ro hay tranh chấp nào.
          </li>
          <li>
            <strong>Khuyến cáo:</strong> Tuyệt đối KHÔNG chuyển khoản đặt cọc trước khi đến xem phòng thực tế. Người dùng tự chịu trách nhiệm tìm hiểu kỹ đối tác trước khi quyết định ở ghép hoặc mua bán.
          </li>
        </ul>

        <h2 className="mt-8 font-semibold text-lg text-gray-900">
          Điều 5: Quyền Sở Hữu Trí Tuệ
        </h2>
        <p>
          Mọi nội dung, thiết kế giao diện, logo và mã nguồn trên website Trọ Xinh đều là tài sản trí tuệ thuộc quyền sở hữu của Ban quản trị. Nghiêm cấm mọi hành vi sao chép hoặc sử dụng cho mục đích thương mại khi chưa có sự đồng ý.
        </p>

        <h2 className="mt-8 font-semibold text-lg text-gray-900">
          Điều 6: Giải Quyết Tranh Chấp &amp; Liên Hệ
        </h2>
        <p>
          Mọi khiếu nại, thắc mắc hoặc báo cáo lừa đảo, vui lòng liên hệ Ban quản trị qua:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            Hotline/Zalo:{' '}
            <a href="tel:0888110789" className="font-semibold text-[#006d37] hover:underline">
              0888 110 789
            </a>
          </li>
          <li>
            Email:{' '}
            <a href="mailto:nguyenvuchinhb1hhb@gmail.com" className="font-semibold text-[#006d37] hover:underline">
              nguyenvuchinhb1hhb@gmail.com
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
};
