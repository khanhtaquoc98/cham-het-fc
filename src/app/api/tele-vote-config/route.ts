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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const pollId = searchParams.get('poll_id');

    // Handle fetching voters from poll_answers
    if (action === 'voters') {
      let query = supabase.from('poll_answers').select('*');
      if (pollId) {
        query = query.eq('poll_id', pollId);
      }
      const { data: voters, error } = await query.order('updated_at', { ascending: false });

      if (error) {
        return NextResponse.json({ voters: [] });
      }

      return NextResponse.json({ voters: voters || [] });
    }

    // 1. Try reading the latest poll from the new `polls` table first
    const { data: latestPoll } = await supabase
      .from('polls')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestPoll) {
      const configFromPolls: TeleVoteConfig = {
        chat_id: String(latestPoll.chat_id || DEFAULT_VOTE_CONFIG.chat_id),
        is_anonymous: Boolean(latestPoll.is_anonymous),
        message_id: Number(latestPoll.message_id || DEFAULT_VOTE_CONFIG.message_id),
        options: Array.isArray(latestPoll.options)
          ? latestPoll.options
          : typeof latestPoll.options === 'string'
            ? JSON.parse(latestPoll.options)
            : DEFAULT_VOTE_CONFIG.options,
        poll_id: String(latestPoll.poll_id || ''),
        thread_id: String(latestPoll.thread_id || DEFAULT_VOTE_CONFIG.thread_id),
        title: latestPoll.title || DEFAULT_VOTE_CONFIG.title,
      };
      return NextResponse.json({ data: configFromPolls });
    }

    // 2. Fallback to app_settings if `polls` table is empty or not populated yet
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

    // 1. Upsert into new `polls` table if poll_id is present
    if (config.poll_id) {
      await supabase.from('polls').upsert(
        {
          poll_id: String(config.poll_id),
          message_id: config.message_id ? Number(config.message_id) : null,
          chat_id: config.chat_id ? Number(config.chat_id) : null,
          thread_id: config.thread_id ? Number(config.thread_id) : null,
          title: config.title || '',
          options: config.options || ["0", "+1", "+2", "+3", "+4"],
          is_anonymous: config.is_anonymous ?? false,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'poll_id' }
      );
    }

    // 2. Also save to app_settings for backwards compatibility
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
