import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import payos from "@/lib/payos";
import { getSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { amount } = await request.json();
    if (!amount || amount < 100000) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const orderCode = Number(String(Date.now()).slice(-6) + Math.floor(Math.random() * 1000));
    
    const paymentType = process.env.PAYMENT_TYPE || 'PAYOS';

    // Create pending transaction
    const { data: txData, error } = await supabase
      .from("transactions")
      .insert({
        account_id: session.id,
        amount: amount, // Quy ra bóng
        type: "deposit",
        status: "pending",
        payment_source: paymentType === 'KOS' ? "gateway" : "payos",
        note: JSON.stringify({ orderCode, vnd: amount })
      })
      .select()
      .single();

    if (error || !txData) {
      console.error("Failed to insert transaction:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    const host = request.headers.get("host") || "localhost:3000";
    const protocol = host.includes("localhost") ? "http" : "https";
    const domain = `${protocol}://${host}`;

    let checkoutUrl = '';

    if (paymentType === 'KOS') {
      const gatewayUrl = process.env.GATEWAY_URL || 'http://localhost:8000';
      const uniqueContent = `CHAMHETFC ${orderCode}`;
      checkoutUrl = `${gatewayUrl}/checkout` +
        `?amount=${amount}` +
        `&content=${encodeURIComponent(uniqueContent)}` +
        `&orderId=${txData.id}` +
        `&orderCode=${orderCode}` +
        `&callback=${encodeURIComponent(`${domain}/dashboard?status=success`)}` +
        `&cancel_url=${encodeURIComponent(`${domain}/dashboard?status=cancel`)}` +
        `&webhook_url=${encodeURIComponent(`${domain}/api/payment/webhook`)}`;
    } else {
      const body = {
        orderCode,
        amount,
        description: `Quy ChamHet`,
        returnUrl: `${domain}/dashboard?status=success`,
        cancelUrl: `${domain}/dashboard?status=cancel`
      };

      const paymentLinkRes = await payos.paymentRequests.create(body);
      checkoutUrl = paymentLinkRes.checkoutUrl;
    }

    return NextResponse.json({ checkoutUrl });
  } catch (error: any) {
    console.error("Deposit create error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
