import { ProcessedOutput } from '@/types/tools';

export interface ImageProcessRequest {
  files: File[];
  mode?: string;
  options: Record<string, any>;
  targetMime?: string;
  targetExtension?: string;
  onProgress?: (progress: number) => void;
}

export async function processImages(req: ImageProcessRequest): Promise<ProcessedOutput[]> {
  const { files, mode = 'compress', options, targetMime, targetExtension, onProgress } = req;
  const results: ProcessedOutput[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const originalSize = file.size;
    const bitmap = await loadImageBitmap(file);

    let outputCanvas: HTMLCanvasElement | OffscreenCanvas;
    let outputMime = targetMime || file.type || 'image/jpeg';
    let outputQuality = options.quality ? options.quality / 100 : 0.85;

    if (mode === 'compress') {
      if (options.format === 'webp') outputMime = 'image/webp';
      else if (options.format === 'jpg') outputMime = 'image/jpeg';
      outputQuality = options.quality ? options.quality / 100 : 0.75;
      outputCanvas = applyCompress(bitmap, options);
    } else if (mode === 'resize') {
      outputCanvas = applyResize(bitmap, options);
    } else if (mode === 'crop') {
      outputCanvas = applyCrop(bitmap, options);
    } else if (mode === 'rotate') {
      outputCanvas = applyRotate(bitmap, options);
    } else if (mode === 'watermark') {
      outputCanvas = applyWatermark(bitmap, options);
    } else if (mode === 'remove-ai-watermark') {
      outputCanvas = applyRemoveAiWatermark(bitmap, options);
    } else if (mode === 'convert') {
      outputCanvas = applyConvert(bitmap, outputMime);
    } else {
      outputCanvas = renderToCanvas(bitmap, bitmap.width, bitmap.height);
    }

    const blob = await canvasToBlob(outputCanvas, outputMime, outputQuality);

    // Free image bitmap
    if ('close' in bitmap && typeof (bitmap as any).close === 'function') {
      (bitmap as any).close();
    }

    // Determine filename
    const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    const ext = targetExtension || getExtensionForMime(outputMime);
    const suffix = mode === 'compress' ? '-compressed' : mode === 'resize' ? '-resized' : '-edited';
    const outName = `${baseName}${suffix}${ext}`;

    // If compression actually resulted in larger size, fallback to original
    let finalBlob = blob;
    if (mode === 'compress' && blob.size >= originalSize) {
      finalBlob = file;
    }

    results.push({
      name: outName,
      blob: finalBlob,
      previewUrl: URL.createObjectURL(finalBlob),
      originalSize,
      newSize: finalBlob.size,
    });

    if (onProgress) {
      onProgress(Math.round(((i + 1) / files.length) * 100));
    }
  }

  return results;
}

// ======================== HELPERS ========================

async function loadImageBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file);
    } catch {
      // Fallback to Image
    }
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = reject;
    img.src = url;
  });
}

function createCanvas(width: number, height: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  return { canvas, ctx };
}

function renderToCanvas(source: ImageBitmap | HTMLImageElement, width: number, height: number): HTMLCanvasElement {
  const { canvas, ctx } = createCanvas(width, height);
  ctx.drawImage(source, 0, 0, width, height);
  return canvas;
}

async function canvasToBlob(
  canvas: HTMLCanvasElement | OffscreenCanvas,
  type: string,
  quality: number
): Promise<Blob> {
  if ('convertToBlob' in canvas && typeof (canvas as any).convertToBlob === 'function') {
    return await (canvas as any).convertToBlob({ type, quality });
  }
  return new Promise((resolve, reject) => {
    (canvas as HTMLCanvasElement).toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas export failed'))),
      type,
      quality
    );
  });
}

function getExtensionForMime(mime: string): string {
  switch (mime) {
    case 'image/webp':
      return '.webp';
    case 'image/png':
      return '.png';
    default:
      return '.jpg';
  }
}

// ======================== OPERATION LOGIC ========================

