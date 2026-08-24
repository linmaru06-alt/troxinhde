import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('user' | 'renter' | 'owner' | 'admin')[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
}) => {
  const { currentUser } = useAppStore();
  const location = useLocation();

  // 1. Chưa đăng nhập -> Chuyển hướng về trang Đăng Nhập kèm returnUrl
  if (!currentUser) {
    return (
      <Navigate
        to={`/dang-nhap?returnUrl=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    );
  }

  // 2. Kiểm tra phân quyền nếu có
  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = currentUser.role || 'user';
    const isAllowed = allowedRoles.includes(userRole as any);

    if (!isAllowed) {
      // Điều hướng về trang mặc định phù hợp
      if (userRole === 'admin') return <Navigate to="/admin" replace />;
      if (userRole === 'owner') return <Navigate to="/chu-tro" replace />;
      return <Navigate to="/" replace />;
    }
  }

  return <>{children}</>;
};
