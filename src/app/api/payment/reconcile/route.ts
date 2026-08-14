import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import payos from '@/lib/payos';
import { sendPaymentNotification } from '@/lib/payment';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * API đối soát: kiểm tra tất cả đơn pending trên DB với PayOS,
 * nếu PayOS đã PAID thì update DB + gửi noti.
 */
export async function POST() {
  try {
    // Lấy tất cả đơn chưa paid
    const { data: pendingOrders, error } = await supabase
      .from('payment_orders')
      .select('*')
      .in('status', ['pending', 'processing'])
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'DB query failed', detail: error.message }, { status: 500 });
    }

    if (!pendingOrders || pendingOrders.length === 0) {
      return NextResponse.json({ message: 'Không có đơn pending nào', reconciled: 0 });
    }

    const results: Array<{
      orderCode: number;
      orderId: string;
      dbStatus: string;
      payosStatus: string;
      action: string;
      playerNames?: string;
      amount?: number;
      error?: string;
    }> = [];

    for (const order of pendingOrders) {
      try {
        const paymentInfo = await payos.paymentRequests.get(Number(order.order_code));

        if (paymentInfo && paymentInfo.status === 'PAID') {
          // PayOS đã PAID nhưng DB chưa → update
          const nowIso = new Date().toISOString();
          await supabase
            .from('payment_orders')
            .update({ status: 'paid', paid_at: nowIso })
            .eq('id', order.id);

          // Update player_payments
          const playerPaymentIds: string[] = order.player_payment_ids || [];
          let playerNamesStr = '';

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

            playerNamesStr = updatedPlayers?.map(p => p.player_name).join(', ') || '';

            // Gửi noti Telegram
            if (playerNamesStr) {
              const senderName = paymentInfo.transactions?.[0]?.counterAccountName || undefined;
              await sendPaymentNotification(playerNamesStr, order.amount, senderName);
            }
          }

          results.push({
            orderCode: order.order_code,
            orderId: order.id,
            dbStatus: order.status,
            payosStatus: 'PAID',
            action: '✅ Đã cập nhật DB + gửi noti',
            playerNames: playerNamesStr,
            amount: order.amount,
          });

        } else if (paymentInfo && paymentInfo.status === 'CANCELLED') {
          await supabase
            .from('payment_orders')
            .update({ status: 'cancelled' })
            .eq('id', order.id);

          results.push({
            orderCode: order.order_code,
            orderId: order.id,
            dbStatus: order.status,
            payosStatus: 'CANCELLED',
            action: '❌ Đã chuyển sang cancelled',
          });

        } else {
          results.push({
            orderCode: order.order_code,
            orderId: order.id,
            dbStatus: order.status,
            payosStatus: paymentInfo?.status || 'UNKNOWN',
            action: '⏳ Giữ nguyên (chưa thanh toán trên PayOS)',
          });
        }
      } catch (err: any) {
        results.push({
          orderCode: order.order_code,
          orderId: order.id,
          dbStatus: order.status,
          payosStatus: 'ERROR',
          action: '⚠️ Lỗi khi check PayOS',
          error: err?.message || String(err),
        });
      }
    }

    const reconciledCount = results.filter(r => r.action.startsWith('✅')).length;
    const cancelledCount = results.filter(r => r.action.startsWith('❌')).length;

    return NextResponse.json({
      message: `Đối soát xong: ${reconciledCount} đơn đã paid, ${cancelledCount} đơn cancelled`,
      totalChecked: pendingOrders.length,
      reconciled: reconciledCount,
      cancelled: cancelledCount,
      details: results,
    });
  } catch (err: any) {
    console.error('Reconcile error:', err);
    return NextResponse.json({ error: 'Reconcile failed', detail: err?.message }, { status: 500 });
  }
}
