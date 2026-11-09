import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

/**
 * Trang Bảng giá dịch vụ đã được hợp nhất vào mục "Tòa nhà của tôi" (/chu-tro/toa-nha?tab=services)
 * Giữ route này chuyển hướng mượt mà để bảo toàn 100% liên kết cũ và trải nghiệm người dùng.
 */
export const OwnerServicesPage: React.FC = () => {
  const location = useLocation();
  const search = location.search ? `${location.search}&tab=services` : '?tab=services';

  return <Navigate to={`/chu-tro/toa-nha${search}`} replace />;
};
