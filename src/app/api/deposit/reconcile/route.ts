import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { reconcileAccountPendingDeposits } from "@/lib/deposit";

export async function POST() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { reconciledCount } = await reconcileAccountPendingDeposits(session.id);
    return NextResponse.json({ success: true, reconciledCount });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Reconcile deposit API error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
