import { K23VipGate } from '../components/k23/subscription/K23VipGate';
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DashboardSidebar } from '../components/layout/DashboardSidebar';
import { SEOHead } from '../components/seo/SEOHead';
import { useK23Subscription } from '../hooks/queries/useK23Subscription';
import { SubscriptionBanner } from '../components/k23/subscription/SubscriptionBanner';
import { formatCurrency } from '../components/ui/Cards';
import { Button } from '../components/ui/Button';
import {
  Crown,
  Sparkles,
  ShieldCheck,
  Calendar,
  Building2,
  DoorOpen,
  ArrowRight,
  RefreshCw,
  Zap,
  CheckCircle2,
  Clock,
  Check,
} from 'lucide-react';

export const OwnerK23SubscriptionPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    subscription,
    currentPlan,
    roomCount,
    maxRooms,
    roomUsagePercent,
    daysLeft,
    isTrial,
    isGracePeriod,
    isSuspended,
  } = useK23Subscription();

  const periodEndFormatted = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : 'Chưa kích hoạt';

  return (
    <K23VipGate featureTitle="Gói Dịch Vụ Quản Lý Phòng K23">
    <div className="flex min-h-screen bg-slate-50">
      <SEOHead
        title="Quản Lý Gói Dịch Vụ K23 | Trọ Xinh"
        description="Quản lý thời hạn gói cước K23, hạn mức số lượng phòng trọ và gia hạn dịch vụ."
      />
      <DashboardSidebar />

      <main className="flex-1 p-4 lg:p-8 max-w-6xl mx-auto">
        {/* Banner cảnh báo */}
        <SubscriptionBanner />

        {/* Tiêu đề trang */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
              Quản Lý Gói Cước K23
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Theo dõi hạn mức số phòng, chu kỳ gia hạn và quyền lợi phần mềm quản lý phòng trọ.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/chu-tro/goi-dich-vu">
              <Button className="bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-amber-300" /> Nâng cấp / Đổi gói
              </Button>
            </Link>
          </div>
        </div>

        {/* 2 Thẻ Tổng quan: Thẻ Gói & Thẻ Quota Phòng */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Thẻ 1: Thông tin gói hiện tại */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary-50 text-primary-600 rounded-2xl flex items-center justify-center border border-primary-100">
                  <Crown className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900">
                      {currentPlan?.name || 'Gói Tiêu Chuẩn (Pro)'}
                    </h3>
                    {isTrial ? (
                      <span className="text-[11px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">
                        Dùng thử 30 ngày
                      </span>
                    ) : isSuspended ? (
                      <span className="text-[11px] font-bold bg-red-100 text-red-800 px-2 py-0.5 rounded-full">
                        Đã tạm ngừng
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                        Đang hoạt động
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {subscription?.billing_cycle === 'yearly' ? 'Chu kỳ 1 năm (Tiết kiệm 2 tháng)' : 'Chu kỳ thanh toán hàng tháng'}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-100 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-slate-400" /> Ngày hết hạn chu kỳ:
                </span>
                <span className="font-bold text-slate-800">{periodEndFormatted}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-slate-400" /> Thời gian còn lại:
                </span>
                <span className={`font-bold ${daysLeft <= 5 ? 'text-red-600' : 'text-slate-900'}`}>
                  {daysLeft} ngày
                </span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex gap-2">
              <Link
                to={`/chu-tro/thanh-toan-goi?plan=${currentPlan?.code || 'pro'}&cycle=yearly`}
                className="w-full"
              >
                <Button variant="outline" className="w-full text-xs font-bold py-2 rounded-xl border-primary-200 text-primary-700 hover:bg-primary-50">
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Gia hạn thêm 1 năm (Tặng 2 tháng)
                </Button>
              </Link>
            </div>
          </div>

          {/* Thẻ 2: Hạn mức số phòng (Quota) */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center border border-indigo-100">
                    <DoorOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Hạn Mức Phòng Quản Lý</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Dung lượng tài nguyên thực tế bạn đang sử dụng
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-extrabold text-slate-900">{roomCount}</span>
                  <span className="text-xs text-slate-400 font-medium">
                    {' '}/ {maxRooms === -1 ? 'Không giới hạn' : `${maxRooms} phòng`}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              {maxRooms !== -1 ? (
                <div className="space-y-2 mt-4">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-500">Tỷ lệ sử dụng hạn mức</span>
                    <span className={roomUsagePercent >= 90 ? 'text-red-600' : 'text-slate-700'}>
                      {roomUsagePercent}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden p-0.5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        roomUsagePercent >= 90
                          ? 'bg-red-500'
                          : roomUsagePercent >= 75
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${roomUsagePercent}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {roomCount >= maxRooms
                      ? '⚠️ Bạn đã dùng hết hạn mức phòng. Hãy nâng cấp gói để tiếp tục thêm phòng.'
                      : `Bạn còn có thể thêm ${maxRooms - roomCount} phòng nữa vào gói hiện tại.`}
                  </p>
                </div>
              ) : (
                <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Gói Chuỗi cho phép bạn thêm không giới hạn số lượng phòng trọ và tòa nhà.</span>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center text-xs">
              <span className="text-slate-500">Giới hạn số tòa nhà:</span>
              <span className="font-bold text-slate-800">
                {currentPlan?.max_buildings === -1 ? 'Không giới hạn' : `Tối đa ${currentPlan?.max_buildings || 1} tòa nhà`}
              </span>
            </div>
          </div>
        </div>

        {/* Danh sách các quyền lợi tính năng đi kèm gói */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 mb-4 pb-3 border-b border-slate-100 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary-600" />
            CÁC TÍNH NĂNG ĐƯỢC KÍCH HOẠT THEO GÓI HIỆN TẠI
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currentPlan?.features.map((feat, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs text-slate-700"
              >
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3 h-3 stroke-[3]" />
                </div>
                <span className="font-medium leading-relaxed">{feat}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
    </K23VipGate>
  );
};

