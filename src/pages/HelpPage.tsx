import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  User,
  Search as SearchIcon,
  Home,
  CreditCard,
  ShieldCheck,
  ChevronDown,
  Phone,
  MessageCircle,
  ExternalLink,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ThumbsUp,
  ThumbsDown,
  X,
  Sparkles,
  ArrowRight,
  Clock,
  Lock,
} from 'lucide-react';
import { SEOHead } from '../components/seo/SEOHead';

interface FAQItem {
  id: string;
  categoryId: 'account' | 'find-room' | 'post-listing' | 'paid-services' | 'safety';
  question: string;
  answer: React.ReactNode;
  tags?: string[];
}

interface Category {
  id: 'account' | 'find-room' | 'post-listing' | 'paid-services' | 'safety';
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const CATEGORIES: Category[] = [
  {
    id: 'account',
    name: 'Tài khoản',
    description: 'Đăng ký, xác thực danh tính, bảo mật & cập nhật hồ sơ',
    icon: User,
  },
  {
    id: 'find-room',
    name: 'Tìm phòng',
    description: 'Bộ lọc tìm kiếm, kiểm duyệt phòng, đặt lịch & tìm bạn ở ghép',
    icon: SearchIcon,
  },
  {
    id: 'post-listing',
    name: 'Đăng tin',
    description: 'Đăng phòng cho thuê, tiêu chuẩn duyệt 24h & quản lý tin',
    icon: Home,
  },
  {
    id: 'paid-services',
    name: 'Dịch vụ trả phí',
    description: 'Gói VIP, đẩy tin nổi bật, thanh toán & kích hoạt tự động',
    icon: CreditCard,
  },
  {
    id: 'safety',
    name: 'An toàn',
    description: 'Cảnh báo lừa đảo cọc, hợp đồng mẫu & bảo vệ quyền lợi',
    icon: ShieldCheck,
  },
];

const FAQS: FAQItem[] = [
  // 1. TÀI KHOẢN
  {
    id: 'acc-1',
    categoryId: 'account',
    question: 'Làm thế nào để đăng ký và đăng nhập tài khoản Trọ Xinh?',
    tags: ['đăng ký', 'đăng nhập', 'tài khoản', 'google', 'otp'],
    answer: (
      <div className="space-y-3 text-gray-700 leading-relaxed">
        <p>
          Bạn có thể đăng ký tài khoản Trọ Xinh hoàn toàn miễn phí chỉ trong 30 giây bằng các cách sau:
        </p>
        <ol className="list-decimal pl-5 space-y-2">
          <li>
            <strong>Đăng nhập nhanh bằng Google:</strong> Bấm vào nút <em>'Đăng nhập'</em> trên góc phải thanh điều hướng và chọn <em>'Tiếp tục với Google'</em>.
          </li>
          <li>
            <strong>Đăng ký bằng Email:</strong> Điền họ tên, địa chỉ email hợp lệ và mật khẩu bảo mật (tối thiểu 6 ký tự).
          </li>
          <li>
            <strong>Đăng ký số điện thoại qua mã xác thực OTP:</strong> Giúp xác minh tài khoản chính chủ và kích hoạt tính năng chat trực tiếp với chủ nhà/người thuê.
          </li>
        </ol>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-900 flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>
            <strong>Mẹo:</strong> Sau khi đăng ký, hãy vào trang <Link to="/ho-so" className="underline font-semibold hover:text-emerald-700">Hồ sơ cá nhân</Link> để cập nhật số Zalo và ảnh đại diện giúp tăng độ tin cậy khi liên hệ.
          </span>
        </div>
      </div>
    ),
  },
  {
    id: 'acc-2',
    categoryId: 'account',
    question: 'Tôi bị quên mật khẩu hoặc không đăng nhập được thì phải làm sao?',
    tags: ['quên mật khẩu', 'đổi mật khẩu', 'khôi phục'],
    answer: (
      <div className="space-y-3 text-gray-700 leading-relaxed">
        <p>Để lấy lại mật khẩu tài khoản Trọ Xinh:</p>
        <ol className="list-decimal pl-5 space-y-1.5">
          <li>Truy cập trang đăng nhập và chọn liên kết <Link to="/quen-mat-khau" className="text-green-700 font-semibold underline">Quên mật khẩu?</Link></li>
          <li>Nhập chính xác địa chỉ Email bạn đã dùng khi đăng ký.</li>
          <li>Kiểm tra hộp thư đến (hoặc thư mục Spam/Quảng cáo) để nhận đường link tạo lại mật khẩu mới từ hệ thống Firebase Authentication.</li>
          <li>Đặt mật khẩu mới và đăng nhập lại bình thường.</li>
        </ol>
        <p className="text-xs text-gray-500">
          Nếu vẫn không nhận được email khôi phục sau 5 phút, vui lòng liên hệ Hotline <a href="tel:0888110789" className="font-bold text-green-700">0888 110 789</a> để được hỗ trợ thủ công.
        </p>
      </div>
    ),
  },
  {
    id: 'acc-3',
    categoryId: 'account',
    question: 'Xác thực danh tính (Trust Verification) có lợi ích gì?',
    tags: ['xác thực', 'trust', 'cccd', 'uy tín'],
    answer: (
      <div className="space-y-3 text-gray-700 leading-relaxed">
        <p>
          Huy hiệu <strong>'Đã xác thực danh tính'</strong> là chứng chỉ uy tín cao nhất trên Trọ Xinh dành cho cả Người thuê và Chủ trọ:
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li><strong>Đối với Người thuê:</strong> Được chủ nhà tin tưởng hơn, dễ dàng thương lượng giá cọc và ưu tiên giữ chỗ khi có nhiều người cùng đặt lịch xem.</li>
          <li><strong>Đối với Chủ nhà/Môi giới:</strong> Tin đăng được gắn huy hiệu tích xanh uy tín, tăng tỷ lệ click xem phòng gấp 3 lần và được ưu tiên hiển thị ở đầu danh sách tìm kiếm.</li>
        </ul>
        <div className="pt-1">
          <Link to="/ve-chung-toi/kiem-duyet" className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 hover:underline">
            Xem quy trình kiểm duyệt uy tín 24h <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    ),
  },
  {
    id: 'acc-4',
    categoryId: 'account',
    question: 'Tôi có thể dùng 1 tài khoản để vừa tìm phòng vừa đăng tin cho thuê được không?',
    tags: ['chủ trọ', 'người thuê', 'vai trò', 'nâng cấp'],
    answer: (
      <div className="space-y-2.5 text-gray-700 leading-relaxed">
        <p>
          <strong>Hoàn toàn được!</strong> Tài khoản mặc định khi đăng ký là Người thuê phòng. Nếu bạn có phòng trống cần cho thuê, chỉ cần bấm vào nút <strong>'Đăng tin cho thuê'</strong> hoặc truy cập mục <strong>'Nâng cấp Chủ trọ'</strong> trên thanh Menu.
        </p>
        <p>
          Hệ thống sẽ hướng dẫn bạn cập nhật thông tin chủ nhà/quản lý để mở khóa giao diện Dashboard quản lý tòa nhà, phòng trống và các gói dịch vụ nâng cao.
        </p>
      </div>
    ),
  },
  {
    id: 'acc-5',
    categoryId: 'account',
    question: 'Làm thế nào để thay đổi số điện thoại Zalo hoặc xoá tài khoản?',
    tags: ['đổi sđt', 'zalo', 'xóa tài khoản'],
    answer: (
      <div className="space-y-2.5 text-gray-700 leading-relaxed">
        <p>
          Bạn có thể thay đổi số điện thoại Zalo, số liên hệ hiển thị và thông tin cá nhân bất kỳ lúc nào tại trang <Link to="/ho-so" className="text-green-700 font-semibold underline">Hồ sơ của tôi</Link>.
        </p>
        <p>
          Nếu bạn muốn xoá vĩnh viễn dữ liệu tài khoản theo quyền riêng tư (GDPR/Chính sách bảo mật), hãy gửi yêu cầu qua email <a href="mailto:nguyenvuchinhb1hhb@gmail.com" className="text-green-700 underline font-medium">nguyenvuchinhb1hhb@gmail.com</a> kèm số điện thoại đăng ký. Ban quản trị sẽ xử lý và xoá dữ liệu trong vòng 24 giờ làm việc.
        </p>
      </div>
    ),
  },

  // 2. TÌM PHÒNG
  {
    id: 'find-1',
    categoryId: 'find-room',
    question: 'Làm thế nào để tìm phòng trọ gần trường đại học hoặc quận huyện mong muốn?',
    tags: ['tìm phòng', 'quận huyện', 'trường đại học', 'bản đồ', 'bộ lọc'],
    answer: (
      <div className="space-y-3 text-gray-700 leading-relaxed">
        <p>Trọ Xinh cung cấp 3 cách tìm phòng cực kỳ thuận tiện:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li><strong>Thanh tìm kiếm thông minh:</strong> Gõ tên trường Đại học (ví dụ: Bách Khoa, Quốc Gia, Ngoại Thương, Kinh Tế Quốc Dân, FPT...) hoặc tên đường/khu vực tại thanh tìm kiếm trên trang chủ.</li>
          <li><strong>Bộ lọc đa chiều:</strong> Sử dụng trang <Link to="/tim-kiem" className="text-green-700 font-semibold underline">Tìm kiếm nâng cao</Link> để lọc theo mức giá (dưới 3 triệu, 3-5 triệu, trên 5 triệu), loại phòng (khép kín, CCMN, studio, có gác xép), tiện ích (điều hòa, máy giặt, thang máy, PCCC, không chung chủ).</li>
          <li><strong>Chế độ Bản đồ (Map View):</strong> Truy cập <Link to="/ban-do" className="text-green-700 font-semibold underline">Bản đồ phòng trọ</Link> để xem trực quan vị trí phòng, bán kính di chuyển và các tiện ích xung quanh.</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'find-2',
    categoryId: 'find-room',
    question: 'Nhãn "Đã kiểm duyệt 100%" trên Trọ Xinh có ý nghĩa gì?',
    tags: ['kiểm duyệt', 'xác thực', 'pccc', 'chính chủ'],
    answer: (
      <div className="space-y-3 text-gray-700 leading-relaxed">
        <p>
          Tất cả phòng có nhãn <strong>'Đã kiểm duyệt'</strong> đều đã trải qua quy trình xác minh thực tế 3 bước nghiêm ngặt của đội ngũ Trọ Xinh:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
          <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200">
            <span className="font-bold text-gray-900 block mb-1">1. Địa chỉ &amp; Chủ trọ</span>
            Xác minh định vị GPS thực tế và số điện thoại chính chủ.
          </div>
          <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200">
            <span className="font-bold text-gray-900 block mb-1">2. Ảnh chụp 100% thật</span>
            Không sử dụng ảnh 3D ảo hoặc ảnh lấy từ các dự án khác.
          </div>
          <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200">
            <span className="font-bold text-gray-900 block mb-1">3. An toàn &amp; PCCC</span>
            Kiểm tra lối thoát hiểm, bình chữa cháy và thang thoát hiểm.
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'find-3',
    categoryId: 'find-room',
    question: 'Người tìm phòng có phải trả bất kỳ khoản phí môi giới nào không?',
    tags: ['phí môi giới', 'miễn phí', 'người thuê'],
    answer: (
      <div className="space-y-2 text-gray-700 leading-relaxed">
        <p className="font-semibold text-emerald-800">
          KHÔNG! Trọ Xinh cam kết 100% MIỄN PHÍ đối với người tìm phòng và sinh viên.
        </p>
        <p>
          Bạn được tự do tìm kiếm, xem số điện thoại, nhắn tin Zalo, liên hệ trực tiếp với chủ trọ và đặt lịch xem phòng mà không phải trả bất kỳ khoản phí dẫn đường, phí dịch vụ hay hoa hồng môi giới nào.
        </p>
      </div>
    ),
  },
  {
    id: 'find-4',
    categoryId: 'find-room',
    question: 'Làm sao để liên hệ trực tiếp với chủ trọ hoặc đặt lịch xem phòng?',
    tags: ['liên hệ chủ trọ', 'đặt lịch', 'zalo', 'gọi điện'],
    answer: (
      <div className="space-y-2.5 text-gray-700 leading-relaxed">
        <p>Tại trang chi tiết của mỗi phòng trọ, bạn sẽ thấy các nút liên hệ tức thì:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li><strong>Gọi điện trực tiếp:</strong> Bấm nút <em>'Gọi ngay'</em> để kết nối điện thoại với chủ nhà.</li>
          <li><strong>Chat qua Zalo:</strong> Bấm <em>'Nhắn Zalo'</em> để mở khung trò chuyện Zalo có sẵn thông tin phòng bạn đang quan tâm.</li>
          <li><strong>Đặt lịch xem phòng:</strong> Chọn ngày và khung giờ bạn rảnh để hệ thống gửi thông báo hẹn lịch trực tiếp đến điện thoại chủ trọ.</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'find-5',
    categoryId: 'find-room',
    question: 'Tính năng "Tìm bạn cùng phòng" (Roommate) và "Chợ đồ cũ" hoạt động ra sao?',
    tags: ['ở ghép', 'roommate', 'chợ đồ cũ', 'sinh viên'],
    answer: (
      <div className="space-y-3 text-gray-700 leading-relaxed">
        <p>Ngoài tìm phòng nguyên căn, Trọ Xinh hỗ trợ 2 tiện ích đặc quyền cho sinh viên:</p>
        <div className="space-y-2">
          <p>
            <strong>1. Tìm bạn ở ghép (<Link to="/tim-ban-cung-phong" className="text-green-700 underline font-medium">/tim-ban-cung-phong</Link>):</strong> Đăng tin tìm người ở cùng hoặc duyệt hồ sơ bạn cùng phòng theo trường đại học, tính cách, thói quen sinh hoạt và ngân sách chia tiền phòng.
          </p>
          <p>
            <strong>2. Chợ đồ cũ sinh viên (<Link to="/cho-do-cu" className="text-green-700 underline font-medium">/cho-do-cu</Link>):</strong> Nơi sinh viên chuyển phòng thanh lý hoặc mua lại bàn học, tủ lạnh mini, đệm, bếp từ, quạt điện giá rẻ.
          </p>
        </div>
      </div>
    ),
  },

  // 3. ĐĂNG TIN
  {
    id: 'post-1',
    categoryId: 'post-listing',
    question: 'Quy trình đăng tin cho thuê phòng trọ trên Trọ Xinh gồm những bước nào?',
    tags: ['đăng tin', 'chủ nhà', 'quy trình', 'tạo phòng'],
    answer: (
      <div className="space-y-3 text-gray-700 leading-relaxed">
        <p>Để đăng tin cho thuê phòng, bạn thực hiện 4 bước đơn giản:</p>
        <ol className="list-decimal pl-5 space-y-1.5">
          <li>Đăng nhập tài khoản và chọn <strong>'Đăng tin cho thuê'</strong>.</li>
          <li>Nhập thông tin địa chỉ, quận huyện, loại phòng, diện tích và giá thuê niêm yết rõ ràng.</li>
          <li>Tải lên tối thiểu 3 hình ảnh chụp thực tế góc phòng, nhà vệ sinh và khu để xe (có thể đính kèm video clip ngắn).</li>
          <li>Chọn các tiện ích có sẵn (điều hòa, nóng lạnh, ban công, giờ giấc tự do...) và nhấn <strong>'Gửi duyệt tin'</strong>.</li>
        </ol>
      </div>
    ),
  },
  {
    id: 'post-2',
    categoryId: 'post-listing',
    question: 'Tin đăng sau khi gửi sẽ được kiểm duyệt trong bao lâu?',
    tags: ['thời gian duyệt', 'kiểm duyệt 24h', 'trạng thái'],
    answer: (
      <div className="space-y-2 text-gray-700 leading-relaxed">
        <p>
          Đội ngũ kiểm duyệt viên Trọ Xinh làm việc từ <strong>8:00 đến 21:00 hàng ngày</strong> (kể cả Thứ 7 và Chủ Nhật).
        </p>
        <p>
          Thời gian xử lý và duyệt tin thông thường từ <strong>15 phút đến 2 giờ</strong>. Trường hợp tin đăng cần bổ sung ảnh chụp rõ nét hơn hoặc xác minh lại địa chỉ, hệ thống sẽ gửi thông báo đẩy và email hướng dẫn bạn cập nhật nhanh chóng.
        </p>
      </div>
    ),
  },
  {
    id: 'post-3',
    categoryId: 'post-listing',
    question: 'Những lý do phổ biến khiến tin đăng phòng bị từ chối hoặc yêu cầu sửa đổi?',
    tags: ['từ chối tin', 'lỗi đăng tin', 'quy định'],
    answer: (
      <div className="space-y-2 text-gray-700 leading-relaxed">
        <p>Tin đăng có thể bị tạm dừng duyệt nếu vi phạm một trong các quy định sau:</p>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li>Hình ảnh mờ, chèn số điện thoại che kín phòng hoặc sử dụng ảnh đồ họa 3D không có thực.</li>
          <li>Giá phòng để '1.000đ' hoặc không đúng giá thực tế khi liên hệ.</li>
          <li>Địa chỉ không có thật hoặc cố tình chọn sai quận huyện để kéo khách.</li>
          <li>Đăng trùng lặp nhiều bài viết cho cùng 1 phòng trọ.</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'post-4',
    categoryId: 'post-listing',
    question: 'Làm sao để chỉnh sửa giá phòng, ảnh chụp hoặc đánh dấu "Đã cho thuê"?',
    tags: ['chỉnh sửa', 'đã cho thuê', 'quản lý tin', 'dashboard'],
    answer: (
      <div className="space-y-2.5 text-gray-700 leading-relaxed">
        <p>
          Bạn chỉ cần vào mục <Link to="/chu-tro/danh-sach-phong" className="text-green-700 font-semibold underline">Quản lý phòng trọ (Dashboard)</Link>:
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li><strong>Chỉnh sửa:</strong> Bấm vào biểu tượng 'Sửa' bên cạnh phòng để thay đổi giá thuê, số điện thoại hoặc tải thêm ảnh mới.</li>
          <li><strong>Đánh dấu đã thuê:</strong> Bật công tắc <em>'Đã cho thuê'</em> để tạm ẩn phòng khỏi kết quả tìm kiếm, giúp bạn không bị làm phiền bởi các cuộc gọi khi phòng đã kín người.</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'post-5',
    categoryId: 'post-listing',
    question: 'Quy định về ảnh chụp và video khi đăng phòng trên Trọ Xinh?',
    tags: ['quy định ảnh', 'video', 'chất lượng ảnh'],
    answer: (
      <div className="space-y-2 text-gray-700 leading-relaxed">
        <p>
          Để bài đăng đạt hiệu quả cao nhất và được duyệt ngay lập tức:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Kích thước ảnh khuyến nghị tối thiểu 800x600px, định dạng JPG, PNG hoặc WebP.</li>
          <li>Nên chụp ảnh phòng ban ngày có đủ ánh sáng tự nhiên.</li>
          <li>Chụp đủ các góc: Toàn cảnh phòng, giường ngủ, bàn làm việc, khu bếp, nhà vệ sinh và cửa sổ/ban công.</li>
        </ul>
      </div>
    ),
  },

  // 4. DỊCH VỤ TRẢ PHÍ
  {
    id: 'paid-1',
    categoryId: 'paid-services',
    question: 'Bảng giá và các gói dịch vụ dành cho Chủ trọ bao gồm những gì?',
    tags: ['bảng giá', 'gói vip', 'gói dịch vụ', 'chủ trọ'],
    answer: (
      <div className="space-y-3 text-gray-700 leading-relaxed">
        <p>
          Trọ Xinh cung cấp các gói dịch vụ linh hoạt giúp Chủ nhà và Quản lý tòa nhà tối ưu thời gian lấp đầy phòng trống:
        </p>
        <div className="space-y-2 text-sm">
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
            <span className="font-bold text-gray-900">1. Gói Miễn phí (Standard):</span> Đăng tin chuẩn, hiển thị theo thời gian đăng thông thường.
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-950">
            <span className="font-bold text-emerald-800">2. Gói VIP Nổi Bật (Pro / Premium):</span> Nhãn huy hiệu VIP vàng cam, ưu tiên vị trí Top đầu chuyên mục quận, tự động đẩy tin hàng ngày.
          </div>
          <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-blue-950">
            <span className="font-bold text-blue-800">3. Gói Đẩy Tin Lẻ (Boost 24h/7 ngày):</span> Đưa tin đăng lên vị trí đầu bảng ngay lập tức khi bạn cần cho thuê gấp trong tuần.
          </div>
        </div>
        <div className="pt-1">
          <Link to="/bang-gia" className="inline-flex items-center gap-1.5 text-xs font-bold text-green-700 hover:underline">
            Xem bảng giá chi tiết và ưu đãi mới nhất <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    ),
  },
  {
    id: 'paid-2',
    categoryId: 'paid-services',
    question: 'Những phương thức thanh toán nào được chấp nhận trên Trọ Xinh?',
    tags: ['thanh toán', 'qr', 'momo', 'vnpay', 'chuyển khoản'],
    answer: (
      <div className="space-y-2.5 text-gray-700 leading-relaxed">
        <p>Trọ Xinh hỗ trợ cổng thanh toán tự động đa kênh tiện lợi và an toàn tuyệt đối:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li><strong>Chuyển khoản Ngân hàng quét mã VietQR:</strong> Tự động nhận diện cú pháp giao dịch 24/7.</li>
          <li><strong>Ví điện tử MoMo:</strong> Thanh toán tức thì qua App MoMo trên điện thoại.</li>
          <li><strong>Cổng VNPAY / Thẻ ATM &amp; Visa/Mastercard:</strong> Đầy đủ chuẩn bảo mật ngân hàng Việt Nam.</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'paid-3',
    categoryId: 'paid-services',
    question: 'Sau khi thanh toán thành công, gói dịch vụ có được kích hoạt ngay lập tức không?',
    tags: ['kích hoạt', 'tự động', 'hóa đơn'],
    answer: (
      <div className="space-y-2 text-gray-700 leading-relaxed">
        <p>
          <strong>CÓ!</strong> Hệ thống của Trọ Xinh tích hợp Webhook tự động kiểm tra giao dịch. Ngay khi giao dịch chuyển khoản hoặc ví điện tử được ngân hàng báo có (thường từ 3 - 10 giây), gói VIP hoặc số lượt đẩy tin sẽ được kích hoạt tự động vào tài khoản của bạn.
        </p>
        <p className="text-xs text-gray-500">
          Bạn sẽ nhận được thông báo xác nhận và có thể tải biên lai thanh toán trong mục Lịch sử giao dịch.
        </p>
      </div>
    ),
  },
  {
    id: 'paid-4',
    categoryId: 'paid-services',
    question: 'Làm sao để yêu cầu xuất hóa đơn hoặc kiểm tra lịch sử nạp tiền?',
    tags: ['hóa đơn', 'vat', 'lịch sử thanh toán'],
    answer: (
      <div className="space-y-2 text-gray-700 leading-relaxed">
        <p>
          Bạn có thể xem lại danh sách tất cả các đơn hàng và biên lai giao dịch tại mục <strong>'Quản lý gói dịch vụ'</strong> trong trang cá nhân.
        </p>
        <p>
          Nếu quý doanh nghiệp/chủ tòa nhà có nhu cầu xuất hóa đơn điện tử (VAT), vui lòng liên hệ Hotline <a href="tel:0888110789" className="font-bold text-green-700">0888 110 789</a> hoặc gửi thông tin mã số thuế qua Zalo hỗ trợ để kế toán xử lý trong vòng 48h.
        </p>
      </div>
    ),
  },
  {
    id: 'paid-5',
    categoryId: 'paid-services',
    question: 'Chính sách hoàn tiền hoặc chuyển đổi gói dịch vụ như thế nào?',
    tags: ['hoàn tiền', 'đổi gói', 'chính sách'],
    answer: (
      <div className="space-y-2 text-gray-700 leading-relaxed">
        <p>
          Trọ Xinh cam kết hỗ trợ hoàn lại 100% số tiền giao dịch nếu phát sinh lỗi kỹ thuật từ hệ thống khiến dịch vụ không được kích hoạt thành công.
        </p>
        <p>
          Trường hợp bạn đã cho thuê được phòng sớm trước thời hạn gói VIP hết hạn, số ngày VIP còn lại có thể được chuyển đổi bảo lưu cho phòng trọ khác của bạn trong tương lai.
        </p>
      </div>
    ),
  },

  // 5. AN TOÀN
  {
    id: 'safe-1',
    categoryId: 'safety',
    question: 'Quy tắc vàng để tránh bẫy lừa đảo tiền cọc phòng trọ sinh viên?',
    tags: ['cảnh báo', 'lừa đảo', 'cọc phòng', 'sinh viên', 'an toàn'],
    answer: (
      <div className="space-y-3 text-gray-700 leading-relaxed">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-950 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong className="block mb-1 text-amber-900 font-bold">CẢNH BÁO QUAN TRỌNG:</strong>
            Tuyệt đối KHÔNG chuyển tiền đặt cọc giữ chỗ khi bạn chưa đến tận nơi xem phòng thực tế và chưa kiểm tra giấy tờ tùy thân của người nhận cọc.
          </div>
        </div>
        <p className="font-semibold text-gray-900">4 nguyên tắc phòng tránh lừa đảo:</p>
        <ol className="list-decimal pl-5 space-y-1.5 text-sm">
          <li><strong>Xem phòng trực tiếp:</strong> Đến tận địa chỉ phòng trọ vào ban ngày để kiểm tra thực tế nước máy, điện, an ninh và môi trường xung quanh.</li>
          <li><strong>Xác thực chủ nhà:</strong> Yêu cầu người nhận cọc xuất trình CCCD hoặc giấy tờ chứng minh quyền sở hữu/hợp đồng quản lý tòa nhà.</li>
          <li><strong>Lập Biên bản đặt cọc rõ ràng:</strong> Ghi rõ số tiền cọc, ngày nhận phòng, mức giá thuê niêm yết và điều kiện hoàn cọc nếu một trong hai bên vi phạm thỏa thuận.</li>
          <li><strong>Cảnh giác phòng giá rẻ bất thường:</strong> Đề phòng các tin đăng phòng chung cư cao cấp/studio đẹp như khách sạn nhưng giá chỉ 1.5 - 2 triệu và ép chuyển cọc giữ chỗ ngay vì "có người khác đang hỏi".</li>
        </ol>
      </div>
    ),
  },
  {
    id: 'safe-2',
    categoryId: 'safety',
    question: 'Hợp đồng mẫu và Biên bản đặt cọc của Trọ Xinh sử dụng như thế nào?',
    tags: ['hợp đồng mẫu', 'biên bản đặt cọc', 'pháp lý'],
    answer: (
      <div className="space-y-3 text-gray-700 leading-relaxed">
        <p>
          Trọ Xinh cung cấp sẵn các biểu mẫu pháp lý chuẩn chỉnh được cố vấn bởi luật sư, hoàn toàn miễn phí cho cả Người thuê và Chủ nhà:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <Link
            to="/bien-ban-dat-coc"
            className="p-3 rounded-xl border border-gray-200 bg-white hover:border-green-500 hover:shadow-xs transition group"
          >
            <div className="flex items-center gap-2 font-bold text-gray-900 group-hover:text-green-700 text-sm mb-1">
              <FileText className="w-4 h-4 text-green-600" />
              Biên bản giữ chỗ &amp; Đặt cọc
            </div>
            <p className="text-xs text-gray-500">Mẫu biên lai đặt cọc minh bạch, có điều khoản bảo vệ tiền cọc của sinh viên.</p>
          </Link>
          <Link
            to="/hop-dong-mau"
            className="p-3 rounded-xl border border-gray-200 bg-white hover:border-green-500 hover:shadow-xs transition group"
          >
            <div className="flex items-center gap-2 font-bold text-gray-900 group-hover:text-green-700 text-sm mb-1">
              <FileText className="w-4 h-4 text-green-600" />
              Hợp đồng thuê nhà trọ chuẩn
            </div>
            <p className="text-xs text-gray-500">Mẫu hợp đồng thuê phòng đầy đủ điều khoản tiền điện nước, nội thất &amp; PCCC.</p>
          </Link>
        </div>
      </div>
    ),
  },
  {
    id: 'safe-3',
    categoryId: 'safety',
    question: 'Làm sao khi phát hiện tin đăng ảo, số điện thoại mạo danh hoặc chủ trọ gian lận?',
    tags: ['báo cáo', 'report', 'tin ảo', 'khiếu nại'],
    answer: (
      <div className="space-y-2.5 text-gray-700 leading-relaxed">
        <p>
          Trọ Xinh có chính sách không khoan nhượng với bất kỳ hành vi lừa đảo hoặc thông tin gian lận nào:
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li><strong>Bấm nút 'Báo cáo tin đăng'</strong> ở góc phải trang chi tiết phòng để gửi khiếu nại kèm hình ảnh bằng chứng trực tiếp cho ban kiểm duyệt.</li>
          <li><strong>Gọi ngay Hotline khẩn cấp:</strong> <a href="tel:0888110789" className="font-bold text-green-700">0888 110 789</a> hoặc nhắn tin qua Zalo hỗ trợ.</li>
        </ul>
        <p className="text-xs text-gray-500">
          Ban quản trị sẽ xác minh trong vòng 30 phút. Nếu vi phạm, tài khoản lừa đảo sẽ bị khoá vĩnh viễn và địa chỉ IP sẽ bị chặn trên toàn hệ thống.
        </p>
      </div>
    ),
  },
  {
    id: 'safe-4',
    categoryId: 'safety',
    question: 'Trọ Xinh bảo mật thông tin cá nhân và dữ liệu liên hệ của tôi ra sao?',
    tags: ['bảo mật', 'quyền riêng tư', 'dữ liệu'],
    answer: (
      <div className="space-y-2 text-gray-700 leading-relaxed">
        <p>
          Chúng tôi tuân thủ nghiêm ngặt Chính sách bảo mật thông tin người dùng theo tiêu chuẩn an ninh dữ liệu:
        </p>
        <ul className="list-disc pl-5 space-y-1 text-sm">
          <li>Mật khẩu được mã hóa an toàn qua hạ tầng bảo mật quốc tế của Google Firebase.</li>
          <li>Số điện thoại cá nhân không bao giờ bị chia sẻ cho bên thứ ba vì mục đích quảng cáo rác (spam telesales).</li>
          <li>Bạn có quyền ẩn/hiện số điện thoại trên bài đăng bất kỳ lúc nào.</li>
        </ul>
        <div className="pt-1">
          <Link to="/privacy" className="text-xs text-green-700 font-semibold underline">
            Đọc toàn văn Chính sách bảo mật Trọ Xinh &rarr;
          </Link>
        </div>
      </div>
    ),
  },
  {
    id: 'safe-5',
    categoryId: 'safety',
    question: 'Tôi nên làm gì khi xảy ra tranh chấp tiền cọc hoặc mâu thuẫn hợp đồng?',
    tags: ['tranh chấp', 'mâu thuẫn', 'hỗ trợ pháp lý'],
    answer: (
      <div className="space-y-2.5 text-gray-700 leading-relaxed">
        <p>
          Khi xảy ra mâu thuẫn giữa Người thuê và Chủ nhà:
        </p>
        <ol className="list-decimal pl-5 space-y-1.5 text-sm">
          <li>Kiểm tra lại các điều khoản đã ký kết trong <em>Hợp đồng thuê phòng</em> hoặc <em>Biên bản đặt cọc</em>.</li>
          <li>Giữ lại toàn bộ tin nhắn Zalo, biên lai chuyển khoản ngân hàng và các trao đổi làm việc bằng chứng.</li>
          <li>Liên hệ đội ngũ chăm sóc khách hàng Trọ Xinh để được tư vấn hòa giải và cung cấp lại lịch sử bài đăng gốc phục vụ đối chiếu thông tin.</li>
        </ol>
      </div>
    ),
  },
];

const POPULAR_TAGS = [
  'Quên mật khẩu',
  'Đặt cọc an toàn',
  'Đăng tin cho thuê',
  'Bảng giá VIP',
  'Kiểm duyệt 24h',
  'Tìm bạn ở ghép',
  'Hợp đồng mẫu',
  'Báo cáo tin ảo',
];

export const HelpPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<Category['id']>('account');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({
    'acc-1': true, // default open first item
  });
  const [feedbackGiven, setFeedbackGiven] = useState<Record<string, 'yes' | 'no'>>({});

  // Filter FAQs based on active category & search query
  const filteredFaqs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      return FAQS.filter((item) => item.categoryId === selectedCategory);
    }
    return FAQS.filter((item) => {
      const matchQuestion = item.question.toLowerCase().includes(q);
      const matchTags = item.tags?.some((t) => t.toLowerCase().includes(q));
      return matchQuestion || matchTags;
    });
  }, [searchQuery, selectedCategory]);

  const activeCategoryObj = CATEGORIES.find((c) => c.id === selectedCategory) || CATEGORIES[0];

  const toggleAccordion = (id: string) => {
    setExpandedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const expandAll = () => {
    const next: Record<string, boolean> = {};
    filteredFaqs.forEach((faq) => {
      next[faq.id] = true;
    });
    setExpandedIds(next);
  };

  const collapseAll = () => {
    setExpandedIds({});
  };

  const handleFeedback = (faqId: string, type: 'yes' | 'no') => {
    setFeedbackGiven((prev) => ({ ...prev, [faqId]: type }));
  };

  const handleSelectQuickTag = (tag: string) => {
    setSearchQuery(tag);
  };

  return (
    <div className="min-h-screen bg-gray-50/70">
      <SEOHead
        title="Trung Tâm Trợ Giúp & FAQ – Trọ Xinh"
        description="Giải đáp mọi thắc mắc về tài khoản, tìm phòng trọ, đăng tin cho thuê, dịch vụ VIP và an toàn đặt cọc trên Trọ Xinh Hà Nội."
        url="/help"
      />

      {/* Hero Header & Search Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#005a2d] to-[#006d37] text-white pt-12 pb-16 px-4 sm:px-6 lg:px-8 shadow-sm">
        {/* Background decorative circles */}
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 translate-y-16 -translate-x-16 w-80 h-80 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white/10 backdrop-blur-md rounded-full text-xs font-semibold text-emerald-100 border border-white/15">
            <HelpCircle className="w-4 h-4 text-emerald-300" />
            <span>Trung Tâm Trợ Giúp &amp; Giải Đáp Thắc Mắc 24/7</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-tight">
            Chúng tôi có thể giúp gì cho bạn?
          </h1>
          <p className="text-sm sm:text-base text-emerald-100/90 max-w-2xl mx-auto leading-relaxed">
            Tìm câu trả lời nhanh chóng về cách tìm phòng, đăng tin cho thuê, quy trình kiểm duyệt uy tín và các gói dịch vụ tại Trọ Xinh.
          </p>

          {/* Prominent Search Bar */}
          <div className="max-w-2xl mx-auto pt-2">
            <div className="relative flex items-center bg-white rounded-2xl shadow-xl shadow-emerald-950/20 p-1.5 focus-within:ring-4 focus-within:ring-emerald-400/40 transition">
              <div className="pl-4 pr-2 text-gray-400">
                <Search className="w-5 h-5 text-gray-500" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Bạn cần Trọ Xinh hỗ trợ vấn đề gì?"
                className="w-full py-3.5 pr-10 text-gray-900 text-sm sm:text-base placeholder-gray-400 bg-transparent focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition mr-1"
                  title="Xóa tìm kiếm"
                  aria-label="Xóa tìm kiếm"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Popular search quick tags */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mt-4 text-xs">
              <span className="text-emerald-200 font-medium">Gợi ý tìm kiếm:</span>
              {POPULAR_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleSelectQuickTag(tag)}
                  className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg border border-white/15 transition backdrop-blur-xs text-[11px] sm:text-xs"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* If searching, show search result indicator */}
        {searchQuery && (
          <div className="mb-8 p-4 bg-white rounded-2xl border border-gray-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm text-gray-600">
                Kết quả tìm kiếm cho: <span className="font-bold text-gray-900">"{searchQuery}"</span>
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Tìm thấy <strong>{filteredFaqs.length}</strong> câu hỏi phù hợp trên toàn bộ hệ thống
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-xs font-semibold text-green-700 hover:underline flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" /> Xóa bộ lọc tìm kiếm
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Categories List (Desktop Sidebar & Mobile Pills) */}
          <aside className="lg:col-span-4 lg:sticky lg:top-24 space-y-4">
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-3 sm:p-4">
              <div className="px-3 py-2 mb-2 hidden lg:block">
                <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Danh mục chủ đề
                </h2>
              </div>

              {/* Category Buttons List */}
              <nav className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 scrollbar-none" aria-label="Danh mục câu hỏi">
                {CATEGORIES.map((category) => {
                  const Icon = category.icon;
                  const isSelected = selectedCategory === category.id && !searchQuery;
                  const count = FAQS.filter((f) => f.categoryId === category.id).length;

                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(category.id);
                        if (searchQuery) setSearchQuery('');
                      }}
                      className={`flex-shrink-0 lg:flex-shrink w-auto lg:w-full flex items-center justify-between p-3 rounded-xl text-left transition ${
                        isSelected
                          ? 'bg-green-50 text-green-900 font-bold border border-green-200/80 shadow-xs'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition ${
                            isSelected
                              ? 'bg-green-600 text-white shadow-xs'
                              : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold leading-tight">{category.name}</div>
                          <p className="text-[11px] text-gray-500 font-normal hidden lg:block mt-0.5 line-clamp-1">
                            {category.description}
                          </p>
                        </div>
                      </div>

                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-semibold ml-2 ${
                          isSelected
                            ? 'bg-green-200/60 text-green-800'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Quick Helper Card in Sidebar */}
            <div className="hidden lg:block bg-gradient-to-br from-emerald-50 to-teal-50/50 rounded-2xl border border-emerald-100/80 p-5 text-emerald-950">
              <div className="flex items-center gap-2.5 mb-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-emerald-950">Cam kết Trọ Xinh</h3>
              </div>
              <p className="text-xs text-emerald-900/80 leading-relaxed mb-3">
                100% phòng trọ được xác minh ảnh chụp thực tế, minh bạch giá cả và hỗ trợ giải quyết tranh cọc cho sinh viên.
              </p>
              <Link
                to="/ve-chung-toi/kiem-duyet"
                className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 hover:underline"
              >
                Tìm hiểu quy trình kiểm duyệt &rarr;
              </Link>
            </div>
          </aside>

          {/* Right Column: FAQ Accordion List */}
          <section className="lg:col-span-8 space-y-4">
            {/* Category Header (when not searching) */}
            {!searchQuery && (
              <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-green-100 text-green-700 flex items-center justify-center shrink-0">
                    <activeCategoryObj.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold text-gray-900">{activeCategoryObj.name}</h2>
                    <p className="text-xs text-gray-500 mt-0.5">{activeCategoryObj.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={expandAll}
                    className="text-xs font-semibold px-2.5 py-1 text-gray-600 hover:text-green-700 hover:bg-gray-100 rounded-lg transition"
                  >
                    Mở tất cả
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={collapseAll}
                    className="text-xs font-semibold px-2.5 py-1 text-gray-600 hover:text-green-700 hover:bg-gray-100 rounded-lg transition"
                  >
                    Thu gọn
                  </button>
                </div>
              </div>
            )}

            {/* Accordion Questions List */}
            {filteredFaqs.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200/80 p-12 text-center shadow-xs">
                <div className="w-14 h-14 bg-gray-100 text-gray-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <HelpCircle className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-1">
                  Không tìm thấy câu trả lời phù hợp
                </h3>
                <p className="text-xs text-gray-500 max-w-md mx-auto mb-5 leading-relaxed">
                  Rất tiếc từ khóa "{searchQuery}" không khớp với câu hỏi nào trong trung tâm trợ giúp. Bạn có thể liên hệ trực tiếp với đội ngũ hỗ trợ để được giải đáp ngay.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-xl text-xs transition"
                  >
                    Xóa tìm kiếm
                  </button>
                  <a
                    href="https://zalo.me/0888110789"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl text-xs transition inline-flex items-center gap-1.5"
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> Chat Zalo hỗ trợ
                  </a>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredFaqs.map((faq, index) => {
                  const isOpen = !!expandedIds[faq.id];
                  const feedback = feedbackGiven[faq.id];
                  const categoryInfo = CATEGORIES.find((c) => c.id === faq.categoryId);

                  return (
                    <article
                      key={faq.id}
                      className={`bg-white rounded-2xl border transition overflow-hidden ${
                        isOpen
                          ? 'border-green-300 shadow-xs ring-1 ring-green-100'
                          : 'border-gray-200/80 hover:border-gray-300 shadow-2xs'
                      }`}
                    >
                      {/* Accordion Trigger Header */}
                      <button
                        type="button"
                        onClick={() => toggleAccordion(faq.id)}
                        className="w-full text-left p-4 sm:p-5 flex items-start justify-between gap-4 focus:outline-none cursor-pointer select-none"
                        aria-expanded={isOpen}
                      >
                        <div className="space-y-1 pr-2">
                          {searchQuery && categoryInfo && (
                            <span className="inline-block px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 text-[10px] font-semibold mb-1">
                              {categoryInfo.name}
                            </span>
                          )}
                          <h3
                            className={`text-sm sm:text-base font-bold leading-snug transition-colors ${
                              isOpen ? 'text-green-800' : 'text-gray-900 hover:text-green-700'
                            }`}
                          >
                            <span className="text-gray-400 font-medium mr-2">
                              {String(index + 1).padStart(2, '0')}.
                            </span>
                            {faq.question}
                          </h3>
                        </div>

                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-transform duration-200 ${
                            isOpen ? 'bg-green-100 text-green-700 rotate-180' : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          <ChevronDown className="w-4 h-4" />
                        </div>
                      </button>

                      {/* Accordion Expandable Answer Body */}
                      {isOpen && (
                        <div className="px-4 sm:px-5 pb-5 pt-1 text-sm border-t border-gray-100 bg-gray-50/40">
                          <div className="pt-3">{faq.answer}</div>

                          {/* Was this helpful feedback micro-interaction */}
                          <div className="mt-5 pt-4 border-t border-gray-200/70 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
                            <span>Câu trả lời này có hữu ích với bạn không?</span>

                            {feedback ? (
                              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Cảm ơn bạn đã phản hồi!
                              </span>
                            ) : (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleFeedback(faq.id, 'yes')}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-gray-200 rounded-lg hover:border-green-500 hover:text-green-700 transition"
                                >
                                  <ThumbsUp className="w-3.5 h-3.5" /> Có, hữu ích
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleFeedback(faq.id, 'no')}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-gray-200 rounded-lg hover:border-gray-400 hover:text-gray-800 transition"
                                >
                                  <ThumbsDown className="w-3.5 h-3.5" /> Chưa rõ
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Bottom Support CTA Section (Cần hỗ trợ thêm?) */}
        <section className="mt-14 bg-gradient-to-r from-emerald-900 via-[#006d37] to-emerald-800 rounded-3xl p-6 sm:p-10 text-white shadow-xl shadow-emerald-950/15 relative overflow-hidden">
          {/* Background shapes */}
          <div className="absolute right-0 top-0 w-80 h-80 bg-white/5 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center lg:text-left max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-semibold text-emerald-200">
                <Clock className="w-3.5 h-3.5" />
                <span>Hỗ trợ trực tuyến: 8:00 – 21:00 hàng ngày</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                Bạn vẫn cần hỗ trợ thêm từ Trọ Xinh?
              </h2>
              <p className="text-sm text-emerald-100 leading-relaxed">
                Đội ngũ chăm sóc khách hàng luôn sẵn sàng đồng hành, tư vấn tìm phòng và hỗ trợ chủ trọ giải quyết mọi thắc mắc kỹ thuật.
              </p>
            </div>

            {/* Action Buttons using specified bg-green-600 CTA */}
            <div className="flex flex-col sm:flex-row items-center gap-3.5 w-full sm:w-auto">
              <a
                href="tel:0888110789"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 bg-white text-emerald-900 hover:bg-emerald-50 font-bold rounded-2xl shadow-md transition transform active:scale-95 text-sm"
              >
                <Phone className="w-4 h-4 text-green-600" />
                <span>Gọi Hotline: 0888 110 789</span>
              </a>

              <a
                href="https://zalo.me/0888110789"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 bg-green-600 hover:bg-green-500 text-white font-bold rounded-2xl shadow-md transition transform active:scale-95 text-sm border border-emerald-400/40"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Chat Zalo 0888 110 789</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Floating Bottom-Right Quick Support Trigger (always accessible) */}
      <aside className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-40" aria-label="Hỗ trợ nhanh">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-gray-200/80 p-2.5 flex items-center gap-2">
          <div className="hidden sm:block text-left px-2">
            <div className="text-[11px] font-bold text-gray-900 leading-tight">Cần hỗ trợ gấp?</div>
            <div className="text-[10px] text-gray-500">08:00 – 21:00</div>
          </div>

          <a
            href="tel:0888110789"
            className="p-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl shadow-xs transition flex items-center justify-center"
            title="Gọi Hotline 0888 110 789"
            aria-label="Gọi Hotline 0888 110 789"
          >
            <Phone className="w-4 h-4" />
          </a>

          <a
            href="https://zalo.me/0888110789"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition flex items-center justify-center"
            title="Chat Zalo 0888 110 789"
            aria-label="Chat Zalo 0888 110 789"
          >
            <MessageCircle className="w-4 h-4" />
          </a>
        </div>
      </aside>
    </div>
  );
};
