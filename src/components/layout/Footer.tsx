import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ShieldCheck, Phone, Mail, MapPin, Heart } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-gray-200 mt-16 pt-12 pb-24 md:pb-12 text-sm text-gray-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Col 1: Brand & Trust */}
          <div className="space-y-4 md:col-span-1">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-linear-to-br from-[#006d37] to-[#27ae60] flex items-center justify-center text-white shadow-md">
                <Home className="w-5 h-5" />
              </div>
              <span className="text-xl font-black text-[#006d37]">Trọ Xinh</span>
            </Link>
            <p className="text-xs text-gray-500 leading-relaxed">
              Nền tảng phòng trọ sinh viên và người đi làm số 1 Việt Nam. Cam kết 100% tin đăng phòng trọ đã qua kiểm duyệt thực tế.
            </p>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 rounded-full text-xs font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Bảo vệ người thuê trọ</span>
            </div>
          </div>

          {/* Col 2: Public Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Khám Phá</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/tim-kiem" className="hover:text-[#006d37] transition">Tìm phòng trọ TP.HCM</Link>
              </li>
              <li>
                <Link to="/ban-do" className="hover:text-[#006d37] transition">Bản đồ nhà trọ theo giá</Link>
              </li>
              <li>
                <Link to="/roommate" className="hover:text-[#006d37] transition">Tìm bạn cùng phòng</Link>
              </li>
              <li>
                <Link to="/cho-do-cu" className="hover:text-[#006d37] transition">Chợ đồ cũ sinh viên</Link>
              </li>
              <li>
                <Link to="/ve-chung-toi/kiem-duyet" className="hover:text-[#006d37] transition">Quy trình kiểm duyệt 24h</Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Owner & Partner */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Dành Cho Chủ Trọ</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/dang-ky?role=owner" className="hover:text-[#006d37] transition">Đăng ký đối tác chủ trọ</Link>
              </li>
              <li>
                <Link to="/chu-tro/phong/tao-moi" className="hover:text-[#006d37] transition">Đăng tin cho thuê phòng</Link>
              </li>
              <li>
                <Link to="/chu-tro/toa-nha/tao-moi" className="hover:text-[#006d37] transition">Tạo hồ sơ tòa nhà</Link>
              </li>
              <li>
                <Link to="/chu-tro" className="hover:text-[#006d37] transition">Bảng điều khiển quản lý</Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Contact & Hotline */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Hỗ Trợ Khách Hàng</h4>
            <div className="space-y-2 text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#006d37] shrink-0" />
                <span className="font-bold text-gray-900">1900 8888 99 (8h00 - 21h00)</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#006d37] shrink-0" />
                <span>hotro@troxinh.vn</span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#006d37] shrink-0 mt-0.5" />
                <span>Tòa nhà Innovation Hub, Quận 1, TP. Hồ Chí Minh</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="pt-8 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-400 gap-4">
          <p>© 2026 Trọ Xinh Việt Nam. Tất cả quyền được bảo lưu.</p>
          <div className="flex items-center gap-1 text-gray-500">
            <span>Phát triển với</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-current" />
            <span>cho sinh viên & người đi làm Việt Nam</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
