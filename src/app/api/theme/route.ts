import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const THEME_KEY = 'site_theme';

// GET current theme: 'default' | 'worldcup2026'
export async function GET() {
  const { data } = await supabase
    .from('app_settings')
    .select('value')
    .eq('key', THEME_KEY)
    .single();

  return NextResponse.json({ theme: data?.value || 'default' });
}

// PUT - update theme
export async function PUT(request: Request) {
  const { theme } = await request.json();
  const allowed = ['default', 'worldcup2026'];
  const val = allowed.includes(theme) ? theme : 'default';

  const { error } = await supabase
    .from('app_settings')
    .upsert(
      { key: THEME_KEY, value: val, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    );

  if (error) return NextResponse.json({ error: String(error) }, { status: 500 });

  return NextResponse.json({ ok: true, theme: val });
}
