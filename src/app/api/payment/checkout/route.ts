import { NextResponse } from 'next/server';
import payos from '@/lib/payos';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { playerPaymentIds } = body as { playerPaymentIds: string[] };

    if (!playerPaymentIds || playerPaymentIds.length === 0) {
      return NextResponse.json({ error: 'No players selected' }, { status: 400 });
    }

    // Lấy thông tin player_payments
    const { data: playerPayments, error } = await supabase
      .from('player_payments')
      .select('*')
      .in('id', playerPaymentIds);

    if (error || !playerPayments || playerPayments.length === 0) {
      return NextResponse.json({ error: 'Players not found' }, { status: 404 });
    }

    // Tính tổng tiền
    const totalAmount = playerPayments.reduce((s, p) => s + (p.total_amount || 0), 0);

    if (totalAmount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    // Tạo orderCode duy nhất (PayOS yêu cầu số nguyên)
    const orderCode = Number(String(Date.now()).slice(-6) + String(Math.floor(Math.random() * 100)).padStart(2, '0'));

    // Mô tả + danh sách items
    const description = `ChamHetFC`;
    const items = playerPayments.map(p => ({
      name: p.player_name,
      quantity: 1,
      price: p.total_amount || 0,
    }));

    // Lưu order vào DB trước khi gọi PayOS
    const { data: orderData, error: orderError } = await supabase
      .from('payment_orders')
      .insert({
        order_code: orderCode,
        player_payment_ids: playerPaymentIds,
        amount: totalAmount,
        status: 'pending',
        description,
      })
      .select()
      .single();

    if (orderError) {
      console.error('Failed to save order:', orderError);
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
    }

    // Xác định baseUrl động từ header request để hỗ trợ test localhost
    const host = request.headers.get('host') || 'localhost:3000';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;

    let checkoutUrl = '';
    const paymentType = process.env.PAYMENT_TYPE || 'PAYOS';

    if (paymentType === 'KOS') {
      const gatewayUrl = process.env.GATEWAY_URL || 'http://localhost:8000';
      // Dùng MB Bank Webhook Gateway
      const uniqueContent = `CHAMHETFC ${orderCode}`;
      checkoutUrl = `${gatewayUrl}/checkout` +
        `?amount=${totalAmount}` +
        `&content=${encodeURIComponent(uniqueContent)}` +
        `&orderId=${orderData.id}` +
        `&orderCode=${orderCode}` +
        `&callback=${encodeURIComponent(`${baseUrl}/payment/result`)}` +
        `&cancel_url=${encodeURIComponent(`${baseUrl}/payment/result?orderCode=${orderCode}&orderId=${orderData.id}&status=cancelled`)}` +
        `&webhook_url=${encodeURIComponent(`${baseUrl}/api/payment/webhook`)}`;

      // Cập nhật mô tả trong database thành uniqueContent cho khớp đối soát
      await supabase
        .from('payment_orders')
        .update({ description: uniqueContent })
        .eq('id', orderData.id);
    } else {
      // Tạo payment link qua PayOS
      const paymentLink = await payos.paymentRequests.create({
        orderCode,
        amount: totalAmount,
        description,
        items,
        returnUrl: `${baseUrl}/payment/result?orderCode=${orderCode}&orderId=${orderData.id}`,
        cancelUrl: `${baseUrl}/payment/result?orderCode=${orderCode}&orderId=${orderData.id}&status=cancelled`,
      });
      checkoutUrl = paymentLink.checkoutUrl;
    }

    // Cập nhật checkout URL vào order
    await supabase
      .from('payment_orders')
      .update({ checkout_url: checkoutUrl })
      .eq('id', orderData.id);

    return NextResponse.json({
      checkoutUrl,
      orderCode,
      orderId: orderData.id,
    });
  } catch (err: any) {
    console.error('Checkout error:', err);
    return NextResponse.json({ error: err?.message || 'Failed to create payment' }, { status: 500 });
  }
}
