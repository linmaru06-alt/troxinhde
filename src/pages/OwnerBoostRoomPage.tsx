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
  Clock,
  AlertCircle,
  QrCode,
  Check,
  Copy,
} from 'lucide-react';
import { isCurrentlyGoldenHour } from '../utils/listingLifecycle';

export const OwnerBoostRoomPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { rooms, boostRoom, showToast } = useAppStore();

  const room = rooms.find((r) => r.id === roomId) || rooms[0];

  const boostOptions = [
    {
      id: 'single',
      days: 1,
      xu: 15,
      title: 'Đẩy Lẻ 1 Lần',
      price: 15000,
      badge: 'Tiết kiệm',
      description: 'Đẩy tin nổi lên đầu trang tìm kiếm ngay lập tức trong 24 giờ.',
      multiplier: 'x1.5',
    },
    {
      id: '3days',
      days: 3,
      xu: 29,
      title: 'Gói Đẩy Top 3 Ngày',
      price: 29000,
      badge: 'Cuối tuần',
      description: 'Lên đầu trang tìm kiếm trong 3 ngày cuối tuần cao điểm.',
      multiplier: 'x2',
    },
    {
      id: '7days',
      days: 7,
      xu: 59,
      title: 'Đẩy Giờ Vàng 7 Ngày',
      price: 59000,
      originalPrice: 75000,
      popular: true,
      badge: 'Bán chạy nhất 🔥',
      description: 'Tự động đẩy top vào 2 khung giờ vàng: 11h-13h & 19h-22h mỗi ngày.',
      multiplier: 'x4',
      isGoldenHour: true,
    },
    {
      id: '30days',
      days: 30,
      xu: 199,
      title: 'Gói VIP Toàn Diện 30 Ngày',
      price: 199000,
      originalPrice: 300000,
      badge: 'Tiết kiệm 34% ⭐',
      description: 'Vị trí ưu tiên số 1 liên tục 30 ngày, hiển thị gấp đôi, gắn huy hiệu VIP.',
      multiplier: 'x8',
    },
  ];

  const [selectedOptionId, setSelectedOptionId] = useState<string>('7days');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('vietqr');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [isCopiedContent, setIsCopiedContent] = useState<boolean>(false);

  const selectedOption = boostOptions.find((o) => o.id === selectedOptionId) || boostOptions[2];
  const isGoldenNow = isCurrentlyGoldenHour();

  // Preview mock of the boosted room
  const previewRoom = {
    ...room,
    isBoosted: true,
    boostBadge: selectedOption.id === '30days' ? 'VIP Nổi Bật' : 'Đẩy Giờ Vàng',
  };

  const transferContent = `TX BOOST ${room.roomNumber || room.id.slice(0, 6)}`.toUpperCase();
  const vietQrUrl = `https://img.vietqr.io/image/970422-0888110789-compact2.png?amount=${selectedOption.price}&addInfo=${encodeURIComponent(
    transferContent
  )}&accountName=${encodeURIComponent('CONG TY TRO XINH')}`;

  const handleOpenPayment = () => {
    setShowQrModal(true);
  };

  const handleConfirmPaid = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const tx = boostRoom(room.id, selectedOption.days, selectedOption.title, selectedOption.price, paymentMethod);
      setIsProcessing(false);
      setShowQrModal(false);
      showToast(
        'Đã kích hoạt đẩy tin thành công! 🚀',
        `Phòng ${room.roomNumber} đã được đẩy lên vị trí nổi bật trong ${selectedOption.days} ngày.`,
        'success'
      );
      navigate(`/thanh-toan/ket-qua?orderId=${tx.orderId}&amount=${selectedOption.price}&method=${paymentMethod}&status=success`);
    }, 1000);
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

              {/* Thông báo tỷ giá cố định & quy tắc đẩy tin */}
              <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-950">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Quy định đẩy tin Trọ Xinh (1 Xu = 1.000đ)</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Đẩy tin giúp phòng của bạn nổi bật trên đầu kết quả tìm kiếm và bản đồ. <strong>Đẩy tin không tự động kéo dài hạn 30 ngày</strong> của tin đăng.
                </p>
                {isGoldenNow && (
                  <p className="text-[11px] font-bold text-emerald-700 flex items-center gap-1 pt-0.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Đang trong Khung Giờ Vàng! Gói 7 ngày đang tự động kích hoạt đẩy top.</span>
                  </p>
                )}
              </div>

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
                              {opt.isGoldenHour && (
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                                  Giờ vàng: 11h-13h & 19h-22h
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{opt.description}</p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-base font-black text-[#006d37]">{formatCurrency(opt.price)}</p>
                          <p className="text-[11px] font-bold text-amber-800">~{opt.xu} Xu</p>
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
              <h3 className="text-sm font-bold text-gray-900">Phương Thức Thanh Toán Trực Tiếp (VNĐ)</h3>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('vietqr')}
                  className={`p-3 rounded-2xl border-2 flex items-center gap-2 text-xs font-bold transition cursor-pointer ${
                    paymentMethod === 'vietqr'
                      ? 'border-[#006d37] bg-emerald-50 text-[#006d37]'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="w-3 h-3 rounded-full bg-[#006d37]" />
                  VietQR Chuyển Khoản
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('momo')}
                  className={`p-3 rounded-2xl border-2 flex items-center gap-2 text-xs font-bold transition cursor-pointer ${
                    paymentMethod === 'momo'
                      ? 'border-[#a50064] bg-pink-50 text-[#a50064]'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="w-3 h-3 rounded-full bg-[#a50064]" />
                  Ví MoMo
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('vnpay')}
                  className={`p-3 rounded-2xl border-2 flex items-center gap-2 text-xs font-bold transition cursor-pointer ${
                    paymentMethod === 'vnpay'
                      ? 'border-[#005ba9] bg-blue-50 text-[#005ba9]'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="w-3 h-3 rounded-full bg-[#005ba9]" />
                  VNPay QR
                </button>
              </div>
            </div>

            <Button
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isProcessing}
              onClick={handleOpenPayment}
              leftIcon={<Rocket className="w-4 h-4" />}
            >
              Mở Mã Thanh Toán ({formatCurrency(selectedOption.price)} • {selectedOption.xu} Xu)
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

      {/* MODAL QUÉT MÃ VIETQR SEPAY ĐỘNG THANH TOÁN ĐẨY TIN */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#00a854] flex items-center justify-center">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-gray-900">Quét Mã VietQR Đẩy Tin</h3>
                  <p className="text-[11px] text-gray-500">{selectedOption.title}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="text-center space-y-3">
              <div className="p-3 bg-gray-50 rounded-2xl border border-dashed border-gray-200 inline-block shadow-inner">
                <img
                  src={vietQrUrl}
                  alt="VietQR Đẩy Tin Trọ Xinh"
                  className="w-56 h-56 mx-auto rounded-xl object-contain"
                />
              </div>

              <div className="space-y-1.5 text-xs text-left bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-100">
                <div className="flex justify-between items-center text-gray-600">
                  <span>Số tiền:</span>
                  <span className="font-black text-[#006d37] text-sm">{formatCurrency(selectedOption.price)}</span>
                </div>
                <div className="flex justify-between items-center text-gray-600">
                  <span>Tương đương:</span>
                  <span className="font-bold text-amber-800">{selectedOption.xu} Xu</span>
                </div>
                <div className="flex justify-between items-center text-gray-600 pt-1 border-t border-emerald-200/50">
                  <span>Nội dung chuyển khoản:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-black text-gray-900 bg-white px-2 py-0.5 rounded-md border border-gray-200">
                      {transferContent}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(transferContent);
                        setIsCopiedContent(true);
                        setTimeout(() => setIsCopiedContent(false), 2000);
                      }}
                      className="p-1 hover:bg-white rounded text-gray-600 transition cursor-pointer"
                      title="Sao chép nội dung"
                    >
                      {isCopiedContent ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="w-1/3 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-xs font-bold hover:bg-gray-50 transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleConfirmPaid}
                className="w-2/3 py-2.5 rounded-xl bg-[#00a854] hover:bg-[#008f47] text-white text-xs font-black transition flex items-center justify-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isProcessing ? 'Đang kích hoạt...' : 'Tôi Đã Chuyển Khoản'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
