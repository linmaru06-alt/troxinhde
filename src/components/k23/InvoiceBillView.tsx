import React, { forwardRef } from 'react';
import { Invoice } from '../../types/k23';
import { VietQRCode } from './VietQRCode';
import { InvoiceStatusBadge } from './InvoiceStatusBadge';
import { Home, Calendar, Phone, MapPin } from 'lucide-react';

interface Props {
  invoice: Invoice;
  buildingName?: string;
  buildingAddress?: string;
  ownerName?: string;
  ownerPhone?: string;
  bankId?: string;
  bankAccountNo?: string;
  bankAccountName?: string;
}

export const InvoiceBillView = forwardRef<HTMLDivElement, Props>(
  (
    {
      invoice,
      buildingName = 'Nhà trọ',
      buildingAddress = '',
      ownerName = '',
      ownerPhone = '',
      bankId = 'MB',
      bankAccountNo = '',
      bankAccountName = '',
    },
    ref
  ) => {
    const roomTitle = invoice.room?.room_number
      ? `Phòng ${invoice.room.room_number}`
      : invoice.room?.title || 'Phòng thuê';
    const tenantName = invoice.tenant?.full_name || 'Khách thuê';
    const tenantPhone = invoice.tenant?.phone || '';
    const transferNote = `TROXINH ${invoice.invoice_code}`;

    return (
      <div
        ref={ref}
        className="w-full max-w-xl mx-auto bg-white text-slate-900 p-6 sm:p-8 rounded-2xl shadow-lg border border-slate-200 font-sans"
        style={{ minWidth: '320px' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 pb-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
                <Home className="w-4 h-4" />
              </div>
              <h2 className="font-bold text-lg text-slate-900 tracking-tight">
                {buildingName}
              </h2>
            </div>
            {buildingAddress && (
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                {buildingAddress}
              </p>
            )}
            {ownerPhone && (
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <Phone className="w-3 h-3 flex-shrink-0" />
                Hotline: {ownerPhone} {ownerName && `(${ownerName})`}
              </p>
            )}
          </div>

          <div className="text-right">
            <span className="text-[11px] font-mono text-slate-400 block">
              #{invoice.invoice_code}
            </span>
            <div className="mt-1">
              <InvoiceStatusBadge status={invoice.status} />
            </div>
          </div>
        </div>

        {/* Bill Title */}
        <div className="text-center my-4">
          <h1 className="text-xl font-extrabold uppercase text-slate-900 tracking-wide">
            Hóa Đơn Tiền Nhà
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center justify-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            Kỳ thanh toán: Tháng {invoice.billing_month}/{invoice.billing_year}
          </p>
        </div>

        {/* Room & Tenant Meta */}
        <div className="bg-slate-50 rounded-xl p-3 mb-5 border border-slate-100 grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-slate-500 block">Phòng thuê:</span>
            <span className="font-bold text-slate-900 text-sm">{roomTitle}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Người đại diện thuê:</span>
            <span className="font-semibold text-slate-900">
              {tenantName} {tenantPhone && `(${tenantPhone})`}
            </span>
          </div>
          {invoice.due_date && (
            <div className="col-span-2 pt-1 border-t border-slate-200/60 flex justify-between items-center">
              <span className="text-slate-500">Hạn thanh toán:</span>
              <span className="font-semibold text-rose-600">
                {new Date(invoice.due_date).toLocaleDateString('vi-VN')}
              </span>
            </div>
          )}
        </div>

        {/* Breakdown Items Table */}
        <div className="mb-5 overflow-hidden rounded-xl border border-slate-200">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-600 uppercase font-semibold text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Khoản mục</th>
                <th className="py-2.5 px-2 text-center">SL</th>
                <th className="py-2.5 px-2 text-right">Đơn giá</th>
                <th className="py-2.5 px-3 text-right">Thành tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoice.items && invoice.items.length > 0 ? (
                invoice.items.map((it, idx) => (
                  <tr key={it.id || idx} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 font-medium text-slate-800">
                      {it.description}
                    </td>
                    <td className="py-2.5 px-2 text-center text-slate-500">
                      {it.quantity}
                    </td>
                    <td className="py-2.5 px-2 text-right text-slate-600 font-mono">
                      {it.unit_price.toLocaleString('vi-VN')} đ
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-bold font-mono ${
                        it.amount < 0 ? 'text-emerald-600' : 'text-slate-900'
                      }`}
                    >
                      {it.amount.toLocaleString('vi-VN')} đ
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-slate-400">
                    Chưa có khoản mục chi tiết
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Total calculation */}
        <div className="bg-emerald-50/60 rounded-xl p-4 border border-emerald-100 mb-5 space-y-1.5 text-xs">
          <div className="flex justify-between items-center text-slate-600">
            <span>Tổng cộng các khoản:</span>
            <span className="font-semibold font-mono text-slate-800">
              {invoice.total_amount.toLocaleString('vi-VN')} đ
            </span>
          </div>

          {invoice.paid_amount > 0 && (
            <div className="flex justify-between items-center text-emerald-700">
              <span>Đã thanh toán trước:</span>
              <span className="font-semibold font-mono">
                - {invoice.paid_amount.toLocaleString('vi-VN')} đ
              </span>
            </div>
          )}

          <div className="flex justify-between items-center pt-2 border-t border-emerald-200 text-sm font-extrabold">
            <span className="text-slate-900">SỐ TIỀN CẦN THANH TOÁN:</span>
            <span className="text-rose-600 text-base font-mono">
              {(invoice.remaining ?? Math.max(0, invoice.total_amount - (invoice.paid_amount || 0))).toLocaleString(
                'vi-VN'
              )}{' '}
              đ
            </span>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 text-xs mb-5">
            <span className="font-semibold">Ghi chú từ chủ trọ:</span> {invoice.notes}
          </div>
        )}

        {/* VietQR Section */}
        {bankAccountNo && (
          <div className="mt-4">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 text-center">
              Thông Tin Chuyển Khoản Nhanh
            </h3>
            <VietQRCode
              bankId={bankId}
              accountNo={bankAccountNo}
              accountName={bankAccountName}
              amount={invoice.remaining || invoice.total_amount}
              description={transferNote}
            />
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-100 text-center text-[11px] text-slate-400">
          <p>Cảm ơn bạn đã luôn đồng hành cùng {buildingName}!</p>
          <p className="mt-0.5">Hệ thống quản lý phòng trọ K23 — Trọ Xinh</p>
        </div>
      </div>
    );
  }
);

InvoiceBillView.displayName = 'InvoiceBillView';

