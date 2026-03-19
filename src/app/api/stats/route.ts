import { NextResponse } from 'next/server';
import { getPlayerStatsSummary } from '@/lib/history';

export const dynamic = 'force-dynamic';

// Returns all player stats (no paging, for client display)
export async function GET() {
  const result = await getPlayerStatsSummary(1, 1000);
  return NextResponse.json({ players: result.players });
}
