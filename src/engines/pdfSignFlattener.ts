import { PDFDocument } from 'pdf-lib';
import { ProcessedOutput } from '@/types/tools';

export interface SignaturePlacement {
  pageIndex: number;
  relX: number; // 0 to 1 relative to page width
  relY: number; // 0 to 1 relative to page height (from top)
  relWidth: number; // 0 to 1 relative to page width
  relHeight: number; // 0 to 1 relative to page height
}

export async function flattenSignatureOnPdf(
  file: File,
  signatureDataUrl: string,
  placement: SignaturePlacement
): Promise<ProcessedOutput[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });

  // Convert base64 data URL to Uint8Array
  const base64Data = signatureDataUrl.split(',')[1];
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const sigImage = await pdfDoc.embedPng(bytes);

  const page = pdfDoc.getPage(placement.pageIndex);
  const { width: pageW, height: pageH } = page.getSize();

  // Convert normalized coordinates (0..1) to PDF point coordinates (origin bottom-left)
  const drawW = placement.relWidth * pageW;
  const drawH = placement.relHeight * pageH;
  const drawX = placement.relX * pageW;
  const drawY = (1 - placement.relY - placement.relHeight) * pageH;

  page.drawImage(sigImage, {
    x: drawX,
    y: drawY,
    width: drawW,
    height: drawH,
  });

  const pdfBytes = await pdfDoc.save();
  const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
  const baseName = file.name.replace(/\.pdf$/i, '');

  return [
    {
      name: `${baseName}-signed.pdf`,
      blob,
      previewUrl: URL.createObjectURL(blob),
      originalSize: file.size,
      newSize: blob.size,
    },
  ];
}
