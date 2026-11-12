import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { useWalletTopup } from '../hooks/useWalletTopup';
import { SEOHead } from '../components/seo/SEOHead';
import { DashboardSidebar } from '../components/layout/DashboardSidebar';
import { WalletBalanceCard } from '../components/wallet/WalletBalanceCard';
import { TopupStepperWizard } from '../components/wallet/TopupStepperWizard';
import { WalletHistoryTable } from '../components/wallet/WalletHistoryTable';
import { Coins, Rocket, Gift, ArrowRight, AlertCircle, PlusCircle, History } from 'lucide-react';

export const OwnerWalletPage: React.FC = () => {
  const { grantDemoXu, showToast } = useAppStore();
  const topup = useWalletTopup();
  const [mobileOverviewTab, setMobileOverviewTab] = useState<'pricing' | 'history'>('pricing');

  const isOverview = topup.step === 'overview';

  return (
    <div className="flex bg-gray-50 min-h-[calc(100vh-3.5rem)] sm:min-h-[calc(100vh-4rem)]">
      <SEOHead
        title={
          isOverview
            ? 'Ví Xu Trọ Xinh | Quản Lý Số Dư & Dịch Vụ'
            : 'Nạp Xu Trọ Xinh | Thanh Toán 3 Bước An Toàn'
        }
        description="Nạp Trọ Xinh Xu qua VietQR hoặc MoMo theo quy trình 3 bước tách trang rõ ràng. Thanh toán đẩy tin, gia hạn tin đăng và quản lý phòng trọ một chạm."
        url={topup.currentUser?.role === 'owner' ? '/chu-tro/vi-xu' : '/vi-xu'}
      />

      {topup.currentUser?.role === 'owner' && <DashboardSidebar role="owner" />}

      <main
        className={`flex-1 ${
          isOverview
            ? 'p-4 sm:p-8 pb-24 lg:pb-8 space-y-6 sm:space-y-8'
            : 'p-0 sm:p-8 pb-28 sm:pb-8'
        } ${
          topup.currentUser?.role === 'owner' ? 'max-w-6xl' : 'max-w-5xl mx-auto w-full'
        } overflow-y-auto`}
      >
        {isOverview ? (
          <>
            {/* ================= TRANG TỔNG QUAN VÍ XU ================= */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-3 sm:pb-4 border-b border-gray-200">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10.5px] sm:text-xs font-black mb-1">
                  <Coins className="w-3.5 h-3.5 text-[#00a854]" />
                  <span>HỆ THỐNG THANH TOÁN XU NỘI BỘ</span>
                </div>
                <h1 className="text-xl sm:text-3xl font-black text-gray-950 tracking-tight">
                  Ví Xu Trọ Xinh
                </h1>
                <p className="text-xs text-gray-500 mt-0.5 sm:mt-1">
                  Tỷ giá cố định: <strong>1 Xu = 1.000 VNĐ</strong> • Bấm <strong>Nạp Xu ngay</strong> để mở quy trình nạp 3 bước
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                {topup.isDemoAccount && (
                  <button
                    type="button"
                    onClick={() => grantDemoXu(500)}
                    className="flex-1 sm:flex-initial min-h-[42px] px-3.5 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                    title="Cộng thêm 500 Xu trải nghiệm tính năng thanh toán Demo"
                  >
                    <Gift className="w-4 h-4 text-amber-700" />
                    <span>+ Tặng 500 Xu (Demo)</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={topup.startTopup}
                  className="hidden sm:flex px-5 py-2.5 rounded-xl bg-[#00a854] hover:bg-[#008f46] text-white text-sm font-black transition items-center gap-2 cursor-pointer shadow-md shadow-emerald-600/20 active:scale-95"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Nạp Xu ngay</span>
                </button>
              </div>
            </div>

            {topup.walletLoadError && (
              <div className="p-3.5 sm:p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Không thể tải số dư ví từ máy chủ: {topup.walletLoadError}</span>
                </div>
                <button
                  type="button"
                  onClick={topup.refreshWalletData}
                  className="px-3 py-1.5 rounded-lg bg-white border border-rose-300 font-bold text-rose-700 hover:bg-rose-100 cursor-pointer shrink-0"
                >
                  Thử lại
                </button>
              </div>
            )}

            {/* KHỐI 1: THẺ VÍ XU & NÚT NẠP XU */}
            <WalletBalanceCard
              currentUser={topup.currentUser}
              wallet={topup.wallet}
              isLoading={topup.isLoadingWallet}
              onStartTopup={topup.startTopup}
            />

            {/* THANH CHUYỂN TAB NHANH CHO MOBILE (< 640px) */}
            <div className="sm:hidden grid grid-cols-2 gap-1.5 p-1.5 rounded-2xl bg-white border border-gray-200 shadow-2xs">
              <button
                type="button"
                onClick={() => setMobileOverviewTab('pricing')}
                className={`min-h-[40px] px-3 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  mobileOverviewTab === 'pricing'
                    ? 'bg-[#00a854] text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Rocket className="w-3.5 h-3.5" />
                <span>Bảng giá Xu</span>
              </button>
              <button
                type="button"
                onClick={() => setMobileOverviewTab('history')}
                className={`min-h-[40px] px-3 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  mobileOverviewTab === 'history'
                    ? 'bg-[#00a854] text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Lịch sử ({topup.transactions.length})</span>
              </button>
            </div>

            {/* KHỐI 2: BẢNG GIÁ DỊCH VỤ BẰNG XU */}
            <div
              className={`${
                mobileOverviewTab === 'pricing' ? 'block' : 'hidden sm:block'
              } bg-white rounded-2xl sm:rounded-3xl border border-gray-200 shadow-sm p-4 sm:p-8 space-y-4`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-100">
                <div>
                  <h2 className="text-base sm:text-lg font-black text-gray-950 flex items-center gap-2">
                    <Rocket className="w-5 h-5 text-amber-500" />
                    Bảng Giá Dịch Vụ Bằng Xu (3 Nhóm Độc Lập)
                  </h2>
                  <p className="text-xs text-gray-500">
                    Toàn bộ Gói đăng phòng, Gói đẩy tin và Hệ thống quản lý K23 đều thanh toán 1 chạm bằng Xu nội bộ
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
                  <Link
                    to="/bang-gia"
                    className="text-xs font-bold text-[#006d37] hover:underline flex items-center gap-1"
                  >
                    <span>Gói đăng phòng</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  {topup.currentUser?.role === 'owner' && (
                    <>
                      <Link
                        to="/chu-tro/goi-dich-vu"
                        className="text-xs font-bold text-indigo-700 hover:underline flex items-center gap-1"
                      >
                        <span>Gói quản lý K23</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                      <Link
                        to="/chu-tro"
                        className="text-xs font-bold text-amber-700 hover:underline flex items-center gap-1"
                      >
                        <span>Đến trang Đẩy Tin</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 text-xs">
                <div className="p-3 sm:p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-1.5 sm:space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <span className="font-black text-gray-900 text-xs sm:text-sm">Đẩy Lẻ 1 Ngày</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                      15 Xu
                    </span>
                  </div>
                  <p className="text-gray-500 text-[11px] leading-relaxed">
                    Đẩy tin nổi lên đầu trang tìm kiếm ngay lập tức trong 24 giờ.
                  </p>
                </div>

                <div className="p-3 sm:p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-1.5 sm:space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <span className="font-black text-gray-900 text-xs sm:text-sm">Đẩy Top 3 Ngày</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                      29 Xu
                    </span>
                  </div>
                  <p className="text-gray-500 text-[11px] leading-relaxed">
                    Lên đầu trang tìm kiếm liên tục trong 3 ngày cao điểm.
                  </p>
                </div>

                <div className="p-3 sm:p-4 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-1.5 sm:space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <span className="font-black text-amber-950 text-xs sm:text-sm">Đẩy Giờ Vàng 7 Ngày</span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white font-black text-[10px]">
                      59 Xu
                    </span>
                  </div>
                  <p className="text-amber-900 text-[11px] leading-relaxed">
                    Tự động đẩy top 2 khung giờ vàng: 11h-13h &amp; 19h-22h mỗi ngày.
                  </p>
                </div>

                <div className="p-3 sm:p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-1.5 sm:space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <span className="font-black text-emerald-950 text-xs sm:text-sm">VIP Toàn Diện 30 Ngày</span>
                    <span className="px-2 py-0.5 rounded-full bg-[#00a854] text-white font-black text-[10px]">
                      199 Xu
                    </span>
                  </div>
                  <p className="text-emerald-900 text-[11px] leading-relaxed">
                    Ưu tiên vị trí số 1 liên tục 30 ngày, gắn huy hiệu VIP nổi bật.
                  </p>
                </div>

                <div className="p-3 sm:p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-1.5 sm:space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <span className="font-black text-gray-900 text-xs sm:text-sm">Đăng Lẻ / Gia Hạn 15N</span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 font-bold text-[10px]">
                      30 Xu
                    </span>
                  </div>
                  <p className="text-gray-500 text-[11px] leading-relaxed">
                    Đăng 1 phòng hoặc gia hạn thêm 15 ngày hiển thị sau khi hết 2 phòng miễn phí.
                  </p>
                </div>

                <div className="p-3 sm:p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-1.5 sm:space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <span className="font-black text-gray-900 text-xs sm:text-sm">Đăng Lẻ / Gia Hạn 30N</span>
                    <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-800 font-bold text-[10px]">
                      50 Xu
                    </span>
                  </div>
                  <p className="text-gray-500 text-[11px] leading-relaxed">
                    Đăng 1 tin 30 ngày + tặng thêm 1 lần đăng lại miễn phí.
                  </p>
                </div>

                <div className="p-3 sm:p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200 space-y-1.5 sm:space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <span className="font-black text-indigo-950 text-xs sm:text-sm">Gói Đăng Phòng Tháng</span>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white font-black text-[10px]">
                      Từ 149 Xu
                    </span>
                  </div>
                  <p className="text-indigo-900 text-[11px] leading-relaxed">
                    Tin nổi bật 149 Xu/tháng (tối đa 10 tin) • Gói Pro 450 Xu/tháng (không giới hạn).
                  </p>
                </div>

                <div className="p-3 sm:p-4 rounded-2xl bg-teal-50/70 border border-teal-200 space-y-1.5 sm:space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <span className="font-black text-teal-950 text-xs sm:text-sm">Quản Lý Trọ K23</span>
                    <span className="px-2 py-0.5 rounded-full bg-teal-600 text-white font-black text-[10px]">
                      Từ 49 Xu
                    </span>
                  </div>
                  <p className="text-teal-900 text-[11px] leading-relaxed">
                    Cơ Bản 49 Xu • Tiêu Chuẩn 129 Xu • Chuỗi 299 Xu/tháng (dùng thử 30 ngày 0 Xu).
                  </p>
                </div>
              </div>
            </div>

            {/* KHỐI 3: LỊCH SỬ BIẾN ĐỘNG SỐ DƯ XU */}
            <div className={mobileOverviewTab === 'history' ? 'block' : 'hidden sm:block'}>
              <WalletHistoryTable
                transactions={topup.transactions}
                isLoading={topup.isLoadingWallet}
              />
            </div>
          </>
        ) : (
          /* ================= TRANG RIÊNG CHO TỪNG BƯỚC NẠP XU (1 -> 2 -> 3) ================= */
          <div className="max-w-3xl mx-auto sm:py-4">
            <TopupStepperWizard
              currentUser={topup.currentUser}
              isDemoAccount={topup.isDemoAccount}
              balanceTotalXu={topup.wallet?.total_xu || 0}
              step={topup.step}
              setStep={topup.setStep}
              onBackToOverview={topup.backToOverview}
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
              isHydratingOrder={topup.isHydratingOrder}
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
          </div>
        )}
      </main>
    </div>
  );
};
