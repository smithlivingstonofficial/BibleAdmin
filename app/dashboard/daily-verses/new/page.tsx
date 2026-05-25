import Link from 'next/link';
import DailyVerseEditor from '@/components/DailyVerseEditor';
import { createDailyVerse } from '@/app/actions/daily-verses';
import { createClient } from '@/lib/supabase/server';

export default async function NewDailyVersePage() {
  const supabase = await createClient();
  const { data: publishedVerse } = await supabase
    .from('daily_verses')
    .select('reference')
    .eq('is_published', true)
    .maybeSingle();

  return (
    <main className="mx-auto max-w-7xl px-3 py-3 sm:px-4 sm:py-8">
      <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm sm:px-5">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-blue-700">Create</p>
          <h1 className="truncate text-xl font-bold text-slate-950 sm:text-3xl">New daily verse</h1>
        </div>
        <Link href="/dashboard/daily-verses" className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50">
          Back
        </Link>
      </div>
      <DailyVerseEditor
        action={createDailyVerse}
        submitLabel="Create verse"
        publishedReference={publishedVerse?.reference ?? null}
        variant="new"
      />
    </main>
  );
}
