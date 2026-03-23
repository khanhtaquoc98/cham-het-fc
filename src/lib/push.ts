import webpush from 'web-push';
import { supabase } from '@/lib/supabase';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY!;
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:chamhetfc@gmail.com';

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

export interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

// Save a push subscription
export async function saveSubscription(subscription: PushSubscriptionData): Promise<boolean> {
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'endpoint' });

  if (error) {
    console.error('Failed to save subscription:', error);
    return false;
  }
  return true;
}

// Remove a push subscription
export async function removeSubscription(endpoint: string): Promise<boolean> {
  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', endpoint);

  if (error) {
    console.error('Failed to remove subscription:', error);
    return false;
  }
  return true;
}

// Get all subscriptions
export async function getAllSubscriptions(): Promise<PushSubscriptionData[]> {
  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('*');

  if (error || !data) return [];

  return data.map((row) => ({
    endpoint: row.endpoint,
    keys: {
      p256dh: row.p256dh,
      auth: row.auth,
    },
  }));
}

// Get subscription count
export async function getSubscriptionCount(): Promise<number> {
  const { count, error } = await supabase
    .from('push_subscriptions')
    .select('*', { count: 'exact', head: true });

  if (error) return 0;
  return count || 0;
}

// Send notification to all subscribers
export async function sendNotificationToAll(title: string, body: string, url?: string): Promise<{ sent: number; failed: number }> {
  const subscriptions = await getAllSubscriptions();
  let sent = 0;
  let failed = 0;

  const payload = JSON.stringify({ title, body, url: url || '/' });

  const promises = subscriptions.map(async (sub) => {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: sub.keys,
        },
        payload
      );
      sent++;
    } catch (error: unknown) {
      failed++;
      // Remove invalid subscriptions (410 Gone or 404)
      const statusCode = (error as { statusCode?: number })?.statusCode;
      if (statusCode === 410 || statusCode === 404) {
        await removeSubscription(sub.endpoint);
      }
      console.error('Push failed for endpoint:', sub.endpoint, error);
    }
  });

  await Promise.all(promises);
  return { sent, failed };
}

// Check and send auto notification 1 hour before match
export async function checkAndSendAutoNotification(): Promise<{ sent: boolean; reason: string }> {
  // Get match data to check venue time
  const { data: matchData, error } = await supabase
    .from('match_data')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !matchData || !matchData.venue) {
    return { sent: false, reason: 'No match data found' };
  }

  const venue = matchData.venue;
  if (!venue.date || !venue.time) {
    return { sent: false, reason: 'No date/time configured' };
  }

  // Parse date and time (format: "12/3" and "19h15")
  const now = new Date();
  const currentYear = now.getFullYear();

  // Parse date: "12/3" -> day=12, month=3
  const dateParts = venue.date.split('/').map(Number);
  if (dateParts.length < 2) return { sent: false, reason: 'Invalid date format' };
  const [day, month] = dateParts;

  // Parse time: "19h15" or "20h00" or "19:15"
  const timeStr = venue.time.replace('h', ':').replace('H', ':');
  const timeParts = timeStr.split(':').map(Number);
  if (timeParts.length < 2) return { sent: false, reason: 'Invalid time format' };
  const [hours, minutes] = timeParts;

  // Build match date
  const matchDate = new Date(currentYear, month - 1, day, hours, minutes, 0);

  // Check if match is today
  const isToday = now.getDate() === matchDate.getDate() &&
    now.getMonth() === matchDate.getMonth() &&
    now.getFullYear() === matchDate.getFullYear();

  if (!isToday) {
    return { sent: false, reason: `Match is not today (match: ${venue.date})` };
  }

  // Check if we already sent this notification
  const notifKey = `auto_${venue.date}_${venue.time}`;
  const { data: existingLog } = await supabase
    .from('notification_logs')
    .select('id')
    .eq('notification_key', notifKey)
    .limit(1);

  if (existingLog && existingLog.length > 0) {
    return { sent: false, reason: 'Already sent for this match' };
  }

  // Send the notification!
  const title = '⚽ Sắp đến giờ đá!';
  const body = `Trận đấu lúc ${venue.time} tại ${venue.venue || 'sân'}. Chuẩn bị lên đường! 🔥`;

  const result = await sendNotificationToAll(title, body);

  // Log the notification
  await supabase.from('notification_logs').insert({
    notification_key: notifKey,
    title,
    body,
    sent_count: result.sent,
    failed_count: result.failed,
  });

  return { sent: true, reason: `Sent to ${result.sent} devices (${result.failed} failed)` };
}