function applyCompress(source: ImageBitmap | HTMLImageElement, options: Record<string, any>): HTMLCanvasElement {
  let { width, height } = source;
  const maxSide = options.maxSide && options.maxSide !== 'original' ? parseInt(options.maxSide, 10) : 0;

  if (maxSide > 0 && Math.max(width, height) > maxSide) {
    if (width >= height) {
      height = Math.round((height * maxSide) / width);
      width = maxSide;
    } else {
      width = Math.round((width * maxSide) / height);
      height = maxSide;
    }
  }

  const { canvas, ctx } = createCanvas(width, height);
  // White background for safety if transparent
  if (options.format === 'jpg') {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
  }
  ctx.drawImage(source, 0, 0, width, height);
  return canvas;
}

function applyResize(source: ImageBitmap | HTMLImageElement, options: Record<string, any>): HTMLCanvasElement {
  const origW = source.width;
  const origH = source.height;
  let targetW = origW;
  let targetH = origH;

  if (options.mode === 'percent') {
    const scale = (options.percent || 50) / 100;
    targetW = Math.max(1, Math.round(origW * scale));
    targetH = Math.max(1, Math.round(origH * scale));
  } else {
    const userW = options.width > 0 ? options.width : 0;
    const userH = options.height > 0 ? options.height : 0;

    if (userW > 0 && userH > 0) {
      if (options.keepRatio) {
        const scale = Math.min(userW / origW, userH / origH);
        targetW = Math.max(1, Math.round(origW * scale));
        targetH = Math.max(1, Math.round(origH * scale));
      } else {
        targetW = userW;
        targetH = userH;
      }
    } else if (userW > 0) {
      targetW = userW;
      targetH = Math.max(1, Math.round((origH * userW) / origW));
    } else if (userH > 0) {
      targetH = userH;
      targetW = Math.max(1, Math.round((origW * userH) / origH));
    }
  }

  return renderToCanvas(source, targetW, targetH);
}

