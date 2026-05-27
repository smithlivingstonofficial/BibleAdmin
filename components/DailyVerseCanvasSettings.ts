export type CanvasAnchor = 'top-left' | 'center' | 'top-center' | 'bottom-center';
export type CanvasAlign = 'left' | 'center' | 'right';
export type WatermarkMode = 'none' | 'text' | 'image' | 'textImage';

export type CanvasTextLayer = {
  x: number;
  y: number;
  width: number;
  height?: number;
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
  letterSpacing: number;
  align: CanvasAlign;
  color: string;
  opacity: number;
  anchor: CanvasAnchor;
  rotation: number;
  shadowEnabled?: boolean;
  shadowOpacity?: number;
  shadowBlur?: number;
};

export type CanvasReferenceLayer = CanvasTextLayer & {
  backgroundColor: string;
  textColor: string;
  radius: number;
};

export type CanvasBackgroundSettings = {
  type: 'image' | 'gradient';
  overlayOpacity: number;
  brightness: number;
  blur: number;
  zoom: number;
  focusX: number;
  focusY: number;
  overlayColor: string;
};

export type CanvasWatermarkSettings = {
  enabled: boolean;
  mode: WatermarkMode;
  text: string;
  imageUrl: string;
  textLayer: CanvasTextLayer;
  imageLayer: Omit<CanvasTextLayer, 'fontSize' | 'fontWeight' | 'lineHeight' | 'letterSpacing' | 'align' | 'color'>;
  patternEnabled: boolean;
};

export type CanvasSettings = {
  background: CanvasBackgroundSettings;
  layers: {
    date: CanvasTextLayer;
    verse: CanvasTextLayer;
    reference: CanvasReferenceLayer;
  };
  watermark: CanvasWatermarkSettings;
};

const hexColorPattern = /^#[0-9a-f]{6}$/i;

export const darkBibleClassicCanvas: CanvasSettings = {
  background: {
    type: 'image',
    overlayOpacity: 0.45,
    brightness: 1,
    blur: 0,
    zoom: 1,
    focusX: 0.5,
    focusY: 0.5,
    overlayColor: '#000000',
  },
  layers: {
    date: {
      x: 0.04,
      y: 0.035,
      width: 0.4,
      fontSize: 0.042,
      fontWeight: 800,
      lineHeight: 1.2,
      letterSpacing: 0,
      align: 'left',
      color: '#ffffff',
      opacity: 1,
      anchor: 'top-left',
      rotation: 0,
      shadowEnabled: true,
      shadowOpacity: 0.32,
      shadowBlur: 0.012,
    },
    verse: {
      x: 0.5,
      y: 0.43,
      width: 0.82,
      fontSize: 0.058,
      fontWeight: 800,
      lineHeight: 1.55,
      letterSpacing: 0,
      align: 'center',
      color: '#ffffff',
      opacity: 1,
      anchor: 'center',
      rotation: 0,
      shadowEnabled: true,
      shadowOpacity: 0.42,
      shadowBlur: 0.014,
    },
    reference: {
      x: 0.5,
      y: 0.67,
      width: 0.38,
      height: 0.085,
      fontSize: 0.036,
      fontWeight: 800,
      lineHeight: 1.15,
      letterSpacing: 0,
      align: 'center',
      color: '#000000',
      opacity: 1,
      anchor: 'center',
      rotation: 0,
      backgroundColor: '#ffffff',
      textColor: '#000000',
      radius: 999,
      shadowEnabled: false,
      shadowOpacity: 0.18,
      shadowBlur: 0.01,
    },
  },
  watermark: {
    enabled: false,
    mode: 'none',
    text: 'Bible',
    imageUrl: '',
    textLayer: {
      x: 0.88,
      y: 0.92,
      width: 0.28,
      fontSize: 0.032,
      fontWeight: 800,
      lineHeight: 1.2,
      letterSpacing: 0.02,
      align: 'center',
      color: '#ffffff',
      opacity: 0.55,
      anchor: 'center',
      rotation: 0,
    },
    imageLayer: {
      x: 0.88,
      y: 0.92,
      width: 0.16,
      opacity: 0.55,
      anchor: 'center',
      rotation: 0,
    },
    patternEnabled: false,
  },
};

function clamp(value: unknown, min: number, max: number, fallback: number) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return fallback;
  return Math.min(Math.max(numberValue, min), max);
}

function color(value: unknown, fallback: string) {
  const normalized = String(value || '').trim();
  return hexColorPattern.test(normalized) ? normalized.toLowerCase() : fallback;
}

