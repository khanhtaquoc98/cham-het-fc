import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  try {
    const { accountId, amount } = await req.json();
    if (!accountId || !amount) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

    const { data: user } = await supabase.from("accounts").select("balance").eq("id", accountId).single();
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const newBalance = user.balance + amount;
    
    // Update balance
    await supabase.from("accounts").update({ balance: newBalance }).eq("id", accountId);

    // Record transaction
    await supabase.from("transactions").insert({
      account_id: accountId,
      amount: amount,
      type: "admin_adjustment",
      status: "success",
      payment_source: "Khác",
      note: "Admin cộng thủ công"
    });

    return NextResponse.json({ success: true, balance: newBalance });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
