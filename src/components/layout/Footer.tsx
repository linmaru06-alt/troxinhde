import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Phone, Mail, MapPin, Heart, MessageCircle, ExternalLink } from 'lucide-react';
import { OptimizedImage } from '../ui/OptimizedImage';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-gray-200 mt-16 pt-12 pb-24 md:pb-12 text-sm text-gray-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Col 1: Brand & Trust */}
          <div className="space-y-4 md:col-span-1">
            <Link to="/" className="flex items-center gap-2.5 group">
              <OptimizedImage
                src="/images/logo.png"
                alt="Trọ Xinh Logo"
                loading="lazy"
                width={36}
                height={36}
                className="w-9 h-9 rounded-xl object-cover ring-1 ring-emerald-500/30 shadow-xs group-hover:scale-105 transition-transform"
              />
              <span className="text-xl font-black text-[#006d37]">Trọ Xinh</span>
            </Link>
            <p className="text-xs text-gray-500 leading-relaxed">
              Nền tảng tìm trọ sinh viên Hà Nội uy tín. Mọi phòng trọ đều qua quy trình kiểm duyệt thực tế 100%.
            </p>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 rounded-full text-xs font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Bảo vệ người thuê & giữ cọc an toàn</span>
            </div>
          </div>

          {/* Col 2: Liên hệ */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Thông Tin Liên Hệ</h4>
            <div className="space-y-2.5 text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#006d37] shrink-0" />
                <a href="tel:0888110789" className="font-bold text-gray-900 hover:text-[#006d37] transition">
                  0888 110 789
                </a>
                <span className="text-[10px] text-gray-400">(8:00 – 21:00)</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#006d37] shrink-0" />
                <a href="mailto:nguyenvuchinhb1hhb@gmail.com" className="hover:text-[#006d37] transition truncate">
                  nguyenvuchinhb1hhb@gmail.com
                </a>
              </div>
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-[#006d37] shrink-0" />
                <a
                  href="https://zalo.me/0888110789"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-emerald-800 hover:underline flex items-center gap-1"
                >
                  Zalo: 0888 110 789 <ExternalLink className="w-3 h-3 text-emerald-600" />
                </a>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#006d37] shrink-0 mt-0.5" />
                <span className="text-gray-500">18 Ngõ 167 Tây Sơn, P. Quang Trung, Q. Đống Đa, Hà Nội</span>
              </div>
            </div>
          </div>

          {/* Col 3: Pháp lý & Quy chế */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Pháp Lý & Điều Khoản</h4>
            <ul className="space-y-2 text-xs">
              {[
                { to: '/dieu-khoan', label: 'Điều khoản sử dụng' },
                { to: '/chinh-sach-bao-mat', label: 'Chính sách bảo mật & quyền riêng tư' },
                { to: '/ve-chung-toi/kiem-duyet', label: 'Quy trình kiểm duyệt phòng 24h' },
              ].map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="hover:text-[#006d37] transition font-medium">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4: Mạng xã hội & Khám phá */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Mạng Xã Hội & Tiện Ích</h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <a
                  href="https://www.facebook.com/troxinh.vn"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-[#006d37] transition"
                >
                  <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-bold">f</span>
                  <span>Facebook: Trọ Xinh - Tìm Trọ Hà Nội</span>
                </a>
              </li>
              <li>
                <a
                  href="https://www.tiktok.com/@troxinh.vn"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-[#006d37] transition"
                >
                  <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-900 flex items-center justify-center text-xs font-bold">🎵</span>
                  <span>TikTok: @troxinh.vn</span>
                </a>
              </li>
              <li>
                <a
                  href="https://zalo.me/0888110789"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-[#006d37] transition"
                >
                  <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center text-xs font-bold">Z</span>
                  <span>Tư vấn trực tiếp qua Zalo</span>
                </a>
              </li>
              <li className="pt-1 border-t border-gray-100">
                <Link to="/bang-gia" className="hover:text-[#006d37] transition text-gray-500">
                  Bảng giá dịch vụ chủ trọ
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="pt-8 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 gap-4">
          <p>© 2026 Trọ Xinh · Vận hành bởi <strong>Nguyễn Vũ Chính</strong>. Nền tảng tìm trọ sinh viên Hà Nội đã kiểm duyệt.</p>
          <div className="flex items-center gap-1 text-gray-500">
            <span>Phát triển với</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-current" />
            <span>dành cho sinh viên & người đi làm Việt Nam</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
