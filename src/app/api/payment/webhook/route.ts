import { NextResponse } from 'next/server';
import payos from '@/lib/payos';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Verify webhook data từ PayOS
    const webhookData = await payos.webhooks.verify(body);

    if (!webhookData) {
      return NextResponse.json({ error: 'Invalid webhook' }, { status: 400 });
    }

    const { orderCode, code, desc } = webhookData;

    // code "00" = thanh toán thành công
    if (code === '00') {
      // Tìm order trong DB
      const { data: order } = await supabase
        .from('payment_orders')
        .select('*')
        .eq('order_code', orderCode)
        .single();

      if (order && order.status !== 'paid') {
        // Cập nhật trạng thái order
        await supabase
          .from('payment_orders')
          .update({ status: 'paid', paid_at: new Date().toISOString() })
          .eq('id', order.id);

        // Mark tất cả player_payments trong order là đã thanh toán
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

          // Lấy danh sách tên người chơi & tên người ck (người gửi)
          const playerNames = updatedPlayers?.map(p => p.player_name).join(', ') || '';
          const senderName = webhookData.counterAccountName || 'Một thành viên';
          const formattedAmount = new Intl.NumberFormat('vi-VN').format(webhookData.amount) + 'đ';

          if (playerNames) {
            try {
              // Escape cho Markdown (V1) của Telegram: chỉ cần escape các ký tự markdown cơ bản
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
      }
    } else {
      // Thanh toán không thành công
      await supabase
        .from('payment_orders')
        .update({ status: 'failed', description: desc || 'Payment failed' })
        .eq('order_code', orderCode);

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
