export type TariffType = 'electricity' | 'water';

export interface TariffTier {
  tier_number: number;
  name: string;
  from_kwh: number;
  to_kwh: number | null; // null biểu thị vô cực
  unit_price: number;
}

export interface TieredTariff {
  id: string;
  building_id: string;
  owner_id: string;
  tariff_type: TariffType;
  effective_from: string; // YYYY-MM-DD
  effective_to?: string | null;
  tier_rules: TariffTier[];
  is_active: boolean;
  created_at?: string;
}

export interface TierCalculationBreakdown {
  tierNumber: number;
  name: string;
  consumed: number;
  unitPrice: number;
  subtotal: number;
}

export interface TierCalculationResult {
  totalUsage: number;
  totalCost: number;
  breakdown: TierCalculationBreakdown[];
  effectiveRate: number; // Đơn giá trung bình thực tế mỗi số
}

export interface MeterValidationResult {
  isValid: boolean;
  isSpike: boolean;
  errorMessage?: string;
  warningMessage?: string;
  usage: number;
  spikeRatio?: number;
}

