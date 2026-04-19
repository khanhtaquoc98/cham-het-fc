import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { title, body } = await request.json();

    const res = await fetch('https://summary-bot-sepia.vercel.app/api/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json({ error: data?.error || 'Notify failed' }, { status: res.status });
    }

    return NextResponse.json({ ok: true, ...data });
  } catch (error) {
    console.error('Failed to notify summary-bot:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
