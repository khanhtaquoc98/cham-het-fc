import { supabase } from '@/lib/supabase';
import { sendTelegramMessage, sendTelegramPoll, MessageType } from '@/lib/bot';

// ── Day mapping ────────────────────────────────────────────────
const DAY_MAP: Record<string, number> = {
  'cn': 0, 'chủ nhật': 0,
  'thứ 2': 1, 't2': 1,
  'thứ 3': 2, 't3': 2,
  'thứ 4': 3, 't4': 3,
  'thứ 5': 4, 't5': 4,
  'thứ 6': 5, 't6': 5,
  'thứ 7': 6, 't7': 6,
};

const DAY_NAMES = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

const POLL_OPTIONS = ['0', '+1', '+2', '+3', '+4'];
const MIN_PLAYERS = 10;
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

// ── Types ──────────────────────────────────────────────────────
export interface VoteConfig {
  enabled: boolean;
  matchDay: number;      // 0=CN, 1=T2, ..., 4=T5
  matchTime: string;
  fieldName: string;
  pollDay: number;       // Day of week to auto create poll
  pollHour: number;
  pollMinute: number;
  remindDay: number;     // Day of week to auto remind
  remindHour: number;
  remindMinute: number;
}

export interface ActivePoll {
  pollId: string;
  question: string;
  messageId: number;
  createdAt: string;
}

export interface PollVote {
  pollId: string;
  userId: number;
  userName: string;
  options: number[];
}

// ── Pure helpers ───────────────────────────────────────────────

export function parseDay(text: string): number | null {
  const lower = text.toLowerCase();
  for (const [key, val] of Object.entries(DAY_MAP)) {
    if (lower.startsWith(key)) return val;
  }
  return null;
}

