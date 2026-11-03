import React, { useState, useEffect, useMemo } from 'react';
import { RoomReadingRow } from '../../types/k23';
import { Zap, Droplets, Camera, AlertTriangle, CheckCircle, ChevronLeft, ChevronRight, Save, Receipt } from 'lucide-react';

interface Props {
  rooms: Array<{
    id: string;
    room_number?: string;
    title?: string;
    price?: number;
  }>;
  existingReadings: Array<{
    room_id: string;
    building_service_id?: string;
    previous_reading: number;
    current_reading: number;
    service_type?: 'electricity' | 'water';
    photo_url?: string;
  }>;
  prevReadings: Array<{
    room_id: string;
    current_reading: number;
    service_type?: 'electricity' | 'water';
  }>;
  electricityPrice: number;
  waterPrice: number;
  onSave: (rows: RoomReadingRow[]) => Promise<void>;
  onGenerateInvoices?: (rows: RoomReadingRow[]) => Promise<void>;
}

export const MeterReadingGrid: React.FC<Props> = ({
  rooms,
  existingReadings,
  prevReadings,
  electricityPrice,
  waterPrice,
  onSave,
  onGenerateInvoices,
}) => {
  const [rows, setRows] = useState<RoomReadingRow[]>([]);
  const [activeMobileIndex, setActiveMobileIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize rows from rooms + readings
  useEffect(() => {
    const initialRows: RoomReadingRow[] = rooms.map((r) => {
      // Find previous readings
      const prevElec = prevReadings.find(
        (pr) => pr.room_id === r.id && pr.service_type === 'electricity'
      )?.current_reading || 0;
      const prevWater = prevReadings.find(
        (pr) => pr.room_id === r.id && pr.service_type === 'water'
      )?.current_reading || 0;

      // Find current month existing readings
      const curElec = existingReadings.find(
        (cr) => cr.room_id === r.id && cr.service_type === 'electricity'
      );
      const curWater = existingReadings.find(
        (cr) => cr.room_id === r.id && cr.service_type === 'water'
      );

      const elecOld = curElec ? curElec.previous_reading : prevElec;
      const elecNew = curElec ? curElec.current_reading : elecOld;
      const elecUsage = Math.max(0, elecNew - elecOld);

      const waterOld = curWater ? curWater.previous_reading : prevWater;
      const waterNew = curWater ? curWater.current_reading : waterOld;
      const waterUsage = Math.max(0, waterNew - waterOld);

      return {
        roomId: r.id,
        roomNumber: r.room_number || r.title || 'Phòng',
        roomTitle: r.title || `Phòng ${r.room_number}`,
        baseRent: r.price || 0,
        electricityOld: elecOld,
        electricityNew: elecNew,
        electricityUsage: elecUsage,
        electricityPrice: electricityPrice,
        electricityPhoto: curElec?.photo_url,
        waterOld: waterOld,
        waterNew: waterNew,
        waterUsage: waterUsage,
        waterPrice: waterPrice,
        waterPhoto: curWater?.photo_url,
      };
    });

    setRows(initialRows);
  }, [rooms, existingReadings, prevReadings, electricityPrice, waterPrice]);

  const handleReadingChange = (
    index: number,
    field: 'electricityNew' | 'waterNew',
    value: string
  ) => {
    const num = parseFloat(value) || 0;
    setRows((prev) => {
      const copy = [...prev];
      const target = { ...copy[index] };

      if (field === 'electricityNew') {
        target.electricityNew = num;
        target.electricityUsage = Math.max(0, num - target.electricityOld);
      } else {
        target.waterNew = num;
        target.waterUsage = Math.max(0, num - target.waterOld);
      }

      copy[index] = target;
      return copy;
    });
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      await onSave(rows);
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateInvoicesClick = async () => {
    if (!onGenerateInvoices) return;
    setIsSaving(true);
    try {
      await onGenerateInvoices(rows);
    } finally {
      setIsSaving(false);
    }
  };

  // Metrics
  const summary = useMemo(() => {
    const totalElec = rows.reduce((s, r) => s + r.electricityUsage, 0);
    const totalWater = rows.reduce((s, r) => s + r.waterUsage, 0);
    const completedRooms = rows.filter(
      (r) => r.electricityNew > r.electricityOld || r.waterNew > r.waterOld
    ).length;
    return { totalElec, totalWater, completedRooms, totalRooms: rows.length };
  }, [rows]);

  if (rows.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 text-center border border-slate-200 dark:border-slate-800">
        <p className="text-slate-500">Tòa nhà này hiện chưa có phòng trọ nào.</p>
      </div>
    );
  }

  const currentMobileRoom = rows[activeMobileIndex] || rows[0];

  return (
    <div className="space-y-4">
      {/* Metrics Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-4 sm:p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="text-slate-400 block text-xs">Tiến độ chốt</span>
            <span className="text-xl font-bold font-mono text-emerald-400">
              {summary.completedRooms}/{summary.totalRooms}
            </span>{' '}
            <span className="text-xs text-slate-300">phòng</span>
          </div>
          <div className="border-l border-slate-700 pl-4">
            <span className="text-slate-400 block text-xs">Tổng điện dùng</span>
            <span className="text-base font-bold font-mono text-amber-400">
              {summary.totalElec.toLocaleString('vi-VN')}
            </span>{' '}
            <span className="text-xs text-slate-300">kWh</span>
          </div>
          <div className="border-l border-slate-700 pl-4">
            <span className="text-slate-400 block text-xs">Tổng nước dùng</span>
            <span className="text-base font-bold font-mono text-cyan-400">
              {summary.totalWater.toLocaleString('vi-VN')}
            </span>{' '}
            <span className="text-xs text-slate-300">m³</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSaveAll}
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-white text-slate-900 hover:bg-slate-100 shadow transition-all disabled:opacity-60"
          >
            <Save className="w-3.5 h-3.5" />
            Lưu chỉ số
          </button>
          {onGenerateInvoices && (
            <button
              type="button"
              onClick={handleGenerateInvoicesClick}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 text-white hover:bg-emerald-600 shadow transition-all disabled:opacity-60"
            >
              <Receipt className="w-3.5 h-3.5" />
              Tạo Hóa Đơn Tháng
            </button>
          )}
        </div>
      </div>

      {/* ================= DESKTOP TABLE VIEW ================= */}
      <div className="hidden lg:block bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 uppercase font-semibold text-[11px] border-b border-slate-200 dark:border-slate-700">
            <tr>
              <th className="py-3 px-4">Phòng</th>
              {/* Electricity */}
              <th className="py-3 px-2 bg-amber-50/60 dark:bg-amber-950/20 text-amber-900 dark:text-amber-300">
                <div className="flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  Điện cũ
                </div>
              </th>
              <th className="py-3 px-2 bg-amber-50/60 dark:bg-amber-950/20 text-amber-900 dark:text-amber-300">
                Điện mới (kWh)
              </th>
              <th className="py-3 px-2 bg-amber-50/60 dark:bg-amber-950/20 text-right text-amber-900 dark:text-amber-300">
                Tiêu thụ
              </th>
              <th className="py-3 px-3 bg-amber-50/60 dark:bg-amber-950/20 text-right text-amber-900 dark:text-amber-300">
                Tiền điện
              </th>
              {/* Water */}
              <th className="py-3 px-2 bg-cyan-50/60 dark:bg-cyan-950/20 text-cyan-900 dark:text-cyan-300">
                <div className="flex items-center gap-1">
                  <Droplets className="w-3.5 h-3.5 text-cyan-500" />
                  Nước cũ
                </div>
              </th>
              <th className="py-3 px-2 bg-cyan-50/60 dark:bg-cyan-950/20 text-cyan-900 dark:text-cyan-300">
                Nước mới (m³)
              </th>
              <th className="py-3 px-2 bg-cyan-50/60 dark:bg-cyan-950/20 text-right text-cyan-900 dark:text-cyan-300">
                Tiêu thụ
              </th>
              <th className="py-3 px-3 bg-cyan-50/60 dark:bg-cyan-950/20 text-right text-cyan-900 dark:text-cyan-300">
                Tiền nước
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map((row, idx) => {
              const isElecInvalid = row.electricityNew < row.electricityOld;
              const isWaterInvalid = row.waterNew < row.waterOld;
              const isComplete =
                row.electricityNew > row.electricityOld || row.waterNew > row.waterOld;

              return (
                <tr
                  key={row.roomId}
                  className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                    isComplete ? 'bg-emerald-50/20 dark:bg-emerald-950/10' : ''
                  }`}
                >
                  <td className="py-3 px-4">
                    <span className="font-bold text-slate-900 dark:text-white text-sm block">
                      {row.roomNumber}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Giá thuê: {row.baseRent.toLocaleString('vi-VN')} đ
                    </span>
                  </td>

                  {/* Electricity Old */}
                  <td className="py-3 px-2 font-mono text-slate-500 dark:text-slate-400 bg-amber-50/20 dark:bg-amber-950/10">
                    {row.electricityOld.toLocaleString('vi-VN')}
                  </td>

                  {/* Electricity New Input */}
                  <td className="py-3 px-2 bg-amber-50/20 dark:bg-amber-950/10">
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        step="any"
                        value={row.electricityNew || ''}
                        onChange={(e) =>
                          handleReadingChange(idx, 'electricityNew', e.target.value)
                        }
                        className={`w-28 px-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold focus:ring-2 outline-none ${
                          isElecInvalid
                            ? 'border-rose-400 bg-rose-50 text-rose-700 focus:ring-rose-200'
                            : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-emerald-200'
                        }`}
                        placeholder="Số mới..."
                      />
                      {isElecInvalid && (
                        <span title="Số mới nhỏ hơn số cũ!" className="absolute -right-5">
                          <AlertTriangle className="w-4 h-4 text-rose-500" />
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Electricity Usage */}
                  <td className="py-3 px-2 text-right font-mono font-bold text-amber-700 dark:text-amber-300 bg-amber-50/20 dark:bg-amber-950/10">
                    {row.electricityUsage} kWh
                  </td>

                  {/* Electricity Cost */}
                  <td className="py-3 px-3 text-right font-mono font-semibold text-slate-700 dark:text-slate-300 bg-amber-50/20 dark:bg-amber-950/10">
                    {(row.electricityUsage * row.electricityPrice).toLocaleString('vi-VN')} đ
                  </td>

                  {/* Water Old */}
                  <td className="py-3 px-2 font-mono text-slate-500 dark:text-slate-400 bg-cyan-50/20 dark:bg-cyan-950/10">
                    {row.waterOld.toLocaleString('vi-VN')}
                  </td>

                  {/* Water New Input */}
                  <td className="py-3 px-2 bg-cyan-50/20 dark:bg-cyan-950/10">
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        step="any"
                        value={row.waterNew || ''}
                        onChange={(e) =>
                          handleReadingChange(idx, 'waterNew', e.target.value)
                        }
                        className={`w-28 px-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold focus:ring-2 outline-none ${
                          isWaterInvalid
                            ? 'border-rose-400 bg-rose-50 text-rose-700 focus:ring-rose-200'
                            : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-cyan-200'
                        }`}
                        placeholder="Số mới..."
                      />
                      {isWaterInvalid && (
                        <span title="Số mới nhỏ hơn số cũ!" className="absolute -right-5">
                          <AlertTriangle className="w-4 h-4 text-rose-500" />
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Water Usage */}
                  <td className="py-3 px-2 text-right font-mono font-bold text-cyan-700 dark:text-cyan-300 bg-cyan-50/20 dark:bg-cyan-950/10">
                    {row.waterUsage} m³
                  </td>

                  {/* Water Cost */}
                  <td className="py-3 px-3 text-right font-mono font-semibold text-slate-700 dark:text-slate-300 bg-cyan-50/20 dark:bg-cyan-950/10">
                    {(row.waterUsage * row.waterPrice).toLocaleString('vi-VN')} đ
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ================= MOBILE WALK-THROUGH CARD VIEW ================= */}
      <div className="lg:hidden space-y-3">
        {/* Room Switcher header */}
        <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            disabled={activeMobileIndex === 0}
            onClick={() => setActiveMobileIndex((prev) => Math.max(0, prev - 1))}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-30"
          >
            <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          </button>

          <div className="text-center">
            <span className="text-xs text-slate-400 block">
              Phòng {activeMobileIndex + 1} / {rows.length}
            </span>
            <span className="text-lg font-extrabold text-slate-900 dark:text-white">
              {currentMobileRoom.roomNumber}
            </span>
          </div>

          <button
            type="button"
            disabled={activeMobileIndex === rows.length - 1}
            onClick={() =>
              setActiveMobileIndex((prev) => Math.min(rows.length - 1, prev + 1))
            }
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 disabled:opacity-30"
          >
            <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          </button>
        </div>

        {/* Card for Active Room */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          {/* Electricity Section */}
          <div className="bg-amber-50/60 dark:bg-amber-950/20 p-4 rounded-xl border border-amber-200 dark:border-amber-900/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-900 dark:text-amber-300 text-sm flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-500" />
                ĐIỆN (kWh)
              </span>
              <span className="text-xs text-slate-500">
                Đơn giá: {electricityPrice.toLocaleString('vi-VN')} đ
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block">Chỉ số cũ:</span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300 text-base">
                  {currentMobileRoom.electricityOld}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">Chỉ số mới:</span>
                <input
                  type="number"
                  step="any"
                  value={currentMobileRoom.electricityNew || ''}
                  onChange={(e) =>
                    handleReadingChange(activeMobileIndex, 'electricityNew', e.target.value)
                  }
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold text-base text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400 outline-none"
                  placeholder="Gõ số..."
                />
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-amber-200/60 text-xs">
              <span className="text-slate-600 dark:text-slate-400">
                Tiêu thụ:{' '}
                <strong className="text-amber-800 dark:text-amber-200">
                  {currentMobileRoom.electricityUsage} kWh
                </strong>
              </span>
              <span className="font-bold font-mono text-slate-900 dark:text-white">
                {(currentMobileRoom.electricityUsage * electricityPrice).toLocaleString('vi-VN')} đ
              </span>
            </div>
          </div>

          {/* Water Section */}
          <div className="bg-cyan-50/60 dark:bg-cyan-950/20 p-4 rounded-xl border border-cyan-200 dark:border-cyan-900/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-cyan-900 dark:text-cyan-300 text-sm flex items-center gap-1.5">
                <Droplets className="w-4 h-4 text-cyan-500" />
                NƯỚC (m³)
              </span>
              <span className="text-xs text-slate-500">
                Đơn giá: {waterPrice.toLocaleString('vi-VN')} đ
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block">Chỉ số cũ:</span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300 text-base">
                  {currentMobileRoom.waterOld}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block font-medium">Chỉ số mới:</span>
                <input
                  type="number"
                  step="any"
                  value={currentMobileRoom.waterNew || ''}
                  onChange={(e) =>
                    handleReadingChange(activeMobileIndex, 'waterNew', e.target.value)
                  }
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-mono font-bold text-base text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-400 outline-none"
                  placeholder="Gõ số..."
                />
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-cyan-200/60 text-xs">
              <span className="text-slate-600 dark:text-slate-400">
                Tiêu thụ:{' '}
                <strong className="text-cyan-800 dark:text-cyan-200">
                  {currentMobileRoom.waterUsage} m³
                </strong>
              </span>
              <span className="font-bold font-mono text-slate-900 dark:text-white">
                {(currentMobileRoom.waterUsage * waterPrice).toLocaleString('vi-VN')} đ
              </span>
            </div>
          </div>

          {/* Stepper Button */}
          {activeMobileIndex < rows.length - 1 ? (
            <button
              type="button"
              onClick={() => setActiveMobileIndex((prev) => prev + 1)}
              className="w-full py-3 rounded-xl font-bold text-sm bg-slate-900 dark:bg-white text-white dark:text-slate-900 flex items-center justify-center gap-2 shadow"
            >
              <span>Xong, sang phòng tiếp theo</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={isSaving}
              className="w-full py-3 rounded-xl font-bold text-sm bg-emerald-600 text-white flex items-center justify-center gap-2 shadow"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Đã hoàn thành tất cả phòng, Lưu lại!</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

