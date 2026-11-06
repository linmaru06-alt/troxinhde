export type LateFeeType = 'fixed' | 'daily_amount' | 'daily_rate';

export interface LateFeeConfig {
  enabled: boolean;
  grace_period_days: number; // Số ngày ân hạn (ví dụ: 3 ngày)
  fee_type: LateFeeType;
  fixed_amount: number; // Ví dụ: 50.000đ / lần trễ
  daily_amount: number; // Ví dụ: 20.000đ / ngày trễ
  daily_rate_percent: number; // Ví dụ: 0.5% / ngày
  max_cap_amount?: number; // Mức phạt tối đa (ví dụ: 500.000đ)
}

export interface LateFeeCalculationResult {
  isOverdue: boolean;
  overdueDays: number;
  chargeableDays: number; // Số ngày thực tế bị tính phạt (sau khi trừ ngày ân hạn)
  lateFeeAmount: number;
  explanation: string;
}

export const DEFAULT_LATE_FEE_CONFIG: LateFeeConfig = {
  enabled: true,
  grace_period_days: 3, // Ân hạn 3 ngày sau hạn đóng
  fee_type: 'daily_amount',
  fixed_amount: 50000,
  daily_amount: 20000, // 20.000đ / ngày trễ
  daily_rate_percent: 0.5,
  max_cap_amount: 300000,
};

