import { NextResponse } from 'next/server';
import { getMatchHistory } from '@/lib/history';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const pageSize = parseInt(searchParams.get('pageSize') || '10');

  const result = await getMatchHistory(page, pageSize);
  return NextResponse.json(result);
}
