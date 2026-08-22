import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { DashboardSidebar } from '../components/layout/DashboardSidebar';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import {
  Building2,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Upload,
  ShieldCheck,
  Check,
} from 'lucide-react';

export const OwnerCreateBuildingPage: React.FC = () => {
  const navigate = useNavigate();
  const { addBuilding, currentUser, showToast } = useAppStore();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form State
  const [name, setName] = useState<string>('Tòa Nhà Xanh Trọ Xinh - Cơ Sở 3');
  const [address, setAddress] = useState<string>('Số 18 Ngõ 165 Cầu Giấy, P. Dịch Vọng');
  const [district, setDistrict] = useState<string>('Quận Cầu Giấy');
  const [totalRooms, setTotalRooms] = useState<number>(20);
  const [description, setDescription] = useState<string>(
    'Tòa nhà mới xây 100%, trang bị đầy đủ PCCC và camera an ninh 24/7. Giờ giấc tự do.'
  );
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

  const handleSubmit = () => {
    const id = addBuilding({
      ownerId: currentUser?.id || 'user_owner_1',
      ownerName: currentUser?.name || 'Trần Quốc Tuấn',
      ownerPhone: currentUser?.phone || '0912345678',
      ownerAvatar: currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
      name,
      address,
      district,
      city: 'Hà Nội',
      totalRooms,
      availableRooms: totalRooms,
      amenities: selectedAmenities,
      images: [
        'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800',
        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
      ],
      verifiedBadge: false,
      rating: 5.0,
      reviewCount: 0,
      description,
      geo: { lat: 21.0333, lng: 105.7937 },
      nearbyUniversities: [{ name: 'ĐH Quốc Gia Hà Nội', distanceKm: 0.5 }],
    });

    navigate(`/toa-nha/${id}`);
  };

  return (
    <div className="flex bg-gray-50 min-h-[calc(100vh-4rem)]">
      <DashboardSidebar role="owner" />

      <main className="flex-1 p-4 sm:p-8 max-w-4xl space-y-6 overflow-y-auto">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Link to="/chu-tro" className="hover:text-[#006d37]">Bảng điều khiển</Link>
          <span>/</span>
          <span className="font-bold text-gray-900">Tạo hồ sơ tòa nhà mới</span>
        </div>

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
              <h2 className="text-lg font-bold text-gray-900">Bước 1: Khai Báo Thông Tin Cơ Bản</h2>
              <Input
                label="Tên tòa nhà / Khu nhà trọ"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ví dụ: Tòa Nhà Xanh Trọ Xinh"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Địa chỉ số nhà, tên đường"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ví dụ: 480/12 Điện Biên Phủ"
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
                <Button variant="primary" size="lg" onClick={handleSubmit}>
                  Gửi Hồ Sơ Kiểm Duyệt
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
