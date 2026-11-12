import React from 'react';
import { K23Wallet } from '../../lib/api/k23Wallet';
import { User } from '../../types';
import {
  Coins,
  Sparkles,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Clock,
  Info,
  PlusCircle,
  ArrowRight,
} from 'lucide-react';

interface WalletBalanceCardProps {
  currentUser: User | null;
  wallet: K23Wallet;
  isLoading?: boolean;
  onStartTopup?: () => void;
}

export const WalletBalanceCard: React.FC<WalletBalanceCardProps> = ({
  currentUser,
  wallet,
  isLoading = false,
  onStartTopup,
}) => {
  const isLandlord = currentUser?.role === 'owner';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
      {/* Thẻ Ví Xu Emerald & Gold (7 cột) */}
      <div className="lg:col-span-7 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-emerald-900 via-[#006d37] to-slate-900 text-white p-4 sm:p-8 shadow-xl relative overflow-hidden flex flex-col justify-between border border-emerald-400/30">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -right-10 w-44 h-44 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 space-y-3.5 sm:space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-amber-400/20 border border-amber-300/40 flex items-center justify-center text-amber-300 shadow-inner shrink-0">
                <Coins className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-emerald-200 block">
                  {isLandlord ? 'TÀI KHOẢN VÍ CHỦ TRỌ' : 'TÀI KHOẢN VÍ TRỌ XINH'}
                </span>
                <h3 className="text-sm font-bold text-white truncate">
                  {currentUser?.name || 'Khách Trọ Xinh'}
                </h3>
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-full bg-white/10 text-emerald-200 text-[11px] sm:text-xs font-bold border border-white/10 shrink-0">
              1 Xu = 1.000đ
            </span>
          </div>

          <div className="pt-1 sm:pt-2">
            <p className="text-xs text-emerald-100 font-medium">Tổng số dư khả dụng:</p>
            {isLoading ? (
              <div className="h-10 sm:h-12 w-44 sm:w-48 bg-white/10 rounded-2xl animate-pulse mt-1" />
            ) : (
              <div className="flex items-baseline gap-2 sm:gap-3 mt-1 flex-wrap">
                <span className="text-3xl sm:text-5xl font-black text-amber-300 tracking-tight font-mono">
                  {(wallet?.total_xu || 0).toLocaleString('vi-VN')}
                </span>
                <span className="text-base sm:text-2xl font-black text-white">XU</span>
                <span className="text-[11px] sm:text-xs text-emerald-200 font-medium bg-white/10 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg">
                  ≈ {((wallet?.total_xu || 0) * 1000).toLocaleString('vi-VN')} VNĐ
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2.5 sm:gap-3 pt-2.5 sm:pt-3 border-t border-white/15">
            <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-white/5 border border-white/10 space-y-0.5">
              <p className="text-[10.5px] sm:text-[11px] text-emerald-200">Xu Thật (Gốc nạp):</p>
              <p className="text-sm sm:text-lg font-black text-white font-mono">
                {(wallet?.balance_real_xu || 0).toLocaleString('vi-VN')}{' '}
                <span className="text-[11px] sm:text-xs font-normal">Xu</span>
              </p>
            </div>

            <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-amber-400/10 border border-amber-400/20 space-y-0.5">
              <p className="text-[10.5px] sm:text-[11px] text-amber-200 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-300 shrink-0" />
                <span className="truncate">Xu Thưởng (Tặng):</span>
              </p>
              <p className="text-sm sm:text-lg font-black text-amber-300 font-mono">
                {(wallet?.balance_bonus_xu || 0).toLocaleString('vi-VN')}{' '}
                <span className="text-[11px] sm:text-xs font-normal">Xu</span>
              </p>
            </div>
          </div>
        </div>

        <div className="relative z-10 pt-3.5 sm:pt-4 mt-3.5 sm:mt-4 border-t border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-emerald-100">
          <div className="space-y-0.5 sm:space-y-1">
            <span className="flex items-center gap-1.5 text-[11px] sm:text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-300 shrink-0" />
              Hệ thống khấu trừ ưu tiên Xu thưởng trước
            </span>
            <span className="font-mono text-[10.5px] sm:text-[11px] text-emerald-200/90 block truncate">
              ID: {(wallet?.id || 'wallet').slice(0, 16)}
            </span>
          </div>

          {onStartTopup && (
            <button
              type="button"
              onClick={onStartTopup}
              className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-xl sm:rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs sm:text-sm inline-flex items-center justify-center gap-1.5 shadow-lg shadow-black/20 transition cursor-pointer active:scale-95 shrink-0"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Nạp Xu ngay</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Khối Quyền Lợi & Chính Sách Ví Xu (5 cột) */}
      <div className="lg:col-span-5 bg-white rounded-3xl border border-gray-200 shadow-sm p-5 sm:p-6 space-y-4 flex flex-col justify-between">
        <div className="space-y-3">
          <h3 className="font-black text-base text-gray-950 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            Quyền Lợi & Chính Sách Ví Xu
          </h3>

          <div className="space-y-2.5 text-xs text-gray-600">
            <div className="flex items-start gap-2.5 p-2.5 rounded-2xl bg-emerald-50/60 border border-emerald-100">
              <CheckCircle2 className="w-4 h-4 text-[#00a854] shrink-0 mt-0.5" />
              <div>
                <strong className="text-gray-900 block">Thanh toán 1 chạm siêu tốc:</strong>
                <span>Kích hoạt Đẩy Tin VIP, Gia Hạn Tin và Gói K23 ngay lập tức từ số dư Xu.</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2.5 rounded-2xl bg-amber-50/60 border border-amber-100">
              <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-gray-900 block">Thưởng tới 12,5% khi nạp gói lớn:</strong>
                <span>Nạp 500k–1M tặng +10% Xu; nạp từ 2.000.000đ tặng +12,5% Xu (2.250 Xu).</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2.5 rounded-2xl bg-blue-50/60 border border-blue-100">
              <Clock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-gray-900 block">Không thời hạn sử dụng:</strong>
                <span>Xu trong ví được bảo lưu vĩnh viễn để dùng dần bất cứ khi nào có nhu cầu.</span>
              </div>
            </div>

            <div className="flex items-start gap-2.5 p-2.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <Info className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-gray-900 block">Ví dịch vụ khép kín an toàn:</strong>
                <span>Xu dùng thanh toán dịch vụ nội bộ trên Trọ Xinh (không quy đổi tiền mặt); hỗ trợ tra soát hoàn tiền qua CSKH nếu chuyển nhầm.</span>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-gray-100 text-[11px] text-gray-500 flex items-center justify-between gap-2">
          <span>Hỗ trợ nạp Xu 24/7 qua VietQR & MoMo</span>
          <a href="tel:0888110789" className="text-[#006d37] font-bold hover:underline shrink-0">
            Hotline: 0888.110.789
          </a>
        </div>
      </div>
    </div>
  );
};

