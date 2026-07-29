import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { MatchCaption } from '@/types/youtube';

// In-memory fallback array for captions if DB table is not ready
let memoryCaptions: MatchCaption[] = [];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const matchId = searchParams.get('match_id') || 'default_match';

  try {
    const { data, error } = await supabase
      .from('match_captions')
      .select('*')
      .eq('match_id', matchId)
      .order('timestamp_seconds', { ascending: true });

    if (error || !data) {
      const filteredMemory = memoryCaptions.filter(c => c.match_id === matchId);
      return NextResponse.json({ captions: filteredMemory });
    }

    return NextResponse.json({ captions: data });
  } catch {
    const filteredMemory = memoryCaptions.filter(c => c.match_id === matchId);
    return NextResponse.json({ captions: filteredMemory });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      match_id = 'default_match',
      slot = 1,
      youtube_id = '',
      timestamp_seconds = 0,
      timestamp_str = '00:00',
      caption = '',
      created_by = 'User'
    } = body;

    if (!caption || !caption.trim()) {
      return NextResponse.json({ error: 'Caption cannot be empty' }, { status: 400 });
    }

    const newCaption: MatchCaption = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      match_id,
      slot: Number(slot) as 1 | 2,
      youtube_id,
      timestamp_seconds: Number(timestamp_seconds) || 0,
      timestamp_str,
      caption: caption.trim(),
      created_by,
      created_at: new Date().toISOString()
    };

    // Push to memory fallback
    memoryCaptions.push(newCaption);

    // Persist to Supabase
    try {
      const { data, error } = await supabase
        .from('match_captions')
        .insert([newCaption])
        .select()
        .single();

      if (error) {
        console.warn('Supabase insert caption error:', error.message);
      } else if (data) {
        return NextResponse.json({ success: true, caption: data });
      }
    } catch (e) {
      console.warn('Failed to insert caption to Supabase', e);
    }

    return NextResponse.json({ success: true, caption: newCaption });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const matchId = searchParams.get('match_id');
    const resetAll = searchParams.get('reset_all') === 'true';

    // 1. Refresh / Reset All Captions for a match (Admin feature)
    if (resetAll && matchId) {
      memoryCaptions = memoryCaptions.filter(c => c.match_id !== matchId);

      try {
        await supabase
          .from('match_captions')
          .delete()
          .eq('match_id', matchId);
      } catch (e) {
        console.warn('Failed to reset captions in Supabase', e);
      }

      return NextResponse.json({ success: true, reset: true });
    }

    // 2. Delete single caption by ID (User / Admin feature)
    if (!id) {
      return NextResponse.json({ error: 'Missing caption ID' }, { status: 400 });
    }

    memoryCaptions = memoryCaptions.filter(c => c.id !== id);

    try {
      await supabase
        .from('match_captions')
        .delete()
        .eq('id', id);
    } catch (e) {
      console.warn('Failed to delete caption in Supabase', e);
    }

    return NextResponse.json({ success: true, deleted_id: id });
  } catch (err: unknown) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
