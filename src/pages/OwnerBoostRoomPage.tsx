import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { PaymentMethod } from '../types';
import { SEOHead } from '../components/seo/SEOHead';
import { DashboardSidebar } from '../components/layout/DashboardSidebar';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { RoomCard, formatPrice, formatCurrency } from '../components/ui/Cards';
import {
  Rocket,
  Sparkles,
  Zap,
  Crown,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  TrendingUp,
  Eye,
  ShieldCheck,
} from 'lucide-react';

export const OwnerBoostRoomPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { rooms, boostRoom, showToast } = useAppStore();

  const room = rooms.find((r) => r.id === roomId) || rooms[0];

  const boostOptions = [
    {
      id: '3days',
      days: 3,
      title: 'Gói Đẩy Top 3 Ngày',
      price: 29000,
      badge: 'Cơ bản',
      description: 'Lên đầu trang tìm kiếm trong 3 ngày cuối tuần cao điểm.',
      multiplier: 'x2',
    },
    {
      id: '7days',
      days: 7,
      title: 'Gói Đẩy Top 7 Ngày',
      price: 59000,
      originalPrice: 75000,
      popular: true,
      badge: 'Bán chạy nhất 🔥',
      description: 'Lên đầu toàn bộ danh sách tìm kiếm & bản đồ trong 1 tuần.',
      multiplier: 'x4',
    },
    {
      id: '30days',
      days: 30,
      title: 'Gói VIP Toàn Diện 30 Ngày',
      price: 199000,
      originalPrice: 300000,
      badge: 'Tiết kiệm 40% ⭐',
      description: 'Vị trí ưu tiên số 1 liên tục 30 ngày, gắn huy hiệu Tin Nổi Bật.',
      multiplier: 'x8',
    },
  ];

  const [selectedOptionId, setSelectedOptionId] = useState<string>('7days');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('momo');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const selectedOption = boostOptions.find((o) => o.id === selectedOptionId) || boostOptions[1];

  // Preview mock of the boosted room
  const previewRoom = {
    ...room,
    isBoosted: true,
    boostBadge: 'Tin Nổi Bật',
  };

  const handleConfirmBoost = async () => {
    setIsProcessing(true);
    await new Promise((resolve) => setTimeout(resolve, 600));

    const tx = boostRoom(room.id, selectedOption.days, selectedOption.title, selectedOption.price, paymentMethod);

    navigate(`/thanh-toan/ket-qua?orderId=${tx.orderId}&amount=${selectedOption.price}&method=${paymentMethod}&status=success`);
  };

  return (
    <div className="flex bg-gray-50 min-h-[calc(100vh-4rem)]">
      <SEOHead
        title={`Đẩy Tin Nổi Bật - ${room.title} | TroXinh`}
        description="Đưa tin đăng phòng trọ lên vị trí đầu tiên trang tìm kiếm và bản đồ để tiếp cận khách thuê nhanh chóng."
        url={`/chu-tro/nang-cap-tin/${roomId}`}
      />

      <DashboardSidebar role="owner" />

      <main className="flex-1 p-4 sm:p-8 max-w-6xl space-y-8 overflow-y-auto">
        {/* Breadcrumb Back */}
        <Link
          to="/chu-tro"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-[#006d37] transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại Quản lý phòng</span>
        </Link>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-bold mb-2">
              <Rocket className="w-3.5 h-3.5 text-amber-600" />
              <span>Công Cụ Đẩy Tin Tiếp Cận Nhanh</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              Đẩy Tin Nổi Bật: {room.title}
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Phòng: <strong className="text-gray-800">{room.roomNumber}</strong> • Giá: <strong className="text-[#006d37]">{formatPrice(room.price)}</strong> • Địa chỉ: {room.address}, {room.district}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left 7 Cols: Choose Boost Option */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-3xl border border-gray-200 shadow-xs p-6 space-y-4">
              <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#006d37]" />
                Chọn Gói Đẩy Tin
              </h2>

              <div className="space-y-3">
                {boostOptions.map((opt) => {
                  const isSelected = selectedOptionId === opt.id;
                  return (
                    <label
                      key={opt.id}
                      onClick={() => setSelectedOptionId(opt.id)}
                      className={`block p-5 rounded-2xl border-2 cursor-pointer transition relative ${
                        isSelected
                          ? 'border-[#006d37] bg-emerald-50/40 shadow-xs'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      {opt.popular && (
                        <span className="absolute -top-2.5 right-4 bg-[#006d37] text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-xs">
                          {opt.badge}
                        </span>
                      )}

                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="boost_plan"
                            checked={isSelected}
                            onChange={() => setSelectedOptionId(opt.id)}
                            className="w-4 h-4 text-[#006d37] focus:ring-[#006d37]"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-extrabold text-gray-900">{opt.title}</span>
                              {!opt.popular && opt.badge && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                  {opt.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{opt.description}</p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-base font-black text-[#006d37]">{formatCurrency(opt.price)}</p>
                          {opt.originalPrice && (
                            <p className="text-[10px] text-gray-400 line-through">
                              {formatCurrency(opt.originalPrice)}
                            </p>
                          )}
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-md mt-1 inline-block">
                            Lượt xem {opt.multiplier}
                          </span>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="bg-white rounded-3xl border border-gray-200 shadow-xs p-6 space-y-4">
              <h3 className="text-sm font-bold text-gray-900">Phương Thức Thanh Toán</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('momo')}
                  className={`p-3 rounded-2xl border-2 flex items-center gap-2 text-xs font-bold transition ${
                    paymentMethod === 'momo'
                      ? 'border-[#a50064] bg-pink-50 text-[#a50064]'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="w-3 h-3 rounded-full bg-[#a50064]" />
                  Ví MoMo (Khuyên dùng)
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('vnpay')}
                  className={`p-3 rounded-2xl border-2 flex items-center gap-2 text-xs font-bold transition ${
                    paymentMethod === 'vnpay'
                      ? 'border-[#005ba9] bg-blue-50 text-[#005ba9]'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="w-3 h-3 rounded-full bg-[#005ba9]" />
                  VNPay QR Code
                </button>
              </div>
            </div>

            <Button
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isProcessing}
              onClick={handleConfirmBoost}
              leftIcon={<Rocket className="w-4 h-4" />}
            >
              Kích Hoạt Đẩy Tin ({formatCurrency(selectedOption.price)})
            </Button>
          </div>

          {/* Right 5 Cols: Live Card Preview */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-3xl border border-gray-200 shadow-xs p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-[#006d37]" />
                  Xem Trước Tin Nổi Bật
                </h3>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                  Live Preview
                </span>
              </div>

              <p className="text-xs text-gray-500 leading-relaxed">
                Sau khi kích hoạt, thẻ phòng của bạn sẽ được gắn huy hiệu vàng ánh kim và ưu tiên hiển thị ở các vị trí hàng đầu trên trang tìm kiếm.
              </p>

              {/* Render RoomCard Preview */}
              <div className="pointer-events-none transform scale-95 origin-top">
                <RoomCard room={previewRoom} />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