export function parseHour(text: string): { hour: number; minute: number } | null {
  const m = text.match(/(\d{1,2})h(\d{2})?/);
  if (!m) return null;
  const hour = parseInt(m[1], 10);
  const minute = parseInt(m[2] || '0', 10);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

export function formatHour(hour: number, minute: number): string {
  return `${hour}h${String(minute).padStart(2, '0')}`;
}

function getNextDayOfWeek(dayOfWeek: number, from: Date = new Date()): Date {
  const d = new Date(from);
  const current = d.getDay();
  const daysUntil = ((dayOfWeek - current + 7) % 7) || 7;
  d.setDate(d.getDate() + daysUntil);
  return d;
}

function formatDDMM(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}`;
}

function calculateTotalPlayers(votes: PollVote[]): number {
  const optionCounts = [0, 0, 0, 0, 0];
  for (const vote of votes) {
    for (const optIdx of vote.options) {
      if (optIdx >= 0 && optIdx < 5) {
        optionCounts[optIdx]++;
      }
    }
  }
  return optionCounts.reduce((sum, count, idx) => sum + count * idx, 0);
}

function buildQuestion(config: VoteConfig): string {
  const nextMatch = getNextDayOfWeek(config.matchDay);
  const ddmm = formatDDMM(nextMatch);
  return `${ddmm} - ${config.matchTime} - ${config.fieldName}`;
}

// ── Supabase: vote_config ──────────────────────────────────────

const DEFAULT_CONFIG: VoteConfig = {
  enabled: true,
  matchDay: 4,        // Thứ 5
  matchTime: '19h15',
  fieldName: 'Sân số 8',
  pollDay: 5,         // Thứ 6
  pollHour: 14,
  pollMinute: 0,
  remindDay: 1,       // Thứ 2
  remindHour: 14,
  remindMinute: 0,
};

export async function getVoteConfig(): Promise<VoteConfig> {
  const { data, error } = await supabase
    .from('vote_config')
    .select('*')
    .eq('id', 'singleton')
    .single();

  if (error || !data) {
    // Initialize with defaults
    await supabase.from('vote_config').upsert({
      id: 'singleton',
      enabled: DEFAULT_CONFIG.enabled,
      match_day: DEFAULT_CONFIG.matchDay,
      match_time: DEFAULT_CONFIG.matchTime,
      field_name: DEFAULT_CONFIG.fieldName,
      poll_day: DEFAULT_CONFIG.pollDay,
      poll_hour: DEFAULT_CONFIG.pollHour,
      poll_minute: DEFAULT_CONFIG.pollMinute,
      remind_day: DEFAULT_CONFIG.remindDay,
      remind_hour: DEFAULT_CONFIG.remindHour,
      remind_minute: DEFAULT_CONFIG.remindMinute,
    }, { onConflict: 'id' });
    return DEFAULT_CONFIG;
  }

  return {
    enabled: data.enabled,
    matchDay: data.match_day,
    matchTime: data.match_time,
    fieldName: data.field_name,
    pollDay: data.poll_day,
    pollHour: data.poll_hour,
    pollMinute: data.poll_minute,
    remindDay: data.remind_day,
    remindHour: data.remind_hour,
    remindMinute: data.remind_minute,
  };
}

export async function updateVoteConfig(updates: Partial<VoteConfig>): Promise<void> {
  const updateObj: Record<string, unknown> = {};
  if (updates.enabled !== undefined) updateObj.enabled = updates.enabled;
  if (updates.matchDay !== undefined) updateObj.match_day = updates.matchDay;
  if (updates.matchTime !== undefined) updateObj.match_time = updates.matchTime;
  if (updates.fieldName !== undefined) updateObj.field_name = updates.fieldName;
  if (updates.pollDay !== undefined) updateObj.poll_day = updates.pollDay;
  if (updates.pollHour !== undefined) updateObj.poll_hour = updates.pollHour;
  if (updates.pollMinute !== undefined) updateObj.poll_minute = updates.pollMinute;
  if (updates.remindDay !== undefined) updateObj.remind_day = updates.remindDay;
  if (updates.remindHour !== undefined) updateObj.remind_hour = updates.remindHour;
  if (updates.remindMinute !== undefined) updateObj.remind_minute = updates.remindMinute;

  await supabase
    .from('vote_config')
    .upsert({ id: 'singleton', ...updateObj }, { onConflict: 'id' });
}

// ── Supabase: active_polls ─────────────────────────────────────

export async function getActivePoll(): Promise<ActivePoll | null> {
  const { data, error } = await supabase
    .from('active_polls')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;

  return {
    pollId: data.poll_id,
    question: data.question,
    messageId: data.message_id,
    createdAt: data.created_at,
  };
}

export async function saveActivePoll(poll: ActivePoll): Promise<void> {
  // Clear old polls first
  await supabase.from('active_polls').delete().neq('poll_id', '');

  await supabase.from('active_polls').insert({
    poll_id: poll.pollId,
    question: poll.question,
    message_id: poll.messageId,
    created_at: poll.createdAt,
  });
}

// ── Supabase: poll_votes ───────────────────────────────────────

export async function getPollVotes(pollId: string): Promise<PollVote[]> {
  const { data, error } = await supabase
    .from('poll_votes')
    .select('*')
    .eq('poll_id', pollId);

  if (error || !data) return [];

  return data.map(row => ({
    pollId: row.poll_id,
    userId: row.user_id,
    userName: row.user_name,
    options: row.options,
  }));
}

export async function savePollVote(vote: PollVote): Promise<void> {
  await supabase
    .from('poll_votes')
    .upsert({
      poll_id: vote.pollId,
      user_id: vote.userId,
      user_name: vote.userName,
      options: vote.options,
    }, { onConflict: 'poll_id,user_id' });
}

export async function deletePollVote(pollId: string, userId: number): Promise<void> {
  await supabase
    .from('poll_votes')
    .delete()
    .eq('poll_id', pollId)
    .eq('user_id', userId);
}

// ── Status text builder ────────────────────────────────────────

export function statusText(config: VoteConfig): string {
  return (
    `📋 *Cấu hình hiện tại:*\n\n` +
    `🔄 Auto: ${config.enabled ? '✅ BẬT' : '⏸️ TẮT'}\n\n` +
    `⚽ *Lịch đá:*\n` +
    `• Ngày: ${DAY_NAMES[config.matchDay]}\n` +
    `• Giờ: ${config.matchTime}\n` +
    `• Sân: ${config.fieldName}\n\n` +
    `📊 *Auto tạo poll:*\n` +
    `• ${DAY_NAMES[config.pollDay]} lúc ${formatHour(config.pollHour, config.pollMinute)}\n\n` +
    `🔔 *Auto remind:*\n` +
    `• ${DAY_NAMES[config.remindDay]} lúc ${formatHour(config.remindHour, config.remindMinute)}`
  );
}

// ── Create poll action ─────────────────────────────────────────

export async function createWeeklyPoll(chatId: number | string): Promise<string> {
  const config = await getVoteConfig();
  if (!config.enabled) {
    return '⏸️ Auto poll đang TẮT';
  }

  const question = buildQuestion(config);
  console.log(`📊 [weekly-vote] Creating poll: "${question}"`);

  try {
    const result = await sendTelegramPoll(
      chatId,
      question,
      POLL_OPTIONS,
      'ANNOUNCEMENT'
    );

    const pollResult = result as { result?: { poll?: { id: string }; message_id?: number } };

    if (pollResult?.result?.poll?.id) {
      await saveActivePoll({
        pollId: pollResult.result.poll.id,
        question,
        messageId: pollResult.result.message_id!,
        createdAt: new Date().toISOString(),
      });
      return `✅ Poll đã tạo: ${question}`;
    }

    return '❌ Không tạo được poll.';
  } catch (err) {
    console.error('❌ [weekly-vote] Failed to create poll:', err);
    return '❌ Lỗi khi tạo poll.';
  }
}

// ── Check remind action ────────────────────────────────────────

export async function checkAndRemind(chatId: number | string): Promise<string> {
  const config = await getVoteConfig();
  if (!config.enabled) {
    return '⏸️ Auto remind đang TẮT';
  }

  const activePoll = await getActivePoll();
  if (!activePoll) {
    return '📭 Không có poll nào đang active.';
  }

  const votes = await getPollVotes(activePoll.pollId);
  const total = calculateTotalPlayers(votes);
  console.log(`📊 [weekly-vote] Total players: ${total}`);

  if (total < MIN_PLAYERS) {
    // Forward poll to MAIN thread
    if (BOT_TOKEN && CHAT_ID) {
      try {
        const mainThreadId = process.env.MAIN_THREAD_ID;
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/forwardMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: CHAT_ID,
            from_chat_id: CHAT_ID,
            message_id: activePoll.messageId,
            ...(mainThreadId ? { message_thread_id: Number(mainThreadId) } : {}),
          }),
        });
        return `⚠️ Mới có *${total}* người (cần ${MIN_PLAYERS}). Đã forward poll!`;
      } catch (err) {
        console.error('❌ [weekly-vote] Failed to forward poll:', err);
        return '❌ Lỗi khi forward poll.';
      }
    }
    return `⚠️ Mới có *${total}* người (cần ${MIN_PLAYERS}).`;
  }

  return `✅ Đủ *${total}* người, không cần remind!`;
}

// ── Handle poll_answer from Telegram ───────────────────────────

export async function handlePollAnswer(pollAnswer: {
  poll_id: string;
  user: { id: number; first_name?: string; username?: string };
  option_ids: number[];
}): Promise<void> {
  const activePoll = await getActivePoll();
  if (!activePoll || pollAnswer.poll_id !== activePoll.pollId) return;

  const userId = pollAnswer.user.id;
  const userName = pollAnswer.user.first_name || pollAnswer.user.username || 'Unknown';

  if (pollAnswer.option_ids.length === 0) {
    // User retracted vote
    await deletePollVote(activePoll.pollId, userId);
  } else {
    await savePollVote({
      pollId: activePoll.pollId,
      userId,
      userName,
      options: pollAnswer.option_ids,
    });
  }
}

// ── Handle commands ────────────────────────────────────────────

export async function handleVoteCommand(
  chatId: number | string,
  text: string,
  reply: (msg: string, parseMode?: string, type?: MessageType) => Promise<void>,
): Promise<boolean> {
  const textLower = text.toLowerCase().trim();

  // /autopoll
  if (textLower === '/autopoll') {
    const config = await getVoteConfig();
    config.enabled = !config.enabled;
    await updateVoteConfig({ enabled: config.enabled });

    const status = config.enabled
      ? '✅ Auto poll & remind đã *BẬT*'
      : '⏸️ Auto poll & remind đã *TẮT*';

    await reply(statusText(config), 'Markdown');
    await sendTelegramMessage(chatId, status, 'Markdown', 'MAIN');
    return true;
  }

  // /setschedule (no args = help)
  if (textLower === '/setschedule') {
    const config = await getVoteConfig();
    const help =
      '📋 *Cách sử dụng /setschedule:*\n\n' +
      '• `/setschedule thứ 5 19h15` — Đổi ngày & giờ đá\n' +
      '• `/setschedule t4 20h00 Sân số 5` — Đổi ngày, giờ & sân\n\n' +
      statusText(config);
    await reply(help, 'Markdown');
    return true;
  }

  // /setschedule <args>
  if (textLower.startsWith('/setschedule ')) {
    const input = text.replace(/^\/setschedule\s+/i, '').trim();
    const newDay = parseDay(input);
    if (newDay === null) {
      await reply('⚠️ Không nhận ra ngày. Ví dụ: `/setschedule thứ 5 19h15`', 'Markdown');
      return true;
    }
    const timeMatch = input.match(/(\d{1,2}h\d{2})/i);
    if (!timeMatch) {
      await reply('⚠️ Không nhận ra giờ. Ví dụ: `/setschedule thứ 5 19h15`', 'Markdown');
      return true;
    }
    const newTime = timeMatch[1];
    const afterTime = input.substring(input.indexOf(newTime) + newTime.length).trim();

    const updates: Partial<VoteConfig> = {
      matchDay: newDay,
      matchTime: newTime,
    };
    if (afterTime) updates.fieldName = afterTime;
    await updateVoteConfig(updates);

    const config = await getVoteConfig();
    const preview = buildQuestion(config);
    await reply(
      `✅ *Đã cập nhật lịch đá!*\n\n🔮 Poll tuần tới: *${preview}*\n\n` + statusText(config),
      'Markdown'
    );
    return true;
  }

  // /setautopoll (no args = help)
  if (textLower === '/setautopoll') {
    const config = await getVoteConfig();
    await reply(
      '📋 *Cách sử dụng /setautopoll:*\n\n' +
      '• `/setautopoll thứ 6 14h00` — Tạo poll vào thứ 6 lúc 14h\n' +
      '• `/setautopoll t5 10h30` — Tạo poll vào thứ 5 lúc 10h30\n\n' +
      `📊 *Hiện tại:* ${DAY_NAMES[config.pollDay]} lúc ${formatHour(config.pollHour, config.pollMinute)}`,
      'Markdown'
    );
    return true;
  }

  // /setautopoll <args>
  if (textLower.startsWith('/setautopoll ')) {
    const input = text.replace(/^\/setautopoll\s+/i, '').trim();
    const newDay = parseDay(input);
    if (newDay === null) {
      await reply('⚠️ Không nhận ra ngày. Ví dụ: `/setautopoll thứ 6 14h00`', 'Markdown');
      return true;
    }
    const parsed = parseHour(input);
    if (!parsed) {
      await reply('⚠️ Không nhận ra giờ. Ví dụ: `/setautopoll thứ 6 14h00`', 'Markdown');
      return true;
    }

    await updateVoteConfig({
      pollDay: newDay,
      pollHour: parsed.hour,
      pollMinute: parsed.minute,
    });

    const config = await getVoteConfig();
    await reply(
      `✅ *Auto tạo poll đã đổi:* ${DAY_NAMES[config.pollDay]} lúc ${formatHour(config.pollHour, config.pollMinute)}\n\n` + statusText(config),
      'Markdown'
    );
    return true;
  }

  // /setautoremind (no args = help)
  if (textLower === '/setautoremind') {
    const config = await getVoteConfig();
    await reply(
      '📋 *Cách sử dụng /setautoremind:*\n\n' +
      '• `/setautoremind thứ 2 14h00` — Remind vào thứ 2 lúc 14h\n' +
      '• `/setautoremind t3 9h00` — Remind vào thứ 3 lúc 9h\n\n' +
      `🔔 *Hiện tại:* ${DAY_NAMES[config.remindDay]} lúc ${formatHour(config.remindHour, config.remindMinute)}`,
      'Markdown'
    );
    return true;
  }

  // /setautoremind <args>
  if (textLower.startsWith('/setautoremind ')) {
    const input = text.replace(/^\/setautoremind\s+/i, '').trim();
    const newDay = parseDay(input);
    if (newDay === null) {
      await reply('⚠️ Không nhận ra ngày. Ví dụ: `/setautoremind thứ 2 14h00`', 'Markdown');
      return true;
    }
    const parsed = parseHour(input);
    if (!parsed) {
      await reply('⚠️ Không nhận ra giờ. Ví dụ: `/setautoremind thứ 2 14h00`', 'Markdown');
      return true;
    }

    await updateVoteConfig({
      remindDay: newDay,
      remindHour: parsed.hour,
      remindMinute: parsed.minute,
    });

    const config = await getVoteConfig();
    await reply(
      `✅ *Auto remind đã đổi:* ${DAY_NAMES[config.remindDay]} lúc ${formatHour(config.remindHour, config.remindMinute)}\n\n` + statusText(config),
      'Markdown'
    );
    return true;
  }

  // /testcron
  if (textLower === '/testcron') {
    const config = await getVoteConfig();
    const question = buildQuestion(config);

    await reply('🧪 *Test cron bắt đầu...*\n\n1️⃣ Tạo poll ngay\n2️⃣ Sau 60 giây sẽ check remind', 'Markdown');

    try {
      const result = await sendTelegramPoll(
        chatId,
        question,
        POLL_OPTIONS,
      );

      const pollResult = result as { result?: { poll?: { id: string }; message_id?: number } };

      if (pollResult?.result?.poll?.id) {
        await saveActivePoll({
          pollId: pollResult.result.poll.id,
          question,
          messageId: pollResult.result.message_id!,
          createdAt: new Date().toISOString(),
        });
        await reply('✅ Poll đã tạo! Hãy vote rồi dùng /checkremind để kiểm tra.');
      } else {
        await reply('❌ Không tạo được poll.');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      await reply(`❌ Lỗi: ${errorMsg}`);
    }
    return true;
  }

  // /checkremind - Manual trigger remind check
  if (textLower === '/checkremind') {
    const result = await checkAndRemind(chatId);
    await reply(result, 'Markdown');
    return true;
  }

  // /createpoll - Manual trigger poll creation
  if (textLower === '/createpoll') {
    const targetChatId = CHAT_ID || chatId;
    const result = await createWeeklyPoll(targetChatId);
    await reply(result, 'Markdown');
    return true;
  }

  // /votestatus - Show current poll status
  if (textLower === '/votestatus') {
    const activePoll = await getActivePoll();
    if (!activePoll) {
      await reply('📭 Không có poll nào đang active.');
      return true;
    }

    const votes = await getPollVotes(activePoll.pollId);
    const total = calculateTotalPlayers(votes);
    const voterList = votes.length > 0
      ? votes.map(v => `• ${v.userName}: +${v.options[0] || 0}`).join('\n')
      : '_Chưa có ai vote_';

    await reply(
      `📊 *Poll hiện tại:* ${activePoll.question}\n\n` +
      `👥 *Tổng người chơi:* ${total}/${MIN_PLAYERS}\n\n` +
      `📋 *Danh sách vote:*\n${voterList}`,
      'Markdown'
    );
    return true;
  }

  return false; // Not a vote command
}
