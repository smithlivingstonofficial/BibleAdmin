'use client';

import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import { useFormState } from 'react-dom';
import {
  VersePreviewCard,
  defaultPreviewSettings,
  getDailyVerseFallbackImageUrl,
  normalizePreviewSettings,
  type PreviewSettings,
  type VerseSpan,
} from './VersePreviewCard';

const MAX_BACKGROUND_IMAGE_SIZE_MB = 5;
const MAX_BACKGROUND_IMAGE_SIZE = MAX_BACKGROUND_IMAGE_SIZE_MB * 1024 * 1024;
const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);

export type EditorSettings = PreviewSettings;

export type DailyVerseEditorValues = {
  id?: string;
  verse_date?: string;
  reference?: string;
  verse_text?: string;
  language?: string;
  is_published?: boolean;
  background_image_url?: string | null;
  editor_settings?: Partial<EditorSettings> | null;
};

type Props = {
  action: (state: DailyVerseEditorActionState, formData: FormData) => Promise<DailyVerseEditorActionState>;
  submitLabel: string;
  values?: DailyVerseEditorValues;
  publishedReference?: string | null;
  variant?: 'default' | 'new';
};

type DailyVerseEditorActionState = {
  message: string;
};

export const defaultEditorSettings: EditorSettings = defaultPreviewSettings;

const alignOptions: EditorSettings['textAlign'][] = ['left', 'center', 'right'];
const cardModeOptions: Array<{ value: EditorSettings['cardMode']; label: string; description: string }> = [
  { value: 'verse', label: 'Verse', description: 'Show verse text and reference.' },
  { value: 'imageOnly', label: 'Image only', description: 'Hide verse text and reference.' },
];
const momentStyleOptions: Array<{ value: EditorSettings['momentStyle']; label: string }> = [
  { value: 'classic', label: 'Classic' },
  { value: 'celebration', label: 'Celebration' },
  { value: 'gold', label: 'Gold' },
  { value: 'glass', label: 'Glass' },
];
const textColors = ['#ffffff', '#f8fafc', '#fef3c7', '#e0f2fe'];
const gradientPresets = [
  ['#000000', '#000000'],
  ['#ec4899', '#2563eb'],
  ['#78350f', '#eab308'],
  ['#0f172a', '#64748b'],
];
const hexColorPattern = /^#[0-9a-f]{6}$/i;

function safeColorInputValue(value: string) {
  return hexColorPattern.test(value) ? value : '#000000';
}
const presets: Array<{ label: string; description: string; settings: Partial<EditorSettings> }> = [
  { label: 'Classic center', description: 'Balanced overlay for most verses.', settings: { overlayX: 5, overlayY: 28, overlayWidth: 90, overlayOpacity: 45, verseFontSize: 16, verseLineHeight: 30, textAlign: 'center', referenceStyle: 'pill' } },
  { label: 'Large quote', description: 'Bigger devotional quote treatment.', settings: { overlayX: 6, overlayY: 22, overlayWidth: 88, overlayOpacity: 52, verseFontSize: 20, verseLineHeight: 34, textAlign: 'center', referenceStyle: 'pill' } },
  { label: 'Lower banner', description: 'Keeps faces or scenery visible.', settings: { overlayX: 5, overlayY: 56, overlayWidth: 90, overlayOpacity: 48, verseFontSize: 15, verseLineHeight: 28, textAlign: 'left', referenceStyle: 'pill' } },
  { label: 'Minimal reference', description: 'Clean text over image.', settings: { overlayX: 8, overlayY: 24, overlayWidth: 84, overlayOpacity: 35, verseFontSize: 17, verseLineHeight: 31, textAlign: 'center', referenceStyle: 'minimal' } },
  { label: 'Dark strong', description: 'High contrast for busy photos.', settings: { momentStyle: 'classic', overlayX: 5, overlayY: 30, overlayWidth: 90, overlayOpacity: 62, overlayPadding: 22, verseFontSize: 16, verseLineHeight: 30, textAlign: 'center', referenceStyle: 'pill' } },
  { label: 'Soft caption', description: 'Compact caption-style layout.', settings: { momentStyle: 'glass', overlayX: 7, overlayY: 62, overlayWidth: 86, overlayOpacity: 42, overlayPadding: 14, verseFontSize: 14, verseLineHeight: 24, textAlign: 'left', referenceStyle: 'minimal' } },
  { label: 'Special day', description: 'Bright overlay for celebrations.', settings: { momentStyle: 'celebration', overlayX: 6, overlayY: 28, overlayWidth: 88, overlayOpacity: 52, verseFontSize: 18, verseLineHeight: 32, textAlign: 'center', referenceStyle: 'pill' } },
];

