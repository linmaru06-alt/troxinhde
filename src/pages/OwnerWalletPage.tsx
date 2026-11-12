import React from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { useWalletTopup } from '../hooks/useWalletTopup';
import { SEOHead } from '../components/seo/SEOHead';
import { DashboardSidebar } from '../components/layout/DashboardSidebar';
import { WalletBalanceCard } from '../components/wallet/WalletBalanceCard';
import { TopupStepperWizard } from '../components/wallet/TopupStepperWizard';
import { WalletHistoryTable } from '../components/wallet/WalletHistoryTable';
import { Coins, Rocket, Gift, ArrowRight, AlertCircle } from 'lucide-react';

export const OwnerWalletPage: React.FC = () => {
  const { grantDemoXu, showToast } = useAppStore();
  const topup = useWalletTopup();

  return (
    <div className="flex bg-gray-50 min-h-[calc(100vh-4rem)]">
      <SEOHead
        title="Ví Xu Trọ Xinh | Nạp Xu & Quản Lý Số Dư Dịch Vụ"
        description="Nạp Trọ Xinh Xu qua VietQR hoặc MoMo theo quy trình 3 bước an toàn. Thanh toán đẩy tin, gia hạn tin đăng và quản lý phòng trọ một chạm."
        url={topup.currentUser?.role === 'owner' ? '/chu-tro/vi-xu' : '/vi-xu'}
      />

      {topup.currentUser?.role === 'owner' && <DashboardSidebar role="owner" />}

      <main
        className={`flex-1 p-4 sm:p-8 ${
          topup.currentUser?.role === 'owner' ? 'max-w-6xl' : 'max-w-5xl mx-auto w-full'
        } space-y-8 overflow-y-auto`}
      >
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
              Tỷ giá cố định: <strong>1 Xu = 1.000 VNĐ</strong> • Nạp nhanh 3 bước qua VietQR hoặc Ví MoMo
            </p>
          </div>

          {topup.isDemoAccount && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => grantDemoXu(500)}
                className="px-3.5 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-black transition flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                title="Cộng thêm 500 Xu trải nghiệm tính năng thanh toán Demo"
              >
                <Gift className="w-4 h-4 text-amber-700" />
                <span>+ Tặng 500 Xu (Demo)</span>
              </button>
            </div>
          )}
        </div>

        {topup.walletLoadError && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Không thể tải số dư ví từ máy chủ: {topup.walletLoadError}</span>
            </div>
            <button
              type="button"
              onClick={topup.refreshWalletData}
              className="px-3 py-1 rounded-lg bg-white border border-rose-300 font-bold text-rose-700 hover:bg-rose-100 cursor-pointer shrink-0"
            >
              Thử lại
            </button>
          </div>
        )}

        {/* KHỐI 1: THẺ VÍ XU & QUYỀN LỢI */}
        <WalletBalanceCard
          currentUser={topup.currentUser}
          wallet={topup.wallet}
          isLoading={topup.isLoadingWallet}
        />

        {/* KHỐI 2: WIZARD NẠP XU 3 BƯỚC */}
        <TopupStepperWizard
          currentUser={topup.currentUser}
          isDemoAccount={topup.isDemoAccount}
          balanceTotalXu={topup.wallet?.total_xu || 0}
          step={topup.step}
          setStep={topup.setStep}
          selectedPackIndex={topup.selectedPackIndex}
          selectPack={topup.selectPack}
          customXuInput={topup.customXuInput}
          handleCustomXuChange={topup.handleCustomXuChange}
          numericCustomXu={topup.numericCustomXu}
          amountVnd={topup.amountVnd}
          preview={topup.preview}
          isAmountValid={topup.isAmountValid}
          method={topup.method}
          setMethod={topup.setMethod}
          activeOrder={topup.activeOrder}
          orderError={topup.orderError}
          countdownText={topup.countdownText}
          isCreatingOrder={topup.isCreatingOrder}
          createOrder={topup.createOrder}
          isCheckingStatus={topup.isCheckingStatus}
          recheckStatus={topup.recheckStatus}
          isConfirmingDemo={topup.isConfirmingDemo}
          confirmDemoTopup={topup.confirmDemoTopup}
          resetWizard={topup.resetWizard}
          onShowToast={showToast}
        />

        {/* KHỐI 3: BẢNG QUY ĐỔI GIÁ DỊCH VỤ BẰNG XU */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-5 sm:p-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100">
            <div>
              <h2 className="text-base sm:text-lg font-black text-gray-950 flex items-center gap-2">
                <Rocket className="w-5 h-5 text-amber-500" />
                Bảng Quy Đổi Giá Dịch Vụ Bằng Xu
              </h2>
              <p className="text-xs text-gray-500">
                Toàn bộ các gói đẩy tin & gia hạn trên Trọ Xinh đều thanh toán trực tiếp bằng số dư Xu
              </p>
            </div>

            {topup.currentUser?.role === 'owner' && (
              <Link
                to="/chu-tro"
                className="text-xs font-bold text-[#006d37] hover:underline flex items-center gap-1 self-start sm:self-auto"
              >
                <span>Đến trang Đẩy Tin</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-black text-gray-900 text-sm">Đẩy Lẻ 1 Ngày</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                  15 Xu
                </span>
              </div>
              <p className="text-gray-500 text-[11px]">
                Đẩy tin nổi lên đầu trang tìm kiếm ngay lập tức trong 24 giờ (~15.000đ).
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-black text-gray-900 text-sm">Đẩy Top 3 Ngày</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                  29 Xu
                </span>
              </div>
              <p className="text-gray-500 text-[11px]">
                Lên đầu trang tìm kiếm trong 3 ngày cuối tuần cao điểm (~29.000đ).
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-black text-amber-950 text-sm">Đẩy Giờ Vàng 7 Ngày</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white font-black text-[10px]">
                  59 Xu
                </span>
              </div>
              <p className="text-amber-900 text-[11px]">
                Tự động đẩy top 2 khung giờ vàng: 11h-13h & 19h-22h mỗi ngày (~59.000đ).
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-black text-emerald-950 text-sm">VIP Toàn Diện 30 Ngày</span>
                <span className="px-2 py-0.5 rounded-full bg-[#00a854] text-white font-black text-[10px]">
                  199 Xu
                </span>
              </div>
              <p className="text-emerald-900 text-[11px]">
                Ưu tiên vị trí số 1 liên tục 30 ngày, gắn huy hiệu VIP nổi bật (~199.000đ).
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-black text-gray-900 text-sm">Gia Hạn Tin 15 Ngày</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 font-bold text-[10px]">
                  30 Xu
                </span>
              </div>
              <p className="text-gray-500 text-[11px]">
                Gia hạn tin hết hạn chu kỳ 30 ngày thêm 15 ngày hiển thị (~30.000đ).
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-black text-gray-900 text-sm">Gia Hạn Tin 30 Ngày</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 font-bold text-[10px]">
                  50 Xu
                </span>
              </div>
              <p className="text-gray-500 text-[11px]">
                Gia hạn tin hết hạn thêm 30 ngày đầy đủ với chi phí tiết kiệm nhất (~50.000đ).
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-black text-teal-950 text-sm">Đăng Lại Lần 1</span>
                <span className="px-2 py-0.5 rounded-full bg-teal-600 text-white font-black text-[10px]">
                  0 Xu (FREE)
                </span>
              </div>
              <p className="text-teal-900 text-[11px]">
                Trọ Xinh tặng miễn phí lần đăng lại đầu tiên cho mọi phòng trọ (0 Xu).
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-teal-50/70 border border-teal-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-black text-teal-950 text-sm">Xác Thực Chính Chủ</span>
                <span className="px-2 py-0.5 rounded-full bg-teal-600 text-white font-black text-[10px]">
                  TẶNG 48H VIP
                </span>
              </div>
              <p className="text-teal-900 text-[11px]">
                Cấp Tick Xanh và tặng miễn phí 48 giờ đẩy tin tự động.
              </p>
            </div>
          </div>
        </div>

        {/* KHỐI 4: LỊCH SỬ BIẾN ĐỘNG SỐ DƯ XU */}
        <WalletHistoryTable
          transactions={topup.transactions}
          isLoading={topup.isLoadingWallet}
        />
      </main>
    </div>
  );
};
