export type VerseSpan = {
  text: string;
  bold?: boolean;
  italic?: boolean;
};

export type PreviewSettings = {
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
  referenceFontSize: number;
  referenceStyle: 'pill' | 'minimal';
  verseSpans: VerseSpan[];
};

export const defaultPreviewSettings: PreviewSettings = {
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

const textColors = ['#ffffff', '#f8fafc', '#fef3c7', '#e0f2fe'];
const alignOptions = ['left', 'center', 'right'];

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
    textColor: textColors.includes(String(source.textColor))
      ? String(source.textColor)
      : defaultPreviewSettings.textColor,
    referenceStyle: source.referenceStyle === 'minimal' ? 'minimal' : 'pill',
    verseSpans: normalizeSpans(source.verseSpans, fallbackText),
  };
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
  const spans = settings.verseSpans.length > 0 ? settings.verseSpans : [{ text: verseText }];

  return (
    <div className="relative aspect-square overflow-hidden rounded-2xl bg-slate-200 shadow-[0_4px_8px_rgba(0,0,0,0.2)]">
      {imageUrl ? (
        <img
          alt=""
          src={imageUrl}
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

      <div
        className="absolute left-0 top-0 rounded-br-2xl rounded-tl-2xl bg-black/40 font-bold text-white"
        style={{
          padding: `${6 * scale}px ${12 * scale}px`,
          fontSize: `${14 * scale}px`,
          lineHeight: `${18 * scale}px`,
        }}
      >
        {dateLabel}
      </div>

      <div
        className="absolute text-white"
        style={{
          left: `${settings.overlayX}%`,
          top: `${settings.overlayY}%`,
          width: `${settings.overlayWidth}%`,
          borderRadius: `${settings.overlayRadius * scale}px`,
          padding: `${settings.overlayPadding * scale}px`,
          backgroundColor: `rgba(0,0,0,${settings.overlayOpacity / 100})`,
          color: settings.textColor,
        }}
      >
        <p
          className="italic"
          style={{
            fontSize: `${settings.verseFontSize * scale}px`,
            lineHeight: `${settings.verseLineHeight * scale}px`,
            textAlign: settings.textAlign,
          }}
        >
          &quot;
          {spans.map((span, index) => (
            <span key={`${span.text}-${index}`} style={{ fontWeight: span.bold ? 800 : 700, fontStyle: span.italic ? 'italic' : 'inherit' }}>
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
            className={settings.referenceStyle === 'pill' ? 'rounded-full bg-white/90 font-bold text-black' : 'font-bold text-white drop-shadow'}
            style={{
              fontSize: `${settings.referenceFontSize * scale}px`,
              lineHeight: `${18 * scale}px`,
              padding: settings.referenceStyle === 'pill' ? `${6 * scale}px ${16 * scale}px` : 0,
            }}
          >
            {reference || 'Reference'}
          </span>
        </div>
      </div>
    </div>
  );
}
