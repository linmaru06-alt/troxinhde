import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '../store/useAppStore';
import { DashboardSidebar } from '../components/layout/DashboardSidebar';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import {
  Building2,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Check,
  LocateFixed,
  Crown,
} from 'lucide-react';
import { ImageUploader } from '../components/ui/ImageUploader';
import { MapPinPicker } from '../components/map/TroXinhMap';
import { createBuilding } from '../lib/api/buildings';
import { geocodeAddressCached } from '../lib/geocoding';
import { useK23Subscription } from '../hooks/queries/useK23Subscription';
import { UpgradeModal } from '../components/k23/subscription/UpgradeModal';
import { resolveUserIdToUuid } from '../lib/api/messages';

export const OwnerCreateBuildingPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addBuilding, currentUser, showToast } = useAppStore();
  const {
    canAddBuilding,
    isLoadingSubscription,
    buildingCount,
    maxBuildings,
    currentPlan,
  } = useK23Subscription();
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form State
  const [name, setName] = useState<string>('Tòa Nhà Xanh Trọ Xinh - Cơ Sở 3');
  const [address, setAddress] = useState<string>('Số 18 Ngõ 165 Cầu Giấy, P. Dịch Vọng');
  const [district, setDistrict] = useState<string>('Quận Cầu Giấy');
  const [totalRooms, setTotalRooms] = useState<number>(20);
  const [description, setDescription] = useState<string>(
    'Tòa nhà mới xây 100%, trang bị đầy đủ PCCC và camera an ninh 24/7. Giờ giấc tự do.'
  );
  const [images, setImages] = useState<string[]>([]);
  const [geo, setGeo] = useState<{ lat: number; lng: number }>({ lat: 21.0338, lng: 105.7982 });
  const [hasPinnedManually, setHasPinnedManually] = useState<boolean>(false);
  const [isLocatingAddress, setIsLocatingAddress] = useState<boolean>(false);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([
    'Wifi tốc độ cao',
    'Bảo vệ 24/7',
    'Khóa vân tay',
    'Thang máy',
    'Nhà để xe rộng',
  ]);

  const allAmenities = [
    'Wifi tốc độ cao',
    'Bảo vệ 24/7',
    'Khóa vân tay',
    'Thang máy',
    'Máy giặt chung',
    'Nhà để xe rộng',
    'Camera an ninh',
    'Sân thượng phơi đồ',
    'Bếp chung tiện nghi',
  ];

  const toggleAmenity = (item: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(item) ? prev.filter((a) => a !== item) : [...prev, item]
    );
  };

  const handleLocateFromAddress = async () => {
    if (!address.trim() && !district.trim()) {
      showToast('Thiếu địa chỉ', 'Vui lòng nhập số nhà, tên đường để định vị.', 'warning');
      return;
    }
    setIsLocatingAddress(true);
    try {
      const coords = await geocodeAddressCached(address.trim(), district.trim());
      if (coords) {
        setGeo(coords);
        setHasPinnedManually(false);
        showToast('Đã định vị địa chỉ!', `Ghim bản đồ đã di chuyển tới ${address || district}.`, 'success');
      } else {
        showToast('Chưa tìm thấy chính xác', 'Bạn có thể nhấp hoặc kéo ghim trực tiếp trên bản đồ.', 'info');
      }
    } finally {
      setIsLocatingAddress(false);
    }
  };

  const handleSubmit = async () => {
    if (!currentUser?.id) {
      showToast('Vui lòng đăng nhập', 'Bạn cần đăng nhập tài khoản chủ trọ để tạo tòa nhà.', 'warning');
      return;
    }

    if (!isLoadingSubscription && !canAddBuilding) {
      setIsUpgradeModalOpen(true);
      showToast(
        'Đã đạt giới hạn tòa nhà của gói K23',
        `Gói ${currentPlan?.name || 'hiện tại'} chỉ hỗ trợ tối đa ${maxBuildings} tòa nhà. Vui lòng nâng cấp để thêm tòa nhà mới.`,
        'warning'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const ownerId =
        currentUser.isDemoAccount || currentUser.id === '00000000-0000-0000-0000-000000000002'
          ? '00000000-0000-0000-0000-000000000002'
          : await resolveUserIdToUuid(currentUser.id);

      let finalGeo = geo;
      if (!hasPinnedManually && address.trim()) {
        const resolved = await geocodeAddressCached(address.trim(), district.trim());
        if (resolved) finalGeo = resolved;
      }

      await createBuilding({
        owner_id: ownerId,
        name: name.trim(),
        address: address.trim(),
        district: district.trim(),
        city: 'Hà Nội',
        lat: finalGeo.lat,
        lng: finalGeo.lng,
        description: description.trim(),
        amenities: selectedAmenities,
        cover_image_url: images.length > 0 ? images[0] : '/images/hero-banner.webp',
      });

      const id = addBuilding({
        ownerId: currentUser.id || ownerId,
        ownerName: currentUser.name || 'Chủ trọ',
        ownerPhone: currentUser.phone || '',
        ownerAvatar: currentUser.avatarUrl || '/images/user-avatar.webp',
        name,
        address,
        district,
        city: 'Hà Nội',
        totalRooms,
        availableRooms: totalRooms,
        amenities: selectedAmenities,
        images: images.length > 0 ? images : ['/images/hero-banner.webp'],
        verifiedBadge: false,
        rating: 5.0,
        reviewCount: 0,
        description,
        geo: finalGeo,
        nearbyUniversities: [{ name: 'ĐH Quốc Gia Hà Nội', distanceKm: 0.5 }],
      });

      queryClient.invalidateQueries({ queryKey: ['k23-building-count'] });
      showToast('Tạo hồ sơ tòa nhà thành công!', 'Hồ sơ đã được gửi để kiểm duyệt.', 'success');
      navigate(`/toa-nha/${id}`);
    } catch (err: any) {
      showToast('Lỗi khi tạo tòa nhà', err?.message || 'Không thể lưu lên cơ sở dữ liệu. Vui lòng thử lại!', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex bg-gray-50 min-h-[calc(100vh-4rem)]">
      <DashboardSidebar role="owner" />

      <main className="flex-1 p-4 sm:p-8 max-w-4xl space-y-6 overflow-y-auto">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Link to="/chu-tro" className="hover:text-[#006d37]">Bảng điều khiển</Link>
            <span>/</span>
            <span className="font-bold text-gray-900">Tạo hồ sơ tòa nhà mới</span>
          </div>

          <Link
            to="/chu-tro/goi-dich-vu?returnUrl=%2Fchu-tro%2Ftoa-nha%2Ftao-moi"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold hover:bg-amber-100 transition"
          >
            <Crown className="w-3.5 h-3.5 text-amber-600" />
            <span>
              K23: {buildingCount}/{maxBuildings === -1 ? '∞' : maxBuildings} tòa nhà
            </span>
          </Link>
        </div>

        {!isLoadingSubscription && !canAddBuilding && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-orange-900">
                Bạn đã đạt giới hạn tòa nhà của {currentPlan?.name || 'gói K23 hiện tại'} ({buildingCount}/{maxBuildings} tòa nhà)
              </p>
              <p className="text-xs text-orange-700 mt-0.5">
                Nâng cấp lên gói Tiêu Chuẩn (tối đa 3 tòa nhà) hoặc gói Chuỗi (không giới hạn) để tạo thêm cơ sở mới.
              </p>
            </div>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setIsUpgradeModalOpen(true)}
            >
              Nâng cấp gói K23
            </Button>
          </div>
        )}

        {/* Stepper Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-md space-y-8 animate-fadeIn">
          {/* Stepper Progress */}
          <div className="flex items-center justify-between border-b border-gray-100 pb-4 text-xs font-bold">
            <div className={`flex items-center gap-2 ${step >= 1 ? 'text-[#006d37]' : 'text-gray-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${step >= 1 ? 'bg-[#006d37] text-white' : 'bg-gray-100'}`}>1</div>
              <span>Thông Tin Tòa Nhà</span>
            </div>
            <span className="text-gray-300">───</span>
            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-[#006d37]' : 'text-gray-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${step >= 2 ? 'bg-[#006d37] text-white' : 'bg-gray-100'}`}>2</div>
              <span>Tiện Ích Chung</span>
            </div>
            <span className="text-gray-300">───</span>
            <div className={`flex items-center gap-2 ${step === 3 ? 'text-[#006d37]' : 'text-gray-400'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${step === 3 ? 'bg-[#006d37] text-white' : 'bg-gray-100'}`}>3</div>
              <span>Xem Lại & Gửi Duyệt</span>
            </div>
          </div>

          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-5 animate-fadeIn">
              <h2 className="text-lg font-bold text-gray-900">Bước 1: Khai Báo Thông Tin Cơ Bản & Định Vị Tòa Nhà</h2>
              <Input
                label="Tên tòa nhà / Khu nhà trọ"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ví dụ: Tòa Nhà Xanh Trọ Xinh"
              />

              {/* Map Pin Picker */}
              <div className="space-y-2 text-left">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Chọn vị trí tòa nhà trên bản đồ (Click hoặc Kéo ghim)
                  </label>
                  <button
                    type="button"
                    onClick={handleLocateFromAddress}
                    disabled={isLocatingAddress}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#006d37] border border-emerald-200 text-xs font-bold transition cursor-pointer"
                  >
                    <LocateFixed className={`w-3.5 h-3.5 ${isLocatingAddress ? 'animate-spin' : ''}`} />
                    {isLocatingAddress ? 'Đang định vị...' : 'Định vị theo địa chỉ'}
                  </button>
                </div>
                <MapPinPicker
                  initialLat={geo.lat}
                  initialLng={geo.lng}
                  onLocationChange={(loc) => {
                    setGeo({ lat: loc.lat, lng: loc.lng });
                    setHasPinnedManually(true);
                    if (loc.address && !address.trim()) {
                      setAddress(loc.address);
                    }
                  }}
                  className="h-72 rounded-2xl overflow-hidden shadow-inner"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Địa chỉ số nhà, tên đường"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ví dụ: 18 Ngõ 165 Cầu Giấy"
                />
                <div className="space-y-1.5 text-left">
                  <label className="block text-sm font-medium text-gray-700">Khu vực / Quận</label>
                  <select
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-xl p-2.5 text-sm"
                  >
                    <option value="Quận Cầu Giấy">Quận Cầu Giấy</option>
                    <option value="Quận Đống Đa">Quận Đống Đa</option>
                    <option value="Quận Hai Bà Trưng">Quận Hai Bà Trưng</option>
                    <option value="Quận Thanh Xuân">Quận Thanh Xuân</option>
                    <option value="Quận Nam Từ Liêm">Quận Nam Từ Liêm</option>
                    <option value="Quận Hà Đông">Quận Hà Đông</option>
                    <option value="Quận Ba Đình">Quận Ba Đình</option>
                  </select>
                </div>
              </div>

              <Input
                label="Tổng số lượng phòng trong tòa nhà"
                type="number"
                required
                value={totalRooms}
                onChange={(e) => setTotalRooms(Number(e.target.value))}
                placeholder="20"
              />

              <div className="space-y-1.5 text-left">
                <label className="block text-sm font-medium text-gray-700">Mô tả tổng quan</label>
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
                  folder="troxinh/buildings"
                  maxFiles={5}
                  label="Ảnh tòa nhà / khu trọ"
                  helperText="Ảnh đầu tiên sẽ hiển thị làm ảnh bìa tòa nhà"
                  onComplete={(urls) => setImages(urls)}
                  existingUrls={images}
                />
              </div>

              <div className="flex justify-end pt-4">
                <Button variant="primary" size="md" onClick={() => setStep(2)} rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Tiếp Tục Chọn Tiện Ích
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-5 animate-fadeIn">
              <h2 className="text-lg font-bold text-gray-900">Bước 2: Chọn Tiện Ích Toàn Tòa Nhà</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {allAmenities.map((item) => {
                  const isChecked = selectedAmenities.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleAmenity(item)}
                      className={`p-3.5 rounded-2xl border text-xs font-semibold text-left transition flex items-center justify-between ${
                        isChecked
                          ? 'border-[#006d37] bg-emerald-50 text-[#006d37] shadow-xs'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span>{item}</span>
                      {isChecked && <Check className="w-4 h-4 text-[#006d37]" />}
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" size="md" onClick={() => setStep(1)} leftIcon={<ArrowLeft className="w-4 h-4" />}>
                  Quay Lại
                </Button>
                <Button variant="primary" size="md" onClick={() => setStep(3)} rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Xem Lại Hồ Sơ
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="space-y-6 animate-fadeIn">
              <h2 className="text-lg font-bold text-gray-900">Bước 3: Xem Lại & Gửi Duyệt</h2>

              <div className="p-5 bg-gray-50 rounded-2xl border border-gray-200 space-y-3 text-xs">
                <div>
                  <span className="text-gray-400">Tên tòa nhà:</span>
                  <p className="text-base font-bold text-gray-900">{name}</p>
                </div>
                <div>
                  <span className="text-gray-400">Địa chỉ:</span>
                  <p className="font-semibold text-gray-800">{address}, {district}</p>
                </div>
                <div>
                  <span className="text-gray-400">Tổng quy mô:</span>
                  <p className="font-semibold text-gray-800">{totalRooms} phòng</p>
                </div>
                <div>
                  <span className="text-gray-400">Tiện ích đã chọn:</span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {selectedAmenities.map((a) => (
                      <span key={a} className="px-2 py-0.5 bg-white border border-gray-200 rounded-md font-medium text-gray-700">
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-start gap-3 text-xs text-emerald-900">
                <ShieldCheck className="w-5 h-5 text-[#006d37] shrink-0" />
                <p>
                  Sau khi gửi, chuyên viên kiểm định Trọ Xinh sẽ liên hệ trong 24h để hỗ trợ xác minh PCCC và gắn huy hiệu Đã Kiểm Duyệt cho toàn bộ các phòng thuộc tòa nhà.
                </p>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" size="md" onClick={() => setStep(2)} leftIcon={<ArrowLeft className="w-4 h-4" />}>
                  Chỉnh Sửa
                </Button>
                <Button variant="primary" size="lg" onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? 'Đang Gửi Hồ Sơ...' : 'Gửi Hồ Sơ Kiểm Duyệt'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        title="Đã đạt giới hạn tòa nhà của gói K23"
        message={`Gói ${currentPlan?.name || 'hiện tại'} hỗ trợ tối đa ${maxBuildings === -1 ? 'không giới hạn' : maxBuildings} tòa nhà. Vui lòng nâng cấp lên Tiêu Chuẩn hoặc Chuỗi để tiếp tục.`}
        returnUrl="/chu-tro/toa-nha/tao-moi"
      />
    </div>
  );
};
