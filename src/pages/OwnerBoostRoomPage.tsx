import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { SEOHead } from '../components/seo/SEOHead';
import { DashboardSidebar } from '../components/layout/DashboardSidebar';
import { Button } from '../components/ui/Button';
import { RoomCard, formatPrice, formatCurrency } from '../components/ui/Cards';
import {
  Rocket,
  Sparkles,
  ArrowLeft,
  Eye,
  Clock,
  AlertCircle,
  QrCode,
  Check,
  Copy,
  Coins,
  RefreshCw,
  FlaskConical,
  Smartphone,
  Building2,
} from 'lucide-react';
import { isCurrentlyGoldenHour } from '../utils/listingLifecycle';
import { BOOST_PACKAGES, XU_TO_VND_RATE } from '../lib/monetizationCatalog';
import {
  purchaseRoomBoostWithXu,
  createServicePaymentOrder,
  getServicePaymentOrderStatus,
  confirmDemoServiceOrder,
  ServicePaymentOrderResponse,
} from '../lib/api/monetization';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

export const OwnerBoostRoomPage: React.FC = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, rooms, boostRoom, wallet, spendXu, fetchWallet, showToast } = useAppStore();

  const room = rooms.find((r) => r.id === roomId) || rooms[0];

  const [selectedOptionId, setSelectedOptionId] = useState<string>('7days');
  const [paymentMethod, setPaymentMethod] = useState<'wallet_xu' | 'vietqr' | 'momo'>('wallet_xu');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [qrOrder, setQrOrder] = useState<ServicePaymentOrderResponse | null>(null);
  const [isCheckingQr, setIsCheckingQr] = useState<boolean>(false);
  const [isConfirmingDemo, setIsConfirmingDemo] = useState<boolean>(false);
  const [isCopiedContent, setIsCopiedContent] = useState<boolean>(false);

  const selectedOption =
    BOOST_PACKAGES.find((o) => o.id === selectedOptionId) || BOOST_PACKAGES[2];
  const isGoldenNow = isCurrentlyGoldenHour();
  const walletTotalXu = wallet?.total_xu ?? 0;
  const hasEnoughXu = walletTotalXu >= selectedOption.priceXu;
  const topupReturnUrl = `/chu-tro/vi-xu?buoc=chon-goi&returnUrl=${encodeURIComponent(location.pathname)}`;

  const completeBoostAndRedirect = (orderCode: string, methodUsed: string) => {
    if (room) {
      boostRoom(
        room.id,
        selectedOption.days,
        selectedOption.name,
        selectedOption.priceXu * XU_TO_VND_RATE,
        methodUsed as any
      );
    }
    if (currentUser?.id) {
      fetchWallet(currentUser.id);
    }
    setShowQrModal(false);
    const qs = new URLSearchParams({
      service: 'boost',
      orderId: orderCode,
      plan: selectedOption.id,
      amountXu: String(selectedOption.priceXu),
      amount: String(selectedOption.priceXu * XU_TO_VND_RATE),
      method: methodUsed,
      status: 'success',
      returnUrl: '/chu-tro',
    });
    navigate(`/thanh-toan/ket-qua?${qs.toString()}`);
  };

  // Realtime + Polling khi modal QR đang mở
  useEffect(() => {
    if (!showQrModal || !qrOrder?.orderCode) return;

    const interval = setInterval(async () => {
      try {
        const res = await getServicePaymentOrderStatus(qrOrder.orderCode);
        if (res.status === 'paid') {
          clearInterval(interval);
          completeBoostAndRedirect(qrOrder.orderCode, paymentMethod);
        }
      } catch (err) {
        console.warn('[OwnerBoostRoomPage] Poll warning:', err);
      }
    }, 3000);

    let channel: any = null;
    if (isSupabaseConfigured && supabase) {
      channel = supabase
        .channel(`boost-order-${qrOrder.orderCode}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'transactions',
            filter: `order_code=eq.${qrOrder.orderCode}`,
          },
          (payload: any) => {
            if (payload?.new?.status === 'paid') {
              clearInterval(interval);
              completeBoostAndRedirect(qrOrder.orderCode, paymentMethod);
            }
          }
        )
        .subscribe();
    }

    return () => {
      clearInterval(interval);
      if (channel && supabase) supabase.removeChannel(channel);
    };
  }, [showQrModal, qrOrder?.orderCode, paymentMethod]);

  if (!room) {
    return (
      <div className="flex bg-gray-50 min-h-[calc(100vh-4rem)]">
        <DashboardSidebar role="owner" />
        <main className="flex-1 p-8 flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <Building2 className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-black text-gray-900">Chưa tìm thấy thông tin phòng để đẩy tin</h1>
          <p className="text-xs text-gray-500 max-w-md">
            Vui lòng chọn một phòng trọ đang hoạt động từ danh sách quản lý của bạn để sử dụng dịch vụ Đẩy tin.
          </p>
          <Link to="/chu-tro">
            <Button variant="primary" size="md">
              Quay lại Danh sách phòng
            </Button>
          </Link>
        </main>
      </div>
    );
  }

  const previewRoom = {
    ...room,
    isBoosted: true,
    boostBadge: selectedOption.id === '30days' ? 'VIP Nổi Bật' : 'Đẩy Giờ Vàng',
  };

  const handleOpenPayment = async () => {
    if (!currentUser) {
      navigate(`/dang-nhap?returnUrl=${encodeURIComponent(location.pathname)}`);
      return;
    }

    if (paymentMethod === 'wallet_xu') {
      await handlePayWithXu();
      return;
    }

    setIsProcessing(true);
    try {
      const order = await createServicePaymentOrder({
        serviceType: 'boost',
        itemId: selectedOption.id,
        roomId: room.id,
        method: paymentMethod,
      });
      setQrOrder(order);
      setShowQrModal(true);
    } catch (err: any) {
      showToast('Không thể tạo mã thanh toán', err?.message || 'Vui lòng thử lại.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePayWithXu = async () => {
    if (!hasEnoughXu) {
      showToast(
        'Số dư Xu không đủ',
        `Gói này cần ${selectedOption.priceXu} Xu nhưng bạn chỉ còn ${walletTotalXu} Xu. Vui lòng nạp thêm Xu.`,
        'error'
      );
      return;
    }

    setIsProcessing(true);
    try {
      if (isSupabaseConfigured) {
        const res = await purchaseRoomBoostWithXu({
          roomId: room.id,
          boostId: selectedOption.id,
        });
        completeBoostAndRedirect(res.order_code || `TXBST_${Date.now().toString().slice(-6)}`, 'wallet_xu');
        return;
      }

      // Offline demo fallback
      const spendOk = await spendXu(
        selectedOption.priceXu,
        `Đẩy tin "${room.title || room.roomNumber}" (${selectedOption.name})`,
        `BST_${room.roomNumber || room.id.slice(0, 6)}`
      );
      if (!spendOk) {
        setIsProcessing(false);
        return;
      }
      completeBoostAndRedirect(`TXBST_${Date.now().toString().slice(-6)}`, 'wallet_xu');
    } catch (err: any) {
      showToast('Không thể kích hoạt đẩy tin', err?.message || 'Vui lòng thử lại sau.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRecheckQr = async () => {
    if (!qrOrder?.orderCode) return;
    setIsCheckingQr(true);
    try {
      const res = await getServicePaymentOrderStatus(qrOrder.orderCode);
      if (res.status === 'paid') {
        completeBoostAndRedirect(qrOrder.orderCode, paymentMethod);
      } else {
        showToast(
          'Đang chờ đối soát giao dịch',
          'Hệ thống sẽ tự động kích hoạt đẩy tin ngay khi nhận được thanh toán.',
          'info'
        );
      }
    } catch (err: any) {
      showToast('Lỗi kiểm tra giao dịch', err?.message || 'Vui lòng thử lại.', 'error');
    } finally {
      setIsCheckingQr(false);
    }
  };

  const handleConfirmDemoSandbox = async () => {
    if (!qrOrder?.orderCode || !currentUser?.isDemoAccount) return;
    setIsConfirmingDemo(true);
    try {
      await confirmDemoServiceOrder(qrOrder.orderCode);
      completeBoostAndRedirect(qrOrder.orderCode, paymentMethod);
    } catch (err: any) {
      showToast('Lỗi xác nhận Demo Sandbox', err?.message || 'Vui lòng thử lại.', 'error');
    } finally {
      setIsConfirmingDemo(false);
    }
  };

  return (
    <div className="flex bg-gray-50 min-h-[calc(100vh-4rem)]">
      <SEOHead
        title={`Đẩy Tin Nổi Bật - ${room.title} | Trọ Xinh`}
        description="Đưa tin đăng phòng trọ lên vị trí đầu trang tìm kiếm để tiếp cận khách thuê nhanh hơn."
        url={`/chu-tro/nang-cap-tin/${roomId || room.id}`}
      />

      <DashboardSidebar role="owner" />

      <main className="flex-1 p-4 sm:p-8 max-w-6xl space-y-8 overflow-y-auto">
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
              <span>Dịch vụ 2 • Gói Đẩy Tin Nổi Bật</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              Đẩy Tin Nổi Bật: {room.title}
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Phòng: <strong className="text-gray-800">{room.roomNumber}</strong> • Giá thuê:{' '}
              <strong className="text-[#006d37]">{formatPrice(room.price)}</strong> • {room.address}, {room.district}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left 7 Cols: Choose Boost Option */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-3xl border border-gray-200 shadow-xs p-6 space-y-4">
              <h2 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#006d37]" />
                Chọn Gói Đẩy Tin (Giá theo Xu nội bộ)
              </h2>

              <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-950">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Chính sách sử dụng Xu cho Gói đẩy tin</span>
                </div>
                <p className="text-[11px] text-amber-900 leading-relaxed">
                  Xu sẽ được trừ ngay khi xác nhận thanh toán. Xem thêm tại{' '}
                  <Link to="/terms" className="font-bold text-[#006d37] underline">
                    Điều khoản dịch vụ
                  </Link>
                  . Đẩy tin không kéo dài thời hạn hiển thị 30 ngày của tin gốc.
                </p>
                {isGoldenNow && (
                  <p className="text-[11px] font-bold text-emerald-700 flex items-center gap-1 pt-0.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Đang trong Khung Giờ Vàng (11h-13h &amp; 19h-22h)!</span>
                  </p>
                )}
              </div>

              <div className="space-y-3">
                {BOOST_PACKAGES.map((opt) => {
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
                        <span className="absolute -top-2.5 right-4 bg-[#006d37] text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-xs whitespace-nowrap">
                          {opt.badgeText}
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
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-extrabold text-gray-900">{opt.name}</span>
                              {!opt.popular && opt.badgeText && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                                  {opt.badgeText}
                                </span>
                              )}
                              {opt.isGoldenHour && (
                                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                                  Giờ vàng: 11h-13h &amp; 19h-22h
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{opt.description}</p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-lg font-black text-[#006d37] font-mono">
                            {opt.priceXu} Xu
                          </p>
                          <p className="text-[11px] text-gray-500 font-medium">{opt.days} ngày</p>
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-md mt-1 inline-block">
                            {opt.isGoldenHour ? 'Giờ vàng 11h–13h & 19h–22h' : 'Ưu tiên top'}
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
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900">Phương Thức Thanh Toán</h3>
                <Link
                  to={topupReturnUrl}
                  className="text-xs font-bold text-[#006d37] hover:underline flex items-center gap-1"
                >
                  <Coins className="w-3.5 h-3.5 text-amber-500" />
                  <span>
                    Số dư Xu: <strong>{walletTotalXu.toLocaleString('vi-VN')} Xu</strong>
                  </span>
                </Link>
              </div>

              {/* Thanh toán bằng Xu nội bộ */}
              <div
                onClick={() => setPaymentMethod('wallet_xu')}
                className={`p-4 rounded-2xl border-2 transition cursor-pointer relative ${
                  paymentMethod === 'wallet_xu'
                    ? 'border-[#006d37] bg-emerald-50/70 shadow-xs'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 text-amber-950 flex items-center justify-center font-black shadow-xs">
                      <Coins className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-black text-sm text-gray-950">Xu nội bộ (1 Chạm)</span>
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full">
                          Khuyên dùng
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5">
                        Số dư khả dụng:{' '}
                        <strong className="text-amber-800 font-mono">
                          {walletTotalXu.toLocaleString('vi-VN')} Xu
                        </strong>
                        {hasEnoughXu ? (
                          <span className="text-emerald-700 font-bold ml-1.5">✓ Đủ Xu thanh toán</span>
                        ) : (
                          <span className="text-rose-600 font-bold ml-1.5">
                            • Thiếu {selectedOption.priceXu - walletTotalXu} Xu
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-base font-black text-[#006d37] font-mono">
                      {selectedOption.priceXu} Xu
                    </span>
                  </div>
                </div>

                {!hasEnoughXu && (
                  <div className="mt-3 pt-3 border-t border-amber-200/60 flex items-center justify-between gap-2 text-xs">
                    <span className="text-rose-700">Số dư Xu hiện tại chưa đủ để kích hoạt gói này</span>
                    <Link
                      to={topupReturnUrl}
                      className="px-3 py-1.5 bg-amber-400 hover:bg-amber-500 text-amber-950 rounded-xl font-black text-[11px] transition shadow-xs shrink-0"
                    >
                      Nạp thêm Xu ngay →
                    </Link>
                  </div>
                )}
              </div>

              {/* Thanh toán trực tiếp VietQR / MoMo */}
              <div className="pt-2">
                <span className="text-xs font-semibold text-gray-500 block mb-2">
                  Hoặc thanh toán trực tiếp qua mã QR:
                </span>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('vietqr')}
                    className={`p-3 rounded-2xl border-2 flex items-center justify-center gap-2 text-xs font-bold transition cursor-pointer ${
                      paymentMethod === 'vietqr'
                        ? 'border-[#006d37] bg-emerald-50 text-[#006d37]'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <QrCode className="w-4 h-4 text-[#006d37]" />
                    <span>VietQR ({formatCurrency(selectedOption.priceXu * XU_TO_VND_RATE)})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('momo')}
                    className={`p-3 rounded-2xl border-2 flex items-center justify-center gap-2 text-xs font-bold transition cursor-pointer ${
                      paymentMethod === 'momo'
                        ? 'border-[#a50064] bg-pink-50 text-[#a50064]'
                        : 'border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Smartphone className="w-4 h-4 text-[#a50064]" />
                    <span>Ví MoMo ({formatCurrency(selectedOption.priceXu * XU_TO_VND_RATE)})</span>
                  </button>
                </div>
              </div>
            </div>

            {paymentMethod === 'wallet_xu' ? (
              hasEnoughXu ? (
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  isLoading={isProcessing}
                  onClick={handleOpenPayment}
                  className="bg-[#00a854] hover:bg-[#008f47] text-white font-black py-4 text-sm shadow-md cursor-pointer"
                  leftIcon={<Rocket className="w-5 h-5 text-amber-300" />}
                >
                  Thanh Toán {selectedOption.priceXu} Xu — Đẩy Tin Ngay
                </Button>
              ) : (
                <Link to={topupReturnUrl} className="block">
                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    className="bg-amber-500 hover:bg-amber-600 text-white font-black py-4 text-sm shadow-md cursor-pointer"
                    leftIcon={<Coins className="w-5 h-5" />}
                  >
                    Nạp Thêm Xu ({walletTotalXu}/{selectedOption.priceXu} Xu) →
                  </Button>
                </Link>
              )
            ) : (
              <Button
                variant="primary"
                size="lg"
                fullWidth
                isLoading={isProcessing}
                onClick={handleOpenPayment}
                className="py-4 text-sm shadow-md font-black cursor-pointer"
                leftIcon={<Rocket className="w-5 h-5" />}
              >
                Tạo Mã QR Thanh Toán ({formatCurrency(selectedOption.priceXu * XU_TO_VND_RATE)})
              </Button>
            )}
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
                Sau khi kích hoạt, thẻ phòng của bạn sẽ được gắn huy hiệu nổi bật và ưu tiên hiển thị ở các vị trí hàng đầu trên trang tìm kiếm.
              </p>

              <div className="pointer-events-none transform scale-95 origin-top">
                <RoomCard room={previewRoom} />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* MODAL QUÉT MÃ VIETQR / MOMO ĐỐI SOÁT TỰ ĐỘNG */}
      {showQrModal && qrOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#00a854] flex items-center justify-center">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-gray-900">
                    {paymentMethod === 'momo' ? 'Quét Mã MoMo Đẩy Tin' : 'Quét Mã VietQR Đẩy Tin'}
                  </h3>
                  <p className="text-[11px] text-gray-500">{selectedOption.name}</p>
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
                  src={qrOrder.qrCode}
                  alt="QR Đẩy Tin Trọ Xinh"
                  className="w-56 h-56 mx-auto rounded-xl object-contain"
                />
              </div>

              <div className="text-[11px] text-gray-600">
                {qrOrder.receiverInfo.bankName} • STK:{' '}
                <strong className="font-mono text-gray-900">{qrOrder.receiverInfo.accountNumber}</strong> •{' '}
                {qrOrder.receiverInfo.accountName}
              </div>

              <div className="space-y-1.5 text-xs text-left bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-100">
                <div className="flex justify-between items-center text-gray-600">
                  <span>Số tiền ({qrOrder.amountXu} Xu):</span>
                  <span className="font-black text-[#006d37] text-sm">{formatCurrency(qrOrder.amountVnd)}</span>
                </div>
                <div className="flex justify-between items-center text-gray-600 pt-1 border-t border-emerald-200/50">
                  <span>Nội dung chuyển khoản:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-black text-gray-900 bg-white px-2 py-0.5 rounded-md border border-gray-200">
                      {qrOrder.transferContent}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(qrOrder.transferContent);
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

            <div className="space-y-2 pt-1">
              <button
                type="button"
                disabled={isCheckingQr}
                onClick={handleRecheckQr}
                className="w-full py-2.5 rounded-xl bg-[#00a854] hover:bg-[#008f47] text-white text-xs font-black transition flex items-center justify-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isCheckingQr ? 'animate-spin' : ''}`} />
                <span>{isCheckingQr ? 'Đang kiểm tra...' : 'Kiểm tra trạng thái thanh toán'}</span>
              </button>

              {currentUser?.isDemoAccount && (
                <button
                  type="button"
                  disabled={isConfirmingDemo}
                  onClick={handleConfirmDemoSandbox}
                  className="w-full py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <FlaskConical className="w-3.5 h-3.5" />
                  <span>{isConfirmingDemo ? 'Đang xác nhận Demo...' : 'Xác nhận Demo Sandbox'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="w-full py-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-bold hover:bg-gray-50 transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