function normalizeSpans(spans: VerseSpan[], fallbackText: string): VerseSpan[] {
  const validSpans = Array.isArray(spans)
    ? spans
        .filter((span) => span && typeof span.text === 'string' && span.text.length > 0)
        .map((span) => ({ text: span.text, bold: Boolean(span.bold), italic: Boolean(span.italic) }))
    : [];

  return validSpans.length > 0 ? validSpans : [{ text: fallbackText }];
}

function mergeSettings(settings: Partial<EditorSettings> | null | undefined, verseText: string): EditorSettings {
  return normalizePreviewSettings(settings as Record<string, unknown> | null | undefined, verseText);
}

function getMonthDay(dateValue?: string) {
  if (!dateValue) return 'Today';
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 'Today';
  return `${date.toLocaleString('default', { month: 'long' })} ${date.getDate()}`;
}

function spansToText(spans: VerseSpan[]) {
  return spans.map((span) => span.text).join('');
}

function splitSpan(span: VerseSpan, start: number, end: number, patch: Partial<VerseSpan> | null) {
  const output: VerseSpan[] = [];
  const before = span.text.slice(0, start);
  const selected = span.text.slice(start, end);
  const after = span.text.slice(end);

  if (before) output.push({ ...span, text: before });
  if (selected) output.push(patch ? { ...span, ...patch, text: selected } : { text: selected });
  if (after) output.push({ ...span, text: after });

  return output;
}

function sliceSpans(spans: VerseSpan[], start: number, end: number) {
  if (start >= end) return [];
  let cursor = 0;
  const output: VerseSpan[] = [];

  spans.forEach((span) => {
    const spanStart = cursor;
    const spanEnd = cursor + span.text.length;
    cursor = spanEnd;

    if (spanEnd <= start || spanStart >= end) return;

    const text = span.text.slice(Math.max(0, start - spanStart), Math.min(span.text.length, end - spanStart));
    if (text) output.push({ ...span, text });
  });

  return output;
}

function mergeAdjacentSpans(spans: VerseSpan[]) {
  return spans.reduce<VerseSpan[]>((merged, span) => {
    if (!span.text) return merged;
    const previous = merged[merged.length - 1];
    if (previous && previous.bold === span.bold && previous.italic === span.italic) {
      previous.text += span.text;
    } else {
      merged.push({ ...span });
    }
    return merged;
  }, []);
}

function reconcileVerseSpans(spans: VerseSpan[], nextText: string) {
  const previousText = spansToText(spans);
  if (previousText === nextText) return spans;
  if (!previousText) return nextText ? [{ text: nextText }] : [];
  if (!nextText) return [];

  let prefixLength = 0;
  while (
    prefixLength < previousText.length &&
    prefixLength < nextText.length &&
    previousText[prefixLength] === nextText[prefixLength]
  ) {
    prefixLength += 1;
  }

  let suffixLength = 0;
  while (
    suffixLength < previousText.length - prefixLength &&
    suffixLength < nextText.length - prefixLength &&
    previousText[previousText.length - 1 - suffixLength] === nextText[nextText.length - 1 - suffixLength]
  ) {
    suffixLength += 1;
  }

  const inserted = nextText.slice(prefixLength, nextText.length - suffixLength);
  return mergeAdjacentSpans([
    ...sliceSpans(spans, 0, prefixLength),
    ...(inserted ? [{ text: inserted }] : []),
    ...sliceSpans(spans, previousText.length - suffixLength, previousText.length),
  ]);
}

