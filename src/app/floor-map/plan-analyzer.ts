import type { TextItem } from 'pdfjs-dist/types/src/display/api';
import { PlanRoom, RoomKind } from './plan-store';

const RENDER_SCALE = 4;
const KIND_LABEL: Record<RoomKind, string> = {
  apartment: 'Appartamento',
  cellar: 'Cantina',
  attic: 'Solaio',
  garage: 'Box',
  other: 'Altro locale',
};
const KIND_ORDER: RoomKind[] = ['apartment', 'cellar', 'attic', 'garage', 'other'];

interface TextLine {
  text: string;
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export function detectKind(text: string): RoomKind {
  if (/abitazione|appartamento|alloggio/i.test(text)) return 'apartment';
  if (/cantina/i.test(text)) return 'cellar';
  if (/solaio|soffitta|sottotetto/i.test(text)) return 'attic';
  if (/\bbox\b|autorimessa|garage|posto auto/i.test(text)) return 'garage';
  return 'other';
}

/** Raggruppa gli item di testo in righe (coordinate in pixel di render, origine in alto a sinistra). */
export function toLines(
  items: { str: string; x: number; y: number; width: number; height: number }[],
): TextLine[] {
  const sorted = items.filter((item) => item.str.trim()).sort((a, b) => a.y - b.y || a.x - b.x);
  const lines: TextLine[] = [];
  for (const item of sorted) {
    const top = item.y - item.height;
    const line = lines.find((l) => Math.abs(l.bottom - item.y) < item.height * 0.4 && item.x - l.right < item.height * 3);
    if (line) {
      line.text += ` ${item.str.trim()}`;
      line.right = Math.max(line.right, item.x + item.width);
      line.top = Math.min(line.top, top);
    } else {
      lines.push({ text: item.str.trim(), top, bottom: item.y, left: item.x, right: item.x + item.width });
    }
  }
  return lines.sort((a, b) => a.top - b.top);
}

/** Individua i locali dalle didascalie "PIANO ..." + riga descrittiva (es. ABITAZIONE, CANTINA). */
export function findRoomBands(lines: TextLine[], pageHeight: number, headerBottom: number) {
  const captions = lines.filter((line) => /^piano\b/i.test(line.text));
  let previousBottom = headerBottom;
  return captions.map((caption) => {
    const descriptor = lines.find(
      (line) => line.top > caption.bottom && line.top - caption.bottom < caption.bottom - caption.top + 60,
    );
    const kind = detectKind(`${descriptor?.text ?? ''} ${caption.text}`);
    const band = {
      kind,
      title: caption.text,
      top: previousBottom,
      bottom: caption.top,
      centerX: (caption.left + caption.right) / 2,
    };
    previousBottom = Math.min(pageHeight, (descriptor ?? caption).bottom);
    return band;
  });
}

/** Piani dichiarati nel cartiglio catastale, es. "Piano 3-S2" -> ['3', 'S2'], in ordine dall'alto verso il basso. */
export function floorTokens(items: { str: string }[]): string[] {
  for (const item of items) {
    const match = /piano\s+(\S+)\s*$/i.exec(item.str);
    if (match) return match[1].split('-');
  }
  return [];
}

export function kindFromFloorToken(token: string | undefined): RoomKind {
  if (!token) return 'other';
  return /^s/i.test(token) ? 'cellar' : 'apartment';
}

/**
 * Per PDF CAD senza testo estraibile: separa i blocchi di disegno (con la loro didascalia) in base agli spazi bianchi
 * verticali, ignorando cartiglio, cornice, bussola e righe colorate.
 */
export function findInkBands(canvas: HTMLCanvasElement, tokens: string[]) {
  const { width, height } = canvas;
  const x0 = Math.round(width * 0.2);
  const x1 = Math.round(width * 0.76);
  const yStart = Math.round(height * 0.18);
  const yEnd = Math.round(height * 0.9);
  const data = canvas.getContext('2d')!.getImageData(x0, yStart, x1 - x0, yEnd - yStart).data;
  const stride = x1 - x0;
  const hasInk = (row: number) => {
    let count = 0;
    for (let x = 0; x < stride; x++) {
      const i = (row * stride + x) * 4;
      if (data[i] < 140 && data[i + 1] < 140 && data[i + 2] < 140 && ++count >= 2) return true;
    }
    return false;
  };
  const maxGap = Math.round(height * 0.04);
  const runs: { top: number; bottom: number }[] = [];
  for (let row = 0; row < yEnd - yStart; row++) {
    if (!hasInk(row)) continue;
    const last = runs[runs.length - 1];
    if (last && row - last.bottom <= maxGap) last.bottom = row;
    else runs.push({ top: row, bottom: row });
  }
  const significant = runs.filter((run) => run.bottom - run.top > height * 0.05);
  return significant.map((run, index) => ({
    kind: tokens.length === significant.length ? kindFromFloorToken(tokens[index]) : index === 0 ? 'apartment' : ('other' as RoomKind),
    title: `Locale ${index + 1}`,
    top: yStart + run.top - 8,
    bottom: yStart + run.bottom + 12,
    centerX: (x0 + x1) / 2,
  }));
}

/**
 * Nelle planimetrie catastali l'unità in esame ha le pareti tratteggiate, i vicini solo contorni sottili.
 * Ritaglia sul riquadro dei segmenti tratteggiati; se non è significativo restituisce l'immagine intera.
 */
export function isolateUnit(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const cell = 16;
  const { width, height } = canvas;
  const cols = Math.ceil(width / cell);
  const rows = Math.ceil(height / cell);
  const data = canvas.getContext('2d')!.getImageData(0, 0, width, height).data;
  const ink = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    return data[i] < 180 && data[i + 1] < 180 && data[i + 2] < 180;
  };
  // Il tratteggio incrocia molte linee sia per righe sia per colonne; un contorno sottile al massimo in una direzione.
  const dense = new Uint8Array(cols * rows);
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      const x1 = Math.min(width, (cx + 1) * cell);
      const y1 = Math.min(height, (cy + 1) * cell);
      let rowRuns = 0, colRuns = 0;
      for (let y = cy * cell; y < y1; y++) {
        for (let x = cx * cell; x < x1; x++) {
          if (ink(x, y) && (x === cx * cell || !ink(x - 1, y))) rowRuns++;
          if (ink(x, y) && (y === cy * cell || !ink(x, y - 1))) colRuns++;
        }
      }
      dense[cy * cols + cx] = Math.min(rowRuns / (y1 - cy * cell), colRuns / (x1 - cx * cell)) >= 0.7 ? 1 : 0;
    }
  }
  const seen = new Uint8Array(cols * rows);
  let best = { size: 0, minX: 0, minY: 0, maxX: 0, maxY: 0 };
  for (let start = 0; start < dense.length; start++) {
    if (!dense[start] || seen[start]) continue;
    const stack = [start];
    seen[start] = 1;
    const group = { size: 0, minX: cols, minY: rows, maxX: 0, maxY: 0 };
    while (stack.length) {
      const index = stack.pop()!;
      const cx = index % cols, cy = Math.floor(index / cols);
      group.size++;
      group.minX = Math.min(group.minX, cx);
      group.maxX = Math.max(group.maxX, cx);
      group.minY = Math.min(group.minY, cy);
      group.maxY = Math.max(group.maxY, cy);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = cx + dx, ny = cy + dy;
          const next = ny * cols + nx;
          if (nx >= 0 && ny >= 0 && nx < cols && ny < rows && dense[next] && !seen[next]) {
            seen[next] = 1;
            stack.push(next);
          }
        }
      }
    }
    // Le pareti tratteggiate sono segmenti separati: il riquadro dell'unità è l'unione dei segmenti significativi.
    if (group.size >= 8) {
      best = {
        size: best.size + group.size,
        minX: best.size ? Math.min(best.minX, group.minX) : group.minX,
        minY: best.size ? Math.min(best.minY, group.minY) : group.minY,
        maxX: Math.max(best.maxX, group.maxX),
        maxY: Math.max(best.maxY, group.maxY),
      };
    }
  }
  const w = (best.maxX - best.minX + 1) * cell;
  const h = (best.maxY - best.minY + 1) * cell;
  if (best.size < 12 || w < width * 0.2 || h < height * 0.2) return canvas;
  const margin = cell * 3;
  const x0 = Math.max(0, best.minX * cell - margin);
  const y0 = Math.max(0, best.minY * cell - margin);
  const out = document.createElement('canvas');
  out.width = Math.min(width, best.maxX * cell + cell + margin) - x0;
  out.height = Math.min(height, best.maxY * cell + cell + margin) - y0;
  out.getContext('2d')!.drawImage(canvas, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
  return out;
}

