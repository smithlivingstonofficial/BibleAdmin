import { notFound } from 'next/navigation';
import Link from 'next/link';
import DailyVerseEditor from '@/components/DailyVerseEditor';
import { updateDailyVerse } from '@/app/actions/daily-verses';
import { createClient } from '@/lib/supabase/server';

type Props = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditDailyVersePage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: verse, error } = await supabase
    .from('daily_verses')
    .select('id, verse_date, reference, verse_text, language, is_published, background_image_url, editor_settings')
    .eq('id', id)
    .maybeSingle();
  const { data: publishedVerse } = await supabase
    .from('daily_verses')
    .select('reference')
    .eq('is_published', true)
    .neq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!verse) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-7xl px-3 py-3 sm:px-4 sm:py-8">
      <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm sm:px-5">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-blue-700">Edit</p>
          <h1 className="truncate text-xl font-bold text-slate-950 sm:text-3xl">Edit daily verse</h1>
        </div>
        <Link href="/dashboard/daily-verses" className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50">
          Back
        </Link>
      </div>
      <DailyVerseEditor
        action={updateDailyVerse.bind(null, id)}
        submitLabel="Save changes"
        publishedReference={publishedVerse?.reference ?? null}
        variant="new"
        values={{
          ...verse,
          editor_settings: verse.editor_settings && typeof verse.editor_settings === 'object'
            ? verse.editor_settings
            : null,
        }}
      />
    </main>
  );
}
