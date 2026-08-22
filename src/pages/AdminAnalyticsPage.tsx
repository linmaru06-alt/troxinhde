import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { DashboardSidebar } from '../components/layout/DashboardSidebar';
import { BarChart3, TrendingUp, Users, Home, ShieldCheck } from 'lucide-react';

export const AdminAnalyticsPage: React.FC = () => {
  const { rooms, buildings, roommates, marketplaceItems } = useAppStore();

  return (
    <div className="flex bg-gray-50 min-h-[calc(100vh-4rem)]">
      <DashboardSidebar role="admin" />

      <main className="flex-1 p-4 sm:p-8 max-w-6xl space-y-8 overflow-y-auto">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-[#006d37]" />
            Báo Cáo Thống Kê Nền Tảng
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">Dữ liệu tăng trưởng phòng trọ, người dùng và tỷ lệ kiểm duyệt</p>
        </div>

        {/* 4 Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-1">
            <span className="text-xs text-gray-500 font-semibold">Tổng số phòng trọ</span>
            <div className="text-2xl sm:text-3xl font-black text-gray-900">{rooms.length} phòng</div>
            <p className="text-[11px] text-emerald-600 font-medium">↑ +18% so với tháng trước</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-1">
            <span className="text-xs text-gray-500 font-semibold">Tòa nhà liên kết</span>
            <div className="text-2xl sm:text-3xl font-black text-[#006d37]">{buildings.length} tòa</div>
            <p className="text-[11px] text-emerald-600 font-medium">100% đạt chuẩn PCCC</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-1">
            <span className="text-xs text-gray-500 font-semibold">Bài tìm bạn ở ghép</span>
            <div className="text-2xl sm:text-3xl font-black text-blue-600">{roommates.length} bài</div>
            <p className="text-[11px] text-gray-500">Tỷ lệ ghép đôi 82%</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-1">
            <span className="text-xs text-gray-500 font-semibold">Đồ thanh lý chợ</span>
            <div className="text-2xl sm:text-3xl font-black text-amber-600">{marketplaceItems.length} món</div>
            <p className="text-[11px] text-gray-500">30% tặng miễn phí 0đ</p>
          </div>
        </div>

        {/* District Distribution Bar */}
        <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-gray-900">Phân Bổ Phòng Trọ Theo Khu Vực</h3>
          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between font-semibold mb-1">
                <span>Quận Cầu Giấy</span>
                <span>45% (Gần ĐHQG, Sư Phạm, Báo Chí)</span>
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#006d37] rounded-full w-[45%]" />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-semibold mb-1">
                <span>Quận Đống Đa</span>
                <span>30% (Khu Chùa Láng, FTU, Ngoại Giao)</span>
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#27ae60] rounded-full w-[30%]" />
              </div>
            </div>

            <div>
              <div className="flex justify-between font-semibold mb-1">
                <span>Quận Hai Bà Trưng</span>
                <span>25% (Cụm Bách - Kinh - Xây)</span>
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#35a1e0] rounded-full w-[25%]" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
