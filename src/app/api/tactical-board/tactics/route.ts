import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const TACTICS_KEY = 'tactical_board_tactics_list';

// GET: Load all saved tactics
export async function GET() {
  try {
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', TACTICS_KEY)
      .maybeSingle();

    if (!data || !data.value) {
      return NextResponse.json({ tactics: [] });
    }

    try {
      const parsed = JSON.parse(data.value);
      return NextResponse.json({ tactics: Array.isArray(parsed) ? parsed : [] });
    } catch {
      return NextResponse.json({ tactics: [] });
    }
  } catch (error) {
    console.error('Error fetching tactical tactics:', error);
    return NextResponse.json({ tactics: [] });
  }
}

// POST: Save or update tactic list / single tactic
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tactic, tactics } = body;

    // Fetch existing tactics
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', TACTICS_KEY)
      .maybeSingle();

    let existingTactics: any[] = [];
    if (data && data.value) {
      try {
        existingTactics = JSON.parse(data.value);
        if (!Array.isArray(existingTactics)) existingTactics = [];
      } catch {
        existingTactics = [];
      }
    }

    let updatedTactics = existingTactics;

    if (tactics && Array.isArray(tactics)) {
      updatedTactics = tactics;
    } else if (tactic && tactic.id) {
      const idx = existingTactics.findIndex((t: any) => t.id === tactic.id);
      if (idx >= 0) {
        existingTactics[idx] = tactic;
      } else {
        existingTactics.unshift(tactic);
      }
      updatedTactics = existingTactics;
    }

    const { error } = await supabase
      .from('app_settings')
      .upsert({
        key: TACTICS_KEY,
        value: JSON.stringify(updatedTactics),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' });

    if (error) {
      return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
    }

    return NextResponse.json({ ok: true, tactics: updatedTactics });
  } catch (error) {
    console.error('Error saving tactics:', error);
    return NextResponse.json({ ok: false, error: 'Không thể lưu chiến thuật' }, { status: 500 });
  }
}

// DELETE: Delete a tactic by ID
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ ok: false, error: 'Missing tactic id' }, { status: 400 });
    }

    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', TACTICS_KEY)
      .maybeSingle();

    let existingTactics: any[] = [];
    if (data && data.value) {
      try {
        existingTactics = JSON.parse(data.value);
        if (!Array.isArray(existingTactics)) existingTactics = [];
      } catch {
        existingTactics = [];
      }
    }

    const updatedTactics = existingTactics.filter((t: any) => t.id !== id);

    const { error } = await supabase
      .from('app_settings')
      .upsert({
        key: TACTICS_KEY,
        value: JSON.stringify(updatedTactics),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' });

    if (error) {
      return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
    }

    return NextResponse.json({ ok: true, tactics: updatedTactics });
  } catch (error) {
    console.error('Error deleting tactic:', error);
    return NextResponse.json({ ok: false, error: 'Không thể xóa chiến thuật' }, { status: 500 });
  }
}
