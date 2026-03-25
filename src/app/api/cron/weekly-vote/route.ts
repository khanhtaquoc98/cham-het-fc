import { NextResponse } from 'next/server';
import { getVoteConfig, createWeeklyPoll, checkAndRemind } from '@/lib/weekly-vote';

/**
 * Cron endpoint – called by Vercel Cron (or external cron service).
 * Runs every hour, checks if current day/hour matches the configured
 * poll-creation or remind schedule, and fires the appropriate action.
 *
 * Vercel Cron calls this as GET.
 */
export async function GET(request: Request) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const config = await getVoteConfig();
  if (!config.enabled) {
    return NextResponse.json({ ok: true, action: 'skipped', reason: 'disabled' });
  }

  // Current time in Vietnam (UTC+7)
  const now = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' })
  );
  const currentDay = now.getDay();   // 0=Sun, 1=Mon, ...
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  const chatId = process.env.CHAT_ID;
  if (!chatId) {
    return NextResponse.json({ ok: false, error: 'CHAT_ID not configured' });
  }

  const actions: string[] = [];

  // Check if it's time to create poll
  if (
    currentDay === config.pollDay &&
    currentHour === config.pollHour &&
    currentMinute >= config.pollMinute &&
    currentMinute < config.pollMinute + 5  // 5-minute window to avoid missing
  ) {
    const result = await createWeeklyPoll(chatId);
    actions.push(`poll: ${result}`);
  }

  // Check if it's time to remind
  if (
    currentDay === config.remindDay &&
    currentHour === config.remindHour &&
    currentMinute >= config.remindMinute &&
    currentMinute < config.remindMinute + 5
  ) {
    const result = await checkAndRemind(chatId);
    actions.push(`remind: ${result}`);
  }

  if (actions.length === 0) {
    return NextResponse.json({
      ok: true,
      action: 'no-match',
      checked: `${currentDay}/${currentHour}:${currentMinute}`,
      pollSchedule: `${config.pollDay}/${config.pollHour}:${config.pollMinute}`,
      remindSchedule: `${config.remindDay}/${config.remindHour}:${config.remindMinute}`,
    });
  }

  return NextResponse.json({ ok: true, actions });
}
