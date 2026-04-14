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
    
    // Create pending transaction
    const { error } = await supabase
      .from("transactions")
      .insert({
        account_id: session.id,
        amount: amount, // Quy ra bóng
        type: "deposit",
        status: "pending",
        payment_source: "QR_Bank",
        note: JSON.stringify({ orderCode, vnd: amount })
      });

    if (error) {
      console.error(error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    const domain = process.env.NEXT_PUBLIC_BASE_URL || request.headers.get("origin") || "http://localhost:3000";

    const body = {
      orderCode,
      amount,
      description: `Quy ChamHet`,
      returnUrl: `${domain}/dashboard?status=success`,
      cancelUrl: `${domain}/dashboard?status=cancel`
    };

    const paymentLinkRes = await payos.paymentRequests.create(body);

    return NextResponse.json({ checkoutUrl: paymentLinkRes.checkoutUrl });
  } catch (error: any) {
    console.error("Deposit create error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
