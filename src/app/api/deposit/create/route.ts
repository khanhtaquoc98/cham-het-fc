import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import payos from "@/lib/payos";
import { getSession } from "@/lib/auth";
import { createKosPayment, getKosGatewayUrl } from "@/lib/kos";

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
      const gatewayUrl = getKosGatewayUrl();
      const uniqueContent = `CHAMHETFC ${orderCode}`;
      const callbackUrl = `${domain}/dashboard?status=success`;
      const cancelUrl = `${domain}/dashboard?status=cancel`;
      const webhookUrl = `${domain}/api/payment/webhook`;

      try {
        const kosRes = await createKosPayment({
          orderId: txData.id,
          amount,
          content: uniqueContent,
          callbackUrl,
          cancelUrl,
          webhookUrl,
        });

        if (kosRes?.checkout_url) {
          checkoutUrl = kosRes.checkout_url;
        } else {
          throw new Error('KOS Gateway did not return checkout_url');
        }
      } catch (kosErr) {
        console.warn('Deposit KOS payment creation API failed, falling back to direct URL:', kosErr);
        checkoutUrl = `${gatewayUrl}/checkout` +
          `?amount=${amount}` +
          `&content=${encodeURIComponent(uniqueContent)}` +
          `&orderId=${txData.id}` +
          `&orderCode=${orderCode}` +
          `&callback=${encodeURIComponent(callbackUrl)}` +
          `&cancel_url=${encodeURIComponent(cancelUrl)}` +
          `&webhook_url=${encodeURIComponent(webhookUrl)}`;
      }
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
