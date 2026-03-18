import { NextResponse } from 'next/server';
import { saveSubscription, removeSubscription, getSubscriptionCount } from '@/lib/push';

export const dynamic = 'force-dynamic';

// POST - save subscription
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { subscription } = body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 });
    }

    const ok = await saveSubscription({
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    });

    if (ok) {
      const count = await getSubscriptionCount();
      return NextResponse.json({ ok: true, totalSubscriptions: count });
    } else {
      return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
    }
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// DELETE - remove subscription
export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json({ error: 'Missing endpoint' }, { status: 400 });
    }

    await removeSubscription(endpoint);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// GET - get subscription count
export async function GET() {
  const count = await getSubscriptionCount();
  return NextResponse.json({ count });
}
