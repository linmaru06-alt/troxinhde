import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { ShieldCheck, MapPin, Users, ArrowRight, Sparkles } from 'lucide-react';

export const RenterOnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const [slide, setSlide] = useState<number>(0);

  const slides = [
    {
      title: 'Phòng Trọ Kiểm Duyệt 100%',
      desc: 'Mọi tin đăng trên Trọ Xinh đều được xác thực tận mắt: đúng giá, đúng hình, an tâm tuyệt đối không lo bị lừa đảo cọc ảo.',
      icon: ShieldCheck,
      color: 'bg-emerald-50 text-[#006d37]',
    },
    {
      title: 'Bản Đồ Nhà Trọ Trực Quan',
      desc: 'Tìm kiếm phòng trọ xung quanh trường đại học của bạn chỉ với vài cú chạm, hiển thị giá rõ ràng ngay trên bản đồ.',
      icon: MapPin,
      color: 'bg-blue-50 text-[#006492]',
    },
    {
      title: 'Tìm Bạn Ở Ghép & Chợ Đồ Cũ',
      desc: 'Dễ dàng kết nối bạn cùng phòng cùng thói quen sinh hoạt và sắm sửa đồ dùng sinh viên thanh lý giá rẻ hoặc 0 đồng.',
      icon: Users,
      color: 'bg-amber-50 text-[#904d00]',
    },
  ];

  const handleNext = () => {
    if (slide < slides.length - 1) {
      setSlide(slide + 1);
    } else {
      navigate('/tim-kiem');
    }
  };

  const current = slides[slide];
  const Icon = current.icon;

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-10 border border-gray-200 shadow-xl text-center space-y-8 animate-fadeIn">
        <div className="flex justify-between items-center text-xs text-gray-400">
          <span>Bước {slide + 1} / 3</span>
          <button onClick={() => navigate('/tim-kiem')} className="hover:text-gray-900 font-semibold">
            Bỏ qua →
          </button>
        </div>

        {/* Slide Graphic */}
        <div className={`w-28 h-28 ${current.color} rounded-3xl flex items-center justify-center mx-auto shadow-md transition-all duration-300 scale-105`}>
          <Icon className="w-14 h-14" />
        </div>

        {/* Text */}
        <div className="space-y-2 max-w-sm mx-auto">
          <h2 className="text-2xl font-black text-gray-900 leading-snug">{current.title}</h2>
          <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">{current.desc}</p>
        </div>

        {/* Dot indicators */}
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

        {/* Next CTA */}
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={handleNext}
          rightIcon={<ArrowRight className="w-4 h-4" />}
        >
          {slide === slides.length - 1 ? 'Bắt Đầu Khám Phá Ngay' : 'Tiếp Theo'}
        </Button>
      </div>
    </div>
  );
};
