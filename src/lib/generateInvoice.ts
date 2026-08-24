import React from 'react';
import { createRoot } from 'react-dom/client';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { InvoiceTemplate, InvoiceProps } from '../components/invoice/InvoiceTemplate';

/**
 * Converts numeric amount to natural Vietnamese words
 * e.g., 99000 -> "Chín mươi chín nghìn đồng"
 */
export function numberToVietnamese(amount: number): string {
  if (!amount || isNaN(amount) || amount === 0) return 'Không đồng';

  const digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

  function readGroup(group: number): string {
    const hundred = Math.floor(group / 100);
    const remainder = group % 100;
    const ten = Math.floor(remainder / 10);
    const one = remainder % 10;
    let result = '';

    if (hundred > 0 || group >= 100) {
      result += digits[hundred] + ' trăm ';
      if (ten === 0 && one > 0) result += 'lẻ ';
    }

    if (ten > 0 && ten !== 1) {
      result += digits[ten] + ' mươi ';
      if (one === 1) result += 'mốt ';
    } else if (ten === 1) {
      result += 'mười ';
      if (one === 1) result += 'một ';
    }

    if (one === 5 && ten >= 1) {
      result += 'lăm ';
    } else if (one > 1 || (one === 1 && ten === 0)) {
      result += digits[one] + ' ';
    }

    return result.trim();
  }

  const scales = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];
  let numStr = Math.round(amount).toString();
  const groups: string[] = [];

  while (numStr.length > 0) {
    groups.unshift(numStr.slice(-3));
    numStr = numStr.slice(0, -3);
  }

  let words = '';
  for (let i = 0; i < groups.length; i++) {
    const grp = parseInt(groups[i], 10);
    if (grp > 0) {
      const scaleIdx = groups.length - 1 - i;
      const grpWords = readGroup(grp);
      words += grpWords + ' ' + scales[scaleIdx] + ' ';
    }
  }

  words = words.trim();
  if (words.length > 0) {
    words = words.charAt(0).toUpperCase() + words.slice(1) + ' đồng';
  }

  return words;
}

/**
 * Renders InvoiceTemplate into PDF file and triggers browser download
 */
export async function generateInvoicePDF(invoiceData: InvoiceProps): Promise<void> {
  // If amountInWords is not provided, generate automatically
  const enrichedData: InvoiceProps = {
    ...invoiceData,
    amountInWords: invoiceData.amountInWords || numberToVietnamese(invoiceData.totalAmount),
  };

  // 1. Create hidden off-screen container with fixed A4 width (794px at 96 DPI / 210mm)
  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed;
    left: -9999px;
    top: 0;
    width: 794px;
    background: #ffffff;
    z-index: -9999;
    pointer-events: none;
  `;
  document.body.appendChild(container);

  // 2. Render InvoiceTemplate into container
  const root = createRoot(container);
  root.render(React.createElement(InvoiceTemplate, enrichedData));

  // 3. Wait for DOM render & images/fonts
  if (document.fonts) {
    await document.fonts.ready;
  }
  await new Promise((resolve) => setTimeout(resolve, 450));

  try {
    // 4. Capture HTML canvas with high scale (2x for crisp text)
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      windowWidth: 794,
    });

    // 5. Create A4 PDF (210mm x 297mm)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    const imgData = canvas.toDataURL('image/png', 1.0);

    // Multi-page auto-split if content height exceeds A4 (297mm)
    const pageHeight = 297;
    let heightLeft = pdfHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - pdfHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
    }

    // 6. Generate filename and save
    const cleanDate = (invoiceData.orderDate || new Date().toISOString().slice(0, 10)).replace(/[^0-9]/g, '');
    const cleanOrderCode = (invoiceData.orderCode || 'TRX').replace(/[^a-zA-Z0-9]/g, '');
    const fileName = `BienLai_TROXINH_${cleanOrderCode}_${cleanDate}.pdf`;

    pdf.save(fileName);
  } finally {
    // 7. Cleanup DOM container
    root.unmount();
    if (document.body.contains(container)) {
      document.body.removeChild(container);
    }
  }
}
