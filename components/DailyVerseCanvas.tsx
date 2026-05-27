'use client';

import { FiSunrise } from 'react-icons/fi';
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { CanvasAnchor, CanvasSettings, CanvasTextLayer } from './DailyVerseCanvasSettings';

type CanvasVerseSpan = {
  text: string;
  bold?: boolean;
  italic?: boolean;
};

function hexToRgb(hex: string) {
  const normalized = /^#[0-9a-f]{6}$/i.test(hex) ? hex : '#000000';
  const value = Number.parseInt(normalized.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function rgba(hex: string, alpha: number) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function anchorTransform(anchor: CanvasAnchor, rotation: number) {
  const rotate = rotation ? ` rotate(${rotation}deg)` : '';
  if (anchor === 'center') return `translate(-50%, -50%)${rotate}`;
  if (anchor === 'top-center') return `translateX(-50%)${rotate}`;
  if (anchor === 'top-right') return `translateX(-100%)${rotate}`;
  if (anchor === 'center-left') return `translateY(-50%)${rotate}`;
  if (anchor === 'center-right') return `translate(-100%, -50%)${rotate}`;
  if (anchor === 'bottom-left') return `translateY(-100%)${rotate}`;
  if (anchor === 'bottom-center') return `translate(-50%, -100%)${rotate}`;
  if (anchor === 'bottom-right') return `translate(-100%, -100%)${rotate}`;
  return rotate.trim() || undefined;
}

function layerStyle(layer: Pick<CanvasTextLayer, 'x' | 'y' | 'width' | 'height' | 'anchor' | 'rotation' | 'opacity'>) {
  return {
    left: `calc(var(--canvas-size) * ${layer.x})`,
    top: `calc(var(--canvas-size) * ${layer.y})`,
    width: `calc(var(--canvas-size) * ${layer.width})`,
    minHeight: layer.height ? `calc(var(--canvas-size) * ${layer.height})` : undefined,
    transform: anchorTransform(layer.anchor, layer.rotation),
    opacity: layer.opacity,
  };
}

function textShadow(layer: CanvasTextLayer) {
  if (!layer.shadowEnabled) return undefined;
  return `0 calc(var(--canvas-size) * 0.004) calc(var(--canvas-size) * ${layer.shadowBlur ?? 0.01}) rgba(0,0,0,${layer.shadowOpacity ?? 0.3})`;
}

export function DailyVerseCanvas({
  imageUrl,
  dateLabel,
  reference,
  verseText,
  spans,
  canvas,
  cardMode = 'verse',
  hideDate = false,
  compact = false,
}: {
  imageUrl?: string | null;
  dateLabel: string;
  reference: string;
  verseText: string;
  spans?: CanvasVerseSpan[];
  canvas: CanvasSettings;
  cardMode?: 'verse' | 'imageOnly';
  hideDate?: boolean;
  compact?: boolean;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(360);
  const renderedSpans = spans?.length ? spans : [{ text: verseText }];
  const background = canvas.background;
  const watermark = canvas.watermark;
  const showWatermarkText = watermark.enabled && (watermark.mode === 'text' || watermark.mode === 'textImage');
  const showWatermarkImage = watermark.enabled && (watermark.mode === 'image' || watermark.mode === 'textImage') && watermark.imageUrl;

  useEffect(() => {
    const element = rootRef.current;
    if (!element) return;

    const updateSize = () => setSize(element.getBoundingClientRect().width || 360);
    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={rootRef}
      className={`relative aspect-square overflow-hidden bg-slate-200 ${compact ? 'rounded-xl shadow-sm' : 'rounded-2xl shadow-[0_18px_45px_rgba(15,23,42,0.18)]'}`}
      style={{ '--canvas-size': `${size}px` } as CSSProperties}
    >
      {imageUrl ? (
        <img
          alt=""
          src={imageUrl}
          className="absolute object-cover"
          style={{
            width: `${background.zoom * 100}%`,
            height: `${background.zoom * 100}%`,
            left: `${-(background.zoom - 1) * background.focusX * 100}%`,
            top: `${-(background.zoom - 1) * background.focusY * 100}%`,
            filter: `brightness(${background.brightness}) blur(calc(var(--canvas-size) * ${background.blur}))`,
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#111827,#475569_48%,#94a3b8)]" />
      )}

      <div className="absolute inset-0" style={{ backgroundColor: rgba(background.overlayColor, background.overlayOpacity) }} />

      {!hideDate ? (
        <div
          className="absolute flex items-center whitespace-nowrap bg-slate-900/65 text-white shadow-sm backdrop-blur-[1px]"
          style={{
            ...layerStyle(canvas.layers.date),
            width: 'max-content',
            maxWidth: `calc(var(--canvas-size) * 0.7)`,
            gap: `calc(var(--canvas-size) * 0.014)`,
            borderRadius: `calc(var(--canvas-size) * 0.046)`,
            padding: `calc(var(--canvas-size) * 0.018) calc(var(--canvas-size) * 0.028)`,
            color: canvas.layers.date.color,
            fontSize: `calc(var(--canvas-size) * ${canvas.layers.date.fontSize})`,
            fontWeight: canvas.layers.date.fontWeight,
            lineHeight: canvas.layers.date.lineHeight,
            letterSpacing: `calc(var(--canvas-size) * ${canvas.layers.date.letterSpacing})`,
            textAlign: canvas.layers.date.align,
            textShadow: textShadow(canvas.layers.date),
          }}
        >
          <FiSunrise className="shrink-0" style={{ width: '1em', height: '1em' }} />
          <span>{dateLabel}</span>
        </div>
      ) : null}

      {cardMode !== 'imageOnly' ? (
        <>
          <div
            className="absolute whitespace-pre-wrap italic"
            style={{
              ...layerStyle(canvas.layers.verse),
              color: canvas.layers.verse.color,
              fontSize: `calc(var(--canvas-size) * ${canvas.layers.verse.fontSize})`,
              fontWeight: canvas.layers.verse.fontWeight,
              lineHeight: canvas.layers.verse.lineHeight,
              letterSpacing: `calc(var(--canvas-size) * ${canvas.layers.verse.letterSpacing})`,
              textAlign: canvas.layers.verse.align,
              overflowWrap: 'break-word',
              textShadow: textShadow(canvas.layers.verse),
            }}
          >
            &quot;{renderedSpans.map((span, index) => (
              <span key={`${span.text}-${index}`} style={{ fontWeight: span.bold ? 950 : canvas.layers.verse.fontWeight, fontStyle: span.italic ? 'italic' : 'normal' }}>
                {span.text}
              </span>
            ))}&quot;
          </div>

          <div
            className="absolute flex items-center justify-center overflow-hidden whitespace-pre-wrap px-[calc(var(--canvas-size)*0.026)]"
            style={{
              ...layerStyle(canvas.layers.reference),
              minHeight: `calc(var(--canvas-size) * ${canvas.layers.reference.height ?? 0.085})`,
              borderRadius: canvas.layers.reference.radius >= 10 ? '999px' : `calc(var(--canvas-size) * ${canvas.layers.reference.radius})`,
              backgroundColor: canvas.layers.reference.backgroundColor,
              color: canvas.layers.reference.textColor,
              fontSize: `calc(var(--canvas-size) * ${canvas.layers.reference.fontSize})`,
              fontWeight: canvas.layers.reference.fontWeight,
              lineHeight: canvas.layers.reference.lineHeight,
              letterSpacing: `calc(var(--canvas-size) * ${canvas.layers.reference.letterSpacing})`,
              textAlign: canvas.layers.reference.align,
              textShadow: textShadow(canvas.layers.reference),
            }}
          >
            {reference || 'Reference'}
          </div>
        </>
      ) : null}

      {showWatermarkImage ? (
        <img
          alt=""
          src={watermark.imageUrl}
          className="absolute object-contain"
          style={{
            ...layerStyle(watermark.imageLayer),
            height: `calc(var(--canvas-size) * ${watermark.imageLayer.width})`,
          }}
        />
      ) : null}

      {showWatermarkText ? (
        <div
          className="absolute whitespace-pre-wrap"
          style={{
            ...layerStyle(watermark.textLayer),
            color: watermark.textLayer.color,
            fontSize: `calc(var(--canvas-size) * ${watermark.textLayer.fontSize})`,
            fontWeight: watermark.textLayer.fontWeight,
            lineHeight: watermark.textLayer.lineHeight,
            letterSpacing: `calc(var(--canvas-size) * ${watermark.textLayer.letterSpacing})`,
            textAlign: watermark.textLayer.align,
            textShadow: textShadow(watermark.textLayer),
          }}
        >
          {watermark.text}
        </div>
      ) : null}
    </div>
  );
}
