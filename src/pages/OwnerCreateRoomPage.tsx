import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppStore, SUBSCRIPTION_PLANS } from '../store/useAppStore';
import { DashboardSidebar } from '../components/layout/DashboardSidebar';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { RoomCard, formatPrice } from '../components/ui/Cards';
import { Room } from '../types';
import { PlusCircle, Eye, Upload, ShieldCheck, Home, AlertCircle, Crown, ArrowRight } from 'lucide-react';
import { ImageUploader } from '../components/ui/ImageUploader';
import { createRoom } from '../lib/api/rooms';

export const OwnerCreateRoomPage: React.FC = () => {
  const navigate = useNavigate();
  const { buildings, addRoom, currentUser, rooms, ownerSubscription, showToast } = useAppStore();

  const myRooms = rooms.filter((r) => r.ownerId === currentUser?.id || r.ownerId === 'user_owner_1');
  const currentPlan =
    SUBSCRIPTION_PLANS.find((p) => p.id === ownerSubscription.planId) || SUBSCRIPTION_PLANS[0];
  const isLimitReached = currentPlan.roomLimit !== 999 && myRooms.length >= currentPlan.roomLimit;
  const [showUpgradeModal, setShowUpgradeModal] = useState<boolean>(isLimitReached);

  const [buildingId, setBuildingId] = useState<string>(buildings[0]?.id || 'bld_1');
  const [roomNumber, setRoomNumber] = useState<string>('P.305');
  const [title, setTitle] = useState<string>('Phòng Studio Ban Công Đầy Đủ Tiện Nghi');
  const [price, setPrice] = useState<number>(3800000);
  const [deposit, setDeposit] = useState<number>(3800000);
  const [area, setArea] = useState<number>(24);
  const [type, setType] = useState<Room['type']>('Studio');
  const [images, setImages] = useState<string[]>([
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
  ]);
  const [description, setDescription] = useState<string>(
    'Phòng mới tinh có máy lạnh, ban công riêng đón gió, giờ giấc tự do không chung chủ.'
  );

  const selectedBuilding = buildings.find((b) => b.id === buildingId) || buildings[0];

  // Live preview mockup (Real-time updates with uploaded images)
  const previewRoom: Room = {
    id: 'preview_room',
    buildingId,
    buildingName: selectedBuilding?.name || 'Tòa Nhà Xanh Trọ Xinh',
    ownerId: currentUser?.id || 'user_owner_1',
    ownerName: currentUser?.name || 'Trần Quốc Tuấn',
    ownerPhone: currentUser?.phone || '0912345678',
    ownerAvatar: currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    title: title || 'Tiêu đề phòng trọ...',
    roomNumber: roomNumber || 'P.101',
    price: Number(price) || 0,
    deposit: Number(deposit) || 0,
    electricityPrice: 3800,
    waterPrice: 100000,
    area: Number(area) || 20,
    type,
    status: 'Chờ duyệt',
    verified: false,
    amenities: ['Máy lạnh', 'Tủ lạnh', 'Ban công', 'Bếp', 'Wifi'],
    images: images.length > 0 ? images : ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800'],
    distanceToSchoolKm: 0.5,
    nearestSchool: 'ĐH Quốc Gia Hà Nội (500m)',
    address: selectedBuilding?.address || 'Ngõ 165 Cầu Giấy, P. Dịch Vọng',
    district: selectedBuilding?.district || 'Quận Cầu Giấy',
    description,
    views: 0,
    savedCount: 0,
    createdAt: new Date().toISOString(),
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();

    if (isLimitReached) {
      setShowUpgradeModal(true);
      showToast(
        'Đã đạt hạn mức gói!',
        `Gói ${currentPlan.name} chỉ cho phép tối đa ${currentPlan.roomLimit} phòng. Vui lòng nâng cấp để tiếp tục.`,
        'warning'
      );
      return;
    }

    const ownerId = currentUser?.id || '00000000-0000-0000-0000-000000000002';
    const bldId = (buildingId && buildingId.length === 36) ? buildingId : '00000000-0000-0000-0000-000000000001';

    // 1. Đồng bộ lên Supabase Cloud
    createRoom({
      building_id: bldId,
      owner_id: ownerId,
      title: title.trim(),
      room_number: roomNumber.trim(),
      price: Number(price),
      deposit: Number(deposit),
      electricity_price: 3800,
      water_price: 100000,
      area: Number(area),
      room_type: type,
      amenities: ['Máy lạnh', 'Tủ lạnh', 'Ban công', 'Bếp', 'Wifi'],
      description: description.trim(),
      images: images.length > 0 ? images : ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800'],
    }).catch((err) => {
      console.warn('[Owner Room] Lỗi khi tạo phòng lên Supabase Cloud:', err);
    });

    addRoom({
      buildingId,
      buildingName: selectedBuilding.name,
      ownerId: currentUser?.id || 'user_owner_1',
      ownerName: currentUser?.name || 'Trần Quốc Tuấn',
      ownerPhone: currentUser?.phone || '0912345678',
      ownerAvatar: currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      title,
      roomNumber,
      price: Number(price),
      deposit: Number(deposit),
      electricityPrice: 3800,
      waterPrice: 100000,
      area: Number(area),
      type,
      status: 'Chờ duyệt',
      verified: false,
      amenities: ['Máy lạnh', 'Tủ lạnh', 'Ban công', 'Bếp', 'Wifi'],
      images: images.length > 0 ? images : ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800'],
      distanceToSchoolKm: 0.5,
      nearestSchool: 'ĐH Quốc Gia Hà Nội (500m)',
      address: selectedBuilding.address,
      district: selectedBuilding.district,
      description,
    });

    showToast('Tạo phòng trọ thành công!', 'Phòng của bạn đang được chuyển đến ban quản trị phê duyệt.', 'success');
    navigate('/chu-tro');
  };

  return (
    <div className="flex bg-gray-50 min-h-[calc(100vh-4rem)]">
      <DashboardSidebar role="owner" />

      <main className="flex-1 p-4 sm:p-8 max-w-6xl space-y-6 overflow-y-auto">
        {/* Limit Reached Warning Banner */}
        {isLimitReached && (
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">
                  Bạn đã dùng hết {currentPlan.roomLimit}/{currentPlan.roomLimit} phòng của {currentPlan.name}
                </p>
                <p className="text-xs text-gray-600">
                  Nâng cấp lên Gói Cơ Bản (99k) hoặc Gói Pro để mở rộng hạn mức đăng phòng.
                </p>
              </div>
            </div>

            <Link to="/nang-cap">
              <Button variant="primary" size="sm" leftIcon={<Crown className="w-4 h-4" />}>
                Nâng Cấp Ngay
              </Button>
            </Link>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Link to="/chu-tro" className="hover:text-[#006d37]">Bảng điều khiển</Link>
          <span>/</span>
          <span className="font-bold text-gray-900">Đăng phòng trọ mới</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Left Form: 2 Cols */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-md space-y-6">
            <h1 className="text-xl font-black text-gray-900">Thông Tin Phòng Cho Thuê</h1>

            <form onSubmit={handleCreate} className="space-y-4">
              {/* Select building */}
              <div className="space-y-1.5 text-left">
                <label className="block text-sm font-medium text-gray-700">Thuộc Tòa Nhà</label>
                <select
                  value={buildingId}
                  onChange={(e) => setBuildingId(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-sm"
                >
                  {buildings.map((b) => (
                    <option key={b.id} value={b.id}>{b.name} ({b.district})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Số phòng / Mã phòng"
                  required
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  placeholder="P.305"
                />
                <div className="space-y-1.5 text-left">
                  <label className="block text-sm font-medium text-gray-700">Loại phòng</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-sm"
                  >
                    <option value="Phòng đơn">Phòng đơn</option>
                    <option value="Studio">Studio</option>
                    <option value="Phòng ghép">Phòng ghép</option>
                    <option value="Căn hộ mini">Căn hộ mini</option>
                  </select>
                </div>
              </div>

              <Input
                label="Tiêu đề tin đăng công khai"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ví dụ: Phòng Studio Ban Công Thoáng Mát..."
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Giá thuê (VNĐ/tháng)"
                  type="number"
                  required
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                />
                <Input
                  label="Tiền cọc (VNĐ)"
                  type="number"
                  required
                  value={deposit}
                  onChange={(e) => setDeposit(Number(e.target.value))}
                />
                <Input
                  label="Diện tích (m²)"
                  type="number"
                  required
                  value={area}
                  onChange={(e) => setArea(Number(e.target.value))}
                />
              </div>

              <div className="space-y-1.5 text-left">
                <label className="block text-sm font-medium text-gray-700">Mô tả chi tiết phòng</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 p-3 text-sm focus:ring-2 focus:ring-[#006d37]"
                />
              </div>

              {/* Real Cloudinary Image Uploader */}
              <div className="pt-2">
                <ImageUploader
                  folder="troxinh/rooms"
                  maxFiles={10}
                  label="Ảnh phòng trọ thực tế"
                  helperText="Tối đa 10 ảnh. Ảnh đầu tiên sẽ tự động làm ảnh bìa hiển thị trên thẻ xem trước"
                  onComplete={(urls) => setImages(urls)}
                  existingUrls={images}
                />
              </div>

              <Button type="submit" variant="primary" size="lg" className="w-full">
                Xác Nhận & Gửi Duyệt Tin Đăng
              </Button>
            </form>
          </div>

          {/* Right: Real-time Live Preview Card */}
          <div className="space-y-4 lg:sticky lg:top-24">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase">
              <Eye className="w-4 h-4 text-[#006d37]" />
              Xem trước hiển thị thực tế:
            </div>
            <div className="max-w-sm mx-auto">
              <RoomCard room={previewRoom} />
            </div>
          </div>
        </div>

        {/* Upgrade Plan Modal */}
        <Modal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          title="Nâng Cấp Gói Để Tiếp Tục Đăng Phòng"
        >
          <div className="space-y-4 text-xs text-gray-600">
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#006d37] text-white flex items-center justify-center shrink-0">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <p className="font-extrabold text-gray-900 text-sm">Hạn mức hiện tại: {currentPlan.roomLimit} phòng</p>
                <p className="text-gray-500">Bạn đã đăng đủ {myRooms.length}/{currentPlan.roomLimit} phòng của {currentPlan.name}.</p>
              </div>
            </div>

            <p className="leading-relaxed">
              Để quản lý nhiều phòng trọ hơn và nhận thêm các lượt Đẩy Tin Nổi Bật miễn phí, bạn vui lòng nâng cấp lên <strong>Gói Cơ Bản (99.000đ/tháng)</strong> hoặc <strong>Gói Pro VIP</strong>.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
              <Button variant="outline" size="sm" onClick={() => setShowUpgradeModal(false)}>
                Đóng
              </Button>
              <Link to="/nang-cap">
                <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Xem Bảng Giá Nâng Cấp
                </Button>
              </Link>
            </div>
          </div>
        </Modal>
      </main>
    </div>
  );
};