function applySpanStyle(spans: VerseSpan[], start: number, end: number, patch: Partial<VerseSpan> | null) {
  if (start === end) return spans;
  let cursor = 0;
  const next: VerseSpan[] = [];

  spans.forEach((span) => {
    const spanStart = cursor;
    const spanEnd = cursor + span.text.length;
    cursor = spanEnd;

    if (spanEnd <= start || spanStart >= end) {
      next.push(span);
      return;
    }

    next.push(...splitSpan(span, Math.max(0, start - spanStart), Math.min(span.text.length, end - spanStart), patch));
  });

  return mergeAdjacentSpans(next);
}

function clampValue(value: number, min: number, max: number, step: number) {
  const clamped = Math.min(Math.max(value, min), max);
  const decimals = step.toString().includes('.') ? step.toString().split('.')[1].length : 0;
  return Number(clamped.toFixed(decimals));
}

function StepperField({
  label,
  help,
  value,
  min,
  max,
  step = 1,
  defaultValue,
  onChange,
}: {
  label: string;
  help: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  defaultValue: number;
  onChange: (value: number) => void;
}) {
  const updateValue = (nextValue: number) => {
    onChange(clampValue(nextValue, min, max, step));
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-xs font-semibold uppercase tracking-wide text-slate-600">{label}</span>
          <span className="hidden sm:inline-flex">
            <button
              type="button"
              aria-label={`${label} help`}
              title={help}
              className="flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 bg-white text-xs font-bold text-slate-500 hover:border-slate-500 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              ?
            </button>
          </span>
        </div>
        <button
          type="button"
          onClick={() => updateValue(defaultValue)}
          className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-bold text-slate-600 shadow-sm hover:bg-slate-100"
        >
          Reset
        </button>
      </div>

      <div className="mt-3 grid grid-cols-[40px_minmax(72px,1fr)_40px] gap-2">
        <button
          type="button"
          onClick={() => updateValue(value - step)}
          className="h-10 rounded-lg border border-slate-300 bg-slate-50 text-lg font-bold text-slate-900 hover:bg-slate-100"
          aria-label={`Decrease ${label}`}
        >
          -
        </button>
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => {
            const nextValue = Number(event.target.value);
            if (Number.isFinite(nextValue)) onChange(nextValue);
          }}
          onBlur={(event) => {
            const nextValue = Number(event.target.value);
            updateValue(Number.isFinite(nextValue) ? nextValue : defaultValue);
          }}
          className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-center font-bold text-slate-950 shadow-inner focus:border-slate-900 focus:outline-none"
          aria-label={label}
        />
        <button
          type="button"
          onClick={() => updateValue(value + step)}
          className="h-10 rounded-lg border border-slate-300 bg-slate-50 text-lg font-bold text-slate-900 hover:bg-slate-100"
          aria-label={`Increase ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-slate-700">{label}</span>
      <div className="mt-2 grid grid-cols-[44px_minmax(0,1fr)] gap-2">
        <input
          type="color"
          value={safeColorInputValue(value)}
          onChange={(event) => onChange(event.target.value)}
          className="h-11 w-11 rounded-lg border border-slate-300 bg-white p-1 shadow-sm"
        />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold uppercase text-slate-800 shadow-sm focus:border-slate-900 focus:outline-none"
        />
      </div>
    </label>
  );
}

function Panel({ title, eyebrow, children }: { title: string; eyebrow?: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-3">
        {eyebrow ? <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-blue-700">{eyebrow}</p> : null}
        <h3 className="text-base font-bold text-slate-950">{title}</h3>
      </div>
      <div className="space-y-4 p-4">
        {children}
      </div>
    </section>
  );
}

function CollapsiblePanel({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
}) {
  return (
    <details className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 border-b border-transparent bg-slate-50/70 px-4 py-3 marker:hidden group-open:border-slate-100">
        <span>
          {eyebrow ? <span className="block text-[11px] font-bold uppercase tracking-[0.16em] text-blue-700">{eyebrow}</span> : null}
          <span className="block text-base font-bold text-slate-950">{title}</span>
        </span>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-lg font-bold text-slate-600 shadow-sm transition group-open:rotate-45">
          +
        </span>
      </summary>
      <div className="space-y-4 p-4">
        {children}
      </div>
    </details>
  );
}

export default function DailyVerseEditor({ action, submitLabel, values, publishedReference, variant = 'default' }: Props) {
  const isNewVariant = variant === 'new';
  const [actionState, formAction] = useFormState(action, { message: '' });
  const actionError = actionState?.message ?? '';
  const initialText = values?.verse_text ?? '';
  const initialSettings = mergeSettings(values?.editor_settings, initialText);
  const [verseDate, setVerseDate] = useState(values?.verse_date ?? '');
  const [reference, setReference] = useState(values?.reference ?? '');
  const [language, setLanguage] = useState(values?.language ?? 'ta');
  const [isPublished, setPublished] = useState(Boolean(values?.is_published));
  const [settings, setSettings] = useState<EditorSettings>(initialSettings);
  const [previewUrl, setPreviewUrl] = useState(values?.background_image_url ?? '');
  const [imageError, setImageError] = useState('');
  const verseInputRef = useRef<HTMLTextAreaElement>(null);

  const verseText = spansToText(settings.verseSpans);
  const editorSettingsValue = useMemo(() => JSON.stringify(settings), [settings]);
  const dateLabel = getMonthDay(verseDate);
  const fallbackPreviewUrl = getDailyVerseFallbackImageUrl(verseDate);
  const previewImageUrl = previewUrl || fallbackPreviewUrl;
  const isImageOnly = settings.cardMode === 'imageOnly';

  const updateSetting = <K extends keyof EditorSettings>(key: K, value: EditorSettings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const patchSettings = (patch: Partial<EditorSettings>) => {
    setSettings((current) => ({ ...current, ...patch }));
  };

  const updateVerseText = (text: string) => {
    updateSetting('verseSpans', reconcileVerseSpans(settings.verseSpans, text));
  };

  const applyTextStyle = (patch: Partial<VerseSpan> | null) => {
    const input = verseInputRef.current;
    if (!input) return;
    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? start;
    if (start === end) return;

    updateSetting('verseSpans', applySpanStyle(settings.verseSpans, start, end, patch));
    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(start, end);
    });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setImageError('');

    if (!file) return;

    if (!allowedImageTypes.has(file.type)) {
      event.target.value = '';
      setImageError('Use a JPG, PNG, or WebP background image.');
      return;
    }

    if (file.size > MAX_BACKGROUND_IMAGE_SIZE) {
      event.target.value = '';
      setImageError(`Choose an image that is ${MAX_BACKGROUND_IMAGE_SIZE_MB} MB or smaller.`);
      return;
    }

    if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const imageUploadField = (
    <label className="block">
      <span className="text-sm font-bold text-slate-700">Background image</span>
      <input type="file" name="background_image" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} className="mt-1 w-full rounded-lg border border-dashed border-blue-200 bg-blue-50/60 px-3 py-3 text-sm shadow-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-950 file:px-3 file:py-2 file:text-sm file:font-bold file:text-white" />
      <span className="mt-2 block text-xs text-slate-500">JPG, PNG, or WebP. Maximum {MAX_BACKGROUND_IMAGE_SIZE_MB} MB. Large phone photos may need to be compressed before upload.</span>
      {imageError ? <span className="mt-2 block rounded bg-red-50 px-3 py-2 text-sm text-red-700">{imageError}</span> : null}
      {values?.background_image_url ? <span className="mt-2 block text-sm text-slate-500">Current image is kept unless a new file is uploaded.</span> : null}
    </label>
  );

  const imageTuningControls = (
    <div className="grid gap-4 sm:grid-cols-3">
      <StepperField
        label="Zoom"
        help="Enlarges the background image inside the square."
        value={settings.imageZoom}
        min={1}
        max={2.5}
        step={0.05}
        defaultValue={defaultEditorSettings.imageZoom}
        onChange={(value) => updateSetting('imageZoom', value)}
      />
      <StepperField
        label="Horizontal focus"
        help="Moves the image focus left or right while zoomed."
        value={settings.imageX}
        min={0}
        max={100}
        defaultValue={defaultEditorSettings.imageX}
        onChange={(value) => updateSetting('imageX', value)}
      />
      <StepperField
        label="Vertical focus"
        help="Moves the image focus up or down while zoomed."
        value={settings.imageY}
        min={0}
        max={100}
        defaultValue={defaultEditorSettings.imageY}
        onChange={(value) => updateSetting('imageY', value)}
      />
    </div>
  );

  const textStyleControls = (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <StepperField
          label="Verse size"
          help="Changes the main verse text size in the preview."
          value={settings.verseFontSize}
          min={12}
          max={34}
          defaultValue={defaultEditorSettings.verseFontSize}
          onChange={(value) => updateSetting('verseFontSize', value)}
        />
        <StepperField
          label="Line height"
          help="Controls the vertical spacing between verse lines."
          value={settings.verseLineHeight}
          min={18}
          max={48}
          defaultValue={defaultEditorSettings.verseLineHeight}
          onChange={(value) => updateSetting('verseLineHeight', value)}
        />
        <StepperField
          label="Reference size"
          help="Changes the font size of the scripture reference."
          value={settings.referenceFontSize}
          min={10}
          max={24}
          defaultValue={defaultEditorSettings.referenceFontSize}
          onChange={(value) => updateSetting('referenceFontSize', value)}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <span className="text-sm font-bold text-slate-700">Alignment</span>
          <div className="mt-2 grid grid-cols-3 rounded-lg border border-slate-300 bg-white p-1 shadow-sm">
            {alignOptions.map((option) => (
              <button key={option} type="button" onClick={() => updateSetting('textAlign', option)} className={`rounded-md px-3 py-2 text-sm font-bold capitalize ${settings.textAlign === option ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100'}`}>
                {option}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="text-sm font-bold text-slate-700">Text color</span>
          <div className="mt-2 flex gap-2">
            {textColors.map((color) => (
              <button key={color} type="button" onClick={() => updateSetting('textColor', color)} className={`h-10 w-10 rounded-full border shadow-sm ${settings.textColor === color ? 'border-slate-950 ring-2 ring-slate-300' : 'border-slate-300'}`} style={{ backgroundColor: color }} />
            ))}
          </div>
        </div>
      </div>
      <ColorField label="Custom text color" value={settings.textColor} onChange={(value) => updateSetting('textColor', value)} />
    </>
  );

  const cardModeControls = (
    <div>
      <span className="text-sm font-bold text-slate-700">Card mode</span>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {cardModeOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => updateSetting('cardMode', option.value)}
            className={`rounded-xl border px-3 py-3 text-left shadow-sm ${settings.cardMode === option.value ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
          >
            <span className="block text-sm font-bold">{option.label}</span>
            <span className={`mt-1 block text-xs leading-5 ${settings.cardMode === option.value ? 'text-slate-200' : 'text-slate-500'}`}>{option.description}</span>
          </button>
        ))}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
          <span className="text-sm font-bold text-slate-700">Hide date badge</span>
          <input
            type="checkbox"
            checked={settings.hideDate}
            onChange={(event) => updateSetting('hideDate', event.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
        </label>
        <ColorField label="Date badge color" value={settings.dateBadgeColor} onChange={(value) => updateSetting('dateBadgeColor', value)} />
      </div>
    </div>
  );

  const momentStyleControls = (
    <div>
      <span className="text-sm font-bold text-slate-700">Moment style</span>
      <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {momentStyleOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => updateSetting('momentStyle', option.value)}
            className={`min-h-11 rounded-lg border px-3 py-2 text-sm font-bold ${settings.momentStyle === option.value ? 'border-slate-950 bg-slate-950 text-white shadow-sm' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <ColorField label="Gradient start" value={settings.gradientStartColor} onChange={(value) => updateSetting('gradientStartColor', value)} />
        <ColorField label="Gradient end" value={settings.gradientEndColor} onChange={(value) => updateSetting('gradientEndColor', value)} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {gradientPresets.map(([start, end]) => (
          <button
            key={`${start}-${end}`}
            type="button"
            onClick={() => patchSettings({ gradientStartColor: start, gradientEndColor: end })}
            className="h-9 w-16 rounded-lg border border-slate-300 shadow-sm"
            style={{ background: `linear-gradient(135deg, ${start}, ${end})` }}
            aria-label={`Use gradient ${start} to ${end}`}
          />
        ))}
      </div>
    </div>
  );

  const overlayControls = (
    <div className="grid gap-4 sm:grid-cols-2">
      <StepperField
        label="Horizontal position"
        help="Moves the dark text box left or right."
        value={settings.overlayX}
        min={0}
        max={45}
        defaultValue={defaultEditorSettings.overlayX}
        onChange={(value) => updateSetting('overlayX', value)}
      />
      <StepperField
        label="Vertical position"
        help="Moves the dark text box up or down."
        value={settings.overlayY}
        min={0}
        max={75}
        defaultValue={defaultEditorSettings.overlayY}
        onChange={(value) => updateSetting('overlayY', value)}
      />
      <StepperField
        label="Width"
        help="Changes how wide the dark text box is."
        value={settings.overlayWidth}
        min={55}
        max={96}
        defaultValue={defaultEditorSettings.overlayWidth}
        onChange={(value) => updateSetting('overlayWidth', value)}
      />
      <StepperField
        label="Opacity"
        help="Controls how dark the text background appears."
        value={settings.overlayOpacity}
        min={15}
        max={75}
        defaultValue={defaultEditorSettings.overlayOpacity}
        onChange={(value) => updateSetting('overlayOpacity', value)}
      />
      <StepperField
        label="Padding"
        help="Adds space between the text and the edge of the dark box."
        value={settings.overlayPadding}
        min={10}
        max={34}
        defaultValue={defaultEditorSettings.overlayPadding}
        onChange={(value) => updateSetting('overlayPadding', value)}
      />
      <StepperField
        label="Corner radius"
        help="Rounds or sharpens the corners of the dark text box."
        value={settings.overlayRadius}
        min={0}
        max={28}
        defaultValue={defaultEditorSettings.overlayRadius}
        onChange={(value) => updateSetting('overlayRadius', value)}
      />
    </div>
  );

  const referenceControls = (
    <>
      <div className="grid grid-cols-2 rounded-lg border border-slate-300 bg-white p-1 shadow-sm">
        {(['pill', 'minimal'] as const).map((option) => (
          <button key={option} type="button" onClick={() => updateSetting('referenceStyle', option)} className={`rounded-md px-3 py-2 text-sm font-bold capitalize ${settings.referenceStyle === option ? 'bg-slate-950 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100'}`}>
            {option}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <ColorField label="Reference background" value={settings.referenceBackgroundColor} onChange={(value) => updateSetting('referenceBackgroundColor', value)} />
        <ColorField label="Reference text" value={settings.referenceTextColor} onChange={(value) => updateSetting('referenceTextColor', value)} />
      </div>
    </>
  );

  const presetControls = (
    <>
      <div className={isNewVariant ? '-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 xl:grid-cols-3' : 'grid gap-3 sm:grid-cols-2 xl:grid-cols-3'}>
        {presets.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => patchSettings(preset.settings)}
            className={isNewVariant ? 'group w-[168px] shrink-0 rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-blue-200 hover:shadow-md sm:w-auto' : 'group rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md'}
          >
            <div className={isNewVariant ? 'w-20' : 'w-full max-w-[120px]'}>
              <VersePreviewCard
                imageUrl={previewImageUrl}
                dateLabel={dateLabel}
                reference={reference || 'Ref'}
                verseText={verseText || 'Verse preview'}
                settings={{ ...settings, ...preset.settings }}
                compact
              />
            </div>
            <div className="mt-3">
              <p className="text-sm font-bold text-slate-950">{preset.label}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">{preset.description}</p>
            </div>
          </button>
        ))}
      </div>
      <button type="button" onClick={() => patchSettings({ ...defaultEditorSettings, verseSpans: settings.verseSpans })} className="min-h-11 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50">
        Reset visual settings
      </button>
    </>
  );

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (imageError) event.preventDefault();
        if (!imageError && isPublished && publishedReference) {
          const confirmed = window.confirm(
            `${publishedReference} is already public. Saving this verse as published will unpublish it. Continue?`
          );

          if (!confirmed) {
            event.preventDefault();
          }
        }
      }}
      className={`grid xl:grid-cols-[minmax(360px,520px)_minmax(0,1fr)] xl:items-stretch ${isNewVariant ? 'gap-3 sm:gap-5' : 'gap-5'}`}
    >
      <input type="hidden" name="verse_text" value={isImageOnly ? '' : verseText} />
      <input type="hidden" name="editor_settings" value={editorSettingsValue} />

      <aside className="contents xl:block xl:self-stretch xl:space-y-3">
        <section className="sticky top-[61px] z-20 -mx-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:mx-0 xl:top-6">
          <div className={isNewVariant ? 'bg-[radial-gradient(circle_at_top_left,#dbeafe,transparent_36%),linear-gradient(135deg,#ffffff,#f8fafc)] p-2 sm:p-4' : 'bg-[radial-gradient(circle_at_top_left,#dbeafe,transparent_36%),linear-gradient(135deg,#ffffff,#f8fafc)] p-2.5 sm:p-4'}>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-blue-700">Preview</p>
                <h2 className="text-base font-bold text-slate-950 sm:text-lg">Live card</h2>
              </div>
              <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-600 shadow-sm ring-1 ring-slate-200">1:1</span>
            </div>

            <div className="mx-auto w-full max-w-[420px] xl:max-w-[440px]">
              <VersePreviewCard
                imageUrl={previewImageUrl}
                dateLabel={dateLabel}
                reference={reference}
                verseText={verseText}
                settings={settings}
              />
            </div>
          </div>
        </section>

        <div className="-mx-1 rounded-2xl border border-slate-200 bg-white/95 px-3 py-3 shadow-sm sm:mx-0">
          {actionError ? (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {actionError}
            </div>
          ) : null}
          {imageError ? (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
              {imageError}
            </div>
          ) : null}
          {/* {publishedReference ? (
            <div className="mb-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-medium leading-5 text-blue-800">
              {publishedReference} is currently public. Saving this as published will ask for confirmation.
            </div>
          ) : null} */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Editor</p>
              <p className="text-base font-bold text-slate-950">{isPublished ? 'Published' : 'Draft'}</p>
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-2 sm:grid-cols-3 sm:min-w-[360px]">
              <label className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-2 py-2 text-xs font-bold text-slate-700 shadow-sm min-[380px]:text-sm">
                <input type="checkbox" name="is_published" checked={isPublished} onChange={(event) => setPublished(event.target.checked)} className="h-4 w-4 rounded border-slate-300" />
                Published
              </label>
              <Link href="/dashboard/daily-verses" className="flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-2 py-2 text-center text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 min-[380px]:text-sm">
                Cancel
              </Link>
              <button className="col-span-2 min-h-12 rounded-lg bg-slate-950 px-3 py-2 text-sm font-bold text-white shadow-lg shadow-slate-950/15 hover:bg-slate-800 sm:col-span-1">{submitLabel}</button>
            </div>
          </div>
        </div>
      </aside>

      <section className="min-w-0 space-y-4">
        <Panel title="Content" eyebrow="Verse">
          {cardModeControls}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-bold text-slate-700">Date</span>
              <input required type="date" name="verse_date" value={verseDate} onChange={(event) => setVerseDate(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 shadow-sm focus:border-slate-900 focus:outline-none" />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-slate-700">Language</span>
              <input required name="language" value={language} onChange={(event) => setLanguage(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 shadow-sm focus:border-slate-900 focus:outline-none" />
            </label>
          </div>
          {isImageOnly ? (
            <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-3 text-sm font-medium leading-6 text-blue-800">
              Image-only mode hides the verse text and reference on the app card. The date badge and selected image remain visible.
            </div>
          ) : (
            <>
              <label className="block">
                <span className="text-sm font-bold text-slate-700">Reference</span>
                <input required name="reference" value={reference} onChange={(event) => setReference(event.target.value)} placeholder="John 3:16" className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 shadow-sm focus:border-slate-900 focus:outline-none" />
              </label>
              <div>
                <span className="text-sm font-bold text-slate-700">Verse text</span>
                <div className="mt-1 flex flex-wrap gap-2 rounded-t-lg border border-b-0 border-slate-300 bg-slate-50 p-2">
                  <button type="button" onClick={() => applyTextStyle({ bold: true })} className="min-h-9 rounded-lg border border-slate-300 bg-white px-3 py-1 text-sm font-bold shadow-sm">B</button>
                  <button type="button" onClick={() => applyTextStyle({ italic: true })} className="min-h-9 rounded-lg border border-slate-300 bg-white px-3 py-1 text-sm italic shadow-sm">I</button>
                  <button type="button" onClick={() => applyTextStyle(null)} className="min-h-9 rounded-lg border border-slate-300 bg-white px-3 py-1 text-sm font-medium shadow-sm">Clear style</button>
                </div>
                <textarea
                  ref={verseInputRef}
                  required
                  rows={5}
                  value={verseText}
                  onChange={(event) => updateVerseText(event.target.value)}
                  className="w-full rounded-b-lg border border-slate-300 bg-white px-3 py-2 leading-7 shadow-sm focus:border-slate-900 focus:outline-none"
                />
                <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Formatted preview</p>
                  <p className="mt-2 whitespace-pre-wrap text-base leading-7 text-slate-900">
                    {settings.verseSpans.length ? settings.verseSpans.map((span, index) => (
                      <span key={`${span.text}-${index}`} className={`${span.bold ? 'font-black' : 'font-semibold'} ${span.italic ? 'italic' : ''}`}>
                        {span.text}
                      </span>
                    )) : <span className="text-slate-400">No verse text yet</span>}
                  </p>
                </div>
                <p className="mt-2 text-xs text-slate-500">Select words in the verse box, then use B or I to style them in the preview and mobile app.</p>
              </div>
            </>
          )}
        </Panel>

        {isNewVariant ? (
          <>
            <Panel title="Background" eyebrow="Image">
              {imageUploadField}
            </Panel>

            <CollapsiblePanel title="Image tuning" eyebrow="Background">
              {imageTuningControls}
            </CollapsiblePanel>

            <CollapsiblePanel title="Text Style" eyebrow="Typography">
              {textStyleControls}
            </CollapsiblePanel>

            <CollapsiblePanel title="Overlay" eyebrow="Layout">
              {momentStyleControls}
              {overlayControls}
            </CollapsiblePanel>

            <CollapsiblePanel title="Reference" eyebrow="Badge">
              {referenceControls}
            </CollapsiblePanel>

            <CollapsiblePanel title="Presets" eyebrow="Quick styles">
              {presetControls}
            </CollapsiblePanel>
          </>
        ) : (
          <>
            <Panel title="Background" eyebrow="Image">
              {imageUploadField}
              {imageTuningControls}
            </Panel>

            <Panel title="Text Style" eyebrow="Typography">
              {textStyleControls}
            </Panel>

            <Panel title="Overlay" eyebrow="Layout">
              {momentStyleControls}
              {overlayControls}
            </Panel>

            <Panel title="Reference" eyebrow="Badge">
              {referenceControls}
            </Panel>

            <Panel title="Presets" eyebrow="Quick styles">
              {presetControls}
            </Panel>
          </>
        )}
      </section>
    </form>
  );
}
