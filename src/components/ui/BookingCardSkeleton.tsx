import React from 'react';

/**
 * BookingCardSkeleton - Khung xương giữ chỗ hình học GPU Shimmer (Qiangu Web CLS = 0.000)
 * Khớp chính xác 100% kích thước hình học (minHeight: 136px), layout flex Desktop/Mobile.
 */
export const BookingCardSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Đang tải danh sách lịch hẹn">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="bg-white p-5 rounded-3xl border border-gray-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-pulse"
          style={{ minHeight: '136px' }}
        >
          {/* Cột trái: Thông tin khách & phòng */}
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-2">
              <div className="w-24 h-5 bg-slate-200 rounded-full" />
              <div className="w-16 h-4 bg-slate-100 rounded-full" />
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-200 rounded-full shrink-0" />
              <div className="space-y-1.5 flex-1">
                <div className="w-36 max-w-[80%] h-4 bg-slate-200 rounded-md" />
                <div className="w-28 max-w-[60%] h-3 bg-slate-100 rounded-md" />
              </div>
            </div>
            <div className="flex flex-wrap gap-4 pt-1">
              <div className="w-32 h-3.5 bg-slate-100 rounded" />
              <div className="w-28 h-3.5 bg-slate-100 rounded" />
            </div>
          </div>

          {/* Cột phải: Khung nút thao tác */}
          <div className="flex items-center gap-2 pt-2 sm:pt-0 shrink-0">
            <div className="w-24 h-9 bg-slate-100 rounded-xl" />
            <div className="w-28 h-9 bg-slate-200 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
};
