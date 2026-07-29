import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

interface YouTubeConfigRecord {
  slot: number;
  youtube_url?: string;
  youtube_id?: string;
  title?: string;
  start_offset_seconds?: number;
}

interface MatchCaptionRecord {
  slot: 1 | 2;
  youtube_id?: string;
  timestamp_seconds: number;
  timestamp_str: string;
  caption: string;
  created_by?: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const sourceMatchId = body.source_match_id || 'default_match';
    let targetMatchId = body.target_match_id;
    let targetMatchLabel = '';

    // 1. If target match not specified, fetch latest match from match_history
    if (!targetMatchId) {
      const { data: latestMatch, error: historyErr } = await supabase
        .from('match_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (historyErr || !latestMatch) {
        return NextResponse.json(
          { error: 'Chưa có trận đấu nào trong lịch sử để đồng bộ data. Vui lòng tạo trận đấu trước!' },
          { status: 400 }
        );
      }

      targetMatchId = latestMatch.id;
      targetMatchLabel = latestMatch.match_date ? `Trận ${latestMatch.match_date}` : latestMatch.id;
    } else {
      const { data: targetMatch } = await supabase
        .from('match_history')
        .select('*')
        .eq('id', targetMatchId)
        .single();

      if (targetMatch) {
        targetMatchLabel = targetMatch.match_date ? `Trận ${targetMatch.match_date}` : targetMatch.id;
      }
    }

    // 2. Fetch YouTube configs of source match (e.g. default_match)
    const { data: sourceConfigs } = await supabase
      .from('match_youtube_config')
      .select('*')
      .eq('match_id', sourceMatchId);

    let copiedConfigsCount = 0;
    if (sourceConfigs && sourceConfigs.length > 0) {
      const targetConfigs = sourceConfigs.map((cfg: YouTubeConfigRecord) => ({
        match_id: targetMatchId,
        slot: cfg.slot,
        youtube_url: cfg.youtube_url || '',
        youtube_id: cfg.youtube_id || '',
        title: cfg.title || `Video ${cfg.slot}`,
        start_offset_seconds: Number(cfg.start_offset_seconds) || 0
      }));

      await supabase
        .from('match_youtube_config')
        .upsert(targetConfigs, { onConflict: 'match_id,slot' });

      copiedConfigsCount = targetConfigs.length;
    }

    // 3. Fetch captions of source match (e.g. default_match)
    const { data: sourceCaptions } = await supabase
      .from('match_captions')
      .select('*')
      .eq('match_id', sourceMatchId);

    let copiedCaptionsCount = 0;
    if (sourceCaptions && sourceCaptions.length > 0) {
      // Delete existing target captions first to avoid duplicate timeline entries
      await supabase
        .from('match_captions')
        .delete()
        .eq('match_id', targetMatchId);

      const targetCaptions = sourceCaptions.map((cap: MatchCaptionRecord) => ({
        id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()),
        match_id: targetMatchId,
        slot: cap.slot,
        youtube_id: cap.youtube_id || '',
        timestamp_seconds: cap.timestamp_seconds,
        timestamp_str: cap.timestamp_str,
        caption: cap.caption,
        created_by: cap.created_by,
        created_at: new Date().toISOString()
      }));

      await supabase
        .from('match_captions')
        .insert(targetCaptions);

      copiedCaptionsCount = targetCaptions.length;
    }

    return NextResponse.json({
      success: true,
      target_match_id: targetMatchId,
      target_match_label: targetMatchLabel,
      copied_configs_count: copiedConfigsCount,
      copied_captions_count: copiedCaptionsCount
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Lỗi server khi đồng bộ data';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
