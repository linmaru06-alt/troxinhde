import { SubscriptionBanner } from '../components/k23/subscription/SubscriptionBanner';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardSidebar } from '../components/layout/DashboardSidebar';
import { useAppStore } from '../store/useAppStore';
import {
  useBuildingServices,
  useMeterReadings,
  usePreviousMeterReadings,
  useBatchSaveMeterReadings,
  useSaveInvoice,
} from '../hooks/queries/useK23';
import { MeterReadingGrid } from '../components/k23/MeterReadingGrid';
import { RoomReadingRow } from '../types/k23';
import { Zap, Building2, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

export const OwnerMeterReadingPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, buildings, rooms, showToast } = useAppStore();

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());

  const isDemo = currentUser?.isDemoAccount || currentUser?.id === '00000000-0000-0000-0000-000000000002' || currentUser?.id === 'user_owner_1';
  const myBuildings = buildings.filter(
    (b) =>
      b.ownerId === currentUser?.id ||
      (isDemo && (b.ownerId === 'user_owner_1' || b.ownerId === '00000000-0000-0000-0000-000000000002')) ||
      (currentUser?.firebaseUid && b.ownerId === currentUser.firebaseUid)
  );

  const [selectedBuildingId, setSelectedBuildingId] = useState<string>(
    myBuildings[0]?.id || ''
  );

  // Filter rooms of the selected building
  const buildingRooms = rooms.filter((r) => r.buildingId === selectedBuildingId);

  // Fetch building services (prices)
  const { data: services = [] } = useBuildingServices(selectedBuildingId);
  const elecService = services.find(
    (s) => s.service?.charge_type === 'per_unit' && s.service?.icon === 'zap'
  );
  const waterService = services.find(
    (s) => s.service?.charge_type === 'per_unit' && s.service?.icon === 'droplets'
  );

  const electricityPrice = elecService ? elecService.custom_price : 3500;
  const waterPrice = waterService ? waterService.custom_price : 25000;

  // Fetch current month readings
  const { data: readings = [], refetch: refetchReadings } = useMeterReadings({
    buildingId: selectedBuildingId,
    month: selectedMonth,
    year: selectedYear,
  });

  // Fetch previous month readings
  const { data: prevReadings = [] } = usePreviousMeterReadings({
    buildingId: selectedBuildingId,
    month: selectedMonth,
    year: selectedYear,
  });

  const batchSaveMutation = useBatchSaveMeterReadings();
  const saveInvoiceMutation = useSaveInvoice();

  // Transform readings for the grid
  const formattedExistingReadings = readings.map((r) => {
    const isElec = r.building_service?.service?.icon === 'zap';
    return {
      room_id: r.room_id,
      building_service_id: r.building_service_id,
      previous_reading: r.previous_reading,
      current_reading: r.current_reading,
      service_type: (isElec ? 'electricity' : 'water') as 'electricity' | 'water',
      photo_url: r.photo_url,
    };
  });

  const formattedPrevReadings = prevReadings.map((r) => {
    const isElec = r.building_service?.service?.icon === 'zap';
    return {
      room_id: r.room_id,
      current_reading: r.current_reading,
      service_type: (isElec ? 'electricity' : 'water') as 'electricity' | 'water',
    };
  });

  const handleSaveReadings = async (rows: RoomReadingRow[]) => {
    if (!currentUser?.id) return;

    const payload: any[] = [];

    rows.forEach((row) => {
      // Electricity
      if (row.electricityNew > 0 || row.electricityOld > 0) {
        payload.push({
          room_id: row.roomId,
          owner_id: currentUser.id,
          building_service_id: elecService?.id || 'srv_elec',
          billing_month: selectedMonth,
          billing_year: selectedYear,
          previous_reading: row.electricityOld,
          current_reading: row.electricityNew,
          photo_url: row.electricityPhoto,
        });
      }

      // Water
      if (row.waterNew > 0 || row.waterOld > 0) {
        payload.push({
          room_id: row.roomId,
          owner_id: currentUser.id,
          building_service_id: waterService?.id || 'srv_water',
          billing_month: selectedMonth,
          billing_year: selectedYear,
          previous_reading: row.waterOld,
          current_reading: row.waterNew,
          photo_url: row.waterPhoto,
        });
      }
    });

    await batchSaveMutation.mutateAsync(payload);
    refetchReadings();
    if (showToast) {
      showToast('Đã lưu chỉ số điện nước thành công!', 'success');
    } else {
      alert('Đã lưu chỉ số thành công!');
    }
  };

  const handleGenerateInvoices = async (rows: RoomReadingRow[]) => {
    if (!currentUser?.id) return;

    // 1. First save readings
    await handleSaveReadings(rows);

    // 2. Generate invoice for each room
    let count = 0;
    const dueDate = new Date(selectedYear, selectedMonth - 1, 5).toISOString().split('T')[0];

    for (const row of rows) {
      // Find extra services like Trash, Wifi
      const extraItems = services
        .filter((s) => s.is_active && s.service?.charge_type === 'flat_monthly')
        .map((s) => ({
          item_type: 'service' as const,
          description: s.service?.name || 'Dịch vụ',
          quantity: 1,
          unit_price: s.custom_price,
          amount: s.custom_price,
        }));

      const items = [
        // Tiền phòng
        {
          item_type: 'rent' as const,
          description: `Tiền thuê phòng tháng ${selectedMonth}/${selectedYear}`,
          quantity: 1,
          unit_price: row.baseRent,
          amount: row.baseRent,
        },
        // Tiền điện
        {
          item_type: 'service' as const,
          description: `Tiền điện (${row.electricityOld} ➔ ${row.electricityNew}: ${row.electricityUsage} kWh)`,
          quantity: row.electricityUsage,
          unit_price: row.electricityPrice,
          amount: row.electricityUsage * row.electricityPrice,
        },
        // Tiền nước
        {
          item_type: 'service' as const,
          description: `Tiền nước (${row.waterOld} ➔ ${row.waterNew}: ${row.waterUsage} m³)`,
          quantity: row.waterUsage,
          unit_price: row.waterPrice,
          amount: row.waterUsage * row.waterPrice,
        },
        // Các dịch vụ cố định (rác, wifi...)
        ...extraItems,
      ];

      const invoiceCode = `INV-${selectedYear}${String(selectedMonth).padStart(2, '0')}-${
        row.roomNumber.replace(/\D/g, '') || row.roomId.slice(0, 3)
      }`;

      await saveInvoiceMutation.mutateAsync({
        invoice: {
          room_id: row.roomId,
          owner_id: currentUser.id,
          invoice_code: invoiceCode,
          billing_month: selectedMonth,
          billing_year: selectedYear,
          due_date: dueDate,
          status: 'sent',
        },
        items,
      });
      count += 1;
    }

    if (showToast) {
      showToast(`Đã tự động tạo hóa đơn cho ${count} phòng!`, 'success');
    }
    navigate('/chu-tro/hoa-don');
  };

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans">
      <DashboardSidebar role="owner" />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          <SubscriptionBanner />
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5">
                <Zap className="w-7 h-7 text-amber-500" />
                Chốt Chỉ Số Điện Nước
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Ghi nhận số điện, số nước từng phòng và tự động sinh hóa đơn tiền nhà
              </p>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Building selector */}
              {myBuildings.length > 0 && (
                <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm text-xs sm:text-sm">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  <select
                    value={selectedBuildingId}
                    onChange={(e) => setSelectedBuildingId(e.target.value)}
                    className="bg-transparent font-semibold text-slate-800 dark:text-slate-200 outline-none"
                  >
                    {myBuildings.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Month selector */}
              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm text-xs sm:text-sm">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-bold px-2 text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Tháng {selectedMonth}/{selectedYear}
                </span>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Grid Content */}
          <MeterReadingGrid
            rooms={buildingRooms.map((r) => ({
              id: r.id,
              room_number: r.roomNumber,
              title: r.title,
              price: r.price,
            }))}
            existingReadings={formattedExistingReadings}
            prevReadings={formattedPrevReadings}
            electricityPrice={electricityPrice}
            waterPrice={waterPrice}
            onSave={handleSaveReadings}
            onGenerateInvoices={handleGenerateInvoices}
          />
        </div>
      </main>
    </div>
  );
};

