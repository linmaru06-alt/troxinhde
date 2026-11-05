import React from 'react';
import { Link } from 'react-router-dom';
import { useK23Subscription } from '../../../hooks/queries/useK23Subscription';
import { DashboardSidebar } from '../../layout/DashboardSidebar';
import { SEOHead } from '../../seo/SEOHead';
import { Button } from '../../ui/Button';
import {
  Crown,
  Sparkles,
  Zap,
  Receipt,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Lock,
} from 'lucide-react';

interface K23VipGateProps {
  children: React.ReactNode;
  featureTitle?: string;
  featureDescription?: string;
}

export const K23VipGate: React.FC<K23VipGateProps> = ({
  children,
  featureTitle = 'Hệ Thống Quản Lý Phòng Trọ K23',
  featureDescription = 'Tự động hóa hoàn toàn chốt số điện nước, phát hành hóa đơn A5 và thu tiền qua VietQR.',
}) => {
  const { isVip, isLoadingSubscription, activateTrial, isActivatingTrial } = useK23Subscription();

  const handleActivateTrial = async () => {
    try {
      await activateTrial();
    } catch (err) {
      console.error(err);
    }
  };

  // 1. Đang tải thông tin thuê bao
  if (isLoadingSubscription) {
    return (
      <div className="flex h-screen bg-slate-50 items-center justify-center font-sans">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-3" />
          <p className="text-sm font-semibold text-slate-600">Đang kiểm tra quyền hạn tài khoản...</p>
        </div>
      </div>
    );
  }

  // 2. Đã là hội viên VIP (hoặc đang trong 30 ngày trial) -> Cho vào sử dụng tính năng
  if (isVip) {
    return <>{children}</>;
  }

  // 3. Chưa đăng ký VIP -> Hiển thị Màn hình Khóa VIP (VIP Paywall)
  return (
    <div className="flex min-h-screen bg-slate-900 font-sans text-white">
      <SEOHead
        title="Tính Năng VIP Quản Lý Nhà Trọ K23 | Trọ Xinh"
        description="Đăng ký kích hoạt gói VIP K23 để quản lý phòng trọ, chốt điện nước và xuất hóa đơn tự động."
      />
      <DashboardSidebar role="owner" />

      <main className="flex-1 p-4 lg:p-8 max-w-5xl mx-auto flex items-center justify-center">
        <div className="w-full max-w-3xl bg-slate-800/90 border border-amber-500/30 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden backdrop-blur-xl">
          {/* Background Glow */}
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Header VIP */}
          <div className="text-center max-w-xl mx-auto mb-8">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 text-xs font-black tracking-wider uppercase mb-4 shadow-sm animate-pulse">
              <Crown className="w-4 h-4 text-amber-400" />
              TÍNH NĂNG ĐỘC QUYỀN HỘI VIÊN VIP K23
            </div>

            <div className="w-16 h-16 bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/30">
              <Lock className="w-8 h-8" />
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-3">
              Mở Khóa {featureTitle}
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Tính năng này chỉ dành cho chủ trọ đã đăng ký **Gói VIP Quản Lý K23**. Bạn cần kích hoạt gói để bắt đầu sử dụng.
            </p>
          </div>

          {/* 4 Thẻ quyền lợi VIP */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <div className="bg-slate-700/60 border border-slate-600/50 rounded-2xl p-4 flex items-start gap-3.5">
              <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl shrink-0 mt-0.5">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white mb-1">Chốt Số Điện Nước 10 Giây</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Nhập số mới trên điện thoại hoặc máy tính, tự động tính kWh và thành tiền. Không còn tính nhẩm sai sót.
                </p>
              </div>
            </div>

            <div className="bg-slate-700/60 border border-slate-600/50 rounded-2xl p-4 flex items-start gap-3.5">
              <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl shrink-0 mt-0.5">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white mb-1">Hóa Đơn A5 In Ấn Chuẩn Đẹp</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Tự động gom tiền phòng, điện nước, rác, wifi thành tờ bill A5 chuyên nghiệp. Xuất ảnh gửi Zalo trong 3 giây.
                </p>
              </div>
            </div>

            <div className="bg-slate-700/60 border border-slate-600/50 rounded-2xl p-4 flex items-start gap-3.5">
              <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl shrink-0 mt-0.5">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white mb-1">VietQR Động Từng Phòng</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Khách thuê chỉ cần giơ điện thoại quét mã là tiền về thẳng tài khoản chủ nhà, tự động điền đúng số tiền và cú pháp.
                </p>
              </div>
            </div>

            <div className="bg-slate-700/60 border border-slate-600/50 rounded-2xl p-4 flex items-start gap-3.5">
              <div className="p-2 bg-purple-500/20 text-purple-400 rounded-xl shrink-0 mt-0.5">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white mb-1">Quản Lý & Thu Hồi Công Nợ</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Kiểm soát rõ ràng phòng nào đã đóng, phòng nào còn nợ. Báo cáo dòng tiền thu chi chính xác từng tháng.
                </p>
              </div>
            </div>
          </div>

          {/* CTA Actions */}
          <div className="bg-slate-900/80 border border-slate-700 rounded-2xl p-6 text-center space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                onClick={handleActivateTrial}
                disabled={isActivatingTrial}
                className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 hover:from-amber-600 hover:to-yellow-400 text-slate-950 font-black text-sm rounded-xl shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2"
              >
                {isActivatingTrial ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang kích hoạt VIP...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 fill-current" />
                    KÍCH HOẠT DÙNG THỬ VIP 30 NGÀY (MIỄN PHÍ)
                  </>
                )}
              </Button>

              <Link to="/chu-tro/goi-dich-vu" className="w-full sm:w-auto">
                <Button
                  variant="outline"
                  className="w-full sm:w-auto px-5 py-3.5 bg-transparent border-slate-600 text-slate-200 hover:bg-slate-700 hover:text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5"
                >
                  Xem các gói cước VIP <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>

            <p className="text-[11px] text-slate-400">
              ⚡ Không yêu cầu thẻ tín dụng. Trải nghiệm trọn vẹn toàn bộ tính năng Gói Pro (tối đa 35 phòng) ngay tức thì.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

