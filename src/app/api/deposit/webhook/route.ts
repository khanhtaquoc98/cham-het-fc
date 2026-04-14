import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import payos from "@/lib/payos";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Verify webhook data
    const webhookData = await payos.webhooks.verify(body);

    if (webhookData.code === "00") {
      const orderCode = webhookData.orderCode;

      // Tìm transaction pending có orderCode này
      // Do Supabase không search trực tiếp deep json trong text cách dễ dàng,
      // ta quét transactions có status = pending và giải mã note. (Với scale nhỏ hiện tại)
      const { data: pendingTxs } = await supabase
        .from("transactions")
        .select("*")
        .eq("status", "pending")
        .eq("type", "deposit");

      if (pendingTxs) {
        const tx = pendingTxs.find((t) => {
          try {
            const parsed = JSON.parse(t.note);
            return parsed.orderCode === orderCode;
          } catch {
            return false;
          }
        });

        if (tx) {
          // Update transaction
          await supabase
            .from("transactions")
            .update({ status: "success" })
            .eq("id", tx.id);

          // Lấy user hiện tại
          const { data: user } = await supabase
            .from("accounts")
            .select("balance")
            .eq("id", tx.account_id)
            .single();

          if (user) {
            // Cộng bóng
            await supabase
              .from("accounts")
              .update({ balance: user.balance + tx.amount })
              .eq("id", tx.account_id);
          }
        }
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false });
  } catch (err: any) {
    console.error("Deposit webhook error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
