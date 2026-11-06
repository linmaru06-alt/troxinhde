import React, { useState } from 'react';
import {
  X,
  FileText,
  User,
  Building2,
  Calendar,
  DollarSign,
  ShieldCheck,
  CreditCard,
  Phone,
  MapPin,
  Check,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { formatPrice } from '../../ui/Cards';
import { Room } from '../../../types';
import { CreateContractParams } from '../../../types/k23Tenants';

interface CreateContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  rooms: Room[];
  ownerId: string;
  onSuccess: (params: CreateContractParams) => Promise<any>;
}

export const CreateContractModal: React.FC<CreateContractModalProps> = ({
  isOpen,
  onClose,
  rooms,
  ownerId,
  onSuccess,
}) => {
  // Lọc chỉ lấy các phòng còn trống (P0-03: Chống đặt trùng phòng)
  const availableRooms = rooms.filter(
    (r) => r.status === 'Còn trống' || r.status === 'Chờ duyệt'
  );

  const [selectedRoomId, setSelectedRoomId] = useState<string>(
    availableRooms[0]?.id || ''
  );

  // Thông tin khách thuê
  const [tenantName, setTenantName] = useState<string>('');
  const [tenantPhone, setTenantPhone] = useState<string>('');
  const [tenantEmail, setTenantEmail] = useState<string>('');
  const [tenantIdCard, setTenantIdCard] = useState<string>('');
  const [tenantIdCardDate, setTenantIdCardDate] = useState<string>('');
  const [tenantIdCardPlace, setTenantIdCardPlace] = useState<string>('Cục CS QLHC về TTXH');
  const [tenantHometown, setTenantHometown] = useState<string>('');
  const [tenantVehiclePlate, setTenantVehiclePlate] = useState<string>('');

  // Thông tin hợp đồng
  const todayStr = new Date().toISOString().split('T')[0];
  const oneYearLater = new Date();
  oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
  const oneYearLaterStr = oneYearLater.toISOString().split('T')[0];

  const [startDate, setStartDate] = useState<string>(todayStr);
  const [endDate, setEndDate] = useState<string>(oneYearLaterStr);

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);
  const defaultRent = selectedRoom?.price || 3500000;
  const [rentAmount, setRentAmount] = useState<number>(defaultRent);
  const [depositAmount, setDepositAmount] = useState<number>(defaultRent);
  const [paymentCycleMonths, setPaymentCycleMonths] = useState<number>(1);
  const [paymentDueDay, setPaymentDueDay] = useState<number>(5);
  const [notes, setNotes] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Khi đổi phòng, tự cập nhật lại tiền thuê & cọc
  const handleRoomChange = (roomId: string) => {
    setSelectedRoomId(roomId);
    const room = rooms.find((r) => r.id === roomId);
    if (room) {
      setRentAmount(room.price);
      setDepositAmount(room.price);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomId) {
      setErrorMsg('Vui lòng chọn phòng cần cho thuê.');
      return;
    }
    if (!tenantName.trim()) {
      setErrorMsg('Vui lòng nhập họ tên khách thuê.');
      return;
    }
    if (!tenantPhone.trim() || tenantPhone.trim().length < 9) {
      setErrorMsg('Vui lòng nhập số điện thoại hợp lệ của khách.');
      return;
    }
    if (new Date(endDate) <= new Date(startDate)) {
      setErrorMsg('Ngày kết thúc hợp đồng phải sau ngày bắt đầu.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const params: CreateContractParams = {
        owner_id: ownerId,
        room_id: selectedRoomId,
        start_date: startDate,
        end_date: endDate,
        rent_amount: rentAmount,
        deposit_amount: depositAmount,
        payment_cycle_months: paymentCycleMonths,
        payment_due_day: paymentDueDay,
        notes: notes.trim() || undefined,
        tenant_name: tenantName.trim(),
        tenant_phone: tenantPhone.trim(),
        tenant_email: tenantEmail.trim() || undefined,
        tenant_id_card: tenantIdCard.trim() || undefined,
        tenant_id_card_date: tenantIdCardDate || undefined,
        tenant_id_card_place: tenantIdCardPlace.trim() || undefined,
        tenant_hometown: tenantHometown.trim() || undefined,
        tenant_vehicle_plate: tenantVehiclePlate.trim() || undefined,
      };

      const res = await onSuccess(params);
      if (res && res.success === false) {
        setErrorMsg(res.error || 'Lỗi khi tạo hợp đồng');
      } else {
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi hệ thống');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/20">
              <FileText className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight">Tạo Hợp Đồng Thuê Phòng Mới</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950 uppercase tracking-wider">
                  K23 P0-02
                </span>
              </div>
              <p className="text-xs text-emerald-100 mt-0.5">
                Thiết lập hợp đồng thuê, giữ tiền cọc và lưu trữ hồ sơ CCCD khách thuê
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 text-rose-700 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Chọn phòng thuê (Chống đặt trùng phòng P0-03) */}
          <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-emerald-700" />
                1. Chọn phòng cho thuê (Chỉ hiển thị phòng trống)
              </h4>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                P0-03 Strict Occupancy
              </span>
            </div>

            {availableRooms.length === 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                Hiện tại tất cả các phòng đều đã có người thuê! Bạn cần thanh lý hợp đồng cũ hoặc tạo phòng mới trước.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Chọn phòng *</label>
                  <select
                    value={selectedRoomId}
                    onChange={(e) => handleRoomChange(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                    required
                  >
                    {availableRooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.roomNumber} - {r.title} ({formatPrice(r.price)}/tháng)
                      </option>
                    ))}
                  </select>
                </div>

                {selectedRoom && (
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900">{selectedRoom.title}</div>
                      <div className="text-[11px] text-slate-400">
                        {selectedRoom.area} m² • {selectedRoom.type} • Tầng {selectedRoom.floor || 1}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-black text-emerald-700">{formatPrice(selectedRoom.price)}</div>
                      <div className="text-[10px] text-slate-400">Giá gốc niêm yết</div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. Thông tin khách thuê & CCCD (P0-02 & P0-04) */}
          <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200 space-y-3.5">
            <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
              <User className="w-4 h-4 text-emerald-700" />
              2. Hồ sơ khách thuê &amp; Giấy tờ định danh
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Họ và tên khách *</label>
                <input
                  type="text"
                  placeholder="VD: Nguyễn Văn An"
                  value={tenantName}
                  onChange={(e) => setTenantName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Số điện thoại Zalo *</label>
                <input
                  type="tel"
                  placeholder="VD: 0988 123 456"
                  value={tenantPhone}
                  onChange={(e) => setTenantPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-600 focus:outline-none font-mono"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Số Căn Cước Công Dân (CCCD)</label>
                <input
                  type="text"
                  placeholder="VD: 001201012345"
                  value={tenantIdCard}
                  onChange={(e) => setTenantIdCard(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-600 focus:outline-none font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Quê quán / Thường trú</label>
                <input
                  type="text"
                  placeholder="VD: Thái Bình, Nam Định..."
                  value={tenantHometown}
                  onChange={(e) => setTenantHometown(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Biển số xe máy (nếu có)</label>
                <input
                  type="text"
                  placeholder="VD: 29B1-123.45"
                  value={tenantVehiclePlate}
                  onChange={(e) => setTenantVehiclePlate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono uppercase focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email liên hệ (nếu có)</label>
                <input
                  type="email"
                  placeholder="an.nguyen@gmail.com"
                  value={tenantEmail}
                  onChange={(e) => setTenantEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* 3. Điều khoản Hợp đồng & Tiền cọc */}
          <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200 space-y-3.5">
            <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-emerald-700" />
              3. Thời hạn hợp đồng &amp; Tiền cọc giữ chỗ
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ngày bắt đầu ở *</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ngày kết thúc hợp đồng *</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Giá thuê thỏa thuận (VNĐ/tháng) *</label>
                <input
                  type="number"
                  step={50000}
                  value={rentAmount}
                  onChange={(e) => setRentAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-black text-emerald-800 focus:ring-2 focus:ring-emerald-600 focus:outline-none font-mono"
                  required
                />
                <span className="text-[10px] text-slate-400 block mt-0.5">{formatPrice(rentAmount)}</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tiền cọc giữ chỗ (VNĐ) *</label>
                <input
                  type="number"
                  step={50000}
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-black text-amber-800 focus:ring-2 focus:ring-emerald-600 focus:outline-none font-mono"
                  required
                />
                <span className="text-[10px] text-slate-400 block mt-0.5">{formatPrice(depositAmount)}</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Hạn đóng tiền hàng tháng</label>
                <select
                  value={paymentDueDay}
                  onChange={(e) => setPaymentDueDay(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                >
                  <option value={1}>Ngày mùng 1 hàng tháng</option>
                  <option value={5}>Ngày mùng 5 hàng tháng (Phổ biến)</option>
                  <option value={10}>Ngày mùng 10 hàng tháng</option>
                  <option value={15}>Ngày rằm 15 hàng tháng</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Ghi chú thêm về hợp đồng</label>
              <textarea
                placeholder="VD: Khách đóng cọc trước 1 tháng, cam kết ở tối thiểu 6 tháng, bàn giao 2 chìa khóa cổng..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 -mx-6 -mb-6 mt-6">
            <span className="text-xs text-slate-500">
              * Sau khi tạo, phòng sẽ tự động chuyển sang trạng thái <strong>&quot;Đã cho thuê&quot;</strong>.
            </span>

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              <Button variant="outline" size="sm" type="button" onClick={onClose} disabled={isLoading}>
                Hủy
              </Button>

              <Button
                variant="primary"
                size="sm"
                type="submit"
                isLoading={isLoading}
                leftIcon={<Sparkles className="w-4 h-4" />}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                Xác Nhận &amp; Ký Hợp Đồng
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
