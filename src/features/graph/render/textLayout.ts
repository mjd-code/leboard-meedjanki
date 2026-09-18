/** Cached text measurement, word wrapping and card sizing. */

import type { NodeMetric } from '../model/graphTypes';

let measureCtx: CanvasRenderingContext2D | null = null;
const widthCache = new Map<string, number>();

function ctx(): CanvasRenderingContext2D | null {
  if (measureCtx) return measureCtx;
  if (typeof document === 'undefined') return null;
  measureCtx = document.createElement('canvas').getContext('2d');
  return measureCtx;
}

export function measureText(text: string, font: string): number {
  const key = `${font}|${text}`;
  const cached = widthCache.get(key);
  if (cached !== undefined) return cached;
  const context = ctx();
  if (!context) {
    const approx = text.length * 6;
    widthCache.set(key, approx);
    return approx;
  }
  context.font = font;
  const width = context.measureText(text).width;
  if (widthCache.size > 5000) widthCache.clear();
  widthCache.set(key, width);
  return width;
}

/** Wraps by word, then splits oversized single tokens by character. */
export function wrapText(text: string, font: string, maxWidth: number, maxLines = 2): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [''];
  const lines: string[] = [];
  let current = '';

  const pushLine = (line: string) => {
    if (lines.length < maxLines) lines.push(line);
  };

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (measureText(candidate, font) <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current) pushLine(current);
    if (measureText(word, font) <= maxWidth) {
      current = word;
      continue;
    }
    // Oversized token: split by character.
    let chunk = '';
    for (const char of word) {
      if (measureText(chunk + char, font) > maxWidth) {
        pushLine(chunk);
        chunk = char;
      } else {
        chunk += char;
      }
    }
    current = chunk;
    if (lines.length >= maxLines) break;
  }
  if (current) pushLine(current);

  if (lines.length === maxLines) {
    const last = lines[maxLines - 1];
    if (measureText(last, font) > maxWidth - 8 || words.join(' ') !== lines.join(' ')) {
      let truncated = last;
      while (truncated.length > 1 && measureText(`${truncated}…`, font) > maxWidth) {
        truncated = truncated.slice(0, -1);
      }
      if (words.join(' ') !== lines.join(' ')) lines[maxLines - 1] = `${truncated}…`;
    }
  }
  return lines.length ? lines : [''];
}

export const CARD_FONT_SIZE = 12;
export const cardFont = (size = CARD_FONT_SIZE, weight = '500') =>
  `${weight} ${size}px 'IBM Plex Sans', system-ui, sans-serif`;

export interface CardLayout extends NodeMetric {
  lines: string[];
}

/** Stable, zoom-independent card geometry derived from the label. */
export function cardLayout(
  label: string,
  options: { root?: boolean; badge?: boolean; fontSize?: number } = {}
): CardLayout {
  const fontSize = options.fontSize ?? (options.root ? CARD_FONT_SIZE + 2 : CARD_FONT_SIZE);
  const font = cardFont(fontSize, options.root ? '600' : '500');
  const maxTextWidth = options.root ? 168 : 132;
  const lines = wrapText(label || 'Untitled', font, maxTextWidth, 2);
  const textWidth = Math.max(...lines.map((line) => measureText(line, font)));
  const paddingX = 12;
  const iconWidth = 16;
  const badgeWidth = options.badge ? 20 : 0;
  const width = Math.max(72, Math.ceil(textWidth + paddingX * 2 + iconWidth + badgeWidth));
  const height = Math.ceil(lines.length * (fontSize + 4) + 14);
  return { width, height, lines };
}
