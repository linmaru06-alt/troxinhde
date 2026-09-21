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
                <a
                  href="https://www.google.com/maps/dir/?api=1&destination=18+Ngõ+167+Tây+Sơn,+Quang+Trung,+Đống+Đa,+Hà+Nội"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-500 hover:text-[#006d37] hover:underline transition-colors"
                >
                  18 Ngõ 167 Tây Sơn, P. Quang Trung, Q. Đống Đa, Hà Nội
                </a>
              </div>
            </div>
          </div>

          {/* Col 3: Pháp lý & Quy chế */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Pháp Lý & Điều Khoản</h4>
            <ul className="space-y-2 text-xs">
              {[
                { to: '/help', label: 'Trung tâm trợ giúp & FAQ' },
                { to: '/terms', label: 'Điều khoản sử dụng' },
                { to: '/privacy', label: 'Chính sách bảo mật & quyền riêng tư' },
                { to: '/ve-chung-toi/kiem-duyet', label: 'Quy trình kiểm duyệt phòng 24h' },
              ].map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="hover:text-[#006d37] hover:underline transition font-medium">
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
                  <svg
                    className="w-5 h-5 shrink-0"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <path
                      d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"
                      fill="#1877F2"
                    />
                    <path
                      d="M16.671 15.463l.532-3.47h-3.328v-2.25c0-.949.465-1.874 1.956-1.874h1.534V4.916s-1.374-.235-2.686-.235c-2.741 0-4.533 1.662-4.533 4.669v2.25H7.078v3.47h3.047v8.385a12.09 12.09 0 003.829 0v-8.385h2.717z"
                      fill="#FFFFFF"
                    />
                  </svg>
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
                  <svg
                    className="w-5 h-5 shrink-0"
                    viewBox="0 0 24 24"
                    fill="#000000"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
                  </svg>
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
                  <svg
                    className="w-5 h-5 shrink-0"
                    viewBox="0 0 50 50"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M22.782 0.166H27.199C33.265 0.166 36.81 1.057 39.957 2.744C43.104 4.431 45.588 6.896 47.256 10.043C48.943 13.19 49.834 16.735 49.834 22.801V27.199C49.834 33.265 48.943 36.81 47.256 39.957C45.568 43.104 43.104 45.588 39.957 47.256C36.81 48.943 33.265 49.834 27.199 49.834H22.801C16.735 49.834 13.19 48.943 10.043 47.256C6.896 45.569 4.412 43.104 2.744 39.957C1.057 36.81 0.166 33.265 0.166 27.199V22.801C0.166 16.735 1.057 13.19 2.744 10.043C4.431 6.896 6.896 4.412 10.043 2.744C13.171 1.057 16.735 0.166 22.782 0.166Z"
                      fill="#0068FF"
                    />
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M7.779 43.589C10.102 43.846 13.006 43.184 15.068 42.182C24.022 47.132 38.02 46.895 46.492 41.473C46.821 40.98 47.128 40.468 47.413 39.936C49.106 36.778 50 33.22 50 27.132V22.718C50 16.629 49.106 13.071 47.413 9.913C45.738 6.754 43.246 4.281 40.088 2.588C36.929 0.894 33.371 0 27.283 0H22.85C17.664 0 14.298 0.653 11.47 1.899C11.315 2.037 11.164 2.178 11.015 2.321C2.717 10.32 2.087 27.659 9.123 37.078C9.131 37.092 9.139 37.106 9.149 37.12C10.233 38.719 9.187 41.515 7.551 43.152C7.284 43.399 7.379 43.551 7.779 43.589Z"
                      fill="white"
                    />
                    <path
                      d="M20.563 17H10.838V19.085H17.587L10.933 27.332C10.724 27.635 10.573 27.919 10.573 28.564V29.095H19.748C20.203 29.095 20.582 28.716 20.582 28.261V27.142H13.492L19.748 19.294C19.843 19.18 20.013 18.972 20.089 18.877L20.127 18.82C20.487 18.289 20.563 17.834 20.563 17.284V17Z"
                      fill="#0068FF"
                    />
                    <path
                      d="M32.942 29.095H34.325V17H32.24V28.393C32.24 28.772 32.544 29.095 32.942 29.095Z"
                      fill="#0068FF"
                    />
                    <path
                      d="M25.814 19.692C23.198 19.692 21.075 21.816 21.075 24.432C21.075 27.048 23.198 29.171 25.814 29.171C28.43 29.171 30.553 27.048 30.553 24.432C30.572 21.816 28.449 19.692 25.814 19.692ZM25.814 27.218C24.278 27.218 23.027 25.967 23.027 24.432C23.027 22.896 24.278 21.645 25.814 21.645C27.35 21.645 28.601 22.896 28.601 24.432C28.601 25.967 27.369 27.218 25.814 27.218Z"
                      fill="#0068FF"
                    />
                    <path
                      d="M40.487 19.616C37.852 19.616 35.71 21.758 35.71 24.393C35.71 27.029 37.852 29.171 40.487 29.171C43.122 29.171 45.264 27.029 45.264 24.393C45.264 21.758 43.122 19.616 40.487 19.616ZM40.487 27.218C38.932 27.218 37.681 25.967 37.681 24.412C37.681 22.858 38.932 21.607 40.487 21.607C42.041 21.607 43.292 22.858 43.292 24.412C43.292 25.967 42.041 27.218 40.487 27.218Z"
                      fill="#0068FF"
                    />
                    <path
                      d="M29.456 29.094H30.575V19.957H28.622V28.279C28.622 28.715 29.001 29.094 29.456 29.094Z"
                      fill="#0068FF"
                    />
                  </svg>
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
