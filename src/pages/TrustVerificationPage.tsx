import React from 'react';
import { Link } from 'react-router-dom';
import { SEOHead } from '../components/seo/SEOHead';
import { Button } from '../components/ui/Button';
import {
  ShieldCheck,
  CheckCircle2,
  FileCheck,
  Camera,
  MapPin,
  HelpCircle,
  ArrowRight,
  Sparkles,
  FileText,
  Download,
  Printer,
  ExternalLink,
  Lock,
  Flame,
  Scale,
  Award,
  Plus,
} from 'lucide-react';

export const TrustVerificationPage: React.FC = () => {
  const steps = [
    {
      step: '01',
      title: 'Chủ Trọ Đăng Tin Khai Báo',
      desc: 'Chủ trọ tải lên hình ảnh, địa chỉ, giá điện nước, tiện ích và giấy tờ chứng nhận quyền sở hữu hoặc kinh doanh.',
      icon: FileCheck,
    },
    {
      step: '02',
      title: 'Đội Ngũ Thẩm Định Tại Chỗ (24h)',
      desc: 'Chuyên viên kiểm định của Trọ Xinh trực tiếp đến nhà trọ đo đạc diện tích, chụp ảnh thực tế 360 độ và test hệ thống PCCC, khóa vân tay.',
      icon: Camera,
    },
    {
      step: '03',
      title: 'Gắn Huy Hiệu & Xuất Bản',
      desc: 'Chỉ những phòng đạt chuẩn 100% tiêu chí an toàn, đúng giá niêm yết mới được cấp huy hiệu "Đã kiểm duyệt" và bảo hiểm tiền cọc.',
      icon: ShieldCheck,
    },
  ];

  const legalTemplates = [
    {
      id: 'contract',
      title: 'Mẫu Hợp Đồng Thuê Nhà / Phòng Trọ Chuẩn Pháp Lý',
      badge: 'Chuẩn 10 Điều Khoản · Luật Nhà Ở',
      icon: FileText,
      color: 'emerald',
      desc: 'Văn bản hợp đồng thuê trọ chuẩn theo Bộ luật Dân sự 2015 và Luật Nhà ở 2023, quy định đầy đủ quyền và nghĩa vụ cho đôi bên.',
      features: [
        'Quy định rõ ràng giá thuê, giá điện nước theo công tơ riêng và phụ phí dịch vụ minh bạch.',
        'Điều khoản cam kết hoàn trả 100% tiền đặt cọc khi kết thúc hợp đồng đúng hạn.',
        'Quy chuẩn bàn giao trang thiết bị nội thất (điều hòa, bình nóng lạnh, khóa vân tay...).',
        'Điều khoản an toàn PCCC, an ninh trật tự và quy trình xử lý đơn phương chấm dứt hợp đồng.',
      ],
      link: '/hop-dong-mau',
      actionText: 'Xem & Điền Hợp Đồng Trực Tuyến',
    },
    {
      id: 'deposit',
      title: 'Mẫu Biên Bản Đặt Cọc Giữ Phòng Trọ',
      badge: 'Bảo Vệ Tiền Cọc · Chống Cọc Ảo',
      icon: FileCheck,
      color: 'blue',
      desc: 'Giấy cam kết giữ chỗ phòng trọ và biên nhận tiền cọc chuẩn pháp lý, ngăn chặn rủi ro tăng giá hoặc hủy phòng bất ngờ.',
      features: [
        'Xác nhận chính xác số tiền cọc, số phòng giữ chỗ và cam kết cố định giá thuê suốt thời hạn.',
        'Cam kết hoàn trả 100% và bồi thường tương đương nếu chủ nhà tự ý hủy hoặc cho người khác thuê.',
        'Quy định rõ ràng thời hạn giữ phòng đến ngày ký kết hợp đồng chính thức.',
        'Tự động chuyển tiếp tiền đặt cọc giữ chỗ thành tiền cọc hợp đồng khi nhận bàn giao phòng.',
      ],
      link: '/bien-ban-dat-coc',
      actionText: 'Xem & Điền Biên Bản Cọc Trực Tuyến',
    },
  ];

  const faqs = [
    {
      q: 'Huy hiệu "Đã kiểm duyệt" có ý nghĩa gì đối với người thuê?',
      a: 'Đảm bảo phòng trọ 100% có thật, giá thuê và phụ phí điện nước niêm yết chuẩn xác, không có phí ẩn và được bảo vệ tiền cọc khi thuê.',
    },
    {
      q: 'Nếu đến xem phòng thực tế không giống như trên web thì sao?',
      a: 'Trọ Xinh cam kết bồi thường 100% chi phí đi lại và hỗ trợ bạn tìm phòng trọ khác phù hợp ngay trong ngày hoàn toàn miễn phí.',
    },
    {
      q: 'Mẫu hợp đồng và biên bản đặt cọc có giá trị pháp lý thực tế không?',
      a: 'Có, các mẫu văn bản trên Trọ Xinh được xây dựng bám sát Bộ luật Dân sự 2015 và Luật Nhà ở 2023. Khi hai bên điền thông tin và ký tên xác nhận, văn bản có đầy đủ giá trị pháp lý ràng buộc.',
    },
    {
      q: 'Chủ trọ có phải trả phí để được kiểm duyệt không?',
      a: 'Quy trình kiểm định và chụp ảnh ban đầu hoàn toàn miễn phí cho tất cả các đối tác chủ trọ đăng ký trên hệ thống Trọ Xinh.',
    },
  ];

  const trustBadges = [
    {
      icon: ShieldCheck,
      title: 'Thẩm định thực tế 100%',
      desc: 'Đội ngũ trực tiếp kiểm tra từng phòng trong vòng 24h trước khi duyệt tin.',
    },
    {
      icon: Scale,
      title: 'Biểu mẫu chuẩn pháp lý',
      desc: 'Được bảo hộ điều khoản rõ ràng, phòng tránh tối đa tranh chấp phát sinh.',
    },
    {
      icon: Flame,
      title: 'Đạt chuẩn kiểm định PCCC',
      desc: 'Ưu tiên hiển thị nhà trọ có lối thoát hiểm, bình cứu hỏa và chuông báo cháy.',
    },
    {
      icon: Award,
      title: 'Bảo vệ tiền cọc an toàn',
      desc: 'Cam kết hỗ trợ giải quyết quyền lợi và hoàn cọc đúng hợp đồng thỏa thuận.',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50/50 py-10 px-4 sm:px-6 lg:px-8 space-y-12">
      <SEOHead
        title="Quy Trình Kiểm Duyệt Phòng 24h & Biểu Mẫu Hợp Đồng Chuẩn | Trọ Xinh"
        description="Tìm hiểu quy trình thẩm định phòng trọ thực tế 100% trong 24 giờ và tải trọn bộ mẫu hợp đồng thuê trọ, mẫu biên bản đặt cọc PDF chuẩn pháp lý mới nhất."
        url="/ve-chung-toi/kiem-duyet"
      />

      {/* Hero Section */}
      <div className="max-w-5xl mx-auto text-center space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 text-green-700 border border-emerald-200 text-xs font-bold shadow-2xs">
          <ShieldCheck className="w-4 h-4 text-green-700" />
          <span>Cam Kết An Toàn &amp; Minh Bạch 100%</span>
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-gray-900 tracking-tight">
          Quy Trình Thẩm Định Phòng 24h &amp; <br className="hidden sm:inline" />
          <span className="text-green-700">Bộ Biểu Mẫu Pháp Lý Chuẩn</span>
        </h1>
        <p className="text-xs sm:text-base text-gray-700 leading-relaxed max-w-2xl mx-auto">
          Xóa bỏ nỗi lo "hình một đằng, phòng một nẻo" hay "lừa đảo bùng cọc". Mọi phòng trọ được xác thực thực tế và bảo vệ bởi biểu mẫu pháp lý chuẩn hóa.
        </p>
      </div>

      {/* 3 Step Timeline */}
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="text-center space-y-1">
          <span className="text-xs font-bold text-green-700 uppercase tracking-wider">Tiêu Chuẩn 3 Bước</span>
          <h2 className="text-xl sm:text-2xl font-black text-green-700">Quy Trình Xác Thực Phòng Trọ 24 Giờ</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <div
                key={i}
                className="bg-white rounded-3xl p-6 border border-gray-200 shadow-xs space-y-3 relative hover:shadow-md hover:border-emerald-200 transition group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-black text-emerald-300 group-hover:text-green-700 transition-colors block">
                    {s.step}
                  </span>
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-green-700 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
                <h3 className="text-base font-bold text-gray-900">{s.title}</h3>
                <p className="text-xs text-gray-700 leading-relaxed">{s.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Call to Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link to="/tim-kiem">
            <Button
              variant="primary"
              size="md"
              leftIcon={<ShieldCheck className="w-4 h-4" />}
              className="bg-green-700 hover:bg-green-800 text-white font-bold px-6 py-2.5 rounded-xl shadow-xs transition"
            >
              Xem phòng đã kiểm duyệt
            </Button>
          </Link>
          <Link to="/landlord-registration">
            <Button
              variant="outline"
              size="md"
              leftIcon={<Plus className="w-4 h-4" />}
              className="border-green-700 text-green-700 hover:bg-emerald-50 hover:border-green-800 font-bold px-6 py-2.5 rounded-xl transition"
            >
              Đăng tin cho thuê ngay
            </Button>
          </Link>
        </div>
      </div>

      {/* 4 Cam Kết Vàng Từ Trọ Xinh */}
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="text-center space-y-1">
          <h3 className="text-lg sm:text-xl font-black text-green-700">4 Cam Kết Vàng Từ Trọ Xinh</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {trustBadges.map((badge, idx) => {
            const Icon = badge.icon;
            return (
              <div key={idx} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs space-y-2.5 hover:shadow-xs hover:border-emerald-200 transition">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-green-700 flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
                <h4 className="text-sm sm:text-base font-black text-gray-900">{badge.title}</h4>
                <p className="text-xs text-gray-700 leading-relaxed">{badge.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Ghi chú liên kết */}
        <p className="text-center text-gray-700 text-sm italic max-w-3xl mx-auto pt-2">
          Đối với tin đăng Chợ đồ cũ sinh viên và Tìm bạn cùng phòng, Trọ Xinh áp dụng hệ thống kiểm duyệt tự động kết hợp báo cáo từ cộng đồng nhằm đảm bảo môi trường giao dịch an toàn.
        </p>
      </div>

      {/* DEDICATED SECTION: LEGAL PDF TEMPLATES */}
      <div id="bieu-mau-pdf" className="max-w-5xl mx-auto space-y-6 pt-4">
        <div className="bg-gradient-to-r from-emerald-900 via-[#006d37] to-emerald-800 rounded-3xl p-6 sm:p-10 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="max-w-2xl space-y-3 relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-emerald-100 text-xs font-bold backdrop-blur-xs border border-white/20">
              <FileText className="w-3.5 h-3.5" />
              <span>Kho Tài Liệu Pháp Lý & Biểu Mẫu PDF</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Bộ Biểu Mẫu Hợp Đồng & Đặt Cọc Chuẩn Pháp Lý
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
              Trọ Xinh cung cấp miễn phí các mẫu văn bản chuẩn hóa theo quy định mới nhất của Nhà nước, giúp người thuê và chủ nhà ký kết minh bạch, hỗ trợ in nhanh hoặc xuất file PDF tiện lợi.
            </p>
          </div>
        </div>

        {/* 2 Document Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {legalTemplates.map((tpl) => {
            const Icon = tpl.icon;
            return (
              <div
                key={tpl.id}
                className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm hover:shadow-lg hover:border-emerald-300 transition-all flex flex-col justify-between space-y-6 group"
              >
                <div className="space-y-4">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#006d37] flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 text-[#006d37] font-extrabold text-[11px] border border-emerald-200/60">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {tpl.badge}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <div className="space-y-1.5">
                    <h3 className="text-lg font-black text-gray-950 group-hover:text-green-700 transition-colors">
                      {tpl.title}
                    </h3>
                    <p className="text-xs text-gray-700 leading-relaxed">{tpl.desc}</p>
                  </div>

                  {/* Features List */}
                  <div className="p-4 bg-gray-50/80 rounded-2xl border border-gray-100 space-y-2">
                    <p className="text-[11px] font-black uppercase text-gray-700 tracking-wider">
                      Điểm bảo vệ trọng tâm:
                    </p>
                    <ul className="space-y-1.5 text-xs text-gray-700">
                      {tpl.features.map((f, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-700 shrink-0 mt-0.5" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="pt-2 border-t border-gray-100 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <Link to={tpl.link} className="flex-1">
                    <Button
                      variant="primary"
                      size="md"
                      className="w-full justify-center bg-green-700 hover:bg-green-800"
                      rightIcon={<ArrowRight className="w-4 h-4" />}
                    >
                      {tpl.actionText}
                    </Button>
                  </Link>
                  <Link to={tpl.link} className="sm:w-auto">
                    <Button
                      variant="outline"
                      size="md"
                      className="w-full justify-center border-green-700 text-green-700 hover:bg-emerald-50"
                      leftIcon={<Download className="w-4 h-4" />}
                    >
                      Tải PDF
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Legal Disclaimer Box */}
        <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl flex items-center justify-between flex-wrap gap-3 text-xs text-emerald-950">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-green-700 shrink-0" />
            <span>
              Tất cả các phòng mang huy hiệu <strong>"Đã kiểm duyệt"</strong> trên Trọ Xinh đều được khuyến nghị sử dụng bộ mẫu văn bản này để đảm bảo giữ cọc an toàn.
            </span>
          </div>
          <a
            href="tel:0888110789"
            className="font-bold text-green-700 hover:underline flex items-center gap-1 shrink-0"
          >
            Tư vấn pháp lý: 0888 110 789 →
          </a>
        </div>
      </div>

      {/* FAQ Accordion */}
      <div className="max-w-5xl mx-auto bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 space-y-6">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-green-700" />
          <h2 className="text-lg font-bold text-green-700">Câu Hỏi Thường Gặp Về Kiểm Duyệt &amp; Hợp Đồng</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {faqs.map((faq, idx) => (
            <div key={idx} className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-1.5">
              <h4 className="text-xs sm:text-sm font-bold text-gray-900 flex items-start gap-2">
                <span className="text-green-700 font-bold">Q.</span>
                <span>{faq.q}</span>
              </h4>
              <p className="text-xs text-gray-700 leading-relaxed pl-5">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Contact & Founder Info */}
      <div className="max-w-5xl mx-auto bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-gray-100 text-center sm:text-left">
          <div>
            <span className="text-xs font-bold text-green-700 uppercase tracking-wider">Đội Ngũ Vận Hành &amp; Thẩm Định</span>
            <h3 className="text-base font-extrabold text-gray-900">Nguyễn Vũ Chính</h3>
            <p className="text-xs text-gray-500">Người sáng lập &amp; Vận hành Nền tảng Trọ Xinh (TroXinh.vn)</p>
          </div>
          <div className="text-xs text-gray-500 text-center sm:text-right">
            <p>Trụ sở: 18 Ngõ 167 Tây Sơn, Đống Đa, Hà Nội</p>
            <p>Cam kết thẩm định thực tế 100% trong 24 giờ</p>
          </div>
        </div>

        <div className="pt-2 text-center space-y-2">
          <p className="text-xs font-bold text-gray-900">Có thắc mắc về quy trình kiểm duyệt hoặc tải mẫu PDF? Liên hệ ngay:</p>
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
            <a href="tel:0888110789" className="font-bold text-green-700 hover:underline flex items-center gap-1">
              📞 0888 110 789
            </a>
            <span>•</span>
            <a href="mailto:nguyenvuchinhb1hhb@gmail.com" className="font-medium text-gray-700 hover:underline flex items-center gap-1">
              📧 nguyenvuchinhb1hhb@gmail.com
            </a>
            <span>•</span>
            <a
              href="https://zalo.me/0888110789"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-green-700 hover:underline flex items-center gap-1"
            >
              💬 Zalo: 0888 110 789 <ExternalLink className="w-3 h-3 text-green-700" />
            </a>
          </div>
        </div>
      </div>

      {/* Dual CTA */}
      <div className="max-w-5xl mx-auto bg-emerald-50 rounded-3xl p-8 border border-emerald-200 text-center space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-green-700">Sẵn sàng tìm trọ an tâm hoặc đăng ký kiểm duyệt phòng?</h2>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link to="/tim-kiem">
            <Button variant="primary" size="lg" className="bg-green-700 hover:bg-green-800" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Xem Phòng Đã Kiểm Duyệt
            </Button>
          </Link>
          <Link to="/dang-ky?role=owner">
            <Button variant="outline" size="lg" className="border-green-700 text-green-700 hover:bg-emerald-100/50">
              Đăng Phòng Dành Cho Chủ Trọ
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
