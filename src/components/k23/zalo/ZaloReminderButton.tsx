import React, { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { ZaloReminderModal } from './ZaloReminderModal';
import { Invoice } from '../../../types/k23';
import { extractZaloDataFromInvoice, ZaloMessageData } from '../../../utils/zaloTemplateBuilder';

interface ZaloReminderButtonProps {
  invoice?: Invoice;
  customData?: ZaloMessageData;
  className?: string;
  variant?: 'primary' | 'outline' | 'subtle';
  size?: 'sm' | 'md';
}

export const ZaloReminderButton: React.FC<ZaloReminderButtonProps> = ({
  invoice,
  customData,
  className = '',
  variant = 'outline',
  size = 'sm',
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const data: ZaloMessageData = customData || (invoice ? extractZaloDataFromInvoice(invoice) : {
    tenantName: 'Khách thuê',
    tenantPhone: '',
    roomNumber: 'Phòng trọ',
    billingMonth: 11,
    billingYear: 2026,
    totalAmount: 0,
    dueDate: '10/11/2026',
    invoiceCode: 'HD-202611-000',
  });

  const baseStyle =
    size === 'sm'
      ? 'px-3 py-1.5 text-xs rounded-xl font-bold inline-flex items-center gap-1.5 transition cursor-pointer'
      : 'px-4 py-2.5 text-xs rounded-2xl font-bold inline-flex items-center gap-2 transition cursor-pointer';

  const variantStyle =
    variant === 'primary'
      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
      : variant === 'subtle'
      ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200'
      : 'bg-white hover:bg-blue-50/50 text-blue-700 border border-blue-300 hover:border-blue-400';

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`${baseStyle} ${variantStyle} ${className}`}
        title="Gửi tin nhắn thông báo tiền phòng qua Zalo"
      >
        <MessageSquare className="w-3.5 h-3.5 text-blue-600 shrink-0" />
        <span>Nhắc Zalo</span>
      </button>

      <ZaloReminderModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        data={data}
      />
    </>
  );
};

