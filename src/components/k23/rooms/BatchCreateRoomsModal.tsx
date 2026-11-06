import React, { useState, useMemo } from 'react';
import {
  X,
  Layers,
  Sparkles,
  Building2,
  Check,
  AlertCircle,
  Eye,
  Zap,
  Droplets,
  DollarSign,
  Maximize2,
  CheckCircle2,
  Plus,
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { formatPrice } from '../../ui/Cards';
import {
  BatchCreateRoomsParams,
  generateRoomsPreview,
  createBatchRooms,
} from '../../../lib/api/k23Rooms';
import { Room } from '../../../types';

interface BatchCreateRoomsModalProps {
  isOpen: boolean;
  onClose: () => void;
  building: {
    id: string;
    name: string;
    address: string;
    district: string;
    city?: string;
    totalRooms?: number;
    availableRooms?: number;
    images?: string[];
  };
  owner: {
    id: string;
    name: string;
    phone: string;
    avatar?: string;
  };
  onSuccess: (newRooms: Room[]) => void;
}

const COMMON_AMENITIES = [
  'Điều hòa',
  'Bình nóng lạnh',
  'Giường đệm',
  'Tủ quần áo',
  'Internet Wifi',
  'Chỗ để xe tầng 1',
  'Ban công thoáng mát',
  'Máy giặt chung',
  'Tủ lạnh',
  'Bếp nấu ăn',
  'Khóa vân tay',
  'Camera an ninh 24/7',
];

export const BatchCreateRoomsModal: React.FC<BatchCreateRoomsModalProps> = ({
  isOpen,
  onClose,
  building,
  owner,
  onSuccess,
}) => {
  // Form state
  const [startFloor, setStartFloor] = useState<number>(1);
  const [endFloor, setEndFloor] = useState<number>(4);
  const [roomsPerFloor, setRoomsPerFloor] = useState<number>(4);
  const [roomNumberFormat, setRoomNumberFormat] = useState<
    'P.{floor}0{room}' | '{floor}0{room}' | 'P.{floor}.{room}' | '{floor}.{room}'
  >('P.{floor}0{room}');
  const [roomType, setRoomType] = useState<'Phòng đơn' | 'Studio' | 'Phòng ghép' | 'Căn hộ mini'>('Studio');
  const [price, setPrice] = useState<number>(3800000);
  const [deposit, setDeposit] = useState<number>(3800000);
  const [area, setArea] = useState<number>(25);
  const [electricityPrice, setElectricityPrice] = useState<number>(3500);
  const [waterPrice, setWaterPrice] = useState<number>(25000);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([
    'Điều hòa',
    'Bình nóng lạnh',
    'Giường đệm',
    'Internet Wifi',
    'Chỗ để xe tầng 1',
    'Ban công thoáng mát',
  ]);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'config' | 'preview'>('config');

  // Preview danh sách phòng được sinh ra
  const previews = useMemo(() => {
    return generateRoomsPreview({
      startFloor,
      endFloor,
      roomsPerFloor,
      roomNumberFormat,
      roomType,
      price,
      deposit,
      area,
    });
  }, [startFloor, endFloor, roomsPerFloor, roomNumberFormat, roomType, price, deposit, area]);

  const totalFloors = Math.max(1, endFloor - startFloor + 1);
  const totalRoomsGenerated = previews.length;

  const toggleAmenity = (item: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(item) ? prev.filter((a) => a !== item) : [...prev, item]
    );
  };

  const handlePriceChange = (val: number) => {
    setPrice(val);
    // Tự động gán tiền cọc = 1 tháng tiền phòng nếu chưa sửa cọc riêng
    setDeposit(val);
  };

  const handleCreate = async () => {
    if (totalRoomsGenerated <= 0) {
      setErrorMsg('Vui lòng cấu hình ít nhất 1 phòng.');
      return;
    }
    if (totalRoomsGenerated > 100) {
      setErrorMsg('Mỗi lần khởi tạo tối đa 100 phòng để đảm bảo hiệu năng.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    const params: BatchCreateRoomsParams = {
      buildingId: building.id,
      buildingName: building.name,
      ownerId: owner.id,
      ownerName: owner.name,
      ownerPhone: owner.phone,
      ownerAvatar: owner.avatar,
      address: building.address,
      district: building.district,
      startFloor,
      endFloor,
      roomsPerFloor,
      roomNumberFormat,
      roomType,
      price,
      deposit,
      area,
      electricityPrice,
      waterPrice,
      amenities: selectedAmenities,
      defaultImage: building.images && building.images.length > 0 ? building.images[0] : undefined,
    };

    const res = await createBatchRooms(params);
    setIsLoading(false);

    if (res.success && res.createdRooms.length > 0) {
      onSuccess(res.createdRooms);
      onClose();
    } else {
      setErrorMsg(res.error || 'Có lỗi xảy ra khi tạo danh sách phòng. Vui lòng thử lại.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-6 bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/20">
              <Layers className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight">Khởi Tạo Phòng Hàng Loạt Theo Tầng</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950 uppercase tracking-wider">
                  K23 FAST
                </span>
              </div>
              <p className="text-xs text-emerald-100 flex items-center gap-1 mt-0.5">
                <Building2 className="w-3.5 h-3.5" />
                Cơ sở: <strong className="text-white">{building.name}</strong> ({building.district})
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Subnav */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-slate-50 border-b border-slate-200 text-xs shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('config')}
              className={`px-3 py-1.5 rounded-xl font-bold transition ${
                activeTab === 'config'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-emerald-700'
              }`}
            >
              1. Cấu hình tầng & phòng
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
                activeTab === 'preview'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-emerald-700'
              }`}
            >
              <span>2. Xem trước danh sách</span>
              <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black">
                {totalRoomsGenerated}
              </span>
            </button>
          </div>

          <div className="text-right hidden sm:block text-slate-500">
            Dự kiến sinh: <strong className="text-emerald-700">{totalFloors} tầng</strong> ×{' '}
            <strong className="text-emerald-700">{roomsPerFloor} phòng</strong> ={' '}
            <strong className="text-emerald-800 text-sm font-black">{totalRoomsGenerated} phòng</strong>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 text-rose-700 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {activeTab === 'config' ? (
            <div className="space-y-6">
              {/* 1. Cấu trúc tầng & phòng */}
              <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 space-y-4">
                <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-emerald-700" />
                  Quy mô tầng & số lượng phòng
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Tầng bắt đầu</label>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={startFloor}
                      onChange={(e) => setStartFloor(Math.max(1, Number(e.target.value)))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-400 block mt-0.5">VD: Tầng 1 (hoặc Tầng 2)</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Tầng kết thúc</label>
                    <input
                      type="number"
                      min={startFloor}
                      max={30}
                      value={endFloor}
                      onChange={(e) => setEndFloor(Math.max(startFloor, Number(e.target.value)))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-400 block mt-0.5">VD: Tầng 4 hoặc 5</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Số phòng mỗi tầng</label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={roomsPerFloor}
                      onChange={(e) => setRoomsPerFloor(Math.max(1, Math.min(20, Number(e.target.value))))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-400 block mt-0.5">VD: 4 hoặc 5 phòng/tầng</span>
                  </div>
                </div>

                {/* Định dạng tên phòng */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Mẫu quy ước số phòng</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { key: 'P.{floor}0{room}', label: 'P.101, P.102...', desc: 'Phổ biến nhất' },
                      { key: '{floor}0{room}', label: '101, 102, 201...', desc: 'Chỉ số' },
                      { key: 'P.{floor}.{room}', label: 'P.1.1, P.1.2...', desc: 'Dạng dấu chấm' },
                      { key: '{floor}.{room}', label: '1.1, 1.2, 2.1...', desc: 'Ngắn gọn' },
                    ].map((fmt) => (
                      <button
                        key={fmt.key}
                        type="button"
                        onClick={() => setRoomNumberFormat(fmt.key as any)}
                        className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                          roomNumberFormat === fmt.key
                            ? 'border-emerald-600 bg-emerald-50/70 text-emerald-900 font-black'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div className="text-xs font-bold">{fmt.label}</div>
                        <div className="text-[10px] text-slate-400">{fmt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 2. Giá thuê, cọc và diện tích */}
              <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 space-y-4">
                <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-700" />
                  Mức giá thuê & Thông số phòng mặc định
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Loại phòng</label>
                    <select
                      value={roomType}
                      onChange={(e) => setRoomType(e.target.value as any)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    >
                      <option value="Studio">Studio (Khép kín)</option>
                      <option value="Phòng đơn">Phòng đơn</option>
                      <option value="Căn hộ mini">Căn hộ mini</option>
                      <option value="Phòng ghép">Phòng ghép</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Giá thuê (VNĐ/tháng)</label>
                    <input
                      type="number"
                      step={50000}
                      value={price}
                      onChange={(e) => handlePriceChange(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-emerald-800 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-400 block mt-0.5">{formatPrice(price)}</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Tiền cọc giữ chỗ (VNĐ)</label>
                    <input
                      type="number"
                      step={50000}
                      value={deposit}
                      onChange={(e) => setDeposit(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-400 block mt-0.5">{formatPrice(deposit)}</span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Diện tích (m²)</label>
                    <input
                      type="number"
                      min={10}
                      max={120}
                      value={area}
                      onChange={(e) => setArea(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-400 block mt-0.5">{area} mét vuông</span>
                  </div>
                </div>

                {/* Đơn giá điện nước */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-slate-200/60">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-slate-700">Giá điện (VNĐ/kWh)</label>
                      <input
                        type="number"
                        value={electricityPrice}
                        onChange={(e) => setElectricityPrice(Number(e.target.value))}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-600 focus:outline-none mt-1"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                      <Droplets className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-slate-700">Giá nước (VNĐ/m³)</label>
                      <input
                        type="number"
                        value={waterPrice}
                        onChange={(e) => setWaterPrice(Number(e.target.value))}
                        className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-600 focus:outline-none mt-1"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Tiện ích mặc định */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">Tiện ích gán sẵn cho các phòng:</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {COMMON_AMENITIES.map((am) => {
                    const isChecked = selectedAmenities.includes(am);
                    return (
                      <button
                        key={am}
                        type="button"
                        onClick={() => toggleAmenity(am)}
                        className={`px-3 py-2 rounded-xl text-xs font-medium border text-left flex items-center justify-between transition cursor-pointer ${
                          isChecked
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-bold'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span className="truncate">{am}</span>
                        {isChecked && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* Tab Preview Danh sách phòng */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">
                  Xem trước <strong>{previews.length} phòng</strong> sẽ được tạo vào tòa{' '}
                  <strong className="text-slate-900">{building.name}</strong>:
                </span>
                <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg">
                  Tất cả mặc định ở trạng thái: &quot;Còn trống&quot;
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-[380px] overflow-y-auto p-1">
                {previews.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-emerald-500 transition"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-black text-slate-900">{item.roomNumber}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                        Tầng {item.floor}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">{item.title}</div>
                    <div className="text-xs font-black text-emerald-700 mt-1">{formatPrice(item.price)}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      {item.area} m² • Cọc {formatPrice(item.deposit)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500">
            * Sau khi tạo, bạn có thể chỉnh sửa lại giá hoặc thông tin riêng của từng phòng bất kỳ lúc nào.
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <Button variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
              Hủy
            </Button>

            {activeTab === 'config' ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab('preview')}
                leftIcon={<Eye className="w-4 h-4" />}
              >
                Xem trước ({totalRoomsGenerated} phòng)
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab('config')}
              >
                ← Sửa lại cấu hình
              </Button>
            )}

            <Button
              variant="primary"
              size="sm"
              onClick={handleCreate}
              isLoading={isLoading}
              leftIcon={<Sparkles className="w-4 h-4" />}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              Khởi Tạo {totalRoomsGenerated} Phòng Ngay
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
