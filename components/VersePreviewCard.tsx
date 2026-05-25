export type VerseSpan = {
  text: string;
  bold?: boolean;
  italic?: boolean;
};

export type PreviewSettings = {
  cardMode: 'verse' | 'imageOnly';
  momentStyle: 'classic' | 'celebration' | 'gold' | 'glass';
  hideDate: boolean;
  imageZoom: number;
  imageX: number;
  imageY: number;
  overlayX: number;
  overlayY: number;
  overlayWidth: number;
  overlayOpacity: number;
  overlayPadding: number;
  overlayRadius: number;
  verseFontSize: number;
  verseLineHeight: number;
  textAlign: 'left' | 'center' | 'right';
  textColor: string;
  gradientStartColor: string;
  gradientEndColor: string;
  referenceBackgroundColor: string;
  referenceTextColor: string;
  dateBadgeColor: string;
  referenceFontSize: number;
  referenceStyle: 'pill' | 'minimal';
  verseSpans: VerseSpan[];
};

export const defaultPreviewSettings: PreviewSettings = {
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
};

const alignOptions = ['left', 'center', 'right'];
const momentStyles = ['classic', 'celebration', 'gold', 'glass'];
const fallbackBackgroundCount = 14;
const hexColorPattern = /^#[0-9a-f]{6}$/i;

function normalizeColor(value: unknown, fallback: string) {
  const color = String(value || '').trim();
  return hexColorPattern.test(color) ? color.toLowerCase() : fallback;
}

function hexToRgb(color: string) {
  const normalized = normalizeColor(color, '#000000').slice(1);
  const value = Number.parseInt(normalized, 16);
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255,
  };
}

