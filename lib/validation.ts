export type DailyVerseInput = {
  verse_date: string;
  reference: string;
  verse_text: string;
  language: string;
  is_published: boolean;
  editor_settings: Record<string, unknown>;
};

const DEFAULT_EDITOR_SETTINGS = {
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
  referenceFontSize: 14,
  referenceStyle: 'pill',
  verseSpans: [],
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

const allowedTextColors = new Set(['#ffffff', '#f8fafc', '#fef3c7', '#e0f2fe']);

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
  settings.textColor = allowedTextColors.has(String(parsed.textColor))
    ? String(parsed.textColor)
    : DEFAULT_EDITOR_SETTINGS.textColor;
  settings.referenceStyle = String(parsed.referenceStyle) === 'minimal' ? 'minimal' : 'pill';
  settings.verseSpans = parseVerseSpans(parsed.verseSpans, verseText);

  return settings;
}

export function parseDailyVerseForm(formData: FormData): DailyVerseInput {
  const verseDate = String(formData.get('verse_date') || '').trim();
  const reference = String(formData.get('reference') || '').trim();
  const verseText = String(formData.get('verse_text') || '').trim();
  const language = String(formData.get('language') || 'ta').trim() || 'ta';

  if (!/^\d{4}-\d{2}-\d{2}$/.test(verseDate)) {
    throw new Error('Verse date is required.');
  }

  if (!reference) {
    throw new Error('Reference is required.');
  }

  if (!verseText) {
    throw new Error('Verse text is required.');
  }

  return {
    verse_date: verseDate,
    reference,
    verse_text: verseText,
    language,
    is_published: formData.get('is_published') === 'on',
    editor_settings: parseEditorSettings(formData, verseText),
  };
}
