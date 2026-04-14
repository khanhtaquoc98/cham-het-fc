import { NextResponse } from 'next/server';
import { getMatchData, saveMatchData, generateId } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let matchData = await getMatchData();
    const now = new Date().toISOString();
    
    if (!matchData) {
      matchData = {
        id: generateId(),
        bench: [],
        teams: [],
        venue: {},
        createdAt: now,
        updatedAt: now,
      };
    }

    // Merge updates
    if (body.bench !== undefined) matchData.bench = body.bench;
    if (body.teams !== undefined) matchData.teams = body.teams;
    if (body.venue !== undefined) {
      matchData.venue = { ...matchData.venue, ...body.venue };
    }

    matchData.updatedAt = now;
    await saveMatchData(matchData);

    return NextResponse.json({ success: true, matchData });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
