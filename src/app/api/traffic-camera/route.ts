import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const CAMERA_KEY = 'traffic_camera_url';

// GET camera url
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('value, updated_at')
      .eq('key', CAMERA_KEY)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching traffic camera url:', error);
    }

    return NextResponse.json({
      url: data?.value || '',
      updatedAt: data?.updated_at || null,
    });
  } catch (err) {
    return NextResponse.json({ url: '', error: String(err) });
  }
}

// PUT - update camera url
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const url = typeof body.url === 'string' ? body.url.trim() : '';

    const { error } = await supabase
      .from('app_settings')
      .upsert(
        { key: CAMERA_KEY, value: url, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      );

    if (error) {
      console.error('Error saving traffic camera url:', error);
      return NextResponse.json({ error: String(error.message || error) }, { status: 500 });
    }

    return NextResponse.json({ ok: true, url });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
