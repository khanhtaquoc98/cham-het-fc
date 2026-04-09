import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });
    }

    // Lấy order từ DB
    const { data: order, error } = await supabase
      .from('payment_orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Lấy tên player từ player_payments
    const playerPaymentIds: string[] = order.player_payment_ids || [];
    let playerNames: string[] = [];

    if (playerPaymentIds.length > 0) {
      const { data: players } = await supabase
        .from('player_payments')
        .select('player_name')
        .in('id', playerPaymentIds);

      playerNames = (players || []).map(p => p.player_name);
    }

    return NextResponse.json({
      id: order.id,
      orderCode: order.order_code,
      amount: order.amount,
      status: order.status,
      playerNames,
      paidAt: order.paid_at,
    });
  } catch (err) {
    console.error('Payment result error:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
