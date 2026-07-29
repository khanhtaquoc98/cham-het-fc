import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { YouTubeVideoConfig } from '@/types/youtube';

// In-memory fallback if table doesn't exist yet
const memoryConfigs: Record<string, YouTubeVideoConfig[]> = {};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const matchId = searchParams.get('match_id') || 'default_match';

  try {
    const { data, error } = await supabase
      .from('match_youtube_config')
      .select('*')
      .eq('match_id', matchId)
      .order('slot', { ascending: true });

    if (error || !data || data.length === 0) {
      return NextResponse.json({
        configs: memoryConfigs[matchId] || []
      });
    }

    return NextResponse.json({ configs: data });
  } catch {
    return NextResponse.json({
      configs: memoryConfigs[matchId] || []
    });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { match_id = 'default_match', configs } = body as {
      match_id: string;
      configs: YouTubeVideoConfig[];
    };

    if (!Array.isArray(configs)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Prepare clean records (max 2 slots)
    const cleanConfigs = configs.slice(0, 2).map((cfg, index) => ({
      match_id,
      slot: (index + 1) as 1 | 2,
      youtube_url: cfg.youtube_url || '',
      youtube_id: cfg.youtube_id || '',
      title: cfg.title || `Video ${index + 1}`,
      start_offset_seconds: Number(cfg.start_offset_seconds) || 0,
    }));

    // Store in memory fallback
    memoryConfigs[match_id] = cleanConfigs;

    // Try upserting to Supabase
    try {
      const { data, error } = await supabase
        .from('match_youtube_config')
        .upsert(cleanConfigs, { onConflict: 'match_id,slot' })
        .select();

      if (error) {
        console.warn('Supabase YouTube config upsert error:', error.message);
      } else if (data) {
        memoryConfigs[match_id] = data;
      }
    } catch (e) {
      console.warn('Failed to upsert config to Supabase', e);
    }

    return NextResponse.json({
      success: true,
      configs: memoryConfigs[match_id]
    });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
