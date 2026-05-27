import { NextRequest } from 'next/server';
import { getDailyVerseFallbackImageUrl, normalizePreviewSettings } from '@/components/VersePreviewCard';
import type { CanvasAnchor, CanvasTextLayer } from '@/components/DailyVerseCanvasSettings';
import { createClient } from '@/lib/supabase/server';

type DailyVerseRow = {
  verse_date: string;
  reference: string;
  verse_text: string;
  background_image_url: string | null;
  editor_settings: Record<string, unknown> | null;
};

const size = 1080;

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function hexToRgb(hex: string) {
  const normalized = /^#[0-9a-f]{6}$/i.test(hex) ? hex : '#000000';
  const value = Number.parseInt(normalized.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function rgba(hex: string, alpha: number) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function previewDate(dateValue: string) {
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 'Today';
  return date.toLocaleDateString('en', { month: 'short', day: 'numeric' });
}

function anchorOffset(anchor: CanvasAnchor, width: number, height: number) {
  const x = anchor.endsWith('center') || anchor === 'center' ? -width / 2 : anchor.endsWith('right') ? -width : 0;
  const y = anchor.startsWith('center') || anchor === 'center' ? -height / 2 : anchor.startsWith('bottom') ? -height : 0;
  return { x, y };
}

function layerBox(layer: Pick<CanvasTextLayer, 'x' | 'y' | 'width' | 'height' | 'anchor' | 'rotation' | 'opacity'>) {
  const width = layer.width * size;
  const height = (layer.height ?? layer.width) * size;
  const offset = anchorOffset(layer.anchor, width, height);
  return {
    x: layer.x * size + offset.x,
    y: layer.y * size + offset.y,
    width,
    height,
    rotation: layer.rotation,
    opacity: layer.opacity,
  };
}

function wrapText(text: string, maxChars: number) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return [];

  const words = normalized.split(' ');
  const lines: string[] = [];
  let line = '';

  words.forEach((word) => {
    if (!line) {
      line = word;
      return;
    }

    if ((line + word).length + 1 <= maxChars) {
      line += ` ${word}`;
      return;
    }

    lines.push(line);
    line = word;
  });

  if (line) lines.push(line);
  return lines.slice(0, 8);
}

function renderShadow(layer: CanvasTextLayer) {
  if (!layer.shadowEnabled) return '';
  return `filter:drop-shadow(0 ${Math.round(size * 0.004)}px ${Math.round(size * (layer.shadowBlur ?? 0.01))}px rgba(0,0,0,${layer.shadowOpacity ?? 0.3}));`;
}

function renderTextLayer({
  layer,
  text,
  quoted = false,
}: {
  layer: CanvasTextLayer;
  text: string;
  quoted?: boolean;
}) {
  const box = layerBox(layer);
  const fontSize = layer.fontSize * size;
  const lineHeight = fontSize * layer.lineHeight;
  const maxChars = Math.max(8, Math.floor(box.width / (fontSize * 0.58)));
  const content = quoted ? `"${text}"` : text;
  const lines = wrapText(content, maxChars);
  const textAnchor = layer.align === 'center' ? 'middle' : layer.align === 'right' ? 'end' : 'start';
  const textX = layer.align === 'center' ? box.width / 2 : layer.align === 'right' ? box.width : 0;
  const startY = Math.max(fontSize, (box.height - lineHeight * lines.length) / 2 + fontSize);

  return `
    <g transform="translate(${box.x} ${box.y}) rotate(${box.rotation} ${box.width / 2} ${box.height / 2})" opacity="${box.opacity}">
      <text x="${textX}" y="${startY}" text-anchor="${textAnchor}" fill="${escapeXml(layer.color)}"
        font-family="Arial, Noto Sans Tamil, sans-serif" font-size="${fontSize}" font-weight="${layer.fontWeight}"
        font-style="${quoted ? 'italic' : 'normal'}" letter-spacing="${layer.letterSpacing * size}" style="${renderShadow(layer)}">
        ${lines.map((line, index) => `<tspan x="${textX}" dy="${index === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`).join('')}
      </text>
    </g>
  `;
}

function renderDateBadge(layer: CanvasTextLayer, dateLabel: string) {
  const box = layerBox(layer);
  const fontSize = layer.fontSize * size;
  const labelWidth = Math.min(size * 0.7, dateLabel.length * fontSize * 0.58 + fontSize * 2.7);
  const height = fontSize * 1.95;
  const iconSize = fontSize;
  const offset = anchorOffset(layer.anchor, labelWidth, height);
  const x = layer.x * size + offset.x;
  const y = layer.y * size + offset.y;

  return `
    <g transform="translate(${x} ${y}) rotate(${box.rotation} ${labelWidth / 2} ${height / 2})" opacity="${box.opacity}">
      <rect width="${labelWidth}" height="${height}" rx="${height / 2}" fill="rgba(15,23,42,0.65)" />
      <text x="${fontSize * 1.65}" y="${height / 2 + fontSize * 0.35}" fill="${escapeXml(layer.color)}"
        font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="${layer.fontWeight}" style="${renderShadow(layer)}">
        ${escapeXml(dateLabel)}
      </text>
      <text x="${fontSize * 0.65}" y="${height / 2 + iconSize * 0.34}" fill="${escapeXml(layer.color)}"
        font-family="Arial, sans-serif" font-size="${iconSize}" font-weight="${layer.fontWeight}">☼</text>
    </g>
  `;
}

function renderReference(layer: CanvasTextLayer & { backgroundColor: string; textColor: string; radius: number }, reference: string) {
  const box = layerBox(layer);
  const fontSize = layer.fontSize * size;
  const height = (layer.height ?? 0.085) * size;
  const radius = layer.radius >= 10 ? height / 2 : layer.radius * size;

  return `
    <g transform="translate(${box.x} ${box.y}) rotate(${box.rotation} ${box.width / 2} ${height / 2})" opacity="${box.opacity}">
      <rect width="${box.width}" height="${height}" rx="${radius}" fill="${escapeXml(layer.backgroundColor)}" />
      <text x="${box.width / 2}" y="${height / 2 + fontSize * 0.36}" text-anchor="middle" fill="${escapeXml(layer.textColor)}"
        font-family="Arial, Noto Sans Tamil, sans-serif" font-size="${fontSize}" font-weight="${layer.fontWeight}"
        letter-spacing="${layer.letterSpacing * size}" style="${renderShadow(layer)}">${escapeXml(reference || 'Reference')}</text>
    </g>
  `;
}

function absoluteUrl(request: NextRequest, value: string | null) {
  if (!value) return '';
  try {
    return new URL(value, request.nextUrl.origin).toString();
  } catch {
    return value;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: verse, error } = await supabase
    .from('daily_verses')
    .select('verse_date, reference, verse_text, background_image_url, editor_settings')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    return new Response(error.message, { status: 500 });
  }

  if (!verse) {
    return new Response('Daily verse not found.', { status: 404 });
  }

  const row = verse as DailyVerseRow;
  const settings = normalizePreviewSettings(row.editor_settings, row.verse_text);
  const canvas = settings.canvas;
  const imageUrl = absoluteUrl(request, row.background_image_url || getDailyVerseFallbackImageUrl(row.verse_date));
  const background = canvas.background;
  const watermark = canvas.watermark;
  const showWatermarkText = watermark.enabled && (watermark.mode === 'text' || watermark.mode === 'textImage');
  const showWatermarkImage = watermark.enabled && (watermark.mode === 'image' || watermark.mode === 'textImage') && watermark.imageUrl;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#e2e8f0" />
  ${imageUrl ? `<image href="${escapeXml(imageUrl)}" x="${-(background.zoom - 1) * background.focusX * size}" y="${-(background.zoom - 1) * background.focusY * size}" width="${background.zoom * size}" height="${background.zoom * size}" preserveAspectRatio="xMidYMid slice" style="filter:brightness(${background.brightness}) blur(${background.blur * size}px);" />` : ''}
  <rect width="${size}" height="${size}" fill="${rgba(background.overlayColor, background.overlayOpacity)}" />
  ${settings.hideDate ? '' : renderDateBadge(canvas.layers.date, previewDate(row.verse_date))}
  ${settings.cardMode === 'imageOnly' ? '' : renderTextLayer({ layer: canvas.layers.verse, text: row.verse_text, quoted: true })}
  ${settings.cardMode === 'imageOnly' ? '' : renderReference(canvas.layers.reference, row.reference)}
  ${showWatermarkImage ? (() => {
    const box = layerBox(watermark.imageLayer);
    const url = absoluteUrl(request, watermark.imageUrl);
    return `<image href="${escapeXml(url)}" x="${box.x}" y="${box.y}" width="${box.width}" height="${box.width}" preserveAspectRatio="xMidYMid meet" transform="rotate(${box.rotation} ${box.x + box.width / 2} ${box.y + box.width / 2})" opacity="${box.opacity}" />`;
  })() : ''}
  ${showWatermarkText ? renderTextLayer({ layer: watermark.textLayer, text: watermark.text }) : ''}
</svg>`;

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Content-Disposition': `attachment; filename="daily-verse-${row.verse_date}.svg"`,
      'Cache-Control': 'private, max-age=0, must-revalidate',
    },
  });
}
