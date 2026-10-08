import React from 'react';

/**
 * CardsSkeleton: Bộ khung xương phát sáng (Shimmer Skeleton Wave) chuẩn hình học 1:1 theo Qiangu Web.
 * Khớp kích thước 100% với RoomCard, RoommateCard, MarketplaceCard -> Triệt tiêu hoàn toàn CLS khi nạp dữ liệu thật.
 */

// 1. RoomCardSkeleton: Khớp 100% với RoomCard thật
export const RoomCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-200/90 shadow-xs flex flex-col h-full">
      {/* Khung ảnh tỷ lệ 4:3 có shimmer wave */}
      <div className="relative aspect-4/3 w-full shimmer-wave rounded-t-2xl" />

      {/* Phần nội dung thẻ */}
      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
        <div className="space-y-2">
          {/* Tiêu đề 2 dòng */}
          <div className="h-4 w-5/6 rounded shimmer-wave" />
          <div className="h-4 w-3/5 rounded shimmer-wave" />

          {/* Địa chỉ */}
          <div className="h-3 w-4/5 rounded shimmer-wave mt-2" />
        </div>

        {/* Khối giá tiền & Trường đại học */}
        <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
          <div className="h-5 w-24 rounded shimmer-wave" />
          <div className="h-3 w-20 rounded shimmer-wave" />
        </div>
      </div>
    </div>
  );
};

// 2. RoommateCardSkeleton: Khớp 100% với RoommateCard thật
export const RoommateCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-200/80 shadow-xs p-5 flex flex-col justify-between h-full space-y-4">
      <div>
        {/* Header: Avatar + Tên + Tuổi */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full shimmer-wave shrink-0" />
          <div className="space-y-1.5 flex-1">
            <div className="h-4 w-32 rounded shimmer-wave" />
            <div className="h-3 w-24 rounded shimmer-wave" />
          </div>
        </div>

        {/* Khối ngân sách chia sẻ */}
        <div className="h-10 w-full rounded-xl shimmer-wave mb-3" />

        {/* Dòng mô tả intro */}
        <div className="space-y-1.5 mb-3">
          <div className="h-3 w-full rounded shimmer-wave" />
          <div className="h-3 w-4/5 rounded shimmer-wave" />
        </div>

        {/* Hashtags */}
        <div className="flex gap-1.5">
          <div className="h-5 w-16 rounded-md shimmer-wave" />
          <div className="h-5 w-14 rounded-md shimmer-wave" />
          <div className="h-5 w-18 rounded-md shimmer-wave" />
        </div>
      </div>

      {/* Footer */}
      <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
        <div className="h-3 w-20 rounded shimmer-wave" />
        <div className="h-3 w-16 rounded shimmer-wave" />
      </div>
    </div>
  );
};

// 3. MarketplaceCardSkeleton: Khớp 100% với MarketplaceCard thật
export const MarketplaceCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-200/90 shadow-xs flex flex-col h-full">
      {/* Khung ảnh sản phẩm 4:3 */}
      <div className="relative aspect-4/3 w-full shimmer-wave" />

      {/* Nội dung sản phẩm */}
      <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2.5">
        <div className="space-y-2">
          {/* Tên món đồ */}
          <div className="h-4 w-4/5 rounded shimmer-wave" />
          {/* Địa chỉ & Danh mục */}
          <div className="h-3 w-3/5 rounded shimmer-wave" />
        </div>

        {/* Giá tiền */}
        <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
          <div className="h-4 w-20 rounded shimmer-wave" />
          <div className="h-3 w-14 rounded shimmer-wave" />
        </div>
      </div>
    </div>
  );
};
