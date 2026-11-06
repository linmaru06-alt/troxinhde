import { LateFeeConfig, LateFeeCalculationResult, DEFAULT_LATE_FEE_CONFIG } from '../types/k23LateFee';

/**
 * Tính toán tiền phạt chậm nộp tiền phòng tự động
 */
export function calculateLateFee(
  totalDue: number,
  dueDateStr: string,
  asOfDateStr: string = new Date().toISOString().split('T')[0],
  config: LateFeeConfig = DEFAULT_LATE_FEE_CONFIG
): LateFeeCalculationResult {
  if (!config.enabled || totalDue <= 0) {
    return {
      isOverdue: false,
      overdueDays: 0,
      chargeableDays: 0,
      lateFeeAmount: 0,
      explanation: 'Tính năng phạt chậm nộp đang tắt.',
    };
  }

  const dueDate = new Date(dueDateStr);
  const asOfDate = new Date(asOfDateStr);
  dueDate.setHours(0, 0, 0, 0);
  asOfDate.setHours(0, 0, 0, 0);

  const diffTime = asOfDate.getTime() - dueDate.getTime();
  const overdueDays = Math.max(0, Math.round(diffTime / (1000 * 60 * 60 * 24)));

  if (overdueDays <= 0) {
    return {
      isOverdue: false,
      overdueDays: 0,
      chargeableDays: 0,
      lateFeeAmount: 0,
      explanation: 'Hóa đơn chưa đến hạn thanh toán.',
    };
  }

  // Nếu vẫn trong thời gian ân hạn
  if (overdueDays <= config.grace_period_days) {
    return {
      isOverdue: true,
      overdueDays,
      chargeableDays: 0,
      lateFeeAmount: 0,
      explanation: `Quá hạn ${overdueDays} ngày (Đang trong thời gian ân hạn ${config.grace_period_days} ngày, miễn phạt).`,
    };
  }

  const chargeableDays = overdueDays - config.grace_period_days;
  let rawFee = 0;

  if (config.fee_type === 'fixed') {
    rawFee = config.fixed_amount;
  } else if (config.fee_type === 'daily_amount') {
    rawFee = chargeableDays * config.daily_amount;
  } else if (config.fee_type === 'daily_rate') {
    rawFee = Math.round((totalDue * (config.daily_rate_percent / 100)) * chargeableDays);
  }

  if (config.max_cap_amount && config.max_cap_amount > 0) {
    rawFee = Math.min(rawFee, config.max_cap_amount);
  }

  const lateFeeAmount = Math.round(rawFee / 1000) * 1000;

  return {
    isOverdue: true,
    overdueDays,
    chargeableDays,
    lateFeeAmount,
    explanation: `Quá hạn ${overdueDays} ngày (Trừ ${config.grace_period_days} ngày ân hạn = Tính phạt ${chargeableDays} ngày). Phạt: ${lateFeeAmount.toLocaleString('vi-VN')}đ`,
  };
}

