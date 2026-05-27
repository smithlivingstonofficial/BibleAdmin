import { getFirebaseMessaging, isFirebaseAdminConfigured } from './firebase-admin';
import { createServiceClient, isSupabaseServiceConfigured } from './supabase/server';

type DailyVersePushInput = {
  id?: string;
  reference: string;
  verse_text: string;
  verse_date?: string;
};

function truncate(value: string, maxLength = 120) {
  if (!value || value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1).trim()}...`;
}

export async function sendDailyVersePublishedNotification(verse: DailyVersePushInput) {
  if (!isSupabaseServiceConfigured() || !isFirebaseAdminConfigured()) {
    console.warn('Daily verse push skipped: Supabase service role or Firebase Admin is not configured.');
    return;
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from('notification_devices')
    .select('fcm_token')
    .eq('admin_verse_push_enabled', true);

  if (error) {
    throw new Error(error.message);
  }

  const tokens = (data || [])
    .map((row) => row.fcm_token)
    .filter((token): token is string => typeof token === 'string' && token.length > 0);

  if (!tokens.length) {
    return;
  }

  const messaging = getFirebaseMessaging();
  const title = verse.reference ? `Daily Verse - ${verse.reference}` : 'Daily Verse';
  const body = truncate(verse.verse_text || 'A new daily verse is ready.');

  for (let index = 0; index < tokens.length; index += 500) {
    const batch = tokens.slice(index, index + 500);
    await messaging.sendEachForMulticast({
      tokens: batch,
      notification: {
        title,
        body,
      },
      data: {
        type: 'admin_daily_verse',
        dailyVerseId: verse.id || '',
        verseDate: verse.verse_date || '',
        title,
        body,
      },
      android: {
        notification: {
          channelId: 'admin_daily_verse',
        },
      },
    });
  }
}
