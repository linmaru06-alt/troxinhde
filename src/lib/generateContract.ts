import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export interface ContractData {
  ownerName?: string;
  renterName?: string;
  roomAddress?: string;
  price?: number;
  startDate?: string;
  duration?: string;
  deposit?: number;
}

export async function generateContractPDF(
  elementId: string = 'contract-content',
  filenamePrefix: string = 'HopDong_TroXinh'
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Element #${elementId} not found`);
  }

  // Ensure all fonts (especially Vietnamese Be Vietnam Pro) are fully loaded
  if (document.fonts) {
    await document.fonts.ready;
  }

  // Create high-res canvas from DOM element
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    windowWidth: 1200,
    onclone: (clonedDoc) => {
      const clonedElement = clonedDoc.getElementById(elementId);
      if (clonedElement) {
        clonedElement.style.fontFamily = "'Be Vietnam Pro', 'Segoe UI', Arial, sans-serif";
        clonedElement.style.letterSpacing = 'normal';
      }
    },
  });

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = 210; // A4 width mm
  const pdfHeight = 297; // A4 height mm
  const imgWidth = pdfWidth;
  const imgHeight = (canvas.height * pdfWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 0;

  // Add first page
  pdf.addImage(canvas.toDataURL('image/png', 1.0), 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
  heightLeft -= pdfHeight;

  // Multi-page handling
  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(canvas.toDataURL('image/png', 1.0), 'PNG', 0, position, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pdfHeight;
  }

  const filename = `${filenamePrefix}_${new Date().toISOString().slice(0, 10)}.pdf`;
  pdf.save(filename);
}
