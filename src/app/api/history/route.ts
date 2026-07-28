import { NextResponse } from 'next/server';
import { getMatchHistory, updateMatchHistoryScore } from '@/lib/history';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '10');

  const result = await getMatchHistory(page, pageSize);
  return NextResponse.json(result);
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, homeScore, awayScore, extraScore } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const updated = await updateMatchHistoryScore(
      id,
      Number(homeScore || 0),
      Number(awayScore || 0),
      extraScore != null ? Number(extraScore) : null,
    );

    if (!updated) {
      return NextResponse.json({ error: 'Failed to update match score' }, { status: 500 });
    }

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
