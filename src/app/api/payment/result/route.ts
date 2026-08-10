import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { checkKosPayment } from '@/lib/kos';
import { sendPaymentNotification } from '@/lib/payment';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });
    }

    // Lấy order từ DB
    let { data: order, error } = await supabase
      .from('payment_orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (error || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Nếu đơn chưa paid và đang xài KOS payment, chủ động check KOS Gateway
    const paymentType = process.env.PAYMENT_TYPE || 'PAYOS';
    if (order.status !== 'paid' && paymentType === 'KOS') {
      const kosStatus = await checkKosPayment(order.id);
      if (kosStatus && (kosStatus.status === 'completed' || kosStatus.status === 'success')) {
        const nowIso = new Date().toISOString();
        await supabase
          .from('payment_orders')
          .update({ status: 'paid', paid_at: nowIso })
          .eq('id', order.id);

        order.status = 'paid';
        order.paid_at = nowIso;

        const playerPaymentIds: string[] = order.player_payment_ids || [];
        if (playerPaymentIds.length > 0) {
          const { data: updatedPlayers } = await supabase
            .from('player_payments')
            .update({
              is_paid: true,
              paid_at: nowIso,
              payment_method: 'kos',
            })
            .in('id', playerPaymentIds)
            .select('player_name');

          const playerNamesStr = updatedPlayers?.map(p => p.player_name).join(', ') || '';
          if (playerNamesStr) {
            await sendPaymentNotification(playerNamesStr, order.amount);
          }
        }
      } else if (kosStatus && (kosStatus.status === 'cancelled' || kosStatus.status === 'failed')) {
        await supabase
          .from('payment_orders')
          .update({ status: 'cancelled' })
          .eq('id', order.id);
        order.status = 'cancelled';
      }
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
