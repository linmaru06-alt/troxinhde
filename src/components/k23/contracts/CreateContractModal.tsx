import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Building2,
  CreditCard,
  Phone,
  MapPin,
  Check,
  AlertCircle,
  Sparkles,
  Bike,
  Camera,
  Upload,
  QrCode,
  Copy,
  ExternalLink,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { formatPrice } from '../../ui/Cards';
import { Room } from '../../../types';
import { CreateContractParams } from '../../../types/k23Tenants';
import { uploadToStorage } from '../../../lib/storage';

interface CreateContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  rooms: Room[];
  preselectedRoomId?: string;
  ownerId: string;
  onSuccess: (params: CreateContractParams) => Promise<any>;
}

export const CreateContractModal: React.FC<CreateContractModalProps> = ({
  isOpen,
  onClose,
  rooms,
  preselectedRoomId,
  ownerId,
  onSuccess,
}) => {
  // Lọc danh sách phòng hợp lệ
  const availableRooms = rooms.length > 0 ? rooms : [];

  const [selectedRoomId, setSelectedRoomId] = useState<string>(
    preselectedRoomId || availableRooms[0]?.id || ''
  );

  // Cập nhật selectedRoomId khi preselectedRoomId thay đổi
  useEffect(() => {
    if (preselectedRoomId) {
      setSelectedRoomId(preselectedRoomId);
    } else if (availableRooms.length > 0 && !selectedRoomId) {
      setSelectedRoomId(availableRooms[0].id);
    }
  }, [preselectedRoomId, availableRooms]);

  // Thông tin cơ bản của thành viên
  const [tenantName, setTenantName] = useState<string>('');
  const [tenantPhone, setTenantPhone] = useState<string>('');
  const [tenantEmail, setTenantEmail] = useState<string>('');
  const [tenantHometown, setTenantHometown] = useState<string>('');
  const [isRepresentative, setIsRepresentative] = useState<boolean>(true);

  // Thông tin phương tiện & biển số xe (Không bắt buộc)
  const [hasVehicle, setHasVehicle] = useState<boolean>(false);
  const [vehiclePlate, setVehiclePlate] = useState<string>('');
  const [vehicleModel, setVehicleModel] = useState<string>('');

  // Hệ thống eKYC & CCCD
  const [ekycMode, setEkycMode] = useState<'upload' | 'remote_link'>('upload');
  const [tenantIdCard, setTenantIdCard] = useState<string>('');
  const [idCardFrontUrl, setIdCardFrontUrl] = useState<string>('');
  const [idCardBackUrl, setIdCardBackUrl] = useState<string>('');
  const [isUploadingFront, setIsUploadingFront] = useState<boolean>(false);
  const [isUploadingBack, setIsUploadingBack] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);

  // Reset form khi đóng mở
  useEffect(() => {
    if (!isOpen) {
      setErrorMsg(null);
      setCopiedLink(false);
    }
  }, [isOpen]);

  // Xử lý upload ảnh CCCD
  const handleUploadCccd = async (file: File, side: 'front' | 'back') => {
    try {
      if (side === 'front') setIsUploadingFront(true);
      else setIsUploadingBack(true);

      const url = await uploadToStorage(file, 'documents', {
        folder: `tenants/cccd_${ownerId}`,
        maxSizeMB: 8,
      });

      if (side === 'front') setIdCardFrontUrl(url);
      else setIdCardBackUrl(url);
    } catch (err: any) {
      setErrorMsg(`Lỗi tải ảnh CCCD: ${err.message || 'Không thể tải ảnh lên'}`);
    } finally {
      if (side === 'front') setIsUploadingFront(false);
      else setIsUploadingBack(false);
    }
  };

  // Link eKYC từ xa qua Zalo
  const ekycRemoteLink = `https://troxinh.vn/xac-thuc-cccd?room=${encodeURIComponent(selectedRoom?.roomNumber || selectedRoomId)}&phone=${encodeURIComponent(tenantPhone || '')}&name=${encodeURIComponent(tenantName || '')}`;

  const handleCopyEkycInvite = () => {
    const inviteText = `Chào bạn ${tenantName || 'khách thuê'}, để kích hoạt hồ sơ nhận phòng ${selectedRoom?.roomNumber || ''} và làm thủ tục khai báo tạm trú, bạn bấm vào link này để chụp ảnh CCCD xác thực nhé: ${ekycRemoteLink}`;
    navigator.clipboard.writeText(inviteText);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomId) {
      setErrorMsg('Vui lòng chọn phòng cư trú.');
      return;
    }
    if (!tenantName.trim()) {
      setErrorMsg('Vui lòng nhập họ tên thành viên.');
      return;
    }
    if (!tenantPhone.trim() || tenantPhone.trim().length < 9) {
      setErrorMsg('Vui lòng nhập số điện thoại Zalo hợp lệ của thành viên.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    // Thời hạn và tiền cọc lấy mặc định theo thông tin phòng cố định
    const todayStr = new Date().toISOString().split('T')[0];
    const oneYearLater = new Date();
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
    const oneYearLaterStr = oneYearLater.toISOString().split('T')[0];

    const rentPrice = selectedRoom?.price || 3500000;
    const depositPrice = selectedRoom?.deposit || selectedRoom?.price || 3500000;

    const fullVehicleInfo = hasVehicle && vehiclePlate.trim()
      ? `${vehiclePlate.trim().toUpperCase()}${vehicleModel.trim() ? ` (${vehicleModel.trim()})` : ''}`
      : undefined;

    try {
      const params: CreateContractParams = {
        owner_id: ownerId,
        room_id: selectedRoomId,
        start_date: todayStr,
        end_date: oneYearLaterStr,
        rent_amount: rentPrice,
        deposit_amount: depositPrice,
        payment_cycle_months: 1,
        payment_due_day: 5,
        tenant_name: tenantName.trim(),
        tenant_phone: tenantPhone.trim(),
        tenant_email: tenantEmail.trim() || undefined,
        tenant_id_card: tenantIdCard.trim() || undefined,
        tenant_hometown: tenantHometown.trim() || undefined,
        tenant_vehicle_plate: fullVehicleInfo,
        tenant_id_front_url: idCardFrontUrl || undefined,
        tenant_id_back_url: idCardBackUrl || undefined,
        is_roommate_member: !isRepresentative, // Nếu là bạn ở cùng thì không chặn trùng phòng
      };

      const res = await onSuccess(params);
      if (res && res.success === false) {
        setErrorMsg(res.error || 'Lỗi khi lưu hồ sơ thành viên');
      } else {
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi hệ thống khi lưu thành viên');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/20">
              <User className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight">Thêm Thành Viên &amp; Kích Hoạt eKYC</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-400 text-slate-950 uppercase tracking-wider">
                  K23 PMS
                </span>
              </div>
              <p className="text-xs text-emerald-100 mt-0.5">
                Điền thông tin cơ bản, biển số xe và kích hoạt hồ sơ CCCD điện tử
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 text-slate-800">
          {errorMsg && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 text-rose-700 text-xs font-semibold animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 🌟 THÔNG TIN PHÒNG CỐ ĐỊNH (Tự động nhận diện, không bắt chọn lại rườm rà) */}
          <div className="bg-emerald-50/70 border border-emerald-200/80 p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0 shadow-2xs">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                  Phòng đang quản lý
                </span>
                {preselectedRoomId ? (
                  <h4 className="text-sm font-extrabold text-slate-900 truncate">
                    {selectedRoom?.roomNumber ? `Phòng ${selectedRoom.roomNumber} • ` : ''}{selectedRoom?.title || 'Phòng trọ'}
                  </h4>
                ) : (
                  <select
                    value={selectedRoomId}
                    onChange={(e) => setSelectedRoomId(e.target.value)}
                    className="mt-0.5 px-2 py-1 bg-white border border-emerald-300 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                  >
                    {availableRooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.roomNumber} - {r.title}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {selectedRoom && (
              <div className="flex items-center gap-3 sm:text-right shrink-0 bg-white/70 px-3 py-1.5 rounded-xl border border-emerald-100">
                <div>
                  <span className="text-[10px] text-slate-400 block">Giá thuê cố định:</span>
                  <span className="text-xs font-black text-emerald-700 font-mono">
                    {formatPrice(selectedRoom.price)}/tháng
                  </span>
                </div>
                <div className="border-l border-emerald-200 pl-3">
                  <span className="text-[10px] text-slate-400 block">Tiền cọc giữ:</span>
                  <span className="text-xs font-black text-teal-800 font-mono">
                    {formatPrice(selectedRoom.deposit || selectedRoom.price)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* 🌟 PHẦN 1: THÔNG TIN CƠ BẢN CỦA THÀNH VIÊN */}
          <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200 space-y-3">
            <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <User className="w-4 h-4 text-emerald-700" />
                1. Thông Tin Thành Viên Cư Trú
              </span>
              <span className="text-[11px] font-normal text-slate-400">(*) Bắt buộc</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Họ và tên thành viên *</label>
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
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Quê quán / Hộ khẩu thường trú</label>
                <input
                  type="text"
                  placeholder="VD: Thái Bình, Nam Định, Hà Nam..."
                  value={tenantHometown}
                  onChange={(e) => setTenantHometown(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email liên hệ (Tùy chọn)</label>
                <input
                  type="email"
                  placeholder="an.nguyen@gmail.com"
                  value={tenantEmail}
                  onChange={(e) => setTenantEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Vai trò trong phòng */}
            <div className="pt-1 flex items-center gap-4">
              <span className="text-xs font-bold text-slate-600">Vai trò trong phòng:</span>
              <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-800">
                <input
                  type="radio"
                  name="role"
                  checked={isRepresentative}
                  onChange={() => setIsRepresentative(true)}
                  className="text-emerald-600 focus:ring-emerald-600"
                />
                Đại diện ký hợp đồng
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-slate-800">
                <input
                  type="radio"
                  name="role"
                  checked={!isRepresentative}
                  onChange={() => setIsRepresentative(false)}
                  className="text-emerald-600 focus:ring-emerald-600"
                />
                Thành viên ở cùng
              </label>
            </div>
          </div>

          {/* 🌟 PHẦN 2: ĐĂNG KÝ PHƯƠNG TIỆN & BIỂN SỐ XE (Tùy chọn, không có xe thì không cần điền) */}
          <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                <Bike className="w-4 h-4 text-emerald-700" />
                2. Phương Tiện &amp; Biển Số Xe Máy
              </h4>
              <label className="inline-flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasVehicle}
                  onChange={(e) => setHasVehicle(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-600 w-4 h-4"
                />
                <span className="text-xs font-bold text-slate-700">Khách có mang theo xe</span>
              </label>
            </div>

            {hasVehicle ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 animate-in fade-in">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Biển số xe <span className="text-slate-400 font-normal">(VD: 29B1-123.45)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="29B1-123.45"
                    value={vehiclePlate}
                    onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold uppercase focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Dòng xe &amp; Màu sơn <span className="text-slate-400 font-normal">(Tùy chọn)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Wave Alpha đen, Vision trắng..."
                    value={vehicleModel}
                    onChange={(e) => setVehicleModel(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">
                * Khách không mang xe máy/xe điện thì không cần điền mục này.
              </p>
            )}
          </div>

          {/* 🌟 PHẦN 3: HỆ THỐNG KÍCH HOẠT eKYC & CCCD */}
          <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200 space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
              <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-emerald-700" />
                3. Giấy Tờ Định Danh &amp; Kích Hoạt eKYC
              </h4>

              {/* Chuyển đổi cách thức eKYC */}
              <div className="inline-flex rounded-xl p-0.5 bg-slate-200 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setEkycMode('upload')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    ekycMode === 'upload' ? 'bg-white text-emerald-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Tải ảnh trực tiếp
                </button>
                <button
                  type="button"
                  onClick={() => setEkycMode('remote_link')}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    ekycMode === 'remote_link' ? 'bg-white text-teal-800 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ⚡ Gửi link eKYC Zalo
                </button>
              </div>
            </div>

            {/* Chế độ 1: Tải ảnh trực tiếp (Chủ trọ chụp hộ) */}
            {ekycMode === 'upload' && (
              <div className="space-y-3 animate-in fade-in">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Số Căn Cước Công Dân (CCCD 12 số)
                  </label>
                  <input
                    type="text"
                    maxLength={12}
                    placeholder="VD: 001201012345 (Nếu có)"
                    value={tenantIdCard}
                    onChange={(e) => setTenantIdCard(e.target.value.replace(/\D/g, ''))}
                    className="w-full sm:w-64 px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Mặt trước CCCD */}
                  <div>
                    <span className="text-xs font-bold text-slate-700 block mb-1">Ảnh mặt trước CCCD</span>
                    <div className="relative h-32 rounded-2xl border-2 border-dashed border-slate-300 hover:border-emerald-600 transition flex flex-col items-center justify-center p-3 bg-white overflow-hidden group">
                      {idCardFrontUrl ? (
                        <>
                          <img src={idCardFrontUrl} alt="Mặt trước CCCD" className="w-full h-full object-cover rounded-xl" />
                          <button
                            type="button"
                            onClick={() => setIdCardFrontUrl('')}
                            className="absolute top-2 right-2 p-1.5 bg-rose-600 text-white rounded-full opacity-90 hover:opacity-100 shadow-sm"
                            title="Xóa ảnh"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <label className="cursor-pointer w-full h-full flex flex-col items-center justify-center text-center">
                          <Upload className="w-6 h-6 text-slate-400 group-hover:text-emerald-600 mb-1 transition" />
                          <span className="text-[11px] font-bold text-slate-700">
                            {isUploadingFront ? 'Đang tải lên...' : 'Tải / Chụp mặt trước'}
                          </span>
                          <span className="text-[9px] text-slate-400 mt-0.5">JPG, PNG (Tối đa 8MB)</span>
                          <input
                            type="file"
                            accept="image/*"
                            disabled={isUploadingFront}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleUploadCccd(f, 'front');
                            }}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  {/* Mặt sau CCCD */}
                  <div>
                    <span className="text-xs font-bold text-slate-700 block mb-1">Ảnh mặt sau CCCD</span>
                    <div className="relative h-32 rounded-2xl border-2 border-dashed border-slate-300 hover:border-emerald-600 transition flex flex-col items-center justify-center p-3 bg-white overflow-hidden group">
                      {idCardBackUrl ? (
                        <>
                          <img src={idCardBackUrl} alt="Mặt sau CCCD" className="w-full h-full object-cover rounded-xl" />
                          <button
                            type="button"
                            onClick={() => setIdCardBackUrl('')}
                            className="absolute top-2 right-2 p-1.5 bg-rose-600 text-white rounded-full opacity-90 hover:opacity-100 shadow-sm"
                            title="Xóa ảnh"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <label className="cursor-pointer w-full h-full flex flex-col items-center justify-center text-center">
                          <Upload className="w-6 h-6 text-slate-400 group-hover:text-emerald-600 mb-1 transition" />
                          <span className="text-[11px] font-bold text-slate-700">
                            {isUploadingBack ? 'Đang tải lên...' : 'Tải / Chụp mặt sau'}
                          </span>
                          <span className="text-[9px] text-slate-400 mt-0.5">JPG, PNG (Tối đa 8MB)</span>
                          <input
                            type="file"
                            accept="image/*"
                            disabled={isUploadingBack}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleUploadCccd(f, 'back');
                            }}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Chế độ 2: Kích hoạt eKYC từ xa qua Zalo */}
            {ekycMode === 'remote_link' && (
              <div className="p-4 bg-teal-50 border border-teal-200 rounded-2xl space-y-3 animate-in fade-in">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 font-bold shadow-2xs">
                    <QrCode className="w-4 h-4" />
                  </div>
                  <div className="text-xs space-y-1">
                    <h5 className="font-extrabold text-teal-950">Kích hoạt eKYC tự động qua Zalo cho khách</h5>
                    <p className="text-teal-800/90 leading-relaxed text-[11px]">
                      Hệ thống tự động tạo link xác thực danh tính mã hóa riêng cho khách. Khách mở link trên điện thoại cá nhân để chụp mặt trước, mặt sau CCCD và đối chiếu khuôn mặt.
                    </p>
                  </div>
                </div>

                <div className="p-2.5 bg-white border border-teal-200 rounded-xl flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono text-slate-500 truncate select-all">
                    {ekycRemoteLink}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyEkycInvite}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shrink-0 transition-colors cursor-pointer"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedLink ? 'Đã chép!' : 'Chép lời nhắn Zalo'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 -mx-6 -mb-6 mt-4">
            <span className="text-xs text-slate-500">
              * Hồ sơ thành viên và CCCD sẽ được lưu an toàn trong <strong>Tủ Hồ Sơ Phòng</strong>.
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
                Lưu Thành Viên &amp; Kích Hoạt
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
