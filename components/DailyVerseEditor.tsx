'use client';

import Link from 'next/link';
import { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import { useFormState } from 'react-dom';
import type { IconType } from 'react-icons';
import {
  FiAlignCenter,
  FiAlignLeft,
  FiAlignRight,
  FiArrowLeft,
  FiBookmark,
  FiCalendar,
  FiCheck,
  FiCrosshair,
  FiDroplet,
  FiEdit3,
  FiEye,
  FiGrid,
  FiImage,
  FiLayers,
  FiMaximize2,
  FiMove,
  FiRotateCw,
  FiSliders,
  FiStar,
  FiSun,
  FiType,
  FiUpload,
} from 'react-icons/fi';
import { DailyVerseCanvas } from './DailyVerseCanvas';
import {
  darkBibleClassicCanvas,
  normalizeCanvasSettings,
  type CanvasAnchor,
  type CanvasBackgroundSettings,
  type CanvasSettings,
  type CanvasTextLayer,
  type WatermarkMode,
} from './DailyVerseCanvasSettings';
import {
  defaultPreviewSettings,
  getDailyVerseFallbackImageUrl,
  normalizePreviewSettings,
  type PreviewSettings,
  type VerseSpan,
} from './VersePreviewCard';

const MAX_BACKGROUND_IMAGE_SIZE_MB = 5;
const MAX_BACKGROUND_IMAGE_SIZE = MAX_BACKGROUND_IMAGE_SIZE_MB * 1024 * 1024;
const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const hexColorPattern = /^#[0-9a-f]{6}$/i;

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

type DailyVerseEditorActionState = {
  message: string;
};

type Props = {
  action: (state: DailyVerseEditorActionState, formData: FormData) => Promise<DailyVerseEditorActionState>;
  submitLabel: string;
  values?: DailyVerseEditorValues;
  publishedReference?: string | null;
  variant?: 'default' | 'new';
};

type Category = 'text' | 'position' | 'background' | 'style' | 'watermark' | 'template';
type LayerKey = 'date' | 'verse' | 'reference' | 'watermark' | 'background';

type ToolbarItem = {
  key: Category;
  label: string;
  icon: IconType;
};

type OptionItem = {
  key: string;
  label: string;
  icon: IconType;
};

const toolbarItems: ToolbarItem[] = [
  { key: 'text', label: 'Text', icon: FiType },
  { key: 'position', label: 'Position', icon: FiMove },
  { key: 'background', label: 'Background', icon: FiImage },
  { key: 'style', label: 'Style', icon: FiDroplet },
  { key: 'watermark', label: 'Watermark', icon: FiStar },
  { key: 'template', label: 'Template', icon: FiGrid },
];

const categoryOptions: Record<Category, OptionItem[]> = {
  text: [
    { key: 'content', label: 'Content', icon: FiEdit3 },
    { key: 'font', label: 'Font', icon: FiType },
    { key: 'color', label: 'Color', icon: FiDroplet },
    { key: 'align', label: 'Align', icon: FiAlignCenter },
    { key: 'spacing', label: 'Spacing', icon: FiSliders },
  ],
  position: [
    { key: 'move', label: 'Move', icon: FiMove },
    { key: 'size', label: 'Size', icon: FiMaximize2 },
    { key: 'anchor', label: 'Anchor', icon: FiCrosshair },
    { key: 'presets', label: 'Presets', icon: FiGrid },
  ],
  background: [
    { key: 'image', label: 'Image', icon: FiUpload },
    { key: 'overlay', label: 'Overlay', icon: FiDroplet },
    { key: 'focus', label: 'Focus', icon: FiCrosshair },
    { key: 'effects', label: 'Effects', icon: FiSun },
  ],
  style: [
    { key: 'reference', label: 'Reference', icon: FiBookmark },
    { key: 'shadow', label: 'Shadow', icon: FiLayers },
    { key: 'overlay', label: 'Overlay', icon: FiDroplet },
  ],
  watermark: [
    { key: 'mode', label: 'Mode', icon: FiEye },
    { key: 'text', label: 'Text', icon: FiType },
    { key: 'image', label: 'Image', icon: FiImage },
    { key: 'position', label: 'Position', icon: FiMove },
  ],
  template: [
    { key: 'presets', label: 'Presets', icon: FiGrid },
    { key: 'reset', label: 'Reset', icon: FiRotateCw },
  ],
};

const layerItems: Array<{ key: LayerKey; label: string; icon: IconType }> = [
  { key: 'date', label: 'Date', icon: FiCalendar },
  { key: 'verse', label: 'Verse', icon: FiType },
  { key: 'reference', label: 'Reference', icon: FiBookmark },
  { key: 'watermark', label: 'Watermark', icon: FiStar },
  { key: 'background', label: 'Background', icon: FiImage },
];

const anchors: Array<{ value: CanvasAnchor; label: string }> = [
  { value: 'top-left', label: 'Top left' },
  { value: 'top-center', label: 'Top center' },
  { value: 'center', label: 'Center' },
  { value: 'bottom-center', label: 'Bottom center' },
];

const presetPlacements = [
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
  'center',
  'diagonal',
] as const;

const textColors = ['#ffffff', '#f8fafc', '#fef3c7', '#111827', '#0f172a'];
const fontWeights = [
  { label: 'Regular', value: 400 },
  { label: 'Medium', value: 500 },
  { label: 'Bold', value: 700 },
  { label: 'Extra bold', value: 800 },
  { label: 'Black', value: 950 },
];

export const defaultEditorSettings: EditorSettings = defaultPreviewSettings;

function safeColorInputValue(value: string) {
  return hexColorPattern.test(value) ? value : '#000000';
}

function clampValue(value: number, min: number, max: number, step: number) {
  const clamped = Math.min(Math.max(value, min), max);
  const decimals = step.toString().includes('.') ? step.toString().split('.')[1].length : 0;
  return Number(clamped.toFixed(decimals));
}

function getMonthDay(dateValue?: string) {
  if (!dateValue) return 'Today';
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 'Today';
  return `${date.toLocaleString('default', { month: 'short' })} ${date.getDate()}`;
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
  while (prefixLength < previousText.length && prefixLength < nextText.length && previousText[prefixLength] === nextText[prefixLength]) {
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

function mergeSettings(settings: Partial<EditorSettings> | null | undefined, verseText: string): EditorSettings {
  return normalizePreviewSettings(settings as Record<string, unknown> | null | undefined, verseText);
}

function copyCanvas(canvas: CanvasSettings): CanvasSettings {
  return normalizeCanvasSettings(JSON.parse(JSON.stringify(canvas)) as CanvasSettings);
}

function legacyFieldsFromCanvas(canvas: CanvasSettings): Partial<EditorSettings> {
  return {
    imageZoom: canvas.background.zoom,
    imageX: Math.round(canvas.background.focusX * 100),
    imageY: Math.round(canvas.background.focusY * 100),
    overlayOpacity: Math.round(canvas.background.overlayOpacity * 100),
    textColor: canvas.layers.verse.color,
    textAlign: canvas.layers.verse.align,
    referenceBackgroundColor: canvas.layers.reference.backgroundColor,
    referenceTextColor: canvas.layers.reference.textColor,
  };
}

function FieldShell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#155eef] focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 ${props.className || ''}`}
    />
  );
}

const TextArea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function TextArea(props, ref) {
  return (
    <textarea
      {...props}
      ref={ref}
      className={`w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold leading-6 text-slate-950 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#155eef] focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 ${props.className || ''}`}
    />
  );
});

