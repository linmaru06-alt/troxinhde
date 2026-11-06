import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Search,
  Plus,
  Bike,
  Car,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Building2,
  Sparkles,
  Phone,
  Filter,
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { formatPrice } from '../../ui/Cards';
import {
  K23ParkingPermit,
  VehicleType,
  VEHICLE_TYPE_META,
  CreateParkingPermitParams,
} from '../../../types/k23Parking';
import {
  getParkingPermits,
  createParkingPermit,
  toggleParkingPermitStatus,
  deleteParkingPermit,
} from '../../../lib/api/k23Parking';

interface ParkingManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  buildingId?: string;
  buildingName?: string;
}

export const ParkingManagementModal: React.FC<ParkingManagementModalProps> = ({
  isOpen,
  onClose,
  buildingId = 'bld_1',
  buildingName = 'Tòa Nhà Xanh Trọ Xinh',
}) => {
  const [permits, setPermits] = useState<K23ParkingPermit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'all' | VehicleType>('all');
  const [isAdding, setIsAdding] = useState(false);

  // Form states
  const [roomNumber, setRoomNumber] = useState('P.302');
  const [tenantName, setTenantName] = useState('');
  const [tenantPhone, setTenantPhone] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>('motorbike');
  const [licensePlate, setLicensePlate] = useState('');
  const [vehicleBrand, setVehicleBrand] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [monthlyFee, setMonthlyFee] = useState<number>(100000);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadPermits();
    }
  }, [isOpen, buildingId]);

  const loadPermits = async () => {
    setIsLoading(true);
    try {
      const data = await getParkingPermits(buildingId);
      setPermits(data);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPermits = useMemo(() => {
    return permits.filter((p) => {
      const query = searchQuery.toLowerCase().trim();
      const matchQuery =
        !query ||
        p.license_plate.toLowerCase().includes(query) ||
        p.tenant_name.toLowerCase().includes(query) ||
        p.room_number.toLowerCase().includes(query) ||
        p.tenant_phone.includes(query);

      const matchType = selectedTypeFilter === 'all' || p.vehicle_type === selectedTypeFilter;
      return matchQuery && matchType;
    });
  }, [permits, searchQuery, selectedTypeFilter]);

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licensePlate.trim() || !tenantName.trim()) return;

    setIsSubmitting(true);
    try {
      const params: CreateParkingPermitParams = {
        building_id: buildingId,
        room_id: 'room_' + roomNumber,
        room_number: roomNumber,
        tenant_name: tenantName.trim(),
        tenant_phone: tenantPhone.trim(),
        vehicle_type: vehicleType,
        license_plate: licensePlate.trim(),
        vehicle_brand: vehicleBrand.trim() || undefined,
        vehicle_color: vehicleColor.trim() || undefined,
        monthly_fee: monthlyFee,
      };

      const created = await createParkingPermit(params);
      setPermits((prev) => [created, ...prev]);
      setIsAdding(false);
      setLicensePlate('');
      setTenantName('');
      setTenantPhone('');
      setVehicleBrand('');
      setVehicleColor('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggle = async (id: string, current: boolean) => {
    await toggleParkingPermitStatus(id, !current);
    setPermits((prev) => prev.map((p) => (p.id === id ? { ...p, is_active: !current } : p)));
  };

  const handleDelete = async (id: string) => {
    if (confirm('Bạn có chắc muốn xóa vé xe này khỏi danh sách quản lý?')) {
      await deleteParkingPermit(id);
      setPermits((prev) => prev.filter((p) => p.id !== id));
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-300">
              <Bike className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-sky-500/30 text-sky-200 px-2.5 py-0.5 rounded-full border border-sky-400/30">
                  K23 PMS • P2-03 (Pro)
                </span>
                <span className="text-xs text-sky-200 font-bold">Kiểm Soát Phương Tiện</span>
              </div>
              <h2 className="text-lg font-black text-white mt-1">
                Quản Lý Vé Xe Tháng & Đối Soát Biển Số
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nội dung */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Thanh tìm kiếm nhanh biển số cho bảo vệ */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tra cứu nhanh biển số (VD: 17B2-688.99), tên khách hoặc số phòng..."
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-xs font-medium"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={selectedTypeFilter}
                onChange={(e) => setSelectedTypeFilter(e.target.value as any)}
                className="py-2.5 px-3 rounded-2xl border border-slate-200 text-xs font-bold text-slate-700 bg-white"
              >
                <option value="all">Tất cả loại xe</option>
                <option value="motorbike">Xe Máy</option>
                <option value="bicycle">Xe Đạp</option>
                <option value="car">Ô Tô</option>
              </select>

              {!isAdding && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsAdding(true)}
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  Đăng Ký Vé Xe
                </Button>
              )}
            </div>
          </div>

          {/* Form Đăng ký xe mới */}
          {isAdding && (
            <form onSubmit={handleCreate} className="p-5 rounded-2xl bg-sky-50/50 border border-sky-200 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-sky-100">
                <span className="text-xs font-black text-slate-900 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-sky-600" /> Đăng ký vé xe gửi tháng mới
                </span>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="text-xs text-slate-400 hover:text-slate-600 font-bold"
                >
                  Hủy
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Số phòng *</label>
                  <input
                    type="text"
                    required
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    placeholder="VD: P.302"
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Họ tên khách thuê *</label>
                  <input
                    type="text"
                    required
                    value={tenantName}
                    onChange={(e) => setTenantName(e.target.value)}
                    placeholder="VD: Nguyễn Văn An"
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Số điện thoại</label>
                  <input
                    type="tel"
                    value={tenantPhone}
                    onChange={(e) => setTenantPhone(e.target.value)}
                    placeholder="0988 123 456"
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Loại phương tiện *</label>
                  <select
                    value={vehicleType}
                    onChange={(e) => {
                      const vt = e.target.value as VehicleType;
                      setVehicleType(vt);
                      setMonthlyFee(VEHICLE_TYPE_META[vt].defaultFee);
                    }}
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-medium"
                  >
                    <option value="motorbike">Xe Máy (100.000đ/tháng)</option>
                    <option value="bicycle">Xe Đạp (50.000đ/tháng)</option>
                    <option value="car">Ô Tô (800.000đ/tháng)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Biển số xe *</label>
                  <input
                    type="text"
                    required
                    value={licensePlate}
                    onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                    placeholder="VD: 29B1-123.45"
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white font-mono uppercase font-black"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Dòng xe & Màu sơn</label>
                  <input
                    type="text"
                    value={vehicleBrand}
                    onChange={(e) => setVehicleBrand(e.target.value)}
                    placeholder="VD: Honda Vision - Trắng"
                    className="w-full p-2.5 rounded-xl border border-slate-300 bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsAdding(false)}>
                  Hủy
                </Button>
                <Button variant="primary" size="sm" type="submit" isLoading={isSubmitting}>
                  Xác Nhận Cấp Vé Xe
                </Button>
              </div>
            </form>
          )}

          {/* Danh sách xe */}
          {isLoading ? (
            <div className="text-center py-8 text-xs text-slate-500">Đang tải danh sách xe...</div>
          ) : filteredPermits.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              Không tìm thấy phương tiện nào phù hợp với từ khóa "{searchQuery}".
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
              {filteredPermits.map((p) => {
                const meta = VEHICLE_TYPE_META[p.vehicle_type];
                return (
                  <div key={p.id} className="p-4 hover:bg-slate-50/80 transition flex items-center justify-between gap-4 text-xs">
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold shrink-0">
                        {p.vehicle_type === 'car' ? <Car className="w-5 h-5 text-purple-600" /> : <Bike className="w-5 h-5 text-sky-600" />}
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-sm px-2 py-0.5 rounded-md bg-slate-900 text-white tracking-wide">
                            {p.license_plate}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.badgeColor}`}>
                            {meta.label}
                          </span>
                          <span className="font-bold text-slate-900 px-2 py-0.5 rounded-md bg-slate-100">
                            {p.room_number}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-slate-500 text-[11px] pt-0.5">
                          <span>Chủ xe: <strong>{p.tenant_name}</strong></span>
                          <span>•</span>
                          <span>{p.vehicle_brand || 'Xe cá nhân'} {p.vehicle_color && `(${p.vehicle_color})`}</span>
                          {p.tenant_phone && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {p.tenant_phone}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="font-black text-slate-900 block">{formatPrice(p.monthly_fee)}</span>
                        <span className="text-[10px] text-slate-400">/ tháng</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleToggle(p.id, p.is_active)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                            p.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {p.is_active ? 'Đang gửi' : 'Tạm khóa'}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(p.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                          title="Xóa vé xe"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            Tổng cộng: <strong>{permits.length}</strong> phương tiện đang đăng ký gửi xe.
          </span>
          <Button variant="outline" size="sm" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </div>
    </div>
  );
};

