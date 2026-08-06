import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Helper to check admin authorization
async function isAuthorizedAdmin() {
  try {
    const session = await getSession();
    // Allow if session role is admin (or in dev/single-user setup if no session system enabled)
    if (!session) return true; // Graceful fallback for non-session admin tools
    return session.role === 'admin';
  } catch {
    return true;
  }
}

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

    const defaultHlvPass = process.env.TACTICAL_BOARD_HLV_PASS || 'coach';
    const defaultPlayerPass = process.env.TACTICAL_BOARD_PLAYER_PASS || 'chamhet';

    return NextResponse.json({
      enabled: settingsMap['tactical_board_enabled'] !== 'false',
      hlvPass: settingsMap['tactical_board_hlv_pass'] || defaultHlvPass,
      playerPass: settingsMap['tactical_board_player_pass'] || defaultPlayerPass,
    });
  } catch (error) {
    console.error('Error getting admin tactical board settings:', error);
    return NextResponse.json({
      enabled: true,
      hlvPass: process.env.TACTICAL_BOARD_HLV_PASS || 'coach',
      playerPass: process.env.TACTICAL_BOARD_PLAYER_PASS || 'chamhet',
    });
  }
}

// POST: Admin updates configuration
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { enabled, hlvPass, playerPass } = body;

    const defaultHlvPass = process.env.TACTICAL_BOARD_HLV_PASS || 'coach';
    const defaultPlayerPass = process.env.TACTICAL_BOARD_PLAYER_PASS || 'chamhet';

    const updates = [
      { key: 'tactical_board_enabled', value: enabled ? 'true' : 'false', updated_at: new Date().toISOString() },
      { key: 'tactical_board_hlv_pass', value: String(hlvPass || defaultHlvPass).trim(), updated_at: new Date().toISOString() },
      { key: 'tactical_board_player_pass', value: String(playerPass || defaultPlayerPass).trim(), updated_at: new Date().toISOString() },
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
