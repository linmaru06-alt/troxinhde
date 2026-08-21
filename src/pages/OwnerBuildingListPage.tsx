import React from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { DashboardSidebar } from '../components/layout/DashboardSidebar';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Building2, PlusCircle, MapPin, CheckCircle2, Star, ChevronRight } from 'lucide-react';

export const OwnerBuildingListPage: React.FC = () => {
  const { buildings, currentUser } = useAppStore();

  const myBuildings = buildings.filter((b) => b.ownerId === currentUser?.id || b.ownerId === 'user_owner_1');

  return (
    <div className="flex bg-gray-50 min-h-[calc(100vh-4rem)]">
      <DashboardSidebar role="owner" />

      <main className="flex-1 p-4 sm:p-8 max-w-6xl space-y-6 overflow-y-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
              Tòa Nhà Của Tôi
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Danh sách các cơ sở và cụm nhà trọ đang đăng ký trên Trọ Xinh
            </p>
          </div>

          <Link to="/chu-tro/toa-nha/tao-moi">
            <Button variant="primary" size="md" leftIcon={<PlusCircle className="w-4 h-4" />}>
              Thêm Hồ Sơ Tòa Nhà Mới
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {myBuildings.map((bld) => (
            <div
              key={bld.id}
              className="bg-white rounded-3xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-all space-y-4"
            >
              <div className="relative aspect-16/9 w-full bg-gray-100">
                <img src={bld.images[0]} alt={bld.name} className="w-full h-full object-cover" />
                <div className="absolute top-3 left-3">
                  <Badge variant="verified" size="sm">Đã kiểm duyệt PCCC</Badge>
                </div>
              </div>

              <div className="p-6 pt-0 space-y-3">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{bld.name}</h3>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    {bld.address}, {bld.district}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 p-3 bg-gray-50 rounded-2xl text-xs">
                  <div>
                    <span className="text-gray-400 block">Tổng quy mô:</span>
                    <span className="font-bold text-gray-900">{bld.totalRooms} phòng</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Phòng còn trống:</span>
                    <span className="font-bold text-[#006d37]">{bld.availableRooms} phòng</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-amber-500 font-bold">★ {bld.rating} ({bld.reviewCount} đánh giá)</span>
                  <Link to={`/toa-nha/${bld.id}`}>
                    <Button variant="outline" size="sm" rightIcon={<ChevronRight className="w-4 h-4" />}>
                      Xem Trang Công Khai
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};
