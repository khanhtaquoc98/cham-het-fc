import { NextResponse } from 'next/server';
import { sendNotificationToAll, getSubscriptionCount } from '@/lib/push';

export const dynamic = 'force-dynamic';

// POST - send notification to all subscribers
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, message } = body;

    if (!title || !message) {
      return NextResponse.json({ error: 'Title and message required' }, { status: 400 });
    }

    const result = await sendNotificationToAll(title, message);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// GET - get subscriber count
export async function GET() {
  const count = await getSubscriptionCount();
  return NextResponse.json({ count });
}
