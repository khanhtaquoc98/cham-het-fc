import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { TeleVoteConfig } from '@/types/match';

export const dynamic = 'force-dynamic';

export const DEFAULT_VOTE_CONFIG: TeleVoteConfig = {
  chat_id: "-1001505319885",
  is_anonymous: false,
  message_id: 218583,
  options: ["0", "+1", "+2", "+3", "+4"],
  poll_id: "542318491024",
  thread_id: "61897",
  title: "16/7 - 19h30 - Deadline 12h 14/7"
};

const VOTE_CONFIG_KEY = 'config_vote_tele';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', VOTE_CONFIG_KEY)
      .single();

    if (!error && data && data.value) {
      try {
        const parsed = JSON.parse(data.value);
        return NextResponse.json({ data: parsed });
      } catch (parseErr) {
        console.error('Error parsing config_vote_tele JSON:', parseErr);
      }
    }

    // If no data exists in DB, save and return default configuration
    await supabase.from('app_settings').upsert(
      {
        key: VOTE_CONFIG_KEY,
        value: JSON.stringify(DEFAULT_VOTE_CONFIG),
        updated_at: new Date().toISOString()
      },
      { onConflict: 'key' }
    );

    return NextResponse.json({ data: DEFAULT_VOTE_CONFIG });
  } catch (err) {
    console.error('Error in GET tele-vote-config:', err);
    return NextResponse.json({ data: DEFAULT_VOTE_CONFIG });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = body.action;
    const config: TeleVoteConfig = body.config || DEFAULT_VOTE_CONFIG;

    let telegramSent = false;
    let telegramError: string | null = null;

    if (action === 'create') {
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      if (botToken && config.chat_id) {
        try {
          const payload: Record<string, unknown> = {
            chat_id: config.chat_id,
            question: config.title || 'Vote tham gia bóng đá',
            options: config.options && config.options.length > 0 ? config.options : ["0", "+1", "+2", "+3", "+4"],
            is_anonymous: config.is_anonymous ?? false,
          };

          if (config.thread_id) {
            payload.message_thread_id = Number(config.thread_id);
          }

          const res = await fetch(`https://api.telegram.org/bot${botToken}/sendPoll`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const result = await res.json();

          if (result.ok && result.result) {
            telegramSent = true;
            config.poll_id = String(result.result.poll?.id || config.poll_id);
            config.message_id = result.result.message_id || config.message_id;
          } else {
            telegramError = result.description || 'Không thể tạo vote qua Telegram Bot API';
          }
        } catch (err) {
          telegramError = String(err);
        }
      }
    }

    // Save config to DB
    const { error } = await supabase.from('app_settings').upsert(
      {
        key: VOTE_CONFIG_KEY,
        value: JSON.stringify(config),
        updated_at: new Date().toISOString()
      },
      { onConflict: 'key' }
    );

    if (error) {
      return NextResponse.json({ error: String(error) }, { status: 500 });
    }

    // Sync to summary-bot remote service (best effort)
    try {
      await fetch('https://summary-bot-sepia.vercel.app/api/save-poll-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
    } catch (syncErr) {
      console.error('Failed to sync to summary-bot:', syncErr);
    }

    return NextResponse.json({
      ok: true,
      data: config,
      telegramSent,
      telegramError
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
