import {
  TariffTier,
  TieredTariff,
  TierCalculationResult,
  TierCalculationBreakdown,
  MeterValidationResult,
} from '../types/k23Tariffs';

/**
 * Biểu giá điện sinh hoạt 6 bậc chuẩn Nhà Nước (EVN)
 */
export const EVN_STANDARD_TIERS: TariffTier[] = [
  { tier_number: 1, name: 'Bậc 1 (0 - 50 kWh)', from_kwh: 0, to_kwh: 50, unit_price: 1806 },
  { tier_number: 2, name: 'Bậc 2 (51 - 100 kWh)', from_kwh: 51, to_kwh: 100, unit_price: 1866 },
  { tier_number: 3, name: 'Bậc 3 (101 - 200 kWh)', from_kwh: 101, to_kwh: 200, unit_price: 2167 },
  { tier_number: 4, name: 'Bậc 4 (201 - 300 kWh)', from_kwh: 201, to_kwh: 300, unit_price: 2729 },
  { tier_number: 5, name: 'Bậc 5 (301 - 400 kWh)', from_kwh: 301, to_kwh: 400, unit_price: 3050 },
  { tier_number: 6, name: 'Bậc 6 (Từ 401 kWh trở lên)', from_kwh: 401, to_kwh: null, unit_price: 3151 },
];

/**
 * Biểu giá điện bậc thang kinh doanh nhà trọ (3 bậc lũy tiến)
 */
export const LANDLORD_TIERED_PRESET: TariffTier[] = [
  { tier_number: 1, name: 'Bậc Tiết Kiệm (0 - 80 kWh)', from_kwh: 0, to_kwh: 80, unit_price: 3200 },
  { tier_number: 2, name: 'Bậc Tiêu Chuẩn (81 - 200 kWh)', from_kwh: 81, to_kwh: 200, unit_price: 3800 },
  { tier_number: 3, name: 'Bậc Tiêu Thụ Cao (> 200 kWh)', from_kwh: 201, to_kwh: null, unit_price: 4300 },
];

/**
 * Thuật toán tính tiền điện theo bậc thang lũy tiến
 * @param usageKwh Số kWh tiêu thụ thực tế trong tháng
 * @param tiers Danh sách các bậc giá
 */
export function calculateTieredElectricity(
  usageKwh: number,
  tiers: TariffTier[] = LANDLORD_TIERED_PRESET
): TierCalculationResult {
  if (usageKwh <= 0) {
    return {
      totalUsage: 0,
      totalCost: 0,
      breakdown: [],
      effectiveRate: 0,
    };
  }

  // Sắp xếp các bậc theo mức bắt đầu tăng dần
  const sortedTiers = [...tiers].sort((a, b) => a.from_kwh - b.from_kwh);
  const breakdown: TierCalculationBreakdown[] = [];
  let remainingUsage = usageKwh;
  let totalCost = 0;

  for (const tier of sortedTiers) {
    if (remainingUsage <= 0) break;

    // Tính dung lượng tối đa của bậc này
    const tierCapacity =
      tier.to_kwh !== null ? Math.max(0, tier.to_kwh - tier.from_kwh + (tier.from_kwh === 0 ? 0 : 1)) : remainingUsage;

    const consumed = Math.min(remainingUsage, tierCapacity);
    const subtotal = Math.round(consumed * tier.unit_price);

    breakdown.push({
      tierNumber: tier.tier_number,
      name: tier.name,
      consumed,
      unitPrice: tier.unit_price,
      subtotal,
    });

    totalCost += subtotal;
    remainingUsage -= consumed;
  }

  return {
    totalUsage: usageKwh,
    totalCost,
    breakdown,
    effectiveRate: usageKwh > 0 ? Math.round(totalCost / usageKwh) : 0,
  };
}

/**
 * Kiểm tra tính hợp lệ của số công tơ và cảnh báo nhảy số bất thường
 */
export function validateMeterReading(
  oldReading: number,
  newReading: number,
  previousMonthUsage?: number
): MeterValidationResult {
  if (newReading < oldReading) {
    return {
      isValid: false,
      isSpike: false,
      usage: 0,
      errorMessage: `Số mới (${newReading}) không thể nhỏ hơn số cũ (${oldReading}). Vui lòng kiểm tra lại công-tơ!`,
    };
  }

  const usage = newReading - oldReading;

  // Nếu có dữ liệu tháng trước và tháng này dùng vọt hơn 180% (gấp 1.8 lần)
  if (previousMonthUsage && previousMonthUsage > 15) {
    const spikeRatio = usage / previousMonthUsage;
    if (spikeRatio >= 1.8) {
      return {
        isValid: true,
        isSpike: true,
        usage,
        spikeRatio,
        warningMessage: `⚠️ Cảnh báo bất thường: Lượng điện tăng vọt ${Math.round(
          spikeRatio * 100
        )}% so với tháng trước (${usage} kWh so với ${previousMonthUsage} kWh). Hãy chụp ảnh đồng hồ để tránh cãi vã!`,
      };
    }
  }

  return {
    isValid: true,
    isSpike: false,
    usage,
  };
}

/**
 * Tìm biểu giá điện có mốc hiệu lực tương ứng với ngày chốt hóa đơn
 */
export function findEffectiveTariff(
  tariffs: TieredTariff[],
  buildingId: string,
  billingDate: string = new Date().toISOString().split('T')[0]
): TieredTariff | null {
  const match = tariffs
    .filter((t) => t.building_id === buildingId && t.is_active)
    .filter((t) => {
      const isAfterStart = t.effective_from <= billingDate;
      const isBeforeEnd = !t.effective_to || t.effective_to >= billingDate;
      return isAfterStart && isBeforeEnd;
    })
    .sort((a, b) => b.effective_from.localeCompare(a.effective_from))[0];

  return match || null;
}

