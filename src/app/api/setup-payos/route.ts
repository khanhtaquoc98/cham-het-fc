import { NextResponse } from 'next/server';
import payos from '@/lib/payos';

export async function GET(request: Request) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://chamhetfc.vercel.app';
    const webhookUrl = `${baseUrl}/api/payment/webhook`;

    // Gọi SDK payos xác nhận webhook
    const result = await payos.webhooks.confirm(webhookUrl);

    return NextResponse.json({
      success: true,
      message: 'Setup webhook PayOS successfully!',
      webhookUrl,
      result
    });
  } catch (error: any) {
    console.error('Setup PayOS webhook error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || String(error) },
      { status: 500 }
    );
  }
}
