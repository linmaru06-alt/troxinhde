import React, { forwardRef } from 'react';
import { Invoice, InvoiceItem } from '../../types/k23';
import { generateVietQrUrl, POPULAR_BANKS } from '../../lib/vietqr';
import { convertNumberToVietnameseWords } from '../../utils/numberToVietnameseWords';

interface Props {
  invoice: Invoice;
  buildingName?: string;
  buildingAddress?: string;
  ownerName?: string;
  ownerPhone?: string;
  bankId?: string;
  bankAccountNo?: string;
  bankAccountName?: string;
  bankName?: string;
  customerCode?: string;
  creatorName?: string;
  transferSyntax?: string;
  dueDayNote?: string;
}

interface TableRowData {
  stt: string | number;
  name: string;
  startReading: number | string;
  endReading: number | string;
  multiplier: number | string;
  quantity: number | string;
  unit: string;
  unitPrice: number;
  amount: number;
  note: string;
  isGroupHeader?: boolean;
  isSubRow?: boolean;
}

export const InvoiceBillView = forwardRef<HTMLDivElement, Props>(
  (
    {
      invoice,
      buildingName,
      buildingAddress,
      ownerName,
      ownerPhone,
      bankId = 'VPB',
      bankAccountNo = '813823888',
      bankAccountName = 'NGUYỄN TÙNG LÂM',
      bankName = 'Ngân hàng TMCP Việt Nam Thịnh Vượng - VPBank',
      customerCode,
      creatorName = 'Phạm Vũ Hoàng Anh',
      transferSyntax,
      dueDayNote,
    },
    ref
  ) => {
    // 1. Phân giải thông tin hiển thị cơ bản
    const roomNumber =
      invoice.room?.room_number?.replace(/^P\.?/i, '').trim() ||
      invoice.room?.title?.replace(/[^0-9]/g, '') ||
      '403';
    const displayBuildingName = buildingName || 'GIAHUNG - 58TB';
    const displayAddress =
      buildingAddress || '1-55/58 ngõ 58 Thanh Bình, Hà Đông, Hà Nội';
    const displayHotlines = ownerPhone || '0989368836 / 0985488834';
    const tenantName = invoice.tenant?.full_name || 'Nguyễn Thị Vui';
    const tenantPhone = invoice.tenant?.phone || '0977627495';
    const custCode = customerCode || `GH-${roomNumber.padStart(6, '0')}`;

    // Tìm thông tin ngân hàng chuẩn
    const matchedBank = POPULAR_BANKS.find(
      (b) => b.id.toUpperCase() === bankId.toUpperCase()
    );
    const displayBankName = bankName || matchedBank?.name || bankId;

    // Cú pháp chuyển khoản chuẩn (ví dụ: 58TB-403-11)
    const defaultTransferCode = `58TB-${roomNumber}-${invoice.billing_month}`;
    const codeToTransfer = transferSyntax || invoice.invoice_code || defaultTransferCode;

    // Số tiền cần thanh toán
    const totalAmount = invoice.remaining ?? invoice.total_amount ?? 5821000;
    const amountInWords = convertNumberToVietnameseWords(totalAmount);

    // Ngày tạo hóa đơn / in ấn
    const invoiceDate = invoice.created_at ? new Date(invoice.created_at) : new Date();
    const formattedPrintDate = invoiceDate.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const formattedPrintTime = `${formattedPrintDate} 15:03:43 (GMT+7)`;

    // 2. Tự động bóc tách các dòng khoản thu chuẩn kế toán
    const rows: TableRowData[] = [];
    const items = invoice.items || [];

    // Phân loại items từ invoice
    const rentItem = items.find((i) => i.item_type === 'rent' || /thuê|phòng/i.test(i.description));
    const elecItem = items.find((i) => /điện/i.test(i.description));
    const waterItem = items.find((i) => /nước/i.test(i.description));
    const serviceItems = items.filter(
      (i) => i !== rentItem && i !== elecItem && i !== waterItem && i.item_type !== 'deduction'
    );
    const extraItem = items.find((i) => i.item_type === 'deduction' || /giảm trừ|sửa chữa|thu thêm/i.test(i.description));

    // Helper trích xuất chỉ số điện/nước từ chuỗi (ví dụ: "11.318 ➔ 11.577" hoặc "1450 -> 1520")
    const extractMeterReadings = (desc?: string, qty: number = 0) => {
      if (!desc) return { start: 0, end: 0 };
      const match = desc.match(/([\d\.,]+)\s*(?:➔|->|-|đến)\s*([\d\.,]+)/);
      if (match) {
        const start = parseFloat(match[1].replace(/\./g, '').replace(/,/g, '.'));
        const end = parseFloat(match[2].replace(/\./g, '').replace(/,/g, '.'));
        return { start, end };
      }
      return { start: 0, end: qty };
    };

    // 1. Tiền thuê phòng
    const rentPrice = rentItem ? rentItem.unit_price : invoice.room?.price || 3800000;
    const rentAmount = rentItem ? rentItem.amount : rentPrice;
    rows.push({
      stt: 1,
      name: `Tiền thuê phòng T${invoice.billing_month}/${invoice.billing_year}`,
      startReading: 0,
      endReading: 0,
      multiplier: 1,
      quantity: rentItem ? rentItem.quantity : 1,
      unit: 'Tháng',
      unitPrice: rentPrice,
      amount: rentAmount,
      note: '',
    });

    // 2. Tiền điện
    const prevMonth = invoice.billing_month === 1 ? 12 : invoice.billing_month - 1;
    const prevYear = invoice.billing_month === 1 ? invoice.billing_year - 1 : invoice.billing_year;
    const elecPrice = elecItem ? elecItem.unit_price : 4000;
    const elecQty = elecItem ? elecItem.quantity : 259;
    const elecAmount = elecItem ? elecItem.amount : elecPrice * elecQty;
    const elecReadings = extractMeterReadings(elecItem?.description, elecQty);
    rows.push({
      stt: 2,
      name: `Tiền điện T${prevMonth}/${prevYear}`,
      startReading: elecReadings.start > 0 ? elecReadings.start.toLocaleString('vi-VN') : '11.318',
      endReading: elecReadings.end > 0 ? elecReadings.end.toLocaleString('vi-VN') : '11.577',
      multiplier: 1,
      quantity: elecQty,
      unit: 'KWh',
      unitPrice: elecPrice,
      amount: elecAmount,
      note: '',
    });

    // 3. Tiền nước
    const waterPrice = waterItem ? waterItem.unit_price : 35000;
    const waterQty = waterItem ? waterItem.quantity : 11;
    const waterAmount = waterItem ? waterItem.amount : waterPrice * waterQty;
    const waterReadings = extractMeterReadings(waterItem?.description, waterQty);
    rows.push({
      stt: 3,
      name: `Tiền nước T${prevMonth}/${prevYear}`,
      startReading: waterReadings.start > 0 ? waterReadings.start.toLocaleString('vi-VN') : '456',
      endReading: waterReadings.end > 0 ? waterReadings.end.toLocaleString('vi-VN') : '467',
      multiplier: 1,
      quantity: waterQty,
      unit: 'm3',
      unitPrice: waterPrice,
      amount: waterAmount,
      note: '',
    });

    // 4. Tiền dịch vụ
    rows.push({
      stt: 4,
      name: 'Tiền dịch vụ:',
      startReading: '',
      endReading: '',
      multiplier: '',
      quantity: '',
      unit: '',
      unitPrice: 0,
      amount: 0,
      note: '',
      isGroupHeader: true,
    });

    if (serviceItems.length > 0) {
      serviceItems.forEach((it) => {
        let detectedUnit = 'Phòng';
        if (/xe/i.test(it.description)) detectedUnit = 'Xe';
        else if (/người/i.test(it.description)) detectedUnit = 'Người';
        else if (/rác|vệ sinh/i.test(it.description)) detectedUnit = 'Người';
        else if (/wifi|internet|mạng/i.test(it.description)) detectedUnit = 'Phòng';

        rows.push({
          stt: '-',
          name: `${it.description.replace(/\(.*\)/, '').trim()} T${invoice.billing_month}/${invoice.billing_year}`,
          startReading: 0,
          endReading: 0,
          multiplier: 1,
          quantity: it.quantity,
          unit: detectedUnit,
          unitPrice: it.unit_price,
          amount: it.amount,
          note: '',
          isSubRow: true,
        });
      });
    } else {
      // Dịch vụ mẫu chuẩn theo ảnh
      rows.push({
        stt: '-',
        name: `Internet T${invoice.billing_month}/${invoice.billing_year}`,
        startReading: 0,
        endReading: 0,
        multiplier: 1,
        quantity: 0,
        unit: 'Phòng',
        unitPrice: 0,
        amount: 0,
        note: '',
        isSubRow: true,
      });
      rows.push({
        stt: '-',
        name: `Trông xe, bảo vệ T${invoice.billing_month}/${invoice.billing_year}`,
        startReading: 0,
        endReading: 0,
        multiplier: 1,
        quantity: 2,
        unit: 'Xe',
        unitPrice: 0,
        amount: 0,
        note: '',
        isSubRow: true,
      });
      rows.push({
        stt: '-',
        name: `Dịch vụ chung T${invoice.billing_month}/${invoice.billing_year}`,
        startReading: 0,
        endReading: 0,
        multiplier: 1,
        quantity: 4,
        unit: 'Người',
        unitPrice: 150000,
        amount: 600000,
        note: '',
        isSubRow: true,
      });
    }

    // 5. Sửa chữa/Giảm trừ/Thu thêm
    rows.push({
      stt: 5,
      name: extraItem ? extraItem.description : 'Sửa chữa/Giảm trừ/Thu thêm',
      startReading: 0,
      endReading: 0,
      multiplier: 1,
      quantity: extraItem ? extraItem.quantity : 0,
      unit: 'Lượt',
      unitPrice: extraItem ? extraItem.unit_price : 0,
      amount: extraItem ? extraItem.amount : 0,
      note: '',
    });

    // 3. Tạo link VietQR động chuẩn in ấn (chỉ lấy mã QR Code vuông sạch)
    const qrOnlyUrl = generateVietQrUrl({
      bankId,
      accountNo: bankAccountNo,
      accountName: bankAccountName,
      amount: totalAmount,
      description: codeToTransfer,
      template: 'qr_only',
    });

    // Hạn thanh toán
    const dueDayText = dueDayNote || 'mùng 1';

    return (
      <div
        ref={ref}
        className="w-full max-w-[760px] mx-auto bg-white text-slate-900 p-6 sm:p-10 font-sans shadow-md border border-slate-200 select-text"
        style={{
          fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif',
          color: '#111827',
          backgroundColor: '#ffffff',
        }}
      >
        {/* ================= PHẦN HEADER THƯƠNG HIỆU ================= */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 pb-2">
          <div>
            <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-1.5">
              <span className="text-[#0284c7]">{displayBuildingName.split('-')[0] || 'GIAHUNG'}</span>
              {displayBuildingName.includes('-') && (
                <span className="text-[#d97706]">-{displayBuildingName.split('-')[1]}</span>
              )}
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-700 mt-0.5">
              Địa chỉ: {displayAddress}
            </p>
            <p className="text-[11px] sm:text-xs text-slate-700 mt-0.5">
              Hotlines: {displayHotlines}
            </p>
          </div>
        </div>

        {/* ================= TIÊU ĐỀ PHIẾU THANH TOÁN ================= */}
        <div className="text-center my-4 sm:my-5">
          <h1 className="text-lg sm:text-2xl font-black text-slate-900 uppercase tracking-wide">
            PHIẾU THANH TOÁN THUÊ PHÒNG
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-slate-700 mt-1">
            Kỳ thu: Tháng {invoice.billing_month} năm {invoice.billing_year}
          </p>
        </div>

        {/* ================= THÔNG TIN KHÁCH THUÊ ================= */}
        <div className="text-xs sm:text-[13px] text-slate-800 space-y-1 mb-4">
          <div className="flex items-center">
            <span className="w-36 text-slate-700">Họ tên khách thuê:</span>
            <span className="font-bold text-slate-950">{tenantName}</span>
          </div>
          <div className="flex items-center">
            <span className="w-36 text-slate-700">Số phòng:</span>
            <span className="font-bold text-slate-950">{roomNumber}</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div className="flex items-center">
              <span className="w-36 text-slate-700">Mã khách hàng:</span>
              <span className="font-semibold text-slate-950">{custCode}</span>
            </div>
            <div className="flex items-center sm:pr-8">
              <span className="text-slate-700 mr-4">Di động:</span>
              <span className="font-semibold text-slate-950">{tenantPhone}</span>
            </div>
          </div>
        </div>

        {/* ================= BẢNG CHI TIẾT CÁC KHOẢN THU ================= */}
        <div className="overflow-x-auto mb-4 border border-slate-700">
          <table
            className="w-full text-[11px] sm:text-xs border-collapse"
            style={{ borderColor: '#334155' }}
          >
            {/* Header màu xanh rêu chuẩn như ảnh */}
            <thead
              className="text-white uppercase font-bold text-center"
              style={{ backgroundColor: '#094d34' }}
            >
              <tr className="border-b border-slate-700">
                <th
                  rowSpan={2}
                  className="py-2 px-1.5 border-r border-slate-700 w-9 text-center"
                >
                  STT
                </th>
                <th
                  rowSpan={2}
                  className="py-2 px-3 border-r border-slate-700 text-center"
                >
                  KHOẢN THU
                </th>
                <th
                  colSpan={3}
                  className="py-1 px-2 border-r border-slate-700 text-center"
                >
                  CHỈ SỐ
                </th>
                <th
                  rowSpan={2}
                  className="py-2 px-2 border-r border-slate-700 w-14 text-center leading-tight"
                >
                  SỐ LƯỢNG
                </th>
                <th
                  rowSpan={2}
                  className="py-2 px-2 border-r border-slate-700 w-12 text-center"
                >
                  ĐVT
                </th>
                <th
                  rowSpan={2}
                  className="py-2 px-2.5 border-r border-slate-700 w-20 text-center"
                >
                  ĐƠN GIÁ
                </th>
                <th
                  rowSpan={2}
                  className="py-2 px-2.5 border-r border-slate-700 w-24 text-center leading-tight"
                >
                  THÀNH TIỀN
                </th>
                <th
                  rowSpan={2}
                  className="py-2 px-2 w-14 text-center"
                >
                  GHI CHÚ
                </th>
              </tr>
              <tr className="border-b border-slate-700 text-[10px] sm:text-[11px]">
                <th className="py-1 px-1.5 border-r border-slate-700 w-12 text-center font-semibold">
                  Đầu
                </th>
                <th className="py-1 px-1.5 border-r border-slate-700 w-12 text-center font-semibold">
                  Cuối
                </th>
                <th className="py-1 px-1 border-r border-slate-700 w-10 text-center font-semibold">
                  Hệ số
                </th>
              </tr>
            </thead>

            {/* Thân bảng */}
            <tbody className="divide-y divide-slate-700 text-slate-900 bg-white">
              {rows.map((row, idx) => {
                if (row.isGroupHeader) {
                  return (
                    <tr key={idx} className="border-b border-slate-700">
                      <td className="py-1.5 px-1.5 text-center font-semibold border-r border-slate-700">
                        {row.stt}
                      </td>
                      <td
                        colSpan={9}
                        className="py-1.5 px-3 font-bold text-slate-900 text-left"
                      >
                        {row.name}
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={idx} className="border-b border-slate-700 hover:bg-slate-50/50">
                    <td className="py-1.5 px-1.5 text-center text-slate-800 border-r border-slate-700">
                      {row.stt}
                    </td>
                    <td
                      className={`py-1.5 px-3 border-r border-slate-700 ${
                        row.isSubRow ? 'pl-6 text-slate-700' : 'font-medium text-slate-900'
                      }`}
                    >
                      {row.name}
                    </td>
                    <td className="py-1.5 px-1 text-center font-mono text-slate-700 border-r border-slate-700">
                      {row.startReading}
                    </td>
                    <td className="py-1.5 px-1 text-center font-mono text-slate-700 border-r border-slate-700">
                      {row.endReading}
                    </td>
                    <td className="py-1.5 px-1 text-center font-mono text-slate-700 border-r border-slate-700">
                      {row.multiplier}
                    </td>
                    <td className="py-1.5 px-1 text-center font-mono text-slate-800 border-r border-slate-700 font-semibold">
                      {row.quantity}
                    </td>
                    <td className="py-1.5 px-1.5 text-center text-slate-700 border-r border-slate-700">
                      {row.unit}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono text-slate-800 border-r border-slate-700">
                      {row.unitPrice > 0 ? row.unitPrice.toLocaleString('vi-VN') : '0'}
                    </td>
                    <td className="py-1.5 px-2 text-right font-mono font-bold text-slate-950 border-r border-slate-700">
                      {row.amount > 0 ? row.amount.toLocaleString('vi-VN') : '0'}
                    </td>
                    <td className="py-1.5 px-1.5 text-center text-slate-400">
                      {row.note}
                    </td>
                  </tr>
                );
              })}

              {/* Dòng Tổng số tiền phải thanh toán */}
              <tr
                className="border-b border-slate-700 font-bold"
                style={{ backgroundColor: '#eef7f2' }}
              >
                <td
                  colSpan={8}
                  className="py-2 px-3 text-left border-r border-slate-700 text-slate-900 font-extrabold"
                >
                  Tổng số tiền phải thanh toán:
                </td>
                <td className="py-2 px-2 text-right font-mono text-sm font-black text-[#094d34] border-r border-slate-700">
                  {totalAmount.toLocaleString('vi-VN')}
                </td>
                <td className="py-2 px-1 text-center" />
              </tr>

              {/* Dòng Viết bằng chữ */}
              <tr className="border-b border-slate-700 italic text-[11px] sm:text-xs">
                <td
                  colSpan={2}
                  className="py-1.5 px-3 text-center border-r border-slate-700 text-slate-700 font-medium"
                >
                  Viết bằng chữ:
                </td>
                <td
                  colSpan={8}
                  className="py-1.5 px-3 text-center font-bold text-slate-900"
                >
                  {amountInWords}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ================= PHẦN DƯỚI BẢNG: THÔNG TIN THANH TOÁN & NGƯỜI LẬP ================= */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-start pt-2">
          {/* Cột trái: Thông tin chuyển khoản (Chữ đỏ đặc trưng) */}
          <div
            className="sm:col-span-8 text-[11px] sm:text-xs space-y-1"
            style={{ color: '#b91c1c' }}
          >
            <p className="font-semibold italic">
              Quý khách vui lòng thanh toán trước ngày {dueDayText}, giữ lại phiếu để đối chiếu.
            </p>
            <p className="font-bold pt-0.5">
              Đề nghị chuyển khoản vào tài khoản sau:
            </p>
            <div className="space-y-0.5 pl-1 font-medium">
              <p>
                1 Chủ tài khoản: <span className="font-bold uppercase ml-4">{bankAccountName}</span>
              </p>
              <p>
                2 Số tài khoản: <span className="font-bold font-mono ml-5 tracking-wider">{bankAccountNo}</span>
              </p>
              <p>
                3 Ngân hàng: <span className="font-semibold ml-6">{displayBankName}</span>
              </p>
            </div>
            <p className="pt-1 text-[11px] text-slate-800 font-medium">
              Khi chuyển khoản, vui lòng ghi rõ nội dung theo cú pháp:
            </p>
            <div className="inline-block mt-0.5 px-2.5 py-1 rounded bg-rose-50 border border-rose-300">
              <span className="font-mono font-black text-sm tracking-wider text-[#b91c1c]">
                {codeToTransfer}
              </span>
            </div>
          </div>

          {/* Cột phải: Ngày lập, Người lập & Mã QR chuyển khoản */}
          <div className="sm:col-span-4 flex flex-col items-center text-center">
            <p className="text-[11px] sm:text-xs text-slate-700 italic mb-0.5">
              Hà Nội, ngày {invoiceDate.getDate()} tháng {invoice.billing_month} năm {invoice.billing_year}
            </p>
            <p className="text-xs font-black uppercase text-slate-900 tracking-wider mb-2">
              NGƯỜI LẬP
            </p>

            {/* Mã QR Code VietQR động */}
            {bankAccountNo ? (
              <div className="w-32 h-32 sm:w-36 sm:h-36 bg-white p-1 border border-slate-300 rounded shadow-xs flex items-center justify-center">
                <img
                  src={qrOnlyUrl}
                  alt="VietQR Code"
                  className="w-full h-full object-contain"
                  loading="lazy"
                />
              </div>
            ) : (
              <div className="w-32 h-32 border border-dashed border-slate-300 rounded flex items-center justify-center text-[10px] text-slate-400">
                Chưa có QR
              </div>
            )}
          </div>
        </div>

        {/* ================= ĐÁY PHIẾU: NGƯỜI IN & SỐ TRANG ================= */}
        <div className="mt-8 pt-2 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center text-[10px] text-slate-500">
          <div>
            <span className="font-semibold text-slate-700">{displayBuildingName.split('-')[0] || 'GIA HƯNG'}</span>
            <span> - Phiếu thanh toán thuê phòng</span>
            <span className="block sm:inline sm:ml-2">
              Người in: {creatorName} | Ngày giờ in: {formattedPrintTime}
            </span>
          </div>
          <div className="font-mono mt-1 sm:mt-0">Trang 1/1</div>
        </div>
      </div>
    );
  }
);

InvoiceBillView.displayName = 'InvoiceBillView';
