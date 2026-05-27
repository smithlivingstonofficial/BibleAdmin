'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { uploadVerseBackground, uploadVerseWatermark } from '@/lib/r2';
import { sendDailyVersePublishedNotification } from '@/lib/daily-verse-notifications';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { parseDailyVerseForm } from '@/lib/validation';

export type DailyVerseActionState = {
  message: string;
};

function getImageFile(formData: FormData) {
  const file = formData.get('background_image');
  return file instanceof File && file.size > 0 ? file : null;
}

function getWatermarkImageFile(formData: FormData) {
  const file = formData.get('watermark_image');
  return file instanceof File && file.size > 0 ? file : null;
}

function applyWatermarkUpload(input: ReturnType<typeof parseDailyVerseForm>, imageUrl: string | null) {
  if (!imageUrl) return input;

  const editorSettings = input.editor_settings as Record<string, unknown>;
  const canvas = editorSettings.canvas && typeof editorSettings.canvas === 'object'
    ? editorSettings.canvas as Record<string, unknown>
    : {};
  const watermark = canvas.watermark && typeof canvas.watermark === 'object'
    ? canvas.watermark as Record<string, unknown>
    : {};
  const mode = watermark.mode === 'text' ? 'textImage' : watermark.mode === 'none' ? 'image' : watermark.mode || 'image';

  return {
    ...input,
    editor_settings: {
      ...editorSettings,
      canvas: {
        ...canvas,
        watermark: {
          ...watermark,
          enabled: true,
          mode,
          imageUrl,
        },
      },
    },
  };
}

function getActionErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return 'Something went wrong. Please check the verse and try again.';
}

async function unpublishOtherDailyVerses(supabase: Awaited<ReturnType<typeof createClient>>, id?: string) {
  let query = supabase
    .from('daily_verses')
    .update({ is_published: false })
    .eq('is_published', true);

  if (id) {
    query = query.neq('id', id);
  }

  const { error } = await query;

  if (error) {
    throw new Error(error.message);
  }
}

