import React, { useState } from 'react';
import { generateVietQrUrl, POPULAR_BANKS } from '../../lib/vietqr';
import { Check, Copy, QrCode } from 'lucide-react';

interface Props {
  bankId: string;
  accountNo: string;
  accountName?: string;
  amount: number;
  description: string;
  className?: string;
}

export const VietQRCode: React.FC<Props> = ({
  bankId,
  accountNo,
  accountName = '',
  amount,
  description,
  className = '',
}) => {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const qrUrl = generateVietQrUrl({
    bankId,
    accountNo,
    accountName,
    amount,
    description,
    template: 'compact2',
  });

  const bank = POPULAR_BANKS.find((b) => b.id.toUpperCase() === bankId.toUpperCase()) || {
    id: bankId,
    shortName: bankId,
    name: bankId,
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (!bankId || !accountNo) {
    return (
      <div className={`p-4 rounded-xl border border-dashed border-amber-300 bg-amber-50 dark:bg-amber-950/20 text-center ${className}`}>
        <QrCode className="w-8 h-8 text-amber-500 mx-auto mb-2" />
        <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
          Chưa cài đặt tài khoản ngân hàng nhận tiền
        </p>
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
          Vào mục Cài đặt dịch vụ để điền STK & Ngân hàng
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm ${className}`}>
      <div className="flex flex-col sm:flex-row items-center gap-4">
        {/* QR Image */}
        <div className="w-44 h-44 flex-shrink-0 bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex items-center justify-center">
          <img
            src={qrUrl}
            alt="VietQR Chuyển khoản"
            className="w-full h-full object-contain"
            loading="lazy"
          />
        </div>

        {/* Transfer Details */}
        <div className="flex-1 w-full space-y-2 text-xs">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400">Ngân hàng:</span>
            <span className="font-semibold text-slate-800 dark:text-slate-100">{bank.shortName}</span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400">Số tài khoản:</span>
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                {accountNo}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(accountNo, 'accountNo')}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500"
                title="Sao chép STK"
              >
                {copiedField === 'accountNo' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          {accountName && (
            <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400">Chủ tài khoản:</span>
              <span className="font-semibold uppercase text-slate-800 dark:text-slate-200">
                {accountName}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800">
            <span className="text-slate-500 dark:text-slate-400">Số tiền:</span>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-rose-600 text-sm">
                {amount.toLocaleString('vi-VN')} đ
              </span>
              <button
                type="button"
                onClick={() => handleCopy(amount.toString(), 'amount')}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500"
                title="Sao chép số tiền"
              >
                {copiedField === 'amount' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-slate-500 dark:text-slate-400">Nội dung:</span>
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                {description}
              </span>
              <button
                type="button"
                onClick={() => handleCopy(description, 'description')}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-500"
                title="Sao chép nội dung"
              >
                {copiedField === 'description' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
      <p className="text-[11px] text-center text-slate-400 dark:text-slate-500 mt-3 italic">
        Quét mã QR bằng ứng dụng ngân hàng bất kỳ để chuyển khoản đúng số tiền và nội dung
      </p>
    </div>
  );
};

