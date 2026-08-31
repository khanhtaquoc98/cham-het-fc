import webpush from 'web-push';
import { supabase } from '@/lib/supabase';

let vapidInitialized = false;

function ensureVapidDetails(): boolean {
  if (vapidInitialized) return true;
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT || 'mailto:chamhetfc@gmail.com';

  if (!vapidPublicKey || !vapidPrivateKey) {
    return false;
  }

  try {
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
    vapidInitialized = true;
    return true;
  } catch (error) {
    console.error('Failed to set VAPID details:', error);
    return false;
  }
}

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
  if (!ensureVapidDetails()) {
    console.warn('VAPID details not configured or invalid. Skipping sendNotificationToAll.');
    return { sent: 0, failed: 0 };
  }

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
  const titles = [
    '⚽ Sắp đến giờ đá!',
    '🔥 Chuẩn bị ra sân thôi anh em!',
    '⚡ Lên đồ đi đá bóng nào!',
    '👟 Xách giày lên và đi!',
    '⏰ Sắp tới giờ G rồi!',
    '🏆 Đến giờ quẩy bóng rồi anh em ơi!',
    '💥 Trận cầu đinh hôm nay!',
    '👑 Siêu kinh điển tối nay!',
    '🎯 Điểm danh đầy đủ, xuất phát thôi!',
    '🚀 Xe chuẩn bị lăn bánh ra sân!',
    '🥇 Quyết tâm lấy 3 điểm tối nay!',
    '⚽ Thể thao nâng cao sức khỏe nào!',
    '🥅 Lưới chuẩn bị rung rồi anh em ơi!',
    '📢 Nhắc nhẹ: Kèo bóng đỉnh cao hôm nay!',
    '🏃‍♂️ Mang giày ra sân cháy hết mình!'
  ];
  
  const bodies = [
    `Trận đấu lúc ${venue.time} tại ${venue.venue || 'sân'}. Chuẩn bị lên đường! 🔥`,
    `Anh em nhớ có mặt lúc ${venue.time} ở ${venue.venue || 'sân'} nhé! 🚀`,
    `Đừng quên kèo bóng lúc ${venue.time} tại ${venue.venue || 'sân'}. Khởi động kỹ nha! 💪`,
    `Đã đến lúc tỏa sáng! Hẹn gặp anh em lúc ${venue.time} tại ${venue.venue || 'sân'}. ⚽`,
    `Chiến thôi! Trận đấu bắt đầu lúc ${venue.time} tại ${venue.venue || 'sân'}. 🏃‍♂️`,
    `Anh em thu xếp công việc, chuẩn bị có mặt lúc ${venue.time} tại ${venue.venue || 'sân'} nha! 🎯`,
    `Trận đấu hứa hẹn vô cùng nảy lửa lúc ${venue.time} tại ${venue.venue || 'sân'}. Ra sân ngay thôi! 💥`,
    `Đã nạp đầy năng lượng chưa? Hẹn gặp anh em lúc ${venue.time} ở ${venue.venue || 'sân'}! ⚡`,
    `Đừng để đồng đội phải chờ! Có mặt đúng giờ ${venue.time} tại ${venue.venue || 'sân'} nhé anh em! ⏰`,
    `Trời đẹp thế này không đá bóng thì phí! Lên sân lúc ${venue.time} ở ${venue.venue || 'sân'} nào! ⛅`,
    `Bóng sắp lăn lúc ${venue.time} tại ${venue.venue || 'sân'}. Đứng dậy lên đồ ra sân thôi! 👟`,
    `Khung thành đang chờ anh em xé lưới lúc ${venue.time} tại ${venue.venue || 'sân'}. 🥅`,
    `Mang theo tinh thần quyết thắng tới ${venue.venue || 'sân'} lúc ${venue.time} nhé anh em! 🏆`,
    `Kiểm tra lại tất, giày và nước hoa quả nào! Hẹn gặp ở ${venue.venue || 'sân'} lúc ${venue.time}! 🥤`,
    `Anh em ơi, 1 tiếng nữa bóng lăn tại ${venue.venue || 'sân'} (${venue.time}). Xuất phát thôi! 🚗`
  ];

  const title = titles[Math.floor(Math.random() * titles.length)];
  const body = bodies[Math.floor(Math.random() * bodies.length)];

  // Call summary-bot API for group broadcast
  try {
    await fetch('https://summary-bot-sepia.vercel.app/api/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ title, body }),
    });
  } catch (error) {
    console.error('Failed to notify summary-bot:', error);
  }

  // Call summary-bot API for direct user notifications to checked-in players
  try {
    const benchPlayers: Array<{ name?: string; playerId?: string }> = matchData.bench || [];
    const teamPlayers: Array<{ name?: string; playerId?: string }> = (matchData.teams || []).flatMap(
      (t: { players?: Array<{ name?: string; playerId?: string }> }) => t.players || []
    );
    const allAttending = [...benchPlayers, ...teamPlayers];

    const attendingPlayerIds = new Set(
      allAttending.map((p) => p.playerId).filter((id): id is string => Boolean(id))
    );
    const attendingNames = new Set(
      allAttending
        .map((p) => p.name?.trim().toLowerCase())
        .filter((n): n is string => Boolean(n))
    );

    if (attendingPlayerIds.size > 0 || attendingNames.size > 0) {
      const { data: accounts } = await supabase
        .from('accounts')
        .select('telegram_id, player_id, username')
        .not('telegram_id', 'is', null);

      const { data: playersData } = await supabase
        .from('players')
        .select('id, name');

      const idToNameMap = new Map<string, string>();
      if (playersData) {
        playersData.forEach((p) => {
          if (p.id && p.name) idToNameMap.set(p.id, p.name.trim().toLowerCase());
        });
      }

      const targetTelegramIds: string[] = [];
      if (accounts) {
        for (const acc of accounts) {
          if (!acc.telegram_id || String(acc.telegram_id).trim() === '') continue;

          const accPlayerId = acc.player_id;
          const accUsername = acc.username?.trim().toLowerCase();
          const playerName = accPlayerId ? idToNameMap.get(accPlayerId) : undefined;

          const isAttending =
            (accPlayerId && attendingPlayerIds.has(accPlayerId)) ||
            (accUsername && attendingNames.has(accUsername)) ||
            (playerName && attendingNames.has(playerName));

          if (isAttending) {
            targetTelegramIds.push(String(acc.telegram_id));
          }
        }
      }

      if (targetTelegramIds.length > 0) {
        await fetch('https://summary-bot-sepia.vercel.app/api/notify-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            body,
            telegram_ids: targetTelegramIds,
          }),
        });
      }
    }
  } catch (userNotiErr) {
    console.error('Failed to notify checked-in players via summary-bot api/notify-user:', userNotiErr);
  }

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
