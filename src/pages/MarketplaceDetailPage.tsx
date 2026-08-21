import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { formatCurrency } from '../components/ui/Cards';
import { ReportModal } from '../components/modals/ReportModal';
import {
  ShoppingBag,
  MapPin,
  Clock,
  ShieldCheck,
  MessageSquare,
  Phone,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';

export const MarketplaceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { marketplaceItems, currentUser, getOrCreateThread, showToast } = useAppStore();
  const [showReport, setShowReport] = useState<boolean>(false);

  const item = marketplaceItems.find((i) => i.id === id) || marketplaceItems[0];

  if (!item) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-bold">Không tìm thấy món đồ</h2>
        <Link to="/cho-do-cu" className="text-[#006d37] font-semibold mt-2 inline-block">← Về chợ đồ cũ</Link>
      </div>
    );
  }

  const handleContactSeller = () => {
    if (!currentUser) {
      showToast('Vui lòng đăng nhập', 'Bạn cần đăng nhập để nhắn tin với người bán', 'warning');
      navigate(`/dang-nhap?next=/cho-do-cu/${item.id}`);
      return;
    }
    const threadId = getOrCreateThread(item.userId);
    navigate(`/tin-nhan/${threadId}`);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Link to="/" className="hover:text-[#006d37]">Trang chủ</Link>
        <span>/</span>
        <Link to="/cho-do-cu" className="hover:text-[#006d37]">Chợ đồ cũ</Link>
        <span>/</span>
        <span className="text-gray-900 font-bold truncate">{item.name}</span>
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-md space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* Image */}
          <div className="aspect-4/3 w-full rounded-2xl overflow-hidden bg-gray-100 shadow-sm border border-gray-200">
            <img src={item.images[0]} alt={item.name} className="w-full h-full object-cover" />
          </div>

          {/* Details */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Badge variant={item.pricingType === 'Miễn phí' ? 'free' : 'cheap'} size="md">
                {item.pricingType === 'Miễn phí' ? 'Tặng Miễn Phí 0đ' : formatCurrency(item.price)}
              </Badge>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 leading-snug">{item.name}</h1>
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                {item.location}, {item.district}
              </p>
            </div>

            {/* Condition & Category */}
            <div className="grid grid-cols-2 gap-2 p-3 bg-gray-50 rounded-xl text-xs">
              <div>
                <span className="text-gray-400 block">Tình trạng:</span>
                <span className="font-bold text-gray-800">{item.condition}</span>
              </div>
              <div>
                <span className="text-gray-400 block">Danh mục:</span>
                <span className="font-bold text-gray-800">{item.category}</span>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-gray-700 uppercase">Mô tả từ người bán:</h3>
              <p className="text-xs text-gray-600 leading-relaxed bg-gray-50 p-3 rounded-xl">
                {item.description}
              </p>
            </div>

            {/* Seller Contact Card */}
            <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-100 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <img src={item.userAvatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                <div>
                  <h4 className="text-xs font-bold text-gray-900">{item.userName}</h4>
                  <p className="text-[11px] text-[#006d37]">Đã xác minh sinh viên</p>
                </div>
              </div>

              <Button variant="primary" size="sm" onClick={handleContactSeller} leftIcon={<MessageSquare className="w-4 h-4" />}>
                Nhắn Tin
              </Button>
            </div>
          </div>
        </div>

        {/* Safety Callout */}
        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200/60 text-xs text-amber-900 space-y-1">
          <h4 className="font-bold flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-amber-700" />
            Mẹo an toàn khi giao dịch đồ cũ sinh viên:
          </h4>
          <p>• Hẹn gặp trực tiếp tại nơi đông người (sảnh trường, ký túc xá) để kiểm tra đồ trước khi thanh toán.</p>
          <p>• Tuyệt đối không chuyển cọc trước khi xem món đồ thực tế.</p>
        </div>

        <div className="text-center pt-2">
          <button
            onClick={() => setShowReport(true)}
            className="text-xs text-gray-400 hover:text-rose-600 transition flex items-center justify-center gap-1 mx-auto"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Báo cáo tin đăng vi phạm quy tắc chợ
          </button>
        </div>
      </div>

      <ReportModal
        isOpen={showReport}
        onClose={() => setShowReport(false)}
        targetTitle={`Món đồ: ${item.name}`}
        targetId={item.id}
      />
    </div>
  );
};
