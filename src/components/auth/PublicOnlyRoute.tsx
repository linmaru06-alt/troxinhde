import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';

interface PublicOnlyRouteProps {
  children: React.ReactNode;
}

export const PublicOnlyRoute: React.FC<PublicOnlyRouteProps> = ({ children }) => {
  const { currentUser } = useAppStore();

  // Nếu đã đăng nhập -> Không cho vào lại Login / Register
  if (currentUser) {
    if (currentUser.role === 'admin') {
      return <Navigate to="/admin" replace />;
    }
    if (currentUser.role === 'owner') {
      return <Navigate to="/chu-tro" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
