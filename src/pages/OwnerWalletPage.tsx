import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { SEOHead } from '../components/seo/SEOHead';
import { DashboardSidebar } from '../components/layout/DashboardSidebar';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { formatCurrency } from '../components/ui/Cards';
import {
  Coins,
  Sparkles,
  ArrowUpRight,
  ArrowDownLeft,
  QrCode,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  TrendingUp,
  History,
  Rocket,
  ShieldCheck,
  RotateCcw,
  Zap,
  Gift,
  HelpCircle,
  Clock,
  ArrowRight,
} from 'lucide-react';

export const OwnerWalletPage: React.FC = () => {
  const {
    currentUser,
    wallet,
    walletTransactions,
    depositXu,
    grantDemoXu,
    showToast,
  } = useAppStore();

  const [selectedPackIndex, setSelectedPackIndex] = useState<number>(3); // Mặc định gói 500k
  const [customAmountVnd, setCustomAmountVnd] = useState<number>(500000);
  const [isCopiedContent, setIsCopiedContent] = useState<boolean>(false);
  const [isProcessingDeposit, setIsProcessingDeposit] = useState<boolean>(false);

  const depositPacks = [
    { vnd: 50000, realXu: 50, bonusXu: 0, label: 'Gói Trải Nghiệm', badge: '' },
    { vnd: 100000, realXu: 100, bonusXu: 0, label: 'Gói Tiêu Chuẩn', badge: '' },
    { vnd: 200000, realXu: 200, bonusXu: 0, label: 'Gói Phổ Biến', badge: '' },
    { vnd: 500000, realXu: 500, bonusXu: 50, label: 'Gói Tiết Kiệm', badge: 'Tặng 10% Xu 🔥', popular: true },
    { vnd: 1000000, realXu: 1000, bonusXu: 100, label: 'Gói Đối Tác VIP', badge: 'Tặng 100 Xu ⭐' },
    { vnd: 2000000, realXu: 2000, bonusXu: 250, label: 'Gói Siêu Ưu Đãi', badge: 'Tặng 250 Xu 👑' },
  ];

  const selectedPack = depositPacks[selectedPackIndex] || depositPacks[3];
  const activeAmountVnd = customAmountVnd > 0 ? customAmountVnd : selectedPack.vnd;
  const calculatedRealXu = Math.floor(activeAmountVnd / 1000);
  const calculatedBonusXu = activeAmountVnd >= 500000 ? Math.floor(calculatedRealXu * 0.1) : 0;
  const calculatedTotalXu = calculatedRealXu + calculatedBonusXu;

  // Cú pháp chuyển khoản nạp Xu tự động (VD: TX XU 0988123456 500K)
  const userPhone = currentUser?.phone || '0999000002';
  const cleanPhone = userPhone.replace(/[^0-9]/g, '');
  const transferSyntax = `TX XU ${cleanPhone.slice(-6)} ${Math.floor(activeAmountVnd / 1000)}K`.toUpperCase();

  const vietQrUrl = `https://img.vietqr.io/image/970422-0888110789-compact2.png?amount=${activeAmountVnd}&addInfo=${encodeURIComponent(
    transferSyntax
  )}&accountName=${encodeURIComponent('CONG TY TRO XINH')}`;

  const handleCopySyntax = () => {
    navigator.clipboard.writeText(transferSyntax);
    setIsCopiedContent(true);
    setTimeout(() => setIsCopiedContent(false), 2000);
    showToast('Đã sao chép cú pháp!', transferSyntax, 'info');
  };

  const handleSimulateDeposit = async () => {
    setIsProcessingDeposit(true);
    setTimeout(async () => {
      await depositXu(activeAmountVnd, 'VietQR Tự Động');
      setIsProcessingDeposit(false);
    }, 1000);
  };

  return (
    <div className="flex bg-gray-50 min-h-[calc(100vh-4rem)]">
      <SEOHead
        title="Ví Xu Trọ Xinh | Trung Tâm Quản Lý Xu & Dịch Vụ Đẩy Tin"
        description="Nạp và quản lý số dư Trọ Xinh Xu. Thanh toán đẩy tin, gia hạn tin đăng và quản lý phòng trọ một chạm."
        url="/chu-tro/vi-xu"
      />

      {currentUser?.role === 'owner' && <DashboardSidebar role="owner" />}

      <main className={`flex-1 p-4 sm:p-8 ${currentUser?.role === 'owner' ? 'max-w-6xl' : 'max-w-5xl mx-auto w-full'} space-y-8 overflow-y-auto`}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black mb-1">
              <Coins className="w-3.5 h-3.5 text-[#00a854]" />
              <span>HỆ THỐNG THANH TOÁN XU NỘI BỘ</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-950 tracking-tight">
              Ví Xu Trọ Xinh
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Tỷ giá cố định: <strong>1 Xu = 1.000 VNĐ</strong> • Dùng thanh toán đẩy tin, gia hạn tin đăng và dịch vụ quản trị 1 chạm
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => grantDemoXu(500)}
              className="px-3.5 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
              title="Cộng thêm 500 Xu trải nghiệm tính năng thanh toán"
            >
              <Gift className="w-4 h-4 text-amber-700" />
              <span>+ Tặng 500 Xu (Demo)</span>
            </button>
          </div>
        </div>

        {/* ================= KHỐI 1: THẺ VÍ XU SANG TRỌNG ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Thẻ Ví Xu Gold Gradient (7 cột) */}
          <div className="lg:col-span-7 rounded-3xl bg-gradient-to-br from-emerald-900 via-[#006d37] to-slate-900 text-white p-6 sm:p-8 shadow-xl relative overflow-hidden flex flex-col justify-between border border-emerald-400/30">
            <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -right-10 w-44 h-44 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-300/40 flex items-center justify-center text-amber-300 shadow-inner">
                    <Coins className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-emerald-200">
                      TÀI KHOẢN VÍ CHỦ TRỌ
                    </span>
                    <h3 className="text-sm font-bold text-white">
                      {currentUser?.name || 'Chủ Trọ Đối Tác'}
                    </h3>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-full bg-white/10 text-emerald-200 text-xs font-bold border border-white/10">
                  1 Xu = 1.000đ
                </span>
              </div>

              <div className="pt-2">
                <p className="text-xs text-emerald-100 font-medium">Tổng số dư khả dụng:</p>
                <div className="flex items-baseline gap-3 mt-1 flex-wrap">
                  <span className="text-4xl sm:text-5xl font-black text-amber-300 tracking-tight font-mono">
                    {wallet.total_xu.toLocaleString('vi-VN')}
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-white">XU</span>
                  <span className="text-xs text-emerald-200 font-medium bg-white/10 px-2.5 py-1 rounded-lg">
                    ≈ {(wallet.total_xu * 1000).toLocaleString('vi-VN')} VNĐ
                  </span>
                </div>
              </div>

              {/* Chi tiết Xu thật & Xu thưởng */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/15">
                <div className="p-3 rounded-2xl bg-white/5 border border-white/10 space-y-0.5">
                  <p className="text-[11px] text-emerald-200">Xu Thật (Gốc nạp):</p>
                  <p className="text-lg font-black text-white font-mono">
                    {(wallet.balance_real_xu || 0).toLocaleString('vi-VN')} <span className="text-xs font-normal">Xu</span>
                  </p>
                </div>

                <div className="p-3 rounded-2xl bg-amber-400/10 border border-amber-400/20 space-y-0.5">
                  <p className="text-[11px] text-amber-200 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-amber-300" />
                    <span>Xu Thưởng (Tặng thêm):</span>
                  </p>
                  <p className="text-lg font-black text-amber-300 font-mono">
                    {(wallet.balance_bonus_xu || 0).toLocaleString('vi-VN')} <span className="text-xs font-normal">Xu</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="relative z-10 pt-5 mt-4 border-t border-white/15 flex items-center justify-between text-xs text-emerald-100">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-300" />
                Hệ thống khấu trừ ưu tiên Xu thưởng trước
              </span>
              <span className="font-mono text-[11px] text-emerald-200">ID: {wallet.id.slice(0, 16)}</span>
            </div>
          </div>

          {/* Khối Hướng Dẫn & Lợi Ích (5 cột) */}
          <div className="lg:col-span-5 bg-white rounded-3xl border border-gray-200 shadow-sm p-6 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <h3 className="font-black text-base text-gray-950 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                Quyền Lợi & Lợi Ích Của Ví Xu
              </h3>

              <div className="space-y-2.5 text-xs text-gray-600">
                <div className="flex items-start gap-2.5 p-2.5 rounded-2xl bg-emerald-50/60 border border-emerald-100">
                  <CheckCircle2 className="w-4 h-4 text-[#00a854] shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-gray-900 block">Thanh toán 1 chạm siêu tốc:</strong>
                    <span>Kích hoạt Đẩy Tin VIP và Gia Hạn Tin trong 1 giây, không cần mỗi lần đều quét app ngân hàng.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 rounded-2xl bg-amber-50/60 border border-amber-100">
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-gray-900 block">Thưởng thêm 10% khi nạp từ 500k:</strong>
                    <span>Nạp 500.000đ nhận ngay 550 Xu; nạp 1.000.000đ nhận ngay 1.100 Xu.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2.5 rounded-2xl bg-blue-50/60 border border-blue-100">
                  <Clock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-gray-900 block">Không thời hạn sử dụng:</strong>
                    <span>Xu trong ví được bảo lưu vĩnh viễn, bạn có thể nạp sẵn để dùng dần bất cứ khi nào có phòng trống.</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100 text-[11px] text-gray-500 flex items-center justify-between">
              <span>Hỗ trợ nạp Xu 24/7 qua VietQR</span>
              <a href="tel:0888110789" className="text-[#006d37] font-bold hover:underline">
                Hotline: 0888.110.789
              </a>
            </div>
          </div>
        </div>

        {/* ================= KHỐI 2: NẠP XU SIÊU TỐC QUA VIETQR ================= */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-gray-950 flex items-center gap-2">
                <QrCode className="w-5 h-5 text-[#00a854]" />
                Nạp Xu Siêu Tốc (Quét Mã VietQR Ngân Hàng)
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Chọn gói nạp hoặc nhập số tiền tùy ý. Hệ thống tự động điền số tiền và cú pháp chuyển khoản chính xác.
              </p>
            </div>

            <span className="text-xs font-bold text-[#006d37] bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 self-start sm:self-auto">
              Tỷ giá: 1 Xu = 1.000 VNĐ
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Cột trái: Chọn gói nạp (7 cột) */}
            <div className="lg:col-span-7 space-y-4">
              <label className="text-xs font-bold text-gray-800 block">
                1. Chọn Gói Nạp Ưu Đãi:
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {depositPacks.map((pack, idx) => {
                  const isSelected = selectedPackIndex === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSelectedPackIndex(idx);
                        setCustomAmountVnd(pack.vnd);
                      }}
                      className={`p-3.5 rounded-2xl border-2 text-left transition cursor-pointer relative ${
                        isSelected
                          ? 'border-[#00a854] bg-emerald-50/60 shadow-xs ring-2 ring-emerald-500/20'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      {pack.badge && (
                        <span className="absolute -top-2 right-2 bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full shadow-2xs">
                          {pack.badge}
                        </span>
                      )}
                      <span className="text-[11px] font-bold text-gray-500 block">{pack.label}</span>
                      <span className="text-base font-black text-gray-950 block mt-1">
                        {formatCurrency(pack.vnd)}
                      </span>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-xs font-black text-[#006d37]">
                          +{(pack.realXu + pack.bonusXu)} Xu
                        </span>
                        {pack.bonusXu > 0 && (
                          <span className="text-[10px] text-amber-600 font-bold">
                            (+{pack.bonusXu} thưởng)
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Tùy chỉnh số tiền nạp */}
              <div className="pt-2">
                <label className="text-xs font-bold text-gray-800 block mb-1.5">
                  Hoặc Nhập Số Tiền Tùy Ý (VNĐ):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step={10000}
                    min={20000}
                    value={customAmountVnd}
                    onChange={(e) => setCustomAmountVnd(Math.max(0, Number(e.target.value)))}
                    className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-2xl text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#00a854]"
                    placeholder="VD: 500000"
                  />
                  <span className="text-xs font-bold text-gray-500">VNĐ</span>
                </div>
                <p className="text-[11px] text-emerald-700 font-medium mt-1">
                  → Bạn sẽ nhận được: <strong>{calculatedTotalXu.toLocaleString('vi-VN')} Xu</strong>
                  {calculatedBonusXu > 0 && ` (Bao gồm ${calculatedRealXu} Xu thật + ${calculatedBonusXu} Xu thưởng khuyến mại)`}
                </p>
              </div>

              {/* Thao tác mô phỏng nạp tiền tức thì (dành cho trải nghiệm & kiểm thử) */}
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-2 mt-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-950 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    Chế Độ Nạp Thử Nghiệm Tức Thì:
                  </span>
                  <span className="text-[10px] bg-amber-200 text-amber-950 font-bold px-2 py-0.5 rounded-full">
                    Demo Mode
                  </span>
                </div>
                <p className="text-[11px] text-amber-900 leading-relaxed">
                  Nếu bạn đang trải nghiệm hoặc không muốn quét ngân hàng thật ngay lúc này, nhấn nút dưới đây để hệ thống tự động cộng <strong>+{calculatedTotalXu} Xu</strong> vào ví ngay lập tức!
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  fullWidth
                  isLoading={isProcessingDeposit}
                  onClick={handleSimulateDeposit}
                  className="bg-amber-500 hover:bg-amber-600 text-amber-950 font-black shadow-xs cursor-pointer"
                >
                  {isProcessingDeposit ? 'Đang cộng Xu vào ví...' : `Mô Phỏng Nạp +${calculatedTotalXu} Xu Vào Ví Ngay (1 Chạm)`}
                </Button>
              </div>
            </div>

            {/* Cột phải: Mã QR VietQR Tự Động (5 cột) */}
            <div className="lg:col-span-5 bg-gray-50 p-5 rounded-3xl border border-gray-200 flex flex-col items-center text-center space-y-4">
              <span className="text-xs font-bold text-gray-800 uppercase tracking-wide">
                2. Quét QR Chuyển Khoản Ngân Hàng:
              </span>

              <div className="w-52 h-52 bg-white p-2 rounded-2xl shadow-md border border-gray-200 flex items-center justify-center">
                <img
                  src={vietQrUrl}
                  alt="VietQR Nap Xu"
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="w-full space-y-2 text-xs text-left bg-white p-3.5 rounded-2xl border border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Số tiền:</span>
                  <span className="font-black text-[#006d37] text-sm">{formatCurrency(activeAmountVnd)}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Số Xu nhận:</span>
                  <span className="font-bold text-amber-700">+{calculatedTotalXu} Xu</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Ngân hàng:</span>
                  <span className="font-medium text-gray-800">Techcombank (0888110789)</span>
                </div>

                <div className="flex justify-between items-center pt-1 border-t border-gray-100">
                  <span className="text-gray-500">Cú pháp:</span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-black text-xs text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                      {transferSyntax}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopySyntax}
                      className="p-1 text-gray-500 hover:text-gray-800 transition cursor-pointer"
                      title="Sao chép cú pháp"
                    >
                      {isCopiedContent ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-gray-500 italic">
                * Sau khi chuyển khoản thành công, hệ thống Webhook SePay sẽ đối soát và tự động cộng Xu vào ví trong 3-5 giây.
              </p>
            </div>
          </div>
        </div>

        {/* ================= KHỐI 3: BẢNG GIÁ DỊCH VỤ TÍNH BẰNG XU ================= */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 sm:p-8 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div>
              <h2 className="text-base sm:text-lg font-black text-gray-950 flex items-center gap-2">
                <Rocket className="w-5 h-5 text-amber-500" />
                Bảng Quy Đổi Giá Dịch Vụ Bằng Xu
              </h2>
              <p className="text-xs text-gray-500">
                Toàn bộ các gói dịch vụ trên Trọ Xinh đều có thể thanh toán trực tiếp bằng số dư Xu
              </p>
            </div>

            <Link
              to="/chu-tro"
              className="text-xs font-bold text-[#006d37] hover:underline flex items-center gap-1"
            >
              <span>Đến trang Đẩy Tin</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-black text-gray-900 text-sm">Đẩy Lẻ 1 Ngày</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                  15 Xu
                </span>
              </div>
              <p className="text-gray-500 text-[11px]">Đẩy tin nổi lên đầu trang tìm kiếm ngay lập tức trong 24 giờ (~15.000đ).</p>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-black text-gray-900 text-sm">Đẩy Top 3 Ngày</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                  29 Xu
                </span>
              </div>
              <p className="text-gray-500 text-[11px]">Lên đầu trang tìm kiếm trong 3 ngày cuối tuần cao điểm (~29.000đ).</p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-black text-amber-950 text-sm">Đẩy Giờ Vàng 7 Ngày</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white font-black text-[10px]">
                  59 Xu 🔥
                </span>
              </div>
              <p className="text-amber-900 text-[11px]">Tự động đẩy top 2 khung giờ vàng: 11h-13h & 19h-22h mỗi ngày (~59.000đ).</p>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-black text-emerald-950 text-sm">VIP Toàn Diện 30 Ngày</span>
                <span className="px-2 py-0.5 rounded-full bg-[#00a854] text-white font-black text-[10px]">
                  199 Xu ⭐
                </span>
              </div>
              <p className="text-emerald-900 text-[11px]">Ưu tiên vị trí số 1 liên tục 30 ngày, gắn huy hiệu VIP nổi bật (~199.000đ).</p>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-black text-gray-900 text-sm">Gia Hạn Tin 15 Ngày</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 font-bold text-[10px]">
                  30 Xu
                </span>
              </div>
              <p className="text-gray-500 text-[11px]">Gia hạn tin hết hạn chu kỳ 30 ngày thêm 15 ngày hiển thị (~30.000đ).</p>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-black text-gray-900 text-sm">Gia Hạn Tin 30 Ngày</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 font-bold text-[10px]">
                  50 Xu
                </span>
              </div>
              <p className="text-gray-500 text-[11px]">Gia hạn tin hết hạn thêm 30 ngày đầy đủ với chi phí tiết kiệm nhất (~50.000đ).</p>
            </div>

            <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-black text-teal-950 text-sm">Đăng Lại Lần 1</span>
                <span className="px-2 py-0.5 rounded-full bg-teal-600 text-white font-black text-[10px]">
                  0 Xu (FREE)
                </span>
              </div>
              <p className="text-teal-900 text-[11px]">Trọ Xinh tặng miễn phí lần đăng lại đầu tiên cho mọi phòng trọ (0 Xu).</p>
            </div>

            <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-black text-teal-950 text-sm">Xác Thực Chính Chủ</span>
                <span className="px-2 py-0.5 rounded-full bg-teal-600 text-white font-black text-[10px]">
                  TẶNG 48H VIP
                </span>
              </div>
              <p className="text-teal-900 text-[11px]">Cấp Tick Xanh Batdongsan và tặng miễn phí 48 giờ đẩy tin tự động.</p>
            </div>
          </div>
        </div>

        {/* ================= KHỐI 4: LỊCH SỬ BIẾN ĐỘNG SỐ DƯ XU ================= */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <h2 className="text-base sm:text-lg font-black text-gray-950 flex items-center gap-2">
              <History className="w-5 h-5 text-[#00a854]" />
              Lịch Sử Biến Động Số Dư Xu
            </h2>
            <span className="text-xs text-gray-400">
              {walletTransactions.length} giao dịch ghi nhận
            </span>
          </div>

          {walletTransactions.length === 0 ? (
            <div className="text-center py-10 text-xs text-gray-400">
              Chưa có giao dịch Xu nào.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500">
                    <th className="py-3 px-3 font-semibold">Loại</th>
                    <th className="py-3 px-3 font-semibold">Nội dung giao dịch</th>
                    <th className="py-3 px-3 font-semibold text-right">Số Xu</th>
                    <th className="py-3 px-3 font-semibold">Mã tham chiếu</th>
                    <th className="py-3 px-3 font-semibold">Thời gian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {walletTransactions.map((tx) => {
                    const isPlus = tx.total_amount_xu > 0;
                    return (
                      <tr key={tx.id} className="hover:bg-gray-50/60 transition">
                        <td className="py-3.5 px-3">
                          {isPlus ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[11px]">
                              <ArrowDownLeft className="w-3 h-3 text-emerald-600" />
                              Nạp Xu
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold text-[11px]">
                              <ArrowUpRight className="w-3 h-3 text-rose-600" />
                              Chi tiêu Xu
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-3 font-medium text-gray-900">
                          {tx.reason}
                        </td>

                        <td className="py-3.5 px-3 text-right font-mono font-black text-sm">
                          <span className={isPlus ? 'text-[#00a854]' : 'text-rose-600'}>
                            {isPlus ? `+${tx.total_amount_xu.toLocaleString('vi-VN')}` : `${tx.total_amount_xu.toLocaleString('vi-VN')}`} Xu
                          </span>
                        </td>

                        <td className="py-3.5 px-3 font-mono text-[11px] text-gray-500">
                          {tx.reference_id || '—'}
                        </td>

                        <td className="py-3.5 px-3 text-gray-500">
                          {new Date(tx.created_at).toLocaleString('vi-VN')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

