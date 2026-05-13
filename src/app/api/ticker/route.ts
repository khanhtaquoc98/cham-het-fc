import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const TICKER_KEY = 'announcement_ticker';

// GET ticker text
export async function GET() {
  const { data } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', TICKER_KEY)
    .single();

  return NextResponse.json({ ticker: data?.value || '' });
}

// PUT - update ticker text
export async function PUT(request: Request) {
  const { ticker } = await request.json();

  const { error } = await supabase
    .from('app_settings')
    .upsert({ key: TICKER_KEY, value: ticker || '', updated_at: new Date().toISOString() }, { onConflict: 'key' });

  if (error) return NextResponse.json({ error: String(error) }, { status: 500 });

  return NextResponse.json({ ok: true, ticker: ticker || '' });
}
