import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Building2, ShieldCheck, TrendingUp, ArrowRight } from 'lucide-react';

export const OwnerOnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const [slide, setSlide] = useState<number>(0);

  const slides = [
    {
      title: 'Chào Mừng Đối Tác Chủ Trọ!',
      desc: 'Tiếp cận cộng đồng sinh viên và khách thuê văn minh tại Hà Nội hoàn toàn miễn phí trên nền tảng Trọ Xinh.',
      icon: Building2,
      color: 'bg-amber-50 text-[#904d00]',
    },
    {
      title: 'Kiểm Định & Nâng Cấp Giá Trị',
      desc: 'Được đội ngũ chuyên viên hỗ trợ chụp ảnh chuyên nghiệp, thẩm định và cấp huy hiệu Đã Kiểm Duyệt giúp lấp đầy phòng nhanh gấp 3 lần.',
      icon: ShieldCheck,
      color: 'bg-emerald-50 text-[#006d37]',
    },
    {
      title: 'Phần Mềm Quản Lý Tòa Nhà Miễn Phí',
      desc: 'Theo dõi phòng trống, hợp đồng cọc, lịch xem phòng và tin nhắn khách thuê tập trung tại một bảng điều khiển duy nhất.',
      icon: TrendingUp,
      color: 'bg-blue-50 text-[#006492]',
    },
  ];

  const handleNext = () => {
    if (slide < slides.length - 1) {
      setSlide(slide + 1);
    } else {
      navigate('/chu-tro');
    }
  };

  const current = slides[slide];
  const Icon = current.icon;

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-10 border border-gray-200 shadow-xl text-center space-y-8 animate-fadeIn">
        <div className="flex justify-between items-center text-xs text-gray-400">
          <span>Dành cho Chủ trọ • Bước {slide + 1} / 3</span>
          <button onClick={() => navigate('/chu-tro')} className="hover:text-gray-900 font-semibold">
            Vào Dashboard →
          </button>
        </div>

        <div className={`w-28 h-28 ${current.color} rounded-3xl flex items-center justify-center mx-auto shadow-md transition-all duration-300 scale-105`}>
          <Icon className="w-14 h-14" />
        </div>

        <div className="space-y-2 max-w-sm mx-auto">
          <h2 className="text-2xl font-black text-gray-900 leading-snug">{current.title}</h2>
          <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">{current.desc}</p>
        </div>

        <div className="flex justify-center gap-2">
          {slides.map((_, idx) => (
            <div
              key={idx}
              className={`h-2 rounded-full transition-all duration-300 ${
                slide === idx ? 'w-8 bg-[#006d37]' : 'w-2 bg-gray-200'
              }`}
            />
          ))}
        </div>

        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={handleNext}
          rightIcon={<ArrowRight className="w-4 h-4" />}
        >
          {slide === slides.length - 1 ? 'Khám Phá Bảng Điều Khiển' : 'Tiếp Tục'}
        </Button>
      </div>
    </div>
  );
};
