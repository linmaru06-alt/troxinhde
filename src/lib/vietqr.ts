export interface BankInfo {
  id: string;
  name: string;
  shortName: string;
  code: string;
}

export const POPULAR_BANKS: BankInfo[] = [
  { id: 'MB', name: 'Ngân hàng Quân Đội', shortName: 'MBBank', code: '970422' },
  { id: 'VCB', name: 'Ngân hàng Ngoại Thương VN', shortName: 'Vietcombank', code: '970436' },
  { id: 'TCB', name: 'Ngân hàng Kỹ Thương VN', shortName: 'Techcombank', code: '970407' },
  { id: 'ACB', name: 'Ngân hàng Á Châu', shortName: 'ACB', code: '970416' },
  { id: 'VPB', name: 'Ngân hàng Việt Nam Thịnh Vượng', shortName: 'VPBank', code: '970432' },
  { id: 'TPB', name: 'Ngân hàng Tiên Phong', shortName: 'TPBank', code: '970423' },
  { id: 'BIDV', name: 'Ngân hàng Đầu tư & Phát triển VN', shortName: 'BIDV', code: '970418' },
  { id: 'ICB', name: 'Ngân hàng Công Thương VN', shortName: 'VietinBank', code: '970415' },
  { id: 'VIB', name: 'Ngân hàng Quốc Tế', shortName: 'VIB', code: '970441' },
  { id: 'STB', name: 'Ngân hàng Sài Gòn Thương Tín', shortName: 'Sacombank', code: '970403' },
  { id: 'HDB', name: 'Ngân hàng Phát triển TP.HCM', shortName: 'HDBank', code: '970437' },
  { id: 'SHB', name: 'Ngân hàng Sài Gòn - Hà Nội', shortName: 'SHB', code: '970443' },
];

export interface VietQrOptions {
  bankId: string;
  accountNo: string;
  accountName?: string;
  amount: number;
  description: string;
  template?: 'compact' | 'compact2' | 'qr_only' | 'print';
}

/**
 * Generate standard VietQR image URL from VietQR.io CDN
 */
export function generateVietQrUrl(options: VietQrOptions): string {
  const {
    bankId,
    accountNo,
    accountName = '',
    amount,
    description,
    template = 'compact2',
  } = options;

  if (!bankId || !accountNo) return '';

  const cleanAmount = Math.max(0, Math.round(amount));
  const safeDesc = encodeURIComponent(description.slice(0, 50));
  const safeName = encodeURIComponent(accountName.slice(0, 50));

  return `https://img.vietqr.io/image/${bankId}-${accountNo}-${template}.png?amount=${cleanAmount}&addInfo=${safeDesc}&accountName=${safeName}`;
}

