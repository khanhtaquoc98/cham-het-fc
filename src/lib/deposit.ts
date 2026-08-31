import { supabase } from "@/lib/supabase";
import { checkKosPayment } from "@/lib/kos";
import payos from "@/lib/payos";

export async function reconcileAccountPendingDeposits(accountId: string): Promise<{ reconciledCount: number }> {
  try {
    const { data: pendingTxs } = await supabase
      .from("transactions")
      .select("*")
      .eq("account_id", accountId)
      .eq("status", "pending")
      .eq("type", "deposit");

    if (!pendingTxs || pendingTxs.length === 0) {
      return { reconciledCount: 0 };
    }

    let reconciledCount = 0;
    const now = Date.now();

    for (const tx of pendingTxs) {
      try {
        let orderCode: string | number | null = null;
        try {
          if (tx.note) {
            const parsed = JSON.parse(tx.note);
            orderCode = parsed.orderCode || parsed.order_code || parsed.orderId;
          }
        } catch {
          const match = tx.note?.match(/\b(\d{6,})\b/);
          if (match) orderCode = match[1];
        }

        let isSuccess = false;
        let isCancelled = false;

        if (orderCode) {
          // Check KOS Payment Gateway first
          const kosStatus = await checkKosPayment(String(orderCode));
          if (kosStatus && (kosStatus.status === "completed" || kosStatus.status === "success" || kosStatus.status === "PAID")) {
            isSuccess = true;
          } else if (kosStatus && (kosStatus.status === "cancelled" || kosStatus.status === "failed" || kosStatus.status === "EXPIRED")) {
            isCancelled = true;
          }

          // Check PayOS if not conclusive
          if (!isSuccess && !isCancelled && orderCode && !isNaN(Number(orderCode))) {
            try {
              const payosRes = await payos.paymentRequests.get(Number(orderCode));
              if (payosRes?.status === "PAID") {
                isSuccess = true;
              } else if (payosRes?.status === "CANCELLED" || payosRes?.status === "EXPIRED") {
                isCancelled = true;
              }
            } catch {
              // Ignore payos check error if orderCode doesn't exist on PayOS
            }
          }
        }

        // Check if pending transaction is older than 15 mins
        const txTime = new Date(tx.created_at).getTime();
        const isExpired = (now - txTime) > 15 * 60 * 1000;

        if (isSuccess) {
          const { error: updateErr } = await supabase
            .from("transactions")
            .update({ status: "success" })
            .eq("id", tx.id)
            .eq("status", "pending");

          if (!updateErr) {
            const { data: acc } = await supabase
              .from("accounts")
              .select("balance")
              .eq("id", accountId)
              .single();

            if (acc) {
              await supabase
                .from("accounts")
                .update({ balance: (acc.balance || 0) + tx.amount })
                .eq("id", accountId);
            }
            reconciledCount++;
          }
        } else if (isCancelled || isExpired) {
          await supabase
            .from("transactions")
            .update({ status: "cancelled" })
            .eq("id", tx.id)
            .eq("status", "pending");
          reconciledCount++;
        }
      } catch (txErr) {
        console.error(`Error reconciling deposit tx ${tx.id}:`, txErr);
      }
    }

    return { reconciledCount };
  } catch (err) {
    console.error("reconcileAccountPendingDeposits error:", err);
    return { reconciledCount: 0 };
  }
}
