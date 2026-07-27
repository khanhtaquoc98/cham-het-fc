import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const VOTE_CONFIG_KEY = 'config_vote_tele';

export async function POST(request: Request) {
  try {
    const payload = await request.json();

    const pollConfig = {
      chat_id: payload.chat_id ? String(payload.chat_id) : "-1001505319885",
      is_anonymous: payload.is_anonymous ?? false,
      message_id: payload.message_id ? Number(payload.message_id) : 218583,
      options: Array.isArray(payload.options) ? payload.options : ["0", "+1", "+2", "+3", "+4"],
      poll_id: payload.poll_id ? String(payload.poll_id) : "",
      thread_id: payload.thread_id ? String(payload.thread_id) : "",
      title: payload.title || "",
    };

    // 1. Save to `polls` table if poll_id is provided
    if (pollConfig.poll_id) {
      await supabase.from('polls').upsert(
        {
          poll_id: String(pollConfig.poll_id),
          message_id: pollConfig.message_id ? Number(pollConfig.message_id) : null,
          chat_id: pollConfig.chat_id ? Number(pollConfig.chat_id) : null,
          thread_id: pollConfig.thread_id ? Number(pollConfig.thread_id) : null,
          title: pollConfig.title || '',
          options: pollConfig.options || ["0", "+1", "+2", "+3", "+4"],
          is_anonymous: pollConfig.is_anonymous ?? false,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'poll_id' }
      );
    }

    // 2. Also save to local Supabase app_settings
    await supabase.from('app_settings').upsert(
      {
        key: VOTE_CONFIG_KEY,
        value: JSON.stringify(pollConfig),
        updated_at: new Date().toISOString()
      },
      { onConflict: 'key' }
    );

    return NextResponse.json({
      ok: true,
      config: pollConfig,
    });
  } catch (error) {
    console.error('Error in save-poll-config API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
