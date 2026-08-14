import { NextResponse } from 'next/server';
import payos from '@/lib/payos';
import { supabase } from '@/lib/supabase';
import { verifyKosSignature } from '@/lib/kos';
import { sendPaymentNotification } from '@/lib/payment';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const gatewaySignature =
      request.headers.get('x-webhook-signature') ||
      request.headers.get('X-Webhook-Signature');

    // KOS webhook có header x-webhook-signature hoặc field event/payment_id
    // PayOS webhook cũng có body.signature nhưng KHÔNG có header x-webhook-signature
    // nên chỉ dùng header + KOS-specific fields để phân biệt
    const isKosWebhook = Boolean(gatewaySignature || body?.event || body?.payment_id);

    if (isKosWebhook) {
      // 1. Verify signature từ KOS Gateway
      const isValidSig = verifyKosSignature(body, gatewaySignature);
      if (!isValidSig) {
        console.error('Invalid KOS gateway signature:', { body, gatewaySignature });
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
      }

      const { event, status, amount } = body;
      const targetOrderId = body.order_id || body.reference_id;

      const isSuccess =
        event === 'payment.success' ||
        status === 'completed' ||
        status === 'success';

      const isFailed =
        event === 'payment.failed' ||
        status === 'cancelled' ||
        status === 'failed';

      if (isSuccess && targetOrderId) {
        // Giao dịch thành công!
        // 1. Thử tìm trong payment_orders trước (thanh toán trận đấu)
        let { data: order } = await supabase
          .from('payment_orders')
          .select('*')
          .eq('id', targetOrderId)
          .single();

        if (!order && !isNaN(Number(targetOrderId))) {
          const { data: orderByCode } = await supabase
            .from('payment_orders')
            .select('*')
            .eq('order_code', Number(targetOrderId))
            .single();
          order = orderByCode;
        }

        if (order) {
          if (order.status !== 'paid') {
            await supabase
              .from('payment_orders')
              .update({ status: 'paid', paid_at: new Date().toISOString() })
              .eq('id', order.id);

            const playerPaymentIds: string[] = order.player_payment_ids || [];
            if (playerPaymentIds.length > 0) {
              const { data: updatedPlayers } = await supabase
                .from('player_payments')
                .update({
                  is_paid: true,
                  paid_at: new Date().toISOString(),
                  payment_method: 'kos',
                })
                .in('id', playerPaymentIds)
                .select('player_name');

              const playerNames = updatedPlayers?.map(p => p.player_name).join(', ') || '';
              if (playerNames) {
                await sendPaymentNotification(playerNames, amount || order.amount);
              }
            }
            console.log(`✅ KOS Gateway Payment confirmed: orderId=${targetOrderId}, players=${playerPaymentIds.length}`);
          }
        } else {
          // 2. Không thấy trong payment_orders -> Thử xử lý như deposit (thêm Bóng)
          const { data: tx } = await supabase
            .from('transactions')
            .select('*')
            .eq('id', targetOrderId)
            .single();

          if (tx && tx.status === 'pending' && tx.type === 'deposit') {
            await supabase
              .from('transactions')
              .update({ status: 'success' })
              .eq('id', tx.id);

            const { data: user } = await supabase
              .from('accounts')
              .select('balance')
              .eq('id', tx.account_id)
              .single();

            if (user) {
              await supabase
                .from('accounts')
                .update({ balance: (user.balance || 0) + tx.amount })
                .eq('id', tx.account_id);
            }
            console.log(`✅ KOS Gateway Deposit confirmed: txId=${targetOrderId}, amount=${tx.amount}, account=${tx.account_id}`);
          }
        }
      } else if (isFailed && targetOrderId) {
        // Giao dịch hủy hoặc thất bại
        await supabase
          .from('payment_orders')
          .update({ status: 'cancelled' })
          .eq('id', targetOrderId);

        await supabase
          .from('transactions')
          .update({ status: 'cancelled' })
          .eq('id', targetOrderId);

        console.log(`❌ KOS Gateway Payment cancelled/failed: orderId=${targetOrderId}`);
      }

      return NextResponse.json({ ok: true });
    }

    // Verify webhook data từ PayOS (bản gốc)
    const webhookData = await payos.webhooks.verify(body);

    if (!webhookData) {
      return NextResponse.json({ error: 'Invalid webhook' }, { status: 400 });
    }

    const { orderCode, code, desc } = webhookData;

    // code "00" = thanh toán thành công
    if (code === '00' && orderCode) {

      // Tìm trong payment_orders trước (thanh toán trận đấu)
      const { data: order } = await supabase
        .from('payment_orders')
        .select('*')
        .eq('order_code', orderCode)
        .single();

      if (order && order.status !== 'paid') {
        // Xử lý thanh toán trận đấu
        await supabase
          .from('payment_orders')
          .update({ status: 'paid', paid_at: new Date().toISOString() })
          .eq('id', order.id);

        const playerPaymentIds: string[] = order.player_payment_ids || [];
        if (playerPaymentIds.length > 0) {
          const { data: updatedPlayers } = await supabase
            .from('player_payments')
            .update({
              is_paid: true,
              paid_at: new Date().toISOString(),
              payment_method: 'payos',
            })
            .in('id', playerPaymentIds)
            .select('player_name');

          const playerNames = updatedPlayers?.map(p => p.player_name).join(', ') || '';
          const senderName = webhookData.counterAccountName || 'Một thành viên';

          if (playerNames) {
            await sendPaymentNotification(playerNames, webhookData.amount, senderName);
          }
        }

        console.log(`✅ Payment confirmed: orderCode=${orderCode}, players=${playerPaymentIds.length}`);
      } else {
        // Không phải payment order → thử xử lý như deposit (thêm Bóng)
        const { data: pendingDeposits } = await supabase
          .from('transactions')
          .select('*')
          .eq('status', 'pending')
          .eq('type', 'deposit');

        if (pendingDeposits) {
          const depositTx = pendingDeposits.find((t) => {
            try {
              const parsed = JSON.parse(t.note);
              return String(parsed.orderCode) === String(orderCode);
            } catch {
              return false;
            }
          });

          if (depositTx) {
            await supabase
              .from('transactions')
              .update({ status: 'success' })
              .eq('id', depositTx.id);

            const { data: user } = await supabase
              .from('accounts')
              .select('balance')
              .eq('id', depositTx.account_id)
              .single();

            if (user) {
              await supabase
                .from('accounts')
                .update({ balance: (user.balance || 0) + depositTx.amount })
                .eq('id', depositTx.account_id);
            }

            console.log(`✅ Deposit confirmed: orderCode=${orderCode}, amount=${depositTx.amount}, account=${depositTx.account_id}`);
          }
        }
      }

    } else {
      // Thanh toán không thành công — cập nhật payment_orders nếu có
      if (orderCode) {
        await supabase
          .from('payment_orders')
          .update({ status: 'failed', description: desc || 'Payment failed' })
          .eq('order_code', orderCode);
      }

      console.log(`❌ Payment failed: orderCode=${orderCode}, desc=${desc}`);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('PayOS webhook error:', err);
    // Luôn trả 200 cho PayOS
    return NextResponse.json({ ok: true });
  }
}

// PayOS cần verify endpoint
export async function GET() {
  return NextResponse.json({ status: 'PayOS webhook is running' });
}
