import React from 'react';
import { DashboardSidebar } from '../components/layout/DashboardSidebar';
import { CreditCard, AlertCircle, Clock, ShieldCheck, Lock } from 'lucide-react';

export const AdminFinancePage: React.FC = () => {
  return (
    <div className="flex bg-gray-50 min-h-[calc(100vh-4rem)]">
      <DashboardSidebar role="admin" />

      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 overflow-y-auto">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <CreditCard className="w-7 h-7 text-[#006d37]" />
            Quản Lý Doanh Thu & Tài Chính
          </h1>

        </div>

        {/* Banner bảo vệ theo tiêu chuẩn Public Beta */}
        <div className="bg-white rounded-3xl p-8 border border-amber-200/80 shadow-xs text-center max-w-2xl mx-auto space-y-4 my-12">
          <div className="w-16 h-16 bg-amber-100 text-amber-700 rounded-3xl flex items-center justify-center mx-auto shadow-xs">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-black rounded-full uppercase tracking-wider">
              Bảo Mật Giao Dịch
            </span>
            <h2 className="text-xl font-black text-gray-900">
              Tính Năng Đang Trong Quá Trình Hoàn Thiện
            </h2>
            <p className="text-xs text-gray-600 leading-relaxed max-w-lg mx-auto">
              Cổng thanh toán tự động (VietQR / MoMo Webhook) đang được kiểm thử an toàn bảo mật ở môi trường Sandbox. 
              Màn hình đối soát tài chính thật sẽ tự động kích hoạt sau khi webhook được xác thực chữ ký số server-side.
            </p>
          </div>

          <div className="pt-4 border-t border-gray-100 flex items-center justify-center gap-6 text-xs text-gray-400 font-semibold">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#006d37]" /> Tiêu chuẩn PCI-DSS
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-blue-500" /> Sắp ra mắt
            </span>
          </div>
        </div>
      </main>
    </div>
  );
};