function applyCrop(source: ImageBitmap | HTMLImageElement, options: Record<string, any>): HTMLCanvasElement {
  const origW = source.width;
  const origH = source.height;
  let cropX = 0;
  let cropY = 0;
  let cropW = origW;
  let cropH = origH;

  if (options.mode === 'custom' && options.cropWidth > 0 && options.cropHeight > 0) {
    cropX = Math.max(0, Math.min(options.x || 0, origW - 1));
    cropY = Math.max(0, Math.min(options.y || 0, origH - 1));
    cropW = Math.min(options.cropWidth, origW - cropX);
    cropH = Math.min(options.cropHeight, origH - cropY);
  } else {
    // Ratio mode
    const [rw, rh] = (options.ratio || '1:1').split(':').map(Number);
    const targetRatio = rw / rh;
    const currentRatio = origW / origH;

    if (currentRatio > targetRatio) {
      cropH = origH;
      cropW = Math.round(origH * targetRatio);
    } else {
      cropW = origW;
      cropH = Math.round(origW / targetRatio);
    }

    const focus = options.focus || 'center';
    cropX = Math.floor((origW - cropW) / 2);
    cropY = Math.floor((origH - cropH) / 2);

    if (focus === 'top') cropY = 0;
    else if (focus === 'bottom') cropY = origH - cropH;
    else if (focus === 'left') cropX = 0;
    else if (focus === 'right') cropX = origW - cropW;
  }

  const { canvas, ctx } = createCanvas(cropW, cropH);
  ctx.drawImage(source, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
  return canvas;
}

function applyRotate(source: ImageBitmap | HTMLImageElement, options: Record<string, any>): HTMLCanvasElement {
  const origW = source.width;
  const origH = source.height;
  const angle = parseInt(options.angle || '90', 10);
  const flipH = options.flipH || false;
  const flipV = options.flipV || false;

  const is90or270 = angle === 90 || angle === 270;
  const targetW = is90or270 ? origH : origW;
  const targetH = is90or270 ? origW : origH;

  const { canvas, ctx } = createCanvas(targetW, targetH);
  ctx.translate(targetW / 2, targetH / 2);
  ctx.rotate((angle * Math.PI) / 180);
  ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
  ctx.drawImage(source, -origW / 2, -origH / 2);
  return canvas;
}

function applyWatermark(source: ImageBitmap | HTMLImageElement, options: Record<string, any>): HTMLCanvasElement {
  const { width, height } = source;
  const { canvas, ctx } = createCanvas(width, height);
  ctx.drawImage(source, 0, 0, width, height);

  const text = options.text || 'letmegoogle';
  const sizeRatio = parseInt(options.size || '7', 10) / 100;
  const fontSize = Math.max(16, Math.round(height * sizeRatio));
  const opacity = (options.opacity || 55) / 100;
  const color = options.color === 'black' ? '#000000' : options.color === 'gray' ? '#808080' : '#FFFFFF';

  ctx.save();
  ctx.font = `600 ${fontSize}px sans-serif`;
  ctx.fillStyle = color;
  ctx.globalAlpha = opacity;

  const position = options.position || 'bottom-right';

  if (position === 'tile') {
    ctx.rotate((-30 * Math.PI) / 180);
    const metrics = ctx.measureText(text);
    const stepX = metrics.width + 120;
    const stepY = fontSize + 100;
    for (let x = -width; x < width * 2; x += stepX) {
      for (let y = -height; y < height * 2; y += stepY) {
        ctx.fillText(text, x, y);
      }
    }
  } else {
    const margin = fontSize * 1.5;
    const textWidth = ctx.measureText(text).width;
    let x = margin;
    let y = margin + fontSize;

    if (position === 'bottom-right') {
      x = width - textWidth - margin;
      y = height - margin;
    } else if (position === 'bottom-left') {
      x = margin;
      y = height - margin;
    } else if (position === 'top-right') {
      x = width - textWidth - margin;
      y = margin + fontSize;
    } else if (position === 'center') {
      x = (width - textWidth) / 2;
      y = height / 2 + fontSize / 3;
    }

    ctx.fillText(text, x, y);
  }

  ctx.restore();
  return canvas;
}

function applyRemoveAiWatermark(
  source: ImageBitmap | HTMLImageElement,
  options: Record<string, any>
): HTMLCanvasElement {
  const { width, height } = source;
  const box = calculateWatermarkBox(width, height, options);
  if (!box) {
    return renderToCanvas(source, width, height);
  }

  if (options.method === 'trim') {
    const topTrim = box.y === 0 ? box.height : 0;
    const bottomTrim = box.y + box.height >= height ? box.height : 0;
    const leftTrim = box.x === 0 ? box.width : 0;
    const rightTrim = box.x + box.width >= width ? box.width : 0;

    const newW = Math.max(1, width - leftTrim - rightTrim);
    const newH = Math.max(1, height - topTrim - bottomTrim);

    const { canvas, ctx } = createCanvas(newW, newH);
    ctx.drawImage(source, leftTrim, topTrim, newW, newH, 0, 0, newW, newH);
    return canvas;
  }

  // Inpaint method
  const { canvas, ctx } = createCanvas(width, height);
  ctx.drawImage(source, 0, 0, width, height);
  const imgData = ctx.getImageData(0, 0, width, height);

  // Refine box to wrap exact watermark and protect text if enabled
  const refinedBox = detectWatermarkBounds(imgData, box, options.protectText !== false);

  // Inpaint with Laplacian boundary diffusion
  inpaintWatermark(imgData, refinedBox, 2);

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

interface WatermarkBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function calculateWatermarkBox(
  width: number,
  height: number,
  options: Record<string, any>
): WatermarkBox | null {
  const preset = options.preset || 'gemini-double';
  if (preset === 'metadata-only') return null;

  if (preset === 'custom') {
    const cx = Math.max(0, Math.min(width - 1, Number(options.customX) || 0));
    const cy = Math.max(0, Math.min(height - 1, Number(options.customY) || 0));
    const cw = Math.min(
      width - cx,
      Math.max(1, Number(options.customWidth) || Math.round(0.12 * width))
    );
    const ch = Math.min(
      height - cy,
      Math.max(1, Number(options.customHeight) || Math.round(0.2 * height))
    );
    return { x: cx, y: cy, width: cw, height: ch };
  }

  const size = options.size || 'medium';
  const scale = size === 'small' ? 0.05 : size === 'large' ? 0.14 : 0.085;

  switch (preset) {
    case 'gemini-double':
    case 'gemini-br': {
      const boxW = Math.max(
        90,
        Math.min(
          width,
          Math.round(width * (size === 'large' ? 0.15 : size === 'small' ? 0.09 : 0.125))
        )
      );
      const boxH = Math.max(
        70,
        Math.min(
          height,
          Math.round(height * (size === 'large' ? 0.25 : size === 'small' ? 0.16 : 0.205))
        )
      );
      return {
        x: Math.max(0, width - boxW),
        y: Math.max(0, height - boxH),
        width: boxW,
        height: boxH,
      };
    }
    case 'gemini-bl': {
      const boxH = Math.max(
        70,
        Math.min(
          height,
          Math.round(height * (size === 'large' ? 0.25 : size === 'small' ? 0.16 : 0.205))
        )
      );
      const boxW = Math.max(
        90,
        Math.min(
          width,
          Math.round(width * (size === 'large' ? 0.15 : size === 'small' ? 0.09 : 0.125))
        )
      );
      return {
        x: 0,
        y: Math.max(0, height - boxH),
        width: boxW,
        height: boxH,
      };
    }
    case 'dalle': {
      const boxW = Math.max(45, Math.min(120, Math.round(0.065 * width)));
      const boxH = Math.max(16, Math.min(36, Math.round(0.024 * height)));
      return {
        x: Math.max(0, width - boxW),
        y: Math.max(0, height - boxH),
        width: Math.min(boxW, width),
        height: Math.min(boxH, height),
      };
    }
    case 'bottom-left': {
      const boxH = Math.max(25, Math.round(height * scale * 0.75));
      const boxW = Math.min(Math.max(40, Math.round(width * scale)), width);
      return {
        x: 0,
        y: Math.max(0, height - boxH),
        width: boxW,
        height: Math.min(boxH, height),
      };
    }
    case 'top-right': {
      const boxW = Math.max(40, Math.round(width * scale));
      const boxH = Math.min(Math.max(25, Math.round(height * scale * 0.75)), height);
      return {
        x: Math.max(0, width - boxW),
        y: 0,
        width: Math.min(boxW, width),
        height: boxH,
      };
    }
    case 'top-left': {
      const boxW = Math.min(Math.max(40, Math.round(width * scale)), width);
      const boxH = Math.min(Math.max(25, Math.round(height * scale * 0.75)), height);
      return { x: 0, y: 0, width: boxW, height: boxH };
    }
    default: {
      const boxW = Math.max(40, Math.round(width * scale));
      const boxH = Math.max(25, Math.round(height * scale * 0.75));
      return {
        x: Math.max(0, width - boxW),
        y: Math.max(0, height - boxH),
        width: Math.min(boxW, width),
        height: Math.min(boxH, height),
      };
    }
  }
}

export function detectWatermarkBounds(
  imgData: ImageData,
  box: WatermarkBox,
  protectText: boolean = true
): WatermarkBox {
  if (!protectText) return box;
  const { width: imgW, height: imgH, data } = imgData;
  const sx = Math.max(0, Math.floor(box.x));
  const sy = Math.max(0, Math.floor(box.y));
  const sw = Math.min(imgW - sx, Math.floor(box.width));
  const sh = Math.min(imgH - sy, Math.floor(box.height));

  if (sw < 10 || sh < 10) return box;

  const isBottom = sy + sh / 2 > imgH / 2;
  const isRight = sx + sw / 2 > imgW / 2;

  const cornerIdx = ((isBottom ? imgH - 1 : 0) * imgW + (isRight ? imgW - 1 : 0)) * 4;
  const cornerR = data[cornerIdx] ?? 0;
  const cornerG = data[cornerIdx + 1] ?? 0;
  const cornerB = data[cornerIdx + 2] ?? 0;

  const startY = isBottom ? Math.max(sy, imgH - Math.round(0.22 * imgH)) : sy;
  const endY = isBottom ? sy + sh : Math.min(sy + sh, Math.round(0.22 * imgH));
  const startX = isRight ? Math.max(sx, imgW - Math.round(0.16 * imgW)) : sx;
  const endX = isRight ? sx + sw : Math.min(sx + sw, Math.round(0.16 * imgW));

  let minX = imgW,
    maxX = 0,
    minY = imgH,
    maxY = 0,
    count = 0;

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const idx = (y * imgW + x) * 4;
      const r = data[idx] ?? 0;
      const g = data[idx + 1] ?? 0;
      const b = data[idx + 2] ?? 0;
      const diff = Math.sqrt((r - cornerR) ** 2 + (g - cornerG) ** 2 + (b - cornerB) ** 2);
      if (diff > 25) {
        count++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (count >= 15 && maxX >= minX && maxY >= minY) {
    const pad = 8;
    const nx = Math.max(sx, minX - pad);
    const ny = Math.max(sy, minY - pad);
    const nw = Math.min(sx + sw - nx, maxX - minX + 1 + pad * 2);
    const nh = Math.min(sy + sh - ny, maxY - minY + 1 + pad * 2);
    return { x: nx, y: ny, width: nw, height: nh };
  }

  return box;
}

export function inpaintWatermark(
  imgData: ImageData,
  box: WatermarkBox,
  edgeBlendRadius: number = 2
) {
  const { width: imgW, height: imgH, data } = imgData;
  const rx = Math.max(0, Math.min(imgW - 1, Math.floor(box.x)));
  const ry = Math.max(0, Math.min(imgH - 1, Math.floor(box.y)));
  const rw = Math.max(1, Math.min(imgW - rx, Math.floor(box.width)));
  const rh = Math.max(1, Math.min(imgH - ry, Math.floor(box.height)));

  if (rw <= 0 || rh <= 0) return;

  const hasLeft = rx > 0;
  const hasRight = rx + rw < imgW;
  const hasTop = ry > 0;
  const hasBottom = ry + rh < imgH;

  if (hasLeft || hasRight || hasTop || hasBottom) {
    // Stage 1: Inverse-square boundary weighted distance interpolation
    for (let y = ry; y < ry + rh; y++) {
      for (let x = rx; x < rx + rw; x++) {
        let weightSum = 0;
        let rAcc = 0,
          gAcc = 0,
          bAcc = 0,
          aAcc = 0;

        if (hasLeft) {
          const dist = x - rx + 1;
          const w = 1 / (dist * dist);
          const idx = (y * imgW + (rx - 1)) * 4;
          rAcc += (data[idx] ?? 0) * w;
          gAcc += (data[idx + 1] ?? 0) * w;
          bAcc += (data[idx + 2] ?? 0) * w;
          aAcc += (data[idx + 3] ?? 255) * w;
          weightSum += w;
        }
        if (hasRight) {
          const dist = rx + rw - x;
          const w = 1 / (dist * dist);
          const idx = (y * imgW + (rx + rw)) * 4;
          rAcc += (data[idx] ?? 0) * w;
          gAcc += (data[idx + 1] ?? 0) * w;
          bAcc += (data[idx + 2] ?? 0) * w;
          aAcc += (data[idx + 3] ?? 255) * w;
          weightSum += w;
        }
        if (hasTop) {
          const dist = y - ry + 1;
          const w = 1 / (dist * dist);
          const idx = ((ry - 1) * imgW + x) * 4;
          rAcc += (data[idx] ?? 0) * w;
          gAcc += (data[idx + 1] ?? 0) * w;
          bAcc += (data[idx + 2] ?? 0) * w;
          aAcc += (data[idx + 3] ?? 255) * w;
          weightSum += w;
        }
        if (hasBottom) {
          const dist = ry + rh - y;
          const w = 1 / (dist * dist);
          const idx = ((ry + rh) * imgW + x) * 4;
          rAcc += (data[idx] ?? 0) * w;
          gAcc += (data[idx + 1] ?? 0) * w;
          bAcc += (data[idx + 2] ?? 0) * w;
          aAcc += (data[idx + 3] ?? 255) * w;
          weightSum += w;
        }

        const outIdx = (y * imgW + x) * 4;
        if (weightSum > 0) {
          data[outIdx] = Math.round(rAcc / weightSum);
          data[outIdx + 1] = Math.round(gAcc / weightSum);
          data[outIdx + 2] = Math.round(bAcc / weightSum);
          data[outIdx + 3] = Math.round(aAcc / weightSum);
        }
      }
    }

    // Stage 2: 4-iteration Laplacian neighbor relaxation
    for (let iter = 0; iter < 4; iter++) {
      for (let y = ry; y < ry + rh; y++) {
        for (let x = rx; x < rx + rw; x++) {
          const leftX = Math.max(0, x - 1);
          const rightX = Math.min(imgW - 1, x + 1);
          const topY = Math.max(0, y - 1);
          const botY = Math.min(imgH - 1, y + 1);

          const lIdx = (y * imgW + leftX) * 4;
          const rIdx = (y * imgW + rightX) * 4;
          const tIdx = (topY * imgW + x) * 4;
          const bIdx = (botY * imgW + x) * 4;
          const cIdx = (y * imgW + x) * 4;

          data[cIdx] = Math.round(
            ((data[lIdx] ?? 0) + (data[rIdx] ?? 0) + (data[tIdx] ?? 0) + (data[bIdx] ?? 0)) / 4
          );
          data[cIdx + 1] = Math.round(
            ((data[lIdx + 1] ?? 0) +
              (data[rIdx + 1] ?? 0) +
              (data[tIdx + 1] ?? 0) +
              (data[bIdx + 1] ?? 0)) /
              4
          );
          data[cIdx + 2] = Math.round(
            ((data[lIdx + 2] ?? 0) +
              (data[rIdx + 2] ?? 0) +
              (data[tIdx + 2] ?? 0) +
              (data[bIdx + 2] ?? 0)) /
              4
          );
          data[cIdx + 3] = Math.round(
            ((data[lIdx + 3] ?? 255) +
              (data[rIdx + 3] ?? 255) +
              (data[tIdx + 3] ?? 255) +
              (data[bIdx + 3] ?? 255)) /
              4
          );
        }
      }
    }

    // Stage 3: Smooth edge feathering
    if (edgeBlendRadius > 0) {
      for (let y = ry; y < ry + rh; y++) {
        for (let x = rx; x < rx + rw; x++) {
          let edgeDist = Infinity;
          if (hasLeft) edgeDist = Math.min(edgeDist, x - rx);
          if (hasRight) edgeDist = Math.min(edgeDist, rx + rw - 1 - x);
          if (hasTop) edgeDist = Math.min(edgeDist, y - ry);
          if (hasBottom) edgeDist = Math.min(edgeDist, ry + rh - 1 - y);

          if (edgeDist < edgeBlendRadius) {
            const factor = (edgeDist + 1) / (edgeBlendRadius + 1);
            const idx = (y * imgW + x) * 4;
            data[idx] = Math.round((data[idx] ?? 0) * factor + (data[idx] ?? 0) * (1 - factor));
          }
        }
      }
    }
  }
}

function applyConvert(source: ImageBitmap | HTMLImageElement, targetMime: string): HTMLCanvasElement {
  const { width, height } = source;
  const { canvas, ctx } = createCanvas(width, height);
  if (targetMime === 'image/jpeg') {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
  }
  ctx.drawImage(source, 0, 0, width, height);
  return canvas;
}
