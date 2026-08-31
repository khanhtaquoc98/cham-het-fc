import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { checkKosPayment } from '@/lib/kos';
import { sendPaymentNotification } from '@/lib/payment';
import payos from '@/lib/payos';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderCode = searchParams.get('orderCode');
    const orderId = searchParams.get('orderId');

    if (!orderCode && !orderId) {
      return NextResponse.json({ error: 'Missing orderCode or orderId' }, { status: 400 });
    }

    // Lấy order từ DB
    let order = null;
    if (orderCode && !isNaN(Number(orderCode))) {
      const { data } = await supabase
        .from('payment_orders')
        .select('*')
        .eq('order_code', Number(orderCode))
        .single();
      order = data;
    }

    if (!order && orderId) {
      const { data } = await supabase
        .from('payment_orders')
        .select('*')
        .eq('id', orderId)
        .single();
      order = data;
    }

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Nếu đơn chưa paid, chủ động verify với payment gateway
    const paymentType = process.env.PAYMENT_TYPE || 'PAYOS';
    if (order.status !== 'paid') {
      if (paymentType === 'KOS') {
        // KOS Gateway verification
        const kosStatus = (await checkKosPayment(order.id)) || (await checkKosPayment(String(order.order_code)));
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
      } else {
        // PayOS verification - chủ động gọi PayOS API kiểm tra trạng thái
        try {
          const paymentInfo = await payos.paymentRequests.get(Number(order.order_code));
          if (paymentInfo && paymentInfo.status === 'PAID') {
            const nowIso = new Date().toISOString();
            await supabase
              .from('payment_orders')
              .update({ status: 'paid', paid_at: nowIso })
              .eq('id', order.id);

            order.status = 'paid';
            order.paid_at = nowIso;

            // Update player_payments
            const playerPaymentIds: string[] = order.player_payment_ids || [];
            if (playerPaymentIds.length > 0) {
              const { data: updatedPlayers } = await supabase
                .from('player_payments')
                .update({
                  is_paid: true,
                  paid_at: nowIso,
                  payment_method: 'payos',
                })
                .in('id', playerPaymentIds)
                .select('player_name');

              const playerNamesStr = updatedPlayers?.map(p => p.player_name).join(', ') || '';
              if (playerNamesStr) {
                await sendPaymentNotification(playerNamesStr, order.amount, paymentInfo.transactions?.[0]?.counterAccountName || undefined);
              }
            }
            console.log(`✅ PayOS verify confirmed: orderCode=${order.order_code}`);
          } else if (paymentInfo && paymentInfo.status === 'CANCELLED') {
            await supabase
              .from('payment_orders')
              .update({ status: 'cancelled' })
              .eq('id', order.id);
            order.status = 'cancelled';
            console.log(`❌ PayOS verify cancelled: orderCode=${order.order_code}`);
          }
        } catch (payosErr) {
          console.error('PayOS verify error (non-blocking):', payosErr);
          // Không throw, vẫn trả về status hiện tại từ DB
        }
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

