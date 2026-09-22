import React from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { DashboardSidebar } from '../components/layout/DashboardSidebar';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { AvatarUploader } from '../components/ui/AvatarUploader';
import { Building2, Phone, Mail, MapPin, ShieldCheck, LogOut } from 'lucide-react';

export const OwnerProfilePage: React.FC = () => {
  const { currentUser, setCurrentUser, buildings, rooms, logout } = useAppStore();

  return (
    <div className="flex bg-gray-50 min-h-[calc(100vh-4rem)]">
      <DashboardSidebar role="owner" />

      <main className="flex-1 p-4 sm:p-8 max-w-4xl space-y-6 overflow-y-auto">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-md space-y-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-6 border-b border-gray-100 text-center sm:text-left">
            <AvatarUploader
              currentUrl={currentUser?.avatarUrl}
              size="lg"
              folder="troxinh/avatars"
              onComplete={async (urls) => {
                if (urls[0] && currentUser) {
                  const updatedUser = { ...currentUser, avatarUrl: urls[0] };
                  setCurrentUser(updatedUser);
                  
                  try {
                    const { syncUserToSupabase } = await import('../lib/supabaseAuthSync');
                    await syncUserToSupabase({
                      id: currentUser.id || '',
                      name: currentUser.name || '',
                      email: currentUser.email || undefined,
                      phone: currentUser.phone || undefined,
                      role: (currentUser.role || 'owner') as any,
                      avatar_url: urls[0],
                      verified: currentUser.verified ?? false,
                    });
                  } catch (err) {
                    console.warn('Lỗi khi đồng bộ ảnh đại diện:', err);
                  }
                }
              }}
            />
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <h1 className="text-2xl font-black text-gray-900">{currentUser?.name}</h1>
                <Badge variant="verified" size="sm">Chủ trọ uy tín 5★</Badge>
              </div>
              <div className="flex flex-col gap-1.5 mt-2">
                <p className="text-xs text-gray-500 flex items-center justify-center sm:justify-start gap-1">
                  <Phone className="w-3.5 h-3.5 text-gray-400" />
                  {currentUser?.phone || 'Chưa cập nhật SĐT'}
                  {currentUser?.phoneVerified && (
                    <span title="Đã xác minh" className="inline-flex">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" aria-hidden="true" />
                    </span>
                  )}
                </p>
                {currentUser?.email && (
                  <p className="text-xs text-gray-500 flex items-center justify-center sm:justify-start gap-1">
                    <Mail className="w-3.5 h-3.5 text-gray-400" />
                    {currentUser.email}
                    {currentUser.emailVerified && (
                      <span title="Đã xác minh" className="inline-flex">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" aria-hidden="true" />
                      </span>
                    )}
                  </p>
                )}
              </div>
              <p className="text-xs text-gray-500">{currentUser?.bio}</p>
            </div>

            <button onClick={logout} className="text-xs font-semibold text-rose-600 hover:underline flex items-center gap-1">
              <LogOut className="w-4 h-4" /> Đăng xuất
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
              <span className="text-xs text-emerald-800 font-medium">Tòa nhà đang quản lý:</span>
              <h3 className="text-xl font-black text-[#006d37] mt-1">{buildings.length} tòa nhà</h3>
            </div>
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
              <span className="text-xs text-emerald-800 font-medium">Tổng số phòng trọ:</span>
              <h3 className="text-xl font-black text-[#006d37] mt-1">{rooms.length} phòng</h3>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
