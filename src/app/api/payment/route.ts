import { NextResponse } from 'next/server';
import {
  getPaymentSummary,
  getOrCreateMatchPayment,
  updateMatchPayment,
  calculateAndSavePlayerPayments,
  markPlayerPaid,
  markPlayerUnpaid,
  resetPaymentsForMatch,
} from '@/lib/payment';
import { getMatchData } from '@/lib/storage';

export const dynamic = 'force-dynamic';

// GET: Lấy thông tin thanh toán hiện tại
export async function GET() {
  try {
    const summary = await getPaymentSummary();
    return NextResponse.json(summary);
  } catch (err) {
    console.error('Payment GET error:', err);
    return NextResponse.json({ error: 'Failed to get payment' }, { status: 500 });
  }
}

// PUT: Cập nhật tiền sân/nước/losing teams + tính toán lại
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const matchData = await getMatchData();
    if (!matchData) {
      return NextResponse.json({ error: 'No match data' }, { status: 400 });
    }

    const mp = await getOrCreateMatchPayment(matchData.id);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: any = {};
    if (body.fieldCost !== undefined) updates.fieldCost = body.fieldCost;
    if (body.drinkCost !== undefined) updates.drinkCost = body.drinkCost;
    if (body.losingTeams !== undefined) updates.losingTeams = body.losingTeams;

    const updated = await updateMatchPayment(mp.id, updates);
    if (!updated) {
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
    }

    // Recalculate player payments nếu có đủ thông tin
    if (updated.fieldCost > 0 && updated.losingTeams.length > 0) {
      await calculateAndSavePlayerPayments(updated.id);
    }

    const summary = await getPaymentSummary();
    return NextResponse.json(summary);
  } catch (err) {
    console.error('Payment PUT error:', err);
    return NextResponse.json({ error: 'Failed to update payment' }, { status: 500 });
  }
}

// POST: Mark player paid/unpaid
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, paymentId, method } = body;

    if (action === 'mark-paid') {
      const ok = await markPlayerPaid(paymentId, method || 'manual');
      return NextResponse.json({ ok });
    } else if (action === 'mark-unpaid') {
      const ok = await markPlayerUnpaid(paymentId);
      return NextResponse.json({ ok });
    } else if (action === 'recalculate') {
      const matchData = await getMatchData();
      if (!matchData) return NextResponse.json({ error: 'No match data' }, { status: 400 });
      const mp = await getOrCreateMatchPayment(matchData.id);
      await calculateAndSavePlayerPayments(mp.id);
      const summary = await getPaymentSummary();
      return NextResponse.json(summary);
    } else if (action === 'reset') {
      const matchData = await getMatchData();
      if (!matchData) return NextResponse.json({ error: 'No match data' }, { status: 400 });
      await resetPaymentsForMatch(matchData.id);
      const summary = await getPaymentSummary();
      return NextResponse.json(summary);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error('Payment POST error:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
