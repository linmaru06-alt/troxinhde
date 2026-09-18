import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAppStore, SUBSCRIPTION_PLANS } from '../store/useAppStore';
import { DashboardSidebar } from '../components/layout/DashboardSidebar';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { RoomCard, formatPrice } from '../components/ui/Cards';
import { Room } from '../types';
import {
  Eye,
  ShieldCheck,
  AlertCircle,
  Crown,
  ArrowRight,
  Save,
  Check,
  Maximize2,
  Sparkles,
  MapPin,
  X,
  AlertTriangle,
} from 'lucide-react';
import { ImageUploader } from '../components/ui/ImageUploader';
import { createRoom, updateRoom as apiUpdateRoom } from '../lib/api/rooms';

const COMMON_AMENITIES = [
  'Máy lạnh',
  'Tủ lạnh',
  'Ban công',
  'Bếp nấu ăn',
  'Wifi tốc độ cao',
  'Máy giặt chung',
  'Chỗ để xe máy',
  'Khóa vân tay / Thẻ từ',
  'Giường nệm',
  'Tủ quần áo',
  'Bình nóng lạnh',
  'Bảo vệ 24/7',
];

export const OwnerCreateRoomPage: React.FC = () => {
  const navigate = useNavigate();
  const { id, buildingId: routeBuildingId } = useParams<{ id?: string; buildingId?: string }>();
  const { buildings, addRoom, updateRoom, currentUser, rooms, ownerSubscription, showToast } = useAppStore();

  // Xác định chế độ: Chỉnh sửa phòng cũ hay Tạo phòng mới
  const editingRoom = id ? rooms.find((r) => r.id === id) : undefined;
  const isEditMode = Boolean(editingRoom);

  const myRooms = rooms.filter((r) => r.ownerId === currentUser?.id || r.ownerId === 'user_owner_1');
  const currentPlan =
    SUBSCRIPTION_PLANS.find((p) => p.id === ownerSubscription.planId) || SUBSCRIPTION_PLANS[0];
  const isLimitReached = !isEditMode && currentPlan.roomLimit !== 999 && myRooms.length >= currentPlan.roomLimit;

  const [showUpgradeModal, setShowUpgradeModal] = useState<boolean>(isLimitReached);
  const [showFullPreview, setShowFullPreview] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Key lưu trữ bản nháp trong localStorage
  const draftStorageKey = isEditMode
    ? `troxinh_draft_room_edit_${id}`
    : 'troxinh_draft_room_create';

  // Lấy dữ liệu nháp nếu có
  const getInitialDraft = () => {
    try {
      const saved = localStorage.getItem(draftStorageKey);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Lỗi đọc bản nháp:', e);
    }
    return null;
  };

  const initialDraft = getInitialDraft();
  const [hasRestoredDraft, setHasRestoredDraft] = useState<boolean>(Boolean(initialDraft));
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);

  // Form State
  const [buildingId, setBuildingId] = useState<string>(() => {
    if (initialDraft?.buildingId) return initialDraft.buildingId;
    if (editingRoom?.buildingId) return editingRoom.buildingId;
    if (routeBuildingId && buildings.some((b) => b.id === routeBuildingId)) return routeBuildingId;
    return buildings[0]?.id || 'bld_1';
  });

  const [roomNumber, setRoomNumber] = useState<string>(() => {
    return initialDraft?.roomNumber ?? (editingRoom?.roomNumber || 'P.305');
  });

  const [title, setTitle] = useState<string>(() => {
    return initialDraft?.title ?? (editingRoom?.title || 'Phòng Studio Ban Công Đầy Đủ Tiện Nghi');
  });

  const [price, setPrice] = useState<number>(() => {
    return initialDraft?.price ?? (editingRoom?.price || 3800000);
  });

  const [deposit, setDeposit] = useState<number>(() => {
    return initialDraft?.deposit ?? (editingRoom?.deposit || 3800000);
  });

  const [area, setArea] = useState<number>(() => {
    return initialDraft?.area ?? (editingRoom?.area || 24);
  });

  const [type, setType] = useState<Room['type']>(() => {
    return initialDraft?.type ?? (editingRoom?.type || 'Studio');
  });

  const [images, setImages] = useState<string[]>(() => {
    if (initialDraft?.images && Array.isArray(initialDraft.images) && initialDraft.images.length > 0) {
      return initialDraft.images;
    }
    if (editingRoom?.images && editingRoom.images.length > 0) {
      return editingRoom.images;
    }
    return ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800'];
  });

  const [amenities, setAmenities] = useState<string[]>(() => {
    if (initialDraft?.amenities && Array.isArray(initialDraft.amenities)) {
      return initialDraft.amenities;
    }
    if (editingRoom?.amenities) {
      return editingRoom.amenities;
    }
    return ['Máy lạnh', 'Tủ lạnh', 'Ban công', 'Bếp nấu ăn', 'Wifi tốc độ cao'];
  });

  const [description, setDescription] = useState<string>(() => {
    return (
      initialDraft?.description ??
      (editingRoom?.description ||
        'Phòng mới tinh có máy lạnh, ban công riêng đón gió, giờ giấc tự do không chung chủ. Khóa vân tay an ninh 24/7.')
    );
  });

  const selectedBuilding = buildings.find((b) => b.id === buildingId) || buildings[0];

  // Auto-save draft effect
  useEffect(() => {
    const draftData = {
      buildingId,
      roomNumber,
      title,
      price,
      deposit,
      area,
      type,
      images,
      amenities,
      description,
      savedAt: new Date().toISOString(),
    };

    try {
      localStorage.setItem(draftStorageKey, JSON.stringify(draftData));
      const now = new Date();
      setLastSavedTime(
        `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
      );
    } catch (e) {
      console.warn('Lỗi lưu bản nháp:', e);
    }
  }, [buildingId, roomNumber, title, price, deposit, area, type, images, amenities, description, draftStorageKey]);

  // Thủ công lưu bản nháp
  const handleSaveDraftManually = () => {
    const draftData = {
      buildingId,
      roomNumber,
      title,
      price,
      deposit,
      area,
      type,
      images,
      amenities,
      description,
      savedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(draftStorageKey, JSON.stringify(draftData));
      showToast('Đã lưu bản nháp', 'Dữ liệu đã được lưu an toàn trên trình duyệt của bạn', 'success');
    } catch (e) {
      showToast('Lỗi lưu nháp', 'Không thể ghi vào bộ nhớ tạm', 'error');
    }
  };

  // Xóa bản nháp để làm mới hoàn toàn
  const handleClearDraft = () => {
    try {
      localStorage.removeItem(draftStorageKey);
      setHasRestoredDraft(false);
      if (!isEditMode) {
        setRoomNumber('');
        setTitle('');
        setPrice(3000000);
        setDeposit(3000000);
        setArea(20);
        setDescription('');
        setImages([]);
        setAmenities(['Máy lạnh', 'Wifi tốc độ cao']);
      }
      showToast('Đã xóa bản nháp', 'Form đã được làm mới', 'info');
    } catch (e) {
      console.warn(e);
    }
  };

  const toggleAmenity = (item: string) => {
    setAmenities((prev) =>
      prev.includes(item) ? prev.filter((a) => a !== item) : [...prev, item]
    );
  };

  // Live preview mockup
  const previewRoom: Room = {
    id: editingRoom?.id || 'preview_room',
    buildingId,
    buildingName: selectedBuilding?.name || 'Tòa Nhà Trọ Xinh',
    ownerId: currentUser?.id || editingRoom?.ownerId || 'user_owner_1',
    ownerName: currentUser?.name || editingRoom?.ownerName || 'Chủ trọ',
    ownerPhone: currentUser?.phone || editingRoom?.ownerPhone || '',
    ownerAvatar: currentUser?.avatarUrl || editingRoom?.ownerAvatar || '/images/user-avatar.webp',
    title: title || 'Tiêu đề phòng trọ...',
    roomNumber: roomNumber || 'P.101',
    price: Number(price) || 0,
    deposit: Number(deposit) || 0,
    electricityPrice: selectedBuilding?.electricityPrice || 3800,
    waterPrice: selectedBuilding?.waterPrice || 100000,
    area: Number(area) || 20,
    type,
    status: editingRoom?.status || 'Chờ duyệt',
    verified: editingRoom?.verified || false,
    amenities: amenities.length > 0 ? amenities : ['Máy lạnh', 'Wifi tốc độ cao'],
    images: images.length > 0 ? images : ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800'],
    distanceToSchoolKm: 0.5,
    nearestSchool: 'ĐH Quốc Gia Hà Nội (500m)',
    address: selectedBuilding?.address || 'Hà Nội',
    district: selectedBuilding?.district || 'Quận Cầu Giấy',
    description: description || 'Chưa có mô tả chi tiết.',
    views: editingRoom?.views || 1,
    savedCount: editingRoom?.savedCount || 0,
    createdAt: editingRoom?.createdAt || new Date().toISOString(),
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // Validate
    if (!title.trim()) {
      showToast('Thiếu tiêu đề', 'Vui lòng nhập tiêu đề tin đăng', 'warning');
      return;
    }
    if (!roomNumber.trim()) {
      showToast('Thiếu số phòng', 'Vui lòng nhập số hoặc mã phòng', 'warning');
      return;
    }
    if (images.length === 0) {
      showToast('Thiếu ảnh phòng', 'Vui lòng tải lên ít nhất 1 ảnh phòng trọ thực tế', 'warning');
      return;
    }

    if (!isEditMode && isLimitReached) {
      setShowUpgradeModal(true);
      showToast(
        'Đã đạt hạn mức gói!',
        `Gói ${currentPlan.name} chỉ cho phép tối đa ${currentPlan.roomLimit} phòng. Vui lòng nâng cấp để tiếp tục.`,
        'warning'
      );
      return;
    }

    const ownerId = currentUser?.id || '00000000-0000-0000-0000-000000000002';
    const bldId = buildingId && buildingId.length === 36 ? buildingId : '00000000-0000-0000-0000-000000000001';

    setIsSubmitting(true);
    try {
      if (isEditMode && editingRoom) {
        // CẬP NHẬT PHÒNG HIỆN CÓ
        try {
          await apiUpdateRoom(editingRoom.id, {
            title: title.trim(),
            room_number: roomNumber.trim(),
            price: Number(price),
            deposit: Number(deposit),
            area: Number(area),
            room_type: type,
            amenities,
            description: description.trim(),
            images,
          });
        } catch (apiErr) {
          console.warn('[Supabase API] update room fallback:', apiErr);
        }

        updateRoom(editingRoom.id, {
          buildingId,
          buildingName: selectedBuilding?.name || editingRoom.buildingName,
          title: title.trim(),
          roomNumber: roomNumber.trim(),
          price: Number(price),
          deposit: Number(deposit),
          area: Number(area),
          type,
          amenities,
          description: description.trim(),
          images,
          address: selectedBuilding?.address || editingRoom.address,
          district: selectedBuilding?.district || editingRoom.district,
        });

        // Xóa bản nháp sau khi sửa thành công
        localStorage.removeItem(draftStorageKey);
        showToast('Cập nhật tin đăng thành công!', 'Các thay đổi đã được lưu lại', 'success');
        navigate(`/chu-tro/phong/${editingRoom.id}`);
      } else {
        // TẠO PHÒNG MỚI
        try {
          await createRoom({
            building_id: bldId,
            owner_id: ownerId,
            title: title.trim(),
            room_number: roomNumber.trim(),
            price: Number(price),
            deposit: Number(deposit),
            electricity_price: selectedBuilding?.electricityPrice || 3800,
            water_price: selectedBuilding?.waterPrice || 100000,
            area: Number(area),
            room_type: type,
            amenities,
            description: description.trim(),
            images: images.length > 0 ? images : ['/images/hero-banner.webp'],
          });
        } catch (apiErr) {
          console.warn('[Supabase API] create room fallback:', apiErr);
        }

        addRoom({
          buildingId,
          buildingName: selectedBuilding?.name || 'Tòa nhà Trọ Xinh',
          ownerId: currentUser?.id || ownerId,
          ownerName: currentUser?.name || 'Chủ trọ',
          ownerPhone: currentUser?.phone || '',
          ownerAvatar: currentUser?.avatarUrl || '/images/user-avatar.webp',
          title: title.trim(),
          roomNumber: roomNumber.trim(),
          price: Number(price),
          deposit: Number(deposit),
          electricityPrice: selectedBuilding?.electricityPrice || 3800,
          waterPrice: selectedBuilding?.waterPrice || 100000,
          area: Number(area),
          type,
          status: 'Chờ duyệt',
          verified: false,
          amenities,
          images: images.length > 0 ? images : ['/images/hero-banner.webp'],
          distanceToSchoolKm: 0.5,
          nearestSchool: 'ĐH Quốc Gia Hà Nội (500m)',
          address: selectedBuilding?.address || 'Hà Nội',
          district: selectedBuilding?.district || 'Cầu Giấy',
          description: description.trim(),
        });

        // Xóa bản nháp sau khi tạo thành công
        localStorage.removeItem(draftStorageKey);
        showToast('Tạo phòng trọ thành công!', 'Tin đăng đã được chuyển đến ban quản trị phê duyệt.', 'success');
        navigate('/chu-tro');
      }
    } catch (err: any) {
      // GIỮ NGUYÊN DỮ LIỆU KHI LỖI - KHÔNG RESET FORM
      const errorMsg = err?.message || 'Không thể lưu lên hệ thống. Dữ liệu của bạn đã được giữ nguyên.';
      setSubmitError(errorMsg);
      showToast('Lỗi khi gửi tin đăng', errorMsg, 'error');
    } finally {
      setIsSubmitting(false);
    }
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

        {/* Draft Restored Banner */}
        {hasRestoredDraft && (
          <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between gap-3 text-xs text-emerald-900 shadow-2xs">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#006d37] shrink-0" />
              <span>
                <strong>Đã tự động khôi phục dữ liệu nháp!</strong> Bạn có thể tiếp tục chỉnh sửa hoặc làm mới form.
              </span>
            </div>
            <button
              type="button"
              onClick={handleClearDraft}
              className="text-emerald-700 hover:text-rose-600 font-bold underline shrink-0 cursor-pointer"
            >
              Xóa nháp làm lại
            </button>
          </div>
        )}

        {/* Submit Error Banner (Giữ nguyên dữ liệu) */}
        {submitError && (
          <div className="p-4 bg-rose-50 rounded-2xl border border-rose-200 flex items-start justify-between gap-3 text-xs text-rose-900 shadow-2xs">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-rose-800">Không thể gửi tin đăng: {submitError}</p>
                <p className="text-[11px] text-rose-700">
                  Toàn bộ dữ liệu bạn đã nhập và các ảnh đã tải lên được giữ nguyên 100%. Vui lòng thử bấm nút gửi lại bên dưới.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSubmitError(null)}
              className="text-rose-500 hover:text-rose-700 p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Breadcrumb & Action Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Link to="/chu-tro" className="hover:text-[#006d37]">Bảng điều khiển</Link>
            <span>/</span>
            {isEditMode ? (
              <>
                <Link to={`/chu-tro/phong/${editingRoom?.id}`} className="hover:text-[#006d37]">
                  {editingRoom?.roomNumber}
                </Link>
                <span>/</span>
                <span className="font-bold text-gray-900">Chỉnh sửa tin</span>
              </>
            ) : (
              <span className="font-bold text-gray-900">Đăng phòng trọ mới</span>
            )}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {lastSavedTime && (
              <span className="text-[11px] text-gray-400 font-medium hidden sm:inline">
                Đã tự động lưu {lastSavedTime}
              </span>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSaveDraftManually}
              leftIcon={<Save className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              Lưu Bản Nháp
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowFullPreview(true)}
              leftIcon={<Eye className="w-3.5 h-3.5 text-[#006d37]" />}
              className="text-xs border-[#006d37]/30 text-[#006d37]"
            >
              Xem Trước Tin
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Left Form: 2 Cols */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h1 className="text-xl font-black text-gray-900">
                  {isEditMode ? `Chỉnh Sửa Phòng: ${editingRoom?.roomNumber}` : 'Thông Tin Phòng Cho Thuê Mới'}
                </h1>
                <p className="text-xs text-gray-500 mt-0.5">
                  Điền đầy đủ thông tin để người thuê dễ dàng tìm kiếm và tin tưởng phòng trọ của bạn
                </p>
              </div>
              <Badge variant={isEditMode ? 'pending' : 'primary'} size="sm">
                {isEditMode ? 'Chế độ sửa' : 'Tạo mới'}
              </Badge>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Select building */}
              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Thuộc Tòa Nhà
                </label>
                <select
                  value={buildingId}
                  onChange={(e) => setBuildingId(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-[#006d37] focus:outline-none"
                >
                  {buildings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} — {b.address} ({b.district})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Số phòng / Mã phòng"
                  required
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  placeholder="Ví dụ: P.305, P.201..."
                />
                <div className="space-y-1.5 text-left">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Loại phòng
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-[#006d37] focus:outline-none"
                  >
                    <option value="Phòng đơn">Phòng đơn</option>
                    <option value="Studio">Studio khép kín</option>
                    <option value="Phòng ghép">Phòng ở ghép</option>
                    <option value="Căn hộ mini">Căn hộ mini (Chung cư mini)</option>
                  </select>
                </div>
              </div>

              <Input
                label="Tiêu đề tin đăng công khai"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ví dụ: Phòng Studio Ban Công Thoáng Mát Gần ĐH Quốc Gia..."
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Giá thuê (VNĐ/tháng)"
                  type="number"
                  required
                  min={500000}
                  step={50000}
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                />
                <Input
                  label="Tiền cọc (VNĐ)"
                  type="number"
                  required
                  min={0}
                  step={50000}
                  value={deposit}
                  onChange={(e) => setDeposit(Number(e.target.value))}
                />
                <Input
                  label="Diện tích (m²)"
                  type="number"
                  required
                  min={8}
                  max={200}
                  value={area}
                  onChange={(e) => setArea(Number(e.target.value))}
                />
              </div>

              {/* Tiện nghi phòng */}
              <div className="space-y-2 text-left">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Tiện ích & Nội thất có sẵn trong phòng
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
                  {COMMON_AMENITIES.map((item) => {
                    const isChecked = amenities.includes(item);
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggleAmenity(item)}
                        className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-medium transition text-left cursor-pointer ${
                          isChecked
                            ? 'border-[#006d37] bg-emerald-50 text-[#006d37] font-bold shadow-2xs'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                            isChecked
                              ? 'bg-[#006d37] border-[#006d37] text-white'
                              : 'border-gray-300 bg-white'
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span className="truncate">{item}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5 text-left">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                  Mô tả chi tiết phòng trọ
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Mô tả cụ thể về giờ giấc, tiện ích, nội thất, khu vực để xe, an ninh..."
                  className="w-full rounded-xl border border-gray-300 p-3 text-sm focus:ring-2 focus:ring-[#006d37] focus:outline-none"
                />
              </div>

              {/* Cloudinary Image Uploader với tính năng sắp xếp ảnh đầy đủ */}
              <div className="pt-2 border-t border-gray-100">
                <ImageUploader
                  folder="troxinh/rooms"
                  maxFiles={10}
                  label="Ảnh thực tế phòng trọ"
                  helperText="Tối đa 10 ảnh • Kéo thả hoặc dùng nút mũi tên để sắp xếp • Ảnh đầu tiên sẽ là Ảnh Bìa"
                  onComplete={(urls) => setImages(urls)}
                  existingUrls={images}
                />
              </div>

              <div className="pt-4 flex flex-col sm:flex-row items-center gap-3">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full sm:flex-1 shadow-md"
                  disabled={isSubmitting}
                >
                  {isSubmitting
                    ? isEditMode
                      ? 'Đang Lưu Thay Đổi...'
                      : 'Đang Gửi Duyệt...'
                    : isEditMode
                    ? 'Lưu & Xuất Bản Chỉnh Sửa'
                    : 'Xác Nhận & Gửi Duyệt Tin Đăng'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => setShowFullPreview(true)}
                  leftIcon={<Eye className="w-4 h-4 text-[#006d37]" />}
                  className="w-full sm:w-auto"
                >
                  Xem Trước
                </Button>
              </div>
            </form>
          </div>

          {/* Right: Real-time Live Preview Card */}
          <div className="space-y-4 lg:sticky lg:top-24">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider">
                <Eye className="w-4 h-4 text-[#006d37]" />
                Xem trước thẻ phòng:
              </div>
              <button
                type="button"
                onClick={() => setShowFullPreview(true)}
                className="text-xs text-[#006d37] font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                Xem chi tiết
              </button>
            </div>

            <div className="max-w-sm mx-auto">
              <RoomCard room={previewRoom} />
            </div>

            <div className="p-4 bg-white rounded-2xl border border-gray-200 text-xs text-gray-600 space-y-2">
              <h4 className="font-bold text-gray-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#006d37]" />
                Lưu ý quan trọng cho chủ trọ:
              </h4>
              <p className="text-[11px] leading-relaxed text-gray-500">
                • Dữ liệu bài đăng luôn được tự động lưu nháp trong quá trình nhập liệu.
              </p>
              <p className="text-[11px] leading-relaxed text-gray-500">
                • Đặt ảnh phòng gọn gàng, đủ ánh sáng làm ảnh bìa để tăng 300% lượt click của sinh viên.
              </p>
              <p className="text-[11px] leading-relaxed text-gray-500">
                • Sau khi gửi duyệt, ban quản trị Trọ Xinh sẽ kiểm tra và phê duyệt trong vòng 2-4 giờ.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Xem Trước Toàn Bộ Tin Đăng (Full Preview Modal) */}
        <Modal
          isOpen={showFullPreview}
          onClose={() => setShowFullPreview(false)}
          title="Xem Trước Tin Đăng Như Khách Thuê Thấy"
          maxWidth="2xl"
        >
          <div className="space-y-5 max-h-[80vh] overflow-y-auto pr-1 text-left">
            {/* Gallery ảnh xem trước */}
            <div className="space-y-2">
              <div className="relative aspect-16/9 rounded-2xl overflow-hidden bg-gray-100 border border-gray-200">
                <img
                  src={previewRoom.images[0]}
                  alt="Ảnh bìa"
                  className="w-full h-full object-cover"
                />
                <span className="absolute top-3 left-3 bg-[#006d37] text-white text-xs font-bold px-2.5 py-1 rounded-lg shadow-sm">
                  ★ Ảnh bìa chính
                </span>
                <span className="absolute bottom-3 right-3 bg-black/70 text-white text-xs font-bold px-2.5 py-1 rounded-md">
                  1/{previewRoom.images.length} ảnh
                </span>
              </div>

              {previewRoom.images.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {previewRoom.images.slice(1, 5).map((url, idx) => (
                    <div key={idx} className="aspect-4/3 rounded-xl overflow-hidden border border-gray-200">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Thông tin chính */}
            <div className="space-y-2 border-b border-gray-100 pb-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                  {previewRoom.type}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs font-bold">
                  Phòng {previewRoom.roomNumber}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-gray-900">{previewRoom.title}</h2>
              <p className="text-xs text-gray-500 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>{previewRoom.address}, {previewRoom.district}</span>
              </p>
            </div>

            {/* Giá & Diện tích */}
            <div className="grid grid-cols-3 gap-3 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 text-center">
              <div>
                <span className="text-[11px] text-gray-500">Giá thuê</span>
                <div className="text-base sm:text-lg font-black text-[#006d37]">
                  {formatPrice(previewRoom.price)}
                </div>
              </div>
              <div>
                <span className="text-[11px] text-gray-500">Tiền cọc</span>
                <div className="text-base sm:text-lg font-black text-gray-900">
                  {formatPrice(previewRoom.deposit)}
                </div>
              </div>
              <div>
                <span className="text-[11px] text-gray-500">Diện tích</span>
                <div className="text-base sm:text-lg font-black text-gray-900">
                  {previewRoom.area} m²
                </div>
              </div>
            </div>

            {/* Tiện ích */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                Tiện ích & Nội thất
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {previewRoom.amenities.map((a) => (
                  <span
                    key={a}
                    className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs rounded-lg font-medium"
                  >
                    ✓ {a}
                  </span>
                ))}
              </div>
            </div>

            {/* Mô tả */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Mô tả chi tiết</h4>
              <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line bg-gray-50 p-3 rounded-xl border border-gray-100">
                {previewRoom.description}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <Button variant="outline" size="sm" onClick={() => setShowFullPreview(false)}>
                Đóng Xem Trước
              </Button>
            </div>
          </div>
        </Modal>

        {/* Upgrade Plan Modal */}
        <Modal
          isOpen={showUpgradeModal}
          onClose={() => setShowUpgradeModal(false)}
          title="Nâng Cấp Gói Để Tiếp Tục Đăng Phòng"
        >
          <div className="space-y-4 text-xs text-gray-600 text-left">
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#006d37] text-white flex items-center justify-center shrink-0">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <p className="font-extrabold text-gray-900 text-sm">
                  Hạn mức hiện tại: {currentPlan.roomLimit} phòng
                </p>
                <p className="text-gray-500">
                  Bạn đã đăng đủ {myRooms.length}/{currentPlan.roomLimit} phòng của {currentPlan.name}.
                </p>
              </div>
            </div>

            <p className="leading-relaxed">
              Để quản lý nhiều phòng trọ hơn và nhận thêm các lượt Đẩy Tin Nổi Bật miễn phí, bạn vui lòng nâng cấp lên{' '}
              <strong>Gói Cơ Bản (99.000đ/tháng)</strong> hoặc <strong>Gói Pro VIP</strong>.
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
