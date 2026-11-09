import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import {
  useServiceCatalog,
  useBuildingServices,
  useSaveBuildingServices,
} from '../../../hooks/queries/useK23';
import { POPULAR_BANKS } from '../../../lib/vietqr';
import {
  Settings,
  Building2,
  Save,
  CheckCircle,
  CreditCard,
  Zap,
  Droplets,
  Wifi,
  Trash2,
  Bike,
  Shield,
  ArrowUp,
  Sliders,
  Sparkles,
  Layers,
  Check,
  QrCode,
  AlertCircle,
} from 'lucide-react';
import { TieredTariffConfigModal } from './TieredTariffConfigModal';

interface BuildingServicesConfigProps {
  initialBuildingId?: string;
  hideBuildingSelector?: boolean;
  onSaved?: () => void;
  className?: string;
}

export const BuildingServicesConfig: React.FC<BuildingServicesConfigProps> = ({
  initialBuildingId,
  hideBuildingSelector = false,
  onSaved,
  className = '',
}) => {
  const { currentUser, buildings, showToast } = useAppStore();
  const isDemo =
    currentUser?.isDemoAccount ||
    currentUser?.id === '00000000-0000-0000-0000-000000000002' ||
    currentUser?.id === 'user_owner_1';

  const myBuildings = buildings.filter(
    (b) =>
      b.ownerId === currentUser?.id ||
      (isDemo && (b.ownerId === 'user_owner_1' || b.ownerId === '00000000-0000-0000-0000-000000000002')) ||
      (currentUser?.firebaseUid && b.ownerId === currentUser.firebaseUid)
  );

  const [selectedBuildingId, setSelectedBuildingId] = useState<string>(
    initialBuildingId || myBuildings[0]?.id || ''
  );

  // Sync selected building if initialBuildingId changes
  useEffect(() => {
    if (initialBuildingId) {
      setSelectedBuildingId(initialBuildingId);
    } else if (!selectedBuildingId && myBuildings.length > 0) {
      setSelectedBuildingId(myBuildings[0].id);
    }
  }, [initialBuildingId, myBuildings]);

  // Bank Info state (persisted per building in localStorage as UI fallback)
  const [bankId, setBankId] = useState<string>('MB');
  const [accountNo, setAccountNo] = useState<string>('');
  const [accountName, setAccountName] = useState<string>('');
  const [isTieredModalOpen, setIsTieredModalOpen] = useState(false);

  const { data: catalog = [] } = useServiceCatalog();
  const { data: buildingServices = [], isLoading } = useBuildingServices(selectedBuildingId);
  const saveServicesMutation = useSaveBuildingServices();

  // Local form state for service prices
  const [serviceSettings, setServiceSettings] = useState<
    Record<string, { custom_price: number; is_active: boolean }>
  >({});

  // Sync building services to local form
  useEffect(() => {
    const map: Record<string, { custom_price: number; is_active: boolean }> = {};
    // Seed with defaults
    catalog.forEach((cat) => {
      map[cat.id] = { custom_price: cat.default_price, is_active: true };
    });
    // Override with building-specific
    buildingServices.forEach((bs) => {
      map[bs.service_id] = {
        custom_price: bs.custom_price,
        is_active: bs.is_active,
      };
    });
    setServiceSettings(map);
  }, [catalog, buildingServices]);

  // Load bank details from localStorage
  useEffect(() => {
    if (!selectedBuildingId) return;
    try {
      const savedBank = localStorage.getItem(`k23_bank_${selectedBuildingId}`);
      if (savedBank) {
        const parsed = JSON.parse(savedBank);
        setBankId(parsed.bankId || 'MB');
        setAccountNo(parsed.accountNo || '');
        setAccountName(parsed.accountName || '');
      } else {
        setBankId('MB');
        setAccountNo('');
        setAccountName('');
      }
    } catch {
      // ignore
    }
  }, [selectedBuildingId]);

  const handleToggle = (serviceId: string) => {
    setServiceSettings((prev) => ({
      ...prev,
      [serviceId]: {
        ...prev[serviceId],
        is_active: !prev[serviceId]?.is_active,
      },
    }));
  };

  const handlePriceChange = (serviceId: string, value: string) => {
    const num = parseFloat(value) || 0;
    setServiceSettings((prev) => ({
      ...prev,
      [serviceId]: {
        ...prev[serviceId],
        custom_price: num,
      },
    }));
  };

  const currentBuilding = myBuildings.find((b) => b.id === selectedBuildingId);

  const handleSaveAll = async () => {
    if (!selectedBuildingId || !currentUser?.id) {
      showToast('Chưa chọn tòa nhà', 'Vui lòng chọn tòa nhà trước khi lưu biểu phí', 'warning');
      return;
    }

    try {
      const payload = Object.entries(serviceSettings).map(([service_id, val]) => ({
        service_id,
        custom_price: val.custom_price,
        is_active: val.is_active,
      }));

      await saveServicesMutation.mutateAsync({
        buildingId: selectedBuildingId,
        ownerId: currentUser.id,
        services: payload,
      });

      // Save bank details
      localStorage.setItem(
        `k23_bank_${selectedBuildingId}`,
        JSON.stringify({ bankId, accountNo, accountName })
      );

      showToast(
        'Đã lưu thành công! ✅',
        `Đã cập nhật bảng giá & thông tin VietQR cho ${currentBuilding?.name || 'tòa nhà'}`,
        'success'
      );

      if (onSaved) {
        onSaved();
      }
    } catch (err) {
      console.error(err);
      showToast('Lỗi lưu cài đặt', 'Không thể lưu cài đặt. Vui lòng thử lại sau!', 'error');
    }
  };

  const getServiceIcon = (icon?: string) => {
    switch (icon) {
      case 'zap':
        return <Zap className="w-5 h-5 text-amber-500" />;
      case 'droplets':
        return <Droplets className="w-5 h-5 text-cyan-500" />;
      case 'trash-2':
        return <Trash2 className="w-5 h-5 text-emerald-500" />;
      case 'wifi':
        return <Wifi className="w-5 h-5 text-blue-500" />;
      case 'bike':
        return <Bike className="w-5 h-5 text-purple-500" />;
      case 'arrow-up':
        return <ArrowUp className="w-5 h-5 text-indigo-500" />;
      case 'shield':
        return <Shield className="w-5 h-5 text-rose-500" />;
      default:
        return <Sliders className="w-5 h-5 text-slate-500" />;
    }
  };

  if (myBuildings.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-gray-200 p-8 sm:p-12 text-center space-y-4">
        <div className="w-16 h-16 bg-emerald-50 text-[#00a854] rounded-full flex items-center justify-center mx-auto">
          <Building2 className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-gray-900">Chưa Có Hồ Sơ Tòa Nhà Để Cài Đặt Dịch Vụ</h3>
        <p className="text-xs text-gray-500 max-w-sm mx-auto">
          Bạn cần tạo hồ sơ tòa nhà trước để có thể thiết lập biểu giá điện, nước, internet và VietQR nhận tiền phòng.
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header & Building Selector */}
      {!hideBuildingSelector && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                Cấu hình theo cơ sở
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-extrabold text-gray-900">
              Đang chọn cơ sở: <span className="text-[#006d37]">{currentBuilding?.name}</span>
            </h3>
            <p className="text-xs text-gray-500">
              {currentBuilding?.address}, {currentBuilding?.district}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <label className="text-xs font-bold text-gray-600 hidden sm:inline">Chuyển tòa nhà:</label>
            <div className="relative">
              <select
                value={selectedBuildingId}
                onChange={(e) => setSelectedBuildingId(e.target.value)}
                className="appearance-none pl-9 pr-8 py-2 bg-gray-50 hover:bg-gray-100 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:ring-2 focus:ring-[#006d37] focus:outline-none transition cursor-pointer"
              >
                {myBuildings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <Building2 className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>
      )}

      {/* Section 1: Biểu phí dịch vụ hàng tháng */}
      <div className="bg-white rounded-3xl border border-gray-200 p-5 sm:p-7 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
          <div>
            <h3 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-[#006d37]" />
              Bảng Đơn Giá Dịch Vụ Định Kỳ
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Áp dụng tự động khi chốt số điện nước và phát hành hóa đơn hàng tháng cho khách thuê
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsTieredModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 font-bold text-xs transition cursor-pointer self-start sm:self-auto"
          >
            <Zap className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
            <span>Cấu hình điện bậc thang EVN</span>
          </button>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-xs text-gray-400">Đang tải bảng giá dịch vụ...</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {catalog.map((cat) => {
              const setting = serviceSettings[cat.id] || {
                custom_price: cat.default_price,
                is_active: true,
              };

              return (
                <div
                  key={cat.id}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition hover:bg-gray-50/60 rounded-xl px-2 -mx-2"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center shrink-0">
                      {getServiceIcon(cat.icon)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-gray-900">
                          {cat.name}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-mono">
                          /{cat.unit}
                        </span>
                        {!setting.is_active && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600">
                            Đang tắt
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {cat.charge_type === 'per_unit'
                          ? 'Tính theo chỉ số công tơ tiêu thụ'
                          : cat.charge_type === 'per_person'
                          ? 'Tính theo đầu người ở trong phòng'
                          : 'Thu cố định hàng tháng'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-end sm:self-auto">
                    {/* Price input */}
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        step="any"
                        disabled={!setting.is_active}
                        value={setting.custom_price || ''}
                        onChange={(e) => handlePriceChange(cat.id, e.target.value)}
                        className="w-32 px-3 py-1.5 text-right font-mono font-bold text-sm rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-[#006d37] outline-none disabled:opacity-40 disabled:bg-gray-100"
                        placeholder="Đơn giá"
                      />
                      <span className="text-xs font-bold text-gray-500">đ</span>
                    </div>

                    {/* Active toggle */}
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={setting.is_active}
                        onChange={() => handleToggle(cat.id)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00a854]"></div>
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 2: Tài khoản nhận tiền phòng VietQR */}
      <div className="bg-white rounded-3xl border border-gray-200 p-5 sm:p-7 shadow-xs space-y-4">
        <div>
          <h3 className="text-base font-extrabold text-gray-900 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#006d37]" />
            Tài Khoản Nhận Tiền Nhà (Tự Sinh Mã VietQR Hóa Đơn)
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Thông tin này được nhúng tự động vào mã QR thanh toán trên hóa đơn gửi đến Zalo và Cổng web khách thuê của tòa nhà này.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">
              Ngân hàng thụ hưởng
            </label>
            <select
              value={bankId}
              onChange={(e) => setBankId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white text-xs sm:text-sm font-semibold text-gray-900 outline-none focus:ring-2 focus:ring-[#006d37]"
            >
              {POPULAR_BANKS.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.shortName} - {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">
              Số tài khoản (STK)
            </label>
            <input
              type="text"
              value={accountNo}
              onChange={(e) => setAccountNo(e.target.value.trim())}
              placeholder="Ví dụ: 0987654321..."
              className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white font-mono font-bold text-xs sm:text-sm text-gray-900 outline-none focus:ring-2 focus:ring-[#006d37]"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">
              Tên chủ tài khoản (in hoa)
            </label>
            <input
              type="text"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value.toUpperCase())}
              placeholder="NGUYEN VAN A"
              className="w-full px-3 py-2 rounded-xl border border-gray-300 bg-white font-semibold text-xs sm:text-sm text-gray-900 outline-none focus:ring-2 focus:ring-[#006d37] uppercase"
            />
          </div>
        </div>

        {accountNo && (
          <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-between text-xs text-emerald-900">
            <div className="flex items-center gap-2">
              <QrCode className="w-4 h-4 text-[#006d37]" />
              <span>
                Đã sẵn sàng tạo mã QR nhận tiền cho <strong>{currentBuilding?.name}</strong>: {bankId} - {accountNo} ({accountName || 'CHỦ TRỌ'})
              </span>
            </div>
            <span className="font-mono text-[10px] bg-white px-2 py-0.5 rounded-full text-emerald-800 font-bold border border-emerald-200">
              Chuẩn NAPAS247
            </span>
          </div>
        )}
      </div>

      {/* Save Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <p className="text-xs text-gray-400 text-center sm:text-left">
          Thay đổi sẽ được áp dụng ngay cho tất cả hóa đơn phát sinh của tòa nhà này.
        </p>

        <button
          type="button"
          onClick={handleSaveAll}
          disabled={saveServicesMutation.isPending}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-black text-xs sm:text-sm bg-[#00a854] hover:bg-[#008f47] text-white shadow-md active:scale-95 transition-all disabled:opacity-60 cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>{saveServicesMutation.isPending ? 'Đang lưu cài đặt...' : 'Lưu Bảng Giá & VietQR'}</span>
        </button>
      </div>

      {/* Modal Cấu hình điện bậc thang EVN */}
      <TieredTariffConfigModal
        isOpen={isTieredModalOpen}
        onClose={() => setIsTieredModalOpen(false)}
        buildingName={currentBuilding?.name}
      />
    </div>
  );
};

