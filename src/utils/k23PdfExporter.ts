import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface ExportPdfOptions {
  format?: 'a4' | 'a5';
  orientation?: 'portrait' | 'landscape';
  marginMm?: number;
}

/**
 * P0-10: Xuất hóa đơn / Biên lai PDF tiếng Việt có dấu chuẩn đẹp
 * Sử dụng công nghệ Render Canvas độ phân giải cao (scale 2.5)
 * Kế thừa font chữ Noto Sans / Inter sắc nét, không bao giờ bị lỗi dấu tiếng Việt.
 */
export async function exportInvoiceToPdf(
  element: HTMLElement,
  fileName: string = 'Hoa-Don-Tien-Nha.pdf',
  options: ExportPdfOptions = {}
): Promise<boolean> {
  try {
    const { format = 'a4', orientation = 'portrait', marginMm = 10 } = options;

    // Chụp lại DOM hóa đơn ở độ phân giải 2.5x để chữ in ra nét căng
    const canvas = await html2canvas(element, {
      scale: 2.5,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const imgData = canvas.toDataURL('image/png');

    // Khởi tạo tài liệu jsPDF
    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format,
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    const printableWidth = pdfWidth - marginMm * 2;
    const imgWidth = printableWidth;
    const imgHeight = (canvas.height * printableWidth) / canvas.width;

    // Nếu chiều cao hóa đơn vượt quá trang, căn chỉnh phù hợp
    let heightLeft = imgHeight;
    let position = marginMm;

    pdf.addImage(imgData, 'PNG', marginMm, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight;

    // Hỗ trợ trường hợp hóa đơn dài nhiều trang
    while (heightLeft > 0) {
      position = heightLeft - imgHeight + marginMm;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', marginMm, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
    }

    const safeFileName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
    pdf.save(safeFileName);
    return true;
  } catch (error) {
    console.error('[K23PdfExporter] Lỗi xuất PDF:', error);
    return false;
  }
}

/**
 * In biên lai nhanh trực tiếp qua trình điều khiển máy in của trình duyệt (Window Print)
 */
export function printInvoiceDirect(element: HTMLElement) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    window.print();
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>In Hóa Đơn Trọ Xinh K23</title>
        <meta charset="utf-8" />
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #fff;
            color: #0f172a;
          }
          @media print {
            body { padding: 0; }
            @page { margin: 10mm; }
          }
        </style>
      </head>
      <body>
        ${element.outerHTML}
        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
              window.close();
            }, 300);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

