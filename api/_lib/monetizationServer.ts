import crypto from 'node:crypto';
import {
  WALLET_BANK_CONFIG,
  WALLET_MOMO_CONFIG,
  buildVietQrImageUrl,
} from './walletServer.js';

export const XU_TO_VND_RATE = 1000;

export type ServiceOrderType = 'listing_plan' | 'boost' | 'k23' | 'repost';

export const SERVER_LISTING_PLANS: Record<
  string,
  { id: string; name: string; billingType: 'one_time' | 'subscription'; priceXu: number; yearlyPriceXu?: number }
> = {
  single_15d: { id: 'single_15d', name: 'Đăng tin lẻ 15 ngày', billingType: 'one_time', priceXu: 30 },
  single_30d: { id: 'single_30d', name: 'Đăng tin lẻ 30 ngày', billingType: 'one_time', priceXu: 50 },
  featured: {
    id: 'featured',
    name: 'Tin nổi bật',
    billingType: 'subscription',
    priceXu: 149,
    yearlyPriceXu: 1430,
  },
  pro: {
    id: 'pro',
    name: 'Gói Pro',
    billingType: 'subscription',
    priceXu: 450,
    yearlyPriceXu: 4320,
  },
};

export const SERVER_BOOST_PACKAGES: Record<string, { id: string; name: string; priceXu: number; days: number }> = {
  single: { id: 'single', name: 'Đẩy Lẻ 1 Ngày', priceXu: 15, days: 1 },
  '3days': { id: '3days', name: 'Đẩy Top 3 Ngày', priceXu: 29, days: 3 },
  '7days': { id: '7days', name: 'Đẩy Giờ Vàng 7 Ngày', priceXu: 59, days: 7 },
  '30days': { id: '30days', name: 'VIP Toàn Diện 30 Ngày', priceXu: 199, days: 30 },
};

export const SERVER_K23_PLANS: Record<string, { code: string; name: string; priceMonthlyXu: number; priceYearlyXu: number }> = {
  basic: { code: 'basic', name: 'Cơ Bản', priceMonthlyXu: 49, priceYearlyXu: 490 },
  standard: { code: 'standard', name: 'Tiêu Chuẩn', priceMonthlyXu: 129, priceYearlyXu: 1290 },
  chain: { code: 'chain', name: 'Chuỗi', priceMonthlyXu: 299, priceYearlyXu: 2990 },
};

export function resolveCouponDiscountPercent(code?: string | null): number {
  const cleaned = String(code || '').trim().toUpperCase();
  if (cleaned === 'TROXINH50' || cleaned === 'TROXINH') return 50;
  if (cleaned === 'CHUTROVIP') return 25;
  if (cleaned === 'SINHVIEN' || cleaned === 'CHUTRO') return 20;
  if (cleaned === 'BANMOI') return 10;
  return 0;
}

export function generateServiceOrderCode(serviceType: ServiceOrderType): string {
  const prefixMap: Record<ServiceOrderType, string> = {
    listing_plan: 'TXGOI',
    boost: 'TXBST',
    k23: 'TXK23',
    repost: 'TXGHN',
  };
  const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `${prefixMap[serviceType]}${randomHex}`;
}

export function buildPaymentQrAndReceiver(
  method: 'vietqr' | 'momo',
  amountVnd: number,
  orderCode: string
) {
  const qrCode =
    method === 'momo'
      ? buildVietQrImageUrl(
          WALLET_MOMO_CONFIG.vietQrBankId,
          WALLET_MOMO_CONFIG.phoneNumber,
          amountVnd,
          orderCode,
          WALLET_MOMO_CONFIG.receiverName
        )
      : buildVietQrImageUrl(
          WALLET_BANK_CONFIG.vietQrBankId,
          WALLET_BANK_CONFIG.accountNumber,
          amountVnd,
          orderCode,
          WALLET_BANK_CONFIG.accountName
        );

  const deeplink =
    method === 'momo'
      ? `momo://app?action=pay&amount=${amountVnd}&receiver=${WALLET_MOMO_CONFIG.phoneNumber}&comment=${encodeURIComponent(
          orderCode
        )}`
      : undefined;

  const receiverInfo =
    method === 'momo'
      ? {
          bankName: WALLET_MOMO_CONFIG.providerName,
          accountNumber: WALLET_MOMO_CONFIG.phoneNumber,
          accountNumberLabel: 'Số ví MoMo nhận',
          accountName: WALLET_MOMO_CONFIG.receiverName,
        }
      : {
          bankName: WALLET_BANK_CONFIG.bankShortName,
          accountNumber: WALLET_BANK_CONFIG.accountNumber,
          accountNumberLabel: 'Số tài khoản',
          accountName: WALLET_BANK_CONFIG.accountName,
        };

  return { qrCode, deeplink, receiverInfo };
}