async function ensureDailyVerseDateIsAvailable(
  supabase: Awaited<ReturnType<typeof createClient>>,
  verseDate: string,
  id?: string
) {
  let query = supabase
    .from('daily_verses')
    .select('id, reference')
    .eq('verse_date', verseDate);

  if (id) {
    query = query.neq('id', id);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (data) {
    throw new Error('Only one daily verse can be created for a date. Choose another date or edit the existing verse.');
  }
}

async function notifyDailyVersePublished(verse: {
  id?: string;
  reference: string;
  verse_text: string;
  verse_date?: string;
}) {
  try {
    await sendDailyVersePublishedNotification(verse);
  } catch (error) {
    console.warn('Daily verse push notification failed:', error);
  }
}

export async function createDailyVerse(
  _state: DailyVerseActionState,
  formData: FormData
): Promise<DailyVerseActionState> {
  if (!isSupabaseConfigured()) {
    redirect('/login?error=config');
  }

  const supabase = await createClient();
  let input: ReturnType<typeof parseDailyVerseForm>;
  let upload: Awaited<ReturnType<typeof uploadVerseBackground>>;
  let watermarkUpload: Awaited<ReturnType<typeof uploadVerseWatermark>>;

  try {
    input = parseDailyVerseForm(formData);
    await ensureDailyVerseDateIsAvailable(supabase, input.verse_date);
    upload = await uploadVerseBackground(getImageFile(formData) as File);
    watermarkUpload = await uploadVerseWatermark(getWatermarkImageFile(formData) as File);
    input = applyWatermarkUpload(input, watermarkUpload?.url ?? null);
    if (input.is_published) {
      await unpublishOtherDailyVerses(supabase);
    }
  } catch (error) {
    return { message: getActionErrorMessage(error) };
  }

  const { data: insertedVerse, error } = await supabase.from('daily_verses').insert({
    ...input,
    background_image_url: upload?.url ?? null,
    background_image_key: upload?.key ?? null,
  }).select('id, reference, verse_text, verse_date').maybeSingle();

  if (error) {
    return { message: error.message };
  }

  if (input.is_published) {
    await notifyDailyVersePublished(insertedVerse || input);
  }

  revalidatePath('/dashboard/daily-verses');
  redirect('/dashboard/daily-verses');
}

export async function updateDailyVerse(
  id: string,
  _state: DailyVerseActionState,
  formData: FormData
): Promise<DailyVerseActionState> {
  if (!isSupabaseConfigured()) {
    redirect('/login?error=config');
  }

  const supabase = await createClient();
  let input: ReturnType<typeof parseDailyVerseForm>;
  let upload: Awaited<ReturnType<typeof uploadVerseBackground>>;
  let watermarkUpload: Awaited<ReturnType<typeof uploadVerseWatermark>>;
  let wasPublished = false;

  try {
    const { data: existingVerse, error: existingError } = await supabase
      .from('daily_verses')
      .select('is_published')
      .eq('id', id)
      .maybeSingle();

    if (existingError) {
      throw new Error(existingError.message);
    }

    wasPublished = existingVerse?.is_published === true;
    input = parseDailyVerseForm(formData);
    await ensureDailyVerseDateIsAvailable(supabase, input.verse_date, id);
    upload = await uploadVerseBackground(getImageFile(formData) as File);
    watermarkUpload = await uploadVerseWatermark(getWatermarkImageFile(formData) as File);
    input = applyWatermarkUpload(input, watermarkUpload?.url ?? null);
    if (input.is_published) {
      await unpublishOtherDailyVerses(supabase, id);
    }
  } catch (error) {
    return { message: getActionErrorMessage(error) };
  }

  const updateData = {
    ...input,
    ...(upload
      ? {
          background_image_url: upload.url,
          background_image_key: upload.key,
        }
      : {}),
  };

  const { data: updatedVerse, error } = await supabase
    .from('daily_verses')
    .update(updateData)
    .eq('id', id)
    .select('id, reference, verse_text, verse_date')
    .maybeSingle();

  if (error) {
    return { message: error.message };
  }

  if (input.is_published && !wasPublished) {
    await notifyDailyVersePublished(updatedVerse || { id, ...input });
  }

  revalidatePath('/dashboard/daily-verses');
  redirect('/dashboard/daily-verses');
}

export async function deleteDailyVerse(id: string) {
  if (!isSupabaseConfigured()) {
    redirect('/login?error=config');
  }

  const supabase = await createClient();
  const { error } = await supabase.from('daily_verses').delete().eq('id', id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath('/dashboard/daily-verses');
}

function addDays(dateValue: string, days: number) {
  const date = new Date(`${dateValue}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

async function getNextAvailableDuplicateDate(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sourceDate: string
) {
  let nextDate = addDays(sourceDate, 1);

  for (let attempt = 0; attempt < 370; attempt += 1) {
    const { data, error } = await supabase
      .from('daily_verses')
      .select('id')
      .eq('verse_date', nextDate)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return nextDate;
    }

    nextDate = addDays(nextDate, 1);
  }

  throw new Error('Could not find an available date for the duplicate.');
}

export async function duplicateDailyVerse(id: string) {
  if (!isSupabaseConfigured()) {
    redirect('/login?error=config');
  }

  const supabase = await createClient();
  const { data: verse, error } = await supabase
    .from('daily_verses')
    .select('verse_date, reference, verse_text, background_image_url, background_image_key, editor_settings')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!verse) {
    throw new Error('Daily verse not found.');
  }

  const verseDate = await getNextAvailableDuplicateDate(supabase, verse.verse_date);
  const { error: insertError } = await supabase.from('daily_verses').insert({
    verse_date: verseDate,
    reference: verse.reference,
    verse_text: verse.verse_text,
    background_image_url: verse.background_image_url,
    background_image_key: verse.background_image_key,
    editor_settings: verse.editor_settings || {},
    is_published: false,
  });

  if (insertError) {
    throw new Error(insertError.message);
  }

  revalidatePath('/dashboard/daily-verses');
}

export async function setDailyVersePublished(id: string, isPublished: boolean) {
  if (!isSupabaseConfigured()) {
    redirect('/login?error=config');
  }

  const supabase = await createClient();
  if (isPublished) {
    await unpublishOtherDailyVerses(supabase, id);
  }

  const { data: verse, error } = await supabase
    .from('daily_verses')
    .update({ is_published: isPublished })
    .eq('id', id)
    .select('id, reference, verse_text, verse_date')
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (isPublished && verse) {
    await notifyDailyVersePublished(verse);
  }

  revalidatePath('/dashboard/daily-verses');
}