function rgbaFromHex(color: string, alpha: number) {
  const rgb = hexToRgb(color);
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

function normalizeSpans(value: unknown, fallbackText: string): VerseSpan[] {
  if (!Array.isArray(value)) return fallbackText ? [{ text: fallbackText }] : [];

  const spans = value
    .filter((span) => span && typeof span.text === 'string' && span.text.length > 0)
    .map((span) => ({ text: span.text, bold: Boolean(span.bold), italic: Boolean(span.italic) }));

  return spans.length > 0 ? spans : fallbackText ? [{ text: fallbackText }] : [];
}

export function normalizePreviewSettings(settings: Record<string, unknown> | null | undefined, fallbackText = ''): PreviewSettings {
  const source = settings || {};
  return {
    ...defaultPreviewSettings,
    ...source,
    textAlign: alignOptions.includes(String(source.textAlign))
      ? (source.textAlign as PreviewSettings['textAlign'])
      : defaultPreviewSettings.textAlign,
    hideDate: source.hideDate === true,
    textColor: normalizeColor(source.textColor, defaultPreviewSettings.textColor),
    gradientStartColor: normalizeColor(source.gradientStartColor, defaultPreviewSettings.gradientStartColor),
    gradientEndColor: normalizeColor(source.gradientEndColor, defaultPreviewSettings.gradientEndColor),
    referenceBackgroundColor: normalizeColor(source.referenceBackgroundColor, defaultPreviewSettings.referenceBackgroundColor),
    referenceTextColor: normalizeColor(source.referenceTextColor, defaultPreviewSettings.referenceTextColor),
    dateBadgeColor: normalizeColor(source.dateBadgeColor, defaultPreviewSettings.dateBadgeColor),
    referenceStyle: source.referenceStyle === 'minimal' ? 'minimal' : 'pill',
    cardMode: source.cardMode === 'imageOnly' ? 'imageOnly' : 'verse',
    momentStyle: momentStyles.includes(String(source.momentStyle))
      ? (source.momentStyle as PreviewSettings['momentStyle'])
      : 'classic',
    verseSpans: normalizeSpans(source.verseSpans, fallbackText),
  };
}

function getMomentStyle(settings: PreviewSettings, scale: number) {
  const alpha = settings.overlayOpacity / 100;
  const customGradient = settings.gradientStartColor !== defaultPreviewSettings.gradientStartColor ||
    settings.gradientEndColor !== defaultPreviewSettings.gradientEndColor;
  const gradientOverlay = {
    background: `linear-gradient(135deg, ${rgbaFromHex(settings.gradientStartColor, Math.max(alpha, 0.34))}, ${rgbaFromHex(settings.gradientEndColor, Math.max(alpha - 0.08, 0.28))})`,
  };

  if (settings.momentStyle === 'celebration') {
    return {
      overlay: {
        ...(customGradient ? gradientOverlay : {
          background: `linear-gradient(135deg, rgba(236, 72, 153, ${Math.max(alpha, 0.52)}), rgba(37, 99, 235, ${Math.max(alpha - 0.08, 0.42)}))`,
        }),
        border: `${1 * scale}px solid rgba(255,255,255,0.34)`,
        boxShadow: `0 ${10 * scale}px ${24 * scale}px rgba(15,23,42,0.24)`,
      },
      refClass: 'rounded-full font-bold',
      refStyle: { backgroundColor: settings.referenceBackgroundColor, color: settings.referenceTextColor },
    };
  }

  if (settings.momentStyle === 'gold') {
    return {
      overlay: {
        ...(customGradient ? gradientOverlay : {
          background: `linear-gradient(135deg, rgba(120, 53, 15, ${Math.max(alpha, 0.56)}), rgba(234, 179, 8, ${Math.max(alpha - 0.12, 0.36)}))`,
        }),
        border: `${1 * scale}px solid rgba(253,230,138,0.48)`,
        boxShadow: `0 ${10 * scale}px ${24 * scale}px rgba(120,53,15,0.25)`,
      },
      refClass: 'rounded-full font-bold',
      refStyle: { backgroundColor: settings.referenceBackgroundColor, color: settings.referenceTextColor },
    };
  }

  if (settings.momentStyle === 'glass') {
    return {
      overlay: {
        ...(customGradient ? gradientOverlay : {
          backgroundColor: `rgba(15, 23, 42, ${Math.max(alpha - 0.1, 0.28)})`,
        }),
        border: `${1 * scale}px solid rgba(255,255,255,0.3)`,
        boxShadow: `0 ${8 * scale}px ${22 * scale}px rgba(15,23,42,0.2)`,
        backdropFilter: 'blur(5px)',
      },
      refClass: 'rounded-full font-bold',
      refStyle: { backgroundColor: settings.referenceBackgroundColor, color: settings.referenceTextColor },
    };
  }

  return {
    overlay: {
      ...(customGradient ? gradientOverlay : { backgroundColor: `rgba(0, 0, 0, ${alpha})` }),
    },
    refClass: settings.referenceStyle === 'pill' ? 'rounded-full font-bold' : 'font-bold',
    refStyle: {
      backgroundColor: settings.referenceStyle === 'pill' ? settings.referenceBackgroundColor : 'transparent',
      color: settings.referenceStyle === 'pill' ? settings.referenceTextColor : settings.textColor,
    },
  };
}

export function getDailyVerseFallbackImageUrl(dateValue?: string) {
  const date = dateValue ? new Date(`${dateValue}T00:00:00`) : new Date();
  const dayOfMonth = Number.isNaN(date.getTime()) ? new Date().getDate() : date.getDate();
  const imageIndex = ((dayOfMonth - 1) % fallbackBackgroundCount) + 1;

  return `/daily-verse-bg/${imageIndex}.jpg`;
}

export function VersePreviewCard({
  imageUrl,
  dateLabel,
  reference,
  verseText,
  settings,
  compact = false,
}: {
  imageUrl?: string | null;
  dateLabel: string;
  reference: string;
  verseText: string;
  settings: PreviewSettings;
  compact?: boolean;
}) {
  const scale = compact ? 0.62 : 1;
  const imageSource = imageUrl || null;
  const spans = settings.verseSpans.length > 0 ? settings.verseSpans : [{ text: verseText }];
  const isImageOnly = settings.cardMode === 'imageOnly';
  const momentStyle = getMomentStyle(settings, scale);

  return (
    <div className="relative aspect-square overflow-hidden rounded-[16px] bg-slate-200 shadow-[0_4px_8px_rgba(0,0,0,0.2)]">
      {imageSource ? (
        <img
          alt=""
          src={imageSource}
          className="absolute object-cover"
          style={{
            width: `${settings.imageZoom * 100}%`,
            height: `${settings.imageZoom * 100}%`,
            left: `${-(settings.imageZoom - 1) * settings.imageX}%`,
            top: `${-(settings.imageZoom - 1) * settings.imageY}%`,
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#475569,#94a3b8_55%,#e2e8f0)]" />
      )}

      {!settings.hideDate ? (
        <div
          className="absolute left-0 top-0 rounded-br-[16px] rounded-tl-[16px] font-bold text-white"
          style={{
            padding: `${6 * scale}px ${12 * scale}px`,
            fontSize: `${14 * scale}px`,
            lineHeight: `${18 * scale}px`,
            backgroundColor: rgbaFromHex(settings.dateBadgeColor, 0.4),
          }}
        >
          {dateLabel}
        </div>
      ) : null}

      {!isImageOnly ? (
        <div
          className="absolute text-white"
          style={{
            left: `${settings.overlayX}%`,
            top: `${settings.overlayY}%`,
            width: `${settings.overlayWidth}%`,
            borderRadius: `${settings.overlayRadius * scale}px`,
            padding: `${settings.overlayPadding * scale}px`,
            color: settings.textColor,
            ...momentStyle.overlay,
          }}
        >
          <p
            className="m-0 italic"
            style={{
              fontSize: `${settings.verseFontSize * scale}px`,
              lineHeight: `${settings.verseLineHeight * scale}px`,
              textAlign: settings.textAlign,
              color: settings.textColor,
              fontWeight: 700,
            }}
          >
            &quot;
            {spans.map((span, index) => (
              <span key={`${span.text}-${index}`} style={{ fontWeight: span.bold ? 900 : 700, fontStyle: span.italic ? 'italic' : 'normal' }}>
                {span.text}
              </span>
            ))}
            &quot;
          </p>
          <div
            className="flex"
            style={{
              justifyContent: settings.textAlign === 'left' ? 'flex-start' : settings.textAlign === 'right' ? 'flex-end' : 'center',
              marginTop: `${16 * scale}px`,
            }}
          >
            <span
              className={momentStyle.refClass}
              style={{
                fontSize: `${settings.referenceFontSize * scale}px`,
                lineHeight: `${18 * scale}px`,
                padding: settings.referenceStyle === 'pill' ? `${6 * scale}px ${16 * scale}px` : 0,
                textAlign: 'center',
                ...momentStyle.refStyle,
              }}
            >
              {reference || 'Reference'}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
