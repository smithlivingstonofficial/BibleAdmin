import Link from 'next/link';
import {
  deleteDailyVerse,
  duplicateDailyVerse,
  setDailyVersePublished,
} from '@/app/actions/daily-verses';
import DailyVerseDashboardActions from '@/components/DailyVerseDashboardActions';
import PublishDailyVerseButton from '@/components/PublishDailyVerseButton';
import {
  VersePreviewCard,
  getDailyVerseFallbackImageUrl,
  normalizePreviewSettings,
} from '@/components/VersePreviewCard';
import { createClient } from '@/lib/supabase/server';

type DailyVerse = {
  id: string;
  verse_date: string;
  reference: string;
  verse_text: string;
  is_published: boolean;
  background_image_url: string | null;
  editor_settings: Record<string, unknown> | null;
};

function formatDate(dateValue: string) {
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateValue;
  return date.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' });
}

function previewDate(dateValue: string) {
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return 'Today';
  return date.toLocaleDateString('en', { month: 'short', day: 'numeric' });
}

function StatTile({
  label,
  value,
  tone = 'slate',
}: {
  label: string;
  value: number;
  tone?: 'slate' | 'green' | 'blue';
}) {
  const toneClass = {
    slate: 'text-slate-950 bg-slate-100',
    green: 'text-emerald-700 bg-emerald-50',
    blue: 'text-blue-700 bg-blue-50',
  }[tone];

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-2 inline-flex min-w-9 justify-center rounded-md px-2 py-1 text-xl font-bold ${toneClass}`}>
        {value}
      </p>
    </div>
  );
}

export default async function DailyVersesPage() {
  const supabase = await createClient();
  const { data: verses, error } = await supabase
    .from('daily_verses')
    .select('id, verse_date, reference, verse_text, is_published, background_image_url, editor_settings')
    .order('verse_date', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const dailyVerses = (verses as DailyVerse[] | null) || [];
  const publishedCount = dailyVerses.filter((verse) => verse.is_published).length;
  const publishedVerse = dailyVerses.find((verse) => verse.is_published);

  return (
    <main className="mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-8">
      <div className="mb-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ring-1 ring-white sm:mb-7">
        <div className="bg-[radial-gradient(circle_at_top_left,#dbeafe,transparent_34%),linear-gradient(135deg,#ffffff,#f8fafc)] p-4 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-blue-700">Bible Admin</p>
              <h1 className="mt-2 text-3xl font-bold leading-tight text-slate-950 sm:text-4xl">Daily verses</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Create, preview, publish, and manage the verse shown in the mobile app.</p>
            </div>
            <Link href="/dashboard/daily-verses/new" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-slate-950 px-5 py-3 text-center text-sm font-bold text-white shadow-lg shadow-slate-950/15 hover:bg-slate-800 sm:min-w-36">
              New verse
            </Link>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
            <StatTile label="Total" value={dailyVerses.length} />
            <StatTile label="Live" value={publishedCount} tone="green" />
            <StatTile label="Drafts" value={dailyVerses.length - publishedCount} tone="blue" />
          </div>

          <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50/80 px-3 py-2 text-xs font-medium leading-5 text-blue-800">
            {publishedVerse
              ? `${publishedVerse.reference} is currently public. Publishing another verse will ask for confirmation first.`
              : 'No verse is public yet. Publish one verse when the preview is ready.'}
          </div>
        </div>
      </div>

      {dailyVerses.length ? (
        <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
          {dailyVerses.map((verse) => {
            const settings = normalizePreviewSettings(verse.editor_settings, verse.verse_text);
            const conflictingPublishedReference =
              !verse.is_published && publishedVerse ? publishedVerse.reference : null;
            const displayReference = settings.cardMode === 'imageOnly' ? 'Image only' : verse.reference;
            const displayText = settings.cardMode === 'imageOnly' ? 'Image-only daily verse' : verse.verse_text;

            return (
              <article key={verse.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                <div className="relative p-2.5 sm:p-3">
                  <div className="overflow-hidden rounded-xl">
                    <VersePreviewCard
                      imageUrl={verse.background_image_url || getDailyVerseFallbackImageUrl(verse.verse_date)}
                      dateLabel={previewDate(verse.verse_date)}
                      reference={verse.reference}
                      verseText={verse.verse_text}
                      settings={settings}
                    />
                  </div>
                  <span className={`absolute right-5 top-5 rounded-full px-2.5 py-1 text-xs font-bold shadow-sm ${verse.is_published ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100' : 'bg-white/90 text-slate-600 ring-1 ring-slate-200'}`}>
                    {verse.is_published ? 'Published' : 'Draft'}
                  </span>
                </div>

                <div className="px-4 pb-4 pt-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-blue-500" />
                      <p className="truncate text-lg font-bold text-slate-950 sm:text-base" title={displayReference}>
                        {displayReference}
                      </p>
                    </div>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{formatDate(verse.verse_date)}</p>
                  </div>

                  <p className="mt-3 line-clamp-3 overflow-hidden text-base leading-7 text-slate-700 sm:text-sm sm:leading-6">{displayText}</p>

                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    <span className={`rounded-full px-2.5 py-1 font-bold ${verse.background_image_url ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                      {verse.background_image_url ? 'Image uploaded' : 'No image'}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 font-bold text-slate-500">
                      {settings.cardMode === 'imageOnly' ? 'Image only' : settings.verseSpans.length > 1 ? 'Styled text' : 'Plain text'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 border-t border-slate-100 bg-slate-50/80 p-3 sm:grid-cols-3 sm:p-4">
                  <DailyVerseDashboardActions
                    editHref={`/dashboard/daily-verses/${verse.id}/edit`}
                    downloadHref={`/api/daily-verses/${verse.id}/download`}
                    duplicateAction={duplicateDailyVerse.bind(null, verse.id)}
                    deleteAction={deleteDailyVerse.bind(null, verse.id)}
                    reference={displayReference}
                  />
                  <PublishDailyVerseButton
                    action={setDailyVersePublished.bind(null, verse.id, !verse.is_published)}
                    isPublished={verse.is_published}
                    publishedReference={conflictingPublishedReference}
                  />
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm sm:rounded-2xl">
          <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">No daily verses yet</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-950">Create your first daily verse</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
            Add a verse, upload a background image, and publish it when the mobile preview looks right.
          </p>
          <Link href="/dashboard/daily-verses/new" className="mt-5 inline-flex min-h-11 rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800">
            New verse
          </Link>
        </div>
      )}
    </main>
  );
}
