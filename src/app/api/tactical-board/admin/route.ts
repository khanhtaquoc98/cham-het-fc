import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET: Admin retrieves tactical board configuration
export async function GET() {
  try {
    const { data: settings } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', ['tactical_board_enabled', 'tactical_board_hlv_pass', 'tactical_board_player_pass']);

    const settingsMap: Record<string, string> = {};
    settings?.forEach(item => {
      settingsMap[item.key] = item.value;
    });

    return NextResponse.json({
      enabled: settingsMap['tactical_board_enabled'] !== 'false',
      hlvPass: settingsMap['tactical_board_hlv_pass'] || 'coach',
      playerPass: settingsMap['tactical_board_player_pass'] || 'chamhet',
    });
  } catch (error) {
    console.error('Error getting admin tactical board settings:', error);
    return NextResponse.json({
      enabled: true,
      hlvPass: 'coach',
      playerPass: 'chamhet',
    });
  }
}

// POST: Admin updates configuration
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { enabled, hlvPass, playerPass } = body;

    const updates = [
      { key: 'tactical_board_enabled', value: enabled ? 'true' : 'false', updated_at: new Date().toISOString() },
      { key: 'tactical_board_hlv_pass', value: String(hlvPass || 'coach').trim(), updated_at: new Date().toISOString() },
      { key: 'tactical_board_player_pass', value: String(playerPass || 'chamhet').trim(), updated_at: new Date().toISOString() },
    ];

    for (const item of updates) {
      const { error } = await supabase
        .from('app_settings')
        .upsert(item, { onConflict: 'key' });

      if (error) {
        console.error(`Error saving ${item.key}:`, error);
      }
    }

    return NextResponse.json({ ok: true, message: 'Đã lưu cấu hình bảng chiến thuật thành công' });
  } catch (error) {
    console.error('Error saving admin tactical settings:', error);
    return NextResponse.json({ ok: false, error: 'Có lỗi khi lưu cấu hình' }, { status: 500 });
  }
}

// DELETE: Admin purges all realtime tactical board data
export async function DELETE() {
  try {
    const { error } = await supabase
      .from('app_settings')
      .upsert({
        key: 'tactical_board_state',
        value: '',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'key' });

    if (error) {
      return NextResponse.json({ ok: false, error: String(error) }, { status: 500 });
    }

    return NextResponse.json({ ok: true, message: 'Đã xóa tất cả dữ liệu chiến thuật realtime thành công' });
  } catch (error) {
    console.error('Error clearing tactical board state:', error);
    return NextResponse.json({ ok: false, error: 'Không thể xóa dữ liệu' }, { status: 500 });
  }
}
