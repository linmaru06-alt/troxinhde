import React from 'react';
import { Link } from 'react-router-dom';
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
      q: 'Chủ trọ có phải trả phí để được kiểm duyệt không?',
      a: 'Quy trình kiểm định và chụp ảnh ban đầu hoàn toàn miễn phí cho tất cả các đối tác chủ trọ đăng ký trên hệ thống Trọ Xinh.',
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
      {/* Hero */}
      <div className="text-center space-y-4 max-w-2xl mx-auto">
        <div className="w-16 h-16 bg-emerald-100 text-[#006d37] rounded-3xl flex items-center justify-center mx-auto shadow-md">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
          Quy Trình Kiểm Duyệt Nhà Trọ 100%
        </h1>
        <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
          Chúng tôi xóa bỏ hoàn toàn nỗi lo "hình một đằng, phòng một nẻo" hay "lừa đảo cọc ảo" cho sinh viên và người đi làm.
        </p>
      </div>

      {/* 3 Step Timeline */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
        {steps.map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-xs space-y-3 relative hover:shadow-md transition">
              <span className="text-3xl font-black text-emerald-200 block">{s.step}</span>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#006d37] flex items-center justify-center">
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-gray-900">{s.title}</h3>
              <p className="text-xs text-gray-500 leading-relaxed">{s.desc}</p>
            </div>
          );
        })}
      </div>

      {/* FAQ Accordion */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 space-y-6">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-[#006d37]" />
          <h2 className="text-lg font-bold text-gray-900">Câu Hỏi Thường Gặp</h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div key={idx} className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-1.5">
              <h4 className="text-sm font-bold text-gray-900">{faq.q}</h4>
              <p className="text-xs text-gray-600 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Dual CTA */}
      <div className="bg-emerald-50 rounded-3xl p-8 border border-emerald-200 text-center space-y-4">
        <h2 className="text-xl font-bold text-gray-900">Sẵn sàng tìm trọ an tâm hôm nay?</h2>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link to="/tim-kiem">
            <Button variant="primary" size="lg" rightIcon={<ArrowRight className="w-4 h-4" />}>
              Xem Phòng Đã Kiểm Duyệt
            </Button>
          </Link>
          <Link to="/dang-ky?role=owner">
            <Button variant="outline" size="lg">
              Đăng Phòng Dành Cho Chủ Trọ
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