function trimWhitespace(canvas: HTMLCanvasElement, padding: number): HTMLCanvasElement {
  const context = canvas.getContext('2d')!;
  const { width, height } = canvas;
  const data = context.getImageData(0, 0, width, height).data;
  let minX = width, minY = height, maxX = 0, maxY = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (data[i] < 200 || data[i + 1] < 200 || data[i + 2] < 200) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX <= minX || maxY <= minY) {
    return canvas;
  }
  const x0 = Math.max(0, minX - padding);
  const y0 = Math.max(0, minY - padding);
  const out = document.createElement('canvas');
  out.width = Math.min(width, maxX + padding) - x0;
  out.height = Math.min(height, maxY + padding) - y0;
  out.getContext('2d')!.drawImage(canvas, x0, y0, out.width, out.height, 0, 0, out.width, out.height);
  return out;
}

const toBlob = (canvas: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Rendering planimetria fallito.'))), 'image/png'),
  );

export async function analyzePlanPdf(file: Blob): Promise<PlanRoom[]> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = 'pdfjs/pdf.worker.min.mjs';
  const document_ = await pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    wasmUrl: 'pdfjs/wasm/',
    standardFontDataUrl: 'pdfjs/standard_fonts/',
  }).promise;
  const page = await document_.getPage(1);
  const viewport = page.getViewport({ scale: RENDER_SCALE });
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(viewport.width);
  canvas.height = Math.round(viewport.height);
  const context = canvas.getContext('2d')!;
  context.fillStyle = '#fff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvas, canvasContext: context, viewport }).promise;

  const content = await page.getTextContent();
  const items = content.items
    .filter((item): item is TextItem => 'str' in item)
    .map((item) => {
      const [x, y] = viewport.convertToViewportPoint(item.transform[4], item.transform[5]);
      return { str: item.str, x, y, width: item.width * RENDER_SCALE, height: item.height * RENDER_SCALE };
    });
  const lines = toLines(items);
  const scaleLine = lines.find((line) => /^scheda\b.*scala/i.test(line.text));
  const headerBottom = (scaleLine?.bottom ?? canvas.height * 0.15) + 20;
  const captionBands = findRoomBands(lines, canvas.height, headerBottom);
  const bands = captionBands.length ? captionBands : findInkBands(canvas, floorTokens(items));

  const rooms: PlanRoom[] = [];
  const reach = canvas.width * 0.3;
  for (const band of bands) {
    const x0 = Math.max(0, Math.round(band.centerX - reach));
    const y0 = Math.max(0, Math.round(band.top));
    const w = Math.min(canvas.width, Math.round(band.centerX + reach)) - x0;
    const h = Math.round(band.bottom) - y0 - 4;
    if (w <= 0 || h <= 0) continue;
    const crop = document.createElement('canvas');
    crop.width = w;
    crop.height = h;
    crop.getContext('2d')!.drawImage(canvas, x0, y0, w, h, 0, 0, w, h);
    const trimmed = trimWhitespace(isolateUnit(crop), 40);
    const duplicates = rooms.filter((room) => room.kind === band.kind).length;
    rooms.push({
      id: `${band.kind}-${rooms.length}`,
      kind: band.kind,
      label: duplicates || band.kind === 'other' ? `${KIND_LABEL[band.kind]} · ${band.title}` : KIND_LABEL[band.kind],
      image: await toBlob(trimmed),
      width: trimmed.width,
      height: trimmed.height,
    });
  }
  if (!rooms.length) {
    const whole = trimWhitespace(canvas, 40);
    rooms.push({ id: 'other-0', kind: 'other', label: 'Planimetria', image: await toBlob(whole), width: whole.width, height: whole.height });
  }
  return rooms.sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind));
}
