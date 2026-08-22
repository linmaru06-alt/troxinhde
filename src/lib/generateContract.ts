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

  // Create canvas from DOM element
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
  });

  const pdf = new jsPDF('p', 'mm', 'a4');
  const imgWidth = 210; // A4 width mm
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  // If content spans multiple pages
  const pageHeight = 297; // A4 height mm
  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  while (heightLeft >= 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  const filename = `${filenamePrefix}_${new Date().toISOString().slice(0, 10)}.pdf`;
  pdf.save(filename);
}
