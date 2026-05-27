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
  FiMinus,
  FiMove,
  FiPlus,
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
  tone: ControlTone;
};

type OptionItem = {
  key: string;
  label: string;
  icon: IconType;
  tone?: ControlTone;
};

type ControlTone = 'blue' | 'emerald' | 'violet' | 'amber' | 'cyan' | 'rose';

type TamilBiblePickerData = {
  books: Array<{
    number: string;
    name: string;
    shortName: string;
  }>;
  chapters: Array<{
    number: string;
  }>;
  verses: Array<{
    number: string;
    text: string;
  }>;
};

const toolbarItems: ToolbarItem[] = [
  { key: 'text', label: 'Text', icon: FiType, tone: 'blue' },
  { key: 'position', label: 'Position', icon: FiMove, tone: 'emerald' },
  { key: 'background', label: 'Background', icon: FiImage, tone: 'cyan' },
  { key: 'style', label: 'Style', icon: FiDroplet, tone: 'amber' },
  { key: 'watermark', label: 'Watermark', icon: FiStar, tone: 'violet' },
  { key: 'template', label: 'Template', icon: FiGrid, tone: 'rose' },
];

const categoryOptions: Record<Category, OptionItem[]> = {
  text: [
    { key: 'content', label: 'Content', icon: FiEdit3, tone: 'cyan' },
    { key: 'font', label: 'Font', icon: FiType, tone: 'blue' },
    { key: 'color', label: 'Color', icon: FiDroplet, tone: 'amber' },
    { key: 'align', label: 'Align', icon: FiAlignCenter, tone: 'violet' },
    { key: 'spacing', label: 'Spacing', icon: FiSliders, tone: 'emerald' },
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

const layerItems: Array<{ key: LayerKey; label: string; icon: IconType; tone: ControlTone }> = [
  { key: 'date', label: 'Date', icon: FiCalendar, tone: 'amber' },
  { key: 'verse', label: 'Verse', icon: FiType, tone: 'blue' },
  { key: 'reference', label: 'Reference', icon: FiBookmark, tone: 'emerald' },
  { key: 'watermark', label: 'Watermark', icon: FiStar, tone: 'violet' },
  { key: 'background', label: 'Background', icon: FiImage, tone: 'cyan' },
];

const anchors: Array<{ value: CanvasAnchor; label: string }> = [
  { value: 'top-left', label: 'Top left' },
  { value: 'top-center', label: 'Top center' },
  { value: 'top-right', label: 'Top right' },
  { value: 'center-left', label: 'Middle left' },
  { value: 'center', label: 'Center' },
  { value: 'center-right', label: 'Middle right' },
  { value: 'bottom-left', label: 'Bottom left' },
  { value: 'bottom-center', label: 'Bottom center' },
  { value: 'bottom-right', label: 'Bottom right' },
];

const presetPlacements = [
  'top-left',
  'top-center',
  'top-right',
  'center-left',
  'center',
  'center-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
  'diagonal',
] as const;

const colorPresets = [
  { label: 'White', value: '#ffffff' },
  { label: 'Soft', value: '#f8fafc' },
  { label: 'Warm', value: '#fef3c7' },
  { label: 'Ink', value: '#111827' },
  { label: 'Night', value: '#0f172a' },
];
const controlToneStyles: Record<ControlTone, {
  card: string;
  badge: string;
  softText: string;
  active: string;
  activeSubtle: string;
  solid: string;
  bar: string;
  knob: string;
}> = {
  blue: {
    card: 'border-blue-100 bg-blue-50/45',
    badge: 'bg-blue-100 text-blue-700',
    softText: 'text-blue-700',
    active: 'border-[#155eef] bg-[#155eef] text-white shadow-lg shadow-blue-700/15',
    activeSubtle: 'border-blue-200 bg-blue-50 text-blue-700',
    solid: 'bg-[#155eef]',
    bar: '#155eef',
    knob: 'accent-[#155eef]',
  },
  emerald: {
    card: 'border-emerald-100 bg-emerald-50/45',
    badge: 'bg-emerald-100 text-emerald-700',
    softText: 'text-emerald-700',
    active: 'border-emerald-600 bg-emerald-600 text-white shadow-lg shadow-emerald-700/15',
    activeSubtle: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    solid: 'bg-emerald-600',
    bar: '#059669',
    knob: 'accent-emerald-600',
  },
  violet: {
    card: 'border-violet-100 bg-violet-50/45',
    badge: 'bg-violet-100 text-violet-700',
    softText: 'text-violet-700',
    active: 'border-violet-600 bg-violet-600 text-white shadow-lg shadow-violet-700/15',
    activeSubtle: 'border-violet-200 bg-violet-50 text-violet-700',
    solid: 'bg-violet-600',
    bar: '#7c3aed',
    knob: 'accent-violet-600',
  },
  amber: {
    card: 'border-amber-100 bg-amber-50/50',
    badge: 'bg-amber-100 text-amber-700',
    softText: 'text-amber-700',
    active: 'border-amber-500 bg-amber-500 text-white shadow-lg shadow-amber-700/15',
    activeSubtle: 'border-amber-200 bg-amber-50 text-amber-700',
    solid: 'bg-amber-500',
    bar: '#f59e0b',
    knob: 'accent-amber-500',
  },
  cyan: {
    card: 'border-cyan-100 bg-cyan-50/45',
    badge: 'bg-cyan-100 text-cyan-700',
    softText: 'text-cyan-700',
    active: 'border-cyan-600 bg-cyan-600 text-white shadow-lg shadow-cyan-700/15',
    activeSubtle: 'border-cyan-200 bg-cyan-50 text-cyan-700',
    solid: 'bg-cyan-600',
    bar: '#0891b2',
    knob: 'accent-cyan-600',
  },
  rose: {
    card: 'border-rose-100 bg-rose-50/45',
    badge: 'bg-rose-100 text-rose-700',
    softText: 'text-rose-700',
    active: 'border-rose-600 bg-rose-600 text-white shadow-lg shadow-rose-700/15',
    activeSubtle: 'border-rose-200 bg-rose-50 text-rose-700',
    solid: 'bg-rose-600',
    bar: '#e11d48',
    knob: 'accent-rose-600',
  },
};
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
  hint,
  value,
  min,
  max,
  step,
  displayValue,
  resetValue,
  tone = 'blue',
  onChange,
}: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  displayValue: string;
  resetValue?: number;
  tone?: ControlTone;
  onChange: (value: number) => void;
}) {
  const toneStyle = controlToneStyles[tone];
  const progress = ((value - min) / (max - min)) * 100;
  const updateValue = (nextValue: number) => onChange(clampValue(nextValue, min, max, step));
  const canReset = resetValue !== undefined && Math.abs(value - resetValue) > step / 2;

  return (
    <div className={`rounded-xl border p-3 shadow-[0_10px_28px_rgba(15,23,42,0.04)] ${toneStyle.card}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <span className="block text-[11px] font-black uppercase tracking-[0.14em] text-slate-600">{label}</span>
          {hint ? <span className="mt-1 block text-xs font-bold text-slate-500">{hint}</span> : null}
        </div>
        <div className="flex items-center gap-2">
          {resetValue !== undefined ? (
            <button
              type="button"
              onClick={() => updateValue(resetValue)}
              disabled={!canReset}
              className={`flex h-8 w-8 items-center justify-center rounded-lg border bg-white/80 shadow-sm transition ${canReset ? 'border-slate-200 text-slate-600 hover:bg-white hover:text-slate-950' : 'border-transparent text-slate-300'}`}
              aria-label={`Reset ${label}`}
            >
              <FiRotateCw className="h-3.5 w-3.5" />
            </button>
          ) : null}
          <span className={`rounded-lg px-2.5 py-1 text-xs font-black ${toneStyle.badge}`}>{displayValue}</span>
        </div>
      </div>
      <div className="grid grid-cols-[42px_minmax(0,1fr)_42px] items-center gap-2">
        <button
          type="button"
          onClick={() => updateValue(value - step)}
          className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/70 bg-white/80 text-slate-700 shadow-sm transition hover:bg-white hover:text-slate-950"
          aria-label={`Decrease ${label}`}
        >
          <FiMinus className="h-4 w-4" />
        </button>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => updateValue(Number(event.target.value))}
          className={`h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 ${toneStyle.knob}`}
          style={{ background: `linear-gradient(to right, ${toneStyle.bar} 0%, ${toneStyle.bar} ${progress}%, #e2e8f0 ${progress}%, #e2e8f0 100%)` }}
        />
        <button
          type="button"
          onClick={() => updateValue(value + step)}
          className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/70 bg-white/80 text-slate-700 shadow-sm transition hover:bg-white hover:text-slate-950"
          aria-label={`Increase ${label}`}
        >
          <FiPlus className="h-4 w-4" />
        </button>
      </div>
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
        const tone = controlToneStyles[option.tone || 'blue'];
        return (
          <button
            key={option.key}
            type="button"
            onClick={() => onChange(option.key)}
            className={`flex min-h-10 shrink-0 items-center gap-2 rounded-lg border px-3 text-sm font-black shadow-sm transition ${active ? tone.active : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950'}`}
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

function ToggleField({
  label,
  checked,
  tone = 'cyan',
  onChange,
}: {
  label: string;
  checked: boolean;
  tone?: ControlTone;
  onChange: (checked: boolean) => void;
}) {
  const toneStyle = controlToneStyles[tone];
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left shadow-sm transition ${checked ? toneStyle.card : 'border-slate-200 bg-white hover:bg-slate-50'}`}
    >
      <span className={`text-sm font-black ${checked ? toneStyle.softText : 'text-slate-700'}`}>{label}</span>
      <span className={`relative h-6 w-11 shrink-0 rounded-full p-0.5 transition ${checked ? toneStyle.solid : 'bg-slate-200'}`}>
        <span className={`block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </span>
    </button>
  );
}

function FontSizeControl({
  value,
  resetValue,
  onChange,
}: {
  value: number;
  resetValue: number;
  onChange: (value: number) => void;
}) {
  const min = 0.012;
  const max = 0.16;
  const step = 0.002;
  const pixelValue = Math.round(value * 1000);
  const setValue = (nextValue: number) => onChange(clampValue(nextValue, min, max, step));
  const presets = [0.032, 0.044, 0.058, 0.074];
  const tone = controlToneStyles.blue;
  const canReset = Math.abs(value - resetValue) > step / 2;

  return (
    <div className={`rounded-xl border p-3 shadow-[0_10px_28px_rgba(15,23,42,0.04)] ${tone.card}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <span className="block text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Font size</span>
          <span className="mt-1 block text-xs font-bold text-slate-500">Canvas-relative text scale</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setValue(resetValue)}
            disabled={!canReset}
            className={`flex h-8 w-8 items-center justify-center rounded-lg border bg-white/80 shadow-sm transition ${canReset ? 'border-slate-200 text-slate-600 hover:bg-white hover:text-slate-950' : 'border-transparent text-slate-300'}`}
            aria-label="Reset font size"
          >
            <FiRotateCw className="h-3.5 w-3.5" />
          </button>
          <span className={`rounded-lg px-2.5 py-1.5 text-xs font-black ${tone.badge}`}>{pixelValue}px</span>
        </div>
      </div>

      <div className="grid grid-cols-[42px_minmax(0,1fr)_42px] items-center gap-2">
        <button
          type="button"
          onClick={() => setValue(value - step)}
          className="flex h-11 w-11 items-center justify-center rounded-lg border border-blue-100 bg-white/70 text-blue-700 shadow-sm transition hover:bg-white hover:text-blue-800"
          aria-label="Decrease font size"
        >
          <FiMinus className="h-4 w-4" />
        </button>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => setValue(Number(event.target.value))}
          className={`h-2 w-full cursor-pointer ${tone.knob}`}
          aria-label="Font size"
        />
        <button
          type="button"
          onClick={() => setValue(value + step)}
          className="flex h-11 w-11 items-center justify-center rounded-lg border border-blue-100 bg-white/70 text-blue-700 shadow-sm transition hover:bg-white hover:text-blue-800"
          aria-label="Increase font size"
        >
          <FiPlus className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-2">
        {presets.map((preset) => {
          const active = Math.abs(value - preset) < step;
          return (
            <button
              key={preset}
              type="button"
              onClick={() => setValue(preset)}
              className={`min-h-9 rounded-lg border px-2 text-xs font-black transition ${active ? tone.activeSubtle : 'border-blue-100 bg-white/70 text-slate-600 hover:bg-white hover:text-slate-950'}`}
            >
              {Math.round(preset * 1000)}px
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FontWeightControl({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const tone = controlToneStyles.rose;
  return (
    <div className={`rounded-xl border p-3 shadow-[0_10px_28px_rgba(15,23,42,0.04)] ${tone.card}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Font weight</span>
        <span className={`rounded-lg px-2.5 py-1 text-xs font-black ${tone.badge}`}>{value}</span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {fontWeights.map((weight) => {
          const active = value === weight.value;
          return (
            <button
              key={weight.value}
              type="button"
              onClick={() => onChange(weight.value)}
              className={`min-h-11 rounded-lg border px-2 text-xs font-black transition ${active ? tone.active : 'border-rose-100 bg-white/70 text-slate-700 hover:bg-white hover:text-slate-950'}`}
              style={{ fontWeight: weight.value }}
            >
              {weight.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ColorControl({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const normalizedValue = value.toLowerCase();
  const tone = controlToneStyles.amber;

  return (
    <div className={`rounded-xl border p-3 shadow-[0_10px_28px_rgba(15,23,42,0.04)] ${tone.card}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <span className="block text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">{label}</span>
          <span className="mt-1 block text-xs font-bold text-slate-500">Choose a preset or enter a hex color</span>
        </div>
        <span className="h-8 w-8 shrink-0 rounded-lg border border-amber-200 shadow-inner" style={{ backgroundColor: safeColorInputValue(value) }} />
      </div>

      <div className="grid grid-cols-[52px_minmax(0,1fr)] gap-2">
        <label className="flex h-12 cursor-pointer items-center justify-center rounded-lg border border-amber-100 bg-white/70 shadow-sm transition hover:bg-white">
          <input type="color" value={safeColorInputValue(value)} onChange={(event) => onChange(event.target.value)} className="h-8 w-8 cursor-pointer border-0 bg-transparent p-0" aria-label={`${label} color picker`} />
        </label>
        <TextInput value={value} onChange={(event) => onChange(event.target.value)} className="font-mono uppercase" />
      </div>

      <div className="mt-3 grid grid-cols-5 gap-2">
        {colorPresets.map((preset) => {
          const active = normalizedValue === preset.value;
          const isLight = ['#ffffff', '#f8fafc', '#fef3c7'].includes(preset.value);
          return (
            <button
              key={preset.value}
              type="button"
              onClick={() => onChange(preset.value)}
              className={`group flex min-h-16 flex-col items-center justify-center gap-2 rounded-xl border p-2 text-[10px] font-black transition ${active ? tone.activeSubtle : 'border-amber-100 bg-white/70 text-slate-500 hover:bg-white hover:text-slate-950'}`}
            >
              <span
                className={`h-8 w-8 rounded-full border shadow-sm ring-offset-2 transition ${active ? 'ring-2 ring-amber-500' : 'group-hover:ring-2 group-hover:ring-amber-200'} ${isLight ? 'border-slate-200' : 'border-transparent'}`}
                style={{ backgroundColor: preset.value }}
              />
              <span className="truncate">{preset.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AlignControl({
  value,
  onChange,
}: {
  value: CanvasTextLayer['align'];
  onChange: (value: CanvasTextLayer['align']) => void;
}) {
  const options = [
    { value: 'left' as const, label: 'Left', icon: FiAlignLeft },
    { value: 'center' as const, label: 'Center', icon: FiAlignCenter },
    { value: 'right' as const, label: 'Right', icon: FiAlignRight },
  ];
  const tone = controlToneStyles.violet;

  return (
    <div className={`rounded-xl border p-3 shadow-[0_10px_28px_rgba(15,23,42,0.04)] ${tone.card}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <span className="block text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Text alignment</span>
          <span className="mt-1 block text-xs font-bold text-slate-500">Controls the selected text layer</span>
        </div>
        <span className={`rounded-lg px-2.5 py-1 text-xs font-black capitalize ${tone.badge}`}>{value}</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {options.map((option) => {
          const Icon = option.icon;
          const active = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`min-h-20 rounded-xl border p-3 text-xs font-black transition ${active ? tone.active : 'border-violet-100 bg-white/70 text-slate-700 hover:bg-white hover:text-slate-950'}`}
            >
              <div className="flex flex-col items-center gap-2">
                <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${active ? 'bg-white/15' : 'bg-white shadow-sm'}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <span>{option.label}</span>
                <span className={`grid w-full gap-1 ${option.value === 'center' ? 'justify-items-center' : option.value === 'right' ? 'justify-items-end' : 'justify-items-start'}`}>
                  <span className={`h-1 rounded-full ${active ? 'bg-white/85' : 'bg-slate-300'}`} style={{ width: '72%' }} />
                  <span className={`h-1 rounded-full ${active ? 'bg-white/65' : 'bg-slate-300'}`} style={{ width: '52%' }} />
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PremiumSlider({
  label,
  hint,
  value,
  min,
  max,
  step,
  displayValue,
  resetValue,
  tone = 'blue',
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  step: number;
  displayValue: string;
  resetValue?: number;
  tone?: ControlTone;
  onChange: (value: number) => void;
}) {
  return (
    <SliderField
      label={label}
      hint={hint}
      value={value}
      min={min}
      max={max}
      step={step}
      displayValue={displayValue}
      resetValue={resetValue}
      tone={tone}
      onChange={onChange}
    />
  );
}

function SpacingControl({
  opacity,
  letterSpacing,
  lineHeight,
  resetOpacity,
  resetLetterSpacing,
  resetLineHeight,
  onOpacityChange,
  onLetterSpacingChange,
  onLineHeightChange,
}: {
  opacity: number;
  letterSpacing: number;
  lineHeight: number;
  resetOpacity: number;
  resetLetterSpacing: number;
  resetLineHeight: number;
  onOpacityChange: (value: number) => void;
  onLetterSpacingChange: (value: number) => void;
  onLineHeightChange: (value: number) => void;
}) {
  const presets = [
    { label: 'Tight', lineHeight: 1.05, letterSpacing: -0.004 },
    { label: 'Balanced', lineHeight: 1.35, letterSpacing: 0 },
    { label: 'Airy', lineHeight: 1.75, letterSpacing: 0.012 },
  ];

  return (
    <div className="space-y-3">
      <PremiumSlider label="Opacity" hint="Text visibility" value={opacity} min={0} max={1} step={0.01} displayValue={`${Math.round(opacity * 100)}%`} resetValue={resetOpacity} tone="blue" onChange={onOpacityChange} />
      <PremiumSlider label="Letter spacing" hint="Space between letters" value={letterSpacing} min={-0.02} max={0.08} step={0.002} displayValue={letterSpacing.toFixed(3)} resetValue={resetLetterSpacing} tone="emerald" onChange={onLetterSpacingChange} />
      <PremiumSlider label="Line height" hint="Space between lines" value={lineHeight} min={0.8} max={2.4} step={0.05} displayValue={lineHeight.toFixed(2)} resetValue={resetLineHeight} tone="violet" onChange={onLineHeightChange} />
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
        <div className="mb-3 flex items-center justify-between gap-3">
          <span className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">Spacing presets</span>
          <span className="text-xs font-bold text-slate-500">Quick feel</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {presets.map((preset) => {
            const active = Math.abs(lineHeight - preset.lineHeight) < 0.03 && Math.abs(letterSpacing - preset.letterSpacing) < 0.003;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  onLineHeightChange(preset.lineHeight);
                  onLetterSpacingChange(preset.letterSpacing);
                }}
                className={`min-h-11 rounded-lg border px-2 text-xs font-black transition ${active ? 'border-[#155eef] bg-[#155eef] text-white shadow-lg shadow-blue-700/15' : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white hover:text-slate-950'}`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>
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
  const [isPublished, setPublished] = useState(Boolean(values?.is_published));
  const [settings, setSettings] = useState<EditorSettings>(initialSettings);
  const [previewUrl, setPreviewUrl] = useState(values?.background_image_url ?? '');
  const [selectedLayer, setSelectedLayer] = useState<LayerKey>('verse');
  const [activeCategory, setActiveCategory] = useState<Category>('text');
  const [activeOption, setActiveOption] = useState(categoryOptions.text[0].key);
  const [imageError, setImageError] = useState('');
  const [biblePicker, setBiblePicker] = useState<TamilBiblePickerData>({ books: [], chapters: [], verses: [] });
  const [selectedBook, setSelectedBook] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [selectedVerse, setSelectedVerse] = useState('');
  const [biblePickerError, setBiblePickerError] = useState('');
  const [watermarkPositionTarget, setWatermarkPositionTarget] = useState<'text' | 'logo'>('text');
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

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();
    if (selectedBook) params.set('book', selectedBook);
    if (selectedChapter) params.set('chapter', selectedChapter);

    fetch(`/api/tamil-bible?${params.toString()}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Unable to load Tamil Bible picker.');
        return response.json() as Promise<TamilBiblePickerData>;
      })
      .then((data) => {
        setBiblePickerError('');
        setBiblePicker(data);
      })
      .catch((error) => {
        if (error?.name === 'AbortError') return;
        setBiblePickerError('Bible picker could not load. You can still type the verse manually.');
      });

    return () => controller.abort();
  }, [selectedBook, selectedChapter]);

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

  const applyPickedVerse = (verseNumber: string) => {
    setSelectedVerse(verseNumber);
    const book = biblePicker.books.find((item) => item.number === selectedBook);
    const verse = biblePicker.verses.find((item) => item.number === verseNumber);
    if (!book || !selectedChapter || !verse) return;

    updateVerseText(verse.text);
    setReference(`${book.name} ${selectedChapter}:${verse.number}`);
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
      'top-left': { x: 0.08, y: 0.08, anchor: 'top-left' as CanvasAnchor, rotation: 0 },
      'top-center': { x: 0.5, y: 0.08, anchor: 'top-center' as CanvasAnchor, rotation: 0 },
      'top-right': { x: 0.92, y: 0.08, anchor: 'top-right' as CanvasAnchor, rotation: 0 },
      'center-left': { x: 0.08, y: 0.5, anchor: 'center-left' as CanvasAnchor, rotation: 0 },
      center: { x: 0.5, y: 0.5, anchor: 'center' as CanvasAnchor, rotation: 0 },
      'center-right': { x: 0.92, y: 0.5, anchor: 'center-right' as CanvasAnchor, rotation: 0 },
      'bottom-left': { x: 0.08, y: 0.92, anchor: 'bottom-left' as CanvasAnchor, rotation: 0 },
      'bottom-center': { x: 0.5, y: 0.92, anchor: 'bottom-center' as CanvasAnchor, rotation: 0 },
      'bottom-right': { x: 0.92, y: 0.92, anchor: 'bottom-right' as CanvasAnchor, rotation: 0 },
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
          <ToggleField
            label="Image only"
            checked={isImageOnly}
            tone="cyan"
            onChange={(checked) => patchSettings({ cardMode: checked ? 'imageOnly' : 'verse', hideDate: checked ? settings.hideDate : false })}
          />
          {isImageOnly ? (
            <ToggleField
              label="Hide date badge"
              checked={settings.hideDate}
              tone="amber"
              onChange={(checked) => patchSettings({ hideDate: checked })}
            />
          ) : null}
          <FieldShell label="Date">
            <TextInput required type="date" value={verseDate} onChange={(event) => setVerseDate(event.target.value)} />
          </FieldShell>
          {!isImageOnly ? (
            <>
              <div className={`rounded-xl border p-3 shadow-[0_10px_28px_rgba(15,23,42,0.04)] ${controlToneStyles.emerald.card}`}>
                <span className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-600">Bible verse picker</span>
                {biblePickerError ? (
                  <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold leading-5 text-amber-800">
                    {biblePickerError}
                  </div>
                ) : null}
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  <SelectInput
                    value={selectedBook}
                    onChange={(event) => {
                      setSelectedBook(event.target.value);
                      setSelectedChapter('');
                      setSelectedVerse('');
                    }}
                  >
                    <option value="">Book</option>
                    {biblePicker.books.map((book) => (
                      <option key={book.number} value={book.number}>{book.name}</option>
                    ))}
                  </SelectInput>
                  <SelectInput
                    value={selectedChapter}
                    onChange={(event) => {
                      setSelectedChapter(event.target.value);
                      setSelectedVerse('');
                    }}
                    disabled={!selectedBook}
                  >
                    <option value="">Chapter</option>
                    {biblePicker.chapters.map((chapter) => (
                      <option key={chapter.number} value={chapter.number}>{chapter.number}</option>
                    ))}
                  </SelectInput>
                  <SelectInput value={selectedVerse} onChange={(event) => applyPickedVerse(event.target.value)} disabled={!selectedBook || !selectedChapter}>
                    <option value="">Verse</option>
                    {biblePicker.verses.map((verse) => (
                      <option key={verse.number} value={verse.number}>{verse.number}</option>
                    ))}
                  </SelectInput>
                </div>
              </div>
              <FieldShell label="Verse text">
                <div className="flex flex-wrap gap-2 rounded-t-xl border border-b-0 border-blue-100 bg-blue-50/45 p-2">
                  <PreserveSelectionButton onClick={() => applyTextStyle({ bold: true })} className="min-h-9 rounded-lg border border-blue-100 bg-white/80 px-3 py-1 text-sm font-black text-blue-700 shadow-sm hover:bg-white">B</PreserveSelectionButton>
                  <PreserveSelectionButton onClick={() => applyTextStyle({ italic: true })} className="min-h-9 rounded-lg border border-blue-100 bg-white/80 px-3 py-1 text-sm italic text-blue-700 shadow-sm hover:bg-white">I</PreserveSelectionButton>
                  <PreserveSelectionButton onClick={() => applyTextStyle(null)} className="min-h-9 rounded-lg border border-blue-100 bg-white/80 px-3 py-1 text-sm font-bold text-blue-700 shadow-sm hover:bg-white">Clear</PreserveSelectionButton>
                </div>
                <TextArea ref={verseInputRef} required rows={4} value={verseText} onChange={(event) => updateVerseText(event.target.value)} className="rounded-t-none" />
              </FieldShell>
              <FieldShell label="Reference">
                <TextInput required value={reference} onChange={(event) => setReference(event.target.value)} placeholder="ஆதியாகமம் 1:1" />
              </FieldShell>
            </>
          ) : null}
        </ControlCard>
      );
    }

    if (activeOption === 'font') {
      return (
        <ControlCard title="Font" icon={FiType}>
          <FontSizeControl value={activeLayer.fontSize} resetValue={darkBibleClassicCanvas.layers[activeTextLayerKey].fontSize} onChange={(value) => patchLayer(activeTextLayerKey, { fontSize: value })} />
          <FontWeightControl value={activeLayer.fontWeight} onChange={(value) => patchLayer(activeTextLayerKey, { fontWeight: value })} />
        </ControlCard>
      );
    }

    if (activeOption === 'color') {
      const currentColor = activeTextLayerKey === 'reference' ? settings.canvas.layers.reference.textColor : activeLayer.color;
      return (
        <ControlCard title="Color" icon={FiDroplet}>
          <ColorControl label="Text color" value={currentColor} onChange={(value) => activeTextLayerKey === 'reference' ? patchLayer('reference', { color: value, textColor: value }) : patchLayer(activeTextLayerKey, { color: value })} />
        </ControlCard>
      );
    }

    if (activeOption === 'align') {
      return (
        <ControlCard title="Align" icon={FiAlignCenter}>
          <AlignControl value={activeLayer.align} onChange={(align) => patchLayer(activeTextLayerKey, { align })} />
        </ControlCard>
      );
    }

    return (
      <ControlCard title="Spacing" icon={FiSliders}>
        <SpacingControl
          opacity={activeLayer.opacity}
          letterSpacing={activeLayer.letterSpacing}
          lineHeight={activeLayer.lineHeight}
          resetOpacity={darkBibleClassicCanvas.layers[activeTextLayerKey].opacity}
          resetLetterSpacing={darkBibleClassicCanvas.layers[activeTextLayerKey].letterSpacing}
          resetLineHeight={darkBibleClassicCanvas.layers[activeTextLayerKey].lineHeight}
          onOpacityChange={(value) => patchLayer(activeTextLayerKey, { opacity: value })}
          onLetterSpacingChange={(value) => patchLayer(activeTextLayerKey, { letterSpacing: value })}
          onLineHeightChange={(value) => patchLayer(activeTextLayerKey, { lineHeight: value })}
        />
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
    const defaultPositionLayer = selectedLayer === 'watermark' ? darkBibleClassicCanvas.watermark.textLayer : darkBibleClassicCanvas.layers[activeTextLayerKey];

    const updateWatermarkPosition = (patch: Partial<typeof settings.canvas.watermark.textLayer>) => {
      patchWatermark({
        textLayer: { ...settings.canvas.watermark.textLayer, ...patch },
        imageLayer: { ...settings.canvas.watermark.imageLayer, ...patch },
      });
    };

    if (activeOption === 'move') {
      return (
        <ControlCard title="Move" icon={FiMove}>
          <SliderField label="X position" hint="Move left or right" value={layerX} min={0} max={1} step={0.01} displayValue={layerX.toFixed(2)} resetValue={defaultPositionLayer.x} tone="emerald" onChange={(value) => selectedLayer === 'watermark' ? updateWatermarkPosition({ x: value }) : patchLayer(activeTextLayerKey, { x: value })} />
          <SliderField label="Y position" hint="Move up or down" value={layerY} min={0} max={1} step={0.01} displayValue={layerY.toFixed(2)} resetValue={defaultPositionLayer.y} tone="cyan" onChange={(value) => selectedLayer === 'watermark' ? updateWatermarkPosition({ y: value }) : patchLayer(activeTextLayerKey, { y: value })} />
        </ControlCard>
      );
    }

    if (activeOption === 'size') {
      return (
        <ControlCard title="Size" icon={FiMaximize2}>
          <SliderField label="Width" hint="Layer width" value={layerWidth} min={0.05} max={1} step={0.01} displayValue={layerWidth.toFixed(2)} resetValue={defaultPositionLayer.width} tone="blue" onChange={(value) => selectedLayer === 'watermark' ? updateWatermarkPosition({ width: value }) : patchLayer(activeTextLayerKey, { width: value })} />
          <SliderField label="Rotation" hint="Layer angle" value={layerRotation} min={-180} max={180} step={1} displayValue={`${layerRotation}deg`} resetValue={defaultPositionLayer.rotation} tone="violet" onChange={(value) => selectedLayer === 'watermark' ? updateWatermarkPosition({ rotation: value }) : patchLayer(activeTextLayerKey, { rotation: value })} />
        </ControlCard>
      );
    }

    if (activeOption === 'anchor') {
      const tone = controlToneStyles.emerald;
      return (
        <ControlCard title="Anchor" icon={FiCrosshair}>
          {selectedLayer === 'watermark' ? (
            <div className={`rounded-xl border px-3 py-3 text-sm font-bold leading-6 ${tone.card} ${tone.softText}`}>Watermark position uses centered anchor presets for text and image together.</div>
          ) : (
            <div className={`rounded-xl border p-3 shadow-[0_10px_28px_rgba(15,23,42,0.04)] ${tone.card}`}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <span className="block text-[11px] font-black uppercase tracking-[0.14em] text-slate-600">Anchor point</span>
                  <span className="mt-1 block text-xs font-bold text-slate-500">Choose which point locks to the position</span>
                </div>
                <span className={`rounded-lg px-2.5 py-1 text-xs font-black capitalize ${tone.badge}`}>{activeLayer.anchor.replace('-', ' ')}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
              {anchors.map((anchor) => (
                <button key={anchor.value} type="button" onClick={() => patchLayer(activeTextLayerKey, { anchor: anchor.value })} className={`flex min-h-16 flex-col items-center justify-center gap-2 rounded-xl border px-2 text-xs font-black transition ${activeLayer.anchor === anchor.value ? tone.active : 'border-emerald-100 bg-white/75 text-slate-700 hover:bg-white hover:text-slate-950'}`}>
                  <span className={`h-2.5 w-2.5 rounded-full ${activeLayer.anchor === anchor.value ? 'bg-white' : tone.solid}`} />
                  <span>{anchor.label}</span>
                </button>
              ))}
              </div>
            </div>
          )}
        </ControlCard>
      );
    }

    const tone = controlToneStyles.blue;
    return (
      <ControlCard title="Presets" icon={FiGrid}>
        <div className={`rounded-xl border p-3 shadow-[0_10px_28px_rgba(15,23,42,0.04)] ${tone.card}`}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <span className="block text-[11px] font-black uppercase tracking-[0.14em] text-slate-600">Placement presets</span>
              <span className="mt-1 block text-xs font-bold text-slate-500">Move and anchor together</span>
            </div>
            <button
              type="button"
              onClick={resetLayer}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-blue-100 bg-white/80 text-blue-700 shadow-sm transition hover:bg-white hover:text-blue-900"
              aria-label="Reset selected layer"
            >
              <FiRotateCw className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
          {presetPlacements.map((preset) => (
            <button key={preset} type="button" onClick={() => applyPreset(selectedLayer, preset)} className={`min-h-14 rounded-xl border px-2 text-xs font-black capitalize transition ${preset === 'diagonal' ? 'border-violet-100 bg-violet-50/70 text-violet-700 hover:bg-white' : 'border-blue-100 bg-white/75 text-slate-700 hover:bg-white hover:text-slate-950'}`}>
              {preset.replace('-', ' ')}
            </button>
          ))}
          </div>
        </div>
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
          <SliderField label="Opacity" hint="Darkness over image" value={settings.canvas.background.overlayOpacity} min={0} max={0.9} step={0.05} displayValue={`${Math.round(settings.canvas.background.overlayOpacity * 100)}%`} resetValue={darkBibleClassicCanvas.background.overlayOpacity} tone="blue" onChange={(value) => patchBackground({ overlayOpacity: value })} />
          <ColorField label="Overlay color" value={settings.canvas.background.overlayColor} onChange={(value) => patchBackground({ overlayColor: value })} />
        </ControlCard>
      );
    }

    if (activeOption === 'focus') {
      return (
        <ControlCard title="Focus" icon={FiCrosshair}>
          <SliderField label="Zoom" hint="Image scale" value={settings.canvas.background.zoom} min={1} max={2.5} step={0.05} displayValue={`${settings.canvas.background.zoom.toFixed(2)}x`} resetValue={darkBibleClassicCanvas.background.zoom} tone="blue" onChange={(value) => patchBackground({ zoom: value })} />
          <SliderField label="Horizontal" hint="Focus left or right" value={settings.canvas.background.focusX} min={0} max={1} step={0.01} displayValue={settings.canvas.background.focusX.toFixed(2)} resetValue={darkBibleClassicCanvas.background.focusX} tone="emerald" onChange={(value) => patchBackground({ focusX: value })} />
          <SliderField label="Vertical" hint="Focus up or down" value={settings.canvas.background.focusY} min={0} max={1} step={0.01} displayValue={settings.canvas.background.focusY.toFixed(2)} resetValue={darkBibleClassicCanvas.background.focusY} tone="cyan" onChange={(value) => patchBackground({ focusY: value })} />
        </ControlCard>
      );
    }

    return (
      <ControlCard title="Effects" icon={FiSun}>
        <SliderField label="Brightness" hint="Image light" value={settings.canvas.background.brightness} min={0.4} max={1.8} step={0.05} displayValue={`${Math.round(settings.canvas.background.brightness * 100)}%`} resetValue={darkBibleClassicCanvas.background.brightness} tone="amber" onChange={(value) => patchBackground({ brightness: value })} />
        <SliderField label="Blur" hint="Image softness" value={settings.canvas.background.blur} min={0} max={0.08} step={0.002} displayValue={settings.canvas.background.blur.toFixed(3)} resetValue={darkBibleClassicCanvas.background.blur} tone="violet" onChange={(value) => patchBackground({ blur: value })} />
      </ControlCard>
    );
  };

  const renderStyleControls = () => {
    if (activeOption === 'reference') {
      return (
        <ControlCard title="Reference pill" icon={FiBookmark}>
          <ColorField label="Pill background" value={settings.canvas.layers.reference.backgroundColor} onChange={(value) => patchLayer('reference', { backgroundColor: value })} />
          <ColorField label="Pill text" value={settings.canvas.layers.reference.textColor} onChange={(value) => patchLayer('reference', { textColor: value, color: value })} />
          <SliderField label="Radius" hint="Corner roundness" value={settings.canvas.layers.reference.radius > 1 ? 1 : settings.canvas.layers.reference.radius} min={0} max={1} step={0.02} displayValue={settings.canvas.layers.reference.radius >= 1 ? 'pill' : settings.canvas.layers.reference.radius.toFixed(2)} resetValue={1} tone="emerald" onChange={(value) => patchLayer('reference', { radius: value })} />
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
          <SliderField label="Opacity" hint="Shadow strength" value={activeLayer.shadowOpacity ?? 0.3} min={0} max={1} step={0.05} displayValue={`${Math.round((activeLayer.shadowOpacity ?? 0.3) * 100)}%`} resetValue={darkBibleClassicCanvas.layers[activeTextLayerKey].shadowOpacity ?? 0.3} tone="blue" onChange={(value) => patchLayer(activeTextLayerKey, { shadowOpacity: value })} />
          <SliderField label="Blur" hint="Shadow softness" value={activeLayer.shadowBlur ?? 0.01} min={0} max={0.08} step={0.002} displayValue={(activeLayer.shadowBlur ?? 0.01).toFixed(3)} resetValue={darkBibleClassicCanvas.layers[activeTextLayerKey].shadowBlur ?? 0.01} tone="violet" onChange={(value) => patchLayer(activeTextLayerKey, { shadowBlur: value })} />
        </ControlCard>
      );
    }

    return (
      <ControlCard title="Overlay" icon={FiDroplet}>
        <ColorField label="Overlay color" value={settings.canvas.background.overlayColor} onChange={(value) => patchBackground({ overlayColor: value })} />
        <SliderField label="Overlay opacity" hint="Darkness over image" value={settings.canvas.background.overlayOpacity} min={0} max={0.9} step={0.05} displayValue={`${Math.round(settings.canvas.background.overlayOpacity * 100)}%`} resetValue={darkBibleClassicCanvas.background.overlayOpacity} tone="blue" onChange={(value) => patchBackground({ overlayOpacity: value })} />
      </ControlCard>
    );
  };

  const renderWatermarkControls = () => {
    if (activeOption === 'mode') {
      return (
        <ControlCard title="Watermark mode" icon={FiEye}>
          <div className={`rounded-xl border p-3 shadow-[0_10px_28px_rgba(15,23,42,0.04)] ${controlToneStyles.violet.card}`}>
            <Segmented value={settings.canvas.watermark.mode} options={[{ value: 'none', label: 'None' }, { value: 'text', label: 'Text' }, { value: 'image', label: 'Logo' }, { value: 'textImage', label: 'Both' }]} onChange={setWatermarkMode} />
          </div>
        </ControlCard>
      );
    }

    if (activeOption === 'text') {
      const textLayer = settings.canvas.watermark.textLayer;
      return (
        <ControlCard title="Watermark text" icon={FiType}>
          <FieldShell label="Text">
            <TextInput value={settings.canvas.watermark.text} onChange={(event) => patchWatermark({ text: event.target.value })} />
          </FieldShell>
          <SliderField label="Size" hint="Watermark text scale" value={textLayer.fontSize} min={0.012} max={0.16} step={0.002} displayValue={`${Math.round(textLayer.fontSize * 1000)}px`} resetValue={darkBibleClassicCanvas.watermark.textLayer.fontSize} tone="blue" onChange={(value) => patchWatermark({ textLayer: { ...textLayer, fontSize: value } })} />
          <ColorControl label="Color" value={textLayer.color} onChange={(value) => patchWatermark({ textLayer: { ...textLayer, color: value } })} />
          <FontWeightControl value={textLayer.fontWeight} onChange={(value) => patchWatermark({ textLayer: { ...textLayer, fontWeight: value } })} />
          <SliderField label="Opacity" hint="Text visibility" value={textLayer.opacity} min={0} max={1} step={0.05} displayValue={`${Math.round(textLayer.opacity * 100)}%`} resetValue={darkBibleClassicCanvas.watermark.textLayer.opacity} tone="violet" onChange={(value) => patchWatermark({ textLayer: { ...textLayer, opacity: value } })} />
          <SliderField label="Letter spacing" hint="Space between letters" value={textLayer.letterSpacing} min={-0.02} max={0.08} step={0.002} displayValue={textLayer.letterSpacing.toFixed(3)} resetValue={darkBibleClassicCanvas.watermark.textLayer.letterSpacing} tone="emerald" onChange={(value) => patchWatermark({ textLayer: { ...textLayer, letterSpacing: value } })} />
          <SliderField label="Line height" hint="Space between lines" value={textLayer.lineHeight} min={0.8} max={2.4} step={0.05} displayValue={textLayer.lineHeight.toFixed(2)} resetValue={darkBibleClassicCanvas.watermark.textLayer.lineHeight} tone="cyan" onChange={(value) => patchWatermark({ textLayer: { ...textLayer, lineHeight: value } })} />
          <AlignControl value={textLayer.align} onChange={(align) => patchWatermark({ textLayer: { ...textLayer, align } })} />
          <ToggleField label="Text shadow" checked={Boolean(textLayer.shadowEnabled)} tone="violet" onChange={(checked) => patchWatermark({ textLayer: { ...textLayer, shadowEnabled: checked } })} />
          {textLayer.shadowEnabled ? (
            <>
              <SliderField label="Shadow opacity" hint="Shadow strength" value={textLayer.shadowOpacity ?? 0.3} min={0} max={1} step={0.05} displayValue={`${Math.round((textLayer.shadowOpacity ?? 0.3) * 100)}%`} resetValue={darkBibleClassicCanvas.watermark.textLayer.shadowOpacity ?? 0.3} tone="blue" onChange={(value) => patchWatermark({ textLayer: { ...textLayer, shadowOpacity: value } })} />
              <SliderField label="Shadow blur" hint="Shadow softness" value={textLayer.shadowBlur ?? 0.01} min={0} max={0.08} step={0.002} displayValue={(textLayer.shadowBlur ?? 0.01).toFixed(3)} resetValue={darkBibleClassicCanvas.watermark.textLayer.shadowBlur ?? 0.01} tone="violet" onChange={(value) => patchWatermark({ textLayer: { ...textLayer, shadowBlur: value } })} />
            </>
          ) : null}
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
          <SliderField label="Width" hint="Image scale" value={settings.canvas.watermark.imageLayer.width} min={0.05} max={0.8} step={0.01} displayValue={settings.canvas.watermark.imageLayer.width.toFixed(2)} resetValue={darkBibleClassicCanvas.watermark.imageLayer.width} tone="blue" onChange={(value) => patchWatermark({ imageLayer: { ...settings.canvas.watermark.imageLayer, width: value } })} />
          <SliderField label="Opacity" hint="Image visibility" value={settings.canvas.watermark.imageLayer.opacity} min={0} max={1} step={0.05} displayValue={`${Math.round(settings.canvas.watermark.imageLayer.opacity * 100)}%`} resetValue={darkBibleClassicCanvas.watermark.imageLayer.opacity} tone="violet" onChange={(value) => patchWatermark({ imageLayer: { ...settings.canvas.watermark.imageLayer, opacity: value } })} />
        </ControlCard>
      );
    }

    const watermarkMode = settings.canvas.watermark.mode;
    const canTargetLogo = watermarkMode === 'image' || watermarkMode === 'textImage';
    const canTargetText = watermarkMode === 'text' || watermarkMode === 'textImage';
    const positionTarget = canTargetLogo && !canTargetText ? 'logo' : watermarkPositionTarget;
    const positionLayer = positionTarget === 'logo' ? settings.canvas.watermark.imageLayer : settings.canvas.watermark.textLayer;
    const defaultPositionLayer = positionTarget === 'logo' ? darkBibleClassicCanvas.watermark.imageLayer : darkBibleClassicCanvas.watermark.textLayer;
    const patchPositionLayer = (patch: Partial<typeof settings.canvas.watermark.imageLayer>) => {
      if (positionTarget === 'logo') {
        patchWatermark({ imageLayer: { ...settings.canvas.watermark.imageLayer, ...patch } });
        return;
      }
      patchWatermark({ textLayer: { ...settings.canvas.watermark.textLayer, ...patch } });
    };

    return (
      <ControlCard title="Watermark position" icon={FiMove}>
        {canTargetText && canTargetLogo ? (
          <Segmented value={positionTarget} options={[{ value: 'text', label: 'Text' }, { value: 'logo', label: 'Logo' }]} onChange={setWatermarkPositionTarget} />
        ) : null}
        <SliderField label="X position" hint="Move left or right" value={positionLayer.x} min={0} max={1} step={0.01} displayValue={positionLayer.x.toFixed(2)} resetValue={defaultPositionLayer.x} tone="emerald" onChange={(value) => patchPositionLayer({ x: value })} />
        <SliderField label="Y position" hint="Move up or down" value={positionLayer.y} min={0} max={1} step={0.01} displayValue={positionLayer.y.toFixed(2)} resetValue={defaultPositionLayer.y} tone="cyan" onChange={(value) => patchPositionLayer({ y: value })} />
        <SliderField label="Rotation" hint="Watermark angle" value={positionLayer.rotation} min={-180} max={180} step={1} displayValue={`${positionLayer.rotation}deg`} resetValue={defaultPositionLayer.rotation} tone="violet" onChange={(value) => patchPositionLayer({ rotation: value })} />
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
      <input type="hidden" name="verse_date" value={verseDate} />
      <input type="hidden" name="reference" value={isImageOnly ? '' : reference} />
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
              const tone = controlToneStyles[layer.tone];
              return (
                <button
                  key={layer.key}
                  type="button"
                  onClick={() => {
                    setSelectedLayer(layer.key);
                    if (layer.key === 'background') changeCategory('background');
                    if (layer.key === 'watermark') changeCategory('watermark');
                  }}
                  className={`flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-xs font-black shadow-sm transition ${active ? tone.active : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'}`}
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
              const tone = controlToneStyles[item.tone];
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => changeCategory(item.key)}
                  className={`relative flex min-h-12 flex-col items-center justify-center rounded-lg px-1 text-[10px] font-black transition ${active ? tone.softText : 'text-slate-600 hover:text-slate-950'}`}
                >
                  {active ? <span className={`absolute top-1 h-1 w-7 rounded-full ${tone.solid}`} /> : null}
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
            const tone = controlToneStyles[item.tone];
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => changeCategory(item.key)}
                className={`relative flex min-h-[58px] flex-col items-center justify-center rounded-lg px-1 text-[10px] font-black transition min-[380px]:text-[11px] ${active ? tone.softText : 'text-slate-600 hover:text-slate-950'}`}
              >
                {active ? <span className={`absolute top-1 h-1 w-7 rounded-full ${tone.solid}`} /> : null}
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
