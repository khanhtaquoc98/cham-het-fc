import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import payos from '@/lib/payos';

export const dynamic = 'force-dynamic';

/**
 * POST /api/cancel-payment
 * Huỷ tất cả các payment đang pending trong payment_orders và transactions.
 * orderCode được lưu trong cột `note` của mỗi bảng.
 */
export async function POST() {
  const results: {
    source: string;
    orderCode: number;
    status: 'cancelled' | 'error' | 'skipped';
    reason?: string;
  }[] = [];

  // ── 1. Collect orderCodes từ payment_orders ────────────────────────────────
  const { data: pendingOrders, error: ordersErr } = await supabase
    .from('payment_orders')
    .select('id, note')
    .eq('status', 'pending');

  if (ordersErr) {
    console.error('[cancel-payment] payment_orders query error:', ordersErr);
    return NextResponse.json({ error: ordersErr.message }, { status: 500 });
  }

  // ── 2. Collect orderCodes từ transactions ──────────────────────────────────
  const { data: pendingTxns, error: txnsErr } = await supabase
    .from('transactions')
    .select('id, note')
    .eq('status', 'pending');

  if (txnsErr) {
    console.error('[cancel-payment] transactions query error:', txnsErr);
    return NextResponse.json({ error: txnsErr.message }, { status: 500 });
  }

  // ── 3. Build unique orderCode set ──────────────────────────────────────────
  type PendingItem = { id: string; note: string | null; source: 'payment_orders' | 'transactions' };

  const allPending: PendingItem[] = [
    ...(pendingOrders || []).map((r) => ({ ...r, source: 'payment_orders' as const })),
    ...(pendingTxns || []).map((r) => ({ ...r, source: 'transactions' as const })),
  ];

  // Extract orderCode from note (numeric value in the note string)
  const extractOrderCode = (note: string | null): number | null => {
    if (!note) return null;
    const match = note.match(/\b(\d{6,})\b/); // orderCode thường là số dài >= 6 chữ số
    return match ? parseInt(match[1], 10) : null;
  };

  // Deduplicate: mỗi orderCode chỉ cancel 1 lần
  const processedCodes = new Set<number>();

  const orderToItems = new Map<number, PendingItem[]>();
  for (const item of allPending) {
    const code = extractOrderCode(item.note);
    if (code === null) {
      results.push({ source: item.source, orderCode: 0, status: 'skipped', reason: `Không tìm thấy orderCode trong note: "${item.note}"` });
      continue;
    }
    if (!orderToItems.has(code)) orderToItems.set(code, []);
    orderToItems.get(code)!.push(item);
  }

  // ── 4. Cancel từng orderCode ───────────────────────────────────────────────
  for (const [orderCode, items] of orderToItems.entries()) {
    if (processedCodes.has(orderCode)) continue;
    processedCodes.add(orderCode);

    try {
      await payos.paymentRequests.cancelPaymentLink(orderCode, 'Giao dịch bị treo quá lâu');

      // Cập nhật status → 'cancelled' cho tất cả rows thuộc orderCode này
      for (const item of items) {
        if (item.source === 'payment_orders') {
          await supabase
            .from('payment_orders')
            .update({ status: 'cancelled' })
            .eq('id', item.id);
        } else {
          await supabase
            .from('transactions')
            .update({ status: 'cancelled' })
            .eq('id', item.id);
        }
      }

      results.push({ source: items.map((i) => i.source).join('+'), orderCode, status: 'cancelled' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[cancel-payment] Failed to cancel orderCode ${orderCode}:`, msg);
      results.push({ source: items.map((i) => i.source).join('+'), orderCode, status: 'error', reason: msg });
    }
  }

  const cancelledCount = results.filter((r) => r.status === 'cancelled').length;
  const errorCount = results.filter((r) => r.status === 'error').length;
  const skippedCount = results.filter((r) => r.status === 'skipped').length;

  return NextResponse.json({
    ok: true,
    summary: { cancelledCount, errorCount, skippedCount, total: results.length },
    results,
  });
}

/**
 * GET /api/cancel-payment
 * Trả về danh sách các payment đang pending (preview trước khi cancel).
 */
export async function GET() {
  const { data: orders } = await supabase
    .from('payment_orders')
    .select('id, note, status, created_at')
    .eq('status', 'pending');

  const { data: txns } = await supabase
    .from('transactions')
    .select('id, note, status, created_at')
    .eq('status', 'pending');

  return NextResponse.json({
    payment_orders: orders || [],
    transactions: txns || [],
    total: (orders?.length || 0) + (txns?.length || 0),
  });
}