function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm font-black text-slate-950 shadow-sm outline-none transition focus:border-[#155eef] focus:ring-4 focus:ring-blue-100 ${props.className || ''}`}
    />
  );
}

function StepperField({
  label,
  value,
  min,
  max,
  step = 1,
  displayValue,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  displayValue?: string;
  onChange: (value: number) => void;
}) {
  const updateValue = (nextValue: number) => onChange(clampValue(nextValue, min, max, step));

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-[0_6px_18px_rgba(15,23,42,0.04)]">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</span>
        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-black text-slate-700">{displayValue ?? value}</span>
      </div>
      <div className="grid grid-cols-[42px_minmax(0,1fr)_42px] gap-2">
        <button type="button" onClick={() => updateValue(value - step)} className="flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-lg font-black text-slate-950 hover:bg-slate-100">
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
          onBlur={(event) => updateValue(Number(event.target.value))}
          className="min-h-10 rounded-lg border border-slate-200 bg-white px-2 text-center text-sm font-black text-slate-950 shadow-inner outline-none focus:border-[#155eef] focus:ring-4 focus:ring-blue-100"
        />
        <button type="button" onClick={() => updateValue(value + step)} className="flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-lg font-black text-slate-950 hover:bg-slate-100">
          +
        </button>
      </div>
    </div>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  displayValue,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  displayValue: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-[0_6px_18px_rgba(15,23,42,0.04)]">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</span>
        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-black text-slate-700">{displayValue}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(clampValue(Number(event.target.value), min, max, step))}
        className="h-1.5 w-full cursor-pointer accent-[#155eef]"
      />
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-[0_6px_18px_rgba(15,23,42,0.04)]">
      <span className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</span>
      <div className="mt-2 grid grid-cols-[52px_minmax(0,1fr)] gap-2">
        <input type="color" value={safeColorInputValue(value)} onChange={(event) => onChange(event.target.value)} className="h-10 w-12 rounded-lg border border-slate-200 bg-white p-1" />
        <TextInput value={value} onChange={(event) => onChange(event.target.value)} />
      </div>
    </div>
  );
}

function PreserveSelectionButton({ children, onClick, className }: { children: React.ReactNode; onClick: () => void; className?: string }) {
  return (
    <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={onClick} className={className}>
      {children}
    </button>
  );
}

function ControlCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: IconType;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-[0_10px_28px_rgba(15,23,42,0.05)] ring-1 ring-white sm:p-4">
      <div className="mb-3 flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0f172a] text-white">
          <Icon className="h-5 w-5" />
        </span>
        <h3 className="text-base font-black text-slate-950">{title}</h3>
      </div>
      <div className="space-y-2.5">{children}</div>
    </section>
  );
}

