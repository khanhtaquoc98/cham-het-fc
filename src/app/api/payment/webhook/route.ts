import { NextResponse } from 'next/server';
import payos from '@/lib/payos';
import { supabase } from '@/lib/supabase';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const gatewaySignature = request.headers.get('x-webhook-signature') || request.headers.get('X-Webhook-Signature');

    if (gatewaySignature) {
      // Xử lý webhook từ MB Bank Webhook Gateway
      const gatewaySecret = process.env.GATEWAY_CALLBACK_SECRET || 'super-secret-callback-token';
      const { reference_id, payment_id, amount, trans_no, status } = body;

      // Verify signature (khớp với định dạng float của Python)
      const amountStr = Number.isInteger(amount) ? amount.toFixed(1) : String(amount);
      const signStr = `${reference_id}${payment_id}${amountStr}${trans_no}${gatewaySecret}`;
      const computedSignature = crypto.createHash('sha256').update(signStr).digest('hex');

      if (computedSignature !== gatewaySignature) {
        console.error('Invalid gateway signature:', { computedSignature, gatewaySignature, signStr });
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
      }

      if (status === 'success') {
        // Giao dịch thành công!
        // 1. Thử tìm trong payment_orders trước (thanh toán trận đấu)
        const { data: order } = await supabase
          .from('payment_orders')
          .select('*')
          .eq('id', reference_id)
          .single();

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
                  payment_method: 'gateway',
                })
                .in('id', playerPaymentIds)
                .select('player_name');

              const playerNames = updatedPlayers?.map(p => p.player_name).join(', ') || '';
              const senderName = 'Cổng MB Bank';
              const formattedAmount = new Intl.NumberFormat('vi-VN').format(amount) + 'đ';

              if (playerNames) {
                try {
                  const safeSenderName = senderName.replace(/([_*\[\]`])/g, '\\$1');
                  const safePlayerNames = playerNames.replace(/([_*\[\]`])/g, '\\$1');

                  await fetch('https://summary-bot-sepia.vercel.app/api/notify-payment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      title: 'Thanh toán thành công',
                      body: `${safeSenderName} đã thanh toán ${formattedAmount} cho ${safePlayerNames}`
                    })
                  });
                } catch (err) {
                  console.error('Failed to notify bot:', err);
                }
              }
            }
            console.log(`✅ Gateway Payment confirmed: orderId=${reference_id}, players=${playerPaymentIds.length}`);
          }
        } else {
          // 2. Không thấy trong payment_orders -> Thử xử lý như deposit (thêm Bóng)
          const { data: tx } = await supabase
            .from('transactions')
            .select('*')
            .eq('id', reference_id)
            .eq('status', 'pending')
            .eq('type', 'deposit')
            .single();

          if (tx) {
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
            console.log(`✅ Gateway Deposit confirmed: txId=${reference_id}, amount=${tx.amount}, account=${tx.account_id}`);
          }
        }
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
          const formattedAmount = new Intl.NumberFormat('vi-VN').format(webhookData.amount) + 'đ';

          if (playerNames) {
            try {
              const safeSenderName = senderName.replace(/([_*\[\]`])/g, '\\$1');
              const safePlayerNames = playerNames.replace(/([_*\[\]`])/g, '\\$1');

              await fetch('https://summary-bot-sepia.vercel.app/api/notify-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  title: 'Thanh toán thành công',
                  body: `${safeSenderName} đã thanh toán ${formattedAmount} cho ${safePlayerNames}`
                })
              });
            } catch (err) {
              console.error('Failed to notify bot:', err);
            }
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
