import { PDFDocument, rgb, degrees, StandardFonts } from 'pdf-lib';
import JSZip from 'jszip';
import { ProcessedOutput } from '@/types/tools';

const toPdfBlob = (bytes: Uint8Array): Blob => new Blob([bytes as any], { type: 'application/pdf' });

export async function mergePdfs(files: File[]): Promise<ProcessedOutput[]> {
  const mergedPdf = await PDFDocument.create();

  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    const srcDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
    const copiedPages = await mergedPdf.copyPages(srcDoc, srcDoc.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  const pdfBytes = await mergedPdf.save();
  const blob = toPdfBlob(pdfBytes);

  return [
    {
      name: 'merged-document.pdf',
      blob,
      previewUrl: URL.createObjectURL(blob),
      originalSize: files.reduce((acc, f) => acc + f.size, 0),
      newSize: blob.size,
    },
  ];
}

export async function processPdfPages(
  file: File,
  mode: string,
  options: Record<string, any>
): Promise<ProcessedOutput[]> {
  const arrayBuffer = await file.arrayBuffer();
  const srcDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const totalPages = srcDoc.getPageCount();
  const baseName = file.name.replace(/\.pdf$/i, '');

  if (mode === 'rotate') {
    const angle = parseInt(options.angle || '90', 10);
    const targetPages = parsePageRanges(options.ranges, totalPages);

    targetPages.forEach((idx) => {
      const page = srcDoc.getPage(idx);
      const current = page.getRotation().angle;
      page.setRotation(degrees((current + angle) % 360));
    });

    const pdfBytes = await srcDoc.save();
    const blob = toPdfBlob(pdfBytes);
    return [
      {
        name: `${baseName}-rotated.pdf`,
        blob,
        previewUrl: URL.createObjectURL(blob),
        originalSize: file.size,
        newSize: blob.size,
      },
    ];
  }

  if (mode === 'crop') {
    const top = Number(options.top) || 0;
    const right = Number(options.right) || 0;
    const bottom = Number(options.bottom) || 0;
    const left = Number(options.left) || 0;

    for (let i = 0; i < totalPages; i++) {
      const page = srcDoc.getPage(i);
      const { x, y, width, height } = page.getMediaBox();
      const newX = x + left;
      const newY = y + bottom;
      const newW = Math.max(1, width - left - right);
      const newH = Math.max(1, height - top - bottom);
      page.setMediaBox(newX, newY, newW, newH);
      page.setCropBox(newX, newY, newW, newH);
    }

    const pdfBytes = await srcDoc.save();
    const blob = toPdfBlob(pdfBytes);
    return [
      {
        name: `${baseName}-cropped.pdf`,
        blob,
        previewUrl: URL.createObjectURL(blob),
        originalSize: file.size,
        newSize: blob.size,
      },
    ];
  }

  if (mode === 'remove') {
    const removeIndices = new Set(parsePageRanges(options.ranges, totalPages));
    const keepIndices = [];
    for (let i = 0; i < totalPages; i++) {
      if (!removeIndices.has(i)) {
        keepIndices.push(i);
      }
    }

    if (keepIndices.length === 0) {
      throw new Error('You cannot remove all pages from the PDF.');
    }

    const newDoc = await PDFDocument.create();
    const copiedPages = await newDoc.copyPages(srcDoc, keepIndices);
    copiedPages.forEach((p) => newDoc.addPage(p));

    const pdfBytes = await newDoc.save();
    const blob = toPdfBlob(pdfBytes);
    return [
      {
        name: `${baseName}-filtered.pdf`,
        blob,
        previewUrl: URL.createObjectURL(blob),
        originalSize: file.size,
        newSize: blob.size,
      },
    ];
  }

  if (mode === 'extract') {
    const extractIndices = parsePageRanges(options.ranges, totalPages);
    if (extractIndices.length === 0) {
      throw new Error('Please specify at least one page to extract.');
    }

    const newDoc = await PDFDocument.create();
    const copiedPages = await newDoc.copyPages(srcDoc, extractIndices);
    copiedPages.forEach((p) => newDoc.addPage(p));

    const pdfBytes = await newDoc.save();
    const blob = toPdfBlob(pdfBytes);
    return [
      {
        name: `${baseName}-extracted.pdf`,
        blob,
        previewUrl: URL.createObjectURL(blob),
        originalSize: file.size,
        newSize: blob.size,
      },
    ];
  }

  if (mode === 'split') {
    // If ranges specified: e.g. "1-2, 3-5"
    if (options.ranges && options.ranges.trim()) {
      const groups = options.ranges.split(',').map((g: string) => g.trim()).filter(Boolean);
      const zip = new JSZip();

      for (let gIdx = 0; gIdx < groups.length; gIdx++) {
        const groupStr = groups[gIdx];
        const indices = parsePageRanges(groupStr, totalPages);
        if (indices.length === 0) continue;

        const subDoc = await PDFDocument.create();
        const pages = await subDoc.copyPages(srcDoc, indices);
        pages.forEach((p) => subDoc.addPage(p));
        const bytes = await subDoc.save();

        zip.file(`${baseName}-part-${gIdx + 1}.pdf`, bytes);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      return [
        {
          name: `${baseName}-split.zip`,
          blob: zipBlob,
          originalSize: file.size,
          newSize: zipBlob.size,
        },
      ];
    } else {
      // Split each page into its own PDF
      const zip = new JSZip();
      for (let i = 0; i < totalPages; i++) {
        const singleDoc = await PDFDocument.create();
        const [page] = await singleDoc.copyPages(srcDoc, [i]);
        singleDoc.addPage(page);
        const bytes = await singleDoc.save();
        zip.file(`${baseName}-page-${i + 1}.pdf`, bytes);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      return [
        {
          name: `${baseName}-pages.zip`,
          blob: zipBlob,
          originalSize: file.size,
          newSize: zipBlob.size,
        },
      ];
    }
  }

  throw new Error(`Unsupported mode: ${mode}`);
}

export async function processPdfStamp(
  file: File,
  mode: string,
  options: Record<string, any>
): Promise<ProcessedOutput[]> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const totalPages = pdfDoc.getPageCount();
  const baseName = file.name.replace(/\.pdf$/i, '');

  if (mode === 'page-numbers') {
    const position = options.position || 'bottom-center';
    const format = options.format || 'plain';
    const startAt = Number(options.startAt) || 1;
    const fontSize = Number(options.fontSize) || 11;

    for (let i = 0; i < totalPages; i++) {
      const page = pdfDoc.getPage(i);
      const { width, height } = page.getSize();
      const pageNum = i + startAt;

      let text = `${pageNum}`;
      if (format === 'page') text = `Page ${pageNum}`;
      else if (format === 'of') text = `Page ${pageNum} of ${totalPages + startAt - 1}`;

      const textWidth = font.widthOfTextAtSize(text, fontSize);
      const margin = 25;

      let x = (width - textWidth) / 2;
      let y = margin;

      if (position === 'bottom-right') x = width - textWidth - margin;
      else if (position === 'bottom-left') x = margin;
      else if (position === 'top-center') y = height - margin - fontSize;
      else if (position === 'top-right') {
        x = width - textWidth - margin;
        y = height - margin - fontSize;
      } else if (position === 'top-left') {
        x = margin;
        y = height - margin - fontSize;
      }

      page.drawText(text, {
        x,
        y,
        size: fontSize,
        font,
        color: rgb(0.3, 0.3, 0.3),
      });
    }

    const pdfBytes = await pdfDoc.save();
    const blob = toPdfBlob(pdfBytes);
    return [
      {
        name: `${baseName}-numbered.pdf`,
        blob,
        previewUrl: URL.createObjectURL(blob),
        originalSize: file.size,
        newSize: blob.size,
      },
    ];
  }

  if (mode === 'watermark') {
    const text = options.text || 'CONFIDENTIAL';
    const size = Number(options.size) || 64;
    const opacity = (Number(options.opacity) || 25) / 100;
    const diagonal = options.diagonal !== false;

    let color = rgb(0.5, 0.5, 0.5);
    if (options.color === 'black') color = rgb(0, 0, 0);
    else if (options.color === 'red') color = rgb(0.9, 0.2, 0.2);
    else if (options.color === 'blue') color = rgb(0.2, 0.4, 0.9);

    const textWidth = font.widthOfTextAtSize(text, size);
    const textHeight = font.heightAtSize(size);

    for (let i = 0; i < totalPages; i++) {
      const page = pdfDoc.getPage(i);
      const { width, height } = page.getSize();

      const centerX = width / 2;
      const centerY = height / 2;

      page.drawText(text, {
        x: centerX - (textWidth / 2) * (diagonal ? 0.7 : 1),
        y: centerY - (textHeight / 2) * (diagonal ? 0.7 : 1),
        size,
        font,
        color,
        opacity,
        rotate: diagonal ? degrees(45) : degrees(0),
      });
    }

    const pdfBytes = await pdfDoc.save();
    const blob = toPdfBlob(pdfBytes);
    return [
      {
        name: `${baseName}-watermarked.pdf`,
        blob,
        previewUrl: URL.createObjectURL(blob),
        originalSize: file.size,
        newSize: blob.size,
      },
    ];
  }

  throw new Error(`Unsupported stamp mode: ${mode}`);
}

export async function imagesToPdf(
  files: File[],
  options: Record<string, any>
): Promise<ProcessedOutput[]> {
  const pdfDoc = await PDFDocument.create();
  const pageSize = options.pageSize || 'fit';
  const marginSize = options.margin === 'large' ? 40 : options.margin === 'small' ? 20 : 0;

  for (const file of files) {
    const bytes = await file.arrayBuffer();
    let embeddedImg;

    if (file.type === 'image/png') {
      embeddedImg = await pdfDoc.embedPng(bytes);
    } else {
      embeddedImg = await pdfDoc.embedJpg(bytes);
    }

    const imgW = embeddedImg.width;
    const imgH = embeddedImg.height;

    let pageW = imgW;
    let pageH = imgH;

    if (pageSize === 'a4') {
      pageW = 595.28; // A4 standard pt
      pageH = 841.89;
    } else if (pageSize === 'letter') {
      pageW = 612.0;
      pageH = 792.0;
    }

    const availW = Math.max(1, pageW - marginSize * 2);
    const availH = Math.max(1, pageH - marginSize * 2);

    const scale = Math.min(availW / imgW, availH / imgH);
    const drawW = imgW * scale;
    const drawH = imgH * scale;

    const x = marginSize + (availW - drawW) / 2;
    const y = marginSize + (availH - drawH) / 2;

    const page = pdfDoc.addPage([pageW, pageH]);
    page.drawImage(embeddedImg, {
      x,
      y,
      width: drawW,
      height: drawH,
    });
  }

  const pdfBytes = await pdfDoc.save();
  const blob = toPdfBlob(pdfBytes);

  return [
    {
      name: 'images-combined.pdf',
      blob,
      previewUrl: URL.createObjectURL(blob),
      originalSize: files.reduce((acc, f) => acc + f.size, 0),
      newSize: blob.size,
    },
  ];
}

// Helper to parse page range strings like "1-3, 5, 8-10" into 0-indexed integer array
export function parsePageRanges(rangeStr: string | undefined, totalPages: number): number[] {
  if (!rangeStr || !rangeStr.trim()) {
    return Array.from({ length: totalPages }, (_, i) => i);
  }

  const result = new Set<number>();
  const parts = rangeStr.split(',');

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    if (trimmed.includes('-')) {
      const [startStr, endStr] = trimmed.split('-');
      const start = Math.max(1, parseInt(startStr, 10));
      const end = Math.min(totalPages, parseInt(endStr, 10));
      if (!isNaN(start) && !isNaN(end)) {
        for (let p = start; p <= end; p++) {
          result.add(p - 1);
        }
      }
    } else {
      const p = parseInt(trimmed, 10);
      if (!isNaN(p) && p >= 1 && p <= totalPages) {
        result.add(p - 1);
      }
    }
  }

  return Array.from(result).sort((a, b) => a - b);
}