function choice<T extends string>(value: unknown, options: readonly T[], fallback: T) {
  return options.includes(String(value) as T) ? (String(value) as T) : fallback;
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function normalizeTextLayer(value: unknown, fallback: CanvasTextLayer): CanvasTextLayer {
  const source = objectValue(value);
  return {
    x: clamp(source.x, 0, 1, fallback.x),
    y: clamp(source.y, 0, 1, fallback.y),
    width: clamp(source.width, 0.05, 1, fallback.width),
    height: source.height === undefined ? fallback.height : clamp(source.height, 0.03, 1, fallback.height ?? 0.08),
    fontSize: clamp(source.fontSize, 0.012, 0.18, fallback.fontSize),
    fontWeight: clamp(source.fontWeight, 100, 950, fallback.fontWeight),
    lineHeight: clamp(source.lineHeight, 0.8, 2.5, fallback.lineHeight),
    letterSpacing: clamp(source.letterSpacing, -0.02, 0.08, fallback.letterSpacing),
    align: choice(source.align, ['left', 'center', 'right'] as const, fallback.align),
    color: color(source.color, fallback.color),
    opacity: clamp(source.opacity, 0, 1, fallback.opacity),
    anchor: choice(source.anchor, ['top-left', 'center', 'top-center', 'bottom-center'] as const, fallback.anchor),
    rotation: clamp(source.rotation, -180, 180, fallback.rotation),
    shadowEnabled: source.shadowEnabled === undefined ? fallback.shadowEnabled : source.shadowEnabled === true,
    shadowOpacity: clamp(source.shadowOpacity, 0, 1, fallback.shadowOpacity ?? 0.3),
    shadowBlur: clamp(source.shadowBlur, 0, 0.08, fallback.shadowBlur ?? 0.01),
  };
}

function normalizeReferenceLayer(value: unknown, fallback: CanvasReferenceLayer): CanvasReferenceLayer {
  const source = objectValue(value);
  return {
    ...normalizeTextLayer(value, fallback),
    backgroundColor: color(source.backgroundColor, fallback.backgroundColor),
    textColor: color(source.textColor, fallback.textColor),
    radius: clamp(source.radius, 0, 1, fallback.radius),
  };
}

export function normalizeCanvasSettings(value: unknown): CanvasSettings {
  const source = objectValue(value);
  const background = objectValue(source.background);
  const layers = objectValue(source.layers);
  const watermark = objectValue(source.watermark);

  return {
    background: {
      type: background.type === 'gradient' ? 'gradient' : 'image',
      overlayOpacity: clamp(background.overlayOpacity, 0, 0.9, darkBibleClassicCanvas.background.overlayOpacity),
      brightness: clamp(background.brightness, 0.4, 1.8, darkBibleClassicCanvas.background.brightness),
      blur: clamp(background.blur, 0, 0.08, darkBibleClassicCanvas.background.blur),
      zoom: clamp(background.zoom, 1, 2.5, darkBibleClassicCanvas.background.zoom),
      focusX: clamp(background.focusX, 0, 1, darkBibleClassicCanvas.background.focusX),
      focusY: clamp(background.focusY, 0, 1, darkBibleClassicCanvas.background.focusY),
      overlayColor: color(background.overlayColor, darkBibleClassicCanvas.background.overlayColor),
    },
    layers: {
      date: normalizeTextLayer(layers.date, darkBibleClassicCanvas.layers.date),
      verse: normalizeTextLayer(layers.verse, darkBibleClassicCanvas.layers.verse),
      reference: normalizeReferenceLayer(layers.reference, darkBibleClassicCanvas.layers.reference),
    },
    watermark: {
      enabled: watermark.enabled === true,
      mode: choice(watermark.mode, ['none', 'text', 'image', 'textImage'] as const, darkBibleClassicCanvas.watermark.mode),
      text: typeof watermark.text === 'string' ? watermark.text.slice(0, 140) : darkBibleClassicCanvas.watermark.text,
      imageUrl: typeof watermark.imageUrl === 'string' ? watermark.imageUrl.slice(0, 2000) : '',
      textLayer: normalizeTextLayer(watermark.textLayer, darkBibleClassicCanvas.watermark.textLayer),
      imageLayer: {
        ...darkBibleClassicCanvas.watermark.imageLayer,
        ...normalizeTextLayer(watermark.imageLayer, {
          ...darkBibleClassicCanvas.watermark.textLayer,
          ...darkBibleClassicCanvas.watermark.imageLayer,
          fontSize: 0.04,
          fontWeight: 700,
          lineHeight: 1,
          letterSpacing: 0,
          align: 'center',
          color: '#ffffff',
        }),
      },
      patternEnabled: watermark.patternEnabled === true,
    },
  };
}