function OptionRow({
  options,
  activeOption,
  onChange,
  className = '',
}: {
  options: OptionItem[];
  activeOption: string;
  onChange: (option: string) => void;
  className?: string;
}) {
  return (
    <div className={`flex gap-2 overflow-x-auto px-1 py-2 ${className}`}>
      {options.map((option) => {
        const Icon = option.icon;
        const active = activeOption === option.key;
        return (
          <button
            key={option.key}
            type="button"
            onClick={() => onChange(option.key)}
            className={`flex min-h-10 shrink-0 items-center gap-2 rounded-lg border px-3 text-sm font-black shadow-sm transition ${active ? 'border-[#155eef] bg-[#155eef] text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'}`}
          >
            <Icon className="h-4 w-4" />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}) {
  return (
    <div className="grid gap-1 rounded-lg border border-slate-200 bg-slate-100 p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`min-h-11 rounded-md px-2 text-xs font-black capitalize transition ${value === option.value ? 'bg-white text-slate-950 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:bg-white/70'}`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export default function DailyVerseEditor({ action, submitLabel, values, publishedReference }: Props) {
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
  const [selectedLayer, setSelectedLayer] = useState<LayerKey>('verse');
  const [activeCategory, setActiveCategory] = useState<Category>('text');
  const [activeOption, setActiveOption] = useState(categoryOptions.text[0].key);
  const [imageError, setImageError] = useState('');
  const verseInputRef = useRef<HTMLTextAreaElement>(null);

  const verseText = spansToText(settings.verseSpans);
  const dateLabel = getMonthDay(verseDate);
  const fallbackPreviewUrl = getDailyVerseFallbackImageUrl(verseDate);
  const previewImageUrl = previewUrl || fallbackPreviewUrl;
  const isImageOnly = settings.cardMode === 'imageOnly';
  const activeTextLayerKey = selectedLayer === 'date' || selectedLayer === 'reference' || selectedLayer === 'verse' ? selectedLayer : 'verse';
  const activeLayer = settings.canvas.layers[activeTextLayerKey];
  const currentOption = categoryOptions[activeCategory].find((option) => option.key === activeOption) || categoryOptions[activeCategory][0];
  const editorSettingsValue = useMemo(() => JSON.stringify(settings), [settings]);

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith('blob:')) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    const watermarkUrl = settings.canvas.watermark.imageUrl;
    return () => {
      if (watermarkUrl?.startsWith('blob:')) URL.revokeObjectURL(watermarkUrl);
    };
  }, [settings.canvas.watermark.imageUrl]);

  const patchSettings = (patch: Partial<EditorSettings>) => {
    setSettings((current) => ({ ...current, ...patch }));
  };

  const patchCanvas = (updater: (canvas: CanvasSettings) => CanvasSettings) => {
    setSettings((current) => {
      const canvas = normalizeCanvasSettings(updater(current.canvas));
      return {
        ...current,
        ...legacyFieldsFromCanvas(canvas),
        canvas,
      };
    });
  };

  const patchLayer = (layer: 'date' | 'verse' | 'reference', patch: Partial<CanvasTextLayer> & Record<string, unknown>) => {
    patchCanvas((canvas) => ({
      ...canvas,
      layers: {
        ...canvas.layers,
        [layer]: { ...canvas.layers[layer], ...patch },
      },
    }));
  };

  const patchBackground = (patch: Partial<CanvasBackgroundSettings>) => {
    patchCanvas((canvas) => ({
      ...canvas,
      background: { ...canvas.background, ...patch },
    }));
  };

  const patchWatermark = (patch: Partial<CanvasSettings['watermark']>) => {
    patchCanvas((canvas) => ({
      ...canvas,
      watermark: { ...canvas.watermark, ...patch },
    }));
  };

  const updateVerseText = (text: string) => {
    patchSettings({ verseSpans: reconcileVerseSpans(settings.verseSpans, text) });
  };

  const applyTextStyle = (patch: Partial<VerseSpan> | null) => {
    const input = verseInputRef.current;
    if (!input) return;
    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? start;
    if (start === end) return;

    patchSettings({ verseSpans: applySpanStyle(settings.verseSpans, start, end, patch) });
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

  const handleWatermarkImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setImageError('');

    if (!file) return;
    if (!allowedImageTypes.has(file.type)) {
      event.target.value = '';
      setImageError('Use a JPG, PNG, or WebP watermark image.');
      return;
    }
    if (file.size > MAX_BACKGROUND_IMAGE_SIZE) {
      event.target.value = '';
      setImageError(`Choose a watermark image that is ${MAX_BACKGROUND_IMAGE_SIZE_MB} MB or smaller.`);
      return;
    }

    const previousUrl = settings.canvas.watermark.imageUrl;
    if (previousUrl?.startsWith('blob:')) URL.revokeObjectURL(previousUrl);
    const imageUrl = URL.createObjectURL(file);
    patchWatermark({
      enabled: true,
      mode: settings.canvas.watermark.mode === 'text' ? 'textImage' : 'image',
      imageUrl,
    });
  };

  const changeCategory = (category: Category) => {
    setActiveCategory(category);
    setActiveOption(categoryOptions[category][0].key);
    if (category === 'background') setSelectedLayer('background');
    if (category === 'watermark') setSelectedLayer('watermark');
  };

  const setWatermarkMode = (mode: WatermarkMode) => {
    patchWatermark({ mode, enabled: mode !== 'none' });
  };

  const applyPreset = (target: LayerKey, preset: typeof presetPlacements[number]) => {
    if (target === 'background') return;
    const values = {
      'top-left': { x: 0.12, y: 0.12, anchor: 'center' as CanvasAnchor, rotation: 0 },
      'top-right': { x: 0.88, y: 0.12, anchor: 'center' as CanvasAnchor, rotation: 0 },
      'bottom-left': { x: 0.12, y: 0.88, anchor: 'center' as CanvasAnchor, rotation: 0 },
      'bottom-right': { x: 0.88, y: 0.88, anchor: 'center' as CanvasAnchor, rotation: 0 },
      center: { x: 0.5, y: 0.5, anchor: 'center' as CanvasAnchor, rotation: 0 },
      diagonal: { x: 0.5, y: 0.5, anchor: 'center' as CanvasAnchor, rotation: -32 },
    }[preset];

    if (target === 'watermark') {
      patchWatermark({
        textLayer: { ...settings.canvas.watermark.textLayer, ...values },
        imageLayer: { ...settings.canvas.watermark.imageLayer, ...values },
      });
      return;
    }

    patchLayer(target, values);
  };

  const resetLayer = () => {
    if (selectedLayer === 'background') {
      patchBackground(darkBibleClassicCanvas.background);
      return;
    }
    if (selectedLayer === 'watermark') {
      patchWatermark(darkBibleClassicCanvas.watermark);
      return;
    }
    patchLayer(selectedLayer, darkBibleClassicCanvas.layers[selectedLayer]);
  };

  const resetTemplate = () => {
    const canvas = copyCanvas(darkBibleClassicCanvas);
    setSettings((current) => ({
      ...current,
      canvas,
      ...legacyFieldsFromCanvas(canvas),
    }));
  };

  const renderTextControls = () => {
    if (activeOption === 'content') {
      return (
        <ControlCard title="Content" icon={FiEdit3}>
          <Segmented value={settings.cardMode} options={[{ value: 'verse', label: 'Verse' }, { value: 'imageOnly', label: 'Image only' }]} onChange={(value) => patchSettings({ cardMode: value })} />
          <label className="flex min-h-11 items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <span className="text-sm font-black text-slate-700">Show date badge</span>
            <input type="checkbox" checked={!settings.hideDate} onChange={(event) => patchSettings({ hideDate: !event.target.checked })} className="h-4 w-4 rounded border-slate-300" />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <FieldShell label="Date">
              <TextInput required type="date" name="verse_date" value={verseDate} onChange={(event) => setVerseDate(event.target.value)} />
            </FieldShell>
            <FieldShell label="Language">
              <TextInput required name="language" value={language} onChange={(event) => setLanguage(event.target.value)} />
            </FieldShell>
          </div>
          <FieldShell label="Reference">
            <TextInput disabled={isImageOnly} required={!isImageOnly} name="reference" value={reference} onChange={(event) => setReference(event.target.value)} placeholder={isImageOnly ? 'Hidden in image-only mode' : 'John 3:16'} />
          </FieldShell>
          <FieldShell label="Verse text">
            <div className="flex flex-wrap gap-2 rounded-t-xl border border-b-0 border-slate-200 bg-slate-50 p-2">
              <PreserveSelectionButton onClick={() => applyTextStyle({ bold: true })} className={`min-h-9 rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm font-black shadow-sm ${isImageOnly ? 'pointer-events-none opacity-40' : ''}`}>B</PreserveSelectionButton>
              <PreserveSelectionButton onClick={() => applyTextStyle({ italic: true })} className={`min-h-9 rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm italic shadow-sm ${isImageOnly ? 'pointer-events-none opacity-40' : ''}`}>I</PreserveSelectionButton>
              <PreserveSelectionButton onClick={() => applyTextStyle(null)} className={`min-h-9 rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm font-bold shadow-sm ${isImageOnly ? 'pointer-events-none opacity-40' : ''}`}>Clear</PreserveSelectionButton>
            </div>
            <TextArea ref={verseInputRef} disabled={isImageOnly} required={!isImageOnly} rows={4} value={verseText} onChange={(event) => updateVerseText(event.target.value)} className="rounded-t-none" placeholder={isImageOnly ? 'Image-only mode publishes the artwork without verse text.' : undefined} />
          </FieldShell>
        </ControlCard>
      );
    }

    if (activeOption === 'font') {
      return (
        <ControlCard title="Font" icon={FiType}>
          <div className="grid gap-3 sm:grid-cols-2">
            <StepperField label="Font size" value={activeLayer.fontSize} min={0.012} max={0.16} step={0.002} displayValue={`${Math.round(activeLayer.fontSize * 1000)}px`} onChange={(value) => patchLayer(activeTextLayerKey, { fontSize: value })} />
            <FieldShell label="Font weight">
              <SelectInput value={activeLayer.fontWeight} onChange={(event) => patchLayer(activeTextLayerKey, { fontWeight: Number(event.target.value) })}>
                {fontWeights.map((weight) => <option key={weight.value} value={weight.value}>{weight.label}</option>)}
              </SelectInput>
            </FieldShell>
          </div>
        </ControlCard>
      );
    }

    if (activeOption === 'color') {
      const currentColor = activeTextLayerKey === 'reference' ? settings.canvas.layers.reference.textColor : activeLayer.color;
      return (
        <ControlCard title="Color" icon={FiDroplet}>
          <ColorField label="Text color" value={currentColor} onChange={(value) => activeTextLayerKey === 'reference' ? patchLayer('reference', { color: value, textColor: value }) : patchLayer(activeTextLayerKey, { color: value })} />
          <div className="flex flex-wrap gap-2">
            {textColors.map((swatch) => (
              <button key={swatch} type="button" onClick={() => activeTextLayerKey === 'reference' ? patchLayer('reference', { color: swatch, textColor: swatch }) : patchLayer(activeTextLayerKey, { color: swatch })} className="h-11 w-11 rounded-full border border-slate-200 shadow-sm ring-offset-2" style={{ backgroundColor: swatch }} />
            ))}
          </div>
        </ControlCard>
      );
    }

    if (activeOption === 'align') {
      return (
        <ControlCard title="Align" icon={FiAlignCenter}>
          <div className="grid grid-cols-3 gap-2">
            {([
              ['left', FiAlignLeft, 'Left'],
              ['center', FiAlignCenter, 'Center'],
              ['right', FiAlignRight, 'Right'],
            ] as const).map(([align, Icon, label]) => (
              <button key={align} type="button" onClick={() => patchLayer(activeTextLayerKey, { align })} className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl border text-xs font-black ${activeLayer.align === align ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-700'}`}>
                <Icon className="h-5 w-5" />
                {label}
              </button>
            ))}
          </div>
        </ControlCard>
      );
    }

    return (
      <ControlCard title="Spacing" icon={FiSliders}>
        <SliderField label="Opacity" value={activeLayer.opacity} min={0} max={1} step={0.01} displayValue={`${Math.round(activeLayer.opacity * 100)}%`} onChange={(value) => patchLayer(activeTextLayerKey, { opacity: value })} />
        <SliderField label="Letter spacing" value={activeLayer.letterSpacing} min={-0.02} max={0.08} step={0.002} displayValue={activeLayer.letterSpacing.toFixed(3)} onChange={(value) => patchLayer(activeTextLayerKey, { letterSpacing: value })} />
        <SliderField label="Line height" value={activeLayer.lineHeight} min={0.8} max={2.4} step={0.05} displayValue={activeLayer.lineHeight.toFixed(2)} onChange={(value) => patchLayer(activeTextLayerKey, { lineHeight: value })} />
      </ControlCard>
    );
  };

  const renderPositionControls = () => {
    if (selectedLayer === 'background') {
      return (
        <ControlCard title="Position" icon={FiMove}>
          <div className="rounded-2xl border border-blue-100 bg-blue-50 px-3 py-3 text-sm font-bold leading-6 text-blue-800">
            Choose Date, Verse, Reference, or Watermark to edit position.
          </div>
        </ControlCard>
      );
    }

    const watermarkLayer = settings.canvas.watermark.textLayer;
    const layerX = selectedLayer === 'watermark' ? watermarkLayer.x : activeLayer.x;
    const layerY = selectedLayer === 'watermark' ? watermarkLayer.y : activeLayer.y;
    const layerWidth = selectedLayer === 'watermark' ? watermarkLayer.width : activeLayer.width;
    const layerRotation = selectedLayer === 'watermark' ? watermarkLayer.rotation : activeLayer.rotation;

    const updateWatermarkPosition = (patch: Partial<typeof settings.canvas.watermark.textLayer>) => {
      patchWatermark({
        textLayer: { ...settings.canvas.watermark.textLayer, ...patch },
        imageLayer: { ...settings.canvas.watermark.imageLayer, ...patch },
      });
    };

    if (activeOption === 'move') {
      return (
        <ControlCard title="Move" icon={FiMove}>
          <SliderField label="X position" value={layerX} min={0} max={1} step={0.01} displayValue={layerX.toFixed(2)} onChange={(value) => selectedLayer === 'watermark' ? updateWatermarkPosition({ x: value }) : patchLayer(activeTextLayerKey, { x: value })} />
          <SliderField label="Y position" value={layerY} min={0} max={1} step={0.01} displayValue={layerY.toFixed(2)} onChange={(value) => selectedLayer === 'watermark' ? updateWatermarkPosition({ y: value }) : patchLayer(activeTextLayerKey, { y: value })} />
        </ControlCard>
      );
    }

    if (activeOption === 'size') {
      return (
        <ControlCard title="Size" icon={FiMaximize2}>
          <SliderField label="Width" value={layerWidth} min={0.05} max={1} step={0.01} displayValue={layerWidth.toFixed(2)} onChange={(value) => selectedLayer === 'watermark' ? updateWatermarkPosition({ width: value }) : patchLayer(activeTextLayerKey, { width: value })} />
          <SliderField label="Rotation" value={layerRotation} min={-180} max={180} step={1} displayValue={`${layerRotation}deg`} onChange={(value) => selectedLayer === 'watermark' ? updateWatermarkPosition({ rotation: value }) : patchLayer(activeTextLayerKey, { rotation: value })} />
        </ControlCard>
      );
    }

    if (activeOption === 'anchor') {
      return (
        <ControlCard title="Anchor" icon={FiCrosshair}>
          {selectedLayer === 'watermark' ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-bold text-slate-600">Watermark anchor uses center presets for text and image together.</div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {anchors.map((anchor) => (
                <button key={anchor.value} type="button" onClick={() => patchLayer(activeTextLayerKey, { anchor: anchor.value })} className={`min-h-11 rounded-2xl border px-3 text-sm font-black ${activeLayer.anchor === anchor.value ? 'border-slate-950 bg-slate-950 text-white' : 'border-slate-200 bg-white text-slate-700'}`}>
                  {anchor.label}
                </button>
              ))}
            </div>
          )}
        </ControlCard>
      );
    }

    return (
      <ControlCard title="Presets" icon={FiGrid}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {presetPlacements.map((preset) => (
            <button key={preset} type="button" onClick={() => applyPreset(selectedLayer, preset)} className="min-h-11 rounded-2xl border border-slate-200 bg-white px-2 text-xs font-black capitalize text-slate-700 shadow-sm hover:bg-slate-50">
              {preset.replace('-', ' ')}
            </button>
          ))}
        </div>
        <button type="button" onClick={resetLayer} className="min-h-11 w-full rounded-2xl border border-slate-200 bg-slate-950 px-3 py-2 text-sm font-black text-white shadow-sm">
          Reset selected layer
        </button>
      </ControlCard>
    );
  };

  const renderBackgroundControls = () => {
    if (activeOption === 'image') {
      return (
        <ControlCard title="Image" icon={FiUpload}>
          <FieldShell label="Background image">
            <input type="file" name="background_image" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} className="block w-full rounded-2xl border border-dashed border-blue-200 bg-blue-50/60 px-3 py-3 text-sm font-bold text-slate-700 shadow-sm file:mr-3 file:rounded-xl file:border-0 file:bg-slate-950 file:px-3 file:py-2 file:text-sm file:font-black file:text-white" />
          </FieldShell>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 p-2">
            <div className="aspect-[3/2] overflow-hidden rounded-xl bg-slate-200">
              {previewImageUrl ? <img alt="" src={previewImageUrl} className="h-full w-full object-cover" /> : null}
            </div>
          </div>
        </ControlCard>
      );
    }

    if (activeOption === 'overlay') {
      return (
        <ControlCard title="Overlay" icon={FiDroplet}>
          <SliderField label="Opacity" value={settings.canvas.background.overlayOpacity} min={0} max={0.9} step={0.05} displayValue={`${Math.round(settings.canvas.background.overlayOpacity * 100)}%`} onChange={(value) => patchBackground({ overlayOpacity: value })} />
          <ColorField label="Overlay color" value={settings.canvas.background.overlayColor} onChange={(value) => patchBackground({ overlayColor: value })} />
        </ControlCard>
      );
    }

    if (activeOption === 'focus') {
      return (
        <ControlCard title="Focus" icon={FiCrosshair}>
          <SliderField label="Zoom" value={settings.canvas.background.zoom} min={1} max={2.5} step={0.05} displayValue={`${settings.canvas.background.zoom.toFixed(2)}x`} onChange={(value) => patchBackground({ zoom: value })} />
          <SliderField label="Horizontal" value={settings.canvas.background.focusX} min={0} max={1} step={0.01} displayValue={settings.canvas.background.focusX.toFixed(2)} onChange={(value) => patchBackground({ focusX: value })} />
          <SliderField label="Vertical" value={settings.canvas.background.focusY} min={0} max={1} step={0.01} displayValue={settings.canvas.background.focusY.toFixed(2)} onChange={(value) => patchBackground({ focusY: value })} />
        </ControlCard>
      );
    }

    return (
      <ControlCard title="Effects" icon={FiSun}>
        <SliderField label="Brightness" value={settings.canvas.background.brightness} min={0.4} max={1.8} step={0.05} displayValue={`${Math.round(settings.canvas.background.brightness * 100)}%`} onChange={(value) => patchBackground({ brightness: value })} />
        <SliderField label="Blur" value={settings.canvas.background.blur} min={0} max={0.08} step={0.002} displayValue={settings.canvas.background.blur.toFixed(3)} onChange={(value) => patchBackground({ blur: value })} />
      </ControlCard>
    );
  };

  const renderStyleControls = () => {
    if (activeOption === 'reference') {
      return (
        <ControlCard title="Reference pill" icon={FiBookmark}>
          <ColorField label="Pill background" value={settings.canvas.layers.reference.backgroundColor} onChange={(value) => patchLayer('reference', { backgroundColor: value })} />
          <ColorField label="Pill text" value={settings.canvas.layers.reference.textColor} onChange={(value) => patchLayer('reference', { textColor: value, color: value })} />
          <SliderField label="Radius" value={settings.canvas.layers.reference.radius > 1 ? 1 : settings.canvas.layers.reference.radius} min={0} max={1} step={0.02} displayValue={settings.canvas.layers.reference.radius >= 1 ? 'pill' : settings.canvas.layers.reference.radius.toFixed(2)} onChange={(value) => patchLayer('reference', { radius: value })} />
        </ControlCard>
      );
    }

    if (activeOption === 'shadow') {
      return (
        <ControlCard title="Shadow" icon={FiLayers}>
          <label className="flex min-h-11 items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <span className="text-sm font-black text-slate-700">Text shadow</span>
            <input type="checkbox" checked={Boolean(activeLayer.shadowEnabled)} onChange={(event) => patchLayer(activeTextLayerKey, { shadowEnabled: event.target.checked })} className="h-4 w-4 rounded border-slate-300" />
          </label>
          <SliderField label="Opacity" value={activeLayer.shadowOpacity ?? 0.3} min={0} max={1} step={0.05} displayValue={`${Math.round((activeLayer.shadowOpacity ?? 0.3) * 100)}%`} onChange={(value) => patchLayer(activeTextLayerKey, { shadowOpacity: value })} />
          <SliderField label="Blur" value={activeLayer.shadowBlur ?? 0.01} min={0} max={0.08} step={0.002} displayValue={(activeLayer.shadowBlur ?? 0.01).toFixed(3)} onChange={(value) => patchLayer(activeTextLayerKey, { shadowBlur: value })} />
        </ControlCard>
      );
    }

    return (
      <ControlCard title="Overlay" icon={FiDroplet}>
        <ColorField label="Overlay color" value={settings.canvas.background.overlayColor} onChange={(value) => patchBackground({ overlayColor: value })} />
        <SliderField label="Overlay opacity" value={settings.canvas.background.overlayOpacity} min={0} max={0.9} step={0.05} displayValue={`${Math.round(settings.canvas.background.overlayOpacity * 100)}%`} onChange={(value) => patchBackground({ overlayOpacity: value })} />
      </ControlCard>
    );
  };

  const renderWatermarkControls = () => {
    if (activeOption === 'mode') {
      return (
        <ControlCard title="Watermark mode" icon={FiEye}>
          <Segmented value={settings.canvas.watermark.mode} options={[{ value: 'none', label: 'None' }, { value: 'text', label: 'Text' }, { value: 'image', label: 'Image' }, { value: 'textImage', label: 'Both' }]} onChange={setWatermarkMode} />
        </ControlCard>
      );
    }

    if (activeOption === 'text') {
      return (
        <ControlCard title="Watermark text" icon={FiType}>
          <FieldShell label="Text">
            <TextInput value={settings.canvas.watermark.text} onChange={(event) => patchWatermark({ text: event.target.value })} />
          </FieldShell>
          <SliderField label="Size" value={settings.canvas.watermark.textLayer.fontSize} min={0.012} max={0.16} step={0.002} displayValue={`${Math.round(settings.canvas.watermark.textLayer.fontSize * 1000)}px`} onChange={(value) => patchWatermark({ textLayer: { ...settings.canvas.watermark.textLayer, fontSize: value } })} />
          <ColorField label="Color" value={settings.canvas.watermark.textLayer.color} onChange={(value) => patchWatermark({ textLayer: { ...settings.canvas.watermark.textLayer, color: value } })} />
          <SliderField label="Opacity" value={settings.canvas.watermark.textLayer.opacity} min={0} max={1} step={0.05} displayValue={`${Math.round(settings.canvas.watermark.textLayer.opacity * 100)}%`} onChange={(value) => patchWatermark({ textLayer: { ...settings.canvas.watermark.textLayer, opacity: value } })} />
        </ControlCard>
      );
    }

    if (activeOption === 'image') {
      const watermarkNeedsImage = settings.canvas.watermark.enabled && (settings.canvas.watermark.mode === 'image' || settings.canvas.watermark.mode === 'textImage') && !settings.canvas.watermark.imageUrl;
      return (
        <ControlCard title="Watermark image" icon={FiImage}>
          {watermarkNeedsImage ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-bold leading-6 text-amber-800">
              Upload a watermark or paste an image URL to make this mode visible.
            </div>
          ) : null}
          <FieldShell label="Upload image">
            <input type="file" name="watermark_image" accept="image/jpeg,image/png,image/webp" onChange={handleWatermarkImageChange} className="block w-full rounded-2xl border border-dashed border-blue-200 bg-blue-50/60 px-3 py-3 text-sm font-bold text-slate-700 shadow-sm file:mr-3 file:rounded-xl file:border-0 file:bg-slate-950 file:px-3 file:py-2 file:text-sm file:font-black file:text-white" />
          </FieldShell>
          <FieldShell label="Image URL">
            <TextInput value={settings.canvas.watermark.imageUrl} onChange={(event) => patchWatermark({ imageUrl: event.target.value })} placeholder="https://..." />
          </FieldShell>
          {settings.canvas.watermark.imageUrl ? (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 p-2">
              <div className="flex aspect-[3/2] items-center justify-center overflow-hidden rounded-xl bg-white">
                <img alt="" src={settings.canvas.watermark.imageUrl} className="max-h-full max-w-full object-contain" />
              </div>
            </div>
          ) : null}
          <SliderField label="Width" value={settings.canvas.watermark.imageLayer.width} min={0.05} max={0.8} step={0.01} displayValue={settings.canvas.watermark.imageLayer.width.toFixed(2)} onChange={(value) => patchWatermark({ imageLayer: { ...settings.canvas.watermark.imageLayer, width: value } })} />
          <SliderField label="Opacity" value={settings.canvas.watermark.imageLayer.opacity} min={0} max={1} step={0.05} displayValue={`${Math.round(settings.canvas.watermark.imageLayer.opacity * 100)}%`} onChange={(value) => patchWatermark({ imageLayer: { ...settings.canvas.watermark.imageLayer, opacity: value } })} />
        </ControlCard>
      );
    }

    return (
      <ControlCard title="Watermark position" icon={FiMove}>
        <SliderField label="X position" value={settings.canvas.watermark.textLayer.x} min={0} max={1} step={0.01} displayValue={settings.canvas.watermark.textLayer.x.toFixed(2)} onChange={(value) => patchWatermark({ textLayer: { ...settings.canvas.watermark.textLayer, x: value }, imageLayer: { ...settings.canvas.watermark.imageLayer, x: value } })} />
        <SliderField label="Y position" value={settings.canvas.watermark.textLayer.y} min={0} max={1} step={0.01} displayValue={settings.canvas.watermark.textLayer.y.toFixed(2)} onChange={(value) => patchWatermark({ textLayer: { ...settings.canvas.watermark.textLayer, y: value }, imageLayer: { ...settings.canvas.watermark.imageLayer, y: value } })} />
        <SliderField label="Rotation" value={settings.canvas.watermark.textLayer.rotation} min={-180} max={180} step={1} displayValue={`${settings.canvas.watermark.textLayer.rotation}deg`} onChange={(value) => patchWatermark({ textLayer: { ...settings.canvas.watermark.textLayer, rotation: value }, imageLayer: { ...settings.canvas.watermark.imageLayer, rotation: value } })} />
      </ControlCard>
    );
  };

  const renderTemplateControls = () => (
    <ControlCard title={activeOption === 'reset' ? 'Reset' : 'Templates'} icon={activeOption === 'reset' ? FiRotateCw : FiGrid}>
      {activeOption === 'presets' ? (
        <button type="button" onClick={resetTemplate} className="w-full rounded-2xl border border-blue-200 bg-blue-50 p-4 text-left shadow-sm hover:bg-blue-100">
          <span className="block text-base font-black text-slate-950">Dark Bible Classic</span>
          <span className="mt-1 block text-sm font-semibold leading-6 text-slate-600">Top-left date, centered verse, and reference below in a white pill.</span>
        </button>
      ) : (
        <>
          <button type="button" onClick={resetTemplate} className="min-h-11 w-full rounded-2xl bg-slate-950 px-3 py-2 text-sm font-black text-white shadow-sm">
            Reset visual settings
          </button>
          <button type="button" onClick={resetLayer} className="min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-black text-slate-700 shadow-sm">
            Reset selected layer
          </button>
        </>
      )}
    </ControlCard>
  );

  const activePanel = {
    text: renderTextControls,
    position: renderPositionControls,
    background: renderBackgroundControls,
    style: renderStyleControls,
    watermark: renderWatermarkControls,
    template: renderTemplateControls,
  }[activeCategory]();
  const subToolRail = (
    <OptionRow
      options={categoryOptions[activeCategory]}
      activeOption={currentOption.key}
      onChange={setActiveOption}
    />
  );

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (imageError) event.preventDefault();
        if (!imageError && isPublished && publishedReference) {
          const confirmed = window.confirm(`${publishedReference} is already public. Saving this verse as published will unpublish it. Continue?`);
          if (!confirmed) event.preventDefault();
        }
      }}
      className="min-h-screen bg-[#f4f6f8] pb-[154px] text-slate-950 lg:pb-6"
    >
      <input type="hidden" name="verse_text" value={isImageOnly ? '' : verseText} />
      <input type="hidden" name="editor_settings" value={editorSettingsValue} />

      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur">
        <div className="mx-auto grid max-w-6xl grid-cols-[46px_minmax(0,1fr)_minmax(124px,164px)] items-center gap-2">
          <Link href="/dashboard/daily-verses" className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-950 shadow-sm">
            <FiArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 text-center">
            <h1 className="truncate text-base font-black leading-5 text-slate-950">Edit daily verse</h1>
            <label className="mt-1 inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wide text-slate-500">
              <input type="checkbox" name="is_published" checked={isPublished} onChange={(event) => setPublished(event.target.checked)} className="h-3.5 w-3.5 rounded border-slate-300" />
              {isPublished ? 'Published' : 'Draft'}
            </label>
          </div>
          <button className="flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#155eef] px-3 text-xs font-black text-white shadow-lg shadow-blue-700/20 hover:bg-[#0f49c7] min-[380px]:text-sm">
            <FiCheck className="h-4 w-4" />
            <span className="truncate">{submitLabel}</span>
          </button>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-2 px-2.5 py-2.5 sm:px-3 lg:grid-cols-[minmax(340px,520px)_minmax(0,1fr)] lg:items-start lg:gap-5 lg:py-4">
        <aside className="lg:sticky lg:top-[64px]">
          <div className="mx-auto w-full max-w-[min(100%,430px)] lg:max-w-[520px]">
            <DailyVerseCanvas
              imageUrl={previewImageUrl}
              dateLabel={dateLabel}
              reference={reference}
              verseText={verseText}
              spans={settings.verseSpans}
              canvas={settings.canvas}
              cardMode={settings.cardMode}
              hideDate={settings.hideDate}
            />
          </div>
        </aside>

        <section className="min-w-0 space-y-2.5">
          {(actionError || imageError) ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-black text-red-700">
              {actionError || imageError}
            </div>
          ) : null}

          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5">
            {layerItems.map((layer) => {
              const Icon = layer.icon;
              const active = selectedLayer === layer.key;
              return (
                <button
                  key={layer.key}
                  type="button"
                  onClick={() => {
                    setSelectedLayer(layer.key);
                    if (layer.key === 'background') changeCategory('background');
                    if (layer.key === 'watermark') changeCategory('watermark');
                  }}
              className={`flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-xs font-black shadow-sm transition ${active ? 'border-[#155eef] bg-[#155eef] text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'}`}
                >
                  <Icon className="h-4 w-4" />
                  {layer.label}
                </button>
              );
            })}
          </div>

          <div className="hidden grid-cols-6 gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm lg:grid">
            {toolbarItems.map((item) => {
              const Icon = item.icon;
              const active = activeCategory === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => changeCategory(item.key)}
                  className={`flex min-h-12 flex-col items-center justify-center rounded-lg px-1 text-[10px] font-black transition ${active ? 'bg-[#155eef] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="mt-1 truncate">{item.label}</span>
                </button>
              );
            })}
          </div>

          <div className="hidden lg:block">
            {subToolRail}
          </div>

          {activePanel}
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 shadow-[0_-12px_30px_rgba(15,23,42,0.12)] backdrop-blur lg:hidden">
        <div className="mx-auto max-w-3xl border-b border-slate-100 px-2">
          {subToolRail}
        </div>
        <div className="mx-auto grid max-w-3xl grid-cols-6 gap-1 px-2 pb-[max(8px,env(safe-area-inset-bottom))] pt-2">
          {toolbarItems.map((item) => {
            const Icon = item.icon;
            const active = activeCategory === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => changeCategory(item.key)}
                className={`flex min-h-[58px] flex-col items-center justify-center rounded-lg px-1 text-[10px] font-black transition min-[380px]:text-[11px] ${active ? 'bg-[#155eef] text-white shadow-lg shadow-blue-600/20' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                <Icon className="h-5 w-5" />
                <span className="mt-1 truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </form>
  );
}
