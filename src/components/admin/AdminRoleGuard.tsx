import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { AdminRole } from '../../types';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';

interface AdminRoleGuardProps {
  allowedRoles: AdminRole[];
  children: React.ReactNode;
}

export const AdminRoleGuard: React.FC<AdminRoleGuardProps> = ({ allowedRoles, children }) => {
  const { currentUser } = useAppStore();

  // Xác định vai trò quản trị hiện tại
  // Mặc định tài khoản admin có vai trò super_admin nếu chưa gán adminRole cụ thể
  const currentAdminRole: AdminRole =
    currentUser?.adminRole || (currentUser?.role === 'admin' ? 'super_admin' : 'moderator');

  // super_admin luôn có toàn quyền
  const hasAccess = currentAdminRole === 'super_admin' || allowedRoles.includes(currentAdminRole);

  if (!hasAccess) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center min-h-[400px]">
        <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-xs max-w-md w-full text-center space-y-4">
          <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-black text-gray-900">Không Đủ Quyền Truy Cập</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Bạn hiện có vai trò <strong>{currentAdminRole}</strong>. Phần này yêu cầu quyền{' '}
              <strong>{allowedRoles.join(' hoặc ')}</strong>.
            </p>
          </div>
          <div className="pt-2">
            <Link to="/admin">
              <Button variant="outline" size="sm" className="text-xs">
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                Về Dashboard tổng quan
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
