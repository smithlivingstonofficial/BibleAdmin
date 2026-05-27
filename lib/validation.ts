import {
  darkBibleClassicCanvas,
  normalizeCanvasSettings,
} from '@/components/DailyVerseCanvasSettings';

export type DailyVerseInput = {
  verse_date: string;
  reference: string;
  verse_text: string;
  is_published: boolean;
  editor_settings: Record<string, unknown>;
};

const DEFAULT_EDITOR_SETTINGS = {
  cardMode: 'verse',
  momentStyle: 'classic',
  hideDate: false,
  imageZoom: 1,
  imageX: 50,
  imageY: 50,
  overlayX: 5,
  overlayY: 28,
  overlayWidth: 90,
  overlayOpacity: 45,
  overlayPadding: 20,
  overlayRadius: 12,
  verseFontSize: 16,
  verseLineHeight: 30,
  textAlign: 'center',
  textColor: '#ffffff',
  gradientStartColor: '#000000',
  gradientEndColor: '#000000',
  referenceBackgroundColor: '#ffffff',
  referenceTextColor: '#000000',
  dateBadgeColor: '#000000',
  referenceFontSize: 14,
  referenceStyle: 'pill',
  verseSpans: [],
  canvas: darkBibleClassicCanvas,
};

const numericSettings = {
  imageZoom: { min: 1, max: 2.5 },
  imageX: { min: 0, max: 100 },
  imageY: { min: 0, max: 100 },
  overlayX: { min: 0, max: 45 },
  overlayY: { min: 0, max: 75 },
  overlayWidth: { min: 55, max: 96 },
  overlayOpacity: { min: 15, max: 75 },
  overlayPadding: { min: 10, max: 34 },
  overlayRadius: { min: 0, max: 28 },
  verseFontSize: { min: 12, max: 34 },
  verseLineHeight: { min: 18, max: 48 },
  referenceFontSize: { min: 10, max: 24 },
};

const allowedMomentStyles = new Set(['classic', 'celebration', 'gold', 'glass']);
const hexColorPattern = /^#[0-9a-f]{6}$/i;

function parseColor(value: unknown, fallback: string) {
  const color = String(value || '').trim();
  return hexColorPattern.test(color) ? color.toLowerCase() : fallback;
}

function parseVerseSpans(value: unknown, fallbackText: string) {
  if (!Array.isArray(value)) {
    return fallbackText ? [{ text: fallbackText }] : [];
  }

  const spans = value
    .filter((span) => span && typeof span.text === 'string')
    .map((span) => ({
      text: String(span.text).slice(0, 1000),
      bold: Boolean(span.bold),
      italic: Boolean(span.italic),
    }))
    .filter((span) => span.text.length > 0);

  return spans.length > 0 ? spans : fallbackText ? [{ text: fallbackText }] : [];
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function sanitizeJsonObject(value: unknown, depth = 0): Record<string, unknown> | null {
  if (!isPlainObject(value) || depth > 6) return null;

  return Object.entries(value).reduce<Record<string, unknown>>((output, [key, entry]) => {
    if (typeof key !== 'string' || key.length > 80) return output;

    if (
      entry === null ||
      typeof entry === 'string' ||
      typeof entry === 'boolean' ||
      (typeof entry === 'number' && Number.isFinite(entry))
    ) {
      output[key] = typeof entry === 'string' ? entry.slice(0, 2000) : entry;
      return output;
    }

    if (Array.isArray(entry)) {
      output[key] = entry
        .slice(0, 40)
        .filter((item) => item === null || ['string', 'boolean', 'number'].includes(typeof item) || isPlainObject(item))
        .map((item) => {
          if (isPlainObject(item)) return sanitizeJsonObject(item, depth + 1);
          if (typeof item === 'string') return item.slice(0, 1000);
          return item;
        });
      return output;
    }

    const objectEntry = sanitizeJsonObject(entry, depth + 1);
    if (objectEntry) output[key] = objectEntry;
    return output;
  }, {});
}

function parseEditorSettings(formData: FormData, verseText: string) {
  const rawSettings = String(formData.get('editor_settings') || '');
  let parsed: Record<string, unknown> = {};

  if (rawSettings) {
    try {
      parsed = JSON.parse(rawSettings);
    } catch {
      throw new Error('Editor settings are invalid.');
    }
  }

  const settings: Record<string, unknown> = { ...DEFAULT_EDITOR_SETTINGS };

  Object.entries(numericSettings).forEach(([key, limits]) => {
    const value = Number(parsed[key]);
    if (Number.isFinite(value)) {
      settings[key] = clamp(value, limits.min, limits.max);
    }
  });

  settings.textAlign = ['left', 'center', 'right'].includes(String(parsed.textAlign))
    ? String(parsed.textAlign)
    : DEFAULT_EDITOR_SETTINGS.textAlign;
  settings.hideDate = parsed.hideDate === true;
  settings.textColor = parseColor(parsed.textColor, DEFAULT_EDITOR_SETTINGS.textColor);
  settings.gradientStartColor = parseColor(parsed.gradientStartColor, DEFAULT_EDITOR_SETTINGS.gradientStartColor);
  settings.gradientEndColor = parseColor(parsed.gradientEndColor, DEFAULT_EDITOR_SETTINGS.gradientEndColor);
  settings.referenceBackgroundColor = parseColor(parsed.referenceBackgroundColor, DEFAULT_EDITOR_SETTINGS.referenceBackgroundColor);
  settings.referenceTextColor = parseColor(parsed.referenceTextColor, DEFAULT_EDITOR_SETTINGS.referenceTextColor);
  settings.dateBadgeColor = parseColor(parsed.dateBadgeColor, DEFAULT_EDITOR_SETTINGS.dateBadgeColor);
  settings.referenceStyle = String(parsed.referenceStyle) === 'minimal' ? 'minimal' : 'pill';
  settings.cardMode = String(parsed.cardMode) === 'imageOnly' ? 'imageOnly' : 'verse';
  settings.momentStyle = allowedMomentStyles.has(String(parsed.momentStyle))
    ? String(parsed.momentStyle)
    : DEFAULT_EDITOR_SETTINGS.momentStyle;
  settings.verseSpans = parseVerseSpans(parsed.verseSpans, verseText);
  settings.canvas = normalizeCanvasSettings(sanitizeJsonObject(parsed.canvas) || DEFAULT_EDITOR_SETTINGS.canvas);

  return settings;
}

export function parseDailyVerseForm(formData: FormData): DailyVerseInput {
  const verseDate = String(formData.get('verse_date') || '').trim();
  const reference = String(formData.get('reference') || '').trim();
  const verseText = String(formData.get('verse_text') || '').trim();
  const editorSettings = parseEditorSettings(formData, verseText);
  const isImageOnly = editorSettings.cardMode === 'imageOnly';

  if (!/^\d{4}-\d{2}-\d{2}$/.test(verseDate)) {
    throw new Error('Verse date is required.');
  }

  if (!isImageOnly && !reference) {
    throw new Error('Reference is required.');
  }

  if (!isImageOnly && !verseText) {
    throw new Error('Verse text is required.');
  }

  return {
    verse_date: verseDate,
    reference,
    verse_text: verseText,
    is_published: formData.get('is_published') === 'on',
    editor_settings: editorSettings,
  };
}
