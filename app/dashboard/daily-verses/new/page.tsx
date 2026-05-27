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
    <main>
      <DailyVerseEditor
        action={createDailyVerse}
        submitLabel="Save / Publish"
        publishedReference={publishedVerse?.reference ?? null}
        variant="new"
      />
    </main>
  );
}
