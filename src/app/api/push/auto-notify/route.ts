import { NextResponse } from 'next/server';
import { checkAndSendAutoNotification } from '@/lib/push';

export const dynamic = 'force-dynamic';

// GET - check and send auto notification (called by cron)
export async function GET() {
  try {
    const result = await checkAndSendAutoNotification();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
