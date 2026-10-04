import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { DashboardSidebar } from '../components/layout/DashboardSidebar';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import {
  Building2,
  PlusCircle,
  MapPin,
  CheckCircle2,
  Star,
  ChevronRight,
  MoreVertical,
  Edit,
  Trash2,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import { Building } from '../types';

export const OwnerBuildingListPage: React.FC = () => {
  const { buildings, currentUser, ownerApplications, addBuilding, updateBuilding, removeBuilding, showToast } =
    useAppStore();

  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null);
  const [deletingBuildingId, setDeletingBuildingId] = useState<string | null>(null);

  // Form edit state
  const [editName, setEditName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editDistrict, setEditDistrict] = useState('');
  const [editTotalRooms, setEditTotalRooms] = useState(12);
  const [editDescription, setEditDescription] = useState('');

  // Close menu on click outside
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync / Populate first building from registration form if not already present
  useEffect(() => {
    if (!currentUser) return;
    const hasMyBuilding = buildings.some(
      (b) =>
        b.ownerId === currentUser.id ||
        (currentUser.id === 'user_owner_1' && b.ownerId === 'user_owner_1') ||
        (currentUser.firebaseUid && b.ownerId === currentUser.firebaseUid)
    );

    if (!hasMyBuilding) {
      const userApp = ownerApplications.find(
        (a) => a.userId === currentUser.id || a.userId === 'user_renter_1'
      );
      if (userApp && userApp.buildingName) {
        addBuilding({
          ownerId: currentUser.id,
          ownerName: userApp.fullName || userApp.userName || currentUser.name || 'Chủ Trọ',
          ownerPhone: userApp.userPhone || currentUser.phone || '0987654321',
          ownerAvatar: currentUser.avatarUrl || '/images/user-avatar.jpg',
          name: userApp.buildingName,
          address: userApp.address || 'Số 18 Ngõ 165 Cầu Giấy, P. Dịch Vọng',
          district: userApp.district || 'Quận Cầu Giấy',
          city: 'Hà Nội',
          totalRooms: userApp.totalRooms || 12,
          availableRooms: userApp.totalRooms || 12,
          amenities: ['Wifi tốc độ cao', 'Bảo vệ 24/7', 'Khóa vân tay', 'Thang máy', 'Nhà để xe rộng', 'Camera an ninh'],
          images: [
            'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&auto=format&fit=crop&q=80',
            'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&auto=format&fit=crop&q=80',
          ],
          verifiedBadge: true,
          rating: 5.0,
          reviewCount: 0,
          description: userApp.legalDocsNote || 'Tòa nhà quản lý chính chủ trên Trọ Xinh.',
          geo: { lat: 21.0333, lng: 105.7937 },
          nearbyUniversities: [{ name: 'ĐH Quốc Gia Hà Nội', distanceKm: 0.5 }],
        });
      }
    }
  }, [currentUser, buildings, ownerApplications, addBuilding]);

  const myBuildings = buildings.filter(
    (b) =>
      b.ownerId === currentUser?.id ||
      (currentUser?.id === 'user_owner_1' && b.ownerId === 'user_owner_1') ||
      (currentUser?.firebaseUid && b.ownerId === currentUser.firebaseUid)
  );

  const handleOpenEdit = (bld: Building) => {
    setEditingBuilding(bld);
    setEditName(bld.name);
    setEditAddress(bld.address);
    setEditDistrict(bld.district);
    setEditTotalRooms(bld.totalRooms);
    setEditDescription(bld.description || '');
    setActiveMenuId(null);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBuilding) return;
    if (!editName.trim()) {
      showToast('Thiếu tên tòa nhà', 'Vui lòng nhập tên tòa nhà', 'warning');
      return;
    }

    updateBuilding(editingBuilding.id, {
      name: editName.trim(),
      address: editAddress.trim(),
      district: editDistrict.trim(),
      totalRooms: Number(editTotalRooms) || editingBuilding.totalRooms,
      description: editDescription.trim(),
    });

    setEditingBuilding(null);
  };

  const handleConfirmDelete = () => {
    if (deletingBuildingId) {
      removeBuilding(deletingBuildingId);
      setDeletingBuildingId(null);
    }
  };

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
              Thêm Hồ Sơ Tòa Nhà
            </Button>
          </Link>
        </div>

        {myBuildings.length === 0 ? (
          <div className="bg-white rounded-3xl border border-gray-200 p-12 text-center space-y-4 shadow-xs">
            <div className="w-16 h-16 bg-emerald-50 text-[#00a854] rounded-full flex items-center justify-center mx-auto">
              <Building2 className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">Chưa Có Hồ Sơ Tòa Nhà Nào</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Tạo hồ sơ tòa nhà để bắt đầu đăng và quản lý danh sách phòng trọ cho thuê trên Trọ Xinh.
            </p>
            <Link to="/chu-tro/toa-nha/tao-moi" className="inline-block pt-2">
              <Button variant="primary" size="md" leftIcon={<PlusCircle className="w-4 h-4" />}>
                Thêm Hồ Sơ Tòa Nhà
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6" ref={menuRef}>
            {myBuildings.map((bld, index) => (
              <div
                key={bld.id}
                className="bg-white rounded-3xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-all space-y-4 relative"
              >
                <div className="relative aspect-16/9 w-full bg-gray-100">
                  <img
                    src={bld.images?.[0] || '/images/hero-banner.webp'}
                    alt={bld.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <Badge variant="verified" size="sm">
                      Đã kiểm duyệt PCCC
                    </Badge>
                    {index === 0 && (
                      <span className="text-[10px] font-black bg-emerald-600 text-white px-2.5 py-0.5 rounded-full shadow-xs">
                        Tòa nhà chính
                      </span>
                    )}
                  </div>

                  {/* 3-Dots Actions Menu Button */}
                  <div className="absolute top-3 right-3">
                    <button
                      type="button"
                      onClick={() => setActiveMenuId(activeMenuId === bld.id ? null : bld.id)}
                      className="w-8 h-8 rounded-full bg-white/90 backdrop-blur-md shadow-md flex items-center justify-center text-gray-700 hover:bg-white hover:text-gray-950 transition cursor-pointer"
                      title="Tùy chọn quản lý tòa nhà"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {activeMenuId === bld.id && (
                      <div className="absolute right-0 mt-1 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 py-1.5 z-20 text-xs font-semibold animate-in fade-in zoom-in-95 duration-100">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(bld)}
                          className="w-full text-left px-3.5 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-800 transition cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5 text-blue-600" />
                          <span>Chỉnh sửa hồ sơ tòa</span>
                        </button>
                        <Link
                          to={`/chu-tro/phong/tao-moi/${bld.id}`}
                          className="w-full text-left px-3.5 py-2 hover:bg-gray-50 flex items-center gap-2 text-gray-800 transition block cursor-pointer"
                        >
                          <PlusCircle className="w-3.5 h-3.5 text-[#00a854]" />
                          <span>Đăng phòng vào tòa</span>
                        </Link>
                        <div className="my-1 border-t border-gray-100" />
                        <button
                          type="button"
                          onClick={() => {
                            setActiveMenuId(null);
                            setDeletingBuildingId(bld.id);
                          }}
                          className="w-full text-left px-3.5 py-2 hover:bg-rose-50 flex items-center gap-2 text-rose-600 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Xóa hồ sơ tòa nhà</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-6 pt-0 space-y-3">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{bld.name}</h3>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
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

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100">
                    <span className="text-xs text-amber-500 font-bold">
                      ★ {bld.rating} ({bld.reviewCount} đánh giá)
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Link to={`/chu-tro/phong/tao-moi/${bld.id}`}>
                        <Button variant="outline" size="sm" leftIcon={<PlusCircle className="w-3.5 h-3.5" />}>
                          Đăng phòng
                        </Button>
                      </Link>
                      <Link to={`/chu-tro/toa-nha/${bld.id}`}>
                        <Button variant="primary" size="sm" rightIcon={<ChevronRight className="w-4 h-4" />}>
                          Quản lý tòa
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal Chỉnh Sửa Hồ Sơ Tòa Nhà */}
        <Modal
          isOpen={Boolean(editingBuilding)}
          onClose={() => setEditingBuilding(null)}
          title="Chỉnh Sửa Hồ Sơ Tòa Nhà"
          maxWidth="lg"
        >
          {editingBuilding && (
            <form onSubmit={handleSaveEdit} className="space-y-4 text-left">
              <Input
                label="Tên tòa nhà / Cơ sở"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Ví dụ: Tòa Nhà Xanh Trọ Xinh - Cơ Sở Cầu Giấy"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Địa chỉ chi tiết"
                  required
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  placeholder="Ví dụ: Số 18 Ngõ 165 Cầu Giấy"
                />
                <Input
                  label="Quận / Huyện"
                  required
                  value={editDistrict}
                  onChange={(e) => setEditDistrict(e.target.value)}
                  placeholder="Ví dụ: Quận Cầu Giấy"
                />
              </div>

              <Input
                label="Tổng số phòng quy mô"
                type="number"
                required
                min={1}
                max={500}
                value={editTotalRooms}
                onChange={(e) => setEditTotalRooms(Number(e.target.value))}
              />

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Mô tả / Ghi chú tòa nhà
                </label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Mô tả về quy mô, bảo vệ, hệ thống PCCC, tiện ích chung..."
                  className="w-full rounded-xl border border-gray-300 p-3 text-sm focus:ring-2 focus:ring-[#006d37] focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditingBuilding(null)}>
                  Hủy bỏ
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Lưu Thay Đổi
                </Button>
              </div>
            </form>
          )}
        </Modal>

        {/* Dialog Xác Nhận Xóa Tòa Nhà */}
        <ConfirmDialog
          isOpen={Boolean(deletingBuildingId)}
          onClose={() => setDeletingBuildingId(null)}
          onConfirm={handleConfirmDelete}
          title="Xác nhận xóa hồ sơ tòa nhà"
          description="Bạn có chắc chắn muốn xóa hồ sơ tòa nhà này? Tất cả dữ liệu liên quan sẽ bị xóa khỏi danh sách quản lý của bạn."
          variant="destructive"
          confirmText="Xác Nhận Xóa"
          cancelText="Hủy"
        />
      </main>
    </div>
  );
};
