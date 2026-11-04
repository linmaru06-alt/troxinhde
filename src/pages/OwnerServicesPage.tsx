import { SubscriptionBanner } from '../components/k23/subscription/SubscriptionBanner';
import React, { useState, useEffect } from 'react';
import { DashboardSidebar } from '../components/layout/DashboardSidebar';
import { useAppStore } from '../store/useAppStore';
import {
  useServiceCatalog,
  useBuildingServices,
  useSaveBuildingServices,
} from '../hooks/queries/useK23';
import { POPULAR_BANKS } from '../lib/vietqr';
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
} from 'lucide-react';

export const OwnerServicesPage: React.FC = () => {
  const { currentUser, buildings, showToast } = useAppStore();
  const myBuildings = buildings.filter(
    (b) =>
      b.ownerId === currentUser?.id ||
      (currentUser?.id === 'user_owner_1' && b.ownerId === 'user_owner_1') ||
      (currentUser?.firebaseUid && b.ownerId === currentUser.firebaseUid)
  );

  const [selectedBuildingId, setSelectedBuildingId] = useState<string>(
    myBuildings[0]?.id || ''
  );

  // Bank Info state (persisted per building in localStorage as UI fallback)
  const [bankId, setBankId] = useState<string>('MB');
  const [accountNo, setAccountNo] = useState<string>('');
  const [accountName, setAccountName] = useState<string>('');

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

  const handleSaveAll = async () => {
    if (!selectedBuildingId || !currentUser?.id) return;

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

      if (showToast) {
        showToast('Đã lưu bảng giá dịch vụ & thông tin thanh toán!', 'success');
      } else {
        alert('Đã lưu thành công!');
      }
    } catch (err) {
      console.error(err);
      alert('Không thể lưu cài đặt. Vui lòng thử lại!');
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

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans">
      <DashboardSidebar role="owner" />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
                <Settings className="w-7 h-7 text-emerald-600" />
                Cài Đặt Dịch Vụ & Đơn Giá
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Thiết lập giá điện, nước, internet, rác và tài khoản nhận tiền chuyển khoản
              </p>
            </div>

            {/* Building Switcher */}
            {myBuildings.length > 0 && (
              <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <Building2 className="w-4 h-4 text-slate-400" />
                <select
                  value={selectedBuildingId}
                  onChange={(e) => setSelectedBuildingId(e.target.value)}
                  className="bg-transparent text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 outline-none"
                >
                  {myBuildings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Section 1: Services List */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-5">
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sliders className="w-5 h-5 text-emerald-600" />
              Bảng Đơn Giá Dịch Vụ Hàng Tháng
            </h2>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {catalog.map((cat) => {
                const setting = serviceSettings[cat.id] || {
                  custom_price: cat.default_price,
                  is_active: true,
                };

                return (
                  <div
                    key={cat.id}
                    className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                        {getServiceIcon(cat.icon)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">
                            {cat.name}
                          </span>
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-mono">
                            / {cat.unit}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {cat.charge_type === 'per_unit'
                            ? 'Tính theo chỉ số tiêu thụ'
                            : cat.charge_type === 'per_person'
                            ? 'Tính theo đầu người ở'
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
                          className="w-32 px-3 py-1.5 text-right font-mono font-bold text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-400 outline-none disabled:opacity-40"
                          placeholder="Đơn giá"
                        />
                        <span className="text-xs font-semibold text-slate-500">VNĐ</span>
                      </div>

                      {/* Active toggle */}
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={setting.is_active}
                          onChange={() => handleToggle(cat.id)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Bank Transfer Details for VietQR */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-600" />
                Tài Khoản Ngân Hàng Nhận Tiền Nhà (Tự sinh mã VietQR)
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Thông tin này sẽ được in trực tiếp lên mã QR của tờ hóa đơn gửi cho khách thuê
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Ngân hàng thụ hưởng
                </label>
                <select
                  value={bankId}
                  onChange={(e) => setBankId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  {POPULAR_BANKS.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.shortName} - {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Số tài khoản (STK)
                </label>
                <input
                  type="text"
                  value={accountNo}
                  onChange={(e) => setAccountNo(e.target.value.trim())}
                  placeholder="Ví dụ: 0987654321..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Tên chủ tài khoản (in hoa)
                </label>
                <input
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value.toUpperCase())}
                  placeholder="NGUYEN VAN A"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-semibold text-xs sm:text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-400 uppercase"
                />
              </div>
            </div>
          </div>

          {/* Save Action */}
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={saveServicesMutation.isPending}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-700 text-white shadow-md active:scale-95 transition-all disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              <span>{saveServicesMutation.isPending ? 'Đang lưu...' : 'Lưu Tất Cả Cài Đặt'}</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

