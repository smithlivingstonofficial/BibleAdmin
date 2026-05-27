import { notFound } from 'next/navigation';
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
    <main>
      <DailyVerseEditor
        action={updateDailyVerse.bind(null, id)}
        submitLabel="Save / Publish"
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
