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
  Coins,
  Lock,
} from 'lucide-react';
import { SEOHead } from '../components/seo/SEOHead';

interface FAQItem {
  id: string;
  categoryId: 'account' | 'post-listing' | 'find-room' | 'safety' | 'paid-services';
  question: string;
  answer: React.ReactNode;
  tags?: string[];
}

interface Category {
  id: 'account' | 'post-listing' | 'find-room' | 'safety' | 'paid-services';
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const CATEGORIES: Category[] = [
  {
    id: 'account',
    name: 'Về Tài khoản',
    description: 'Đăng ký, đăng nhập, Trọ Xinh Xu & bảo mật hồ sơ',
    icon: User,
  },
  {
    id: 'post-listing',
    name: 'Về Đăng tin',
    description: 'Đăng phòng cho thuê, tiêu chuẩn duyệt 24h & quản lý tin',
    icon: Home,
  },
  {
    id: 'find-room',
    name: 'Về Thuê phòng',
    description: 'Tìm kiếm, đặt lịch hẹn, xem phòng & ở ghép',
    icon: SearchIcon,
  },
  {
    id: 'safety',
    name: 'An toàn & Khiếu nại',
    description: 'Báo cáo lừa đảo, cọc an toàn, hợp đồng mẫu & giải quyết tranh chấp',
    icon: ShieldCheck,
  },
  {
    id: 'paid-services',
    name: 'Dịch vụ trả phí',
    description: 'Gói VIP, đẩy tin Boost, thanh toán tự động & hóa đơn',
    icon: CreditCard,
  },
];

const FAQS: FAQItem[] = [
  // 1. VỀ TÀI KHOẢN
  {
    id: 'acc-1',
    categoryId: 'account',
    question: 'Làm thế nào để đăng ký và đăng nhập tài khoản Trọ Xinh?',
    tags: ['đăng ký', 'đăng nhập', 'tài khoản', 'google', 'otp'],
    answer: (
      <div className="space-y-3 text-gray-700 leading-relaxed text-sm">
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
    question: 'Trọ Xinh Xu là gì và cách sử dụng điểm thưởng ra sao?',
    tags: ['trọ xinh xu', 'xu', 'điểm thưởng', 'boost', 'voucher'],
    answer: (
      <div className="space-y-3 text-gray-700 leading-relaxed text-sm">
        <p>
          <strong>Trọ Xinh Xu</strong> là đơn vị điểm thưởng tích lũy dành riêng cho thành viên tích cực trên hệ sinh thái Trọ Xinh:
        </p>
        <div className="space-y-2">
          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-amber-950">
            <span className="font-bold text-amber-900 block mb-1 flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-amber-600" /> Cách tích lũy Trọ Xinh Xu:
            </span>
            <ul className="list-disc pl-5 space-y-1 text-xs">
              <li>Đăng ký và hoàn thiện hồ sơ cá nhân (+50 Xu).</li>
              <li>Xác thực danh tính CCCD hoặc số điện thoại (+100 Xu).</li>
              <li>Đánh giá trải nghiệm xem phòng thực tế (+20 Xu/lượt).</li>
              <li>Giới thiệu bạn bè đăng tin hoặc thuê phòng thành công (+50 Xu).</li>
            </ul>
          </div>
          <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-emerald-950">
            <span className="font-bold text-emerald-900 block mb-1">Quyền lợi khi dùng Trọ Xinh Xu:</span>
            <ul className="list-disc pl-5 space-y-1 text-xs">
              <li>Đổi lượt Đẩy tin (Boost) miễn phí để đưa bài viết lên đầu trang.</li>
              <li>Trừ trực tiếp vào hóa đơn khi nâng cấp các gói VIP Chủ trọ.</li>
              <li>Đổi các mã giảm giá dịch vụ chuyển nhà sinh viên trọn gói.</li>
            </ul>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'acc-3',
    categoryId: 'account',
    question: 'Tôi bị quên mật khẩu hoặc không nhận được mã OTP thì phải làm sao?',
    tags: ['quên mật khẩu', 'otp', 'đổi mật khẩu', 'khôi phục'],
    answer: (
      <div className="space-y-3 text-gray-700 leading-relaxed text-sm">
        <p>Để lấy lại mật khẩu tài khoản Trọ Xinh:</p>
        <ol className="list-decimal pl-5 space-y-1.5">
          <li>Truy cập trang đăng nhập và chọn liên kết <Link to="/quen-mat-khau" className="text-green-700 font-semibold underline">Quên mật khẩu?</Link></li>
          <li>Nhập chính xác địa chỉ Email bạn đã dùng khi đăng ký.</li>
          <li>Kiểm tra hộp thư đến (hoặc thư mục Spam/Quảng cáo) để nhận đường link tạo lại mật khẩu mới.</li>
        </ol>
        <p className="text-xs text-gray-500">
          Nếu không nhận được OTP qua SMS hoặc email sau 2 phút, vui lòng gọi Hotline <a href="tel:0888110789" className="font-bold text-green-700">0888 110 789</a> để được hỗ trợ xác minh thủ công.
        </p>
      </div>
    ),
  },
  {
    id: 'acc-4',
    categoryId: 'account',
    question: 'Xác thực danh tính (Trust Verification) có lợi ích gì?',
    tags: ['xác thực', 'trust', 'cccd', 'uy tín'],
    answer: (
      <div className="space-y-3 text-gray-700 leading-relaxed text-sm">
        <p>
          Huy hiệu <strong>'Đã xác thực danh tính'</strong> giúp nâng cao uy tín cho cả Người thuê và Chủ trọ:
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

  // 2. VỀ ĐĂNG TIN
  {
    id: 'post-1',
    categoryId: 'post-listing',
    question: 'Làm sao để đăng tin cho thuê phòng trọ trên Trọ Xinh?',
    tags: ['làm sao để đăng tin', 'đăng tin', 'chủ nhà', 'tạo phòng'],
    answer: (
      <div className="space-y-3 text-gray-700 leading-relaxed text-sm">
        <p>Để đăng tin cho thuê phòng trọ mới, bạn chỉ cần thực hiện 4 bước:</p>
        <ol className="list-decimal pl-5 space-y-2">
          <li>
            Đăng nhập tài khoản và bấm vào nút <strong>'Đăng tin cho thuê'</strong> ở góc phải trên cùng của thanh điều hướng.
          </li>
          <li>
            Điền đầy đủ thông tin: Tên tòa nhà/ngõ ngách, địa chỉ cụ thể, diện tích (m²), giá thuê niêm yết (VNĐ/tháng) và số tiền đặt cọc.
          </li>
          <li>
            Tải lên từ 3 - 6 hình ảnh thực tế (ảnh chụp ban ngày, rõ nét khu vực giường ngủ, nhà vệ sinh, ban công, chỗ để xe).
          </li>
          <li>
            Chọn các tiện ích sẵn có (điều hòa, nóng lạnh, máy giặt, thang máy, PCCC...) và bấm <strong>'Gửi duyệt tin'</strong>.
          </li>
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
      <div className="space-y-2 text-gray-700 leading-relaxed text-sm">
        <p>
          Đội ngũ kiểm duyệt viên Trọ Xinh làm việc từ <strong>8:00 đến 21:00 hàng ngày</strong> (kể cả Thứ 7 và Chủ Nhật).
        </p>
        <p>
          Thời gian xử lý và duyệt tin thông thường từ <strong>15 phút đến 2 giờ</strong>. Bạn sẽ nhận được thông báo đẩy và email ngay khi bài đăng được phê duyệt và hiển thị công khai trên hệ thống.
        </p>
      </div>
    ),
  },
  {
    id: 'post-3',
    categoryId: 'post-listing',
    question: 'Những lý do nào khiến tin đăng phòng bị từ chối duyệt?',
    tags: ['từ chối tin', 'lỗi đăng tin', 'quy định', 'ảnh ảo'],
    answer: (
      <div className="space-y-2 text-gray-700 leading-relaxed text-sm">
        <p>Tin đăng có thể bị từ chối hoặc yêu cầu chỉnh sửa nếu vi phạm các điều sau:</p>
        <ul className="list-disc pl-5 space-y-1 text-xs text-gray-600">
          <li>Hình ảnh mờ, chèn số điện thoại che kín phòng hoặc sử dụng ảnh đồ họa 3D không có thực.</li>
          <li>Giá phòng để '1.000đ' hoặc không đúng giá thực tế khi liên hệ.</li>
          <li>Địa chỉ không có thật hoặc cố tình chọn sai quận huyện để câu view.</li>
          <li>Đăng trùng lặp nhiều bài viết cho cùng 1 phòng trọ.</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'post-4',
    categoryId: 'post-listing',
    question: 'Làm sao để chỉnh sửa thông tin hoặc đánh dấu "Đã cho thuê"?',
    tags: ['chỉnh sửa', 'đã cho thuê', 'quản lý tin', 'dashboard'],
    answer: (
      <div className="space-y-2.5 text-gray-700 leading-relaxed text-sm">
        <p>
          Bạn chỉ cần vào mục <Link to="/chu-tro/danh-sach-phong" className="text-green-700 font-semibold underline">Quản lý phòng trọ (Dashboard)</Link>:
        </p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li><strong>Chỉnh sửa:</strong> Bấm vào biểu tượng 'Sửa' bên cạnh phòng để thay đổi giá thuê, mô tả hoặc cập nhật ảnh mới.</li>
          <li><strong>Đánh dấu đã thuê:</strong> Bật công tắc <em>'Đã cho thuê'</em> để tạm ẩn phòng khỏi kết quả tìm kiếm, tránh bị làm phiền khi phòng đã có người ở.</li>
        </ul>
      </div>
    ),
  },

  // 3. VỀ THUÊ PHÒNG
  {
    id: 'find-1',
    categoryId: 'find-room',
    question: 'Làm thế nào để tìm phòng trọ gần trường đại học hoặc quận huyện mong muốn?',
    tags: ['tìm phòng', 'quận huyện', 'trường đại học', 'bản đồ', 'bộ lọc'],
    answer: (
      <div className="space-y-3 text-gray-700 leading-relaxed text-sm">
        <p>Trọ Xinh cung cấp các công cụ tìm kiếm cực kỳ linh hoạt:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li><strong>Tìm theo trường:</strong> Gõ tên trường Đại học (Bách Khoa, Quốc Gia, Kinh Tế Quốc Dân, Ngoại Thương, FPT...) tại thanh tìm kiếm trên trang chủ để thấy các phòng trong bán kính 1 - 3km.</li>
          <li><strong>Bộ lọc nâng cao (<Link to="/tim-kiem" className="text-green-700 font-semibold underline">/tim-kiem</Link>):</strong> Lọc theo khoảng giá, loại phòng (khép kín, CCMN, studio, gác xép), tiện ích PCCC và không chung chủ.</li>
          <li><strong>Xem trên bản đồ (<Link to="/ban-do" className="text-green-700 font-semibold underline">/ban-do</Link>):</strong> Hiển thị vị trí phòng trực quan theo từng khu vực phố phường Hà Nội.</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'find-2',
    categoryId: 'find-room',
    question: 'Người tìm phòng có phải trả bất kỳ khoản phí môi giới nào không?',
    tags: ['phí môi giới', 'miễn phí', 'người thuê'],
    answer: (
      <div className="space-y-2 text-gray-700 leading-relaxed text-sm">
        <p className="font-semibold text-emerald-800">
          KHÔNG! Trọ Xinh cam kết 100% MIỄN PHÍ đối với người tìm phòng và sinh viên.
        </p>
        <p>
          Bạn được tự do tìm kiếm, xem số điện thoại chính chủ, nhắn tin Zalo, gọi điện và đặt lịch hẹn xem phòng mà không mất bất kỳ khoản phí môi giới hay tiền dẫn đường nào.
        </p>
      </div>
    ),
  },
  {
    id: 'find-3',
    categoryId: 'find-room',
    question: 'Làm sao để liên hệ với chủ trọ hoặc đặt lịch hẹn xem phòng?',
    tags: ['liên hệ chủ trọ', 'đặt lịch', 'zalo', 'gọi điện'],
    answer: (
      <div className="space-y-2.5 text-gray-700 leading-relaxed text-sm">
        <p>Tại trang chi tiết của mỗi phòng trọ, bạn có 3 cách kết nối tức thì:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li><strong>Gọi điện trực tiếp:</strong> Bấm nút <em>'Gọi ngay'</em> để kết nối điện thoại với chủ nhà.</li>
          <li><strong>Nhắn tin Zalo:</strong> Bấm <em>'Nhắn Zalo'</em> để mở khung trò chuyện Zalo kèm thông tin phòng bạn đang quan tâm.</li>
          <li><strong>Đặt lịch xem phòng:</strong> Chọn ngày và khung giờ bạn muốn đến xem để hệ thống tự động gửi thông báo lịch hẹn tới chủ trọ.</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'find-4',
    categoryId: 'find-room',
    question: 'Tìm bạn ở ghép (Roommate) và Chợ đồ cũ sinh viên hoạt động thế nào?',
    tags: ['ở ghép', 'roommate', 'chợ đồ cũ', 'sinh viên'],
    answer: (
      <div className="space-y-2.5 text-gray-700 leading-relaxed text-sm">
        <p>
          <strong>1. Tìm bạn ở ghép (<Link to="/tim-ban-cung-phong" className="text-green-700 underline font-medium">/tim-ban-cung-phong</Link>):</strong> Đăng tin tìm người ở cùng hoặc duyệt hồ sơ bạn cùng phòng theo trường đại học, tính cách, thói quen sinh hoạt và ngân sách chia tiền phòng.
        </p>
        <p>
          <strong>2. Chợ đồ cũ sinh viên (<Link to="/cho-do-cu" className="text-green-700 underline font-medium">/cho-do-cu</Link>):</strong> Nơi thanh lý hoặc mua lại bàn học, tủ lạnh mini, đệm, bếp từ, quạt điện giá rẻ giữa các bạn sinh viên.
        </p>
      </div>
    ),
  },

  // 4. AN TOÀN & KHIẾU NẠI
  {
    id: 'safe-1',
    categoryId: 'safety',
    question: 'Báo cáo tin lừa đảo hoặc số điện thoại mạo danh như thế nào?',
    tags: ['báo cáo tin lừa đảo như thế nào', 'báo cáo', 'tin ảo', 'khiếu nại'],
    answer: (
      <div className="space-y-3 text-gray-700 leading-relaxed text-sm">
        <p>
          Khi phát hiện bất kỳ dấu hiệu lừa đảo, tin đăng ảo hoặc số điện thoại môi giới trá hình, bạn có thể thực hiện 2 cách sau:
        </p>
        <ol className="list-decimal pl-5 space-y-1.5">
          <li><strong>Báo cáo trực tiếp trên bài đăng:</strong> Bấm vào nút <em>'Báo cáo tin đăng'</em> (biểu tượng cờ báo cáo) tại trang chi tiết phòng, chọn lý do và đính kèm ảnh chụp tin nhắn bằng chứng.</li>
          <li><strong>Liên hệ khẩn cấp:</strong> Gọi Hotline trực tiếp <a href="tel:0888110789" className="font-bold text-green-700">0888 110 789</a> hoặc gửi phản ánh qua Zalo hỗ trợ.</li>
        </ol>
        <p className="text-xs text-gray-500">
          Ban kiểm duyệt sẽ xác minh trong vòng 30 phút và hạ vĩnh viễn bài đăng vi phạm, đồng thời khóa tài khoản và chặn số điện thoại đối tượng gian lận.
        </p>
      </div>
    ),
  },
  {
    id: 'safe-2',
    categoryId: 'safety',
    question: 'Quy tắc vàng để tránh bẫy lừa đảo tiền cọc phòng trọ sinh viên?',
    tags: ['cảnh báo', 'lừa đảo', 'cọc phòng', 'sinh viên', 'an toàn'],
    answer: (
      <div className="space-y-3 text-gray-700 leading-relaxed text-sm">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-950 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong className="block mb-0.5 text-amber-900 font-bold">CẢNH BÁO QUAN TRỌNG:</strong>
            Tuyệt đối KHÔNG chuyển tiền đặt cọc giữ chỗ khi bạn chưa đến tận nơi xem phòng thực tế và chưa kiểm tra giấy tờ tùy thân của người nhận cọc.
          </div>
        </div>
        <ul className="list-disc pl-5 space-y-1 text-xs">
          <li><strong>Xem phòng ban ngày:</strong> Kiểm tra thực tế áp lực nước máy, công tơ điện, an ninh và lối thoát hiểm.</li>
          <li><strong>Lập Biên bản đặt cọc rõ ràng:</strong> Luôn ký giấy biên bản có ghi rõ số tiền, ngày nhận phòng và điều khoản hoàn cọc nếu vi phạm.</li>
          <li><strong>Cảnh giác phòng giá rẻ bất thường:</strong> Cẩn trọng trước các tin đăng phòng cao cấp đẹp như khách sạn nhưng giá chỉ 1.5 - 2 triệu và giục chuyển tiền gấp vì "đang có người khác hỏi".</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'safe-3',
    categoryId: 'safety',
    question: 'Hợp đồng mẫu và Biên bản đặt cọc của Trọ Xinh sử dụng như thế nào?',
    tags: ['hợp đồng mẫu', 'biên bản đặt cọc', 'pháp lý'],
    answer: (
      <div className="space-y-3 text-gray-700 leading-relaxed text-sm">
        <p>
          Trọ Xinh cung cấp sẵn các biểu mẫu pháp lý chuẩn chỉnh được tư vấn bởi luật sư, hoàn toàn miễn phí cho cả Người thuê và Chủ nhà:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <Link
            to="/bien-ban-dat-coc"
            className="p-3 rounded-xl border border-gray-200 bg-white hover:border-green-500 hover:shadow-xs transition group"
          >
            <div className="flex items-center gap-2 font-bold text-gray-900 group-hover:text-green-700 text-xs mb-1">
              <FileText className="w-4 h-4 text-green-600" />
              Biên bản giữ chỗ &amp; Đặt cọc
            </div>
            <p className="text-[11px] text-gray-500">Mẫu biên lai đặt cọc minh bạch, bảo vệ tiền cọc của sinh viên.</p>
          </Link>
          <Link
            to="/hop-dong-mau"
            className="p-3 rounded-xl border border-gray-200 bg-white hover:border-green-500 hover:shadow-xs transition group"
          >
            <div className="flex items-center gap-2 font-bold text-gray-900 group-hover:text-green-700 text-xs mb-1">
              <FileText className="w-4 h-4 text-green-600" />
              Hợp đồng thuê nhà trọ chuẩn
            </div>
            <p className="text-[11px] text-gray-500">Mẫu hợp đồng đầy đủ điều khoản tiền điện nước, nội thất &amp; PCCC.</p>
          </Link>
        </div>
      </div>
    ),
  },
  {
    id: 'safe-4',
    categoryId: 'safety',
    question: 'Trọ Xinh bảo mật thông tin cá nhân và số điện thoại của tôi ra sao?',
    tags: ['bảo mật', 'quyền riêng tư', 'dữ liệu'],
    answer: (
      <div className="space-y-2 text-gray-700 leading-relaxed text-sm">
        <p>
          Chúng tôi tuân thủ nghiêm ngặt Chính sách bảo mật thông tin người dùng theo tiêu chuẩn an ninh dữ liệu:
        </p>
        <ul className="list-disc pl-5 space-y-1 text-xs text-gray-600">
          <li>Mật khẩu và dữ liệu xác thực được mã hóa trên nền tảng bảo mật của Google Firebase.</li>
          <li>Số điện thoại cá nhân không bao giờ bị bán cho bên thứ ba vì mục đích quảng cáo rác (spam telesales).</li>
          <li>Bạn có quyền ẩn/hiện số điện thoại trên bài đăng bất kỳ lúc nào tại mục Cài đặt hồ sơ.</li>
        </ul>
      </div>
    ),
  },

  // 5. DỊCH VỤ TRẢ PHÍ
  {
    id: 'paid-1',
    categoryId: 'paid-services',
    question: 'Bảng giá và các gói dịch vụ dành cho Chủ trọ bao gồm những gì?',
    tags: ['bảng giá', 'gói vip', 'gói dịch vụ', 'chủ trọ'],
    answer: (
      <div className="space-y-3 text-gray-700 leading-relaxed text-sm">
        <p>
          Trọ Xinh cung cấp các gói dịch vụ linh hoạt giúp Chủ nhà và Quản lý tòa nhà tối ưu thời gian lấp đầy phòng trống:
        </p>
        <div className="space-y-2 text-xs">
          <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-200">
            <span className="font-bold text-gray-900">1. Gói Miễn phí (Standard):</span> Đăng tin chuẩn, hiển thị theo thời gian đăng thông thường.
          </div>
          <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-950">
            <span className="font-bold text-emerald-800">2. Gói VIP Nổi Bật (Pro / Premium):</span> Nhãn huy hiệu VIP vàng cam, ưu tiên vị trí Top đầu chuyên mục quận, tự động đẩy tin hàng ngày.
          </div>
          <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-200 text-blue-950">
            <span className="font-bold text-blue-800">3. Gói Đẩy Tin Lẻ (Boost):</span> Đưa tin đăng lên vị trí đầu bảng ngay lập tức khi bạn cần cho thuê gấp trong tuần.
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
      <div className="space-y-2.5 text-gray-700 leading-relaxed text-sm">
        <p>Trọ Xinh hỗ trợ cổng thanh toán tự động đa kênh tiện lợi và an toàn:</p>
        <ul className="list-disc pl-5 space-y-1.5">
          <li><strong>Chuyển khoản VietQR:</strong> Quét mã QR chuyển khoản ngân hàng, nhận diện cú pháp tự động 24/7.</li>
          <li><strong>Ví điện tử MoMo:</strong> Thanh toán tức thì qua App MoMo trên điện thoại.</li>
          <li><strong>Cổng VNPAY / Thẻ ATM &amp; Visa/Mastercard:</strong> Đầy đủ chuẩn bảo mật ngân hàng Việt Nam.</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'paid-3',
    categoryId: 'paid-services',
    question: 'Sau khi thanh toán thành công, gói dịch vụ có được kích hoạt ngay không?',
    tags: ['kích hoạt', 'tự động', 'hóa đơn'],
    answer: (
      <div className="space-y-2 text-gray-700 leading-relaxed text-sm">
        <p>
          <strong>CÓ!</strong> Hệ thống Webhook tự động kiểm tra giao dịch của Trọ Xinh sẽ kích hoạt gói VIP hoặc lượt đẩy tin ngay sau khi ngân hàng xác nhận nhận tiền (thường chỉ mất từ 3 - 10 giây).
        </p>
        <p className="text-xs text-gray-500">
          Bạn sẽ nhận được thông báo xác nhận và có thể xem biên lai giao dịch trong mục Quản lý gói dịch vụ.
        </p>
      </div>
    ),
  },
  {
    id: 'paid-4',
    categoryId: 'paid-services',
    question: 'Làm sao để yêu cầu xuất hóa đơn điện tử hoặc hoàn tiền khi xảy ra lỗi?',
    tags: ['hóa đơn', 'vat', 'hoàn tiền'],
    answer: (
      <div className="space-y-2 text-gray-700 leading-relaxed text-sm">
        <p>
          Nếu quý doanh nghiệp/chủ tòa nhà có nhu cầu xuất hóa đơn VAT, vui lòng liên hệ Hotline <a href="tel:0888110789" className="font-bold text-green-700">0888 110 789</a> hoặc gửi mã số thuế qua Zalo CSKH để kế toán xuất hóa đơn điện tử trong 48 giờ.
        </p>
        <p>
          Chúng tôi cam kết hoàn tiền 100% nếu phát sinh lỗi kỹ thuật hệ thống khiến dịch vụ không thể kích hoạt.
        </p>
      </div>
    ),
  },
];

const POPULAR_TAGS = [
  'Làm sao để đăng tin',
  'Trọ Xinh Xu là gì',
  'Báo cáo tin lừa đảo',
  'Quên mật khẩu',
  'Đặt cọc an toàn',
  'Bảng giá VIP',
  'Tìm bạn ở ghép',
];

export const HelpPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<Category['id']>('account');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({
    'acc-1': true,
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
        description="Giải đáp mọi thắc mắc về tài khoản, Trọ Xinh Xu, tìm phòng trọ, đăng tin cho thuê, dịch vụ VIP và an toàn đặt cọc trên Trọ Xinh."
        url="/help"
      />

      {/* Header (Top): Search Bar on Green Background (bg-green-600) */}
      <header className="relative bg-green-600 text-white pt-12 pb-16 px-4 sm:px-6 lg:px-8 shadow-md overflow-hidden">
        {/* Background ambient lighting */}
        <div className="absolute top-0 right-0 -translate-y-12 translate-x-12 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 translate-y-16 -translate-x-16 w-80 h-80 bg-emerald-300/15 rounded-full blur-2xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto text-center space-y-5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white/15 backdrop-blur-md rounded-full text-xs font-semibold text-emerald-50 border border-white/20">
            <HelpCircle className="w-4 h-4 text-emerald-200" />
            <span>Trung Tâm Trợ Giúp Trọ Xinh</span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-white leading-tight">
            Chúng tôi có thể giúp gì cho bạn?
          </h1>
          <p className="text-sm sm:text-base text-emerald-50/90 max-w-2xl mx-auto leading-relaxed">
            Tra cứu thông tin tài khoản, hướng dẫn đăng tin, quy trình thuê phòng và giải đáp mọi thắc mắc.
          </p>

          {/* Large Prominent Search Bar */}
          <div className="max-w-2xl mx-auto pt-3">
            <div className="relative flex items-center bg-white rounded-2xl shadow-xl shadow-green-950/20 p-1.5 focus-within:ring-4 focus-within:ring-green-300/50 transition">
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

            {/* Suggested quick keywords */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mt-4 text-xs">
              <span className="text-emerald-100 font-medium">Gợi ý nhanh:</span>
              {POPULAR_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleSelectQuickTag(tag)}
                  className="px-2.5 py-1 bg-white/15 hover:bg-white/25 text-white rounded-lg border border-white/20 transition backdrop-blur-xs text-[11px] sm:text-xs"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Main Body (2 Columns): Sidebar w-1/4 + Content w-3/4 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Active search filter banner */}
        {searchQuery && (
          <div className="mb-8 p-4 bg-white rounded-2xl border border-gray-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm text-gray-600">
                Kết quả tìm kiếm cho: <span className="font-bold text-gray-900">"{searchQuery}"</span>
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Tìm thấy <strong>{filteredFaqs.length}</strong> câu hỏi phù hợp
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

        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Cột trái (Sidebar - w-full lg:w-1/4): Danh sách các chủ đề */}
          <aside className="w-full lg:w-1/4 lg:sticky lg:top-24 space-y-4 shrink-0">
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-3 sm:p-4">
              <div className="px-3 py-2 mb-2 hidden lg:block">
                <h2 className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Chủ đề trợ giúp
                </h2>
              </div>

              {/* Category Nav list */}
              <nav className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 scrollbar-none" aria-label="Danh mục chủ đề trợ giúp">
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
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition ${
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

            {/* Sidebar Trust badge box */}
            <div className="hidden lg:block bg-gradient-to-br from-emerald-50 to-teal-50/50 rounded-2xl border border-emerald-100/80 p-4 text-emerald-950">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold text-emerald-950">Cam kết an toàn</h3>
              </div>
              <p className="text-[11px] text-emerald-900/80 leading-relaxed">
                100% phòng kiểm duyệt thực tế, miễn phí dịch vụ cho người thuê &amp; bảo vệ quyền lợi tiền cọc.
              </p>
            </div>
          </aside>

          {/* Cột phải (Content - w-full lg:w-3/4): Accordion / FAQ List */}
          <section className="w-full lg:w-3/4 space-y-4">
            {/* Header when browsing a category */}
            {!searchQuery && (
              <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-green-100 text-green-700 flex items-center justify-center shrink-0">
                    <activeCategoryObj.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold text-gray-900">{activeCategoryObj.name}</h2>
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

            {/* Accordion List */}
            {filteredFaqs.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-200/80 p-12 text-center shadow-xs">
                <div className="w-14 h-14 bg-gray-100 text-gray-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <HelpCircle className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-1">
                  Không tìm thấy câu trả lời phù hợp
                </h3>
                <p className="text-xs text-gray-500 max-w-md mx-auto mb-5 leading-relaxed">
                  Rất tiếc từ khóa "{searchQuery}" không khớp với câu hỏi nào. Bạn có thể liên hệ trực tiếp CSKH qua Hotline hoặc Zalo để được giải đáp ngay.
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
                    <MessageCircle className="w-3.5 h-3.5" /> Chat CSKH Zalo
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

                      {/* Accordion Expandable Answer */}
                      {isOpen && (
                        <div className="px-4 sm:px-5 pb-5 pt-1 text-sm border-t border-gray-100 bg-gray-50/40">
                          <div className="pt-3">{faq.answer}</div>

                          {/* Was this helpful feedback interaction */}
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

        {/* Footer CTA Block: 'Cần hỗ trợ trực tiếp?' */}
        <section className="mt-14 bg-gradient-to-r from-[#005a2d] to-green-600 rounded-3xl p-6 sm:p-10 text-white shadow-xl shadow-green-950/15 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-80 h-80 bg-white/5 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center lg:text-left max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 rounded-full text-xs font-semibold text-emerald-100">
                <Clock className="w-3.5 h-3.5" />
                <span>Hỗ trợ trực tuyến: 8:00 – 21:00 hàng ngày</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white">
                Cần hỗ trợ trực tiếp?
              </h2>
              <p className="text-sm text-emerald-50 leading-relaxed">
                Đội ngũ chăm sóc khách hàng Trọ Xinh luôn sẵn sàng tư vấn tìm phòng, hướng dẫn đăng tin và giải quyết mọi vấn đề nhanh chóng.
              </p>
            </div>

            {/* 2 CTA Buttons as requested */}
            <div className="flex flex-col sm:flex-row items-center gap-3.5 w-full sm:w-auto">
              <a
                href="tel:0888110789"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 bg-white text-emerald-900 hover:bg-emerald-50 font-bold rounded-2xl shadow-md transition transform active:scale-95 text-sm"
              >
                <Phone className="w-4 h-4 text-green-600" />
                <span>Gọi Hotline 0888 110 789</span>
              </a>

              <a
                href="https://zalo.me/0888110789"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3.5 bg-green-700 hover:bg-green-800 text-white font-bold rounded-2xl shadow-md transition transform active:scale-95 text-sm border border-emerald-400/40"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Chat CSKH Zalo</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-80" />
              </a>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};
