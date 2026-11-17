import { ProcessedOutput } from '@/types/tools';
import { parsePageRanges } from './pdfLibAdapter';
import JSZip from 'jszip';

let pdfjsLib: any = null;

async function getPdfJs() {
  if (pdfjsLib) return pdfjsLib;
  if (typeof window === 'undefined') return null;

  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
  pdfjsLib = pdfjs;
  return pdfjsLib;
}

export async function rasterizePdfToImages(
  file: File,
  targetMime: string,
  targetExt: string,
  options: Record<string, any>
): Promise<ProcessedOutput[]> {
  const pdfjs = await getPdfJs();
  if (!pdfjs) throw new Error('PDF.js not available in this environment');

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
  const pdfDoc = await loadingTask.promise;
  const totalPages = pdfDoc.numPages;

  const targetPages = parsePageRanges(options.ranges, totalPages);
  const dpi = parseInt(options.dpi || '150', 10);
  const quality = (options.quality || 90) / 100;
  const scale = dpi / 72.0;

  const baseName = file.name.replace(/\.pdf$/i, '');
  const renderedImages: { name: string; blob: Blob }[] = [];

  for (let i = 0; i < targetPages.length; i++) {
    const pageNum = targetPages[i] + 1;
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext('2d')!;

    // For JPEG, fill background with white
    if (targetMime === 'image/jpeg') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    await page.render({
      canvasContext: ctx,
      viewport,
    }).promise;

    const blob: Blob = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b!), targetMime, quality)
    );

    renderedImages.push({
      name: `${baseName}-page-${pageNum}${targetExt}`,
      blob,
    });
  }

  // If single page, download directly; if multiple, package in zip
  if (renderedImages.length === 1) {
    const single = renderedImages[0];
    return [
      {
        name: single.name,
        blob: single.blob,
        previewUrl: URL.createObjectURL(single.blob),
        originalSize: file.size,
        newSize: single.blob.size,
      },
    ];
  }

  const zip = new JSZip();
  renderedImages.forEach((img) => zip.file(img.name, img.blob));
  const zipBlob = await zip.generateAsync({ type: 'blob' });

  return [
    {
      name: `${baseName}-images.zip`,
      blob: zipBlob,
      originalSize: file.size,
      newSize: zipBlob.size,
    },
  ];
}

export async function renderPdfThumbnails(
  file: File,
  maxPages: number = 20
): Promise<{ pageNum: number; dataUrl: string }[]> {
  const pdfjs = await getPdfJs();
  if (!pdfjs) return [];

  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const pagesCount = Math.min(pdfDoc.numPages, maxPages);
  const thumbs: { pageNum: number; dataUrl: string }[] = [];

  for (let i = 1; i <= pagesCount; i++) {
    const page = await pdfDoc.getPage(i);
    const viewport = page.getViewport({ scale: 0.3 }); // thumbnail scale
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvasContext: ctx, viewport }).promise;
    thumbs.push({ pageNum: i, dataUrl: canvas.toDataURL('image/jpeg', 0.8) });
  }

  return thumbs;
}
