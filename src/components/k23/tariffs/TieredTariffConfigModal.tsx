import React, { useState, useMemo } from 'react';
import {
  X,
  Zap,
  Calendar,
  Sparkles,
  Layers,
  Calculator,
  Plus,
  Trash2,
  CheckCircle2,
  Camera,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { Button } from '../../ui/Button';
import { formatPrice } from '../../ui/Cards';
import {
  TariffTier,
  TieredTariff,
} from '../../../types/k23Tariffs';
import {
  EVN_STANDARD_TIERS,
  LANDLORD_TIERED_PRESET,
  calculateTieredElectricity,
} from '../../../utils/k23TieredCalculator';

interface TieredTariffConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  buildingName?: string;
  onSave?: (tariff: Partial<TieredTariff>) => Promise<void> | void;
}

export const TieredTariffConfigModal: React.FC<TieredTariffConfigModalProps> = ({
  isOpen,
  onClose,
  buildingName = 'Tòa Nhà Xanh Trọ Xinh',
  onSave,
}) => {
  const [effectiveFrom, setEffectiveFrom] = useState<string>('2026-11-01');
  const [selectedPreset, setSelectedPreset] = useState<'landlord' | 'evn' | 'custom'>('landlord');
  const [tiers, setTiers] = useState<TariffTier[]>(LANDLORD_TIERED_PRESET);
  const [testUsage, setTestUsage] = useState<number>(245);
  const [isSaving, setIsSaving] = useState(false);

  // Tính toán giả lập kết quả theo thời gian thực
  const simResult = useMemo(() => {
    return calculateTieredElectricity(testUsage, tiers);
  }, [testUsage, tiers]);

  if (!isOpen) return null;

  const handleSelectPreset = (preset: 'landlord' | 'evn') => {
    setSelectedPreset(preset);
    if (preset === 'landlord') {
      setTiers(LANDLORD_TIERED_PRESET);
    } else {
      setTiers(EVN_STANDARD_TIERS);
    }
  };

  const handleUpdateTierPrice = (index: number, newPrice: number) => {
    setSelectedPreset('custom');
    setTiers((prev) =>
      prev.map((t, idx) => (idx === index ? { ...t, unit_price: newPrice } : t))
    );
  };

  const handleSaveConfig = async () => {
    setIsSaving(true);
    try {
      if (onSave) {
        await onSave({
          effective_from: effectiveFrom,
          tier_rules: tiers,
          tariff_type: 'electricity',
          is_active: true,
        });
      }
      alert('Đã lưu biểu giá điện bậc thang có mốc hiệu lực thành công!');
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-amber-600 via-yellow-600 to-amber-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center text-white">
              <Zap className="w-5 h-5 fill-amber-300 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-black/20 text-white px-2.5 py-0.5 rounded-full border border-white/20">
                  K23 PMS • P2-02 (Pro)
                </span>
                <span className="text-xs text-amber-100 font-bold">Lũy Tiến Minh Bạch</span>
              </div>
              <h2 className="text-lg font-black text-white mt-1">
                Biểu Giá Điện Bậc Thang & Mốc Hiệu Lực
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nội dung */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Thông tin mốc hiệu lực */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-2xl bg-amber-50/60 border border-amber-200">
            <div>
              <label className="block text-xs font-bold text-amber-950 mb-1">Cơ sở / Tòa nhà áp dụng:</label>
              <div className="text-sm font-black text-slate-900">{buildingName}</div>
            </div>

            <div>
              <label className="block text-xs font-bold text-amber-950 mb-1 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-amber-700" />
                Ngày bắt đầu có hiệu lực (Effective From):
              </label>
              <input
                type="date"
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                className="w-full p-2 rounded-xl border border-amber-300 bg-white text-xs font-bold focus:border-amber-500"
              />
              <p className="text-[10px] text-amber-800 mt-1">
                🔒 Các hóa đơn trước ngày này sẽ giữ nguyên đơn giá cũ, không bị tính nhảy số lại.
              </p>
            </div>
          </div>

          {/* Chọn mẫu nhanh */}
          <div className="space-y-2">
            <label className="block text-xs font-black text-slate-900 uppercase tracking-wider">
              Chọn Mẫu Biểu Giá:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleSelectPreset('landlord')}
                className={`p-3.5 rounded-2xl border text-left transition flex items-center justify-between cursor-pointer ${
                  selectedPreset === 'landlord'
                    ? 'bg-amber-50 border-amber-500 text-amber-950 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div>
                  <span className="text-xs font-black block">Mẫu Nhà Trọ (3 Bậc Tiết Kiệm)</span>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">
                    Bậc 1: 3.2k • Bậc 2: 3.8k • Bậc 3: 4.3k
                  </span>
                </div>
                {selectedPreset === 'landlord' && <CheckCircle2 className="w-5 h-5 text-amber-600 shrink-0" />}
              </button>

              <button
                type="button"
                onClick={() => handleSelectPreset('evn')}
                className={`p-3.5 rounded-2xl border text-left transition flex items-center justify-between cursor-pointer ${
                  selectedPreset === 'evn'
                    ? 'bg-amber-50 border-amber-500 text-amber-950 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div>
                  <span className="text-xs font-black block">Biểu Giá EVN Nhà Nước (6 Bậc)</span>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">
                    Từ 1.806đ đến 3.151đ/kWh theo quy định
                  </span>
                </div>
                {selectedPreset === 'evn' && <CheckCircle2 className="w-5 h-5 text-amber-600 shrink-0" />}
              </button>
            </div>
          </div>

          {/* Bảng chi tiết các bậc giá */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-900">Chi Tiết Từng Bậc Giá ({tiers.length} bậc):</span>
              <span className="text-[11px] text-slate-500">Có thể gõ đổi trực tiếp đơn giá từng bậc</span>
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
              {tiers.map((tier, idx) => (
                <div key={idx} className="p-3 bg-white flex items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 font-black text-[11px] flex items-center justify-center shrink-0">
                      {tier.tier_number}
                    </span>
                    <div>
                      <span className="font-bold text-slate-800">{tier.name}</span>
                      <span className="text-[11px] text-slate-400 block">
                        Định mức: {tier.from_kwh} - {tier.to_kwh !== null ? `${tier.to_kwh} kWh` : 'Vô cực'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={tier.unit_price}
                      onChange={(e) => handleUpdateTierPrice(idx, Number(e.target.value))}
                      className="w-24 p-1.5 rounded-lg border border-slate-300 text-right font-bold text-xs focus:border-amber-500"
                    />
                    <span className="text-xs text-slate-500 font-medium">đ/kWh</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Giả lập tính toán theo thời gian thực (Interactive Simulator) */}
          <div className="p-5 rounded-2xl bg-slate-900 text-white space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-black text-white">Giả Lập Tính Tiền Điện Trực Tiếp</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-300">Nhập số kWh test:</span>
                <input
                  type="number"
                  value={testUsage}
                  onChange={(e) => setTestUsage(Math.max(0, Number(e.target.value)))}
                  className="w-20 p-1.5 rounded-lg bg-white/10 border border-white/20 text-white font-bold text-xs text-center outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* Kết quả giả lập */}
            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pb-2">
                {simResult.breakdown.map((b) => (
                  <div key={b.tierNumber} className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                    <span className="text-[10px] text-amber-300 font-bold block">{b.name}</span>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300">{b.consumed} kWh × {formatPrice(b.unitPrice)}</span>
                      <span className="font-bold text-white">{formatPrice(b.subtotal)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-white/10">
                <div>
                  <span className="text-xs text-slate-300 block">Tổng tiền điện khách phải đóng:</span>
                  <span className="text-xl font-black text-amber-400">{formatPrice(simResult.totalCost)}</span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-400 block">Đơn giá trung bình thực tế:</span>
                  <span className="text-xs font-bold text-emerald-400">
                    {formatPrice(simResult.effectiveRate)} / kWh
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={onClose}>
            Đóng
          </Button>
          <Button variant="primary" size="sm" isLoading={isSaving} onClick={handleSaveConfig}>
            Lưu & Áp Dụng Biểu Giá
          </Button>
        </div>
      </div>
    </div>
  );
};

