import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { getAllPlayerCardConfigs, getPlayerCardConfig, savePlayerCardConfig } from '@/lib/card-config-db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const playerId = searchParams.get('playerId');
    const playerName = searchParams.get('playerName');

    if (playerId || playerName) {
      const config = await getPlayerCardConfig(playerId, playerName);
      return NextResponse.json({ config });
    }

    const configs = await getAllPlayerCardConfigs();
    return NextResponse.json({ configs });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const referer = request.headers.get('referer') || '';
    const origin = request.headers.get('origin') || '';
    const authHeader = request.headers.get('authorization') || '';
    const xAdmin = request.headers.get('x-admin-request');

    // 1. Check Basic Auth (used by Next.js middleware for /admin-111)
    let isBasicAuthAdmin = false;
    if (authHeader.startsWith('Basic ')) {
      try {
        const encoded = authHeader.split(' ')[1];
        if (encoded) {
          const decoded = Buffer.from(encoded, 'base64').toString();
          const [u, p] = decoded.split(':');
          const validUser = process.env.ADMIN_USERNAME || 'xxx';
          const validPass = process.env.ADMIN_PASSWORD || 'xxx';
          if (u === validUser && p === validPass) {
            isBasicAuthAdmin = true;
          }
        }
      } catch {}
    }

    // 2. Check Session & Account role
    const session = await getSession();
    let isSessionAdmin = session?.role === 'admin' || session?.username === 'admin';
    let userPlayerId: string | null = null;

    if (session?.id) {
      const { data: acc } = await supabase
        .from('accounts')
        .select('player_id, role')
        .eq('id', session.id)
        .single();
      if (acc?.role === 'admin') {
        isSessionAdmin = true;
      }
      userPlayerId = acc?.player_id || null;
    }

    // 3. Check if request originates from Admin panel (/admin-111)
    // /admin-111 is protected by HTTP Basic Auth in middleware.ts
    const isFromAdminPage =
      referer.includes('/admin-111') ||
      origin.includes('/admin-111') ||
      xAdmin === 'true';

    const isAdmin = isBasicAuthAdmin || isSessionAdmin || isFromAdminPage;

    // If not admin, require valid user session
    if (!isAdmin && !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { playerId, config } = body;

    const targetPlayerId = playerId || userPlayerId;

    if (!targetPlayerId) {
      return NextResponse.json({ error: 'Không tìm thấy hồ sơ cầu thủ để lưu' }, { status: 400 });
    }

    // If not admin, regular user can only edit their own linked player card
    if (!isAdmin && userPlayerId !== targetPlayerId) {
      return NextResponse.json({ error: 'Bạn chỉ có thể chỉnh sửa thẻ của chính mình' }, { status: 403 });
    }

    if (!config) {
      return NextResponse.json({ error: 'Dữ liệu thẻ không hợp lệ' }, { status: 400 });
    }

    const ok = await savePlayerCardConfig(targetPlayerId, config);
    if (!ok) {
      return NextResponse.json({ error: 'Không thể lưu cấu hình thẻ' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('API Card Config PUT error:', err);
    return NextResponse.json({ error: err.message || 'Lỗi máy chủ' }, { status: 500 });
  }
}
