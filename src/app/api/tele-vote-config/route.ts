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
  title: "16/7 - 19h30 - Deadline 12h 14/7",
  show_vote: true,
  provider: 'internal'
};

const VOTE_CONFIG_KEY = 'config_vote_tele';
const THIRD_PARTY_API_URL = 'https://api-production-6834.up.railway.app/api/bot-storage';

async function fetchThirdPartyActiveVote() {
  try {
    const res = await fetch(THIRD_PARTY_API_URL, {
      method: 'GET',
      headers: {
        'accept': 'application/json, text/plain, */*',
      },
      cache: 'no-store'
    });

    if (!res.ok) {
      console.error('Third-party vote API error status:', res.status);
      return null;
    }

    const data = await res.json();
    return data?.activeVote || null;
  } catch (err) {
    console.error('Error fetching third-party vote API:', err);
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const pollId = searchParams.get('poll_id');

    // 1. Get saved config from app_settings first to read provider & show_vote
    let savedConfig: TeleVoteConfig = { ...DEFAULT_VOTE_CONFIG };
    const { data: dbData } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', VOTE_CONFIG_KEY)
      .single();

    if (dbData?.value) {
      try {
        const parsed = JSON.parse(dbData.value);
        savedConfig = { ...DEFAULT_VOTE_CONFIG, ...parsed };
      } catch (e) {
        console.error('Error parsing config_vote_tele:', e);
      }
    }

    const requestedProvider = searchParams.get('provider');
    const isThirdParty = requestedProvider ? (requestedProvider === 'third_party') : (savedConfig.provider === 'third_party');

    // Handle fetching voters
    if (action === 'voters') {

      if (isThirdParty) {
        const activeVote = await fetchThirdPartyActiveVote();
        if (activeVote && activeVote.votes) {
          const voters = Object.values(activeVote.votes).map((v: any) => ({
            user_name: v.name || 'Unknown',
            option_ids: Array.isArray(v.options) ? v.options : []
          }));
          return NextResponse.json({ voters });
        }
        return NextResponse.json({ voters: [] });
      }

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

    // Handle fetching vote config
    if (isThirdParty) {
      const activeVote = await fetchThirdPartyActiveVote();
      if (activeVote) {
        let totalSum = 0;
        if (activeVote.votes && typeof activeVote.votes === 'object') {
          Object.values(activeVote.votes).forEach((v: any) => {
            const opts = Array.isArray(v.options) ? v.options : [];
            opts.forEach((num: any) => {
              const val = Number(num) || 0;
              if (val > 0) totalSum += val;
            });
          });
        }

        const configFromThirdParty: TeleVoteConfig = {
          chat_id: String(activeVote.chatId ?? savedConfig.chat_id ?? DEFAULT_VOTE_CONFIG.chat_id),
          is_anonymous: false,
          message_id: Number(activeVote.messageId ?? savedConfig.message_id ?? DEFAULT_VOTE_CONFIG.message_id),
          options: Array.isArray(activeVote.options) ? activeVote.options : savedConfig.options,
          poll_id: String(activeVote.id ?? savedConfig.poll_id ?? ''),
          thread_id: String(savedConfig.thread_id || DEFAULT_VOTE_CONFIG.thread_id),
          title: activeVote.question || savedConfig.title || DEFAULT_VOTE_CONFIG.title,
          show_vote: savedConfig.show_vote ?? true,
          provider: 'third_party',
          total_voters: totalSum
        };
        return NextResponse.json({ data: configFromThirdParty });
      }
      return NextResponse.json({ data: savedConfig });
    }


    // Option 1: Internal logic - read latest poll from `polls` table
    const { data: latestPoll } = await supabase
      .from('polls')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestPoll) {
      const configFromPolls: TeleVoteConfig = {
        chat_id: String(latestPoll.chat_id || savedConfig.chat_id || DEFAULT_VOTE_CONFIG.chat_id),
        is_anonymous: Boolean(latestPoll.is_anonymous),
        message_id: Number(latestPoll.message_id || savedConfig.message_id || DEFAULT_VOTE_CONFIG.message_id),
        options: Array.isArray(latestPoll.options)
          ? latestPoll.options
          : typeof latestPoll.options === 'string'
            ? JSON.parse(latestPoll.options)
            : savedConfig.options,
        poll_id: String(latestPoll.poll_id || savedConfig.poll_id || ''),
        thread_id: String(latestPoll.thread_id || savedConfig.thread_id || DEFAULT_VOTE_CONFIG.thread_id),
        title: latestPoll.title || savedConfig.title || DEFAULT_VOTE_CONFIG.title,
        show_vote: savedConfig.show_vote ?? true,
        provider: 'internal'
      };
      return NextResponse.json({ data: configFromPolls });
    }

    return NextResponse.json({ data: savedConfig });
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

    // 1. Upsert into new `polls` table if poll_id is present AND provider is internal (not third_party)
    if (config.poll_id && config.provider !== 'third_party') {
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

