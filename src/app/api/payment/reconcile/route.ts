import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import payos from '@/lib/payos';
import { checkKosPayment } from '@/lib/kos';
import { sendPaymentNotification } from '@/lib/payment';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * API đối soát: kiểm tra tất cả đơn pending trên DB với KOS Gateway / PayOS,
 * nếu Gateway báo đã PAID thì update DB + gửi noti.
 */
export async function POST() {
  try {
    const paymentType = process.env.PAYMENT_TYPE || 'PAYOS';

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
        let isPaid = false;
        let isCancelled = false;
        let gatewayName = paymentType === 'KOS' ? 'kos' : 'payos';
        let senderName: string | undefined = undefined;
        let payStatusStr = 'UNKNOWN';

        if (paymentType === 'KOS') {
          // ── Đối soát qua KOS Gateway ──────────────────────────
          const kosInfo = await checkKosPayment(order.id) || await checkKosPayment(String(order.order_code));
          payStatusStr = kosInfo?.status || 'UNKNOWN';

          if (kosInfo && (kosInfo.status === 'completed' || kosInfo.status === 'success' || kosInfo.status === 'paid')) {
            isPaid = true;
          } else if (kosInfo && (kosInfo.status === 'cancelled' || kosInfo.status === 'failed')) {
            isCancelled = true;
          }
        } else {
          // ── Đối soát qua PayOS ────────────────────────────────
          const paymentInfo = await payos.paymentRequests.get(Number(order.order_code));
          payStatusStr = paymentInfo?.status || 'UNKNOWN';

          if (paymentInfo && paymentInfo.status === 'PAID') {
            isPaid = true;
            senderName = paymentInfo.transactions?.[0]?.counterAccountName || undefined;
          } else if (paymentInfo && paymentInfo.status === 'CANCELLED') {
            isCancelled = true;
          }
        }

        if (isPaid) {
          const nowIso = new Date().toISOString();
          await supabase
            .from('payment_orders')
            .update({ status: 'paid', paid_at: nowIso })
            .eq('id', order.id);

          const playerPaymentIds: string[] = order.player_payment_ids || [];
          let playerNamesStr = '';

          if (playerPaymentIds.length > 0) {
            const { data: updatedPlayers } = await supabase
              .from('player_payments')
              .update({
                is_paid: true,
                paid_at: nowIso,
                payment_method: gatewayName,
              })
              .in('id', playerPaymentIds)
              .select('player_name');

            playerNamesStr = updatedPlayers?.map(p => p.player_name).join(', ') || '';

            if (playerNamesStr) {
              await sendPaymentNotification(playerNamesStr, order.amount, senderName);
            }
          }

          results.push({
            orderCode: order.order_code,
            orderId: order.id,
            dbStatus: order.status,
            payosStatus: payStatusStr,
            action: `✅ Đã cập nhật DB (${gatewayName.toUpperCase()}) + gửi noti`,
            playerNames: playerNamesStr,
            amount: order.amount,
          });

        } else if (isCancelled) {
          await supabase
            .from('payment_orders')
            .update({ status: 'cancelled' })
            .eq('id', order.id);

          results.push({
            orderCode: order.order_code,
            orderId: order.id,
            dbStatus: order.status,
            payosStatus: payStatusStr,
            action: `❌ Đã chuyển sang cancelled (${gatewayName.toUpperCase()})`,
          });

        } else {
          results.push({
            orderCode: order.order_code,
            orderId: order.id,
            dbStatus: order.status,
            payosStatus: payStatusStr,
            action: `⏳ Giữ nguyên (chưa thanh toán trên ${gatewayName.toUpperCase()})`,
          });
        }
      } catch (err: any) {
        results.push({
          orderCode: order.order_code,
          orderId: order.id,
          dbStatus: order.status,
          payosStatus: 'ERROR',
          action: '⚠️ Lỗi khi check payment gateway',
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
