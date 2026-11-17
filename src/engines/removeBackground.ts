import { ProcessedOutput } from '@/types/tools';

export async function processRemoveBackground(
  files: File[],
  options: Record<string, any>
): Promise<ProcessedOutput[]> {
  const results: ProcessedOutput[] = [];
  const feather = options.feather ?? 2;
  const tolerance = (options.tolerance ?? 25) * 2.55; // convert 0-100 to 0-255 scale
  const replacementColor = options.replacementColor || 'transparent';

  for (const file of files) {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(bitmap, 0, 0);

    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    // Sample background colors from 4 corners and borders
    const bgSamples: [number, number, number][] = [
      [data[0], data[1], data[2]],
      [data[(width - 1) * 4], data[(width - 1) * 4 + 1], data[(width - 1) * 4 + 2]],
      [data[(height - 1) * width * 4], data[(height - 1) * width * 4 + 1], data[(height - 1) * width * 4 + 2]],
      [
        data[((height - 1) * width + (width - 1)) * 4],
        data[((height - 1) * width + (width - 1)) * 4 + 1],
        data[((height - 1) * width + (width - 1)) * 4 + 2],
      ],
    ];

    // Compute average corner color
    let avgR = 0, avgG = 0, avgB = 0;
    for (const [r, g, b] of bgSamples) {
      avgR += r;
      avgG += g;
      avgB += b;
    }
    avgR /= bgSamples.length;
    avgG /= bgSamples.length;
    avgB /= bgSamples.length;

    // Optional replacement color
    let fillR = 0, fillG = 0, fillB = 0, fillA = 0;
    if (replacementColor !== 'transparent') {
      const parsed = hexToRgb(replacementColor);
      if (parsed) {
        fillR = parsed.r;
        fillG = parsed.g;
        fillB = parsed.b;
        fillA = 255;
      }
    }

    // Alpha mask computation with Euclidean distance & feather thresholding
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Distance to sampled background
      const dist = Math.sqrt((r - avgR) ** 2 + (g - avgG) ** 2 + (b - avgB) ** 2);

      if (dist < tolerance) {
        if (replacementColor === 'transparent') {
          // Transparent
          data[i + 3] = 0;
        } else {
          data[i] = fillR;
          data[i + 1] = fillG;
          data[i + 2] = fillB;
          data[i + 3] = fillA;
        }
      } else if (dist < tolerance + feather * 10) {
        // Soft edge feathering
        const factor = (dist - tolerance) / (feather * 10);
        if (replacementColor === 'transparent') {
          data[i + 3] = Math.round(factor * 255);
        } else {
          data[i] = Math.round(data[i] * factor + fillR * (1 - factor));
          data[i + 1] = Math.round(data[i + 1] * factor + fillG * (1 - factor));
          data[i + 2] = Math.round(data[i + 2] * factor + fillB * (1 - factor));
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);

    const blob: Blob = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b!), 'image/png')
    );

    const base = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    results.push({
      name: `${base}-transparent.png`,
      blob,
      previewUrl: URL.createObjectURL(blob),
      originalSize: file.size,
      newSize: blob.size,
    });
  }

  return results;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}
