import { ProcessedOutput } from '@/types/tools';

export interface PassportStandard {
  id: string;
  name: string;
  mmWidth: number;
  mmHeight: number;
  minHeadRatio: number;
  maxHeadRatio: number;
}

export const PASSPORT_STANDARDS: Record<string, PassportStandard> = {
  us_passport: {
    id: 'us_passport',
    name: 'United States (2x2" / 51x51mm)',
    mmWidth: 51,
    mmHeight: 51,
    minHeadRatio: 0.5,
    maxHeadRatio: 0.69,
  },
  uk_eu_passport: {
    id: 'uk_eu_passport',
    name: 'UK & EU (35x45mm)',
    mmWidth: 35,
    mmHeight: 45,
    minHeadRatio: 0.7,
    maxHeadRatio: 0.8,
  },
  india_passport: {
    id: 'india_passport',
    name: 'India Passport (35x45mm)',
    mmWidth: 35,
    mmHeight: 45,
    minHeadRatio: 0.7,
    maxHeadRatio: 0.8,
  },
  india_pan: {
    id: 'india_pan',
    name: 'India PAN Card (25x35mm)',
    mmWidth: 25,
    mmHeight: 35,
    minHeadRatio: 0.65,
    maxHeadRatio: 0.75,
  },
  canada_passport: {
    id: 'canada_passport',
    name: 'Canada Passport (50x70mm)',
    mmWidth: 50,
    mmHeight: 70,
    minHeadRatio: 0.6,
    maxHeadRatio: 0.75,
  },
  china_visa: {
    id: 'china_visa',
    name: 'China Visa (33x48mm)',
    mmWidth: 33,
    mmHeight: 48,
    minHeadRatio: 0.7,
    maxHeadRatio: 0.8,
  },
  australia_passport: {
    id: 'australia_passport',
    name: 'Australia Passport (35x45mm)',
    mmWidth: 35,
    mmHeight: 45,
    minHeadRatio: 0.7,
    maxHeadRatio: 0.8,
  },
};

export function mmToPixelsAt300DPI(mm: number): number {
  return Math.round((mm / 25.4) * 300);
}

export async function processPassportPhoto(
  file: File,
  options: Record<string, any>
): Promise<ProcessedOutput[]> {
  const standardKey = options.preset || 'us_passport';
  const standard = PASSPORT_STANDARDS[standardKey] || PASSPORT_STANDARDS.us_passport;
  const sheetSize = options.sheetSize || '4x6';
  const bgColor = options.bgColor || 'white';
  const guideLines = options.guideLines !== false;

  const targetW = mmToPixelsAt300DPI(standard.mmWidth);
  const targetH = mmToPixelsAt300DPI(standard.mmHeight);

  // Load source
  const bitmap = await createImageBitmap(file);
  const origW = bitmap.width;
  const origH = bitmap.height;

  // Single passport canvas
  const singleCanvas = document.createElement('canvas');
  singleCanvas.width = targetW;
  singleCanvas.height = targetH;
  const sCtx = singleCanvas.getContext('2d')!;
  sCtx.imageSmoothingEnabled = true;
  sCtx.imageSmoothingQuality = 'high';

  // Fill background
  if (bgColor !== 'original') {
    const bgMap: Record<string, string> = {
      white: '#FFFFFF',
      offwhite: '#F4F4F6',
      lightblue: '#CBE3FB',
    };
    sCtx.fillStyle = bgMap[bgColor] || '#FFFFFF';
    sCtx.fillRect(0, 0, targetW, targetH);
  }

  // Center crop & scale source to fit target dimensions
  const targetRatio = targetW / targetH;
  const origRatio = origW / origH;
  let srcW = origW;
  let srcH = origH;
  let srcX = 0;
  let srcY = 0;

  if (origRatio > targetRatio) {
    srcW = Math.round(origH * targetRatio);
    srcX = Math.round((origW - srcW) / 2);
  } else {
    srcH = Math.round(origW / targetRatio);
    srcY = Math.round((origH - srcH) / 2);
  }

  sCtx.drawImage(bitmap, srcX, srcY, srcW, srcH, 0, 0, targetW, targetH);

  let finalCanvas = singleCanvas;

  // If 4x6 sheet is requested:
  // 4x6 inches at 300 DPI = 1200 x 1800 px (or 1800 x 1200 px landscape)
  if (sheetSize === '4x6') {
    const sheetW = 1800;
    const sheetH = 1200;
    const sheetCanvas = document.createElement('canvas');
    sheetCanvas.width = sheetW;
    sheetCanvas.height = sheetH;
    const sheetCtx = sheetCanvas.getContext('2d')!;
    sheetCtx.fillStyle = '#FFFFFF';
    sheetCtx.fillRect(0, 0, sheetW, sheetH);

    // Calculate grid
    const cols = Math.floor((sheetW - 80) / targetW);
    const rows = Math.floor((sheetH - 80) / targetH);
    const totalPhotos = cols * rows;

    const gapX = Math.floor((sheetW - cols * targetW) / (cols + 1));
    const gapY = Math.floor((sheetH - rows * targetH) / (rows + 1));

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = gapX + c * (targetW + gapX);
        const y = gapY + r * (targetH + gapY);

        sheetCtx.drawImage(singleCanvas, x, y, targetW, targetH);

        // Draw cutting dashed lines
        if (guideLines) {
          sheetCtx.save();
          sheetCtx.setLineDash([8, 8]);
          sheetCtx.strokeStyle = '#D1D5DB';
          sheetCtx.lineWidth = 1;
          sheetCtx.strokeRect(x, y, targetW, targetH);
          sheetCtx.restore();
        }
      }
    }

    finalCanvas = sheetCanvas;
  }

  const blob: Blob = await new Promise((resolve) =>
    finalCanvas.toBlob((b) => resolve(b!), 'image/jpeg', 0.95)
  );

  return [
    {
      name: `passport-photo-${standard.id}-${sheetSize}.jpg`,
      blob,
      previewUrl: URL.createObjectURL(blob),
      originalSize: file.size,
      newSize: blob.size,
    },
  ];
}
