import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const PAYOS_CLIENT_ID = process.env.PAYOS_CLIENT_ID || '';
const PAYOS_API_KEY = process.env.PAYOS_API_KEY || '';

async function cancelPayOSLink(orderCode: number, reason: string) {
  const res = await fetch(`https://api-merchant.payos.vn/v2/payment-requests/${orderCode}/cancel`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-client-id': PAYOS_CLIENT_ID,
      'x-api-key': PAYOS_API_KEY,
    },
    body: JSON.stringify({ cancellationReason: reason }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.desc || data?.message || `PayOS cancel failed (${res.status})`);
  }
  return res.json();
}

export const dynamic = 'force-dynamic';

/**
 * POST /api/cancel-payment
 * Huỷ tất cả các payment đang pending trong payment_orders và transactions.
 * payment_orders dùng cột `order_code`, transactions dùng cột `note`.
 */
export async function POST() {
  const results: {
    source: string;
    orderCode: number;
    status: 'cancelled' | 'error' | 'skipped';
    reason?: string;
  }[] = [];

  // ── 1. Collect orderCodes từ payment_orders (dùng cột order_code) ──────────
  const { data: pendingOrders, error: ordersErr } = await supabase
    .from('payment_orders')
    .select('id, order_code')
    .eq('status', 'pending');

  if (ordersErr) {
    console.error('[cancel-payment] payment_orders query error:', ordersErr);
    return NextResponse.json({ error: ordersErr.message }, { status: 500 });
  }

  // ── 2. Collect orderCodes từ transactions (dùng cột note) ──────────────────
  const { data: pendingTxns, error: txnsErr } = await supabase
    .from('transactions')
    .select('id, note')
    .eq('status', 'pending');

  if (txnsErr) {
    console.error('[cancel-payment] transactions query error:', txnsErr);
    return NextResponse.json({ error: txnsErr.message }, { status: 500 });
  }

  // ── 3. Build unique orderCode set ──────────────────────────────────────────
  type PendingItem = { id: string; orderCode: number | null; source: 'payment_orders' | 'transactions' };

  // Extract orderCode from note (numeric value in the note string)
  const extractOrderCodeFromNote = (note: string | null): number | null => {
    if (!note) return null;
    const match = note.match(/\b(\d{6,})\b/); // orderCode thường là số dài >= 6 chữ số
    return match ? parseInt(match[1], 10) : null;
  };

  const allPending: PendingItem[] = [
    ...(pendingOrders || []).map((r) => ({ id: r.id, orderCode: r.order_code as number | null, source: 'payment_orders' as const })),
    ...(pendingTxns || []).map((r) => ({ id: r.id, orderCode: extractOrderCodeFromNote(r.note), source: 'transactions' as const })),
  ];

  // Deduplicate: mỗi orderCode chỉ cancel 1 lần
  const processedCodes = new Set<number>();

  const orderToItems = new Map<number, PendingItem[]>();
  for (const item of allPending) {
    const code = item.orderCode;
    if (code === null) {
      results.push({ source: item.source, orderCode: 0, status: 'skipped', reason: `Không tìm thấy orderCode` });
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
      await cancelPayOSLink(orderCode, 'Giao dịch bị treo quá lâu');

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
    .select('id, order_code, status, created_at')
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
