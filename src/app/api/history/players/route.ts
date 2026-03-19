import { NextResponse } from 'next/server';
import { getPlayerStatsSummary, updatePlayerStatsPlayerId } from '@/lib/history';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '10');

  const result = await getPlayerStatsSummary(page, pageSize);
  return NextResponse.json(result);
}

// PUT - update player_id for a player_name
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { playerName, playerId } = body;

    if (!playerName || !playerId) {
      return NextResponse.json({ error: 'Missing playerName or playerId' }, { status: 400 });
    }

    const success = await updatePlayerStatsPlayerId(playerName, playerId);
    return NextResponse.json({ ok: success });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
