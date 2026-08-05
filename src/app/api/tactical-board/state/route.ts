import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET: Load tactical board state
export async function GET() {
  try {
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'tactical_board_state')
      .maybeSingle();

    if (!data || !data.value) {
      return NextResponse.json({ state: null });
    }

    try {
      const parsed = JSON.parse(data.value);
      return NextResponse.json({ state: parsed });
    } catch {
      return NextResponse.json({ state: null });
    }
  } catch (error) {
    console.error('Error fetching tactical board state:', error);
    return NextResponse.json({ state: null });
  }
}

// POST: Save tactical board state
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { state } = body;

    const valueStr = JSON.stringify(state || {});

    const { error } = await supabase
      .from('app_settings')
      .upsert({
        key: 'tactical_board_state',
        value: valueStr,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' });

    if (error) {
      return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error saving tactical board state:', error);
    return NextResponse.json({ ok: false, error: 'Không thể lưu trạng thái' }, { status: 500 });
  }
}
