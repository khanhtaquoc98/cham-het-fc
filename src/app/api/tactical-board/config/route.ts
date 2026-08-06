import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET: Check enabled status
export async function GET() {
  try {
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'tactical_board_enabled')
      .maybeSingle();

    const enabled = data ? data.value !== 'false' : true;
    return NextResponse.json({ enabled });
  } catch (error) {
    return NextResponse.json({ enabled: true });
  }
}

// POST: Verify password and return user role ('hlv' | 'player')
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const inputPass = String(body.password || '').trim();

    if (!inputPass) {
      return NextResponse.json({ ok: false, error: 'Vui lòng nhập mật khẩu' }, { status: 400 });
    }

    // Fetch HLV and Player passwords from app_settings
    const { data: settings } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', ['tactical_board_hlv_pass', 'tactical_board_player_pass', 'tactical_board_enabled']);

    const settingsMap: Record<string, string> = {};
    settings?.forEach(item => {
      settingsMap[item.key] = item.value;
    });

    const isEnabled = settingsMap['tactical_board_enabled'] !== 'false';
    if (!isEnabled) {
      return NextResponse.json({ ok: false, error: 'Bảng chiến thuật hiện đang bị tắt bởi Admin.' }, { status: 403 });
    }

    const hlvPass = settingsMap['tactical_board_hlv_pass'] || process.env.TACTICAL_BOARD_HLV_PASS || 'coach';
    const playerPass = settingsMap['tactical_board_player_pass'] || process.env.TACTICAL_BOARD_PLAYER_PASS || 'chamhet';

    if (inputPass === hlvPass) {
      return NextResponse.json({ ok: true, role: 'hlv' });
    }

    if (inputPass === playerPass) {
      return NextResponse.json({ ok: true, role: 'player' });
    }

    return NextResponse.json({ ok: false, error: 'Mật khẩu không chính xác! Vui lòng thử lại.' }, { status: 401 });
  } catch (error) {
    console.error('Error verifying tactical board password:', error);
    return NextResponse.json({ ok: false, error: 'Có lỗi xảy ra, vui lòng thử lại.' }, { status: 500 });
  }
}
