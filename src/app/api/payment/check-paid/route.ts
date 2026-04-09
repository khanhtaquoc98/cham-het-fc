import { NextResponse } from 'next/server';
import { getPaymentSummary } from '@/lib/payment';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const summary = await getPaymentSummary();
    
    if (!summary || !summary.playerPayments) {
      return NextResponse.json({ unpaidPlayers: [] });
    }

    const allPlayers = summary.playerPayments;
    const paidPlayers = allPlayers.filter(p => p.isPaid);
    const unpaidPlayers = allPlayers.filter(p => !p.isPaid);

    const totalAmount = allPlayers.reduce((sum, p) => sum + p.totalAmount, 0);
    const paidAmount = paidPlayers.reduce((sum, p) => sum + p.totalAmount, 0);
    const unpaidAmount = unpaidPlayers.reduce((sum, p) => sum + p.totalAmount, 0);

    return NextResponse.json({ 
      totalCount: allPlayers.length,
      paidCount: paidPlayers.length,
      unpaidCount: unpaidPlayers.length,

      totalAmount,
      paidAmount,
      unpaidAmount,

      unpaidPlayers: unpaidPlayers.map(p => ({
        id: p.id,
        playerName: p.playerName,
        teamName: p.teamName,
        totalAmount: p.totalAmount
      }))
    });
  } catch (err) {
    console.error('Unpaid endpoint error:', err);
    return NextResponse.json({ error: 'Failed to fetch unpaid players' }, { status: 500 });
  }
}
